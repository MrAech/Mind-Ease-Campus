/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";

import { useEffect, useState } from "react";

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const { signIn, signOut } = useAuthActions();

  const [isLoading, setIsLoading] = useState(true);
  const ensureRoles = useMutation(api.users.ensureInitialRoles);
  const [ensured, setEnsured] = useState(false);

  // This effect updates the loading state once auth is loaded and user data is available
  // It ensures we only show content when both authentication state and user data are ready
  useEffect(() => {
    if (!isAuthLoading && user !== undefined) {
      setIsLoading(false);
    }
  }, [isAuthLoading, user]);

  // Ensure role assignment once after login
  useEffect(() => {
    if (!isAuthLoading && user && !ensured) {
      (async () => {
        try {
          await ensureRoles({});
        } catch {
          // no-op
        } finally {
          setEnsured(true);
        }
      })();
    }
  }, [isAuthLoading, user, ensured, ensureRoles]);

  const isAdmin = Boolean(user && (user as any).role === "admin");

  return {
    isLoading,
    isAuthenticated,
    user,
    isAdmin,
    signIn,
    signOut,
  };
}
