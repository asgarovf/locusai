#!/usr/bin/env node
export {};

const { main } = await import("./index.js");
const { handleCommandError } = await import("./errors.js");

main(process.argv.slice(2)).catch((error) => {
  handleCommandError(error);
});
