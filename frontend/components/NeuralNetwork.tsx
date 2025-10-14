'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, Database, Zap, TrendingUp, Memory, Cpu, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

interface NeuralNetworkProps {
  organizationId: string;
  onLearningUpdate?: (insights: any) => void;
}

interface LearningData {
  id: string;
  type: 'conversation' | 'decision' | 'outcome' | 'pattern';
  content: any;
  timestamp: string;
  confidence: number;
  context: string;
}

interface NeuralInsight {
  id: string;
  type: 'pattern' | 'prediction' | 'recommendation' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timestamp: string;
  data: any;
}

interface NetworkState {
  isLearning: boolean;
  memorySize: number;
  patternsDetected: number;
  predictionsMade: number;
  accuracy: number;
  lastLearning: string;
}

export default function NeuralNetwork({ organizationId, onLearningUpdate }: NeuralNetworkProps) {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isLearning: false,
    memorySize: 0,
    patternsDetected: 0,
    predictionsMade: 0,
    accuracy: 0.75,
    lastLearning: ''
  });
  
  const [learningData, setLearningData] = useState<LearningData[]>([]);
  const [insights, setInsights] = useState<NeuralInsight[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<NeuralInsight | null>(null);
  
  const learningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeNeuralNetwork();
    startLearningProcess();
    
    return () => {
      if (learningIntervalRef.current) {
        clearInterval(learningIntervalRef.current);
      }
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [organizationId]);

  const initializeNeuralNetwork = async () => {
    try {
      const response = await fetch('/api/neural-network/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ organizationId }),
      });

      if (response.ok) {
        const data = await response.json();
        setNetworkState(prev => ({
          ...prev,
          memorySize: data.memorySize || 0,
          patternsDetected: data.patternsDetected || 0,
          predictionsMade: data.predictionsMade || 0,
          accuracy: data.accuracy || 0.75
        }));
        toast.success('Neural network initialized');
      }
    } catch (error) {
      console.error('Neural network initialization error:', error);
      toast.error('Failed to initialize neural network');
    }
  };

  const startLearningProcess = () => {
    setNetworkState(prev => ({ ...prev, isLearning: true }));
    
    // Simulate continuous learning
    learningIntervalRef.current = setInterval(async () => {
      await processLearningData();
    }, 30000); // Process every 30 seconds
  };

  const processLearningData = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Fetch new learning data
      const response = await fetch(`/api/neural-network/learn/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Process the learning data
        const newInsights = await analyzePatterns(data.learningData || []);
        setInsights(prev => [...newInsights, ...prev].slice(0, 20)); // Keep last 20 insights
        
        // Update network state
        setNetworkState(prev => ({
          ...prev,
          memorySize: data.memorySize || prev.memorySize,
          patternsDetected: prev.patternsDetected + newInsights.length,
          predictionsMade: prev.predictionsMade + (data.predictions || 0),
          accuracy: data.accuracy || prev.accuracy,
          lastLearning: new Date().toISOString()
        }));

        // Notify parent component
        onLearningUpdate?.(newInsights);
        
        if (newInsights.length > 0) {
          toast.success(`Neural network discovered ${newInsights.length} new insights`);
        }
      }
    } catch (error) {
      console.error('Learning process error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzePatterns = async (data: LearningData[]): Promise<NeuralInsight[]> => {
    // Simulate pattern analysis
    const insights: NeuralInsight[] = [];
    
    // Analyze conversation patterns
    const conversationData = data.filter(d => d.type === 'conversation');
    if (conversationData.length > 5) {
      insights.push({
        id: `insight_${Date.now()}_1`,
        type: 'pattern',
        title: 'Communication Pattern Detected',
        description: `Identified recurring themes in ${conversationData.length} conversations`,
        confidence: 0.85,
        impact: 'medium',
        timestamp: new Date().toISOString(),
        data: { patternType: 'communication', count: conversationData.length }
      });
    }

    // Analyze decision patterns
    const decisionData = data.filter(d => d.type === 'decision');
    if (decisionData.length > 3) {
      insights.push({
        id: `insight_${Date.now()}_2`,
        type: 'recommendation',
        title: 'Decision Optimization Opportunity',
        description: 'Found patterns that could improve decision-making efficiency',
        confidence: 0.92,
        impact: 'high',
        timestamp: new Date().toISOString(),
        data: { patternType: 'decision', count: decisionData.length }
      });
    }

    // Analyze outcomes
    const outcomeData = data.filter(d => d.type === 'outcome');
    if (outcomeData.length > 2) {
      const successRate = outcomeData.filter(d => d.content.success).length / outcomeData.length;
      insights.push({
        id: `insight_${Date.now()}_3`,
        type: 'prediction',
        title: 'Success Rate Analysis',
        description: `Current success rate: ${(successRate * 100).toFixed(1)}%`,
        confidence: 0.78,
        impact: successRate > 0.8 ? 'high' : 'medium',
        timestamp: new Date().toISOString(),
        data: { successRate, count: outcomeData.length }
      });
    }

    return insights;
  };

  const generatePrediction = async () => {
    try {
      const response = await fetch('/api/neural-network/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ organizationId }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Prediction generated successfully');
        
        // Add prediction as insight
        const predictionInsight: NeuralInsight = {
          id: `prediction_${Date.now()}`,
          type: 'prediction',
          title: 'AI Prediction',
          description: data.prediction || 'Generated prediction based on current data patterns',
          confidence: data.confidence || 0.8,
          impact: 'high',
          timestamp: new Date().toISOString(),
          data: data
        };
        
        setInsights(prev => [predictionInsight, ...prev]);
      }
    } catch (error) {
      console.error('Prediction generation error:', error);
      toast.error('Failed to generate prediction');
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-400 bg-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern': return <TrendingUp className="w-4 h-4" />;
      case 'prediction': return <Zap className="w-4 h-4" />;
      case 'recommendation': return <Brain className="w-4 h-4" />;
      case 'anomaly': return <Activity className="w-4 h-4" />;
      default: return <Cpu className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Network Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Memory className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-purple-300">Memory</span>
          </div>
          <div className="text-2xl font-bold text-white">{networkState.memorySize.toLocaleString()}</div>
          <div className="text-xs text-gray-400">Data Points</div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-purple-300">Patterns</span>
          </div>
          <div className="text-2xl font-bold text-white">{networkState.patternsDetected}</div>
          <div className="text-xs text-gray-400">Detected</div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span className="text-sm text-purple-300">Predictions</span>
          </div>
          <div className="text-2xl font-bold text-white">{networkState.predictionsMade}</div>
          <div className="text-xs text-gray-400">Generated</div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Brain className="w-5 h-5 text-green-400" />
            <span className="text-sm text-purple-300">Accuracy</span>
          </div>
          <div className="text-2xl font-bold text-white">{(networkState.accuracy * 100).toFixed(1)}%</div>
          <div className="text-xs text-gray-400">Current</div>
        </div>
      </div>

      {/* Learning Status */}
      <div className="bg-white/5 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${networkState.isLearning ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
              <Cpu className={`w-5 h-5 ${networkState.isLearning ? 'text-green-400' : 'text-gray-400'}`} />
            </div>
            <div>
              <div className="text-white font-medium">
                {networkState.isLearning ? 'Neural Network Learning' : 'Neural Network Idle'}
              </div>
              <div className="text-sm text-purple-300">
                {isProcessing ? 'Processing data...' : 'Ready to learn'}
              </div>
            </div>
          </div>
          
          <button
            onClick={generatePrediction}
            disabled={isProcessing}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <Zap className="w-4 h-4" />
            <span>Generate Prediction</span>
          </button>
        </div>
        
        {networkState.lastLearning && (
          <div className="text-sm text-gray-400">
            Last learning: {new Date(networkState.lastLearning).toLocaleString()}
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">AI Insights</h3>
        
        {insights.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No insights yet. The neural network is learning...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.slice(0, 5).map((insight) => (
              <div
                key={insight.id}
                className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => setSelectedInsight(insight)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-white font-medium">{insight.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${getImpactColor(insight.impact)}`}>
                          {insight.impact}
                        </span>
                      </div>
                      <p className="text-sm text-purple-200 mb-2">{insight.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <span>Confidence: {(insight.confidence * 100).toFixed(0)}%</span>
                        <span>{new Date(insight.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Insight Detail Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">{selectedInsight.title}</h3>
              <button
                onClick={() => setSelectedInsight(null)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {getInsightIcon(selectedInsight.type)}
                <span className="text-purple-300 capitalize">{selectedInsight.type}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${getImpactColor(selectedInsight.impact)}`}>
                  {selectedInsight.impact} impact
                </span>
              </div>
              
              <p className="text-white">{selectedInsight.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-purple-300 mb-1">Confidence</div>
                  <div className="text-white">{(selectedInsight.confidence * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-purple-300 mb-1">Generated</div>
                  <div className="text-white">{new Date(selectedInsight.timestamp).toLocaleString()}</div>
                </div>
              </div>
              
              {selectedInsight.data && (
                <div>
                  <div className="text-purple-300 mb-2">Data</div>
                  <pre className="bg-black/30 rounded p-3 text-sm text-white overflow-x-auto">
                    {JSON.stringify(selectedInsight.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
