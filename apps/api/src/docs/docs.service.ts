import { CreateDoc, UpdateDoc } from "@locusai/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Doc } from "@/entities/doc.entity";

@Injectable()
export class DocsService {
  constructor(
    @InjectRepository(Doc)
    private readonly docRepository: Repository<Doc>
  ) {}

  async create(data: CreateDoc & { workspaceId: string }): Promise<Doc> {
    const doc = this.docRepository.create(data);
    return this.docRepository.save(doc);
  }

  async findByWorkspace(workspaceId: string): Promise<Doc[]> {
    return this.docRepository.find({
      where: { workspaceId },
      order: { updatedAt: "DESC" },
    });
  }

  async findById(id: string): Promise<Doc> {
    const doc = await this.docRepository.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException("Document not found");
    }
    return doc;
  }

  async update(id: string, updates: UpdateDoc): Promise<Doc> {
    const doc = await this.findById(id);
    Object.assign(doc, updates);
    return this.docRepository.save(doc);
  }

  async delete(id: string): Promise<void> {
    const doc = await this.findById(id);
    await this.docRepository.remove(doc);
  }
}
