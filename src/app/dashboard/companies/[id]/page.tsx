'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCompany, getCompanySlots } from '@/lib/companyService';
import { isAuthenticated } from '@/lib/pocketbase';
import Link from 'next/link';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BuildingOffice2Icon, 
  PhoneIcon, 
  EnvelopeIcon, 
  GlobeAltIcon, 
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [company, setCompany] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const initializeAndLoad = async () => {
      try {
        if (!isAuthenticated()) {
          throw new Error('Kullanıcı oturumu geçersiz. Lütfen tekrar giriş yapın.');
        }
        
        await loadCompanyData();
      } catch (err) {
        console.error('Error initializing company detail page:', err);
        setError(err instanceof Error ? err.message : 'Şirket bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    initializeAndLoad();
  }, [resolvedParams.id]);

  const loadCompanyData = async () => {
    try {
      setLoading(true);
      // Şirket bilgilerini yükle
      const companyData = await getCompany(resolvedParams.id);
      setCompany(companyData);
      
      // Şirketle ilişkili slotları yükle
      const slotsData = await getCompanySlots(resolvedParams.id);
      setSlots(slotsData);
      
      setError('');
    } catch (err) {
      console.error('Error loading company data:', err);
      setError('Şirket bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xl font-medium text-gray-700">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-red-600">Hata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={() => router.push('/dashboard/companies')}>
                Şirketler Sayfasına Dön
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Şirket Bulunamadı</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">İstediğiniz şirket bulunamadı veya erişim izniniz yok.</p>
            <div className="mt-6">
              <Button onClick={() => router.push('/dashboard/companies')}>
                Şirketler Sayfasına Dön
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Üst Bilgi Kartı */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center space-x-4">
              {company.logo ? (
                <Image
                  src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/companies/${company.id}/${company.logo}`}
                  alt={company.name}
                  width={64}
                  height={64}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                  <BuildingOffice2Icon className="h-10 w-10 text-gray-500" />
                </div>
              )}
              <div>
                <CardTitle className="text-3xl">{company.name}</CardTitle>
                <CardDescription>Oluşturulma: {format(new Date(company.created), 'dd MMMM yyyy', { locale: tr })}</CardDescription>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link href={`/dashboard/companies/${company.id}/edit`}>
                <Button variant="outline" className="flex items-center space-x-2">
                  <PencilIcon className="h-4 w-4" />
                  <span>Düzenle</span>
                </Button>
              </Link>
              <Link href="/dashboard/companies">
                <Button variant="secondary">Şirketler Listesine Dön</Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        {/* Ana İçerik */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Şirket Detayları</TabsTrigger>
            <TabsTrigger value="slots">İlişkili Slotlar ({slots.length})</TabsTrigger>
          </TabsList>
          
          {/* Şirket Detayları */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Şirket Bilgileri</CardTitle>
                <CardDescription>Şirket hakkında detaylı bilgiler</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <PhoneIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Telefon</h4>
                        <p className="text-gray-600">{company.tel || 'Belirtilmemiş'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <EnvelopeIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">E-posta</h4>
                        <p className="text-gray-600">{company.email || 'Belirtilmemiş'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <GlobeAltIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Web Sitesi</h4>
                        {company.website ? (
                          <a
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {company.website}
                          </a>
                        ) : (
                          <p className="text-gray-600">Belirtilmemiş</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <MapPinIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Adres</h4>
                        <p className="text-gray-600">{company.address || 'Belirtilmemiş'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="h-5 w-5 flex-shrink-0"></div> {/* Boşluk için */}
                      <div>
                        <h4 className="font-medium text-gray-900">Açıklama</h4>
                        <p className="text-gray-600">{company.description || 'Açıklama bulunmuyor'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* İlişkili Slotlar */}
          <TabsContent value="slots">
            <Card>
              <CardHeader>
                <CardTitle>İlişkili Slotlar</CardTitle>
                <CardDescription>Bu şirketle ilişkilendirilmiş tüm slotlar</CardDescription>
              </CardHeader>
              <CardContent>
                {slots.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">Slot bulunamadı</h3>
                    <p className="mt-1 text-sm text-gray-500">Bu şirketle ilişkilendirilmiş herhangi bir slot bulunmuyor.</p>
                    <div className="mt-6">
                      <Link href="/dashboard/slots/new">
                        <Button>Yeni Slot Ekle</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Slot Adı</TableHead>
                          <TableHead>Tarih</TableHead>
                          <TableHead>Saat</TableHead>
                          <TableHead>Kapasite</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {slots.map((slot) => (
                          <TableRow key={slot.id}>
                            <TableCell className="font-medium">{slot.name}</TableCell>
                            <TableCell>
                              {slot.date && format(new Date(slot.date), 'dd MMMM yyyy', { locale: tr })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <ClockIcon className="h-4 w-4 text-gray-500" />
                                <span>{slot.start} - {slot.end}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <UsersIcon className="h-4 w-4 text-gray-500" />
                                <span>{slot.capacity}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {slot.expand?.category?.name || 'Belirtilmemiş'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={slot.deaktif ? "destructive" : "success"}>
                                {slot.deaktif ? 'Deaktif' : 'Aktif'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/dashboard/slots/${slot.id}`}>
                                <Button variant="outline" size="sm">
                                  Detaylar
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
        </Tabs>
      </div>
    </div>
  );
}
