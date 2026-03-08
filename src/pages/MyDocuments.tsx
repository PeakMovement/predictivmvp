import { FileText, Filter, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentUploadZone } from '@/components/documents/DocumentUploadZone';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';
import { DocumentVersionHistoryModal } from '@/components/documents/DocumentVersionHistoryModal';
import { DocumentSearchFilters, DocumentSearchFilters as SearchFiltersType } from '@/components/documents/DocumentSearchFilters';
import { useDocuments, UserDocument } from '@/hooks/useDocuments';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayoutCustomization } from '@/hooks/useLayoutCustomization';
import { CustomizeLayoutButton } from '@/components/layout/CustomizeLayoutButton';
import { LayoutEditor } from '@/components/layout/LayoutEditor';
import { LayoutBlock } from '@/components/layout/LayoutBlock';

const MyDocuments = () => {
  const { documents, loading, uploading, uploadDocument, deleteDocument, refetch } = useDocuments();
  const [activeFilter, setActiveFilter] = useState<'all' | 'nutrition' | 'medical' | 'training'>('all');
  const [searchFilters, setSearchFilters] = useState<SearchFiltersType>({});
  const [previewDocument, setPreviewDocument] = useState<UserDocument | null>(null);
  const [historyDocument, setHistoryDocument] = useState<UserDocument | null>(null);
  const navigate = useNavigate();

  // Layout customization
  const {
    isEditing: isLayoutEditing,
    editingSections,
    isCustomized: layoutCustomized,
    previewMode,
    openEditor: openLayoutEditor,
    closeEditor: closeLayoutEditor,
    saveLayout,
    resetToDefault,
    toggleSectionVisibility,
    toggleCollapseByDefault,
    togglePreviewMode,
    moveSectionUp,
    moveSectionDown,
    reorderSections,
    isSectionVisible,
  } = useLayoutCustomization('docs');

  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    if (activeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === activeFilter);
    }

    if (searchFilters.documentType && searchFilters.documentType !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === searchFilters.documentType);
    }

    if (searchFilters.processingStatus && searchFilters.processingStatus !== 'all') {
      filtered = filtered.filter(doc => doc.processing_status === searchFilters.processingStatus);
    }

    if (searchFilters.query) {
      const query = searchFilters.query.toLowerCase();
      filtered = filtered.filter(doc => {
        return (
          doc.file_name.toLowerCase().includes(query) ||
          doc.ai_summary?.toLowerCase().includes(query) ||
          doc.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      });
    }

    if (searchFilters.dateFrom) {
      filtered = filtered.filter(doc =>
        new Date(doc.uploaded_at) >= searchFilters.dateFrom!
      );
    }

    if (searchFilters.dateTo) {
      const endOfDay = new Date(searchFilters.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(doc =>
        new Date(doc.uploaded_at) <= endOfDay
      );
    }

    return filtered;
  }, [documents, activeFilter, searchFilters]);

  const documentCounts = {
    nutrition: documents.filter(d => d.document_type === 'nutrition').length,
    medical: documents.filter(d => d.document_type === 'medical').length,
    training: documents.filter(d => d.document_type === 'training').length,
  };

  const handleClearFilters = () => {
    setSearchFilters({});
    setActiveFilter('all');
  };

  const handleVersionRestored = () => {
    refetch();
  };

  return (
    <div className="container mx-auto p-4 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            My Documents
          </h1>
          <p className="text-muted-foreground">
            Upload your health documents for AI powered insights
          </p>
        </div>
        <CustomizeLayoutButton onClick={openLayoutEditor} isCustomized={layoutCustomized} />
      </div>

      {/* Layout Editor */}
      {isLayoutEditing && (
        <div className="animate-fade-in">
          <LayoutEditor
            sections={editingSections}
            previewMode={previewMode}
            onSave={saveLayout}
            onCancel={closeLayoutEditor}
            onReset={resetToDefault}
            onToggleVisibility={toggleSectionVisibility}
            onToggleCollapseByDefault={toggleCollapseByDefault}
            onTogglePreviewMode={togglePreviewMode}
            onMoveUp={moveSectionUp}
            onMoveDown={moveSectionDown}
            onReorder={reorderSections}
          />
        </div>
      )}

      {/* Upload Zones */}
      <LayoutBlock
        blockId="uploadZones"
        displayName="Upload Zones"
        pageId="docs"
        size="wide"
        visible={isSectionVisible('uploadZones')}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DocumentUploadZone
            documentType="nutrition"
            onUpload={uploadDocument}
            uploading={uploading}
            icon="🍽️"
            title="Nutrition Plans"
            description="Meal plans, dietary guidelines"
          />
          <DocumentUploadZone
            documentType="medical"
            onUpload={uploadDocument}
            uploading={uploading}
            icon="🏥"
            title="Medical Records"
            description="Lab results, prescriptions"
          />
          <DocumentUploadZone
            documentType="training"
            onUpload={uploadDocument}
            uploading={uploading}
            icon="💪"
            title="Training Programs"
            description="Workout plans, coaching"
          />
        </div>
      </LayoutBlock>

      {/* Stats Card */}
      <LayoutBlock
        blockId="summary"
        displayName="Document Summary"
        pageId="docs"
        size="wide"
        visible={isSectionVisible('summary')}
      >
        <Card className="bg-glass border-glass-border">
          <CardHeader>
            <CardTitle className="text-lg">Document Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{documentCounts.nutrition}</div>
                <div className="text-xs text-muted-foreground">Nutrition</div>
              </div>
              <div className="text-center p-3 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{documentCounts.medical}</div>
                <div className="text-xs text-muted-foreground">Medical</div>
              </div>
              <div className="text-center p-3 bg-card/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{documentCounts.training}</div>
                <div className="text-xs text-muted-foreground">Training</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </LayoutBlock>

      {/* Document Library */}
      <LayoutBlock
        blockId="library"
        displayName="Document Library"
        pageId="docs"
        size="wide"
        visible={isSectionVisible('library')}
      >
        <Card className="bg-glass border-glass-border">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Document Library</CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                    <TabsTrigger value="nutrition" className="text-xs">🍽️</TabsTrigger>
                    <TabsTrigger value="medical" className="text-xs">🏥</TabsTrigger>
                    <TabsTrigger value="training" className="text-xs">💪</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <DocumentSearchFilters
              filters={searchFilters}
              onFiltersChange={setSearchFilters}
              onClearFilters={handleClearFilters}
            />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                {documents.length === 0 ? (
                  <>
                    <p>No documents uploaded yet</p>
                    <p className="text-sm">Upload your first document to get started</p>
                  </>
                ) : (
                  <>
                    <p>No documents match your filters</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={handleClearFilters}
                    >
                      Clear Filters
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onDelete={deleteDocument}
                    onPreview={setPreviewDocument}
                    onViewHistory={setHistoryDocument}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </LayoutBlock>

      <DocumentPreviewModal
        document={previewDocument}
        open={previewDocument !== null}
        onClose={() => setPreviewDocument(null)}
      />

      <DocumentVersionHistoryModal
        document={historyDocument}
        open={historyDocument !== null}
        onClose={() => setHistoryDocument(null)}
        onRestored={handleVersionRestored}
      />
    </div>
  );
};

export default MyDocuments;
