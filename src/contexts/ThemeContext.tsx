'use client';

import { createContext, useContext, useEffect, ReactNode, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const themeStore = (() => {
  const listeners = new Set<() => void>();

  const getResolvedTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme') as Theme;
    if (saved === 'light') return 'light';
    if (saved === 'dark') return 'dark';
    return getSystemTheme();
  };

  const getSnapshot = (): Theme => {
    if (typeof window === 'undefined') return 'system';
    const saved = localStorage.getItem('theme');
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  };

  const getServerSnapshot = (): Theme => 'system';

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const setTheme = (theme: Theme) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('theme', theme);
    emit();
  };

  const toggleTheme = () => {
    const current = getResolvedTheme();
    setTheme(current === 'light' ? 'dark' : 'light');
  };

  // 暴露 emit 用于系统主题变化时触发更新
  return { subscribe, getSnapshot, getServerSnapshot, setTheme, toggleTheme, getResolvedTheme, emit };
})();

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot, themeStore.getServerSnapshot);
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // 动态更新 meta theme-color 以适配浏览器状态栏
    const themeColor = resolvedTheme === 'dark' ? '#1C1C1E' : '#F2F2F7';
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', themeColor);

    // 延迟添加 theme-ready 类，确保首次渲染后才启用过渡动画
    requestAnimationFrame(() => {
      root.classList.add('theme-ready');
    });
  }, [resolvedTheme]);

  // 监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      themeStore.emit();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const toggleTheme = () => {
    themeStore.toggleTheme();
  };

  const setTheme = (newTheme: Theme) => {
    themeStore.setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
