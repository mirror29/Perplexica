FROM node:18-bullseye-slim

# 安装中文字体和相关依赖
RUN apt-get update && apt-get install -y \
    fonts-noto-cjk \
    # sharp库所需的依赖
    libvips-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3007

CMD ["node", "index.js"]
