/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

export default function CounsellorPage() {
  const { user, isLoading } = useAuth();
  const appointments = useQuery(api.appointments.listByCounsellor);
  const addSessionResult = useMutation(api.appointments.addSessionResult);

  useEffect(() => {
    if (!isLoading) {
      if (!user) window.location.href = "/auth";
      if (user && user.role !== "counsellor")
        window.location.href = "/dashboard";
    }
  }, [isLoading, user]);

  const [editing, setEditing] = useState<
    Record<
      string,
      { sessionNotes: string; diagnosis: string; followUp: string }
    >
  >({});
    // Track whether counsellor wants to schedule a follow-up for each appointment
    const [scheduleFollowUp, setScheduleFollowUp] = useState<Record<string, boolean>>({});
    const [followUpDate, setFollowUpDate] = useState<Record<string, string>>({});
    const [followUpTime, setFollowUpTime] = useState<Record<string, string>>({});
    // Chat state for counsellor to enter session chat
    const [chatAppointmentId, setChatAppointmentId] = useState<string | null>(null);

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
          <CardTitle>Your Appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(appointments ?? []).length === 0 ? (
            <div className="text-muted-foreground">
              No appointments assigned.
            </div>
          ) : (
            (appointments ?? [])
              .filter((apt: any) => apt.status !== "completed")
              .map((apt: any) => {
                // const upcoming =
                //   new Date(apt.scheduledDate).getTime() >= Date.now();
                const id = String(apt._id);

                const currentEdit = editing[id] ?? {
                  sessionNotes: "",
                  diagnosis: "",
                  followUp: "",
                };

                return (
                  <div
                    key={apt._id}
                    className="p-4 rounded-lg border bg-muted/40 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">
                          {apt.student?.name ?? "Student"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(apt.scheduledDate).toLocaleDateString()} at{" "}
                          {apt.timeSlot} • Status: {apt.status}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {apt.student?.email}
                      </div>
                    </div>

                    {/* Show recent screenings for context */}
                    {apt.screeningSummary && (
                      <div className="p-3 rounded-md bg-background/50 border space-y-2">
                        <div className="font-semibold text-sm">
                          Latest Screening Summary
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {apt.screeningSummary.toolType?.toUpperCase()} •
                          Score: {apt.screeningSummary.score} •{" "}
                          {apt.screeningSummary.riskLevel}
                        </div>
                        {apt.screeningSummary.recommendations && (
                          <div className="text-xs text-muted-foreground">
                            {apt.screeningSummary.recommendations.join(" • ")}
                          </div>
                        )}
                      </div>
                    )}

                    {apt.screenings && apt.screenings.length > 0 && (
                      <div className="p-3 rounded-md bg-background/50 border space-y-2">
                        <div className="font-semibold text-sm">
                          Recent Screenings
                        </div>
                        {apt.screenings.slice(0, 3).map((s: any) => (
                          <div
                            key={s._id}
                            className="text-xs text-muted-foreground"
                          >
                            {s.toolType.toUpperCase()} • Score: {s.score} •{" "}
                            {s.riskLevel}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Show previous sessions */}
                    {apt.previousSessions &&
                      apt.previousSessions.length > 0 && (
                        <div className="p-3 rounded-md bg-background/50 border space-y-2">
                          <div className="font-semibold text-sm">
                            Previous Sessions
                          </div>
                          {apt.previousSessions.map((p: any) => (
                            <div
                              key={p._id}
                              className="text-xs text-muted-foreground"
                            >
                              {new Date(p.scheduledDate).toLocaleDateString()}{" "}
                              at {p.timeSlot} • {p.status}
                            </div>
                          ))}
                        </div>
                      )}

                    {/* Session result form */}
                    <div className="space-y-2">
                      <Label>Session Notes</Label>
                      <Textarea
                        value={currentEdit.sessionNotes}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            [id]: {
                              ...currentEdit,
                              sessionNotes: e.target.value,
                            },
                          }))
                        }
                        placeholder="Summary of session, observations, and next steps"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <Label>Diagnosis (optional)</Label>
                          <Input
                            value={currentEdit.diagnosis}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                [id]: {
                                  ...currentEdit,
                                  diagnosis: e.target.value,
                                },
                              }))
                            }
                            placeholder="Short diagnostic note"
                          />
                        </div>
                        <div>
                          <Label>Follow-up</Label>
                          <Input
                            value={currentEdit.followUp}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                [id]: {
                                  ...currentEdit,
                                  followUp: e.target.value,
                                },
                              }))
                            }
                            placeholder="Recommended follow-up actions or referrals"
                          />
                        </div>
                      </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <Label>Schedule follow-up?</Label>
                            <div className="flex items-center gap-3 mt-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`follow-${id}`}
                                  checked={!scheduleFollowUp[id]}
                                  onChange={() =>
                                    setScheduleFollowUp((prev) => ({
                                      ...prev,
                                      [id]: false,
                                    }))
                                  }
                                />
                                No
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`follow-${id}`}
                                  checked={!!scheduleFollowUp[id]}
                                  onChange={() =>
                                    setScheduleFollowUp((prev) => ({
                                      ...prev,
                                      [id]: true,
                                    }))
                                  }
                                />
                                Yes
                              </label>
                            </div>

                            {scheduleFollowUp[id] ? (
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <Input
                                  type="date"
                                  value={followUpDate[id] ?? ""}
                                  onChange={(e) =>
                                    setFollowUpDate((prev) => ({
                                      ...prev,
                                      [id]: e.target.value,
                                    }))
                                  }
                                />
                                <Input
                                  type="time"
                                  value={followUpTime[id] ?? ""}
                                  onChange={(e) =>
                                    setFollowUpTime((prev) => ({
                                      ...prev,
                                      [id]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            ) : (
                              <Input
                                value={currentEdit.followUp}
                                onChange={(e) =>
                                  setEditing((prev) => ({
                                    ...prev,
                                    [id]: {
                                      ...currentEdit,
                                      followUp: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Recommended follow-up actions or referrals"
                              />
                            )}
                          </div>
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setEditing((prev) => ({
                            ...prev,
                            [id]: {
                              sessionNotes: "",
                              diagnosis: "",
                              followUp: "",
                            },
                          }))
                        }
                      >
                        Reset
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setChatAppointmentId(String(apt._id))}
                      >
                        Enter Chat
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            // prepare followUp payload
                            const followUpPayload: string | undefined = scheduleFollowUp[id]
                              ? JSON.stringify({
                                  proposed: true,
                                  date: followUpDate[id] ?? null,
                                  timeSlot: followUpTime[id] ?? null,
                                  note: currentEdit.followUp ?? null,
                                })
                              : currentEdit.followUp
                              ? String(currentEdit.followUp)
                              : undefined;
    
                            await addSessionResult({
                              appointmentId: apt._id as any,
                              sessionNotes:
                                currentEdit.sessionNotes || undefined,
                              diagnosis: currentEdit.diagnosis || undefined,
                              followUp: followUpPayload || undefined,
                            });
                            toast("Session saved and marked completed");
                            setEditing((prev) => ({
                              ...prev,
                              [id]: {
                                sessionNotes: "",
                                diagnosis: "",
                                followUp: "",
                              },
                            }));
                            // clear follow-up scheduling fields
                            setScheduleFollowUp((prev) => ({ ...prev, [id]: false }));
                            setFollowUpDate((prev) => ({ ...prev, [id]: "" }));
                            setFollowUpTime((prev) => ({ ...prev, [id]: "" }));
                          } catch (e: any) {
                            toast(e?.message ?? "Failed to save session");
                          }
                        }}
                      >
                        Save & Complete
                      </Button>
                    </div>

                    {apt.sessionAudit && apt.sessionAudit.length > 0 && (
                      <div className="pt-3 border-t mt-3 text-xs text-muted-foreground space-y-1">
                        <div className="font-semibold">Activity Log</div>
                        {apt.sessionAudit.map((a: any, i: number) => (
                          <div key={i}>
                            <div>
                              {new Date(a.when).toLocaleString()} •{" "}
                              {a.byName || a.by} • {a.action}
                            </div>
                            <div className="text-xs">
                              Notes: {a.changes?.sessionNotes ?? "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </CardContent>
      </Card>

      <AppointmentChatDialog
        open={Boolean(chatAppointmentId)}
        onOpenChange={(v: boolean) => {
          if (!v) setChatAppointmentId(null);
        }}
        appointmentId={chatAppointmentId}
      />
    </div>
  );
}

function AppointmentChatDialog({
  open,
  onOpenChange,
  appointmentId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointmentId: string | null;
}) {
  const messages = useQuery(
    api.appointments.listChatMessages,
    appointmentId ? { appointmentId: appointmentId as any } : "skip",
  ) ?? [];

  const sendMessage = useMutation(api.appointments.sendChatMessage);
  const endChatByStudent = useMutation(api.appointments.endChatByStudent);

  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  // Clear input when dialog closes
  useEffect(() => {
    if (!open) {
      setInput("");
      setPending(false);
    }
  }, [open]);

  const doSend = async () => {
    const text = input.trim();
    if (!text || !appointmentId || pending) return;
    setPending(true);
    try {
      await sendMessage({ appointmentId: appointmentId as any, content: text });
      setInput("");
    } catch (e: any) {
      toast(e?.message ?? "Failed to send message.");
    } finally {
      setPending(false);
    }
  };

  const doEndChat = async () => {
    if (!appointmentId) return;
    setPending(true);
    try {
      await endChatByStudent({ appointmentId: appointmentId as any });
      toast("You ended the chat. The other participant will be notified.");
      onOpenChange(false);
    } catch (e: any) {
      toast(e?.message ?? "Failed to end chat.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Session Chat</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="h-64 overflow-y-auto rounded border p-3 bg-muted/30 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground">No messages yet.</div>
            )}
            {messages.map((m: any, i: number) => (
              <div key={i} className={m.fromUserId === (typeof window !== "undefined" ? (window as any).__convex_user_id : undefined) ? "text-right" : "text-left"}>
                <div
                  className={
                    "inline-block px-3 py-2 rounded-lg max-w-[85%] whitespace-pre-wrap " +
                    (m.role === "student" ? "bg-primary text-primary-foreground" : "bg-background border")
                  }
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {m.fromName ?? (m.role === "counsellor" ? "Counsellor" : "Student")}
                  </div>
                  {m.content}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ""}
                  </div>
                </div>
              </div>
            ))}
            {pending && (
              <div className="text-left">
                <div className="inline-block px-3 py-2 rounded-lg bg-background border text-muted-foreground">
                  Sending…
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Type your message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  doSend();
                }
              }}
              disabled={pending}
            />
            <Button onClick={doSend} disabled={pending || input.trim().length === 0}>
              Send
            </Button>
            <Button variant="destructive" onClick={doEndChat} disabled={pending}>
              End Chat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
