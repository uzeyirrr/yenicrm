'use client';

import { useState, useEffect } from 'react';
import { pb } from '@/lib/pocketbase';
import { getCurrentUser, updateCurrentUser } from '@/lib/userService';
import Link from 'next/link';
import Image from 'next/image';
import { User } from '@/lib/types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter, Save, Edit, User as UserIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';

// Renk seçenekleri
const saleColors = [
  { value: 'none', label: 'Seçilmemiş', color: 'transparent' },
  { value: 'red', label: 'Kırmızı', color: '#FFEBEE' },
  { value: 'green', label: 'Yeşil', color: '#E8F5E9' },
  { value: 'blue', label: 'Mavi', color: '#E3F2FD' },
  { value: 'yellow', label: 'Sarı', color: '#FFFDE7' },
];

// QC Final durumları için renkler
const qcFinalColors = {
  'Yeni': '#E3F2FD', // Açık mavi
  'Okey': '#E8F5E9', // Açık yeşil
  'Rausgefallen': '#FFEBEE', // Açık kırmızı
  'Rausgefallen WP': '#FFECB3', // Açık turuncu
  'Neuleger': '#F3E5F5', // Açık mor
  'Neuleger WP': '#E1F5FE', // Açık turkuaz
};

// Müşteri tipi
type Customer = {
  id: string;
  surname: string;
  tel: string;
  email: string;
  qc_final: 'Yeni' | 'Okey' | 'Rausgefallen' | 'Rausgefallen WP' | 'Neuleger' | 'Neuleger WP';
  sale: string;
  created: string;
  updated: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [stats, setStats] = useState({
    total: 0,
    okey: 0,
    rausgefallen: 0,
    rausgefallenWP: 0,
    neuleger: 0,
    neulegerWP: 0,
    yeni: 0,
  });
  const [successRate, setSuccessRate] = useState(0);

  // Kullanıcı bilgilerini yükleme
  useEffect(() => {
    const loadUserData = () => {
      try {
        setLoading(true);
        const currentUser = getCurrentUser();
        if (!currentUser) {
          throw new Error('Kullanıcı bilgileri bulunamadı');
        }
        
        setUser(currentUser);
        
        // Avatar önizleme
        if (currentUser.avatar) {
          const baseUrl = pb.baseUrl.endsWith('/') ? pb.baseUrl.slice(0, -1) : pb.baseUrl;
          const fileUrl = `${baseUrl}/api/files/users/${currentUser.id}/${currentUser.avatar}`;
          setAvatarPreview(fileUrl);
        }
      } catch (err) {
        console.error('Kullanıcı bilgileri yüklenirken hata:', err);
        setError('Kullanıcı bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Müşteri verilerini yükleme
  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        if (!user) return;
        
        setCustomerLoading(true);
        
        const records = await pb.collection('customers').getList(1, 100, {
          sort: '-created',
          filter: `agent='${user.id}'`,
        });
        
        setCustomers(records.items as unknown as Customer[]);
        
        // İstatistikleri hesapla
        const customerStats = {
          total: records.items.length,
          okey: 0,
          rausgefallen: 0,
          rausgefallenWP: 0,
          neuleger: 0,
          neulegerWP: 0,
          yeni: 0,
        };
        
        records.items.forEach((customer: any) => {
          switch (customer.qc_final) {
            case 'Okey':
              customerStats.okey++;
              break;
            case 'Rausgefallen':
              customerStats.rausgefallen++;
              break;
            case 'Rausgefallen WP':
              customerStats.rausgefallenWP++;
              break;
            case 'Neuleger':
              customerStats.neuleger++;
              break;
            case 'Neuleger WP':
              customerStats.neulegerWP++;
              break;
            case 'Yeni':
              customerStats.yeni++;
              break;
          }
        });
        
        setStats(customerStats);
        
        // Başarı oranını hesapla (Okey olanlar / Toplam)
        const successRate = customerStats.total > 0 
          ? (customerStats.okey / customerStats.total) * 100 
          : 0;
        
        setSuccessRate(successRate);
      } catch (err) {
        console.error('Müşteri verileri yüklenirken hata:', err);
        setError('Müşteri verileri yüklenirken bir hata oluştu');
      } finally {
        setCustomerLoading(false);
      }
    };

    loadCustomerData();
  }, [user]);

  // Avatar değiştirme
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Panodaki görseli yükleme fonksiyonu
  const handlePasteImage = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setAvatar(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  // Paste event listener'ı ekleyelim
  useEffect(() => {
    document.addEventListener('paste', handlePasteImage);
    
    return () => {
      document.removeEventListener('paste', handlePasteImage);
    };
  }, []);

  // Kullanıcı bilgilerini güncelleme
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Kullanıcı bilgilerini güncelle
      const updatedUser = await updateCurrentUser({
        name: user.name,
        email: user.email,
      });
      
      // Avatar güncelleme
      if (avatar) {
        const formData = new FormData();
        formData.append('avatar', avatar);
        await pb.collection('users').update(user.id, formData);
      }
      
      if (updatedUser) {
        setUser(updatedUser);
      }
      setEditMode(false);
      
      toast({
        title: "Başarılı!",
        description: "Profil bilgileriniz başarıyla güncellendi.",
        variant: "default",
      });
    } catch (err) {
      console.error('Profil güncellenirken hata:', err);
      setError('Profil güncellenirken bir hata oluştu');
      
      toast({
        title: "Hata!",
        description: "Profil bilgileriniz güncellenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Grafik verileri
  const pieData = [
    { name: 'Okey', value: stats.okey, color: '#4CAF50' },
    { name: 'Rausgefallen', value: stats.rausgefallen, color: '#F44336' },
    { name: 'Rausgefallen WP', value: stats.rausgefallenWP, color: '#FF9800' },
    { name: 'Neuleger', value: stats.neuleger, color: '#9C27B0' },
    { name: 'Neuleger WP', value: stats.neulegerWP, color: '#03A9F4' },
    { name: 'Yeni', value: stats.yeni, color: '#2196F3' },
  ].filter(item => item.value > 0);

  const barData = [
    { name: 'Okey', value: stats.okey },
    { name: 'Rausgefallen', value: stats.rausgefallen },
    { name: 'Rausgefallen WP', value: stats.rausgefallenWP },
    { name: 'Neuleger', value: stats.neuleger },
    { name: 'Neuleger WP', value: stats.neulegerWP },
    { name: 'Yeni', value: stats.yeni },
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profil Bilgileri</TabsTrigger>
          <TabsTrigger value="customers">Müşterilerim</TabsTrigger>
          <TabsTrigger value="analytics">Analizler</TabsTrigger>
        </TabsList>
        
        {/* Profil Bilgileri */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Profil Bilgileri</CardTitle>
                  <CardDescription>
                    Kişisel bilgilerinizi görüntüleyin ve düzenleyin
                  </CardDescription>
                </div>
                <Button 
                  variant={editMode ? "default" : "outline"} 
                  onClick={() => setEditMode(!editMode)}
                >
                  {editMode ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Kaydet
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Düzenle
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleUpdateUser} className="space-y-6">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Profil Resmi */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <Avatar className="h-32 w-32">
                        {avatarPreview ? (
                          <AvatarImage src={avatarPreview} alt={user?.name || 'Profil'} />
                        ) : (
                          <AvatarFallback>
                            <UserIcon className="h-16 w-16 text-gray-400" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      
                      {editMode && (
                        <div className="absolute -bottom-2 -right-2">
                          <label 
                            htmlFor="avatar-upload" 
                            className="bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                            <input
                              id="avatar-upload"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={handleAvatarChange}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                    
                    {editMode && (
                      <p className="text-xs text-gray-500">
                        Ctrl+V ile panodaki görseli yapıştırabilirsiniz
                      </p>
                    )}
                  </div>
                  
                  {/* Kullanıcı Bilgileri */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">İsim</Label>
                      <Input
                        id="name"
                        value={user?.name || ''}
                        onChange={(e) => setUser(prev => prev ? {...prev, name: e.target.value} : null)}
                        disabled={!editMode}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">E-posta</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        onChange={(e) => setUser(prev => prev ? {...prev, email: e.target.value} : null)}
                        disabled={!editMode}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="role">Rol</Label>
                      <Input
                        id="role"
                        value={user?.role || ''}
                        disabled={true}
                      />
                    </div>
                  </div>
                </div>
                
                {editMode && (
                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        'Kaydet'
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Müşterilerim */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Müşterilerim</CardTitle>
              <CardDescription>
                Eklediğiniz müşterilerin listesi ve durumları
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customerLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p>Henüz müşteri eklenmemiş</p>
                  <Button className="mt-4" asChild>
                    <Link href="/dashboard/customers/new">
                      Yeni Müşteri Ekle
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Müşteri Adı</TableHead>
                        <TableHead>İletişim</TableHead>
                        <TableHead>QC Final</TableHead>
                        <TableHead>Eklenme Tarihi</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow 
                          key={customer.id}
                          style={{ 
                            backgroundColor: customer.sale ? 
                              saleColors.find(c => c.value === customer.sale)?.color || 'transparent' : 
                              'transparent' 
                          }}
                        >
                          <TableCell className="font-medium">{customer.surname}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              {customer.tel && <span>{customer.tel}</span>}
                              {customer.email && (
                                <span className="text-sm text-gray-500">{customer.email}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              style={{ 
                                backgroundColor: qcFinalColors[customer.qc_final] || 'transparent',
                                borderColor: 'transparent'
                              }}
                            >
                              {customer.qc_final}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(customer.created).toLocaleDateString('tr-TR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/dashboard/customers/${customer.id}`}>
                              <Button variant="outline" size="sm">
                                Düzenle
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analizler */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Özet Kartları */}
            <Card>
              <CardHeader>
                <CardTitle>Müşteri Durumu Özeti</CardTitle>
                <CardDescription>
                  Müşterilerinizin QC Final durumlarının dağılımı
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Toplam Müşteri</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Okey</p>
                    <p className="text-2xl font-bold">{stats.okey}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Rausgefallen</p>
                    <p className="text-2xl font-bold">{stats.rausgefallen}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Rausgefallen WP</p>
                    <p className="text-2xl font-bold">{stats.rausgefallenWP}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Neuleger</p>
                    <p className="text-2xl font-bold">{stats.neuleger}</p>
                  </div>
                  <div className="bg-cyan-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Neuleger WP</p>
                    <p className="text-2xl font-bold">{stats.neulegerWP}</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">Başarı Oranı</p>
                    <p className="text-sm font-medium">{successRate.toFixed(1)}%</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${successRate}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    QC Final durumu "Okey" olan müşterilerin toplam müşterilere oranı
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Pasta Grafik */}
            <Card>
              <CardHeader>
                <CardTitle>QC Final Dağılımı</CardTitle>
                <CardDescription>
                  Müşterilerinizin QC Final durumlarının dağılımı
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    Grafik için yeterli veri bulunmuyor
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Çubuk Grafik */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>QC Final Durumu Dağılımı</CardTitle>
                <CardDescription>
                  Müşterilerinizin QC Final durumlarının sayısal dağılımı
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Müşteri Sayısı" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    Grafik için yeterli veri bulunmuyor
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
