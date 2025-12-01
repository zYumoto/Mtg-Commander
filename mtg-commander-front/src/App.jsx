import { Routes, Route, Navigate } from "react-router-dom";
import { GameProvider } from "./context/GameContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

import Lobby from "./pages/Lobby.jsx";
import Room from "./pages/Room.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Decks from "./pages/Decks.jsx";
import EditDeck from "./pages/EditDeck.jsx";
import DeckView from "./pages/DeckView.jsx";
import Profile from "./pages/Profile.jsx";

import Header from "./components/Header.jsx";

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <div className="app-container">
          <Header />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Navigate to="/lobby" replace />} />

              <Route path="/lobby" element={<Lobby />} />
              <Route path="/room/:code" element={<Room />} />

              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route path="/profile" element={<Profile />} />

              <Route path="/decks" element={<Decks />} />
              <Route path="/decks/new" element={<EditDeck />} />
              <Route path="/decks/:id/edit" element={<EditDeck />} />
              <Route path="/decks/:id/view" element={<DeckView />} />
            </Routes>
          </main>
        </div>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
