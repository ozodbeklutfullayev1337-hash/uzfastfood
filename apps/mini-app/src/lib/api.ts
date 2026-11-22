const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
          notificationOccurred: (type: 'success' | 'warning' | 'error') => void;
        };
      };
    };
  }
}

export function getTelegramHeaders(): Record<string, string> {
  const tg = window.Telegram?.WebApp;
  if (tg?.initData) {
    return { 'x-telegram-init-data': tg.initData };
  }
  return {
    'x-dev-telegram-id': '777000111',
    'x-dev-first-name': 'Ozodbek',
  };
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getTelegramHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Server xatoligi');
  }
  return data as T;
}

export function formatUZS(amount: number): string {
  return `${Math.round(amount).toLocaleString('ru-RU')} so'm`;
}