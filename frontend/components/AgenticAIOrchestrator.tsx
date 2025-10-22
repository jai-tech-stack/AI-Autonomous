'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  Target, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw,
  Settings,
  BarChart3,
  Users,
  Mail,
  Calendar,
  FileText,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  ArrowDown,
  GitBranch,
  Workflow,
  Cpu,
  Database,
  Network
} from 'lucide-react';
import { AnimatedContainer, AnimatedCard, FadeIn } from './ui/Animated';

interface AgenticAIOrchestratorProps {
  organizationId: string;
  onTaskComplete?: (taskId: string, result: any) => void;
  onWorkflowUpdate?: (workflow: WorkflowState) => void;
}

interface WorkflowState {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentStep: number;
  totalSteps: number;
  progress: number;
  steps: WorkflowStep[];
  results: any[];
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'analysis' | 'action' | 'decision' | 'integration' | 'notification';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  dependencies: string[];
  inputs: any;
  outputs?: any;
  error?: string;
  duration?: number;
  agent?: string;
}

interface Agent {
  id: string;
  name: string;
  type: 'marketing' | 'sales' | 'hr' | 'finance' | 'operations' | 'strategy';
  capabilities: string[];
  status: 'available' | 'busy' | 'offline';
  currentTask?: string;
  performance: {
    tasksCompleted: number;
    successRate: number;
    avgDuration: number;
  };
}

interface OrchestrationMetrics {
  activeWorkflows: number;
  completedWorkflows: number;
  totalTasks: number;
  successRate: number;
  avgWorkflowDuration: number;
  agentUtilization: number;
}

export default function AgenticAIOrchestrator({ 
  organizationId, 
  onTaskComplete, 
  onWorkflowUpdate 
}: AgenticAIOrchestratorProps) {
  const [workflows, setWorkflows] = useState<WorkflowState[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [metrics, setMetrics] = useState<OrchestrationMetrics>({
    activeWorkflows: 0,
    completedWorkflows: 0,
    totalTasks: 0,
    successRate: 0,
    avgWorkflowDuration: 0,
    agentUtilization: 0
  });
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowState | null>(null);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [workflowTemplates, setWorkflowTemplates] = useState<any[]>([]);
  const [realTimeUpdates, setRealTimeUpdates] = useState<any[]>([]);
  
  const orchestrationRef = useRef<HTMLDivElement>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    initializeOrchestrator();
    startRealTimeUpdates();
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  const initializeOrchestrator = async () => {
    try {
      // Load workflows
      const workflowsResponse = await fetch(`http://localhost:5000/api/orchestration/workflows/${organizationId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (workflowsResponse.ok) {
        const workflowsData = await workflowsResponse.json();
        setWorkflows(workflowsData);
      }

      // Load agents
      const agentsResponse = await fetch(`http://localhost:5000/api/orchestration/agents/${organizationId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAgents(agentsData);
      }

      // Load metrics
      const metricsResponse = await fetch(`http://localhost:5000/api/orchestration/metrics/${organizationId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      // Load workflow templates
      const templatesResponse = await fetch(`http://localhost:5000/api/orchestration/templates`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setWorkflowTemplates(templatesData);
      }
    } catch (error) {
      console.error('Error initializing orchestrator:', error);
    }
  };

  const startRealTimeUpdates = () => {
    updateIntervalRef.current = setInterval(async () => {
      try {
        // Update workflow statuses
        const statusResponse = await fetch(`http://localhost:5000/api/orchestration/status/${organizationId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setWorkflows(prev => prev.map(w => {
            const updated = statusData.workflows.find((sw: any) => sw.id === w.id);
            return updated ? { ...w, ...updated } : w;
          }));
        }

        // Add real-time update
        const update = {
          id: Date.now().toString(),
          type: 'workflow_update',
          message: 'Workflow status updated',
          timestamp: new Date(),
          workflowId: workflows[0]?.id
        };
        setRealTimeUpdates(prev => [update, ...prev.slice(0, 9)]);
      } catch (error) {
        console.error('Error updating orchestrator:', error);
      }
    }, 2000);
  };

  const createWorkflow = async (templateId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orchestration/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          organizationId,
          templateId,
          name: `Workflow ${Date.now()}`
        })
      });

      if (response.ok) {
        const newWorkflow = await response.json();
        setWorkflows(prev => [...prev, newWorkflow]);
        setIsCreatingWorkflow(false);
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const startWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orchestration/workflows/${workflowId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        setWorkflows(prev => prev.map(w => 
          w.id === workflowId 
            ? { ...w, status: 'running', startTime: new Date() }
            : w
        ));
      }
    } catch (error) {
      console.error('Error starting workflow:', error);
    }
  };

  const pauseWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orchestration/workflows/${workflowId}/pause`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        setWorkflows(prev => prev.map(w => 
          w.id === workflowId 
            ? { ...w, status: 'paused' }
            : w
        ));
      }
    } catch (error) {
      console.error('Error pausing workflow:', error);
    }
  };

  const getStepIcon = (type: string) => {
    const icons = {
      analysis: <BarChart3 className="w-4 h-4" />,
      action: <Zap className="w-4 h-4" />,
      decision: <Target className="w-4 h-4" />,
      integration: <Network className="w-4 h-4" />,
      notification: <Mail className="w-4 h-4" />
    };
    return icons[type as keyof typeof icons] || <Workflow className="w-4 h-4" />;
  };

  const getStepStatusColor = (status: string) => {
    const colors = {
      pending: 'text-gray-400',
      running: 'text-blue-400',
      completed: 'text-green-400',
      failed: 'text-red-400',
      skipped: 'text-yellow-400'
    };
    return colors[status as keyof typeof colors] || 'text-gray-400';
  };

  const getWorkflowStatusColor = (status: string) => {
    const colors = {
      idle: 'text-gray-400',
      running: 'text-blue-400',
      paused: 'text-yellow-400',
      completed: 'text-green-400',
      error: 'text-red-400'
    };
    return colors[status as keyof typeof colors] || 'text-gray-400';
  };

  return (
    <AnimatedContainer>
      <div className="space-y-8 p-6">
        {/* Header */}
        <FadeIn delay={0.2}>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Brain className="w-8 h-8 text-purple-300" />
              </div>
              <h1 className="text-4xl font-bold text-white">Agentic AI Orchestrator</h1>
            </div>
            <p className="text-purple-200 text-lg">
              Multi-step AI workflows with autonomous task execution and intelligent coordination
            </p>
          </div>
        </FadeIn>

        {/* Metrics Dashboard */}
        <FadeIn delay={0.4}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatedCard className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Workflow className="w-6 h-6 text-blue-300" />
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Active Workflows</p>
                  <p className="text-2xl font-bold text-white">{metrics.activeWorkflows}</p>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-300" />
                </div>
                <div>
                  <p className="text-green-200 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-white">{metrics.completedWorkflows}</p>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard className="bg-gradient-to-br from-orange-600/20 to-red-600/20 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Target className="w-6 h-6 text-orange-300" />
                </div>
                <div>
                  <p className="text-orange-200 text-sm">Success Rate</p>
                  <p className="text-2xl font-bold text-white">{metrics.successRate}%</p>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Cpu className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                  <p className="text-purple-200 text-sm">Agent Utilization</p>
                  <p className="text-2xl font-bold text-white">{metrics.agentUtilization}%</p>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </FadeIn>

        {/* Workflow Templates */}
        <FadeIn delay={0.6}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Workflow Templates</h2>
              <button
                onClick={() => setIsCreatingWorkflow(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Create Workflow</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflowTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => createWorkflow(template.id)}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      {getStepIcon(template.type)}
                    </div>
                    <h3 className="font-semibold text-white">{template.name}</h3>
                  </div>
                  <p className="text-purple-200 text-sm mb-3">{template.description}</p>
                  <div className="flex items-center justify-between text-xs text-purple-300">
                    <span>{template.steps} steps</span>
                    <span>{template.estimatedDuration}</span>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </FadeIn>

        {/* Active Workflows */}
        <FadeIn delay={0.8}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Active Workflows</h2>
            
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getWorkflowStatusColor(workflow.status).replace('text-', 'bg-').replace('-400', '-500/20')}`}>
                        <Workflow className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{workflow.name}</h3>
                        <p className="text-purple-200 text-sm">
                          Step {workflow.currentStep} of {workflow.totalSteps}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getWorkflowStatusColor(workflow.status).replace('text-', 'bg-')}`}></div>
                      <span className={`text-sm ${getWorkflowStatusColor(workflow.status)}`}>
                        {workflow.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-purple-200 mb-1">
                      <span>Progress</span>
                      <span>{workflow.progress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${workflow.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      {workflow.status === 'idle' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startWorkflow(workflow.id);
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center space-x-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>Start</span>
                        </button>
                      )}
                      {workflow.status === 'running' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            pauseWorkflow(workflow.id);
                          }}
                          className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm flex items-center space-x-1"
                        >
                          <Pause className="w-3 h-3" />
                          <span>Pause</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="text-xs text-purple-300">
                      {workflow.startTime && (
                        <span>Started: {new Date(workflow.startTime).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </FadeIn>

        {/* Workflow Detail Modal */}
        <AnimatePresence>
          {selectedWorkflow && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedWorkflow(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">{selectedWorkflow.name}</h2>
                  <button
                    onClick={() => setSelectedWorkflow(null)}
                    className="text-purple-200 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Workflow Steps */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Workflow Steps</h3>
                    <div className="space-y-3">
                      {selectedWorkflow.steps.map((step, index) => (
                        <div
                          key={step.id}
                          className="flex items-center space-x-4 p-3 bg-white/5 rounded-lg border border-white/10"
                        >
                          <div className="flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              step.status === 'completed' ? 'bg-green-500/20' :
                              step.status === 'running' ? 'bg-blue-500/20' :
                              step.status === 'failed' ? 'bg-red-500/20' :
                              'bg-gray-500/20'
                            }`}>
                              {step.status === 'completed' ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : step.status === 'running' ? (
                                <Clock className="w-4 h-4 text-blue-400" />
                              ) : step.status === 'failed' ? (
                                <AlertCircle className="w-4 h-4 text-red-400" />
                              ) : (
                                <span className="text-gray-400 text-sm">{index + 1}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              {getStepIcon(step.type)}
                              <h4 className="font-medium text-white">{step.name}</h4>
                              <span className={`text-xs px-2 py-1 rounded ${
                                step.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                step.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                                step.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {step.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-purple-200 text-sm">{step.agent || 'System'}</p>
                            {step.duration && (
                              <p className="text-purple-300 text-xs">Duration: {step.duration}ms</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Workflow Results */}
                  {selectedWorkflow.results.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Results</h3>
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <pre className="text-purple-200 text-sm overflow-x-auto">
                          {JSON.stringify(selectedWorkflow.results, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real-time Updates */}
        <FadeIn delay={1.0}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Real-time Updates</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {realTimeUpdates.map((update) => (
                <div
                  key={update.id}
                  className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{update.message}</p>
                    <p className="text-purple-300 text-xs">
                      {new Date(update.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </FadeIn>
      </div>
    </AnimatedContainer>
  );
}
