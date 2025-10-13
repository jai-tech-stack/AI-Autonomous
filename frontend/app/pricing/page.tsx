'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Check,
  X,
  Star,
  Zap,
  Crown,
  Users,
  ArrowRight,
  CreditCard
} from 'lucide-react';

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    {
      name: 'Free',
      price: 0,
      period: 'forever',
      description: 'Perfect for getting started',
      icon: Users,
      color: 'from-gray-500 to-gray-600',
      features: [
        '5 AI tasks per month',
        'Basic dashboard',
        'Email support',
        '1 integration',
        'Standard templates'
      ],
      limitations: [
        'Limited analytics',
        'No priority support',
        'Basic AI capabilities'
      ],
      buttonText: 'Get Started Free',
      popular: false
    },
    {
      name: 'Pro',
      price: 29,
      period: 'month',
      description: 'For growing businesses',
      icon: Zap,
      color: 'from-purple-500 to-indigo-600',
      features: [
        '50 AI tasks per month',
        'Advanced dashboard',
        'Priority support',
        '5 integrations',
        'Custom templates',
        'Analytics & insights',
        'Content calendar',
        'CRM features'
      ],
      limitations: [],
      buttonText: 'Start Pro Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 99,
      period: 'month',
      description: 'For large organizations',
      icon: Crown,
      color: 'from-yellow-500 to-orange-600',
      features: [
        'Unlimited AI tasks',
        'Full platform access',
        '24/7 dedicated support',
        'Unlimited integrations',
        'Custom AI training',
        'Advanced analytics',
        'Team collaboration',
        'API access',
        'Custom branding',
        'SLA guarantee'
      ],
      limitations: [],
      buttonText: 'Contact Sales',
      popular: false
    }
  ];

  const handleSubscribe = async (planName: string) => {
    setLoading(planName);
    
    try {
      const response = await fetch('http://localhost:5000/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: planName.toLowerCase(),
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">AI CEO Platform</h1>
              <nav className="hidden md:flex space-x-6">
                <a href="/" className="text-purple-200 hover:text-white">Home</a>
                <a href="/login" className="text-purple-200 hover:text-white">Login</a>
                <a href="/register" className="text-purple-200 hover:text-white">Register</a>
                <a href="/pricing" className="text-white hover:text-purple-200">Pricing</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/login"
                className="px-4 py-2 text-white hover:text-purple-200 transition-colors"
              >
                Sign In
              </a>
              <a
                href="/register"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Choose Your AI CEO Plan
          </h1>
          <p className="text-xl text-purple-200 mb-8 max-w-3xl mx-auto">
            Scale your business with AI-powered automation. Start free and upgrade as you grow.
          </p>
          <div className="flex items-center justify-center space-x-4 text-purple-200">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-400" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-400" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-400" />
              <span>No setup fees</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => {
            const IconComponent = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 transition-all duration-300 hover:scale-105 ${
                  plan.popular
                    ? 'border-purple-400 shadow-2xl shadow-purple-500/25'
                    : 'border-white/20 hover:border-white/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-2 rounded-full text-sm font-medium flex items-center space-x-2">
                      <Star className="w-4 h-4" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${plan.color} mb-4`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-purple-200 mb-4">{plan.description}</p>
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-white">${plan.price}</span>
                    <span className="text-purple-200">/{plan.period}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-white">{feature}</span>
                    </div>
                  ))}
                  {plan.limitations.map((limitation, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <span className="text-purple-300">{limitation}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={loading === plan.name}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center space-x-2 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.name ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <span>{plan.buttonText}</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Can I change plans anytime?
              </h3>
              <p className="text-purple-200">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing differences.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">
                What happens to my data if I cancel?
              </h3>
              <p className="text-purple-200">
                Your data is safe with us. You can export all your data before canceling, and we'll keep it for 30 days in case you want to reactivate.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Do you offer custom enterprise plans?
              </h3>
              <p className="text-purple-200">
                Absolutely! Contact our sales team for custom pricing, dedicated support, and enterprise features tailored to your organization's needs.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Is there a free trial?
              </h3>
              <p className="text-purple-200">
                Yes! All paid plans come with a 14-day free trial. No credit card required to start, and you can cancel anytime during the trial.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-purple-200 mb-8">
            Join thousands of businesses already using AI CEO Platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/register"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="/dashboard"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-lg transition-all duration-300 border border-white/20 hover:border-white/30"
            >
              View Demo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
