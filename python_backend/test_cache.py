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


# 辅助函数：打印分隔线
def print_separator(title="", char="=", length=80):
    """打印分隔线，可选中间显示标题"""
    if title:
        side_length = (length - len(title) - 2) // 2
        logger.info(f"{char * side_length} {title} {char * side_length}")
    else:
        logger.info(char * length)


# 辅助函数：格式化输出JSON数据
def print_json(title, data, indent=2):
    """格式化输出JSON数据"""
    logger.info(f"【{title}】")
    logger.info(json.dumps(data, indent=indent, ensure_ascii=False))


# 辅助函数：计算缓存键
def calculate_cache_key(model_type, query):
    """模拟后端生成的缓存键"""
    query = query.strip().lower()  # 规范化查询文本
    return f"{model_type}:{query}"


def test_search_cache():
    """测试搜索API的缓存效果"""
    print_separator("搜索API缓存测试开始")
    query = "python redis cache example"
    endpoint = f"{API_URL}/api/search"

    # 计算预期的缓存键
    expected_cache_key = calculate_cache_key("search", query)
    logger.info(f"预期的缓存键: {expected_cache_key}")

    # 第一次请求（预期缓存未命中）
    logger.info(f"📤 发送第一次/api/search搜索请求: {query}")
    start_time = time.time()
    response = requests.post(endpoint, json={"query": query})
    first_request_time = time.time() - start_time

    if response.status_code == 200:
        logger.info(f"⏱️ 第一次请求响应时间: {first_request_time:.4f}秒")

        # 记录SearxNG返回的搜索结果
        search_results = response.json()
        print_separator("第一次请求响应详情", "-")
        logger.info(
            f"🔍 缓存状态: {'✅ 命中' if search_results.get('fromCache') else '❌ 未命中'}"
        )

        # 打印基本信息
        logger.info(f"🔤 查询: {search_results.get('query')}")
        logger.info(f"📝 响应: {search_results.get('response')}")
        logger.info(f"🆔 ID: {search_results.get('id')}")

        # 打印messages信息
        # 兼容处理：优先检查messages字段，如果不存在则尝试sources字段
        messages = search_results.get("messages", search_results.get("sources", []))
        logger.info(f"📚 Messages数量: {len(messages)}")

        if messages:
            print_separator("Messages详细信息", "-")
            for i, message in enumerate(messages[:3]):  # 只打印前3个
                logger.info(f"📄 Message {i+1}:")
                logger.info(f"  📑 内容: {message.get('pageContent', 'N/A')[:100]}...")
                metadata = message.get("metadata", {})
                logger.info(f"  📌 标题: {metadata.get('title', 'N/A')}")
                logger.info(f"  🔗 URL: {metadata.get('url', 'N/A')}")
                if i < 2 and i < len(messages) - 1:  # 不是最后一个
                    logger.info("-" * 40)  # 小分隔线

        # 打印context信息
        if "context" in search_results:
            logger.info(f"🔄 上下文: {search_results.get('context')[:50]}...")

        # 打印原始results信息
        if "results" in search_results:
            results = search_results.get("results", [])
            print_separator("原始搜索结果", "-")
            logger.info(f"🔢 原始结果数量: {len(results)}")
            for i, result in enumerate(results[:3]):  # 只打印前3个
                logger.info(f"🔍 结果 {i+1}: {result.get('title', 'N/A')}")
                logger.info(f"  🔗 URL: {result.get('url', 'N/A')}")
                if "content" in result:
                    logger.info(f"  📑 内容: {result.get('content', 'N/A')[:100]}...")
                if i < 2 and i < len(results) - 1:  # 不是最后一个
                    logger.info("-" * 40)  # 小分隔线

        # 等待一下，确保请求完全处理
        time.sleep(1)

        # 第二次请求（预期缓存命中）
        print_separator("第二次搜索请求", "-")
        logger.info(f"📤 发送第二次相同/api/search搜索请求: {query}")
        start_time = time.time()
        response = requests.post(endpoint, json={"query": query})
        second_request_time = time.time() - start_time

        if response.status_code == 200:
            logger.info(f"⏱️ 第二次请求响应时间: {second_request_time:.4f}秒")
            logger.info(
                f"⚡ 性能提升: {(first_request_time / second_request_time):.2f}倍"
            )

            # 验证第二次请求是否命中缓存
            second_results = response.json()
            logger.info(
                f"🔍 第二次请求缓存状态: {'✅ 命中' if second_results.get('fromCache') else '❌ 未命中'}"
            )

            # 验证messages是否一致
            second_messages = second_results.get(
                "messages", second_results.get("sources", [])
            )
            logger.info(f"📚 第二次请求Messages数量: {len(second_messages)}")
            if len(messages) == len(second_messages):
                logger.info("✅ 两次请求返回的messages数量一致")
            else:
                logger.warning(
                    f"⚠️ 两次请求返回的messages数量不一致: {len(messages)} vs {len(second_messages)}"
                )
        else:
            logger.error(f"❌ 第二次请求失败: {response.status_code} - {response.text}")
    else:
        logger.error(f"❌ 第一次请求失败: {response.status_code} - {response.text}")

    print_separator("搜索API缓存测试结束")


def test_chat_cache():
    """测试聊天API的缓存效果"""
    print_separator("聊天API缓存测试开始")
    query = "解释Redis缓存的工作原理"
    context = "技术讨论"
    endpoint = f"{API_URL}/api/chat"

    # 计算预期的缓存键
    expected_cache_key = calculate_cache_key("chat", query)
    logger.info(f"预期的缓存键: {expected_cache_key}")

    # 第一次请求（预期缓存未命中）
    logger.info(f"📤 发送第一次/api/chat聊天请求: {query}")
    start_time = time.time()
    response = requests.post(endpoint, json={"query": query, "context": context})
    first_request_time = time.time() - start_time

    if response.status_code == 200:
        logger.info(f"⏱️ 第一次请求响应时间: {first_request_time:.4f}秒")

        # 详细记录聊天API的响应内容
        chat_result = response.json()
        print_separator("第一次聊天请求响应详情", "-")
        logger.info(
            f"🔍 缓存状态: {'✅ 命中' if chat_result.get('fromCache') else '❌ 未命中'}"
        )

        # 打印基本信息
        logger.info(f"🔤 查询: {chat_result.get('query')}")
        logger.info(f"📝 响应: {chat_result.get('response')}")
        logger.info(
            f"🔄 上下文: {chat_result.get('context', '')[:50]}..."
        )  # 添加截断显示
        logger.info(f"🆔 ID: {chat_result.get('id')}")

        # 打印messages信息
        messages = chat_result.get("messages", chat_result.get("sources", []))
        logger.info(f"📚 Messages数量: {len(messages)}")

        if messages:
            print_separator("Messages详细信息", "-")
            for i, message in enumerate(messages):
                logger.info(f"📄 Message {i+1}:")
                logger.info(f"  📑 内容: {message.get('pageContent', 'N/A')[:100]}...")
                metadata = message.get("metadata", {})
                logger.info(f"  📌 标题: {metadata.get('title', 'N/A')}")
                logger.info(f"  🔗 URL: {metadata.get('url', 'N/A')}")
                if i < len(messages) - 1:  # 不是最后一个
                    logger.info("-" * 40)  # 小分隔线

        # 等待一下，确保请求完全处理
        time.sleep(1)

        # 第二次请求（预期缓存命中）
        print_separator("第二次聊天请求", "-")
        logger.info(f"📤 发送第二次相同/api/chat聊天请求: {query}")
        start_time = time.time()
        response = requests.post(endpoint, json={"query": query, "context": context})
        second_request_time = time.time() - start_time

        if response.status_code == 200:
            logger.info(f"⏱️ 第二次请求响应时间: {second_request_time:.4f}秒")
            logger.info(
                f"⚡ 性能提升: {(first_request_time / second_request_time):.2f}倍"
            )

            # 验证第二次请求是否命中缓存
            second_result = response.json()
            logger.info(
                f"🔍 第二次请求缓存状态: {'✅ 命中' if second_result.get('fromCache') else '❌ 未命中'}"
            )

            # 验证messages是否一致
            second_messages = second_result.get(
                "messages", second_result.get("sources", [])
            )
            logger.info(f"📚 第二次请求Messages数量: {len(second_messages)}")
            if len(messages) == len(second_messages):
                logger.info("✅ 两次请求返回的messages数量一致")
            else:
                logger.warning(
                    f"⚠️ 两次请求返回的messages数量不一致: {len(messages)} vs {len(second_messages)}"
                )
        else:
            logger.error(f"❌ 第二次请求失败: {response.status_code} - {response.text}")
    else:
        logger.error(f"❌ 第一次请求失败: {response.status_code} - {response.text}")

    print_separator("聊天API缓存测试结束")


# 测试带有SearxNG格式context的聊天请求
def test_chat_with_searxng_context():
    """测试带有SearxNG结果作为context的聊天API"""
    print_separator("带SearxNG上下文的聊天API测试")
    query = "Python Redis缓存优化"
    # 创建一个模拟的SearxNG结果作为context
    context_data = {
        "results": [
            {
                "title": "Redis缓存最佳实践",
                "url": "https://example.com/redis-cache",
                "content": "Redis是一个高性能的键值存储数据库，常用于缓存...",
            },
            {
                "title": "Python Redis客户端使用指南",
                "url": "https://example.com/python-redis",
                "content": "在Python中使用Redis进行缓存可以显著提高应用性能...",
            },
        ]
    }

    # 打印将要发送的context
    print_separator("SearxNG模拟数据", "-")
    logger.info("📦 SearxNG模拟数据:")
    print_json("Results", context_data["results"])

    context = json.dumps(context_data)
    endpoint = f"{API_URL}/api/chat"

    # 计算预期的缓存键
    expected_cache_key = calculate_cache_key("chat", query)
    logger.info(f"预期的缓存键: {expected_cache_key}")

    logger.info(f"📤 发送带有SearxNG context的聊天请求: {query}")
    response = requests.post(endpoint, json={"query": query, "context": context})

    if response.status_code == 200:
        chat_result = response.json()
        print_separator("响应详情", "-")
        logger.info(
            f"🔍 缓存状态: {'✅ 命中' if chat_result.get('fromCache') else '❌ 未命中'}"
        )

        # 打印基本信息
        logger.info(f"🔤 查询: {chat_result.get('query')}")
        logger.info(f"📝 响应: {chat_result.get('response')}")
        logger.info(f"🔄 上下文: {chat_result.get('context', '')[:50]}...")

        # 打印messages信息，验证是否从context中提取
        messages = chat_result.get("messages", chat_result.get("sources", []))
        logger.info(f"📚 从SearxNG context提取的Messages数量: {len(messages)}")

        if messages:
            print_separator("提取的Messages详情", "-")
            for i, message in enumerate(messages):
                logger.info(f"📄 Message {i+1}:")
                logger.info(f"  📑 内容: {message.get('pageContent', 'N/A')}")
                metadata = message.get("metadata", {})
                logger.info(f"  📌 标题: {metadata.get('title', 'N/A')}")
                logger.info(f"  🔗 URL: {metadata.get('url', 'N/A')}")
                if i < len(messages) - 1:  # 不是最后一个
                    logger.info("-" * 40)  # 小分隔线
        else:
            logger.warning("⚠️ 未从context中提取到messages")
    else:
        logger.error(f"❌ 请求失败: {response.status_code} - {response.text}")

    print_separator("带SearxNG上下文的测试结束")


def test_health():
    """测试健康检查端点"""
    print_separator("API健康检查")
    endpoint = f"{API_URL}/health"
    logger.info("🔍 检查API健康状态")

    try:
        response = requests.get(endpoint)
        if response.status_code == 200:
            health_data = response.json()
            logger.info(f"✅ API状态: healthy")
            logger.info(f"💾 Redis状态: {health_data.get('redis', 'unknown')}")
            logger.info(f"⏱️ 时间戳: {health_data.get('timestamp', 'unknown')}")
        else:
            logger.error(f"❌ 健康检查失败: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"❌ 无法连接到API: {str(e)}")

    print_separator("健康检查结束")


# 测试保存聊天响应到缓存
def test_save_chat_response():
    """测试将聊天响应保存到缓存"""
    print_separator("测试保存聊天响应到缓存")
    query = "如何优化Python应用程序的性能"
    response_text = "优化Python应用程序性能的几种方法：1. 使用适当的数据结构; 2. 利用缓存减少计算; 3. 使用异步编程..."
    messages = [
        {
            "pageContent": "Python性能优化指南",
            "metadata": {
                "title": "Python性能优化最佳实践",
                "url": "https://example.com/python-optimization",
                "snippet": "本文介绍了多种Python性能优化的方法和技巧...",
            },
        }
    ]
    context = "技术讨论"

    endpoint = f"{API_URL}/api/chat"

    # 计算预期的缓存键
    expected_cache_key = calculate_cache_key("chat", query)
    logger.info(f"预期的缓存键: {expected_cache_key}")

    logger.info(f"📤 发送保存聊天响应请求: {query}")
    response = requests.post(
        endpoint,
        json={
            "query": query,
            "response": response_text,
            "messages": messages,
            "context": context,
        },
    )

    if response.status_code == 200:
        result = response.json()
        logger.info(f"✅ 响应保存成功")
        logger.info(f"🆔 响应ID: {result.get('id')}")
        logger.info(f"📝 状态: {result.get('status')}")
        logger.info(f"💬 消息: {result.get('message')}")

        # 验证缓存是否生效
        logger.info("🔍 验证缓存是否生效...")
        time.sleep(1)  # 等待缓存写入完成

        verify_response = requests.post(endpoint, json={"query": query})

        if verify_response.status_code == 200:
            verify_result = verify_response.json()
            logger.info(
                f"🔍 缓存验证状态: {'✅ 命中' if verify_result.get('fromCache') else '❌ 未命中'}"
            )
            logger.info(f"📝 缓存的响应: {verify_result.get('response')}")
            logger.info(
                f"📚 缓存的Messages数量: {len(verify_result.get('messages', []))}"
            )

            # 故意用稍有不同的查询再次尝试，测试缓存是否采取了宽松的匹配策略
            logger.info("🔍 使用稍有不同的查询验证缓存机制的健壮性...")
            slightly_different_query = query + "  "  # 添加额外空格
            second_verify_response = requests.post(
                endpoint, json={"query": slightly_different_query}
            )

            if second_verify_response.status_code == 200:
                second_verify_result = second_verify_response.json()
                logger.info(
                    f"🔍 宽松匹配缓存状态: {'✅ 命中' if second_verify_result.get('fromCache') else '❌ 未命中'}"
                )
        else:
            logger.error(
                f"❌ 缓存验证失败: {verify_response.status_code} - {verify_response.text}"
            )
    else:
        logger.error(f"❌ 保存响应失败: {response.status_code} - {response.text}")

    print_separator("保存聊天响应测试结束")


if __name__ == "__main__":
    print_separator("Redis缓存效果测试", "=", 100)
    logger.info("🚀 开始执行测试...")

    # 测试健康检查
    test_health()

    # 测试搜索缓存
    test_search_cache()

    # 测试聊天缓存
    test_chat_cache()

    # 测试带有SearxNG格式context的聊天请求
    test_chat_with_searxng_context()

    # 测试保存聊天响应到缓存
    test_save_chat_response()

    print_separator("测试完成", "=", 100)
    logger.info("✅ 所有测试已完成!")
