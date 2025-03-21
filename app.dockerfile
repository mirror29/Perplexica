FROM node:20.18.0-alpine

ARG NEXT_PUBLIC_WS_URL=ws://127.0.0.1:3001
ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api
ARG NEXT_PUBLIC_MCP_SERVER_URL=http://mcp-server:3007

ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_MCP_SERVER_URL=${NEXT_PUBLIC_MCP_SERVER_URL}
ENV DATABASE_URL=postgresql://perplexica:perplexica123@postgres:5432/perplexica?schema=public

WORKDIR /home/perplexica

COPY ui /home/perplexica/

RUN yarn install --frozen-lockfile
# 仅生成Prisma客户端，不连接数据库
RUN npx prisma generate
RUN yarn build

CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && yarn start"]
# CMD ["yarn", "start"]
