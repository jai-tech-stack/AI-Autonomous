'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { Link2, Copy, BarChart2, RefreshCw, LogOut } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface User { id: string; email: string; firstName?: string; lastName?: string; organizationId?: string }

export default function ReferralsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string>('');
  const [stats, setStats] = useState<any>({ clicks: 0, signups: 0 });

  useEffect(() => { setMounted(true); }, []);

  const loadReferrals = async (orgId?: string) => {
    if (!orgId) return;
    const res = await apiClient.getReferralStats(orgId);
    if (res.success) {
      const d = res.data as any;
      setCode(d.code || '');
      setStats(d.stats || { clicks: 0, signups: 0 });
    }
  };

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (!token || !userData) { router.push('/login'); return; }
      const u = JSON.parse(userData);
      setUser(u);
      await loadReferrals(u.organizationId);
      setLoading(false);
    };
    init();
  }, [router]);

  const createOrGetCode = async () => {
    if (!user?.organizationId) return;
    const res = await apiClient.getOrCreateReferralCode({ organizationId: user.organizationId });
    if (res.success) {
      const d = res.data as any;
      setCode(d.code);
      toast.success('Referral code ready');
    } else {
      toast.error(res.error || 'Failed');
    }
  };

  const copyLink = async () => {
    if (!code) return;
    const link = `${window.location.origin}/register?ref=${code}`;
    await navigator.clipboard.writeText(link);
    toast.success('Copied!');
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
              <Link2 className="w-6 h-6 text-white" />
              <h1 className="text-2xl font-bold text-white">Referral Program</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => user?.organizationId && loadReferrals(user.organizationId)} className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
          <h2 className="text-white font-semibold mb-4">Your Referral Link</h2>
          {code ? (
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white truncate">
                {`${window.location.origin}/register?ref=${code}`}
              </div>
              <button onClick={copyLink} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2">
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
          ) : (
            <button onClick={createOrGetCode} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
              Generate Referral Link
            </button>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><BarChart2 className="w-5 h-5" /> Performance</h2>
          <div className="grid grid-cols-2 gap-4 text-white">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-purple-200 text-sm">Clicks</div>
              <div className="text-3xl font-bold">{stats?.clicks || 0}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-purple-200 text-sm">Signups</div>
              <div className="text-3xl font-bold">{stats?.signups || 0}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}



