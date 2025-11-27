import React, { useState, useMemo } from 'react';
import { Plus, X, Search, Filter } from 'lucide-react';
import { useData } from '../../context/DataContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Table from '../common/Table';

const InboundManagement = () => {
  const { inboundHeaders, products, suppliers, addInbound, loading } = useData();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    inboundNo: '',
    supplierId: '',
    poNo: '',
    receivedDate: new Date().toISOString().split('T')[0],
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

  // ✅ LỌC VÀ TÌM KIẾM PHIẾU NHẬP
  const filteredInbounds = useMemo(() => {
    let filtered = [...inboundHeaders];

    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Tìm kiếm theo mã phiếu, mã PO, tên nhà cung cấp
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const supplier = suppliers.find(s => s.id === item.supplierId);
        const supplierName = supplier?.name?.toLowerCase() || '';
        const inboundNo = item.inboundNo?.toLowerCase() || '';
        const poNo = item.poNo?.toLowerCase() || '';
        
        return inboundNo.includes(search) || 
               poNo.includes(search) || 
               supplierName.includes(search);
      });
    }

    return filtered;
  }, [inboundHeaders, searchTerm, statusFilter, suppliers]);

  const handleAddDetail = () => {
    setFormData({
      ...formData,
      details: [...formData.details, { 
        productId: '', 
        batchNo: '', 
        quantity: '', 
        expDate: '', 
        manufactureDate: '' 
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
      await addInbound(formData);
      alert('✅ Tạo phiếu nhập thành công!');
      resetForm();
    } catch (error) {
      alert('❌ Có lỗi xảy ra: ' + error.message);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({
      inboundNo: '',
      supplierId: '',
      poNo: '',
      receivedDate: new Date().toISOString().split('T')[0],
      status: 'draft',
      details: []
    });
  };

  const columns = [
    { 
      label: 'Mã Phiếu', 
      field: 'inboundNo', 
      render: (row) => <span className="font-medium text-blue-600">{row.inboundNo}</span> 
    },
    { 
      label: 'Nhà Cung Cấp', 
      render: (row) => {
        const supplier = suppliers.find(s => s.id === row.supplierId);
        return <span className="font-medium">{supplier?.name || 'N/A'}</span>;
      }
    },
    { 
      label: 'Mã PO', 
      field: 'poNo',
      render: (row) => <span className="text-gray-600">{row.poNo || '-'}</span>
    },
    { 
      label: 'Ngày Nhận', 
      render: (row) => (
        <span className="text-gray-700">
          {new Date(row.receivedDate).toLocaleDateString('vi-VN')}
        </span>
      )
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
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Quản Lý Nhập Kho</h2>
          <p className="text-gray-600 mt-1">Quản lý phiếu nhập hàng vào kho</p>
        </div>
        <Button onClick={() => setShowForm(true)} icon={<Plus size={20} />}>
          Tạo Phiếu Nhập
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
              placeholder="Tìm kiếm theo mã phiếu, mã PO, nhà cung cấp..."
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
              Tìm thấy <span className="font-semibold text-blue-600">{filteredInbounds.length}</span> kết quả
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
        data={filteredInbounds} 
        loading={loading}
        emptyMessage="Không tìm thấy phiếu nhập nào"
        showActions={false}
      />

      {/* Modal Tạo Phiếu Nhập */}
      <Modal show={showForm} onClose={resetForm} title="Tạo Phiếu Nhập Kho" size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thông tin chung */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã Phiếu Nhập <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.inboundNo}
                onChange={e => setFormData({ ...formData, inboundNo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="VD: PN001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nhà Cung Cấp <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.supplierId}
                onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã PO
              </label>
              <input
                type="text"
                value={formData.poNo}
                onChange={e => setFormData({ ...formData, poNo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="VD: PO2024001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày Nhận <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.receivedDate}
                onChange={e => setFormData({ ...formData, receivedDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Chi tiết sản phẩm */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Chi Tiết Sản Phẩm</h3>
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
                <div className="text-gray-400 text-5xl mb-3">📦</div>
                <p className="text-gray-500 mb-4">Chưa có sản phẩm nào</p>
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
                {formData.details.map((detail, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
                          Số Lô
                        </label>
                        <input
                          type="text"
                          placeholder="LOT001"
                          value={detail.batchNo}
                          onChange={e => handleDetailChange(index, 'batchNo', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>

                      {/* Số lượng */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Số lượng <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={detail.quantity}
                          onChange={e => handleDetailChange(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>

                      {/* Nút xóa */}
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

                    {/* Row 2: Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Ngày Sản Xuất
                        </label>
                        <input
                          type="date"
                          value={detail.manufactureDate}
                          onChange={e => handleDetailChange(index, 'manufactureDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Hạn Sử Dụng
                        </label>
                        <input
                          type="date"
                          value={detail.expDate}
                          onChange={e => handleDetailChange(index, 'expDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Hủy Bỏ
            </Button>
            <Button type="submit" variant="primary">
              Lưu Phiếu Nhập
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InboundManagement;