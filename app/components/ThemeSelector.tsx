'use client';

import { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { ThemeName } from '../theme/themes';

export default function ThemeSelector() {
  const { theme, themeName, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(themeName === 'light' ? 'dark' : 'light');
  };

  const getThemeIcon = () => {
    return themeName === 'light' ? '☀️' : '🌙';
  };

  const getThemeLabel = () => {
    return themeName === 'light' ? 'Light Mode' : 'Dark Mode';
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200"
      style={{
        backgroundColor: theme.colors.surface,
        border: `2px solid ${theme.colors.border}`,
        color: theme.colors.textPrimary,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.hover;
        e.currentTarget.style.borderColor = theme.colors.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.surface;
        e.currentTarget.style.borderColor = theme.colors.border;
      }}
      title={`Switch to ${themeName === 'light' ? 'dark' : 'light'} mode`}
    >
      <span className="text-lg">{getThemeIcon()}</span>
      <span className="hidden sm:inline text-sm font-medium">
        {getThemeLabel()}
      </span>
    </button>
  );
}
