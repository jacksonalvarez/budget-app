'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Transaction, IncomeSource, RecurringExpense, SavingsGoal, Category } from '../types';
import { defaultCategories } from '../utils/categories';

export interface UserData {
  transactions: Transaction[];
  incomeSources: IncomeSource[];
  recurringExpenses: RecurringExpense[];
  savingsGoals: SavingsGoal[];
  categories: Category[];
}

export function useUserData() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<UserData>({
    transactions: [],
    incomeSources: [],
    recurringExpenses: [],
    savingsGoals: [],
    categories: defaultCategories
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user data when session is available
  useEffect(() => {
    if (session?.user) {
      loadUserData();
    } else {
      setIsLoading(false);
    }
  }, [session]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/user-data');
      if (!response.ok) {
        throw new Error('Failed to load user data');
      }
      
      const data = await response.json();
      setUserData(data || {
        transactions: [],
        incomeSources: [],
        recurringExpenses: [],
        savingsGoals: []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user data');
      console.error('Error loading user data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserData = async (newUserData: UserData) => {
    try {
      setError(null);
      
      const response = await fetch('/api/user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save user data');
      }
      
      setUserData(newUserData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user data');
      console.error('Error saving user data:', err);
      throw err;
    }
  };

  // Helper functions for updating specific data types
  const updateTransactions = async (transactions: Transaction[]) => {
    const newData = { ...userData, transactions };
    await saveUserData(newData);
  };

  const updateIncomeSources = async (incomeSources: IncomeSource[]) => {
    const newData = { ...userData, incomeSources };
    await saveUserData(newData);
  };

  const updateRecurringExpenses = async (recurringExpenses: RecurringExpense[]) => {
    const newData = { ...userData, recurringExpenses };
    await saveUserData(newData);
  };

  const updateSavingsGoals = async (savingsGoals: SavingsGoal[]) => {
    const newData = { ...userData, savingsGoals };
    await saveUserData(newData);
  };

  // Category management functions
  const updateCategories = async (categories: Category[]) => {
    try {
      const updatedData = { ...userData, categories };
      await saveUserData(updatedData);
      setUserData(updatedData);
    } catch (err) {
      console.error('Error updating categories:', err);
      setError('Failed to update categories');
    }
  };

  const addCategory = async (categoryData: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...categoryData,
      id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    const updatedCategories = [...userData.categories, newCategory];
    await updateCategories(updatedCategories);
  };

  const updateCategory = async (categoryId: string, updates: Partial<Category>) => {
    const updatedCategories = userData.categories.map(category =>
      category.id === categoryId ? { ...category, ...updates } : category
    );
    await updateCategories(updatedCategories);
  };

  const deleteCategory = async (categoryId: string) => {
    // Check if category is being used in transactions
    const categoryInUse = userData.transactions.some(transaction => transaction.category === categoryId);
    if (categoryInUse) {
      throw new Error('Cannot delete category that is being used in transactions');
    }

    // Check if category is being used in income sources
    const categoryInIncome = userData.incomeSources.some(income => income.category === categoryId);
    if (categoryInIncome) {
      throw new Error('Cannot delete category that is being used in income sources');
    }

    // Check if category is being used in recurring expenses
    const categoryInExpenses = userData.recurringExpenses.some(expense => expense.category === categoryId);
    if (categoryInExpenses) {
      throw new Error('Cannot delete category that is being used in recurring expenses');
    }

    const updatedCategories = userData.categories.filter(category => category.id !== categoryId);
    await updateCategories(updatedCategories);
  };

  return {
    userData,
    isLoading,
    error,
    updateTransactions,
    updateIncomeSources,
    updateRecurringExpenses,
    updateSavingsGoals,
    updateCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshData: loadUserData,
  };
}