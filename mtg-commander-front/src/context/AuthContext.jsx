import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const API_URL = "http://localhost:4000"; // URL do backend

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // {_id, email, nickname, fullName, avatarUrl, bio}
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

  async function fetchMe(jwtToken = token) {
    if (!jwtToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Erro ao buscar usuário");
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

    const jwtToken = data.token;
    setToken(jwtToken);
    localStorage.setItem("authToken", jwtToken);
    await fetchMe(jwtToken);
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

    const jwtToken = data.token;
    setToken(jwtToken);
    localStorage.setItem("authToken", jwtToken);
    await fetchMe(jwtToken);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("authToken");
  }

  // Atualiza info básicas do perfil
  async function updateProfile(fields) {
    if (!token) {
      throw new Error("Usuário não autenticado");
    }

    const res = await fetch(`${API_URL}/auth/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(fields),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro ao atualizar perfil");
    }

    setUser(data);
    return data;
  }

  // Trocar senha
  async function changePassword(currentPassword, newPassword) {
    if (!token) {
      throw new Error("Usuário não autenticado");
    }

    const res = await fetch(`${API_URL}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Erro ao trocar senha");
    }

    return true;
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
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
