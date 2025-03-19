import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  FocusMode,
  CreateFocusModeInput,
  UpdateFocusModeInput,
} from '@/lib/types/focus-mode';
import { XIcon } from 'lucide-react';

// Focus Mode 表单组件的属性接口
interface FocusModeFormProps {
  mode?: FocusMode; // 编辑时的现有模式数据
  isOpen: boolean; // 控制模态框显示状态
  onClose: () => void; // 关闭模态框的回调函数
  onSubmit: (
    data: CreateFocusModeInput | UpdateFocusModeInput,
  ) => Promise<void>; // 提交表单的回调函数
}

export function FocusModeForm({
  mode,
  isOpen,
  onClose,
  onSubmit,
}: FocusModeFormProps) {
  // 表单数据状态
  const [formData, setFormData] = useState<CreateFocusModeInput>({
    name: mode?.name || '',
    description: mode?.description || '',
    apiEndpoint: mode?.apiEndpoint || '',
    config: mode?.config || {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // 提交状态
  const [error, setError] = useState<string | null>(null); // 错误信息

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode) {
        // 更新现有模式
        await onSubmit({ ...formData, id: mode.id });
      } else {
        // 创建新模式
        await onSubmit(formData);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* 背景遮罩层 */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition
              as={Fragment}
              show={isOpen}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
            </Transition>

            <Transition
              as={Fragment}
              show={isOpen}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                {/* 模态框标题和关闭按钮 */}
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    {mode ? 'Edit Focus Mode' : 'New Focus Mode'}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-lg p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onClose}
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* 表单内容 */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 名称输入字段 */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      maxLength={100}
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                      placeholder="Enter Focus Mode name"
                    />
                  </div>

                  {/* 描述输入字段 */}
                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                      rows={3}
                      placeholder="Enter mode description"
                    />
                  </div>

                  {/* API 端点输入字段 */}
                  <div>
                    <label
                      htmlFor="apiEndpoint"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      API Endpoint
                    </label>
                    <input
                      type="url"
                      id="apiEndpoint"
                      value={formData.apiEndpoint}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          apiEndpoint: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                      placeholder="Enter API endpoint URL"
                    />
                  </div>

                  {/* 错误提示 */}
                  {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  {/* 表单按钮 */}
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </Transition>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
