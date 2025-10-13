// Save as: backend/src/index.ts

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs'; 
import jwt from 'jsonwebtoken';
import  { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Auth Middleware
interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, organizationName, industry } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and organization
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        organizations: {
          create: {
            role: 'owner',
            organization: {
              create: {
                name: organizationName || `${firstName}'s Company`,
                industry: industry || null,
              },
            },
          },
        },
      },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizations[0]?.organizationId,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizations[0]?.organizationId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                aiCeoConfig: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organization: user.organizations[0]?.organization,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ==================== ONBOARDING ROUTES ====================

// Save AI CEO configuration
app.post('/api/onboarding/ai-ceo', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, templateId, ceoName, personality, goals, industry, customInstructions } = req.body;

    if (!organizationId || !templateId || !ceoName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user owns organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: req.user!.userId,
        organizationId,
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create or update AI CEO config
    const config = await prisma.aiCeoConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        templateId,
        ceoName,
        personality: personality || {},
        goals: goals || {},
        industry,
        customInstructions,
      },
      update: {
        templateId,
        ceoName,
        personality: personality || {},
        goals: goals || {},
        industry,
        customInstructions,
      },
    });

    res.json(config);
  } catch (error) {
    console.error('Save AI CEO config error:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Get AI CEO configuration
app.get('/api/onboarding/ai-ceo/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Missing organizationId parameter' });
    }

    const config = await prisma.aiCeoConfig.findFirst({
      where: { organizationId: organizationId },
    });

    res.json(config);
  } catch (error) {
    console.error('Get AI CEO config error:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// ==================== CHAT ROUTES ====================

// Send message to AI CEO
app.post('/api/chat/message', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, content } = req.body;

    if (!organizationId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        organizationId,
        userId: req.user!.userId,
        role: 'user',
        content,
      },
    });

    // Get AI CEO config for personality
    const aiConfig = await prisma.aiCeoConfig.findUnique({
      where: { organizationId },
    });

    // Simple AI response (you'll integrate OpenAI later)
    const aiResponse = `I'm ${aiConfig?.ceoName || 'your AI CEO'}. I received your message: "${content}". OpenAI integration coming next!`;

    // Save AI response
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        organizationId,
        userId: req.user!.userId,
        role: 'assistant',
        content: aiResponse,
      },
    });

    res.json({ userMessage, assistantMessage });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get chat history
app.get('/api/chat/history/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Missing organizationId parameter' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { organizationId: organizationId as string },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json(messages);
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// ==================== TASK ROUTES ====================

// Create autonomous task
app.post('/api/tasks', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, taskType, input, scheduledFor } = req.body;

    const task = await prisma.autonomousTask.create({
      data: {
        organizationId,
        taskType,
        input: input || {},
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      },
    });

    res.json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get tasks
app.get('/api/tasks/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { status } = req.query;

    const tasks = await prisma.autonomousTask.findMany({
      where: {
        organizationId,
        ...(status && { status: status as string }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Get single task
app.get('/api/tasks/:taskId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.autonomousTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// Retry task
app.post('/api/tasks/:taskId/retry', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.autonomousTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Reset task status to PENDING
    const updatedTask = await prisma.autonomousTask.update({
      where: { id: taskId },
      data: {
        status: 'PENDING',
        error: null,
        startedAt: null,
        completedAt: null,
      },
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Retry task error:', error);
    res.status(500).json({ error: 'Failed to retry task' });
  }
});

// ==================== LINKEDIN INTEGRATION ROUTES ====================

// LinkedIn OAuth connect
app.post('/api/integrations/linkedin/connect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, code } = req.body;

    if (!organizationId || !code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Exchange code for access token (simplified - you'll need to implement actual LinkedIn OAuth)
    const accessToken = 'linkedin_access_token_placeholder'; // Replace with actual OAuth flow
    const refreshToken = 'linkedin_refresh_token_placeholder';

    // Save integration
    const integration = await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider: 'linkedin',
        },
      },
      create: {
        organizationId,
        provider: 'linkedin',
        accessToken,
        refreshToken,
        metadata: {
          connectedAt: new Date().toISOString(),
          scope: 'w_member_social',
        },
      },
      update: {
        accessToken,
        refreshToken,
        metadata: {
          connectedAt: new Date().toISOString(),
          scope: 'w_member_social',
        },
      },
    });

    res.json({ success: true, integration });
  } catch (error) {
    console.error('LinkedIn connect error:', error);
    res.status(500).json({ error: 'Failed to connect LinkedIn' });
  }
});

// LinkedIn post
app.post('/api/integrations/linkedin/post', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, content, taskId } = req.body;

    if (!organizationId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get LinkedIn integration
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId,
        provider: 'linkedin',
        isActive: true,
      },
    });

    if (!integration) {
      return res.status(400).json({ error: 'LinkedIn not connected' });
    }

    // Post to LinkedIn (simplified - you'll need to implement actual LinkedIn API call)
    const postResult = {
      id: `linkedin_post_${Date.now()}`,
      url: 'https://linkedin.com/posts/example',
      success: true,
      postedAt: new Date().toISOString(),
    };

    // Update task with posting result if taskId provided
    if (taskId) {
      const existingTask = await prisma.autonomousTask.findUnique({ where: { id: taskId } });
      const existingOutput = existingTask?.output as any || {};
      
      await prisma.autonomousTask.update({
        where: { id: taskId },
        data: {
          output: {
            ...existingOutput,
            linkedinPost: postResult,
          },
        },
      });
    }

    res.json({ success: true, post: postResult });
  } catch (error) {
    console.error('LinkedIn post error:', error);
    res.status(500).json({ error: 'Failed to post to LinkedIn' });
  }
});

// Get LinkedIn integration status
app.get('/api/integrations/linkedin/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    const integration = await prisma.integration.findFirst({
      where: {
        organizationId,
        provider: 'linkedin',
        isActive: true,
      },
    });

    res.json({ connected: !!integration, integration });
  } catch (error) {
    console.error('Get LinkedIn status error:', error);
    res.status(500).json({ error: 'Failed to get LinkedIn status' });
  }
});

// ==================== TWITTER/X INTEGRATION ROUTES ====================

// Twitter OAuth connect
app.post('/api/integrations/twitter/connect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, code } = req.body;

    if (!organizationId || !code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Exchange code for access token (simplified - you'll need to implement actual Twitter OAuth)
    const accessToken = 'twitter_access_token_placeholder';
    const refreshToken = 'twitter_refresh_token_placeholder';

    // Save integration
    const integration = await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider: 'twitter',
        },
      },
      create: {
        organizationId,
        provider: 'twitter',
        accessToken,
        refreshToken,
        metadata: {
          connectedAt: new Date().toISOString(),
          scope: 'tweet.read tweet.write users.read',
        },
      },
      update: {
        accessToken,
        refreshToken,
        metadata: {
          connectedAt: new Date().toISOString(),
          scope: 'tweet.read tweet.write users.read',
        },
      },
    });

    res.json({ success: true, integration });
  } catch (error) {
    console.error('Twitter connect error:', error);
    res.status(500).json({ error: 'Failed to connect Twitter' });
  }
});

// Twitter post
app.post('/api/integrations/twitter/post', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, content, taskId, thread } = req.body;

    if (!organizationId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get Twitter integration
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId,
        provider: 'twitter',
        isActive: true,
      },
    });

    if (!integration) {
      return res.status(400).json({ error: 'Twitter not connected' });
    }

    // Post to Twitter (simplified - you'll need to implement actual Twitter API call)
    const postResult = {
      id: `twitter_post_${Date.now()}`,
      url: 'https://twitter.com/user/status/example',
      success: true,
      postedAt: new Date().toISOString(),
      thread: thread || false,
    };

    // Update task with posting result if taskId provided
    if (taskId) {
      const existingTask = await prisma.autonomousTask.findUnique({ where: { id: taskId } });
      const existingOutput = existingTask?.output as any || {};
      
      await prisma.autonomousTask.update({
        where: { id: taskId },
        data: {
          output: {
            ...existingOutput,
            twitterPost: postResult,
          },
        },
      });
    }

    res.json({ success: true, post: postResult });
  } catch (error) {
    console.error('Twitter post error:', error);
    res.status(500).json({ error: 'Failed to post to Twitter' });
  }
});

// Get Twitter integration status
app.get('/api/integrations/twitter/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    const integration = await prisma.integration.findFirst({
      where: {
        organizationId,
        provider: 'twitter',
        isActive: true,
      },
    });

    res.json({ connected: !!integration, integration });
  } catch (error) {
    console.error('Get Twitter status error:', error);
    res.status(500).json({ error: 'Failed to get Twitter status' });
  }
});

// ==================== EMAIL MARKETING INTEGRATION ROUTES ====================

// SendGrid/Mailchimp connect
app.post('/api/integrations/email/connect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, provider, apiKey } = req.body;

    if (!organizationId || !provider || !apiKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Save integration
    const integration = await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider: `email_${provider}`,
        },
      },
      create: {
        organizationId,
        provider: `email_${provider}`,
        accessToken: apiKey,
        metadata: {
          connectedAt: new Date().toISOString(),
          provider: provider,
        },
      },
      update: {
        accessToken: apiKey,
        metadata: {
          connectedAt: new Date().toISOString(),
          provider: provider,
        },
      },
    });

    res.json({ success: true, integration });
  } catch (error) {
    console.error('Email integration connect error:', error);
    res.status(500).json({ error: 'Failed to connect email service' });
  }
});

// Create email campaign
app.post('/api/email-campaigns', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, name, subject, content, scheduledFor } = req.body;

    if (!organizationId || !name || !subject || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // FIX: Use the correct table/model name for campaigns. Assuming it should be "campaign" not "emailCampaign"
    const campaign = await prisma.campaign.create({
      data: {
        organizationId,
        name,
        subject,
        content,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: scheduledFor ? 'scheduled' : 'draft',
      },
    });

    res.json({ success: true, campaign });
  } catch (error) {
    console.error('Create email campaign error:', error);
    res.status(500).json({ error: 'Failed to create email campaign' });
  }
});

// Get email campaigns
app.get('/api/email-campaigns/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    const campaigns = await prisma.emailCampaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ campaigns });
  } catch (error) {
    console.error('Get email campaigns error:', error);
    res.status(500).json({ error: 'Failed to get email campaigns' });
  }
});

// ==================== CONTENT CALENDAR ROUTES ====================

// Create content post
app.post('/api/content-posts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, platform, content, scheduledFor, campaignId } = req.body;

    if (!organizationId || !platform || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const post = await prisma.contentPost.create({
      data: {
        organizationId,
        platform,
        content,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        campaignId: campaignId || null,
        status: scheduledFor ? 'scheduled' : 'draft',
      },
    });

    res.json({ success: true, post });
  } catch (error) {
    console.error('Create content post error:', error);
    res.status(500).json({ error: 'Failed to create content post' });
  }
});

// Get content posts
app.get('/api/content-posts/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { platform, status, startDate, endDate } = req.query;

    const where: any = { organizationId };
    
    if (platform) where.platform = platform;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.scheduledFor = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const posts = await prisma.contentPost.findMany({
      where,
      orderBy: { scheduledFor: 'asc' },
      include: {
        campaign: true,
      },
    });

    res.json({ posts });
  } catch (error) {
    console.error('Get content posts error:', error);
    res.status(500).json({ error: 'Failed to get content posts' });
  }
});

// Update content post
app.put('/api/content-posts/:postId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { content, scheduledFor, status } = req.body;

    const post = await prisma.contentPost.update({
      where: { id: postId },
      data: {
        ...(content && { content }),
        ...(scheduledFor && { scheduledFor: new Date(scheduledFor) }),
        ...(status && { status }),
      },
    });

    res.json({ success: true, post });
  } catch (error) {
    console.error('Update content post error:', error);
    res.status(500).json({ error: 'Failed to update content post' });
  }
});

// Delete content post
app.delete('/api/content-posts/:postId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;

    await prisma.contentPost.delete({
      where: { id: postId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete content post error:', error);
    res.status(500).json({ error: 'Failed to delete content post' });
  }
});

// ==================== ANALYTICS ROUTES ====================

// Get analytics data
app.get('/api/analytics/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { range = '7d' } = req.query;

    // Calculate date range
    const now = new Date();
    const daysBack = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Get content posts
    const posts = await prisma.contentPost.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
      include: {
        campaign: true,
      },
    });

    // Get email campaigns
    const emailCampaigns = await prisma.emailCampaign.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
    });

    // Calculate analytics
    const totalPosts = posts.length + emailCampaigns.length;
    const totalEngagement = posts.reduce((sum: number, post: any) => {
      const metrics = post.metrics as any;
      return sum + (metrics?.engagement || 0);
    }, 0) + emailCampaigns.reduce((sum: number, campaign: any) => {
      return sum + (campaign.openRate || 0) * (campaign.recipientCount || 0);
    }, 0);

    const totalReach = posts.reduce((sum: number, post: any) => {
      const metrics = post.metrics as any;
      return sum + (metrics?.reach || 0);
    }, 0) + emailCampaigns.reduce((sum: number, campaign: any) => {
      return sum + (campaign.recipientCount || 0);
    }, 0);

    // Platform breakdown
    const platformBreakdown = [
      { platform: 'LinkedIn', posts: 0, engagement: 0, reach: 0 },
      { platform: 'Twitter', posts: 0, engagement: 0, reach: 0 },
      { platform: 'Email', posts: 0, engagement: 0, reach: 0 },
    ];

    posts.forEach((post: any) => {
      const platformIndex = platformBreakdown.findIndex(p => p.platform.toLowerCase() === post.platform);
      if (platformIndex !== -1) {
        platformBreakdown[platformIndex].posts++;
        const metrics = post.metrics as any;
        platformBreakdown[platformIndex].engagement += metrics?.engagement || 0;
        platformBreakdown[platformIndex].reach += metrics?.reach || 0;
      }
    });

    emailCampaigns.forEach((campaign: any) => {
      const emailIndex = platformBreakdown.findIndex(p => p.platform === 'Email');
      if (emailIndex !== -1) {
        platformBreakdown[emailIndex].posts++;
        platformBreakdown[emailIndex].engagement += (campaign.openRate || 0) * (campaign.recipientCount || 0);
        platformBreakdown[emailIndex].reach += campaign.recipientCount || 0;
      }
    });

    // Engagement trend (mock data for now)
    const engagementTrend = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      engagementTrend.push({
        date: date.toISOString().split('T')[0],
        engagement: Math.floor(Math.random() * 100) + 50,
        reach: Math.floor(Math.random() * 500) + 200,
      });
    }

    // Top posts
    const topPosts = posts
      .map((post: any) => ({
        id: post.id,
        platform: post.platform,
        content: (post.content as any)?.text || 'No content',
        engagement: (post.metrics as any)?.engagement || 0,
        reach: (post.metrics as any)?.reach || 0,
      }))
      .sort((a: any, b: any) => b.engagement - a.engagement)
      .slice(0, 5);

    res.json({
      totalPosts,
      totalEngagement,
      totalReach,
      platformBreakdown,
      engagementTrend,
      topPosts,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ==================== CRM ROUTES ====================

// Get sales leads
app.get('/api/crm/leads/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { status, assignedTo } = req.query;

    const where: any = { organizationId };
    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;

    const leads = await prisma.salesLead.findMany({
      where,
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        meetings: {
          orderBy: { scheduledFor: 'asc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ leads });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

// Create sales lead
app.post('/api/crm/leads', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, name, email, phone, company, source, notes, priority } = req.body;

    if (!organizationId || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const lead = await prisma.salesLead.create({
      data: {
        organizationId,
        name,
        email,
        phone,
        company,
        source,
        notes,
        priority: priority || 'medium',
        score: 0, // Will be calculated by AI
      },
    });

    res.json({ success: true, lead });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update sales lead
app.put('/api/crm/leads/:leadId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const updates = req.body;

    const lead = await prisma.salesLead.update({
      where: { id: leadId },
      data: updates,
    });

    res.json({ success: true, lead });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Add lead activity
app.post('/api/crm/activities', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, organizationId, type, title, description, metadata } = req.body;

    if (!leadId || !organizationId || !type || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const activity = await prisma.leadActivity.create({
      data: {
        leadId,
        organizationId,
        type,
        title,
        description,
        metadata,
      },
    });

    // Update lead's last contact time
    await prisma.salesLead.update({
      where: { id: leadId },
      data: { lastContactAt: new Date() }, 
    });

    res.json({ success: true, activity });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// Get lead activities
app.get('/api/crm/activities/:leadId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;

    const activities = await prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ activities });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Failed to get activities' });
  }
});

// Create meeting
app.post('/api/crm/meetings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, leadId, title, description, scheduledFor, duration, attendees } = req.body;

    if (!organizationId || !title || !scheduledFor) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const meeting = await prisma.meeting.create({
      data: {
        organizationId,
        leadId,
        title,
        description,
        scheduledFor: new Date(scheduledFor),
        duration: duration || 60,
        attendees,
        meetingUrl: `https://meet.google.com/${Math.random().toString(36).substring(7)}`,
      },
    });

    res.json({ success: true, meeting });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// Get meetings
app.get('/api/crm/meetings/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { startDate, endDate } = req.query;

    const where: any = { organizationId };
    if (startDate && endDate) {
      where.scheduledFor = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        lead: true,
      },
      orderBy: { scheduledFor: 'asc' },
    });

    res.json({ meetings });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Failed to get meetings' });
  }
});

// Create email template
app.post('/api/crm/email-templates', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, name, subject, content, type } = req.body;

    if (!organizationId || !name || !subject || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        organizationId,
        name,
        subject,
        content,
        type: type || 'follow_up',
      },
    });

    res.json({ success: true, template });
  } catch (error) {
    console.error('Create email template error:', error);
    res.status(500).json({ error: 'Failed to create email template' });
  }
});

// Get email templates
app.get('/api/crm/email-templates/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { type } = req.query;

    const where: any = { organizationId, isActive: true };
    if (type) where.type = type;

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ templates });
  } catch (error) {
    console.error('Get email templates error:', error);
    res.status(500).json({ error: 'Failed to get email templates' });
  }
});

// Send email to lead
app.post('/api/crm/send-email', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { leadId, templateId, subject, content, organizationId } = req.body;

    if (!leadId || !organizationId || (!templateId && !subject && !content)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get lead info
    const lead = await prisma.salesLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    let emailSubject = subject;
    let emailContent = content;

    // Use template if provided
    if (templateId) {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: templateId },
      });

      if (template) {
        emailSubject = template.subject;
        emailContent = template.content;
      }
    }

    // Create activity record
    const activity = await prisma.leadActivity.create({
      data: {
        leadId,
        organizationId,
        type: 'email',
        title: `Email sent: ${emailSubject}`,
        description: emailContent,
        metadata: {
          subject: emailSubject,
          content: emailContent,
          sentAt: new Date().toISOString(),
        },
      },
    });

    // Update lead's last contact time
    await prisma.salesLead.update({
      where: { id: leadId },
      data: { lastContactAt: new Date() },
    });

    res.json({ success: true, activity });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Calculate lead score
app.post('/api/crm/calculate-score/:leadId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;

    const lead = await prisma.salesLead.findUnique({
      where: { id: leadId },
      include: {
        activities: true,
        meetings: true,
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Simple scoring algorithm
    let score = 0;
    
    // Base score from company size (if available)
    if (lead.company) score += 10;

    // Activity score
    score += lead.activities.length * 5;
    
    // Meeting score
    score += lead.meetings.length * 15;
    
    // Recent activity bonus
    const recentActivity = lead.activities.filter(a => 
      new Date(a.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    score += recentActivity.length * 10;
    
    // Priority multiplier
    if (lead.priority === 'high') score *= 1.5;
    if (lead.priority === 'low') score *= 0.7;

    // Update lead score
    await prisma.salesLead.update({
      where: { id: leadId },
      data: { score: Math.round(score) },
    });

    res.json({ success: true, score: Math.round(score) });
  } catch (error) {
    console.error('Calculate score error:', error);
    res.status(500).json({ error: 'Failed to calculate score' });
  }
});

// ==================== AI REPORTS ROUTES ====================

// Generate AI report
app.post('/api/ai-reports/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, reportType, dateRange } = req.body;

    if (!organizationId || !reportType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate date range
    const now = new Date();
    const daysBack = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Get data for the report
    const posts = await prisma.contentPost.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
    });

    const emailCampaigns = await prisma.emailCampaign.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
    });

    const leads = await prisma.salesLead.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
    });

    // Generate AI insights
    const insights = {
      summary: `Generated ${reportType} report for ${dateRange} period`,
      keyMetrics: {
        totalPosts: posts.length,
        totalEmails: emailCampaigns.length,
        totalLeads: leads.length,
        engagementRate: Math.floor(Math.random() * 20) + 5, // Mock data
        conversionRate: Math.floor(Math.random() * 10) + 2,
      },
      topPerformingContent: posts.slice(0, 3).map((post: any) => ({
        platform: post.platform,
        content: (post.content as any)?.text?.substring(0, 100) || 'No content',
        engagement: Math.floor(Math.random() * 100) + 50,
      })),
      recommendations: [
        'Increase posting frequency on LinkedIn for better engagement',
        'Focus on high-priority leads to improve conversion rates',
        'Schedule posts during peak hours (9-11 AM, 2-4 PM)',
        'Create more video content to boost engagement',
      ],
      anomalies: [
        {
          type: 'engagement_drop',
          description: 'Engagement dropped 15% on Tuesday',
          impact: 'medium',
          suggestion: 'Review Tuesday content strategy',
        },
      ],
      nextSteps: [
        'Schedule follow-up emails for qualified leads',
        'Create content calendar for next week',
        'Analyze competitor performance',
        'Update email templates based on performance data',
      ],
    };

    res.json({ success: true, report: insights });
  } catch (error) {
    console.error('Generate AI report error:', error);
    res.status(500).json({ error: 'Failed to generate AI report' });
  }
});

// Natural language query
app.post('/api/ai-reports/query', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, query } = req.body;

    if (!organizationId || !query) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Simple query processing (in a real app, you'd use NLP/AI)
    const queryLower = query.toLowerCase();
    let response: any = {};

    if (queryLower.includes('revenue') || queryLower.includes('sales')) {
      response = {
        type: 'chart',
        chartType: 'line',
        title: 'Revenue Trend',
        data: [
          { month: 'Jan', revenue: 45000 },
          { month: 'Feb', revenue: 52000 },
          { month: 'Mar', revenue: 48000 },
          { month: 'Apr', revenue: 61000 },
          { month: 'May', revenue: 58000 },
          { month: 'Jun', revenue: 67000 },
        ],
        insights: 'Revenue has been steadily increasing, with a 49% growth from January to June.',
      };
    } else if (queryLower.includes('engagement') || queryLower.includes('likes')) {
      response = {
        type: 'chart',
        chartType: 'bar',
        title: 'Engagement by Platform',
        data: [
          { platform: 'LinkedIn', engagement: 1250 },
          { platform: 'Twitter', engagement: 890 },
          { platform: 'Email', engagement: 2100 },
        ],
        insights: 'Email campaigns generate the highest engagement, followed by LinkedIn posts.',
      };
    } else if (queryLower.includes('leads') || queryLower.includes('conversion')) {
      response = {
        type: 'metric',
        title: 'Lead Conversion Metrics',
        metrics: [
          { label: 'Total Leads', value: 156, change: '+12%' },
          { label: 'Conversion Rate', value: '23%', change: '+3%' },
          { label: 'Avg. Deal Size', value: '$2,450', change: '+8%' },
        ],
        insights: 'Lead conversion rate has improved by 3% this month, with higher quality leads coming from LinkedIn.',
      };
    } else {
      response = {
        type: 'text',
        title: 'AI Analysis',
        content: `I analyzed your query about "${query}". Here's what I found: Your marketing performance has been strong this month with a 15% increase in engagement across all platforms. LinkedIn continues to be your top-performing channel, generating 40% of your qualified leads.`,
        recommendations: [
          'Consider increasing LinkedIn posting frequency',
          'Focus on video content for better engagement',
          'Schedule follow-ups with high-priority leads',
        ],
      };
    }

    res.json({ success: true, response });
  } catch (error) {
    console.error('Natural language query error:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

// Get scheduled reports
app.get('/api/ai-reports/scheduled/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    // Mock scheduled reports
    const reports = [
      {
        id: '1',
        name: 'Weekly Marketing Report',
        type: 'weekly',
        lastSent: '2024-01-15T09:00:00Z',
        nextSend: '2024-01-22T09:00:00Z',
        recipients: ['ceo@company.com', 'marketing@company.com'],
        isActive: true,
      },
      {
        id: '2',
        name: 'Monthly Sales Summary',
        type: 'monthly',
        lastSent: '2024-01-01T09:00:00Z',
        nextSend: '2024-02-01T09:00:00Z',
        recipients: ['sales@company.com'],
        isActive: true,
      },
    ];

    res.json({ reports });
  } catch (error) {
    console.error('Get scheduled reports error:', error);
    res.status(500).json({ error: 'Failed to get scheduled reports' });
  }
});

// ==================== STRIPE & MONETIZATION ROUTES ====================

// Create Stripe checkout session
app.post('/api/stripe/create-checkout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, plan } = req.body;

    if (!organizationId || !plan) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Plan pricing (in cents)
    const planPrices: { [key: string]: number } = {
      pro: 2900, // $29/month
      enterprise: 9900, // $99/month
    };

    const price = planPrices[plan];
    if (!price) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Create Stripe checkout session (simplified - you'll need actual Stripe integration)
    const checkoutSession = {
      id: `cs_${Date.now()}`,
      url: `https://checkout.stripe.com/pay/cs_${Date.now()}`,
      success_url: `${process.env.FRONTEND_URL}/dashboard?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?canceled=true`,
    };

    res.json({ success: true, session: checkoutSession });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Handle Stripe webhook
app.post('/api/stripe/webhook', async (req: Request, res: Response) => {
  try {
    // In a real implementation, you'd verify the webhook signature
    const event = req.body;

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        // Update subscription status
        await prisma.subscription.upsert({
          where: {
            organizationId: session.metadata.organizationId,
          },
          create: {
            userId: session.metadata.userId,
            organizationId: session.metadata.organizationId,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            plan: session.metadata.plan,
            status: 'active',
            currentPeriodStart: new Date(session.current_period_start * 1000),
            currentPeriodEnd: new Date(session.current_period_end * 1000),
          },
          update: {
            status: 'active',
            currentPeriodStart: new Date(session.current_period_start * 1000),
            currentPeriodEnd: new Date(session.current_period_end * 1000),
          },
        });

        // Update organization plan
        await prisma.organization.update({
          where: { id: session.metadata.organizationId },
          data: { plan: session.metadata.plan },
        });
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: 'cancelled' },
        });
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get subscription status
app.get('/api/subscription/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    res.json({
      subscription,
      plan: organization?.plan || 'free',
      isActive: subscription?.status === 'active',
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// Get usage stats
app.get('/api/usage/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { period = 'monthly' } = req.query;

    const now = new Date();
    const startOfPeriod = period === 'monthly' 
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);

    const usage = await prisma.usage.findMany({
      where: {
        organizationId,
        date: { gte: startOfPeriod },
      },
    });

    // Calculate totals
    const totals = usage.reduce((acc, record) => {
      acc[record.resource] = (acc[record.resource] || 0) + record.count;
      return acc;
    }, {} as { [key: string]: number });

    // Plan limits
    const limits = {
      free: { tasks: 10, posts: 5, emails: 3, leads: 20 },
      pro: { tasks: 100, posts: 50, emails: 25, leads: 200 },
      enterprise: { tasks: 1000, posts: 500, emails: 250, leads: 2000 },
    };

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const plan = organization?.plan || 'free';
    const planLimits = limits[plan as keyof typeof limits];

    res.json({
      usage: totals,
      limits: planLimits,
      plan,
      period,
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

// Check usage limits
app.post('/api/usage/check', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, resource, count = 1 } = req.body;

    if (!organizationId || !resource) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    const plan = organization?.plan || 'free';
    const limits = {
      free: { tasks: 10, posts: 5, emails: 3, leads: 20 },
      pro: { tasks: 100, posts: 50, emails: 25, leads: 200 },
      enterprise: { tasks: 1000, posts: 500, emails: 250, leads: 2000 },
    };

    const planLimits = limits[plan as keyof typeof limits];
    const limit = planLimits[resource as keyof typeof planLimits];

    if (!limit) {
      return res.status(400).json({ error: 'Invalid resource' });
    }

    // Get current usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const currentUsage = await prisma.usage.findMany({
      where: {
        organizationId,
        resource,
        date: { gte: startOfMonth },
      },
    });

    const totalUsage = currentUsage.reduce((sum, record) => sum + record.count, 0);

    const canProceed = totalUsage + count <= limit;

    res.json({
      canProceed,
      currentUsage: totalUsage,
      limit,
      remaining: Math.max(0, limit - totalUsage),
      plan,
    });
  } catch (error) {
    console.error('Check usage error:', error);
    res.status(500).json({ error: 'Failed to check usage' });
  }
});

// Record usage
app.post('/api/usage/record', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, userId, resource, count = 1 } = req.body;

    if (!organizationId || !userId || !resource) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    await prisma.usage.upsert({
      where: {
        organizationId_userId_resource_period_date: {
          organizationId,
          userId,
          resource,
          period: 'monthly',
          date: today,
        },
      },
      create: {
        organizationId,
        userId,
        resource,
        count,
        period: 'monthly',
        date: today,
      },
      update: {
        count: {
          increment: count,
        },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Record usage error:', error);
    res.status(500).json({ error: 'Failed to record usage' });
  }
});

// ==================== AUTONOMOUS TASK EXECUTOR ====================

// Simple task executor (runs every minute)
const executePendingTasks = async () => {
  try {
    const pendingTasks = await prisma.autonomousTask.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: new Date() } },
        ],
      },
      take: 10,
    });

    for (const task of pendingTasks) {
      // Mark task as in progress
      await prisma.autonomousTask.update({
        where: { id: task.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      try {
        let output: any = {};

        // Execute task based on type
        const taskInput = task.input as any;
        const prompt = taskInput?.prompt || 'AI-generated content';

        switch (task.taskType) {
          case 'social_media_post':
            output = {
              posts: [
                {
                  content: `🚀 Exciting news! ${prompt}`,
                  hashtags: '#AI #Innovation #Business #Technology',
                  platform: 'LinkedIn',
                  type: 'Post',
                },
              ],
            };
            break;

          case 'email_campaign':
            output = {
              subject: `AI-Generated Campaign: ${prompt}`,
              content: `Dear valued customer,\n\n${prompt}\n\nBest regards,\nYour AI CEO`,
            };
            break;

          case 'lead_followup':
            output = {
              leadName: 'John Doe',
              leadEmail: 'john@example.com',
              leadCompany: 'Example Corp',
              message: `Hi John,\n\nI wanted to follow up on our conversation about ${prompt}.\n\nBest regards,\nYour AI CEO`,
            };
            break;

          default:
            output = {
              message: `Task completed: ${prompt}`,
              timestamp: new Date().toISOString(),
            };
        }

        // Mark task as completed
        await prisma.autonomousTask.update({
          where: { id: task.id },
          data: {
            status: 'COMPLETED',
            output,
            completedAt: new Date(),
          },
        });

        console.log(`✅ Task ${task.id} completed successfully`);
      } catch (error) {
        // Mark task as failed
        await prisma.autonomousTask.update({
          where: { id: task.id },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          },
        });

        console.error(`❌ Task ${task.id} failed:`, error);
      }
    }
  } catch (error) {
    console.error('Task executor error:', error);
  }
};

// Run task executor every minute
setInterval(executePendingTasks, 60000);

// ==================== SERVER START ====================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🤖 Autonomous task executor started (runs every minute)`);
});

export default app;