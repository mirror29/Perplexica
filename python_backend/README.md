# Python Redis 缓存后端

该模块提供了一个基于Python的后端服务，集成了Redis缓存功能，用于加速重复查询的响应速度。

## 功能特点

- 使用Redis缓存查询结果
- 支持搜索和对话API接口
- 缓存命中与未命中日志记录
- 可配置的缓存过期时间

## 接口说明

### 1. 搜索接口

- **URL**: `/api/search`
- **方法**: POST
- **请求体**:
  ```json
  {
    "query": "搜索查询",
    "limit": 10
  }
  ```
- **返回**: 搜索结果JSON

### 2. 聊天接口

- **URL**: `/api/chat`
- **方法**: POST
- **请求体**:
  ```json
  {
    "query": "用户问题",
    "context": "上下文信息"
  }
  ```
- **返回**: 回答结果JSON

### 3. 健康检查

- **URL**: `/health`
- **方法**: GET
- **返回**: 服务状态信息

## 环境变量配置

配置通过项目根目录的`.env`文件进行设置：

- `API_URL`: API服务器地址（默认：http://localhost:8000）
- `SEARXNG_API_URL`: SearxNG搜索服务地址（默认：http://localhost:4000）
- `REDIS_HOST`: Redis服务器地址（默认：localhost）
- `REDIS_PORT`: Redis端口（默认：6379）
- `REDIS_DB`: Redis数据库号（默认：0）
- `REDIS_PASSWORD`: Redis密码（默认：无）
- `CACHE_EXPIRATION`: 缓存过期时间（秒，默认：300）

## 本地开发

### 安装依赖

```bash
pip install -r requirements.txt
```

### 启动服务

```bash
uvicorn app:app --reload
```

### 测试缓存效果

```bash
python3 test_cache.py
```

## Docker部署

可使用提供的docker-compose.yaml文件启动整个服务：

```bash
docker-compose up
```

这将启动Python后端服务、Redis及其他相关服务。

## Redis缓存原理

1. 接收到请求后，根据请求参数生成唯一的缓存键
2. 检查Redis中是否存在该键的缓存数据
3. 如存在，直接返回缓存内容（缓存命中）
4. 如不存在，调用相应服务获取结果，并将结果存入Redis（设置过期时间）

Redis配置使用了内存限制（256MB）和LRU（最近最少使用）淘汰策略，以确保缓存不会无限增长。
