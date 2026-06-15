import { createContext, useContext, useEffect, useState } from 'react';
import { getSocket } from '../services/socketService';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setConnected(false);
      return;
    }

    const socket = getSocket();
    if (!socket) return;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [token]);

  const subscribe = (event, handler) => {
    const socket = getSocket();
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  };

  const emit = (event, data) => {
    const socket = getSocket();
    if (socket) socket.emit(event, data);
  };

  return (
    <SocketContext.Provider value={{ connected, subscribe, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocketContext = () => useContext(SocketContext);
