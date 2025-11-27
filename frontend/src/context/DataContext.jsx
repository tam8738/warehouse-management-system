import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inboundHeaders, setInboundHeaders] = useState([]);
  const [outboundHeaders, setOutboundHeaders] = useState([]);
  const [inventoryHeaders, setInventoryHeaders] = useState([]);
  const [stock, setStock] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  // ✅ ✅ ✅ PHẦN NÀY ĐÃ ĐƯỢC SỬA ✅ ✅ ✅
  const loadInitialData = async () => {
    setLoading(true);
    try {
      // ✅ THÊM MỚI: Load suppliers TRƯỚC (DÒNG 27-31)
      const suppliersRes = await api.get('/suppliers?limit=1000');
      const supplierData = suppliersRes.data?.data || suppliersRes.data || [];
      setSuppliers(supplierData);
      console.log('🏢 Loaded suppliers:', supplierData.length);

      // Load các data khác song song
      const [productsRes, inboundRes, outboundRes, inventoryRes, stockRes, dashboardRes] = await Promise.allSettled([
        api.get('/products?limit=1000'),
        api.get('/inbound?limit=1000'),
        api.get('/outbound?limit=1000'),
        api.get('/inventory?limit=1000'),
        api.get('/stock?limit=1000'),
        api.get('/reports/dashboard')
      ]);

      // Extract data từ response (check format backend)
      if (productsRes.status === 'fulfilled') {
        const data = productsRes.value.data?.data || productsRes.value.data || [];
        console.log('📦 Loaded products:', data.length);
        setProducts(data);
      }

      if (inboundRes.status === 'fulfilled') {
        const data = inboundRes.value.data?.data || inboundRes.value.data || [];
        console.log('📥 Loaded inbound headers:', data.length);
        setInboundHeaders(data);
      }

      if (outboundRes.status === 'fulfilled') {
        const data = outboundRes.value.data?.data || outboundRes.value.data || [];
        console.log('📤 Loaded outbound headers:', data.length);
        setOutboundHeaders(data);
      }

      if (inventoryRes.status === 'fulfilled') {
        const data = inventoryRes.value.data?.data || inventoryRes.value.data || [];
        setInventoryHeaders(data);
      }

      if (stockRes.status === 'fulfilled') {
        const data = stockRes.value.data?.data || stockRes.value.data || [];
        console.log('📊 Loaded stock:', data.length);
        setStock(data);
      }

      if (dashboardRes.status === 'fulfilled') {
        setDashboardStats(dashboardRes.value.data?.data || dashboardRes.value.data);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  // ✅ ✅ ✅ KẾT THÚC PHẦN SỬA ✅ ✅ ✅

  // ===== Product operations =====
  const addProduct = async (productData) => {
    try {
      const response = await api.post('/products', productData);
      const newProduct = response.data?.data || response.data;
      setProducts([...products, newProduct]);
      return newProduct;
    } catch (error) {
      throw error;
    }
  };

  const updateProduct = async (id, productData) => {
    try {
      const response = await api.put(`/products/${id}`, productData);
      const updatedProduct = response.data?.data || response.data;
      setProducts(products.map(p => p.id === id ? updatedProduct : p));
      return updatedProduct;
    } catch (error) {
      throw error;
    }
  };

  const deleteProduct = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      throw error;
    }
  };

  // ===== Supplier operations =====
  const getSuppliers = async () => {
    try {
      const response = await api.get('/suppliers?limit=1000');
      const supplierData = response.data?.data || response.data || [];
      setSuppliers(supplierData);
      return supplierData;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }
  };

  const addSupplier = async (supplierData) => {
    try {
      const response = await api.post('/suppliers', supplierData);
      const newSupplier = response.data?.data || response.data;
      setSuppliers([...suppliers, newSupplier]);
      return newSupplier;
    } catch (error) {
      throw error;
    }
  };

  // ===== Inbound operations =====
  const addInbound = async (inboundData) => {
    try {
      const response = await api.post('/inbound', inboundData);
      const newInbound = response.data?.data || response.data;
      setInboundHeaders([...inboundHeaders, newInbound]);
      return newInbound;
    } catch (error) {
      throw error;
    }
  };

  const confirmInbound = async (id) => {
    try {
      const response = await api.post(`/inbound/${id}/confirm`);
      const updatedInbound = response.data?.data || response.data;
      setInboundHeaders(inboundHeaders.map(h => h.id === id ? updatedInbound : h));
      await loadInitialData(); // Refresh để cập nhật stock
      return updatedInbound;
    } catch (error) {
      throw error;
    }
  };

  // ===== Outbound operations =====
  const addOutbound = async (outboundData) => {
    try {
      const response = await api.post('/outbound', outboundData);
      const newOutbound = response.data?.data || response.data;
      setOutboundHeaders([...outboundHeaders, newOutbound]);
      return newOutbound;
    } catch (error) {
      throw error;
    }
  };

  const confirmOutbound = async (id) => {
    try {
      const response = await api.post(`/outbound/${id}/confirm`);
      const updatedOutbound = response.data?.data || response.data;
      setOutboundHeaders(outboundHeaders.map(h => h.id === id ? updatedOutbound : h));
      await loadInitialData(); // Refresh để cập nhật stock
      return updatedOutbound;
    } catch (error) {
      throw error;
    }
  };

  // ===== Inventory operations =====
  const addInventory = async (inventoryData) => {
    try {
      const response = await api.post('/inventory', inventoryData);
      const newInventory = response.data?.data || response.data;
      setInventoryHeaders([...inventoryHeaders, newInventory]);
      return newInventory;
    } catch (error) {
      throw error;
    }
  };

  const addInventoryCounts = async (sessionId, counts) => {
    try {
      const response = await api.post(`/inventory/${sessionId}/counts`, { counts });
      return response.data?.data || response.data;
    } catch (error) {
      throw error;
    }
  };

  const confirmInventory = async (id) => {
    try {
      const response = await api.post(`/inventory/${id}/confirm`);
      const updatedInventory = response.data?.data || response.data;
      setInventoryHeaders(inventoryHeaders.map(h => h.id === id ? updatedInventory : h));
      await loadInitialData(); // Refresh để cập nhật stock
      return updatedInventory;
    } catch (error) {
      throw error;
    }
  };

  // ===== Reports =====
  const getStockReport = async () => {
    try {
      const response = await api.get('/reports/stock?limit=1000');
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Error fetching stock report:', error);
      return [];
    }
  };

  const getBatchReport = async () => {
    try {
      const response = await api.get('/reports/batches?limit=1000');
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Error fetching batch report:', error);
      return [];
    }
  };

  const getLowStockReport = async (threshold = 20) => {
    try {
      const response = await api.get(`/reports/low-stock?threshold=${threshold}&limit=1000`);
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Error fetching low stock report:', error);
      return [];
    }
  };

  const getExpiringBatchesReport = async (days = 30) => {
    try {
      const response = await api.get(`/reports/expiring?days=${days}&limit=1000`);
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Error fetching expiring batches:', error);
      return [];
    }
  };

  const value = {
    loading,
    products,
    suppliers,
    inboundHeaders,
    outboundHeaders,
    inventoryHeaders,
    stock,
    dashboardStats,
    
    // Product methods
    addProduct,
    updateProduct,
    deleteProduct,
    
    // Supplier methods
    getSuppliers,
    addSupplier,
    
    // Inbound methods
    addInbound,
    confirmInbound,
    
    // Outbound methods
    addOutbound,
    confirmOutbound,
    
    // Inventory methods
    addInventory,
    addInventoryCounts,
    confirmInventory,
    
    // Report methods
    getStockReport,
    getBatchReport,
    getLowStockReport,
    getExpiringBatchesReport,
    
    // Refresh
    refreshData: loadInitialData
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataContext;