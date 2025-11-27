import React, { useEffect, useState } from 'react';
import { Package, TrendingUp, TrendingDown, Calendar, AlertCircle, BarChart3, ShoppingCart } from 'lucide-react';
import { useData } from '../../context/DataContext';

const Dashboard = ({ onNavigate }) => {
  const { 
    products, 
    stock, 
    dashboardStats,
    inboundHeaders,
    outboundHeaders,
    loading,
    getLowStockReport,
    getExpiringBatchesReport
  } = useData();

  const [lowStockItems, setLowStockItems] = useState([]);
  const [expiringBatches, setExpiringBatches] = useState([]);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const [lowStock, expiring] = await Promise.all([
        getLowStockReport(20),
        getExpiringBatchesReport(30)
      ]);
      setLowStockItems(lowStock || []);
      setExpiringBatches(expiring || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  // Calculate stats
  const totalProducts = products.length;
  const totalStock = stock.reduce((sum, s) => sum + parseFloat(s.quantity || 0), 0);
  const activeProducts = products.filter(p => p.status === 'active').length;
  
  // Today's transactions
  const today = new Date().toDateString();
  const todayInbound = inboundHeaders.filter(h => {
    const date = new Date(h.receivedDate).toDateString();
    return date === today && h.status === 'completed';
  }).length;
  
  const todayOutbound = outboundHeaders.filter(h => {
    const date = new Date(h.deliveryDate).toDateString();
    return date === today && h.status === 'completed';
  }).length;

  // Pending transactions
  const pendingInbound = inboundHeaders.filter(h => h.status === 'draft').length;
  const pendingOutbound = outboundHeaders.filter(h => h.status === 'draft').length;

  const stats = [
    {
      label: "Tổng Sản Phẩm",
      value: totalProducts,
      subtext: `${activeProducts} đang hoạt động`,
      icon: <Package size={32} />,
      color: "blue",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-600",
    },
    {
      label: "Tổng Tồn Kho",
      value: Math.round(totalStock),
      subtext: `${stock.length} mặt hàng`,
      icon: <BarChart3 size={32} />,
      color: "green",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-600",
    },
    {
      label: "Nhập Kho Hôm Nay",
      value: todayInbound,
      subtext: `${pendingInbound} đang chờ`,
      icon: <TrendingUp size={32} />,
      color: "purple",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-600",
    },
    {
      label: "Xuất Kho Hôm Nay",
      value: todayOutbound,
      subtext: `${pendingOutbound} đang chờ`,
      icon: <TrendingDown size={32} />,
      color: "indigo",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
      textColor: "text-indigo-600",
    },
    {
      label: "Sắp Hết Hạn",
      value: expiringBatches.length,
      subtext: "Trong 30 ngày",
      icon: <Calendar size={32} />,
      color: "yellow",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-600",
    },
    {
      label: "Tồn Kho Thấp",
      value: lowStockItems.length,
      subtext: "< 20 đơn vị",
      icon: <AlertCircle size={32} />,
      color: "red",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-600",
    },
  ];

  // Quick action buttons with navigation
  const quickActions = [
    {
      label: "Nhập kho",
      icon: <TrendingUp size={32} />,
      color: "blue",
      borderColor: "border-blue-200",
      hoverColor: "hover:bg-blue-50",
      iconColor: "text-blue-600",
      tab: "inbound"
    },
    {
      label: "Xuất kho",
      icon: <TrendingDown size={32} />,
      color: "green",
      borderColor: "border-green-200",
      hoverColor: "hover:bg-green-50",
      iconColor: "text-green-600",
      tab: "outbound"
    },
    {
      label: "Kiểm kê",
      icon: <ShoppingCart size={32} />,
      color: "purple",
      borderColor: "border-purple-200",
      hoverColor: "hover:bg-purple-50",
      iconColor: "text-purple-600",
      tab: "inventory"
    },
    {
      label: "Báo cáo",
      icon: <BarChart3 size={32} />,
      color: "orange",
      borderColor: "border-orange-200",
      hoverColor: "hover:bg-orange-50",
      iconColor: "text-orange-600",
      tab: "report"
    }
  ];

  const handleQuickAction = (tab) => {
    if (onNavigate) {
      onNavigate(tab);
    } else {
      console.warn('onNavigate prop not provided to Dashboard');
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-1">Tổng quan hệ thống quản lý kho</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Cập nhật lúc</p>
          <p className="text-lg font-semibold text-gray-800">
            {new Date().toLocaleTimeString('vi-VN')}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            className={`${stat.bgColor} border ${stat.borderColor} rounded-lg p-6 transition-all hover:shadow-md`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.label}
                </p>
                <p className={`text-4xl font-bold ${stat.textColor} mb-2`}>
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500">{stat.subtext}</p>
              </div>
              <div className={`${stat.textColor} opacity-75`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Low Stock Alert */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="bg-red-50 border-b border-red-200 px-6 py-4 rounded-t-lg">
            <h3 className="font-semibold text-red-800 flex items-center gap-2">
              <AlertCircle size={20} />
              Cảnh báo: Sản phẩm sắp hết hàng
            </h3>
          </div>
          <div className="p-6">
            {lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {lowStockItems.slice(0, 5).map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {item.product?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        SKU: {item.product?.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">
                        {parseFloat(item.quantity).toFixed(0)} {item.product?.unit}
                      </p>
                      <p className="text-xs text-gray-500">
                        Khả dụng: {parseFloat(item.quantity - (item.reservedQty || 0)).toFixed(0)}
                      </p>
                    </div>
                  </div>
                ))}
                {lowStockItems.length > 5 && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    + {lowStockItems.length - 5} sản phẩm khác...
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package size={48} className="mx-auto mb-2 opacity-50" />
                <p>Không có sản phẩm nào sắp hết hàng</p>
              </div>
            )}
          </div>
        </div>

        {/* Expiring Soon Alert */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4 rounded-t-lg">
            <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
              <Calendar size={20} />
              Cảnh báo: Lô hàng sắp hết hạn
            </h3>
          </div>
          <div className="p-6">
            {expiringBatches.length > 0 ? (
              <div className="space-y-3">
                {expiringBatches.slice(0, 5).map((batch, idx) => {
                  const daysLeft = batch.daysUntilExpiry || 0;
                  const isCritical = daysLeft <= 7;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                        isCritical ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-800">
                          {batch.product?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Lô: {batch.batchNo}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${isCritical ? 'text-red-600' : 'text-yellow-600'}`}>
                          {daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Đã hết hạn'}
                        </p>
                        <p className="text-xs text-gray-500">
                          SL: {batch.quantity}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {expiringBatches.length > 5 && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    + {expiringBatches.length - 5} lô hàng khác...
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                <p>Không có lô hàng nào sắp hết hạn</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => (
            <button 
              key={idx}
              onClick={() => handleQuickAction(action.tab)}
              className={`flex flex-col items-center p-4 border-2 ${action.borderColor} rounded-lg ${action.hoverColor} transition-all hover:shadow-md active:scale-95`}
            >
              <div className={action.iconColor + " mb-2"}>
                {action.icon}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;