'use client';

import { useState } from 'react';
import { Transaction, Category } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { ThemedSelect } from './ThemedComponents';
import { getCategoriesByType, getActiveCategories } from '../utils/categories';

interface TransactionFormProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  categories?: Category[];
}

export default function TransactionForm({ onAddTransaction, categories = [] }: TransactionFormProps) {
  const { theme } = useTheme();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');

  // Get filtered categories based on transaction type
  const availableCategories = getActiveCategories(getCategoriesByType(categories, type));

  // Reset category when type changes
  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    setCategory(''); // Reset category when type changes
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      alert('Please fill in all fields with valid values');
      return;
    }

    const transaction = {
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      category: category || undefined,
    };

    onAddTransaction(transaction);
    setDescription('');
    setAmount('');
    setCategory('');
  };

  return (
    <div 
      className="rounded-lg shadow-md p-6"
      style={{ 
        backgroundColor: theme.colors.surface,
        boxShadow: theme.glow 
          ? `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 0 15px ${theme.colors.primary}15`
          : undefined
      }}
    >
      <h2 
        className="text-lg font-semibold mb-4"
        style={{ color: theme.colors.textPrimary }}
      >
        Add Transaction
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="type" 
            className="block text-sm font-medium mb-1"
            style={{ color: theme.colors.textSecondary }}
          >
            Type
          </label>
          <ThemedSelect
            theme={theme}
            id="type"
            value={type}
            onChange={(e: any) => handleTypeChange(e.target.value as 'income' | 'expense')}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </ThemedSelect>
        </div>

        <div>
          <label 
            htmlFor="category" 
            className="block text-sm font-medium mb-1"
            style={{ color: theme.colors.textSecondary }}
          >
            Category
          </label>
          <ThemedSelect
            theme={theme}
            id="category"
            value={category}
            onChange={(e: any) => setCategory(e.target.value)}
          >
            <option value="">Select a category (optional)</option>
            {availableCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </ThemedSelect>
        </div>

        <div>
          <label 
            htmlFor="description" 
            className="block text-sm font-medium mb-1"
            style={{ color: theme.colors.textSecondary }}
          >
            Description
          </label>
          <input
            id="description"
            type="text"
            placeholder="e.g., Grocery shopping, Salary, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 rounded-md focus:ring-2 transition-colors"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.textPrimary,
              border: `1px solid ${theme.colors.border}`,
              outline: 'none',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.colors.borderFocus}
            onBlur={(e) => e.target.style.borderColor = theme.colors.border}
          />
        </div>

        <div>
          <label 
            htmlFor="amount" 
            className="block text-sm font-medium mb-1"
            style={{ color: theme.colors.textSecondary }}
          >
            Amount ($)
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-2 rounded-md focus:ring-2 transition-colors"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.textPrimary,
              border: `1px solid ${theme.colors.border}`,
              outline: 'none',
            }}
            onFocus={(e) => e.target.style.borderColor = theme.colors.borderFocus}
            onBlur={(e) => e.target.style.borderColor = theme.colors.border}
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 px-4 rounded-md font-medium transition-colors"
          style={{ 
            backgroundColor: type === 'income' ? theme.colors.income : theme.colors.expense,
            color: '#ffffff'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          Add {type === 'income' ? 'Income' : 'Expense'}
        </button>
      </form>
    </div>
  );
}
