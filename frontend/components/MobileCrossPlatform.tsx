'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Download, 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryLow,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Settings,
  Menu,
  X,
  Home,
  Search,
  Bell,
  User,
  Plus,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Share2,
  Bookmark,
  Heart,
  MessageCircle,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Camera,
  Mic,
  MicOff,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize,
  Minimize,
  RotateCcw,
  Zap,
  Brain,
  BarChart3,
  Users,
  Target,
  Globe,
  Layers
} from 'lucide-react';
import { AnimatedContainer, AnimatedCard, FadeIn } from './ui/Animated';

interface MobileCrossPlatformProps {
  organizationId: string;
  onPlatformChange?: (platform: string) => void;
}

interface DeviceState {
  platform: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  isOnline: boolean;
  batteryLevel: number;
  isCharging: boolean;
  volume: number;
  isMuted: boolean;
  theme: 'light' | 'dark' | 'auto';
  isFullscreen: boolean;
  isPWA: boolean;
  canInstall: boolean;
}

interface AppState {
  currentScreen: string;
  navigationStack: string[];
  isMenuOpen: boolean;
  isSearchOpen: boolean;
  notifications: number;
  isPlaying: boolean;
  currentTrack?: string;
}

interface PWAFeatures {
  installable: boolean;
  offline: boolean;
  pushNotifications: boolean;
  backgroundSync: boolean;
  geolocation: boolean;
  camera: boolean;
  microphone: boolean;
  contacts: boolean;
  calendar: boolean;
}

export default function MobileCrossPlatform({ 
  organizationId, 
  onPlatformChange 
}: MobileCrossPlatformProps) {
  const [deviceState, setDeviceState] = useState<DeviceState>({
    platform: 'desktop',
    orientation: 'landscape',
    isOnline: true,
    batteryLevel: 100,
    isCharging: false,
    volume: 70,
    isMuted: false,
    theme: 'dark',
    isFullscreen: false,
    isPWA: false,
    canInstall: false
  });
  
  const [appState, setAppState] = useState<AppState>({
    currentScreen: 'dashboard',
    navigationStack: ['dashboard'],
    isMenuOpen: false,
    isSearchOpen: false,
    notifications: 3,
    isPlaying: false
  });
  
  const [pwaFeatures, setPwaFeatures] = useState<PWAFeatures>({
    installable: false,
    offline: false,
    pushNotifications: false,
    backgroundSync: false,
    geolocation: false,
    camera: false,
    microphone: false,
    contacts: false,
    calendar: false
  });
  
  const [isInstalling, setIsInstalling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeInstallPromptRef = useRef<any>(null);

  useEffect(() => {
    initializeCrossPlatform();
    setupPWA();
    setupDeviceDetection();
    setupOfflineDetection();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeCrossPlatform = () => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    let platform: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      platform = 'mobile';
    } else if (/tablet|ipad|android(?!.*mobile)/i.test(userAgent)) {
      platform = 'tablet';
    }
    
    setDeviceState(prev => ({ ...prev, platform }));
    onPlatformChange?.(platform);
  };

  const setupPWA = () => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDeviceState(prev => ({ ...prev, isPWA: true }));
    }

    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setDeviceState(prev => ({ ...prev, canInstall: true }));
    });

    // Check PWA features
    checkPWAFeatures();
  };

  const checkPWAFeatures = () => {
    const features: PWAFeatures = {
      installable: !!deferredPrompt,
      offline: 'serviceWorker' in navigator,
      pushNotifications: 'Notification' in window && 'serviceWorker' in navigator,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      geolocation: 'geolocation' in navigator,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      contacts: 'contacts' in navigator,
      calendar: 'calendar' in navigator
    };
    
    setPwaFeatures(features);
  };

  const setupDeviceDetection = () => {
    // Detect orientation changes
    const handleOrientationChange = () => {
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      setDeviceState(prev => ({ ...prev, orientation }));
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    // Simulate battery level (in real app, use Battery API)
    const updateBatteryLevel = () => {
      const batteryLevel = Math.max(0, Math.min(100, 100 - Math.random() * 20));
      setDeviceState(prev => ({ ...prev, batteryLevel }));
    };

    const batteryInterval = setInterval(updateBatteryLevel, 30000);
    updateBatteryLevel();

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
      clearInterval(batteryInterval);
    };
  };

  const setupOfflineDetection = () => {
    const handleOnline = () => {
      setDeviceState(prev => ({ ...prev, isOnline: true }));
      setIsOffline(false);
    };

    const handleOffline = () => {
      setDeviceState(prev => ({ ...prev, isOnline: false }));
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  };

  const installPWA = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeviceState(prev => ({ ...prev, isPWA: true, canInstall: false }));
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing PWA:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setDeviceState(prev => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setDeviceState(prev => ({ ...prev, isFullscreen: false }));
    }
  };

  const toggleTheme = () => {
    const newTheme = deviceState.theme === 'dark' ? 'light' : 'dark';
    setDeviceState(prev => ({ ...prev, theme: newTheme }));
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const navigateTo = (screen: string) => {
    setAppState(prev => ({
      ...prev,
      currentScreen: screen,
      navigationStack: [...prev.navigationStack, screen],
      isMenuOpen: false
    }));
  };

  const goBack = () => {
    if (appState.navigationStack.length > 1) {
      const newStack = appState.navigationStack.slice(0, -1);
      const currentScreen = newStack[newStack.length - 1];
      
      setAppState(prev => ({
        ...prev,
        currentScreen,
        navigationStack: newStack
      }));
    }
  };

  const toggleMenu = () => {
    setAppState(prev => ({ ...prev, isMenuOpen: !prev.isMenuOpen }));
  };

  const toggleSearch = () => {
    setAppState(prev => ({ ...prev, isSearchOpen: !prev.isSearchOpen }));
  };

  const cleanup = () => {
    // Cleanup any intervals or listeners
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      mobile: <Smartphone className="w-5 h-5" />,
      tablet: <Tablet className="w-5 h-5" />,
      desktop: <Monitor className="w-5 h-5" />
    };
    return icons[platform as keyof typeof icons] || <Monitor className="w-5 h-5" />;
  };

  const getBatteryIcon = (level: number, isCharging: boolean) => {
    if (isCharging) return <Battery className="w-4 h-4 text-green-400" />;
    if (level < 20) return <BatteryLow className="w-4 h-4 text-red-400" />;
    return <Battery className="w-4 h-4 text-white" />;
  };

  const getConnectionIcon = () => {
    return deviceState.isOnline ? 
      <Wifi className="w-4 h-4 text-green-400" /> : 
      <WifiOff className="w-4 h-4 text-red-400" />;
  };

  return (
    <AnimatedContainer>
      <div className="space-y-8 p-6">
        {/* Header */}
        <FadeIn delay={0.2}>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Globe className="w-8 h-8 text-purple-300" />
              </div>
              <h1 className="text-4xl font-bold text-white">Mobile & Cross-Platform</h1>
            </div>
            <p className="text-purple-200 text-lg">
              Seamless experience across all devices with PWA technology
            </p>
          </div>
        </FadeIn>

        {/* Device Status Bar */}
        <FadeIn delay={0.4}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getPlatformIcon(deviceState.platform)}
                  <span className="text-white font-medium capitalize">
                    {deviceState.platform}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getConnectionIcon()}
                  <span className="text-white text-sm">
                    {deviceState.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getBatteryIcon(deviceState.batteryLevel, deviceState.isCharging)}
                  <span className="text-white text-sm">
                    {deviceState.batteryLevel}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleTheme}
                  className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded"
                >
                  {deviceState.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                
                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded"
                >
                  {deviceState.isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </AnimatedCard>
        </FadeIn>

        {/* PWA Installation */}
        {deviceState.canInstall && !deviceState.isPWA && (
          <FadeIn delay={0.6}>
            <AnimatedCard className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-6 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Download className="w-6 h-6 text-purple-300" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Install App</h3>
                    <p className="text-purple-200 text-sm">
                      Install this app on your device for a better experience
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={installPWA}
                  disabled={isInstalling}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {isInstalling ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isInstalling ? 'Installing...' : 'Install'}</span>
                </button>
              </div>
            </AnimatedCard>
          </FadeIn>
        )}

        {/* Mobile Navigation */}
        <FadeIn delay={0.8}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Mobile Navigation</h2>
              <button
                onClick={toggleMenu}
                className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded"
              >
                {appState.isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {/* Bottom Navigation */}
            <div className="flex items-center justify-around bg-white/5 rounded-lg p-2">
              <button
                onClick={() => navigateTo('dashboard')}
                className={`flex flex-col items-center space-y-1 p-3 rounded-lg transition-colors ${
                  appState.currentScreen === 'dashboard'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="text-xs">Home</span>
              </button>
              
              <button
                onClick={() => navigateTo('chat')}
                className={`flex flex-col items-center space-y-1 p-3 rounded-lg transition-colors ${
                  appState.currentScreen === 'chat'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs">Chat</span>
              </button>
              
              <button
                onClick={() => navigateTo('tasks')}
                className={`flex flex-col items-center space-y-1 p-3 rounded-lg transition-colors ${
                  appState.currentScreen === 'tasks'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Target className="w-5 h-5" />
                <span className="text-xs">Tasks</span>
              </button>
              
              <button
                onClick={() => navigateTo('analytics')}
                className={`flex flex-col items-center space-y-1 p-3 rounded-lg transition-colors ${
                  appState.currentScreen === 'analytics'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-xs">Analytics</span>
              </button>
              
              <button
                onClick={() => navigateTo('profile')}
                className={`flex flex-col items-center space-y-1 p-3 rounded-lg transition-colors ${
                  appState.currentScreen === 'profile'
                    ? 'bg-purple-600 text-white'
                    : 'text-purple-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="text-xs">Profile</span>
              </button>
            </div>
          </AnimatedCard>
        </FadeIn>

        {/* PWA Features */}
        <FadeIn delay={1.0}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">PWA Features</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(pwaFeatures).map(([feature, available]) => (
                <div
                  key={feature}
                  className={`p-4 rounded-lg border transition-colors ${
                    available
                      ? 'bg-green-500/20 border-green-500/30'
                      : 'bg-gray-500/20 border-gray-500/30'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`w-2 h-2 rounded-full ${
                      available ? 'bg-green-400' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-white font-medium capitalize">
                      {feature.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <p className="text-purple-200 text-sm">
                    {available ? 'Available' : 'Not Available'}
                  </p>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </FadeIn>

        {/* Offline Support */}
        {isOffline && (
          <FadeIn delay={1.2}>
            <AnimatedCard className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 p-6 border border-yellow-500/30">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <WifiOff className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Offline Mode</h3>
                  <p className="text-yellow-200 text-sm">
                    You're currently offline. Some features may be limited.
                  </p>
                </div>
              </div>
            </AnimatedCard>
          </FadeIn>
        )}

        {/* Responsive Design Demo */}
        <FadeIn delay={1.4}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Responsive Design</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Mobile View */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-2 mb-3">
                  <Smartphone className="w-4 h-4 text-purple-300" />
                  <span className="text-white font-medium">Mobile</span>
                </div>
                <div className="bg-gray-800 rounded h-32 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Mobile Layout</span>
                </div>
              </div>
              
              {/* Tablet View */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-2 mb-3">
                  <Tablet className="w-4 h-4 text-purple-300" />
                  <span className="text-white font-medium">Tablet</span>
                </div>
                <div className="bg-gray-800 rounded h-32 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Tablet Layout</span>
                </div>
              </div>
              
              {/* Desktop View */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-2 mb-3">
                  <Monitor className="w-4 h-4 text-purple-300" />
                  <span className="text-white font-medium">Desktop</span>
                </div>
                <div className="bg-gray-800 rounded h-32 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Desktop Layout</span>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </FadeIn>
      </div>
    </AnimatedContainer>
  );
}

