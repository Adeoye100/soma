import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { checkValidationResult } from '@/middleware/requestValidator';
import { UserProfileService } from '@/services/userProfileService';
import winston from 'winston';

const router = Router();

const storage = multer.memoryStorage();
const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, WEBP) are allowed for avatars'));
    }
  }
});

/**
 * @route   GET /api/user/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/profile',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const profile = await UserProfileService.getProfile(userId);
      res.json({ message: 'Profile retrieved successfully', profile });
    } catch (error: any) {
      winston.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to retrieve profile', message: error.message });
    }
  })
);

/**
 * @route   PATCH /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.patch('/profile',
  body('display_name').optional().isLength({ min: 1, max: 100 }).withMessage('Display name must be 1-100 characters'),
  body('username').optional().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must be 3-30 alphanumeric characters'),
  body('country').optional().isLength({ min: 2, max: 50 }).withMessage('Country must be 2-50 characters'),
  body('avatar_url').optional().isURL().withMessage('Invalid avatar URL'),
  checkValidationResult,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { display_name, username, country, avatar_url } = req.body;
    const updates: any = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (username !== undefined) updates.username = username;
    if (country !== undefined) updates.country = country;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    try {
      const profile = await UserProfileService.updateProfile(userId, updates);
      res.json({ message: 'Profile updated successfully', profile });
    } catch (error: any) {
      winston.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile', message: error.message });
    }
  })
);

/**
 * @route   POST /api/user/avatar
 * @desc    Upload avatar image
 * @access  Private
 */
router.post('/avatar',
  avatarUpload.single('avatar'),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Bad Request', message: 'No image file provided' });
      return;
    }

    try {
      const avatarUrl = await UserProfileService.uploadAvatar(userId, file.buffer, file.mimetype);
      res.json({ message: 'Avatar uploaded successfully', avatarUrl });
    } catch (error: any) {
      winston.error('Avatar upload error:', error);
      res.status(500).json({ error: 'Failed to upload avatar', message: error.message });
    }
  })
);

export default router;
