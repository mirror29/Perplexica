import { useState, useEffect } from 'react';
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

// API 来源选项
const API_SOURCES = [
  { value: 'backend', label: 'Backend Service' },
  { value: 'searxng', label: 'SearxNG Service' },
  { value: 'custom', label: 'Custom API' },
];

export function FocusModeForm({
  mode,
  isOpen,
  onClose,
  onSubmit,
}: FocusModeFormProps) {
  // 表单数据状态
  const [formData, setFormData] = useState<CreateFocusModeInput>({
    name: '',
    description: '',
    apiEndpoint: '',
    config: {
      temperature: 0.7,
      maxTokens: 1000,
      apiSource: 'backend',
      systemPrompt: '',
      searchEnabled: false,
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // 提交状态
  const [error, setError] = useState<string | null>(null); // 错误信息

  // 当编辑模式时，加载模式数据
  useEffect(() => {
    if (mode && isOpen) {
      setFormData({
        name: mode.name || '',
        description: mode.description || '',
        apiEndpoint: mode.apiEndpoint || '',
        config: mode.config || {
          temperature: 0.7,
          maxTokens: 1000,
          apiSource: 'backend',
          systemPrompt: '',
          searchEnabled: false,
        },
      });
    } else if (!mode && isOpen) {
      // 重置表单，创建新模式时
      setFormData({
        name: '',
        description: '',
        apiEndpoint: '',
        config: {
          temperature: 0.7,
          maxTokens: 1000,
          apiSource: 'backend',
          systemPrompt: '',
          searchEnabled: false,
        },
      });
    }
  }, [mode, isOpen]);

  // 更新配置项
  const updateConfig = (key: string, value: any) => {
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        [key]: value,
      },
    });
  };

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
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
                >
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
                      placeholder="Enter mode name"
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

                  {/* API 来源选择 */}
                  <div>
                    <label
                      htmlFor="apiSource"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      API Source
                    </label>
                    <select
                      id="apiSource"
                      value={formData.config?.apiSource || 'backend'}
                      onChange={(e) =>
                        updateConfig('apiSource', e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                    >
                      {API_SOURCES.map((source) => (
                        <option key={source.value} value={source.value}>
                          {source.label}
                        </option>
                      ))}
                    </select>
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
                      value={formData.apiEndpoint || ''}
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

                  {/* 温度设置 */}
                  <div>
                    <label
                      htmlFor="temperature"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Temperature ({formData.config?.temperature || 0.7})
                    </label>
                    <input
                      type="range"
                      id="temperature"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.config?.temperature || 0.7}
                      onChange={(e) =>
                        updateConfig('temperature', parseFloat(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  {/* 最大令牌数 */}
                  <div>
                    <label
                      htmlFor="maxTokens"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      id="maxTokens"
                      min="100"
                      max="4000"
                      value={formData.config?.maxTokens || 1000}
                      onChange={(e) =>
                        updateConfig('maxTokens', parseInt(e.target.value))
                      }
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                    />
                  </div>

                  {/* 系统提示词 */}
                  <div>
                    <label
                      htmlFor="systemPrompt"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      System Prompt
                    </label>
                    <textarea
                      id="systemPrompt"
                      value={formData.config?.systemPrompt || ''}
                      onChange={(e) =>
                        updateConfig('systemPrompt', e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                      rows={3}
                      placeholder="Enter system prompt"
                    />
                  </div>

                  {/* 启用搜索 */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="searchEnabled"
                      checked={formData.config?.searchEnabled || false}
                      onChange={(e) =>
                        updateConfig('searchEnabled', e.target.checked)
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <label
                      htmlFor="searchEnabled"
                      className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                    >
                      Enable Search
                    </label>
                  </div>

                  {/* 搜索源 (当启用搜索时才显示) */}
                  {formData.config?.searchEnabled && (
                    <div>
                      <label
                        htmlFor="searchSource"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Search Source
                      </label>
                      <input
                        type="url"
                        id="searchSource"
                        value={formData.config?.searchSource || ''}
                        onChange={(e) =>
                          updateConfig('searchSource', e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                        placeholder="Enter search source URL"
                      />
                    </div>
                  )}

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
