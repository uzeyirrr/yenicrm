'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, User } from '@/lib/userService';
import { getCustomers } from '@/lib/customerService';
import { getTeams, Team } from '@/lib/teamService';
import { pb, ensureAdminAuth } from '@/lib/pocketbase';
import { Loader2, CheckCircle, XCircle, AlertCircle, User as UserIcon, Briefcase, Users, PieChart, Edit, Save, X } from 'lucide-react';
import Link from 'next/link';
import { Customer } from '@/lib/types';
import PocketBase from 'pocketbase';

// Başarı oranı için basit bir donut chart komponenti
const DonutChart = ({ percentage }: { percentage: number }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="transparent"
          stroke="#e2e8f0"
          strokeWidth="12"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="transparent"
          stroke={percentage >= 70 ? '#10b981' : percentage >= 40 ? '#f59e0b' : '#ef4444'}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="absolute text-xl font-bold">{percentage}%</div>
    </div>
  );
};

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [userCustomers, setUserCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [userTeam, setUserTeam] = useState<string>('Takım bilgisi yüklenemedi');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    avatar: null as File | null,
  });

  // Veri yükleme işlemi
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Önce mevcut oturum durumunu kontrol et
        console.log('Checking current auth status:', pb.authStore.isValid ? 'Valid' : 'Invalid');
        
        // Oturum geçersizse, süper kullanıcı bilgileriyle giriş yap
        if (!pb.authStore.isValid) {
          console.log('Auth is invalid, logging in with super user credentials...');
          try {
            // Önce admin olarak giriş dene
            await pb.admins.authWithPassword(
              'uzeyirismailbahtiyar@gmail.com',
              'Babacik.54!'
            );
            console.log('Admin login successful');
          } catch (adminError) {
            console.error('Admin login failed, trying user login:', adminError);
            // Admin girişi başarısız olursa kullanıcı olarak giriş dene
            await pb.collection('users').authWithPassword(
              'uzeyirismailbahtiyar@gmail.com',
              'Babacik.54!'
            );
            console.log('User login successful');
          }
        }
        
        console.log('Auth status after login attempt:', pb.authStore.isValid ? 'Valid' : 'Invalid');
        
        // Kullanıcı bilgilerini al
        let user: User | null = null;
        try {
          user = await getCurrentUser();
          if (!user) {
            // Eğer getCurrentUser null döndüyse, doğrudan PocketBase'den almayı dene
            console.log('getCurrentUser returned null, trying direct PocketBase auth model');
            const authModel = pb.authStore.model;
            if (authModel) {
              // PocketBase RecordModel'i User tipine dönüştür
              user = {
                id: authModel.id,
                username: authModel.username,
                email: authModel.email || '',
                name: authModel.name || '',
                avatar: authModel.avatar,
                created: authModel.created,
                updated: authModel.updated
              };
            }
          }
        } catch (userError) {
          console.error('Error getting current user:', userError);
          // Hata durumunda bile devam etmeye çalış
          const authModel = pb.authStore.model;
          if (authModel) {
            user = {
              id: authModel.id,
              username: authModel.username,
              email: authModel.email || '',
              name: authModel.name || '',
              avatar: authModel.avatar,
              created: authModel.created,
              updated: authModel.updated
            };
          }
        }
        
        if (!user) {
          console.error('Could not get user information');
          setError('Kullanıcı bilgileri yüklenemedi. Lütfen sayfayı yenileyiniz.');
          setLoading(false);
          return;
        }
        
        console.log('Current user loaded:', user);
        setCurrentUser(user);
        setFormData(prev => ({
          ...prev,
          name: user.name || ''
        }));
        
        // Müşteri listesini al
        console.log('Fetching customers...');
        let allCustomers: Customer[] = [];
        try {
          allCustomers = await getCustomers();
          console.log(`Loaded ${allCustomers.length} customers`);
        } catch (customerError) {
          console.error('Error loading customers:', customerError);
          setError('Müşteri listesi yüklenirken hata oluştu. Veriler kısmi olarak görüntülenebilir.');
          // Hata olsa bile devam et
        }
        
        setCustomers(allCustomers);
        
        // Kullanıcının müşterilerini filtrele
        const userCustomerList = allCustomers.filter(customer => customer.agent === user.id);
        console.log(`User has ${userCustomerList.length} customers`);
        setUserCustomers(userCustomerList);
        
        // Kullanıcının takım bilgisini al
        console.log('Fetching teams...');
        let teams: Team[] = [];
        try {
          teams = await getTeams();
          console.log(`Loaded ${teams.length} teams`);
        } catch (teamError) {
          console.error('Error loading teams:', teamError);
          // Hata olsa bile devam et
        }
        
        const team = teams.find(team => 
          team.leader?.id === user.id || team.members?.some((member: { id: string }) => member.id === user.id)
        );
        
        if (team) {
          console.log(`User belongs to team: ${team.name}`);
          setUserTeam(team.name);
        } else {
          console.log('User does not belong to any team');
          setUserTeam('Takım atanmamış');
        }
      } catch (err) {
        console.error('Error loading profile data:', err);
        setError('Profil bilgileri yüklenirken bir hata oluştu: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (name === 'avatar' && files && files[0]) {
      setFormData(prev => ({
        ...prev,
        avatar: files[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!currentUser) {
        setError('Kullanıcı bilgileri bulunamadı');
        return;
      }
      
      console.log('Updating user profile for:', currentUser.id);
      
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          setError('Yeni şifreler eşleşmiyor');
          return;
        }
        
        if (!formData.oldPassword) {
          setError('Mevcut şifrenizi girmelisiniz');
          return;
        }
      }

      // Şifre değişikliği
      if (formData.newPassword) {
        console.log('Updating password...');
        try {
          await pb.collection('users').update(currentUser.id, {
            password: formData.newPassword,
            passwordConfirm: formData.confirmPassword,
            oldPassword: formData.oldPassword,
          });
          console.log('Password updated successfully');
        } catch (passwordErr) {
          console.error('Password update error:', passwordErr);
          setError('Şifre güncellenirken hata oluştu: ' + 
            (passwordErr instanceof Error ? passwordErr.message : 'Bilinmeyen hata'));
          return;
        }
      }

      // Diğer bilgilerin güncellenmesi
      console.log('Updating user profile data...');
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      
      if (formData.avatar) {
        console.log('Updating avatar...');
        formDataToSend.append('avatar', formData.avatar);
      }
      
      await pb.collection('users').update(currentUser.id, formDataToSend);
      console.log('Profile updated successfully');

      setSuccess('Profil başarıyla güncellendi');
      setIsEditing(false);
      
      // Kullanıcı bilgilerini yenile
      console.log('Refreshing user data...');
      const updatedUser = await getCurrentUser();
      if (updatedUser) {
        console.log('User data refreshed');
        setCurrentUser(updatedUser);
      }
    } catch (err) {
      console.error('Güncelleme hatası:', err);
      setError('Güncelleme sırasında bir hata oluştu: ' + 
        (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    }
  };

  // QC final durumlarına göre müşteri sayılarını hesapla
  const getCustomerStatusCounts = () => {
    if (!userCustomers || !userCustomers.length) return { okey: 0, rausgefallen: 0, neuleger: 0, yeni: 0, total: 0 };
    
    try {
      const counts = {
        okey: userCustomers.filter(c => c.qc_final === 'Okey').length,
        rausgefallen: userCustomers.filter(c => c.qc_final && c.qc_final.includes && c.qc_final.includes('Rausgefallen')).length,
        neuleger: userCustomers.filter(c => c.qc_final && c.qc_final.includes && c.qc_final.includes('Neuleger')).length,
        yeni: userCustomers.filter(c => c.qc_final === 'Yeni').length,
        total: userCustomers.length
      };
      
      console.log('Customer status counts:', counts);
      return counts;
    } catch (error) {
      console.error('Error calculating customer status counts:', error);
      return { okey: 0, rausgefallen: 0, neuleger: 0, yeni: 0, total: userCustomers.length };
    }
  };

  // Başarı oranını hesapla (Okey müşterilerin yüzdesi)
  const calculateSuccessRate = () => {
    try {
      const counts = getCustomerStatusCounts();
      if (counts.total === 0) return 0;
      const rate = Math.round((counts.okey / counts.total) * 100);
      console.log(`Success rate calculated: ${rate}%`);
      return rate;
    } catch (error) {
      console.error('Error calculating success rate:', error);
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const customerCounts = getCustomerStatusCounts();
  const successRate = calculateSuccessRate();

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profil Bilgileri */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <div className="flex flex-col items-center">
                {currentUser?.avatar ? (
                  <img
                    src={`${pb.baseUrl}/api/files/users/${currentUser.id}/${currentUser.avatar}`}
                    alt="Profil"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg">
                    <UserIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <h2 className="mt-4 text-2xl font-bold">{currentUser?.name}</h2>
                <p className="text-blue-100">{currentUser?.email}</p>
              </div>
            </div>
            
            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                  {success}
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <Briefcase className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-gray-700">Takım: {userTeam}</span>
                </div>
                
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-gray-500 mr-2" />
                  <span className="text-gray-700">Toplam Müşteri: {customerCounts.total}</span>
                </div>
                
                <div className="flex justify-between items-center mt-6">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  >
                    {isEditing ? (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        İptal
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Profili Düzenle
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {isEditing && (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Ad Soyad
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Profil Fotoğrafı
                    </label>
                    <input
                      type="file"
                      name="avatar"
                      accept="image/*"
                      onChange={handleInputChange}
                      className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-50 file:text-indigo-700
                        hover:file:bg-indigo-100"
                    />
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h2 className="text-lg font-medium mb-4">Şifre Değiştir</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Mevcut Şifre
                        </label>
                        <input
                          type="password"
                          name="oldPassword"
                          value={formData.oldPassword}
                          onChange={handleInputChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Yeni Şifre
                        </label>
                        <input
                          type="password"
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Yeni Şifre Tekrar
                        </label>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Kaydet
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
          
          {/* Başarı Oranı Kartı */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden mt-6">
            <div className="p-4 bg-gradient-to-r from-green-500 to-teal-600 text-white">
              <h2 className="text-lg font-semibold flex items-center">
                <PieChart className="w-5 h-5 mr-2" />
                Başarı Oranı
              </h2>
            </div>
            <div className="p-6 flex flex-col items-center">
              <DonutChart percentage={successRate} />
              <div className="mt-4 text-center">
                <p className="text-gray-600">Toplam {customerCounts.total} müşteriden {customerCounts.okey} tanesi Okey durumunda</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Müşteri Analizleri ve Listesi */}
        <div className="lg:col-span-2">
          {/* QC Final Durumu Analizi */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
            <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white">
              <h2 className="text-lg font-semibold">QC Final Durumu Analizi</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-green-800 font-medium">Okey</h3>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600 mt-2">{customerCounts.okey}</p>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-red-800 font-medium">Rausgefallen</h3>
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-600 mt-2">{customerCounts.rausgefallen}</p>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-amber-800 font-medium">Neuleger</h3>
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-2xl font-bold text-amber-600 mt-2">{customerCounts.neuleger}</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-blue-800 font-medium">Yeni</h3>
                    <Loader2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{customerCounts.yeni}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Müşteri Listesi */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-gray-700 to-gray-900 text-white">
              <h2 className="text-lg font-semibold">Müşterilerim</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Müşteri
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İletişim
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      QC Final
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userCustomers.length > 0 ? (
                    userCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{customer.surname}</div>
                          <div className="text-sm text-gray-500">{customer.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{customer.tel}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${customer.qc_final === 'Okey' ? 'bg-green-100 text-green-800' : 
                              customer.qc_final.includes('Rausgefallen') ? 'bg-red-100 text-red-800' : 
                              customer.qc_final.includes('Neuleger') ? 'bg-amber-100 text-amber-800' : 
                              'bg-blue-100 text-blue-800'}`}>
                            {customer.qc_final}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Link 
                            href={`/dashboard/customers/${customer.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Detaylar
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        Henüz müşteri bulunmuyor
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
