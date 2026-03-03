#!/usr/bin/env node

import { main } from "./index.js";

main(process.argv.slice(2)).catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
