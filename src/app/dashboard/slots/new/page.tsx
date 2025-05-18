"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, parse, addMinutes, differenceInMinutes } from "date-fns";
import { tr } from "date-fns/locale";
import { createSlot } from "@/lib/slotService";
import { pb } from "@/lib/pocketbase";
import { isAuthenticated, adminLogin } from "@/lib/pocketbase";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Form validation schema
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Slot adı en az 2 karakter olmalıdır",
  }),
  date: z.date({
    required_error: "Bir tarih seçmelisiniz",
  }),
  start: z.string({
    required_error: "Başlangıç saati gereklidir",
  }),
  end: z.string({
    required_error: "Bitiş saati gereklidir",
  }),
  space: z.coerce.number({
    required_error: "Randevu aralığı gereklidir",
  }).min(5, "Süre en az 5 dakika olmalıdır"),
  team: z.string({
    required_error: "Bir ekip seçmelisiniz",
  }),
  category: z.string({
    required_error: "Bir kategori seçmelisiniz",
  }),
  company: z.string({
    required_error: "Bir firma seçmelisiniz",
  }),
  deaktif: z.boolean().default(false),
});

// Form değerlerinin tipini formSchema'dan türetiyoruz
type SlotFormValues = z.infer<typeof formSchema>;

// Form değerlerinin tipini açık şekilde tanımlıyoruz
type FormValues = {
  name: string;
  date: Date;
  start: string;
  end: string;
  space: number;
  team: string;
  category: string;
  company: string;
  deaktif: boolean;
};

export default function NewSlotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [appointmentPreview, setAppointmentPreview] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with correct types
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      date: new Date(),
      start: "11:00",
      end: "19:00",
      space: 120,
      team: "",
      category: "",
      company: "",
      deaktif: false,
    },
  });

  // Watch form values to generate appointment preview
  const watchedValues = form.watch();

  // Load teams, categories, and companies
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!isAuthenticated()) {
          await adminLogin();
        }

        // Load teams
        const teamsResponse = await pb.collection("teams").getList(1, 100);
        setTeams(teamsResponse.items);
        // Load categories
        const categoriesResponse = await pb.collection("appointments_category").getList(1, 100);
        setCategories(categoriesResponse.items);
        // Load companies
        const companiesResponse = await pb.collection("companies").getList(1, 100);
        setCompanies(companiesResponse.items);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Veri yüklenirken bir hata oluştu");
      }
    };

    loadData();
  }, []);

  // Generate appointment preview when form values change
  useEffect(() => {
    if (watchedValues.start && watchedValues.end && watchedValues.space) {
      try {
        const startTime = parse(watchedValues.start, "HH:mm", new Date());
        const endTime = parse(watchedValues.end, "HH:mm", new Date());
        
        // Calculate total minutes between start and end
        const totalMinutes = differenceInMinutes(endTime, startTime);
        
        // If end time is before start time or same, return
        if (totalMinutes <= 0) {
          setAppointmentPreview([]);
          return;
        }
        
        // Calculate number of appointments
        const numberOfAppointments = Math.floor(totalMinutes / watchedValues.space);
        
        // Generate appointment times
        const appointments = [];
        for (let i = 0; i < numberOfAppointments; i++) {
          const appointmentTime = addMinutes(startTime, i * watchedValues.space);
          appointments.push(format(appointmentTime, "HH:mm"));
        }
        
        setAppointmentPreview(appointments);
      } catch (error) {
        console.error("Error generating appointment preview:", error);
        setAppointmentPreview([]);
      }
    }
  }, [watchedValues.start, watchedValues.end, watchedValues.space]);

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      setLoading(true);
      setError("");

      // Parse start and end times
      const parsedStartTime = parse(data.start, "HH:mm", new Date());
      const parsedEndTime = parse(data.end, "HH:mm", new Date());
      
      // Calculate total minutes between start and end
      const totalMinutes = differenceInMinutes(parsedEndTime, parsedStartTime);
      
      // If end time is before start time or same, show error
      if (totalMinutes <= 0) {
        setError("Bitiş saati başlangıç saatinden sonra olmalıdır");
        setLoading(false);
        setIsSubmitting(false);
        return;
      }

      // Format date for API - ensure it's in YYYY-MM-DD format
      const formattedDate = format(data.date, "yyyy-MM-dd");

      // Prepare slot data with only the essential fields
      // API dokümantasyonuna göre start ve end number olmalı, team bir dizi olmalı
      
      // Saatleri sadece saat kısmını sayı olarak alıyoruz
      // Format: HH:mm -> sadece saat kısmı (11:00 -> 11, 19:00 -> 19)
      const startHour = Number(data.start.split(':')[0]);
      const endHour = Number(data.end.split(':')[0]);
      
      console.log(`Saat dönüşümü: ${data.start} -> ${startHour}, ${data.end} -> ${endHour}`);
      
      const slotData = {
        name: data.name,
        date: formattedDate,
        start: startHour, // Sadece saat kısmı (sayı olarak)
        end: endHour,     // Sadece saat kısmı (sayı olarak)
        space: Number(data.space), // Ensure it's a number
        team: [data.team], // Dizi olarak gönder
        category: data.category,
        company: data.company,
        deaktif: false,
      };

      // PocketBase'in beklediği şekilde verileri düzenle
      // CORS sorunlarını önlemek için PocketBase'in özel ayarlarını kullan
      pb.autoCancellation(false);
      console.log("Sending slot data:", slotData);

      try {
        // CORS sorunlarını önlemek için PocketBase yapılandırması
        pb.autoCancellation(false);

        // Slot oluşturma işlemi
        console.log("Slot oluşturuluyor...");
        const createdSlot = await pb.collection('appointments_slots').create(slotData);
        console.log("Slot başarıyla oluşturuldu:", createdSlot.id);
        
        // Kısa bir bekleme süresi ekle
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Randevuları oluştur
        await generateAppointments(createdSlot.id, data);
        
        // Slot listesine yönlendir
        router.push("/dashboard/slots");
      } catch (apiError: any) {
        console.error("API Error:", apiError);
        
        // Handle specific API errors
        if (apiError.status === 400) {
          if (apiError.data && apiError.data.message) {
            setError(`API Hatası: ${apiError.data.message}`);
          } else {
            setError("Slot verilerinde eksik veya hatalı alanlar var");
          }
        } else {
          setError(`Slot oluşturulurken bir hata oluştu: ${apiError.message || 'Bilinmeyen hata'}`);
        }
      }
    } catch (err: any) {
      console.error("Error in form submission:", err);
      setError(`Slot oluşturulurken bir hata oluştu: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // Generate appointments for the slot
  const generateAppointments = async (slotId: string, data: SlotFormValues) => {
    try {
      // Use the current date for parsing times
      const today = new Date();
      const startTime = parse(data.start, "HH:mm", today);
      const endTime = parse(data.end, "HH:mm", today);
      
      // Calculate total minutes between start and end
      const totalMinutes = differenceInMinutes(endTime, startTime);
      
      // Calculate number of appointments
      const numberOfAppointments = Math.floor(totalMinutes / data.space);
      
      console.log(`Generating ${numberOfAppointments} appointments for slot ${slotId}`);
      
      // Generate appointment records
      const formattedDate = format(data.date, "yyyy-MM-dd");

      // Randevuları tek tek oluştur
      for (let i = 0; i < numberOfAppointments; i++) {
        // Başlangıç saatini parse et ve randevu başlangıç saatini hesapla
        const startTimeObj = parse(data.start, "HH:mm", new Date());
        const appointmentStartTime = addMinutes(startTimeObj, i * data.space);
        const formattedStartTime = format(appointmentStartTime, "HH:mm");
        const shortStartTime = format(appointmentStartTime, "HH"); // Sadece saat kısmı (11, 13 gibi)
        
        // Randevu bitiş saatini hesapla
        const appointmentEndTime = addMinutes(appointmentStartTime, data.space);
        const formattedEndTime = format(appointmentEndTime, "HH:mm");
        const shortEndTime = format(appointmentEndTime, "HH"); // Sadece saat kısmı (13, 15 gibi)
        
        // Randevu zaman aralığını oluştur (11-13, 13-15 gibi)
        const timeRange = `${shortStartTime}-${shortEndTime}`;
        console.log(`Randevu zaman aralığı: ${timeRange}`);
        
        // Randevu için başlık oluştur - zaman aralığını içerecek şekilde
        const appointmentTitle = timeRange;
        console.log(`Randevu başlığı: ${appointmentTitle}`);
        
        // API'nin beklediği formatta veri hazırla
        const appointmentData = {
          name: appointmentTitle, // Saati içeren isim
          status: "empty",
          date: formattedDate,
          time: formattedStartTime, // String olarak gönder (HH:mm formatında)
          team: [data.team], // Dizi olarak gönder
          category: data.category,
          company: data.company,
          slot: slotId, // Doğrudan slot ID'sini randevuya ekle
        };
        
        console.log(`Oluşturulan randevu verileri:`, appointmentData);
        
        try {
          // CORS sorunlarını önlemek için ayarlar
          pb.autoCancellation(false);
          
          // Önce randevuyu oluştur
          const createdAppointment = await pb.collection("appointments").create(appointmentData);
          console.log(`Randevu oluşturuldu: ${formattedStartTime}`, createdAppointment.id);
          
          // Randevu oluşturuldu, şimdi slot ile ilişkilendirelim
          try {
            // Önce mevcut slot'u al
            const slot = await pb.collection("appointments_slots").getOne(slotId);
            
            // Mevcut randevular listesini al
            const currentAppointments = slot.appointments || [];
            
            // Yeni randevu ID'sini listeye ekle
            const updatedAppointments = [...currentAppointments, createdAppointment.id];
            
            // Slot'u güncelle
            const updatedSlot = await pb.collection("appointments_slots").update(slotId, {
              appointments: updatedAppointments
            });
            
            console.log(`Slot güncellendi, randevu ilişkilendirildi:`, updatedSlot.id);
          } catch (relationError) {
            console.error(`Slot-Randevu ilişkilendirme hatası:`, relationError);
          }
          
          // Kısa bir bekleme süresi ekle (API'yi aşırı yüklememek için)
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          const appointmentError = error as { data?: { message?: string, [key: string]: any } };
          console.error(`Randevu oluşturma hatası (${formattedStartTime}):`, appointmentError);
          // Hata detaylarını göster
          if (appointmentError.data) {
            console.error('Hata detayları:', appointmentError.data);
          }
          // Bir randevu başarısız olsa bile diğerlerine devam et
        }
      }
      
      console.log(`Slot için tüm randevular oluşturuldu: ${slotId}`);
    } catch (error) {
      console.error("Randevu oluşturma genel hatası:", error);
      throw error;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Link href="/dashboard/slots" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Yeni Slot Oluştur</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Slot Bilgileri</CardTitle>
              <CardDescription>
                Yeni bir slot oluşturmak için aşağıdaki bilgileri doldurun
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const values = form.getValues();
                  onSubmit(values);
                }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slot Adı</FormLabel>
                          <FormControl>
                            <Input placeholder="Slot adını girin" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Tarih</FormLabel>
                          <DatePicker
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={loading}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Başlangıç Saati</FormLabel>
                          <FormControl>
                            <TimePicker
                              value={field.value}
                              onChange={field.onChange}
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bitiş Saati</FormLabel>
                          <FormControl>
                            <TimePicker
                              value={field.value}
                              onChange={field.onChange}
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="space"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Randevu Süresi (Dakika)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={5}
                              step={5}
                              placeholder="Süre"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Her randevu kaç dakika sürecek
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="team"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Takım</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={loading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Takım seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teams.map((team) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kategori</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={loading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Kategori seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Şirket</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={loading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Şirket seçin" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {companies.map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="deaktif"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Deaktif</FormLabel>
                          <FormDescription>
                            Slot oluşturulduktan sonra aktif olmasın
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Slot Oluştur
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Randevu Önizleme</CardTitle>
              <CardDescription>
                Bu ayarlarla oluşturulacak randevular
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appointmentPreview.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground mb-2">
                    <div className="font-semibold mt-1">
                      Toplam {appointmentPreview.length} randevu oluşturulacak
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto border rounded-md p-2">
                    {appointmentPreview.map((time, index) => (
                      <div key={index} className="py-1 px-2 border-b last:border-0">
                        {time}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Geçerli zaman aralığı ve süre belirleyin
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
