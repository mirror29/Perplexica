import { NextResponse } from 'next/server';

// 获取MCP服务器URL
const MCP_SERVER_URL =
  process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3007';
console.log('使用MCP服务器URL:', MCP_SERVER_URL);

// 处理RPC请求
export async function POST(request) {
  console.log('📥 接收到MCP服务器请求，转发至:', MCP_SERVER_URL);

  try {
    // 获取请求内容
    const requestData = await request.json();
    console.log('📦 RPC请求:', JSON.stringify(requestData).substring(0, 200));

    // 检查请求格式
    if (!requestData.method || !requestData.id) {
      console.error('❌ 无效的JSON-RPC请求格式');
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: requestData.id || null,
          error: {
            code: -32600,
            message: '无效的请求格式',
          },
        },
        { status: 400 },
      );
    }

    // 将请求转发到外部MCP服务器
    try {
      const response = await fetch(`${MCP_SERVER_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(
          `MCP服务器响应错误: ${response.status} ${response.statusText}`,
        );
      }

      const responseData = await response.json();
      console.log(
        '✅ MCP服务器响应:',
        JSON.stringify(responseData).substring(0, 200),
      );
      return NextResponse.json(responseData);
    } catch (error) {
      console.error('❌ 转发到MCP服务器失败:', error);
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: requestData.id,
          error: {
            code: -32000,
            message: error.message || 'MCP服务器内部错误',
          },
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('❌ 处理MCP请求出错:', error);
    return NextResponse.json(
      { error: error.message || '服务器内部错误' },
      { status: 500 },
    );
  }
}

// 获取服务器状态
export async function GET(request) {
  try {
    // 检查MCP服务器状态
    try {
      const response = await fetch(`${MCP_SERVER_URL}/status`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          status: 'running',
          external: true,
          ...data,
        });
      } else {
        throw new Error(`MCP服务器状态检查失败: ${response.status}`);
      }
    } catch (error) {
      console.error('获取MCP服务器状态出错:', error);
      return NextResponse.json(
        {
          status: 'error',
          message: `无法连接到外部MCP服务器: ${error.message}`,
        },
        { status: 503 },
      );
    }
  } catch (error) {
    console.error('获取MCP服务器状态出错:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
      },
      { status: 500 },
    );
  }
}

// 处理OPTIONS请求（CORS预检）
export async function OPTIONS(request) {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    },
  );
}
