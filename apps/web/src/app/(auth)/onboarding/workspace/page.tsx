"use client";

import { Button, Input } from "@/components/ui";
import { useWorkspaceCreateForm } from "@/hooks/useWorkspaceCreateForm";

export default function OnboardingWorkspacePage() {
  const { name, isLoading, setName, handleSubmit } = useWorkspaceCreateForm();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Create your workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          You need at least one workspace to get started.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace Name
          </label>
          <Input
            placeholder="e.g. Acme Corp, My Projects"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!name.trim() || isLoading}
        >
          {isLoading ? "Creating..." : "Get Started"}
        </Button>
      </form>
    </div>
  );
}
