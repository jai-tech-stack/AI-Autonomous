'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { LogOut, Settings, Zap } from 'lucide-react';
import CustomAvatar from '@/components/CustomAvatar';
import ThreeJSAvatar from '@/components/ThreeJSAvatar';
import { AnimatedContainer } from '@/components/ui/Animated';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

interface AIConfig {
  ceoName: string;
  personality: any;
  goals: any;
  industry?: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [avatarType, setAvatarType] = useState<'2d' | '3d'>('2d');

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
          await fetchAIConfig(userObj.organizationId);
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

  const fetchAIConfig = async (organizationId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/onboarding/ai-ceo/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAiConfig(data);
      }
    } catch (error) {
      console.error('Error fetching AI config:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleMessage = (message: string) => {
    // Handle avatar message - could be used for logging or additional processing
    console.log('Avatar message:', message);
  };

  const handleVoiceResponse = (audioBlob: Blob) => {
    // Handle voice response from avatar
    console.log('Voice response received:', audioBlob);
  };

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <AnimatedContainer>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col">
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
                  <a href="/dashboard/chat" className="text-white hover:text-purple-200">Chat</a>
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

        {/* Avatar AI Interface */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-4xl">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Zap className="w-6 h-6 text-purple-300" />
                  </div>
                  <h2 className="text-3xl font-bold text-white">Custom AI CEO Avatar</h2>
                </div>
                <p className="text-purple-200 text-lg mb-6">
                  Interact with your AI CEO through voice and text - No external costs!
                </p>
                
                {/* Avatar Type Selector */}
                <div className="flex justify-center space-x-4 mb-6">
                  <button
                    onClick={() => setAvatarType('2d')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      avatarType === '2d'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white/10 text-purple-200 hover:bg-white/20'
                    }`}
                  >
                    🎨 2D Canvas Avatar
                  </button>
                  <button
                    onClick={() => setAvatarType('3d')}
                    className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                      avatarType === '3d'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white/10 text-purple-200 hover:bg-white/20'
                    }`}
                  >
                    🎮 3D Three.js Avatar
                  </button>
                </div>
              </div>

              {user?.organizationId && (
                <>
                  {avatarType === '2d' ? (
                    <CustomAvatar
                      organizationId={user.organizationId}
                      aiConfig={aiConfig ?? undefined}
                      onMessage={handleMessage}
                      onVoiceResponse={handleVoiceResponse}
                    />
                  ) : (
                    <ThreeJSAvatar
                      organizationId={user.organizationId}
                      aiConfig={aiConfig ?? undefined}
                      onMessage={handleMessage}
                      onVoiceResponse={handleVoiceResponse}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AnimatedContainer>
  );
}