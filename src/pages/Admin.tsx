/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * Admin dashboard
 * - role management
 * - anonymized screening export (CSV)
 * - basic forum moderation (hide/restore/mark moderated)
 */

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [unauthorizedRedirected, setUnauthorizedRedirected] = useState(false);

  // Redirect non-admins to dashboard
  useEffect(() => {
    if (!isLoading) {
      if (!user || user.role !== "admin") {
        // simple client-side redirect for unauthorized users
        window.location.href = "/dashboard";
        setUnauthorizedRedirected(true);
      }
    }
  }, [isLoading, user]);

  // Users & role management
  const users = useQuery(api.users.listAll);
  const setRole = useMutation(api.users.setRole);
  const removeUser = useMutation(api.users.removeUser);

  // Forum posts for moderation (admin's institution)
  const posts = useQuery(
    api.forum.listPosts,
    user?.institutionId ? { institutionId: user.institutionId } : "skip",
  );
  const moderatePost = useMutation(api.forum.moderatePost);
  const restorePost = useMutation(api.forum.restorePost);
  const flagPost = useMutation(api.forum.flagPost);
  const removePost = useMutation(api.forum.removePost);

  // Export screenings CSV on demand: trigger useQuery via state
  const [exportArgs, setExportArgs] = useState<any>("skip");
  const [pendingRemoveUser, setPendingRemoveUser] = useState<string | null>(
    null,
  );
  const [pendingRemovePost, setPendingRemovePost] = useState<string | null>(
    null,
  );
  const exportCsv = useQuery(
    api.screening.exportScreeningsCsv,
    exportArgs === "skip" ? "skip" : exportArgs,
  );

  // When CSV becomes available, trigger download
  useEffect(() => {
    if (typeof exportCsv === "string" && exportCsv.length > 0) {
      const blob = new Blob([exportCsv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `screenings_${user?.institutionId ?? "all"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Screenings CSV downloaded.");
      // reset export args to avoid repeated downloads
      setExportArgs("skip");
    }
  }, [exportCsv, user]);

  if (isLoading || unauthorizedRedirected) {
    return (
      <div className="w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          Signed in as {user?.email}
        </div>
      </div>

      {/* Role management */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Role management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Institution</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((u: any) => (
                  <tr key={u._id} className="border-t">
                    <td className="py-2">{u.name || "—"}</td>
                    <td className="py-2 text-sm">{u.email || "—"}</td>
                    <td className="py-2">
                      <select
                        defaultValue={u.role ?? "student"}
                        onChange={(e) => {
                          const newRole = e.target.value as
                            | "admin"
                            | "student"
                            | "counsellor"
                            | "peer_volunteer";
                          setRole({ userId: u._id, role: newRole })
                            .then(() => toast.success("Role updated"))
                            .catch((err: Error) =>
                              toast.error(
                                err?.message || "Failed to update role",
                              ),
                            );
                        }}
                      >
                        <option value="admin">admin</option>
                        <option value="counsellor">counsellor</option>
                        <option value="peer_volunteer">peer_volunteer</option>
                        <option value="student">student</option>
                      </select>
                    </td>
                    <td className="py-2">{u.institutionId ?? "—"}</td>
                    <td className="py-2">
                      <Button
                        onClick={() => {
                          setRole({ userId: u._id, role: "student" })
                            .then(() => toast.success("Demoted to student"))
                            .catch((err: Error) =>
                              toast.error(err?.message || "Failed"),
                            );
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        Quick demote
                      </Button>
                      {u._id === pendingRemoveUser ? (
                        <>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              removeUser({ userId: u._id })
                                .then(() => {
                                  toast.success("User removed");
                                  setPendingRemoveUser(null);
                                })
                                .catch((err: Error) => {
                                  toast.error(
                                    err?.message || "Failed to remove user",
                                  );
                                  setPendingRemoveUser(null);
                                })
                            }
                            className="ml-2"
                          >
                            Confirm Remove
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setPendingRemoveUser(null)}
                            className="ml-2"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (u._id === user?._id) {
                              toast.error("Cannot remove yourself");
                              return;
                            }
                            setPendingRemoveUser(u._id);
                          }}
                          className="ml-2"
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Screening exports */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Screenings / Trends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Export anonymized screening results for your institution as CSV.
          </div>
          <div className="flex gap-2">
            <Input
              value={user?.institutionId ?? ""}
              readOnly
              aria-label="Institution ID"
            />
            <Button
              onClick={() => {
                if (!user?.institutionId) {
                  toast.error("No institution associated with your account");
                  return;
                }
                setExportArgs({ institutionId: user.institutionId });
              }}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!user?.institutionId) {
                  toast.error("No institution associated with your account");
                  return;
                }
                setExportArgs({
                  institutionId: user.institutionId,
                  toolType: "phq9",
                });
              }}
            >
              Export PHQ-9 only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Forum moderation */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Forum moderation</CardTitle>
        </CardHeader>
        <CardContent>
          {(posts ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No posts to moderate.
            </div>
          ) : (
            <div className="space-y-3">
              {(posts ?? []).map((p: any) => (
                <div key={p._id} className="p-3 border rounded-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{p.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.user?.name ?? (p.isAnonymous ? "Anonymous" : "User")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!p.isHidden ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            moderatePost({
                              postId: p._id,
                              isModerated: true,
                              isHidden: true,
                            })
                              .then(() => toast.success("Post hidden"))
                              .catch((e: Error) =>
                                toast.error(e?.message || "Failed"),
                              )
                          }
                        >
                          Hide
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() =>
                            restorePost({ postId: p._id })
                              .then(() => toast.success("Post restored"))
                              .catch((e: Error) =>
                                toast.error(e?.message || "Failed"),
                              )
                          }
                        >
                          Restore
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() =>
                          flagPost({ postId: p._id })
                            .then(() =>
                              toast.success("Post flagged for review"),
                            )
                            .catch((e: Error) =>
                              toast.error(e?.message || "Failed"),
                            )
                        }
                      >
                        Flag
                      </Button>
                      {p._id === pendingRemovePost ? (
                        <>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              removePost({ postId: p._id })
                                .then(() => {
                                  toast.success("Post removed");
                                  setPendingRemovePost(null);
                                })
                                .catch((e: Error) => {
                                  toast.error(e?.message || "Failed to remove");
                                  setPendingRemovePost(null);
                                });
                            }}
                          >
                            Confirm Remove
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setPendingRemovePost(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setPendingRemovePost(p._id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                  <div
                    className="mt-2 text-sm"
                    dangerouslySetInnerHTML={{ __html: p.content }}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
