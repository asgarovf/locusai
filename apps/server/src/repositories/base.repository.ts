import type { Database } from "bun:sqlite";

export abstract class BaseRepository {
  constructor(protected db: Database) {}
}
