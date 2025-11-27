import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ===== Thêm token vào mọi request =====
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== Xử lý lỗi response =====
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Nếu token hết hạn hoặc không hợp lệ
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Không redirect, App.jsx sẽ tự render lại trang đăng nhập
    }
    return Promise.reject(error);
  }
);

export default api;
