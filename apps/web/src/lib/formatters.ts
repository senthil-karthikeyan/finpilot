const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const nf2 = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const nf0 = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

const nf3 = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 3,
});

/**
 * Reference date matching the synthetic FinPilot dataset from mock.
 */
export const SYSTEM_TODAY = '2026-10-31';

/**
 * Calculates calendar days difference from the system reference date (pure and deterministic).
 */
export function daysFromToday(iso: string | null | undefined): number {
  if (!iso) return 0;
  const parts = iso.split('T')[0]?.split('-').map(Number);
  const todayParts = SYSTEM_TODAY.split('-').map(Number);
  if (!parts || parts.length < 3 || !todayParts || todayParts.length < 3) return 0;
  const tIso = Date.UTC(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
  const tToday = Date.UTC(todayParts[0] ?? 0, (todayParts[1] ?? 1) - 1, todayParts[2] ?? 1);
  return Math.round((tIso - tToday) / 864e5);
}

/**
 * Formats a number in Indian Rupee format with 2 decimal places.
 * Example: 142500 -> "₹1,42,500.00"
 */
export function inr(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '-';
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  return `${s}₹${nf2.format(a)}`;
}

/**
 * Formats a number in Indian Rupee format with 0 decimal places.
 * Example: 142500 -> "₹1,42,500"
 */
export function inr0(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '-';
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  return `${s}₹${nf0.format(a)}`;
}

/**
 * Formats a number into abbreviated Indian Rupee notation (Cr / L / exact).
 * Example: 14200000 -> "₹1.42 Cr", 350000 -> "₹3.50 L", 45000 -> "₹45,000"
 */
export function inrShort(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '-';
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e7) {
    return `${s}₹${(a / 1e7).toFixed(2)} Cr`;
  }
  if (a >= 1e5) {
    return `${s}₹${(a / 1e5).toFixed(2)} L`;
  }
  return `${s}₹${nf0.format(a)}`;
}

/**
 * Format quantity up to 3 decimals
 */
export function fmtQty(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return nf3.format(n);
}

/**
 * Formats integer count
 */
export function fmtCount(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return nf0.format(n);
}

/**
 * Formats an ISO date string or Date object into "12 May 2024" format.
 */
export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return '-';
  try {
    const str = typeof iso === 'string' ? iso : iso.toISOString();
    const parts = str.split('T')[0]?.split('-');
    if (parts && parts.length === 3) {
      const y = parseInt(parts[0] ?? '0', 10);
      const m = parseInt(parts[1] ?? '0', 10);
      const d = parseInt(parts[2] ?? '0', 10);
      const monthName = MONTHS[m - 1];
      if (monthName && !isNaN(d) && !isNaN(y)) {
        return `${d} ${monthName} ${y}`;
      }
    }
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  } catch {
    // fallback
  }
  return String(iso);
}

/**
 * Formats percentage
 */
export function pct(n: number | null | undefined, digits: number = 1): string {
  if (n === null || n === undefined || isNaN(n)) return '0%';
  return `${n.toFixed(digits)}%`;
}

/**
 * Capitalizes string
 */
export function cap(s: string | null | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Sign prefix for positive/negative numbers
 */
export function sgn(n: number): string {
  return n > 0.005 ? '+' : n < -0.005 ? '-' : '';
}

/**
 * CSS class for PnL
 */
export function pnlClass(n: number): string {
  return n > 0.005 ? 'up' : n < -0.005 ? 'down' : '';
}

/**
 * Converts days count to readable human phrasing.
 */
export function humanDays(d: number): string {
  const absD = Math.abs(d);
  if (absD >= 730) return `${Math.floor(absD / 365)} years`;
  if (absD >= 365) return '1 year';
  if (absD >= 60) return `${Math.round(absD / 30)} months`;
  if (absD === 1) return '1 day';
  return `${absD} days`;
}

/**
 * Computes relative date text and overdue state compared to reference date.
 */
export function relFuture(iso: string | null | undefined): { text: string; late: boolean } {
  if (!iso) return { text: '-', late: false };
  const d = daysFromToday(iso);
  if (d < 0) return { text: `Overdue by ${humanDays(-d)}`, late: true };
  if (d === 0) return { text: 'Due today', late: false };
  return { text: `In ${humanDays(d)}`, late: false };
}
