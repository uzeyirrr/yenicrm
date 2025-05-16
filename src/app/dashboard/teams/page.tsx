"use client";

import { useState, useEffect } from "react";
import { Team, getTeams, deleteTeam } from "@/lib/teamService";
import { isAuthenticated, adminLogin } from "@/lib/pocketbase";
import Link from "next/link";
import { Loader2, Plus, Pencil, Trash2, Users, User } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

  useEffect(() => {
    const initializeAndLoad = async () => {
      try {
        if (!isAuthenticated()) {
          await adminLogin();
        }
        await loadTeams();
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Oturum başlatılırken bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    initializeAndLoad();
  }, []);

  async function loadTeams() {
    try {
      setLoading(true);
      const teams = await getTeams();
      if (teams && teams.length > 0) {
        setTeams(teams);
      } else {
        setTeams([]);
      }
      setError("");
    } catch (err) {
      console.error("Loading teams error:", err);
      setError("Takımlar yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  // Open delete dialog
  const openDeleteDialog = (team: Team) => {
    setCurrentTeam(team);
    setIsDeleteDialogOpen(true);
  };

  // Handle team deletion
  const handleDeleteTeam = async () => {
    if (!currentTeam) return;

    try {
      setLoading(true);
      await deleteTeam(currentTeam.id);
      setTeams((prev) => prev.filter((team) => team.id !== currentTeam.id));
      setIsDeleteDialogOpen(false);
      setCurrentTeam(null);
    } catch (err) {
      console.error("Error deleting team:", err);
      setError("Takım silinirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !teams.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Takımlar</h1>
        <div className="flex gap-2">
          <Button onClick={loadTeams} variant="outline" size="sm">
            Yenile
          </Button>
          <Link href="/dashboard/teams/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Takım
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <Card key={team.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{team.name}</CardTitle>
                <div className="flex gap-1">
                  <Link href={`/dashboard/teams/${team.id}`}>
                    <Button variant="ghost" size="sm">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(team)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>{team.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Takım Lideri:</span>
                <span>{team.leader?.name || "Belirtilmemiş"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <span className="font-medium">Üye Sayısı:</span>
                <span>{team.members?.length || 0}</span>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-gray-500">
              Oluşturulma: {new Date(team.created).toLocaleDateString("tr-TR")}
            </CardFooter>
          </Card>
        ))}

        {!loading && !teams.length && (
          <div className="col-span-full text-center py-12 text-gray-500">
            Henüz hiç takım bulunmuyor.
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Takımı Sil</DialogTitle>
            <DialogDescription>
              Bu takımı silmek istediğinizden emin misiniz? Bu işlem geri
              alınamaz.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {currentTeam && (
              <div className="font-medium">{currentTeam.name}</div>
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
              onClick={handleDeleteTeam}
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
