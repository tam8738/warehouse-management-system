const express = require('express');
const router = express.Router();
const { auditLog } = require('../middleware/audit');
const db = require('../models');
const { Op } = require('sequelize');
const { validateInbound, validateUUID, validatePagination } = require('../middleware/validation');

// ===== Get all inbound headers with pagination =====
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, supplierId, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (startDate && endDate) {
      where.receivedDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows } = await db.InboundHeader.findAndCountAll({
      where,
      include: [
        {
          model: db.Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'contact']
        },
        {
          model: db.InboundDetail,
          as: 'details',
          include: [{
            model: db.Product,
            as: 'product',
            attributes: ['id', 'sku', 'name', 'unit']
          }]
        }
      ],
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
    console.error('Get inbound error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Get inbound by ID =====
router.get('/:id', validateUUID('id'), async (req, res) => {
  try {
    const inbound = await db.InboundHeader.findByPk(req.params.id, {
      include: [
        {
          model: db.Supplier,
          as: 'supplier'
        },
        {
          model: db.InboundDetail,
          as: 'details',
          include: [{
            model: db.Product,
            as: 'product'
          }]
        }
      ]
    });

    if (!inbound) {
      return res.status(404).json({ success: false, error: 'Inbound not found' });
    }

    res.json({ success: true, data: inbound });
  } catch (error) {
    console.error('Get inbound by ID error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Create new inbound =====
router.post('/', auditLog, validateInbound, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { inboundNo, supplierId, poNo, receivedDate, notes, details } = req.body;

    // Check if inboundNo already exists
    const existingInbound = await db.InboundHeader.findOne({
      where: { inboundNo }
    });

    if (existingInbound) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Inbound number already exists'
      });
    }

    // Create inbound header
    const inbound = await db.InboundHeader.create({
      inboundNo,
      supplierId,
      poNo,
      receivedDate: receivedDate || new Date(),
      notes,
      status: 'draft',
      createdBy: req.user?.id
    }, { transaction });

    // Create inbound details
    const detailsData = details.map(detail => ({
      headerId: inbound.id,
      productId: detail.productId,
      batchNo: detail.batchNo,
      quantity: detail.quantity,
      manufactureDate: detail.manufactureDate,
      expDate: detail.expDate,
      notes: detail.notes
    }));

    await db.InboundDetail.bulkCreate(detailsData, { transaction });

    await transaction.commit();

    // Fetch complete data
    const completeInbound = await db.InboundHeader.findByPk(inbound.id, {
      include: [
        { model: db.Supplier, as: 'supplier' },
        {
          model: db.InboundDetail,
          as: 'details',
          include: [{ model: db.Product, as: 'product' }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Inbound created successfully',
      data: completeInbound
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create inbound error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Update inbound (only draft status) =====
router.put('/:id', auditLog, validateUUID('id'), validateInbound, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const inbound = await db.InboundHeader.findByPk(req.params.id, {
      include: [{ model: db.InboundDetail, as: 'details' }]
    });

    if (!inbound) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Inbound not found' });
    }

    if (inbound.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Can only update inbound with draft status'
      });
    }

    const { supplierId, poNo, receivedDate, notes, details } = req.body;

    // Update header
    await inbound.update({
      supplierId: supplierId || inbound.supplierId,
      poNo: poNo || inbound.poNo,
      receivedDate: receivedDate || inbound.receivedDate,
      notes: notes || inbound.notes
    }, { transaction });

    // Update details if provided
    if (details && details.length > 0) {
      // Delete old details
      await db.InboundDetail.destroy({
        where: { headerId: inbound.id },
        transaction
      });

      // Create new details
      const detailsData = details.map(detail => ({
        headerId: inbound.id,
        productId: detail.productId,
        batchNo: detail.batchNo,
        quantity: detail.quantity,
        manufactureDate: detail.manufactureDate,
        expDate: detail.expDate,
        notes: detail.notes
      }));

      await db.InboundDetail.bulkCreate(detailsData, { transaction });
    }

    await transaction.commit();

    // Fetch updated data
    const updatedInbound = await db.InboundHeader.findByPk(inbound.id, {
      include: [
        { model: db.Supplier, as: 'supplier' },
        {
          model: db.InboundDetail,
          as: 'details',
          include: [{ model: db.Product, as: 'product' }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Inbound updated successfully',
      data: updatedInbound
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update inbound error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Confirm inbound (update stock and batches) =====
router.post('/:id/confirm', auditLog, validateUUID('id'), async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const inbound = await db.InboundHeader.findByPk(req.params.id, {
      include: [
        {
          model: db.InboundDetail,
          as: 'details',
          include: [{ model: db.Product, as: 'product' }]
        }
      ]
    });

    if (!inbound) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Inbound not found' });
    }

    if (inbound.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Inbound must be in draft status to confirm'
      });
    }

    // Update inbound status
    await inbound.update({ status: 'completed' }, { transaction });

    // Process each detail
    for (const detail of inbound.details) {
      // 1. Update or create Stock
      const [stock, created] = await db.Stock.findOrCreate({
        where: { productId: detail.productId },
        defaults: {
          productId: detail.productId,
          quantity: 0,
          reservedQty: 0
        },
        transaction
      });

      await stock.increment('quantity', {
        by: detail.quantity,
        transaction
      });

      // 2. Create or update Batch (if product manages batches)
      if (detail.product.manageBatch) {
        const [batch, batchCreated] = await db.Batch.findOrCreate({
          where: {
            batchNo: detail.batchNo,
            productId: detail.productId
          },
          defaults: {
            batchNo: detail.batchNo,
            productId: detail.productId,
            supplierId: inbound.supplierId,
            quantity: detail.quantity,
            manufactureDate: detail.manufactureDate,
            expiryDate: detail.expDate,
            warehouse: 'Main Warehouse', // Default warehouse
            location: 'A-01', // Default location
            status: 'active'
          },
          transaction
        });

        if (!batchCreated) {
          await batch.increment('quantity', {
            by: detail.quantity,
            transaction
          });
        }
      }
    }

    await transaction.commit();

    // Fetch updated inbound
    const updatedInbound = await db.InboundHeader.findByPk(inbound.id, {
      include: [
        { model: db.Supplier, as: 'supplier' },
        {
          model: db.InboundDetail,
          as: 'details',
          include: [{ model: db.Product, as: 'product' }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Inbound confirmed successfully',
      data: updatedInbound
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Confirm inbound error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Cancel inbound =====
router.post('/:id/cancel', auditLog, validateUUID('id'), async (req, res) => {
  try {
    const inbound = await db.InboundHeader.findByPk(req.params.id);

    if (!inbound) {
      return res.status(404).json({ success: false, error: 'Inbound not found' });
    }

    if (inbound.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed inbound'
      });
    }

    await inbound.update({ status: 'cancelled' });

    res.json({
      success: true,
      message: 'Inbound cancelled successfully',
      data: inbound
    });
  } catch (error) {
    console.error('Cancel inbound error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Delete inbound (only draft status) =====
router.delete('/:id', auditLog, validateUUID('id'), async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const inbound = await db.InboundHeader.findByPk(req.params.id);

    if (!inbound) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Inbound not found' });
    }

    if (inbound.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Can only delete inbound with draft status'
      });
    }

    // Delete details first (cascade should handle this, but explicit is better)
    await db.InboundDetail.destroy({
      where: { headerId: inbound.id },
      transaction
    });

    // Delete header
    await inbound.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Inbound deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete inbound error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;