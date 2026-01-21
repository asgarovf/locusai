import { CreateArtifact } from "@locusai/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Artifact, Task } from "@/entities";

@Injectable()
export class ArtifactsService {
  constructor(
    @InjectRepository(Artifact)
    private readonly artifactRepository: Repository<Artifact>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>
  ) {}

  async create(data: CreateArtifact, userId: string): Promise<Artifact> {
    const task = await this.taskRepository.findOne({
      where: { id: data.taskId },
    });
    if (!task) {
      throw new NotFoundException("Task not found");
    }

    const artifact = this.artifactRepository.create({
      taskId: data.taskId,
      type: data.type,
      title: data.title,
      contentText: data.contentText,
      createdBy: userId,
    });

    return this.artifactRepository.save(artifact);
  }

  async findById(id: string): Promise<Artifact> {
    const artifact = await this.artifactRepository.findOne({ where: { id } });
    if (!artifact) {
      throw new NotFoundException("Artifact not found");
    }
    return artifact;
  }

  async listByTask(taskId: string): Promise<Artifact[]> {
    return this.artifactRepository.find({
      where: { taskId },
      order: { createdAt: "DESC" },
    });
  }

  async delete(id: string): Promise<void> {
    const artifact = await this.findById(id);
    await this.artifactRepository.remove(artifact);
  }
}
