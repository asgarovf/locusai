/**
 * API Keys Settings Section
 * Container for API keys management UI with hooks integration
 */

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Key } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import {
  useApiKeysQuery,
  useAuthenticatedUserWithOrg,
  useWorkspaceIdOptional,
} from "@/hooks";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { ApiKeyConfirmationModal } from "./ApiKeyConfirmationModal";
import { CreateApiKeyModal } from "./ApiKeyCreatedModal";
import { ApiKeysList } from "./ApiKeysList";
import { ProjectSetupGuide } from "./ProjectSetupGuide";
import { SettingSection } from "./SettingSection";

export function ApiKeysSettings() {
  const { orgId } = useAuthenticatedUserWithOrg();
  const workspaceId = useWorkspaceIdOptional();
  const queryClient = useQueryClient();
  const { data: apiKeys = [], isLoading } = useApiKeysQuery();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

  const handleCreateApiKey = async (name: string) => {
    if (!orgId) return;

    try {
      const response = await locusClient.organizations.createApiKey(
        orgId,
        name
      );
      setNewApiKey(response.key);
      setNewKeyName(name);
      setIsConfirmationModalOpen(true);
      setIsCreateModalOpen(false);

      // Invalidate cache
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.apiKeys(orgId),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create API key"
      );
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!orgId) return;

    try {
      await locusClient.organizations.deleteApiKey(orgId, id);
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.apiKeys(orgId),
      });
      toast.success("API key deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete API key"
      );
    }
  };

  return (
    <>
      <SettingSection title="API Keys" className="mb-8">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Key size={18} className="text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Manage API Keys</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use API keys for CLI authentication and external integrations
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            New Key
          </Button>
        </div>

        <ApiKeysList
          apiKeys={apiKeys}
          isLoading={isLoading}
          onDelete={handleDeleteApiKey}
        />
      </SettingSection>

      <ProjectSetupGuide
        hasApiKeys={apiKeys.length > 0}
        workspaceId={workspaceId || undefined}
      />

      <CreateApiKeyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateApiKey}
      />

      <ApiKeyConfirmationModal
        isOpen={isConfirmationModalOpen}
        apiKey={newApiKey}
        keyName={newKeyName}
        onClose={() => {
          setIsConfirmationModalOpen(false);
          setNewApiKey(null);
          setNewKeyName("");
        }}
      />
    </>
  );
}
