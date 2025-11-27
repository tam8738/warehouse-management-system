import React, { useState, useEffect } from 'react';
import { Warehouse, MapPin, Package, TrendingUp, Search, Plus, Edit, Trash2, Eye, X } from 'lucide-react';
import api from '../../services/api';

const WarehouseManagement = ({ permissions }) => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // create | edit | view
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    capacity: '',
    type: 'main',
    status: 'active',
    notes: ''
  });

  const warehouseTypes = [
    { value: 'main', label: 'Kho chính' },
    { value: 'secondary', label: 'Kho phụ' },
    { value: 'return', label: 'Kho hoàn trả' },
    { value: 'quarantine', label: 'Kho cách ly' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Hoạt động', color: 'green' },
    { value: 'inactive', label: 'Không hoạt động', color: 'gray' },
    { value: 'maintenance', label: 'Bảo trì', color: 'yellow' }
  ];

  useEffect(() => {
    fetchWarehouses();
  }, [search]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/warehouses?limit=100&search=${search}`);
      setWarehouses(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode, warehouse = null) => {
    setModalMode(mode);
    setSelectedWarehouse(warehouse);
    
    if (mode === 'create') {
      setFormData({
        code: '',
        name: '',
        address: '',
        city: '',
        capacity: '',
        type: 'main',
        status: 'active',
        notes: ''
      });
    } else if (warehouse) {
      setFormData({
        code: warehouse.code || '',
        name: warehouse.name || '',
        address: warehouse.address || '',
        city: warehouse.city || '',
        capacity: warehouse.capacity || '',
        type: warehouse.type || 'main',
        status: warehouse.status || 'active',
        notes: warehouse.notes || ''
      });
    }
    
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedWarehouse(null);
    setFormData({
      code: '',
      name: '',
      address: '',
      city: '',
      capacity: '',
      type: 'main',
      status: 'active',
      notes: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (modalMode === 'create') {
        await api.post('/warehouses', formData);
        alert('Tạo kho thành công!');
      } else if (modalMode === 'edit') {
        await api.put(`/warehouses/${selectedWarehouse.id}`, formData);
        alert('Cập nhật kho thành công!');
      }
      
      handleCloseModal();
      fetchWarehouses();
    } catch (error) {
      console.error('Error saving warehouse:', error);
      alert(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa kho này?')) return;
    
    try {
      await api.delete(`/warehouses/${id}`);
      alert('Xóa kho thành công!');
      fetchWarehouses();
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      alert(error.response?.data?.error || 'Không thể xóa kho');
    }
  };

  const getStatusColor = (status) => {
    const option = statusOptions.find(s => s.value === status);
    return option?.color || 'gray';
  };

  const getTypeLabel = (type) => {
    const option = warehouseTypes.find(t => t.value === type);
    return option?.label || type;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Warehouse size={32} className="text-blue-600" />
          Quản Lý Kho
        </h1>
        <p className="text-gray-600 mt-1">Quản lý thông tin kho, khu vực, dãy kệ và vị trí lưu trữ</p>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm kho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        {permissions?.canCreate && (
          <button
            onClick={() => handleOpenModal('create')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
          >
            <Plus size={20} />
            Thêm Kho Mới
          </button>
        )}
      </div>

      {/* Warehouses Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Đang tải...</p>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <Warehouse size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">Chưa có kho nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((warehouse) => (
            <div key={warehouse.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{warehouse.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium
                      ${getStatusColor(warehouse.status) === 'green' ? 'bg-green-100 text-green-700' : ''}
                      ${getStatusColor(warehouse.status) === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${getStatusColor(warehouse.status) === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
                    `}>
                      {statusOptions.find(s => s.value === warehouse.status)?.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 font-mono">{warehouse.code}</p>
                  <p className="text-xs text-blue-600 mt-1">{getTypeLabel(warehouse.type)}</p>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4">
                {warehouse.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{warehouse.address}</span>
                  </div>
                )}
                {warehouse.city && (
                  <p className="text-sm text-gray-500 pl-6">{warehouse.city}</p>
                )}
                {warehouse.capacity && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package size={16} />
                    <span>Diện tích: {warehouse.capacity} m²</span>
                  </div>
                )}
                {warehouse.zones && warehouse.zones.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp size={16} />
                    <span>{warehouse.zones.length} khu vực</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleOpenModal('view', warehouse)}
                  className="flex-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2"
                >
                  <Eye size={16} />
                  Chi tiết
                </button>
                
                {permissions?.canEdit && (
                  <button
                    onClick={() => handleOpenModal('edit', warehouse)}
                    className="flex-1 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Edit size={16} />
                    Sửa
                  </button>
                )}
                
                {permissions?.canDelete && (
                  <button
                    onClick={() => handleDelete(warehouse.id)}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {modalMode === 'create' && 'Thêm Kho Mới'}
                {modalMode === 'edit' && 'Sửa Thông Tin Kho'}
                {modalMode === 'view' && 'Chi Tiết Kho'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã Kho <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    disabled={modalMode === 'view'}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="VD: WH-HN"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên Kho <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    disabled={modalMode === 'view'}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="VD: Kho Hà Nội"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại Kho
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    {warehouseTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng Thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diện Tích (m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="VD: 1000"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thành Phố
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    disabled={modalMode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    placeholder="VD: Hà Nội"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa Chỉ
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  disabled={modalMode === 'view'}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Nhập địa chỉ đầy đủ..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi Chú
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  disabled={modalMode === 'view'}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Ghi chú thêm về kho..."
                />
              </div>

              {/* Actions */}
              {modalMode !== 'view' && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {modalMode === 'create' ? 'Tạo Kho' : 'Cập Nhật'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManagement;