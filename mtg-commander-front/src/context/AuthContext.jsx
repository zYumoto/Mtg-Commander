import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const API_URL = "http://localhost:4000"; // backend

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { _id, email, nickname }
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carrega token salvo ao abrir o app
  useEffect(() => {
    const saved = localStorage.getItem("authToken");
    if (!saved) {
      setLoading(false);
      return;
    }

    setToken(saved);
    fetchMe(saved);
  }, []);

  async function fetchMe(jwt) {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!res.ok) {
        throw new Error("Token inválido");
      }

      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error("Erro ao buscar usuário:", err);
      setUser(null);
      setToken(null);
      localStorage.removeItem("authToken");
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro ao fazer login");
    }

    const jwt = data.token;
    setToken(jwt);
    localStorage.setItem("authToken", jwt);
    await fetchMe(jwt);
  }

  async function register(email, password, nickname) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, nickname }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Erro ao registrar");
    }

    // depois de registrar, já faz login
    await login(email, password);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("authToken");
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth precisa estar dentro de AuthProvider");
  }
  return ctx;
}
