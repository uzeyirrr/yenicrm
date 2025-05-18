'use client';

import { useState, useEffect, useCallback } from 'react';
import { pb } from '@/lib/pocketbase';
import Link from 'next/link';
import { debounce } from 'lodash';
import { User } from '@/lib/types';
import { getUsers } from '@/lib/userService';
import { RecordModel } from 'pocketbase';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter } from 'lucide-react';

// Renk seçenekleri
const saleColors = [
  { value: 'none', label: 'Seçiniz', color: 'transparent' },
  { value: 'red', label: 'Kırmızı', color: '#FFEBEE' },
  { value: 'green', label: 'Yeşil', color: '#E8F5E9' },
  { value: 'blue', label: 'Mavi', color: '#E3F2FD' },
  { value: 'yellow', label: 'Sarı', color: '#FFFDE7' },
];

// Müşteri tipi
type Customer = RecordModel & {
  surname: string;
  tel: string;
  home_tel: string;
  email: string;
  agent: string;
  sale: string;
  expand?: {
    agent?: User;
  };
};

export default function SalesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [agents, setAgents] = useState<User[]>([]);
  const [isRealtime, setIsRealtime] = useState(true);

  // Müşterileri yükleme fonksiyonu
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Filtreleme sorgusu oluşturma
      let filterQuery = '';
      
      if (searchTerm) {
        filterQuery += `(surname~'${searchTerm}' || tel~'${searchTerm}' || email~'${searchTerm}')`;      
      }
      
      if (agentFilter && agentFilter !== 'all') {
        if (filterQuery) filterQuery += ' && ';
        filterQuery += `agent='${agentFilter}'`;
      }
      
      if (colorFilter && colorFilter !== 'all') {
        if (filterQuery) filterQuery += ' && ';
        filterQuery += `sale='${colorFilter}'`;
      }

      const records = await pb.collection('customers').getList(1, 100, {
        sort: '-created',
        filter: filterQuery || undefined,
        expand: 'agent',
      });

      setCustomers(records.items as unknown as Customer[]);
    } catch (err) {
      console.error('Müşteriler yüklenirken hata:', err);
      setError('Müşteriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, agentFilter, colorFilter]);

  // Ajanları yükleme
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const usersList = await getUsers();
        setAgents(usersList);
      } catch (err) {
        console.error('Ajanlar yüklenirken hata:', err);
      }
    };
    
    loadAgents();
  }, []);

  // Müşterileri yükleme
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Realtime aboneliği
  useEffect(() => {
    if (!isRealtime) return;

    // Tüm müşteri değişikliklerini dinle
    pb.collection('customers').subscribe('*', function (e) {
      console.log('Realtime event:', e.action);
      
      // Müşteri listesini güncelle
      if (e.action === 'create') {
        setCustomers(prev => [e.record as unknown as Customer, ...prev]);
      } else if (e.action === 'update') {
        setCustomers(prev => 
          prev.map(customer => 
            customer.id === e.record.id ? {...e.record as unknown as Customer} : customer
          )
        );
      } else if (e.action === 'delete') {
        setCustomers(prev => 
          prev.filter(customer => customer.id !== e.record.id)
        );
      }
    });

    // Cleanup
    return () => {
      pb.collection('customers').unsubscribe();
    };
  }, [isRealtime]);

  // Renk değiştirme işlemi
  const handleColorChange = async (customerId: string, color: string) => {
    try {
      await pb.collection('customers').update(customerId, {
        sale: color
      });
      
      // Realtime aktif değilse manuel güncelleme yap
      if (!isRealtime) {
        setCustomers(prev => 
          prev.map(customer => 
            customer.id === customerId ? {...customer, sale: color} : customer
          )
        );
      }
    } catch (err) {
      console.error('Renk güncellenirken hata:', err);
      setError('Renk güncellenirken bir hata oluştu.');
    }
  };

  // Arama işlemi için debounce
  const debouncedSearch = debounce((value: string) => {
    setSearchTerm(value);
  }, 500);

  // Realtime durumunu değiştirme
  const toggleRealtime = () => {
    if (isRealtime) {
      pb.collection('customers').unsubscribe();
    }
    setIsRealtime(!isRealtime);
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Satış Kontrol</CardTitle>
              <CardDescription>
                Müşterilerin satış durumlarını takip edin ve yönetin
              </CardDescription>
            </div>
            <Button 
              variant={isRealtime ? "default" : "outline"} 
              onClick={toggleRealtime}
            >
              {isRealtime ? "Realtime Aktif" : "Realtime Pasif"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Arama ve Filtreleme */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Müşteri adı, telefon veya email ara..."
                className="pl-8"
                onChange={(e) => debouncedSearch(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ajan Filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={colorFilter} onValueChange={setColorFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Renk Filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {saleColors.filter(c => c.value !== 'none').map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 mr-2 rounded-full" 
                          style={{ backgroundColor: color.color }}
                        />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setAgentFilter('all');
                  setColorFilter('all');
                  // Input değerini de temizle
                  const searchInput = document.querySelector('input') as HTMLInputElement;
                  if (searchInput) searchInput.value = '';
                }}
              >
                Filtreleri Temizle
              </Button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Müşteri Adı</TableHead>
                    <TableHead>İletişim</TableHead>
                    <TableHead>Ajan</TableHead>
                    <TableHead>Eklenme Tarihi</TableHead>
                    <TableHead>Renk</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                        Müşteri bulunamadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => (
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
                          {customer.expand?.agent ? (
                            <Badge variant="outline">{customer.expand.agent.name}</Badge>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(customer.created).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={customer.sale || 'none'} 
                            onValueChange={(value) => handleColorChange(customer.id, value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue>
                                {customer.sale && customer.sale !== 'none' ? (
                                  <div className="flex items-center">
                                    <div 
                                      className="w-3 h-3 mr-2 rounded-full" 
                                      style={{ 
                                        backgroundColor: saleColors.find(c => c.value === customer.sale)?.color || 'transparent' 
                                      }}
                                    />
                                    {saleColors.find(c => c.value === customer.sale)?.label || 'Seçiniz'}
                                  </div>
                                ) : (
                                  'Seçiniz'
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {saleColors.map((color) => (
                                <SelectItem key={color.value} value={color.value}>
                                  <div className="flex items-center">
                                    <div 
                                      className="w-3 h-3 mr-2 rounded-full" 
                                      style={{ backgroundColor: color.color }}
                                    />
                                    {color.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/customers/${customer.id}`}>
                            <Button variant="outline" size="sm">
                              Düzenle
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
