import { Category } from '../types';

// Default expense categories
export const defaultExpenseCategories: Category[] = [
  {
    id: 'housing',
    name: 'Housing & Utilities',
    type: 'expense',
    color: '#3B82F6', // Blue
    icon: '🏠',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'food',
    name: 'Food & Dining',
    type: 'expense',
    color: '#EF4444', // Red
    icon: '🍽️',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'transportation',
    name: 'Transportation',
    type: 'expense',
    color: '#F59E0B', // Yellow
    icon: '🚗',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    type: 'expense',
    color: '#8B5CF6', // Purple
    icon: '🎬',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'shopping',
    name: 'Shopping',
    type: 'expense',
    color: '#EC4899', // Pink
    icon: '🛍️',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    type: 'expense',
    color: '#10B981', // Green
    icon: '⚕️',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'insurance',
    name: 'Insurance',
    type: 'expense',
    color: '#6366F1', // Indigo
    icon: '🛡️',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'education',
    name: 'Education',
    type: 'expense',
    color: '#14B8A6', // Teal
    icon: '📚',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'personal',
    name: 'Personal Care',
    type: 'expense',
    color: '#F97316', // Orange
    icon: '💅',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'other-expense',
    name: 'Other Expenses',
    type: 'expense',
    color: '#6B7280', // Gray
    icon: '📦',
    isDefault: true,
    isActive: true,
  },
];

// Default income categories
export const defaultIncomeCategories: Category[] = [
  {
    id: 'salary',
    name: 'Salary',
    type: 'income',
    color: '#059669', // Emerald
    icon: '💰',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'freelance',
    name: 'Freelance',
    type: 'income',
    color: '#0891B2', // Cyan
    icon: '💻',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'investment',
    name: 'Investment Returns',
    type: 'income',
    color: '#7C3AED', // Violet
    icon: '📈',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'business',
    name: 'Business Income',
    type: 'income',
    color: '#DC2626', // Red
    icon: '🏢',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'gift',
    name: 'Gifts & Bonuses',
    type: 'income',
    color: '#DB2777', // Pink
    icon: '🎁',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'rental',
    name: 'Rental Income',
    type: 'income',
    color: '#2563EB', // Blue
    icon: '🏘️',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'other-income',
    name: 'Other Income',
    type: 'income',
    color: '#6B7280', // Gray
    icon: '💵',
    isDefault: true,
    isActive: true,
  },
];

export const defaultCategories: Category[] = [
  ...defaultExpenseCategories,
  ...defaultIncomeCategories,
];

// Helper function to get category by ID
export const getCategoryById = (categories: Category[], id: string): Category | undefined => {
  return categories.find(category => category.id === id);
};

// Helper function to get categories by type
export const getCategoriesByType = (categories: Category[], type: 'income' | 'expense'): Category[] => {
  if (!categories || !Array.isArray(categories)) {
    return [];
  }
  return categories.filter(category => category.type === type || category.type === 'both');
};

// Helper function to get active categories
export const getActiveCategories = (categories: Category[]): Category[] => {
  if (!categories || !Array.isArray(categories)) {
    return [];
  }
  return categories.filter(category => category.isActive);
};