import { c } from "@locusai/sdk/node";
import { daemonCommand } from "./daemon";

/**
 * Backward-compatible alias for `locus daemon`.
 * Maps: install → start, uninstall → stop, status → status.
 */
export async function serviceCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  // Map old service subcommands to daemon equivalents
  const mapping: Record<string, string> = {
    install: "start",
    uninstall: "stop",
    status: "status",
  };

  const mapped = subcommand ? mapping[subcommand] : undefined;

  if (mapped) {
    console.log(
      `  ${c.dim(`Hint: 'locus service ${subcommand}' is now 'locus daemon ${mapped}'`)}\n`
    );
    await daemonCommand([mapped, ...args.slice(1)]);
  } else {
    // Forward to daemon help
    await daemonCommand(args);
  }
}
