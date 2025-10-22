'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  Bot, 
  Database, 
  Link, 
  ArrowRight, 
  CheckCircle, 
  Sparkles,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Zap,
  Download
} from 'lucide-react';
import { AnimatedContainer, AnimatedCard, FadeIn } from '@/components/ui/Animated';
import { seedDemoData } from '@/lib/demoData';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

export default function QuickStartPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [seedingDemo, setSeedingDemo] = useState(false);

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
        // Check what steps are already completed
        await checkCompletedSteps(userObj.organizationId);
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const checkCompletedSteps = async (organizationId?: string) => {
    if (!organizationId) return;
    
    try {
      // Check if AI CEO is configured
      const aiResponse = await fetch(`http://localhost:5000/api/onboarding/ai-ceo/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (aiResponse.ok) {
        setCompletedSteps(prev => [...prev, 'agent']);
      }

      // Check if knowledge base has content
      const kbResponse = await fetch(`http://localhost:5000/api/knowledge/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (kbResponse.ok) {
        const kbData = await kbResponse.json();
        if (kbData.length > 0) {
          setCompletedSteps(prev => [...prev, 'knowledge']);
        }
      }

      // Check if integrations are connected
      const integrationsResponse = await fetch(`http://localhost:5000/api/integrations/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (integrationsResponse.ok) {
        const integrationsData = await integrationsResponse.json();
        if (integrationsData.length > 0) {
          setCompletedSteps(prev => [...prev, 'integrations']);
        }
      }
    } catch (error) {
      console.error('Error checking completed steps:', error);
    }
  };

  const handleSeedDemoData = async () => {
    if (!user?.organizationId) return;
    
    setSeedingDemo(true);
    try {
      const token = localStorage.getItem('token');
      const result = await seedDemoData(user.organizationId, token || '');
      
      if (result.success) {
        toast.success('Demo data loaded successfully! Your dashboard is now populated with sample data.');
        // Refresh the page to show the new data
        window.location.reload();
      } else {
        toast.error('Failed to load demo data');
      }
    } catch (error) {
      console.error('Error seeding demo data:', error);
      toast.error('Failed to load demo data');
    } finally {
      setSeedingDemo(false);
    }
  };

  const quickStartSteps = [
    {
      id: 'agent',
      title: 'Create Your First AI Agent',
      description: 'Set up your AI CEO with personality, goals, and industry expertise',
      icon: Bot,
      color: 'from-purple-500 to-indigo-600',
      href: '/dashboard/ai-studio',
      features: ['Personality Configuration', 'Goal Setting', 'Industry Expertise', 'Voice & Avatar Setup']
    },
    {
      id: 'knowledge',
      title: 'Add Knowledge Base',
      description: 'Upload documents, connect data sources, and train your AI',
      icon: Database,
      color: 'from-blue-500 to-cyan-600',
      href: '/dashboard/knowledge',
      features: ['Document Upload', 'Data Integration', 'Knowledge Training', 'Content Management']
    },
    {
      id: 'integrations',
      title: 'Connect Channels',
      description: 'Integrate with LinkedIn, Twitter, Email, and CRM systems',
      icon: Link,
      color: 'from-green-500 to-emerald-600',
      href: '/dashboard/integrations',
      features: ['Social Media APIs', 'Email Services', 'CRM Integration', 'Analytics Tools']
    }
  ];

  const departmentTemplates = [
    {
      name: 'Marketing Agent',
      description: 'Content creation, social media, campaigns',
      icon: MessageSquare,
      color: 'bg-pink-500/20 text-pink-300',
      tasks: ['Social Media Posts', 'Email Campaigns', 'Content Calendar', 'Brand Voice']
    },
    {
      name: 'Sales Agent',
      description: 'Lead follow-up, CRM management, outreach',
      icon: Users,
      color: 'bg-blue-500/20 text-blue-300',
      tasks: ['Lead Qualification', 'Follow-up Sequences', 'Proposal Generation', 'Pipeline Management']
    },
    {
      name: 'HR Agent',
      description: 'Recruitment, onboarding, employee engagement',
      icon: Users,
      color: 'bg-green-500/20 text-green-300',
      tasks: ['Job Postings', 'Candidate Screening', 'Onboarding Automation', 'Employee Surveys']
    },
    {
      name: 'Finance Agent',
      description: 'Reporting, analysis, forecasting',
      icon: BarChart3,
      color: 'bg-yellow-500/20 text-yellow-300',
      tasks: ['Financial Reports', 'Budget Analysis', 'Expense Tracking', 'Forecasting']
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
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
                <h1 className="text-2xl font-bold text-white">AI CEO Platform</h1>
                <nav className="hidden md:flex space-x-6">
                  <a href="/dashboard" className="text-purple-200 hover:text-white">Dashboard</a>
                  <a href="/dashboard/quick-start" className="text-white hover:text-purple-200">Quick Start</a>
                  <a href="/dashboard/chat" className="text-purple-200 hover:text-white">Chat</a>
                  <a href="/dashboard/analytics" className="text-purple-200 hover:text-white">Analytics</a>
                </nav>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-white">Welcome, {user?.firstName}</span>
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    router.push('/login');
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <FadeIn delay={0.2}>
            <div className="text-center mb-12">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="p-4 bg-purple-500/20 rounded-2xl">
                  <Sparkles className="w-8 h-8 text-purple-300" />
                </div>
                <h1 className="text-4xl font-bold text-white">Welcome to Your AI CEO Platform</h1>
              </div>
              <p className="text-xl text-purple-200 mb-8 max-w-3xl mx-auto">
                Let's get you started with your AI-powered business automation. 
                Follow these steps to unlock the full potential of agentic AI.
              </p>
            </div>
          </FadeIn>

          {/* Quick Start Steps */}
          <FadeIn delay={0.4}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              {quickStartSteps.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const Icon = step.icon;
                
                return (
                  <AnimatedCard
                    key={step.id}
                    className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 ${
                      isCompleted 
                        ? 'bg-green-500/10 border-green-400/30' 
                        : 'bg-white/10 border-white/20 hover:bg-white/15'
                    }`}
                    onClick={() => router.push(step.href)}
                  >
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-r ${step.color}`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        {isCompleted && (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        )}
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-3">
                        {step.title}
                      </h3>
                      <p className="text-purple-200 mb-6">
                        {step.description}
                      </p>
                      
                      <div className="space-y-2 mb-6">
                        {step.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-sm text-purple-300">
                            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${
                          isCompleted ? 'text-green-300' : 'text-purple-300'
                        }`}>
                          {isCompleted ? 'Completed' : `Step ${index + 1}`}
                        </span>
                        <ArrowRight className="w-5 h-5 text-purple-300" />
                      </div>
                    </div>
                  </AnimatedCard>
                );
              })}
            </div>
          </FadeIn>

          {/* Department Templates */}
          <FadeIn delay={0.6}>
            <div className="mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">Choose Your Department Focus</h2>
                <p className="text-purple-200 text-lg">
                  Start with a pre-configured agent template for your specific business needs
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {departmentTemplates.map((template, index) => {
                  const Icon = template.icon;
                  
                  return (
                    <AnimatedCard
                      key={template.name}
                      className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group"
                      onClick={() => router.push('/dashboard/ai-studio')}
                    >
                      <div className="text-center">
                        <div className={`p-4 rounded-xl ${template.color} mx-auto mb-4 w-fit group-hover:scale-110 transition-transform`}>
                          <Icon className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{template.name}</h3>
                        <p className="text-purple-200 text-sm mb-4">{template.description}</p>
                        
                        <div className="space-y-1">
                          {template.tasks.slice(0, 2).map((task, idx) => (
                            <div key={idx} className="text-xs text-purple-300">
                              • {task}
                            </div>
                          ))}
                          {template.tasks.length > 2 && (
                            <div className="text-xs text-purple-400">
                              +{template.tasks.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    </AnimatedCard>
                  );
                })}
              </div>
            </div>
          </FadeIn>

          {/* Getting Started Tips */}
          <FadeIn delay={0.8}>
            <AnimatedCard className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-lg rounded-2xl p-8 border border-purple-400/30">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <Zap className="w-8 h-8 text-purple-300" />
                  <h2 className="text-2xl font-bold text-white">Pro Tips for Success</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Start Small</h3>
                    <p className="text-purple-200 text-sm">
                      Begin with one department and gradually expand. This helps you understand 
                      the system before scaling across your organization.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Upload Quality Data</h3>
                    <p className="text-purple-200 text-sm">
                      The better your knowledge base, the smarter your AI becomes. 
                      Upload comprehensive documents and data sources.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Monitor & Iterate</h3>
                    <p className="text-purple-200 text-sm">
                      Regularly check analytics and adjust your AI's goals and personality 
                      based on performance and business needs.
                    </p>
                  </div>
                </div>
                
                <div className="mt-8 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Go to Dashboard
                    </button>
                    <button
                      onClick={handleSeedDemoData}
                      disabled={seedingDemo}
                      className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>{seedingDemo ? 'Loading Demo Data...' : 'Load Demo Data'}</span>
                    </button>
                  </div>
                  <p className="text-sm text-purple-300 text-center">
                    Load demo data to see the platform in action with sample leads, tasks, and campaigns
                  </p>
                </div>
              </div>
            </AnimatedCard>
          </FadeIn>
        </div>
      </div>
    </AnimatedContainer>
  );
}
