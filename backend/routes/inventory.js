const express = require('express');
const router = express.Router();
const { auditLog } = require('../middleware/audit');
const db = require('../models');
const { Op } = require('sequelize');

// ===== Get all inventory sessions with pagination =====
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (startDate && endDate) {
      where.checkDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows } = await db.InventorySession.findAndCountAll({
      where,
      include: [
        {
          model: db.InventoryCount,
          as: 'counts',
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
    console.error('Get inventory sessions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Get inventory session by ID =====
router.get('/:id', async (req, res) => {
  try {
    const session = await db.InventorySession.findByPk(req.params.id, {
      include: [
        {
          model: db.InventoryCount,
          as: 'counts',
          include: [{
            model: db.Product,
            as: 'product'
          }]
        },
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'username', 'fullName']
        }
      ]
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Get session by ID error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Create inventory session =====
router.post('/', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { inventoryNo, checker, checkDate, notes } = req.body;

    if (!inventoryNo || !checker) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: inventoryNo, checker'
      });
    }

    // Check if inventoryNo already exists
    const existing = await db.InventorySession.findOne({
      where: { inventoryNo }
    });

    if (existing) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Inventory number already exists'
      });
    }

    const session = await db.InventorySession.create({
      inventoryNo,
      checker,
      checkDate: checkDate || new Date(),
      notes,
      status: 'draft',
      createdBy: req.user?.id
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Inventory session created successfully',
      data: session
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create inventory session error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Update inventory session (only draft) =====
router.put('/:id', auditLog, async (req, res) => {
  try {
    const session = await db.InventorySession.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Can only update session with draft status'
      });
    }

    const { checker, checkDate, notes } = req.body;

    await session.update({
      checker: checker || session.checker,
      checkDate: checkDate || session.checkDate,
      notes: notes || session.notes
    });

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: session
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Add/Update inventory counts =====
router.post('/:id/counts', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { counts } = req.body;

    if (!Array.isArray(counts) || counts.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Counts must be a non-empty array'
      });
    }

    const session = await db.InventorySession.findByPk(req.params.id);

    if (!session) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Can only add counts to draft session'
      });
    }

    // Process each count
    const countsData = [];
    for (const count of counts) {
      const { productId, batchNo, actualQty, notes } = count;

      if (!productId || !batchNo || actualQty === undefined) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Each count must have productId, batchNo, and actualQty'
        });
      }

      // Get system quantity from Stock or Batch
      let systemQty = 0;
      if (batchNo) {
        const batch = await db.Batch.findOne({
          where: { batchNo, productId }
        });
        systemQty = batch ? batch.quantity : 0;
      } else {
        const stock = await db.Stock.findOne({
          where: { productId }
        });
        systemQty = stock ? stock.quantity : 0;
      }

      countsData.push({
        sessionId: session.id,
        productId,
        batchNo,
        systemQty,
        actualQty,
        difference: actualQty - systemQty,
        notes,
        countedAt: new Date()
      });
    }

    // Delete old counts for this session (if updating)
    await db.InventoryCount.destroy({
      where: { sessionId: session.id },
      transaction
    });

    // Create new counts
    await db.InventoryCount.bulkCreate(countsData, { transaction });

    await transaction.commit();

    // Fetch updated session
    const updatedSession = await db.InventorySession.findByPk(session.id, {
      include: [{
        model: db.InventoryCount,
        as: 'counts',
        include: [{ model: db.Product, as: 'product' }]
      }]
    });

    res.json({
      success: true,
      message: 'Counts updated successfully',
      data: updatedSession
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Add counts error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Confirm inventory session (adjust stock based on differences) =====
router.post('/:id/confirm', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const session = await db.InventorySession.findByPk(req.params.id, {
      include: [{
        model: db.InventoryCount,
        as: 'counts',
        include: [{ model: db.Product, as: 'product' }]
      }]
    });

    if (!session) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Session must be in draft status to confirm'
      });
    }

    if (!session.counts || session.counts.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Session must have counts before confirmation'
      });
    }

    // Update session status
    await session.update({ status: 'completed' }, { transaction });

    // Adjust stock based on differences
    for (const count of session.counts) {
      if (count.difference !== 0) {
        // Update Stock
        const stock = await db.Stock.findOne({
          where: { productId: count.productId },
          transaction
        });

        if (stock) {
          await stock.increment('quantity', {
            by: count.difference,
            transaction
          });
        }

        // Update Batch if batchNo exists and product manages batches
        if (count.batchNo && count.product.manageBatch) {
          const batch = await db.Batch.findOne({
            where: {
              batchNo: count.batchNo,
              productId: count.productId
            },
            transaction
          });

          if (batch) {
            await batch.increment('quantity', {
              by: count.difference,
              transaction
            });

            // Update batch status if needed
            const updatedBatch = await batch.reload({ transaction });
            if (updatedBatch.quantity <= 0) {
              await updatedBatch.update({ status: 'depleted' }, { transaction });
            } else if (updatedBatch.status === 'depleted') {
              await updatedBatch.update({ status: 'active' }, { transaction });
            }
          }
        }
      }
    }

    await transaction.commit();

    // Fetch updated session
    const updatedSession = await db.InventorySession.findByPk(session.id, {
      include: [{
        model: db.InventoryCount,
        as: 'counts',
        include: [{ model: db.Product, as: 'product' }]
      }]
    });

    res.json({
      success: true,
      message: 'Inventory session confirmed and stock adjusted',
      data: updatedSession
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Confirm session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Cancel inventory session =====
router.post('/:id/cancel', auditLog, async (req, res) => {
  try {
    const session = await db.InventorySession.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed session'
      });
    }

    await session.update({ status: 'cancelled' });

    res.json({
      success: true,
      message: 'Session cancelled successfully',
      data: session
    });
  } catch (error) {
    console.error('Cancel session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Delete inventory session (only draft) =====
router.delete('/:id', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const session = await db.InventorySession.findByPk(req.params.id);

    if (!session) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Can only delete session with draft status'
      });
    }

    // Delete counts
    await db.InventoryCount.destroy({
      where: { sessionId: session.id },
      transaction
    });

    // Delete session
    await session.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;