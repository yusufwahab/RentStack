import { createContext, useContext, useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  getCurrentUser,
  login as loginService,
  logout as logoutService,
  register as registerService,
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
  }, []);

  async function login(email, password) {
    const { user } = await loginService(email, password);
    setCurrentUser(user);
    return user;
  }

  async function register(data) {
    const { user } = await registerService(data);
    setCurrentUser(user);
    return user;
  }

  async function logout() {
    await logoutService();
    setCurrentUser(null);
  }

  return (
    <AuthContext.Provider value={{ currentUser, authLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function ProtectedRoute({ children }) {
  const { currentUser, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) return null;
  if (!currentUser) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
