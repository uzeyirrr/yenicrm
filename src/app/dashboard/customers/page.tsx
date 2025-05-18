'use client';

import { useState, useEffect } from 'react';
import { Customer } from '@/lib/types';
import { getCustomers, deleteCustomer, searchCustomers } from '@/lib/customerService';
import { isAuthenticated } from '@/lib/pocketbase';
import Link from 'next/link';
import { Search, X } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const initializeAndLoad = async () => {
      try {
        if (!isAuthenticated()) {
          setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
          return;
        }
        await loadCustomers();
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Oturum başlatılırken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    initializeAndLoad();
  }, []);

  async function loadCustomers() {
    try {
      const customers = await getCustomers();
      if (customers && customers.length > 0) {
        setCustomers(customers);
      } else {
        setError('Müşteri verisi alınamadı');
      }
    } catch (err) {
      console.error('Loading customers error:', err);
      setError('Müşteriler yüklenirken bir hata oluştu');
      throw err;
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchTerm.trim()) {
      // If search term is empty, load all customers
      loadCustomers();
      return;
    }

    try {
      setIsSearching(true);
      setLoading(true);
      setError('');
      
      const results = await searchCustomers(searchTerm);
      
      if (results && results.length > 0) {
        setCustomers(results);
      } else {
        setCustomers([]);
        setError('Arama kriterlerine uygun müşteri bulunamadı');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Arama sırasında bir hata oluştu');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }

  function clearSearch() {
    setSearchTerm('');
    loadCustomers();
    setIsSearching(false);
  }

  async function handleDelete(id: string) {
    if (window.confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteCustomer(id);
        setCustomers(customers.filter(customer => customer.id !== id));
      } catch (err) {
        setError('Müşteri silinirken bir hata oluştu');
      }
    }
  }

  if (loading) return <div className="p-4">Yükleniyor...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Müşteriler</h1>
        <div className="flex space-x-2">
          <Link
            href="/dashboard/customers/new"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Yeni Müşteri
          </Link>
        </div>
      </div>
      
      {/* Arama formu */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex items-center">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
              placeholder="İsim, telefon, email veya konum ara..."
            />
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="ml-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg"
          >
            Ara
          </button>
        </form>
      </div>
      
      {isSearching && customers.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          <p>"{searchTerm}" için {customers.length} sonuç bulundu. <button onClick={clearSearch} className="text-blue-500 hover:underline">Aramayı temizle</button></p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İsim</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Konum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QC On</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QC Final</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{customer.surname}</td>
                <td className="px-6 py-4 whitespace-nowrap">{customer.tel}</td>
                <td className="px-6 py-4 whitespace-nowrap">{customer.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{customer.location}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    customer.qc_on === 'Rausgefallen' || customer.qc_on === 'Rausgefallen WP' 
                      ? 'bg-red-100 text-red-800' 
                      : customer.qc_on === 'Aranacak'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {customer.qc_on}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    customer.qc_final === 'Rausgefallen' || customer.qc_final === 'Rausgefallen WP'
                      ? 'bg-red-100 text-red-800'
                      : customer.qc_final === 'Okey'
                      ? 'bg-green-100 text-green-800'
                      : customer.qc_final === 'Neuleger' || customer.qc_final === 'Neuleger WP'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {customer.qc_final}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    href={`/dashboard/customers/${customer.id}`}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Düzenle
                  </Link>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
