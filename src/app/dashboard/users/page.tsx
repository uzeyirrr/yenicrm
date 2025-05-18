'use client';

import React, { useState, useEffect } from 'react';
import { getUsers, User } from '@/lib/userService';
import { getTeams, Team } from '@/lib/teamService';
import { getCustomers } from '@/lib/customerService';
import { useRouter } from 'next/navigation';
import { Loader2, Edit, Trash, UserPlus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { pb, ensureAuth } from '@/lib/pocketbase';

type ExtendedUser = User & {
  teamName: string;
  customerCount: number;
  role?: string;
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      
      // Ensure we're authenticated
      await ensureAuth();
      
      // Load users, teams, and customers in parallel
      const [usersList, teamsList, customersList] = await Promise.all([
        getUsers(),
        getTeams(),
        getCustomers()
      ]);
      
      // Process users with team info and customer count
      const extendedUsers = usersList.map((user) => {
        // Find user's team
        const userTeam = teamsList.find(
          (team) => team.leader.id === user.id || team.members.some((member) => member.id === user.id)
        );
        
        // Count customers assigned to this user
        const userCustomers = customersList.filter((customer) => customer.agent === user.id);
        
        return {
          ...user,
          teamName: userTeam?.name || 'Takım Yok',
          customerCount: userCustomers.length
        };
      });
      
      setUsers(extendedUsers);
      setTeams(teamsList);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Veri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
      return;
    }
    
    try {
      await ensureAuth();
      await pb.collection('users').delete(userId);
      // Refresh the list
      await loadData();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Kullanıcı silinirken bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kullanıcılar</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Yenile
          </Button>
          <Button asChild>
            <Link href="/dashboard/users/new">
              <UserPlus className="h-4 w-4 mr-2" />
              Yeni Kullanıcı
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Takım
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Müşteri Sayısı
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.avatar ? (
                            <img
                              className="h-10 w-10 rounded-full"
                              src={`${pb.baseUrl}/api/files/users/${user.id}/${user.avatar}`}
                              alt={user.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 font-medium">
                                {user.name.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {user.role || 'Kullanıcı'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.teamName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.customerCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/users/${user.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Düzenle
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash className="h-4 w-4 mr-1" />
                          Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    Kullanıcı bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
