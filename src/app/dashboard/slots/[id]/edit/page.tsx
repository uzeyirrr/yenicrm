'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

import { getSlot, updateSlot } from '@/lib/slotService';
import { getTeams } from '@/lib/teamService';
import { getCompanies } from '@/lib/companyService';
import { isAuthenticated } from '@/lib/pocketbase';
import { pb } from '@/lib/pocketbase';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function EditSlotPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    start: '',
    end: '',
    team: '',
    capacity: 0,
    space: 0,
    category: '',
    company: '',
    deaktif: false,
    date: '',
    created: '',
    updated: ''
  });
  
  // Options for select fields
  const [teams, setTeams] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const initializeAndLoad = async () => {
      try {
        if (!isAuthenticated()) {
          throw new Error('Kullanıcı oturumu geçersiz. Lütfen tekrar giriş yapın.');
        }
        
        await Promise.all([
          loadSlot(),
          loadTeams(),
          loadCompanies(),
          loadCategories()
        ]);
      } catch (err) {
        console.error('Error initializing edit slot page:', err);
        setError(err instanceof Error ? err.message : 'Slot bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    initializeAndLoad();
  }, [resolvedParams.id]);

  const loadSlot = async () => {
    try {
      const slotData = await getSlot(resolvedParams.id);
      setFormData({
        ...slotData,
        team: typeof slotData.team === 'object' ? slotData.team.id : slotData.team,
        company: typeof slotData.company === 'object' ? slotData.company.id : slotData.company,
        category: typeof slotData.category === 'object' ? slotData.category.id : slotData.category
      });
    } catch (err) {
      console.error('Error loading slot:', err);
      throw new Error('Slot bilgileri yüklenirken bir hata oluştu');
    }
  };

  const loadTeams = async () => {
    try {
      const teamsData = await getTeams();
      setTeams(teamsData);
    } catch (err) {
      console.error('Error loading teams:', err);
      // Continue even if teams can't be loaded
    }
  };

  const loadCompanies = async () => {
    try {
      const companiesData = await getCompanies();
      setCompanies(companiesData);
    } catch (err) {
      console.error('Error loading companies:', err);
      // Continue even if companies can't be loaded
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await pb.collection('appointments_category').getList(1, 100, {
        sort: 'name',
        filter: 'deaktif=false'
      });
      setCategories(categoriesData.items);
    } catch (err) {
      console.error('Error loading categories:', err);
      // Continue even if categories can't be loaded
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Convert numeric values
    if (name === 'capacity' || name === 'space') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, deaktif: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Extract data to update
      const { id, created, updated, ...updateData } = formData;
      
      // Update slot
      await updateSlot(resolvedParams.id, updateData);
      
      toast.success('Slot başarıyla güncellendi');
      router.push('/dashboard/profile'); // Profil sayfasına yönlendir
    } catch (err) {
      console.error('Error updating slot:', err);
      setError('Slot güncellenirken bir hata oluştu');
      toast.error('Slot güncellenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Slot Düzenle</CardTitle>
            <CardDescription>Slot bilgilerini güncelleyin</CardDescription>
          </div>
          <Link href={`/dashboard/slots/${resolvedParams.id}`}>
            <Button variant="outline" className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Slot Detayına Dön
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Slot Adı */}
              <div className="space-y-2">
                <Label htmlFor="name">Slot Adı</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Tarih */}
              <div className="space-y-2">
                <Label htmlFor="date">Tarih</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Başlangıç Saati */}
              <div className="space-y-2">
                <Label htmlFor="start">Başlangıç Saati</Label>
                <Input
                  id="start"
                  name="start"
                  type="time"
                  value={formData.start}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Bitiş Saati */}
              <div className="space-y-2">
                <Label htmlFor="end">Bitiş Saati</Label>
                <Input
                  id="end"
                  name="end"
                  type="time"
                  value={formData.end}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Ekip */}
              <div className="space-y-2">
                <Label htmlFor="team">Ekip</Label>
                <Select
                  value={formData.team}
                  onValueChange={(value) => handleSelectChange('team', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ekip seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Şirket */}
              <div className="space-y-2">
                <Label htmlFor="company">Şirket</Label>
                <Select
                  value={formData.company}
                  onValueChange={(value) => handleSelectChange('company', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Şirket seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Kategori */}
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleSelectChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Kapasite */}
              <div className="space-y-2">
                <Label htmlFor="capacity">Kapasite</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="0"
                  value={formData.capacity}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Aralık (dk) */}
              <div className="space-y-2">
                <Label htmlFor="space">Aralık (dk)</Label>
                <Input
                  id="space"
                  name="space"
                  type="number"
                  min="0"
                  value={formData.space}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Durum */}
              <div className="space-y-2 flex items-center">
                <div className="flex-1">
                  <Label htmlFor="deaktif">Deaktif</Label>
                  <p className="text-sm text-gray-500">Slot'u devre dışı bırakmak için etkinleştirin</p>
                </div>
                <Switch
                  id="deaktif"
                  checked={formData.deaktif}
                  onCheckedChange={handleSwitchChange}
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Kaydet
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
