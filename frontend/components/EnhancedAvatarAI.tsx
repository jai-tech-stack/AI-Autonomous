'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  Zap, 
  Brain, 
  MessageCircle,
  Camera,
  Eye,
  Smile,
  Frown,
  Meh,
  Heart,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatedContainer, AnimatedCard, FadeIn } from './ui/Animated';

interface EnhancedAvatarAIProps {
  organizationId: string;
  aiConfig?: {
    ceoName: string;
    personality: any;
    goals: any;
    industry?: string;
  };
  onMessage?: (message: string) => void;
  onVoiceResponse?: (audioBlob: Blob) => void;
}

interface EmotionState {
  type: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'fearful' | 'disgusted';
  confidence: number;
  timestamp: number;
}

interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  volume: number;
  pitch: number;
  speed: number;
}

interface AvatarState {
  isActive: boolean;
  currentEmotion: EmotionState;
  voiceState: VoiceState;
  avatarUrl?: string;
  speakingVideoUrl?: string;
  isGenerating: boolean;
}

export default function EnhancedAvatarAI({ 
  organizationId, 
  aiConfig, 
  onMessage, 
  onVoiceResponse 
}: EnhancedAvatarAIProps) {
  const [avatarState, setAvatarState] = useState<AvatarState>({
    isActive: false,
    currentEmotion: { type: 'neutral', confidence: 0.8, timestamp: Date.now() },
    voiceState: {
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      volume: 0.7,
      pitch: 1.0,
      speed: 1.0
    },
    isGenerating: false
  });
  
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [emotionDetectionActive, setEmotionDetectionActive] = useState(false);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<'positive' | 'negative' | 'neutral'>('neutral');
  const [conversationHistory, setConversationHistory] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: number;
    emotion?: EmotionState;
  }>>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize enhanced avatar system
  useEffect(() => {
    initializeEnhancedAvatar();
    initializeVoiceRecognition();
    initializeEmotionDetection();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeEnhancedAvatar = async () => {
    try {
      // Generate or fetch avatar
      const response = await fetch('http://localhost:5000/api/avatar/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          organizationId,
          personality: aiConfig?.personality,
          industry: aiConfig?.industry
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAvatarState(prev => ({
          ...prev,
          avatarUrl: data.avatarUrl,
          isActive: true
        }));
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error initializing avatar:', error);
      toast.error('Failed to initialize avatar');
    }
  };

  const initializeVoiceRecognition = () => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setAvatarState(prev => ({
          ...prev,
          voiceState: { ...prev.voiceState, isListening: true }
        }));
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          handleVoiceInput(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setAvatarState(prev => ({
          ...prev,
          voiceState: { ...prev.voiceState, isListening: false }
        }));
      };

      recognitionRef.current = recognition;
    }
  };

  const initializeEmotionDetection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Camera access denied');
    }
  };

  const detectEmotion = async (imageData: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/ai/emotion/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ imageData })
      });

      if (response.ok) {
        const data = await response.json();
        setAvatarState(prev => ({
          ...prev,
          currentEmotion: {
            type: data.emotion,
            confidence: data.confidence,
            timestamp: Date.now()
          }
        }));
      }
    } catch (error) {
      console.error('Error detecting emotion:', error);
    }
  };

  const analyzeSentiment = async (text: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/ai/sentiment/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text })
      });

      if (response.ok) {
        const data = await response.json();
        setSentimentAnalysis(data.sentiment);
        
        // Update avatar emotion based on sentiment
        const emotionMap = {
          'positive': 'happy',
          'negative': 'sad',
          'neutral': 'neutral'
        } as const;
        
        setAvatarState(prev => ({
          ...prev,
          currentEmotion: {
            type: emotionMap[data.sentiment],
            confidence: data.confidence,
            timestamp: Date.now()
          }
        }));
      }
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    setMessage(transcript);
    await analyzeSentiment(transcript);
    
    // Add to conversation history
    const newMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: transcript,
      timestamp: Date.now(),
      emotion: avatarState.currentEmotion
    };
    
    setConversationHistory(prev => [...prev, newMessage]);
    
    // Process with AI
    await processWithAI(transcript);
  };

  const processWithAI = async (input: string) => {
    setAvatarState(prev => ({
      ...prev,
      voiceState: { ...prev.voiceState, isProcessing: true }
    }));

    try {
      // Simulate AI processing with enhanced response
      const response = await fetch('http://localhost:5000/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          input,
          context: {
            personality: aiConfig?.personality,
            goals: aiConfig?.goals,
            industry: aiConfig?.industry,
            currentEmotion: avatarState.currentEmotion,
            conversationHistory: conversationHistory.slice(-5) // Last 5 messages
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.response || "I understand. How can I help you further?";
        
        // Add AI response to conversation
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai' as const,
          content: aiResponse,
          timestamp: Date.now(),
          emotion: avatarState.currentEmotion
        };
        
        setConversationHistory(prev => [...prev, aiMessage]);
        
        // Generate speaking video
        await generateSpeakingVideo(aiResponse);
        
        // Speak the response
        speakText(aiResponse);
      }
    } catch (error) {
      console.error('Error processing with AI:', error);
      toast.error('Failed to process request');
    } finally {
      setAvatarState(prev => ({
        ...prev,
        voiceState: { ...prev.voiceState, isProcessing: false }
      }));
    }
  };

  const generateSpeakingVideo = async (text: string) => {
    try {
      setAvatarState(prev => ({ ...prev, isGenerating: true }));
      
      const response = await fetch('http://localhost:5000/api/avatar/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          text,
          emotion: avatarState.currentEmotion.type,
          voiceSettings: avatarState.voiceState
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAvatarState(prev => ({
          ...prev,
          speakingVideoUrl: data.videoUrl,
          isGenerating: false
        }));
      }
    } catch (error) {
      console.error('Error generating speaking video:', error);
      setAvatarState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const speakText = (text: string) => {
    if (synthesisRef.current) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = avatarState.voiceState.speed;
    utterance.pitch = avatarState.voiceState.pitch;
    utterance.volume = avatarState.voiceState.volume;

    utterance.onstart = () => {
      setAvatarState(prev => ({
        ...prev,
        voiceState: { ...prev.voiceState, isSpeaking: true }
      }));
    };

    utterance.onend = () => {
      setAvatarState(prev => ({
        ...prev,
        voiceState: { ...prev.voiceState, isSpeaking: false }
      }));
    };

    synthesisRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    await analyzeSentiment(message);
    await processWithAI(message);
    setMessage('');
  };

  const getEmotionIcon = (emotion: string) => {
    const emotionIcons = {
      happy: <Smile className="w-6 h-6 text-yellow-400" />,
      sad: <Frown className="w-6 h-6 text-blue-400" />,
      angry: <Frown className="w-6 h-6 text-red-400" />,
      surprised: <Eye className="w-6 h-6 text-purple-400" />,
      fearful: <Eye className="w-6 h-6 text-orange-400" />,
      disgusted: <Meh className="w-6 h-6 text-green-400" />,
      neutral: <Meh className="w-6 h-6 text-gray-400" />
    };
    return emotionIcons[emotion as keyof typeof emotionIcons] || emotionIcons.neutral;
  };

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (synthesisRef.current) {
      speechSynthesis.cancel();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <AnimatedContainer>
      <div className="flex flex-col items-center space-y-8 p-6">
        {/* Enhanced Avatar Display */}
        <FadeIn delay={0.2}>
          <div className="relative">
            <div className="w-80 h-80 rounded-full overflow-hidden border-4 border-purple-500/30 shadow-2xl bg-gradient-to-br from-purple-600 to-indigo-600">
              {avatarState.speakingVideoUrl ? (
                <video
                  src={avatarState.speakingVideoUrl}
                  autoPlay
                  loop
                  muted
                  className="w-full h-full object-cover"
                />
              ) : avatarState.avatarUrl ? (
                <img
                  src={avatarState.avatarUrl}
                  alt="AI Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-white text-8xl">🤖</div>
                </div>
              )}
            </div>
            
            {/* Emotion Indicator */}
            <div className="absolute -top-2 -right-2 bg-white/20 backdrop-blur-lg rounded-full p-3">
              {getEmotionIcon(avatarState.currentEmotion.type)}
            </div>
            
            {/* Status Indicators */}
            <div className="absolute -bottom-2 -left-2 flex space-x-2">
              {avatarState.voiceState.isListening && (
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <Mic className="w-4 h-4 text-white" />
                </div>
              )}
              {avatarState.voiceState.isSpeaking && (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <Volume2 className="w-4 h-4 text-white" />
                </div>
              )}
              {avatarState.voiceState.isProcessing && (
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center animate-spin">
                  <Brain className="w-4 h-4 text-white" />
                </div>
              )}
              {avatarState.isGenerating && (
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center animate-pulse">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        {/* AI Info */}
        <FadeIn delay={0.4}>
          <div className="text-center">
            <h3 className="text-3xl font-bold text-white mb-2">
              {aiConfig?.ceoName || 'Enhanced AI CEO'}
            </h3>
            <p className="text-purple-200 mb-4">
              {aiConfig?.industry ? `${aiConfig.industry} Expert` : 'Your Advanced AI Business Partner'}
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-300' : 'text-red-300'}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-300">
                <span>Emotion: {avatarState.currentEmotion.type}</span>
                <span>({Math.round(avatarState.currentEmotion.confidence * 100)}%)</span>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Enhanced Controls */}
        <FadeIn delay={0.6}>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={avatarState.voiceState.isListening ? stopListening : startListening}
              disabled={avatarState.voiceState.isProcessing}
              className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-200 ${
                avatarState.voiceState.isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              } ${avatarState.voiceState.isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {avatarState.voiceState.isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
              <span>{avatarState.voiceState.isListening ? 'Stop Listening' : 'Start Voice Chat'}</span>
            </button>

            <button
              onClick={() => speechSynthesis.cancel()}
              disabled={!avatarState.voiceState.isSpeaking}
              className="flex items-center space-x-2 px-6 py-3 rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <VolumeX className="w-5 h-5" />
              <span>Stop Speaking</span>
            </button>

            <button
              onClick={() => setEmotionDetectionActive(!emotionDetectionActive)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-200 ${
                emotionDetectionActive
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              <Camera className="w-5 h-5" />
              <span>{emotionDetectionActive ? 'Stop Detection' : 'Start Emotion Detection'}</span>
            </button>
          </div>
        </FadeIn>

        {/* Text Input */}
        <FadeIn delay={0.8}>
          <form onSubmit={handleTextSubmit} className="w-full max-w-2xl">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message or use voice..."
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={avatarState.voiceState.isProcessing}
              />
              <button
                type="submit"
                disabled={!message.trim() || avatarState.voiceState.isProcessing}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Send</span>
              </button>
            </div>
          </form>
        </FadeIn>

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <FadeIn delay={1.0}>
            <AnimatedCard className="w-full max-w-4xl bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">Conversation History</h3>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {conversationHistory.slice(-10).map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start space-x-3 ${
                      msg.type === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.type === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/20 text-purple-200'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                        {msg.emotion && (
                          <div className="flex items-center space-x-1">
                            {getEmotionIcon(msg.emotion.type)}
                            <span className="text-xs">
                              {Math.round(msg.emotion.confidence * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedCard>
          </FadeIn>
        )}

        {/* Hidden video element for emotion detection */}
        <video
          ref={videoRef}
          autoPlay
          muted
          className="hidden"
          onLoadedMetadata={() => {
            if (emotionDetectionActive && videoRef.current) {
              // Start emotion detection loop
              const detectLoop = () => {
                if (videoRef.current && canvasRef.current) {
                  const canvas = canvasRef.current;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    canvas.width = videoRef.current.videoWidth;
                    canvas.height = videoRef.current.videoHeight;
                    ctx.drawImage(videoRef.current, 0, 0);
                    const imageData = canvas.toDataURL('image/jpeg');
                    detectEmotion(imageData);
                  }
                }
                if (emotionDetectionActive) {
                  setTimeout(detectLoop, 2000); // Detect every 2 seconds
                }
              };
              detectLoop();
            }
          }}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </AnimatedContainer>
  );
}
