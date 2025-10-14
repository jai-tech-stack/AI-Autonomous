'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { Mic, Image as ImageIcon, LogOut } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface User { id: string; email: string; firstName?: string; lastName?: string; organizationId?: string }

export default function AIStudioPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (!token || !userData) { router.push('/login'); return; }
      const u = JSON.parse(userData);
      setUser(u);
      setLoading(false);
    };
    init();
  }, [router]);

  const doTranscribe = async () => {
    if (!audioUrl) return;
    const res = await apiClient.transcribeWhisper({ audioUrl });
    if (res.success) { setTranscript((res.data as any).transcript || ''); toast.success('Transcribed'); }
    else toast.error(res.error || 'Failed');
  };

  const doGenerate = async () => {
    if (!prompt) return;
    const res = await apiClient.generateDalle({ prompt });
    if (res.success) { setImageUrl((res.data as any).imageUrl || ''); toast.success('Generated'); }
    else toast.error(res.error || 'Failed');
  };

  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/login'); };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <Toaster position="top-right" />

      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Mic className="w-6 h-6 text-white" />
              <h1 className="text-2xl font-bold text-white">AI Studio</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid md:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Mic className="w-5 h-5" /> Whisper Transcription</h2>
          <input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="Public audio URL" className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 mb-3" />
          <button onClick={doTranscribe} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">Transcribe</button>
          {transcript && (
            <div className="mt-4 p-3 bg-black/30 rounded-lg text-white text-sm whitespace-pre-wrap">{transcript}</div>
          )}
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5" /> DALL·E Image</h2>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the image to generate" className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 mb-3" rows={4} />
          <button onClick={doGenerate} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">Generate</button>
          {imageUrl && (
            <div className="mt-4">
              <img src={imageUrl} alt="Generated" className="rounded-lg border border-white/20" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}



