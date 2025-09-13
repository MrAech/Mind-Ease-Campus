/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import {
  Calendar,
  MessageCircle,
  BookOpen,
  Users,
  BarChart3,
  Heart,
  ArrowRight,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useAction } from "convex/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated, signOut } = useAuth();

  // Add: local flag to suppress queries while signing out
  const [signingOut, setSigningOut] = React.useState(false);
  const [showAiChat, setShowAiChat] = React.useState(false);
  const [chatAppointmentId, setChatAppointmentId] = React.useState<
    string | null
  >(null);

  // Auto-open booking drawer when ?book=1 is in the URL
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("book") === "1") {
        setShowAllAppointments(true);
      }
    } catch {
      // no-op
    }
  }, []);

  // Redirect admins/counsellors to role dashboards
  React.useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "admin") {
        window.location.href = "/admin";
      } else if (user.role === "counsellor") {
        window.location.href = "/counsellor";
      }
    }
  }, [isLoading, user]);

  // Prevent unexpected "Leave site?" beforeunload prompts on this page.
  // Some third-party code or dev overlays may register beforeunload handlers.
  // We add a capturing listener that stops other handlers from running so
  // users aren't prompted every time they open the dashboard.
  React.useEffect(() => {
    function interceptBeforeUnload(e: BeforeUnloadEvent) {
      try {
        // Stop other listeners from running. Do not set returnValue.
        e.stopImmediatePropagation?.();
      } catch (err) {
        console.log(err);
      }
    }

    window.addEventListener("beforeunload", interceptBeforeUnload, {
      capture: true,
    });
    return () => {
      window.removeEventListener("beforeunload", interceptBeforeUnload, {
        capture: true,
      });
    };
  }, []);

  // Add stable top-level mutation hook for pre-session form
  const submitPreForm = useMutation(api.appointments.submitPreSessionForm);
  const acceptFollowUp = useMutation(api.appointments.acceptFollowUp);
  const rejectFollowUp = useMutation(api.appointments.rejectFollowUp);

  // Add mutation and state for PHQ-9 dialog
  const submitScreening = useMutation(api.screening.submitScreening);
  // Replace single PHQ dialog state with a general screening dialog
  const [showScreening, setShowScreening] = React.useState(false);

  // Add state for the appointments drawer
  const [showAllAppointments, setShowAllAppointments] = React.useState(false);

  // Resource Library drawer state
  const [showResources, setShowResources] = React.useState(false);

  // Add: Forum Drawer state
  // const [showForum, setShowForum] = React.useState(false);

  // Fetch user's recent data
  const appointments = useQuery(
    api.appointments.listByStudent,
    signingOut || !isAuthenticated ? "skip" : {},
  );
  // Fetch screening history
  const screenings = useQuery(
    api.screening.getUserScreenings,
    signingOut || !isAuthenticated ? "skip" : {},
  );

  // Fetch resources (published)
  const resources = useQuery(api.resources.list, {}) ?? [];

  // Fetch available counsellors for booking
  const counsellors = useQuery(
    api.counsellors.listByInstitution,
    signingOut || !isAuthenticated || !user?.institutionId
      ? "skip"
      : { institutionId: user.institutionId as any },
  );

  // Mutation to create appointments
  const createAppointment = useMutation(api.appointments.create);

  // Add state for new appointment form
  const [newAptCounsellor, setNewAptCounsellor] = React.useState<string>("");
  const [newAptDate, setNewAptDate] = React.useState<string>("");
  const [newAptTime, setNewAptTime] = React.useState<string>("");
  const [newAptNotes, setNewAptNotes] = React.useState<string>("");
  const [newAptAnon, setNewAptAnon] = React.useState<boolean>(false);
  const [creatingApt, setCreatingApt] = React.useState<boolean>(false);

  // Add: seed roles/counsellor on-demand if none exist
  const seedRoles = useMutation((api as any).seed.seedRoles);

  // Derive time slots from counsellor availability + selected date weekday
  const selectedCounsellor = React.useMemo(() => {
    return (counsellors ?? []).find(
      (c: any) => String(c._id) === String(newAptCounsellor),
    );
  }, [counsellors, newAptCounsellor]);

  const bookedAppointmentsForDate = useQuery(
    api.appointments.listAppointmentsForCounsellorDate,
    !newAptCounsellor || !newAptDate
      ? "skip"
      : { counsellorId: newAptCounsellor as any, scheduledDate: newAptDate },
  );

  const derivedTimeSlots = React.useMemo(() => {
    if (!selectedCounsellor || !newAptDate) return [] as Array<string>;
    try {
      // Parse the `YYYY-MM-DD` date from the date input as a local date
      const parts = (newAptDate || "").split("-").map((p) => Number(p));
      let dObj: Date;
      if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
        dObj = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        dObj = new Date(newAptDate);
      }

      const weekday = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ][dObj.getDay()];

      const availability = selectedCounsellor.availability || {};

      // Try exact lowercase key match
      let matchKey = Object.keys(availability).find(
        (k) => k.toLowerCase() === weekday.toLowerCase(),
      );

      // Try numeric keys (0-6) as fallback
      if (!matchKey && (availability as any)[String(dObj.getDay())]) {
        matchKey = String(dObj.getDay());
      }

      // As a last resort, try capitalized or other variants
      if (!matchKey) {
        matchKey = Object.keys(availability).find((k) => {
          return k.toLowerCase().includes(weekday.toLowerCase().slice(0, 3));
        });
      }

      let slots: Array<string> = [];
      const DEFAULT_SLOTS: Array<string> = [
        "09:00",
        "10:00",
        "11:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
      ];
      if (matchKey) {
        slots = (availability as any)[matchKey] ?? [];
      } else {
        // Final fallback: pick first non-empty day so the user can at least pick a time
        const firstNonEmpty = Object.keys(availability).find(
          (k) => (availability as any)[k]?.length > 0,
        );
        if (firstNonEmpty) {
          slots = (availability as any)[firstNonEmpty] ?? [];
          matchKey = firstNonEmpty;
        }
      }

      // If the counsellor's availability is present but contains no slots for any day,
      // fall back to a sensible default so users can still book times.
      const allDaysEmpty = Object.keys(availability).every(
        (k) =>
          !(availability as any)[k] || (availability as any)[k].length === 0,
      );
      if (slots.length === 0 && allDaysEmpty) {
        slots = DEFAULT_SLOTS;
        if (import.meta.env?.DEV) {
          console.log(
            "[derivedTimeSlots] using DEFAULT_SLOTS because availability is empty",
            { newAptDate, availability, DEFAULT_SLOTS },
          );
        }
      }

      // Filter out already-booked slots for the selected counsellor/date
      const bookedSlots = (bookedAppointmentsForDate ?? []).map(
        (b: any) => b.timeSlot,
      );
      const available = slots.filter((s) => !bookedSlots.includes(s));

      if (import.meta.env?.DEV) {
        console.log("[derivedTimeSlots]", {
          newAptDate,
          computedWeekday: weekday,
          matchedKey: matchKey,
          availability,
          slots,
          bookedSlots,
          available,
        });
      }

      return available;
    } catch (err) {
      console.log(err);
      return [] as Array<string>;
    }
  }, [selectedCounsellor, newAptDate, bookedAppointmentsForDate]);

  // Auto-select the first available time if none selected yet
  React.useEffect(() => {
    if ((derivedTimeSlots?.length ?? 0) > 0 && !newAptTime) {
      setNewAptTime(derivedTimeSlots[0]);
    }
  }, [derivedTimeSlots, newAptTime]);

  // Days mapping helper
  const weekdayKeys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const availableDays = React.useMemo(() => {
    if (!selectedCounsellor) return [] as string[];
    return Object.entries(selectedCounsellor.availability || {})
      .filter(([, arr]: any) => Array.isArray(arr) && arr.length > 0)
      .map(([k]) => k);
  }, [selectedCounsellor]);

  // Find the next date (YYYY-MM-DD) with available slots within the next N days
  function findNextAvailableDate(
    startDateStr: string | undefined,
    lookahead = 30,
  ) {
    if (!selectedCounsellor) return null;
    const start = startDateStr
      ? ((): Date => {
          const parts = startDateStr.split("-").map((p) => Number(p));
          if (parts.length === 3 && parts.every((n) => !Number.isNaN(n)))
            return new Date(parts[0], parts[1] - 1, parts[2]);
          return new Date(startDateStr);
        })()
      : new Date();

    for (let i = 0; i < lookahead; i++) {
      const d = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + i,
      );
      const key = weekdayKeys[
        d.getDay() as number
      ] as keyof typeof selectedCounsellor.availability;
      const slots = (selectedCounsellor.availability?.[key] ??
        []) as Array<string>;
      if (slots.length > 0) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
    }

    return null;
  }

  // Add: bootstrap roles by email – runs only if no admin exists yet
  const ensureRoles = useMutation(api.users.ensureInitialRoles);
  const [rolesBootstrapped, setRolesBootstrapped] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && !rolesBootstrapped) {
      ensureRoles({})
        .catch(() => {
          // ignore
        })
        .finally(() => setRolesBootstrapped(true));
    }
  }, [isLoading, isAuthenticated, rolesBootstrapped, ensureRoles]);

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Use hard redirect to avoid router context requirements
    window.location.href = "/auth";
    return null;
  }

  const quickActions = [
    {
      title: "AI Chat Support",
      description: "Get immediate help and coping strategies",
      icon: MessageCircle,
      action: () => setShowAiChat(true),
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Book Appointment",
      description: "Schedule with a counselor",
      icon: Calendar,
      action: () => setShowAllAppointments(true),
      color: "bg-green-500/10 text-green-600",
    },
    {
      title: "Mental Health Screening",
      description: "Take PHQ-9, GAD-7, or GHQ assessment",
      icon: BarChart3,
      action: () => setShowScreening(true),
      color: "bg-purple-500/10 text-purple-600",
    },
    {
      title: "Resource Library",
      description: "Browse wellness guides and videos",
      icon: BookOpen,
      action: () => setShowResources(true),
      color: "bg-orange-500/10 text-orange-600",
    },
    {
      title: "Peer Support Forum",
      description: "Connect with other students",
      icon: Users,
      action: () => (window.location.href = "/forum"),
      color: "bg-pink-500/10 text-pink-600",
    },
  ];

  const upcomingAppointments =
    appointments
      ?.filter((apt) => {
        if (!(apt.status === "pending" || apt.status === "confirmed"))
          return false;

        // Parse scheduledDate (YYYY-MM-DD) and optional timeSlot (HH:MM) into a local Date
        try {
          const dateParts = (apt.scheduledDate || "")
            .split("-")
            .map((p: string) => Number(p));
          if (
            dateParts.length === 3 &&
            dateParts.every((n: number) => !Number.isNaN(n))
          ) {
            const [y, m, d] = dateParts;
            let hour = 0;
            let minute = 0;
            if (apt.timeSlot) {
              const t = String(apt.timeSlot)
                .split(":")
                .map((p) => Number(p));
              if (t.length >= 2 && !Number.isNaN(t[0]) && !Number.isNaN(t[1])) {
                hour = t[0];
                minute = t[1];
              }
            }
            const aptDate = new Date(y, m - 1, d, hour, minute);
            return aptDate.getTime() > new Date().getTime();
          }
        } catch (e) {
          console.log(e);
          // fallback to previous behavior
        }

        return new Date(apt.scheduledDate) > new Date();
      })
      .slice(0, 3) || [];

  const recentScreenings = (screenings ?? []).slice(0, 3);

  return (
    <div className="w-full bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome back, {user.name || "Student"}
              </h1>
              <p className="text-muted-foreground">
                How are you feeling today? We're here to support you.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAiChat(true)}
                className="flex items-center space-x-2 w-full sm:w-auto"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Need Help Now?</span>
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={async () => {
                  try {
                    // Set flag first to prevent further queries
                    setSigningOut(true);
                    await signOut();
                    window.location.href = "/";
                  } catch {
                    // no-op
                  }
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AiChatDialog open={showAiChat} onOpenChange={setShowAiChat} />
      <AppointmentChatDialog
        open={Boolean(chatAppointmentId)}
        onOpenChange={(v: boolean) => {
          if (!v) setChatAppointmentId(null);
        }}
        appointmentId={chatAppointmentId}
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-md transition-all duration-200 border-0 shadow-sm"
                  onClick={action.action}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${action.color}`}
                      >
                        <action.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{action.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {action.description}
                        </p>
                        <div className="flex items-center text-sm text-primary">
                          <span>Get started</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming Appointments */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Upcoming Appointments</span>
                </CardTitle>
                <CardDescription>
                  Your scheduled counseling sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment) => (
                      <div
                        key={appointment._id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/50 rounded-lg gap-3"
                      >
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2">
                            {appointment.counsellor?.user?.name || "Counselor"}
                            {appointment.preSessionForm?.generalQueries ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-700">
                                Note saved
                              </span>
                            ) : null}
                            {(appointment as any).proposedFollowUp && (
                              <div className="mt-2 p-2 rounded bg-yellow-50 border">
                                <div className="text-sm font-medium">
                                  Follow-up proposed
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {(appointment as any).proposedFollowUp.date
                                    ? new Date(
                                        (
                                          appointment as any
                                        ).proposedFollowUp.date,
                                      ).toLocaleDateString()
                                    : ""}{" "}
                                  at{" "}
                                  {(appointment as any).proposedFollowUp
                                    .timeSlot ?? ""}
                                </div>
                                <div className="mt-2 flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        await acceptFollowUp({
                                          appointmentId: appointment._id as any,
                                        });
                                        toast(
                                          "Follow-up accepted. The session will be scheduled.",
                                        );
                                      } catch (e: any) {
                                        toast(
                                          e?.message ??
                                            "Failed to accept follow-up",
                                        );
                                      }
                                    }}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      try {
                                        await rejectFollowUp({
                                          appointmentId: appointment._id as any,
                                        });
                                        toast("Follow-up rejected.");
                                      } catch (e: any) {
                                        toast(
                                          e?.message ??
                                            "Failed to reject follow-up",
                                        );
                                      }
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              {new Date(
                                appointment.scheduledDate,
                              ).toLocaleDateString()}{" "}
                              at {appointment.timeSlot}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`flex items-center space-x-2 text-sm ${appointment.status === "confirmed" ? "text-green-600" : "text-yellow-600"}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span className="capitalize">
                            {appointment.status}
                          </span>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 w-full sm:w-auto"
                            >
                              Pre-Session Form
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>
                                Share what you want to discuss
                              </DialogTitle>
                            </DialogHeader>
                            <PreSessionForm
                              appointmentId={appointment._id}
                              initialValue={
                                appointment.preSessionForm?.generalQueries ?? ""
                              }
                              onSubmitted={() =>
                                toast("Pre-session form submitted")
                              }
                              submitPreForm={submitPreForm}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full sm:w-auto"
                          onClick={() => setChatAppointmentId(appointment._id)}
                        >
                          Enter Chat
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setShowAllAppointments(true)}
                    >
                      Schedule Appointment
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No upcoming appointments
                    </p>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => setShowScreening(true)}
                    >
                      Take PHQ-9
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Screening History */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Screening History</span>
                </CardTitle>
                <CardDescription>
                  Your latest submitted assessments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentScreenings.length > 0 ? (
                  <div className="space-y-4">
                    {recentScreenings.map((s) => {
                      const date = new Date(
                        s._creationTime,
                      ).toLocaleDateString();
                      const tool =
                        s.toolType === "phq9"
                          ? "PHQ-9"
                          : s.toolType === "gad7"
                            ? "GAD-7"
                            : s.toolType?.toUpperCase();
                      const badgeClasses =
                        s.riskLevel === "high"
                          ? "bg-red-500/10 text-red-600"
                          : s.riskLevel === "moderate"
                            ? "bg-yellow-500/10 text-yellow-700"
                            : "bg-green-500/10 text-green-700";
                      return (
                        <div
                          key={s._id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/50 rounded-lg"
                        >
                          <div className="space-y-1">
                            <div className="font-medium">
                              {tool} • Score: {s.score}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Date: {date}
                            </div>
                          </div>
                          <div
                            className={`px-2.5 py-1 rounded-md text-xs font-medium ${badgeClasses}`}
                          >
                            {s.riskLevel.charAt(0).toUpperCase() +
                              s.riskLevel.slice(1)}{" "}
                            risk
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowScreening(true)}
                    >
                      View Full History
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No screenings yet. Start with a quick PHQ-9 assessment.
                    </p>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => setShowScreening(true)}
                    >
                      Take PHQ-9
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Appointments Drawer and Screening Dialog sections above */}

        {/* Wellness Tips */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12"
        >
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">
                    Daily Wellness Tip
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Take 5 minutes today to practice deep breathing. Inhale for
                    4 counts, hold for 4 counts, and exhale for 6 counts. This
                    simple technique can help reduce stress and anxiety.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setShowResources(true)}
                  >
                    Explore More Tips
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Previous Sessions (completed) - moved to appear after Daily Wellness Tip */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Previous Sessions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {(appointments ?? [])
              .filter((a) => a.status === "completed")
              .slice(0, 6)
              .map((a) => (
                <Card key={a._id} className="border-dashed">
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">
                          {a.counsellor?.user?.name || "Counsellor"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(a.scheduledDate).toLocaleDateString()} at{" "}
                          {a.timeSlot}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Completed
                      </div>
                    </div>
                    <div className="mt-3 text-sm">
                      <div>
                        <strong>Diagnosis:</strong>{" "}
                        {a.diagnosis ?? "Not recorded"}
                      </div>
                      <div className="mt-1">
                        <strong>Follow-up:</strong>{" "}
                        {a.followUp ?? "Not recorded"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {(appointments ?? []).filter((a) => a.status === "completed")
              .length === 0 && (
              <div className="text-muted-foreground">
                No previous sessions yet.
              </div>
            )}
          </div>
        </section>

        {/* Appointments Drawer */}
        <Drawer
          open={showAllAppointments}
          onOpenChange={setShowAllAppointments}
        >
          <DrawerContent className="max-h[85vh] max-h-[85vh] overflow-y-auto">
            <DrawerHeader>
              <DrawerTitle>All Appointments</DrawerTitle>
              <DrawerDescription>
                Review your sessions and optionally add or clear a pre-session
                note.
              </DrawerDescription>
            </DrawerHeader>

            {/* New Appointment Form */}
            <div className="px-4 sm:px-6 pb-4">
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">
                    Book a New Appointment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Helper when no counsellors are available */}
                  {(counsellors ?? []).length === 0 ? (
                    <div className="p-3 rounded-md border bg-amber-50 text-amber-900 text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          No counsellors are available yet. Add a sample
                          institution and counsellor to proceed.
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await seedRoles({});
                              toast(
                                "Sample counsellor added. Please select them to continue.",
                              );
                            } catch (e: any) {
                              toast(
                                e?.message ??
                                  "Failed to add sample counsellor.",
                              );
                            }
                          }}
                        >
                          Add sample counsellor
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Counsellor</Label>
                      <Select
                        value={newAptCounsellor}
                        onValueChange={(v) => {
                          setNewAptCounsellor(v);
                          setNewAptTime("");
                        }}
                        disabled={(counsellors ?? []).length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select counsellor" />
                        </SelectTrigger>
                        <SelectContent>
                          {(counsellors ?? []).length === 0 ? (
                            <SelectItem value="no-counsellors" disabled>
                              No counsellors available
                            </SelectItem>
                          ) : (
                            (counsellors ?? []).map((c: any) => (
                              <SelectItem
                                key={String(c._id)}
                                value={String(c._id)}
                              >
                                {c?.user?.name || "Counsellor"}
                                {c?.user?.email ? ` • ${c.user.email}` : ""}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={newAptDate}
                        onChange={(e) => {
                          setNewAptDate(e.target.value);
                          setNewAptTime("");
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Select
                        value={newAptTime}
                        onValueChange={setNewAptTime}
                        disabled={
                          !selectedCounsellor ||
                          !newAptDate ||
                          (derivedTimeSlots?.length ?? 0) === 0
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedCounsellor || !newAptDate
                                ? "Select date and counsellor first"
                                : (derivedTimeSlots?.length ?? 0) === 0
                                  ? "No slots available for that day"
                                  : "Select a time"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {(derivedTimeSlots ?? []).map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedCounsellor &&
                      newAptDate &&
                      (derivedTimeSlots?.length ?? 0) === 0 ? (
                        <div className="mt-2 text-sm text-muted-foreground">
                          No slots for that day.{" "}
                          {availableDays.length > 0 ? (
                            <>
                              Next available:{" "}
                              <strong>
                                {findNextAvailableDate(newAptDate) ??
                                  "none in next 30 days"}
                              </strong>
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const next =
                                      findNextAvailableDate(newAptDate);
                                    if (next) {
                                      setNewAptDate(next);
                                      setNewAptTime("");
                                    }
                                  }}
                                >
                                  Jump to next available date
                                </Button>
                              </div>
                            </>
                          ) : (
                            "This counsellor has no available slots."
                          )}
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Switch
                          checked={newAptAnon}
                          onCheckedChange={setNewAptAnon}
                        />
                        Book anonymously
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Optional notes for counsellor</Label>
                    <Textarea
                      placeholder="Share any context you'd like your counsellor to know."
                      value={newAptNotes}
                      onChange={(e) => setNewAptNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewAptCounsellor("");
                        setNewAptDate("");
                        setNewAptTime("");
                        setNewAptNotes("");
                        setNewAptAnon(false);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!newAptCounsellor) {
                          toast("Please select a counsellor.");
                          return;
                        }
                        if (!newAptDate) {
                          toast("Please select a date.");
                          return;
                        }
                        if (!newAptTime) {
                          toast("Please select a time.");
                          return;
                        }
                        try {
                          setCreatingApt(true);
                          await createAppointment({
                            counsellorId: newAptCounsellor as any,
                            scheduledDate: newAptDate,
                            timeSlot: newAptTime,
                            notes: newAptNotes || undefined,
                            isAnonymous: newAptAnon,
                          });
                          toast("Appointment booked.");
                          // Clear form and keep drawer open so the list shows it
                          setNewAptCounsellor("");
                          setNewAptDate("");
                          setNewAptTime("");
                          setNewAptNotes("");
                          setNewAptAnon(false);
                        } catch (e: any) {
                          toast(e?.message ?? "Failed to book appointment.");
                        } finally {
                          setCreatingApt(false);
                        }
                      }}
                      disabled={creatingApt}
                    >
                      {creatingApt ? "Booking..." : "Book Appointment"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="px-4 sm:px-6 pb-6 space-y-4">
              {(appointments ?? []).length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  You have no appointments yet.
                </div>
              ) : (
                (appointments ?? []).map((appointment) => {
                  const isUpcoming =
                    new Date(appointment.scheduledDate).getTime() >=
                    new Date().getTime();
                  const statusBadge =
                    appointment.status === "confirmed"
                      ? "bg-green-500/10 text-green-700"
                      : appointment.status === "pending"
                        ? "bg-yellow-500/10 text-yellow-700"
                        : appointment.status === "completed"
                          ? "bg-blue-500/10 text-blue-700"
                          : "bg-red-500/10 text-red-700";

                  return (
                    <div
                      key={appointment._id}
                      className="p-4 rounded-lg border bg-muted/40 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {appointment.counsellor?.user?.name || "Counselor"}
                            {appointment.preSessionForm?.generalQueries ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-700">
                                Note saved
                              </span>
                            ) : null}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(
                              appointment.scheduledDate,
                            ).toLocaleDateString()}{" "}
                            at {appointment.timeSlot}
                          </div>
                        </div>
                        <div
                          className={`px-2.5 py-1 rounded-md text-xs font-medium ${statusBadge}`}
                        >
                          {appointment.status.charAt(0).toUpperCase() +
                            appointment.status.slice(1)}
                        </div>
                      </div>

                      {isUpcoming &&
                      (appointment.status === "pending" ||
                        appointment.status === "confirmed") ? (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">
                            Pre-Session Note
                          </div>
                          <PreSessionForm
                            appointmentId={appointment._id}
                            initialValue={
                              appointment.preSessionForm?.generalQueries ?? ""
                            }
                            onSubmitted={() => {}}
                            submitPreForm={submitPreForm}
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Pre-session note not available for past or cancelled
                          sessions.
                        </div>
                      )}
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setChatAppointmentId(appointment._id)}
                        >
                          Enter Chat
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 sm:px-6 pb-6">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShowAllAppointments(false)}
              >
                Close
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Screening Dialog with Tabs */}
        <Dialog open={showScreening} onOpenChange={setShowScreening}>
          <DialogContent className="max-w-3xl w-[min(95vw,1000px)] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mental Health Screening</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="phq9" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="phq9">PHQ-9</TabsTrigger>
                <TabsTrigger value="gad7">GAD-7</TabsTrigger>
                <TabsTrigger value="ghq">GHQ</TabsTrigger>
              </TabsList>
              <TabsContent value="phq9">
                <GenericToolForm
                  title="PHQ-9 Depression Screening"
                  toolType="phq9"
                  questions={[
                    {
                      q: "Little interest or pleasure in doing things",
                      hint: "Frequency of experiencing little interest or pleasure",
                    },
                    {
                      q: "Feeling down, depressed, or hopeless",
                      hint: "Frequency of experiencing feeling down, depressed, or hopeless",
                    },
                    {
                      q: "Trouble falling or staying asleep, or sleeping too much",
                      hint: "Frequency of experiencing trouble with sleep",
                    },
                    {
                      q: "Feeling tired or having little energy",
                      hint: "Frequency of experiencing fatigue",
                    },
                    {
                      q: "Poor appetite or overeating",
                      hint: "Frequency of experiencing appetite issues",
                    },
                    {
                      q: "Feeling bad about yourself—or that you are a failure or have let yourself or your family down",
                      hint: "Frequency of negative self-perception",
                    },
                    {
                      q: "Trouble concentrating on things, such as reading the newspaper or watching television",
                      hint: "Frequency of trouble concentrating",
                    },
                    {
                      q: "Moving or speaking so slowly that other people could have noticed? Or the opposite—being so fidgety or restless",
                      hint: "Frequency of psychomotor changes",
                    },
                    {
                      q: "Thoughts that you would be better off dead or of hurting yourself in some way",
                      hint: "Frequency of suicidal thoughts",
                    },
                  ]}
                  submitScreening={submitScreening}
                  onDone={() => setShowScreening(false)}
                />
              </TabsContent>
              <TabsContent value="gad7">
                <GenericToolForm
                  title="GAD-7 Anxiety Screening"
                  toolType="gad7"
                  questions={[
                    { q: "Feeling nervous, anxious, or on edge", hint: "" },
                    {
                      q: "Not being able to stop or control worrying",
                      hint: "",
                    },
                    { q: "Worrying too much about different things", hint: "" },
                    { q: "Trouble relaxing", hint: "" },
                    {
                      q: "Being so restless that it's hard to sit still",
                      hint: "",
                    },
                    { q: "Becoming easily annoyed or irritable", hint: "" },
                    {
                      q: "Feeling afraid as if something awful might happen",
                      hint: "",
                    },
                  ]}
                  submitScreening={submitScreening}
                  onDone={() => setShowScreening(false)}
                />
              </TabsContent>
              <TabsContent value="ghq">
                <GenericToolForm
                  title="GHQ Screening"
                  toolType="ghq"
                  questions={[
                    {
                      q: "Have you recently been able to concentrate on what you're doing?",
                      hint: "",
                    },
                    {
                      q: "Have you recently lost much sleep over worry?",
                      hint: "",
                    },
                    {
                      q: "Have you recently felt that you are playing a useful part in things?",
                      hint: "",
                    },
                    {
                      q: "Have you recently felt capable of making decisions?",
                      hint: "",
                    },
                    {
                      q: "Have you recently felt constantly under strain?",
                      hint: "",
                    },
                    {
                      q: "Have you recently felt you couldn't overcome your difficulties?",
                      hint: "",
                    },
                    {
                      q: "Have you recently been able to enjoy your normal day-to-day activities?",
                      hint: "",
                    },
                    {
                      q: "Have you recently been feeling unhappy and depressed?",
                      hint: "",
                    },
                    {
                      q: "Have you recently been losing confidence in yourself?",
                      hint: "",
                    },
                    {
                      q: "Have you recently been thinking of yourself as a worthless person?",
                      hint: "",
                    },
                    {
                      q: "Have you recently been feeling reasonably happy, all things considered?",
                      hint: "",
                    },
                  ].slice(0, 9)}
                  submitScreening={submitScreening}
                  onDone={() => setShowScreening(false)}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Resource Library Drawer */}
        <Drawer open={showResources} onOpenChange={setShowResources}>
          <DrawerContent className="max-h-[85vh] overflow-y-auto">
            <DrawerHeader>
              <DrawerTitle>Resource Library</DrawerTitle>
              <DrawerDescription>
                Browse published resources from your institution and global
                library.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 sm:px-6 pb-6 space-y-4">
              {resources.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No resources available.
                </div>
              ) : (
                resources.map((r) => (
                  <div
                    key={r._id}
                    className="p-4 rounded-lg border bg-muted/40 space-y-1"
                  >
                    <div className="font-medium">{r.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {r.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Type: {r.type.toUpperCase()} • Lang: {r.language}
                    </div>
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          if (r.content.startsWith("http")) {
                            window.open(r.content, "_blank");
                          } else {
                            toast(r.content);
                          }
                        }}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 sm:px-6 pb-6">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShowResources(false)}
              >
                Close
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

function PreSessionForm({
  appointmentId,
  initialValue,
  onSubmitted,
  submitPreForm,
}: {
  appointmentId: string;
  initialValue?: string;
  onSubmitted: () => void;
  submitPreForm: ReturnType<
    typeof useMutation<typeof api.appointments.submitPreSessionForm>
  >;
}) {
  const [value, setValue] = React.useState(initialValue ?? "");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setValue(initialValue ?? "");
  }, [initialValue]);

  const clearPreForm = useMutation(api.appointments.clearPreSessionForm);
  return (
    <div className="space-y-4">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Share what you'd like to discuss in the session"
      />
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => {
            setValue(initialValue ?? "");
            onSubmitted();
          }}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          className="w-full sm:w-auto"
          onClick={async () => {
            try {
              setLoading(true);
              await clearPreForm({ appointmentId: appointmentId as any });
              setValue("");
              toast("Pre-session note cleared.");
              onSubmitted();
            } catch (e: any) {
              toast(e?.message ?? "Failed to clear note.");
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          {loading ? "Clearing..." : "Clear saved note"}
        </Button>
        <Button
          className="w-full sm:w-auto"
          onClick={async () => {
            if (!value.trim()) {
              toast("Please share a brief note before submitting.");
              return;
            }
            try {
              setLoading(true);
              await submitPreForm({
                appointmentId: appointmentId as any,
                generalQueries: value.trim(),
              });
              toast("Submitted for your upcoming session.");
              onSubmitted();
            } catch (e: any) {
              toast(e?.message ?? "Failed to submit form.");
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}

function GenericToolForm({
  title,
  toolType,
  questions,
  submitScreening,
  onDone,
}: {
  title: string;
  toolType: "phq9" | "gad7" | "ghq";
  questions: Array<{ q: string; hint?: string }>;
  submitScreening: ReturnType<
    typeof useMutation<typeof api.screening.submitScreening>
  >;
  onDone: () => void;
}) {
  const options = [
    { label: "Not at all", value: "0" },
    { label: "Several days", value: "1" },
    { label: "More than half the days", value: "2" },
    { label: "Nearly every day", value: "3" },
  ] as const;

  const [answers, setAnswers] = React.useState<Array<string | null>>(
    Array.from({ length: questions.length }, () => null),
  );
  const [submitting, setSubmitting] = React.useState(false);

  const total = answers.reduce((sum, v) => sum + (v ? parseInt(v) : 0), 0);
  const allAnswered = answers.every((a) => a !== null);

  const severity = (() => {
    if (toolType === "phq9") {
      if (total >= 20)
        return { label: "Severe depression", color: "text-red-600" };
      if (total >= 15)
        return { label: "Moderately severe depression", color: "text-red-600" };
      if (total >= 10)
        return { label: "Moderate depression", color: "text-yellow-600" };
      if (total >= 5)
        return { label: "Mild depression", color: "text-yellow-600" };
      return { label: "No depression", color: "text-green-600" };
    }
    if (toolType === "gad7") {
      if (total >= 15)
        return { label: "Severe anxiety", color: "text-red-600" };
      if (total >= 10)
        return { label: "Moderate anxiety", color: "text-yellow-600" };
      if (total >= 5)
        return { label: "Mild anxiety", color: "text-yellow-600" };
      return { label: "Minimal anxiety", color: "text-green-600" };
    }
    // GHQ: keep simple scale display
    if (total >= 20) return { label: "High distress", color: "text-red-600" };
    if (total >= 10)
      return { label: "Moderate distress", color: "text-yellow-600" };
    return { label: "Low distress", color: "text-green-600" };
  })();

  return (
    <div className="space-y-6">
      <div className="text-lg font-semibold">{title}</div>
      <div className="space-y-4">
        {questions.map((item, idx) => (
          <div key={idx} className="p-4 rounded-lg border bg-muted/40">
            <div className="font-medium">
              {idx + 1}. {item.q}
            </div>
            {item.hint ? (
              <div className="text-xs text-muted-foreground mb-3">
                {item.hint}
              </div>
            ) : null}
            <RadioGroup
              value={answers[idx] ?? undefined}
              onValueChange={(val) => {
                const next = [...answers];
                next[idx] = val;
                setAnswers(next);
              }}
              className="space-y-2"
            >
              {options.map((opt) => (
                <div
                  key={opt.value}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      id={`t-${toolType}-q${idx}-${opt.value}`}
                      value={opt.value}
                    />
                    <Label
                      htmlFor={`t-${toolType}-q${idx}-${opt.value}`}
                      className="cursor-pointer"
                    >
                      {opt.value} - {opt.label}
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {opt.value} point{opt.value === "1" ? "" : "s"}
                  </span>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>

      {allAnswered && (
        <div className="p-4 rounded-lg border bg-secondary/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm">
              <div className="font-semibold">Total Score: {total}</div>
              {toolType === "phq9" ? (
                <div className={`text-xs ${severity.color}`}>
                  Detected: {severity.label}
                </div>
              ) : (
                <div className={`text-xs ${severity.color}`}>
                  {severity.label}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => onDone()}
              >
                Cancel
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={submitting}
                onClick={async () => {
                  try {
                    setSubmitting(true);
                    const numeric = answers.map((a) => parseInt(a as string));
                    await submitScreening({
                      toolType: toolType as any,
                      responses: numeric,
                      isAnonymous: false,
                    });
                    toast(
                      `${toolType.toUpperCase()} submitted. Score: ${total}`,
                    );
                    onDone();
                  } catch (e: any) {
                    const msg = e?.message || "Failed to submit screening.";
                    if (
                      typeof msg === "string" &&
                      msg.toLowerCase().includes("unauthorized")
                    ) {
                      toast("Please sign in to submit an assessment.");
                      window.location.href = "/auth";
                    } else {
                      toast(msg);
                    }
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                {submitting ? "Submitting..." : "Submit Assessment"}
              </Button>
            </div>
          </div>
          {toolType === "phq9" && (
            <div className="text-xs text-muted-foreground leading-5">
              Depression severity scale:
              <div>0-4 No depression</div>
              <div>5-9 Mild depression</div>
              <div>10-14 Moderate depression</div>
              <div>15-19 Moderately severe depression</div>
              <div>20-27 Severe depression</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AiChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // Use the OpenAI SDK-based action
  const send = useAction(api.appointments.aiChat);
  const [pending, setPending] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [history, setHistory] = React.useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([
    {
      role: "assistant",
      content:
        "Hi! I'm here to offer supportive guidance. How can I help you today? (I can't provide medical advice, but I can share coping strategies and resources.)",
    },
  ]);

  const doSend = async () => {
    const text = input.trim();
    if (!text || pending) return;
    // Ensure the role type is narrowed correctly
    const nextHistory: Array<{ role: "user" | "assistant"; content: string }> =
      [...history, { role: "user" as const, content: text }];
    setHistory(nextHistory);
    setInput("");
    setPending(true);
    try {
      const resp = await send({
        messages: [
          {
            role: "system",
            content:
              "You are a compassionate, brief mental health support assistant. Be supportive, practical, and avoid medical claims. Keep responses concise.",
          },
          ...nextHistory.map((m) => ({ role: m.role, content: m.content })),
        ],
        // Use a reliable default model
        model: "anthropic/claude-3-haiku",
        maxTokens: 400,
      });
      const reply = resp?.content ?? "Sorry, I couldn't generate a response.";
      setHistory((h) => [...h, { role: "assistant", content: reply }]);
    } catch (e: any) {
      const raw = e?.message || "Failed to send message.";
      const friendly =
        typeof raw === "string" &&
        raw.includes("Could not find public function")
          ? "The AI service is updating. Please hard refresh the app (Cmd/Ctrl+Shift+R) and try again."
          : raw;
      setHistory((h) => [
        ...h,
        { role: "assistant", content: `Error: ${friendly}` },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Chat Support</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="h-64 overflow-y-auto rounded border p-3 bg-muted/30 space-y-3">
            {history.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "text-right" : "text-left"}
              >
                <div
                  className={
                    "inline-block px-3 py-2 rounded-lg max-w-[85%] whitespace-pre-wrap " +
                    (m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border")
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {pending && (
              <div className="text-left">
                <div className="inline-block px-3 py-2 rounded-lg bg-background border text-muted-foreground">
                  Thinking…
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
            <Button
              onClick={doSend}
              disabled={pending || input.trim().length === 0}
            >
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  // Query messages for the appointment when appointmentId is present
  const messages =
    useQuery(
      api.appointments.listChatMessages,
      appointmentId ? { appointmentId: appointmentId as any } : "skip",
    ) ?? [];

  const sendMessage = useMutation(api.appointments.sendChatMessage);
  const endChatByStudent = useMutation(api.appointments.endChatByStudent);

  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
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
      toast(
        "You ended the chat. The counsellor will be notified to submit the post-chat form.",
      );
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
              <div className="text-center text-muted-foreground">
                No messages yet.
              </div>
            )}
            {messages.map((m: any, i: number) => (
              <div
                key={i}
                className={
                  m.fromUserId ===
                  (typeof window !== "undefined"
                    ? (window as any).__convex_user_id
                    : undefined)
                    ? "text-right"
                    : "text-left"
                }
              >
                <div
                  className={
                    "inline-block px-3 py-2 rounded-lg max-w-[85%] whitespace-pre-wrap " +
                    (m.role === "student"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border")
                  }
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {m.fromName ??
                      (m.role === "counsellor" ? "Counsellor" : "Student")}
                  </div>
                  {m.content}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {m.createdAt
                      ? new Date(m.createdAt).toLocaleTimeString()
                      : ""}
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
            <Button
              onClick={doSend}
              disabled={pending || input.trim().length === 0}
            >
              Send
            </Button>
            <Button
              variant="destructive"
              onClick={doEndChat}
              disabled={pending}
            >
              End Chat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
