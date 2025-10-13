'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { 
  FileText,
  Download,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  LogOut,
  Plus,
  Eye,
  Share2
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

interface Report {
  id: string;
  title: string;
  type: string;
  status: string;
  generatedAt: string;
  summary: string;
  insights: string[];
  recommendations: string[];
  data: any;
}

export default function AIReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [mounted, setMounted] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newReport, setNewReport] = useState({
    type: 'weekly',
    prompt: ''
  });

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
          await fetchReports(userObj.organizationId);
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

  const fetchReports = async (organizationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/ai-reports/scheduled/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        // Mock data for demonstration
        setReports([
          {
            id: '1',
            title: 'Weekly Performance Report',
            type: 'weekly',
            status: 'completed',
            generatedAt: '2024-01-15T10:00:00Z',
            summary: 'Your business showed strong growth this week with a 15% increase in task completion and 23% more leads generated.',
            insights: [
              'Task completion rate improved by 15% compared to last week',
              'LinkedIn posts generated 40% more engagement than Twitter',
              'Email campaigns had a 12% open rate increase'
            ],
            recommendations: [
              'Focus more content on LinkedIn platform',
              'Automate routine tasks to improve efficiency',
              'Implement A/B testing for email subject lines'
            ],
            data: {}
          },
          {
            id: '2',
            title: 'Monthly Revenue Analysis',
            type: 'monthly',
            status: 'completed',
            generatedAt: '2024-01-10T14:30:00Z',
            summary: 'Revenue increased by 18% this month, driven primarily by new customer acquisitions and improved conversion rates.',
            insights: [
              'Revenue growth of 18% month-over-month',
              'Customer acquisition cost decreased by 8%',
              'Average deal size increased by 12%'
            ],
            recommendations: [
              'Scale successful acquisition channels',
              'Focus on upselling existing customers',
              'Optimize pricing strategy for better margins'
            ],
            data: {}
          },
          {
            id: '3',
            title: 'Lead Quality Assessment',
            type: 'custom',
            status: 'generating',
            generatedAt: '2024-01-16T09:15:00Z',
            summary: 'Analyzing lead quality and conversion patterns to identify optimization opportunities.',
            insights: [],
            recommendations: [],
            data: {}
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const generateReport = async () => {
    if (!user?.organizationId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/ai-reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId: user.organizationId,
          type: newReport.type,
          prompt: newReport.prompt,
        }),
      });

      if (response.ok) {
        const newReportData = await response.json();
        setReports([newReportData, ...reports]);
        setNewReport({ type: 'weekly', prompt: '' });
        setShowGenerateModal(false);
        toast.success('Report generation started!');
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'generating':
        return <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-300';
      case 'generating':
        return 'bg-blue-500/20 text-blue-300';
      case 'failed':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'weekly':
        return 'bg-purple-500/20 text-purple-300';
      case 'monthly':
        return 'bg-blue-500/20 text-blue-300';
      case 'custom':
        return 'bg-green-500/20 text-green-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || report.type === typeFilter;
    return matchesSearch && matchesType;
  });

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
                <a href="/dashboard/analytics" className="text-purple-200 hover:text-white">Analytics</a>
                <a href="/dashboard/crm" className="text-purple-200 hover:text-white">CRM</a>
                <a href="/dashboard/ai-reports" className="text-white hover:text-purple-200">AI Reports</a>
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
              <h2 className="text-3xl font-bold text-white mb-2">AI Reports</h2>
              <p className="text-purple-200">
                Intelligent insights and recommendations for your business
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => user?.organizationId && fetchReports(user.organizationId)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8 border border-white/20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Types</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(report.status)}
                  <div>
                    <h3 className="text-white font-semibold text-lg">{report.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(report.type)}`}>
                        {report.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-purple-200 text-sm mb-4 line-clamp-3">
                {report.summary}
              </p>

              {report.insights.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-white font-medium mb-2">Key Insights</h4>
                  <ul className="space-y-1">
                    {report.insights.slice(0, 2).map((insight, index) => (
                      <li key={index} className="text-purple-200 text-sm flex items-start space-x-2">
                        <TrendingUp className="w-3 h-3 text-green-400 mt-1 flex-shrink-0" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.recommendations.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-white font-medium mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {report.recommendations.slice(0, 2).map((recommendation, index) => (
                      <li key={index} className="text-purple-200 text-sm flex items-start space-x-2">
                        <CheckCircle className="w-3 h-3 text-blue-400 mt-1 flex-shrink-0" />
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-purple-300">
                <span>Generated: {new Date(report.generatedAt).toLocaleDateString()}</span>
                <button className="text-purple-300 hover:text-white transition-colors">
                  View Full Report →
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <div className="p-4 bg-purple-500/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-8 h-8 text-purple-300" />
            </div>
            <h4 className="text-white font-medium mb-2">No reports found</h4>
            <p className="text-purple-200 text-sm mb-4">
              {searchTerm || typeFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Generate your first AI report to get started'
              }
            </p>
            {(!searchTerm && typeFilter === 'all') && (
              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Generate First Report
              </button>
            )}
          </div>
        )}

        {/* Generate Report Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Generate AI Report</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Report Type</label>
                  <select
                    value={newReport.type}
                    onChange={(e) => setNewReport({...newReport, type: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="weekly">Weekly Performance</option>
                    <option value="monthly">Monthly Analysis</option>
                    <option value="custom">Custom Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Custom Prompt (Optional)</label>
                  <textarea
                    value={newReport.prompt}
                    onChange={(e) => setNewReport({...newReport, prompt: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Describe what you want to analyze..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={generateReport}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
