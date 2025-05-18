'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomer } from '@/lib/customerService';
import { getUsers, getCurrentUser, User } from '@/lib/userService';
import { pb } from '@/lib/pocketbase';
import Link from 'next/link';
import Image from 'next/image';

type FormData = {
  surname: string;
  tel: string;
  home_tel: string;
  email: string;
  home_people_number: string;
  age: string;
  location: string;
  street: string;
  postal_code: string;
  who_is_customer: string;
  roof_type: string;
  what_talked: string;
  roof: string;
  note: string;
  qc_on: 'Yeni';
  qc_final: 'Yeni';
  agent: string;
};

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [roofImage, setRoofImage] = useState<File | null>(null);
  const [roofPreview, setRoofPreview] = useState<string>('');

  const [formData, setFormData] = useState<FormData>({
    surname: '',
    tel: '',
    home_tel: '',
    email: '',
    home_people_number: '',
    age: '',
    location: '',
    street: '',
    postal_code: '',
    who_is_customer: '',
    roof_type: '',
    what_talked: '',
    roof: '',
    note: '',
    qc_on: 'Yeni' as const,
    qc_final: 'Yeni' as const,
    agent: ''
  });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersList = await getUsers();
        setUsers(usersList);
        const current = await getCurrentUser();
        setCurrentUser(current);
        if (current) {
          setFormData(prev => ({ ...prev, agent: current.id }));
        }
      } catch (err) {
        console.error('Error loading users:', err);
      }
    };
    loadUsers();
  }, []);

  const handleRoofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRoofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setRoofPreview(reader.result as string);
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
          setRoofImage(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setRoofPreview(reader.result as string);
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
    setLoading(true);
    setError('');

    try {
      const formDataToSubmit = {
        ...formData,
        home_people_number: parseInt(formData.home_people_number) || 0,
        age: parseInt(formData.age) || 0
      };

      const record = await createCustomer(formDataToSubmit);

      // Upload roof image if selected
      if (roofImage && record.id) {
        const formData = new FormData();
        formData.append('roof', roofImage);
        
        await pb.collection('customers').update(record.id, formData);
      }

      router.push('/dashboard/profile');
    } catch (err) {
      console.error('Error creating customer:', err);
      setError('Müşteri eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Yeni Müşteri</h1>
          <Link
            href="/dashboard/customers"
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Geri
          </Link>
        </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">İsim</label>
            <input
              type="text"
              name="surname"
              value={formData.surname}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
              placeholder="Müşteri adı"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Telefon</label>
            <input
              type="tel"
              name="tel"
              value={formData.tel}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Ev Telefonu</label>
            <input
              type="tel"
              name="home_tel"
              value={formData.home_tel}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Evdeki Kişi Sayısı</label>
            <input
              type="number"
              name="home_people_number"
              value={formData.home_people_number}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Yaş</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Konum</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Sokak</label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Posta Kodu</label>
            <input
              type="text"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Müşteri Kimdir</label>
            <input
              type="text"
              name="who_is_customer"
              value={formData.who_is_customer}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Temsilci</label>
            <select
              name="agent"
              value={formData.agent}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
            >
              <option value="">Seçiniz</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Çatı Tipi</label>
            <select
              name="roof_type"
              value={formData.roof_type}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
            >
              <option value="">Seçiniz</option>
              <option value="Kiremit">Kiremit</option>
              <option value="Sac">Sac</option>
              <option value="Beton">Beton</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>

          <div className="space-y-2 col-span-2">
            <label className="block text-sm font-semibold text-gray-700">Çatı Görseli</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors">
              <div className="space-y-1 text-center">
                {roofPreview ? (
                  <div className="relative w-full h-48">
                    <Image
                      src={roofPreview}
                      alt="Çatı önizleme"
                      fill
                      className="object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="roof-upload"
                    className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Dosya Yükle</span>
                    <input
                      id="roof-upload"
                      name="roof-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleRoofImageChange}
                    />
                  </label>
                  <p className="pl-1">veya sürükleyip bırakın</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF max 10MB</p>
                <p className="text-xs text-gray-500 mt-1">Ayrıca <span className="font-semibold">Ctrl+V</span> ile panodaki görseli yapıştırabilirsiniz</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Konuşulanlar</label>
            <textarea
              name="what_talked"
              value={formData.what_talked}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Notlar</label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Müşteri ile ilgili notları buraya ekleyebilirsiniz"
            />
          </div>

          {/* Çatı alanı kaldırıldı, sadece görsel yükleme alanı kullanılacak */}

          {/* QC fields are hidden and set to 'Yeni' by default */}
          <input type="hidden" name="qc_on" value="Yeni" />
          <input type="hidden" name="qc_final" value="Yeni" />
        </div>

        <div className="flex justify-between space-x-4 pt-6 border-t">
          <Link
            href="/dashboard/profile"
            className="flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Geri Dön
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
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
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
