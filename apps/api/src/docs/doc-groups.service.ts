import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DocGroup } from "@/entities/doc-group.entity";

@Injectable()
export class DocGroupsService {
  constructor(
    @InjectRepository(DocGroup)
    private readonly docGroupRepository: Repository<DocGroup>
  ) {}

  async findAll(workspaceId: string): Promise<DocGroup[]> {
    return this.docGroupRepository.find({
      where: { workspaceId },
      order: { order: "ASC", createdAt: "ASC" },
    });
  }

  async findById(id: string): Promise<DocGroup> {
    const group = await this.docGroupRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException("Document group not found");
    }
    return group;
  }

  async create(data: {
    name: string;
    workspaceId: string;
    order?: number;
  }): Promise<DocGroup> {
    const group = this.docGroupRepository.create(data);
    return this.docGroupRepository.save(group);
  }

  async update(id: string, updates: Partial<DocGroup>): Promise<DocGroup> {
    const group = await this.findById(id);
    Object.assign(group, updates);
    return this.docGroupRepository.save(group);
  }

  async delete(id: string): Promise<void> {
    const group = await this.findById(id);
    await this.docGroupRepository.remove(group);
  }
}
