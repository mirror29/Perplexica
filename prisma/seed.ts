import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 创建默认的 Focus 模式
  const defaultModes = [
    {
      name: '通用模式',
      description: '默认的通用问答模式',
      apiEndpoint: 'http://localhost:3000/api/chat',
      config: {
        temperature: 0.7,
        maxTokens: 1000,
      },
      isActive: true,
    },
    {
      name: '代码模式',
      description: '专注于代码相关问题的模式',
      apiEndpoint: 'http://localhost:3000/api/chat',
      config: {
        temperature: 0.3,
        maxTokens: 2000,
        systemPrompt: '你是一个专业的编程助手，专注于提供高质量的代码相关帮助。',
      },
      isActive: true,
    },
    {
      name: '学术模式',
      description: '专注于学术研究和论文写作的模式',
      apiEndpoint: 'http://localhost:3000/api/chat',
      config: {
        temperature: 0.5,
        maxTokens: 1500,
        systemPrompt: '你是一个专业的学术助手，专注于提供学术研究和论文写作的帮助。',
      },
      isActive: true,
    },
  ];

  for (const mode of defaultModes) {
    await prisma.focusMode.upsert({
      where: { name: mode.name },
      update: mode,
      create: mode,
    });
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
