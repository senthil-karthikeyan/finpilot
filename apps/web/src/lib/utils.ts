import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — class name utility used throughout shadcn/ui components.
 *
 * Combines clsx (conditional class names) with tailwind-merge
 * (removes Tailwind class conflicts, e.g. p-2 + p-4 → p-4).
 *
 * Usage:
 *   cn('px-4 py-2', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * formatINR — formats a number as Indian Rupees with the ₹ symbol.
 * Used for all monetary values in the UI (market value, P&L, goal amounts).
 *
 * Examples:
 *   formatINR(1234567.89) → "₹12,34,567.89"
 */
export function formatINR(amount: number, decimals = 2): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * formatINRCompact — compact form for large numbers in chart tooltips.
 * Examples:
 *   formatINRCompact(1500000)  → "₹15L"
 *   formatINRCompact(10000000) → "₹1Cr"
 */
export function formatINRCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(1)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return formatINR(amount);
}

/**
 * formatPercent — formats a number as a percentage string.
 * Examples:
 *   formatPercent(23.456) → "+23.46%"
 *   formatPercent(-5.1)   → "-5.10%"
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

/**
 * formatDate — formats an ISO date string (YYYY-MM-DD) to a human-readable form.
 * The T00:00:00 suffix forces UTC midnight parsing so timezone offsets
 * don't shift the date to the day before.
 *
 * Examples:
 *   formatDate("2026-09-18") → "18 Sep 2026"
 */
export function formatDate(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

