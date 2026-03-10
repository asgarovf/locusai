#!/usr/bin/env node
export {};

const { main } = await import("./index.js");

main(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exit(1);
});
