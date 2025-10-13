'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  Users,
  MessageSquare,
  Eye,
  MousePointer,
  DollarSign,
  LogOut,
  RefreshCw,
  Download
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

interface AnalyticsData {
  overview: {
    totalTasks: number;
    completedTasks: number;
    totalPosts: number;
    totalEmails: number;
    totalLeads: number;
    conversionRate: number;
    revenue: number;
    growth: number;
  };
  taskMetrics: Array<{
    date: string;
    completed: number;
    failed: number;
    pending: number;
  }>;
  platformMetrics: Array<{
    platform: string;
    posts: number;
    engagement: number;
    reach: number;
  }>;
  postMetrics: Array<{
    platform: string;
    posts: number;
    engagement: number;
    reach: number;
  }>;
  emailMetrics: Array<{
    campaign: string;
    sent: number;
    opened: number;
    clicked: number;
  }>;
  revenueData: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  leadSources: Array<{
    source: string;
    count: number;
    conversion: number;
  }>;
  leadMetrics: Array<{
    source: string;
    count: number;
    conversion: number;
  }>;
  recommendations: string[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        router.push('/login');
        return;
      }

      try {
        const userObj = JSON.parse(userData);
        setUser(userObj);
        if (userObj.organizationId) {
          await fetchAnalytics(userObj.organizationId);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAnalytics = async (organizationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/analytics/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        // Mock data for demonstration
        setAnalytics({
          overview: {
            totalTasks: 156,
            completedTasks: 142,
            totalPosts: 89,
            totalEmails: 234,
            totalLeads: 67,
            conversionRate: 12.5,
            revenue: 45600,
            growth: 8.5
          },
          taskMetrics: [
            { date: '2024-01-01', completed: 12, failed: 2, pending: 3 },
            { date: '2024-01-02', completed: 15, failed: 1, pending: 5 },
            { date: '2024-01-03', completed: 18, failed: 0, pending: 2 },
            { date: '2024-01-04', completed: 14, failed: 3, pending: 4 },
            { date: '2024-01-05', completed: 20, failed: 1, pending: 1 },
            { date: '2024-01-06', completed: 16, failed: 2, pending: 3 },
            { date: '2024-01-07', completed: 22, failed: 0, pending: 2 }
          ],
          platformMetrics: [
            { platform: 'LinkedIn', posts: 45, engagement: 234, reach: 1200 },
            { platform: 'Twitter', posts: 32, engagement: 189, reach: 890 },
            { platform: 'Email', posts: 12, engagement: 67, reach: 450 }
          ],
          postMetrics: [
            { platform: 'LinkedIn', posts: 45, engagement: 234, reach: 1200 },
            { platform: 'Twitter', posts: 32, engagement: 189, reach: 890 },
            { platform: 'Email', posts: 12, engagement: 67, reach: 450 }
          ],
          emailMetrics: [
            { campaign: 'Welcome Series', sent: 150, opened: 89, clicked: 23 },
            { campaign: 'Product Update', sent: 200, opened: 134, clicked: 45 },
            { campaign: 'Newsletter', sent: 300, opened: 180, clicked: 67 }
          ],
          revenueData: [
            { month: 'Jan', revenue: 12000, expenses: 8000, profit: 4000 },
            { month: 'Feb', revenue: 15000, expenses: 9000, profit: 6000 },
            { month: 'Mar', revenue: 18000, expenses: 10000, profit: 8000 },
            { month: 'Apr', revenue: 22000, expenses: 12000, profit: 10000 },
            { month: 'May', revenue: 25000, expenses: 13000, profit: 12000 },
            { month: 'Jun', revenue: 28000, expenses: 14000, profit: 14000 }
          ],
          leadSources: [
            { source: 'Website', count: 25, conversion: 15.2 },
            { source: 'Social Media', count: 18, conversion: 12.8 },
            { source: 'Email Campaign', count: 12, conversion: 8.5 },
            { source: 'Referrals', count: 8, conversion: 25.0 },
            { source: 'Other', count: 4, conversion: 5.0 }
          ],
          leadMetrics: [
            { source: 'Website', count: 25, conversion: 15.2 },
            { source: 'Social Media', count: 18, conversion: 12.8 },
            { source: 'Email Campaign', count: 12, conversion: 8.5 },
            { source: 'Referrals', count: 8, conversion: 25.0 },
            { source: 'Other', count: 4, conversion: 5.0 }
          ],
          recommendations: [
            'Focus on LinkedIn content - 40% higher engagement',
            'Automate follow-up emails to improve conversion',
            'Optimize website forms to capture more leads'
          ]
        });
      }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Default analytics data if not loaded
  const defaultAnalytics: AnalyticsData = {
    overview: {
      totalTasks: 0,
      completedTasks: 0,
      totalPosts: 0,
      totalEmails: 0,
      totalLeads: 0,
      conversionRate: 0,
      revenue: 0,
      growth: 0
    },
    taskMetrics: [],
    platformMetrics: [],
    postMetrics: [],
    emailMetrics: [],
    revenueData: [],
    leadSources: [],
    leadMetrics: [],
    recommendations: []
  };

  const currentAnalytics = analytics || defaultAnalytics;

  const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">AI CEO Platform</h1>
              <nav className="hidden md:flex space-x-6">
                <a href="/dashboard" className="text-purple-200 hover:text-white">Dashboard</a>
                <a href="/dashboard/tasks" className="text-purple-200 hover:text-white">Tasks</a>
                <a href="/dashboard/chat" className="text-purple-200 hover:text-white">Chat</a>
                <a href="/dashboard/analytics" className="text-white hover:text-purple-200">Analytics</a>
                <a href="/dashboard/crm" className="text-purple-200 hover:text-white">CRM</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white">Welcome, {user?.firstName}</span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h2>
              <p className="text-purple-200">
                Comprehensive insights into your business performance
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => user?.organizationId && fetchAnalytics(user.organizationId)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {analytics && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-lg rounded-xl p-6 border border-purple-400/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-200 text-sm mb-1">Total Tasks</p>
                    <p className="text-3xl font-bold text-white">{currentAnalytics.overview.totalTasks}</p>
                    <p className="text-green-300 text-sm">
                      {currentAnalytics.overview.completedTasks} completed
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/30 rounded-lg">
                    <TrendingUp className="w-8 h-8 text-purple-200" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-lg rounded-xl p-6 border border-green-400/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 text-sm mb-1">Conversion Rate</p>
                    <p className="text-3xl font-bold text-white">{currentAnalytics.overview.conversionRate}%</p>
                    <p className="text-green-300 text-sm">
                      {currentAnalytics.overview.totalLeads} total leads
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/30 rounded-lg">
                    <Users className="w-8 h-8 text-green-200" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-lg rounded-xl p-6 border border-blue-400/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm mb-1">Total Posts</p>
                    <p className="text-3xl font-bold text-white">{currentAnalytics.overview.totalPosts}</p>
                    <p className="text-blue-300 text-sm">
                      {currentAnalytics.overview.totalEmails} emails sent
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/30 rounded-lg">
                    <MessageSquare className="w-8 h-8 text-blue-200" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-lg rounded-xl p-6 border border-yellow-400/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-200 text-sm mb-1">Revenue</p>
                    <p className="text-3xl font-bold text-white">${currentAnalytics.overview.revenue.toLocaleString()}</p>
                    <p className="text-yellow-300 text-sm">
                      <TrendingUp className="w-4 h-4 inline mr-1" />
                      +12.5% this month
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-500/30 rounded-lg">
                    <DollarSign className="w-8 h-8 text-yellow-200" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Task Performance */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-white font-semibold text-lg mb-4">Task Performance (7 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={currentAnalytics.taskMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#A78BFA" />
                    <YAxis stroke="#A78BFA" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Area type="monotone" dataKey="completed" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="failed" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="pending" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Platform Performance */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-white font-semibold text-lg mb-4">Platform Performance</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={currentAnalytics.platformMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="platform" stroke="#A78BFA" />
                    <YAxis stroke="#A78BFA" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="posts" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="engagement" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue and Lead Sources */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Revenue Trend */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-white font-semibold text-lg mb-4">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={currentAnalytics.revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="#A78BFA" />
                    <YAxis stroke="#A78BFA" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} />
                    <Line type="monotone" dataKey="profit" stroke="#8B5CF6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Lead Sources */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                <h3 className="text-white font-semibold text-lg mb-4">Lead Sources</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={currentAnalytics.leadSources}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {currentAnalytics.leadSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {currentAnalytics.leadSources.map((item, index) => (
                    <div key={item.source} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-purple-200">{item.source}</span>
                      </div>
                      <div className="text-white font-medium">
                        {item.count} leads ({item.conversion}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-white font-semibold text-lg mb-4">AI Insights & Recommendations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <h4 className="text-green-300 font-medium">Performance Boost</h4>
                  </div>
                  <p className="text-green-200 text-sm">
                    Your task completion rate has improved by 15% this week. Consider automating more routine tasks.
                  </p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Eye className="w-5 h-5 text-blue-400" />
                    <h4 className="text-blue-300 font-medium">Content Strategy</h4>
                  </div>
                  <p className="text-blue-200 text-sm">
                    LinkedIn posts are performing 40% better than Twitter. Focus more content on LinkedIn.
                  </p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    <h4 className="text-purple-300 font-medium">Lead Quality</h4>
                  </div>
                  <p className="text-purple-200 text-sm">
                    Referral leads have 2x higher conversion rate. Implement a referral program.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
