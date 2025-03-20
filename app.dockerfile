FROM node:20.18.0-alpine

ARG NEXT_PUBLIC_WS_URL=ws://127.0.0.1:3001
ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:3001/api
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NODE_ENV=development

# Install dependencies for canvas package and other native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pixman-dev \
    pango-dev \
    cairo-dev \
    jpeg-dev \
    giflib-dev

WORKDIR /home/perplexica

COPY ui /home/perplexica/
COPY start-mcp-server.sh /home/perplexica/start-mcp-server

RUN yarn install --frozen-lockfile
RUN npx prisma generate
# Don't build in production mode for development
# RUN yarn build
RUN chmod +x /home/perplexica/start-mcp-server

# Use development server with hot reloading
CMD ["yarn", "dev"]
