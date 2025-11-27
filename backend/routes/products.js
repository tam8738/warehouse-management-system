const express = require('express');
const router = express.Router();
const { auditLog } = require('../middleware/audit');
const db = require('../models');
const { Op } = require('sequelize');
const { validateProduct, validateUUID, validatePagination } = require('../middleware/validation');

// ===== Get all products with pagination and filters =====
router.get('/', validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      manageBatch,
      includeStock = 'true'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (manageBatch !== undefined) where.manageBatch = manageBatch === 'true';
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Build include
    const include = [];
    if (includeStock === 'true') {
      include.push({
        model: db.Stock,
        as: 'stock',
        attributes: ['quantity', 'reservedQty']
      });
    }

    const { count, rows } = await db.Product.findAndCountAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Get product by ID =====
router.get('/:id', validateUUID('id'), async (req, res) => {
  try {
    const product = await db.Product.findByPk(req.params.id, {
      include: [
        {
          model: db.Stock,
          as: 'stock'
        },
        {
          model: db.Batch,
          as: 'batches',
          where: { status: 'active' },
          required: false
        }
      ]
    });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Create product =====
router.post('/', auditLog, validateProduct, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { sku, name, unit, barcode, manageBatch, description, status } = req.body;

    // Check if SKU already exists
    const existingProduct = await db.Product.findOne({ where: { sku } });
    if (existingProduct) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'SKU already exists'
      });
    }

    // Create product
    const product = await db.Product.create({
      sku,
      name,
      unit,
      barcode,
      manageBatch: manageBatch || false,
      description,
      status: status || 'active'
    }, { transaction });

    // Initialize stock
    await db.Stock.create({
      productId: product.id,
      quantity: 0,
      reservedQty: 0
    }, { transaction });

    await transaction.commit();

    // Fetch complete product
    const completeProduct = await db.Product.findByPk(product.id, {
      include: [{ model: db.Stock, as: 'stock' }]
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: completeProduct
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create product error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Update product =====
router.put('/:id', auditLog, validateUUID('id'), validateProduct, async (req, res) => {
  try {
    const product = await db.Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const { sku, name, unit, barcode, manageBatch, description, status } = req.body;

    // Check if new SKU already exists (if SKU is being changed)
    if (sku && sku !== product.sku) {
      const existingProduct = await db.Product.findOne({ where: { sku } });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          error: 'SKU already exists'
        });
      }
    }

    // Update product
    await product.update({
      sku: sku || product.sku,
      name: name || product.name,
      unit: unit !== undefined ? unit : product.unit,
      barcode: barcode !== undefined ? barcode : product.barcode,
      manageBatch: manageBatch !== undefined ? manageBatch : product.manageBatch,
      description: description !== undefined ? description : product.description,
      status: status || product.status
    });

    // Fetch updated product with stock
    const updatedProduct = await db.Product.findByPk(product.id, {
      include: [{ model: db.Stock, as: 'stock' }]
    });

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Delete product =====
router.delete('/:id', auditLog, validateUUID('id'), async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const product = await db.Product.findByPk(req.params.id, {
      include: [{ model: db.Stock, as: 'stock' }]
    });

    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Check if product has stock
    if (product.stock && product.stock.quantity > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Cannot delete product with existing stock'
      });
    }

    // Check if product has any inbound/outbound details
    const inboundCount = await db.InboundDetail.count({
      where: { productId: product.id }
    });

    const outboundCount = await db.OutboundDetail.count({
      where: { productId: product.id }
    });

    if (inboundCount > 0 || outboundCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Cannot delete product with transaction history. Consider marking it as inactive instead.'
      });
    }

    // Delete stock first
    if (product.stock) {
      await product.stock.destroy({ transaction });
    }

    // Delete batches if any
    await db.Batch.destroy({
      where: { productId: product.id },
      transaction
    });

    // Delete product
    await product.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Bulk import products =====
router.post('/bulk-import', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Products must be a non-empty array'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const productData of products) {
      try {
        const { sku, name, unit, barcode, manageBatch, description } = productData;

        // Check if SKU exists
        const existing = await db.Product.findOne({ where: { sku } });
        if (existing) {
          results.failed.push({
            sku,
            reason: 'SKU already exists'
          });
          continue;
        }

        // Create product
        const product = await db.Product.create({
          sku,
          name,
          unit,
          barcode,
          manageBatch: manageBatch || false,
          description,
          status: 'active'
        }, { transaction });

        // Initialize stock
        await db.Stock.create({
          productId: product.id,
          quantity: 0,
          reservedQty: 0
        }, { transaction });

        results.success.push({
          sku,
          id: product.id
        });
      } catch (error) {
        results.failed.push({
          sku: productData.sku,
          reason: error.message
        });
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Imported ${results.success.length} products, ${results.failed.length} failed`,
      results
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Bulk import error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Get product stock history =====
router.get('/:id/history', validateUUID('id'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const product = await db.Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get inbound history
    const inbounds = await db.InboundDetail.findAll({
      where: {
        productId: req.params.id,
        ...dateFilter
      },
      include: [{
        model: db.InboundHeader,
        as: 'header',
        where: { status: 'completed' }
      }],
      order: [['createdAt', 'DESC']]
    });

    // Get outbound history
    const outbounds = await db.OutboundDetail.findAll({
      where: {
        productId: req.params.id,
        ...dateFilter
      },
      include: [{
        model: db.OutboundHeader,
        as: 'header',
        where: { status: 'completed' }
      }],
      order: [['createdAt', 'DESC']]
    });

    // Get inventory adjustments
    const inventoryAdjustments = await db.InventoryCount.findAll({
      where: {
        productId: req.params.id,
        difference: { [Op.ne]: 0 }
      },
      include: [{
        model: db.InventorySession,
        as: 'session',
        where: { status: 'completed' }
      }],
      order: [['countedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        product,
        inbounds,
        outbounds,
        inventoryAdjustments
      }
    });
  } catch (error) {
    console.error('Get product history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;