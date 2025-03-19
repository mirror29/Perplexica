import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Default Focus Modes
  const defaultModes = [
    {
      name: '通用模式',
      description: 'Default general purpose Q&A mode',
      apiEndpoint: 'http://localhost:3001/api/chat',
      config: {
        temperature: 0.7,
        maxTokens: 1000,
        apiSource: 'backend', // Backend service
        systemPrompt:
          'You are a helpful assistant that provides information on various topics.',
        searchEnabled: true,
        searchSource: 'http://searxng:8080', // SearxNG search service
      },
      isActive: true,
    },
    {
      name: '代码模式',
      description: 'Code-focused mode for programming assistance',
      apiEndpoint: 'http://localhost:3001/api/code',
      config: {
        temperature: 0.3,
        maxTokens: 2000,
        apiSource: 'backend', // Backend service
        systemPrompt:
          'You are a professional programming assistant focused on providing high-quality code help.',
        language: ['python', 'javascript', 'typescript', 'java', 'c++'], // Supported programming languages
        codeExamples: true, // Whether to provide code examples
        searchEnabled: true,
        searchSource: 'http://searxng:8080', // SearxNG search service
      },
      isActive: true,
    },
    {
      name: '学术模式',
      description: 'Academic research and paper writing mode',
      apiEndpoint: 'http://localhost:3001/api/academic',
      config: {
        temperature: 0.5,
        maxTokens: 1500,
        apiSource: 'backend', // Backend service
        systemPrompt:
          'You are a professional academic assistant focused on helping with research and academic writing.',
        citationStyle: 'APA', // Citation format
        academicDatabases: ['scholar', 'pubmed', 'arxiv'], // Supported academic databases
        searchEnabled: true,
        searchSource: 'http://searxng:8080', // SearxNG search service
      },
      isActive: true,
    },
    {
      name: 'SearxNG 模式',
      description: 'Enhanced Q&A mode using SearxNG search engine',
      apiEndpoint: 'http://searxng:8080/search',
      config: {
        temperature: 0.7,
        maxTokens: 1000,
        apiSource: 'searxng', // Direct use of SearxNG
        systemPrompt:
          'You are an intelligent assistant relying on web search to provide up-to-date information.',
        searchEnabled: true,
        searchParams: {
          format: 'json',
          engines: ['google', 'bing', 'duckduckgo'],
          language: 'zh-CN',
          time_range: 'year',
        },
      },
      isActive: true,
    },
  ];

  for (const mode of defaultModes) {
    // First check if a mode with this name already exists
    const existingMode = await prisma.focusMode.findFirst({
      where: { name: mode.name },
    });

    if (existingMode) {
      // If it exists, update it
      await prisma.focusMode.update({
        where: { id: existingMode.id },
        data: mode,
      });
    } else {
      // If it doesn't exist, create a new one
      await prisma.focusMode.create({
        data: mode,
      });
    }
  }

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
