/**
 * Dashboard Layout - 3-tab navigation
 * Mobile: Bottom bar sticky
 * Desktop: Floating bottom navigation (like menu page)
 */

import React, { useState } from 'react';
import { USER_STATUS } from '@/lib/supabase/types/user.types';
import { Home, History, User } from 'lucide-react';

interface DashboardLayoutProps {
  children: (layoutData: any) => React.ReactNode;
  userStatus?: string;
  swapQuota?: { used: number; limit: number | null };
  onUpgrade?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function DashboardLayout({ children, userStatus, swapQuota, onUpgrade, activeTab, setActiveTab }: DashboardLayoutProps) {

  const isPremium = userStatus === USER_STATUS.PAID_ACTIVE;

  const tabs = [
    { id: 'menu', label: 'Menu', icon: Home },
    { id: 'historique', label: 'Historique', icon: History },
    { id: 'profil', label: 'Profil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF8]">
      {/* Main Content */}
      <main className="max-w-6xl mx-auto">
        {children({ isPremium, swapQuota })}
      </main>
    </div>
  );
}
