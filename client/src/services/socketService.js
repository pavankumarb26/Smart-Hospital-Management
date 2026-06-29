import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'https://smart-hospital-management-1.onrender.com';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(API_URL, {
    auth: { token },
    autoConnect: true,
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
