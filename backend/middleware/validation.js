// Validation middleware for all routes

// Validate Product data
const validateProduct = (req, res, next) => {
  const { sku, name } = req.body;

  if (!sku || !name) {
    return res.status(400).json({
      success: false,
      error: 'SKU and name are required'
    });
  }

  // Validate SKU format (uppercase letters, numbers, and hyphens only)
  const skuRegex = /^[A-Z0-9-]+$/;
  if (!skuRegex.test(sku)) {
    return res.status(400).json({
      success: false,
      error: 'SKU must contain only uppercase letters, numbers, and hyphens'
    });
  }

  if (sku.length > 20) {
    return res.status(400).json({
      success: false,
      error: 'SKU must be 20 characters or less'
    });
  }

  next();
};

// Validate Supplier data
const validateSupplier = (req, res, next) => {
  const { name, email } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Supplier name is required'
    });
  }

  // Validate email format if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
  }

  next();
};

// Validate Inbound data
const validateInbound = (req, res, next) => {
  const { inboundNo, supplierId, details } = req.body;

  if (!inboundNo || !supplierId) {
    return res.status(400).json({
      success: false,
      error: 'Inbound number and supplier ID are required'
    });
  }

  if (!details || !Array.isArray(details) || details.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one detail item is required'
    });
  }

  // Validate each detail
  for (const detail of details) {
    if (!detail.productId || !detail.batchNo || !detail.quantity) {
      return res.status(400).json({
        success: false,
        error: 'Each detail must have productId, batchNo, and quantity'
      });
    }

    if (detail.quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0'
      });
    }

    // Validate dates if provided
    if (detail.manufactureDate && detail.expDate) {
      const mfgDate = new Date(detail.manufactureDate);
      const expDate = new Date(detail.expDate);
      
      if (expDate <= mfgDate) {
        return res.status(400).json({
          success: false,
          error: 'Expiry date must be after manufacture date'
        });
      }
    }
  }

  next();
};

// Validate Outbound data
const validateOutbound = (req, res, next) => {
  const { outboundNo, customer, details } = req.body;

  if (!outboundNo || !customer) {
    return res.status(400).json({
      success: false,
      error: 'Outbound number and customer are required'
    });
  }

  if (!details || !Array.isArray(details) || details.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one detail item is required'
    });
  }

  // Validate each detail
  for (const detail of details) {
    if (!detail.productId || !detail.quantity) {
      return res.status(400).json({
        success: false,
        error: 'Each detail must have productId and quantity'
      });
    }

    if (detail.quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0'
      });
    }
  }

  next();
};

// Validate Inventory Session
const validateInventorySession = (req, res, next) => {
  const { inventoryNo, checker } = req.body;

  if (!inventoryNo || !checker) {
    return res.status(400).json({
      success: false,
      error: 'Inventory number and checker name are required'
    });
  }

  next();
};

// Validate Warehouse data
const validateWarehouse = (req, res, next) => {
  const { code, name } = req.body;

  if (!code || !name) {
    return res.status(400).json({
      success: false,
      error: 'Warehouse code and name are required'
    });
  }

  if (code.length > 50) {
    return res.status(400).json({
      success: false,
      error: 'Warehouse code must be 50 characters or less'
    });
  }

  next();
};

// Validate UUID format
const validateUUID = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName] || req.body[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: `${paramName} is required`
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format`
      });
    }

    next();
  };
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      success: false,
      error: 'Page must be a positive integer'
    });
  }

  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 1000)) {
    return res.status(400).json({
      success: false,
      error: 'Limit must be between 1 and 1000'
    });
  }

  next();
};

// Validate date range
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date'
      });
    }
  }

  next();
};

module.exports = {
  validateProduct,
  validateSupplier,
  validateInbound,
  validateOutbound,
  validateInventorySession,
  validateWarehouse,
  validateUUID,
  validatePagination,
  validateDateRange
};