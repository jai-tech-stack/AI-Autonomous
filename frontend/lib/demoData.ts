// Demo data seeding utility for first-time users

export interface DemoLead {
  id: string;
  name: string;
  email: string;
  company: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed';
  source: string;
  value: number;
  createdAt: string;
  lastActivity: string;
  industry: string;
  phone?: string;
  notes?: string;
}

export interface DemoTask {
  id: string;
  taskType: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  input: any;
  output?: any;
  createdAt: string;
  completedAt?: string;
}

export interface DemoCampaign {
  id: string;
  name: string;
  type: 'email' | 'social' | 'content';
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  subject?: string;
  content: string;
  scheduledFor?: string;
  createdAt: string;
  metrics?: {
    sent?: number;
    opened?: number;
    clicked?: number;
    converted?: number;
  };
}

export interface DemoContentPost {
  id: string;
  title: string;
  content: string;
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram';
  status: 'draft' | 'scheduled' | 'published';
  scheduledFor?: string;
  publishedAt?: string;
  createdAt: string;
  engagement?: {
    likes: number;
    shares: number;
    comments: number;
  };
}

export const demoLeads: DemoLead[] = [
  {
    id: 'lead-1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    company: 'TechCorp Solutions',
    status: 'qualified',
    source: 'LinkedIn',
    value: 25000,
    createdAt: '2024-01-15T10:30:00Z',
    lastActivity: '2024-01-20T14:45:00Z',
    industry: 'Technology',
    phone: '+1-555-0123',
    notes: 'Interested in AI automation for their sales team. Very responsive to follow-ups.'
  },
  {
    id: 'lead-2',
    name: 'Michael Chen',
    email: 'm.chen@healthplus.com',
    company: 'HealthPlus Medical',
    status: 'contacted',
    source: 'Website',
    value: 15000,
    createdAt: '2024-01-18T09:15:00Z',
    lastActivity: '2024-01-19T16:20:00Z',
    industry: 'Healthcare',
    phone: '+1-555-0456',
    notes: 'Looking for patient management automation. Scheduled demo for next week.'
  },
  {
    id: 'lead-3',
    name: 'Emily Rodriguez',
    email: 'emily.r@retailmax.com',
    company: 'RetailMax',
    status: 'new',
    source: 'Email Campaign',
    value: 35000,
    createdAt: '2024-01-22T11:00:00Z',
    lastActivity: '2024-01-22T11:00:00Z',
    industry: 'Retail',
    phone: '+1-555-0789',
    notes: 'High-value prospect. Interested in inventory management AI.'
  },
  {
    id: 'lead-4',
    name: 'David Kim',
    email: 'david.kim@financegroup.com',
    company: 'FinanceGroup Inc',
    status: 'proposal',
    source: 'Referral',
    value: 50000,
    createdAt: '2024-01-10T14:30:00Z',
    lastActivity: '2024-01-21T10:15:00Z',
    industry: 'Finance',
    phone: '+1-555-0321',
    notes: 'Proposal sent. Waiting for budget approval. Very interested in compliance automation.'
  },
  {
    id: 'lead-5',
    name: 'Lisa Thompson',
    email: 'lisa.t@edutech.com',
    company: 'EduTech Solutions',
    status: 'closed',
    source: 'LinkedIn',
    value: 20000,
    createdAt: '2024-01-05T08:45:00Z',
    lastActivity: '2024-01-20T15:30:00Z',
    industry: 'Education',
    phone: '+1-555-0654',
    notes: 'Deal closed! Implementing student engagement AI system.'
  }
];

export const demoTasks: DemoTask[] = [
  {
    id: 'task-1',
    taskType: 'social_media_post',
    status: 'COMPLETED',
    input: {
      prompt: 'Create engaging LinkedIn post about AI automation benefits for small businesses',
      platform: 'linkedin',
      tone: 'professional',
      target_audience: 'small business owners'
    },
    output: {
      content: '🚀 Small businesses are discovering the power of AI automation! From customer service to inventory management, AI is leveling the playing field. What automation challenge is your business facing? #SmallBusiness #AIAutomation #BusinessGrowth',
      hashtags: ['#SmallBusiness', '#AIAutomation', '#BusinessGrowth'],
      engagement_score: 8.5
    },
    createdAt: '2024-01-20T09:00:00Z',
    completedAt: '2024-01-20T09:05:00Z'
  },
  {
    id: 'task-2',
    taskType: 'email_campaign',
    status: 'IN_PROGRESS',
    input: {
      prompt: 'Draft Q1 newsletter for existing customers highlighting new features',
      audience: 'existing_customers',
      tone: 'friendly',
      include_promotions: true
    },
    output: null,
    createdAt: '2024-01-21T10:30:00Z'
  },
  {
    id: 'task-3',
    taskType: 'lead_followup',
    status: 'COMPLETED',
    input: {
      prompt: 'Follow up with Sarah Johnson about AI automation demo',
      lead_id: 'lead-1',
      follow_up_type: 'demo_reminder',
      personalization_level: 'high'
    },
    output: {
      email_content: 'Hi Sarah, I hope you\'re doing well! I wanted to follow up on our conversation about AI automation for your sales team at TechCorp. I\'ve prepared a customized demo that shows exactly how our solution can help increase your team\'s efficiency by 40%. Would you be available for a 30-minute call this week?',
      scheduled_for: '2024-01-22T14:00:00Z',
      response_rate: 0.85
    },
    createdAt: '2024-01-21T11:15:00Z',
    completedAt: '2024-01-21T11:20:00Z'
  },
  {
    id: 'task-4',
    taskType: 'content_analysis',
    status: 'PENDING',
    input: {
      prompt: 'Analyze our recent marketing campaign performance and suggest improvements',
      campaign_period: 'last_30_days',
      metrics_to_analyze: ['engagement', 'conversion', 'reach'],
      include_recommendations: true
    },
    output: null,
    createdAt: '2024-01-22T08:00:00Z'
  }
];

export const demoCampaigns: DemoCampaign[] = [
  {
    id: 'campaign-1',
    name: 'Q1 Product Launch',
    type: 'email',
    status: 'active',
    subject: 'Introducing Our Revolutionary AI Assistant',
    content: 'We\'re excited to announce our latest AI assistant that will transform how you manage your business. With advanced automation capabilities...',
    scheduledFor: '2024-01-25T10:00:00Z',
    createdAt: '2024-01-15T14:30:00Z',
    metrics: {
      sent: 2500,
      opened: 1875,
      clicked: 450,
      converted: 67
    }
  },
  {
    id: 'campaign-2',
    name: 'LinkedIn Thought Leadership',
    type: 'social',
    status: 'scheduled',
    content: 'The future of business automation is here. Companies that embrace AI early will have a significant competitive advantage...',
    scheduledFor: '2024-01-24T09:00:00Z',
    createdAt: '2024-01-20T16:45:00Z'
  },
  {
    id: 'campaign-3',
    name: 'Customer Success Stories',
    type: 'content',
    status: 'draft',
    content: 'How RetailMax increased efficiency by 60% with our AI automation platform...',
    createdAt: '2024-01-22T11:20:00Z'
  }
];

export const demoContentPosts: DemoContentPost[] = [
  {
    id: 'post-1',
    title: 'AI Automation Trends 2024',
    content: 'The landscape of business automation is evolving rapidly. Here are the key trends shaping the future...',
    platform: 'linkedin',
    status: 'published',
    publishedAt: '2024-01-20T10:00:00Z',
    createdAt: '2024-01-19T15:30:00Z',
    engagement: {
      likes: 45,
      shares: 12,
      comments: 8
    }
  },
  {
    id: 'post-2',
    title: 'Small Business AI Success',
    content: 'How a local restaurant increased orders by 30% using AI-powered customer service...',
    platform: 'twitter',
    status: 'scheduled',
    scheduledFor: '2024-01-24T14:00:00Z',
    createdAt: '2024-01-22T09:15:00Z'
  },
  {
    id: 'post-3',
    title: 'AI vs Traditional Automation',
    content: 'Understanding the key differences between AI-powered automation and traditional rule-based systems...',
    platform: 'linkedin',
    status: 'draft',
    createdAt: '2024-01-22T16:20:00Z'
  }
];

export const demoAnalytics = {
  totalLeads: demoLeads.length,
  qualifiedLeads: demoLeads.filter(lead => lead.status === 'qualified').length,
  closedDeals: demoLeads.filter(lead => lead.status === 'closed').length,
  totalValue: demoLeads.reduce((sum, lead) => sum + lead.value, 0),
  avgDealSize: Math.round(demoLeads.reduce((sum, lead) => sum + lead.value, 0) / demoLeads.length),
  conversionRate: Math.round((demoLeads.filter(lead => lead.status === 'closed').length / demoLeads.length) * 100),
  tasksCompleted: demoTasks.filter(task => task.status === 'COMPLETED').length,
  tasksInProgress: demoTasks.filter(task => task.status === 'IN_PROGRESS').length,
  contentPublished: demoContentPosts.filter(post => post.status === 'published').length,
  socialEngagement: demoContentPosts
    .filter(post => post.engagement)
    .reduce((sum, post) => sum + (post.engagement?.likes || 0) + (post.engagement?.shares || 0) + (post.engagement?.comments || 0), 0)
};

// Function to seed demo data
export const seedDemoData = async (organizationId: string, token: string) => {
  try {
    // Seed leads
    for (const lead of demoLeads) {
      await fetch('http://localhost:5000/api/crm/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          organizationId,
          ...lead
        })
      });
    }

    // Seed tasks
    for (const task of demoTasks) {
      await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          organizationId,
          ...task
        })
      });
    }

    // Seed campaigns
    for (const campaign of demoCampaigns) {
      await fetch('http://localhost:5000/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          organizationId,
          ...campaign
        })
      });
    }

    // Seed content posts
    for (const post of demoContentPosts) {
      await fetch('http://localhost:5000/api/content/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          organizationId,
          ...post
        })
      });
    }

    return { success: true, message: 'Demo data seeded successfully' };
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return { success: false, message: 'Failed to seed demo data' };
  }
};
