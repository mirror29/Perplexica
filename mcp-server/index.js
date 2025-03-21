// 使用ESM导入
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import express from 'express';
import cors from 'cors';
import sharp from 'sharp';

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3007;

// 使用CORS和JSON解析中间件
app.use(
  cors({
    origin: '*', // 允许所有来源
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json());

// 开启预检请求缓存，减少OPTIONS请求 - 修复path-to-regexp错误
app.options('/*', cors()); // 将'*'改为'/*'

// 创建工具处理函数映射
const toolHandlers = {};

// 创建MCP服务器实例
const server = new McpServer({
  name: 'Perplexica MCP HTTP Server',
  version: '1.0.0',
});

// 注册文字转图片工具
const textToImageHandler = async (params) => {
  console.log('收到文字转图片请求:', params);

  const {
    text,
    backgroundColor = '#ffffff',
    textColor = '#000000',
    width = 800,
  } = params;

  try {
    // 根据文本长度动态计算高度
    const fontSize = 24;
    const lineHeight = fontSize * 1.5;
    const charsPerLine = Math.floor(width / fontSize);
    const lines = Math.ceil(text.length / charsPerLine);
    const height = Math.max(200, lines * lineHeight * 1.5);

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${backgroundColor}"/>
        <text
          x="50%"
          y="50%"
          font-family="'Noto Sans CJK SC', 'Noto Sans CJK TC', 'Noto Sans CJK JP', 'Noto Sans', sans-serif"
          font-size="${fontSize}"
          fill="${textColor}"
          text-anchor="middle"
          dominant-baseline="middle"
        >${text}</text>
      </svg>
    `;

    // 使用sharp将SVG转换为PNG
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();

    const imageDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

    return {
      content: [
        {
          type: 'text',
          text: '生成的图片如下:',
        },
        {
          type: 'image',
          uri: imageDataUrl,
          width: width,
          height: height,
        },
      ],
    };
  } catch (error) {
    console.error('生成图片时出错:', error);
    return {
      content: [
        {
          type: 'text',
          text: `生成图片时出错: ${error.message}`,
        },
      ],
    };
  }
};

// 注册加法工具处理函数
const addHandler = async (params) => {
  const { a, b } = params;
  const result = a + b;
  console.log(`计算: ${a} + ${b} = ${result}`);

  return {
    content: [
      {
        type: 'text',
        text: `${a} + ${b} = ${result}`,
      },
    ],
  };
};

// 在工具映射中注册处理函数
toolHandlers['textToImage'] = textToImageHandler;
toolHandlers['add'] = addHandler;

// 在MCP服务器中注册工具
server.tool(
  'textToImage',
  {
    type: 'object',
    properties: {
      text: { type: 'string' },
      backgroundColor: { type: 'string' },
      textColor: { type: 'string' },
      width: { type: 'number' },
    },
    required: ['text'],
  },
  textToImageHandler,
);

server.tool(
  'add',
  {
    type: 'object',
    properties: {
      a: { type: 'number' },
      b: { type: 'number' },
    },
    required: ['a', 'b'],
  },
  addHandler,
);

// 添加一个简单的测试端点
app.get('/ping', (req, res) => {
  console.log('收到ping请求');
  res.json({
    message: 'pong',
    timestamp: new Date().toISOString(),
  });
});

// 添加一个简单的加法计算端点 - 不使用RPC格式
app.post('/simple-add', (req, res) => {
  try {
    console.log('收到simple-add请求:', req.body);
    const { a, b } = req.body;

    if (typeof a !== 'number' || typeof b !== 'number') {
      return res.status(400).json({
        error: '参数必须是数字',
        received: { a: typeof a, b: typeof b },
      });
    }

    const result = a + b;
    console.log(`计算: ${a} + ${b} = ${result}`);

    res.json({ result });
  } catch (error) {
    console.error('处理simple-add请求错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 处理JSON-RPC请求的路由
app.post('/', async (req, res) => {
  try {
    console.log('接收到RPC请求:', JSON.stringify(req.body).substring(0, 200));
    console.log('请求头:', JSON.stringify(req.headers).substring(0, 200));

    const { method, params, id } = req.body;

    if (method === 'tool') {
      const toolName = params.name;
      const toolParams = params.params;

      console.log(`调用工具: ${toolName}, 参数:`, toolParams);

      // 检查工具是否存在
      if (!toolHandlers[toolName]) {
        console.error(`未知工具: ${toolName}`);
        return res.status(404).json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${toolName}`,
          },
        });
      }

      try {
        // 直接调用处理函数
        const result = await toolHandlers[toolName](toolParams);
        console.log(
          `工具${toolName}执行结果:`,
          JSON.stringify(result).substring(0, 100),
        );
        return res.json({
          jsonrpc: '2.0',
          id,
          result,
        });
      } catch (toolError) {
        console.error(`工具 ${toolName} 执行错误:`, toolError);
        return res.status(500).json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32000,
            message: toolError.message || `${toolName} 工具执行失败`,
          },
        });
      }
    } else {
      console.error(`不支持的方法: ${method}`);
      return res.status(400).json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      });
    }
  } catch (error) {
    console.error('处理RPC请求错误:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id || null,
      error: {
        code: -32603,
        message: error.message || '内部服务器错误',
      },
    });
  }
});

// 服务器状态接口
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    version: server?.options?.version || '1.0.0',
    name: server?.options?.name || 'Perplexica MCP HTTP Server',
    tools: Object.keys(toolHandlers),
  });
});

// 启动HTTP服务器
app.listen(PORT, () => {
  console.log(`MCP HTTP服务器已启动: http://localhost:${PORT}`);
  console.log('可用工具:');
  console.log('- add: 加法工具');
  console.log('- textToImage: 文字转图片工具');
  console.log('');
  console.log('测试端点:');
  console.log('- GET /ping - 简单连接测试');
  console.log('- GET /status - 服务器状态');
  console.log('- POST /simple-add - 简单加法计算');
});
