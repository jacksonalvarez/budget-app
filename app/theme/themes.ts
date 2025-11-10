export interface ThemeColors {
  // Background colors
  primary: string;
  secondary: string;
  surface: string;
  background: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Accent colors
  accent: string;
  accentHover: string;
  
  // Status colors
  success: string;
  successHover: string;
  error: string;
  errorHover: string;
  warning: string;
  warningHover: string;
  info: string;
  infoHover: string;
  
  // Border colors
  border: string;
  borderLight: string;
  borderFocus: string;
  
  // Interaction colors
  hover: string;
  
  // Income/Expense specific
  income: string;
  incomeLight: string;
  expense: string;
  expenseLight: string;
  savings: string;
  savingsLight: string;
}

export interface Theme {
  name: string;
  displayName: string;
  colors: ThemeColors;
  isDark: boolean;
  glow?: boolean;
}

// Light Theme
export const lightTheme: Theme = {
  name: 'light',
  displayName: 'Light Mode',
  isDark: false,
  colors: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    surface: '#FFFFFF',
    background: '#F9FAFB',
    
    textPrimary: '#111827',
    textSecondary: '#374151',
    textMuted: '#6B7280',
    
    accent: '#3B82F6',
    accentHover: '#2563EB',
    
    success: '#10B981',
    successHover: '#059669',
    error: '#EF4444',
    errorHover: '#DC2626',
    warning: '#F59E0B',
    warningHover: '#D97706',
    info: '#3B82F6',
    infoHover: '#2563EB',
    
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    borderFocus: '#DBEAFE',
    
    hover: '#F3F4F6',
    
    income: '#10B981',
    incomeLight: '#D1FAE5',
    expense: '#EF4444',
    expenseLight: '#FEE2E2',
    savings: '#3B82F6',
    savingsLight: '#DBEAFE',
  }
};

// Dark Theme
export const darkTheme: Theme = {
  name: 'dark',
  displayName: 'Dark Mode',
  isDark: true,
  colors: {
    primary: '#60A5FA',
    secondary: '#9CA3AF',
    surface: '#1F2937',
    background: '#111827',
    
    textPrimary: '#F9FAFB',
    textSecondary: '#E5E7EB',
    textMuted: '#9CA3AF',
    
    accent: '#60A5FA',
    accentHover: '#3B82F6',
    
    success: '#34D399',
    successHover: '#10B981',
    error: '#F87171',
    errorHover: '#EF4444',
    warning: '#FBBF24',
    warningHover: '#F59E0B',
    info: '#60A5FA',
    infoHover: '#3B82F6',
    
    border: '#374151',
    borderLight: '#4B5563',
    borderFocus: '#60A5FA',
    
    hover: '#374151',
    
    income: '#34D399',
    incomeLight: '#064E3B',
    expense: '#F87171',
    expenseLight: '#7F1D1D',
    savings: '#60A5FA',
    savingsLight: '#1E3A8A',
  }
};

// Custom theme (base template for user customization)
export const customTheme: Theme = {
  ...lightTheme, // Start with light theme as base
  name: 'Custom Theme',
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  custom: customTheme,
};

export type ThemeName = keyof typeof themes;