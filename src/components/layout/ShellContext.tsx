"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ShellData } from "@/lib/data/shell";
import type { ShellWorkspace } from "./nav";

/** Trainer sidebar profile card (TRR-DSH-01 · profile-card): rating, active trainees, profile views. */
export type TrainerCardStats = { accredited: boolean; rating: number | null; learners: number; views: number };

export type ShellUser = { fullName: string; email: string; avatarUrl: string | null; verified: boolean; roleLabel: string; workspace: ShellWorkspace; trainerCard?: TrainerCardStats };

type ShellContextValue = { user: ShellUser; data: ShellData; openMenu: () => void };

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ value, children }: { value: ShellContextValue; children: ReactNode }) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <AppShell>");
  return ctx;
}
