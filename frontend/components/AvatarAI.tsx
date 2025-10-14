'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings, Zap, Brain, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import EmotionDetection from './EmotionDetection';

interface AvatarAIProps {
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

interface AvatarState {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  currentEmotion: 'neutral' | 'happy' | 'confident' | 'thoughtful' | 'excited';
  avatarUrl?: string;
}

export default function AvatarAI({ organizationId, aiConfig, onMessage, onVoiceResponse }: AvatarAIProps) {
  const [avatarState, setAvatarState] = useState<AvatarState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    currentEmotion: 'neutral'
  });
  
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [avatarVideo, setAvatarVideo] = useState<string | null>(null);
  const [emotionDetectionActive, setEmotionDetectionActive] = useState(false);
  const [currentSentiment, setCurrentSentiment] = useState<'positive' | 'negative' | 'neutral'>('neutral');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize avatar and voice recognition
  useEffect(() => {
    initializeAvatar();
    initializeVoiceRecognition();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  const initializeAvatar = async () => {
    try {
      // Generate avatar using D-ID API or similar service
      const response = await fetch('http://localhost:5000/api/avatar/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          organizationId,
          ceoName: aiConfig?.ceoName || 'AI CEO',
          personality: aiConfig?.personality,
          industry: aiConfig?.industry
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAvatarVideo(data.avatarUrl);
        setIsConnected(true);
        toast.success('Avatar initialized successfully!');
      } else {
        // Fallback to static avatar or demo
        setAvatarVideo('/api/placeholder-avatar');
        setIsConnected(true);
        toast('Using demo avatar - connect D-ID for full experience');
      }
    } catch (error) {
      console.error('Avatar initialization error:', error);
      toast.error('Failed to initialize avatar');
    }
  };

  const initializeVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setAvatarState(prev => ({ ...prev, isListening: true, currentEmotion: 'thoughtful' }));
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setMessage(transcript);
        
        if (event.results[0].isFinal) {
          handleVoiceInput(transcript);
        }
      };

      recognitionRef.current.onend = () => {
        setAvatarState(prev => ({ ...prev, isListening: false, currentEmotion: 'neutral' }));
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setAvatarState(prev => ({ ...prev, isListening: false, currentEmotion: 'neutral' }));
        toast.error('Speech recognition failed');
      };
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !avatarState.isListening) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && avatarState.isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleVoiceInput = async (transcript: string) => {
    if (!transcript.trim()) return;

    setAvatarState(prev => ({ ...prev, isProcessing: true, currentEmotion: 'thoughtful' }));
    
    try {
      // Send message to AI CEO with emotion context
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          organizationId,
          content: transcript,
          isVoice: true,
          emotion: avatarState.currentEmotion,
          sentiment: currentSentiment
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.assistantMessage.content;
        
        // Generate avatar video response using D-ID with emotion
        await generateAvatarResponse(aiResponse);
        
        // Speak the response with appropriate tone
        speakResponse(aiResponse);
        
        onMessage?.(aiResponse);
      }
    } catch (error) {
      console.error('Voice input error:', error);
      toast.error('Failed to process voice input');
    } finally {
      setAvatarState(prev => ({ ...prev, isProcessing: false, currentEmotion: 'neutral' }));
    }
  };

  const generateAvatarResponse = async (text: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/avatar/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          organizationId,
          text,
          emotion: avatarState.currentEmotion
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAvatarVideo(data.videoUrl);
        setAvatarState(prev => ({ ...prev, isSpeaking: true, currentEmotion: 'confident' }));
      }
    } catch (error) {
      console.error('Avatar response generation error:', error);
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Adjust voice parameters based on emotion and sentiment
      switch (avatarState.currentEmotion) {
        case 'excited':
          utterance.rate = 1.1;
          utterance.pitch = 1.2;
          utterance.volume = 0.9;
          break;
        case 'confident':
          utterance.rate = 0.95;
          utterance.pitch = 1.1;
          utterance.volume = 0.85;
          break;
        case 'thoughtful':
          utterance.rate = 0.8;
          utterance.pitch = 0.9;
          utterance.volume = 0.75;
          break;
        case 'happy':
          utterance.rate = 1.0;
          utterance.pitch = 1.1;
          utterance.volume = 0.8;
          break;
        default:
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 0.8;
      }

      utterance.onstart = () => {
        setAvatarState(prev => ({ ...prev, isSpeaking: true }));
      };

      utterance.onend = () => {
        setAvatarState(prev => ({ ...prev, isSpeaking: false, currentEmotion: 'neutral' }));
      };

      synthesisRef.current = utterance;
      speechSynthesis.speak(utterance);
    }
  };

  const handleEmotionChange = (emotion: string, confidence: number) => {
    setAvatarState(prev => ({ ...prev, currentEmotion: emotion as any }));
  };

  const handleSentimentChange = (sentiment: 'positive' | 'negative' | 'neutral', score: number) => {
    setCurrentSentiment(sentiment);
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    await handleVoiceInput(message);
    setMessage('');
  };

  const getEmotionClass = (emotion: string) => {
    const emotionClasses = {
      neutral: 'grayscale-0',
      happy: 'hue-rotate-12 saturate-150',
      confident: 'hue-rotate-45 saturate-125',
      thoughtful: 'hue-rotate-180 saturate-75',
      excited: 'hue-rotate-60 saturate-200'
    };
    return emotionClasses[emotion as keyof typeof emotionClasses] || 'grayscale-0';
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      {/* Avatar Display */}
      <div className="relative">
        <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-purple-500/30 shadow-2xl">
          {avatarVideo ? (
            <video
              src={avatarVideo}
              autoPlay
              loop
              muted
              className={`w-full h-full object-cover transition-all duration-500 ${getEmotionClass(avatarState.currentEmotion)}`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
              <div className="text-white text-6xl">🤖</div>
            </div>
          )}
        </div>
        
        {/* Status Indicators */}
        <div className="absolute -top-2 -right-2 flex space-x-1">
          {avatarState.isListening && (
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              <Mic className="w-3 h-3 text-white" />
            </div>
          )}
          {avatarState.isSpeaking && (
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
              <Volume2 className="w-3 h-3 text-white" />
            </div>
          )}
          {avatarState.isProcessing && (
            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-spin">
              <Brain className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* AI CEO Info */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">
          {aiConfig?.ceoName || 'AI CEO'}
        </h3>
        <p className="text-purple-200 mb-4">
          {aiConfig?.industry ? `${aiConfig.industry} Expert` : 'Your AI Business Partner'}
        </p>
        <div className="flex items-center space-x-2 text-sm text-purple-300">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Voice Controls */}
      <div className="flex space-x-4">
        <button
          onClick={avatarState.isListening ? stopListening : startListening}
          disabled={avatarState.isProcessing}
          className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-200 ${
            avatarState.isListening
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          } ${avatarState.isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {avatarState.isListening ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
          <span>{avatarState.isListening ? 'Stop Listening' : 'Start Voice Chat'}</span>
        </button>

        <button
          onClick={() => speechSynthesis.cancel()}
          disabled={!avatarState.isSpeaking}
          className="flex items-center space-x-2 px-6 py-3 rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <VolumeX className="w-5 h-5" />
          <span>Stop Speaking</span>
        </button>
      </div>

      {/* Text Input */}
      <form onSubmit={handleTextSubmit} className="w-full max-w-md">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message or use voice..."
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={avatarState.isProcessing}
          />
          <button
            type="submit"
            disabled={!message.trim() || avatarState.isProcessing}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Send</span>
          </button>
        </div>
      </form>

      {/* Personality Traits */}
      {aiConfig?.personality && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-purple-300 mb-1">Personality</div>
            <div className="text-white">
              {typeof aiConfig.personality === 'object' 
                ? Object.entries(aiConfig.personality).slice(0, 2).map(([key, value]) => (
                    <div key={key} className="capitalize">{key}: {String(value)}</div>
                  ))
                : 'Customized'
              }
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-purple-300 mb-1">Current Mode</div>
            <div className="text-white capitalize">{avatarState.currentEmotion}</div>
          </div>
        </div>
      )}

      {/* Emotion Detection */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">Emotion Detection</h4>
          <button
            onClick={() => setEmotionDetectionActive(!emotionDetectionActive)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              emotionDetectionActive 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            {emotionDetectionActive ? 'Stop Detection' : 'Start Detection'}
          </button>
        </div>
        
        <EmotionDetection
          onEmotionChange={handleEmotionChange}
          onSentimentChange={handleSentimentChange}
          isActive={emotionDetectionActive}
        />
      </div>
    </div>
  );
}
