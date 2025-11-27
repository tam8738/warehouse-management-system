const express = require('express');
const router = express.Router();
const db = require('../models');
const { Op } = require('sequelize');
const stockController = require('../controllers/stockController');

// ===== Get all stock with filters and pagination =====
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      lowStock,
      minQty = 10,
      status
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause for stock
    const stockWhere = {};
    if (lowStock === 'true') {
      stockWhere.quantity = { [Op.lt]: parseInt(minQty) };
    }

    // Build where clause for product
    const productWhere = {};
    if (status) productWhere.status = status;
    if (search) {
      productWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await db.Stock.findAndCountAll({
      where: stockWhere,
      include: [{
        model: db.Product,
        as: 'product',
        where: productWhere,
        attributes: ['id', 'sku', 'name', 'unit', 'status', 'manageBatch']
      }],
      order: [['quantity', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Add available quantity (quantity - reservedQty)
    const stocksWithAvailable = rows.map(stock => ({
      ...stock.toJSON(),
      availableQty: parseFloat(stock.quantity) - parseFloat(stock.reservedQty)
    }));

    res.json({
      success: true,
      data: stocksWithAvailable,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Get stock by product ID =====
router.get('/product/:productId', async (req, res) => {
  try {
    const stock = await db.Stock.findOne({
      where: { productId: req.params.productId },
      include: [
        {
          model: db.Product,
          as: 'product'
        }
      ]
    });

    if (!stock) {
      return res.status(404).json({ success: false, error: 'Stock not found' });
    }

    // Get batches if product manages batches
    let batches = null;
    if (stock.product.manageBatch) {
      batches = await db.Batch.findAll({
        where: {
          productId: req.params.productId,
          status: 'active',
          quantity: { [Op.gt]: 0 }
        },
        include: [{
          model: db.Supplier,
          as: 'supplier',
          attributes: ['id', 'name']
        }],
        order: [['expiryDate', 'ASC']]
      });
    }

    res.json({
      success: true,
      data: {
        ...stock.toJSON(),
        availableQty: parseFloat(stock.quantity) - parseFloat(stock.reservedQty),
        batches
      }
    });
  } catch (error) {
    console.error('Get stock by product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Get all batches with filters =====
router.get('/batches', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      productId,
      status,
      expiringSoon,
      days = 30
    } = req.query;

    const offset = (page - 1) * limit;

    const where = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;

    // Filter expiring batches
    if (expiringSoon === 'true') {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(days));
      
      where.expiryDate = {
        [Op.between]: [new Date(), futureDate]
      };
      where.status = 'active';
      where.quantity = { [Op.gt]: 0 };
    }

    const { count, rows } = await db.Batch.findAndCountAll({
      where,
      include: [
        {
          model: db.Product,
          as: 'product',
          attributes: ['id', 'sku', 'name', 'unit']
        },
        {
          model: db.Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'contact']
        }
      ],
      order: [['expiryDate', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Add days until expiry
    const today = new Date();
    const batchesWithDays = rows.map(batch => {
      const daysUntilExpiry = Math.ceil((new Date(batch.expiryDate) - today) / (1000 * 60 * 60 * 24));
      
      let expiryStatus = 'normal';
      if (batch.expiryDate < today) {
        expiryStatus = 'expired';
      } else if (daysUntilExpiry <= 7) {
        expiryStatus = 'critical';
      } else if (daysUntilExpiry <= 30) {
        expiryStatus = 'warning';
      }

      return {
        ...batch.toJSON(),
        daysUntilExpiry,
        expiryStatus
      };
    });

    res.json({
      success: true,
      data: batchesWithDays,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Get batch by batchNo =====
router.get('/batches/:batchNo', async (req, res) => {
  try {
    const batch = await db.Batch.findOne({
      where: { batchNo: req.params.batchNo },
      include: [
        {
          model: db.Product,
          as: 'product'
        },
        {
          model: db.Supplier,
          as: 'supplier'
        }
      ]
    });

    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    // Calculate days until expiry
    const today = new Date();
    const daysUntilExpiry = Math.ceil((new Date(batch.expiryDate) - today) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      data: {
        ...batch.toJSON(),
        daysUntilExpiry
      }
    });
  } catch (error) {
    console.error('Get batch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Update batch status (for recalls, etc.) =====
router.put('/batches/:batchNo', async (req, res) => {
  try {
    const { status, notes } = req.body;

    const batch = await db.Batch.findOne({
      where: { batchNo: req.params.batchNo }
    });

    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    // Only allow status update to recalled or depleted
    const allowedStatuses = ['active', 'recalled', 'depleted'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    await batch.update({
      status: status || batch.status,
      notes: notes !== undefined ? notes : batch.notes
    });

    res.json({
      success: true,
      message: 'Batch updated successfully',
      data: batch
    });
  } catch (error) {
    console.error('Update batch error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Reserve stock =====
router.post('/reserve', async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Invalid productId or quantity'
      });
    }

    const stock = await db.Stock.findOne({
      where: { productId },
      transaction
    });

    if (!stock) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Stock not found' });
    }

    const availableQty = parseFloat(stock.quantity) - parseFloat(stock.reservedQty);

    if (availableQty < quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: `Insufficient available stock. Available: ${availableQty}`
      });
    }

    await stock.increment('reservedQty', {
      by: quantity,
      transaction
    });

    await transaction.commit();

    const updatedStock = await db.Stock.findOne({
      where: { productId },
      include: [{ model: db.Product, as: 'product' }]
    });

    res.json({
      success: true,
      message: 'Stock reserved successfully',
      data: updatedStock
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Reserve stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Release reserved stock =====
router.post('/release', async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Invalid productId or quantity'
      });
    }

    const stock = await db.Stock.findOne({
      where: { productId },
      transaction
    });

    if (!stock) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Stock not found' });
    }

    if (parseFloat(stock.reservedQty) < quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: `Cannot release more than reserved. Reserved: ${stock.reservedQty}`
      });
    }

    await stock.decrement('reservedQty', {
      by: quantity,
      transaction
    });

    await transaction.commit();

    const updatedStock = await db.Stock.findOne({
      where: { productId },
      include: [{ model: db.Product, as: 'product' }]
    });

    res.json({
      success: true,
      message: 'Reserved stock released successfully',
      data: updatedStock
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Release stock error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
 // Route kiểm tra tồn kho thấp
router.post('/check-low-stock', stockController.checkLowStock);

// Route lấy danh sách sản phẩm tồn kho thấp
router.get('/low-stock', stockController.getLowStockProducts);

module.exports = router;