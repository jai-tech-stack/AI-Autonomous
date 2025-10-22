'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare, 
  Target, 
  DollarSign,
  Activity,
  Zap,
  LogOut,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Eye,
  ThumbsUp,
  Share2,
  Clock
} from 'lucide-react';
import { AnimatedContainer, AnimatedCard, FadeIn } from '@/components/ui/Animated';
import { demoAnalytics } from '@/lib/demoData';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

interface AnalyticsData {
  overview: {
    totalLeads: number;
    qualifiedLeads: number;
    closedDeals: number;
    totalValue: number;
    avgDealSize: number;
    conversionRate: number;
    tasksCompleted: number;
    tasksInProgress: number;
    contentPublished: number;
    socialEngagement: number;
  };
  trends: Array<{
    date: string;
    leads: number;
    deals: number;
    revenue: number;
    tasks: number;
  }>;
  sources: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  performance: Array<{
    metric: string;
    current: number;
    previous: number;
    change: number;
  }>;
  aiInsights: Array<{
    insight: string;
    confidence: number;
    impact: 'high' | 'medium' | 'low';
    category: string;
  }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [refreshing, setRefreshing] = useState(false);

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
        await fetchAnalytics(userObj.organizationId);
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const fetchAnalytics = async (organizationId?: string) => {
    if (!organizationId) return;

    try {
      setRefreshing(true);
      
      // For now, use demo data. In production, this would fetch from your analytics API
      const mockData: AnalyticsData = {
        overview: demoAnalytics,
        trends: [
          { date: '2024-01-15', leads: 12, deals: 3, revenue: 45000, tasks: 8 },
          { date: '2024-01-16', leads: 18, deals: 5, revenue: 75000, tasks: 12 },
          { date: '2024-01-17', leads: 15, deals: 4, revenue: 60000, tasks: 10 },
          { date: '2024-01-18', leads: 22, deals: 6, revenue: 90000, tasks: 15 },
          { date: '2024-01-19', leads: 19, deals: 7, revenue: 105000, tasks: 18 },
          { date: '2024-01-20', leads: 25, deals: 8, revenue: 120000, tasks: 22 },
          { date: '2024-01-21', leads: 28, deals: 9, revenue: 135000, tasks: 25 }
        ],
        sources: [
          { name: 'LinkedIn', value: 35, color: '#0077B5' },
          { name: 'Website', value: 25, color: '#4F46E5' },
          { name: 'Email Campaign', value: 20, color: '#10B981' },
          { name: 'Referral', value: 15, color: '#F59E0B' },
          { name: 'Other', value: 5, color: '#6B7280' }
        ],
        performance: [
          { metric: 'Lead Generation', current: 28, previous: 22, change: 27.3 },
          { metric: 'Conversion Rate', current: 32.1, previous: 28.5, change: 12.6 },
          { metric: 'Average Deal Size', current: 15000, previous: 13500, change: 11.1 },
          { metric: 'Task Completion', current: 25, previous: 18, change: 38.9 },
          { metric: 'Content Engagement', current: 85, previous: 72, change: 18.1 }
        ],
        aiInsights: [
          {
            insight: 'LinkedIn posts perform 40% better when published at 2 PM on weekdays',
            confidence: 0.92,
            impact: 'high',
            category: 'Content Strategy'
          },
          {
            insight: 'Email campaigns with personalized subject lines have 25% higher open rates',
            confidence: 0.87,
            impact: 'medium',
            category: 'Email Marketing'
          },
          {
            insight: 'Follow-up calls within 2 hours of lead qualification increase conversion by 60%',
            confidence: 0.95,
            impact: 'high',
            category: 'Sales Process'
          },
          {
            insight: 'AI-generated content performs 15% better than human-written content',
            confidence: 0.78,
            impact: 'medium',
            category: 'Content Creation'
          }
        ]
      };

      setAnalyticsData(mockData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading analytics...</div>
      </div>
    );
  }

  return (
    <AnimatedContainer>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-white">Business Intelligence</h1>
                <nav className="hidden md:flex space-x-6">
                  <a href="/dashboard" className="text-purple-200 hover:text-white">Dashboard</a>
                  <a href="/dashboard/analytics" className="text-white hover:text-purple-200">Analytics</a>
                  <a href="/dashboard/chat" className="text-purple-200 hover:text-white">Chat</a>
                  <a href="/dashboard/crm" className="text-purple-200 hover:text-white">CRM</a>
                </nav>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as any)}
                    className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="1y">Last year</option>
                  </select>
                  <button
                    onClick={() => fetchAnalytics(user?.organizationId)}
                    disabled={refreshing}
                    className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <span className="text-white">Welcome, {user?.firstName}</span>
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    router.push('/login');
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {analyticsData && (
            <>
              {/* Overview Cards */}
              <FadeIn delay={0.2}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <AnimatedCard className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-lg rounded-xl p-6 border border-blue-400/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-200 text-sm mb-1">Total Leads</p>
                        <p className="text-3xl font-bold text-white">{formatNumber(analyticsData.overview.totalLeads)}</p>
                        <p className="text-blue-300 text-xs mt-1">+12% from last month</p>
                      </div>
                      <div className="p-3 bg-blue-500/30 rounded-lg">
                        <Users className="w-8 h-8 text-blue-200" />
                      </div>
                    </div>
                  </AnimatedCard>

                  <AnimatedCard className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-lg rounded-xl p-6 border border-green-400/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-200 text-sm mb-1">Closed Deals</p>
                        <p className="text-3xl font-bold text-white">{formatNumber(analyticsData.overview.closedDeals)}</p>
                        <p className="text-green-300 text-xs mt-1">+8% from last month</p>
                      </div>
                      <div className="p-3 bg-green-500/30 rounded-lg">
                        <Target className="w-8 h-8 text-green-200" />
                      </div>
                    </div>
                  </AnimatedCard>

                  <AnimatedCard className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-lg rounded-xl p-6 border border-purple-400/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-200 text-sm mb-1">Total Revenue</p>
                        <p className="text-3xl font-bold text-white">{formatCurrency(analyticsData.overview.totalValue)}</p>
                        <p className="text-purple-300 text-xs mt-1">+15% from last month</p>
                      </div>
                      <div className="p-3 bg-purple-500/30 rounded-lg">
                        <DollarSign className="w-8 h-8 text-purple-200" />
                      </div>
                    </div>
                  </AnimatedCard>

                  <AnimatedCard className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-lg rounded-xl p-6 border border-yellow-400/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-200 text-sm mb-1">Conversion Rate</p>
                        <p className="text-3xl font-bold text-white">{analyticsData.overview.conversionRate}%</p>
                        <p className="text-yellow-300 text-xs mt-1">+3% from last month</p>
                      </div>
                      <div className="p-3 bg-yellow-500/30 rounded-lg">
                        <TrendingUp className="w-8 h-8 text-yellow-200" />
                      </div>
                    </div>
                  </AnimatedCard>
                </div>
              </FadeIn>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Revenue Trend */}
                <FadeIn delay={0.4}>
                  <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                    <h3 className="text-xl font-semibold text-white mb-4">Revenue & Leads Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analyticsData.trends}>
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
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stackId="1" 
                          stroke="#8B5CF6" 
                          fill="url(#revenueGradient)" 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="leads" 
                          stackId="2" 
                          stroke="#10B981" 
                          fill="url(#leadsGradient)" 
                        />
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                      </AreaChart>
                    </ResponsiveContainer>
                  </AnimatedCard>
                </FadeIn>

                {/* Lead Sources */}
                <FadeIn delay={0.6}>
                  <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                    <h3 className="text-xl font-semibold text-white mb-4">Lead Sources</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analyticsData.sources}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {analyticsData.sources.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
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
                      {analyticsData.sources.map((source) => (
                        <div key={source.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }}></div>
                            <span className="text-purple-200">{source.name}</span>
                          </div>
                          <span className="text-white font-medium">{source.value}%</span>
                        </div>
                      ))}
                    </div>
                  </AnimatedCard>
                </FadeIn>
              </div>

              {/* Performance Metrics */}
              <FadeIn delay={0.8}>
                <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
                  <h3 className="text-xl font-semibold text-white mb-6">Performance Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {analyticsData.performance.map((metric, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{metric.metric}</h4>
                          <div className={`flex items-center space-x-1 ${getChangeColor(metric.change)}`}>
                            {getChangeIcon(metric.change)}
                            <span className="text-sm font-medium">{Math.abs(metric.change)}%</span>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">
                          {metric.metric.includes('Rate') || metric.metric.includes('Engagement') 
                            ? `${metric.current}%` 
                            : formatNumber(metric.current)
                          }
                        </div>
                        <div className="text-sm text-purple-300">
                          vs {metric.metric.includes('Rate') || metric.metric.includes('Engagement') 
                            ? `${metric.previous}%` 
                            : formatNumber(metric.previous)
                          } previous period
                        </div>
                      </div>
                    ))}
                  </div>
                </AnimatedCard>
              </FadeIn>

              {/* AI Insights */}
              <FadeIn delay={1.0}>
                <AnimatedCard className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-lg rounded-xl p-6 border border-purple-400/30">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-semibold text-white">AI-Powered Insights</h3>
                    <div className="flex items-center space-x-2 text-purple-300">
                      <Zap className="w-5 h-5" />
                      <span className="text-sm">Powered by AI</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {analyticsData.aiInsights.map((insight, index) => (
                      <div key={index} className="bg-white/10 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              insight.impact === 'high' ? 'bg-red-500/20 text-red-300' :
                              insight.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-green-500/20 text-green-300'
                            }`}>
                              {insight.impact.toUpperCase()}
                            </span>
                            <span className="text-xs text-purple-300">{insight.category}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-purple-300">
                            <span className="text-sm">{Math.round(insight.confidence * 100)}%</span>
                            <Activity className="w-4 h-4" />
                          </div>
                        </div>
                        <p className="text-purple-200 text-sm leading-relaxed">{insight.insight}</p>
                      </div>
                    ))}
                  </div>
                </AnimatedCard>
              </FadeIn>
            </>
          )}
        </div>
      </div>
    </AnimatedContainer>
  );
}