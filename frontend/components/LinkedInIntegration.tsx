'use client';

import { useState } from 'react';
import { Linkedin, ExternalLink, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface LinkedInIntegrationProps {
  organizationId: string;
  taskId?: string;
  content?: any;
}

export default function LinkedInIntegration({ organizationId, taskId, content }: LinkedInIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const checkConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/integrations/linkedin/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
      }
    } catch (error) {
      console.error('Error checking LinkedIn connection:', error);
    }
  };

  const connectLinkedIn = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/integrations/linkedin/connect', {
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
        toast.success('LinkedIn connected successfully!');
      } else {
        throw new Error('Failed to connect LinkedIn');
      }
    } catch (error) {
      console.error('Error connecting LinkedIn:', error);
      toast.error('Failed to connect LinkedIn');
    } finally {
      setLoading(false);
    }
  };

  const postToLinkedIn = async () => {
    if (!taskId || !content) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/integrations/linkedin/post', {
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
        toast.success('Posted to LinkedIn successfully!');
        return data;
      } else {
        throw new Error('Failed to post to LinkedIn');
      }
    } catch (error) {
      console.error('Error posting to LinkedIn:', error);
      toast.error('Failed to post to LinkedIn');
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
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Linkedin className="w-4 h-4" />
          <span>Connect LinkedIn</span>
        </button>

        {showConnectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Linkedin className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Connect LinkedIn</h3>
                <p className="text-gray-400">
                  Connect your LinkedIn account to automatically post content and track engagement.
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
                  <span>Schedule posts for optimal times</span>
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
                  onClick={connectLinkedIn}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Linkedin className="w-4 h-4" />
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
      onClick={postToLinkedIn}
      disabled={loading}
      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      ) : (
        <>
          <Linkedin className="w-4 h-4" />
          <span>Post to LinkedIn</span>
        </>
      )}
    </button>
  );
}
