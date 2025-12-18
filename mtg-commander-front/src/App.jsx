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

  if (loading) return <div className="page-center">Carregando...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
}

/** Layout COM header (pra todas as páginas que você quiser manter o topo) */
function WithHeaderLayout({ children }) {
  return (
    <div className="app-container">
      <Header />
      <main className="app-main">{children}</main>
    </div>
  );
}

function AppInner() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div className="page-center">Carregando...</div>;

  return (
    <Routes>
      {/* Raiz: manda pro lobby se logado, senão login */}
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

      {/* Lobby SEM header (tela inteira) */}
      <Route
        path="/lobby"
        element={
          <RequireAuth>
            <Lobby />
          </RequireAuth>
        }
      />

      {/* Room COM header */}
      <Route
        path="/room/:code"
        element={
          <RequireAuth>
            <WithHeaderLayout>
              <Room />
            </WithHeaderLayout>
          </RequireAuth>
        }
      />

      {/* Auth SEM header */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Perfil COM header */}
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <WithHeaderLayout>
              <Profile />
            </WithHeaderLayout>
          </RequireAuth>
        }
      />

      {/* Amigos COM header */}
      <Route
        path="/friends"
        element={
          <RequireAuth>
            <WithHeaderLayout>
              <Friends />
            </WithHeaderLayout>
          </RequireAuth>
        }
      />

      {/* Decks COM header */}
      <Route
        path="/decks"
        element={
          <RequireAuth>
            <WithHeaderLayout>
              <Decks />
            </WithHeaderLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/decks/new"
        element={
          <RequireAuth>
            <WithHeaderLayout>
              <EditDeck />
            </WithHeaderLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/decks/:id/edit"
        element={
          <RequireAuth>
            <WithHeaderLayout>
              <EditDeck />
            </WithHeaderLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/decks/:id/view"
        element={
          <RequireAuth>
            <WithHeaderLayout>
              <DeckView />
            </WithHeaderLayout>
          </RequireAuth>
        }
      />

      {/* fallback */}
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
