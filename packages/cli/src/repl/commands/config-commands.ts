import {
  c,
  DEFAULT_MODEL,
  getModelsForProvider,
  isValidModelForProvider,
  PROVIDER,
  type Provider,
} from "@locusai/sdk/node";
import type { REPLSession, SlashCommand } from "../slash-commands";

const KNOWN_PROVIDERS = Object.values(PROVIDER);

function showProviderInfo(session: REPLSession): void {
  const current = session.getProvider();
  console.log(`\n  ${c.dim("Current provider:")} ${c.bold(current)}`);
  console.log(`  ${c.dim("Available providers:")} ${KNOWN_PROVIDERS.join(", ")}\n`);
}

function switchProvider(session: REPLSession, name: string): void {
  const normalized = name.toLowerCase();

  if (!KNOWN_PROVIDERS.includes(normalized as Provider)) {
    console.log(`\n  ${c.error(`Unknown provider: ${name}`)}`);
    console.log(`  ${c.dim("Available providers:")} ${KNOWN_PROVIDERS.join(", ")}\n`);
    return;
  }

  const provider = normalized as Provider;
  const defaultModel = DEFAULT_MODEL[provider];
  session.setProvider(provider);
  session.setModel(defaultModel);
  console.log(`\n  ${c.success(`Switched to provider: ${provider}`)} ${c.dim(`(model: ${defaultModel})`)}\n`);
}

function showModelInfo(session: REPLSession): void {
  const current = session.getModel();
  const provider = session.getProvider();
  const models = getModelsForProvider(provider);
  console.log(`\n  ${c.dim("Current model:")} ${c.bold(current)}`);
  console.log(`  ${c.dim(`Available models (${provider}):`)} ${models.join(", ")}\n`);
}

function switchModel(session: REPLSession, name: string): void {
  const provider = session.getProvider();

  if (!isValidModelForProvider(provider, name)) {
    const models = getModelsForProvider(provider);
    console.log(`\n  ${c.error(`Unknown model: ${name}`)}`);
    console.log(`  ${c.dim(`Available models (${provider}):`)} ${models.join(", ")}\n`);
    return;
  }

  session.setModel(name);
  console.log(`\n  ${c.success(`Switched to model: ${name}`)}\n`);
}

export const providerCommand: SlashCommand = {
  name: "provider",
  aliases: [],
  description: "Show or switch AI provider",
  usage: "/provider [name]",
  category: "config",
  execute: (session: REPLSession, args?: string) => {
    if (!args || args.trim() === "") {
      showProviderInfo(session);
    } else {
      switchProvider(session, args.trim());
    }
  },
};

export const modelCommand: SlashCommand = {
  name: "model",
  aliases: [],
  description: "Show or switch AI model",
  usage: "/model [name]",
  category: "config",
  execute: (session: REPLSession, args?: string) => {
    if (!args || args.trim() === "") {
      showModelInfo(session);
    } else {
      switchModel(session, args.trim());
    }
  },
};
