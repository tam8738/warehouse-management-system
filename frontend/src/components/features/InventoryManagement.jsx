import React, { useState, useMemo } from 'react';
import { Plus, X, Search, Filter } from 'lucide-react';
import { useData } from '../../context/DataContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Table from '../common/Table';

const InventoryManagement = () => {
  const { inventoryHeaders, products, addInventory, loading } = useData();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    inventoryNo: '',
    checkDate: new Date().toISOString().split('T')[0],
    checker: '',
    status: 'draft',
    details: []
  });

  // ✅ SẮP XẾP SẢN PHẨM THEO THỨ TỰ BẢNG CHỮ CÁI
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const nameA = a.name?.toLowerCase() || '';
      const nameB = b.name?.toLowerCase() || '';
      return nameA.localeCompare(nameB, 'vi');
    });
  }, [products]);

  // ✅ LỌC VÀ TÌM KIẾM PHIẾU KIỂM KÊ
  const filteredInventories = useMemo(() => {
    let filtered = [...inventoryHeaders];

    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Tìm kiếm theo mã phiếu, người kiểm
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const inventoryNo = item.inventoryNo?.toLowerCase() || '';
        const checker = item.checker?.toLowerCase() || '';
        
        return inventoryNo.includes(search) || checker.includes(search);
      });
    }

    return filtered;
  }, [inventoryHeaders, searchTerm, statusFilter]);

  const handleAddDetail = () => {
    setFormData({
      ...formData,
      details: [...formData.details, {
        productId: '',
        batchNo: '',
        systemQty: '',
        actualQty: '',
        notes: ''
      }]
    });
  };

  const handleRemoveDetail = (index) => {
    setFormData({
      ...formData,
      details: formData.details.filter((_, i) => i !== index)
    });
  };

  const handleDetailChange = (index, field, value) => {
    const newDetails = [...formData.details];
    newDetails[index][field] = value;
    setFormData({ ...formData, details: newDetails });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!formData.details || formData.details.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm!');
      return;
    }

    try {
      await addInventory(formData);
      alert('✅ Tạo phiếu kiểm kê thành công!');
      resetForm();
    } catch (error) {
      alert('❌ Có lỗi xảy ra: ' + error.message);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({
      inventoryNo: '',
      checkDate: new Date().toISOString().split('T')[0],
      checker: '',
      status: 'draft',
      details: []
    });
  };

  const columns = [
    {
      label: 'Mã Phiếu',
      field: 'inventoryNo',
      render: (row) => <span className="font-medium text-purple-600">{row.inventoryNo}</span>
    },
    {
      label: 'Ngày Kiểm',
      render: (row) => (
        <span className="text-gray-700">
          {new Date(row.checkDate).toLocaleDateString('vi-VN')}
        </span>
      )
    },
    { 
      label: 'Người Kiểm', 
      field: 'checker',
      render: (row) => <span className="font-medium">{row.checker}</span>
    },
    {
      label: 'Trạng Thái',
      render: (row) => {
        const variants = {
          draft: 'warning',
          completed: 'success',
          cancelled: 'danger'
        };
        const labels = {
          draft: 'Nháp',
          completed: 'Hoàn tất',
          cancelled: 'Đã hủy'
        };
        return <Badge variant={variants[row.status]}>{labels[row.status]}</Badge>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Quản Lý Kiểm Kê</h2>
          <p className="text-gray-600 mt-1">Quản lý phiếu kiểm kê tồn kho</p>
        </div>
        <Button onClick={() => setShowForm(true)} icon={<Plus size={20} />}>
          Tạo Phiếu Kiểm Kê
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã phiếu, người kiểm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="draft">Nháp</option>
              <option value="completed">Hoàn tất</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        {/* Search Results Info */}
        {(searchTerm || statusFilter !== 'all') && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Tìm thấy <span className="font-semibold text-blue-600">{filteredInventories.length}</span> kết quả
            </span>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <Table 
        columns={columns} 
        data={filteredInventories} 
        loading={loading}
        emptyMessage="Không tìm thấy phiếu kiểm kê nào"
        showActions={false}
      />

      {/* Modal Tạo Phiếu Kiểm Kê */}
      <Modal show={showForm} onClose={resetForm} title="Tạo Phiếu Kiểm Kê" size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thông tin chung */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã Phiếu Kiểm Kê <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.inventoryNo}
                onChange={e => setFormData({ ...formData, inventoryNo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="VD: PKK001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày Kiểm Kê <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.checkDate}
                onChange={e => setFormData({ ...formData, checkDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Người Kiểm Kê <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.checker}
                onChange={e => setFormData({ ...formData, checker: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tên người kiểm"
                required
              />
            </div>
          </div>

          {/* Chi tiết kiểm kê */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Chi Tiết Kiểm Kê</h3>
              <Button 
                type="button" 
                onClick={handleAddDetail} 
                icon={<Plus size={16} />}
                size="sm"
              >
                Thêm Sản Phẩm
              </Button>
            </div>

            {formData.details.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-400 text-5xl mb-3">📋</div>
                <p className="text-gray-500 mb-4">Chưa có sản phẩm nào để kiểm kê</p>
                <Button 
                  type="button" 
                  onClick={handleAddDetail} 
                  icon={<Plus size={16} />}
                  variant="primary"
                  size="sm"
                >
                  Thêm Sản Phẩm Đầu Tiên
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.details.map((detail, index) => {
                  const difference = detail.actualQty && detail.systemQty 
                    ? parseFloat(detail.actualQty) - parseFloat(detail.systemQty)
                    : 0;
                  
                  return (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 gap-3">
                        {/* Row 1: Product selection and quantities */}
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          {/* Sản phẩm */}
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Sản phẩm <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={detail.productId}
                              onChange={e => handleDetailChange(index, 'productId', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              required
                            >
                              <option value="">-- Chọn sản phẩm --</option>
                              {sortedProducts.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Batch No */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Số Lô <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="LOT001"
                              value={detail.batchNo}
                              onChange={e => handleDetailChange(index, 'batchNo', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              required
                            />
                          </div>

                          {/* SL Hệ thống */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              SL Hệ thống <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={detail.systemQty}
                              onChange={e => handleDetailChange(index, 'systemQty', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>

                          {/* SL Thực tế */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              SL Thực tế <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={detail.actualQty}
                              onChange={e => handleDetailChange(index, 'actualQty', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>

                          {/* Chênh lệch */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Chênh lệch
                            </label>
                            <div className={`px-3 py-2 rounded-md font-semibold text-center text-sm ${
                              difference === 0
                                ? 'bg-green-100 text-green-700 border border-green-300'
                                : difference > 0
                                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                : 'bg-red-100 text-red-700 border border-red-300'
                            }`}>
                              {difference > 0 ? '+' : ''}{difference.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Notes and delete button */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                          <div className="md:col-span-11">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Ghi chú
                            </label>
                            <input
                              type="text"
                              placeholder="Ghi chú về sản phẩm..."
                              value={detail.notes}
                              onChange={e => handleDetailChange(index, 'notes', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                          
                          <div className="flex items-end">
                            <Button 
                              type="button" 
                              variant="danger" 
                              icon={<X size={16} />} 
                              onClick={() => handleRemoveDetail(index)}
                              className="w-full"
                              size="sm"
                            >
                              Xóa
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Hủy Bỏ
            </Button>
            <Button type="submit" variant="primary">
              Lưu Phiếu Kiểm Kê
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InventoryManagement;