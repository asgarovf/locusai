import { parseArgs } from "node:util";
import { DEFAULT_MODEL } from "@locusai/sdk/node";
import { SettingsManager } from "../settings-manager";
import { requireInitialization, resolveProvider } from "../utils";

export async function startCommand(args: string[] = []): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      model: { type: "string" },
      provider: { type: "string" },
      dir: { type: "string" },
      session: { type: "string", short: "s" },
    },
    strict: false,
  });

  const projectPath = (values.dir as string) || process.cwd();

  requireInitialization(projectPath, "start");

  const settings = new SettingsManager(projectPath).load();

  const provider = resolveProvider(
    (values.provider as string) || settings.provider
  );
  const model =
    (values.model as string | undefined) ||
    settings.model ||
    DEFAULT_MODEL[provider];
  const sessionId = values.session as string | undefined;

  const { InteractiveREPL } = await import("../repl/interactive-repl");

  const repl = new InteractiveREPL({
    projectPath,
    provider,
    model,
    settings,
    sessionId,
  });

  await repl.start();
}
