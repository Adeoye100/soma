import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import nodemailer from 'nodemailer';

const router = Router();
const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey);

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// POST /api/feedback (PUBLIC - Authenticated user)
router.post('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, title, description, severity, page_url } = req.body;

    if (!type || !title || !description || !severity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = req.user;
    const browser_info = req.headers['user-agent'];

    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert({
        user_id: user?.id,
        user_email: user?.email,
        type,
        title,
        description,
        severity,
        page_url,
        browser_info,
        status: 'open',
        metadata: {}
      })
      .select()
      .single();

    if (error) throw error;

    // Send email notification
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'adeoyeopeyemi951@gmail.com',
        subject: `SOMA Feedback: ${type} - ${severity}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">New Feedback Received</h2>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Type:</strong> ${type}</p>
              <p><strong>Severity:</strong> ${severity}</p>
              <p><strong>Title:</strong> ${title}</p>
              <p><strong>User Email:</strong> ${user?.email}</p>
              <p><strong>Page URL:</strong> ${page_url}</p>
              <p><strong>Browser:</strong> ${browser_info}</p>
            </div>
            
            <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h3 style="margin-top: 0;">Description:</h3>
              <p style="white-space: pre-wrap;">${description}</p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px;">
              <p style="margin: 0; color: #0369a1;">
                <strong>Feedback ID:</strong> ${data.id}<br>
                <strong>Submitted:</strong> ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Failed to send feedback email:', emailError);
      // Don't fail the request if email fails
    }

    return res.status(201).json({ success: true, feedbackId: data.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}));

export default router;
