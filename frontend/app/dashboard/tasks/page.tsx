'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
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
  LogOut,
  Filter,
  RefreshCw
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

export default function TasksPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<string>('all');
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
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const createTask = async (taskType: string, prompt: string) => {
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
        setTasks([newTask, ...tasks]);
        toast.success('Task created successfully!');
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const retryTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/tasks/${taskId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Task queued for retry!');
        if (user?.organizationId) {
          await fetchTasks(user.organizationId);
        }
      } else {
        throw new Error('Failed to retry task');
      }
    } catch (error) {
      console.error('Error retrying task:', error);
      toast.error('Failed to retry task');
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

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(task => task.status.toLowerCase() === filter.toLowerCase());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-blue-400 animate-pulse" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-300';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'FAILED':
        return 'bg-red-500/20 text-red-300';
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
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
                <a href="/dashboard/tasks" className="text-white hover:text-purple-200">Tasks</a>
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
        {/* Header Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Task Dashboard</h2>
              <p className="text-purple-200">
                Manage and monitor your AI CEO tasks
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => user?.organizationId && fetchTasks(user.organizationId)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => createTask('social_media_post', 'Create engaging social media content')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Task</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8 border border-white/20">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-purple-300" />
            <span className="text-white font-medium">Filter by status:</span>
            <div className="flex space-x-2">
              {['all', 'pending', 'in_progress', 'completed', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-purple-200 hover:bg-white/20'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-purple-500/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Play className="w-8 h-8 text-purple-300" />
              </div>
              <h4 className="text-white font-medium mb-2">No tasks found</h4>
              <p className="text-purple-200 text-sm mb-4">
                {filter === 'all' ? 'Create your first task to get started' : `No ${filter} tasks found`}
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => createTask('social_media_post', 'Create my first social media post')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Create First Task
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div key={task.id} className="bg-white/5 rounded-lg border border-white/10 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {getStatusIcon(task.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-white font-semibold text-lg capitalize">
                            {task.taskType.replace('_', ' ')}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-purple-200 text-sm mb-3">
                          {typeof task.input === 'object' ? task.input.prompt : task.input}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-purple-300">
                          <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
                          {task.completedAt && (
                            <span>Completed: {new Date(task.completedAt).toLocaleString()}</span>
                          )}
                        </div>
                        {task.output && (
                          <div className="mt-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                            <h4 className="text-green-300 font-medium mb-2">Output:</h4>
                            <div className="text-green-200 text-sm whitespace-pre-wrap">
                              {typeof task.output === 'object' ? JSON.stringify(task.output, null, 2) : task.output}
                            </div>
                          </div>
                        )}
                        {task.error && (
                          <div className="mt-4 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                            <h4 className="text-red-300 font-medium mb-2">Error:</h4>
                            <div className="text-red-200 text-sm">{task.error}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {task.status === 'FAILED' && (
                        <button
                          onClick={() => retryTask(task.id)}
                          className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                          title="Retry Task"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
