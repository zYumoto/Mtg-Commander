import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket } from '../socket';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Listeners do socket
    function onConnect() {
      setConnected(true);
      console.log('Conectado ao servidor Socket.IO');
    }

    function onDisconnect() {
      setConnected(false);
      console.log('Desconectado do servidor Socket.IO');
    }

    function onRoomState(state) {
      if (!state) return;
      setRoomCode(state.roomCode);
      setPlayers(state.players || []);
      setMessages(state.messages || []);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room-state', onRoomState);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room-state', onRoomState);
    };
  }, []);

  function connectSocketIfNeeded() {
    if (!socket.connected) {
      socket.connect();
    }
  }

  // Entrar na sala via backend
  function joinRoom({ name, room }) {
    if (!name || !room) return;
    connectSocketIfNeeded();
    setPlayerName(name);
    setRoomCode(room.toUpperCase());

    socket.emit('join-room', {
      roomCode: room,
      playerName: name,
    });
  }

  // Atualizar vida via backend
  function updatePlayerLife(name, delta) {
    if (!roomCode || !name) return;

    socket.emit('update-life', {
      roomCode,
      playerName: name,
      delta,
    });
  }

  // Enviar mensagem via backend
  function sendMessage(text) {
    if (!roomCode || !playerName || !text.trim()) return;

    socket.emit('chat-message', {
      roomCode,
      from: playerName,
      text: text.trim(),
    });
  }

  const value = {
    playerName,
    setPlayerName,
    roomCode,
    setRoomCode,
    players,
    messages,
    connected,
    joinRoom,
    updatePlayerLife,
    sendMessage,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used inside GameProvider');
  }
  return ctx;
}
