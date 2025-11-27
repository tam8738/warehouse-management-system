import React, { useState, useRef, useEffect } from 'react';
import { Bell, User, LogOut, ChevronDown, X, Trash2, CheckCheck } from 'lucide-react';
import api from '../../services/api';

const Header = ({ user, onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Switch account states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [password, setPassword] = useState('');
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchError, setSwitchError] = useState('');
  
  // Lấy danh sách accounts đã đăng nhập từ localStorage (tối đa 5)
  const [savedAccounts, setSavedAccounts] = useState(() => {
    const saved = localStorage.getItem('savedAccounts');
    let accounts = saved ? JSON.parse(saved) : [];
    
    // Đưa user hiện tại lên đầu (most recent)
    if (user?.username) {
      accounts = accounts.filter(acc => acc !== user.username);
      accounts.unshift(user.username);
      
      // Giới hạn tối đa 5 tài khoản
      if (accounts.length > 5) {
        accounts = accounts.slice(0, 5);
      }
      
      localStorage.setItem('savedAccounts', JSON.stringify(accounts));
    }
    
    return accounts;
  });

  const notificationRef = useRef(null);
  const accountRef = useRef(null);

  // Đóng dropdowns khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lấy notifications khi mở dropdown
  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  // Polling notifications mỗi 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications?limit=50');
      const data = response.data?.data || response.data || [];
      setNotifications(data);
      setUnreadCount(response.data?.unreadCount || data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Nếu lỗi 404 (chưa có API), không hiển thị lỗi
      if (error.response?.status !== 404) {
        console.error('Notification error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(notifications.filter(n => n.id !== id));
      const deletedNotif = notifications.find(n => n.id === id);
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllNotifications = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa tất cả thông báo?')) return;
    
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleSwitchAccount = (username) => {
    setSelectedAccount(username);
    setPassword('');
    setSwitchError('');
    setShowPasswordModal(true);
    setShowAccountMenu(false);
  };

  const confirmSwitchAccount = async () => {
    if (!password) {
      setSwitchError('Vui lòng nhập mật khẩu');
      return;
    }

    setSwitchLoading(true);
    setSwitchError('');

    try {
      const response = await api.post('/auth/login', {
        username: selectedAccount,
        password
      });

      const { token, user: userData } = response.data;

      // Lưu token mới
      localStorage.setItem('token', token);

      // Cập nhật danh sách accounts (đưa account vừa đăng nhập lên đầu)
      let accounts = savedAccounts.filter(acc => acc !== selectedAccount);
      accounts.unshift(selectedAccount);
      
      // Giới hạn tối đa 5 tài khoản
      if (accounts.length > 5) {
        accounts = accounts.slice(0, 5);
      }
      
      setSavedAccounts(accounts);
      localStorage.setItem('savedAccounts', JSON.stringify(accounts));

      // Reload trang để cập nhật user
      window.location.reload();
    } catch (error) {
      console.error('Switch account error:', error);
      setSwitchError(error.response?.data?.message || 'Sai mật khẩu hoặc lỗi hệ thống');
    } finally {
      setSwitchLoading(false);
    }
  };

  const removeAccount = (username) => {
    if (username === user?.username) {
      alert('Không thể xóa tài khoản đang sử dụng!');
      return;
    }
    
    const updated = savedAccounts.filter(acc => acc !== username);
    setSavedAccounts(updated);
    localStorage.setItem('savedAccounts', JSON.stringify(updated));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success': return 'border-l-green-500 bg-green-50';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50';
      case 'error': return 'border-l-red-500 bg-red-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Quản trị viên';
      case 'manager': return 'Quản lý';
      case 'staff': return 'Nhân viên';
      default: return 'Người dùng';
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      case 'staff': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getAvatarColor = (username) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500'];
    const index = username?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  const getInitial = (name) => {
    return name?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Hệ Thống Quản Lý Kho</h1>
            <p className="text-sm text-gray-500">Warehouse Management System</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">
                      Thông báo ({unreadCount} chưa đọc)
                    </h3>
                    <div className="flex gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          title="Đánh dấu tất cả đã đọc"
                        >
                          <CheckCheck size={14} />
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={deleteAllNotifications}
                          className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                          title="Xóa tất cả"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {loading ? (
                      <div className="p-8 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        Đang tải...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Bell size={40} className="mx-auto mb-2 opacity-30" />
                        <p>Không có thông báo</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            !notif.isRead ? 'bg-blue-50/50' : ''
                          } ${getNotificationColor(notif.type)} border-l-4`}
                          onClick={() => !notif.isRead && markAsRead(notif.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{getNotificationIcon(notif.type)}</span>
                                <h4 className="font-semibold text-sm text-gray-800">
                                  {notif.title}
                                </h4>
                                {!notif.isRead && (
                                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                )}
                              </div>
                              {notif.message && (
                                <p className="text-xs text-gray-600 mb-1">{notif.message}</p>
                              )}
                              <p className="text-xs text-gray-400">{formatTime(notif.createdAt)}</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Account Menu */}
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getAvatarColor(user?.username)}`}>
                  {getInitial(user?.username || user?.fullName)}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{user?.fullName || user?.username}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(user?.role)}`}>
                      {getRoleText(user?.role)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">@{user?.username}</span>
                </div>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`} />
              </button>

              {showAccountMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  {/* Thông tin tài khoản hiện tại */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-blue-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${getAvatarColor(user?.username)}`}>
                        {getInitial(user?.username)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800">{user?.fullName || user?.username}</p>
                        <p className="text-xs text-gray-600">@{user?.username}</p>
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${getRoleBadgeColor(user?.role)}`}>
                          {getRoleText(user?.role)}
                        </span>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white" title="Đang hoạt động"></div>
                    </div>
                  </div>

                  {/* Danh sách tài khoản đã đăng nhập */}
                  {savedAccounts.length > 0 && (
                    <div className="py-2 border-b border-gray-100">
                      <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Tài khoản đã đăng nhập ({savedAccounts.length})
                      </p>
                      <div className="max-h-64 overflow-y-auto">
                        {savedAccounts.map((acc) => {
                          const isCurrentUser = acc === user?.username;
                          return (
                            <div 
                              key={acc} 
                              className={`flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 group transition-colors ${
                                isCurrentUser ? 'bg-blue-50' : ''
                              }`}
                            >
                              <button
                                onClick={() => !isCurrentUser && handleSwitchAccount(acc)}
                                disabled={isCurrentUser}
                                className={`flex items-center gap-3 text-sm flex-1 text-left ${
                                  isCurrentUser ? 'cursor-default' : 'cursor-pointer'
                                }`}
                              >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(acc)}`}>
                                  {getInitial(acc)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-medium ${isCurrentUser ? 'text-blue-700' : 'text-gray-700'}`}>
                                      {acc}
                                    </span>
                                    {isCurrentUser && (
                                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                                        Hiện tại
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500">@{acc}</span>
                                </div>
                              </button>
                              {!isCurrentUser && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeAccount(acc);
                                  }}
                                  className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-1 rounded hover:bg-red-50"
                                  title="Xóa tài khoản khỏi danh sách"
                                >
                                  <X size={16} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Nút đăng xuất */}
                  <div className="py-1">
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                    >
                      <LogOut size={18} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Chuyển sang tài khoản</h2>
              <p className="text-sm text-gray-500 mt-1">@{selectedAccount}</p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nhập mật khẩu của tài khoản {selectedAccount}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && confirmSwitchAccount()}
                placeholder="Mật khẩu"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {switchError && (
                <p className="text-sm text-red-600 mt-2">{switchError}</p>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  setSwitchError('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                disabled={switchLoading}
              >
                Hủy
              </button>
              <button
                onClick={confirmSwitchAccount}
                disabled={switchLoading || !password}
                className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {switchLoading ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;