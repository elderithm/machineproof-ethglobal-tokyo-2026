"use client";

import { ReactNode } from "react";
import { objectUrl, txUrl, shorten } from "@/lib/config";

export function Stat({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mt-1 text-sm text-white">{children}</div>
    </div>
  );
}

export function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-edge/60 py-2 last:border-0">
      <span className="label">{label}</span>
      <span className="text-right text-sm text-white">{children}</span>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "border-accent/50 text-accent",
    CREATED: "border-accent2/50 text-accent2",
    CLOSED: "border-accent2/50 text-accent2",
    SETTLED: "border-accent/50 text-accent",
    CANCELLED: "border-danger/50 text-danger",
  };
  return (
    <span className={`pill ${map[status] ?? "text-muted"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function TxLink({ digest }: { digest: string }) {
  return (
    <a className="link font-mono" href={txUrl(digest)} target="_blank" rel="noreferrer">
      {shorten(digest)} ↗
    </a>
  );
}

export function ObjectLink({ id }: { id: string }) {
  if (!id) return <span className="text-muted">—</span>;
  return (
    <a className="link font-mono" href={objectUrl(id)} target="_blank" rel="noreferrer">
      {shorten(id)} ↗
    </a>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "danger" | "success";
  children: ReactNode;
}) {
  const map = {
    info: "border-edge bg-panel2 text-muted",
    warn: "border-warn/40 bg-warn/10 text-warn",
    danger: "border-danger/40 bg-danger/10 text-danger",
    success: "border-accent/40 bg-accent/10 text-accent",
  };
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${map[tone]}`}>
      {children}
    </div>
  );
}
