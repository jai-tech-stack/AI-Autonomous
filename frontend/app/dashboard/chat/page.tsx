'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Send, 
  LogOut,
  Bot,
  User,
  Loader2
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (!token || !userData) {
        router.push('/login');
        return;
      }

      try {
        const userObj = JSON.parse(userData);
        setUser(userObj);
        if (userObj.organizationId) {
          await fetchMessages(userObj.organizationId);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (organizationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/chat/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.slice(-50)); // Show last 50 messages
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !user?.organizationId || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId: user.organizationId,
          message: inputMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">AI CEO Platform</h1>
              <nav className="hidden md:flex space-x-6">
                <a href="/dashboard" className="text-purple-200 hover:text-white">Dashboard</a>
                <a href="/dashboard/tasks" className="text-purple-200 hover:text-white">Tasks</a>
                <a href="/dashboard/chat" className="text-white hover:text-purple-200">Chat</a>
                <a href="/dashboard/analytics" className="text-purple-200 hover:text-white">Analytics</a>
                <a href="/dashboard/crm" className="text-purple-200 hover:text-white">CRM</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white">Welcome, {user?.firstName}</span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6">
        {/* Chat Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Bot className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI CEO Assistant</h2>
              <p className="text-purple-200 text-sm">Your intelligent business advisor</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-purple-500/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-purple-300" />
                </div>
                <h4 className="text-white font-medium mb-2">Start a conversation</h4>
                <p className="text-purple-200 text-sm mb-4">
                  Ask your AI CEO anything about your business
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => setInputMessage("What should I focus on this week?")}
                    className="block w-full text-left px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-purple-200 hover:text-white transition-colors"
                  >
                    What should I focus on this week?
                  </button>
                  <button
                    onClick={() => setInputMessage("Analyze my recent performance")}
                    className="block w-full text-left px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-purple-200 hover:text-white transition-colors"
                  >
                    Analyze my recent performance
                  </button>
                  <button
                    onClick={() => setInputMessage("Help me plan my marketing strategy")}
                    className="block w-full text-left px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-purple-200 hover:text-white transition-colors"
                  >
                    Help me plan my marketing strategy
                  </button>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === 'assistant' && (
                        <Bot className="w-4 h-4 text-purple-300 mt-1 flex-shrink-0" />
                      )}
                      {message.role === 'user' && (
                        <User className="w-4 h-4 text-purple-200 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-purple-200' : 'text-purple-300'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-white border border-white/20 max-w-xs lg:max-w-md px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4 text-purple-300" />
                    <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
                    <span className="text-sm">AI CEO is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-6 border-t border-white/20">
            <div className="flex space-x-4">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask your AI CEO anything..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={2}
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
