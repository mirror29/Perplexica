'use client';

import { useState } from 'react';
import { getMcpClient } from '@/lib/mcp-client';
import { TextToImageOptions } from '@/types/MessageTypes';

export default function TextToImageTestPage() {
  const [text, setText] =
    useState<string>('这是一段测试文本，将被转换为图片。');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('准备就绪');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [requestLog, setRequestLog] = useState<string>('');
  const [responseLog, setResponseLog] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [textColor, setTextColor] = useState<string>('#000000');

  // 测试文字转图片功能
  const handleConvertToImage = async () => {
    if (isLoading || !text) return;

    setIsLoading(true);
    setError(null);
    setStatus('处理中...');

    try {
      // 创建MCP客户端
      const mcpClient = getMcpClient();

      // 构建参数
      const options: TextToImageOptions = {
        backgroundColor: bgColor,
        textColor: textColor,
        width: 800,
      };

      // 记录请求日志
      const requestParams = {
        text,
        ...options,
      };
      setRequestLog(JSON.stringify(requestParams, null, 2));

      // 直接调用MCP客户端方法（与TextToImage组件相同的调用方式）
      console.log('调用文字转图片API，文本长度:', text.length);
      const result = await mcpClient.textToImage(text, options);

      // 记录响应日志
      setResponseLog(JSON.stringify(result, null, 2));

      // 提取图片URL
      const imageItem = result.content.find((item) => item.type === 'image');
      if (imageItem && 'uri' in imageItem) {
        console.log('成功获取图片URL');
        setImageUrl(imageItem.uri);
        setStatus('图片生成成功');
      } else {
        throw new Error('响应中没有找到图片数据');
      }
    } catch (err: any) {
      console.error('转换图片失败:', err);
      setStatus('图片生成失败');
      setError(err.message || '处理请求时出错');
    } finally {
      setIsLoading(false);
    }
  };

  // 从服务器状态开始
  const checkServerStatus = async () => {
    try {
      setIsLoading(true);
      setStatus('检查MCP服务器状态...');

      // 直接检查MCP服务器
      try {
        const response = await fetch('http://localhost:3007/status');
        if (response.ok) {
          const data = await response.json();
          setStatus('MCP服务器正常运行');
          setResponseLog(JSON.stringify(data, null, 2));
        } else {
          setStatus('MCP服务器未响应');
          setError(`HTTP错误: ${response.status}`);
        }
      } catch (error: any) {
        console.error('HTTP状态检查失败:', error);
        setError(`MCP服务器连接失败: ${error.message}`);
      }
    } catch (error: any) {
      setError(error.message || '检查服务器状态失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">文字转图片测试</h1>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">服务器状态</h2>
          <button
            onClick={checkServerStatus}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            检查服务器
          </button>
        </div>
        <div className="text-sm text-gray-600 mb-2">
          当前状态:{' '}
          <span
            className={error ? 'text-red-500' : 'text-green-500 font-medium'}
          >
            {status}
          </span>
        </div>
        {error && (
          <div className="text-red-500 text-sm mb-2">错误: {error}</div>
        )}
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">文本内容</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded mb-4 min-h-[120px]"
          placeholder="输入要转换为图片的文本..."
          disabled={isLoading}
        />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">背景颜色</label>
            <div className="flex items-center">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-10 h-10 border border-gray-300 rounded mr-2"
                disabled={isLoading}
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">文本颜色</label>
            <div className="flex items-center">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-10 h-10 border border-gray-300 rounded mr-2"
                disabled={isLoading}
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleConvertToImage}
          disabled={isLoading || !text}
          className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
        >
          {isLoading ? '处理中...' : '将文本转换为图片'}
        </button>
      </div>

      {(requestLog || responseLog) && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">请求数据</h2>
            <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60 text-xs">
              {requestLog}
            </pre>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">响应数据</h2>
            <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60 text-xs">
              {responseLog}
            </pre>
          </div>
        </div>
      )}

      {imageUrl && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">生成的图片</h2>
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt="Generated from text"
              className="max-w-full rounded border border-gray-300"
            />
          </div>
          <div className="mt-4 flex justify-center">
            <a
              href={imageUrl}
              download={`text-image-${Date.now()}.png`}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              下载图片
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
