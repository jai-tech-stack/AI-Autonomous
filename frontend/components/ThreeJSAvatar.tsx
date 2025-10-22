'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
  RotateCcw,
  Palette,
  User,
  Camera,
  Lightbulb
} from 'lucide-react';
import { AnimatedContainer, AnimatedCard, FadeIn } from './ui/Animated';

interface ThreeJSAvatarProps {
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
  lighting: 'warm' | 'cool' | 'dramatic' | 'natural';
}

export default function ThreeJSAvatar({ 
  organizationId, 
  aiConfig, 
  onMessage, 
  onVoiceResponse 
}: ThreeJSAvatarProps) {
  const [avatarState, setAvatarState] = useState<AvatarState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    currentEmotion: 'neutral',
    isAnimating: false,
    lipSyncIntensity: 0,
    eyeBlink: false,
    headTilt: 0,
    currentStyle: 'professional',
    lighting: 'natural'
  });
  
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: number;
    emotion?: string;
  }>>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const avatarRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize Three.js avatar system
  useEffect(() => {
    initializeThreeJSAvatar();
    initializeVoiceRecognition();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeThreeJSAvatar = async () => {
    try {
      // Dynamically import Three.js
      const THREE = await import('three');
      
      if (!containerRef.current) return;

      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);
      sceneRef.current = scene;

      // Camera setup
      const camera = new THREE.PerspectiveCamera(
        75,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 5;
      cameraRef.current = camera;

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
      });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Lighting setup
      setupLighting(THREE, scene);

      // Create avatar
      createAvatar(THREE, scene);

      // Start animation loop
      animate(THREE);

      setIsConnected(true);
    } catch (error) {
      console.error('Error initializing Three.js avatar:', error);
      // Fallback to 2D avatar if Three.js fails
      setIsConnected(true);
    }
  };

  const setupLighting = (THREE: any, scene: any) => {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Point light for rim lighting
    const pointLight = new THREE.PointLight(0x8B5CF6, 0.5, 10);
    pointLight.position.set(-3, 2, 3);
    scene.add(pointLight);
  };

  const createAvatar = (THREE: any, scene: any) => {
    const avatar = new THREE.Group();
    
    // Head
    const headGeometry = new THREE.SphereGeometry(1, 32, 32);
    const headMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xFFDBAC,
      transparent: true,
      opacity: 0.9
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.5;
    head.castShadow = true;
    avatar.add(head);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.3, 0.6, 0.8);
    avatar.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.3, 0.6, 0.8);
    avatar.add(rightEye);

    // Eye pupils
    const pupilGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.3, 0.6, 0.85);
    avatar.add(leftPupil);
    
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.3, 0.6, 0.85);
    avatar.add(rightPupil);

    // Nose
    const noseGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const noseMaterial = new THREE.MeshLambertMaterial({ color: 0xFFB6C1 });
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, 0.3, 0.8);
    nose.rotation.x = Math.PI;
    avatar.add(nose);

    // Mouth
    const mouthGeometry = new THREE.TorusGeometry(0.2, 0.05, 8, 16, Math.PI);
    const mouthMaterial = new THREE.MeshLambertMaterial({ color: 0x8B0000 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, 0.1, 0.8);
    mouth.rotation.x = Math.PI;
    avatar.add(mouth);

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.6, 1.5, 16);
    const bodyMaterial = new THREE.MeshLambertMaterial({ 
      color: getStyleColor(avatarState.currentStyle)
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = -0.8;
    body.castShadow = true;
    avatar.add(body);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.15, 0.1, 1, 8);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBAC });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8, -0.2, 0);
    leftArm.rotation.z = 0.3;
    leftArm.castShadow = true;
    avatar.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8, -0.2, 0);
    rightArm.rotation.z = -0.3;
    rightArm.castShadow = true;
    avatar.add(rightArm);

    // Store references for animation
    avatarRef.current = {
      group: avatar,
      head,
      leftEye,
      rightEye,
      leftPupil,
      rightPupil,
      mouth,
      body,
      leftArm,
      rightArm
    };

    scene.add(avatar);
  };

  const getStyleColor = (style: string) => {
    const colors = {
      professional: 0x4F46E5,
      casual: 0xEC4899,
      futuristic: 0x06B6D4,
      minimalist: 0x8B5CF6
    };
    return colors[style as keyof typeof colors] || colors.professional;
  };

  const animate = (THREE: any) => {
    const animateLoop = () => {
      if (sceneRef.current && rendererRef.current && cameraRef.current) {
        // Update avatar based on state
        updateAvatarAnimation(THREE);
        
        // Render scene
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(animateLoop);
    };
    
    animateLoop();
  };

  const updateAvatarAnimation = (THREE: any) => {
    if (!avatarRef.current) return;

    const { group, head, leftEye, rightEye, leftPupil, rightPupil, mouth, leftArm, rightArm } = avatarRef.current;
    
    // Head tilt
    head.rotation.z = avatarState.headTilt * Math.PI / 180;
    
    // Eye blinking
    if (avatarState.eyeBlink) {
      leftEye.scale.y = 0.1;
      rightEye.scale.y = 0.1;
    } else {
      leftEye.scale.y = 1;
      rightEye.scale.y = 1;
    }
    
    // Lip sync for speaking
    if (avatarState.isSpeaking) {
      mouth.scale.y = 1 + avatarState.lipSyncIntensity * 0.5;
      mouth.scale.x = 1 + avatarState.lipSyncIntensity * 0.3;
    } else {
      mouth.scale.y = 1;
      mouth.scale.x = 1;
    }
    
    // Emotion-based expressions
    updateEmotionExpression(THREE);
    
    // Idle animations
    const time = Date.now() * 0.001;
    group.rotation.y = Math.sin(time * 0.5) * 0.1;
    head.rotation.y = Math.sin(time * 0.3) * 0.05;
    
    // Random blinking
    if (Math.random() < 0.01) {
      setAvatarState(prev => ({ ...prev, eyeBlink: true }));
      setTimeout(() => {
        setAvatarState(prev => ({ ...prev, eyeBlink: false }));
      }, 150);
    }
  };

  const updateEmotionExpression = (THREE: any) => {
    if (!avatarRef.current) return;

    const { mouth, leftPupil, rightPupil, leftArm, rightArm } = avatarRef.current;
    
    switch (avatarState.currentEmotion) {
      case 'happy':
        mouth.rotation.x = 0;
        mouth.position.y = 0.15;
        leftArm.rotation.z = 0.5;
        rightArm.rotation.z = -0.5;
        break;
      case 'sad':
        mouth.rotation.x = Math.PI;
        mouth.position.y = 0.05;
        leftArm.rotation.z = -0.2;
        rightArm.rotation.z = 0.2;
        break;
      case 'angry':
        mouth.rotation.x = 0;
        mouth.position.y = 0.1;
        leftArm.rotation.z = 0.8;
        rightArm.rotation.z = -0.8;
        break;
      case 'surprised':
        mouth.rotation.x = 0;
        mouth.position.y = 0.2;
        mouth.scale.y = 1.5;
        break;
      case 'excited':
        mouth.rotation.x = 0;
        mouth.position.y = 0.15;
        leftArm.rotation.z = 0.6;
        rightArm.rotation.z = -0.6;
        break;
      case 'confident':
        mouth.rotation.x = 0;
        mouth.position.y = 0.12;
        leftArm.rotation.z = 0.3;
        rightArm.rotation.z = -0.3;
        break;
      case 'thoughtful':
        mouth.rotation.x = 0;
        mouth.position.y = 0.08;
        leftArm.rotation.z = 0.1;
        rightArm.rotation.z = -0.1;
        break;
      default: // neutral
        mouth.rotation.x = 0;
        mouth.position.y = 0.1;
        leftArm.rotation.z = 0.3;
        rightArm.rotation.z = -0.3;
        break;
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
    
    // Update body color
    if (avatarRef.current?.body) {
      avatarRef.current.body.material.color.setHex(getStyleColor(style));
    }
  };

  const changeLighting = (lighting: AvatarState['lighting']) => {
    setAvatarState(prev => ({ ...prev, lighting }));
    // Update lighting in the scene
    // This would require updating the Three.js lights
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
    if (rendererRef.current && containerRef.current) {
      containerRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
    }
  };

  return (
    <AnimatedContainer>
      <div className="flex flex-col items-center space-y-8 p-6">
        {/* 3D Avatar Display */}
        <FadeIn delay={0.2}>
          <div className="relative">
            <div 
              ref={containerRef}
              className="w-96 h-96 rounded-full overflow-hidden border-4 border-purple-500/30 shadow-2xl bg-gradient-to-br from-purple-600 to-indigo-600"
              style={{ minHeight: '400px' }}
            />
            
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
              {aiConfig?.ceoName || '3D AI CEO'}
            </h3>
            <p className="text-purple-200 mb-4">
              {aiConfig?.industry ? `${aiConfig.industry} Expert` : 'Your 3D AI Business Partner'}
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

        {/* Style and Lighting Controls */}
        <FadeIn delay={0.6}>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex space-x-2">
              {(['professional', 'casual', 'futuristic', 'minimalist'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => changeAvatarStyle(style)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                    avatarState.currentStyle === style
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-purple-200 hover:bg-white/20'
                  }`}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="flex space-x-2">
              {(['warm', 'cool', 'dramatic', 'natural'] as const).map((lighting) => (
                <button
                  key={lighting}
                  onClick={() => changeLighting(lighting)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                    avatarState.lighting === lighting
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-purple-200 hover:bg-white/20'
                  }`}
                >
                  <Lightbulb className="w-3 h-3 inline mr-1" />
                  {lighting.charAt(0).toUpperCase() + lighting.slice(1)}
                </button>
              ))}
            </div>
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

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <FadeIn delay={1.2}>
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
