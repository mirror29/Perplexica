import { NextResponse } from 'next/server';
import { getMcpClient, PerplexicaMcpClient } from '@/lib/mcp-client';
import { TextToImageOptions } from '@/types/MessageTypes';

interface RequestBody {
  text: string;
  userQuery: string;
  options?: TextToImageOptions;
}

export async function POST(request: Request): Promise<NextResponse> {
  console.log('📥 接收到文字转图片请求');

  try {
    // 记录请求信息
    const requestUrl = request.url;
    const requestMethod = request.method;
    const requestHeaders = Object.fromEntries(request.headers.entries());
    console.log(`📋 请求URL: ${requestUrl}`);
    console.log(`📋 请求方法: ${requestMethod}`);
    console.log(
      `📋 请求头:`,
      JSON.stringify(requestHeaders, null, 2).substring(0, 500),
    );

    const requestBody = await request.json();
    console.log('📦 请求体:', JSON.stringify(requestBody).substring(0, 200));

    const { text, userQuery, options } = requestBody as RequestBody;

    // 检查文本内容
    if (!text) {
      console.log('⚠️ 文本内容为空');
      return NextResponse.json({ error: '无文本内容提供' }, { status: 400 });
    }

    console.log('📝 文本长度:', text.length);
    console.log('🔍 用户查询:', userQuery);
    console.log('🔍 实际处理的文本:', text);

    // 检查用户查询是否包含文字转图片的意图
    const hasImageIntent =
      userQuery && PerplexicaMcpClient.detectImageConversionIntent(userQuery);

    console.log(
      '🔎 意图检测结果:',
      hasImageIntent ? '检测到图片转换意图' : '未检测到图片转换意图',
    );

    // 即使没有检测到意图，如果用户直接请求转换，我们也处理它
    if (!hasImageIntent && !requestUrl.includes('/api/text-to-image')) {
      console.log('⚠️ 未检测到转换图片意图');
      return NextResponse.json(
        { error: '未检测到转换图片意图', text },
        { status: 200 },
      );
    }

    console.log('✅ 准备调用MCP客户端');

    // 获取MCP客户端并调用文字转图片功能
    let mcpClient;
    try {
      mcpClient = getMcpClient();
      console.log('🔄 MCP客户端已创建，调用textToImage方法');
    } catch (clientError: any) {
      console.error('❌ 创建MCP客户端失败:', clientError);
      return NextResponse.json(
        { error: `创建MCP客户端失败: ${clientError.message}` },
        { status: 500 },
      );
    }

    try {
      // 如果有自定义选项，记录它们
      if (options) {
        console.log('🎨 使用自定义选项:', JSON.stringify(options));
      }

      // 使用text参数作为转换的文本内容
      const result = await mcpClient.textToImage(text, options);
      console.log('✅ MCP客户端textToImage调用成功');
      console.log('📊 结果数据:', JSON.stringify(result).substring(0, 200));

      const imageItem = result.content.find((item) => item.type === 'image');
      if (imageItem) {
        console.log(
          '🖼️ 图片已生成:',
          'uri' in imageItem
            ? imageItem.uri.substring(0, 50) + '...'
            : 'URI不存在',
        );
      } else {
        console.warn('⚠️ 结果中没有找到图片数据');
      }

      // 返回结果
      return NextResponse.json({
        success: true,
        text: text,
        imageData: imageItem || null,
        message: imageItem ? '图片生成成功' : '图片生成失败',
      });
    } catch (callError: any) {
      console.error('❌ MCP客户端调用失败:', callError);
      console.error('错误详情:', callError.message);
      console.error('错误堆栈:', callError.stack);

      // 提供详细的错误信息
      let errorMessage = 'MCP服务器错误';
      if (callError.message) {
        if (callError.message.includes('fetch')) {
          errorMessage = 'MCP服务器连接失败，请确保服务器正在运行';
        } else if (callError.message.includes('timeout')) {
          errorMessage = 'MCP服务器响应超时';
        } else {
          errorMessage = `MCP服务器错误: ${callError.message}`;
        }
      }

      return NextResponse.json(
        { error: errorMessage, details: callError.message },
        { status: 502 },
      );
    }
  } catch (error: any) {
    console.error('❌ 文字转图片处理错误:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);

    return NextResponse.json(
      { error: error.message || '处理请求时出错', details: error.stack },
      { status: 500 },
    );
  }
}

// OPTIONS 请求处理，用于CORS预检
export async function OPTIONS(request: Request): Promise<NextResponse> {
  console.log('📥 接收到OPTIONS请求:', request.url);

  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    },
  );
}
