import { DependencyScanJob, LintScanJob, TestScanJob, TodoScanJob } from "./scans/index.js";
import { JobRegistry } from "./job-registry.js";

export function createDefaultRegistry(): JobRegistry {
  const registry = new JobRegistry();
  registry.register(new LintScanJob());
  registry.register(new DependencyScanJob());
  registry.register(new TodoScanJob());
  registry.register(new TestScanJob());
  return registry;
}
