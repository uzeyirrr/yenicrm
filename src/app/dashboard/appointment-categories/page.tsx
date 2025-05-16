"use client";

import React, { useState, useEffect } from "react";
import {
  getAppointmentCategories,
  createAppointmentCategory,
  updateAppointmentCategory,
  deleteAppointmentCategory,
  AppointmentCategory,
} from "../../../lib/appointmentCategoryService";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

export default function AppointmentCategoriesPage() {
  const [categories, setCategories] = useState<AppointmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<AppointmentCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#ff0000",
    deaktif: false,
  });

  // Load categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAppointmentCategories();
      setCategories(data);
    } catch (err) {
      console.error("Error loading appointment categories:", err);
      setError("Randevu kategorileri yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadCategories();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#ff0000",
      deaktif: false,
    });
    setCurrentCategory(null);
  };

  // Open edit dialog
  const openEditDialog = (category: AppointmentCategory) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
      deaktif: category.deaktif,
    });
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (category: AppointmentCategory) => {
    setCurrentCategory(category);
    setIsDeleteDialogOpen(true);
  };

  // Handle form submission for adding a new category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const newCategory = await createAppointmentCategory(formData);
      setCategories((prev) => [...prev, newCategory]);
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error adding appointment category:", err);
      setError("Randevu kategorisi eklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission for editing a category
  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategory) return;

    try {
      setLoading(true);
      const updatedCategory = await updateAppointmentCategory(currentCategory.id, formData);
      setCategories((prev) =>
        prev.map((cat) => (cat.id === updatedCategory.id ? updatedCategory : cat))
      );
      setIsEditDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error updating appointment category:", err);
      setError("Randevu kategorisi güncellenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  // Handle category deletion
  const handleDeleteCategory = async () => {
    if (!currentCategory) return;

    try {
      setLoading(true);
      await deleteAppointmentCategory(currentCategory.id);
      setCategories((prev) => prev.filter((cat) => cat.id !== currentCategory.id));
      setIsDeleteDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error deleting appointment category:", err);
      setError("Randevu kategorisi silinirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Randevu Kategorileri</h1>
        <div className="flex gap-2">
          <Button onClick={loadCategories} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Kategori
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Randevu Kategorisi</DialogTitle>
                <DialogDescription>
                  Yeni bir randevu kategorisi eklemek için aşağıdaki formu doldurun.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCategory}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Kategori Adı</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <Input
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="color">Renk</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="color"
                        name="color"
                        value={formData.color}
                        onChange={handleInputChange}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        type="text"
                        id="colorText"
                        name="color"
                        value={formData.color}
                        onChange={handleInputChange}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="deaktif"
                      name="deaktif"
                      checked={formData.deaktif}
                      onChange={(e) => setFormData(prev => ({ ...prev, deaktif: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="deaktif">Deaktif</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    İptal
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ekle
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading && !categories.length ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Card key={category.id} className={category.deaktif ? "opacity-60" : ""}>              
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <div className="flex items-center gap-2">
                      {category.name}
                      {category.deaktif && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Deaktif
                        </span>
                      )}
                    </div>
                  </div>
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{category.description}</p>
                <div className="mt-2 text-xs text-gray-400">
                  Oluşturulma: {new Date(category.created).toLocaleDateString('tr-TR')}
                </div>
              </CardContent>
            </Card>
          ))}

          {!loading && !categories.length && (
            <div className="col-span-full text-center py-12 text-gray-500">
              Henüz hiç randevu kategorisi bulunmuyor.
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Randevu Kategorisini Düzenle</DialogTitle>
            <DialogDescription>
              Randevu kategorisini düzenlemek için aşağıdaki formu kullanın.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCategory}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Kategori Adı</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Açıklama</Label>
                <Input
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-color">Renk</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="edit-color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    type="text"
                    id="edit-colorText"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-deaktif"
                  name="deaktif"
                  checked={formData.deaktif}
                  onChange={(e) => setFormData(prev => ({ ...prev, deaktif: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="edit-deaktif">Deaktif</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                İptal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Güncelle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Randevu Kategorisini Sil</DialogTitle>
            <DialogDescription>
              Bu randevu kategorisini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {currentCategory && (
              <div className="flex items-center gap-2 font-medium">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: currentCategory.color }}
                ></div>
                {currentCategory.name}
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
              onClick={handleDeleteCategory}
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
