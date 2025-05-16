"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { pb } from "../../../lib/pocketbase";
import { getCustomers, updateCustomer } from "../../../lib/customerService";
import { Customer } from "../../../lib/types";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Loader2 } from "lucide-react";

// Drag and drop item types
const ItemTypes = {
  CUSTOMER_CARD: "customerCard",
};

// QC statuses
const QC_STATUSES = ["Yeni", "Aranacak", "Rausgefallen", "Rausgefallen WP"];

// Main page component
export default function QCPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("all"); // all, daily, weekly, monthly
  const router = useRouter();

  // Load customers
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter customers by date
  const getFilteredCustomers = useCallback(() => {
    if (timeFilter === "all") return customers;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return customers.filter(customer => {
      const createdDate = new Date(customer.created);
      
      if (timeFilter === "daily") {
        // Today
        return createdDate >= today;
      } else if (timeFilter === "weekly") {
        // Last 7 days
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdDate >= weekAgo;
      } else if (timeFilter === "monthly") {
        // Last 30 days
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return createdDate >= monthAgo;
      }
      
      return true;
    });
  }, [customers, timeFilter]);

  // Handle card drop
  const handleDrop = useCallback(async (customerId: string, newStatus: string) => {
    try {
      // Find the customer
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;
      
      // Update only if status changed
      if (customer.qc_on === newStatus) return;
      
      // Convert string status to proper type
      const qcStatus = newStatus as 'Yeni' | 'Aranacak' | 'Rausgefallen' | 'Rausgefallen WP';
      
      // Update ONLY qc_on status, not qc_final
      await updateCustomer(customerId, { 
        qc_on: qcStatus
        // qc_final değeri değiştirilmiyor
      });
      
      // Update local state - only update qc_on
      setCustomers(prev => 
        prev.map(c => 
          c.id === customerId 
            ? { ...c, qc_on: qcStatus } 
            : c
        )
      );
    } catch (error) {
      console.error("Error updating customer status:", error);
    }
  }, [customers]);

  // Setup realtime subscription
  useEffect(() => {
    loadCustomers();
    
    // Subscribe to realtime updates
    const unsubscribe = pb.collection('customers').subscribe('*', function(e) {
      console.log('Realtime update:', e.action, e.record);
      
      if (e.action === 'create') {
        // Add new customer
        setCustomers(prev => [...prev, e.record as Customer]);
      } 
      else if (e.action === 'update') {
        // Update existing customer
        setCustomers(prev => 
          prev.map(c => c.id === e.record.id ? e.record as Customer : c)
        );
      } 
      else if (e.action === 'delete') {
        // Remove deleted customer
        setCustomers(prev => prev.filter(c => c.id !== e.record.id));
      }
    });
    
    // Cleanup subscription
    return () => {
      pb.collection('customers').unsubscribe();
    };
  }, [loadCustomers]);

  // Handle customer card click
  const handleCardClick = (customerId: string) => {
    router.push(`/dashboard/customers/${customerId}`);
  };

  // Group customers by status
  const getCustomersByStatus = (status: string) => {
    return getFilteredCustomers().filter(c => c.qc_on === status);
  };

  return (
    <div className="p-4">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Kalite Kontrol</h1>
        
        <div className="flex items-center gap-4">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Zaman Filtresi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Zamanlar</SelectItem>
              <SelectItem value="daily">Bugün</SelectItem>
              <SelectItem value="weekly">Bu Hafta</SelectItem>
              <SelectItem value="monthly">Bu Ay</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={loadCustomers} variant="outline" size="sm">
            Yenile
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DndProvider backend={HTML5Backend}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {QC_STATUSES.map(status => (
              <DroppableColumn
                key={status}
                title={status}
                status={status}
                onDrop={handleDrop}
              >
                {getCustomersByStatus(status).map(customer => (
                  <DraggableCard
                    key={customer.id}
                    customer={customer}
                    onClick={() => handleCardClick(customer.id)}
                  />
                ))}
              </DroppableColumn>
            ))}
          </div>
        </DndProvider>
      )}
    </div>
  );
}

// Kanban sütunu bileşeni
const DroppableColumn = ({ 
  title, 
  status, 
  children, 
  onDrop 
}: { 
  title: string, 
  status: string, 
  children: React.ReactNode,
  onDrop: (customerId: string, newStatus: string) => void 
}) => {
  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: ItemTypes.CUSTOMER_CARD,
    drop: (item: { id: string, currentStatus: string }) => {
      onDrop(item.id, status);
      return { status };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [status, onDrop]);

  return (
    <div 
      ref={(node) => dropRef(node)} 
      className={`bg-gray-50 rounded-lg p-3 min-h-[500px] transition-colors ${isOver ? 'bg-blue-50' : ''}`}
    >
      <h3 className="font-medium text-gray-700 mb-3 sticky top-0 bg-gray-50 py-2 border-b">
        {title} <Badge variant="outline">{children ? Array.isArray(children) ? children.length : 1 : 0}</Badge>
      </h3>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
};

// Sürüklenebilir müşteri kartı
const DraggableCard = ({ 
  customer, 
  onClick 
}: { 
  customer: Customer, 
  onClick: () => void 
}) => {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: ItemTypes.CUSTOMER_CARD,
    item: { id: customer.id, currentStatus: customer.qc_on },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [customer]);

  return (
    <div
      ref={(node) => dragRef(node)}
      onClick={onClick}
      className={`cursor-pointer transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="font-medium">{customer.name} {customer.surname}</div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Telefon:</span>
              <span className="text-sm">{customer.tel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Konum:</span>
              <span className="text-sm">{customer.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Oluşturulma:</span>
              <span className="text-sm">{new Date(customer.created).toLocaleDateString('tr-TR')}</span>
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="bg-blue-50">
                {customer.qc_final}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
