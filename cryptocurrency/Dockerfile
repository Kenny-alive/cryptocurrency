# Используем официальный образ Node.js
FROM node:18

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы в контейнер
COPY . .

# Открываем порт (он должен совпадать с тем, что использует Express)
EXPOSE 3000

# Запускаем сервер
CMD ["node", "express.js"]
