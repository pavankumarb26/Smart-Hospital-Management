import { createContext, useContext, useReducer, useEffect } from 'react';
import { connectSocket, disconnectSocket } from '../services/socketService';

const AuthContext = createContext(null);

const initialState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  loading: false,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      return { ...state, user: action.payload.user, token: action.payload.token };
    case 'LOGOUT':
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      disconnectSocket();
      return { ...state, user: null, token: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    if (state.token) {
      connectSocket(state.token);
    }
    return () => disconnectSocket();
  }, [state.token]);

  const login = (token, user) => dispatch({ type: 'LOGIN', payload: { token, user } });
  const logout = () => dispatch({ type: 'LOGOUT' });

  return (
    <AuthContext.Provider value={{ ...state, login, logout, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
