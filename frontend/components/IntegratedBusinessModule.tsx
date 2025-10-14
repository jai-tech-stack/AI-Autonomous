'use client';

import { useState, useEffect } from 'react';
import { 
  Target, 
  TrendingUp, 
  Users, 
  Mail, 
  Calendar, 
  BarChart3, 
  Zap, 
  Brain,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface IntegratedBusinessModuleProps {
  organizationId: string;
}

interface BusinessMetrics {
  leads: {
    total: number;
    new: number;
    qualified: number;
    converted: number;
    conversionRate: number;
  };
  marketing: {
    campaigns: number;
    posts: number;
    engagement: number;
    reach: number;
  };
  sales: {
    revenue: number;
    deals: number;
    pipeline: number;
    avgDealSize: number;
  };
  branding: {
    consistency: number;
    awareness: number;
    sentiment: number;
    reach: number;
  };
}

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
  score: number;
  priority: string;
  source: string;
  lastContactAt: string;
  nextFollowUp: string;
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  reach: number;
  engagement: number;
  leads: number;
  conversions: number;
}

interface BusinessInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'success' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action: string;
  metrics: any;
}

export default function IntegratedBusinessModule({ organizationId }: IntegratedBusinessModuleProps) {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'leads' | 'marketing' | 'sales' | 'branding'>('overview');

  useEffect(() => {
    fetchIntegratedData();
  }, [organizationId]);

  const fetchIntegratedData = async () => {
    try {
      setLoading(true);
      
      // Fetch all business data in parallel
      const [leadsRes, campaignsRes, analyticsRes, insightsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/crm/leads/${organizationId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`http://localhost:5000/api/campaigns/${organizationId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`http://localhost:5000/api/analytics/${organizationId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`http://localhost:5000/api/ai-reports/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            organizationId,
            query: 'Give me business insights and recommendations'
          })
        })
      ]);

      // Process leads data
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(leadsData.leads || []);
      }

      // Process campaigns data
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData.campaigns || []);
      }

      // Process analytics data
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setMetrics(processMetrics(analyticsData, leads, campaigns));
      }

      // Process AI insights
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setInsights(generateBusinessInsights(insightsData, leads, campaigns));
      }

    } catch (error) {
      console.error('Error fetching integrated data:', error);
      toast.error('Failed to load business data');
    } finally {
      setLoading(false);
    }
  };

  const processMetrics = (analytics: any, leads: Lead[], campaigns: Campaign[]): BusinessMetrics => {
    const totalLeads = leads.length;
    const newLeads = leads.filter(l => l.status === 'new').length;
    const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
    const convertedLeads = leads.filter(l => l.status === 'converted').length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    return {
      leads: {
        total: totalLeads,
        new: newLeads,
        qualified: qualifiedLeads,
        converted: convertedLeads,
        conversionRate: Math.round(conversionRate * 100) / 100
      },
      marketing: {
        campaigns: campaigns.length,
        posts: analytics.totalPosts || 0,
        engagement: analytics.totalEngagement || 0,
        reach: analytics.totalReach || 0
      },
      sales: {
        revenue: convertedLeads * 2500, // Mock calculation
        deals: convertedLeads,
        pipeline: qualifiedLeads * 2000, // Mock pipeline value
        avgDealSize: convertedLeads > 0 ? (convertedLeads * 2500) / convertedLeads : 0
      },
      branding: {
        consistency: 85, // Mock branding consistency score
        awareness: Math.round((analytics.totalReach || 0) / 1000), // Mock awareness
        sentiment: 78, // Mock sentiment score
        reach: analytics.totalReach || 0
      }
    };
  };

  const generateBusinessInsights = (aiData: any, leads: Lead[], campaigns: Campaign[]): BusinessInsight[] => {
    const insights: BusinessInsight[] = [];

    // Lead conversion insights
    if (leads.length > 0) {
      const conversionRate = (leads.filter(l => l.status === 'converted').length / leads.length) * 100;
      if (conversionRate < 20) {
        insights.push({
          id: 'low_conversion',
          type: 'warning',
          title: 'Low Lead Conversion Rate',
          description: `Your conversion rate is ${conversionRate.toFixed(1)}%. Industry average is 20-25%.`,
          impact: 'high',
          action: 'Review lead qualification process and follow-up strategies',
          metrics: { conversionRate, industryAverage: 22 }
        });
      }
    }

    // Marketing performance insights
    if (campaigns.length > 0) {
      const avgEngagement = campaigns.reduce((sum, c) => sum + c.engagement, 0) / campaigns.length;
      if (avgEngagement > 1000) {
        insights.push({
          id: 'high_engagement',
          type: 'success',
          title: 'High Marketing Engagement',
          description: `Your campaigns are performing well with ${avgEngagement.toFixed(0)} average engagement.`,
          impact: 'medium',
          action: 'Scale successful campaign strategies',
          metrics: { avgEngagement }
        });
      }
    }

    // Lead source insights
    const leadSources = leads.reduce((acc, lead) => {
      acc[lead.source || 'unknown'] = (acc[lead.source || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSource = Object.entries(leadSources).sort(([,a], [,b]) => b - a)[0];
    if (topSource) {
      insights.push({
        id: 'top_source',
        type: 'recommendation',
        title: 'Top Lead Source Identified',
        description: `${topSource[0]} is your best performing lead source with ${topSource[1]} leads.`,
        impact: 'medium',
        action: 'Increase investment in top-performing channels',
        metrics: { source: topSource[0], count: topSource[1] }
      });
    }

    return insights;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Target className="w-5 h-5 text-blue-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'recommendation': return <Brain className="w-5 h-5 text-purple-500" />;
      default: return <BarChart3 className="w-5 h-5 text-gray-500" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'border-blue-500 bg-blue-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      case 'success': return 'border-green-500 bg-green-50';
      case 'recommendation': return 'border-purple-500 bg-purple-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Integrated Business Module</h2>
            <p className="text-purple-200">Unified view of branding, marketing, sales, and leads</p>
          </div>
          <div className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-purple-400" />
            <span className="text-white font-medium">AI-Powered</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'leads', label: 'Leads', icon: Users },
            { id: 'marketing', label: 'Marketing', icon: Target },
            { id: 'sales', label: 'Sales', icon: TrendingUp },
            { id: 'branding', label: 'Branding', icon: Zap }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Leads Metrics */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-white">{metrics.leads.total}</span>
            </div>
            <h3 className="text-white font-semibold mb-2">Total Leads</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-purple-200">
                <span>New: {metrics.leads.new}</span>
                <span>Qualified: {metrics.leads.qualified}</span>
              </div>
              <div className="flex justify-between text-purple-200">
                <span>Converted: {metrics.leads.converted}</span>
                <span className="text-green-400">{metrics.leads.conversionRate}%</span>
              </div>
            </div>
          </div>

          {/* Marketing Metrics */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Target className="w-6 h-6 text-green-400" />
              </div>
              <span className="text-2xl font-bold text-white">{metrics.marketing.campaigns}</span>
            </div>
            <h3 className="text-white font-semibold mb-2">Active Campaigns</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-purple-200">
                <span>Posts: {metrics.marketing.posts}</span>
                <span>Engagement: {metrics.marketing.engagement}</span>
              </div>
              <div className="text-purple-200">
                Reach: {metrics.marketing.reach.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Sales Metrics */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-400" />
              </div>
              <span className="text-2xl font-bold text-white">${metrics.sales.revenue.toLocaleString()}</span>
            </div>
            <h3 className="text-white font-semibold mb-2">Revenue</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-purple-200">
                <span>Deals: {metrics.sales.deals}</span>
                <span>Pipeline: ${metrics.sales.pipeline.toLocaleString()}</span>
              </div>
              <div className="text-purple-200">
                Avg Deal: ${Math.round(metrics.sales.avgDealSize).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Branding Metrics */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-2xl font-bold text-white">{metrics.branding.consistency}%</span>
            </div>
            <h3 className="text-white font-semibold mb-2">Brand Consistency</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-purple-200">
                <span>Awareness: {metrics.branding.awareness}</span>
                <span>Sentiment: {metrics.branding.sentiment}%</span>
              </div>
              <div className="text-purple-200">
                Reach: {metrics.branding.reach.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <span>AI Business Insights</span>
        </h3>
        
        {insights.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No insights available. AI is analyzing your business data...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border-l-4 ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start space-x-3">
                  {getInsightIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                        insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {insight.impact} impact
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{insight.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{insight.action}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lead Management */}
      {selectedTab === 'leads' && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Lead Management</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 text-purple-200">Name</th>
                  <th className="text-left py-3 text-purple-200">Company</th>
                  <th className="text-left py-3 text-purple-200">Status</th>
                  <th className="text-left py-3 text-purple-200">Score</th>
                  <th className="text-left py-3 text-purple-200">Source</th>
                  <th className="text-left py-3 text-purple-200">Last Contact</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 10).map((lead) => (
                  <tr key={lead.id} className="border-b border-white/10">
                    <td className="py-3 text-white">{lead.name}</td>
                    <td className="py-3 text-purple-200">{lead.company || 'N/A'}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        lead.status === 'converted' ? 'bg-green-500/20 text-green-300' :
                        lead.status === 'qualified' ? 'bg-blue-500/20 text-blue-300' :
                        lead.status === 'contacted' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 text-white">{lead.score}</td>
                    <td className="py-3 text-purple-200">{lead.source || 'Unknown'}</td>
                    <td className="py-3 text-purple-200">
                      {lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Marketing Campaigns */}
      {selectedTab === 'marketing' && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Marketing Campaigns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium">{campaign.name}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    campaign.status === 'active' ? 'bg-green-500/20 text-green-300' :
                    campaign.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-purple-200">
                  <div className="flex justify-between">
                    <span>Reach:</span>
                    <span>{campaign.reach.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Engagement:</span>
                    <span>{campaign.engagement.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Leads:</span>
                    <span>{campaign.leads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conversions:</span>
                    <span className="text-green-400">{campaign.conversions}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
