'use client';

import { useState, useEffect } from 'react';
import { PlusIcon } from 'lucide-react';
import {
  FocusMode,
  CreateFocusModeInput,
  UpdateFocusModeInput,
} from '@/lib/types/focus-mode';
import { focusModeService } from '@/lib/services/focus-mode';
import { FocusModeForm } from '@/components/focus-mode/FocusModeForm';
import { FocusModeList } from '@/components/focus-mode/FocusModeList';
import { toast } from 'sonner';

export default function FocusModesPage() {
  const [modes, setModes] = useState<FocusMode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMode, setEditingMode] = useState<FocusMode | undefined>();

  // 加载 Focus 模式列表
  const loadModes = async () => {
    try {
      const data = await focusModeService.getAll();
      setModes(data);
    } catch (error) {
      toast.error('Failed to load Focus Modes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModes();
  }, []);

  // 处理创建/更新
  const handleSubmit = async (
    data: CreateFocusModeInput | UpdateFocusModeInput,
  ) => {
    try {
      if ('id' in data) {
        // 更新
        const updated = await focusModeService.update(data);
        setModes(modes.map((m) => (m.id === updated.id ? updated : m)));
        toast.success('Focus Mode updated successfully');
      } else {
        // 创建
        const created = await focusModeService.create(data);
        setModes([...modes, created]);
        toast.success('Focus Mode created successfully');
      }
    } catch (error) {
      toast.error('Operation failed');
      throw error;
    }
  };

  // 处理删除
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Focus Mode?')) return;

    try {
      await focusModeService.delete(id);
      setModes(modes.filter((m) => m.id !== id));
      toast.success('Focus Mode deleted successfully');
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  // 处理编辑
  const handleEdit = (mode: FocusMode) => {
    setEditingMode(mode);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Focus Mode Management
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create and manage your custom Focus Modes
            </p>
          </div>
          <button
            onClick={() => {
              setEditingMode(undefined);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Focus Mode
          </button>
        </div>

        {modes.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <PlusIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Focus Modes Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create your first Focus Mode to get started
            </p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create First Focus Mode
            </button>
          </div>
        ) : (
          <FocusModeList
            modes={modes}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        <FocusModeForm
          mode={editingMode}
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingMode(undefined);
          }}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
