import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const users = useQuery(api.users.listAll);
  const setRole = useMutation(api.users.setRole);

  useEffect(() => {
    if (!isLoading) {
      if (!user) window.location.href = "/auth";
      if (user && user.role !== "admin") window.location.href = "/dashboard";
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background px-4 sm:px-6 lg:px-8 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>• Manage institutions, counsellors, and resources.</div>
          <div>• View anonymized screening analytics.</div>
          <div>• Moderate forum posts.</div>

          {/* Role Management */}
          <div className="pt-4">
            <div className="font-semibold mb-3">User Roles</div>
            {users === undefined ? (
              <div className="text-muted-foreground">Loading users…</div>
            ) : users.length === 0 ? (
              <div className="text-muted-foreground">No users found.</div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u._id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border bg-muted/40"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {u.name || "Unnamed User"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {u.email || "No email"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={u.role ?? ""}
                        onValueChange={async (value) => {
                          try {
                            if (!value) return;
                            await setRole({
                              userId: u._id as any,
                              role: value as any,
                            });
                            toast("Role updated");
                          } catch (e: any) {
                            toast(e?.message ?? "Failed to update role");
                          }
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="counsellor">Counsellor</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="peer_volunteer">
                            Peer Volunteer
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            await setRole({
                              userId: u._id as any,
                              role: "student" as any,
                            });
                            toast("Role reset to student");
                          } catch (e: any) {
                            toast(e?.message ?? "Failed to reset role");
                          }
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
