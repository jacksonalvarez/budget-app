'use client';

import React from 'react';
import { useTheme } from '@/app/theme/ThemeContext';

export default function Dashboard() {
  const { theme } = useTheme();

  return (
    <div 
      className="p-6 rounded-lg shadow-lg"
      style={{ 
        backgroundColor: theme.colors.surface,
        color: theme.colors.textPrimary 
      }}
    >
      <h2 className="text-2xl font-bold mb-4">Budget Dashboard</h2>
      <p className="text-lg">Welcome to your personal budgeting tracker!</p>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          className="p-4 rounded"
          style={{ backgroundColor: theme.colors.background }}
        >
          <h3 className="font-semibold">Total Income</h3>
          <p className="text-2xl font-bold" style={{ color: theme.colors.success }}>
            $0.00
          </p>
        </div>
        
        <div 
          className="p-4 rounded"
          style={{ backgroundColor: theme.colors.background }}
        >
          <h3 className="font-semibold">Total Expenses</h3>
          <p className="text-2xl font-bold" style={{ color: theme.colors.error }}>
            $0.00
          </p>
        </div>
        
        <div 
          className="p-4 rounded"
          style={{ backgroundColor: theme.colors.background }}
        >
          <h3 className="font-semibold">Net Balance</h3>
          <p className="text-2xl font-bold">
            $0.00
          </p>
        </div>
      </div>
    </div>
  );
}
