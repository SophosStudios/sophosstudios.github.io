import { useState } from 'react';
import { Check } from 'lucide-react';

interface PricingFeature {
  name: string;
  basic: boolean;
  pro: boolean;
  enterprise: boolean;
  tooltip?: string;
}

const features: PricingFeature[] = [
  { name: "Projects", basic: true, pro: true, enterprise: true, tooltip: "Number of active projects" },
  { name: "Team members", basic: true, pro: true, enterprise: true, tooltip: "Collaborate with team members" },
  { name: "Custom domain", basic: false, pro: true, enterprise: true, tooltip: "Use your own domain name" },
  { name: "Analytics", basic: false, pro: true, enterprise: true, tooltip: "Detailed project analytics" },
  { name: "24/7 Support", basic: false, pro: false, enterprise: true, tooltip: "Priority support channel" },
  { name: "API Access", basic: false, pro: true, enterprise: true, tooltip: "Full API access with documentation" },
  { name: "Custom integrations", basic: false, pro: false, enterprise: true, tooltip: "Build custom integrations" }
];

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const prices = {
    basic: { monthly: 29, annual: 290 },
    pro: { monthly: 79, annual: 790 },
    enterprise: { monthly: 199, annual: 1990 }
  };

  return (
    <section id="pricing" className="py-24 bg-gradient-to-br from-[#0F1535] via-[#1A225A] to-[#221F67] text-white">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">💳 Simple, Transparent Pricing</h2>
          <p className="text-purple-200 max-w-2xl mx-auto text-lg">
            Choose the perfect plan for your needs. No hidden fees.
          </p>
          <div className="mt-8 inline-flex bg-white/10 p-1 rounded-full">
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                !isAnnual ? 'bg-purple-600 text-white' : 'text-purple-300 hover:text-white'
              }`}
              onClick={() => setIsAnnual(false)}
            >
              Monthly
            </button>
            <button
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                isAnnual ? 'bg-purple-600 text-white' : 'text-purple-300 hover:text-white'
              }`}
              onClick={() => setIsAnnual(true)}
            >
              Annually <span className="ml-1 text-xs text-purple-200">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Basic Plan */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-purple-500/40 transition-all duration-300">
            <h3 className="text-xl font-semibold mb-2">Basic</h3>
            <p className="text-purple-300 mb-6">Perfect for starters</p>
            <div className="mb-6 text-4xl font-bold text-white">
              ${isAnnual ? prices.basic.annual : prices.basic.monthly}
              <span className="text-base font-medium text-purple-300 ml-1">/{isAnnual ? 'year' : 'month'}</span>
            </div>
            <button className="w-full bg-white/10 hover:bg-white/20 text-white rounded-lg px-6 py-3 transition-all duration-300 shadow">
              Get Started
            </button>
            <div className="mt-6 space-y-3 text-sm">
              {features.map((feature, index) => (
                <div key={index} className={`relative flex items-center gap-2 ${feature.basic ? 'text-white' : 'text-purple-400/40'}`}>
                  {feature.basic ? <Check size={18} className="text-purple-400" /> : <span className="w-[18px]" />}
                  <span>{feature.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Plan */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border-2 border-purple-500 transform hover:scale-[1.03] transition-all relative shadow-xl">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-purple-600 text-white text-xs font-medium px-4 py-1 rounded-full">
                Most Popular
              </span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Pro</h3>
            <p className="text-purple-300 mb-6">For growing businesses</p>
            <div className="mb-6 text-4xl font-bold text-white">
              ${isAnnual ? prices.pro.annual : prices.pro.monthly}
              <span className="text-base font-medium text-purple-300 ml-1">/{isAnnual ? 'year' : 'month'}</span>
            </div>
            <button className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-medium rounded-lg px-6 py-3 transition-all duration-300">
              Get Started
            </button>
            <div className="mt-6 space-y-3 text-sm">
              {features.map((feature, index) => (
                <div key={index} className={`flex items-center gap-2 ${feature.pro ? 'text-white' : 'text-purple-400/40'}`}>
                  {feature.pro ? <Check size={18} className="text-purple-400" /> : <span className="w-[18px]" />}
                  <span>{feature.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-purple-500/40 transition-all duration-300">
            <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
            <p className="text-purple-300 mb-6">For large organizations</p>
            <div className="mb-6 text-4xl font-bold text-white">
              ${isAnnual ? prices.enterprise.annual : prices.enterprise.monthly}
              <span className="text-base font-medium text-purple-300 ml-1">/{isAnnual ? 'year' : 'month'}</span>
            </div>
            <button className="w-full bg-white/10 hover:bg-white/20 text-white rounded-lg px-6 py-3 transition-all duration-300 shadow">
              Contact Sales
            </button>
            <div className="mt-6 space-y-3 text-sm">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`relative flex items-center gap-2 ${feature.enterprise ? 'text-white' : 'text-purple-400/40'}`}
                  onMouseEnter={() => setHoveredFeature(feature.name)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  {feature.enterprise ? <Check size={18} className="text-purple-400" /> : <span className="w-[18px]" />}
                  <span>{feature.name}</span>
                  {feature.tooltip && hoveredFeature === feature.name && (
                    <span className="absolute left-full ml-2 px-3 py-2 text-xs text-white bg-purple-600/80 rounded-lg shadow-md animate-fade-in z-50">
                      {feature.tooltip}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
