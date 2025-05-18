'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addDays, parseISO, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

import { getSlots, Slot, subscribeToSlots, unsubscribeFromSlots } from '@/lib/slotService';
import { getAppointments, updateAppointmentStatus, subscribeToAppointments, unsubscribeFromAppointments } from '@/lib/appointmentService';
import { pb, isAuthenticated } from '@/lib/pocketbase';
import { useLocalStorage } from '@/lib/hooks';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Loader2, 
  Plus, 
  RefreshCw, 
  User, 
  Users 
} from 'lucide-react';

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [userTeams, setUserTeams] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useLocalStorage<string>('selectedCalendarCategory', '');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize week days
  useEffect(() => {
    if (isClient) { // Client-side only
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday as start of week
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start, end });
      setWeekDays(days);
    }
  }, [currentDate, isClient]);

  // Load user teams
  useEffect(() => {
    const loadUserTeams = async () => {
      try {
        if (!isAuthenticated()) {
          throw new Error('Kullanıcı oturumu geçersiz. Lütfen tekrar giriş yapın.');
        }

        const user = pb.authStore.model;
        if (!user) {
          throw new Error('Kullanıcı bilgisi bulunamadı');
        }

        // Get user's teams
        const userRecord = await pb.collection('users').getOne(user.id, {
          expand: 'teams'
        });

        if (userRecord.expand?.teams) {
          const teams = Array.isArray(userRecord.expand.teams) 
            ? userRecord.expand.teams.map((team: any) => team.id)
            : [userRecord.expand.teams.id];
          setUserTeams(teams);
        }
      } catch (err) {
        console.error('Error loading user teams:', err);
        setError('Kullanıcı takım bilgileri yüklenirken bir hata oluştu');
      }
    };

    loadUserTeams();
  }, []);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await pb.collection('appointments_category').getList(1, 100, {
          sort: 'name',
          filter: 'deaktif=false'
        });
        setCategories(categoriesData.items);
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    };

    loadCategories();
  }, []);

  // Load teams
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const teamsData = await pb.collection('teams').getList(1, 100, {
          sort: 'name'
        });
        setTeams(teamsData.items);
      } catch (err) {
        console.error('Error loading teams:', err);
      }
    };

    loadTeams();
  }, []);

  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const customersData = await pb.collection('customers').getList(1, 100, {
          sort: 'surname'
        });
        setCustomers(customersData.items);
      } catch (err) {
        console.error('Error loading customers:', err);
      }
    };

    loadCustomers();
  }, []);

  // Load slots and appointments
  const loadCalendarData = useCallback(async () => {
    if (!isClient) return; // Don't run on server
    
    setLoading(true);
    setError('');
    try {
      if (!isAuthenticated()) {
        throw new Error('Kullanıcı oturumu geçersiz. Lütfen tekrar giriş yapın.');
      }

      // Get start and end dates for the week
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      
      // Format dates for filtering
      const weekStartDate = format(start, 'yyyy-MM-dd');
      const weekEndDate = format(end, 'yyyy-MM-dd');
      
      // SIMPLE APPROACH: Just get all slots without filtering
      console.log('Loading all slots without filtering');
      
      // Get all slots
      const slotsData = await pb.collection('appointments_slots').getList(1, 100, {
        expand: 'team,category,company,appointments'
      });
      
      console.log(`Fetched ${slotsData.items.length} slots directly from PocketBase`);
      
      // Map records to slots with proper date handling
      const allSlots = slotsData.items.map((record: any) => {
        // Extract date part for display and filtering
        let slotDate = record.date || '';
        if (typeof slotDate === 'string' && slotDate.includes(' ')) {
          slotDate = slotDate.split(' ')[0]; // Get yyyy-MM-dd part
        }
        
        console.log(`Slot ${record.id}: original date=${record.date}, extracted date=${slotDate}`);
        
        return {
          id: record.id,
          name: record.name || '',
          start: record.start || '',
          end: record.end || '',
          team: record.team || '',
          capacity: record.capacity || 0,
          space: record.space || 0,
          category: record.category || '',
          company: record.company || '',
          deaktif: record.deaktif || false,
          appointments: record.appointments || [],
          date: slotDate, // Use the extracted date
          originalDate: record.date, // Keep original for reference
          created: record.created,
          updated: record.updated,
          expand: record.expand || {}
        };
      });
      
      // Filter slots for the current week
      const filteredSlots = allSlots.filter(slot => {
        const isInWeek = slot.date >= weekStartDate && slot.date <= weekEndDate;
        console.log(`Slot ${slot.id} date=${slot.date}, in week ${weekStartDate}-${weekEndDate}? ${isInWeek}`);
        return isInWeek;
      });
      
      console.log(`Filtered ${filteredSlots.length} slots for week ${weekStartDate} to ${weekEndDate}`);
      
      // Set the filtered slots
      setSlots(filteredSlots);
      
      // Get all appointments for these slots
      const slotIds = filteredSlots.map(slot => slot.id);
      
      if (slotIds.length > 0) {
        // Get appointments for all slots directly from PocketBase
        const appointmentsData = await pb.collection('appointments').getList(1, 500, {
          filter: `slot in ["${slotIds.join('","')}"]`,
          expand: 'customer,slot'
        });
        
        console.log(`Fetched ${appointmentsData.items.length} appointments directly from PocketBase`);
        setAppointments(appointmentsData.items);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error('Error loading calendar data:', err);
      setError('Takvim verileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentDate, isClient]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (isClient) {
      // Subscribe to appointments collection
      const appointmentsUnsubscribe = subscribeToAppointments((data) => {
        console.log('Appointment update received:', data);
        // Refresh data when changes occur
        loadCalendarData();
      });
      
      // Subscribe to slots collection
      const slotsUnsubscribe = subscribeToSlots((data: any) => {
        console.log('Slot update received:', data);
        // Refresh data when changes occur
        loadCalendarData();
      });
      
      return () => {
        // Unsubscribe when component unmounts
        unsubscribeFromAppointments();
        unsubscribeFromSlots();
      };
    }
  }, [loadCalendarData, isClient]);

  // Load data when dependencies change
  useEffect(() => {
    if (isClient) {
      loadCalendarData();
    }
  }, [loadCalendarData, isClient]);

  // Handle category change
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value === 'all' ? '' : value);
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, -7));
  };

  // Navigate to next week
  const goToNextWeek = () => {
    setCurrentDate(prevDate => addDays(prevDate, 7));
  };

  // Navigate to current week
  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  // Refresh calendar data
  const refreshData = () => {
    setRefreshing(true);
    loadCalendarData();
  };

  // Get slots for a specific day - SIMPLIFIED
  const getSlotsForDay = (day: Date) => {
    const dayString = format(day, 'yyyy-MM-dd');
    console.log(`Looking for slots on day: ${dayString}`);
    
    // Simple date comparison - we already normalized the dates in loadCalendarData
    const daySlots = slots.filter(slot => slot.date === dayString);
    
    console.log(`Found ${daySlots.length} slots for day ${dayString}:`, daySlots);
    return daySlots;
  };

  // Get appointments for a slot
  const getAppointmentsForSlot = (slotId: string) => {
    return appointments.filter(appointment => appointment.slot === slotId);
  };

  // Get category color
  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#e5e7eb'; // Default gray
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'empty':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'edit':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'okay':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Handle appointment click
  const handleAppointmentClick = async (appointment: any) => {
    // If appointment is already in 'edit' status by someone else, show warning
    if (appointment.status === 'edit') {
      toast.error('Bu randevu şu anda başka bir kullanıcı tarafından düzenleniyor');
      return;
    }
    
    // If appointment has a customer (status is 'okay'), navigate to appointment detail
    if (appointment.status === 'okay') {
      router.push(`/dashboard/appointments/${appointment.id}`);
      return;
    }
    
    // Otherwise, open dialog to add customer
    setSelectedAppointment(appointment);
    
    // Set status to 'edit'
    try {
      await updateAppointmentStatus(appointment.id, 'edit');
      setIsDialogOpen(true);
    } catch (err) {
      console.error('Error updating appointment status:', err);
      toast.error('Randevu durumu güncellenirken bir hata oluştu');
    }
  };

  // Handle dialog close
  const handleDialogClose = async () => {
    // Reset status to 'empty' if dialog is closed without saving
    if (selectedAppointment && selectedAppointment.status === 'edit') {
      try {
        await updateAppointmentStatus(selectedAppointment.id, 'empty');
      } catch (err) {
        console.error('Error resetting appointment status:', err);
      }
    }
    
    setIsDialogOpen(false);
    setSelectedAppointment(null);
    setSelectedCustomer('');
  };

  // Handle save appointment
  const handleSaveAppointment = async () => {
    if (!selectedAppointment || !selectedCustomer) {
      toast.error('Lütfen bir müşteri seçin');
      return;
    }
    
    setSaving(true);
    
    try {
      // Update appointment with customer and set status to 'okay'
      await pb.collection('appointments').update(selectedAppointment.id, {
        customer: selectedCustomer,
        status: 'okay'
      });
      
      toast.success('Randevu başarıyla güncellendi');
      setIsDialogOpen(false);
      setSelectedAppointment(null);
      setSelectedCustomer('');
      
      // Refresh data
      loadCalendarData();
    } catch (err) {
      console.error('Error saving appointment:', err);
      toast.error('Randevu kaydedilirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  // Format customer name
  const formatCustomerName = (customer: any) => {
    if (!customer) return '';
    return `${customer.name || ''} ${customer.surname || ''}`.trim();
  };

  // Don't render skeletons on server to avoid hydration mismatch
  if (!isClient) {
    return <div className="p-6"><h1 className="text-2xl font-bold">Takvim</h1></div>;
  }
  
  if (loading && !refreshing) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Takvim</h1>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-4">
          {Array(7).fill(0).map((_, index) => (
            <div key={index} className="text-center">
              <Skeleton className="h-8 w-full mb-2" />
              <div className="space-y-2">
                {Array(3).fill(0).map((_, slotIndex) => (
                  <Skeleton key={slotIndex} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
        <h1 className="text-2xl font-bold">Takvim</h1>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Category filter */}
          <div className="flex items-center">
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tüm Kategoriler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id || 'unknown'}>
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: category.color || '#e5e7eb' }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Navigation buttons */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToPreviousWeek}
              title="Önceki Hafta"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              onClick={goToCurrentWeek}
              title="Bugün"
            >
              Bugün
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToNextWeek}
              title="Sonraki Hafta"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={refreshData}
              disabled={refreshing}
              title="Yenile"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {/* Week header */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-semibold">
          {format(weekDays[0], 'd MMMM', { locale: tr })} - {format(weekDays[6], 'd MMMM yyyy', { locale: tr })}
        </h2>
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day, index) => (
          <div key={index} className="border rounded-lg overflow-hidden">
            {/* Day header */}
            <div className={`p-2 text-center font-semibold ${
              isSameDay(day, new Date()) ? 'bg-blue-100 text-blue-800' : 'bg-gray-50'
            }`}>
              {format(day, 'EEEE', { locale: tr })}
              <div className="text-sm font-normal">
                {format(day, 'd MMMM', { locale: tr })}
              </div>
            </div>
            
            {/* Slots for this day */}
            <div className="p-2 space-y-2">
              {getSlotsForDay(day).length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Bu gün için slot bulunmamaktadır
                </div>
              ) : (
                getSlotsForDay(day).map(slot => {
                  const slotAppointments = getAppointmentsForSlot(slot.id);
                  const categoryColor = getCategoryColor(slot.category);
                  
                  return (
                    <Card 
                      key={slot.id} 
                      className="overflow-hidden"
                      style={{ borderColor: categoryColor }}
                    >
                      <CardHeader className="p-3 pb-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-sm font-medium">
                              {slot.name || 'İsimsiz Slot'}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {slot.start} - {slot.end}
                            </CardDescription>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Badge variant="outline" className="text-xs">
                              {slotAppointments.length}/{slot.capacity || 0}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="text-xs flex items-center"
                              style={{ borderColor: categoryColor, color: categoryColor }}
                            >
                              {slot.expand?.category?.name || 'Kategori'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-2">
                        <div className="text-xs text-gray-500 mb-1 flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {slot.expand?.team?.name || 'Ekip'}
                        </div>
                        
                        {/* Appointments */}
                        <div className="space-y-1 mt-2">
                          {slotAppointments.map(appointment => (
                            <div 
                              key={appointment.id}
                              className={`px-2 py-1 rounded-md border cursor-pointer text-xs ${getStatusColor(appointment.status)}`}
                              onClick={() => handleAppointmentClick(appointment)}
                            >
                              <div className="flex justify-between items-center">
                                <div className="font-medium">
                                  {appointment.status === 'okay' && appointment.expand?.customer ? (
                                    <div className="flex items-center">
                                      <User className="h-3 w-3 mr-1" />
                                      {formatCustomerName(appointment.expand.customer)}
                                    </div>
                                  ) : (
                                    <span>Boş Randevu</span>
                                  )}
                                </div>
                                <div>
                                  {appointment.status === 'empty' && (
                                    <Plus className="h-3 w-3" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Customer selection dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleDialogClose();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Randevuya Müşteri Ekle</DialogTitle>
            <DialogDescription>
              Bu randevuya eklemek istediğiniz müşteriyi seçin
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Müşteri</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Müşteri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id || 'unknown-customer'}>
                        {formatCustomerName(customer)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              İptal
            </Button>
            <Button 
              onClick={handleSaveAppointment} 
              disabled={saving || !selectedCustomer}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'Kaydet'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
