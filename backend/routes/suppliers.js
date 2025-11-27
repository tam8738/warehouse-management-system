const express = require('express');
const router = express.Router();
const { auditLog } = require('../middleware/audit');
const db = require('../models');
const { Op } = require('sequelize');
const { validateSupplier, validateUUID, validatePagination } = require('../middleware/validation');

// ===== Get all suppliers with pagination and filters =====
router.get('/', validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 1000, // Default lớn để lấy tất cả
      search,
      status
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { contact: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await db.Supplier.findAndCountAll({
      where,
      order: [['name', 'ASC']],
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
    console.error('Get suppliers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Get supplier by ID =====
router.get('/:id', validateUUID('id'), async (req, res) => {
  try {
    const supplier = await db.Supplier.findByPk(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    console.error('Get supplier by ID error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Create supplier =====
router.post('/', auditLog, validateSupplier, async (req, res) => {
  try {
    const { name, contact, email, phone, address, taxCode, notes, status } = req.body;

    // Check if email already exists (if provided)
    if (email) {
      const existingSupplier = await db.Supplier.findOne({ where: { email } });
      if (existingSupplier) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // Create supplier
    const supplier = await db.Supplier.create({
      name,
      contact,
      email,
      phone,
      address,
      taxCode,
      notes,
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Update supplier =====
router.put('/:id', auditLog, validateUUID('id'), validateSupplier, async (req, res) => {
  try {
    const supplier = await db.Supplier.findByPk(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    const { name, contact, email, phone, address, taxCode, notes, status } = req.body;

    // Check if new email already exists (if email is being changed)
    if (email && email !== supplier.email) {
      const existingSupplier = await db.Supplier.findOne({ where: { email } });
      if (existingSupplier) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // Update supplier
    await supplier.update({
      name: name || supplier.name,
      contact: contact !== undefined ? contact : supplier.contact,
      email: email !== undefined ? email : supplier.email,
      phone: phone !== undefined ? phone : supplier.phone,
      address: address !== undefined ? address : supplier.address,
      taxCode: taxCode !== undefined ? taxCode : supplier.taxCode,
      notes: notes !== undefined ? notes : supplier.notes,
      status: status || supplier.status
    });

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ===== Delete supplier =====
router.delete('/:id', auditLog, validateUUID('id'), async (req, res) => {
  try {
    const supplier = await db.Supplier.findByPk(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    // Check if supplier has any inbound records
    const inboundCount = await db.InboundHeader.count({
      where: { supplierId: supplier.id }
    });

    if (inboundCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete supplier with transaction history. Consider marking it as inactive instead.'
      });
    }

    // Check if supplier has any batches
    const batchCount = await db.Batch.count({
      where: { supplierId: supplier.id }
    });

    if (batchCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete supplier with existing batches. Consider marking it as inactive instead.'
      });
    }

    // Delete supplier
    await supplier.destroy();

    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;