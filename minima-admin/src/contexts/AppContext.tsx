import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { User, Notification } from '../types';

interface AppState {
  user: User | null;
  notifications: Notification[];
}

type AppAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string };

const initialState: AppState = {
  user: JSON.parse(localStorage.getItem('admin_user') || 'null'),
  notifications: [],
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      localStorage.setItem('admin_user', JSON.stringify(action.payload));
      return { ...state, user: action.payload };
    case 'LOGOUT':
      localStorage.removeItem('admin_user');
      return { ...state, user: null };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            ...action.payload,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
          },
        ],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
