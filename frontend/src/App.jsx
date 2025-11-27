import React, { useState } from "react";
import { DataProvider } from "./context/DataContext";
import { useAuth } from "./hooks/useAuth";
import Header from "./components/layout/Header";
import Navigation from "./components/layout/Navigation";
import Footer from "./components/layout/Footer";
import Dashboard from "./components/features/Dashboard";
import ProductsManagement from "./components/features/ProductsManagement";
import InboundManagement from "./components/features/InboundManagement";
import OutboundManagement from "./components/features/OutboundManagement";
import InventoryManagement from "./components/features/InventoryManagement";
import StockReport from "./components/features/StockReport";
import WarehouseManagement from "./components/features/WarehouseManagement";
import QualityCheckManagement from "./components/features/QualityCheckManagement";
import PutawayManagement from "./components/features/PutawayManagement";
import "./App.css";

// ========== ROLE-BASED PERMISSIONS ==========
const PERMISSIONS = {
  admin: {
    canAccessAll: true,
    tabs: ['dashboard', 'products', 'warehouse', 'qc', 'putaway','inbound', 'outbound', 'inventory', 'report'],
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
  },
  manager: {
    canAccessAll: false,
    tabs: ['dashboard', 'products','warehouse', 'qc', 'putaway', 'inbound', 'outbound', 'inventory', 'report'],
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
  },
  staff: {
    canAccessAll: false,
    tabs: ['dashboard', 'products', 'inventory','qc','inbound', 'outbound', 'report'], 
    canCreate: true, 
    canEdit: true,
    canDelete: false,
    canExport: false,
  }
};

// ========== TOAST NOTIFICATION ==========
const Toast = ({ message, type, onClose }) => {
  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  }[type] || "bg-gray-500";

  const icon = {
    success: "✓",
    error: "✗",
    info: "ℹ",
  }[type] || "ℹ";

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div
        className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px]`}
      >
        <span className="text-2xl font-bold">{icon}</span>
        <span className="flex-1 font-medium">{message}</span>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 text-xl font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// ========== AUTH PAGE ==========
const AuthPage = ({ onLogin, onRegister }) => {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const validateForm = () => {
    if (!username.trim()) {
      showToast("Vui lòng nhập tên đăng nhập", "error");
      return false;
    }
    if (username.length < 3) {
      showToast("Tên đăng nhập phải có ít nhất 3 ký tự", "error");
      return false;
    }
    if (!password) {
      showToast("Vui lòng nhập mật khẩu", "error");
      return false;
    }
    if (password.length < 6) {
      showToast("Mật khẩu phải có ít nhất 6 ký tự", "error");
      return false;
    }
    if (mode === "register" && password !== confirmPassword) {
      showToast("Mật khẩu xác nhận không khớp", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const result =
        mode === "login"
          ? await onLogin(username, password)
          : await onRegister(username, password);

      if (!result.success) {
        const errorMsg = result.error || result.message || "Đã xảy ra lỗi";
        showToast(errorMsg, "error");
      } else {
        if (mode === "register") {
          showToast("✅ Đăng ký thành công! Vui lòng đăng nhập.", "success");
          setUsername("");
          setPassword("");
          setConfirmPassword("");
          setTimeout(() => setMode("login"), 1500);
        } else {
          showToast("✅ Đăng nhập thành công!", "success");
        }
      }
    } catch (err) {
      showToast("❌ Đã xảy ra lỗi không mong muốn", "error");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-blue-500 to-blue-600">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-white rounded-3xl shadow-2xl p-12 w-[500px]">
        <div className="text-center mb-8">
          <div className="w-32 h-32 bg-indigo-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
            <span className="text-6xl">📦</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Hệ Thống Quản Lý Kho
          </h1>
          <p className="text-gray-600 text-lg">
            {mode === "login" ? "Đăng nhập để tiếp tục" : "Tạo tài khoản mới"}
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tên đăng nhập"
              className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-gray-800 text-lg placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              disabled={loading}
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-gray-800 text-lg placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              disabled={loading}
            />
          </div>

          {mode === "register" && (
            <div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Xác nhận mật khẩu"
                className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 text-gray-800 text-lg placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                disabled={loading}
              />
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Đang xử lý..."
              : mode === "login"
              ? "Đăng Nhập"
              : "Đăng Ký"}
          </button>

          <div className="text-center text-base text-gray-600 pt-3">
            {mode === "login" ? (
              <>
                Chưa có tài khoản?{" "}
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
                  onClick={() => {
                    setMode("register");
                    setUsername("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={loading}
                >
                  Đăng ký ngay
                </button>
              </>
            ) : (
              <>
                Đã có tài khoản?{" "}
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
                  onClick={() => {
                    setMode("login");
                    setUsername("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={loading}
                >
                  Đăng nhập
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== MAIN APP ==========
const MainApp = ({ onLogout }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Get user permissions
  const userPermissions = PERMISSIONS[user?.role] || PERMISSIONS.staff;

  // Check if user can access tab
  const canAccessTab = (tab) => {
    return userPermissions.tabs.includes(tab);
  };

  const renderContent = () => {
    // Check permissions before rendering
    if (!canAccessTab(activeTab)) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Không có quyền truy cập
            </h2>
            <p className="text-gray-600">
              Bạn không có quyền truy cập chức năng này.
            </p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveTab} />;
      case "warehouse":
        return <WarehouseManagement permissions={userPermissions} />;
      case "qc":
        return <QualityCheckManagement permissions={userPermissions} />;
      case "putaway":
        return <PutawayManagement permissions={userPermissions} />;
      case "products":
        return <ProductsManagement permissions={userPermissions} />;
      case "inbound":
        return <InboundManagement permissions={userPermissions} />;
      case "outbound":
        return <OutboundManagement permissions={userPermissions} />;
      case "inventory":
        return <InventoryManagement permissions={userPermissions} />;
      case "report":
        return <StockReport permissions={userPermissions} />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Navigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        permissions={userPermissions}
      />
      <div className="flex-1 flex flex-col">
        <Header user={user} onLogout={onLogout} />
        <main className="flex-1 p-6">{renderContent()}</main>
        <Footer />
      </div>
    </div>
  );
};

// ========== APP ROOT ==========
function App() {
  const { isAuthenticated, loading, login, register, logout } = useAuth();
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => {
    logout();
    showToast("👋 Đăng xuất thành công!", "success");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onLogin={login} onRegister={register} />;
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <DataProvider>
        <MainApp onLogout={handleLogout} />
      </DataProvider>
    </>
  );
}

export default App;