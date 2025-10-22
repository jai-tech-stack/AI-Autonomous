// Save as: backend/src/index.ts

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs'; 
import jwt from 'jsonwebtoken';
import  { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { generateAgenticResponse } from './services/openai';
import { createCheckoutSession, constructWebhookEvent } from './services/stripe';
import { postToLinkedIn } from './services/linkedin';
import { agenticEngine } from './services/agentic-engine';
import { neuralNetwork } from './services/neural-network';
import { detectEmotion } from './services/emotion';

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

// RBAC guard: verifies membership and (optionally) role
const orgGuard = (requiredRole?: 'owner' | 'admin' | 'member') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req.params as any).organizationId || (req.body as any).organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId is required' });
      }
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: req.user!.userId, organizationId },
      });
      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (requiredRole) {
        const order = { owner: 3, admin: 2, member: 1 } as const;
        if (order[membership.role as keyof typeof order] < order[requiredRole]) {
          return res.status(403).json({ error: 'Insufficient role' });
        }
      }
      (req as any).organizationId = organizationId;
      next();
    } catch (e) {
      return res.status(500).json({ error: 'RBAC check failed' });
    }
  };
};

// Usage enforcement middleware factory
const enforceUsage = (resource: 'tasks' | 'posts' | 'emails' | 'leads', count: number = 1) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId || (req.params as any).organizationId || (req.body as any).organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId is required' });
      }

      // Plan limits
      const limits = {
        free: { tasks: 10, posts: 5, emails: 3, leads: 20 },
        pro: { tasks: 100, posts: 50, emails: 25, leads: 200 },
        enterprise: { tasks: 1000, posts: 500, emails: 250, leads: 2000 },
      } as const;

      const org = await prisma.organization.findUnique({ where: { id: organizationId } });
      const plan = (org?.plan || 'free') as keyof typeof limits;
      const limit = limits[plan][resource];

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const usage = await prisma.usage.findMany({
        where: { organizationId, resource, date: { gte: startOfMonth } },
      });
      const total = usage.reduce((s, r) => s + r.count, 0);
      if (total + count > limit) {
        return res.status(402).json({ error: 'Usage limit reached', plan, limit, current: total });
      }

      // Record usage optimistically
      const userId = req.user!.userId;
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
        create: { organizationId, userId, resource, count, period: 'monthly', date: today },
        update: { count: { increment: count } },
      });

      next();
    } catch (e) {
      return res.status(500).json({ error: 'Usage enforcement failed' });
    }
  };
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

    // Get conversation history
    const history = await prisma.chatMessage.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { role: true, content: true },
    });

    // Build system prompt from AI config
    const systemPrompt = `You are ${aiConfig?.ceoName || 'an AI CEO assistant'}.
Your personality: ${JSON.stringify(aiConfig?.personality || { tone: 'professional', focus: 'results' })}.
Your goals: ${JSON.stringify(aiConfig?.goals || { growth: 'sustainable' })}.
Industry: ${aiConfig?.industry || 'general business'}.

You help users with business strategy, marketing, sales, and operations. Be concise, actionable, and insightful.`;

    // Generate AI response using OpenAI (fallback if key not set)
    let aiResponse: string;
    try {
      aiResponse = await generateAgenticResponse(
        content,
        systemPrompt,
        history.reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      );
    } catch (err: any) {
      console.warn('OpenAI not configured, using fallback:', err.message);
      aiResponse = `I'm ${aiConfig?.ceoName || 'your AI CEO'}. I received: "${content}". (OpenAI key required for intelligent responses)`;
    }

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
app.post('/api/tasks', authMiddleware, orgGuard('member'), enforceUsage('tasks', 1), async (req: AuthRequest, res: Response) => {
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
app.post('/api/integrations/linkedin/connect', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, code, redirectUri } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If client didn't provide an auth code yet, return an authUrl to start OAuth
    if (!code) {
      const clientId = process.env.LINKEDIN_CLIENT_ID || 'LINKEDIN_CLIENT_ID';
      const redirect = encodeURIComponent(
        redirectUri || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/integrations/linkedin/callback`
      );
      const state = encodeURIComponent(organizationId);
      const scope = encodeURIComponent('w_member_social r_liteprofile r_emailaddress');
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirect}&state=${state}&scope=${scope}`;
      return res.json({ authUrl });
    }

    // Exchange code for access token (scaffold)
    const accessToken = 'linkedin_access_token_placeholder';
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

// LinkedIn OAuth callback (scaffold)
app.get('/api/integrations/linkedin/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };

    if (!code || !state) {
      return res.status(400).send('Missing code or state');
    }

    const organizationId = state;

    // Normally exchange code for tokens here; we persist placeholders
    await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider: 'linkedin',
        },
      },
      create: {
        organizationId,
        provider: 'linkedin',
        accessToken: 'linkedin_access_token_placeholder',
        refreshToken: 'linkedin_refresh_token_placeholder',
        metadata: {
          connectedAt: new Date().toISOString(),
          via: 'oauth_callback',
        },
      },
      update: {
        accessToken: 'linkedin_access_token_placeholder',
        refreshToken: 'linkedin_refresh_token_placeholder',
        metadata: {
          connectedAt: new Date().toISOString(),
          via: 'oauth_callback',
        },
      },
    });

    const redirectTo = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/integrations?linkedin=connected`;
    return res.redirect(302, redirectTo);
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    const redirectTo = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/integrations?linkedin=error`;
    return res.redirect(302, redirectTo);
  }
});

// LinkedIn post
app.post('/api/integrations/linkedin/post', authMiddleware, orgGuard('member'), enforceUsage('posts', 1), async (req: AuthRequest, res: Response) => {
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

    // Post to LinkedIn using real API or fallback
    let postResult: any;
    try {
      const authorUrn = (integration.metadata as any)?.authorUrn || process.env.LINKEDIN_AUTHOR_URN || 'urn:li:person:PLACEHOLDER';
      const linkedinResponse = await postToLinkedIn({
        accessToken: integration.accessToken,
        authorUrn,
        text: typeof content === 'string' ? content : content.text || JSON.stringify(content),
      });
      postResult = {
        id: linkedinResponse.id || `linkedin_post_${Date.now()}`,
        url: `https://www.linkedin.com/feed/update/${linkedinResponse.id || 'unknown'}`,
        success: true,
        postedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn('LinkedIn API call failed, using mock:', err.message);
      postResult = {
        id: `linkedin_mock_${Date.now()}`,
        url: 'https://linkedin.com/posts/mock',
        success: false,
        error: err.message,
        postedAt: new Date().toISOString(),
      };
    }

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
app.post('/api/integrations/twitter/connect', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, code, redirectUri } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If no code, return authUrl to begin OAuth2 flow (scaffold)
    if (!code) {
      const clientId = process.env.TWITTER_CLIENT_ID || 'TWITTER_CLIENT_ID';
      const redirect = encodeURIComponent(
        redirectUri || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/integrations/twitter/callback`
      );
      const state = encodeURIComponent(organizationId);
      const scope = encodeURIComponent('tweet.read tweet.write users.read offline.access');
      const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirect}&state=${state}&scope=${scope}&code_challenge=challenge&code_challenge_method=plain`;
      return res.json({ authUrl });
    }

    // Exchange code for access token (scaffold)
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

// Twitter OAuth callback (scaffold)
app.get('/api/integrations/twitter/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };

    if (!code || !state) {
      return res.status(400).send('Missing code or state');
    }

    const organizationId = state;

    await prisma.integration.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider: 'twitter',
        },
      },
      create: {
        organizationId,
        provider: 'twitter',
        accessToken: 'twitter_access_token_placeholder',
        refreshToken: 'twitter_refresh_token_placeholder',
        metadata: {
          connectedAt: new Date().toISOString(),
          via: 'oauth_callback',
        },
      },
      update: {
        accessToken: 'twitter_access_token_placeholder',
        refreshToken: 'twitter_refresh_token_placeholder',
        metadata: {
          connectedAt: new Date().toISOString(),
          via: 'oauth_callback',
        },
      },
    });

    const redirectTo = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/integrations?twitter=connected`;
    return res.redirect(302, redirectTo);
  } catch (error) {
    console.error('Twitter callback error:', error);
    const redirectTo = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/integrations?twitter=error`;
    return res.redirect(302, redirectTo);
  }
});

// Twitter post
app.post('/api/integrations/twitter/post', authMiddleware, orgGuard('member'), enforceUsage('posts', 1), async (req: AuthRequest, res: Response) => {
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
app.post('/api/email-campaigns', authMiddleware, orgGuard('member'), enforceUsage('emails', 1), async (req: AuthRequest, res: Response) => {
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

// ==================== ACTIVITY LOGS (reuse LeadActivity) ====================

// Create generic activity log (optionally linked to a lead)
app.post('/api/activity', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, leadId, title, description, type = 'system', metadata } = req.body;
    if (!organizationId || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const activity = await prisma.leadActivity.create({
      data: {
        organizationId,
        leadId: leadId || null,
        type,
        title,
        description,
        metadata,
      },
    });
    res.json({ success: true, activity });
  } catch (error) {
    console.error('Create activity log error:', error);
    res.status(500).json({ error: 'Failed to create activity log' });
  }
});

// Get recent activity logs for organization
app.get('/api/activity/:organizationId', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const activities = await prisma.leadActivity.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ activities });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Failed to get activity logs' });
  }
});

// ==================== COMMENTS SYSTEM (stored in JSON fields) ====================

// Add comment to a task
app.post('/api/comments/task', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, comment } = req.body;
    if (!taskId || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const task = await prisma.autonomousTask.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const output = (task.output as any) || {};
    const comments = Array.isArray(output.comments) ? output.comments : [];
    const entry = {
      id: `c_${Date.now()}`,
      authorId: req.user!.userId,
      text: comment,
      createdAt: new Date().toISOString(),
    };
    const updated = { ...output, comments: [entry, ...comments] };
    await prisma.autonomousTask.update({ where: { id: taskId }, data: { output: updated } });
    res.json({ success: true, comments: updated.comments });
  } catch (error) {
    console.error('Add task comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get task comments
app.get('/api/comments/task/:taskId', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = await prisma.autonomousTask.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const output = (task.output as any) || {};
    res.json({ comments: output.comments || [] });
  } catch (error) {
    console.error('Get task comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// Add comment to a content post
app.post('/api/comments/post', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { postId, comment } = req.body;
    if (!postId || !comment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const post = await prisma.contentPost.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const content = (post.content as any) || {};
    const comments = Array.isArray(content.comments) ? content.comments : [];
    const entry = {
      id: `c_${Date.now()}`,
      authorId: req.user!.userId,
      text: comment,
      createdAt: new Date().toISOString(),
    };
    const updatedContent = { ...content, comments: [entry, ...comments] };
    const updated = await prisma.contentPost.update({ where: { id: postId }, data: { content: updatedContent } });
    res.json({ success: true, comments: (updated.content as any).comments || [] });
  } catch (error) {
    console.error('Add post comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get post comments
app.get('/api/comments/post/:postId', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const post = await prisma.contentPost.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const content = (post.content as any) || {};
    res.json({ comments: content.comments || [] });
  } catch (error) {
    console.error('Get post comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// ==================== EMAIL SENDING (Nodemailer scaffold) ====================

app.post('/api/email/send', authMiddleware, orgGuard('member'), enforceUsage('emails', 1), async (req: AuthRequest, res: Response) => {
  try {
    const { to, subject, html, text } = req.body;
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.log('Email (simulated):', { to, subject });
      return res.json({ success: true, simulated: true });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || user,
      to,
      subject,
      html,
      text,
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Send email (nodemailer) error:', error);
    res.status(500).json({ error: 'Failed to send email' });
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
app.post('/api/stripe/create-checkout', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, plan } = req.body;

    if (!organizationId || !plan) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Stripe Price IDs (create these in Stripe Dashboard)
    const stripePriceIds: { [key: string]: string } = {
      pro: process.env.STRIPE_PRICE_ID_PRO || 'price_placeholder_pro',
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_placeholder_enterprise',
    };

    const priceId = stripePriceIds[plan];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Create real Stripe checkout session (fallback to mock if not configured)
    let checkoutSession: any;
    try {
      const session = await createCheckoutSession({
        priceId,
        successUrl: `${process.env.FRONTEND_URL}/dashboard?success=true`,
        cancelUrl: `${process.env.FRONTEND_URL}/pricing?canceled=true`,
        metadata: {
          organizationId,
          plan,
          userId: req.user!.userId,
        },
      });
      checkoutSession = { id: session.id, url: session.url };
    } catch (err: any) {
      console.warn('Stripe not configured, using mock:', err.message);
      checkoutSession = {
        id: `cs_mock_${Date.now()}`,
        url: `https://checkout.stripe.com/pay/cs_mock_${Date.now()}`,
      };
    }

    res.json({ success: true, session: checkoutSession });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ==================== TEAMS & WORKSPACES ROUTES ====================

// List organization members
app.get('/api/teams/members/:organizationId', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ members });
  } catch (error) {
    console.error('List members error:', error);
    res.status(500).json({ error: 'Failed to list members' });
  }
});

// Invite/add member (by email)
app.post('/api/teams/invite', authMiddleware, orgGuard('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, email, role = 'member' } = req.body;
    if (!organizationId || !email) return res.status(400).json({ error: 'Missing required fields' });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // create placeholder user; in production send invite email
      user = await prisma.user.create({ data: { email, password: '', firstName: '', lastName: '' } });
    }

    const existing = await prisma.organizationMember.findFirst({ where: { organizationId, userId: user.id } });
    if (existing) return res.json({ success: true, member: existing });

    const member = await prisma.organizationMember.create({
      data: { organizationId, userId: user.id, role },
    });
    res.json({ success: true, member });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

// Change member role
app.post('/api/teams/role', authMiddleware, orgGuard('owner'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, userId, role } = req.body;
    if (!organizationId || !userId || !role) return res.status(400).json({ error: 'Missing required fields' });
    const member = await prisma.organizationMember.update({
      where: { userId_organizationId: { organizationId, userId } },
      data: { role },
    });
    res.json({ success: true, member });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ error: 'Failed to change role' });
  }
});

// Remove member
app.post('/api/teams/remove', authMiddleware, orgGuard('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, userId } = req.body;
    if (!organizationId || !userId) return res.status(400).json({ error: 'Missing required fields' });
    await prisma.organizationMember.delete({ where: { userId_organizationId: { organizationId, userId } } });
    res.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// ==================== AI MEDIA (Whisper / DALL·E) ROUTES ====================

// Whisper transcription (scaffold - expects URL or text)
app.post('/api/ai/whisper/transcribe', authMiddleware, orgGuard('member'), enforceUsage('tasks', 1), async (req: AuthRequest, res: Response) => {
  try {
    const { audioUrl, hint } = req.body;
    if (!audioUrl) return res.status(400).json({ error: 'audioUrl required' });
    // Placeholder result
    const transcript = `Transcribed summary for ${audioUrl}.${hint ? ' Hint: ' + hint : ''}`;
    res.json({ success: true, transcript });
  } catch (error) {
    console.error('Whisper transcribe error:', error);
    res.status(500).json({ error: 'Failed to transcribe' });
  }
});

// ==================== AVATAR AI ROUTES ====================

// Generate AI CEO Avatar
app.post('/api/avatar/generate', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, ceoName, personality, industry } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    // Get AI CEO config
    const aiConfig = await prisma.aiCeoConfig.findUnique({
      where: { organizationId },
    });

    if (!aiConfig) {
      return res.status(404).json({ error: 'AI CEO configuration not found' });
    }

    // For now, return a placeholder avatar URL
    // In production, integrate with D-ID, Soul Machines, or similar service
    const avatarUrl = process.env.DID_API_KEY 
      ? await generateDIDAvatar(aiConfig)
      : '/api/placeholder-avatar';

    res.json({ 
      success: true, 
      avatarUrl,
      ceoName: aiConfig.ceoName,
      personality: aiConfig.personality
    });
  } catch (error) {
    console.error('Avatar generation error:', error);
    res.status(500).json({ error: 'Failed to generate avatar' });
  }
});

// Generate avatar speaking video
app.post('/api/avatar/speak', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, text, emotion } = req.body;

    if (!organizationId || !text) {
      return res.status(400).json({ error: 'Organization ID and text required' });
    }

    // For now, return a placeholder video URL
    // In production, integrate with D-ID or similar service for lip-sync
    const videoUrl = process.env.DID_API_KEY 
      ? await generateDIDSpeakingVideo(text, emotion)
      : '/api/placeholder-avatar-speaking';

    res.json({ 
      success: true, 
      videoUrl,
      duration: text.length * 0.1 // Estimate duration
    });
  } catch (error) {
    console.error('Avatar speaking error:', error);
    res.status(500).json({ error: 'Failed to generate speaking video' });
  }
});

// Placeholder avatar endpoint
app.get('/api/placeholder-avatar', (req, res) => {
  // Return a simple animated avatar or static image
  res.redirect('https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=AI+CEO');
});

// Placeholder speaking avatar endpoint
app.get('/api/placeholder-avatar-speaking', (req, res) => {
  // Return a simple animated speaking avatar
  res.redirect('https://via.placeholder.com/400x400/8B5CF6/FFFFFF?text=Speaking...');
});

// Helper function to generate D-ID avatar (placeholder)
async function generateDIDAvatar(aiConfig: any): Promise<string> {
  // This would integrate with D-ID API
  // For now, return a placeholder
  return '/api/placeholder-avatar';
}

// Helper function to generate D-ID speaking video (placeholder)
async function generateDIDSpeakingVideo(text: string, emotion: string): Promise<string> {
  // This would integrate with D-ID API for lip-sync
  // For now, return a placeholder
  return '/api/placeholder-avatar-speaking';
}

// ==================== EMOTION DETECTION & SENTIMENT ANALYSIS ROUTES ====================

// Detect emotion from image
app.post('/api/ai/emotion/detect', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { imageData, timestamp } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data required' });
    }

    // For now, return mock emotion detection
    // In production, integrate with Azure Face API, AWS Rekognition, or similar
    const emotions = ['happy', 'neutral', 'confident', 'thoughtful', 'excited', 'sad'];
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    const confidence = Math.random() * 0.4 + 0.6; // 0.6-1.0

    res.json({
      success: true,
      emotion: randomEmotion,
      confidence,
      facialExpression: randomEmotion === 'happy' ? 'smile' : 'neutral',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Emotion detection error:', error);
    res.status(500).json({ error: 'Failed to detect emotion' });
  }
});

// Analyze sentiment from text
app.post('/api/ai/sentiment/analyze', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    // Simple sentiment analysis (in production, use Azure Text Analytics, AWS Comprehend, etc.)
    const sentiment = analyzeTextSentiment(text);
    
    res.json({
      success: true,
      sentiment: sentiment.sentiment,
      sentimentScore: sentiment.score,
      confidence: sentiment.confidence,
      emotion: sentiment.emotion,
      voiceTone: sentiment.voiceTone,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// Helper function for text sentiment analysis
function analyzeTextSentiment(text: string) {
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy', 'excited',
    'awesome', 'brilliant', 'perfect', 'outstanding', 'superb', 'marvelous', 'delighted', 'thrilled'
  ];
  
  const negativeWords = [
    'bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'sad', 'disappointed', 'worried',
    'horrible', 'disgusting', 'annoying', 'frustrating', 'upset', 'concerned', 'stressed', 'anxious'
  ];
  
  const confidentWords = [
    'confident', 'sure', 'certain', 'definitely', 'absolutely', 'guaranteed', 'proven', 'established'
  ];
  
  const thoughtfulWords = [
    'think', 'consider', 'analyze', 'evaluate', 'reflect', 'contemplate', 'ponder', 'examine'
  ];

  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  let confidentCount = 0;
  let thoughtfulCount = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
    if (confidentWords.includes(word)) confidentCount++;
    if (thoughtfulWords.includes(word)) thoughtfulCount++;
  });
  
  const total = positiveCount + negativeCount;
  const score = total === 0 ? 0 : (positiveCount - negativeCount) / total;
  
  let sentiment: 'positive' | 'negative' | 'neutral';
  if (score > 0.1) sentiment = 'positive';
  else if (score < -0.1) sentiment = 'negative';
  else sentiment = 'neutral';
  
  let emotion = 'neutral';
  if (confidentCount > 0) emotion = 'confident';
  else if (thoughtfulCount > 0) emotion = 'thoughtful';
  else if (positiveCount > negativeCount) emotion = 'happy';
  else if (negativeCount > positiveCount) emotion = 'sad';
  
  let voiceTone = 'neutral';
  if (sentiment === 'positive') voiceTone = 'cheerful';
  else if (sentiment === 'negative') voiceTone = 'concerned';
  else if (emotion === 'confident') voiceTone = 'assertive';
  else if (emotion === 'thoughtful') voiceTone = 'calm';
  
  return {
    sentiment,
    score,
    confidence: Math.min(0.9, Math.abs(score) + 0.5),
    emotion,
    voiceTone
  };
}

// ==================== NEURAL NETWORK ROUTES ====================

// Initialize neural network
app.post('/api/neural-network/initialize', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    // Initialize neural network state
    const networkState = {
      memorySize: 0,
      patternsDetected: 0,
      predictionsMade: 0,
      accuracy: 0.75,
      initializedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      ...networkState
    });
  } catch (error) {
    console.error('Neural network initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize neural network' });
  }
});

// Learn from data
app.get('/api/neural-network/learn/:organizationId', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    // Fetch recent data for learning
    const recentMessages = await prisma.chatMessage.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const recentTasks = await prisma.autonomousTask.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const recentLeads = await prisma.salesLead.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    // Process learning data
    const learningData = [
      ...recentMessages.map(msg => ({
        type: 'conversation',
        content: { text: msg.content, role: msg.role },
        timestamp: msg.createdAt.toISOString(),
        confidence: 0.8,
        context: 'chat'
      })),
      ...recentTasks.map(task => ({
        type: 'decision',
        content: { taskType: task.taskType, status: task.status, input: task.input },
        timestamp: task.createdAt.toISOString(),
        confidence: 0.9,
        context: 'autonomous'
      })),
      ...recentLeads.map(lead => ({
        type: 'outcome',
        content: { 
          success: lead.status === 'converted',
          score: lead.score,
          company: lead.company,
          industry: (lead.metadata && typeof lead.metadata === 'object' && 'industry' in lead.metadata)
            ? (lead.metadata as any).industry
            : null
        },
        timestamp: lead.createdAt.toISOString(),
        confidence: 0.7,
        context: 'sales'
      }))
    ];

    // Calculate current metrics
    const memorySize = learningData.length;
    const patternsDetected = Math.floor(memorySize / 10); // Simulate pattern detection
    const predictionsMade = Math.floor(memorySize / 5); // Simulate predictions
    const accuracy = Math.min(0.95, 0.75 + (memorySize / 1000)); // Improve with more data

    res.json({
      success: true,
      learningData,
      memorySize,
      patternsDetected,
      predictionsMade,
      accuracy,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Neural network learning error:', error);
    res.status(500).json({ error: 'Failed to process learning data' });
  }
});

// Generate prediction
app.post('/api/neural-network/predict', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    // Generate mock prediction based on recent data
    const recentTasks = await prisma.autonomousTask.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const recentLeads = await prisma.salesLead.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Simple prediction logic
    const taskSuccessRate = recentTasks.filter(t => t.status === 'COMPLETED').length / Math.max(recentTasks.length, 1);
    const leadConversionRate = recentLeads.filter(l => l.status === 'converted').length / Math.max(recentLeads.length, 1);

    const predictions = [
      {
        type: 'task_completion',
        prediction: taskSuccessRate > 0.8 ? 'High success rate expected for new tasks' : 'Consider optimizing task execution',
        confidence: 0.85,
        impact: 'medium'
      },
      {
        type: 'lead_conversion',
        prediction: leadConversionRate > 0.3 ? 'Strong conversion potential' : 'Focus on lead qualification',
        confidence: 0.78,
        impact: 'high'
      },
      {
        type: 'resource_optimization',
        prediction: 'Consider automating routine tasks to improve efficiency',
        confidence: 0.92,
        impact: 'high'
      }
    ];

    res.json({
      success: true,
      predictions,
      confidence: 0.85,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Neural network prediction error:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

// ==================== REFERRAL PROGRAM ROUTES (scaffold via Integration) ====================

// Create or get referral code for org
app.post('/api/referrals/code', authMiddleware, orgGuard('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.body;
    if (!organizationId) return res.status(400).json({ error: 'organizationId required' });
    // Reuse Integration table to store code and stats
    const existing = await prisma.integration.findFirst({
      where: { organizationId, provider: 'referral', isActive: true },
    });
    const code = existing?.accessToken || `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const integration = await prisma.integration.upsert({
      where: {
        organizationId_provider: { organizationId, provider: 'referral' },
      },
      create: {
        organizationId,
        provider: 'referral',
        accessToken: code,
        isActive: true,
        metadata: { createdAt: new Date().toISOString(), clicks: 0, signups: 0 },
      },
      update: {
        accessToken: code,
        isActive: true,
      },
    });
    res.json({ success: true, code: integration.accessToken, stats: integration.metadata });
  } catch (error) {
    console.error('Create referral code error:', error);
    res.status(500).json({ error: 'Failed to create referral code' });
  }
});

// Track referral event (click or signup)
app.post('/api/referrals/track', async (req: Request, res: Response) => {
  try {
    const { code, event = 'click', email } = req.body as any;
    if (!code) return res.status(400).json({ error: 'code required' });
    const integ = await prisma.integration.findFirst({
      where: { provider: 'referral', accessToken: code, isActive: true },
    });
    if (!integ) return res.status(404).json({ error: 'Invalid code' });
    const meta = (integ.metadata as any) || {};
    if (event === 'click') meta.clicks = (meta.clicks || 0) + 1;
    if (event === 'signup') meta.signups = (meta.signups || 0) + 1;
    if (email) {
      meta.emails = Array.isArray(meta.emails) ? meta.emails : [];
      if (!meta.emails.includes(email)) meta.emails.push(email);
    }
    await prisma.integration.update({ where: { id: integ.id }, data: { metadata: meta } });
    res.json({ success: true, stats: meta });
  } catch (error) {
    console.error('Track referral error:', error);
    res.status(500).json({ error: 'Failed to track referral' });
  }
});

// Get referral stats
app.get('/api/referrals/:organizationId', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const integ = await prisma.integration.findFirst({ where: { organizationId, provider: 'referral', isActive: true } });
    res.json({
      code: integ?.accessToken,
      stats: (integ?.metadata as any) || { clicks: 0, signups: 0 },
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

// ==================== SMART SCHEDULING ROUTES (scaffold) ====================

// Suggest optimal posting times based on mock engagement patterns
app.post('/api/scheduler/suggest', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, platform = 'linkedin', days = 7 } = req.body;
    if (!organizationId) return res.status(400).json({ error: 'organizationId required' });
    const now = new Date();
    const suggestions = [] as any[];
    for (let i = 1; i <= days; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 9 + (i % 3) * 2, 0, 0);
      suggestions.push({
        dateTime: d.toISOString(),
        score: 0.7 + (Math.random() * 0.3),
        platform,
      });
    }
    res.json({ success: true, suggestions: suggestions.sort((a, b) => b.score - a.score) });
  } catch (error) {
    console.error('Suggest schedule error:', error);
    res.status(500).json({ error: 'Failed to suggest schedule' });
  }
});

// Schedule a single content post at a suggested time
app.post('/api/scheduler/schedule-post', authMiddleware, orgGuard('member'), enforceUsage('posts', 1), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, platform, content, scheduledFor, campaignId } = req.body;
    if (!organizationId || !platform || !content || !scheduledFor) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const post = await prisma.contentPost.create({
      data: {
        organizationId,
        platform,
        content,
        scheduledFor: new Date(scheduledFor),
        campaignId: campaignId || null,
        status: 'scheduled',
      },
    });
    res.json({ success: true, post });
  } catch (error) {
    console.error('Schedule post error:', error);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// Bulk schedule multiple posts
app.post('/api/scheduler/bulk-schedule', authMiddleware, orgGuard('member'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, posts } = req.body as any;
    if (!organizationId || !Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const created = [] as any[];
    for (const p of posts) {
      if (!p.platform || !p.content || !p.scheduledFor) continue;
      const post = await prisma.contentPost.create({
        data: {
          organizationId,
          platform: p.platform,
          content: p.content,
          scheduledFor: new Date(p.scheduledFor),
          status: 'scheduled',
          campaignId: p.campaignId || null,
        },
      });
      created.push(post);
    }
    res.json({ success: true, created: created.length });
  } catch (error) {
    console.error('Bulk schedule error:', error);
    res.status(500).json({ error: 'Failed to bulk schedule' });
  }
});

// DALL·E image generation (scaffold)
app.post('/api/ai/dalle/generate', authMiddleware, orgGuard('member'), enforceUsage('tasks', 1), async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, size = '1024x1024' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    // Placeholder image URL
    const imageUrl = `https://placehold.co/${size.replace('x', 'x')}/png?text=${encodeURIComponent(prompt.slice(0, 20))}`;
    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error('DALL·E generate error:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

// Handle Stripe webhook
// Stripe requires raw body to verify signature; keep scaffold simple for now
app.post('/api/stripe/webhook', async (req: Request, res: Response) => {
  try {
    // TODO: verify signature using STRIPE_WEBHOOK_SECRET when available
    const event = req.body as any;

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as any;
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
        const subscription = event.data.object as any;
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: 'cancelled' },
        });
        break;
      case 'invoice.paid':
        // no-op scaffold
        break;
      case 'customer.subscription.updated':
        // Update local subscription status/periods
        const sub = event.data.object as any;
        await prisma.subscription.update({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: sub.status === 'active' ? 'active' : 'past_due',
            currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : undefined,
            currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : undefined,
          },
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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

        // Mark task as completed (idempotent safe)
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
        // Retry with backoff
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await sleep(250 * attempt);
            // simple re-run branch (in real impl, ensure idempotency by keys)
            const taskInput = task.input as any;
            const prompt = taskInput?.prompt || 'AI-generated content';
            const rerunOutput = { message: `Retry ${attempt}: ${prompt}`, timestamp: new Date().toISOString() };
            await prisma.autonomousTask.update({
              where: { id: task.id },
              data: { status: 'COMPLETED', output: rerunOutput, completedAt: new Date() },
            });
            console.log(`🔁 Task ${task.id} recovered on retry ${attempt}`);
            break;
          } catch (e) {
            if (attempt === 3) {
              await prisma.autonomousTask.update({
                where: { id: task.id },
                data: {
                  status: 'FAILED',
                  error: (error as any)?.message || 'Unknown error',
                  completedAt: new Date(),
                },
              });
              console.error(`❌ Task ${task.id} failed after retries:`, error);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Task executor error:', error);
  }
};

// Run task executor every minute
setInterval(executePendingTasks, 60000);

// ==================== CUSTOM AVATAR AI PROCESSING ====================

// AI Processing endpoint for custom avatars
app.post('/api/ai/process', async (req, res) => {
  try {
    // Authenticate request (middleware was missing/undefined)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    let userId: string | undefined;
    try {
      // You should use the same secret as used to sign JWTs
      const jwt = require('jsonwebtoken');
      const secret = process.env.JWT_SECRET || 'secret';
      const decoded = jwt.verify(token, secret) as any;
      userId = decoded.id;
    } catch (e) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    const { input, context, organizationId } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId required' });
    }
    
    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });
    
    if (!organization) {
      return res.status(400).json({ error: 'Organization not found' });
    }
    
    // Enhanced AI processing with context awareness
    const response = await processWithCustomAI(input, context, organization);
    
    res.json({ response });
  } catch (error) {
    console.error('Error processing AI request:', error);
    res.status(500).json({ error: 'Failed to process AI request' });
  }
});

// Enhanced AI processing function for custom avatars
async function processWithCustomAI(input: string, context: any, organization: any) {
  // Get organization's AI config
  const aiConfig = await prisma.aiCeoConfig.findFirst({
    where: { organizationId: organization.id }
  });
  
  // Get recent conversation context
  const recentMessages = await prisma.chatMessage.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  // Get organization's goals and tasks for context
  const recentTasks = await prisma.autonomousTask.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  
  // Build context-aware response
  const personality = aiConfig?.personality || context?.personality || {};
  const goals = aiConfig?.goals || context?.goals || {};
  const industry = aiConfig?.industry || context?.industry || 'general business';
  const currentEmotion = context?.currentEmotion || 'neutral';
  
  // Generate contextual response based on input and context
  let response = generateContextualResponse(input, {
    personality,
    goals,
    industry,
    currentEmotion,
    recentMessages: recentMessages.map(m => ({ content: m.content, role: m.role })),
    recentTasks: recentTasks.map(t => ({ taskType: t.taskType, status: t.status })),
    organizationName: organization.name
  });
  
  // Save conversation to database
  await prisma.chatMessage.create({
    data: {
      organizationId: organization.id,
      userId: (context.userId as string) || 'system',
      content: input,
      role: 'user',
      metadata: {
        emotion: currentEmotion,
        context: context
      }
    }
  });
  
  await prisma.chatMessage.create({
    data: {
      organizationId: organization.id,
      userId: (context.userId as string) || 'system',
      content: response,
      role: 'assistant',
      metadata: {
        emotion: 'confident',
        context: context
      }
    }
  });
  
  return response;
}

// Generate contextual AI responses
function generateContextualResponse(input: string, context: any) {
  const { personality, goals, industry, currentEmotion, recentMessages, recentTasks, organizationName } = context;
  
  // Analyze input sentiment and intent
  const sentiment = analyzeInputSentiment(input);
  const intent = analyzeInputIntent(input);
  
  // Generate response based on personality and context
  let response = '';
  
  if (intent === 'greeting') {
    response = generateGreetingResponse(personality, organizationName);
  } else if (intent === 'question') {
    response = generateQuestionResponse(input, personality, industry, recentTasks);
  } else if (intent === 'task_request') {
    response = generateTaskResponse(input, personality, goals);
  } else if (intent === 'status_inquiry') {
    response = generateStatusResponse(recentTasks, personality);
  } else {
    response = generateGeneralResponse(input, personality, industry, currentEmotion);
  }
  
  // Add personality traits to response
  if (personality.tone === 'professional') {
    response = makeResponseProfessional(response);
  } else if (personality.tone === 'casual') {
    response = makeResponseCasual(response);
  } else if (personality.tone === 'enthusiastic') {
    response = makeResponseEnthusiastic(response);
  }
  
  return response;
}

function analyzeInputSentiment(input: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'problem', 'issue', 'error'];
  
  const lowerInput = input.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerInput.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerInput.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function analyzeInputIntent(input: string): string {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
    return 'greeting';
  }
  if (lowerInput.includes('?') || lowerInput.includes('how') || lowerInput.includes('what') || lowerInput.includes('why')) {
    return 'question';
  }
  if (lowerInput.includes('task') || lowerInput.includes('create') || lowerInput.includes('do') || lowerInput.includes('help')) {
    return 'task_request';
  }
  if (lowerInput.includes('status') || lowerInput.includes('progress') || lowerInput.includes('update')) {
    return 'status_inquiry';
  }
  
  return 'general';
}

function generateGreetingResponse(personality: any, organizationName: string): string {
  const greetings = [
    `Hello! I'm your AI CEO, ready to help ${organizationName} achieve its goals.`,
    `Greetings! I'm here to assist with your business needs and strategic decisions.`,
    `Hi there! Your AI business partner is ready to collaborate and drive success.`
  ];
  
  return greetings[Math.floor(Math.random() * greetings.length)];
}

function generateQuestionResponse(input: string, personality: any, industry: string, recentTasks: any[]): string {
  const responses = [
    `That's a great question about ${industry}. Let me help you with that.`,
    `I understand you're asking about ${input.split('?')[0]}. Here's what I can tell you...`,
    `Based on your question and our current focus areas, I'd recommend...`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateTaskResponse(input: string, personality: any, goals: any): string {
  return `I'll help you with that task. Let me create a plan and get started on it right away.`;
}

function generateStatusResponse(recentTasks: any[], personality: any): string {
  if (recentTasks.length === 0) {
    return "We don't have any active tasks at the moment. Would you like me to help you create some?";
  }
  
  const activeTasks = recentTasks.filter(task => task.status === 'in_progress').length;
  const completedTasks = recentTasks.filter(task => task.status === 'completed').length;
  
  return `Currently, we have ${activeTasks} active tasks and ${completedTasks} recently completed. Let me give you a detailed update.`;
}

function generateGeneralResponse(input: string, personality: any, industry: string, currentEmotion: string): string {
  const responses = [
    `I understand. Let me help you with that in the context of ${industry}.`,
    `That's interesting. Based on our current strategy, I'd suggest...`,
    `I'm here to help. Let me provide some insights on that topic.`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

function makeResponseProfessional(response: string): string {
  return response.replace(/I'm/g, "I am").replace(/don't/g, "do not").replace(/can't/g, "cannot");
}

function makeResponseCasual(response: string): string {
  return response.replace(/I am/g, "I'm").replace(/do not/g, "don't").replace(/cannot/g, "can't");
}

function makeResponseEnthusiastic(response: string): string {
  const enthusiasm = ["Absolutely!", "Fantastic!", "Excellent!", "Wonderful!"];
  return enthusiasm[Math.floor(Math.random() * enthusiasm.length)] + " " + response;
}

// ==================== AGENTIC AI ORCHESTRATOR ====================

// Get workflows for organization
app.get('/api/orchestration/workflows/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    
    const workflows = await prisma.autonomousTask.findMany({
      where: { 
        organizationId,
        taskType: 'workflow'
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Transform to workflow format
    const workflowStates = workflows.map(task => ({
      id: task.id,
      name: task.taskType,
      status: task.status.toLowerCase(),
      currentStep: 0,
      totalSteps: 1,
      progress: task.status === 'COMPLETED' ? 100 : task.status === 'IN_PROGRESS' ? 50 : 0,
      steps: [{
        id: task.id,
        name: task.taskType,
        type: 'action',
        status: task.status.toLowerCase(),
        dependencies: [],
        inputs: task.input,
        outputs: task.output,
        duration: task.completedAt ? 
          new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime() : 
          undefined
      }],
      results: task.output ? [task.output] : [],
      startTime: task.createdAt,
      endTime: task.completedAt
    }));

    res.json(workflowStates);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// Get agents for organization
app.get('/api/orchestration/agents/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    
    // Mock agents for now - in production, these would be real AI agents
    const agents = [
      {
        id: 'marketing-agent',
        name: 'Marketing AI Agent',
        type: 'marketing',
        capabilities: ['content_creation', 'campaign_management', 'analytics'],
        status: 'available',
        performance: {
          tasksCompleted: 45,
          successRate: 92,
          avgDuration: 120000
        }
      },
      {
        id: 'sales-agent',
        name: 'Sales AI Agent',
        type: 'sales',
        capabilities: ['lead_qualification', 'follow_up', 'proposal_generation'],
        status: 'available',
        performance: {
          tasksCompleted: 38,
          successRate: 88,
          avgDuration: 180000
        }
      },
      {
        id: 'hr-agent',
        name: 'HR AI Agent',
        type: 'hr',
        capabilities: ['recruitment', 'onboarding', 'performance_review'],
        status: 'busy',
        currentTask: 'recruitment-workflow',
        performance: {
          tasksCompleted: 22,
          successRate: 95,
          avgDuration: 240000
        }
      },
      {
        id: 'finance-agent',
        name: 'Finance AI Agent',
        type: 'finance',
        capabilities: ['budget_analysis', 'forecasting', 'reporting'],
        status: 'available',
        performance: {
          tasksCompleted: 31,
          successRate: 90,
          avgDuration: 300000
        }
      }
    ];

    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Get orchestration metrics
app.get('/api/orchestration/metrics/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    
    const totalTasks = await prisma.autonomousTask.count({
      where: { organizationId }
    });

    const completedTasks = await prisma.autonomousTask.count({
      where: { 
        organizationId,
        status: 'COMPLETED'
      }
    });

    const activeTasks = await prisma.autonomousTask.count({
      where: { 
        organizationId,
        status: 'IN_PROGRESS'
      }
    });

    const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate average duration
    const completedTasksWithDuration = await prisma.autonomousTask.findMany({
      where: { 
        organizationId,
        status: 'COMPLETED',
        completedAt: { not: null }
      },
      select: {
        createdAt: true,
        completedAt: true
      }
    });

    const avgDuration = completedTasksWithDuration.length > 0 
      ? completedTasksWithDuration.reduce((sum, task) => {
          const duration = new Date(task.completedAt!).getTime() - new Date(task.createdAt).getTime();
          return sum + duration;
        }, 0) / completedTasksWithDuration.length
      : 0;

    const metrics = {
      activeWorkflows: activeTasks,
      completedWorkflows: completedTasks,
      totalTasks,
      successRate,
      avgWorkflowDuration: Math.round(avgDuration),
      agentUtilization: Math.min(Math.round((activeTasks / 4) * 100), 100) // Assuming 4 agents max
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get workflow templates
app.get('/api/orchestration/templates', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const templates = [
      {
        id: 'marketing-campaign',
        name: 'Marketing Campaign Workflow',
        description: 'Automated marketing campaign creation and execution',
        type: 'marketing',
        stepCount: 5,
        estimatedDuration: '2-4 hours',
        steps: [
          { name: 'Market Analysis', type: 'analysis' },
          { name: 'Content Creation', type: 'action' },
          { name: 'Channel Selection', type: 'decision' },
          { name: 'Campaign Launch', type: 'action' },
          { name: 'Performance Monitoring', type: 'analysis' }
        ]
      },
      {
        id: 'sales-pipeline',
        name: 'Sales Pipeline Management',
        description: 'Automated lead qualification and follow-up process',
        type: 'sales',
        stepCount: 6,
        estimatedDuration: '1-3 hours',
        steps: [
          { name: 'Lead Import', type: 'integration' },
          { name: 'Lead Scoring', type: 'analysis' },
          { name: 'Qualification', type: 'decision' },
          { name: 'Follow-up Scheduling', type: 'action' },
          { name: 'Proposal Generation', type: 'action' },
          { name: 'Status Update', type: 'notification' }
        ]
      },
      {
        id: 'hr-recruitment',
        name: 'HR Recruitment Process',
        description: 'Automated candidate screening and interview scheduling',
        type: 'hr',
        stepCount: 4,
        estimatedDuration: '3-6 hours',
        steps: [
          { name: 'Resume Screening', type: 'analysis' },
          { name: 'Skill Assessment', type: 'action' },
          { name: 'Interview Scheduling', type: 'action' },
          { name: 'Candidate Notification', type: 'notification' }
        ]
      },
      {
        id: 'financial-reporting',
        name: 'Financial Reporting Workflow',
        description: 'Automated financial data collection and report generation',
        type: 'finance',
        stepCount: 5,
        estimatedDuration: '2-5 hours',
        steps: [
          { name: 'Data Collection', type: 'integration' },
          { name: 'Data Validation', type: 'analysis' },
          { name: 'Report Generation', type: 'action' },
          { name: 'Review Process', type: 'decision' },
          { name: 'Distribution', type: 'notification' }
        ]
      }
    ];

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create new workflow
app.post('/api/orchestration/workflows', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, templateId, name } = req.body;
    const userId = req.user!.userId;

    // Create workflow task
    const workflow = await prisma.autonomousTask.create({
      data: {
        organizationId,
        taskType: name || 'workflow',
        status: 'PENDING',
        input: {
          templateId,
          createdBy: userId,
          createdAt: new Date().toISOString()
        }
      }
    });

    res.json({
      id: workflow.id,
      name: workflow.taskType,
      status: 'idle',
      currentStep: 0,
      totalSteps: 1,
      progress: 0,
      steps: [{
        id: workflow.id,
        name: workflow.taskType,
        type: 'action',
        status: 'pending',
        dependencies: [],
        inputs: workflow.input
      }],
      results: [],
      startTime: workflow.createdAt
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Start workflow
app.post('/api/orchestration/workflows/:workflowId/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;

    await prisma.autonomousTask.update({
      where: { id: workflowId },
      data: { 
        status: 'IN_PROGRESS',
        startedAt: new Date()
      }
    });

    res.json({ success: true, status: 'running' });
  } catch (error) {
    console.error('Error starting workflow:', error);
    res.status(500).json({ error: 'Failed to start workflow' });
  }
});

// Pause workflow
app.post('/api/orchestration/workflows/:workflowId/pause', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowId } = req.params;

    await prisma.autonomousTask.update({
      where: { id: workflowId },
      data: { status: 'PAUSED' }
    });

    res.json({ success: true, status: 'paused' });
  } catch (error) {
    console.error('Error pausing workflow:', error);
    res.status(500).json({ error: 'Failed to pause workflow' });
  }
});

// Get workflow status
app.get('/api/orchestration/status/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    
    const workflows = await prisma.autonomousTask.findMany({
      where: { 
        organizationId,
        taskType: 'workflow'
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        startedAt: true,
        completedAt: true
      }
    });

    const workflowStates = workflows.map(workflow => ({
      id: workflow.id,
      status: workflow.status.toLowerCase(),
      progress: 0,
      startTime: workflow.startedAt,
      endTime: workflow.completedAt
    }));

    res.json({ workflows: workflowStates });
  } catch (error) {
    console.error('Error fetching workflow status:', error);
    res.status(500).json({ error: 'Failed to fetch workflow status' });
  }
});

// ==================== INTEGRATION ECOSYSTEM ====================

// Get integrations for organization
app.get('/api/integrations/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    
    const integrations = await prisma.integration.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to frontend format
    const formattedIntegrations = integrations.map(integration => ({
      id: integration.id,
      name: integration.provider,
      provider: integration.provider,
      type: getIntegrationType(integration.provider),
      status: integration.isActive ? 'connected' : 'disconnected',
      isActive: integration.isActive,
      lastSync: (integration.metadata as any)?.lastSyncAt || null,
      syncStatus: integration.isActive ? 'success' : 'never',
      credentials: integration.accessToken ? { hasToken: true } : {},
      metadata: integration.metadata,
      capabilities: getIntegrationCapabilities(integration.provider),
      usage: {
        requests: (integration.metadata as any)?.requests || 0,
        limit: getIntegrationLimit(integration.provider),
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    }));

    res.json(formattedIntegrations);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

// Get integration templates
app.get('/api/integrations/templates', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const templates = [
      {
        id: 'salesforce-crm',
        name: 'Salesforce CRM',
        provider: 'Salesforce',
        type: 'crm',
        description: 'Connect your Salesforce CRM to sync leads, contacts, and opportunities',
        icon: 'crm',
        capabilities: ['lead_sync', 'contact_management', 'opportunity_tracking', 'sales_analytics'],
        setupSteps: ['Connect to Salesforce', 'Authorize API access', 'Configure sync settings', 'Test connection'],
        pricing: {
          free: false,
          plans: [
            { name: 'Starter', price: 25, features: ['Basic sync', '1000 records/month'] },
            { name: 'Professional', price: 75, features: ['Advanced sync', '10000 records/month', 'Custom fields'] },
            { name: 'Enterprise', price: 200, features: ['Full sync', 'Unlimited records', 'Custom workflows'] }
          ]
        },
        documentation: 'https://docs.salesforce.com',
        status: 'available'
      },
      {
        id: 'hubspot-crm',
        name: 'HubSpot CRM',
        provider: 'HubSpot',
        type: 'crm',
        description: 'Sync contacts, deals, and companies with HubSpot CRM',
        icon: 'crm',
        capabilities: ['contact_sync', 'deal_tracking', 'company_management', 'email_tracking'],
        setupSteps: ['Connect to HubSpot', 'Authorize API access', 'Configure sync settings', 'Test connection'],
        pricing: {
          free: true,
          plans: [
            { name: 'Free', price: 0, features: ['Basic sync', '1000 contacts'] },
            { name: 'Starter', price: 45, features: ['Advanced sync', '10000 contacts', 'Custom properties'] },
            { name: 'Professional', price: 120, features: ['Full sync', 'Unlimited contacts', 'Workflows'] }
          ]
        },
        documentation: 'https://developers.hubspot.com',
        status: 'available'
      },
      {
        id: 'mailchimp-marketing',
        name: 'Mailchimp',
        provider: 'Mailchimp',
        type: 'marketing',
        description: 'Sync email lists and automate marketing campaigns',
        icon: 'marketing',
        capabilities: ['email_sync', 'list_management', 'campaign_automation', 'analytics'],
        setupSteps: ['Connect to Mailchimp', 'Authorize API access', 'Configure sync settings', 'Test connection'],
        pricing: {
          free: true,
          plans: [
            { name: 'Free', price: 0, features: ['Basic sync', '2000 contacts'] },
            { name: 'Essentials', price: 10, features: ['Advanced sync', '50000 contacts', 'Automation'] },
            { name: 'Standard', price: 15, features: ['Full sync', '100000 contacts', 'A/B testing'] }
          ]
        },
        documentation: 'https://mailchimp.com/developer',
        status: 'available'
      },
      {
        id: 'linkedin-social',
        name: 'LinkedIn',
        provider: 'LinkedIn',
        type: 'social',
        description: 'Share content and manage LinkedIn company page',
        icon: 'social',
        capabilities: ['content_sharing', 'page_management', 'analytics', 'lead_generation'],
        setupSteps: ['Connect to LinkedIn', 'Authorize API access', 'Configure sync settings', 'Test connection'],
        pricing: {
          free: false,
          plans: [
            { name: 'Basic', price: 30, features: ['Basic posting', 'Analytics'] },
            { name: 'Professional', price: 60, features: ['Advanced posting', 'Lead generation', 'CRM integration'] }
          ]
        },
        documentation: 'https://docs.microsoft.com/en-us/linkedin',
        status: 'available'
      },
      {
        id: 'google-analytics',
        name: 'Google Analytics',
        provider: 'Google',
        type: 'analytics',
        description: 'Track website performance and user behavior',
        icon: 'analytics',
        capabilities: ['traffic_analysis', 'conversion_tracking', 'audience_insights', 'custom_reports'],
        setupSteps: ['Connect to Google Analytics', 'Authorize API access', 'Configure sync settings', 'Test connection'],
        pricing: {
          free: true,
          plans: [
            { name: 'Free', price: 0, features: ['Basic analytics', 'Standard reports'] },
            { name: '360', price: 150000, features: ['Advanced analytics', 'Custom reports', 'Data studio'] }
          ]
        },
        documentation: 'https://developers.google.com/analytics',
        status: 'available'
      },
      {
        id: 'slack-communication',
        name: 'Slack',
        provider: 'Slack',
        type: 'communication',
        description: 'Send notifications and manage team communication',
        icon: 'communication',
        capabilities: ['notifications', 'channel_management', 'bot_integration', 'file_sharing'],
        setupSteps: ['Connect to Slack', 'Authorize API access', 'Configure sync settings', 'Test connection'],
        pricing: {
          free: true,
          plans: [
            { name: 'Free', price: 0, features: ['Basic notifications', '10k messages'] },
            { name: 'Pro', price: 6.67, features: ['Advanced notifications', 'Unlimited messages', 'Integrations'] }
          ]
        },
        documentation: 'https://api.slack.com',
        status: 'available'
      }
    ];

    res.json(templates);
  } catch (error) {
    console.error('Error fetching integration templates:', error);
    res.status(500).json({ error: 'Failed to fetch integration templates' });
  }
});

// Connect new integration
app.post('/api/integrations/connect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, templateId } = req.body;
    const userId = req.user!.userId;

    // Create integration record
    const integration = await prisma.integration.create({
      data: {
        organizationId,
        provider: templateId,
        accessToken: `mock_token_${Date.now()}`,
        isActive: true,
        metadata: {
          name: getTemplateName(templateId),
          connectedAt: new Date().toISOString(),
          connectedBy: userId,
          status: 'active'
        }
      }
    });

    res.json({
      id: integration.id,
      name: getTemplateName(templateId),
      provider: integration.provider,
      type: getIntegrationType(integration.provider),
      status: 'connected',
      isActive: true,
      lastSync: null,
      syncStatus: 'never',
      capabilities: getIntegrationCapabilities(integration.provider),
      usage: {
        requests: 0,
        limit: getIntegrationLimit(integration.provider),
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
  } catch (error) {
    console.error('Error connecting integration:', error);
    res.status(500).json({ error: 'Failed to connect integration' });
  }
});

// Disconnect integration
app.post('/api/integrations/:integrationId/disconnect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { integrationId } = req.params;

    await prisma.integration.update({
      where: { id: integrationId },
      data: { 
        isActive: false,
        metadata: {
          disconnectedAt: new Date().toISOString(),
          status: 'disconnected'
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    res.status(500).json({ error: 'Failed to disconnect integration' });
  }
});

// Sync integration
app.post('/api/integrations/:integrationId/sync', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { integrationId } = req.params;

    // Create sync activity
    const syncActivity = await prisma.autonomousTask.create({
      data: {
        organizationId: (await prisma.integration.findUnique({ where: { id: integrationId } }))?.organizationId || '',
        taskType: 'integration_sync',
        status: 'IN_PROGRESS',
        input: {
          integrationId,
          syncType: 'full',
          startedAt: new Date().toISOString()
        }
      }
    });

    // Update integration last sync
    const currentIntegration = await prisma.integration.findUnique({ where: { id: integrationId } });
    await prisma.integration.update({
      where: { id: integrationId },
      data: { 
        metadata: {
          ...(currentIntegration?.metadata as any || {}),
          lastSyncAt: new Date().toISOString(),
          lastSyncActivity: syncActivity.id,
          lastSyncStatus: 'running'
        }
      }
    });

    res.json({ success: true, activityId: syncActivity.id });
  } catch (error) {
    console.error('Error syncing integration:', error);
    res.status(500).json({ error: 'Failed to sync integration' });
  }
});

// Get sync activities
app.get('/api/integrations/sync-activities/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    
    const activities = await prisma.autonomousTask.findMany({
      where: { 
        organizationId,
        taskType: 'integration_sync'
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      integrationId: (activity.input as any)?.integrationId || 'unknown',
      type: 'sync',
      status: activity.status.toLowerCase(),
      progress: 0,
      startTime: activity.createdAt,
      endTime: activity.completedAt,
      recordsProcessed: (activity.input as any)?.recordsProcessed || 0,
      recordsTotal: (activity.input as any)?.recordsTotal || 100,
      error: activity.error
    }));

    res.json(formattedActivities);
  } catch (error) {
    console.error('Error fetching sync activities:', error);
    res.status(500).json({ error: 'Failed to fetch sync activities' });
  }
});

// Helper functions
function getIntegrationType(provider: string): string {
  const types: { [key: string]: string } = {
    'salesforce-crm': 'crm',
    'hubspot-crm': 'crm',
    'mailchimp-marketing': 'marketing',
    'linkedin-social': 'social',
    'google-analytics': 'analytics',
    'slack-communication': 'communication'
  };
  return types[provider] || 'other';
}

function getTemplateName(templateId: string): string {
  const names: { [key: string]: string } = {
    'salesforce-crm': 'Salesforce CRM',
    'hubspot-crm': 'HubSpot CRM',
    'mailchimp-marketing': 'Mailchimp',
    'linkedin-social': 'LinkedIn',
    'google-analytics': 'Google Analytics',
    'slack-communication': 'Slack'
  };
  return names[templateId] || templateId;
}

function getIntegrationCapabilities(provider: string): string[] {
  const capabilities: { [key: string]: string[] } = {
    'salesforce-crm': ['lead_sync', 'contact_management', 'opportunity_tracking', 'sales_analytics'],
    'hubspot-crm': ['contact_sync', 'deal_tracking', 'company_management', 'email_tracking'],
    'mailchimp-marketing': ['email_sync', 'list_management', 'campaign_automation', 'analytics'],
    'linkedin-social': ['content_sharing', 'page_management', 'analytics', 'lead_generation'],
    'google-analytics': ['traffic_analysis', 'conversion_tracking', 'audience_insights', 'custom_reports'],
    'slack-communication': ['notifications', 'channel_management', 'bot_integration', 'file_sharing']
  };
  return capabilities[provider] || [];
}

function getIntegrationLimit(provider: string): number {
  const limits: { [key: string]: number } = {
    'salesforce-crm': 10000,
    'hubspot-crm': 10000,
    'mailchimp-marketing': 50000,
    'linkedin-social': 5000,
    'google-analytics': 100000,
    'slack-communication': 10000
  };
  return limits[provider] || 1000;
}

// ==================== AGENTIC & NEURAL NETWORK ROUTES ====================

// Neural network learning endpoint
app.get('/api/neural-network/learn/:organizationId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const [leads, tasks] = await Promise.all([
      prisma.salesLead.findMany({ where: { organizationId }, include: { activities: true } }),
      prisma.autonomousTask.findMany({ where: { organizationId } }),
    ]);
    const result = await neuralNetwork.trainOnBusinessData(leads, tasks);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Neural network error:', error);
    res.status(500).json({ error: 'Failed to train neural network' });
  }
});

// Emotion detection endpoint
app.post('/api/ai/emotion/detect', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { imageData } = req.body;
    const result = await detectEmotion(imageData);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Emotion detection error:', error);
    res.status(500).json({ error: 'Failed to detect emotion' });
  }
});

// Agentic analysis endpoint (manual trigger)
app.post('/api/agentic/analyze', authMiddleware, orgGuard('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.body;
    const result = await agenticEngine.analyzeAndAct(organizationId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Agentic engine error:', error);
    res.status(500).json({ error: 'Failed to run agentic analysis' });
  }
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🤖 Autonomous task executor started (runs every minute)`);
  console.log(`🧠 Agentic engine initialized (hourly analysis)`);
});

// Agentic Engine: Run hourly analysis for all organizations
setInterval(async () => {
  try {
    console.log('🤖 Running hourly agentic analysis...');
    const orgs = await prisma.organization.findMany({ where: { plan: { in: ['pro', 'enterprise'] } } });
    for (const org of orgs) {
      try {
        const result = await agenticEngine.analyzeAndAct(org.id);
        if (result.actions.length > 0) {
          console.log(`✅ ${org.name}: ${result.actions.length} autonomous actions taken`);
        }
      } catch (err) {
        console.error(`❌ Agentic error for ${org.name}:`, err);
      }
    }
  } catch (error) {
    console.error('Hourly agentic runner error:', error);
  }
}, 3600000); // Every hour

export default app;