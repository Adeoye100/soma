import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import { supabase } from '../lib/supabase';

export const adminRouter = Router();

adminRouter.get('/api-usage', requireAdmin, async (req: Request, res: Response) => {
  // Current month iLovePDF usage
  const { data: usage } = await supabase
    .from('api_usage')
    .select('*')
    .eq('service', 'ilovepdf')
    .gte(
      'created_at',
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    );

  const totalCreditsUsed = usage?.reduce((sum, u) => sum + (u.credits_used ?? 0), 0) ?? 0;
  const monthlyBudget = 2500;
  const remainingCredits = monthlyBudget - totalCreditsUsed;
  const utilizationPercent = (totalCreditsUsed / monthlyBudget) * 100;

  // Per-user quota
  const { data: quotas } = await supabase
    .from('user_quotas')
    .select('user:user_id(email), *')
    .order('monthly_credits_used', { ascending: false });

  res.json({
    monthly: {
      budget: monthlyBudget,
      used: totalCreditsUsed,
      remaining: remainingCredits,
      utilization: `${utilizationPercent.toFixed(1)}%`,
      trend: remainingCredits < 250 ? 'approaching limit' : utilizationPercent > 85 ? 'approaching limit' : 'on track',
    },
    topUsers: quotas?.slice(0, 10),
    warnings: [
      remainingCredits < 250
        ? `⚠️ Low on credits: ${remainingCredits} remaining`
        : null,
      utilizationPercent > 85
        ? `⚠️ High utilization: ${utilizationPercent.toFixed(1)}%`
        : null,
    ].filter(Boolean),
  });
});