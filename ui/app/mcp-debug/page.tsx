'use client';

import { useState, useEffect } from 'react';
import { getMcpClient } from '@/lib/mcp-client';

export default function McpDebugPage() {
  const [status, setStatus] = useState<string>('未知');
  const [testResult, setTestResult] = useState<string>('');
  const [directTestResult, setDirectTestResult] = useState<string>('');
  const [pingResult, setPingResult] = useState<string>('');
  const [simpleAddResult, setSimpleAddResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [requestLog, setRequestLog] = useState<string>('');

  // 获取MCP服务器状态
  const checkStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/mcp_server');
      const data = await response.json();
      console.log('MCP服务器状态:', data);
      setStatus(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('获取状态失败:', error);
      setStatus(
        '错误: ' + (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 使用MCP客户端测试连接
  const testConnection = async () => {
    try {
      setIsLoading(true);
      const mcpClient = getMcpClient();
      const result = await mcpClient.testConnection();
      console.log('测试结果:', result);
      setTestResult(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('测试失败:', error);
      setTestResult(
        '错误: ' + (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 直接使用fetch测试连接
  const testDirect = async () => {
    try {
      setIsLoading(true);
      const mcpServerUrl = 'http://localhost:3007';

      // 记录请求日志
      const requestBody = {
        jsonrpc: '2.0',
        id: Date.now().toString(),
        method: 'tool',
        params: {
          name: 'add',
          params: { a: 3, b: 4 },
        },
      };

      setRequestLog(JSON.stringify(requestBody, null, 2));

      const response = await fetch(mcpServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log('直接测试结果:', result);
      setDirectTestResult(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('直接测试失败:', error);
      setDirectTestResult(
        '错误: ' + (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 测试简单的Ping端点
  const testPing = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3007/ping');
      const result = await response.json();
      console.log('Ping测试结果:', result);
      setPingResult(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Ping测试失败:', error);
      setPingResult(
        '错误: ' + (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 测试简单的加法端点
  const testSimpleAdd = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3007/simple-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ a: 5, b: 6 }),
      });
      const result = await response.json();
      console.log('简单加法测试结果:', result);
      setSimpleAddResult(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('简单加法测试失败:', error);
      setSimpleAddResult(
        '错误: ' + (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 初始状态检查
  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">MCP服务器调试页面</h1>

      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">服务器状态</h2>
          <button
            onClick={checkStatus}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            刷新状态
          </button>
        </div>
        <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-40">
          {status}
        </pre>
      </div>

      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Ping测试</h2>
            <button
              onClick={testPing}
              disabled={isLoading}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              测试Ping
            </button>
          </div>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-40">
            {pingResult}
          </pre>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">简单加法测试</h2>
            <button
              onClick={testSimpleAdd}
              disabled={isLoading}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              测试简单加法
            </button>
          </div>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-40">
            {simpleAddResult}
          </pre>
        </div>
      </div>

      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">测试连接 (客户端)</h2>
          <button
            onClick={testConnection}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            测试加法功能
          </button>
        </div>
        <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-40">
          {testResult}
        </pre>
      </div>

      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">直接测试 (HTTP fetch)</h2>
          <button
            onClick={testDirect}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            直接调用加法
          </button>
        </div>
        <div className="mb-2">
          <h3 className="font-medium">请求内容:</h3>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-40">
            {requestLog}
          </pre>
        </div>
        <div>
          <h3 className="font-medium">响应内容:</h3>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-40">
            {directTestResult}
          </pre>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">调试信息</h2>
        <p className="mb-2">请在浏览器控制台查看详细的日志信息</p>
        <p className="text-sm text-gray-600">
          如需检查服务器端日志，请查看Next.js服务器和MCP服务器的控制台输出
        </p>
      </div>
    </div>
  );
}
