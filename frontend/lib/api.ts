const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Request failed',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Tasks endpoints
  async getTasks(organizationId: string) {
    return this.request(`/api/tasks/${organizationId}`);
  }

  async createTask(taskData: {
    organizationId: string;
    taskType: string;
    input: any;
  }) {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async getTask(taskId: string) {
    return this.request(`/api/tasks/${taskId}`);
  }

  async retryTask(taskId: string) {
    return this.request(`/api/tasks/${taskId}/retry`, {
      method: 'POST',
    });
  }

  // Chat endpoints
  async getChatMessages(organizationId: string) {
    return this.request(`/api/chat/${organizationId}`);
  }

  async sendMessage(messageData: {
    organizationId: string;
    message: string;
  }) {
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  // Analytics endpoints
  async getAnalytics(organizationId: string) {
    return this.request(`/api/analytics/${organizationId}`);
  }

  // CRM endpoints
  async getLeads(organizationId: string) {
    return this.request(`/api/crm/leads/${organizationId}`);
  }

  async createLead(leadData: {
    organizationId: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    source?: string;
    notes?: string;
  }) {
    return this.request('/api/crm/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  }

  async updateLead(leadId: string, leadData: any) {
    return this.request(`/api/crm/leads/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify(leadData),
    });
  }

  async getLeadActivities(leadId: string) {
    return this.request(`/api/crm/activities/${leadId}`);
  }

  async createActivity(activityData: {
    leadId: string;
    organizationId: string;
    type: string;
    title: string;
    description?: string;
  }) {
    return this.request('/api/crm/activities', {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
  }

  // Content Calendar endpoints
  async getContentPosts(organizationId: string) {
    return this.request(`/api/content-posts/${organizationId}`);
  }

  async createContentPost(postData: {
    organizationId: string;
    platform: string;
    content: any;
    scheduledFor?: string;
  }) {
    return this.request('/api/content-posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async updateContentPost(postId: string, postData: any) {
    return this.request(`/api/content-posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
  }

  async deleteContentPost(postId: string) {
    return this.request(`/api/content-posts/${postId}`, {
      method: 'DELETE',
    });
  }

  // Integration endpoints
  async connectLinkedIn(organizationId: string) {
    return this.request('/api/integrations/linkedin/connect', {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    });
  }

  async postToLinkedIn(postData: {
    organizationId: string;
    taskId: string;
    content: string;
  }) {
    return this.request('/api/integrations/linkedin/post', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async checkLinkedInConnection(organizationId: string) {
    return this.request(`/api/integrations/linkedin/${organizationId}`);
  }

  async connectTwitter(organizationId: string) {
    return this.request('/api/integrations/twitter/connect', {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    });
  }

  async postToTwitter(postData: {
    organizationId: string;
    taskId: string;
    content: string;
  }) {
    return this.request('/api/integrations/twitter/post', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async checkTwitterConnection(organizationId: string) {
    return this.request(`/api/integrations/twitter/${organizationId}`);
  }

  // AI Reports endpoints
  async generateReport(reportData: {
    organizationId: string;
    type: string;
    prompt?: string;
  }) {
    return this.request('/api/ai-reports/generate', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }

  async queryReports(queryData: {
    organizationId: string;
    query: string;
  }) {
    return this.request('/api/ai-reports/query', {
      method: 'POST',
      body: JSON.stringify(queryData),
    });
  }

  async getScheduledReports(organizationId: string) {
    return this.request(`/api/ai-reports/scheduled/${organizationId}`);
  }

  // Usage and Subscription endpoints
  async getUsage(organizationId: string) {
    return this.request(`/api/usage/${organizationId}`);
  }

  async checkUsageLimit(usageData: {
    organizationId: string;
    resource: string;
    count: number;
  }) {
    return this.request('/api/usage/check', {
      method: 'POST',
      body: JSON.stringify(usageData),
    });
  }

  async recordUsage(usageData: {
    organizationId: string;
    userId: string;
    resource: string;
    count: number;
  }) {
    return this.request('/api/usage/record', {
      method: 'POST',
      body: JSON.stringify(usageData),
    });
  }

  async getSubscription(organizationId: string) {
    return this.request(`/api/subscription/${organizationId}`);
  }

  // Stripe endpoints
  async createCheckoutSession(checkoutData: {
    plan: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    return this.request('/api/stripe/create-checkout', {
      method: 'POST',
      body: JSON.stringify(checkoutData),
    });
  }

  // Teams
  async listMembers(organizationId: string) {
    return this.request(`/api/teams/members/${organizationId}`);
  }

  async inviteMember(data: { organizationId: string; email: string; role?: 'member' | 'admin' }) {
    return this.request('/api/teams/invite', { method: 'POST', body: JSON.stringify(data) });
  }

  async changeMemberRole(data: { organizationId: string; userId: string; role: 'member' | 'admin' | 'owner' }) {
    return this.request('/api/teams/role', { method: 'POST', body: JSON.stringify(data) });
  }

  async removeMember(data: { organizationId: string; userId: string }) {
    return this.request('/api/teams/remove', { method: 'POST', body: JSON.stringify(data) });
  }

  // Activity logs
  async createActivity(data: { organizationId: string; title: string; description?: string; type?: string; leadId?: string }) {
    return this.request('/api/activity', { method: 'POST', body: JSON.stringify(data) });
  }

  async getActivities(organizationId: string) {
    return this.request(`/api/activity/${organizationId}`);
  }

  // Comments
  async addTaskComment(data: { taskId: string; comment: string }) {
    return this.request('/api/comments/task', { method: 'POST', body: JSON.stringify(data) });
  }

  async getTaskComments(taskId: string) {
    return this.request(`/api/comments/task/${taskId}`);
  }

  async addPostComment(data: { postId: string; comment: string }) {
    return this.request('/api/comments/post', { method: 'POST', body: JSON.stringify(data) });
  }

  async getPostComments(postId: string) {
    return this.request(`/api/comments/post/${postId}`);
  }

  // Email send (Nodemailer)
  async sendEmail(data: { to: string; subject: string; html?: string; text?: string }) {
    return this.request('/api/email/send', { method: 'POST', body: JSON.stringify(data) });
  }

  // AI media
  async transcribeWhisper(data: { audioUrl: string; hint?: string }) {
    return this.request('/api/ai/whisper/transcribe', { method: 'POST', body: JSON.stringify(data) });
  }

  async generateDalle(data: { prompt: string; size?: string }) {
    return this.request('/api/ai/dalle/generate', { method: 'POST', body: JSON.stringify(data) });
  }

  // Referrals
  async getOrCreateReferralCode(data: { organizationId: string }) {
    return this.request('/api/referrals/code', { method: 'POST', body: JSON.stringify(data) });
  }

  async getReferralStats(organizationId: string) {
    return this.request(`/api/referrals/${organizationId}`);
  }

  async trackReferral(data: { code: string; event?: 'click' | 'signup'; email?: string }) {
    return this.request('/api/referrals/track', { method: 'POST', body: JSON.stringify(data) });
  }

  // Scheduler
  async suggestSchedule(data: { organizationId: string; platform?: string; days?: number }) {
    return this.request('/api/scheduler/suggest', { method: 'POST', body: JSON.stringify(data) });
  }

  async schedulePost(data: { organizationId: string; platform: string; content: any; scheduledFor: string; campaignId?: string }) {
    return this.request('/api/scheduler/schedule-post', { method: 'POST', body: JSON.stringify(data) });
  }

  async bulkSchedule(data: { organizationId: string; posts: Array<{ platform: string; content: any; scheduledFor: string; campaignId?: string }> }) {
    return this.request('/api/scheduler/bulk-schedule', { method: 'POST', body: JSON.stringify(data) });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Helper hooks for React components
export function useApi() {
  return apiClient;
}

// Error handling utilities
export function handleApiError(error: any, defaultMessage: string = 'An error occurred') {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return defaultMessage;
}

// Request interceptor for adding auth token
export function setupApiInterceptors() {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      apiClient.setToken(token);
    }
  }
}
