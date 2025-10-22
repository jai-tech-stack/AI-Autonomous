'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  Zap, 
  Brain, 
  MessageCircle,
  Eye,
  Smile,
  Frown,
  Meh,
  Heart,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Palette,
  User
} from 'lucide-react';
import { AnimatedContainer, AnimatedCard, FadeIn } from './ui/Animated';

interface CustomAvatarProps {
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
  currentEmotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'excited' | 'confident' | 'thoughtful';
  isAnimating: boolean;
  lipSyncIntensity: number;
  eyeBlink: boolean;
  headTilt: number;
  currentStyle: 'professional' | 'casual' | 'futuristic' | 'minimalist';
}

interface VoiceAnalysis {
  volume: number;
  pitch: number;
  frequency: number;
  isSpeaking: boolean;
}

export default function CustomAvatar({ 
  organizationId, 
  aiConfig, 
  onMessage, 
  onVoiceResponse 
}: CustomAvatarProps) {
  const [avatarState, setAvatarState] = useState<AvatarState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    currentEmotion: 'neutral',
    isAnimating: false,
    lipSyncIntensity: 0,
    eyeBlink: false,
    headTilt: 0,
    currentStyle: 'professional'
  });
  
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysis>({
    volume: 0,
    pitch: 0,
    frequency: 0,
    isSpeaking: false
  });
  const [conversationHistory, setConversationHistory] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: number;
    emotion?: string;
  }>>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const animationFrameRef = useRef<number>();

  // Initialize custom avatar system
  useEffect(() => {
    initializeCustomAvatar();
    initializeVoiceRecognition();
    initializeAudioAnalysis();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeCustomAvatar = async () => {
    try {
      // Initialize canvas for 2D avatar rendering
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 400;
          canvas.height = 400;
          drawAvatar(ctx);
        }
      }
      
      setIsConnected(true);
      
      // Start idle animation loop
      startIdleAnimation();
    } catch (error) {
      console.error('Error initializing custom avatar:', error);
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
          isListening: true,
          currentEmotion: 'thoughtful'
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
          isListening: false,
          currentEmotion: 'neutral'
        }));
      };

      recognitionRef.current = recognition;
    }
  };

  const initializeAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      startAudioAnalysis();
    } catch (error) {
      console.error('Error initializing audio analysis:', error);
    }
  };

  const startAudioAnalysis = () => {
    const analyseAudio = () => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate volume and pitch
        const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const pitch = calculatePitch(dataArray);
        
        setVoiceAnalysis(prev => ({
          ...prev,
          volume: volume / 255,
          pitch: pitch,
          frequency: volume,
          isSpeaking: volume > 10
        }));

        // Update lip sync based on volume
        setAvatarState(prev => ({
          ...prev,
          lipSyncIntensity: Math.min(volume / 50, 1),
          isSpeaking: volume > 10
        }));
      }
      
      animationFrameRef.current = requestAnimationFrame(analyseAudio);
    };
    
    analyseAudio();
  };

  const calculatePitch = (dataArray: Uint8Array): number => {
    // Simple pitch calculation based on frequency data
    let maxIndex = 0;
    let maxValue = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }
    
    return maxIndex / dataArray.length;
  };

  const drawAvatar = (ctx: CanvasRenderingContext2D) => {
    const canvas = ctx.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 120;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = getAvatarBackground();
    ctx.fill();
    ctx.strokeStyle = getAvatarBorder();
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Draw face
    drawFace(ctx, centerX, centerY, radius);
    
    // Draw eyes
    drawEyes(ctx, centerX, centerY, radius);
    
    // Draw mouth
    drawMouth(ctx, centerX, centerY, radius);
    
    // Draw eyebrows
    drawEyebrows(ctx, centerX, centerY, radius);
    
    // Draw accessories based on style
    drawAccessories(ctx, centerX, centerY, radius);
  };

  const getAvatarBackground = (): string => {
    const styles = {
      professional: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      casual: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      futuristic: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      minimalist: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    };
    return styles[avatarState.currentStyle];
  };

  const getAvatarBorder = (): string => {
    const styles = {
      professional: '#4F46E5',
      casual: '#EC4899',
      futuristic: '#06B6D4',
      minimalist: '#8B5CF6'
    };
    return styles[avatarState.currentStyle];
  };

  const drawFace = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    // Face shape with slight head tilt
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(avatarState.headTilt * Math.PI / 180);
    
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.8, radius * 0.9, 0, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFDBAC'; // Skin tone
    ctx.fill();
    ctx.strokeStyle = '#E5B887';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  };

  const drawEyes = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    const eyeY = centerY - radius * 0.2;
    const eyeSpacing = radius * 0.3;
    
    // Left eye
    ctx.beginPath();
    ctx.arc(centerX - eyeSpacing, eyeY, radius * 0.08, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    
    // Right eye
    ctx.beginPath();
    ctx.arc(centerX + eyeSpacing, eyeY, radius * 0.08, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    
    // Eye pupils
    const pupilSize = radius * 0.04;
    ctx.fillStyle = '#000000';
    
    // Left pupil
    ctx.beginPath();
    ctx.arc(centerX - eyeSpacing, eyeY, pupilSize, 0, 2 * Math.PI);
    ctx.fill();
    
    // Right pupil
    ctx.beginPath();
    ctx.arc(centerX + eyeSpacing, eyeY, pupilSize, 0, 2 * Math.PI);
    ctx.fill();
    
    // Eye blink animation
    if (avatarState.eyeBlink) {
      ctx.fillStyle = '#FFDBAC';
      ctx.fillRect(centerX - eyeSpacing - radius * 0.08, eyeY - radius * 0.08, radius * 0.16, radius * 0.16);
      ctx.fillRect(centerX + eyeSpacing - radius * 0.08, eyeY - radius * 0.08, radius * 0.16, radius * 0.16);
    }
  };

  const drawMouth = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    const mouthY = centerY + radius * 0.2;
    const mouthWidth = radius * 0.3;
    const mouthHeight = radius * 0.1;
    
    ctx.beginPath();
    
    if (avatarState.isSpeaking) {
      // Open mouth for speaking
      const openHeight = mouthHeight + (avatarState.lipSyncIntensity * radius * 0.1);
      ctx.ellipse(centerX, mouthY, mouthWidth, openHeight, 0, 0, 2 * Math.PI);
      ctx.fillStyle = '#8B0000'; // Dark red for mouth interior
      ctx.fill();
    } else {
      // Closed mouth with emotion-based curve
      const curve = getMouthCurve();
      ctx.arc(centerX, mouthY, mouthWidth, curve.start, curve.end);
      ctx.strokeStyle = '#8B0000';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  const getMouthCurve = () => {
    const emotions = {
      happy: { start: 0.2 * Math.PI, end: 0.8 * Math.PI },
      sad: { start: 1.2 * Math.PI, end: 1.8 * Math.PI },
      angry: { start: 0.1 * Math.PI, end: 0.9 * Math.PI },
      surprised: { start: 0, end: 2 * Math.PI },
      excited: { start: 0.1 * Math.PI, end: 0.9 * Math.PI },
      confident: { start: 0.3 * Math.PI, end: 0.7 * Math.PI },
      thoughtful: { start: 0.4 * Math.PI, end: 0.6 * Math.PI },
      neutral: { start: 0.2 * Math.PI, end: 0.8 * Math.PI }
    };
    return emotions[avatarState.currentEmotion] || emotions.neutral;
  };

  const drawEyebrows = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    const eyebrowY = centerY - radius * 0.35;
    const eyebrowSpacing = radius * 0.3;
    
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    
    // Left eyebrow
    ctx.beginPath();
    ctx.moveTo(centerX - eyebrowSpacing - radius * 0.1, eyebrowY);
    ctx.lineTo(centerX - eyebrowSpacing + radius * 0.1, eyebrowY);
    ctx.stroke();
    
    // Right eyebrow
    ctx.beginPath();
    ctx.moveTo(centerX + eyebrowSpacing - radius * 0.1, eyebrowY);
    ctx.lineTo(centerX + eyebrowSpacing + radius * 0.1, eyebrowY);
    ctx.stroke();
  };

  const drawAccessories = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    const styles = {
      professional: () => {
        // Draw tie
        ctx.fillStyle = '#1F2937';
        ctx.fillRect(centerX - radius * 0.1, centerY + radius * 0.4, radius * 0.2, radius * 0.3);
      },
      casual: () => {
        // Draw casual shirt
        ctx.fillStyle = '#3B82F6';
        ctx.fillRect(centerX - radius * 0.3, centerY + radius * 0.3, radius * 0.6, radius * 0.4);
      },
      futuristic: () => {
        // Draw tech elements
        ctx.strokeStyle = '#00F2FE';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.9, 0, 2 * Math.PI);
        ctx.stroke();
      },
      minimalist: () => {
        // Draw simple geometric shapes
        ctx.fillStyle = '#8B5CF6';
        ctx.fillRect(centerX - radius * 0.05, centerY - radius * 0.1, radius * 0.1, radius * 0.1);
      }
    };
    
    styles[avatarState.currentStyle]();
  };

  const startIdleAnimation = () => {
    const animate = () => {
      // Random eye blinking
      if (Math.random() < 0.01) {
        setAvatarState(prev => ({ ...prev, eyeBlink: true }));
        setTimeout(() => {
          setAvatarState(prev => ({ ...prev, eyeBlink: false }));
        }, 150);
      }
      
      // Subtle head movement
      const headTilt = Math.sin(Date.now() * 0.001) * 2;
      setAvatarState(prev => ({ ...prev, headTilt }));
      
      // Redraw avatar
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawAvatar(ctx);
        }
      }
      
      requestAnimationFrame(animate);
    };
    
    animate();
  };

  const handleVoiceInput = async (transcript: string) => {
    setMessage(transcript);
    
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
      isProcessing: true,
      currentEmotion: 'thoughtful'
    }));

    try {
      // Simulate AI processing
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
            currentEmotion: avatarState.currentEmotion
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
          emotion: 'confident'
        };
        
        setConversationHistory(prev => [...prev, aiMessage]);
        
        // Speak the response
        speakText(aiResponse);
      }
    } catch (error) {
      console.error('Error processing with AI:', error);
    } finally {
      setAvatarState(prev => ({
        ...prev,
        isProcessing: false,
        currentEmotion: 'neutral'
      }));
    }
  };

  const speakText = (text: string) => {
    if (synthesisRef.current) {
      speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    utterance.onstart = () => {
      setAvatarState(prev => ({
        ...prev,
        isSpeaking: true,
        currentEmotion: 'excited'
      }));
    };

    utterance.onend = () => {
      setAvatarState(prev => ({
        ...prev,
        isSpeaking: false,
        currentEmotion: 'neutral'
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

    await processWithAI(message);
    setMessage('');
  };

  const changeAvatarStyle = (style: AvatarState['currentStyle']) => {
    setAvatarState(prev => ({ ...prev, currentStyle: style }));
  };

  const getEmotionIcon = (emotion: string) => {
    const emotionIcons = {
      happy: <Smile className="w-6 h-6 text-yellow-400" />,
      sad: <Frown className="w-6 h-6 text-blue-400" />,
      angry: <Frown className="w-6 h-6 text-red-400" />,
      surprised: <Eye className="w-6 h-6 text-purple-400" />,
      excited: <Zap className="w-6 h-6 text-orange-400" />,
      confident: <ThumbsUp className="w-6 h-6 text-green-400" />,
      thoughtful: <Brain className="w-6 h-6 text-indigo-400" />,
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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  return (
    <AnimatedContainer>
      <div className="flex flex-col items-center space-y-8 p-6">
        {/* Custom Avatar Display */}
        <FadeIn delay={0.2}>
          <div className="relative">
            <div className="relative w-96 h-96 rounded-full overflow-hidden border-4 border-purple-500/30 shadow-2xl bg-gradient-to-br from-purple-600 to-indigo-600">
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ imageRendering: 'pixelated' }}
              />
              
              {/* Voice visualization overlay */}
              {avatarState.isSpeaking && (
                <div className="absolute inset-0 pointer-events-none">
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping"
                    style={{
                      transform: `scale(${1 + voiceAnalysis.volume * 0.5})`,
                      opacity: voiceAnalysis.volume
                    }}
                  />
                </div>
              )}
            </div>
            
            {/* Status Indicators */}
            <div className="absolute -top-2 -right-2 flex space-x-2">
              {avatarState.isListening && (
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <Mic className="w-4 h-4 text-white" />
                </div>
              )}
              {avatarState.isSpeaking && (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                  <Volume2 className="w-4 h-4 text-white" />
                </div>
              )}
              {avatarState.isProcessing && (
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center animate-spin">
                  <Brain className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            
            {/* Emotion Indicator */}
            <div className="absolute -bottom-2 -left-2 bg-white/20 backdrop-blur-lg rounded-full p-3">
              {getEmotionIcon(avatarState.currentEmotion)}
            </div>
          </div>
        </FadeIn>

        {/* AI Info */}
        <FadeIn delay={0.4}>
          <div className="text-center">
            <h3 className="text-3xl font-bold text-white mb-2">
              {aiConfig?.ceoName || 'Custom AI CEO'}
            </h3>
            <p className="text-purple-200 mb-4">
              {aiConfig?.industry ? `${aiConfig.industry} Expert` : 'Your Custom AI Business Partner'}
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-300' : 'text-red-300'}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-300">
                <span>Style: {avatarState.currentStyle}</span>
                <span>•</span>
                <span>Emotion: {avatarState.currentEmotion}</span>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Avatar Style Selector */}
        <FadeIn delay={0.6}>
          <div className="flex space-x-2">
            {(['professional', 'casual', 'futuristic', 'minimalist'] as const).map((style) => (
              <button
                key={style}
                onClick={() => changeAvatarStyle(style)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  avatarState.currentStyle === style
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Controls */}
        <FadeIn delay={0.8}>
          <div className="flex flex-wrap justify-center gap-4">
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
        </FadeIn>

        {/* Text Input */}
        <FadeIn delay={1.0}>
          <form onSubmit={handleTextSubmit} className="w-full max-w-2xl">
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
        </FadeIn>

        {/* Voice Analysis Display */}
        {voiceAnalysis.isSpeaking && (
          <FadeIn delay={1.2}>
            <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-purple-200">
                  <div>Volume: {Math.round(voiceAnalysis.volume * 100)}%</div>
                  <div>Pitch: {Math.round(voiceAnalysis.pitch * 100)}%</div>
                </div>
                <div className="flex-1 bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${voiceAnalysis.volume * 100}%` }}
                  />
                </div>
              </div>
            </AnimatedCard>
          </FadeIn>
        )}

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <FadeIn delay={1.4}>
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
                            {getEmotionIcon(msg.emotion)}
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
      </div>
    </AnimatedContainer>
  );
}
