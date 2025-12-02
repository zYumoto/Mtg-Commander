import { Routes, Route, Navigate } from "react-router-dom";
import { GameProvider } from "./context/GameContext.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

import Lobby from "./pages/Lobby.jsx";
import Room from "./pages/Room.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Decks from "./pages/Decks.jsx";
import EditDeck from "./pages/EditDeck.jsx";
import DeckView from "./pages/DeckView.jsx";
import Profile from "./pages/Profile.jsx";
import Friends from "./pages/Friends.jsx";

import Header from "./components/Header.jsx";

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
  return (
    <div className="app-container">
      <Header />

      <main className="app-main">
        <Routes>
          {/* Raiz já leva pro lobby, se estiver logado */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Lobby />
              </RequireAuth>
            }
          />

          <Route
            path="/lobby"
            element={
              <RequireAuth>
                <Lobby />
              </RequireAuth>
            }
          />

          <Route
            path="/room/:code"
            element={
              <RequireAuth>
                <Room />
              </RequireAuth>
            }
          />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Perfil */}
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />

          {/* Amigos */}
          <Route
            path="/friends"
            element={
              <RequireAuth>
                <Friends />
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
        </Routes>
      </main>
    </div>
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
