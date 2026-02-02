import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db"; // your drizzle instance
import * as schema from "../db/schema/auth";

const isDev = process.env.NODE_ENV !== "production";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_BASE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:8000",
  trustedOrigins: [
    process.env.FRONTEND_URL!,
    process.env.BETTER_AUTH_BASE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:8000",
  ],
  // Allow Postman / no-Origin requests in development only
  advanced: {
    disableCSRFCheck: isDev,
  },
  database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "student",
          input: true
        },
        imageCldPubId: {
          type: "string",
          required: false,
          input: true
        }
      }
    }
});