"use client";
import { createAuthClient } from "@neondatabase/auth/next";

// One client keeps session updates shared by the header, account and settings.
export const authClient = createAuthClient();
