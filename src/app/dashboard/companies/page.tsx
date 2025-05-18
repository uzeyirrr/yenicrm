'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCompanies, deleteCompany, Company } from '@/lib/companyService';
import { isAuthenticated } from '@/lib/pocketbase';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

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
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PencilIcon, TrashIcon, PlusIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

export default function CompaniesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const initializeAndLoad = async () => {
      try {
        if (!isAuthenticated()) {
          throw new Error('Kullanıcı oturumu geçersiz. Lütfen tekrar giriş yapın.');
        }
        
        await loadCompanies();
      } catch (err) {
        console.error('Error initializing companies page:', err);
        setError(err instanceof Error ? err.message : 'Şirketler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    initializeAndLoad();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const filters = {
        search: searchTerm
      };
      const data = await getCompanies(filters);
      setCompanies(data);
      setError('');
    } catch (err) {
      console.error('Error loading companies:', err);
      setError('Şirketler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCompanies();
  };

  const handleDeleteClick = (id: string) => {
    setCompanyToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    
    try {
      await deleteCompany(companyToDelete);
      toast.success('Şirket başarıyla silindi');
      loadCompanies(); // Listeyi yenile
    } catch (err) {
      console.error('Error deleting company:', err);
      toast.error('Şirket silinirken bir hata oluştu');
    } finally {
      setCompanyToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  if (loading && companies.length === 0) {
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
      <Card className="max-w-6xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Şirketler</CardTitle>
            <CardDescription>Tüm şirketleri görüntüleyin, düzenleyin veya yenilerini ekleyin.</CardDescription>
          </div>
          <Link href="/dashboard/companies/new">
            <Button className="flex items-center space-x-2">
              <PlusIcon className="h-5 w-5" />
              <span>Yeni Şirket</span>
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

          <div className="mb-6">
            <form onSubmit={handleSearch} className="flex space-x-2">
              <Input
                type="text"
                placeholder="Şirket adı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Button type="submit" variant="outline">Ara</Button>
            </form>
          </div>

          {companies.length === 0 ? (
            <div className="text-center py-12">
              <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Şirket bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">Henüz hiç şirket eklenmemiş veya arama kriterlerine uygun şirket yok.</p>
              <div className="mt-6">
                <Link href="/dashboard/companies/new">
                  <Button>
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Yeni Şirket Ekle
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Şirket Adı</TableHead>
                    <TableHead>İletişim</TableHead>
                    <TableHead>Adres</TableHead>
                    <TableHead>Web Sitesi</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          {company.logo ? (
                            <Image
                              src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/companies/${company.id}/${company.logo}`}
                              alt={company.name}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <BuildingOffice2Icon className="h-6 w-6 text-gray-500" />
                            </div>
                          )}
                          <Link href={`/dashboard/companies/${company.id}`} className="hover:underline">
                            {company.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{company.tel}</div>
                          <div className="text-gray-500">{company.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm">{company.address}</div>
                      </TableCell>
                      <TableCell>
                        {company.website && (
                          <a
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            {company.website.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Link href={`/dashboard/companies/${company.id}/edit`}>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <PencilIcon className="h-4 w-4" />
                              <span className="sr-only">Düzenle</span>
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-red-200 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleDeleteClick(company.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span className="sr-only">Sil</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Şirketi silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu şirket kalıcı olarak silinecek ve ilişkili tüm veriler kaldırılacaktır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Evet, Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
