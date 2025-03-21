# MCP Server (模型上下文协议服务器)

MCP (Model Context Protocol) 服务器是一个Node.js实现的HTTP服务，用于处理文本到图像的转换功能，是Perplexica项目的重要组件。

## 功能介绍

MCP服务器提供以下功能:
- **文字转图片**: 将文本内容转换为图片格式
- **工具扩展**: 可以扩展更多功能，如简单计算等

## 技术架构

- 基于Express.js的HTTP服务器
- 使用canvas库进行图片生成
- JSON-RPC接口用于接收请求
- 默认运行在3007端口

## Docker部署指南

### 使用Docker Compose构建和启动

最简单的方法是使用Docker Compose：

```bash
# 在mcp-server目录下
cd mcp-server

# 构建并启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 手动构建Docker镜像

如果你想手动构建镜像并运行容器：

```bash
# 构建镜像
docker build -t mcp-server .

# 运行容器
docker run -d -p 3007:3007 --name mcp-server mcp-server
```

### 检查服务器状态

启动后，可以通过以下命令检查服务器状态：

```bash
# 测试服务器状态
curl http://localhost:3007/status

# 测试ping功能
curl http://localhost:3007/ping
```

## 与Perplexica前端集成

如果你想将这个独立的MCP服务器与Perplexica前端集成，需要在前端的环境变量中设置：

```
NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:3007
```

## 测试工具功能

### 测试加法工具

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tool","params":{"name":"add","params":{"a":1,"b":2}}}' \
  http://localhost:3007/
```

### 测试文字转图片工具

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tool","params":{"name":"textToImage","params":{"text":"Hello MCP Server!"}}}' \
  http://localhost:3007/
```

## 在Docker内启动MCP服务器时的问题排查

### 1. MCP服务器无法启动

#### 症状
- 图片生成功能不可用
- 浏览器控制台显示连接MCP服务器失败

#### 解决方案

**检查服务器是否运行：**
```bash
docker ps | grep mcp-server
```

**检查日志：**
```bash
docker logs mcp-server
```

**重启服务器：**
```bash
docker restart mcp-server
```

### 2. 服务器已启动但无法连接

**检查网络连接：**
```bash
docker exec -it mcp-server curl http://localhost:3007/ping
```

**检查暴露端口：**
```bash
docker port mcp-server
```

## 常见错误代码

| 错误代码 | 描述           | 解决方案                     |
| -------- | -------------- | ---------------------------- |
| -32601   | 方法未找到     | 检查请求的工具名称是否正确   |
| -32603   | 内部服务器错误 | 检查服务器日志获取详细信息   |
| -32000   | 工具执行错误   | 检查传递给工具的参数是否正确 |

## 开发扩展

如果需要添加新工具，可以修改`index.js`文件:

1. 创建新的处理函数
2. 在toolHandlers对象中注册该函数
3. 使用server.tool()方法注册工具

## 注意事项

- MCP服务器依赖于Node.js和Canvas库
- 在Docker环境中，确保容器已安装所有必要的依赖
- 确保前端应用的.env文件中已正确配置MCP服务器地址
