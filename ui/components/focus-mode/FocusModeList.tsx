import { FocusMode } from '@/lib/types/focus-mode';
import { TrashIcon, PencilIcon } from 'lucide-react';
import { Transition } from '@headlessui/react';
import { useState, useEffect } from 'react';

// Focus Mode 列表组件的属性接口
interface FocusModeListProps {
  modes: FocusMode[]; // Focus Mode 列表数据
  onEdit: (mode: FocusMode) => void; // 编辑模式回调函数
  onDelete: (id: string) => void; // 删除模式回调函数
}

export function FocusModeList({ modes, onEdit, onDelete }: FocusModeListProps) {
  // 使用状态来跟踪每个项目的显示状态
  const [visibleItems, setVisibleItems] = useState<Record<string, boolean>>({});

  // 当 modes 改变时，为每个新项目设置显示状态
  useEffect(() => {
    const newVisibleItems: Record<string, boolean> = {};
    modes.forEach((mode) => {
      if (!(mode.id in visibleItems)) {
        newVisibleItems[mode.id] = true;
      } else {
        newVisibleItems[mode.id] = visibleItems[mode.id];
      }
    });
    setVisibleItems(newVisibleItems);
  }, [modes]);

  // 处理删除动画
  const handleDelete = (id: string) => {
    // 直接调用父组件的onDelete方法，确认对话框会在父组件中显示
    // 父组件会处理用户确认和实际删除逻辑
    onDelete(id);
    // 删除视觉上的动画效果由父组件完成删除后的状态更新触发
  };

  return (
    <div className="space-y-4 overflow-y-auto">
      {modes.map((mode, index) => (
        <div key={mode.id} style={{ transitionDelay: `${index * 50}ms` }}>
          <Transition
            show={Boolean(visibleItems[mode.id])}
            enter="transition-all duration-300"
            enterFrom="opacity-0 transform -translate-y-2"
            enterTo="opacity-100 transform translate-y-0"
            leave="transition-all duration-300"
            leaveFrom="opacity-100 transform translate-y-0"
            leaveTo="opacity-0 transform -translate-y-2"
          >
            {/* Focus Mode 卡片 */}
            <div className="group relative flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 dark:border-gray-700">
              {/* 模式信息 */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                  {mode.name}
                </h3>
                {mode.description && (
                  <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                    {mode.description}
                  </p>
                )}
                {mode.apiEndpoint && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-500 font-mono">
                    API: {mode.apiEndpoint}
                  </p>
                )}
              </div>
              {/* 操作按钮组 */}
              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {/* 编辑按钮 */}
                <button
                  onClick={() => onEdit(mode)}
                  className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  aria-label="Edit mode"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                {/* 删除按钮 */}
                <button
                  onClick={() => handleDelete(mode.id)}
                  className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  aria-label="Delete mode"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </Transition>
        </div>
      ))}
    </div>
  );
}
