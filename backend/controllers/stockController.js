const db = require('../models');
const { Op } = require('sequelize');

// Check low stock and create notifications
exports.checkLowStock = async (req, res) => {
  try {
    const { threshold = 20 } = req.body;

    // Get all products with stock below threshold
    const lowStockProducts = await db.Stock.findAll({
      where: {
        quantity: { [Op.lt]: threshold }
      },
      include: [{
        model: db.Product,
        as: 'product',
        attributes: ['id', 'sku', 'name', 'unit', 'minStockLevel']
      }]
    });

    // Create notifications for low stock
    const notifications = [];
    for (const stock of lowStockProducts) {
      if (stock.product) {
        const notification = await db.Notification.create({
          userId: req.user?.id || 'system',
          title: 'Cảnh báo: Tồn kho thấp',
          message: `Sản phẩm ${stock.product.name} (${stock.product.sku}) chỉ còn ${stock.quantity} ${stock.product.unit}`,
          type: 'warning',
          relatedId: stock.productId,
          relatedType: 'product'
        });
        notifications.push(notification);
      }
    }

    res.json({
      success: true,
      message: `Đã tạo ${notifications.length} thông báo cảnh báo tồn kho thấp`,
      data: {
        lowStockCount: lowStockProducts.length,
        notifications: notifications.length
      }
    });
  } catch (error) {
    console.error('Check low stock error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get low stock products
exports.getLowStockProducts = async (req, res) => {
  try {
    const { threshold = 20, limit = 100 } = req.query;

    const lowStockProducts = await db.Stock.findAll({
      where: {
        quantity: { [Op.lt]: threshold }
      },
      include: [{
        model: db.Product,
        as: 'product',
        attributes: ['id', 'sku', 'name', 'unit', 'minStockLevel', 'status']
      }],
      order: [['quantity', 'ASC']],
      limit: parseInt(limit)
    });

    // Add available quantity
    const productsWithAvailable = lowStockProducts.map(stock => ({
      ...stock.toJSON(),
      availableQty: parseFloat(stock.quantity) - parseFloat(stock.reservedQty)
    }));

    res.json({
      success: true,
      data: productsWithAvailable
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get stock by product ID
exports.getStockByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const stock = await db.Stock.findOne({
      where: { productId },
      include: [{
        model: db.Product,
        as: 'product'
      }]
    });

    if (!stock) {
      return res.status(404).json({ 
        success: false, 
        error: 'Stock not found' 
      });
    }

    res.json({
      success: true,
      data: {
        ...stock.toJSON(),
        availableQty: parseFloat(stock.quantity) - parseFloat(stock.reservedQty)
      }
    });
  } catch (error) {
    console.error('Get stock by product error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

module.exports = exports;