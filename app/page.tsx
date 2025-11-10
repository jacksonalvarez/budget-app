 'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TabNavigation from './components/TabNavigation';
import OverviewTab from './components/OverviewTab';
import DetailedOverviewTab from './components/DetailedOverviewTab';
import IncomeTab from './components/IncomeTab';
import ExpensesTab from './components/ExpensesTab';
import SavingsTab from './components/SavingsTab';
import ThemeSelector from './components/ThemeSelector';
import { useTheme } from './theme/ThemeContext';
import { Transaction, IncomeSource, RecurringExpense, SavingsGoal, Category } from './types';
import { useUserData } from './hooks/useUserData';
import CategoryManager from './components/CategoryManager';

export default function Home() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const { userData, isLoading, error, updateTransactions, updateIncomeSources, updateRecurringExpenses, updateSavingsGoals, addCategory, updateCategory, deleteCategory, refreshData } = useUserData();

  const [transactions, setTransactions] = useState<Transaction[]>(userData.transactions);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>(userData.incomeSources);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>(userData.recurringExpenses);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(userData.savingsGoals);
  const [categories, setCategories] = useState(userData.categories);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Sync component state with userData from S3 when it loads
  useEffect(() => {
    setTransactions(userData.transactions || []);
    setIncomeSources(userData.incomeSources || []);
    setRecurringExpenses(userData.recurringExpenses || []);
    setSavingsGoals(userData.savingsGoals || []);
    setCategories(userData.categories || []);
  }, [userData]);

  // Show loading state while checking authentication
  if (status === 'loading' || isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.colors.background }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
               style={{ borderColor: theme.colors.primary }}></div>
          <p style={{ color: theme.colors.textSecondary }}>Loading your budget data...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  // Transaction handlers
  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    const newList = [newTransaction, ...transactions];
    setTransactions(newList);
    updateTransactions(newList).catch(err => console.error(err));
  };

  const deleteTransaction = (id: string) => {
    const newList = transactions.filter(transaction => transaction.id !== id);
    setTransactions(newList);
    updateTransactions(newList).catch(err => console.error(err));
  };

  // Income source handlers
  const addIncomeSource = (source: Omit<IncomeSource, 'id'>) => {
    const newSource: IncomeSource = {
      ...source,
      id: Date.now().toString(),
    };
    const newList = [...incomeSources, newSource];
    setIncomeSources(newList);
    updateIncomeSources(newList).catch(err => console.error(err));
  };

  const updateIncomeSource = (id: string, updates: Partial<IncomeSource>) => {
    const newList = incomeSources.map(source => source.id === id ? { ...source, ...updates } : source);
    setIncomeSources(newList);
    updateIncomeSources(newList).catch(err => console.error(err));
  };

  const deleteIncomeSource = (id: string) => {
    const newList = incomeSources.filter(source => source.id !== id);
    setIncomeSources(newList);
    updateIncomeSources(newList).catch(err => console.error(err));
  };

  // Recurring expense handlers
  const addRecurringExpense = (expense: Omit<RecurringExpense, 'id'>) => {
    const newExpense: RecurringExpense = {
      ...expense,
      id: Date.now().toString(),
    };
    const newList = [...recurringExpenses, newExpense];
    setRecurringExpenses(newList);
    updateRecurringExpenses(newList).catch(err => console.error(err));
  };

  const updateRecurringExpense = (id: string, updates: Partial<RecurringExpense>) => {
    const newList = recurringExpenses.map(expense => expense.id === id ? { ...expense, ...updates } : expense);
    setRecurringExpenses(newList);
    updateRecurringExpenses(newList).catch(err => console.error(err));
  };

  const deleteRecurringExpense = (id: string) => {
    const newList = recurringExpenses.filter(expense => expense.id !== id);
    setRecurringExpenses(newList);
    updateRecurringExpenses(newList).catch(err => console.error(err));
  };

  // Savings goal handlers
  const addSavingsGoal = (goal: Omit<SavingsGoal, 'id'>) => {
    const newGoal: SavingsGoal = {
      ...goal,
      id: Date.now().toString(),
    };
    const newList = [...savingsGoals, newGoal];
    setSavingsGoals(newList);
    updateSavingsGoals(newList).catch(err => console.error(err));
  };

  const updateSavingsGoal = (id: string, updates: Partial<SavingsGoal>) => {
    const newList = savingsGoals.map(goal => goal.id === id ? { ...goal, ...updates } : goal);
    setSavingsGoals(newList);
    updateSavingsGoals(newList).catch(err => console.error(err));
  };

  const deleteSavingsGoal = (id: string) => {
    const newList = savingsGoals.filter(goal => goal.id !== id);
    setSavingsGoals(newList);
    updateSavingsGoals(newList).catch(err => console.error(err));
  };

  // Category management handlers
  const handleAddCategory = async (categoryData: Omit<Category, 'id'>) => {
    try {
      await addCategory(categoryData);
      setCategories(userData.categories);
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  const handleUpdateCategory = async (id: string, categoryData: Partial<Category>) => {
    try {
      await updateCategory(id, categoryData);
      setCategories(userData.categories);
    } catch (err) {
      console.error('Error updating category:', err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories(userData.categories);
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  // Balance adjustment handler
  const handleBalanceAdjustment = (newBalance: number) => {
    const currentBalance = transactions.reduce((balance, transaction) => {
      return transaction.type === 'income' 
        ? balance + transaction.amount 
        : balance - transaction.amount;
    }, 0);

    const adjustment = newBalance - currentBalance;
    
    if (adjustment !== 0) {
      // Create an adjustment transaction
      const adjustmentTransaction: Transaction = {
        id: Date.now().toString(),
        description: adjustment > 0 ? 'Balance adjustment (positive)' : 'Balance adjustment (negative)',
        amount: Math.abs(adjustment),
        type: adjustment > 0 ? 'income' : 'expense',
        date: new Date().toISOString().split('T')[0],
        category: 'Balance Adjustment'
      };
      
      setTransactions(prev => [adjustmentTransaction, ...prev]);
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'detailed':
        return (
          <DetailedOverviewTab
            incomeSources={incomeSources}
            recurringExpenses={recurringExpenses}
            transactions={transactions}
          />
        );
      case 'income':
        return (
          <IncomeTab
            incomeSources={incomeSources}
            transactions={transactions}
            categories={categories}
            onAddIncomeSource={addIncomeSource}
            onUpdateIncomeSource={updateIncomeSource}
            onDeleteIncomeSource={deleteIncomeSource}
            onAddTransaction={addTransaction}
          />
        );
      case 'expenses':
        return (
          <ExpensesTab
            recurringExpenses={recurringExpenses}
            transactions={transactions}
            categories={categories}
            onAddRecurringExpense={addRecurringExpense}
            onUpdateRecurringExpense={updateRecurringExpense}
            onDeleteRecurringExpense={deleteRecurringExpense}
            onAddTransaction={addTransaction}
          />
        );
      case 'savings':
        return (
          <SavingsTab
            savingsGoals={savingsGoals}
            transactions={transactions}
            onAddSavingsGoal={addSavingsGoal}
            onUpdateSavingsGoal={updateSavingsGoal}
            onDeleteSavingsGoal={deleteSavingsGoal}
            onAddTransaction={addTransaction}
          />
        );
      default: // overview
        return (
          <OverviewTab
            transactions={transactions}
            incomeSources={incomeSources}
            recurringExpenses={recurringExpenses}
            savingsGoals={savingsGoals}
            onDeleteTransaction={deleteTransaction}
            onBalanceAdjustment={handleBalanceAdjustment}
          />
        );
    }
  };

  return (
    <div 
      className="min-h-screen py-8"
      style={{ backgroundColor: theme.colors.background }}
    >
      <div className="max-w-6xl mx-auto px-4">
        <header className="text-center mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 flex items-start gap-2">
              {session?.user?.name && (
                <div className="text-left">
                  <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                    Welcome back,
                  </p>
                  <p className="font-semibold" style={{ color: theme.colors.textPrimary }}>
                    {session.user.name}
                  </p>
                </div>
              )}
            </div>
            <div className="flex-1 text-center">
              <h1 
                className="text-4xl font-bold mb-2"
                style={{ color: theme.colors.textPrimary }}
              >
                Personal Budget Tracker
              </h1>
              <p style={{ color: theme.colors.textSecondary }}>
                Comprehensive financial management for your daily needs
              </p>
            </div>
            <div className="flex-1 flex justify-end items-start gap-3">
              <ThemeSelector />
              <button
                onClick={() => setShowCategoryManager(true)}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ 
                  backgroundColor: theme.colors.accent,
                  color: '#ffffff'
                }}
                title="Manage Categories"
              >
                📂 Categories
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ 
                  backgroundColor: theme.colors.primary,
                  color: '#ffffff'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        {renderActiveTab()}
        
        {/* Category Manager Modal */}
        <CategoryManager
          isOpen={showCategoryManager}
          onClose={() => setShowCategoryManager(false)}
          categories={categories}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      </div>
    </div>
  );
}
