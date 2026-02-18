import { useState, useEffect } from 'react';
import { useTodos } from '../hooks/useTodos';
import { Todo, TodoCategory, TodoTimeFrame } from '../types';

export function TodoList() {
  const { todos, fetchTodos, createTodo, updateTodo, deleteTodo, clearCompleted } = useTodos();
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoCategory, setNewTodoCategory] = useState<TodoCategory>('personal');
  const [newTodoTimeFrame, setNewTodoTimeFrame] = useState<TodoTimeFrame>('short_term');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // Filter todos by time frame, category, and completion status
  const getTodosByTimeFrameAndCategory = (timeFrame: TodoTimeFrame, category: TodoCategory) => {
    return todos.filter(t =>
      !t.is_completed &&
      t.time_frame === timeFrame &&
      t.category === category
    );
  };

  const completedToday = todos.filter(t => {
    if (!t.is_completed || !t.completed_at) return false;
    const completedDate = new Date(t.completed_at).toDateString();
    const today = new Date().toDateString();
    return completedDate === today;
  });

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    try {
      const categoryTodos = getTodosByTimeFrameAndCategory(newTodoTimeFrame, newTodoCategory);
      await createTodo({
        text: newTodoText,
        order_index: categoryTodos.length,
        category: newTodoCategory,
        time_frame: newTodoTimeFrame,
      });
      setNewTodoText('');
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    try {
      await updateTodo(todo.id, {
        is_completed: !todo.is_completed,
      });
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const handleStartEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editText.trim()) return;

    try {
      await updateTodo(id, { text: editText });
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this todo?')) {
      try {
        await deleteTodo(id);
      } catch (error) {
        console.error('Failed to delete todo:', error);
      }
    }
  };

  const handleClearCompleted = async () => {
    if (completedToday.length === 0) return;
    if (confirm(`Clear all ${completedToday.length} completed todos?`)) {
      try {
        await clearCompleted();
      } catch (error) {
        console.error('Failed to clear completed todos:', error);
      }
    }
  };

  const handleClearCategory = async (timeFrame: TodoTimeFrame, category: TodoCategory) => {
    const categoryTodos = getTodosByTimeFrameAndCategory(timeFrame, category);
    if (categoryTodos.length === 0) return;

    if (confirm(`Clear all ${categoryTodos.length} ${category} todos?`)) {
      try {
        await Promise.all(categoryTodos.map(t => deleteTodo(t.id)));
        await fetchTodos();
      } catch (error) {
        console.error('Failed to clear todos:', error);
      }
    }
  };

  const renderTodoItem = (todo: Todo) => (
    <div
      key={todo.id}
      className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg shadow"
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={false}
        onChange={() => handleToggleComplete(todo)}
        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 flex-shrink-0"
      />

      {/* Text */}
      {editingId === todo.id ? (
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveEdit(todo.id);
            if (e.key === 'Escape') handleCancelEdit();
          }}
          className="flex-1 px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          autoFocus
        />
      ) : (
        <div
          className="flex-1 text-gray-800 dark:text-gray-200 cursor-pointer"
          onDoubleClick={() => handleStartEdit(todo)}
        >
          {todo.text}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        {editingId === todo.id ? (
          <>
            <button
              onClick={() => handleSaveEdit(todo.id)}
              className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 px-2 text-sm"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 px-2 text-sm"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleStartEdit(todo)}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-2 text-sm"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(todo.id)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 text-sm"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );

  const renderCategorySection = (timeFrame: TodoTimeFrame, category: TodoCategory, label: string, icon: string) => {
    const categoryTodos = getTodosByTimeFrameAndCategory(timeFrame, category);

    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-md font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <span>{icon}</span>
            {label} ({categoryTodos.length})
          </h4>
          {categoryTodos.length > 0 && (
            <button
              onClick={() => handleClearCategory(timeFrame, category)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-2">
          {categoryTodos.length === 0 ? (
            <div className="text-gray-400 dark:text-gray-500 text-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
              No {label.toLowerCase()} todos yet.
            </div>
          ) : (
            categoryTodos.map(renderTodoItem)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Todo List</h2>

        {/* Add new todo form */}
        <form onSubmit={handleAddTodo} className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <select
                value={newTodoTimeFrame}
                onChange={(e) => setNewTodoTimeFrame(e.target.value as TodoTimeFrame)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="short_term">Short-term</option>
                <option value="long_term">Long-term</option>
              </select>
              <select
                value={newTodoCategory}
                onChange={(e) => setNewTodoCategory(e.target.value as TodoCategory)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="personal">👤 Personal</option>
                <option value="professional">💼 Professional</option>
                <option value="development">📚 Development</option>
                <option value="family">👨‍👩‍👧‍👦 Family</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="Add a new todo..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 font-medium"
              >
                Add
              </button>
            </div>
          </div>
        </form>

        {/* Short-term Section */}
        <div className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800">
          <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
            <span>⚡</span>
            Short-term Goals
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {renderCategorySection('short_term', 'personal', 'Personal', '👤')}
              {renderCategorySection('short_term', 'professional', 'Professional', '💼')}
            </div>
            <div>
              {renderCategorySection('short_term', 'development', 'Development', '📚')}
              {renderCategorySection('short_term', 'family', 'Family', '👨‍👩‍👧‍👦')}
            </div>
          </div>
        </div>

        {/* Long-term Section */}
        <div className="mb-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-lg border-2 border-purple-200 dark:border-purple-800">
          <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
            <span>🎯</span>
            Long-term Goals
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {renderCategorySection('long_term', 'personal', 'Personal', '👤')}
              {renderCategorySection('long_term', 'professional', 'Professional', '💼')}
            </div>
            <div>
              {renderCategorySection('long_term', 'development', 'Development', '📚')}
              {renderCategorySection('long_term', 'family', 'Family', '👨‍👩‍👧‍👦')}
            </div>
          </div>
        </div>

        {/* Completed Today Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span>✅</span>
              Completed Today ({completedToday.length})
            </h3>
            {completedToday.length > 0 && (
              <button
                onClick={handleClearCompleted}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-2">
            {completedToday.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                No completed todos today yet.
              </div>
            ) : (
              completedToday.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800"
                >
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => handleToggleComplete(todo)}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600"
                  />
                  <div className="flex-1 text-gray-600 dark:text-gray-400 line-through">
                    {todo.text}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {todo.category} • {todo.time_frame.replace('_', '-')}
                  </span>
                  <button
                    onClick={() => handleDelete(todo.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
