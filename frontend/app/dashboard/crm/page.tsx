'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Users,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Building,
  Star,
  LogOut,
  RefreshCw,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: string;
  source?: string;
  score: number;
  priority: string;
  lastContactAt?: string;
  nextFollowUp?: string;
  notes?: string;
  createdAt: string;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
}

export default function CRMPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [mounted, setMounted] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    notes: ''
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
          await fetchLeads(userObj.organizationId);
          await fetchActivities(userObj.organizationId);
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

  const fetchLeads = async (organizationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/crm/leads/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      } else {
        // Mock data for demonstration
        setLeads([
          {
            id: '1',
            name: 'John Smith',
            email: 'john@techcorp.com',
            phone: '+1-555-0123',
            company: 'TechCorp Inc.',
            status: 'qualified',
            source: 'Website',
            score: 85,
            priority: 'high',
            lastContactAt: '2024-01-15T10:30:00Z',
            nextFollowUp: '2024-01-20T14:00:00Z',
            notes: 'Interested in enterprise plan',
            createdAt: '2024-01-10T09:00:00Z'
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            email: 'sarah@startup.io',
            phone: '+1-555-0456',
            company: 'StartupIO',
            status: 'contacted',
            source: 'LinkedIn',
            score: 72,
            priority: 'medium',
            lastContactAt: '2024-01-14T16:45:00Z',
            nextFollowUp: '2024-01-18T11:00:00Z',
            notes: 'Scheduled demo for next week',
            createdAt: '2024-01-12T14:30:00Z'
          },
          {
            id: '3',
            name: 'Mike Chen',
            email: 'mike@bigcorp.com',
            phone: '+1-555-0789',
            company: 'BigCorp',
            status: 'new',
            source: 'Email Campaign',
            score: 68,
            priority: 'medium',
            notes: 'Downloaded whitepaper',
            createdAt: '2024-01-16T08:15:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchActivities = async (organizationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/crm/activities/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      } else {
        // Mock data for demonstration
        setActivities([
          {
            id: '1',
            type: 'email',
            title: 'Sent proposal to John Smith',
            description: 'Enterprise plan proposal sent',
            createdAt: '2024-01-15T10:30:00Z'
          },
          {
            id: '2',
            type: 'call',
            title: 'Demo call with Sarah Johnson',
            description: 'Product demonstration completed',
            createdAt: '2024-01-14T16:45:00Z'
          },
          {
            id: '3',
            type: 'meeting',
            title: 'Scheduled meeting with Mike Chen',
            description: 'Discovery call scheduled for next week',
            createdAt: '2024-01-16T08:15:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const addLead = async () => {
    if (!user?.organizationId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/crm/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId: user.organizationId,
          ...newLead,
        }),
      });

      if (response.ok) {
        const newLeadData = await response.json();
        setLeads([newLeadData, ...leads]);
        setNewLead({ name: '', email: '', phone: '', company: '', source: '', notes: '' });
        setShowAddLead(false);
        toast.success('Lead added successfully!');
      } else {
        throw new Error('Failed to add lead');
      }
    } catch (error) {
      console.error('Error adding lead:', error);
      toast.error('Failed to add lead');
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

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/20 text-blue-300';
      case 'contacted':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'qualified':
        return 'bg-green-500/20 text-green-300';
      case 'converted':
        return 'bg-purple-500/20 text-purple-300';
      case 'lost':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

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
                <a href="/dashboard/crm" className="text-white hover:text-purple-200">CRM</a>
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
              <h2 className="text-3xl font-bold text-white mb-2">CRM Dashboard</h2>
              <p className="text-purple-200">
                Manage your leads and customer relationships
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => user?.organizationId && fetchLeads(user.organizationId)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowAddLead(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Lead</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-lg rounded-xl p-6 border border-blue-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm mb-1">Total Leads</p>
                <p className="text-3xl font-bold text-white">{leads.length}</p>
              </div>
              <div className="p-3 bg-blue-500/30 rounded-lg">
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-lg rounded-xl p-6 border border-green-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm mb-1">Qualified</p>
                <p className="text-3xl font-bold text-white">
                  {leads.filter(l => l.status === 'qualified').length}
                </p>
              </div>
              <div className="p-3 bg-green-500/30 rounded-lg">
                <Star className="w-8 h-8 text-green-200" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-lg rounded-xl p-6 border border-yellow-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-200 text-sm mb-1">High Priority</p>
                <p className="text-3xl font-bold text-white">
                  {leads.filter(l => l.priority === 'high').length}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/30 rounded-lg">
                <Calendar className="w-8 h-8 text-yellow-200" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-lg rounded-xl p-6 border border-purple-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm mb-1">Avg Score</p>
                <p className="text-3xl font-bold text-white">
                  {leads.length > 0 ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length) : 0}
                </p>
              </div>
              <div className="p-3 bg-purple-500/30 rounded-lg">
                <Star className="w-8 h-8 text-purple-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8 border border-white/20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                    Last Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{lead.name}</div>
                        <div className="text-sm text-purple-200">{lead.email}</div>
                        {lead.phone && (
                          <div className="text-sm text-purple-300">{lead.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{lead.company || 'N/A'}</div>
                      <div className="text-sm text-purple-200">{lead.source || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <Star className={`w-4 h-4 ${getPriorityColor(lead.priority)}`} />
                        <span className="text-sm text-white capitalize">{lead.priority}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getScoreColor(lead.score)}`}>
                        {lead.score}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                      {lead.lastContactAt 
                        ? new Date(lead.lastContactAt).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-purple-300 hover:text-white">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-blue-300 hover:text-white">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-red-300 hover:text-white">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Lead Modal */}
        {showAddLead && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Add New Lead</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Name</label>
                  <input
                    type="text"
                    value={newLead.name}
                    onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter lead name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Email</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Phone</label>
                  <input
                    type="tel"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Company</label>
                  <input
                    type="text"
                    value={newLead.company}
                    onChange={(e) => setNewLead({...newLead, company: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Source</label>
                  <select
                    value={newLead.source}
                    onChange={(e) => setNewLead({...newLead, source: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select source</option>
                    <option value="Website">Website</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Email Campaign">Email Campaign</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Notes</label>
                  <textarea
                    value={newLead.notes}
                    onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter notes"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddLead(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addLead}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add Lead
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
