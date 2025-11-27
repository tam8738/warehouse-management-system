import React, { useState, useMemo } from 'react';
import { Plus, Search, Download, Upload, Filter, Edit2, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';

const ProductsManagement = () => {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    sku: '', 
    name: '', 
    unit: '', 
    barcode: '', 
    manageBatch: false, 
    description: '', 
    status: 'active'
  });

  // ✅ LỌC VÀ TÌM KIẾM SẢN PHẨM
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Tìm kiếm theo tên hoặc SKU
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search) ||
        p.barcode?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [products, searchTerm, statusFilter]);

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const validateSKU = (sku) => {
    if (!sku) return { valid: false, error: 'SKU không được để trống' };
    if (sku.length > 20) return { valid: false, error: 'SKU không được quá 20 ký tự' };
    if (!/^[A-Z0-9-]+$/.test(sku)) {
      return { valid: false, error: 'SKU chỉ được chứa chữ in hoa, số và dấu gạch ngang' };
    }
    return { valid: true };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const skuValidation = validateSKU(formData.sku);
    if (!skuValidation.valid) {
      alert('❌ ' + skuValidation.error);
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
        alert('✅ Cập nhật sản phẩm thành công!');
      } else {
        await addProduct(formData);
        alert('✅ Thêm sản phẩm thành công!');
      }
      resetForm();
    } catch (error) {
      alert('❌ Có lỗi xảy ra: ' + error.message);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData(product);
    setShowForm(true);
  };

  const handleDelete = async (product) => {
    if (window.confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}"?`)) {
      try {
        await deleteProduct(product.id);
        alert('✅ Xóa sản phẩm thành công!');
      } catch (error) {
        alert('❌ Không thể xóa sản phẩm: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setFormData({ 
      sku: '', 
      name: '', 
      unit: '', 
      barcode: '', 
      manageBatch: false, 
      description: '', 
      status: 'active' 
    });
  };

  const handleSKUChange = (value) => {
    const cleanedSKU = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setFormData({ ...formData, sku: cleanedSKU });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Quản Lý Sản Phẩm</h2>
          <p className="text-gray-600 mt-1">Quản lý danh mục sản phẩm trong kho</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Upload size={18} />} size="sm">
            Import
          </Button>
          <Button variant="secondary" icon={<Download size={18} />} size="sm">
            Export
          </Button>
          <Button onClick={() => setShowForm(true)} icon={<Plus size={20} />}>
            Thêm Sản Phẩm
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã SKU, tên sản phẩm, mã vạch..."
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
              <option value="active">Hoạt động</option>
              <option value="inactive">Ngưng hoạt động</option>
            </select>
          </div>
        </div>

        {/* Search Results Info */}
        {(searchTerm || statusFilter !== 'all') && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Tìm thấy <span className="font-semibold text-blue-600">{filteredProducts.length}</span> sản phẩm
            </span>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCurrentPage(1);
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
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500">
                  Mã SKU
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500">
                  Tên Sản Phẩm
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500">
                  Đơn Vị
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500">
                  Mã Vạch
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500">
                  Quản Lý Lô
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500">
                  Trạng Thái
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="text-gray-400 text-5xl mb-3">📦</div>
                    <p className="text-gray-500 text-lg">
                      {searchTerm || statusFilter !== 'all' 
                        ? 'Không tìm thấy sản phẩm nào' 
                        : 'Chưa có sản phẩm nào'}
                    </p>
                  </td>
                </tr>
              ) : (
                currentItems.map((product) => (
                  <tr key={product.id} className="hover:bg-blue-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 border-r border-gray-200">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-r border-gray-200">
                      {product.unit || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-r border-gray-200">
                      {product.barcode || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm border-r border-gray-200">
                      <span className={`text-lg ${product.manageBatch ? 'text-green-600' : 'text-gray-400'}`}>
                        {product.manageBatch ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
                      <Badge variant={product.status === 'active' ? 'success' : 'default'}>
                        {product.status === 'active' ? 'Hoạt động' : 'Ngưng'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="inline-flex items-center px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors duration-150 shadow-sm"
                          title="Sửa"
                        >
                          <Edit2 size={14} className="mr-1" />
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="inline-flex items-center px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors duration-150 shadow-sm"
                          title="Xóa"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Hiển thị <span className="font-semibold">{indexOfFirstItem + 1}</span> - <span className="font-semibold">{Math.min(indexOfLastItem, filteredProducts.length)}</span> trong tổng số <span className="font-semibold">{filteredProducts.length}</span> sản phẩm
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Trang đầu"
              >
                ««
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Trang trước"
              >
                ‹
              </button>
              
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 border rounded transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Trang sau"
              >
                ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Trang cuối"
              >
                »»
              </button>
            </div>
          </div>
        )}
        
        {/* Footer with total count */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Tổng số: <span className="font-semibold text-gray-900">{filteredProducts.length}</span> sản phẩm
          </p>
        </div>
      </div>

      {/* Modal Form */}
      <Modal 
        show={showForm} 
        onClose={resetForm} 
        title={editingProduct ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => handleSKUChange(e.target.value)}
                placeholder="VD: SNACK001"
                maxLength={20}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Chỉ chữ in hoa, số và dấu gạch ngang (-), tối đa 20 ký tự
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên Sản Phẩm <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nhập tên sản phẩm"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đơn Vị Tính
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="VD: Hộp, Kg, Thùng..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã Vạch (Barcode)
              </label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Nhập mã vạch"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={formData.manageBatch}
                onChange={(e) => setFormData({ ...formData, manageBatch: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-800">Quản lý theo Lô/Hạn sử dụng</span>
                <p className="text-xs text-gray-500">Theo dõi số lô và ngày hết hạn cho sản phẩm này</p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trạng Thái
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">Hoạt động</option>
              <option value="inactive">Ngưng hoạt động</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mô Tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Nhập mô tả chi tiết về sản phẩm..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="3"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Hủy Bỏ
            </Button>
            <Button type="submit" variant="primary">
              {editingProduct ? 'Cập Nhật' : 'Thêm Mới'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductsManagement;