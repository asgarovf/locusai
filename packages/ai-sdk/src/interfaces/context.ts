export interface TaskContext {
  task: {
    id: string;
    description: string;
    acceptanceCriteria?: string[];
    technicalConstraints?: string[];
  };
  project: {
    name: string;
    techStack: string[];
  };
  requirements: {
    title: string;
    content: string;
    sectionId: string;
  };
  dependencies: {
    id: string;
    title: string;
    status: string;
  }[];
  relatedDocs: {
    id: string;
    title: string;
    summary: string;
  }[];
}
