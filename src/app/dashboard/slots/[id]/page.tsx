"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

import { getSlot, getSlotAppointments, emptyAppointment } from "@/lib/slotService";
import { isAuthenticated, ensureAuth } from "@/lib/pocketbase";
import { pb } from "@/lib/pocketbase";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Calendar, Clock, Building, Users, User, Phone, Mail, Edit, Trash } from "lucide-react";

export default function SlotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slotId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slot, setSlot] = useState<any | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEmptyDialogOpen, setIsEmptyDialogOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<any | null>(null);

  useEffect(() => {
    const loadSlotData = async () => {
      try {
        // Kullanıcı oturumunu kontrol et
        if (!isAuthenticated()) {
          setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
          return;
        }

        // Slot bilgilerini getir
        try {
          const slotData = await getSlot(slotId);
          setSlot(slotData);
          console.log("Slot data loaded:", slotData);
        } catch (slotErr) {
          console.error("Error loading slot data:", slotErr);
          setError(`Slot bilgileri yüklenirken bir hata oluştu`);
          setLoading(false);
          return;
        }

        // Slot'a ait randevuları getir
        try {
          const appointmentsData = await getSlotAppointments(slotId);
          setAppointments(appointmentsData);
          console.log("Appointments data loaded:", appointmentsData);
          
          // Randevulara ait müşterileri getir
          try {
            // Önce customer ID'lerini topla
            const customerIds = [];
            
            // Randevulardan müşteri ID'lerini çıkar
            for (const app of appointmentsData) {
              if (app.customer && typeof app.customer === 'string' && app.customer.trim() !== '') {
                customerIds.push(app.customer);
              } else if (app.expand?.customer?.id) {
                customerIds.push(app.expand.customer.id);
              }
            }
            
            console.log('Collected customer IDs:', customerIds);
            
            // Tekrarlanan müşteri ID'lerini kaldır
            const uniqueCustomerIds = [...new Set(customerIds)];
            
            if (uniqueCustomerIds.length > 0) {
              console.log(`Fetching ${uniqueCustomerIds.length} unique customers`);
              
              // Müşteri bilgilerini getir
              const customersData = await Promise.all(
                uniqueCustomerIds.map(async (id) => {
                  try {
                    const customer = await pb.collection('customers').getOne(id, {
                      expand: 'agent'
                    });
                    console.log(`Successfully fetched customer ${id}:`, customer);
                    return customer;
                  } catch (err) {
                    console.error(`Error fetching customer ${id}:`, err);
                    return null;
                  }
                })
              );
              
              const validCustomers = customersData.filter(c => c !== null);
              console.log(`Got ${validCustomers.length} valid customers`);
              setCustomers(validCustomers);
            } else {
              console.log('No customer IDs found in appointments');
              setCustomers([]);
            }
          } catch (customerErr) {
            console.error('Error processing customers:', customerErr);
            setCustomers([]);
          }
        } catch (appErr) {
          console.error("Error loading appointments:", appErr);
          // Randevular yüklenemese bile devam et
          setAppointments([]);
        }
      } catch (err: any) {
        console.error("Error in main load function:", err);
        setError(`Veriler yüklenirken bir hata oluştu: ${err.message || 'Bilinmeyen hata'}`);
      } finally {
        setLoading(false);
      }
    };

    loadSlotData();
  }, [slotId]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMMM yyyy", { locale: tr });
    } catch (error) {
      return dateStr;
    }
  };

  // Slot silme işlemi
  const handleDeleteSlot = async () => {
    try {
      setLoading(true);
      await pb.collection('appointments_slots').delete(slotId);
      router.push('/dashboard/slots');
    } catch (err: any) {
      console.error("Error deleting slot:", err);
      setError(`Slot silinirken bir hata oluştu: ${err.message || 'Bilinmeyen hata'}`);
      setLoading(false);
    }
  };
  
  // Randevu boşaltma işlemi için dialog açma
  const openEmptyDialog = (appointment: any) => {
    setCurrentAppointment(appointment);
    setIsEmptyDialogOpen(true);
  };
  
  // Randevu boşaltma işlemi
  const handleEmptyAppointment = async () => {
    if (!currentAppointment) return;
    
    try {
      setLoading(true);
      await emptyAppointment(currentAppointment.id);
      
      // Randevular listesini güncelle
      setAppointments(prev => 
        prev.map(app => 
          app.id === currentAppointment.id 
            ? { ...app, customer: null, status: "empty", expand: { ...app.expand, customer: null } }
            : app
        )
      );
      
      setIsEmptyDialogOpen(false);
      setCurrentAppointment(null);
      setLoading(false);
    } catch (err: any) {
      console.error("Error emptying appointment:", err);
      setError(`Randevu boşaltılırken bir hata oluştu: ${err.message || 'Bilinmeyen hata'}`);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
        <Button onClick={() => router.push('/dashboard/slots')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Slot Listesine Dön
        </Button>
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-6">
          Slot bulunamadı
        </div>
        <Button onClick={() => router.push('/dashboard/slots')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Slot Listesine Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button onClick={() => router.push('/dashboard/slots')} variant="outline" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
          <h1 className="text-2xl font-bold">Slot Detayı: {slot.name || 'İsimsiz Slot'}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/slots/${slotId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Düzenle
            </Button>
          </Link>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash className="h-4 w-4 mr-2" />
            Sil
          </Button>
        </div>
      </div>

      {/* Slot Bilgileri */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Slot Bilgileri</CardTitle>
          <CardDescription>Slot hakkında detaylı bilgiler</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Slot Adı</p>
              <p className="font-medium">{slot.name || 'İsimsiz Slot'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Tarih</p>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                {formatDate(slot.date)}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Başlangıç Saati</p>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                {slot.start}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Bitiş Saati</p>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                {slot.end}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Durum</p>
              {!slot.deaktif ? (
                <Badge className="bg-green-500 hover:bg-green-600">Aktif</Badge>
              ) : (
                <Badge variant="destructive">Pasif</Badge>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Şirket</p>
              <div className="flex items-center">
                <Building className="h-4 w-4 mr-2 text-gray-500" />
                {slot.expand?.company ? slot.expand.company.name : 
                 (typeof slot.company === 'object' && slot.company ? slot.company.name : 'Belirtilmemiş')}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Kategori</p>
              <div className="flex items-center">
                {slot.expand?.category ? slot.expand.category.name : 
                 (typeof slot.category === 'object' && slot.category ? slot.category.name : 'Belirtilmemiş')}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Ekip</p>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-gray-500" />
                {slot.expand?.team ? slot.expand.team.name : 
                 (typeof slot.team === 'object' && slot.teams ? slot.team.name : 
                  (typeof slot.team === 'string' && slot.teams ? slot.team : 'Belirtilmemiş'))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Aralık (dk)</p>
              <p className="font-medium">{slot.space || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Randevu Sayısı</p>
              <p className="font-medium">{appointments.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Randevular ve Müşteriler Sekmeleri */}
      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="appointments">Randevular</TabsTrigger>
          <TabsTrigger value="customers">Müşteriler</TabsTrigger>
        </TabsList>
        
        {/* Randevular Sekmesi */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle>Randevular</CardTitle>
              <CardDescription>Bu slota ait tüm randevular</CardDescription>
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Randevu Adı</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Saat</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Müşteri</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">
                          {appointment.name || 'İsimsiz Randevu'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                            {formatDate(appointment.date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-gray-500" />
                            {appointment.time}
                          </div>
                        </TableCell>
                        <TableCell>
                          {appointment.status === "empty" && (
                            <Badge variant="outline">Boş</Badge>
                          )}
                          {appointment.status === "edit" && (
                            <Badge className="bg-yellow-500 hover:bg-yellow-600">Düzenleniyor</Badge>
                          )}
                          {appointment.status === "okay" && (
                            <Badge className="bg-green-500 hover:bg-green-600">Dolu</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {appointment.expand?.customer ? (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-gray-500" />
                              {appointment.expand.customer.name}
                            </div>
                          ) : appointment.customer ? (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-gray-500" />
                              {customers.find(c => c.id === appointment.customer)?.name || 'Müşteri Bilgisi Yükleniyor...'}
                            </div>
                          ) : (
                            <Badge variant="outline">Müşteri Yok</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEmptyDialog(appointment)}
                            disabled={appointment.status === "empty"}
                          >
                            Boşalt
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Bu slota ait randevu bulunmamaktadır.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Müşteriler Sekmesi */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Müşteriler</CardTitle>
              <CardDescription>Bu slottaki randevulara ait müşteriler</CardDescription>
            </CardHeader>
            <CardContent>
              {customers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Müşteri Adı</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead>Temsilci</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-500" />
                            {customer.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-gray-500" />
                            {customer.tel || 'Belirtilmemiş'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-gray-500" />
                            {customer.email || 'Belirtilmemiş'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.expand?.agent ? (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-gray-500" />
                              {customer.expand.agent.name}
                            </div>
                          ) : customer.agent ? (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2 text-gray-500" />
                              {customer.agent}
                            </div>
                          ) : (
                            'Belirtilmemiş'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/customers/${customer.id}`}>
                            <Button variant="outline" size="sm">
                              Detay
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Bu slota ait müşteri bulunmamaktadır.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Silme Onay Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slot Silme Onayı</DialogTitle>
            <DialogDescription>
              Bu slotu silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve slota bağlı tüm randevular da silinecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDeleteSlot} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                'Sil'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Randevu Boşaltma Onay Dialog */}
      <Dialog open={isEmptyDialogOpen} onOpenChange={setIsEmptyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Randevu Boşaltma Onayı</DialogTitle>
            <DialogDescription>
              Bu randevuyu boşaltmak istediğinize emin misiniz? Bu işlem müşteri ilişkisini koparacak ve randevu durumunu boşa alacaktır.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmptyDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleEmptyAppointment} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Boşaltılıyor...
                </>
              ) : (
                'Boşalt'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
