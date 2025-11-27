import React, { useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { useData } from '../../context/DataContext';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Table from '../common/Table';

const StockReport = () => {
  const { products, loading } = useData();
  const [filter, setFilter] = useState('all');

  const getFilteredProducts = () => {
    if (!products) return [];
    
    switch(filter) {
      case 'low':
        return products.filter(p => p.quantity < p.minStock);
      case 'out':
        return products.filter(p => p.quantity === 0);
      case 'available':
        return products.filter(p => p.quantity >= p.minStock);
      default:
        return products;
    }
  };

  const handleExport = () => {
    const data = getFilteredProducts();
    const csv = [
      ['Mã SKU', 'Tên Sản Phẩm', 'Danh Mục', 'Số Lượng', 'Tồn Tối Thiểu', 'Giá'],
      ...data.map(p => [p.sku, p.name, p.category, p.quantity, p.minStock, p.price])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bao-cao-ton-kho-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const columns = [
    {
      label: 'Mã SKU',
      field: 'sku',
      render: (row) => <span className="font-medium">{row.sku}</span>
    },
    { label: 'Tên Sản Phẩm', field: 'name' },
    { label: 'Danh Mục', field: 'category' },
    { label: 'Đơn Vị', field: 'unit' },
    {
      label: 'Số Lượng',
      render: (row) => (
        <Badge 
          variant={
            row.quantity === 0 ? 'danger' :
            row.quantity < row.minStock ? 'warning' : 
            'success'
          }
        >
          {row.quantity}
        </Badge>
      )
    },
    { label: 'Tồn TT', field: 'minStock' },
    {
      label: 'Giá Trị',
      render: (row) => `${(row.quantity * row.price).toLocaleString('vi-VN')}đ`
    },
    {
      label: 'Trạng Thái',
      render: (row) => {
        if (row.quantity === 0) {
          return <Badge variant="danger">Hết hàng</Badge>;
        } else if (row.quantity < row.minStock) {
          return <Badge variant="warning">Sắp hết</Badge>;
        } else {
          return <Badge variant="success">Đủ hàng</Badge>;
        }
      }
    }
  ];

  const stats = [
    {
      label: 'Tổng Sản Phẩm',
      value: products?.length || 0,
      color: 'text-blue-600'
    },
    {
      label: 'Sắp Hết Hàng',
      value: products?.filter(p => p.quantity < p.minStock && p.quantity > 0).length || 0,
      color: 'text-yellow-600'
    },
    {
      label: 'Hết Hàng',
      value: products?.filter(p => p.quantity === 0).length || 0,
      color: 'text-red-600'
    },
    {
      label: 'Tổng Giá Trị',
      value: products?.reduce((sum, p) => sum + (p.quantity * p.price), 0).toLocaleString('vi-VN') + 'đ' || '0đ',
      color: 'text-green-600'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Báo Cáo Tồn Kho</h2>
        <Button onClick={handleExport} icon={<Download size={20} />}>
          Xuất Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <span className="font-medium text-gray-700">Lọc:</span>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'primary' : 'outline'}
              onClick={() => setFilter('all')}
            >
              Tất Cả
            </Button>
            <Button
              size="sm"
              variant={filter === 'available' ? 'primary' : 'outline'}
              onClick={() => setFilter('available')}
            >
              Đủ Hàng
            </Button>
            <Button
              size="sm"
              variant={filter === 'low' ? 'primary' : 'outline'}
              onClick={() => setFilter('low')}
            >
              Sắp Hết
            </Button>
            <Button
              size="sm"
              variant={filter === 'out' ? 'primary' : 'outline'}
              onClick={() => setFilter('out')}
            >
              Hết Hàng
            </Button>
          </div>
        </div>

        <Table 
          columns={columns} 
          data={getFilteredProducts()} 
          loading={loading}
          emptyMessage="Không có sản phẩm nào"
        />
      </div>
    </div>
  );
};

export default StockReport;
