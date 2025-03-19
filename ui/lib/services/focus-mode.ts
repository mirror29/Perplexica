import {
  FocusMode,
  CreateFocusModeInput,
  UpdateFocusModeInput,
} from '../types/focus-mode';

const API_BASE_URL = '/api/focus-modes';

export const focusModeService = {
  // 获取所有 Focus 模式
  async getAll(): Promise<FocusMode[]> {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch focus modes');
    }
    return response.json();
  },

  // 创建新的 Focus 模式
  async create(data: CreateFocusModeInput): Promise<FocusMode> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create focus mode');
    }
    return response.json();
  },

  // 更新 Focus 模式
  async update(data: UpdateFocusModeInput): Promise<FocusMode> {
    const response = await fetch(`${API_BASE_URL}/${data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update focus mode');
    }
    return response.json();
  },

  // 删除 Focus 模式
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete focus mode');
    }
  },
};
