/**
 * Singleton CommandTracker instance for the Telegram bot.
 *
 * All types and the class itself are imported directly from @locusai/locus-gateway.
 */

import { CommandTracker } from "@locusai/locus-gateway";

export const commandTracker = new CommandTracker();
