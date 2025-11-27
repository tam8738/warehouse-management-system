const express = require('express');
const router = express.Router();
const { auditLog } = require('../middleware/audit');
const db = require('../models');
const { Op } = require('sequelize');

// Get all putaway tasks
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, assignedTo } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;

    const { count, rows } = await db.Putaway.findAndCountAll({
      where,
      include: [
        { model: db.Product, as: 'product', attributes: ['id', 'sku', 'name'] },
        { model: db.Bin, as: 'destinationBin' },
        { model: db.Bin, as: 'suggestedBin' },
        { model: db.User, as: 'worker', attributes: ['id', 'username', 'fullName'] }
      ],
      order: [['priority', 'DESC'], ['createdAt', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Assign putaway task
router.post('/:id/assign', auditLog, async (req, res) => {
  try {
    const putaway = await db.Putaway.findByPk(req.params.id);
    if (!putaway) return res.status(404).json({ success: false, error: 'Putaway not found' });
    
    const { assignedTo } = req.body;
    await putaway.update({ assignedTo, assignedAt: new Date(), status: 'assigned' });
    
    res.json({ success: true, message: 'Putaway task assigned', data: putaway });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start putaway task
router.post('/:id/start', auditLog, async (req, res) => {
  try {
    const putaway = await db.Putaway.findByPk(req.params.id);
    if (!putaway) return res.status(404).json({ success: false, error: 'Putaway not found' });
    
    await putaway.update({ startedAt: new Date(), status: 'in_progress' });
    
    res.json({ success: true, message: 'Putaway task started', data: putaway });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete putaway task
router.post('/:id/complete', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const putaway = await db.Putaway.findByPk(req.params.id);
    if (!putaway) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Putaway not found' });
    }

    const { toBinId } = req.body;
    if (!toBinId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: 'Destination bin required' });
    }

    // Update bin stock
    const [binStock, created] = await db.BinStock.findOrCreate({
      where: { binId: toBinId, productId: putaway.productId, batchNo: putaway.batchNo },
      defaults: { quantity: 0, reservedQty: 0 },
      transaction
    });

    await binStock.increment('quantity', { by: putaway.quantity, transaction });

    // Update bin status
    const bin = await db.Bin.findByPk(toBinId);
    await bin.update({ 
      status: 'partial',
      currentQty: parseFloat(bin.currentQty || 0) + parseFloat(putaway.quantity)
    }, { transaction });

    // Complete putaway
    await putaway.update({ 
      toBinId, 
      completedAt: new Date(), 
      status: 'completed' 
    }, { transaction });

    await transaction.commit();

    const updated = await db.Putaway.findByPk(putaway.id, {
      include: [
        { model: db.Product, as: 'product' },
        { model: db.Bin, as: 'destinationBin' }
      ]
    });

    res.json({ success: true, message: 'Putaway completed', data: updated });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;