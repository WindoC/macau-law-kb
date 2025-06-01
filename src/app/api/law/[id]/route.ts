import { NextRequest } from 'next/server';
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse,
  validateMethod
} from '@/lib/auth';
import { getLawDocument } from '@/lib/database';

/**
 * Law Document API endpoint
 * Handles retrieval of full law documents by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate request method
    if (!validateMethod(request, ['GET'])) {
      return createErrorResponse('Method not allowed', 405);
    }

    // Authenticate user
    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { id } = params;

    if (!id) {
      return createErrorResponse('Law ID is required');
    }

    try {
      // Get law document from database
      const lawDocument = await getLawDocument(id);

      if (!lawDocument) {
        return createErrorResponse('Law document not found', 404);
      }

      // Format response
      const response = {
        id: lawDocument.id,
        title: lawDocument.title,
        content: lawDocument.content,
        category: lawDocument.category,
        effective_date: lawDocument.effective_date,
        last_updated: lawDocument.last_updated,
        source_url: lawDocument.source_url,
        metadata: lawDocument.metadata
      };

      return createSuccessResponse(response);

    } catch (dbError) {
      console.error('Database error:', dbError);
      return createErrorResponse('Failed to retrieve law document', 500);
    }

  } catch (error) {
    console.error('Law document API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
