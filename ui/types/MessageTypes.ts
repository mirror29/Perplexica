export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  messageId: string;
  messages?: MessageSource[];
  suggestions?: string[];
  fromCache?: boolean;
  createdAt: Date;
}

export interface MessageSource {
  title: string;
  metadata: {
    url: string;
    date?: string;
    snippet?: string;
  };
}

// 用于保存文字转图片的结果
export interface ImageData {
  type: 'image';
  uri: string;
  alt?: string;
}

// 用于文字转图片请求的参数
export interface TextToImageOptions {
  backgroundColor?: string;
  textColor?: string;
  width?: number;
  height?: number;
}

export interface File {
  fileName: string;
  fileExtension: string;
  fileId: string;
}
