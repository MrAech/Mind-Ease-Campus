// Helper to ensure JWT-related environment variables are available to Convex server
// Accept either `JWT_PRIVATE_KEY` (PEM) or `JWT_PRIVATE_KEY_BASE64` (single-line base64).
const { JWT_PRIVATE_KEY, JWT_PRIVATE_KEY_BASE64, JWKS, SITE_URL } = process.env;

function base64DecodeToUtf8(input: string): string {
  try {
    // @ts-ignore
    if (typeof Buffer !== "undefined") {
      // @ts-ignore
      return Buffer.from(input, "base64").toString("utf8");
    }
  } catch (e) {
    // ignore
  }

  if (typeof atob !== "undefined") {
    const binary = atob(input);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    // @ts-ignore
    if (typeof TextDecoder !== "undefined") {
      // @ts-ignore
      return new TextDecoder().decode(bytes);
    }
    let out = "";
    for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
    return out;
  }

  return input;
}

// Log which JWT env vars exist (masked for safety)
console.log("JWT-related env variables:");
Object.keys(process.env)
  .filter((key) => key.startsWith("JWT_") || key.startsWith("SITE_"))
  .forEach((key) => {
    const val = process.env[key];
    if (!val) {
      console.log(`${key}: <empty>`);
    } else if (key.includes("PRIVATE_KEY")) {
      // Mask PEM content in logs
      console.log(`${key}: ${val.length} chars`);
    } else {
      console.log(`${key}: ${val}`);
    }
  });

if (JWT_PRIVATE_KEY) {
  // PEM already present, nothing to do
  process.env.JWT_PRIVATE_KEY = JWT_PRIVATE_KEY;
  console.log("Using JWT_PRIVATE_KEY from environment (PEM)");
} else if (JWT_PRIVATE_KEY_BASE64) {
  try {
    const decoded = base64DecodeToUtf8(JWT_PRIVATE_KEY_BASE64);
    process.env.JWT_PRIVATE_KEY = decoded;
    console.log("Decoded JWT_PRIVATE_KEY from JWT_PRIVATE_KEY_BASE64");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to decode JWT_PRIVATE_KEY_BASE64:", e);
  }
} else {
  console.log("No JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_BASE64 found in env");
}

// If JWKS is provided as a JSON string in env, ensure it's available as-is.
if (!process.env.JWKS && JWKS) {
  process.env.JWKS = JWKS;
}

// SITE_URL fallback
if (!process.env.SITE_URL && SITE_URL) {
  process.env.SITE_URL = SITE_URL;
}

// Ensure the private key is PKCS#8 formatted. If the PEM is another format (e.g. PKCS#1), try converting it.
try {
  // Import crypto synchronously (Node runtime)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require("crypto");
  if (process.env.JWT_PRIVATE_KEY) {
    try {
      const keyObj = crypto.createPrivateKey(process.env.JWT_PRIVATE_KEY);
      const pkcs8 = keyObj.export({ format: "pem", type: "pkcs8" });
      if (pkcs8) {
        process.env.JWT_PRIVATE_KEY = pkcs8.toString ? pkcs8.toString() : pkcs8;
        console.log("Converted private key to PKCS#8 format");
      }
    } catch (e) {
      // If conversion fails, leave the key as-is and surface a log
      // eslint-disable-next-line no-console
      console.error("Private key conversion/verification failed:", e);
    }
  }
} catch (e) {
  // crypto require not available — skip conversion
  // eslint-disable-next-line no-console
  console.log("Node crypto not available; skipping PKCS#8 conversion");
}

export {};
