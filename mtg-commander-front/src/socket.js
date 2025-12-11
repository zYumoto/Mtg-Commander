import { io } from 'socket.io-client';

export const socket = io('https://mtg-commander-4k8m.onrender.com', {
  autoConnect: false,
});
