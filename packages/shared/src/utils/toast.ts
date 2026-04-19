export type ToastVariant = 'info' | 'success' | 'error';

export type ToastDetail = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
};

export const TOAST_EVENT_NAME = 'easy-reading-toast';

export function showToast(
  message: string,
  options?: {
    variant?: ToastVariant;
    duration?: number;
  },
) {
  if (typeof window === 'undefined' || !message.trim()) {
    return;
  }

  const detail: ToastDetail = {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    message,
    variant: options?.variant || 'info',
    duration: options?.duration,
  };

  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT_NAME, { detail }));
}
