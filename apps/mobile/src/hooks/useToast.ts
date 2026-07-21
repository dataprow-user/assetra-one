import { useRef, useState } from 'react';
import type { ToastType } from '../components/ui/Toast';

export function useToast() {
  const [toast, setToast] = useState<{ type: ToastType; msg: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: ToastType, msg: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ type, msg });
    timer.current = setTimeout(() => setToast(null), 3500);
  };

  return { toast, showToast };
}
