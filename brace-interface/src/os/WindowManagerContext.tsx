import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

export type WindowApp = {
  id: string;
  title: string;
  component: ReactNode;
  icon?: ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  isFocused: boolean;
};

type WindowManagerContextType = {
  windows: WindowApp[];
  openWindow: (app: Omit<WindowApp, "x" | "y" | "zIndex" | "isFocused" | "minimized" | "maximized" | "width" | "height"> & Partial<WindowApp>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, width: number, height: number) => void;
};

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined);

let nextZIndex = 100;

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [windows, setWindows] = useState<WindowApp[]>([]);

  const openWindow = useCallback((app: Omit<WindowApp, "x" | "y" | "zIndex" | "isFocused" | "minimized" | "maximized" | "width" | "height"> & Partial<WindowApp>) => {
    setWindows((prev) => {
      const exists = prev.find((w) => w.id === app.id);
      if (exists) {
        // Just focus it
        nextZIndex++;
        return prev.map((w) =>
          w.id === app.id
            ? { ...w, isFocused: true, minimized: false, zIndex: nextZIndex }
            : { ...w, isFocused: false }
        );
      }
      
      nextZIndex++;
      const newWindow: WindowApp = {
        width: 800,
        height: 600,
        x: Math.random() * 100 + 50,
        y: Math.random() * 100 + 50,
        minimized: false,
        maximized: false,
        zIndex: nextZIndex,
        isFocused: true,
        ...app,
      };

      return [...prev.map(w => ({ ...w, isFocused: false })), newWindow];
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const w = prev.find((w) => w.id === id);
      if (!w || w.isFocused) return prev;
      
      nextZIndex++;
      return prev.map((win) =>
        win.id === id
          ? { ...win, isFocused: true, zIndex: nextZIndex }
          : { ...win, isFocused: false }
      );
    });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((win) =>
        win.id === id ? { ...win, minimized: true, isFocused: false } : win
      )
    );
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((win) =>
        win.id === id ? { ...win, maximized: !win.maximized } : win
      )
    );
  }, []);

  const updateWindowPosition = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) =>
      prev.map((win) => (win.id === id ? { ...win, x, y } : win))
    );
  }, []);

  const updateWindowSize = useCallback((id: string, width: number, height: number) => {
    setWindows((prev) =>
      prev.map((win) => (win.id === id ? { ...win, width, height } : win))
    );
  }, []);

  return (
    <WindowManagerContext.Provider
      value={{
        windows,
        openWindow,
        closeWindow,
        focusWindow,
        minimizeWindow,
        maximizeWindow,
        updateWindowPosition,
        updateWindowSize,
      }}
    >
      {children}
    </WindowManagerContext.Provider>
  );
}

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error("useWindowManager must be used within a WindowManagerProvider");
  }
  return context;
}
