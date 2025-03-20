import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ImageData, TextToImageOptions } from '@/types/MessageTypes';

// MCP 服务器 API 端点 - 从环境变量中获取或使用默认值
const MCP_SERVER_ENDPOINT =
  process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3007'; // 修改为3007端口
const MCP_API_ENDPOINT = '/api/mcp_server'; // 备用API路由

// 获取完整的API URL
function getFullApiUrl(endpoint: string): string {
  // 使用自定义MCP服务器URL
  if (endpoint.startsWith('http')) {
    return endpoint;
  }

  // 在浏览器中
  if (typeof window !== 'undefined') {
    const origin = window.location.origin; // 例如 http://localhost:3000
    return `${origin}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  // 在服务器端
  return endpoint.startsWith('http')
    ? endpoint
    : `http://localhost:3000${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

/**
 * JSON-RPC 请求辅助函数
 * @param url 服务器地址
 * @param method 方法名
 * @param params 参数对象
 * @returns 响应结果
 */
async function callJsonRpc(
  url: string,
  method: string,
  params: any,
): Promise<any> {
  // 确保URL是完整的
  const fullUrl = getFullApiUrl(url);
  console.log(`📡 发送请求到: ${fullUrl}`);

  // 构建请求体
  const requestBody = {
    jsonrpc: '2.0',
    id: Date.now().toString(),
    method,
    params,
  };

  console.log('📤 请求内容:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error(`❌ HTTP错误: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('响应内容:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
    }

    const responseData = await response.json();
    console.log('📥 响应内容:', JSON.stringify(responseData, null, 2));

    if (responseData.error) {
      console.error('❌ RPC错误:', responseData.error);
      throw new Error(responseData.error.message || '请求失败');
    }

    return responseData.result;
  } catch (error) {
    console.error('❌ 请求失败:', error);
    throw error;
  }
}

/**
 * MCP 客户端类
 * 负责与 MCP 服务器通信，处理文字转图片等请求
 */
export class PerplexicaMcpClient {
  private serverUrl: string;

  constructor(serverUrl: string = MCP_SERVER_ENDPOINT) {
    this.serverUrl = serverUrl;
    console.log('MCP客户端初始化，服务器地址:', this.serverUrl);
  }

  /**
   * 将文字转换为图片
   * @param text 要转换的文本
   * @param options 可选配置，如背景色、文本色等
   * @returns 包含图片URL的响应对象
   */
  async textToImage(
    text: string,
    options: TextToImageOptions = {},
  ): Promise<{ content: Array<{ type: string; text?: string } | ImageData> }> {
    console.log('📤 发送文字转图片请求...');
    console.log('📝 文本长度:', text.length);

    const defaultOptions: TextToImageOptions = {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      width: 800,
    };

    const params = {
      text,
      ...defaultOptions,
      ...options,
    };

    try {
      // 尝试直接连接MCP服务器
      try {
        console.log(`📡 尝试连接MCP服务器: ${this.serverUrl}`);
        // 调用MCP服务器的textToImage工具
        const result = await callJsonRpc(this.serverUrl, 'tool', {
          name: 'textToImage',
          params,
        });

        console.log('✅ 文字转图片请求成功');

        // 检查图片是否生成
        const imageData = result?.content?.find(
          (item: any) => item.type === 'image',
        );
        if (imageData) {
          console.log(
            '🖼️ 图片已生成:',
            imageData.uri ? '成功' : '未返回有效URI',
          );
        } else {
          console.warn('⚠️ 未返回图片数据');
        }

        return result;
      } catch (directError: any) {
        // 如果直接连接失败，尝试通过API路由连接
        console.warn(
          '直接连接MCP服务器失败，尝试通过API路由连接...',
          directError.message || directError,
        );

        console.log(`📡 尝试通过API路由连接: ${MCP_API_ENDPOINT}`);
        try {
          const result = await callJsonRpc(MCP_API_ENDPOINT, 'tool', {
            name: 'textToImage',
            params,
          });

          console.log('✅ 通过API路由请求成功');
          return result;
        } catch (apiError: any) {
          console.error(
            '通过API路由连接也失败了:',
            apiError.message || apiError,
          );
          throw new Error(
            `MCP服务器连接失败: ${apiError.message || '未知错误'}。请确保MCP服务器正在运行。`,
          );
        }
      }
    } catch (error: any) {
      console.error('❌ 文字转图片请求失败:', error.message || error);
      throw error;
    }
  }

  /**
   * 检测用户输入是否包含文字转图片的意图
   * @param userInput 用户输入的文本
   * @returns 是否包含转图片意图
   */
  static detectImageConversionIntent(userInput: string): boolean {
    if (!userInput) return false;

    const lowerInput = userInput.toLowerCase();
    const imageIntentPatterns = [
      // 中文意图模式
      '转为图片',
      '转成图片',
      '生成图片',
      '以图片形式',
      '变成图片',
      '图片格式',
      '图像形式',
      '输出图片',
      '创建图片',
      '保存为图片',
      '图片展示',
      '图片方式',
      '转化为图片',
      '生成一张图片',
      '转换图片',
      '制作图片',
      '做成图片',
      '显示为图片',
      '导出图片',
      '图片输出',
      '把文字变成图片',
      '将文字转为图片',
      '文字生成图',
      '文转图',
      // 英文意图模式
      'convert to image',
      'generate image',
      'make image',
      'create image',
      'turn into image',
      'as image',
      'image format',
    ];

    const hasIntent = imageIntentPatterns.some((pattern) =>
      lowerInput.includes(pattern),
    );

    if (hasIntent) {
      console.log('🔍 检测到文字转图片意图:', userInput);
    }

    return hasIntent;
  }

  /**
   * 测试 MCP 服务器连接
   * @returns 测试结果
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 测试 MCP 服务器连接...');

      // 尝试直接连接
      try {
        // 调用HTTP状态接口
        if (this.serverUrl.startsWith('http')) {
          try {
            const statusUrl = `${this.serverUrl}/status`;
            console.log('检查HTTP服务器状态:', statusUrl);

            const response = await fetch(statusUrl);
            if (response.ok) {
              const statusData = await response.json();
              console.log('HTTP服务器状态:', statusData);

              // 如果状态接口可用，再测试RPC接口
              try {
                const addResult = await callJsonRpc(this.serverUrl, 'tool', {
                  name: 'add',
                  params: { a: 1, b: 2 },
                });

                const textContent = addResult?.content?.find(
                  (item: any) => item.type === 'text',
                )?.text;

                console.log('✅ RPC测试成功:', textContent);

                return {
                  success: true,
                  message: `直接连接成功: ${textContent || JSON.stringify(addResult)}`,
                };
              } catch (rpcError) {
                console.warn('RPC接口测试失败:', rpcError);
                throw rpcError;
              }
            } else {
              console.warn('HTTP状态接口不可用');
              throw new Error(`HTTP status ${response.status}`);
            }
          } catch (httpError) {
            console.warn('HTTP服务器连接失败:', httpError);
            throw httpError;
          }
        }

        // 标准RPC调用
        const result = await callJsonRpc(this.serverUrl, 'tool', {
          name: 'add',
          params: { a: 1, b: 2 },
        });

        const textContent = result?.content?.find(
          (item: any) => item.type === 'text',
        )?.text;
        console.log('✅ MCP 服务器连接测试成功:', textContent);

        return {
          success: true,
          message: `MCP 服务器连接成功: ${textContent}`,
        };
      } catch (directError) {
        // 如果直接连接失败，尝试通过API路由连接
        console.warn(
          '直接连接MCP服务器失败，尝试通过API路由连接...',
          directError,
        );

        const result = await callJsonRpc(MCP_API_ENDPOINT, 'tool', {
          name: 'add',
          params: { a: 1, b: 2 },
        });

        const textContent = result?.content?.find(
          (item: any) => item.type === 'text',
        )?.text;

        console.log('✅ 通过API路由连接MCP服务器成功:', textContent);

        return {
          success: true,
          message: `通过API路由连接成功: ${textContent}`,
        };
      }
    } catch (error: any) {
      console.error('❌ MCP 服务器连接测试失败:', error);

      return {
        success: false,
        message: `连接失败: ${error.message}`,
      };
    }
  }
}

// 创建单例实例
let mcpClientInstance: PerplexicaMcpClient | null = null;

/**
 * 获取 MCP 客户端实例
 * @returns MCP 客户端实例
 */
export function getMcpClient(): PerplexicaMcpClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new PerplexicaMcpClient();
  }
  return mcpClientInstance;
}
