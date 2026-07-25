# Two-stage build: Astro static site compiled in `build`, served by a plain
# nginx:alpine image with no Node runtime in `runtime`. `output: 'static'`
# means no @astrojs/node adapter is needed and none is installed here.

FROM node:lts AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
