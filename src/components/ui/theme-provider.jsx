import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeProviderContext = createContext({ theme: "light", setTheme: () => null });

export function ThemeProvider({ children, defaultTheme = "light", storageKey = "ui-theme" }) {
  const [theme, setTheme] = useState(() => {
    // Check if we're in the browser
    if (typeof window !== "undefined") {
      // Try to get the theme from local storage
      const storedTheme = localStorage.getItem(storageKey);
      // Check if the user has a system preference
      if (!storedTheme) {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        return systemTheme;
      }
      return storedTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  const value = {
    theme,
    setTheme: (newTheme) => {
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}; 