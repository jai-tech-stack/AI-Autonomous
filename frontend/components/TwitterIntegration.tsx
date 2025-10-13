'use client';

import { useState } from 'react';
import { Twitter, ExternalLink, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface TwitterIntegrationProps {
  organizationId: string;
  taskId?: string;
  content?: any;
}

export default function TwitterIntegration({ organizationId, taskId, content }: TwitterIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const checkConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/integrations/twitter/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
      }
    } catch (error) {
      console.error('Error checking Twitter connection:', error);
    }
  };

  const connectTwitter = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/integrations/twitter/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ organizationId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          window.open(data.authUrl, '_blank');
        }
        setIsConnected(true);
        setShowConnectModal(false);
        toast.success('Twitter connected successfully!');
      } else {
        throw new Error('Failed to connect Twitter');
      }
    } catch (error) {
      console.error('Error connecting Twitter:', error);
      toast.error('Failed to connect Twitter');
    } finally {
      setLoading(false);
    }
  };

  const postToTwitter = async () => {
    if (!taskId || !content) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/integrations/twitter/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId,
          taskId,
          content: typeof content === 'object' ? content.text : content,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Posted to Twitter successfully!');
        return data;
      } else {
        throw new Error('Failed to post to Twitter');
      }
    } catch (error) {
      console.error('Error posting to Twitter:', error);
      toast.error('Failed to post to Twitter');
    } finally {
      setLoading(false);
    }
  };

  // Check connection on mount
  useState(() => {
    checkConnection();
  });

  if (!isConnected) {
    return (
      <>
        <button
          onClick={() => setShowConnectModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
        >
          <Twitter className="w-4 h-4" />
          <span>Connect Twitter</span>
        </button>

        {showConnectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Twitter className="w-8 h-8 text-sky-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Connect Twitter</h3>
                <p className="text-gray-400">
                  Connect your Twitter account to automatically post content and track engagement.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-3 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Automatically post generated content</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Track engagement metrics</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Create Twitter threads</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={connectTwitter}
                  disabled={loading}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Twitter className="w-4 h-4" />
                      <span>Connect</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      onClick={postToTwitter}
      disabled={loading}
      className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg transition-colors"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      ) : (
        <>
          <Twitter className="w-4 h-4" />
          <span>Post to Twitter</span>
        </>
      )}
    </button>
  );
}
