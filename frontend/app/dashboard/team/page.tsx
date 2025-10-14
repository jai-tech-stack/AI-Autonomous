'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { Users, Plus, Shield, Trash2, RefreshCw, LogOut } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface User { id: string; email: string; firstName?: string; lastName?: string; organizationId?: string }

export default function TeamPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (!token || !userData) { router.push('/login'); return; }
      const u = JSON.parse(userData);
      setUser(u);
      await loadMembers(u.organizationId);
      setLoading(false);
    };
    init();
  }, [router]);

  const loadMembers = async (orgId?: string) => {
    if (!orgId) return;
    const res = await apiClient.listMembers(orgId);
    if (res.success) setMembers((res.data as any).members || []);
  };

  const invite = async () => {
    if (!user?.organizationId || !inviteEmail) return;
    const res = await apiClient.inviteMember({ organizationId: user.organizationId, email: inviteEmail, role: inviteRole });
    if (res.success) { toast.success('Invited'); setInviteEmail(''); await loadMembers(user.organizationId); }
    else toast.error(res.error || 'Failed to invite');
  };

  const changeRole = async (member: any, role: 'member' | 'admin' | 'owner') => {
    if (!user?.organizationId) return;
    const res = await apiClient.changeMemberRole({ organizationId: user.organizationId, userId: member.userId, role });
    if (res.success) { toast.success('Role updated'); await loadMembers(user.organizationId); } else toast.error(res.error || 'Failed');
  };

  const removeMember = async (member: any) => {
    if (!user?.organizationId) return;
    const res = await apiClient.removeMember({ organizationId: user.organizationId, userId: member.userId });
    if (res.success) { toast.success('Removed'); await loadMembers(user.organizationId); } else toast.error(res.error || 'Failed');
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
              <Users className="w-6 h-6 text-white" />
              <h1 className="text-2xl font-bold text-white">Team Management</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => user?.organizationId && loadMembers(user.organizationId)} className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
          <h2 className="text-white font-semibold mb-4">Invite Member</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@company.com" className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)} className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={invite} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2">
              <Plus className="w-4 h-4" /> Invite
            </button>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-white font-semibold mb-4">Members</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-purple-200">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className="border-t border-white/10 text-white">
                    <td className="py-3">{m.user.firstName || '—'} {m.user.lastName || ''}</td>
                    <td className="py-3">{m.user.email}</td>
                    <td className="py-3 capitalize">{m.role}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => changeRole(m, 'member')} className="px-3 py-1 bg-white/10 rounded text-sm">Member</button>
                        <button onClick={() => changeRole(m, 'admin')} className="px-3 py-1 bg-white/10 rounded text-sm flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</button>
                        <button onClick={() => removeMember(m)} className="px-3 py-1 bg-red-600/80 hover:bg-red-600 rounded text-sm text-white flex items-center gap-1"><Trash2 className="w-3 h-3" /> Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}



