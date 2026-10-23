import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'https://smart-hospital-management-1.onrender.com';

let socket = null;

export const connectSocket = (token) => {
  if (!token) return null;

  if (socket) {
    if (socket.auth?.token === token) {
      if (!socket.connected) {
        socket.connect();
      }
      return socket;
    }
    socket.disconnect();
    socket = null;
  }

  socket = io(API_URL, {
    auth: { token },
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('token');
    if (token) return connectSocket(token);
  }
  return socket;
};
