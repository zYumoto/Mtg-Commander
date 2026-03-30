import { Routes, Route, Navigate } from "react-router-dom";
import { GameProvider } from "./context/GameContext.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

import Lobby from "./pages/Lobby.jsx";
import Room from "./pages/Room.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Decks from "./pages/Decks.jsx";
import EditDeck from "./pages/EditDeck.jsx";
import DeckView from "./pages/DeckView.jsx";
import Profile from "./pages/Profile.jsx";
import Friends from "./pages/Friends.jsx";

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="page-center">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppInner() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="page-center">Carregando...</div>;
  }

  return (
    <Routes>
      {/* Raiz */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/lobby" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Lobby */}
      <Route
        path="/lobby"
        element={
          <RequireAuth>
            <Lobby />
          </RequireAuth>
        }
      />

      {/* Room */}
      <Route
        path="/room/:code"
        element={
          <RequireAuth>
            <Room />
          </RequireAuth>
        }
      />

      {/* Decks */}
      <Route
        path="/decks"
        element={
          <RequireAuth>
            <Decks />
          </RequireAuth>
        }
      />
      <Route
        path="/decks/new"
        element={
          <RequireAuth>
            <EditDeck />
          </RequireAuth>
        }
      />
      <Route
        path="/decks/:id/edit"
        element={
          <RequireAuth>
            <EditDeck />
          </RequireAuth>
        }
      />
      <Route
        path="/decks/:id/view"
        element={
          <RequireAuth>
            <DeckView />
          </RequireAuth>
        }
      />

      {/* Perfil / Amigos */}
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />
      <Route
        path="/friends"
        element={
          <RequireAuth>
            <Friends />
          </RequireAuth>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <AppInner />
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
