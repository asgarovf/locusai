import type {
  DBSprint,
  SprintRepository,
} from "../repositories/sprint.repository.js";

export class SprintService {
  constructor(private sprintRepo: SprintRepository) {}

  getAllSprints() {
    return this.sprintRepo.findAll();
  }

  getSprintById(id: number | string) {
    return this.sprintRepo.findById(id);
  }

  createSprint(name: string) {
    return this.sprintRepo.create(name);
  }

  updateSprint(id: number | string, updates: Partial<DBSprint>) {
    this.sprintRepo.update(id, updates);
  }

  getActiveSprint() {
    return this.sprintRepo.findActive();
  }
}
