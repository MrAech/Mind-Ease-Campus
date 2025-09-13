import { Email } from "@convex-dev/auth/providers/Email";
import { alphabet, generateRandomString } from "oslo/crypto";

// Contract: sendVerificationRequest must attempt to send an OTP to `email`.
// If EMAIL_API_URL is set, we POST { to, otp, appName } with header X-API-KEY.
// If not set (local dev), we log the OTP to the server console.
export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  generateVerificationToken() {
    return generateRandomString(6, alphabet("0-9"));
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const appName =
      process.env.APP_NAME || process.env.VITE_APP_NAME || "HealCare";

    // Local development: always log OTP to server console instead of sending email.
    // Convex server logs will show this output when running `npx convex dev`.
    // eslint-disable-next-line no-console
    console.log(`[DEV OTP] to=${email} otp=${token} app=${appName}`);
  },
});
