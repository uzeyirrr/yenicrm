'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCompany, updateCompany } from '@/lib/companyService';
import { isAuthenticated } from '@/lib/pocketbase';
import { pb } from '@/lib/pocketbase';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BuildingOffice2Icon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    address: '',
    tel: '',
    email: '',
    website: '',
    logo: '',
    created: '',
    updated: ''
  });

  useEffect(() => {
    const initializeAndLoad = async () => {
      try {
        if (!isAuthenticated()) {
          router.push('/login');
          toast.error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
          return;
        }
        
        await loadCompany();
      } catch (err) {
        console.error('Error initializing company edit page:', err);
        setError(err instanceof Error ? err.message : 'Şirket bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    initializeAndLoad();
  }, [resolvedParams.id, router]);

  const loadCompany = async () => {
    try {
      const companyData = await getCompany(resolvedParams.id);
      setFormData(companyData);
      
      // Logo önizlemesini ayarla
      if (companyData.logo) {
        setLogoPreview(`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/companies/${companyData.id}/${companyData.logo}`);
      }
      
      setError('');
    } catch (err) {
      console.error('Error loading company:', err);
      setError('Şirket bilgileri yüklenirken bir hata oluştu');
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
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
          setLogoImage(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setLogoPreview(reader.result as string);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Şirket bilgilerini güncelle
      const { id, created, updated, logo, ...updateData } = formData;
      await updateCompany(resolvedParams.id, updateData);

      // Logo yükle (eğer yeni bir logo seçilmişse)
      if (logoImage) {
        const formData = new FormData();
        formData.append('logo', logoImage);
        await pb.collection('companies').update(resolvedParams.id, formData);
      }

      toast.success('Şirket başarıyla güncellendi');
      router.push('/dashboard/profile'); // Profil sayfasına yönlendir
    } catch (err) {
      console.error('Error updating company:', err);
      setError('Şirket güncellenirken bir hata oluştu');
      toast.error('Şirket güncellenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Şirket Düzenle</CardTitle>
            <CardDescription>Şirket bilgilerini güncelleyin</CardDescription>
          </div>
          <Link href={`/dashboard/companies/${resolvedParams.id}`}>
            <Button variant="outline" className="flex items-center space-x-2">
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Şirket Detaylarına Dön</span>
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Yükleme */}
              <div className="md:col-span-2 flex flex-col items-center space-y-4">
                <div className="relative">
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Şirket Logosu"
                      width={120}
                      height={120}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-gray-200 flex items-center justify-center">
                      <BuildingOffice2Icon className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Logo Değiştir
                  </Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <p className="mt-2 text-sm text-gray-500">veya görseli kopyalayıp sayfaya yapıştırın</p>
                </div>
              </div>

              {/* Şirket Adı */}
              <div className="space-y-2">
                <Label htmlFor="name">Şirket Adı</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="ABC Şirketi"
                />
              </div>

              {/* Telefon */}
              <div className="space-y-2">
                <Label htmlFor="tel">Telefon</Label>
                <Input
                  id="tel"
                  name="tel"
                  value={formData.tel}
                  onChange={handleChange}
                  placeholder="+90 555 123 4567"
                />
              </div>

              {/* E-posta */}
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="info@sirket.com"
                />
              </div>

              {/* Web Sitesi */}
              <div className="space-y-2">
                <Label htmlFor="website">Web Sitesi</Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="www.sirket.com"
                />
              </div>

              {/* Adres */}
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Şirket adresi"
                  rows={3}
                />
              </div>

              {/* Açıklama */}
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Şirket hakkında kısa açıklama"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t">
              <Link
                href="/dashboard/profile"
                className="flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Geri Dön
              </Link>
              
              <Button
                type="submit"
                disabled={saving}
                className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Kaydediliyor...
                  </>
                ) : (
                  'Kaydet'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
