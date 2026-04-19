'use client';

import { useEffect, useState } from 'react';
import { TOAST_EVENT_NAME, type ToastDetail } from '../utils/toast';

type ToastItem = Required<Pick<ToastDetail, 'id' | 'message' | 'variant'>> & {
  duration: number;
  x: number | null;
  y: number | null;
};

const DEFAULT_DURATION = 2800;
const TOAST_WIDTH = 384;
const TOAST_HORIZONTAL_MARGIN = 16;
const TOAST_VERTICAL_MARGIN = 16;
const POINTER_OFFSET_X = 18;
const POINTER_OFFSET_Y = 20;

const VARIANT_STYLES: Record<ToastItem['variant'], string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pointerPosition, setPointerPosition] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  const [viewportSize, setViewportSize] = useState({ width: 1280, height: 720 });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateViewportSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const handlePointerMove = (event: MouseEvent) => {
      setPointerPosition({ x: event.clientX, y: event.clientY });
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      setPointerPosition({ x: touch.clientX, y: touch.clientY });
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => {
      window.removeEventListener('resize', updateViewportSize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastDetail>;
      const detail = customEvent.detail;
      if (!detail?.message) {
        return;
      }

      setToasts((current) => [
        ...current,
        {
          id: detail.id,
          message: detail.message,
          variant: detail.variant || 'info',
          duration: detail.duration || DEFAULT_DURATION,
          x: pointerPosition.x,
          y: pointerPosition.y,
        },
      ]);
    };

    window.addEventListener(TOAST_EVENT_NAME, handleToast as EventListener);
    return () => {
      window.removeEventListener(TOAST_EVENT_NAME, handleToast as EventListener);
    };
  }, [pointerPosition.x, pointerPosition.y]);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, toast.duration),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]">
      {toasts.map((toast, index) => {
        const fallbackLeft = TOAST_HORIZONTAL_MARGIN;
        const fallbackTop = TOAST_VERTICAL_MARGIN + index * 76;
        const maxLeft = Math.max(
          TOAST_HORIZONTAL_MARGIN,
          viewportSize.width - TOAST_WIDTH - TOAST_HORIZONTAL_MARGIN,
        );
        const computedLeft =
          toast.x === null
            ? fallbackLeft
            : clamp(toast.x + POINTER_OFFSET_X, TOAST_HORIZONTAL_MARGIN, maxLeft);
        const computedTop =
          toast.y === null
            ? fallbackTop
            : clamp(
                toast.y + POINTER_OFFSET_Y + index * 10,
                TOAST_VERTICAL_MARGIN,
                Math.max(TOAST_VERTICAL_MARGIN, viewportSize.height - 96 - TOAST_VERTICAL_MARGIN),
              );

        return (
        <div
          key={toast.id}
          className={`pointer-events-none fixed w-[min(24rem,calc(100vw-2rem))] rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${VARIANT_STYLES[toast.variant]}`}
          style={{
            left: computedLeft,
            top: computedTop,
          }}
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-medium leading-6">{toast.message}</p>
        </div>
        );
      })}
    </div>
  );
}
