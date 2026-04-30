import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

export async function enforceApiQuota(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Fetch or create user quota
  const { data: quota } = await supabase
    .from('user_quotas')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!quota) {
    await supabase.from('user_quotas').insert({
      user_id: userId,
      daily_uploads_count: 0,
      daily_uploads_limit: 5,
      monthly_credits_used: 0,
      monthly_credits_limit: 50,
      last_reset_date: new Date().toISOString().split('T')[0],
    });
    (req as any).userQuota = {
      user_id: userId,
      daily_uploads_count: 0,
      daily_uploads_limit: 5,
      monthly_credits_used: 0,
      monthly_credits_limit: 50,
      last_reset_date: new Date().toISOString().split('T')[0],
    };
    return next();
  }

  // Reset daily counter at midnight
  const lastResetDate = new Date(quota.last_reset_date);
  const today = new Date().toISOString().split('T')[0];

  if (lastResetDate.toISOString().split('T')[0] < today) {
    await supabase
      .from('user_quotas')
      .update({
        daily_uploads_count: 0,
        last_reset_date: today,
      })
      .eq('user_id', userId);
    quota.daily_uploads_count = 0;
  }

  // Check limits
  if (quota.daily_uploads_count >= quota.daily_uploads_limit) {
    return res.status(429).json({
      error: 'Daily upload limit reached',
      limit: quota.daily_uploads_limit,
      resetAt: new Date(lastResetDate.getTime() + 86400000),
    });
  }

  if (quota.monthly_credits_used >= quota.monthly_credits_limit) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);

    return res.status(429).json({
      error: 'Monthly iLovePDF credit limit reached',
      limit: quota.monthly_credits_limit,
      used: quota.monthly_credits_used,
      resetAt: nextMonth,
    });
  }

  (req as any).userQuota = quota;
  next();
}