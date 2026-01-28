import { IDocProvider } from "@locusai/ai-sdk/src/tools/interfaces";
import { CreateDoc, Doc } from "@locusai/shared";
import { DocsService } from "../../docs/docs.service";

export class DocAdapter implements IDocProvider {
  constructor(private readonly docsService: DocsService) {}

  async create(workspaceId: string, data: CreateDoc): Promise<Doc> {
    return this.docsService.create({ ...data, workspaceId });
  }

  async update(
    id: string,
    _workspaceId: string,
    data: Partial<CreateDoc>
  ): Promise<Doc> {
    return this.docsService.update(id, data);
  }

  async list(workspaceId: string): Promise<Doc[]> {
    const allDocuments = await this.docsService.findByWorkspace(workspaceId);
    return allDocuments.filter((doc) => doc.group?.name !== "Artifacts");
  }

  async getById(id: string, _workspaceId: string): Promise<Doc> {
    return this.docsService.findById(id);
  }
}
