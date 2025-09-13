/* eslint-disable @typescript-eslint/no-explicit-any */
import { Toaster } from "@/components/ui/sonner";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import Dashboard from "@/pages/Dashboard.tsx";
import AdminPage from "@/pages/Admin.tsx";
import CounsellorPage from "@/pages/Counsellor.tsx";
import StudentPage from "@/pages/Student.tsx";
import ForumPage from "@/pages/Forum.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import "./types/global.d.ts";
import { toast } from "sonner";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function GlobalErrorCatcher() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      const msg = event?.error?.message || event?.message || "";
      if (
        typeof msg === "string" &&
        msg.includes("Could not find public function")
      ) {
        toast.error(
          "We're syncing the latest backend functions. Please hard refresh (Cmd/Ctrl+Shift+R).",
        );
      } else if (typeof msg === "string" && msg.includes("CONVEX")) {
        toast.error(
          "A Convex error occurred. Try again or hard refresh if it persists.",
        );
      }
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const reason: any = event?.reason;
      const msg = (reason?.message || `${reason || ""}`).toString();
      if (msg.includes("Could not find public function")) {
        toast.error(
          "We're syncing the latest backend functions. Please hard refresh (Cmd/Ctrl+Shift+R).",
        );
      } else if (msg.includes("CONVEX")) {
        toast.error(
          "A Convex error occurred. Try again or hard refresh if it persists.",
        );
      }
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAdmin } = useAuth();
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!isAdmin) {
    // enforce client-side redirect for non-admins
    window.location.href = "/dashboard";
    return null;
  }
  return <>{children}</>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <GlobalErrorCatcher />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/auth"
              element={<AuthPage redirectAfterAuth="/dashboard" />}
            />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route path="/counsellor" element={<CounsellorPage />} />
            <Route path="/student" element={<StudentPage />} />
            <Route path="/forum" element={<ForumPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);
