import { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const storageKey = 'dental:isAuthenticated';
  const timestampKey = 'dental:authTimestamp';
  const TTL_MS = 30 * 60 * 1000; // 30 minutes
  const logoutTimerRef = useRef<number | null>(null);

  // Initialize isAuthenticated synchronously from sessionStorage so components
  // that read auth on first render (eg. PrivateRoute) don't redirect before
  // we hydrate state.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      const ts = sessionStorage.getItem(timestampKey);
      if (raw !== null && ts !== null) {
        const then = Number(ts);
        const now = Date.now();
        const elapsed = now - then;
        if (!Number.isFinite(then) || elapsed >= TTL_MS) {
          // expired: cleanup
          sessionStorage.removeItem(storageKey);
          sessionStorage.removeItem(timestampKey);
          return false;
        }
        return raw === 'true';
      }
    } catch (err) {
      // ignore
    }
    return false;
  });

  // When authenticated on mount/update, schedule auto-logout based on timestamp
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const ts = sessionStorage.getItem(timestampKey);
      if (!ts) return;
      const then = Number(ts);
      const now = Date.now();
      const elapsed = now - then;
      if (!Number.isFinite(then) || elapsed >= TTL_MS) {
        // already expired
        setIsAuthenticated(false);
        sessionStorage.removeItem(storageKey);
        sessionStorage.removeItem(timestampKey);
        return;
      }
      const remaining = TTL_MS - elapsed;
      if (logoutTimerRef.current !== null) {
        clearTimeout(logoutTimerRef.current as number);
      }
      logoutTimerRef.current = window.setTimeout(() => {
        try {
          setIsAuthenticated(false);
          sessionStorage.removeItem(storageKey);
          sessionStorage.removeItem(timestampKey);
        } catch (e) {
          // ignore
        }
      }, remaining) as unknown as number;
    } catch (err) {
      // ignore
    }

    return () => {
      if (logoutTimerRef.current !== null) {
        clearTimeout(logoutTimerRef.current as number);
        logoutTimerRef.current = null;
      }
    };
  }, [isAuthenticated]);

  const login = (password: string) => {
    if (password === 'admin') {
      setIsAuthenticated(true);
      try {
        sessionStorage.setItem(storageKey, 'true');
        sessionStorage.setItem(timestampKey, String(Date.now()));
        // schedule auto-logout after TTL_MS
        if (logoutTimerRef.current !== null) {
          clearTimeout(logoutTimerRef.current as number);
        }
        logoutTimerRef.current = window.setTimeout(() => {
          try {
            setIsAuthenticated(false);
            sessionStorage.removeItem(storageKey);
            sessionStorage.removeItem(timestampKey);
          } catch (e) {
            // ignore
          }
        }, TTL_MS) as unknown as number;
      } catch (err) {
        // ignore storage errors
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(timestampKey);
      if (logoutTimerRef.current !== null) {
        clearTimeout(logoutTimerRef.current as number);
        logoutTimerRef.current = null;
      }
    } catch (err) {
      // ignore storage errors
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
