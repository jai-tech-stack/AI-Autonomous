'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { LogOut, Settings, Brain, ArrowLeft } from 'lucide-react';
import AgenticAIOrchestrator from '@/components/AgenticAIOrchestrator';
import { AnimatedContainer } from '@/components/ui/Animated';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

export default function OrchestratorPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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

  return (
    <AnimatedContainer>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col">
        <Toaster position="top-right" />

        {/* Header */}
        <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center space-x-2 text-purple-200 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Dashboard</span>
                </button>
                <div className="h-6 w-px bg-white/20"></div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Brain className="w-6 h-6 text-purple-300" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">AI Orchestrator</h1>
                </div>
                <nav className="hidden md:flex space-x-6">
                  <a href="/dashboard" className="text-purple-200 hover:text-white">Dashboard</a>
                  <a href="/dashboard/tasks" className="text-purple-200 hover:text-white">Tasks</a>
                  <a href="/dashboard/chat" className="text-purple-200 hover:text-white">Chat</a>
                  <a href="/dashboard/analytics" className="text-purple-200 hover:text-white">Analytics</a>
                  <a href="/dashboard/orchestrator" className="text-white hover:text-purple-200">Orchestrator</a>
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

        {/* Orchestrator Interface */}
        <div className="flex-1">
          {user?.organizationId && (
            <AgenticAIOrchestrator
              organizationId={user.organizationId}
              onTaskComplete={(taskId, result) => {
                console.log('Task completed:', taskId, result);
              }}
              onWorkflowUpdate={(workflow) => {
                console.log('Workflow updated:', workflow);
              }}
            />
          )}
        </div>
      </div>
    </AnimatedContainer>
  );
}
