import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeType } from "../types";
import { Themes } from "./themes";
import { getTheme, saveTheme } from "../utils/storage";

interface ThemeContextType {
  theme: ThemeType;
  colors: any;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setInternalTheme] = useState<ThemeType>("Dark");

  useEffect(() => {
    getTheme().then((saved) => {
      if (saved && Object.keys(Themes).includes(saved)) {
        setInternalTheme(saved as ThemeType);
      }
    });
  }, []);

  const setTheme = (newTheme: ThemeType) => {
    setInternalTheme(newTheme);
    saveTheme(newTheme);
  };

  const colors = Themes[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
