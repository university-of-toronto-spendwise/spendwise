FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5174

# Bind-mount overwrites /app; anonymous volume keeps node_modules. Run install on start so
# new dependencies in package.json (e.g. recharts) are present without manual exec.
CMD ["sh", "-c", "npm install && npm run dev -- --host"]