import { supabaseAdmin, RPC_FUNCTIONS, TABLES } from './supabase';
import { generateEmbedding } from './gemini';
import { SearchResult, DocumentMetadata } from '@/types';

/**
 * Performs vector similarity search on legal documents
 * @param query - Search query text
 * @param matchCount - Number of results to return (default: 20)
 * @param filter - Optional metadata filter
 * @returns Promise with search results
 */
export async function searchDocuments(
  query: string,
  matchCount: number = 20,
  filter: Record<string, any> = {}
): Promise<SearchResult[]> {
  try {
    // Generate embedding for the search query
    const { embedding } = await generateEmbedding(query);
    
    // Perform vector similarity search
    const { data, error } = await supabaseAdmin.rpc(RPC_FUNCTIONS.MATCH_DOCUMENTS, {
      query_embedding: embedding,
      match_count: matchCount,
      filter: filter
    });

    if (error) {
      console.error('Vector search error:', error);
      throw new Error('Failed to search documents');
    }

    return data || [];
  } catch (error) {
    console.error('Error in searchDocuments:', error);
    throw error;
  }
}

/**
 * Searches for documents by law ID or title
 * @param searchTerm - Law ID or title to search for
 * @param matchCount - Number of results to return
 * @returns Promise with search results
 */
export async function searchByLawId(
  searchTerm: string,
  matchCount: number = 10
): Promise<SearchResult[]> {
  try {
    const filter = {
      $or: [
        { law_id: { $ilike: `%${searchTerm}%` } },
        { title: { $ilike: `%${searchTerm}%` } }
      ]
    };

    return await searchDocuments(searchTerm, matchCount, filter);
  } catch (error) {
    console.error('Error in searchByLawId:', error);
    throw error;
  }
}

/**
 * Gets full law document by law_id
 * @param lawId - The law ID to retrieve
 * @returns Promise with law document
 */
export async function getLawDocument(lawId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.LAW)
      .select('*')
      .eq('law_id', lawId)
      .single();

    if (error) {
      console.error('Error fetching law document:', error);
      throw new Error('Failed to fetch law document');
    }

    return data;
  } catch (error) {
    console.error('Error in getLawDocument:', error);
    throw error;
  }
}

/**
 * Gets multiple documents by their IDs
 * @param documentIds - Array of document IDs
 * @returns Promise with documents
 */
export async function getDocumentsByIds(documentIds: number[]) {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.DOCUMENTS)
      .select('*')
      .in('id', documentIds);

    if (error) {
      console.error('Error fetching documents by IDs:', error);
      throw new Error('Failed to fetch documents');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDocumentsByIds:', error);
    throw error;
  }
}

/**
 * Searches for related laws based on metadata relationships
 * @param lawId - The law ID to find related laws for
 * @param matchCount - Number of results to return
 * @returns Promise with related law documents
 */
export async function findRelatedLaws(
  lawId: string,
  matchCount: number = 10
): Promise<SearchResult[]> {
  try {
    // First get the law document to access its relationships
    const lawDoc = await getLawDocument(lawId);
    
    if (!lawDoc || !lawDoc.relate) {
      return [];
    }

    const relatedLawIds: string[] = [];
    
    // Extract related law IDs from all relationship types
    if (lawDoc.relate.altered) {
      relatedLawIds.push(...lawDoc.relate.altered);
    }
    if (lawDoc.relate.abolished) {
      relatedLawIds.push(...lawDoc.relate.abolished);
    }
    if (lawDoc.relate.partially_abolished) {
      relatedLawIds.push(...lawDoc.relate.partially_abolished);
    }
    if (lawDoc.relate.abolishing) {
      relatedLawIds.push(...lawDoc.relate.abolishing);
    }

    if (relatedLawIds.length === 0) {
      return [];
    }

    // Search for documents with these law IDs
    const { data, error } = await supabaseAdmin
      .from(TABLES.DOCUMENTS)
      .select('id, content, metadata')
      .contains('metadata', { law_id: relatedLawIds })
      .limit(matchCount);

    if (error) {
      console.error('Error finding related laws:', error);
      throw new Error('Failed to find related laws');
    }

    // Format as SearchResult
    return (data || []).map(doc => ({
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata as DocumentMetadata,
      similarity: 0.8 // Default similarity for related documents
    }));
  } catch (error) {
    console.error('Error in findRelatedLaws:', error);
    throw error;
  }
}

/**
 * Performs advanced search with multiple criteria
 * @param options - Search options
 * @returns Promise with search results
 */
export async function advancedSearch(options: {
  query?: string;
  lawId?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  matchCount?: number;
}): Promise<SearchResult[]> {
  try {
    const { query, lawId, category, dateFrom, dateTo, matchCount = 20 } = options;
    
    let filter: Record<string, any> = {};
    
    // Build metadata filter
    if (lawId) {
      filter.law_id = { $ilike: `%${lawId}%` };
    }
    
    if (category) {
      filter['bo.group'] = { $ilike: `%${category}%` };
    }
    
    if (dateFrom || dateTo) {
      filter['bo.public_date'] = {};
      if (dateFrom) {
        filter['bo.public_date'].$gte = dateFrom;
      }
      if (dateTo) {
        filter['bo.public_date'].$lte = dateTo;
      }
    }

    // If query is provided, use vector search; otherwise, use metadata search
    if (query) {
      return await searchDocuments(query, matchCount, filter);
    } else {
      // Metadata-only search
      const { data, error } = await supabaseAdmin
        .from(TABLES.DOCUMENTS)
        .select('id, content, metadata')
        .contains('metadata', filter)
        .limit(matchCount);

      if (error) {
        console.error('Error in metadata search:', error);
        throw new Error('Failed to perform metadata search');
      }

      return (data || []).map(doc => ({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata as DocumentMetadata,
        similarity: 0.5 // Default similarity for metadata matches
      }));
    }
  } catch (error) {
    console.error('Error in advancedSearch:', error);
    throw error;
  }
}

/**
 * Gets search suggestions based on partial input
 * @param partialQuery - Partial search query
 * @param limit - Number of suggestions to return
 * @returns Promise with search suggestions
 */
export async function getSearchSuggestions(
  partialQuery: string,
  limit: number = 5
): Promise<string[]> {
  try {
    // Search for law titles and IDs that match the partial query
    const { data, error } = await supabaseAdmin
      .from(TABLES.LAW)
      .select('law_id, title')
      .or(`law_id.ilike.%${partialQuery}%,title.ilike.%${partialQuery}%`)
      .limit(limit);

    if (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }

    const suggestions: string[] = [];
    
    (data || []).forEach(law => {
      if (law.law_id.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.push(law.law_id);
      }
      if (law.title.toLowerCase().includes(partialQuery.toLowerCase())) {
        suggestions.push(law.title);
      }
    });

    // Remove duplicates and return
    return [...new Set(suggestions)].slice(0, limit);
  } catch (error) {
    console.error('Error in getSearchSuggestions:', error);
    return [];
  }
}
