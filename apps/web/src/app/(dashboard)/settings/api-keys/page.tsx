"use client";

import { PageLayout } from "@/components/PageLayout";
import { ApiKeysSettings } from "@/components/settings";

export default function ApiKeysPage() {
  return (
    <PageLayout
      title="API Keys"
      description="Manage your API keys for CLI authentication and integrations."
    >
      <div className="max-w-5xl">
        <ApiKeysSettings />
      </div>
    </PageLayout>
  );
}
