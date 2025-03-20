import React, { useState, useEffect, useRef } from 'react';
import { Download, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PerplexicaMcpClient } from '@/lib/mcp-client';
import { ImageData, TextToImageOptions } from '@/types/MessageTypes';

interface TextToImageProps {
  text: string;
  userQuery: string;
}

interface TextToImageResponse {
  success: boolean;
  text: string;
  imageData: ImageData | null;
  error?: string;
}

const MAX_AUTO_RETRIES = 3; // 最大自动重试次数

const TextToImage: React.FC<TextToImageProps> = ({ text, userQuery }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const autoRetryCount = useRef<number>(0); // 用于追踪自动重试次数

  // 增强的意图检测 - 如果没有意图检测到，不显示组件
  const hasImageIntent =
    PerplexicaMcpClient.detectImageConversionIntent(userQuery);
  if (!hasImageIntent && !imageUrl) {
    return null;
  }

  const handleGenerateImage = async (isAutoRetry = false): Promise<void> => {
    if (loading) return;

    // 检查是否超过最大自动重试次数
    if (isAutoRetry && autoRetryCount.current >= MAX_AUTO_RETRIES) {
      console.log(`已达到最大自动重试次数(${MAX_AUTO_RETRIES}次)，停止重试`);
      setError(
        `生成图片失败，已尝试${MAX_AUTO_RETRIES}次。您可以手动点击"重新生成"按钮再次尝试。`,
      );
      return;
    }

    if (isAutoRetry) {
      autoRetryCount.current += 1;
      console.log(`自动重试第${autoRetryCount.current}次...`);
    }

    setLoading(true);
    setError(null);

    try {
      console.log('正在发送文字转图片请求...');
      console.log('文本内容长度:', text.length);
      console.log('用户查询:', userQuery);

      const response = await fetch('/api/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          userQuery,
          options: {
            backgroundColor: '#ffffff',
            textColor: '#000000',
            width: 800,
          } as TextToImageOptions,
        }),
      });

      console.log('收到API响应:', response.status);

      const data = (await response.json()) as TextToImageResponse;
      console.log('API响应数据:', data);

      if (!response.ok || data.error) {
        throw new Error(data.error || '生成图片失败');
      }

      if (data.imageData?.uri) {
        console.log('成功获取图片URI');
        setImageUrl(data.imageData.uri);
        toast.success('图片生成成功');
        autoRetryCount.current = 0; // 重置自动重试计数
      } else {
        throw new Error('未返回图片信息');
      }
    } catch (err: any) {
      console.error('生成图片时出错:', err);
      setError(err.message || '生成图片时出错');
      toast.error('图片生成失败', {
        description: err.message || '请稍后重试',
      });

      // 如果错误与MCP服务器有关，显示更详细的错误信息
      if (
        err.message &&
        (err.message.includes('MCP') ||
          err.message.includes('fetch') ||
          err.message.includes('network'))
      ) {
        setError(`连接MCP服务器失败: ${err.message}。请确保MCP服务器已启动。`);
      }

      // 自动重试逻辑
      if (isAutoRetry) {
        // 如果是自动重试模式，在短暂延迟后再次尝试
        setTimeout(() => {
          if (autoRetryCount.current < MAX_AUTO_RETRIES) {
            console.log(`延迟2秒后自动重试...`);
            handleGenerateImage(true);
          }
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // 自动生成图片当检测到意图且没有图片时
  useEffect(() => {
    const generateImageIfNeeded = async () => {
      if (
        hasImageIntent &&
        !imageUrl &&
        !loading &&
        autoRetryCount.current === 0
      ) {
        // 首次尝试
        await handleGenerateImage(true);
      }
    };

    generateImageIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImageIntent, imageUrl, loading]);

  const handleRetry = (): void => {
    setRetryCount(retryCount + 1);
    setError(null);
    // 手动重试时不计入自动重试次数
    autoRetryCount.current = 0;
    handleGenerateImage(false);
  };

  const handleDownload = (): void => {
    if (!imageUrl) return;

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `perplexica-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('图片下载中');
  };

  return (
    <div className="w-full mt-6 border border-light-secondary dark:border-dark-secondary rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-light-secondary dark:bg-dark-secondary p-3">
        <div className="flex items-center gap-2">
          <ImageIcon size={18} />
          <h3 className="font-medium">基于您的输入生成图片</h3>
          {loading && autoRetryCount.current > 0 && (
            <span className="text-xs ml-2 text-gray-500">
              (重试 {autoRetryCount.current}/{MAX_AUTO_RETRIES})
            </span>
          )}
        </div>

        {!imageUrl && !loading && (
          <button
            onClick={() => handleGenerateImage(false)}
            disabled={loading}
            className="flex items-center gap-1 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors disabled:opacity-70"
          >
            重新生成
          </button>
        )}

        {imageUrl && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
          >
            <Download size={16} />
            下载图片
          </button>
        )}
      </div>

      <div className="p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md mb-4 text-sm">
            <p className="font-semibold mb-1">错误:</p>
            <p>{error}</p>
            {autoRetryCount.current >= MAX_AUTO_RETRIES ? (
              <button
                onClick={handleRetry}
                className="mt-2 text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
              >
                手动重试
              </button>
            ) : (
              <button
                onClick={handleRetry}
                className="mt-2 text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
              >
                重试
              </button>
            )}
          </div>
        )}

        {imageUrl ? (
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt="Generated text image"
              className="max-w-full rounded border border-light-secondary dark:border-dark-secondary"
            />
          </div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {loading
              ? autoRetryCount.current > 0
                ? `正在尝试生成图片 (重试 ${autoRetryCount.current}/${MAX_AUTO_RETRIES})...`
                : '正在生成图片，请稍候...'
              : '图片生成中...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default TextToImage;
