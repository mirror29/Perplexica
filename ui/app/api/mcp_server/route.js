import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';
import { promises as fs } from 'fs';

// MCP 服务器进程
let mcpServerProcess = null;

// 检查MCP服务器是否已启动
function isMcpServerRunning() {
  return mcpServerProcess !== null && !mcpServerProcess.killed;
}

// 尝试不同的目录路径查找MCP服务器
async function findMcpServerDir() {
  // 可能的路径
  const possiblePaths = [
    path.resolve(process.cwd(), '../../mcp-server'),
    path.resolve(process.cwd(), '../mcp-server'),
    path.resolve(process.cwd(), './mcp-server'),
    path.resolve(process.cwd(), '../../../mcp-server'),
  ];

  console.log('尝试查找MCP服务器目录...');
  console.log('当前工作目录:', process.cwd());

  for (const dirPath of possiblePaths) {
    console.log('检查路径:', dirPath);
    try {
      const stat = await fs.stat(dirPath);
      if (stat.isDirectory()) {
        console.log('找到MCP服务器目录:', dirPath);

        // 检查index.js文件
        const indexPath = path.join(dirPath, 'index.js');
        try {
          await fs.access(indexPath);
          console.log('找到index.js文件:', indexPath);
          return dirPath;
        } catch (err) {
          console.log('index.js文件不存在:', indexPath);
        }
      }
    } catch (err) {
      console.log('目录不存在:', dirPath);
    }
  }

  throw new Error('无法找到有效的MCP服务器目录');
}

// 启动MCP服务器进程
async function startMcpServer() {
  try {
    // 查找MCP服务器目录
    let serverDir;
    try {
      serverDir = await findMcpServerDir();
    } catch (err) {
      console.error('查找MCP服务器目录失败:', err.message);
      throw err;
    }

    console.log('准备启动MCP服务器，路径:', serverDir);

    // 启动服务器进程
    mcpServerProcess = spawn('node', ['index.js'], {
      cwd: serverDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' },
    });

    if (!mcpServerProcess || !mcpServerProcess.pid) {
      throw new Error('MCP服务器进程启动失败');
    }

    console.log(`MCP服务器已启动，PID: ${mcpServerProcess.pid}`);

    // 监听标准输出
    mcpServerProcess.stdout.on('data', (data) => {
      console.log(`MCP服务器输出: ${data.toString().trim()}`);
    });

    // 监听标准错误
    mcpServerProcess.stderr.on('data', (data) => {
      console.error(`MCP服务器错误: ${data.toString().trim()}`);
    });

    // 监听进程退出
    mcpServerProcess.on('close', (code) => {
      console.log(`MCP服务器已退出，退出码: ${code}`);
      mcpServerProcess = null;
    });

    // 等待一段时间确保服务器已启动
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (mcpServerProcess.killed) {
      throw new Error('MCP服务器进程在启动后立即终止');
    }

    return true;
  } catch (error) {
    console.error('启动MCP服务器失败:', error);
    if (mcpServerProcess) {
      try {
        mcpServerProcess.kill();
      } catch (e) {
        console.error('清理MCP服务器进程失败:', e);
      }
      mcpServerProcess = null;
    }
    return false;
  }
}

// 处理RPC请求
export async function POST(request) {
  console.log('📥 接收到MCP服务器请求');

  try {
    // 确保MCP服务器正在运行
    if (!isMcpServerRunning()) {
      console.log('🚀 MCP服务器未运行，正在启动...');
      const started = await startMcpServer();
      if (!started) {
        return NextResponse.json(
          { error: 'MCP服务器启动失败' },
          { status: 500 },
        );
      }
    }

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

    // 将请求发送到MCP服务器
    if (mcpServerProcess && mcpServerProcess.stdin) {
      // 设置等待响应的Promise
      const responsePromise = new Promise((resolve, reject) => {
        // 超时处理
        const timeout = setTimeout(() => {
          reject(new Error('MCP服务器响应超时'));
        }, 30000);

        // 一次性监听器，处理下一个输出
        mcpServerProcess.stdout.once('data', (data) => {
          clearTimeout(timeout);
          try {
            const response = JSON.parse(data.toString());
            resolve(response);
          } catch (err) {
            reject(new Error('无法解析MCP服务器响应: ' + err.message));
          }
        });
      });

      // 发送请求到MCP服务器
      mcpServerProcess.stdin.write(JSON.stringify(requestData) + '\n');

      try {
        // 等待响应
        const response = await responsePromise;
        console.log(
          '✅ MCP服务器响应:',
          JSON.stringify(response).substring(0, 200),
        );
        return NextResponse.json(response);
      } catch (error) {
        console.error('❌ 获取MCP服务器响应失败:', error);
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
    } else {
      console.error('❌ MCP服务器进程不可用');
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: requestData.id,
          error: {
            code: -32003,
            message: 'MCP服务器不可用',
          },
        },
        { status: 503 },
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
    // 如果服务器未运行，尝试启动
    if (!isMcpServerRunning()) {
      console.log('GET请求: MCP服务器未运行，尝试启动...');
      await startMcpServer();
    }

    return NextResponse.json({
      status: isMcpServerRunning() ? 'running' : 'stopped',
      pid: mcpServerProcess?.pid || null,
    });
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
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    },
  );
}
