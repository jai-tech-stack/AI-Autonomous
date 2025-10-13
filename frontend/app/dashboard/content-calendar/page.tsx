'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Calendar,
  Plus,
  Edit,
  Trash2,
  Eye,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  LogOut,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

interface ContentPost {
  id: string;
  platform: string;
  content: any;
  status: string;
  scheduledFor?: string;
  publishedAt?: string;
  createdAt: string;
}

export default function ContentCalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [mounted, setMounted] = useState(false);
  const [showAddPost, setShowAddPost] = useState(false);
  const [newPost, setNewPost] = useState({
    platform: 'linkedin',
    content: '',
    scheduledFor: ''
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
          await fetchPosts(userObj.organizationId);
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

  const fetchPosts = async (organizationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/content-posts/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      } else {
        // Mock data for demonstration
        setPosts([
          {
            id: '1',
            platform: 'linkedin',
            content: { text: 'Excited to share our latest product update! 🚀' },
            status: 'published',
            publishedAt: '2024-01-15T10:00:00Z',
            createdAt: '2024-01-14T09:00:00Z'
          },
          {
            id: '2',
            platform: 'twitter',
            content: { text: 'Building the future of AI-powered business tools' },
            status: 'scheduled',
            scheduledFor: '2024-01-20T14:00:00Z',
            createdAt: '2024-01-16T11:00:00Z'
          },
          {
            id: '3',
            platform: 'linkedin',
            content: { text: 'Join us for our upcoming webinar on AI automation' },
            status: 'draft',
            createdAt: '2024-01-17T15:30:00Z'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const addPost = async () => {
    if (!user?.organizationId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/content-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId: user.organizationId,
          platform: newPost.platform,
          content: { text: newPost.content },
          scheduledFor: newPost.scheduledFor || null,
        }),
      });

      if (response.ok) {
        const newPostData = await response.json();
        setPosts([newPostData, ...posts]);
        setNewPost({ platform: 'linkedin', content: '', scheduledFor: '' });
        setShowAddPost(false);
        toast.success('Post created successfully!');
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'draft':
        return <Edit className="w-4 h-4 text-blue-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500/20 text-green-300';
      case 'scheduled':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'draft':
        return 'bg-blue-500/20 text-blue-300';
      case 'failed':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'linkedin':
        return 'bg-blue-500/20 text-blue-300';
      case 'twitter':
        return 'bg-sky-500/20 text-sky-300';
      case 'email':
        return 'bg-purple-500/20 text-purple-300';
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
                <a href="/dashboard/content-calendar" className="text-white hover:text-purple-200">Content</a>
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
              <h2 className="text-3xl font-bold text-white mb-2">Content Calendar</h2>
              <p className="text-purple-200">
                Plan and schedule your content across all platforms
              </p>
            </div>
            <div className="flex space-x-3">
              <div className="flex bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setView('month')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    view === 'month' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:text-white'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setView('week')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    view === 'week' ? 'bg-purple-600 text-white' : 'text-purple-200 hover:text-white'
                  }`}
                >
                  Week
                </button>
              </div>
              <button
                onClick={() => user?.organizationId && fetchPosts(user.organizationId)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowAddPost(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Post</span>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <h3 className="text-xl font-semibold text-white">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Today
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-purple-200">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, i) => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i - 6);
              const dayPosts = posts.filter(post => {
                const postDate = new Date(post.scheduledFor || post.publishedAt || post.createdAt);
                return postDate.toDateString() === date.toDateString();
              });

              return (
                <div
                  key={i}
                  className={`min-h-[100px] p-2 border border-white/10 rounded-lg ${
                    date.getMonth() !== currentDate.getMonth() ? 'opacity-30' : ''
                  } ${date.toDateString() === new Date().toDateString() ? 'bg-purple-500/20' : ''}`}
                >
                  <div className="text-sm text-white mb-1">{date.getDate()}</div>
                  <div className="space-y-1">
                    {dayPosts.slice(0, 2).map((post) => (
                      <div
                        key={post.id}
                        className={`text-xs p-1 rounded truncate ${
                          post.status === 'published' ? 'bg-green-500/20 text-green-300' :
                          post.status === 'scheduled' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {post.platform}: {typeof post.content === 'object' ? post.content.text : post.content}
                      </div>
                    ))}
                    {dayPosts.length > 2 && (
                      <div className="text-xs text-purple-300">
                        +{dayPosts.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Posts List */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
          <div className="p-6 border-b border-white/20">
            <h3 className="text-lg font-semibold text-white">Recent Posts</h3>
          </div>
          <div className="divide-y divide-white/10">
            {posts.map((post) => (
              <div key={post.id} className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {getStatusIcon(post.status)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPlatformColor(post.platform)}`}>
                          {post.platform}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(post.status)}`}>
                          {post.status}
                        </span>
                      </div>
                      <p className="text-white mb-2">
                        {typeof post.content === 'object' ? post.content.text : post.content}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-purple-300">
                        <span>Created: {new Date(post.createdAt).toLocaleDateString()}</span>
                        {post.scheduledFor && (
                          <span>Scheduled: {new Date(post.scheduledFor).toLocaleDateString()}</span>
                        )}
                        {post.publishedAt && (
                          <span>Published: {new Date(post.publishedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Post Modal */}
        {showAddPost && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Create New Post</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Platform</label>
                  <select
                    value={newPost.platform}
                    onChange={(e) => setNewPost({...newPost, platform: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitter">Twitter</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Content</label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Write your post content..."
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Schedule (Optional)</label>
                  <input
                    type="datetime-local"
                    value={newPost.scheduledFor}
                    onChange={(e) => setNewPost({...newPost, scheduledFor: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddPost(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addPost}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Create Post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
