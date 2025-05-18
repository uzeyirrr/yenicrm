'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subWeeks } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Tab } from '@headlessui/react';
import { pb } from '@/lib/pocketbase';

// Renk paleti
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Veri filtresi türleri
type FilterPeriod = 'week' | 'month' | 'quarter' | 'year';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('week');
  
  // Analiz verileri
  const [qcOnAnalytics, setQcOnAnalytics] = useState<any[]>([]);
  const [qcFinalAnalytics, setQcFinalAnalytics] = useState<any[]>([]);
  const [salesAnalytics, setSalesAnalytics] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [topTeams, setTopTeams] = useState<any[]>([]);
  
  // Tarih aralığını hesapla
  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;
    
    switch (filterPeriod) {
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Pazartesi başlangıç
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfMonth(subMonths(now, 3));
        endDate = endOfMonth(now);
        break;
      case 'year':
        startDate = startOfMonth(subMonths(now, 12));
        endDate = endOfMonth(now);
        break;
      default:
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
    }
    
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    };
  };
  
  // Verileri yükle
  const loadData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      console.log('Tarih aralığı:', { startDate, endDate });
      
      // Müşteri verilerini çek
      const customersData = await pb.collection('customers').getList(1, 500, {
        filter: `created >= "${startDate}" && created <= "${endDate}"`,
        sort: '-created'
      });
      
      console.log('Müşteri verileri yüklendi:', customersData.items.length);
      
      // Slot verilerini çek
      const slotsData = await pb.collection('appointments_slots').getList(1, 500, {
        filter: `created >= "${startDate}" && created <= "${endDate}"`,
        expand: 'team,appointments',
        sort: '-created'
      });
      
      console.log('Slot verileri yüklendi:', slotsData.items.length);
      
      // Randevu verilerini çek
      const appointmentsData = await pb.collection('appointments').getList(1, 500, {
        filter: `created >= "${startDate}" && created <= "${endDate}"`,
        expand: 'customer,slot',
        sort: '-created'
      });
      
      console.log('Randevu verileri yüklendi:', appointmentsData.items.length);
      
      // Kullanıcı verilerini çek
      const usersData = await pb.collection('users').getList(1, 100, {
        sort: 'name'
      });
      
      console.log('Kullanıcı verileri yüklendi:', usersData.items.length);
      
      // Takım verilerini çek
      const teamsData = await pb.collection('teams').getList(1, 100, {
        sort: 'name'
      });
      
      console.log('Takım verileri yüklendi:', teamsData.items.length);
      
      // Verileri işle
      processData(customersData.items, slotsData.items, appointmentsData.items, usersData.items, teamsData.items);
    } catch (error) {
      console.error('Veri yüklenirken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Gerçek verilerle analiz oluştur
  const processData = (customers: any[], slots: any[], appointments: any[], users: any[], teams: any[]) => {
    // QC On durumu analizi
    const qcOnCounts = {
      'Yeni': 0,
      'Aranacak': 0,
      'Rausgefallen': 0,
      'Rausgefallen WP': 0
    };
    
    // QC Final durumu analizi
    const qcFinalCounts = {
      'Yeni': 0,
      'Okey': 0,
      'Rausgefallen': 0,
      'Rausgefallen WP': 0,
      'Neuleger': 0,
      'Neuleger WP': 0
    };
    
    // Müşteri durumlarını say
    customers.forEach(customer => {
      // QC On durumlarını say
      if (customer.qc_on && qcOnCounts.hasOwnProperty(customer.qc_on)) {
        qcOnCounts[customer.qc_on]++;
      }
      
      // QC Final durumlarını say
      if (customer.qc_final && qcFinalCounts.hasOwnProperty(customer.qc_final)) {
        qcFinalCounts[customer.qc_final]++;
      }
    });
    
    // QC On verilerini ayarla
    const qcOnStats = Object.keys(qcOnCounts).map(key => ({
      name: key,
      value: qcOnCounts[key]
    }));
    setQcOnAnalytics(qcOnStats);
    
    // QC Final verilerini ayarla
    const qcFinalStats = Object.keys(qcFinalCounts).map(key => ({
      name: key,
      value: qcFinalCounts[key]
    }));
    setQcFinalAnalytics(qcFinalStats);
    
    // Kullanıcı başına müşteri sayısını hesapla
    const userCustomerCounts = {};
    customers.forEach(customer => {
      if (customer.agent) {
        if (!userCustomerCounts[customer.agent]) {
          userCustomerCounts[customer.agent] = 0;
        }
        userCustomerCounts[customer.agent]++;
      }
    });
    
    // Kullanıcı isimlerini bul
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user.name || user.email || 'Kullanıcı ' + user.id;
    });
    
    // En çok müşterisi olan kullanıcıları bul
    const topUsersList = Object.keys(userCustomerCounts)
      .map(userId => ({
        name: userMap[userId] || 'Kullanıcı ' + userId,
        count: userCustomerCounts[userId]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    setTopUsers(topUsersList);
    
    // Takım başına randevu sayısını hesapla
    const teamAppointmentCounts = {};
    slots.forEach(slot => {
      if (slot.team && slot.expand?.appointments?.length) {
        if (!teamAppointmentCounts[slot.team]) {
          teamAppointmentCounts[slot.team] = 0;
        }
        teamAppointmentCounts[slot.team] += slot.expand.appointments.length;
      }
    });
    
    // Takım isimlerini bul
    const teamMap = {};
    teams.forEach(team => {
      teamMap[team.id] = team.name || 'Takım ' + team.id;
    });
    
    // En çok randevusu olan takımları bul
    const topTeamsList = Object.keys(teamAppointmentCounts)
      .map(teamId => ({
        name: teamMap[teamId] || 'Takım ' + teamId,
        count: teamAppointmentCounts[teamId]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    setTopTeams(topTeamsList);
    
    // Günlük satış verilerini hesapla
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const salesByDay = {};
    
    // Her gün için boş bir değer ata
    dayNames.forEach(day => {
      salesByDay[day] = 0;
    });
    
    // Randevuları günlere göre grupla
    appointments.forEach(appointment => {
      if (appointment.created) {
        const date = new Date(appointment.created);
        const dayName = dayNames[date.getDay()];
        salesByDay[dayName]++;
      }
    });
    
    // Satış verilerini ayarla
    const salesData = Object.keys(salesByDay).map(day => ({
      name: day,
      sales: salesByDay[day]
    }));
    
    setSalesAnalytics(salesData);
  };
  
  // Filtreleme değiştiğinde verileri yeniden yükle
  useEffect(() => {
    loadData();
  }, [filterPeriod]);
  
  return (
    <div className="space-y-8">
      {/* Filtre Seçenekleri */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">CRM Analiz Paneli</h2>
          <div className="flex space-x-2">
            <button 
              onClick={() => setFilterPeriod('week')} 
              className={`px-4 py-2 rounded-md ${filterPeriod === 'week' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
            >
              Haftalık
            </button>
            <button 
              onClick={() => setFilterPeriod('month')} 
              className={`px-4 py-2 rounded-md ${filterPeriod === 'month' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
            >
              Aylık
            </button>
            <button 
              onClick={() => setFilterPeriod('quarter')} 
              className={`px-4 py-2 rounded-md ${filterPeriod === 'quarter' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
            >
              3 Aylık
            </button>
            <button 
              onClick={() => setFilterPeriod('year')} 
              className={`px-4 py-2 rounded-md ${filterPeriod === 'year' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
            >
              Yıllık
            </button>
          </div>
        </div>
      </div>
      
      {/* Grafik ve Analiz Bölümü */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QC On Durumu Analizi */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">QC On Durumu Analizi</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <p>Yükleniyor...</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={qcOnAnalytics}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {qcOnAnalytics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        {/* QC Final Durumu Analizi */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">QC Final Durumu Analizi</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <p>Yükleniyor...</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={qcFinalAnalytics}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {qcFinalAnalytics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        {/* Satış Durumu Analizi */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Satış Durumu Analizi</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <p>Yükleniyor...</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={salesAnalytics}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        {/* En Çok Müşterisi Olan Kullanıcılar */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">En Çok Müşterisi Olan Kullanıcılar</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <p>Yükleniyor...</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topUsers}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Müşteri Sayısı" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      
      {/* Alt Bölüm */}
      <div className="grid grid-cols-1 gap-6">
        {/* En Çok Müşterisi Olan Takımlar */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">En Çok Müşterisi Olan Takımlar</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <p>Yükleniyor...</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topTeams}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Müşteri Sayısı" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
