'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Crown, Zap, Users, Lock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface UsageLimitsProps {
  organizationId: string;
  userId: string;
  resource: string;
  onLimitReached?: () => void;
  children: React.ReactNode;
}

interface UsageData {
  usage: { [key: string]: number };
  limits: { [key: string]: number };
  plan: string;
  period: string;
}

export default function UsageLimits({ 
  organizationId, 
  userId, 
  resource, 
  onLimitReached,
  children 
}: UsageLimitsProps) {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetchUsageData();
  }, [organizationId]);

  const fetchUsageData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/usage/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsageData(data);
      }
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUsageLimit = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/usage/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId,
          resource,
          count: 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.canProceed) {
          setShowUpgradeModal(true);
          if (onLimitReached) {
            onLimitReached();
          }
          return false;
        }
        return true;
      }
    } catch (error) {
      console.error('Error checking usage limit:', error);
      toast.error('Failed to check usage limit');
    }
    return false;
  };

  const recordUsage = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/api/usage/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId,
          userId,
          resource,
          count: 1,
        }),
      });
    } catch (error) {
      console.error('Error recording usage:', error);
    }
  };

  const handleAction = async (action: () => void) => {
    const canProceed = await checkUsageLimit();
    if (canProceed) {
      action();
      await recordUsage();
      await fetchUsageData(); // Refresh usage data
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'free':
        return <Users className="w-4 h-4" />;
      case 'pro':
        return <Zap className="w-4 h-4" />;
      case 'enterprise':
        return <Crown className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'text-gray-400';
      case 'pro':
        return 'text-purple-400';
      case 'enterprise':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-700 rounded h-8 w-32"></div>;
  }

  if (!usageData) {
    return <>{children}</>;
  }

  const currentUsage = usageData.usage[resource] || 0;
  const limit = usageData.limits[resource] || 0;
  const percentage = limit > 0 ? (currentUsage / limit) * 100 : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  return (
    <>
      {/* Usage Indicator */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getPlanIcon(usageData.plan)}
            <span className={`text-sm font-medium ${getPlanColor(usageData.plan)}`}>
              {usageData.plan.charAt(0).toUpperCase() + usageData.plan.slice(1)} Plan
            </span>
          </div>
          <span className="text-sm text-gray-400">
            {currentUsage} / {limit} {resource}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isAtLimit
                ? 'bg-red-500'
                : isNearLimit
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        {isNearLimit && !isAtLimit && (
          <div className="flex items-center gap-2 mt-2 text-yellow-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            Approaching limit
          </div>
        )}
        {isAtLimit && (
          <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
            <Lock className="w-4 h-4" />
            Limit reached
          </div>
        )}
      </div>

      {/* Wrapped Children */}
      <div className={isAtLimit ? 'opacity-50 pointer-events-none' : ''}>
        {typeof children === 'function' ? children(handleAction) : children}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Upgrade Required</h3>
              <p className="text-gray-400">
                You've reached your {usageData.plan} plan limit for {resource}. 
                Upgrade to continue using this feature.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Pro Plan</span>
                  <span className="text-purple-400 font-bold">$29/month</span>
                </div>
                <div className="text-gray-400 text-sm">
                  {usageData.plan === 'free' ? '10x' : '5x'} more {resource} per month
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Enterprise Plan</span>
                  <span className="text-yellow-400 font-bold">$99/month</span>
                </div>
                <div className="text-gray-400 text-sm">
                  Unlimited {resource} + premium features
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  window.location.href = '/pricing';
                }}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
