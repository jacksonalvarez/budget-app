'use client';

import React, { useState } from 'react';
import { Category } from '@/app/types';
import { useTheme } from '@/app/theme/ThemeContext';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, category: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
}

interface CategoryFormData {
  name: string;
  type: 'income' | 'expense' | 'both';
  color: string;
  icon: string;
}

const defaultIcons = [
  '💰', '🏠', '🍽️', '🚗', '⚕️', '🎬', '🛍️', '📚', '💅', '🎁',
  '📱', '⚽', '🎵', '✈️', '🏋️', '🍕', '☕', '🚌', '💻', '📦'
];

const colorOptions = [
  '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#10B981',
  '#6366F1', '#14B8A6', '#F97316', '#6B7280', '#059669', '#0891B2',
  '#7C3AED', '#DC2626', '#DB2777', '#2563EB'
];

export default function CategoryManager({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    type: 'expense',
    color: '#3B82F6',
    icon: '📦',
  });

  if (!isOpen) return null;

  const filteredCategories = categories.filter(
    cat => cat.type === activeTab || cat.type === 'both'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCategory) {
      onUpdateCategory(editingCategory, formData);
      setEditingCategory(null);
    } else {
      onAddCategory({
        ...formData,
        isDefault: false,
        isActive: true,
      });
      setIsAddingCategory(false);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: activeTab,
      color: '#3B82F6',
      icon: '📦',
    });
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon || '📦',
    });
    setEditingCategory(category.id);
    setIsAddingCategory(true);
  };

  const handleCancel = () => {
    setIsAddingCategory(false);
    setEditingCategory(null);
    resetForm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        style={{ backgroundColor: theme.colors.surface }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: theme.colors.secondary }}
        >
          <h2
            className="text-xl font-bold"
            style={{ color: theme.colors.textPrimary }}
          >
            Manage Categories
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col h-full max-h-[calc(90vh-80px)]">
          {/* Tabs */}
          <div
            className="flex border-b"
            style={{ borderColor: theme.colors.secondary }}
          >
            <button
              onClick={() => setActiveTab('expense')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'expense'
                  ? 'border-b-2'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{
                color: activeTab === 'expense' ? theme.colors.accent : undefined,
                borderColor: activeTab === 'expense' ? theme.colors.accent : 'transparent',
              }}
            >
              Expense Categories
            </button>
            <button
              onClick={() => setActiveTab('income')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'income'
                  ? 'border-b-2'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{
                color: activeTab === 'income' ? theme.colors.accent : undefined,
                borderColor: activeTab === 'income' ? theme.colors.accent : 'transparent',
              }}
            >
              Income Categories
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Add Category Form */}
            {isAddingCategory && (
              <form
                onSubmit={handleSubmit}
                className="mb-6 p-4 rounded-lg border"
                style={{ 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.secondary 
                }}
              >
                <h3
                  className="text-lg font-semibold mb-4"
                  style={{ color: theme.colors.textPrimary }}
                >
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.secondary,
                        color: theme.colors.textPrimary,
                      }}
                      placeholder="Enter category name"
                      required
                    />
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.secondary,
                        color: theme.colors.textPrimary,
                      }}
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Icon
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {defaultIcons.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`w-10 h-10 rounded-md text-lg hover:bg-gray-100 ${
                          formData.icon === icon ? 'ring-2 ring-blue-500' : ''
                        }`}
                        style={{
                          backgroundColor: formData.icon === icon ? theme.colors.accent + '20' : theme.colors.background,
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md text-white font-medium"
                    style={{ backgroundColor: theme.colors.accent }}
                  >
                    {editingCategory ? 'Update Category' : 'Add Category'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-md border"
                    style={{
                      borderColor: theme.colors.secondary,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Add Category Button */}
            {!isAddingCategory && (
              <button
                onClick={() => setIsAddingCategory(true)}
                className="mb-6 px-4 py-2 rounded-md border-2 border-dashed hover:bg-gray-50 transition-colors flex items-center gap-2"
                style={{
                  borderColor: theme.colors.accent,
                  color: theme.colors.accent,
                }}
              >
                <span className="text-lg">+</span>
                Add New Category
              </button>
            )}

            {/* Categories List */}
            <div className="space-y-2">
              {filteredCategories.map(category => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.secondary,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-xl">{category.icon}</span>
                    <div>
                      <h4
                        className="font-medium"
                        style={{ color: theme.colors.textPrimary }}
                      >
                        {category.name}
                      </h4>
                      <p
                        className="text-sm"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        {category.type === 'both' ? 'Income & Expense' : category.type}
                        {category.isDefault && ' • Default'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="px-3 py-1 text-sm rounded border hover:bg-gray-50"
                      style={{
                        borderColor: theme.colors.secondary,
                        color: theme.colors.textSecondary,
                      }}
                    >
                      Edit
                    </button>
                    {!category.isDefault && (
                      <button
                        onClick={() => onDeleteCategory(category.id)}
                        className="px-3 py-1 text-sm rounded border border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}