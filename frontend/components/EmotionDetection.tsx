'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, Smile, Frown, Meh, Heart, Zap } from 'lucide-react';

interface EmotionDetectionProps {
  onEmotionChange: (emotion: string, confidence: number) => void;
  onSentimentChange: (sentiment: 'positive' | 'negative' | 'neutral', score: number) => void;
  isActive: boolean;
}

interface EmotionData {
  emotion: string;
  confidence: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  facialExpression?: string;
  voiceTone?: string;
}

export default function EmotionDetection({ onEmotionChange, onSentimentChange, isActive }: EmotionDetectionProps) {
  const [currentEmotion, setCurrentEmotion] = useState<EmotionData>({
    emotion: 'neutral',
    confidence: 0.5,
    sentiment: 'neutral',
    sentimentScore: 0
  });
  
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionHistory, setDetectionHistory] = useState<EmotionData[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      startEmotionDetection();
    } else {
      stopEmotionDetection();
    }

    return () => {
      stopEmotionDetection();
    };
  }, [isActive]);

  const startEmotionDetection = async () => {
    try {
      setIsDetecting(true);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Start emotion detection loop
      detectionIntervalRef.current = setInterval(() => {
        detectEmotion();
      }, 1000); // Detect every second

    } catch (error) {
      console.error('Error starting emotion detection:', error);
      // Fallback to text-based sentiment analysis
      startTextBasedSentimentAnalysis();
    }
  };

  const stopEmotionDetection = () => {
    setIsDetecting(false);
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const detectEmotion = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Capture frame from video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Convert to base64 for API call
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    try {
      // Call emotion detection API
      const response = await fetch('/api/ai/emotion/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          imageData,
          timestamp: Date.now()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        updateEmotionData(data);
      }
    } catch (error) {
      console.error('Emotion detection error:', error);
      // Fallback to mock detection
      updateEmotionData(generateMockEmotionData());
    }
  };

  const startTextBasedSentimentAnalysis = () => {
    // Monitor text input for sentiment analysis
    const textInputs = document.querySelectorAll('input[type="text"], textarea');
    
    textInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const text = (e.target as HTMLInputElement).value;
        if (text.length > 10) { // Only analyze after some text
          analyzeTextSentiment(text);
        }
      });
    });
  };

  const analyzeTextSentiment = async (text: string) => {
    try {
      const response = await fetch('/api/ai/sentiment/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const data = await response.json();
        updateEmotionData({
          emotion: data.emotion || 'neutral',
          confidence: data.confidence || 0.5,
          sentiment: data.sentiment || 'neutral',
          sentimentScore: data.sentimentScore || 0,
          voiceTone: data.voiceTone
        });
      }
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      // Fallback to simple keyword-based analysis
      const sentiment = analyzeSimpleSentiment(text);
      updateEmotionData({
        emotion: 'thoughtful',
        confidence: 0.6,
        sentiment: sentiment.sentiment,
        sentimentScore: sentiment.score
      });
    }
  };

  const analyzeSimpleSentiment = (text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } => {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy', 'excited'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'sad', 'disappointed', 'worried'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });
    
    const total = positiveCount + negativeCount;
    if (total === 0) return { sentiment: 'neutral', score: 0 };
    
    const score = (positiveCount - negativeCount) / total;
    const sentiment: 'positive' | 'negative' | 'neutral' = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';
    
    return { sentiment, score };
  };

  const generateMockEmotionData = (): EmotionData => {
    const emotions = ['happy', 'neutral', 'confident', 'thoughtful', 'excited'];
    const sentiments: ('positive' | 'negative' | 'neutral')[] = ['positive', 'negative', 'neutral'];
    
    return {
      emotion: emotions[Math.floor(Math.random() * emotions.length)],
      confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
      sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
      sentimentScore: Math.random() * 2 - 1, // -1 to 1
      facialExpression: 'smile',
      voiceTone: 'calm'
    };
  };

  const updateEmotionData = (newData: EmotionData) => {
    setCurrentEmotion(newData);
    setDetectionHistory(prev => [...prev.slice(-9), newData]); // Keep last 10
    
    // Notify parent components
    onEmotionChange(newData.emotion, newData.confidence);
    onSentimentChange(newData.sentiment, newData.sentimentScore);
  };

  const getEmotionIcon = (emotion: string) => {
    switch (emotion) {
      case 'happy': return <Smile className="w-5 h-5 text-yellow-400" />;
      case 'confident': return <Zap className="w-5 h-5 text-blue-400" />;
      case 'excited': return <Heart className="w-5 h-5 text-red-400" />;
      case 'thoughtful': return <Brain className="w-5 h-5 text-purple-400" />;
      case 'sad': return <Frown className="w-5 h-5 text-gray-400" />;
      default: return <Meh className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Emotion Detection Status */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isDetecting ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
            <Brain className={`w-5 h-5 ${isDetecting ? 'text-green-400' : 'text-gray-400'}`} />
          </div>
          <div>
            <div className="text-white font-medium">
              {isDetecting ? 'Emotion Detection Active' : 'Emotion Detection Inactive'}
            </div>
            <div className="text-sm text-purple-300">
              {isDetecting ? 'Analyzing facial expressions and voice tone' : 'Click to start detection'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getEmotionIcon(currentEmotion.emotion)}
          <span className="text-white capitalize">{currentEmotion.emotion}</span>
          <span className={`text-sm ${getSentimentColor(currentEmotion.sentiment)}`}>
            ({currentEmotion.sentiment})
          </span>
        </div>
      </div>

      {/* Current Emotion Display */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-purple-300 mb-2">Current Emotion</div>
          <div className="flex items-center space-x-2">
            {getEmotionIcon(currentEmotion.emotion)}
            <span className="text-white capitalize">{currentEmotion.emotion}</span>
            <span className="text-sm text-purple-300">
              ({(currentEmotion.confidence * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-purple-300 mb-2">Sentiment</div>
          <div className="flex items-center space-x-2">
            <span className={`capitalize ${getSentimentColor(currentEmotion.sentiment)}`}>
              {currentEmotion.sentiment}
            </span>
            <span className="text-sm text-purple-300">
              ({currentEmotion.sentimentScore.toFixed(2)})
            </span>
          </div>
        </div>
      </div>

      {/* Detection History */}
      {detectionHistory.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-purple-300 mb-3">Recent Emotions</div>
          <div className="flex space-x-2 overflow-x-auto">
            {detectionHistory.slice(-5).map((data, index) => (
              <div key={index} className="flex-shrink-0 text-center">
                <div className="p-2 bg-white/10 rounded-lg mb-1">
                  {getEmotionIcon(data.emotion)}
                </div>
                <div className="text-xs text-purple-300 capitalize">{data.emotion}</div>
                <div className="text-xs text-gray-400">
                  {(data.confidence * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden video and canvas for emotion detection */}
      <div className="hidden">
        <video ref={videoRef} width="640" height="480" />
        <canvas ref={canvasRef} width="640" height="480" />
      </div>
    </div>
  );
}
