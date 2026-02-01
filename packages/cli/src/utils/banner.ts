import { c } from "@locusai/sdk/node";
import { VERSION } from "./version";

/**
 * Print the Locus CLI banner
 */
export function printBanner(): void {
  console.log(
    c.primary(`
 _      ____   ____ _   _  ____
| |    / __ \\ / ___| | | |/ ___|
| |   | |  | | |   | | | |\\___ \\
| |___| |__| | |___| |_| |___) |
|_____|\\____/ \\____|\\___/|____/  ${c.dim(`v${VERSION}`)}
    `)
  );
}
