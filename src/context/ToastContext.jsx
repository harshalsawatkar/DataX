import React, { createContext, useContext, useState, useCallback } from 'react';
import CanvasToastStack from '../components/mapping/CanvasToastStack';

const ToastContext = createContext({
  showToast: () => {},
  dismissToast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ type = 'info', title, message, durationMs = 4500, actionLabel, onAction }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newToast = { id, type, title, message, actionLabel, onAction };

    setToasts((prev) => [...prev.slice(-4), newToast]);

    if (durationMs > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    }
    return id;
  }, []);

  const success = useCallback((message, title = 'Success', options = {}) => {
    return showToast({ type: 'success', title, message, ...options });
  }, [showToast]);

  const error = useCallback((message, title = 'Error', options = {}) => {
    return showToast({ type: 'error', title, message, durationMs: 6000, ...options });
  }, [showToast]);

  const warning = useCallback((message, title = 'Warning', options = {}) => {
    return showToast({ type: 'warning', title, message, ...options });
  }, [showToast]);

  const info = useCallback((message, title = 'Notice', options = {}) => {
    return showToast({ type: 'info', title, message, ...options });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, success, error, warning, info }}>
      {children}
      <CanvasToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      dismissToast: () => {},
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    };
  }
  return context;
}
