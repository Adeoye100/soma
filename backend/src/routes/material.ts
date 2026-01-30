import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { materialValidation } from '@/middleware/requestValidator';
import { MaterialService } from '@/services/supabaseService';
import winston from 'winston';

const router = Router();

/**
 * @route   POST /api/material
 * @desc    Upload a new material
 * @access  Private
 */
router.post('/', materialValidation.uploadMaterial, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, content, mimeType } = req.body;

  try {
    const userId = req.user?.id || 'temp-user-id';

    const materialData = {
      title,
      description,
      content,
      mime_type: mimeType,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const material = await MaterialService.create(materialData);

    winston.info(`Material created: ${material.id} by user ${userId}`);

    res.status(201).json({
      message: 'Material uploaded successfully',
      material: {
        id: material.id,
        title: material.title,
        description: material.description,
        mimeType: material.mime_type,
        createdAt: material.created_at,
        updatedAt: material.updated_at
      }
    });

  } catch (error: any) {
    winston.error('Material upload error:', error);
    res.status(500).json({
      error: 'Material upload failed',
      message: error.message || 'An error occurred while uploading the material'
    });
  }
}));

/**
 * @route   GET /api/material
 * @desc    Get user's materials
 * @access  Private
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const userId = req.user?.id || 'temp-user-id';
    
    const { data: materials, total } = await MaterialService.findByUserId(userId, page, limit);

    res.json({
      message: 'Materials retrieved successfully',
      materials: materials.map(material => ({
        id: material.id,
        title: material.title,
        description: material.description,
        mimeType: material.mime_type,
        createdAt: material.created_at,
        updatedAt: material.updated_at
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    winston.error('Get materials error:', error);
    res.status(500).json({
      error: 'Failed to retrieve materials',
      message: 'An error occurred while retrieving materials'
    });
  }
}));

/**
 * @route   GET /api/material/:id
 * @desc    Get material details
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user?.id || 'temp-user-id';
    
    const materials = await MaterialService.findByUserId(userId);
    const material = materials.data.find(m => m.id === id);
    
    if (!material) {
      res.status(404).json({
        error: 'Material not found',
        message: 'The requested material could not be found'
      });
      return;
    }

    res.json({
      message: 'Material retrieved successfully',
      material: {
        id: material.id,
        title: material.title,
        description: material.description,
        content: material.content,
        mimeType: material.mime_type,
        createdAt: material.created_at,
        updatedAt: material.updated_at
      }
    });

  } catch (error: any) {
    winston.error('Get material error:', error);
    res.status(500).json({
      error: 'Failed to retrieve material',
      message: 'An error occurred while retrieving the material'
    });
  }
}));

/**
 * @route   DELETE /api/material/:id
 * @desc    Delete a material
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({
      error: 'Bad request',
      message: 'Material ID is required'
    });
    return;
  }

  try {
    // TODO: Get user ID from authenticated user and verify ownership
    await MaterialService.delete(id);

    res.json({
      message: 'Material deleted successfully'
    });

  } catch (error: any) {
    winston.error('Material deletion error:', error);
    res.status(500).json({
      error: 'Material deletion failed',
      message: 'An error occurred while deleting the material'
    });
  }
}));

export default router;

