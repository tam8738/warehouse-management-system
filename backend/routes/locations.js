const express = require('express');
const router = express.Router();
const { auditLog } = require('../middleware/audit');
const db = require('../models');
const { Op } = require('sequelize');

// =============================================
// ZONES MANAGEMENT
// =============================================

// Get all zones
router.get('/zones', async (req, res) => {
  try {
    const { page = 1, limit = 20, warehouseId, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;

    const { count, rows } = await db.Zone.findAndCountAll({
      where,
      include: [
        {
          model: db.Warehouse,
          as: 'warehouse',
          attributes: ['id', 'code', 'name']
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
    console.error('Get zones error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get zone by ID
router.get('/zones/:id', async (req, res) => {
  try {
    const zone = await db.Zone.findByPk(req.params.id, {
      include: [
        {
          model: db.Warehouse,
          as: 'warehouse'
        },
        {
          model: db.Aisle,
          as: 'aisles',
          include: [{ model: db.Rack, as: 'racks' }]
        }
      ]
    });

    if (!zone) {
      return res.status(404).json({ success: false, error: 'Zone not found' });
    }

    res.json({ success: true, data: zone });
  } catch (error) {
    console.error('Get zone error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create zone
router.post('/zones', auditLog, async (req, res) => {
  try {
    const { warehouseId, code, name, type, temperature, capacity, status, notes } = req.body;

    if (!warehouseId || !code || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: warehouseId, code, name'
      });
    }

    const existing = await db.Zone.findOne({ where: { warehouseId, code } });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Zone code already exists in this warehouse'
      });
    }

    const zone = await db.Zone.create({
      warehouseId,
      code,
      name,
      type: type || 'storage',
      temperature: temperature || 'ambient',
      capacity,
      status: status || 'active',
      notes
    });

    const completeZone = await db.Zone.findByPk(zone.id, {
      include: [{ model: db.Warehouse, as: 'warehouse' }]
    });

    res.status(201).json({
      success: true,
      message: 'Zone created successfully',
      data: completeZone
    });
  } catch (error) {
    console.error('Create zone error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update zone
router.put('/zones/:id', auditLog, async (req, res) => {
  try {
    const zone = await db.Zone.findByPk(req.params.id);
    if (!zone) {
      return res.status(404).json({ success: false, error: 'Zone not found' });
    }

    const { code, name, type, temperature, capacity, status, notes } = req.body;

    if (code && code !== zone.code) {
      const existing = await db.Zone.findOne({
        where: { warehouseId: zone.warehouseId, code }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Zone code already exists'
        });
      }
    }

    await zone.update({
      code: code || zone.code,
      name: name || zone.name,
      type: type || zone.type,
      temperature: temperature || zone.temperature,
      capacity: capacity !== undefined ? capacity : zone.capacity,
      status: status || zone.status,
      notes: notes !== undefined ? notes : zone.notes
    });

    res.json({
      success: true,
      message: 'Zone updated successfully',
      data: zone
    });
  } catch (error) {
    console.error('Update zone error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete zone
router.delete('/zones/:id', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const zone = await db.Zone.findByPk(req.params.id);
    if (!zone) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Zone not found' });
    }

    const aisleCount = await db.Aisle.count({ where: { zoneId: zone.id } });
    if (aisleCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Cannot delete zone with existing aisles'
      });
    }

    await zone.destroy({ transaction });
    await transaction.commit();

    res.json({ success: true, message: 'Zone deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete zone error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// AISLES MANAGEMENT
// =============================================

// Get all aisles
router.get('/aisles', async (req, res) => {
  try {
    const { page = 1, limit = 50, zoneId, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (zoneId) where.zoneId = zoneId;
    if (status) where.status = status;

    const { count, rows } = await db.Aisle.findAndCountAll({
      where,
      include: [
        {
          model: db.Zone,
          as: 'zone',
          attributes: ['id', 'code', 'name'],
          include: [{
            model: db.Warehouse,
            as: 'warehouse',
            attributes: ['id', 'code', 'name']
          }]
        }
      ],
      order: [['sequence', 'ASC']],
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
    console.error('Get aisles error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create aisle
router.post('/aisles', auditLog, async (req, res) => {
  try {
    const { zoneId, code, name, sequence, width, length, status, notes } = req.body;

    if (!zoneId || !code || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: zoneId, code, name'
      });
    }

    const existing = await db.Aisle.findOne({ where: { zoneId, code } });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Aisle code already exists in this zone'
      });
    }

    const aisle = await db.Aisle.create({
      zoneId,
      code,
      name,
      sequence: sequence || 0,
      width,
      length,
      status: status || 'active',
      notes
    });

    const completeAisle = await db.Aisle.findByPk(aisle.id, {
      include: [{ model: db.Zone, as: 'zone' }]
    });

    res.status(201).json({
      success: true,
      message: 'Aisle created successfully',
      data: completeAisle
    });
  } catch (error) {
    console.error('Create aisle error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update aisle
router.put('/aisles/:id', auditLog, async (req, res) => {
  try {
    const aisle = await db.Aisle.findByPk(req.params.id);
    if (!aisle) {
      return res.status(404).json({ success: false, error: 'Aisle not found' });
    }

    await aisle.update(req.body);

    res.json({
      success: true,
      message: 'Aisle updated successfully',
      data: aisle
    });
  } catch (error) {
    console.error('Update aisle error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete aisle
router.delete('/aisles/:id', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const aisle = await db.Aisle.findByPk(req.params.id);
    if (!aisle) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Aisle not found' });
    }

    const rackCount = await db.Rack.count({ where: { aisleId: aisle.id } });
    if (rackCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Cannot delete aisle with existing racks'
      });
    }

    await aisle.destroy({ transaction });
    await transaction.commit();

    res.json({ success: true, message: 'Aisle deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete aisle error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// RACKS MANAGEMENT
// =============================================

// Get all racks
router.get('/racks', async (req, res) => {
  try {
    const { page = 1, limit = 100, aisleId, status } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (aisleId) where.aisleId = aisleId;
    if (status) where.status = status;

    const { count, rows } = await db.Rack.findAndCountAll({
      where,
      include: [
        {
          model: db.Aisle,
          as: 'aisle',
          attributes: ['id', 'code', 'name']
        }
      ],
      order: [['sequence', 'ASC']],
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
    console.error('Get racks error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create rack
router.post('/racks', auditLog, async (req, res) => {
  try {
    const { aisleId, code, name, sequence, levels, maxWeight, width, height, depth, status, notes } = req.body;

    if (!aisleId || !code || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: aisleId, code, name'
      });
    }

    const existing = await db.Rack.findOne({ where: { aisleId, code } });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Rack code already exists in this aisle'
      });
    }

    const rack = await db.Rack.create({
      aisleId,
      code,
      name,
      sequence: sequence || 0,
      levels: levels || 5,
      maxWeight,
      width,
      height,
      depth,
      status: status || 'active',
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Rack created successfully',
      data: rack
    });
  } catch (error) {
    console.error('Create rack error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update rack
router.put('/racks/:id', auditLog, async (req, res) => {
  try {
    const rack = await db.Rack.findByPk(req.params.id);
    if (!rack) {
      return res.status(404).json({ success: false, error: 'Rack not found' });
    }

    await rack.update(req.body);

    res.json({
      success: true,
      message: 'Rack updated successfully',
      data: rack
    });
  } catch (error) {
    console.error('Update rack error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete rack
router.delete('/racks/:id', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const rack = await db.Rack.findByPk(req.params.id);
    if (!rack) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Rack not found' });
    }

    const binCount = await db.Bin.count({ where: { rackId: rack.id } });
    if (binCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Cannot delete rack with existing bins'
      });
    }

    await rack.destroy({ transaction });
    await transaction.commit();

    res.json({ success: true, message: 'Rack deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete rack error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================================
// BINS MANAGEMENT
// =============================================

// Get all bins
router.get('/bins', async (req, res) => {
  try {
    const { page = 1, limit = 100, rackId, status, type, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (rackId) where.rackId = rackId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await db.Bin.findAndCountAll({
      where,
      include: [
        {
          model: db.Rack,
          as: 'rack',
          attributes: ['id', 'code', 'name']
        },
        {
          model: db.Product,
          as: 'product',
          attributes: ['id', 'sku', 'name']
        }
      ],
      order: [['level', 'ASC'], ['position', 'ASC']],
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
    console.error('Get bins error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get bin by code or barcode
router.get('/bins/search', async (req, res) => {
  try {
    const { code, barcode } = req.query;

    if (!code && !barcode) {
      return res.status(400).json({
        success: false,
        error: 'Must provide code or barcode'
      });
    }

    const where = {};
    if (code) where.code = code;
    if (barcode) where.barcode = barcode;

    const bin = await db.Bin.findOne({
      where,
      include: [
        {
          model: db.Rack,
          as: 'rack',
          include: [{
            model: db.Aisle,
            as: 'aisle',
            include: [{
              model: db.Zone,
              as: 'zone',
              include: [{
                model: db.Warehouse,
                as: 'warehouse'
              }]
            }]
          }]
        },
        {
          model: db.Product,
          as: 'product'
        },
        {
          model: db.BinStock,
          as: 'stocks',
          include: [{
            model: db.Product,
            as: 'product'
          }]
        }
      ]
    });

    if (!bin) {
      return res.status(404).json({ success: false, error: 'Bin not found' });
    }

    res.json({ success: true, data: bin });
  } catch (error) {
    console.error('Search bin error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create bin
router.post('/bins', auditLog, async (req, res) => {
  try {
    const { rackId, code, level, position, barcode, capacity, maxWeight, width, height, depth, productId, status, type, notes } = req.body;

    if (!rackId || !code || !level || !position) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: rackId, code, level, position'
      });
    }

    const existing = await db.Bin.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Bin code already exists'
      });
    }

    const bin = await db.Bin.create({
      rackId,
      code,
      level,
      position,
      barcode,
      capacity,
      maxWeight,
      width,
      height,
      depth,
      productId,
      currentQty: 0,
      status: status || 'empty',
      type: type || 'storage',
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Bin created successfully',
      data: bin
    });
  } catch (error) {
    console.error('Create bin error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Bulk create bins for a rack
router.post('/bins/bulk-create', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { rackId, levels, positionsPerLevel, prefix } = req.body;

    if (!rackId || !levels || !positionsPerLevel) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: rackId, levels, positionsPerLevel'
      });
    }

    const rack = await db.Rack.findByPk(rackId, {
      include: [{
        model: db.Aisle,
        as: 'aisle',
        include: [{
          model: db.Zone,
          as: 'zone',
          include: [{
            model: db.Warehouse,
            as: 'warehouse'
          }]
        }]
      }]
    });

    if (!rack) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Rack not found' });
    }

    const bins = [];
    const barcodePrefix = prefix || `${rack.aisle.zone.warehouse.code}-${rack.aisle.zone.code}-${rack.aisle.code}-${rack.code}`;

    for (let level = 1; level <= levels; level++) {
      for (let position = 1; position <= positionsPerLevel; position++) {
        const binCode = `${barcodePrefix}-L${String(level).padStart(2, '0')}-P${String(position).padStart(2, '0')}`;
        const barcode = `BIN${Date.now()}${level}${position}`;

        bins.push({
          rackId,
          code: binCode,
          level,
          position,
          barcode,
          currentQty: 0,
          status: 'empty',
          type: 'storage'
        });
      }
    }

    await db.Bin.bulkCreate(bins, { transaction });
    await transaction.commit();

    res.status(201).json({
      success: true,
      message: `Created ${bins.length} bins successfully`,
      data: { count: bins.length, bins }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Bulk create bins error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Update bin
router.put('/bins/:id', auditLog, async (req, res) => {
  try {
    const bin = await db.Bin.findByPk(req.params.id);
    if (!bin) {
      return res.status(404).json({ success: false, error: 'Bin not found' });
    }

    await bin.update(req.body);

    res.json({
      success: true,
      message: 'Bin updated successfully',
      data: bin
    });
  } catch (error) {
    console.error('Update bin error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete bin
router.delete('/bins/:id', auditLog, async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const bin = await db.Bin.findByPk(req.params.id);
    if (!bin) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: 'Bin not found' });
    }

    if (bin.currentQty > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Cannot delete bin with stock'
      });
    }

    await bin.destroy({ transaction });
    await transaction.commit();

    res.json({ success: true, message: 'Bin deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete bin error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;