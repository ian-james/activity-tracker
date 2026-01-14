import { useEffect, useState } from 'react';
import { useCategories } from '../hooks/useApi';
import { Category } from '../types';

const PRESET_COLORS = [
  '#10B981', // Green
  '#3B82F6', // Blue
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

interface CategoryFormData {
  name: string;
  color: string;
}

export function CategoryManager() {
  const { categories, fetchCategories, createCategory, updateCategory, deleteCategory } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({ name: '', color: '#3B82F6' });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCategory) {
      await updateCategory(editingCategory.id, formData);
    } else {
      await createCategory(formData);
    }

    setFormData({ name: '', color: '#3B82F6' });
    setShowForm(false);
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, color: category.color });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    await deleteCategory(id);
    setDeleteConfirm(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: '', color: '#3B82F6' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Categories</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Category
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              placeholder="e.g. Health & Fitness"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-full border-2 ${
                    formData.color === color
                      ? 'border-gray-800 dark:border-gray-200 scale-110'
                      : 'border-transparent'
                  } transition-transform`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {editingCategory ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="font-medium text-gray-800 dark:text-gray-100">{category.name}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(category)}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Edit
              </button>
              {deleteConfirm === category.id ? (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Confirm?</span>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="text-gray-600 dark:text-gray-400 hover:underline text-sm"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(category.id)}
                  className="text-red-600 dark:text-red-400 hover:underline text-sm"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No categories yet. Create one to organize your activities.
          </div>
        )}
      </div>
    </div>
  );
}
