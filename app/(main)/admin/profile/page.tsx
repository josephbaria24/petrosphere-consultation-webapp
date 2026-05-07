"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, ShieldCheck, Mail, User } from "lucide-react";
import { useApp } from "../../../../components/app/AppProvider";
import { getClientCookie } from "../../../../lib/cookies-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";

export default function AdminProfilePage() {
  const router = useRouter();
  const { user, membership, refresh } = useApp();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const isAdminCookie = !!getClientCookie("admin_id");
  const isAdminRole = membership.role === "admin";

  useEffect(() => {
    if (!isAdminCookie || !isAdminRole) {
      router.replace("/dashboard");
      return;
    }

    const load = async () => {
      try {
        const res = await fetch("/api/admin/profile");
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to load admin profile");
          return;
        }

        const data = await res.json();
        setFullName(data.full_name || "");
      } catch {
        toast.error("Failed to load admin profile");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAdminCookie, isAdminRole, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update admin profile");
        return;
      }

      toast.success("Admin profile updated");
      await refresh();
    } catch {
      toast.error("Unexpected error while updating profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your admin account details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            Account Information
          </CardTitle>
          <CardDescription>
            Update your display name for the admin account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <Input value={user.email} disabled />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
