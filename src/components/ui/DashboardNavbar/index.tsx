import Link from 'next/link';
import Brand from '../Brand';
import React from 'react';

interface Props {
  statusBadge: React.ReactNode;
  userAvatar?: React.ReactNode | null;
}

export default function DashboardNavbar({ statusBadge, userAvatar = null }: Props) {
  return (
    <header
      className="bg-[#FDFBF8] border-b border-[#EAEAEA] text-[#414535] sticky top-0 z-50 backdrop-blur bg-opacity-90 transition-shadow duration-300"
      id="navbar-dashboard"
    >
      <nav className="custom-screen py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Brand />
        </Link>

        <div className="flex items-center gap-3">
          <div>{statusBadge}</div>
          {userAvatar && <div className="ml-2">{userAvatar}</div>}
        </div>
      </nav>
    </header>
  );
}
