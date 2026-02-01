"use client";

import { DocsEditorArea } from "@/components/docs/DocsEditorArea";
import { DocsHeaderActions } from "@/components/docs/DocsHeaderActions";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { PageLayout } from "@/components/PageLayout";
import { useDocs } from "@/hooks";

export function Docs() {
  const {
    allDocs,
    groups,
    docsByGroup,
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
    selectedGroupId,
    setSelectedGroupId,
    handleSave,
    handleCreateFile,
    handleDelete,
    handleCreateGroup,
    handleGroupChange,
    handleDuplicate,
    handleRename,
    handleCreateWithTemplate,
    handleDeleteGroup,
    handleRenameGroup,
  } = useDocs();

  const headerActions = (
    <DocsHeaderActions
      selectedDoc={selectedDoc}
      contentMode={contentMode}
      setContentMode={setContentMode}
      onSave={handleSave}
      hasUnsavedChanges={hasUnsavedChanges}
      groups={groups}
      onGroupChange={handleGroupChange}
    />
  );

  const headerStats = (
    <div className="flex items-center gap-2">
      <span className="text-primary font-bold">{allDocs.length} documents</span>
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
      title="Documentation"
      description={headerStats}
      actions={headerActions}
      contentClassName="p-0 flex h-full gap-6 overflow-hidden pt-2 pb-6"
    >
      <DocsSidebar
        groups={groups}
        allDocs={allDocs}
        docsByGroup={docsByGroup}
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
        onCreateGroup={handleCreateGroup}
        selectedGroupId={selectedGroupId}
        onGroupSelect={setSelectedGroupId}
        onDuplicate={handleDuplicate}
        onRename={handleRename}
        onReorder={handleGroupChange}
        onDeleteGroup={handleDeleteGroup}
        onRenameGroup={handleRenameGroup}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <DocsEditorArea
          selectedDoc={selectedDoc}
          content={content}
          onContentChange={setContent}
          contentMode={contentMode}
          onCreateWithTemplate={handleCreateWithTemplate}
        />
      </main>
    </PageLayout>
  );
}
