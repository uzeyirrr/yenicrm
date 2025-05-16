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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Form schema
const slotFormSchema = z.object({
  name: z.string().min(1, "Slot adı gereklidir"),
  date: z.date({
    required_error: "Tarih seçmelisiniz",
  }),
  start: z.string().min(1, "Başlangıç saati gereklidir"),
  end: z.string().min(1, "Bitiş saati gereklidir"),
  capacity: z.coerce.number().min(1, "Kapasite en az 1 olmalıdır"),
  space: z.coerce.number().min(5, "Süre en az 5 dakika olmalıdır"),
  team: z.string().min(1, "Takım seçmelisiniz"),
  category: z.string().min(1, "Kategori seçmelisiniz"),
  company: z.string().min(1, "Şirket seçmelisiniz"),
  deaktif: z.boolean().default(false),
});

type SlotFormValues = z.infer<typeof slotFormSchema>;

export default function NewSlotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [appointmentPreview, setAppointmentPreview] = useState<string[]>([]);

  // Initialize form
  const form = useForm<SlotFormValues>({
    resolver: zodResolver(slotFormSchema),
    defaultValues: {
      name: "",
      date: new Date(),
      start: "09:00",
      end: "17:00",
      capacity: 1,
      space: 30,
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
        const categoriesResponse = await pb.collection("categories").getList(1, 100);
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
  const onSubmit = async (data: SlotFormValues) => {
    try {
      setLoading(true);
      setError("");

      // Format date for API
      const formattedDate = format(data.date, "yyyy-MM-dd");

      // Create slot
      const slotData = {
        name: data.name,
        date: formattedDate,
        start: data.start,
        end: data.end,
        capacity: data.capacity,
        space: data.space,
        team: data.team,
        category: data.category,
        company: data.company,
        deaktif: data.deaktif
      };

      // Create slot and get the created slot ID
      const createdSlot = await createSlot(slotData);
      
      // Generate appointments based on the slot data
      await generateAppointments(createdSlot.id, data);
      
      // Redirect to slot list
      router.push("/dashboard/slots");
    } catch (err) {
      console.error("Error creating slot:", err);
      setError("Slot oluşturulurken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  // Generate appointments for the slot
  const generateAppointments = async (slotId: string, data: SlotFormValues) => {
    try {
      const startTime = parse(data.start, "HH:mm", new Date());
      const endTime = parse(data.end, "HH:mm", new Date());
      
      // Calculate total minutes between start and end
      const totalMinutes = differenceInMinutes(endTime, startTime);
      
      // Calculate number of appointments
      const numberOfAppointments = Math.floor(totalMinutes / data.space);
      
      // Generate appointment records
      const appointmentPromises = [];
      
      for (let i = 0; i < numberOfAppointments; i++) {
        const appointmentTime = addMinutes(startTime, i * data.space);
        const formattedTime = format(appointmentTime, "HH:mm");
        
        // For each capacity, create an appointment
        for (let j = 0; j < data.capacity; j++) {
          const appointmentData = {
            title: `${data.name} - ${formattedTime}`,
            slot: slotId,
            status: "empty", // Initial status
          };
          
          // Create appointment record
          const promise = pb.collection("appointments").create(appointmentData);
          appointmentPromises.push(promise);
        }
      }
      
      // Wait for all appointments to be created
      await Promise.all(appointmentPromises);
      
      console.log(`Created ${appointmentPromises.length} appointments for slot ${slotId}`);
    } catch (error) {
      console.error("Error generating appointments:", error);
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kapasite (Her Zaman Dilimi İçin)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              placeholder="Kapasite"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Her zaman diliminde kaç kişi alınabilir
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                    Toplam {appointmentPreview.length} zaman dilimi, her biri için {watchedValues.capacity} randevu oluşturulacak.
                    <div className="font-semibold mt-1">
                      Toplam {appointmentPreview.length * watchedValues.capacity} randevu
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
