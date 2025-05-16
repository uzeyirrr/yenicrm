"use client";

import React, { useState, useEffect, use } from "react";
import { getTeam, updateTeam, Team } from "@/lib/teamService";
import { getUsers } from "@/lib/userService";
import { User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "../../../../components/ui/textarea";
import { isAuthenticated, adminLogin } from "@/lib/pocketbase";

export default function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  // Resolve params Promise with React.use()
  const resolvedParams = use(params);
  
  // Store the ID in state to avoid direct params access
  const [teamId, setTeamId] = useState<string>("");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    leader: "",
    members: [] as string[],
  });

  // Set teamId on component mount
  useEffect(() => {
    // Use the resolved params
    const id = resolvedParams ? String(resolvedParams.id || "") : "";
    if (id) {
      setTeamId(id);
    }
  }, [resolvedParams]);
  
  useEffect(() => {
    // Only run this effect when teamId is available
    if (!teamId) return;
    
    const initializeAndLoad = async () => {
      try {
        setLoading(true);
        if (!isAuthenticated()) {
          await adminLogin();
        }
        await Promise.all([loadUsers(), loadTeam()]);
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Oturum başlatılırken bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    initializeAndLoad();
  }, [teamId]);

  async function loadUsers() {
    try {
      const fetchedUsers = await getUsers();
      if (fetchedUsers && fetchedUsers.length > 0) {
        setUsers(fetchedUsers);
      } else {
        setError("Kullanıcı verisi alınamadı");
      }
    } catch (err) {
      console.error("Loading users error:", err);
      setError("Kullanıcılar yüklenirken bir hata oluştu");
    }
  }

  async function loadTeam() {
    try {
      if (!teamId) return;
      const fetchedTeam = await getTeam(teamId);
      setTeam(fetchedTeam);
      
      // Set form data from team
      setFormData({
        name: fetchedTeam.name,
        description: fetchedTeam.description,
        leader: fetchedTeam.leader?.id || "",
        members: fetchedTeam.members?.map(member => member.id) || [],
      });
    } catch (err) {
      console.error("Loading team error:", err);
      setError("Takım bilgileri yüklenirken bir hata oluştu");
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLeaderChange = (value: string) => {
    setFormData((prev) => ({ ...prev, leader: value }));
  };

  const handleMemberToggle = (userId: string) => {
    setFormData((prev) => {
      const isSelected = prev.members.includes(userId);
      if (isSelected) {
        return {
          ...prev,
          members: prev.members.filter((id) => id !== userId),
        };
      } else {
        return {
          ...prev,
          members: [...prev.members, userId],
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError("Takım adı gereklidir");
      return;
    }

    if (!formData.leader) {
      setError("Takım lideri seçmelisiniz");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      
      if (!teamId) {
        setError("Takım ID'si bulunamadı");
        return;
      }
      await updateTeam(teamId, {
        name: formData.name,
        description: formData.description,
        leader: formData.leader,
        members: formData.members,
      });
      
      router.push("/dashboard/teams");
    } catch (err) {
      console.error("Error updating team:", err);
      setError("Takım güncellenirken bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Takım bulunamadı.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Takımı Düzenle: {team.name}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Takım Bilgileri</CardTitle>
            <CardDescription>
              Takım bilgilerini güncellemek için aşağıdaki alanları düzenleyin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Takım Adı</Label>
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
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leader">Takım Lideri</Label>
              <Select
                value={formData.leader}
                onValueChange={handleLeaderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Takım lideri seçin" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Takım Üyeleri</Label>
              <div className="border rounded-md p-4 max-h-60 overflow-auto">
                {users.length > 0 ? (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`user-${user.id}`}
                          checked={formData.members.includes(user.id)}
                          onChange={() => handleMemberToggle(user.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mr-2"
                        />
                        <label
                          htmlFor={`user-${user.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {user.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Kullanıcı bulunamadı.
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Seçilen üye sayısı: {formData.members.length}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/teams")}
            >
              İptal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Değişiklikleri Kaydet
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
