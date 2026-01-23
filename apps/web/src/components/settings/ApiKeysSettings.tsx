/**
 * API Keys Settings Section
 * Container for API keys management UI with hooks integration
 */

"use client";

import { Key } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useAuthenticatedUserWithOrg, useWorkspaceIdOptional } from "@/hooks";
import { locusClient } from "@/lib/api-client";
import { ApiKeyConfirmationModal } from "./ApiKeyConfirmationModal";
import { CreateApiKeyModal } from "./ApiKeyCreatedModal";
import { ApiKeysList } from "./ApiKeysList";
import { ProjectSetupGuide } from "./ProjectSetupGuide";
import { SettingSection } from "./SettingSection";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: Date | string;
  lastUsedAt: Date | string | null;
  active: boolean;
}

export function ApiKeysSettings() {
  const { orgId } = useAuthenticatedUserWithOrg();
  const workspaceId = useWorkspaceIdOptional();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

  // Fetch API keys
  const fetchApiKeys = useCallback(async () => {
    if (!orgId) return;

    setIsLoading(true);
    try {
      const keys = await locusClient.organizations.listApiKeys(orgId);
      setApiKeys(keys);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch API keys"
      );
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

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

      // Add to list
      setApiKeys([...apiKeys, response]);
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
      setApiKeys(apiKeys.filter((key) => key.id !== id));
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
