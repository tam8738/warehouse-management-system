import React, { useState, useMemo } from 'react';
import { Plus, X, Search, Filter } from 'lucide-react';
import { useData } from '../../context/DataContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Table from '../common/Table';

const OutboundManagement = () => {
  const { outboundHeaders, products, addOutbound, loading } = useData();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    outboundNo: '',
    customer: '',
    soNo: '',
    deliveryDate: new Date().toISOString().split('T')[0],
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

  // ✅ LỌC VÀ TÌM KIẾM PHIẾU XUẤT
  const filteredOutbounds = useMemo(() => {
    let filtered = [...outboundHeaders];

    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Tìm kiếm theo mã phiếu, mã SO, tên khách hàng
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const outboundNo = item.outboundNo?.toLowerCase() || '';
        const soNo = item.soNo?.toLowerCase() || '';
        const customer = item.customer?.toLowerCase() || '';
        
        return outboundNo.includes(search) || 
               soNo.includes(search) || 
               customer.includes(search);
      });
    }

    return filtered;
  }, [outboundHeaders, searchTerm, statusFilter]);

  const handleAddDetail = () => {
    setFormData({
      ...formData,
      details: [...formData.details, { 
        productId: '', 
        batchNo: '', 
        quantity: '' 
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
      await addOutbound(formData);
      alert('✅ Tạo phiếu xuất thành công!');
      resetForm();
    } catch (error) {
      alert('❌ Có lỗi xảy ra: ' + error.message);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({
      outboundNo: '',
      customer: '',
      soNo: '',
      deliveryDate: new Date().toISOString().split('T')[0],
      status: 'draft',
      details: []
    });
  };

  const columns = [
    {
      label: 'Mã Phiếu',
      field: 'outboundNo',
      render: (row) => <span className="font-medium text-green-600">{row.outboundNo}</span>
    },
    { 
      label: 'Khách Hàng', 
      field: 'customer',
      render: (row) => <span className="font-medium">{row.customer}</span>
    },
    { 
      label: 'Mã SO', 
      field: 'soNo',
      render: (row) => <span className="text-gray-600">{row.soNo || '-'}</span>
    },
    {
      label: 'Ngày Giao',
      render: (row) => (
        <span className="text-gray-700">
          {new Date(row.deliveryDate).toLocaleDateString('vi-VN')}
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
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Quản Lý Xuất Kho</h2>
          <p className="text-gray-600 mt-1">Quản lý phiếu xuất hàng ra khỏi kho</p>
        </div>
        <Button onClick={() => setShowForm(true)} icon={<Plus size={20} />}>
          Tạo Phiếu Xuất
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
              placeholder="Tìm kiếm theo mã phiếu, mã SO, khách hàng..."
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
              Tìm thấy <span className="font-semibold text-blue-600">{filteredOutbounds.length}</span> kết quả
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
        data={filteredOutbounds} 
        loading={loading}
        emptyMessage="Không tìm thấy phiếu xuất nào"
        showActions={false}
      />

      {/* Modal Tạo Phiếu Xuất */}
      <Modal show={showForm} onClose={resetForm} title="Tạo Phiếu Xuất Kho" size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thông tin chung */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã Phiếu Xuất <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.outboundNo}
                onChange={e => setFormData({ ...formData, outboundNo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="VD: PX001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Khách Hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customer}
                onChange={e => setFormData({ ...formData, customer: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tên khách hàng"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã SO
              </label>
              <input
                type="text"
                value={formData.soNo}
                onChange={e => setFormData({ ...formData, soNo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="VD: SO2024001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày Giao Hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.deliveryDate}
                onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                    </div>

                    {/* Nút xóa */}
                    <div className="mt-3 flex justify-end">
                      <Button 
                        type="button" 
                        variant="danger" 
                        icon={<X size={16} />} 
                        onClick={() => handleRemoveDetail(index)}
                        size="sm"
                      >
                        Xóa Sản Phẩm
                      </Button>
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
              Lưu Phiếu Xuất
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OutboundManagement;