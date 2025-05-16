"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Slot, getSlots, deleteSlot } from "@/lib/slotService";
import { isAuthenticated, adminLogin, ensureAdminAuth } from "@/lib/pocketbase";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Loader2,
  Plus,
  Search,
  Calendar,
  Clock,
  Building,
  Pencil,
  Trash2,
  FileDown,
  RefreshCcw,
  X,
} from "lucide-react";

export default function SlotsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<Slot | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortOrder, setSortOrder] = useState("-date,-start_time");
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [deaktifFilter, setDeaktifFilter] = useState<boolean | undefined>(undefined);
  const [teamFilter, setTeamFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  
  // Teams, Companies and Categories for filters
  const [teams, setTeams] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const initializeAndLoad = async () => {
      try {
        if (!isAuthenticated()) {
          await adminLogin();
        }
        
        // Get page from URL or default to 1
        const pageParam = searchParams.get("page");
        const page = pageParam ? parseInt(pageParam) : 1;
        setCurrentPage(page);
        
        // Get other filters from URL
        const dateParam = searchParams.get("date");
        if (dateParam) {
          setDateFilter(new Date(dateParam));
        }
        
        const isActiveParam = searchParams.get("isActive");
        if (isActiveParam !== null) {
          setIsActiveFilter(isActiveParam === "true");
        }
        
        const companyParam = searchParams.get("company");
        if (companyParam) {
          setCompanyFilter(companyParam);
        }
        
        const searchParam = searchParams.get("search");
        if (searchParam) {
          setSearchTerm(searchParam);
        }
        
        const sortParam = searchParams.get("sort");
        if (sortParam) {
          setSortOrder(sortParam);
        }
        
        await loadSlots(page);
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Oturum başlatılırken bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    initializeAndLoad();
  }, [searchParams]);

  async function loadSlots(page = 1) {
    try {
      setLoading(true);
      
      // Build filters
      const filters: any = {
        page,
        perPage: 10,
        sort: sortOrder
      };
      
      if (dateFilter) {
        filters.date = format(dateFilter, "yyyy-MM-dd");
      }
      
      if (isActiveFilter !== undefined) {
        filters.deaktif = !isActiveFilter;
      }
      
      if (companyFilter) {
        filters.company = companyFilter;
      }
      
      if (searchTerm) {
        filters.search = searchTerm;
      }
      
      const slots = await getSlots(filters);
      
      if (slots && Array.isArray(slots)) {
        setSlots(slots);
        // Since we don't have pagination info directly from the API response,
        // we'll calculate it based on the slots array length
        const totalItems = slots.length;
        const totalPages = Math.ceil(totalItems / 10);
        setTotalItems(totalItems);
        setTotalPages(totalPages);
        setCurrentPage(page);
      } else {
        setSlots([]);
        setTotalItems(0);
        setTotalPages(0);
      }
      
      setError("");
    } catch (err) {
      console.error("Loading slots error:", err);
      setError("Slotlar yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  // Apply filters and navigate
  const applyFilters = () => {
    const params = new URLSearchParams();
    
    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    }
    
    if (dateFilter) {
      params.set("date", format(dateFilter, "yyyy-MM-dd"));
    }
    
    if (isActiveFilter !== undefined) {
      params.set("isActive", isActiveFilter.toString());
    }
    
    if (companyFilter) {
      params.set("company", companyFilter);
    }
    
    if (searchTerm) {
      params.set("search", searchTerm);
    }
    
    if (sortOrder !== "-date,-start_time") {
      params.set("sort", sortOrder);
    }
    
    const queryString = params.toString();
    router.push(`/dashboard/slots${queryString ? `?${queryString}` : ""}`);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setDateFilter(undefined);
    setIsActiveFilter(undefined);
    setCompanyFilter("");
    setSortOrder("-date,-start_time");
    router.push("/dashboard/slots");
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/dashboard/slots?${params.toString()}`);
  };

  // Open delete dialog
  const openDeleteDialog = (slot: Slot) => {
    setCurrentSlot(slot);
    setIsDeleteDialogOpen(true);
  };

  // Handle slot deletion
  const handleDeleteSlot = async () => {
    if (!currentSlot) return;

    try {
      setLoading(true);
      await deleteSlot(currentSlot.id);
      setSlots((prev) => prev.filter((slot) => slot.id !== currentSlot.id));
      setIsDeleteDialogOpen(false);
      setCurrentSlot(null);
    } catch (err) {
      console.error("Error deleting slot:", err);
      setError("Slot silinirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMMM yyyy", { locale: tr });
    } catch (error) {
      return dateStr;
    }
  };

  if (loading && !slots.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Slot Yönetimi</h1>
        <div className="flex gap-2">
          <Button onClick={() => loadSlots(currentPage)} variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Link href="/dashboard/slots/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Slot
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
          <CardDescription>Slotları filtrelemek için aşağıdaki seçenekleri kullanın</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Arama</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Ara..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="date">Tarih</Label>
              <div className="flex">
                <DatePicker
                  id="date"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  placeholder="Tarih seçin"
                />
                {dateFilter && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDateFilter(undefined)}
                    className="ml-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Active Filter */}
            <div className="space-y-2">
              <Label>Aktiflik Durumu</Label>
              <Select
                value={isActiveFilter === undefined ? "all" : String(isActiveFilter)}
                onValueChange={(value) => {
                  if (value === "all") {
                    setIsActiveFilter(undefined);
                  } else {
                    setIsActiveFilter(value === "true");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tümü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Sort Order */}
            <div className="space-y-2">
              <Label>Sıralama</Label>
              <Select
                value={sortOrder}
                onValueChange={setSortOrder}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-date,-start_time">En Yeni</SelectItem>
                  <SelectItem value="date,start_time">En Eski</SelectItem>
                  <SelectItem value="start_time">Başlangıç Saati (A-Z)</SelectItem>
                  <SelectItem value="-start_time">Başlangıç Saati (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end mt-4 space-x-2">
            <Button variant="outline" onClick={resetFilters}>
              Filtreleri Temizle
            </Button>
            <Button onClick={applyFilters}>
              Filtrele
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Slots Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Başlangıç</TableHead>
                <TableHead>Bitiş</TableHead>
                <TableHead>Slot Adı</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Şirket</TableHead>
                <TableHead>Randevu Sayısı</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.length > 0 ? (
                slots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        {formatDate(slot.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        {slot.start}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        {slot.end}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {slot.name || 'İsimsiz Slot'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {!slot.deaktif ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="destructive">Pasif</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-gray-500" />
                        {typeof slot.company === 'object' && slot.company ? slot.company.name : 'Belirtilmemiş'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {slot.appointments?.length || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/dashboard/slots/${slot.id}`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(slot)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link href={`/api/slots/${slot.id}/pdf`} target="_blank">
                          <Button variant="ghost" size="sm">
                            <FileDown className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {loading ? "Yükleniyor..." : "Slot bulunamadı"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <CardFooter className="flex justify-center py-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, and pages around current page
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={page === currentPage}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  
                  // Show ellipsis for gaps
                  if (
                    (page === 2 && currentPage > 3) ||
                    (page === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  
                  return null;
                })}
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardFooter>
        )}
      </Card>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slot Sil</DialogTitle>
            <DialogDescription>
              Bu slotu silmek istediğinizden emin misiniz? Bu işlem geri
              alınamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {currentSlot && (
              <div className="space-y-2">
                <div className="font-medium">
                  {formatDate(currentSlot.date)} - {currentSlot.start_time} - {currentSlot.end_time}
                </div>
                {currentSlot.appointments && currentSlot.appointments.length > 0 && (
                  <div className="text-amber-600 text-sm">
                    Bu slota bağlı {currentSlot.appointments.length} randevu bulunuyor. Silme işlemi bu randevuları etkileyebilir.
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              İptal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteSlot}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
