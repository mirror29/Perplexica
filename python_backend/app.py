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
    response: str = None
    messages: list = []  # 修改sources为messages


# 辅助函数：生成Redis键
def generate_cache_key(model_type: str, **kwargs):
    """生成一个唯一的缓存键"""
    # 仅使用查询文本作为键，忽略其他参数以增加命中率
    if "query" in kwargs:
        query = kwargs["query"].strip().lower()  # 规范化查询文本
        return f"{model_type}:{query}"
    else:
        # 合并所有参数并排序以确保相同的参数始终生成相同的键
        sorted_items = sorted(kwargs.items())
        parameter_str = "&".join(f"{k}={v}" for k, v in sorted_items)
        # 添加模型类型前缀
        return f"{model_type}:{parameter_str}"


# 辅助函数：格式化message对象使其符合前端期望的格式
def format_message(title, url, content):
    """格式化message对象为前端期望的格式"""
    return {
        "pageContent": content,
        "metadata": {"title": title, "url": url, "snippet": content},
    }


# 路由：健康检查
@app.get("/health")
def health_check():
    """健康检查端点"""
    redis_status = "UP" if redis_client.ping() else "DOWN"
    return {"status": "healthy", "redis": redis_status, "timestamp": time.time()}


# 路由：搜索
@app.post("/api/search")
async def search(request: SearchRequest):
    # 规范化查询文本
    query = request.query.strip()

    # 为搜索请求生成一个唯一的缓存键 - 使用规范化的查询文本
    cache_key = generate_cache_key("search", query=query, limit=request.limit)
    logger.info(f"Generated cache key for search query: {query}, key: {cache_key}")

    # 尝试从Redis获取缓存的结果
    cached_result = redis_client.get(cache_key)

    if cached_result:
        # 缓存命中
        logger.info(f"Cache HIT for search query: {query}")
        try:
            result = json.loads(cached_result)
            # 确保前端知道这是缓存结果
            result["fromCache"] = True
            logger.info(f"Returning cached search result")
            return result
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding cached search result: {e}")
            # 缓存数据损坏，删除并继续处理
            redis_client.delete(cache_key)

    # 缓存未命中
    logger.info(f"Cache MISS for search query: {query}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{SEARXNG_API_URL}/search",
                params={
                    "q": query,
                    "format": "json",
                    "engines": "google",
                    "limit": request.limit,
                },
            )
            response.raise_for_status()
            result = response.json()

            # 添加fromCache标记
            result["fromCache"] = False

            # 标准化为messages格式，如果API返回的是旧格式
            if "sources" in result and not "messages" in result:
                result["messages"] = result["sources"]

            # 将结果存储到Redis，设置过期时间
            cached_json = json.dumps(result, ensure_ascii=False)
            redis_client.setex(cache_key, CACHE_EXPIRATION, cached_json)
            logger.info(f"Saved search results to Redis cache with key: {cache_key}")

            return result
        except httpx.RequestError as e:
            logger.error(f"Error fetching search results: {str(e)}")
            raise HTTPException(status_code=500, detail="Error fetching search results")


# 路由：聊天
@app.post("/api/chat")
async def chat(request: ChatRequest):
    # 简化参数处理逻辑 - 只需要query参数
    # 其他参数设为可选，用于保存结果到缓存
    query = request.query.strip()  # 去除首尾空格
    context = request.context or ""

    # 为聊天请求生成一个唯一的缓存键 - 仅使用query参数
    cache_key = generate_cache_key("chat", query=query)
    logger.info(f"Generated cache key for query: {query}, key: {cache_key}")

    # 尝试从Redis获取缓存的结果
    cached_result = redis_client.get(cache_key)

    if cached_result:
        # 缓存命中
        logger.info(f"Cache HIT for chat query: {query}")
        try:
            result = json.loads(cached_result)
            # 显式设置fromCache标记，确保前端能识别
            result["fromCache"] = True

            # 打印调试信息
            logger.info(
                f"Returning cached result with id: {result.get('id', 'unknown')}"
            )

            # 确保id字段存在
            if "id" not in result:
                result["id"] = str(uuid.uuid4())

            # 确保messages字段存在且格式正确
            if "messages" not in result or not isinstance(result["messages"], list):
                result["messages"] = []
                # 尝试从sources字段兼容转换
                if "sources" in result and isinstance(result["sources"], list):
                    result["messages"] = result["sources"]
                    del result["sources"]

            # 确保context字段存在
            if "context" not in result:
                result["context"] = context

            # 确保每个message对象具有正确的结构
            for message in result["messages"]:
                if isinstance(message, dict):
                    if "pageContent" not in message:
                        message["pageContent"] = "No content available"
                    if "metadata" not in message or not isinstance(
                        message["metadata"], dict
                    ):
                        message["metadata"] = {
                            "title": "来自缓存的结果",
                            "url": "#",
                            "snippet": message.get("pageContent", ""),
                        }

            return result
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding cached result: {e}")
            # 缓存数据损坏，删除并继续处理
            redis_client.delete(cache_key)

    # 缓存未命中
    logger.info(f"Cache MISS for chat query: {query}")

    # 如果前端传入了response参数，说明是将AI回复保存到缓存
    if request.response:
        logger.info(f"Saving response from frontend to cache for query: {query}")

        # 创建结果对象
        cache_data = {
            "response": request.response,
            "id": str(uuid.uuid4()),
            "fromCache": False,
            "messages": [],
            "context": context,
        }

        # 处理前端传入的messages
        if request.messages:
            for message in request.messages:
                if isinstance(message, dict):
                    if "pageContent" not in message:
                        message["pageContent"] = "No content available"
                    if "metadata" not in message or not isinstance(
                        message["metadata"], dict
                    ):
                        message["metadata"] = {
                            "title": "未命名来源",
                            "url": "#",
                            "snippet": message.get("pageContent", ""),
                        }
                    cache_data["messages"].append(message)
        # 兼容旧版的sources参数
        elif hasattr(request, "sources") and request.sources:
            for source in request.sources:
                if isinstance(source, dict):
                    if "pageContent" not in source:
                        source["pageContent"] = "No content available"
                    if "metadata" not in source or not isinstance(
                        source["metadata"], dict
                    ):
                        source["metadata"] = {
                            "title": "未命名来源",
                            "url": "#",
                            "snippet": source.get("pageContent", ""),
                        }
                    cache_data["messages"].append(source)

        # 存储到Redis缓存 - 确保以UTF-8编码的JSON字符串存储
        cached_json = json.dumps(cache_data, ensure_ascii=False)
        redis_client.setex(cache_key, CACHE_EXPIRATION, cached_json)

        logger.info(f"Saved response to Redis cache with key: {cache_key}")

        # 返回保存成功的响应
        return {
            "status": "success",
            "message": "Response saved to cache",
            "id": cache_data["id"],
        }

    # 调用 SearxNG 搜索，并构建结果
    searxng_results = {}
    messages = []

    try:
        # 调用 SearxNG 搜索API
        async with httpx.AsyncClient() as client:
            search_response = await client.get(
                f"{SEARXNG_API_URL}/search",
                params={
                    "q": query,
                    "format": "json",
                    "engines": "google",
                    "limit": 5,  # 限制结果数量
                },
            )
            search_response.raise_for_status()
            searxng_results = search_response.json()

            # 处理搜索结果，提取messages
            if "results" in searxng_results and isinstance(
                searxng_results["results"], list
            ):
                for item in searxng_results["results"]:
                    content = (
                        item.get("content", "")
                        or item.get("snippet", "")
                        or "No content available"
                    )
                    title = item.get("title", "相关结果")
                    url = item.get("url", "#")
                    message = format_message(title, url, content)
                    messages.append(message)
                logger.info(f"Extracted {len(messages)} messages from SearxNG results")
    except Exception as e:
        logger.error(f"Error fetching search results from SearxNG: {str(e)}")

    # 根据上下文生成回复
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    response_id = str(uuid.uuid4())

    # 创建回复内容（这里简化为一个基于查询的模拟回复）
    response_text = f"这是对查询 '{query}' 的回复。(生成时间: {timestamp})"

    # 为回复添加引用标记，以便前端渲染
    if messages and len(messages) > 0:
        response_text += "\n\n以下是一些相关信息："
        for i, message in enumerate(messages):
            response_text += f"\n- [{i+1}] {message['metadata']['title']}"

    # 生成context内容
    context_content = json.dumps(searxng_results)

    # 构建完整的响应对象
    response_data = {
        "id": response_id,
        "response": response_text,
        "fromCache": False,
        "messages": messages,  # 改用messages字段代替sources
        "context": context_content,  # 添加context字段
        "timestamp": timestamp,
    }

    # 将结果存入Redis缓存
    cached_json = json.dumps(response_data, ensure_ascii=False)
    redis_client.setex(cache_key, CACHE_EXPIRATION, cached_json)

    logger.info(f"Saved search results to Redis cache with key: {cache_key}")

    return response_data


# 主程序入口
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
