'use client';

import React, { useState, useEffect } from 'react';
import { getUsers, User } from '@/lib/userService';
import { getTeams, Team } from '@/lib/teamService';
import { getCustomers } from '@/lib/customerService';
import { Customer } from '@/lib/types';
import { Loader2, Trophy, Medal, Award } from 'lucide-react';
import { pb, ensureAuth } from '@/lib/pocketbase';

// Lider tablosu için kullanıcı tipi
type LeaderboardUser = User & {
  okeyCustomerCount: number;
};

// Lider tablosu için takım tipi
type LeaderboardTeam = Team & {
  okeyCustomerCount: number;
};

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [teams, setTeams] = useState<LeaderboardTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      
      // Okey durumundaki müşterileri filtrele
      const okeyCustomers = customersList.filter(customer => customer.qc_final === 'Okey');
      
      // Kullanıcıların Okey müşteri sayılarını hesapla
      const usersWithScore = usersList.map(user => {
        const userOkeyCustomers = okeyCustomers.filter(customer => customer.agent === user.id);
        return {
          ...user,
          okeyCustomerCount: userOkeyCustomers.length
        };
      });
      
      // Takımların Okey müşteri sayılarını hesapla
      const teamsWithScore = teamsList.map(team => {
        // Takım üyelerinin ID'lerini topla (lider dahil)
        const teamMemberIds = [
          team.leader.id,
          ...team.members.map(member => member.id)
        ];
        
        // Takım üyelerinin Okey müşterilerini say
        const teamOkeyCustomers = okeyCustomers.filter(
          customer => teamMemberIds.includes(customer.agent)
        );
        
        return {
          ...team,
          okeyCustomerCount: teamOkeyCustomers.length
        };
      });
      
      // Sıralama yap - en çok Okey müşterisi olana göre
      const sortedUsers = [...usersWithScore].sort((a, b) => b.okeyCustomerCount - a.okeyCustomerCount);
      const sortedTeams = [...teamsWithScore].sort((a, b) => b.okeyCustomerCount - a.okeyCustomerCount);
      
      setUsers(sortedUsers);
      setTeams(sortedTeams);
    } catch (err) {
      console.error('Error loading leaderboard data:', err);
      setError('Veri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  // Sıralama için rozet gösterimi
  const getRankBadge = (index: number) => {
    if (index === 0) {
      return <Trophy className="h-6 w-6 text-yellow-500" />;
    } else if (index === 1) {
      return <Medal className="h-6 w-6 text-gray-400" />;
    } else if (index === 2) {
      return <Award className="h-6 w-6 text-amber-700" />;
    }
    return <span className="text-gray-500 font-bold">{index + 1}</span>;
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
      <h1 className="text-2xl font-bold mb-6">Lider Tablosu</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Takımlar Sıralaması */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <h2 className="text-lg font-semibold text-blue-800">Takımlar Sıralaması</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sıra
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Takım
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lider
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Okey Müşteri
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teams.length > 0 ? (
                  teams.map((team, index) => (
                    <tr 
                      key={team.id}
                      className={index < 3 ? 'bg-blue-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {getRankBadge(index)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {team.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {team.leader.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-blue-600">
                          {team.okeyCustomerCount}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      Takım bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kullanıcılar Sıralaması */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-green-50 border-b border-green-100">
            <h2 className="text-lg font-semibold text-green-800">Kullanıcılar Sıralaması</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sıra
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Okey Müşteri
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length > 0 ? (
                  users.map((user, index) => (
                    <tr 
                      key={user.id}
                      className={index < 3 ? 'bg-green-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {getRankBadge(index)}
                        </div>
                      </td>
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
                        <div className="text-sm font-bold text-green-600">
                          {user.okeyCustomerCount}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                      Kullanıcı bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
