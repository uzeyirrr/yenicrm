'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { pb, ensureAuth } from '@/lib/pocketbase';

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  // Resolve params Promise with React.use()
  const resolvedParams = use(params);
  
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [changePassword, setChangePassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    role: '',
    avatar: '',
  });

  useEffect(() => {
    if (!resolvedParams.id) return;
    
    const loadUser = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Ensure we're authenticated
        await ensureAuth();
        
        // Get user data
        const user = await pb.collection('users').getOne(resolvedParams.id);
        
        // Set form data
        setFormData({
          email: user.email || '',
          password: '',
          passwordConfirm: '',
          name: user.name || '',
          role: user.role || 'user',
          avatar: user.avatar || '',
        });
      } catch (err: any) {
        console.error('Error loading user:', err);
        setError(err.message || 'Kullanıcı bilgileri yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, [resolvedParams.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.email || !formData.name) {
      setError('Lütfen tüm zorunlu alanları doldurun');
      return;
    }
    
    if (changePassword && formData.password !== formData.passwordConfirm) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      // Ensure we're authenticated
      await ensureAuth();
      
      // Prepare update data
      const updateData: any = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
      };
      
      // Add password if changing
      if (changePassword && formData.password) {
        updateData.password = formData.password;
        updateData.passwordConfirm = formData.passwordConfirm;
      }
      
      // Update user in PocketBase
      await pb.collection('users').update(resolvedParams.id, updateData);
      
      // Redirect to users list
      router.push('/dashboard/users');
    } catch (err: any) {
      console.error('Error updating user:', err);
      setError(err.message || 'Kullanıcı güncellenirken bir hata oluştu');
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Kullanıcı Düzenle</h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Kullanıcı Bilgileri</CardTitle>
          <CardDescription>
            Kullanıcı bilgilerini güncellemek için aşağıdaki formu düzenleyin.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="changePassword"
                  checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="changePassword">Şifre Değiştir</Label>
              </div>
            </div>
            
            {changePassword && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Yeni Şifre</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={changePassword}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">Şifre Tekrar</Label>
                  <Input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type="password"
                    value={formData.passwordConfirm}
                    onChange={handleInputChange}
                    required={changePassword}
                  />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={formData.role}
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rol seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Yönetici</SelectItem>
                    <SelectItem value="agent">Temsilci</SelectItem>
                    <SelectItem value="user">Kullanıcı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {formData.avatar && (
              <div className="space-y-2">
                <Label>Profil Resmi</Label>
                <div className="flex items-center space-x-4">
                  <img
                    src={`${pb.baseUrl}/api/files/users/${resolvedParams.id}/${formData.avatar}`}
                    alt="Profil Resmi"
                    className="h-20 w-20 rounded-full object-cover"
                  />
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/users')}
            >
              İptal
            </Button>
            
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'Değişiklikleri Kaydet'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
