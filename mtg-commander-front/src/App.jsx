import { Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext.jsx";

import Home from "./pages/Home.jsx";
import Lobby from "./pages/Lobby.jsx";
import Room from "./pages/Room.jsx";

import Header from "./components/Header.jsx";

function App() {
  return (
    <GameProvider>
      <div className="app-container">
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/room/:code" element={<Room />} />
          </Routes>
        </main>
      </div>
    </GameProvider>
  );
}

export default App;
