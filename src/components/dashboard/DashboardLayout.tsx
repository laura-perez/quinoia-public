/**
 * Dashboard Layout - 3-tab navigation
 * Mobile: Bottom bar sticky
 * Desktop: Floating bottom navigation (like menu page)
 */

import React, { useState } from 'react';
import { Home, History, User } from 'lucide-react';

interface DashboardLayoutProps {
  children: (activeTab: string, setActiveTab: (tab: string) => void) => React.ReactNode;
  userStatus?: string;
  swapQuota?: { used: number; limit: number | null };
  onUpgrade?: () => void;
}

export function DashboardLayout({ children, userStatus, swapQuota, onUpgrade }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState('menu');

  const isPremium = userStatus === 'paid_active';

  const tabs = [
    { id: 'menu', label: 'Menu', icon: Home },
    { id: 'historique', label: 'Historique', icon: History },
    { id: 'profil', label: 'Profil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF8] pb-20 lg:pb-0">
      {/* Main Content */}
      <main className="max-w-6xl mx-auto">
        {children(activeTab, setActiveTab, { isPremium, swapQuota })}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#EAEAEA] px-2 py-2 z-50">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                activeTab === id ? 'bg-[#FFF6DC]' : ''
              }`}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: activeTab === id ? '#F4C95D' : '#8A8A8A' }}
              />
              <span
                className="text-xs font-medium"
                style={{
                  color: activeTab === id ? '#F4C95D' : '#8A8A8A',
                  fontWeight: activeTab === id ? 600 : 500,
                }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop Floating Bottom Navigation */}
      <div className="hidden lg:block fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div
          className="flex gap-2 bg-white rounded-full px-4 py-2 shadow-lg"
          style={{ backgroundColor: '#FFFDF8', border: '1px solid rgba(234, 234, 234, 0.3)' }}
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 py-2 px-4 rounded-full min-h-[44px] transition-colors"
              style={{
                backgroundColor: activeTab === id ? '#F4C95D' : 'transparent',
                color: activeTab === id ? '#414535' : '#8A8A8A'
              }}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
