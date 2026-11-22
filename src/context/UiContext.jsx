import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sahayak_lite_mode';
const LEGACY_STORAGE_KEY = 'sahayak.liteMode';
const SLOW_TYPES = ['slow-2g', '2g'];

const UiContext = createContext(null);

function getConnection() {
  try {
    if (typeof navigator === 'undefined') return null;
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  } catch {
    return null;
  }
}

function isSlowConnection(conn) {
  return !!conn && (conn.saveData === true || SLOW_TYPES.includes(conn.effectiveType));
}

function readSavedChoice() {
  try {
    let saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      // One-time migration from the legacy key so an existing preference is kept.
      const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy === '1' || legacy === '0') {
        saved = legacy;
        window.localStorage.setItem(STORAGE_KEY, legacy);
      }
    }
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch {
    // storage unavailable
  }
  return null;
}

function saveChoice(on) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    // storage unavailable; ignore
  }
}

export function UiProvider({ children }) {
  const [liteMode, setLiteMode] = useState(() => {
    const saved = readSavedChoice();
    if (saved !== null) return saved;
    return isSlowConnection(getConnection());
  });

  const [autoDetected, setAutoDetected] = useState(() => {
    if (readSavedChoice() !== null) return false;
    return isSlowConnection(getConnection());
  });

  // Auto-detection listeners: connection changes and going offline.
  useEffect(() => {
    const conn = getConnection();

    const onConnectionChange = () => {
      if (readSavedChoice() !== null) return;
      if (isSlowConnection(getConnection())) {
        setLiteMode(true);
        setAutoDetected(true);
      }
    };

    const onOffline = () => {
      if (readSavedChoice() !== null) return;
      setLiteMode(true);
      setAutoDetected(true);
    };

    if (conn && typeof conn.addEventListener === 'function') {
      conn.addEventListener('change', onConnectionChange);
    }
    window.addEventListener('offline', onOffline);

    return () => {
      if (conn && typeof conn.removeEventListener === 'function') {
        conn.removeEventListener('change', onConnectionChange);
      }
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Reflect Lite Mode on the document root.
  useEffect(() => {
    const root = document.documentElement;
    if (liteMode) {
      root.classList.add('lite-mode');
    } else {
      root.classList.remove('lite-mode');
    }
  }, [liteMode]);

  const toggleLiteMode = () => {
    setLiteMode((prev) => {
      const next = !prev;
      saveChoice(next);
      return next;
    });
    setAutoDetected(false);
  };

  const value = useMemo(
    () => ({ liteMode, autoDetected, toggleLiteMode }),
    [liteMode, autoDetected]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) {
    throw new Error('useUi must be used inside UiProvider');
  }
  return ctx;
}
