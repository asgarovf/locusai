"use client";

import { DocsEditorArea } from "@/components/docs/DocsEditorArea";
import { DocsHeaderActions } from "@/components/docs/DocsHeaderActions";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { PageLayout } from "@/components/PageLayout";
import { useDocs, useGlobalKeydowns } from "@/hooks";

export function Docs() {
  const {
    docs,
    selectedId,
    setSelectedId,
    selectedDoc,
    content,
    setContent,
    hasUnsavedChanges,
    isCreating,
    setIsCreating,
    newFileName,
    setNewFileName,
    selectedTemplate,
    setSelectedTemplate,
    contentMode,
    setContentMode,
    searchQuery,
    setSearchQuery,
    handleSave,
    handleCreateFile,
    handleDelete,
  } = useDocs();

  useGlobalKeydowns({
    onCloseCreateTask: () => {
      if (isCreating) setIsCreating(false);
      else if (selectedId) setSelectedId(null);
    },
  });

  const headerActions = (
    <DocsHeaderActions
      selectedDoc={selectedDoc}
      contentMode={contentMode}
      setContentMode={setContentMode}
      onNewDoc={() => setIsCreating(true)}
      onSave={handleSave}
      hasUnsavedChanges={hasUnsavedChanges}
    />
  );

  const headerStats = (
    <div className="flex items-center gap-2">
      <span className="text-primary font-bold">{docs.length} documents</span>
      {selectedDoc && (
        <>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span className="font-mono text-[10px] uppercase tracking-tighter opacity-70">
            {selectedId}
          </span>
        </>
      )}
    </div>
  );

  return (
    <PageLayout
      title="Library"
      description={headerStats}
      actions={headerActions}
      contentClassName="p-0 flex h-full gap-6 overflow-hidden pt-2 pb-6"
    >
      <DocsSidebar
        docs={docs}
        selectedId={selectedId}
        onSelect={setSelectedId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isCreating={isCreating}
        setIsCreating={setIsCreating}
        newFileName={newFileName}
        setNewFileName={setNewFileName}
        selectedTemplate={selectedTemplate}
        onTemplateSelect={setSelectedTemplate}
        onCreateFile={handleCreateFile}
        onDelete={handleDelete}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <DocsEditorArea
          selectedDoc={selectedDoc}
          content={content}
          onContentChange={setContent}
          contentMode={contentMode}
          onNewDoc={() => setIsCreating(true)}
        />
      </main>
    </PageLayout>
  );
}
