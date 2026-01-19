/**
 * Base Drizzle Repository
 *
 * Provides safe access to the Drizzle database instance.
 */

import type { DrizzleDB } from "../db/index.js";

export abstract class DrizzleRepository {
  constructor(protected readonly db: DrizzleDB) {}
}
