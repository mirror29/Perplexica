'use client';

import { useEffect, useRef, useState } from 'react';
import { Document } from '@langchain/core/documents';
import Navbar from './Navbar';
import Chat from './Chat';
import EmptyChat from './EmptyChat';
import crypto from 'crypto';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { getSuggestions } from '@/lib/actions';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import NextError from 'next/error';
import { Message, File, MessageSource } from '@/types/MessageTypes';

// Python后端API URL常量
const PYTHON_BACKEND_URL =
  process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000';

export type { Message, File };

// 适配Document类型为MessageSource
interface DocumentWithTitle extends Document {
  title: string;
  metadata: {
    url: string;
    date?: string;
    snippet?: string;
  };
}

// 转换Document到MessageSource的函数
const convertDocumentToMessageSource = (doc: Document): MessageSource => {
  return {
    title: (doc as any).title || '未命名文档',
    metadata: {
      url: (doc as any).metadata?.url || '',
      date: (doc as any).metadata?.date,
      snippet: (doc as any).metadata?.snippet,
    },
  };
};

const useSocket = (
  url: string,
  setIsWSReady: (ready: boolean) => void,
  setError: (error: boolean) => void,
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const isCleaningUpRef = useRef(false);
  const MAX_RETRIES = 3;
  const INITIAL_BACKOFF = 1000; // 1 second
  const isConnectionErrorRef = useRef(false);

  const getBackoffDelay = (retryCount: number) => {
    return Math.min(INITIAL_BACKOFF * Math.pow(2, retryCount), 10000); // Cap at 10 seconds
  };

  useEffect(() => {
    const connectWs = async () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      try {
        let chatModel = localStorage.getItem('chatModel');
        let chatModelProvider = localStorage.getItem('chatModelProvider');
        let embeddingModel = localStorage.getItem('embeddingModel');
        let embeddingModelProvider = localStorage.getItem(
          'embeddingModelProvider',
        );

        const autoImageSearch = localStorage.getItem('autoImageSearch');
        const autoVideoSearch = localStorage.getItem('autoVideoSearch');

        if (!autoImageSearch) {
          localStorage.setItem('autoImageSearch', 'true');
        }

        if (!autoVideoSearch) {
          localStorage.setItem('autoVideoSearch', 'false');
        }

        const providers = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/models`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ).then(async (res) => {
          if (!res.ok)
            throw new Error(
              `Failed to fetch models: ${res.status} ${res.statusText}`,
            );
          return res.json();
        });

        if (
          !chatModel ||
          !chatModelProvider ||
          !embeddingModel ||
          !embeddingModelProvider
        ) {
          if (!chatModel || !chatModelProvider) {
            const chatModelProviders = providers.chatModelProviders;

            chatModelProvider =
              chatModelProvider || Object.keys(chatModelProviders)[0];

            chatModel = Object.keys(chatModelProviders[chatModelProvider])[0];

            if (
              !chatModelProviders ||
              Object.keys(chatModelProviders).length === 0
            )
              return toast.error('No chat models available');
          }

          if (!embeddingModel || !embeddingModelProvider) {
            const embeddingModelProviders = providers.embeddingModelProviders;

            if (
              !embeddingModelProviders ||
              Object.keys(embeddingModelProviders).length === 0
            )
              return toast.error('No embedding models available');

            embeddingModelProvider = Object.keys(embeddingModelProviders)[0];
            embeddingModel = Object.keys(
              embeddingModelProviders[embeddingModelProvider],
            )[0];
          }

          localStorage.setItem('chatModel', chatModel!);
          localStorage.setItem('chatModelProvider', chatModelProvider);
          localStorage.setItem('embeddingModel', embeddingModel!);
          localStorage.setItem(
            'embeddingModelProvider',
            embeddingModelProvider,
          );
        } else {
          const chatModelProviders = providers.chatModelProviders;
          const embeddingModelProviders = providers.embeddingModelProviders;

          if (
            Object.keys(chatModelProviders).length > 0 &&
            !chatModelProviders[chatModelProvider]
          ) {
            const chatModelProvidersKeys = Object.keys(chatModelProviders);
            chatModelProvider =
              chatModelProvidersKeys.find(
                (key) => Object.keys(chatModelProviders[key]).length > 0,
              ) || chatModelProvidersKeys[0];

            localStorage.setItem('chatModelProvider', chatModelProvider);
          }

          if (
            chatModelProvider &&
            !chatModelProviders[chatModelProvider][chatModel]
          ) {
            chatModel = Object.keys(
              chatModelProviders[
                Object.keys(chatModelProviders[chatModelProvider]).length > 0
                  ? chatModelProvider
                  : Object.keys(chatModelProviders)[0]
              ],
            )[0];
            localStorage.setItem('chatModel', chatModel);
          }

          if (
            Object.keys(embeddingModelProviders).length > 0 &&
            !embeddingModelProviders[embeddingModelProvider]
          ) {
            embeddingModelProvider = Object.keys(embeddingModelProviders)[0];
            localStorage.setItem(
              'embeddingModelProvider',
              embeddingModelProvider,
            );
          }

          if (
            embeddingModelProvider &&
            !embeddingModelProviders[embeddingModelProvider][embeddingModel]
          ) {
            embeddingModel = Object.keys(
              embeddingModelProviders[embeddingModelProvider],
            )[0];
            localStorage.setItem('embeddingModel', embeddingModel);
          }
        }

        const wsURL = new URL(url);
        const searchParams = new URLSearchParams({});

        searchParams.append('chatModel', chatModel!);
        searchParams.append('chatModelProvider', chatModelProvider);

        if (chatModelProvider === 'custom_openai') {
          searchParams.append(
            'openAIApiKey',
            localStorage.getItem('openAIApiKey')!,
          );
          searchParams.append(
            'openAIBaseURL',
            localStorage.getItem('openAIBaseURL')!,
          );
        }

        searchParams.append('embeddingModel', embeddingModel!);
        searchParams.append('embeddingModelProvider', embeddingModelProvider);

        wsURL.search = searchParams.toString();

        const ws = new WebSocket(wsURL.toString());
        wsRef.current = ws;

        const timeoutId = setTimeout(() => {
          if (ws.readyState !== 1) {
            toast.error(
              'Failed to connect to the server. Please try again later.',
            );
          }
        }, 10000);

        ws.addEventListener('message', (e) => {
          const data = JSON.parse(e.data);
          if (data.type === 'signal' && data.data === 'open') {
            const interval = setInterval(() => {
              if (ws.readyState === 1) {
                setIsWSReady(true);
                setError(false);
                if (retryCountRef.current > 0) {
                  toast.success('Connection restored.');
                }
                retryCountRef.current = 0;
                clearInterval(interval);
              }
            }, 5);
            clearTimeout(timeoutId);
            console.debug(new Date(), 'ws:connected');
          }
          if (data.type === 'error') {
            isConnectionErrorRef.current = true;
            setError(true);
            toast.error(data.data);
          }
        });

        ws.onerror = () => {
          clearTimeout(timeoutId);
          setIsWSReady(false);
          toast.error('WebSocket connection error.');
        };

        ws.onclose = () => {
          clearTimeout(timeoutId);
          setIsWSReady(false);
          console.debug(new Date(), 'ws:disconnected');
          if (!isCleaningUpRef.current && !isConnectionErrorRef.current) {
            toast.error('Connection lost. Attempting to reconnect...');
            attemptReconnect();
          }
        };
      } catch (error) {
        console.debug(new Date(), 'ws:error', error);
        setIsWSReady(false);
        attemptReconnect();
      }
    };

    const attemptReconnect = () => {
      retryCountRef.current += 1;

      if (retryCountRef.current > MAX_RETRIES) {
        console.debug(new Date(), 'ws:max_retries');
        setError(true);
        toast.error(
          'Unable to connect to server after multiple attempts. Please refresh the page to try again.',
        );
        return;
      }

      const backoffDelay = getBackoffDelay(retryCountRef.current);
      console.debug(
        new Date(),
        `ws:retry attempt=${retryCountRef.current}/${MAX_RETRIES} delay=${backoffDelay}ms`,
      );

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        connectWs();
      }, backoffDelay);
    };

    connectWs();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
        isCleaningUpRef.current = true;
        console.debug(new Date(), 'ws:cleanup');
      }
    };
  }, [url, setIsWSReady, setError]);

  return wsRef.current;
};

const loadMessages = async (
  chatId: string,
  setMessages: (messages: Message[]) => void,
  setIsMessagesLoaded: (loaded: boolean) => void,
  setChatHistory: (history: [string, string][]) => void,
  setFocusMode: (mode: string) => void,
  setNotFound: (notFound: boolean) => void,
  setFiles: (files: File[]) => void,
  setFileIds: (fileIds: string[]) => void,
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/chats/${chatId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  if (res.status === 404) {
    setNotFound(true);
    setIsMessagesLoaded(true);
    return;
  }

  const data = await res.json();

  const messages = data.messages.map((msg: any) => {
    const metadata = JSON.parse(msg.metadata || '{}');
    return {
      ...msg,
      ...metadata,
      createdAt: metadata.createdAt ? new Date(metadata.createdAt) : new Date(),
    };
  }) as Message[];

  setMessages(messages);

  const history = messages.map((msg) => {
    return [msg.role, msg.content];
  }) as [string, string][];

  console.debug(new Date(), 'app:messages_loaded');

  document.title = messages[0].content;

  const files = data.chat.files.map((file: any) => {
    return {
      fileName: file.name,
      fileExtension: file.name.split('.').pop(),
      fileId: file.fileId,
    };
  });

  setFiles(files);
  setFileIds(files.map((file: File) => file.fileId));

  setChatHistory(history);
  setFocusMode(data.chat.focusMode);
  setIsMessagesLoaded(true);
};

const ChatWindow = ({ id }: { id?: string }) => {
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get('q');

  const [chatId, setChatId] = useState<string | undefined>(id);
  const [newChatCreated, setNewChatCreated] = useState(false);

  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const [isWSReady, setIsWSReady] = useState(false);
  const ws = useSocket(
    process.env.NEXT_PUBLIC_WS_URL!,
    setIsWSReady,
    setHasError,
  );

  const [loading, setLoading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);

  const [chatHistory, setChatHistory] = useState<[string, string][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [fileIds, setFileIds] = useState<string[]>([]);

  // 添加chatHistoryRef引用，用于追踪最新的聊天历史
  const chatHistoryRef = useRef<[string, string][]>([]);

  const [focusMode, setFocusMode] = useState('webSearch');
  const [optimizationMode, setOptimizationMode] = useState('speed');

  const [isMessagesLoaded, setIsMessagesLoaded] = useState(false);

  const [notFound, setNotFound] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (
      chatId &&
      !newChatCreated &&
      !isMessagesLoaded &&
      messages.length === 0
    ) {
      loadMessages(
        chatId,
        setMessages,
        setIsMessagesLoaded,
        setChatHistory,
        setFocusMode,
        setNotFound,
        setFiles,
        setFileIds,
      );
    } else if (!chatId) {
      setNewChatCreated(true);
      setIsMessagesLoaded(true);
      setChatId(crypto.randomBytes(20).toString('hex'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (ws?.readyState === 1) {
        ws.close();
        console.debug(new Date(), 'ws:cleanup');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 添加一个effect来更新chatHistoryRef
  useEffect(() => {
    chatHistoryRef.current = chatHistory;
    // 记录聊天历史更新，便于调试
    console.debug(new Date(), 'chat_history:updated', chatHistory);
  }, [chatHistory]);

  useEffect(() => {
    if (isMessagesLoaded && isWSReady) {
      setIsReady(true);
      console.debug(new Date(), 'app:ready');
    } else {
      setIsReady(false);
    }
  }, [isMessagesLoaded, isWSReady]);

  const sendMessage = async (message: string, messageId?: string) => {
    if (loading) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      toast.error('Cannot send message while disconnected');
      return;
    }

    setLoading(true);
    setMessageAppeared(false);

    let sources: MessageSource[] | undefined = undefined;
    let recievedMessage = '';
    let added = false;

    messageId = messageId ?? crypto.randomBytes(7).toString('hex');

    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message,
        }),
      });

      if (response.ok) {
        const cacheResult = await response.json();

        if (cacheResult && cacheResult.response) {
          // 缓存命中，直接使用缓存结果
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              content: message,
              messageId: messageId,
              chatId: chatId!,
              role: 'user',
              createdAt: new Date(),
            },
            {
              content: cacheResult.response,
              messageId:
                cacheResult.id || crypto.randomBytes(7).toString('hex'),
              chatId: chatId!,
              role: 'assistant',
              messages: cacheResult.messages || [],
              context: cacheResult.context || '',
              fromCache: cacheResult.fromCache || true,
              createdAt: new Date(),
            },
          ]);

          // 更新聊天历史
          setChatHistory((prevHistory) => {
            const lastTwoEntries = prevHistory.slice(-2);
            const isPairExist =
              lastTwoEntries.length === 2 &&
              lastTwoEntries[0][0] === 'human' &&
              lastTwoEntries[0][1] === message &&
              lastTwoEntries[1][0] === 'assistant' &&
              lastTwoEntries[1][1] === cacheResult.response;

            return isPairExist
              ? prevHistory
              : [
                  ...prevHistory,
                  ['human', message],
                  ['assistant', cacheResult.response],
                ];
          });

          setLoading(false);
          setMessageAppeared(true);

          // 确保chatHistory正确更新 - 等待下一个事件循环
          setTimeout(() => {
            console.debug(
              'Verifying chat history after cache hit:',
              chatHistoryRef.current,
            );
            const hasUserMsg = chatHistoryRef.current.some(
              (entry) => entry[0] === 'human' && entry[1] === message,
            );
            const hasAssistantMsg = chatHistoryRef.current.some(
              (entry) =>
                entry[0] === 'assistant' && entry[1] === cacheResult.response,
            );

            if (!hasUserMsg || !hasAssistantMsg) {
              console.debug(
                'Fixing missing chat history entries after cache hit',
              );
              setChatHistory((prev) => {
                const updatedHistory = [...prev];
                if (!hasUserMsg) {
                  updatedHistory.push(['human', message]);
                }
                if (!hasAssistantMsg) {
                  updatedHistory.push(['assistant', cacheResult.response]);
                }
                return updatedHistory;
              });
            }
          }, 0);

          return;
        }
      }
    } catch (error) {
      console.error('Error checking cache:', error);
      // 如果缓存检查失败，继续使用WebSocket连接
    }

    // 如果没有命中缓存，继续使用WebSocket连接
    ws.send(
      JSON.stringify({
        type: 'message',
        message: {
          messageId: messageId,
          chatId: chatId!,
          content: message,
        },
        files: fileIds,
        focusMode: focusMode,
        optimizationMode: optimizationMode,
      }),
    );

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        content: message,
        messageId: messageId,
        chatId: chatId!,
        role: 'user',
        createdAt: new Date(),
      },
    ]);

    const messageHandler = async (e: MessageEvent) => {
      const data = JSON.parse(e.data);

      if (data.type === 'error') {
        toast.error(data.data);
        setLoading(false);
        return;
      }

      if (data.type === 'sources') {
        // 使用类型断言确保类型安全
        sources = (data.data || []).map((doc: any) =>
          convertDocumentToMessageSource(doc),
        );

        if (!added) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              content: '',
              messageId: messageId!,
              chatId: chatId!,
              role: 'assistant',
              messages: sources,
              createdAt: new Date(),
            },
          ]);
          added = true;
        }
        setMessageAppeared(true);
      }

      if (data.type === 'message') {
        if (!added) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              content: data.data,
              messageId: data.messageId,
              chatId: chatId!,
              role: 'assistant',
              messages: sources,
              createdAt: new Date(),
            },
          ]);
          added = true;
        }

        setMessages((prev) =>
          prev.map((message) => {
            if (message.messageId === data.messageId) {
              return { ...message, content: message.content + data.data };
            }

            return message;
          }),
        );

        recievedMessage += data.data;
        setMessageAppeared(true);
      }

      if (data.type === 'messageEnd') {
        ws?.removeEventListener('message', messageHandler);
        setLoading(false);

        const lastMsg = messagesRef.current[messagesRef.current.length - 1];

        // 保存结果到Redis缓存，简化存储逻辑
        try {
          const response = await fetch(`${PYTHON_BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: message,
              response: recievedMessage,
              messages: sources || [],
              context: '', // 添加context字段
            }),
          });

          const cacheResult = await response.json();
          console.log('Saved to Redis cache', cacheResult);
        } catch (error) {
          console.error('Error saving to cache:', error);
        }

        if (
          lastMsg.role === 'assistant' &&
          lastMsg.messages &&
          lastMsg.messages.length > 0 &&
          !lastMsg.suggestions
        ) {
          const suggestions = await getSuggestions(messagesRef.current);
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.messageId === lastMsg.messageId) {
                return { ...msg, suggestions: suggestions };
              }
              return msg;
            }),
          );
        }

        const autoImageSearch = localStorage.getItem('autoImageSearch');
        const autoVideoSearch = localStorage.getItem('autoVideoSearch');

        if (autoImageSearch === 'true') {
          document.getElementById('search-images')?.click();
        }

        if (autoVideoSearch === 'true') {
          document.getElementById('search-videos')?.click();
        }
      }
    };

    ws?.addEventListener('message', messageHandler);
  };

  const rewrite = (messageId: string) => {
    const index = messages.findIndex((msg) => msg.messageId === messageId);

    if (index === -1) return;

    const message = messages[index - 1];

    setMessages((prev) => {
      return [...prev.slice(0, messages.length > 2 ? index - 1 : 0)];
    });
    setChatHistory((prev) => {
      return [...prev.slice(0, messages.length > 2 ? index - 1 : 0)];
    });

    sendMessage(message.content, message.messageId);
  };

  useEffect(() => {
    if (isReady && initialMessage && ws?.readyState === 1) {
      sendMessage(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws?.readyState, isReady, initialMessage, isWSReady]);

  if (hasError) {
    return (
      <div className="relative">
        <div className="absolute w-full flex flex-row items-center justify-end mr-5 mt-5">
          <Link href="/settings">
            <Settings className="cursor-pointer lg:hidden" />
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="dark:text-white/70 text-black/70 text-sm">
            Failed to connect to the server. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return isReady ? (
    notFound ? (
      <NextError statusCode={404} />
    ) : (
      <div>
        {messages.length > 0 ? (
          <>
            <Navbar chatId={chatId!} messages={messages} />
            <Chat
              loading={loading}
              messages={messages}
              sendMessage={sendMessage}
              messageAppeared={messageAppeared}
              rewrite={rewrite}
              fileIds={fileIds}
              setFileIds={setFileIds}
              files={files}
              setFiles={setFiles}
            />
          </>
        ) : (
          <EmptyChat
            sendMessage={sendMessage}
            focusMode={focusMode}
            setFocusMode={setFocusMode}
            optimizationMode={optimizationMode}
            setOptimizationMode={setOptimizationMode}
            fileIds={fileIds}
            setFileIds={setFileIds}
            files={files}
            setFiles={setFiles}
          />
        )}
      </div>
    )
  ) : (
    <div className="flex flex-row items-center justify-center min-h-screen">
      <svg
        aria-hidden="true"
        className="w-8 h-8 text-light-200 fill-light-secondary dark:text-[#202020] animate-spin dark:fill-[#ffffff3b]"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
    </div>
  );
};

export default ChatWindow;
