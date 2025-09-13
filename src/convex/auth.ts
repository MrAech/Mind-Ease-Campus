import { convexAuth } from "@convex-dev/auth/server";
// Ensure environment variables (JWT_PRIVATE_KEY, JWKS, SITE_URL) are populated/decoded
import "./env";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { emailOtp } from "./auth/emailOtp";

// Local bypass mode: when set to '1' or when NODE_ENV !== 'production', enable always-auth for dev
const LOCAL_BYPASS =
  process.env.CONVEX_LOCAL_AUTH_ALWAYS === "1" ||
  process.env.NODE_ENV !== "production";

let auth: any = {};
let signIn: any = async () => {
  throw new Error("Auth is not initialized");
};
let signOut: any = async () => {};
let store: any = {};
let isAuthenticated: any = () => false;

if (LOCAL_BYPASS) {
  // eslint-disable-next-line no-console
  console.log(
    "Convex auth running in local-bypass mode: authentication will always succeed.",
  );

  signIn = async (provider?: any, opts?: any) => {
    return {
      user: {
        id: "local-user",
        email: (opts && opts.identifier) || "dev@localhost",
      },
      provider: provider || "local-bypass",
    };
  };

  signOut = async () => {
    return;
  };

  store = {};
  isAuthenticated = () => true;
} else {
  let authExports: any;
  try {
    // Try full auth (email OTP + anonymous)
    authExports = convexAuth({ providers: [emailOtp, Anonymous] });
  } catch (e) {
    // If initialization fails (commonly due to missing JWT env), fallback to Anonymous-only
    // so local development can continue without JWT setup.
    // eslint-disable-next-line no-console
    console.error(
      "convexAuth initialization failed, falling back to Anonymous-only:",
      e,
    );
    try {
      authExports = convexAuth({ providers: [Anonymous] });
    } catch (e2) {
      // If that also fails, provide safe no-op stubs so imports don't crash.
      // eslint-disable-next-line no-console
      console.error(
        "Anonymous-only convexAuth also failed; exporting no-op auth stubs:",
        e2,
      );
      authExports = {
        auth: {},
        signIn: async () => {
          throw new Error("Auth is not available in this environment");
        },
        signOut: async () => {},
        store: {},
        isAuthenticated: () => false,
      };
    }
  }

  auth = authExports.auth;
  signIn = authExports.signIn;
  signOut = authExports.signOut;
  store = authExports.store;
  isAuthenticated = authExports.isAuthenticated;
}

export { auth, signIn, signOut, store, isAuthenticated };
