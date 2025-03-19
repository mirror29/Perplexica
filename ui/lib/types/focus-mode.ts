export interface FocusMode {
  id: string;
  name: string;
  description?: string;
  apiEndpoint?: string;
  config?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface CreateFocusModeInput {
  name: string;
  description?: string;
  apiEndpoint?: string;
  config?: Record<string, any>;
}

export interface UpdateFocusModeInput extends Partial<CreateFocusModeInput> {
  id: string;
}
