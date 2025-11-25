import { Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

import Home from "./pages/Home.jsx";
import Lobby from "./pages/Lobby.jsx";
import Room from "./pages/Room.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

import Header from "./components/Header.jsx";

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <div className="app-container">
          <Header />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/lobby" element={<Lobby />} />
              <Route path="/room/:code" element={<Room />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Routes>
          </main>
        </div>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
