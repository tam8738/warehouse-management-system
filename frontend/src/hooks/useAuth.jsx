import { useState, useEffect } from "react";
import api from "../services/api";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // Kiểm tra token còn hợp lệ không
  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/auth/me");
      // Backend trả về: { id, username, fullName, role }
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("token");
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // ====== Đăng nhập ======
  const login = async (username, password) => {
    try {
      const response = await api.post("/auth/login", { username, password });
      // Backend trả về: { token, user: { id, username } }
      const { token, user: userData } = response.data;

      localStorage.setItem("token", token);
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Đăng nhập thất bại",
      };
    }
  };

  // ====== Đăng xuất ======
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuthenticated(false);
  };

  // ====== Đăng ký ======
  const register = async (username, password) => {
    try {
      const response = await api.post("/auth/register", { 
        username, 
        password,
        fullName: username, // Default fullName
        role: "staff" // Default role
      });
      // Backend trả về: { message, user }
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Register error:", error);
      return {
        success: false,
        message: error.response?.data?.message || error.response?.data?.error || "Đăng ký thất bại",
      };
    }
  };

  return {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    register,
  };
};