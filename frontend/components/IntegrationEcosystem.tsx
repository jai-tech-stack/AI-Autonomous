'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Settings, 
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Edit,
  Play,
  Pause,
  BarChart3,
  Users,
  Mail,
  Calendar,
  FileText,
  TrendingUp,
  MessageSquare,
  Share2,
  Database,
  Cloud,
  Shield,
  Key,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  Server
} from 'lucide-react';
import { AnimatedContainer, AnimatedCard, FadeIn } from './ui/Animated';

interface IntegrationEcosystemProps {
  organizationId: string;
  onIntegrationUpdate?: (integration: Integration) => void;
}

interface Integration {
  id: string;
  name: string;
  provider: string;
  type: 'crm' | 'marketing' | 'social' | 'email' | 'analytics' | 'communication' | 'productivity' | 'storage';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  isActive: boolean;
  lastSync?: Date;
  syncStatus: 'success' | 'error' | 'pending' | 'never';
  credentials?: any;
  metadata?: any;
  capabilities: string[];
  usage: {
    requests: number;
    limit: number;
    resetDate: Date;
  };
}

interface IntegrationTemplate {
  id: string;
  name: string;
  provider: string;
  type: string;
  description: string;
  icon: string;
  capabilities: string[];
  setupSteps: string[];
  pricing: {
    free: boolean;
    plans: Array<{
      name: string;
      price: number;
      features: string[];
    }>;
  };
  documentation: string;
  status: 'available' | 'coming_soon' | 'beta';
}

interface SyncActivity {
  id: string;
  integrationId: string;
  type: 'import' | 'export' | 'sync';
  status: 'running' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  endTime?: Date;
  recordsProcessed: number;
  recordsTotal: number;
  error?: string;
}

export default function IntegrationEcosystem({ 
  organizationId, 
  onIntegrationUpdate 
}: IntegrationEcosystemProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [templates, setTemplates] = useState<IntegrationTemplate[]>([]);
  const [syncActivities, setSyncActivities] = useState<SyncActivity[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isCreatingIntegration, setIsCreatingIntegration] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [metrics, setMetrics] = useState({
    totalIntegrations: 0,
    activeIntegrations: 0,
    syncSuccessRate: 0,
    totalDataSynced: 0,
    lastSyncTime: null as Date | null
  });
  
  const syncIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadIntegrations();
    loadTemplates();
    loadSyncActivities();
    startSyncMonitoring();
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/integrations/${organizationId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data);
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/integrations/templates', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadSyncActivities = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/integrations/sync-activities/${organizationId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSyncActivities(data);
      }
    } catch (error) {
      console.error('Error loading sync activities:', error);
    }
  };

  const startSyncMonitoring = () => {
    syncIntervalRef.current = setInterval(async () => {
      await loadSyncActivities();
      await loadIntegrations();
    }, 5000);
  };

  const connectIntegration = async (templateId: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/integrations/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          organizationId,
          templateId
        })
      });

      if (response.ok) {
        const newIntegration = await response.json();
        setIntegrations(prev => [...prev, newIntegration]);
        setIsCreatingIntegration(false);
      }
    } catch (error) {
      console.error('Error connecting integration:', error);
    }
  };

  const disconnectIntegration = async (integrationId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/integrations/${integrationId}/disconnect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        setIntegrations(prev => prev.filter(i => i.id !== integrationId));
        setSelectedIntegration(null);
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error);
    }
  };

  const syncIntegration = async (integrationId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/integrations/${integrationId}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        // Refresh activities
        await loadSyncActivities();
      }
    } catch (error) {
      console.error('Error syncing integration:', error);
    }
  };

  const getIntegrationIcon = (type: string) => {
    const icons = {
      crm: <Users className="w-6 h-6" />,
      marketing: <TrendingUp className="w-6 h-6" />,
      social: <Share2 className="w-6 h-6" />,
      email: <Mail className="w-6 h-6" />,
      analytics: <BarChart3 className="w-6 h-6" />,
      communication: <MessageSquare className="w-6 h-6" />,
      productivity: <FileText className="w-6 h-6" />,
      storage: <Database className="w-6 h-6" />
    };
    return icons[type as keyof typeof icons] || <Link className="w-6 h-6" />;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      connected: 'text-green-400',
      disconnected: 'text-gray-400',
      error: 'text-red-400',
      pending: 'text-yellow-400'
    };
    return colors[status as keyof typeof colors] || 'text-gray-400';
  };

  const getStatusBgColor = (status: string) => {
    const colors = {
      connected: 'bg-green-500/20',
      disconnected: 'bg-gray-500/20',
      error: 'bg-red-500/20',
      pending: 'bg-yellow-500/20'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500/20';
  };

  const getSyncStatusColor = (status: string) => {
    const colors = {
      success: 'text-green-400',
      error: 'text-red-400',
      pending: 'text-yellow-400',
      never: 'text-gray-400'
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
                <Link className="w-8 h-8 text-purple-300" />
              </div>
              <h1 className="text-4xl font-bold text-white">Integration Ecosystem</h1>
            </div>
            <p className="text-purple-200 text-lg">
              Connect your favorite tools and automate your business workflows
            </p>
          </div>
        </FadeIn>

        {/* Metrics Dashboard */}
        <FadeIn delay={0.4}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatedCard className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Link className="w-6 h-6 text-blue-300" />
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Total Integrations</p>
                  <p className="text-2xl font-bold text-white">{metrics.totalIntegrations}</p>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-300" />
                </div>
                <div>
                  <p className="text-green-200 text-sm">Active</p>
                  <p className="text-2xl font-bold text-white">{metrics.activeIntegrations}</p>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard className="bg-gradient-to-br from-orange-600/20 to-red-600/20 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Activity className="w-6 h-6 text-orange-300" />
                </div>
                <div>
                  <p className="text-orange-200 text-sm">Sync Success Rate</p>
                  <p className="text-2xl font-bold text-white">{metrics.syncSuccessRate}%</p>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Database className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                  <p className="text-purple-200 text-sm">Data Synced</p>
                  <p className="text-2xl font-bold text-white">{metrics.totalDataSynced.toLocaleString()}</p>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </FadeIn>

        {/* Integration Templates */}
        <FadeIn delay={0.6}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Available Integrations</h2>
              <button
                onClick={() => setIsCreatingIntegration(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Integration</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => connectIntegration(template.id)}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      {getIntegrationIcon(template.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{template.name}</h3>
                      <p className="text-purple-200 text-sm">{template.provider}</p>
                    </div>
                  </div>
                  <p className="text-purple-200 text-sm mb-3">{template.description}</p>
                  <div className="flex items-center justify-between text-xs text-purple-300">
                    <span className={`px-2 py-1 rounded ${
                      template.status === 'available' ? 'bg-green-500/20 text-green-400' :
                      template.status === 'beta' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {template.status.toUpperCase()}
                    </span>
                    <span>{template.capabilities.length} capabilities</span>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </FadeIn>

        {/* Connected Integrations */}
        <FadeIn delay={0.8}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Connected Integrations</h2>
            
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        {getIntegrationIcon(integration.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{integration.name}</h3>
                        <p className="text-purple-200 text-sm">{integration.provider}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`px-3 py-1 rounded-full text-sm ${getStatusBgColor(integration.status)} ${getStatusColor(integration.status)}`}>
                        {integration.status.toUpperCase()}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedIntegration(integration)}
                          className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => syncIntegration(integration.id)}
                          className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => disconnectIntegration(integration.id)}
                          className="p-2 text-red-200 hover:text-red-400 hover:bg-red-500/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-purple-200">Last Sync</p>
                      <p className="text-white">
                        {integration.lastSync 
                          ? new Date(integration.lastSync).toLocaleString()
                          : 'Never'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-200">Sync Status</p>
                      <p className={`${getSyncStatusColor(integration.syncStatus)}`}>
                        {integration.syncStatus.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-200">Usage</p>
                      <p className="text-white">
                        {integration.usage.requests.toLocaleString()} / {integration.usage.limit.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      {integration.capabilities.slice(0, 3).map((capability) => (
                        <span
                          key={capability}
                          className="px-2 py-1 bg-purple-500/20 text-purple-200 text-xs rounded"
                        >
                          {capability}
                        </span>
                      ))}
                      {integration.capabilities.length > 3 && (
                        <span className="px-2 py-1 bg-gray-500/20 text-gray-200 text-xs rounded">
                          +{integration.capabilities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </FadeIn>

        {/* Sync Activities */}
        <FadeIn delay={1.0}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Recent Sync Activities</h2>
            
            <div className="space-y-3">
              {syncActivities.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center space-x-4 p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className={`w-3 h-3 rounded-full ${
                    activity.status === 'completed' ? 'bg-green-400' :
                    activity.status === 'running' ? 'bg-blue-400 animate-pulse' :
                    'bg-red-400'
                  }`}></div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-white font-medium">{activity.type.toUpperCase()}</span>
                      <span className="text-purple-200 text-sm">
                        {integrations.find(i => i.id === activity.integrationId)?.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-purple-200">
                      <span>
                        {activity.recordsProcessed.toLocaleString()} / {activity.recordsTotal.toLocaleString()} records
                      </span>
                      <span>{activity.progress}% complete</span>
                      <span>
                        Started: {new Date(activity.startTime).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {activity.status === 'running' && (
                      <div className="mt-2 w-full bg-white/10 rounded-full h-1">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${activity.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </FadeIn>

        {/* Integration Detail Modal */}
        <AnimatePresence>
          {selectedIntegration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedIntegration(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      {getIntegrationIcon(selectedIntegration.type)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedIntegration.name}</h2>
                      <p className="text-purple-200">{selectedIntegration.provider}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedIntegration(null)}
                    className="text-purple-200 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Status and Actions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-purple-200 text-sm">Status</p>
                      <p className={`text-lg ${getStatusColor(selectedIntegration.status)}`}>
                        {selectedIntegration.status.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-200 text-sm">Last Sync</p>
                      <p className="text-white">
                        {selectedIntegration.lastSync 
                          ? new Date(selectedIntegration.lastSync).toLocaleString()
                          : 'Never'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Capabilities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedIntegration.capabilities.map((capability) => (
                        <span
                          key={capability}
                          className="px-3 py-1 bg-purple-500/20 text-purple-200 text-sm rounded"
                        >
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Usage Statistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-purple-200 text-sm">API Requests</p>
                        <p className="text-white text-lg">
                          {selectedIntegration.usage.requests.toLocaleString()} / {selectedIntegration.usage.limit.toLocaleString()}
                        </p>
                        <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                          <div 
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                            style={{ width: `${(selectedIntegration.usage.requests / selectedIntegration.usage.limit) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-purple-200 text-sm">Reset Date</p>
                        <p className="text-white">
                          {new Date(selectedIntegration.usage.resetDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => syncIntegration(selectedIntegration.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Sync Now</span>
                    </button>
                    <button
                      onClick={() => setIsConfiguring(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Configure</span>
                    </button>
                    <button
                      onClick={() => disconnectIntegration(selectedIntegration.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedContainer>
  );
}
