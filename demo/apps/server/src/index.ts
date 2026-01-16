import { APP_NAME } from "@demo/shared";

const server = Bun.serve({
  port: 3000,
  fetch() {
    return new Response(`Welcome to ${APP_NAME}`);
  },
});

console.log(`Server running at http://localhost:${server.port}`);
