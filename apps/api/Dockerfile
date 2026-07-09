FROM node:20-alpine
WORKDIR /app/apps/api

COPY apps/api/package.json ./package.json
RUN npm install

# Shared types artık src/shared-types.ts içinde — dışarıdan kopyalamaya gerek yok
COPY apps/api/src          ./src
COPY apps/api/tsconfig.json ./tsconfig.json
COPY apps/api/nest-cli.json ./nest-cli.json

RUN ./node_modules/.bin/nest build

RUN mkdir -p ./uploads

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main"]
