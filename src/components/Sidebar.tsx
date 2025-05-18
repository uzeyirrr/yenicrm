'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  ChevronRightIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// Rol bazlı menü öğeleri tanımı
const menuItems = [
  // Sadece admin için görünür
  { name: 'Ana Sayfa', href: '/dashboard', icon: HomeIcon, roles: ['admin'] },
  
  // Sadece admin için görünür
  { name: 'Kullanıcı Yönetimi', href: '/dashboard/users', icon: UsersIcon, roles: ['admin'] },
  { name: 'Takımlar', href: '/dashboard/teams', icon: UserGroupIcon, roles: ['admin'] },
  { name: 'Slot Yönetimi', href: '/dashboard/slots', icon: ClockIcon, roles: ['admin'] },
  
  // Admin ve qcmanager için görünür
  { name: 'Randevu Kategorileri', href: '/dashboard/appointment-categories', icon: BookmarkIcon, roles: ['admin', 'qcmanager'] },
  { name: 'Müşteriler', href: '/dashboard/customers', icon: UserCircleIcon, roles: ['admin', 'qcmanager'] },
  { name: 'Satış Kontrol', href: '/dashboard/sales', icon: ChartBarIcon, roles: ['admin', 'qcmanager'] },
  { name: 'Ön Kalite Kontrol', href: '/dashboard/qc', icon: ClipboardDocumentCheckIcon, roles: ['admin', 'qcmanager'] },
  { name: 'Kalite Kontrol Final', href: '/dashboard/final-quality', icon: ClipboardDocumentListIcon, roles: ['admin', 'qcmanager'] },
  
  // Herkes için görünür
  { name: 'Takvim', href: '/dashboard/calendar', icon: CalendarIcon, roles: ['admin', 'qcmanager', 'agent'] },
  { name: 'Lider Tablosu', href: '/dashboard/leaderboard', icon: TrophyIcon, roles: ['admin', 'qcmanager', 'agent'] },
  
  // Sadece admin için görünür
  { name: 'Şirketler', href: '/dashboard/companies', icon: BuildingOfficeIcon, roles: ['admin'] },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('agent'); // Varsayılan rol
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();
  
  // İstemci tarafında olduğumuzu belirle
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Kullanıcı profil bilgilerini yükle
  useEffect(() => {
    if (!isClient) return;
    
    const loadUserProfile = async () => {
      try {
        // Önce kullanıcının giriş yapmış olduğunu kontrol et
        if (!pb.authStore.isValid) return;
        
        // Kullanıcı detaylarını getir
        const userId = pb.authStore.model?.id;
        if (!userId) return;
        
        const userData = await pb.collection('users').getOne(userId, {
          expand: 'profile'
        });
        setUserProfile(userData);
        
        // Kullanıcı rolünü belirle
        const userRole = userData.role || 'agent';
        console.log('Kullanıcı rolü:', userRole);
        setUserRole(userRole);
      } catch (error) {
        console.error('Kullanıcı profili yüklenirken hata:', error);
      }
    };
    
    loadUserProfile();
  }, [isClient]);

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
              {menuItems
                // Kullanıcının rolüne göre menü öğelerini filtrele
                .filter(item => item.roles.includes(userRole))
                .map((item) => {
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
          {isClient && userProfile && userProfile.avatar ? (
            <div className={`relative h-10 w-10 overflow-hidden rounded-full ${collapsed ? 'mx-auto' : ''}`}>
              <Image 
                src={`${pb.baseUrl}/api/files/users/${userProfile.id}/${userProfile.avatar}`}
                alt={userProfile.name || 'Kullanıcı'}
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
          ) : (
            <UserCircleIcon className={`h-10 w-10 ${collapsed ? 'mx-auto' : ''}`} />
          )}
          
          <div className={`transition-opacity duration-200 ${collapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
            <div className="font-medium">{isClient && userProfile ? userProfile.name || pb.authStore.model?.email || 'Kullanıcı' : 'Kullanıcı'}</div>
            <div className="text-sm text-gray-400">Profili Görüntüle</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
