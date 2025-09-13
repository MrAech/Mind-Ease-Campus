/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as appointments from "../appointments.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as auth from "../auth.js";
import type * as counsellors from "../counsellors.js";
import type * as env from "../env.js";
import type * as forum from "../forum.js";
import type * as http from "../http.js";
import type * as institutions from "../institutions.js";
import type * as resources from "../resources.js";
import type * as screening from "../screening.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  appointments: typeof appointments;
  "auth/emailOtp": typeof auth_emailOtp;
  auth: typeof auth;
  counsellors: typeof counsellors;
  env: typeof env;
  forum: typeof forum;
  http: typeof http;
  institutions: typeof institutions;
  resources: typeof resources;
  screening: typeof screening;
  seed: typeof seed;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
