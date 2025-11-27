import React from 'react';
import { 
  LayoutDashboard, 
  Warehouse,
  Shield,
  Package, 
  TrendingDown, 
  TrendingUp, 
  ClipboardList, 
  FileText,
  Lock
} from 'lucide-react';

const Navigation = ({ activeTab, onTabChange, permissions }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'warehouse', label: 'Quản lý kho', icon: Warehouse },
    { id: 'qc', label: 'Kiểm tra QC', icon: Shield },
    { id: 'products', label: 'Hàng hóa', icon: Package },
    { id: 'inbound', label: 'Nhập kho', icon: TrendingDown },
    { id: 'outbound', label: 'Xuất kho', icon: TrendingUp },
    { id: 'inventory', label: 'Kiểm kê', icon: ClipboardList },
    { id: 'report', label: 'Báo cáo', icon: FileText }
  ];

  // Lọc menu items theo quyền
  const allowedItems = menuItems.filter(item => 
    permissions?.tabs?.includes(item.id)
  );

  // Các items không có quyền (để hiển thị bị khóa)
  const restrictedItems = menuItems.filter(item => 
    !permissions?.tabs?.includes(item.id)
  );

  return (
    <div className="w-64 bg-gradient-to-b from-green-600 to-green-700 text-white flex flex-col shadow-xl">
      {/* Logo */}
      <div className="p-6 bg-green-800 border-b border-green-500">
        <h1 className="text-xl font-bold">Quản Lý Kho</h1>
        <p className="text-xs text-green-200 mt-1">Warehouse Management</p>
      </div>

      {/* Menu Items - Có quyền truy cập */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                w-full flex items-center px-6 py-3 text-left transition-all duration-200
                ${isActive 
                  ? 'bg-white text-green-700 font-semibold shadow-lg border-r-4 border-green-600' 
                  : 'text-white hover:bg-green-500 hover:pl-8'
                }
              `}
            >
              <Icon size={20} className="mr-3" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Menu Items - Không có quyền (hiển thị bị khóa) */}
        {restrictedItems.length > 0 && (
          <>
            <div className="px-6 py-2 mt-4 text-xs text-green-300 font-semibold uppercase">
              Bị khóa
            </div>
            {restrictedItems.map((item) => {
              const Icon = item.icon;
              
              return (
                <div
                  key={item.id}
                  className="w-full flex items-center px-6 py-3 text-green-300 opacity-50 cursor-not-allowed"
                  title="Bạn không có quyền truy cập chức năng này"
                >
                  <Icon size={20} className="mr-3" />
                  <span>{item.label}</span>
                  <Lock size={14} className="ml-auto" />
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 bg-green-800 border-t border-green-500 text-xs text-green-200">
        <p>© 2024 WMS System</p>
        <p>Version 1.0.0</p>
        {permissions && (
          <p className="mt-1 text-green-100 font-semibold">
            Role: {permissions.canAccessAll ? 'Admin' : 
                   permissions.canDelete ? 'Manager' : 'Staff'}
          </p>
        )}
      </div>
    </div>
  );
};

export default Navigation;