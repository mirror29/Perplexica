from fastapi import FastAPI, HTTPException, Request
import httpx
import redis
import json
import logging
import os
import uuid
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()],
)
logger = logging.getLogger("perplexica-redis-cache")

# 创建FastAPI应用
app = FastAPI(title="Perplexica Python Backend with Redis Cache")

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis配置
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
CACHE_EXPIRATION = int(os.getenv("CACHE_EXPIRATION", "300"))  # 5分钟默认过期时间

# SearxNG配置
SEARXNG_API_URL = os.getenv("SEARXNG_API_URL", "http://localhost:4000")

# 连接Redis
redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=REDIS_DB,
    password=REDIS_PASSWORD,
    decode_responses=True,
)


# 请求模型
class SearchRequest(BaseModel):
    query: str
    limit: int = 10


class ChatRequest(BaseModel):
    query: str
    context: str = ""


# 辅助函数：生成Redis键
def generate_cache_key(model_type: str, **kwargs):
    """生成一个唯一的缓存键"""
    # 合并所有参数并排序以确保相同的参数始终生成相同的键
    sorted_items = sorted(kwargs.items())
    parameter_str = "&".join(f"{k}={v}" for k, v in sorted_items)
    # 添加模型类型前缀
    return f"{model_type}:{parameter_str}"


# 路由：健康检查
@app.get("/health")
def health_check():
    """健康检查端点"""
    redis_status = "UP" if redis_client.ping() else "DOWN"
    return {"status": "healthy", "redis": redis_status, "timestamp": time.time()}


# 路由：搜索
@app.post("/api/search")
async def search(request: SearchRequest):
    # 为搜索请求生成一个唯一的缓存键
    cache_key = generate_cache_key("search", query=request.query, limit=request.limit)

    # 尝试从Redis获取缓存的结果
    cached_result = redis_client.get(cache_key)

    if cached_result:
        # 缓存命中
        logger.info(f"Cache HIT for search query: {request.query}")
        return json.loads(cached_result)

    # 缓存未命中，从SearxNG获取结果
    logger.info(f"Cache MISS for search query: {request.query}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{SEARXNG_API_URL}/search",
                params={
                    "q": request.query,
                    "format": "json",
                    "engines": "google",
                    "limit": request.limit,
                },
            )
            response.raise_for_status()
            result = response.json()

            # 将结果存储到Redis，设置过期时间
            redis_client.setex(cache_key, CACHE_EXPIRATION, json.dumps(result))

            return result
        except httpx.RequestError as e:
            logger.error(f"Error fetching search results: {str(e)}")
            raise HTTPException(status_code=500, detail="Error fetching search results")


# 路由：聊天
@app.post("/api/chat")
async def chat(request: ChatRequest):
    # 为聊天请求生成一个唯一的缓存键
    cache_key = generate_cache_key("chat", query=request.query, context=request.context)

    # 尝试从Redis获取缓存的结果
    cached_result = redis_client.get(cache_key)

    if cached_result:
        # 缓存命中
        logger.info(f"Cache HIT for chat query: {request.query}")
        return json.loads(cached_result)

    # 缓存未命中，模拟调用AI服务获取回答
    # 这里只是模拟，实际项目中应该集成真实的AI服务
    logger.info(f"Cache MISS for chat query: {request.query}")

    # 模拟处理时间
    time.sleep(1)

    # 生成响应（在实际应用中，应该调用真实的AI服务）
    result = {
        "id": str(uuid.uuid4()),
        "query": request.query,
        "response": f"This is a simulated response to: {request.query}",
        "timestamp": time.time(),
    }

    # 将结果存储到Redis，设置过期时间
    redis_client.setex(cache_key, CACHE_EXPIRATION, json.dumps(result))

    return result


# 主程序入口
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
