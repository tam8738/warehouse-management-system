const express = require('express');
const router = express.Router();
const { auditLog } = require('../middleware/audit');
const db = require('../models');
const { Op } = require('sequelize');

// ===== Get all QC records =====
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, qcResult, inboundId } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (qcResult) where.qcResult = qcResult;
    if (inboundId) where.inboundId = inboundId;

    const { count, rows } = await db.QualityCheck.findAndCountAll({
      where,
      include: [
        {
          model: db.InboundHeader,
          as: 'inbound',
          attributes: ['id', 'inboundNo', 'receivedDate']
        },
        {
          model: db.Product,
          as: 'product',
          attributes: ['id', 'sku', 'name', 'unit']
        },
        {
          model: db.User,
          as: 'inspector',
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
    console.error('Get QC records error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Get QC by ID =====
router.get('/:id', async (req, res) => {
  try {
    const qc = await db.QualityCheck.findByPk(req.params.id, {
      include: [
        {
          model: db.InboundHeader,
          as: 'inbound',
          include: [{
            model: db.Supplier,
            as: 'supplier'
          }]
        },
        {
          model: db.Product,
          as: 'product'
        },
        {
          model: db.User,
          as: 'inspector'
        },
        {
          model: db.Putaway,
          as: 'putawayTasks'
        }
      ]
    });

    if (!qc) {
      return res.status(404).json({ success: false, error: 'QC record not found' });
    }

    res.json({ success: true, data: qc });
  } catch (error) {
    console.error('Get QC by ID error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Create QC record =====
router.post('/', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { qcNo, inboundId, productId, batchNo, expectedQty, receivedQty } = req.body;

    if (!qcNo || !inboundId || !productId || !expectedQty || !receivedQty) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const existing = await db.QualityCheck.findOne({ where: { qcNo } });
    if (existing) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'QC number already exists'
      });
    }

    const qc = await db.QualityCheck.create({
      qcNo,
      inboundId,
      productId,
      batchNo,
      expectedQty,
      receivedQty,
      acceptedQty: 0,
      rejectedQty: 0,
      damagedQty: 0,
      qcResult: 'pending',
      status: 'pending'
    }, { transaction });

    await transaction.commit();

    const completeQC = await db.QualityCheck.findByPk(qc.id, {
      include: [
        { model: db.InboundHeader, as: 'inbound' },
        { model: db.Product, as: 'product' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'QC record created successfully',
      data: completeQC
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create QC error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Perform QC inspection =====
router.post('/:id/inspect', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const qc = await db.QualityCheck.findByPk(req.params.id);

    if (!qc) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'QC record not found' });
    }

    if (qc.status !== 'pending' && qc.status !== 'in_progress') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'QC already completed or cancelled'
      });
    }

    const {
      acceptedQty,
      rejectedQty,
      damagedQty,
      defectTypes,
      images,
      notes
    } = req.body;

    // Validate quantities
    const totalChecked = parseFloat(acceptedQty || 0) + 
                        parseFloat(rejectedQty || 0) + 
                        parseFloat(damagedQty || 0);

    if (totalChecked > parseFloat(qc.receivedQty)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Total checked quantity exceeds received quantity'
      });
    }

    // Determine QC result
    let qcResult = 'pending';
    if (totalChecked === parseFloat(qc.receivedQty)) {
      if (acceptedQty === qc.receivedQty) {
        qcResult = 'passed';
      } else if (acceptedQty > 0) {
        qcResult = 'partial';
      } else {
        qcResult = 'failed';
      }
    }

    await qc.update({
      acceptedQty: acceptedQty || 0,
      rejectedQty: rejectedQty || 0,
      damagedQty: damagedQty || 0,
      qcResult,
      qcBy: req.user?.id,
      qcDate: new Date(),
      defectTypes,
      images,
      notes,
      status: totalChecked === parseFloat(qc.receivedQty) ? 'completed' : 'in_progress'
    }, { transaction });

    // Auto-create putaway tasks for accepted quantity
    if (acceptedQty > 0 && qcResult !== 'pending') {
      const putawayNo = `PUT-${Date.now()}`;
      
      await db.Putaway.create({
        putawayNo,
        qcId: qc.id,
        inboundId: qc.inboundId,
        productId: qc.productId,
        batchNo: qc.batchNo,
        quantity: acceptedQty,
        fromLocation: 'QC-AREA',
        priority: 'normal',
        status: 'pending'
      }, { transaction });
    }

    await transaction.commit();

    const updatedQC = await db.QualityCheck.findByPk(qc.id, {
      include: [
        { model: db.InboundHeader, as: 'inbound' },
        { model: db.Product, as: 'product' },
        { model: db.User, as: 'inspector' },
        { model: db.Putaway, as: 'putawayTasks' }
      ]
    });

    res.json({
      success: true,
      message: 'QC inspection completed successfully',
      data: updatedQC
    });
  } catch (error) {
    await transaction.rollback();
    console.error('QC inspection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Cancel QC =====
router.post('/:id/cancel', auditLog, async (req, res) => {
  try {
    const qc = await db.QualityCheck.findByPk(req.params.id);

    if (!qc) {
      return res.status(404).json({ success: false, error: 'QC record not found' });
    }

    if (qc.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed QC'
      });
    }

    await qc.update({ status: 'cancelled' });

    res.json({
      success: true,
      message: 'QC cancelled successfully',
      data: qc
    });
  } catch (error) {
    console.error('Cancel QC error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Get QC statistics =====
router.get('/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const total = await db.QualityCheck.count({ where });
    const passed = await db.QualityCheck.count({ where: { ...where, qcResult: 'passed' } });
    const failed = await db.QualityCheck.count({ where: { ...where, qcResult: 'failed' } });
    const partial = await db.QualityCheck.count({ where: { ...where, qcResult: 'partial' } });
    const pending = await db.QualityCheck.count({ where: { ...where, qcResult: 'pending' } });

    const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        total,
        passed,
        failed,
        partial,
        pending,
        passRate: `${passRate}%`
      }
    });
  } catch (error) {
    console.error('Get QC stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;