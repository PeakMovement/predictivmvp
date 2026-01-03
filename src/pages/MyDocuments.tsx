import { FileText, Filter, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentUploadZone } from '@/components/documents/DocumentUploadZone';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { useDocuments } from '@/hooks/useDocuments';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLayoutCustomization } from '@/hooks/useLayoutCustomization';
import { CustomizeLayoutButton } from '@/components/layout/CustomizeLayoutButton';
import { LayoutEditor } from '@/components/layout/LayoutEditor';
import { LayoutBlock } from '@/components/layout/LayoutBlock';

const MyDocuments = () => {
  const { documents, loading, uploading, uploadDocument, deleteDocument } = useDocuments();
  const [activeFilter, setActiveFilter] = useState<'all' | 'nutrition' | 'medical' | 'training'>('all');
  const navigate = useNavigate();

  // Layout customization
  const {
    isEditing: isLayoutEditing,
    editingSections,
    isCustomized: layoutCustomized,
    openEditor: openLayoutEditor,
    closeEditor: closeLayoutEditor,
    saveLayout,
    resetToDefault,
    toggleSectionVisibility,
    moveSectionUp,
    moveSectionDown,
    reorderSections,
    isSectionVisible,
  } = useLayoutCustomization('docs');

  const filteredDocuments = activeFilter === 'all' 
    ? documents 
    : documents.filter(doc => doc.document_type === activeFilter);

  const documentCounts = {
    nutrition: documents.filter(d => d.document_type === 'nutrition').length,
    medical: documents.filter(d => d.document_type === 'medical').length,
    training: documents.filter(d => d.document_type === 'training').length,
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
            onSave={saveLayout}
            onCancel={closeLayoutEditor}
            onReset={resetToDefault}
            onToggleVisibility={toggleSectionVisibility}
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
          <Card className="bg-glass border-glass-border flex flex-col justify-center items-center p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
            // Navigate to profile setup and open injuries section
            window.dispatchEvent(new CustomEvent('navigate-to-profile-injuries'));
            navigate('/');
            setTimeout(() => {
              window.location.hash = '#profile-setup-injuries';
            }, 100);
          }}>
            <div className="text-center space-y-2">
              <div className="text-4xl">🏥➡️📋</div>
              <h3 className="font-semibold">View in Profile</h3>
              <p className="text-xs text-muted-foreground">
                See medical docs in Injury History section
              </p>
              <Button variant="outline" size="sm" className="gap-2">
                Go to Profile <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </Card>
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
          <CardHeader>
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
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No documents uploaded yet</p>
                <p className="text-sm">Upload your first document to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onDelete={deleteDocument}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </LayoutBlock>
    </div>
  );
};

export default MyDocuments;
