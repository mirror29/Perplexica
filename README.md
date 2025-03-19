# Perplexica 本地部署指南

本项目使用Docker进行安装部署，集成了Ollama本地大模型，提供了一个完整的知识问答系统。系统会自动下载并运行 `llama3.2:1b` 模型，无需手动配置。

## 系统架构

本项目包含以下几个主要组件：

- **前端 (perplexica-frontend)**: 基于Next.js开发的用户界面
- **后端 (perplexica-backend)**: Node.js服务器，负责处理请求和与模型交互
- **数据库 (postgres)**: PostgreSQL数据库，存储用户的Focus模式配置
- **搜索引擎 (searxng)**: SearxNG搜索服务，提供网络搜索功能
- **大模型 (ollama)**: Ollama本地大模型服务，提供AI问答能力，自动加载 llama3.2:1b 模型

## 前置需求

- Docker 和 Docker Compose
- 至少8GB内存（推荐16GB以上）
- 足够的磁盘空间（至少10GB）
- 良好的网络连接

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/mirror29/Perplexica.git
cd Perplexica
```

### 2. 启动所有服务

一键启动所有服务（包括自动下载和运行 llama3.2:1b 模型）：

```bash
docker compose up -d
```

> **注意**:
> - 首次启动时会自动下载 llama3.2:1b 模型（约1.5GB），请确保有良好的网络连接
> - 下载过程可能需要几分钟时间，取决于您的网络速度
> - 整个启动过程可能需要5-10分钟，请耐心等待

### 3. 查看服务状态

```bash
docker compose ps
```

所有服务正常运行后，可以通过以下地址访问：

- **Perplexica 前端**: http://localhost:3000
- **SearxNG 搜索**: http://localhost:4000

### 4. Ollama模型自动配置

系统已配置为自动下载和运行 llama3.2:1b 模型，无需手动操作。您可以通过以下命令检查模型状态：

```bash
docker exec -it perplexica-ollama-1 ollama list
```

如果需要使用其他模型，可以通过以下命令下载：

```bash
# 进入Ollama容器
docker exec -it perplexica-ollama-1 bash

# 下载其他模型（例如）
ollama pull gemma:2b
```

然后在 config.toml 文件中更新模型名称：

```toml
[MODELS.OLLAMA]
API_URL = "http://ollama:11434"
MODEL_NAME = "gemma:2b"  # 更新为新模型
```

修改后重启后端服务：

```bash
docker compose restart perplexica-backend
```

### 5. Model Settings 配置

在开始使用前，需要在 Perplexica 前端中配置正确的模型提供商：

1. 打开 Perplexica 前端页面 (http://localhost:3000)
2. 点击左侧导航栏底部的 **Settings** 图标
3. 在设置页面中，找到 **Model Settings** 部分
4. 在 **Chat Model Provider** 下拉菜单中选择 **ollama**
5. 在 **Chat Model** 下拉菜单中选择 **llama3.2:1b**
6. 点击 **Save** 保存设置

这样系统将使用本地运行的 Ollama 模型进行对话，无需连接到外部 API。

### 6. Focus 模式配置

在Perplexica前端界面的设置中，您可以配置不同的Focus模式，每种模式可以有不同的参数和行为：

- **通用模式**: 默认的问答模式
- **代码模式**: 专注于代码相关问题
- **学术模式**: 适合学术研究和论文写作
- **SearxNG模式**: 使用网络搜索增强问答能力

### 7. 配置大模型API

如果您需要使用其他API（如OpenAI、Anthropic等），可以编辑`config.toml`文件，填入相应的API密钥：

```bash
# 编辑配置文件
nano config.toml
```

修改后重启后端服务：

```bash
docker compose restart perplexica-backend
```

## 常见问题解决

### 1. Ollama模型下载失败

如果模型下载失败，可以手动下载：

```bash
docker exec -it perplexica-ollama-1 ollama pull llama3.2:1b
```

### 2. 系统资源不足

如果系统运行缓慢，可以考虑使用更轻量级的模型，修改 config.toml：

```toml
[MODELS.OLLAMA]
API_URL = "http://ollama:11434"
MODEL_NAME = "tinyllama"  # 更小的模型
```

### 3. 数据库连接问题

如果前端显示数据库连接错误，可以尝试手动初始化数据库：

```bash
docker exec -it perplexica-perplexica-frontend-1 sh -c "yarn db:setup"
```

## 停止服务

```bash
docker compose down
```

如需同时删除数据卷（将删除所有数据）：

```bash
docker compose down -v
```

## 贡献与反馈

如有问题或建议，请提交Issue或Pull Request。

祝您使用愉快！
