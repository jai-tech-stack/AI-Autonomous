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
      headers.Authorization = `Bearer ${this.token}`;
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
