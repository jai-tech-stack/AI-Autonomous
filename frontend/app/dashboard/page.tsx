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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Play, 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  LogOut
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

interface Task {
  id: string;
  taskType: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  input: any;
  output?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    inProgress: 0,
  });
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
          await fetchTasks(userObj.organizationId);
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

  const fetchTasks = async (organizationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/tasks/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.slice(0, 5)); // Show only recent 5 tasks
        
        // Calculate stats
        const stats = {
          total: data.length,
          completed: data.filter((t: Task) => t.status === 'COMPLETED').length,
          pending: data.filter((t: Task) => t.status === 'PENDING').length,
          failed: data.filter((t: Task) => t.status === 'FAILED').length,
          inProgress: data.filter((t: Task) => t.status === 'IN_PROGRESS').length,
        };
        setTaskStats(stats);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const createQuickTask = async (taskType: string, prompt: string) => {
    if (!user?.organizationId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId: user.organizationId,
          taskType,
          input: { prompt },
        }),
      });

      if (response.ok) {
        const newTask = await response.json();
        setTasks([newTask, ...tasks.slice(0, 4)]);
        toast.success('Task created successfully!');
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
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

  // Chart data
  const taskChartData = [
    { name: 'Completed', value: taskStats.completed, color: '#10B981' },
    { name: 'Pending', value: taskStats.pending, color: '#F59E0B' },
    { name: 'In Progress', value: taskStats.inProgress, color: '#3B82F6' },
    { name: 'Failed', value: taskStats.failed, color: '#EF4444' },
  ];

  const activityData = [
    { day: 'Mon', tasks: 2 },
    { day: 'Tue', tasks: 5 },
    { day: 'Wed', tasks: 3 },
    { day: 'Thu', tasks: 7 },
    { day: 'Fri', tasks: 4 },
    { day: 'Sat', tasks: 1 },
    { day: 'Sun', tasks: 0 },
  ];

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
                <a href="/dashboard" className="text-white hover:text-purple-200">Dashboard</a>
                <a href="/dashboard/tasks" className="text-purple-200 hover:text-white">Tasks</a>
                <a href="/dashboard/chat" className="text-purple-200 hover:text-white">Chat</a>
                <a href="/dashboard/analytics" className="text-purple-200 hover:text-white">Analytics</a>
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
        {/* Welcome Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.firstName}! 👋
          </h2>
          <p className="text-purple-200">
            Your AI CEO is ready to help you grow your business.
          </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/dashboard/tasks')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>View All Tasks</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/chat')}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat with AI CEO</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => createQuickTask('social_media_post', 'Create engaging social media content about our latest product launch')}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                <Zap className="w-6 h-6 text-purple-300" />
              </div>
              <Plus className="w-4 h-4 text-purple-300" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Generate Social Posts</h3>
            <p className="text-purple-200 text-sm">Create engaging content for LinkedIn</p>
          </button>

          <button
            onClick={() => createQuickTask('email_campaign', 'Draft a newsletter for our subscribers about Q4 results')}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-500/20 rounded-lg group-hover:bg-indigo-500/30 transition-colors">
                <MessageSquare className="w-6 h-6 text-indigo-300" />
              </div>
              <Plus className="w-4 h-4 text-indigo-300" />
              </div>
            <h3 className="text-white font-semibold text-lg mb-2">Email Campaign</h3>
            <p className="text-purple-200 text-sm">Draft and send newsletters</p>
          </button>

          <button
            onClick={() => createQuickTask('lead_followup', 'Follow up with potential clients from last week')}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                <Users className="w-6 h-6 text-green-300" />
            </div>
              <Plus className="w-4 h-4 text-green-300" />
          </div>
            <h3 className="text-white font-semibold text-lg mb-2">Follow up Leads</h3>
            <p className="text-purple-200 text-sm">Personalized follow-up messages</p>
          </button>

          <button
            onClick={() => createQuickTask('content_analysis', 'Analyze our recent marketing performance and suggest improvements')}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-500/20 rounded-lg group-hover:bg-pink-500/30 transition-colors">
                <TrendingUp className="w-6 h-6 text-pink-300" />
              </div>
              <Plus className="w-4 h-4 text-pink-300" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Analyze Performance</h3>
            <p className="text-purple-200 text-sm">Get insights and recommendations</p>
          </button>
        </div>

        {/* Stats and Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Task Status Chart */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold text-lg mb-4">Task Activity This Week</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="#A78BFA" />
                <YAxis stroke="#A78BFA" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="tasks" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Task Status Pie Chart */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-white font-semibold text-lg mb-4">Task Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={taskChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {taskChartData.map((entry, index) => (
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
              {taskChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-purple-200">{item.name}</span>
                  </div>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-semibold text-lg">Recent Tasks</h3>
            <button
              onClick={() => router.push('/dashboard/tasks')}
              className="text-purple-300 hover:text-purple-200 text-sm font-medium transition-colors"
            >
              View All →
            </button>
          </div>
          
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-4 bg-purple-500/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Play className="w-8 h-8 text-purple-300" />
              </div>
              <h4 className="text-white font-medium mb-2">No tasks yet</h4>
              <p className="text-purple-200 text-sm mb-4">Create your first task to get started</p>
              <button
                onClick={() => createQuickTask('social_media_post', 'Create my first social media post')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create First Task
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center space-x-3">
                    {task.status === 'COMPLETED' && <CheckCircle className="w-5 h-5 text-green-400" />}
                    {task.status === 'PENDING' && <Clock className="w-5 h-5 text-yellow-400" />}
                    {task.status === 'FAILED' && <XCircle className="w-5 h-5 text-red-400" />}
                    {task.status === 'IN_PROGRESS' && <Clock className="w-5 h-5 text-blue-400 animate-pulse" />}
                    
                    <div>
                      <p className="text-white font-medium capitalize">
                        {task.taskType.replace('_', ' ')}
                      </p>
                      <p className="text-purple-200 text-sm">
                        {typeof task.input === 'object' ? task.input.prompt : task.input}
                      </p>
          </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300' :
                      task.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-300' :
                      task.status === 'FAILED' ? 'bg-red-500/20 text-red-300' :
                      'bg-blue-500/20 text-blue-300'
                    }`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                      className="p-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4 text-purple-300" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-lg rounded-xl p-6 border border-purple-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm mb-1">Total Tasks</p>
                <p className="text-3xl font-bold text-white">{taskStats.total}</p>
              </div>
              <div className="p-3 bg-purple-500/30 rounded-lg">
                <Play className="w-8 h-8 text-purple-200" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-lg rounded-xl p-6 border border-green-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm mb-1">Completed</p>
                <p className="text-3xl font-bold text-white">{taskStats.completed}</p>
              </div>
              <div className="p-3 bg-green-500/30 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-lg rounded-xl p-6 border border-yellow-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-200 text-sm mb-1">In Progress</p>
                <p className="text-3xl font-bold text-white">{taskStats.inProgress + taskStats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-500/30 rounded-lg">
                <Clock className="w-8 h-8 text-yellow-200" />
            </div>
          </div>
        </div>

          <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-lg rounded-xl p-6 border border-red-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-200 text-sm mb-1">Failed</p>
                <p className="text-3xl font-bold text-white">{taskStats.failed}</p>
              </div>
              <div className="p-3 bg-red-500/30 rounded-lg">
                <XCircle className="w-8 h-8 text-red-200" />
              </div>
            </div>
              </div>
            </div>
          </div>
    </div>
  );
}
