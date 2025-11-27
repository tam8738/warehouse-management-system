const express = require('express');
const router = express.Router();
const { auditLog } = require('../middleware/audit');
const db = require('../models');
const { Op } = require('sequelize');

// ===== Get all warehouses =====
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await db.Warehouse.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: 'manager',
          attributes: ['id', 'username', 'fullName']
        },
        {
          model: db.Zone,
          as: 'zones',
          attributes: ['id', 'code', 'name', 'status']
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
    console.error('Get warehouses error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Get warehouse by ID =====
router.get('/:id', async (req, res) => {
  try {
    const warehouse = await db.Warehouse.findByPk(req.params.id, {
      include: [
        {
          model: db.User,
          as: 'manager',
          attributes: ['id', 'username', 'fullName']
        },
        {
          model: db.Zone,
          as: 'zones',
          include: [
            {
              model: db.Aisle,
              as: 'aisles',
              include: [
                {
                  model: db.Rack,
                  as: 'racks'
                }
              ]
            }
          ]
        }
      ]
    });

    if (!warehouse) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' });
    }

    res.json({ success: true, data: warehouse });
  } catch (error) {
    console.error('Get warehouse error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Create warehouse =====
router.post('/', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { code, name, address, city, capacity, status, type, managerId, notes } = req.body;

    if (!code || !name) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: code, name'
      });
    }

    const existing = await db.Warehouse.findOne({ where: { code } });
    if (existing) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Warehouse code already exists'
      });
    }

    const warehouse = await db.Warehouse.create({
      code,
      name,
      address,
      city,
      capacity,
      status: status || 'active',
      type: type || 'main',
      managerId,
      notes
    }, { transaction });

    await transaction.commit();

    const completeWarehouse = await db.Warehouse.findByPk(warehouse.id, {
      include: [{ model: db.User, as: 'manager' }]
    });

    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: completeWarehouse
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create warehouse error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Update warehouse =====
router.put('/:id', auditLog, async (req, res) => {
  try {
    const warehouse = await db.Warehouse.findByPk(req.params.id);

    if (!warehouse) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' });
    }

    const { code, name, address, city, capacity, status, type, managerId, notes } = req.body;

    if (code && code !== warehouse.code) {
      const existing = await db.Warehouse.findOne({ where: { code } });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Warehouse code already exists'
        });
      }
    }

    await warehouse.update({
      code: code || warehouse.code,
      name: name || warehouse.name,
      address: address !== undefined ? address : warehouse.address,
      city: city !== undefined ? city : warehouse.city,
      capacity: capacity !== undefined ? capacity : warehouse.capacity,
      status: status || warehouse.status,
      type: type || warehouse.type,
      managerId: managerId !== undefined ? managerId : warehouse.managerId,
      notes: notes !== undefined ? notes : warehouse.notes
    });

    const updatedWarehouse = await db.Warehouse.findByPk(warehouse.id, {
      include: [{ model: db.User, as: 'manager' }]
    });

    res.json({
      success: true,
      message: 'Warehouse updated successfully',
      data: updatedWarehouse
    });
  } catch (error) {
    console.error('Update warehouse error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Delete warehouse =====
router.delete('/:id', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const warehouse = await db.Warehouse.findByPk(req.params.id);

    if (!warehouse) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Warehouse not found' });
    }

    // Check if warehouse has zones
    const zoneCount = await db.Zone.count({ where: { warehouseId: warehouse.id } });
    if (zoneCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Cannot delete warehouse with existing zones. Delete zones first.'
      });
    }

    await warehouse.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: 'Warehouse deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete warehouse error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Get warehouse statistics =====
router.get('/:id/stats', async (req, res) => {
  try {
    const warehouse = await db.Warehouse.findByPk(req.params.id);

    if (!warehouse) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' });
    }

    // Count zones, aisles, racks, bins
    const zoneCount = await db.Zone.count({ where: { warehouseId: warehouse.id } });
    
    const aisleCount = await db.Aisle.count({
      include: [{
        model: db.Zone,
        as: 'zone',
        where: { warehouseId: warehouse.id }
      }]
    });

    const rackCount = await db.Rack.count({
      include: [{
        model: db.Aisle,
        as: 'aisle',
        include: [{
          model: db.Zone,
          as: 'zone',
          where: { warehouseId: warehouse.id }
        }]
      }]
    });

    const binCount = await db.Bin.count({
      include: [{
        model: db.Rack,
        as: 'rack',
        include: [{
          model: db.Aisle,
          as: 'aisle',
          include: [{
            model: db.Zone,
            as: 'zone',
            where: { warehouseId: warehouse.id }
          }]
        }]
      }]
    });

    const emptyBins = await db.Bin.count({
      where: { status: 'empty' },
      include: [{
        model: db.Rack,
        as: 'rack',
        include: [{
          model: db.Aisle,
          as: 'aisle',
          include: [{
            model: db.Zone,
            as: 'zone',
            where: { warehouseId: warehouse.id }
          }]
        }]
      }]
    });

    const occupiedBins = binCount - emptyBins;
    const utilizationRate = binCount > 0 ? ((occupiedBins / binCount) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        warehouse,
        stats: {
          zones: zoneCount,
          aisles: aisleCount,
          racks: rackCount,
          bins: {
            total: binCount,
            empty: emptyBins,
            occupied: occupiedBins
          },
          utilizationRate: `${utilizationRate}%`
        }
      }
    });
  } catch (error) {
    console.error('Get warehouse stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;