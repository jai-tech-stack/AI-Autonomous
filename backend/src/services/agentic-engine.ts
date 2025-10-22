import { PrismaClient } from '@prisma/client';
import { generateAIResponse } from './openai';

const prisma = new PrismaClient();

interface AgenticInsight {
  type: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  data?: any;
}

export class AgenticEngine {
  async analyzeAndAct(organizationId: string) {
    console.log(`🤖 Analyzing organization: ${organizationId}`);
    
    // Gather business data
    const [leads, tasks, posts, org] = await Promise.all([
      prisma.salesLead.findMany({
        where: { organizationId },
        include: { activities: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.autonomousTask.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.contentPost.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.organization.findUnique({ where: { id: organizationId } }),
    ]);

    if (!org) return { insights: [], actions: [] };

    // Identify actionable insights
    const insights = await this.identifyInsights({ leads, tasks, posts, org });

    // Execute autonomous actions for high-confidence insights
    const actions = [];
    for (const insight of insights) {
      if (insight.confidence > 0.75 && insight.impact === 'high') {
        try {
          const action = await this.executeAction(organizationId, insight);
          actions.push(action);
        } catch (err) {
          console.error(`Failed to execute action for ${insight.type}:`, err);
        }
      }
    }

    return { insights, actions };
  }

  private async identifyInsights(data: any): Promise<AgenticInsight[]> {
    const insights: AgenticInsight[] = [];
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Check for stale leads (no contact in 7+ days)
    const staleLeads = data.leads.filter((lead: any) => {
      const lastContact = lead.lastContactAt ? new Date(lead.lastContactAt).getTime() : 0;
      return lead.status === 'qualified' && (now - lastContact) > sevenDaysAgo;
    });

    if (staleLeads.length > 0) {
      insights.push({
        type: 'stale_leads',
        description: `${staleLeads.length} qualified leads need follow-up`,
        impact: 'high',
        confidence: 0.9,
        data: { leads: staleLeads.slice(0, 5) },
      });
    }

    // Check content output
    const recentPosts = data.posts.filter((p: any) => new Date(p.createdAt).getTime() > sevenDaysAgo);
    if (recentPosts.length < 3) {
      insights.push({
        type: 'low_content_output',
        description: 'Content output is below target (< 3 posts/week)',
        impact: 'medium',
        confidence: 0.8,
        data: { currentCount: recentPosts.length, targetCount: 5 },
      });
    }

    // Check pending tasks
    const pendingTasks = data.tasks.filter((t: any) => t.status === 'PENDING');
    if (pendingTasks.length > 10) {
      insights.push({
        type: 'task_backlog',
        description: `${pendingTasks.length} pending tasks in backlog`,
        impact: 'medium',
        confidence: 0.85,
        data: { count: pendingTasks.length },
      });
    }

    return insights;
  }

  private async executeAction(organizationId: string, insight: AgenticInsight) {
    switch (insight.type) {
      case 'stale_leads':
        // Create follow-up tasks for stale leads
        const leads = insight.data?.leads || [];
        for (const lead of leads.slice(0, 3)) {
          await prisma.autonomousTask.create({
            data: {
              organizationId,
              taskType: 'lead_followup',
              status: 'PENDING',
              input: {
                leadId: lead.id,
                leadName: lead.name,
                company: lead.company,
                reason: 'automated_stale_follow_up',
              },
            },
          });
        }
        return { type: 'created_followup_tasks', count: Math.min(3, leads.length) };

      case 'low_content_output':
        // Create content generation task
        await prisma.autonomousTask.create({
          data: {
            organizationId,
            taskType: 'social_media_post',
            status: 'PENDING',
            input: {
              prompt: 'Generate an engaging LinkedIn post about recent industry trends',
              platform: 'linkedin',
              reason: 'automated_content_boost',
            },
          },
        });
        return { type: 'created_content_task', count: 1 };

      case 'task_backlog':
        // Log insight for human review
        return { type: 'logged_backlog_warning', count: insight.data?.count || 0 };

      default:
        return { type: 'no_action', insight: insight.type };
    }
  }
}

export const agenticEngine = new AgenticEngine();



