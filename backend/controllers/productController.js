const Product = require('../models/Product');
const Stock = require('../models/Stock');

// Lấy tất cả sản phẩm kèm stock
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{
        model: Stock,
        attributes: ['quantity', 'reservedQty']
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lấy sản phẩm theo ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [Stock]
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Tạo sản phẩm mới + khởi tạo stock
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);

    // Khởi tạo stock mặc định
    await Stock.create({
      productId: product.id,
      quantity: 0,
      reservedQty: 0
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Cập nhật sản phẩm
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await product.update(req.body);
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Xóa sản phẩm
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Kiểm tra stock tồn tại
    const stock = await Stock.findOne({ where: { productId: req.params.id } });
    if (stock && stock.quantity > 0) {
      return res.status(400).json({ error: 'Cannot delete product with existing stock' });
    }

    // Xóa stock nếu có
    if (stock) await stock.destroy();

    // Xóa product
    await product.destroy();

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
