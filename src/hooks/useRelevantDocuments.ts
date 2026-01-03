import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RelevantDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  documentType: string;
  year: string;
  relevanceReason: string;
}

interface StoredDocument {
  id: string;
  file_name: string;
  file_url: string;
  document_type: string;
  uploaded_at: string | null;
  tags: string[] | null;
  ai_summary: string | null;
}

// Keywords that indicate document relevance to insights
const relevanceMapping: Record<string, { keywords: string[]; reason: string }> = {
  injury: {
    keywords: ['injury', 'pain', 'strain', 'sprain', 'fracture', 'tear', 'physical therapy', 'rehabilitation'],
    reason: 'relates to your injury history',
  },
  imaging: {
    keywords: ['mri', 'x-ray', 'xray', 'scan', 'imaging', 'radiology'],
    reason: 'provides imaging context',
  },
  lab: {
    keywords: ['blood', 'lab', 'test', 'panel', 'cholesterol', 'glucose', 'metabolic'],
    reason: 'informs your health baseline',
  },
  cardio: {
    keywords: ['heart', 'cardiac', 'cardiovascular', 'ecg', 'ekg', 'hrv', 'blood pressure'],
    reason: 'relates to cardiovascular health',
  },
  sleep: {
    keywords: ['sleep', 'insomnia', 'apnea', 'rest', 'fatigue'],
    reason: 'connects to your sleep history',
  },
  orthopedic: {
    keywords: ['bone', 'joint', 'spine', 'back', 'knee', 'shoulder', 'orthopedic', 'musculoskeletal'],
    reason: 'relates to your orthopedic background',
  },
  general: {
    keywords: ['physical', 'exam', 'checkup', 'annual', 'wellness'],
    reason: 'provides health context',
  },
};

function extractYear(dateString: string | null): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  } catch {
    return '';
  }
}

function findRelevance(insightText: string, document: StoredDocument): string | null {
  const lowerInsight = insightText.toLowerCase();
  const lowerFileName = document.file_name.toLowerCase();
  const lowerDocType = document.document_type.toLowerCase();
  const lowerSummary = (document.ai_summary || '').toLowerCase();
  const tags = (document.tags || []).map(t => t.toLowerCase());
  
  // Check each relevance category
  for (const [, config] of Object.entries(relevanceMapping)) {
    const insightHasKeyword = config.keywords.some(k => lowerInsight.includes(k));
    if (!insightHasKeyword) continue;
    
    // Check if document matches this category
    const docMatches = config.keywords.some(k => 
      lowerFileName.includes(k) || 
      lowerDocType.includes(k) || 
      lowerSummary.includes(k) ||
      tags.some(t => t.includes(k))
    );
    
    if (docMatches) {
      return config.reason;
    }
  }
  
  return null;
}

export function useRelevantDocuments() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data } = await supabase
          .from('user_documents')
          .select('id, file_name, file_url, document_type, uploaded_at, tags, ai_summary')
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: false })
          .limit(20);

        setDocuments((data || []) as StoredDocument[]);
      } catch (error) {
        console.error('Error fetching documents for context:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocuments();
  }, []);

  const getRelevantDocument = useCallback((insightText: string): RelevantDocument | null => {
    if (documents.length === 0) return null;

    for (const doc of documents) {
      const relevanceReason = findRelevance(insightText, doc);
      if (relevanceReason) {
        return {
          id: doc.id,
          fileName: doc.file_name,
          fileUrl: doc.file_url,
          documentType: doc.document_type,
          year: extractYear(doc.uploaded_at),
          relevanceReason,
        };
      }
    }

    return null;
  }, [documents]);

  return { getRelevantDocument, isLoading, hasDocuments: documents.length > 0 };
}
