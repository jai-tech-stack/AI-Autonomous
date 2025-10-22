'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, RefreshCcw, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { AnimatedContainer, AnimatedCard, FadeIn } from '@/components/ui/Animated';

type Task = {
  id: string;
  organizationId: string;
  taskType: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  input: any;
  output?: any;
  error?: string | null;
  scheduledFor?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

export default function TaskDetailsPage() {
  const params = useParams<{ taskId: string }>();
  const router = useRouter();
  const taskId = params?.taskId;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!res.ok) throw new Error('Failed to load task');
      const data = await res.json();
      setTask(data);
    } catch (e: any) {
      toast.error(e?.message || 'Unable to load task');
    } finally {
      setLoading(false);
    }
  };

  const retryTask = async () => {
    if (!task) return;
    try {
      setRetrying(true);
      const res = await fetch(`http://localhost:5000/api/tasks/${task.id}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!res.ok) throw new Error('Failed to retry task');
      toast.success('Task re-queued');
      await fetchTask();
    } catch (e: any) {
      toast.error(e?.message || 'Retry failed');
    } finally {
      setRetrying(false);
    }
  };

  const statusBadge = (status: Task['status']) => {
    const common = 'px-2 py-1 rounded-full text-xs font-medium';
    if (status === 'COMPLETED') return <span className={`${common} bg-green-500/20 text-green-300`}>Completed</span>;
    if (status === 'FAILED') return <span className={`${common} bg-red-500/20 text-red-300`}>Failed</span>;
    if (status === 'IN_PROGRESS') return <span className={`${common} bg-blue-500/20 text-blue-300`}>In Progress</span>;
    return <span className={`${common} bg-gray-500/20 text-gray-300`}>Pending</span>;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading task…</span>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg p-4">
          Task not found.
        </div>
      </div>
    );
  }

  return (
    <AnimatedContainer>
      <div className="p-6 space-y-6">
        <FadeIn delay={0.2}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Task Details</h1>
              <p className="text-sm text-purple-200">ID: {task.id}</p>
            </div>
            <div className="flex items-center space-x-3">
              {statusBadge(task.status)}
              <button
                onClick={retryTask}
                disabled={retrying}
                className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-md text-sm"
              >
                <RefreshCcw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                <span>{retrying ? 'Retrying…' : 'Retry'}</span>
              </button>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <h2 className="text-white font-medium mb-3">Overview</h2>
              <div className="text-sm text-purple-200 space-y-2">
                <div><span className="text-white">Type:</span> {task.taskType}</div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
                </div>
                {task.startedAt && (
                  <div>Started: {new Date(task.startedAt).toLocaleString()}</div>
                )}
                {task.completedAt && (
                  <div>Completed: {new Date(task.completedAt).toLocaleString()}</div>
                )}
              </div>
            </AnimatedCard>

            <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <h2 className="text-white font-medium mb-3">Status</h2>
              <div className="flex items-center space-x-3 text-sm">
                {task.status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                {task.status === 'FAILED' && <XCircle className="w-4 h-4 text-red-400" />}
                <span className="text-purple-200">{task.status}</span>
              </div>
              {task.error && (
                <div className="mt-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 p-3 rounded">
                  {task.error}
                </div>
              )}
            </AnimatedCard>
          </div>
        </FadeIn>

        <FadeIn delay={0.6}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <h2 className="text-white font-medium mb-3">Input</h2>
              <pre className="text-xs text-purple-200 whitespace-pre-wrap break-words">{JSON.stringify(task.input, null, 2)}</pre>
            </AnimatedCard>
            <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <h2 className="text-white font-medium mb-3">Output</h2>
              <pre className="text-xs text-purple-200 whitespace-pre-wrap break-words">{JSON.stringify(task.output || {}, null, 2)}</pre>
            </AnimatedCard>
          </div>
        </FadeIn>

        <FadeIn delay={0.8}>
          <AnimatedCard className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
            <h2 className="text-white font-medium mb-3">Next steps</h2>
            <ul className="list-disc pl-5 text-sm text-purple-200 space-y-1">
              <li>Use Retry if the task failed or is stuck.</li>
              <li>Navigate back to the Content Calendar to schedule output if applicable.</li>
              <li>Check AI Insights in AI Studio to analyze outcomes.</li>
            </ul>
          </AnimatedCard>
        </FadeIn>
      </div>
    </AnimatedContainer>
  );
}





