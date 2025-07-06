import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

let toastCounter = 0;

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const toast = useCallback(({ ...props }: Omit<Toast, 'id'>) => {
    const id = (++toastCounter).toString();
    const newToast: Toast = {
      id,
      ...props,
    };

    setState((prevState) => ({
      toasts: [...prevState.toasts, newToast],
    }));

    // Auto-dismiss after duration (default 5 seconds)
    const duration = props.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }

    return id;
  }, []);

  const dismiss = useCallback((toastId: string) => {
    setState((prevState) => ({
      toasts: prevState.toasts.filter((toast) => toast.id !== toastId),
    }));
  }, []);

  const dismissAll = useCallback(() => {
    setState({ toasts: [] });
  }, []);

  return {
    toast,
    dismiss,
    dismissAll,
    toasts: state.toasts,
  };
}