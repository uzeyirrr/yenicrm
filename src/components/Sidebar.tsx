'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { pb } from '@/lib/pocketbase';
import {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  BookmarkIcon,
  UserCircleIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  TrophyIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const menuItems = [
  { name: 'Ana Sayfa', href: '/dashboard', icon: HomeIcon },
  { name: 'Kullanıcı Yönetimi', href: '/dashboard/users', icon: UsersIcon },
  { name: 'Takımlar', href: '/dashboard/teams', icon: UserGroupIcon },
  { name: 'Takvim', href: '/dashboard/calendar', icon: CalendarIcon },
  { name: 'Slot Yönetimi', href: '/dashboard/slots', icon: ClockIcon },
  { name: 'Randevu Kategorileri', href: '/dashboard/appointment-categories', icon: BookmarkIcon },
  { name: 'Müşteriler', href: '/dashboard/customers', icon: UserCircleIcon },
  { name: 'Ön Kalite Kontrol', href: '/dashboard/qc', icon: ClipboardDocumentCheckIcon },
  { name: 'Kalite Kontrol Final', href: '/dashboard/final-quality', icon: ClipboardDocumentListIcon },
  { name: 'Lider Tablosu', href: '/dashboard/leaderboard', icon: TrophyIcon },
  { name: 'Şirketler', href: '/dashboard/companies', icon: BuildingOfficeIcon },
  { name: 'Ayarlar', href: '/dashboard/settings', icon: Cog6ToothIcon },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const user = getCurrentUser();

  return (
    <div className={`bg-gray-800 text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} min-h-screen relative flex flex-col justify-between`}>
      <div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 bg-gray-800 rounded-full p-1 cursor-pointer"
        >
          {collapsed ? (
            <ChevronRightIcon className="h-4 w-4 text-white" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4 text-white" />
          )}
        </button>

        <div className="p-4">
          <div className={`font-bold text-xl mb-8 transition-opacity duration-200 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
            CRM Panel
          </div>
          <nav>
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-2 p-2 rounded-lg transition-colors duration-200
                        ${isActive 
                          ? 'bg-indigo-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                      <item.icon className={`h-6 w-6 ${collapsed ? 'mx-auto' : ''}`} />
                      <span className={`transition-opacity duration-200 ${collapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                        {item.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Profil Bölümü */}
      <div className="p-4 border-t border-gray-700">
        <Link
          href="/dashboard/profile"
          className={`flex items-center space-x-2 p-2 rounded-lg transition-colors duration-200
            ${pathname === '/dashboard/profile' 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-300 hover:bg-gray-700'
            }`}
        >
          <UserCircleIcon className={`h-8 w-8 ${collapsed ? 'mx-auto' : ''}`} />
          <div className={`transition-opacity duration-200 ${collapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
            <div className="font-medium">Admin</div>
            <div className="text-sm text-gray-400">Profili Görüntüle</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
