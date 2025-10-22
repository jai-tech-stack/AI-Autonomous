'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Bot, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  Zap, 
  LogOut,
  Brain,
  Mic,
  Image as ImageIcon,
  Play,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Target,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import { AnimatedContainer, AnimatedCard, FadeIn } from '@/components/ui/Animated';
import NeuralNetwork from '@/components/NeuralNetwork';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  category: 'marketing' | 'sales' | 'hr' | 'finance' | 'general';
  goals: string[];
  personality: {
    traits: string[];
    communication_style: string;
    expertise_level: string;
  };
  capabilities: string[];
  industry_presets: string[];
}

export default function AIStudioPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [neuralNetworkActive, setNeuralNetworkActive] = useState(false);

  const agentTemplates: AgentTemplate[] = [
    {
      id: 'marketing_agent',
      name: 'Marketing Agent',
      description: 'Content creation, social media management, and campaign automation',
      icon: MessageSquare,
      color: 'from-pink-500 to-rose-600',
      category: 'marketing',
      goals: [
        'Create engaging social media content',
        'Develop email marketing campaigns',
        'Analyze marketing performance',
        'Maintain brand consistency'
      ],
      personality: {
        traits: ['Creative', 'Data-driven', 'Trend-aware', 'Collaborative'],
        communication_style: 'Energetic and engaging',
        expertise_level: 'Expert in digital marketing and content strategy'
      },
      capabilities: [
        'Social Media Post Generation',
        'Email Campaign Creation',
        'Content Calendar Management',
        'Brand Voice Development',
        'Performance Analytics',
        'A/B Testing Optimization'
      ],
      industry_presets: ['E-commerce', 'SaaS', 'Healthcare', 'Finance', 'Education']
    },
    {
      id: 'sales_agent',
      name: 'Sales Agent',
      description: 'Lead qualification, follow-up automation, and CRM management',
      icon: Users,
      color: 'from-blue-500 to-cyan-600',
      category: 'sales',
      goals: [
        'Qualify and nurture leads',
        'Automate follow-up sequences',
        'Generate personalized proposals',
        'Manage sales pipeline'
      ],
      personality: {
        traits: ['Persuasive', 'Analytical', 'Persistent', 'Goal-oriented'],
        communication_style: 'Professional and consultative',
        expertise_level: 'Expert in sales processes and customer relationship management'
      },
      capabilities: [
        'Lead Scoring and Qualification',
        'Automated Follow-up Sequences',
        'Proposal Generation',
        'CRM Integration',
        'Sales Forecasting',
        'Customer Onboarding'
      ],
      industry_presets: ['B2B Software', 'Real Estate', 'Insurance', 'Consulting', 'Manufacturing']
    },
    {
      id: 'hr_agent',
      name: 'HR Agent',
      description: 'Recruitment, onboarding, and employee engagement automation',
      icon: Users,
      color: 'from-green-500 to-emerald-600',
      category: 'hr',
      goals: [
        'Streamline recruitment processes',
        'Automate employee onboarding',
        'Enhance employee engagement',
        'Manage performance reviews'
      ],
      personality: {
        traits: ['Empathetic', 'Organized', 'Supportive', 'Detail-oriented'],
        communication_style: 'Warm and professional',
        expertise_level: 'Expert in human resources and talent management'
      },
      capabilities: [
        'Job Posting Creation',
        'Candidate Screening',
        'Onboarding Automation',
        'Employee Surveys',
        'Performance Tracking',
        'Compliance Management'
      ],
      industry_presets: ['Technology', 'Healthcare', 'Retail', 'Finance', 'Manufacturing']
    },
    {
      id: 'finance_agent',
      name: 'Finance Agent',
      description: 'Financial reporting, analysis, and forecasting automation',
      icon: BarChart3,
      color: 'from-yellow-500 to-orange-600',
      category: 'finance',
      goals: [
        'Generate financial reports',
        'Analyze budget performance',
        'Track expenses and revenue',
        'Create financial forecasts'
      ],
      personality: {
        traits: ['Precise', 'Analytical', 'Risk-aware', 'Strategic'],
        communication_style: 'Clear and data-focused',
        expertise_level: 'Expert in financial analysis and accounting principles'
      },
      capabilities: [
        'Financial Report Generation',
        'Budget Analysis',
        'Expense Tracking',
        'Revenue Forecasting',
        'Cost Optimization',
        'Compliance Reporting'
      ],
      industry_presets: ['Fintech', 'E-commerce', 'SaaS', 'Manufacturing', 'Healthcare']
    },
    {
      id: 'general_ceo',
      name: 'General CEO Agent',
      description: 'Strategic oversight, decision support, and cross-department coordination',
      icon: Bot,
      color: 'from-purple-500 to-indigo-600',
      category: 'general',
      goals: [
        'Strategic planning and oversight',
        'Cross-department coordination',
        'Executive decision support',
        'Business performance monitoring'
      ],
      personality: {
        traits: ['Strategic', 'Visionary', 'Decisive', 'Collaborative'],
        communication_style: 'Executive and authoritative',
        expertise_level: 'Expert in business strategy and executive leadership'
      },
      capabilities: [
        'Strategic Planning',
        'Executive Reporting',
        'Cross-Department Coordination',
        'Decision Support',
        'Performance Monitoring',
        'Stakeholder Communication'
      ],
      industry_presets: ['All Industries']
    }
  ];

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

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setCustomizing(true);
  };

  const handleCreateAgent = async (template: AgentTemplate) => {
    if (!user?.organizationId) return;

    try {
      const response = await fetch('http://localhost:5000/api/onboarding/ai-ceo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          organizationId: user.organizationId,
          ceoName: `${template.name} Assistant`,
          personality: template.personality,
          goals: template.goals,
          industry: template.industry_presets[0] || 'General',
          capabilities: template.capabilities
        })
      });

      if (response.ok) {
        toast.success(`${template.name} created successfully!`);
        router.push('/dashboard/chat');
      } else {
        throw new Error('Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating agent:', error);
      toast.error('Failed to create agent');
    }
  };

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
        <Toaster position="top-right" />

        {/* Header */}
        <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-white">AI Studio</h1>
                <nav className="hidden md:flex space-x-6">
                  <a href="/dashboard" className="text-purple-200 hover:text-white">Dashboard</a>
                  <a href="/dashboard/ai-studio" className="text-white hover:text-purple-200">AI Studio</a>
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
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!customizing ? (
            <>
              {/* Welcome Section */}
              <FadeIn delay={0.2}>
                <div className="text-center mb-12">
                  <div className="flex items-center justify-center space-x-3 mb-6">
                    <div className="p-4 bg-purple-500/20 rounded-2xl">
                      <Brain className="w-8 h-8 text-purple-300" />
                    </div>
                    <h1 className="text-4xl font-bold text-white">AI Agent Templates</h1>
                  </div>
                  <p className="text-xl text-purple-200 mb-8 max-w-3xl mx-auto">
                    Choose from pre-configured AI agents designed for specific business functions. 
                    Each template includes optimized personality, goals, and capabilities.
                  </p>
                </div>
              </FadeIn>

              {/* Agent Templates Grid */}
              <FadeIn delay={0.4}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                  {agentTemplates.map((template, index) => {
                    const Icon = template.icon;
                    
                    return (
                      <AnimatedCard
                        key={template.id}
                        className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <div className="text-center">
                          <div className={`p-6 rounded-2xl bg-gradient-to-r ${template.color} mx-auto mb-6 w-fit group-hover:scale-110 transition-transform`}>
                            <Icon className="w-12 h-12 text-white" />
                          </div>
                          
                          <h3 className="text-2xl font-bold text-white mb-4">{template.name}</h3>
                          <p className="text-purple-200 mb-6">{template.description}</p>
                          
                          <div className="space-y-3 mb-6">
                            <h4 className="text-lg font-semibold text-white">Key Capabilities:</h4>
                            {template.capabilities.slice(0, 3).map((capability, idx) => (
                              <div key={idx} className="flex items-center space-x-2 text-sm text-purple-300">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span>{capability}</span>
                              </div>
                            ))}
                            {template.capabilities.length > 3 && (
                              <div className="text-sm text-purple-400">
                                +{template.capabilities.length - 3} more capabilities
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-purple-300">
                              {template.industry_presets.length} industry presets
                            </span>
                            <ArrowRight className="w-5 h-5 text-purple-300 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </AnimatedCard>
                    );
                  })}
                </div>
              </FadeIn>

              {/* AI Capabilities Overview */}
              <FadeIn delay={0.6}>
                <AnimatedCard className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-lg rounded-2xl p-8 border border-purple-400/30">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-4">Advanced AI Capabilities</h2>
                    <p className="text-purple-200 text-lg">
                      Your AI agents are powered by cutting-edge technology
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="text-center">
                      <div className="p-4 bg-blue-500/20 rounded-xl w-fit mx-auto mb-4">
                        <Brain className="w-8 h-8 text-blue-300" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-3">Neural Networks</h3>
                      <p className="text-purple-200 text-sm">
                        Self-learning AI that adapts and improves over time based on your business data
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="p-4 bg-green-500/20 rounded-xl w-fit mx-auto mb-4">
                        <Mic className="w-8 h-8 text-green-300" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-3">Voice & Speech</h3>
                      <p className="text-purple-200 text-sm">
                        Natural language processing with voice recognition and synthesis capabilities
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="p-4 bg-pink-500/20 rounded-xl w-fit mx-auto mb-4">
                        <ImageIcon className="w-8 h-8 text-pink-300" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-3">Visual Processing</h3>
                      <p className="text-purple-200 text-sm">
                        Image generation, analysis, and visual content creation for marketing materials
                      </p>
                    </div>
                  </div>
                </AnimatedCard>
              </FadeIn>
            </>
          ) : selectedTemplate && (
            <>
              {/* Customization Interface */}
              <FadeIn delay={0.2}>
                <div className="mb-8">
                  <button
                    onClick={() => setCustomizing(false)}
                    className="flex items-center space-x-2 text-purple-300 hover:text-white mb-6"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    <span>Back to Templates</span>
                  </button>
                  
                  <div className="flex items-center space-x-4 mb-8">
                    <div className={`p-4 rounded-2xl bg-gradient-to-r ${selectedTemplate.color}`}>
                      <selectedTemplate.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-white">{selectedTemplate.name}</h1>
                      <p className="text-purple-200">{selectedTemplate.description}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Template Details */}
                <FadeIn delay={0.4}>
                  <div className="space-y-6">
                    <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                      <h3 className="text-xl font-semibold text-white mb-4">Goals & Objectives</h3>
                      <div className="space-y-2">
                        {selectedTemplate.goals.map((goal, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-purple-200">
                            <Target className="w-4 h-4 text-purple-400" />
                            <span>{goal}</span>
                          </div>
                        ))}
                      </div>
                    </AnimatedCard>

                    <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                      <h3 className="text-xl font-semibold text-white mb-4">Personality Traits</h3>
                      <div className="space-y-3">
                        <div>
                          <span className="text-purple-300 font-medium">Traits: </span>
                          <span className="text-purple-200">{selectedTemplate.personality.traits.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-purple-300 font-medium">Communication: </span>
                          <span className="text-purple-200">{selectedTemplate.personality.communication_style}</span>
                        </div>
                        <div>
                          <span className="text-purple-300 font-medium">Expertise: </span>
                          <span className="text-purple-200">{selectedTemplate.personality.expertise_level}</span>
                        </div>
                      </div>
                    </AnimatedCard>

                    <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                      <h3 className="text-xl font-semibold text-white mb-4">Industry Presets</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.industry_presets.map((industry, idx) => (
                          <span key={idx} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                            {industry}
                          </span>
                        ))}
                      </div>
                    </AnimatedCard>
                  </div>
                </FadeIn>

                {/* Capabilities & Create Button */}
                <FadeIn delay={0.6}>
                  <div className="space-y-6">
                    <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
                      <h3 className="text-xl font-semibold text-white mb-4">Capabilities</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedTemplate.capabilities.map((capability, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-purple-200">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-sm">{capability}</span>
                          </div>
                        ))}
                      </div>
                    </AnimatedCard>

                    <AnimatedCard className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 backdrop-blur-lg rounded-xl p-6 border border-purple-400/30">
                      <div className="text-center">
                        <h3 className="text-xl font-semibold text-white mb-4">Ready to Deploy?</h3>
                        <p className="text-purple-200 mb-6">
                          This agent will be configured with all the settings shown and ready to start working immediately.
                        </p>
                        <button
                          onClick={() => handleCreateAgent(selectedTemplate)}
                          className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2"
                        >
                          <Sparkles className="w-5 h-5" />
                          <span>Create {selectedTemplate.name}</span>
                        </button>
                      </div>
                    </AnimatedCard>
                  </div>
                </FadeIn>
              </div>
            </>
          )}

          {/* Neural Network Component */}
          {neuralNetworkActive && (
            <FadeIn delay={0.8}>
              <div className="mt-16">
                <NeuralNetwork organizationId={user?.organizationId || ''} />
              </div>
            </FadeIn>
          )}

          {/* Toggle Neural Network */}
          <div className="text-center mt-8">
            <button
              onClick={() => setNeuralNetworkActive(!neuralNetworkActive)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-colors"
            >
              {neuralNetworkActive ? 'Hide' : 'Show'} Neural Network Status
            </button>
          </div>
        </div>
      </div>
    </AnimatedContainer>
  );
}