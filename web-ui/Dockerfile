# Этап сборки React-приложения
FROM node:20 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Передаём переменные окружения как ARG
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL

# Передаём их также в окружение (для React build-time)
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_WS_URL=${REACT_APP_WS_URL}

RUN npm run build

# Этап Nginx-сервера
FROM nginx:alpine

# Кастомный конфиг nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем билд
COPY --from=build /app/build /usr/share/nginx/html
