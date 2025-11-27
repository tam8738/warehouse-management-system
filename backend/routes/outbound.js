const express = require('express');
const router = express.Router();
const { auditLog } = require('../middleware/audit');
const db = require('../models');
const { Op } = require('sequelize');
const { validateOutbound, validateUUID, validatePagination } = require('../middleware/validation');

// ===== Get all outbound headers with pagination =====
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, customer, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (customer) where.customer = { [Op.iLike]: `%${customer}%` };
    if (startDate && endDate) {
      where.deliveryDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows } = await db.OutboundHeader.findAndCountAll({
      where,
      include: [
        {
          model: db.OutboundDetail,
          as: 'details',
          include: [{
            model: db.Product,
            as: 'product',
            attributes: ['id', 'sku', 'name', 'unit']
          }]
        },
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'username', 'fullName']
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
    console.error('Get outbound error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Get outbound by ID =====
router.get('/:id', validateUUID('id'), async (req, res) => {
  try {
    const outbound = await db.OutboundHeader.findByPk(req.params.id, {
      include: [
        {
          model: db.OutboundDetail,
          as: 'details',
          include: [{ model: db.Product, as: 'product' }]
        },
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'username', 'fullName']
        }
      ]
    });

    if (!outbound) {
      return res.status(404).json({ success: false, error: 'Outbound not found' });
    }

    res.json({ success: true, data: outbound });
  } catch (error) {
    console.error('Get outbound by ID error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Create new outbound =====
router.post('/', auditLog, validateOutbound, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { outboundNo, customer, soNo, deliveryDate, notes, details } = req.body;

    const existingOutbound = await db.OutboundHeader.findOne({ where: { outboundNo } });
    if (existingOutbound) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Outbound number already exists'
      });
    }

    for (const detail of details) {
      const stock = await db.Stock.findOne({ where: { productId: detail.productId } });
      if (!stock || stock.quantity < detail.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for product ID: ${detail.productId}`
        });
      }
    }

    const outbound = await db.OutboundHeader.create({
      outboundNo,
      customer,
      soNo,
      deliveryDate: deliveryDate || new Date(),
      notes,
      status: 'draft',
      createdBy: req.user?.id
    }, { transaction });

    const detailsData = details.map(detail => ({
      outboundId: outbound.id,
      productId: detail.productId,
      batchNo: detail.batchNo,
      quantity: detail.quantity
    }));

    await db.OutboundDetail.bulkCreate(detailsData, { transaction });

    await transaction.commit();

    const completeOutbound = await db.OutboundHeader.findByPk(outbound.id, {
      include: [
        {
          model: db.OutboundDetail,
          as: 'details',
          include: [{ model: db.Product, as: 'product' }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Outbound created successfully',
      data: completeOutbound
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create outbound error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Update outbound (draft only) =====
router.put('/:id', auditLog, validateUUID('id'), validateOutbound, async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const outbound = await db.OutboundHeader.findByPk(req.params.id, { include: [{ model: db.OutboundDetail, as: 'details' }] });
    if (!outbound) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Outbound not found' });
    }
    if (outbound.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'Can only update outbound with draft status' });
    }

    const { customer, soNo, deliveryDate, notes, details } = req.body;

    await outbound.update({
      customer: customer || outbound.customer,
      soNo: soNo || outbound.soNo,
      deliveryDate: deliveryDate || outbound.deliveryDate,
      notes: notes || outbound.notes
    }, { transaction });

    if (details && details.length > 0) {
      for (const detail of details) {
        const stock = await db.Stock.findOne({ where: { productId: detail.productId } });
        if (!stock || stock.quantity < detail.quantity) {
          await transaction.rollback();
          return res.status(400).json({ success: false, error: `Insufficient stock for product ID: ${detail.productId}` });
        }
      }

      await db.OutboundDetail.destroy({ where: { outboundId: outbound.id }, transaction });

      const detailsData = details.map(detail => ({
        outboundId: outbound.id,
        productId: detail.productId,
        batchNo: detail.batchNo,
        quantity: detail.quantity
      }));

      await db.OutboundDetail.bulkCreate(detailsData, { transaction });
    }

    await transaction.commit();

    const updatedOutbound = await db.OutboundHeader.findByPk(outbound.id, {
      include: [
        { model: db.OutboundDetail, as: 'details', include: [{ model: db.Product, as: 'product' }] }
      ]
    });

    res.json({ success: true, message: 'Outbound updated successfully', data: updatedOutbound });
  } catch (error) {
    await transaction.rollback();
    console.error('Update outbound error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Confirm outbound =====
router.post('/:id/confirm', auditLog, validateUUID('id'), async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const outbound = await db.OutboundHeader.findByPk(req.params.id, {
      include: [
        { model: db.OutboundDetail, as: 'details', include: [{ model: db.Product, as: 'product' }] }
      ]
    });

    if (!outbound) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Outbound not found' });
    }

    if (outbound.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'Outbound must be in draft status to confirm' });
    }

    for (const detail of outbound.details) {
      const stock = await db.Stock.findOne({ where: { productId: detail.productId }, transaction });
      if (!stock || stock.quantity < detail.quantity) {
        await transaction.rollback();
        return res.status(400).json({ success: false, error: `Insufficient stock for product: ${detail.product.name}` });
      }

      if (detail.batchNo && detail.product.manageBatch) {
        const batch = await db.Batch.findOne({
          where: { batchNo: detail.batchNo, productId: detail.productId },
          transaction
        });
        if (!batch || batch.quantity < detail.quantity) {
          await transaction.rollback();
          return res.status(400).json({ success: false, error: `Insufficient batch quantity for batch: ${detail.batchNo}` });
        }
      }
    }

    await outbound.update({ status: 'completed' }, { transaction });

    for (const detail of outbound.details) {
      const stock = await db.Stock.findOne({ where: { productId: detail.productId }, transaction });
      await stock.decrement('quantity', { by: detail.quantity, transaction });

      if (detail.batchNo && detail.product.manageBatch) {
        const batch = await db.Batch.findOne({ where: { batchNo: detail.batchNo, productId: detail.productId }, transaction });
        if (batch) {
          await batch.decrement('quantity', { by: detail.quantity, transaction });
          const updatedBatch = await batch.reload({ transaction });
          if (updatedBatch.quantity <= 0) {
            await updatedBatch.update({ status: 'depleted' }, { transaction });
          }
        }
      }
    }

    await transaction.commit();

    const updatedOutbound = await db.OutboundHeader.findByPk(outbound.id, {
      include: [
        { model: db.OutboundDetail, as: 'details', include: [{ model: db.Product, as: 'product' }] }
      ]
    });

    res.json({ success: true, message: 'Outbound confirmed successfully', data: updatedOutbound });
  } catch (error) {
    await transaction.rollback();
    console.error('Confirm outbound error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Cancel outbound =====
router.post('/:id/cancel', auditLog, validateUUID('id'), async (req, res) => {
  try {
    const outbound = await db.OutboundHeader.findByPk(req.params.id);
    if (!outbound) return res.status(404).json({ success: false, error: 'Outbound not found' });
    if (outbound.status === 'completed') {
      return res.status(400).json({ success: false, error: 'Cannot cancel completed outbound' });
    }

    await outbound.update({ status: 'cancelled' });

    res.json({ success: true, message: 'Outbound cancelled successfully', data: outbound });
  } catch (error) {
    console.error('Cancel outbound error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Delete outbound (draft only) =====
router.delete('/:id', auditLog, validateUUID('id'), async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const outbound = await db.OutboundHeader.findByPk(req.params.id);
    if (!outbound) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Outbound not found' });
    }
    if (outbound.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'Can only delete outbound with draft status' });
    }

    await db.OutboundDetail.destroy({ where: { outboundId: outbound.id }, transaction });
    await outbound.destroy({ transaction });

    await transaction.commit();

    res.json({ success: true, message: 'Outbound deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete outbound error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Export router =====
module.exports = router;