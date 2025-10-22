'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Move3D, 
  RotateCcw, 
  Settings, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize,
  Minimize,
  Smartphone,
  Monitor,
  Headphones,
  Zap,
  Brain,
  Target,
  BarChart3,
  Users,
  MessageSquare,
  Globe,
  Layers,
  Box,
  Sphere,
  Cone,
  Cylinder,
  Pyramid,
  Cube,
  Star,
  Heart,
  Lightbulb,
  Camera,
  Video,
  Mic,
  MicOff
} from 'lucide-react';
import { AnimatedContainer, AnimatedCard, FadeIn } from './ui/Animated';

interface ImmersiveARVRProps {
  organizationId: string;
  onEnterVR?: () => void;
  onExitVR?: () => void;
}

interface VRState {
  isVRMode: boolean;
  isARMode: boolean;
  isFullscreen: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  currentScene: string;
  userPosition: { x: number; y: number; z: number };
  userRotation: { x: number; y: number; z: number };
  selectedObject: string | null;
  environment: 'office' | 'space' | 'nature' | 'abstract' | 'city';
  lighting: 'day' | 'night' | 'neon' | 'warm' | 'cool';
}

interface VRScene {
  id: string;
  name: string;
  description: string;
  objects: VRObject[];
  environment: string;
  lighting: string;
  audio?: string;
  interactions: VRInteraction[];
}

interface VRObject {
  id: string;
  name: string;
  type: 'data' | 'chart' | 'avatar' | 'interface' | 'decoration';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  opacity: number;
  interactive: boolean;
  data?: any;
}

interface VRInteraction {
  id: string;
  type: 'click' | 'hover' | 'grab' | 'voice' | 'gesture';
  target: string;
  action: string;
  feedback: string;
}

export default function ImmersiveARVR({ 
  organizationId, 
  onEnterVR, 
  onExitVR 
}: ImmersiveARVRProps) {
  const [vrState, setVrState] = useState<VRState>({
    isVRMode: false,
    isARMode: false,
    isFullscreen: false,
    isMuted: false,
    isPlaying: false,
    currentScene: 'dashboard',
    userPosition: { x: 0, y: 0, z: 0 },
    userRotation: { x: 0, y: 0, z: 0 },
    selectedObject: null,
    environment: 'office',
    lighting: 'day'
  });
  
  const [scenes, setScenes] = useState<VRScene[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [vrObjects, setVrObjects] = useState<VRObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();
  const vrDisplayRef = useRef<any>(null);

  useEffect(() => {
    initializeWebXR();
    loadVRScenes();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeWebXR = async () => {
    try {
      // Check WebXR support
      if ('xr' in navigator) {
        const supported = await (navigator as any).xr.isSessionSupported('immersive-vr');
        setIsSupported(supported);
        
        if (supported) {
          await initializeThreeJS();
          setIsInitialized(true);
        }
      } else {
        console.warn('WebXR not supported, falling back to 3D mode');
        await initializeThreeJS();
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Error initializing WebXR:', error);
      await initializeThreeJS();
      setIsInitialized(true);
    }
  };

  const initializeThreeJS = async () => {
    try {
      const THREE = await import('three');
      
      if (!canvasRef.current) return;

      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);
      sceneRef.current = scene;

      // Camera setup
      const camera = new THREE.PerspectiveCamera(
        75,
        canvasRef.current.clientWidth / canvasRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(0, 1.6, 3);
      cameraRef.current = camera;

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ 
        canvas: canvasRef.current,
        antialias: true,
        alpha: true 
      });
      renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.xr.enabled = true;
      rendererRef.current = renderer;

      // Lighting setup
      setupLighting(THREE, scene);

      // Create VR environment
      createVREnvironment(THREE, scene);

      // Start render loop
      animate(THREE);

      // Add VR button
      if (isSupported) {
        addVRButton(THREE, renderer);
      }
    } catch (error) {
      console.error('Error initializing Three.js:', error);
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
    scene.add(directionalLight);

    // Point lights for atmosphere
    const pointLight1 = new THREE.PointLight(0x8B5CF6, 0.5, 10);
    pointLight1.position.set(-3, 2, 3);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x06B6D4, 0.5, 10);
    pointLight2.position.set(3, 2, -3);
    scene.add(pointLight2);
  };

  const createVREnvironment = (THREE: any, scene: any) => {
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x2D1B69,
      transparent: true,
      opacity: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    floor.receiveShadow = true;
    scene.add(floor);

    // Create walls
    createWalls(THREE, scene);

    // Create floating data objects
    createDataObjects(THREE, scene);

    // Create interactive elements
    createInteractiveElements(THREE, scene);
  };

  const createWalls = (THREE: any, scene: any) => {
    const wallMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.3
    });

    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(20, 10);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.z = -10;
    backWall.position.y = 4;
    scene.add(backWall);

    // Side walls
    const sideWallGeometry = new THREE.PlaneGeometry(20, 10);
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -10;
    leftWall.position.y = 4;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = 10;
    rightWall.position.y = 4;
    scene.add(rightWall);
  };

  const createDataObjects = (THREE: any, scene: any) => {
    // Floating data cubes
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const material = new THREE.MeshLambertMaterial({ 
        color: new THREE.Color().setHSL(i / 5, 0.7, 0.5),
        transparent: true,
        opacity: 0.8
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(
        (Math.random() - 0.5) * 8,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 8
      );
      cube.castShadow = true;
      cube.userData = { type: 'data', id: `data-${i}` };
      scene.add(cube);
    }

    // Floating charts
    for (let i = 0; i < 3; i++) {
      const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8);
      const material = new THREE.MeshLambertMaterial({ 
        color: 0x8B5CF6,
        transparent: true,
        opacity: 0.7
      });
      const chart = new THREE.Mesh(geometry, material);
      chart.position.set(
        (Math.random() - 0.5) * 6,
        Math.random() * 2 + 2,
        (Math.random() - 0.5) * 6
      );
      chart.userData = { type: 'chart', id: `chart-${i}` };
      scene.add(chart);
    }
  };

  const createInteractiveElements = (THREE: any, scene: any) => {
    // AI Avatar in center
    const avatarGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const avatarMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B5CF6,
      transparent: true,
      opacity: 0.9
    });
    const avatar = new THREE.Mesh(avatarGeometry, avatarMaterial);
    avatar.position.set(0, 1.6, 0);
    avatar.userData = { type: 'avatar', id: 'ai-avatar' };
    scene.add(avatar);

    // Floating interface panels
    for (let i = 0; i < 4; i++) {
      const panelGeometry = new THREE.PlaneGeometry(2, 1.5);
      const panelMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x1a1a2e,
        transparent: true,
        opacity: 0.8
      });
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);
      panel.position.set(
        Math.cos(i * Math.PI / 2) * 3,
        2,
        Math.sin(i * Math.PI / 2) * 3
      );
      panel.lookAt(0, 2, 0);
      panel.userData = { type: 'interface', id: `panel-${i}` };
      scene.add(panel);
    }
  };

  const animate = (THREE: any) => {
    const animateLoop = () => {
      if (sceneRef.current && rendererRef.current && cameraRef.current) {
        // Rotate floating objects
        sceneRef.current.children.forEach((child: any) => {
          if (child.userData?.type === 'data') {
            child.rotation.x += 0.01;
            child.rotation.y += 0.01;
          }
          if (child.userData?.type === 'chart') {
            child.rotation.y += 0.02;
          }
        });

        // Render scene
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(animateLoop);
    };
    
    animateLoop();
  };

  const addVRButton = (THREE: any, renderer: any) => {
    const button = document.createElement('button');
    button.textContent = 'ENTER VR';
    button.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: #8B5CF6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      z-index: 1000;
    `;

    button.addEventListener('click', async () => {
      if (vrDisplayRef.current) {
        await enterVR();
      } else {
        console.log('VR display not available');
      }
    });

    document.body.appendChild(button);
  };

  const enterVR = async () => {
    try {
      if (isSupported && rendererRef.current) {
        const session = await (navigator as any).xr.requestSession('immersive-vr');
        rendererRef.current.xr.setSession(session);
        
        setVrState(prev => ({ ...prev, isVRMode: true }));
        onEnterVR?.();
      }
    } catch (error) {
      console.error('Error entering VR:', error);
    }
  };

  const exitVR = () => {
    if (rendererRef.current?.xr?.session) {
      rendererRef.current.xr.session.end();
      setVrState(prev => ({ ...prev, isVRMode: false }));
      onExitVR?.();
    }
  };

  const loadVRScenes = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/vr/scenes/${organizationId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setScenes(data);
      } else {
        // Create default scenes
        const defaultScenes = [
          {
            id: 'dashboard',
            name: 'AI Dashboard',
            description: 'Immersive business intelligence dashboard',
            objects: [],
            environment: 'office',
            lighting: 'day',
            interactions: []
          },
          {
            id: 'meeting',
            name: 'Virtual Meeting Room',
            description: 'Collaborate with AI avatars in virtual space',
            objects: [],
            environment: 'office',
            lighting: 'warm',
            interactions: []
          },
          {
            id: 'data-visualization',
            name: '3D Data Visualization',
            description: 'Explore data in three-dimensional space',
            objects: [],
            environment: 'abstract',
            lighting: 'neon',
            interactions: []
          }
        ];
        setScenes(defaultScenes);
      }
    } catch (error) {
      console.error('Error loading VR scenes:', error);
    }
  };

  const changeEnvironment = (environment: VRState['environment']) => {
    setVrState(prev => ({ ...prev, environment }));
    // Update scene environment
    if (sceneRef.current) {
      const colors = {
        office: 0x1a1a2e,
        space: 0x000011,
        nature: 0x0a2e0a,
        abstract: 0x2a1a4a,
        city: 0x1a1a2a
      };
      sceneRef.current.background = new (window as any).THREE.Color(colors[environment]);
    }
  };

  const changeLighting = (lighting: VRState['lighting']) => {
    setVrState(prev => ({ ...prev, lighting }));
    // Update scene lighting
    if (sceneRef.current) {
      const lights = sceneRef.current.children.filter((child: any) => child.type === 'DirectionalLight');
      lights.forEach((light: any) => {
        const colors = {
          day: 0xffffff,
          night: 0x404080,
          neon: 0x00ffff,
          warm: 0xffaa00,
          cool: 0x0088ff
        };
        light.color.setHex(colors[lighting]);
      });
    }
  };

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
  };

  const getObjectIcon = (type: string) => {
    const icons = {
      data: <BarChart3 className="w-4 h-4" />,
      chart: <Target className="w-4 h-4" />,
      avatar: <Brain className="w-4 h-4" />,
      interface: <Monitor className="w-4 h-4" />,
      decoration: <Star className="w-4 h-4" />
    };
    return icons[type as keyof typeof icons] || <Box className="w-4 h-4" />;
  };

  if (!isInitialized) {
    return (
      <AnimatedContainer>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white text-lg">Initializing Immersive Experience...</p>
          </div>
        </div>
      </AnimatedContainer>
    );
  }

  return (
    <AnimatedContainer>
      <div className="space-y-8 p-6">
        {/* Header */}
        <FadeIn delay={0.2}>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Eye className="w-8 h-8 text-purple-300" />
              </div>
              <h1 className="text-4xl font-bold text-white">Immersive AR/VR Experience</h1>
            </div>
            <p className="text-purple-200 text-lg">
              Step into the future of business interaction with WebXR technology
            </p>
          </div>
        </FadeIn>

        {/* VR Canvas */}
        <FadeIn delay={0.4}>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full h-96 rounded-xl border border-white/20 shadow-2xl"
              style={{ minHeight: '400px' }}
            />
            
            {/* VR Controls Overlay */}
            <div className="absolute top-4 left-4 flex space-x-2">
              {isSupported && (
                <button
                  onClick={vrState.isVRMode ? exitVR : enterVR}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    vrState.isVRMode
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {vrState.isVRMode ? 'Exit VR' : 'Enter VR'}
                </button>
              )}
              
              <button
                onClick={() => setVrState(prev => ({ ...prev, isARMode: !prev.isARMode }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  vrState.isARMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-purple-200'
                }`}
              >
                {vrState.isARMode ? 'Exit AR' : 'Enter AR'}
              </button>
            </div>

            {/* Environment Controls */}
            <div className="absolute top-4 right-4 flex space-x-2">
              <select
                value={vrState.environment}
                onChange={(e) => changeEnvironment(e.target.value as VRState['environment'])}
                className="px-3 py-2 bg-white/10 text-white rounded-lg text-sm border border-white/20"
              >
                <option value="office">Office</option>
                <option value="space">Space</option>
                <option value="nature">Nature</option>
                <option value="abstract">Abstract</option>
                <option value="city">City</option>
              </select>
              
              <select
                value={vrState.lighting}
                onChange={(e) => changeLighting(e.target.value as VRState['lighting'])}
                className="px-3 py-2 bg-white/10 text-white rounded-lg text-sm border border-white/20"
              >
                <option value="day">Day</option>
                <option value="night">Night</option>
                <option value="neon">Neon</option>
                <option value="warm">Warm</option>
                <option value="cool">Cool</option>
              </select>
            </div>
          </div>
        </FadeIn>

        {/* VR Scenes */}
        <FadeIn delay={0.6}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">VR Scenes</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenes.map((scene) => (
                <div
                  key={scene.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    vrState.currentScene === scene.id
                      ? 'bg-purple-600/20 border-purple-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => setVrState(prev => ({ ...prev, currentScene: scene.id }))}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Eye className="w-5 h-5 text-purple-300" />
                    </div>
                    <h3 className="font-semibold text-white">{scene.name}</h3>
                  </div>
                  <p className="text-purple-200 text-sm">{scene.description}</p>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </FadeIn>

        {/* VR Objects */}
        <FadeIn delay={0.8}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">VR Objects</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['data', 'chart', 'avatar', 'interface'].map((type) => (
                <div
                  key={type}
                  className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {getObjectIcon(type)}
                    <span className="text-white font-medium capitalize">{type}</span>
                  </div>
                  <p className="text-purple-200 text-sm">
                    {type === 'data' && 'Floating data cubes'}
                    {type === 'chart' && '3D visualizations'}
                    {type === 'avatar' && 'AI avatars'}
                    {type === 'interface' && 'Interactive panels'}
                  </p>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </FadeIn>

        {/* VR Status */}
        <FadeIn delay={1.0}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">VR Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                  isSupported ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <p className="text-purple-200 text-sm">WebXR Support</p>
                <p className="text-white font-medium">
                  {isSupported ? 'Supported' : 'Not Supported'}
                </p>
              </div>
              
              <div className="text-center">
                <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                  vrState.isVRMode ? 'bg-green-400' : 'bg-gray-400'
                }`}></div>
                <p className="text-purple-200 text-sm">VR Mode</p>
                <p className="text-white font-medium">
                  {vrState.isVRMode ? 'Active' : 'Inactive'}
                </p>
              </div>
              
              <div className="text-center">
                <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                  vrState.isARMode ? 'bg-green-400' : 'bg-gray-400'
                }`}></div>
                <p className="text-purple-200 text-sm">AR Mode</p>
                <p className="text-white font-medium">
                  {vrState.isARMode ? 'Active' : 'Inactive'}
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-3 h-3 rounded-full mx-auto mb-2 bg-blue-400"></div>
                <p className="text-purple-200 text-sm">Current Scene</p>
                <p className="text-white font-medium capitalize">
                  {vrState.currentScene}
                </p>
              </div>
            </div>
          </AnimatedCard>
        </FadeIn>
      </div>
    </AnimatedContainer>
  );
}

