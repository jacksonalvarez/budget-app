'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, ThemeName, themes, lightTheme } from './themes';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (themeName: ThemeName) => void;
  availableThemes: typeof themes;
  updateCustomColors: (colors: Partial<Theme['colors']>) => void;
  resetCustomColors: () => void;
  updateGlow: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<ThemeName>('light');
  const [theme, setTheme] = useState<Theme>(lightTheme);
  const [customColors, setCustomColors] = useState<Partial<Theme['colors']>>({});

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('budgetAppTheme') as ThemeName;
    const savedCustomColors = localStorage.getItem('budgetAppCustomColors');
    
    if (savedTheme && themes[savedTheme]) {
      setThemeName(savedTheme);
      const baseTheme = themes[savedTheme];
      
      if (savedCustomColors) {
        const parsedColors = JSON.parse(savedCustomColors);
        setCustomColors(parsedColors);
        setTheme({ ...baseTheme, colors: { ...baseTheme.colors, ...parsedColors } });
      } else {
        setTheme(baseTheme);
      }
    }
  }, []);

  // Save theme to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('budgetAppTheme', themeName);
  }, [themeName]);

  // Save custom colors to localStorage when they change
  useEffect(() => {
    if (Object.keys(customColors).length > 0) {
      localStorage.setItem('budgetAppCustomColors', JSON.stringify(customColors));
    }
  }, [customColors]);

  const handleSetTheme = (newThemeName: ThemeName) => {
    setThemeName(newThemeName);
    const baseTheme = themes[newThemeName];
    setTheme({ ...baseTheme, colors: { ...baseTheme.colors, ...customColors } });
  };

  const updateCustomColors = (colors: Partial<Theme['colors']>) => {
    setCustomColors(prev => ({ ...prev, ...colors }));
    setTheme(prev => ({ ...prev, colors: { ...prev.colors, ...colors } }));
  };

  const resetCustomColors = () => {
    setCustomColors({});
    localStorage.removeItem('budgetAppCustomColors');
    setTheme(themes[themeName]);
  };

  const updateGlow = (enabled: boolean) => {
    setTheme(prev => ({ ...prev, glow: enabled }));
  };

  const value: ThemeContextType = {
    theme,
    themeName,
    setTheme: handleSetTheme,
    availableThemes: themes,
    updateCustomColors,
    resetCustomColors,
    updateGlow,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}