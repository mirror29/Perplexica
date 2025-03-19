#!/usr/bin/env python3
import requests
import time
import logging
import json
import os

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("test_cache.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("test-redis-cache")

# 从环境变量中读取API地址
API_URL = os.getenv("API_URL", "http://localhost:8000")


def test_search_cache():
    """测试搜索API的缓存效果"""
    query = "python redis cache example"
    endpoint = f"{API_URL}/api/search"

    # 第一次请求（预期缓存未命中）
    logger.info(f"发送第一次/api/search搜索请求: {query}")
    start_time = time.time()
    response = requests.post(endpoint, json={"query": query})
    first_request_time = time.time() - start_time

    if response.status_code == 200:
        logger.info(f"第一次请求响应时间: {first_request_time:.4f}秒")

        # 记录SearxNG返回的搜索结果（只记录前3条结果）
        search_results = response.json()
        if "results" in search_results:
            results_count = len(search_results["results"])
            logger.info(f"搜索结果总数: {results_count}")
            for i, result in enumerate(search_results["results"][:3]):
                logger.info(
                    f"结果 {i+1}: {result.get('title', 'N/A')} - {result.get('url', 'N/A')}"
                )
        else:
            logger.info(
                f"搜索返回结果: {json.dumps(search_results, indent=2, ensure_ascii=False)[:500]}..."
            )

        # 等待一下，确保请求完全处理
        time.sleep(1)

        # 第二次请求（预期缓存命中）
        logger.info(f"发送第二次相同/api/search搜索请求: {query}")
        start_time = time.time()
        response = requests.post(endpoint, json={"query": query})
        second_request_time = time.time() - start_time

        if response.status_code == 200:
            logger.info(f"第二次请求响应时间: {second_request_time:.4f}秒")
            logger.info(f"性能提升: {(first_request_time / second_request_time):.2f}倍")
        else:
            logger.error(f"第二次请求失败: {response.status_code} - {response.text}")
    else:
        logger.error(f"第一次请求失败: {response.status_code} - {response.text}")


def test_chat_cache():
    """测试聊天API的缓存效果"""
    query = "解释Redis缓存的工作原理"
    context = "技术讨论"
    endpoint = f"{API_URL}/api/chat"

    # 第一次请求（预期缓存未命中）
    logger.info(f"发送第一次/api/chat聊天请求: {query}")
    start_time = time.time()
    response = requests.post(endpoint, json={"query": query, "context": context})
    first_request_time = time.time() - start_time

    if response.status_code == 200:
        logger.info(f"第一次请求响应时间: {first_request_time:.4f}秒")

        # 记录聊天API的响应内容
        chat_result = response.json()
        logger.info(
            f"聊天API响应: {json.dumps(chat_result, indent=2, ensure_ascii=False)}"
        )

        # 等待一下，确保请求完全处理
        time.sleep(1)

        # 第二次请求（预期缓存命中）
        logger.info(f"发送第二次相同/api/chat聊天请求: {query}")
        start_time = time.time()
        response = requests.post(endpoint, json={"query": query, "context": context})
        second_request_time = time.time() - start_time

        if response.status_code == 200:
            logger.info(f"第二次请求响应时间: {second_request_time:.4f}秒")
            logger.info(f"性能提升: {(first_request_time / second_request_time):.2f}倍")
        else:
            logger.error(f"第二次请求失败: {response.status_code} - {response.text}")
    else:
        logger.error(f"第一次请求失败: {response.status_code} - {response.text}")


def test_health():
    """测试健康检查端点"""
    endpoint = f"{API_URL}/health"
    logger.info("检查API健康状态")

    try:
        response = requests.get(endpoint)
        if response.status_code == 200:
            logger.info(f"API状态: {json.dumps(response.json(), indent=2)}")
        else:
            logger.error(f"健康检查失败: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"无法连接到API: {str(e)}")


if __name__ == "__main__":
    logger.info("=== 开始测试Redis缓存效果 ===")

    # 测试健康检查
    test_health()

    # 测试搜索缓存
    test_search_cache()

    # 测试聊天缓存
    test_chat_cache()

    logger.info("=== 测试完成 ===")
