import { useState, useEffect } from 'react';
import { useTodos } from '../hooks/useTodos';
import { Todo, TodoCategory } from '../types';

export function TodoList() {
  const { todos, fetchTodos, createTodo, updateTodo, deleteTodo, clearCompleted, clearInProgress, reorderTodos } = useTodos();
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoCategory, setNewTodoCategory] = useState<TodoCategory>('personal');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [draggedId, setDraggedId] = useState<number | null>(null);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // Separate todos by category and completion status
  const personalInProgress = todos.filter(t => !t.is_completed && t.category === 'personal');
  const professionalInProgress = todos.filter(t => !t.is_completed && t.category === 'professional');
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
      const categoryTodos = newTodoCategory === 'personal' ? personalInProgress : professionalInProgress;
      await createTodo({
        text: newTodoText,
        order_index: categoryTodos.length,
        category: newTodoCategory,
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

  const handleClearInProgress = async (category?: TodoCategory) => {
    const todos = category === 'personal' ? personalInProgress :
                  category === 'professional' ? professionalInProgress :
                  [...personalInProgress, ...professionalInProgress];

    if (todos.length === 0) return;
    const categoryLabel = category ? ` ${category}` : '';
    if (confirm(`Clear all ${todos.length}${categoryLabel} in-progress todos?`)) {
      try {
        // Delete each todo individually if filtering by category
        if (category) {
          await Promise.all(todos.map(t => deleteTodo(t.id)));
          await fetchTodos();
        } else {
          await clearInProgress();
        }
      } catch (error) {
        console.error('Failed to clear in-progress todos:', error);
      }
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, todoId: number) => {
    setDraggedId(todoId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetTodoId: number, category: TodoCategory) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetTodoId) return;

    // Get the category-specific todo list
    const categoryTodos = category === 'personal' ? personalInProgress : professionalInProgress;

    // Reorder only within the same category
    const draggedIndex = categoryTodos.findIndex(t => t.id === draggedId);
    const targetIndex = categoryTodos.findIndex(t => t.id === targetTodoId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Ensure dragged todo is from the same category
    const draggedTodo = categoryTodos[draggedIndex];
    if (draggedTodo.category !== category) return;

    // Create new order
    const reordered = [...categoryTodos];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Extract IDs in new order
    const newOrder = reordered.map(t => t.id);

    try {
      await reorderTodos(newOrder);
    } catch (error) {
      console.error('Failed to reorder todos:', error);
    }

    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Todo List</h2>

        {/* Add new todo form */}
        <form onSubmit={handleAddTodo} className="mb-6">
          <div className="flex gap-2">
            <select
              value={newTodoCategory}
              onChange={(e) => setNewTodoCategory(e.target.value as TodoCategory)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="personal">Personal</option>
              <option value="professional">Professional</option>
            </select>
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add a new todo..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 font-medium"
            >
              Add
            </button>
          </div>
        </form>

        {/* Personal Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
              Personal ({personalInProgress.length})
            </h3>
            {personalInProgress.length > 0 && (
              <button
                onClick={() => handleClearInProgress('personal')}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-2">
            {personalInProgress.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                No personal todos yet.
              </div>
            ) : (
              personalInProgress.map((todo) => (
                <div
                  key={todo.id}
                  draggable={editingId !== todo.id}
                  onDragStart={(e) => handleDragStart(e, todo.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, todo.id, 'personal')}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg shadow ${
                    draggedId === todo.id ? 'opacity-50' : ''
                  } ${editingId !== todo.id ? 'cursor-move' : ''}`}
                >
                  {/* Drag Handle */}
                  {editingId !== todo.id && (
                    <div className="text-gray-400 dark:text-gray-500 cursor-move">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M3 6h2v2H3V6zm0 4h2v2H3v-2zm4-4h2v2H7V6zm0 4h2v2H7v-2zm4-4h2v2h-2V6zm0 4h2v2h-2v-2z"/>
                      </svg>
                    </div>
                  )}

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleToggleComplete(todo)}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600"
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
                  <div className="flex gap-1">
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
              ))
            )}
          </div>
        </div>

        {/* Professional Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
              Professional ({professionalInProgress.length})
            </h3>
            {professionalInProgress.length > 0 && (
              <button
                onClick={() => handleClearInProgress('professional')}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-2">
            {professionalInProgress.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                No professional todos yet.
              </div>
            ) : (
              professionalInProgress.map((todo) => (
                <div
                  key={todo.id}
                  draggable={editingId !== todo.id}
                  onDragStart={(e) => handleDragStart(e, todo.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, todo.id, 'professional')}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg shadow ${
                    draggedId === todo.id ? 'opacity-50' : ''
                  } ${editingId !== todo.id ? 'cursor-move' : ''}`}
                >
                  {/* Drag Handle */}
                  {editingId !== todo.id && (
                    <div className="text-gray-400 dark:text-gray-500 cursor-move">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M3 6h2v2H3V6zm0 4h2v2H3v-2zm4-4h2v2H7V6zm0 4h2v2H7v-2zm4-4h2v2h-2V6zm0 4h2v2h-2v-2z"/>
                      </svg>
                    </div>
                  )}

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleToggleComplete(todo)}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600"
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
                  <div className="flex gap-1">
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
              ))
            )}
          </div>
        </div>

        {/* Completed Today Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
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
              <div className="text-gray-500 dark:text-gray-400 text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
