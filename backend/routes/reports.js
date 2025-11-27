const express = require('express');
const router = express.Router();
const db = require('../models');
const { Op } = require('sequelize');

// ===== Stock Report - Current stock levels =====
router.get('/stock', async (req, res) => {
  try {
    const { status, lowStock, minQty = 10 } = req.query;

    const where = {};
    if (lowStock === 'true') {
      where.quantity = { [Op.lt]: parseInt(minQty) };
    }

    const productWhere = {};
    if (status) {
      productWhere.status = status;
    }

    const stocks = await db.Stock.findAll({
      where,
      include: [{
        model: db.Product,
        as: 'product',
        where: productWhere,
        attributes: ['id', 'sku', 'name', 'unit', 'status', 'manageBatch']
      }],
      order: [['quantity', 'ASC']]
    });

    const summary = {
      totalProducts: stocks.length,
      totalQuantity: stocks.reduce((sum, s) => sum + parseFloat(s.quantity), 0),
      lowStockCount: stocks.filter(s => s.quantity < minQty).length,
      outOfStockCount: stocks.filter(s => s.quantity <= 0).length
    };

    res.json({ success: true, data: stocks, summary });
  } catch (error) {
    console.error('Stock report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ✅ LOW STOCK REPORT (THÊM MỚI) =====
router.get('/low-stock', async (req, res) => {
  try {
    const { threshold = 20, limit = 1000 } = req.query;

    const stocks = await db.Stock.findAll({
      where: {
        quantity: { [Op.lt]: parseInt(threshold) }
      },
      include: [{
        model: db.Product,
        as: 'product',
        attributes: ['id', 'sku', 'name', 'unit', 'status']
      }],
      order: [['quantity', 'ASC']],
      limit: parseInt(limit)
    });

    res.json({ success: true, data: stocks });
  } catch (error) {
    console.error('Low stock report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ✅ EXPIRING BATCHES REPORT (THÊM MỚI) =====
router.get('/expiring', async (req, res) => {
  try {
    const { days = 30, limit = 1000 } = req.query;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const batches = await db.Batch.findAll({
      where: {
        expiryDate: { [Op.between]: [new Date(), futureDate] },
        status: 'active'
      },
      include: [{
        model: db.Product,
        as: 'product',
        attributes: ['id', 'sku', 'name', 'unit']
      }],
      order: [['expiryDate', 'ASC']],
      limit: parseInt(limit)
    });

    // Tính số ngày còn lại
    const today = new Date();
    const batchesWithDays = batches.map(batch => {
      const daysUntilExpiry = Math.ceil((new Date(batch.expiryDate) - today) / (1000 * 60 * 60 * 24));
      return {
        ...batch.toJSON(),
        daysUntilExpiry
      };
    });

    res.json({ success: true, data: batchesWithDays });
  } catch (error) {
    console.error('Expiring batches report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Batch Report - All batches with expiry tracking =====
router.get('/batches', async (req, res) => {
  try {
    const { status, productId, expiringSoon, days = 30 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (productId) where.productId = productId;

    if (expiringSoon === 'true') {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(days));
      where.expiryDate = { [Op.between]: [new Date(), futureDate] };
      where.status = 'active';
    }

    const batches = await db.Batch.findAll({
      where,
      include: [
        { model: db.Product, as: 'product', attributes: ['id', 'sku', 'name', 'unit'] },
        { model: db.Supplier, as: 'supplier', attributes: ['id', 'name', 'contact'] }
      ],
      order: [['expiryDate', 'ASC']]
    });

    const today = new Date();
    const batchesWithStatus = batches.map(batch => {
      const daysUntilExpiry = Math.ceil((new Date(batch.expiryDate) - today) / (1000 * 60 * 60 * 24));
      let expiryStatus = 'normal';
      if (batch.expiryDate < today) {
        expiryStatus = 'expired';
      } else if (daysUntilExpiry <= 7) {
        expiryStatus = 'critical';
      } else if (daysUntilExpiry <= 30) {
        expiryStatus = 'warning';
      }
      return { ...batch.toJSON(), daysUntilExpiry, expiryStatus };
    });

    const summary = {
      totalBatches: batchesWithStatus.length,
      activeBatches: batchesWithStatus.filter(b => b.status === 'active').length,
      expiredBatches: batchesWithStatus.filter(b => b.expiryStatus === 'expired').length,
      criticalBatches: batchesWithStatus.filter(b => b.expiryStatus === 'critical').length,
      warningBatches: batchesWithStatus.filter(b => b.expiryStatus === 'warning').length
    };

    res.json({ success: true, data: batchesWithStatus, summary });
  } catch (error) {
    console.error('Batch report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Inbound Report - Inbound transactions =====
router.get('/inbound', async (req, res) => {
  try {
    const { startDate, endDate, status, supplierId, groupBy } = req.query;

    const where = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    if (startDate && endDate) {
      where.receivedDate = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    const inbounds = await db.InboundHeader.findAll({
      where,
      include: [
        { model: db.Supplier, as: 'supplier', attributes: ['id', 'name'] },
        { model: db.InboundDetail, as: 'details', include: [{ model: db.Product, as: 'product', attributes: ['id', 'sku', 'name'] }] }
      ],
      order: [['receivedDate', 'DESC']]
    });

    let totalQuantity = 0;
    let totalItems = 0;
    inbounds.forEach(inbound => {
      inbound.details.forEach(detail => {
        totalQuantity += detail.quantity;
        totalItems++;
      });
    });

    let groupedData = null;
    if (groupBy === 'supplier') {
      const supplierMap = {};
      inbounds.forEach(inbound => {
        const supplierId = inbound.supplierId;
        const supplierName = inbound.supplier?.name || 'Unknown';

        if (!supplierMap[supplierId]) {
          supplierMap[supplierId] = { supplierId, supplierName, totalInbounds: 0, totalQuantity: 0 };
        }

        supplierMap[supplierId].totalInbounds++;
        inbound.details.forEach(detail => {
          supplierMap[supplierId].totalQuantity += detail.quantity;
        });
      });

      groupedData = Object.values(supplierMap);
    }

    res.json({
      success: true,
      data: inbounds,
      summary: {
        totalInbounds: inbounds.length,
        totalQuantity,
        totalItems,
        completedCount: inbounds.filter(i => i.status === 'completed').length,
        draftCount: inbounds.filter(i => i.status === 'draft').length
      },
      ...(groupedData && { groupedBySupplier: groupedData })
    });
  } catch (error) {
    console.error('Inbound report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Outbound Report - Outbound transactions =====
router.get('/outbound', async (req, res) => {
  try {
    const { startDate, endDate, status, customer, groupBy } = req.query;

    const where = {};
    if (status) where.status = status;
    if (customer) where.customer = { [Op.iLike]: `%${customer}%` };

    if (startDate && endDate) {
      where.deliveryDate = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    const outbounds = await db.OutboundHeader.findAll({
      where,
      include: [
        { model: db.OutboundDetail, as: 'details', include: [{ model: db.Product, as: 'product', attributes: ['id', 'sku', 'name'] }] }
      ],
      order: [['deliveryDate', 'DESC']]
    });

    let totalQuantity = 0;
    let totalItems = 0;
    outbounds.forEach(outbound => {
      outbound.details.forEach(detail => {
        totalQuantity += detail.quantity;
        totalItems++;
      });
    });

    let groupedData = null;
    if (groupBy === 'customer') {
      const customerMap = {};
      outbounds.forEach(outbound => {
        const customerName = outbound.customer;
        if (!customerMap[customerName]) {
          customerMap[customerName] = { customer: customerName, totalOutbounds: 0, totalQuantity: 0 };
        }
        customerMap[customerName].totalOutbounds++;
        outbound.details.forEach(detail => {
          customerMap[customerName].totalQuantity += detail.quantity;
        });
      });
      groupedData = Object.values(customerMap);
    }

    res.json({
      success: true,
      data: outbounds,
      summary: {
        totalOutbounds: outbounds.length,
        totalQuantity,
        totalItems,
        completedCount: outbounds.filter(o => o.status === 'completed').length,
        draftCount: outbounds.filter(o => o.status === 'draft').length
      },
      ...(groupedData && { groupedByCustomer: groupedData })
    });
  } catch (error) {
    console.error('Outbound report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ✅ DASHBOARD SUMMARY (THÊM MỚI - OPTIONAL) =====
router.get('/dashboard', async (req, res) => {
  try {
    // Tổng sản phẩm
    const totalProducts = await db.Product.count({ where: { status: 'active' } });

    // Tổng tồn kho
    const stocks = await db.Stock.findAll({ attributes: ['quantity'] });
    const totalStock = stocks.reduce((sum, s) => sum + parseFloat(s.quantity), 0);

    // Tồn kho thấp
    const lowStockCount = await db.Stock.count({
      where: { quantity: { [Op.lt]: 20 } }
    });

    // Lô hàng sắp hết hạn
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const expiringCount = await db.Batch.count({
      where: {
        expiryDate: { [Op.between]: [new Date(), futureDate] },
        status: 'active'
      }
    });

    // Phiếu nhập/xuất hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayInbound = await db.InboundHeader.count({
      where: {
        receivedDate: { [Op.between]: [today, tomorrow] },
        status: 'completed'
      }
    });

    const todayOutbound = await db.OutboundHeader.count({
      where: {
        deliveryDate: { [Op.between]: [today, tomorrow] },
        status: 'completed'
      }
    });

    res.json({
      success: true,
      data: {
        totalProducts,
        totalStock,
        lowStockCount,
        expiringCount,
        todayInbound,
        todayOutbound
      }
    });
  } catch (error) {
    console.error('Dashboard report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;