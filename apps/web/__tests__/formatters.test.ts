import { describe, it, expect } from 'vitest';
import {
  inr,
  inr0,
  inrShort,
  fmtQty,
  fmtCount,
  fmtDate,
  pct,
  cap,
  sgn,
  pnlClass,
} from '@/lib/formatters';

describe('formatters', () => {
  describe('inr', () => {
    it('formats numbers with 2 decimals in Indian numbering system', () => {
      expect(inr(142500)).toBe('₹1,42,500.00');
      expect(inr(10000000)).toBe('₹1,00,00,000.00');
    });

    it('formats negative numbers with leading minus', () => {
      expect(inr(-50000)).toBe('-₹50,000.00');
    });

    it('returns "-" for null or undefined', () => {
      expect(inr(null)).toBe('-');
      expect(inr(undefined)).toBe('-');
    });
  });

  describe('inr0', () => {
    it('formats numbers without decimals', () => {
      expect(inr0(142500)).toBe('₹1,42,500');
      expect(inr0(-7500)).toBe('-₹7,500');
    });

    it('returns "-" for null or undefined', () => {
      expect(inr0(null)).toBe('-');
      expect(inr0(undefined)).toBe('-');
    });
  });

  describe('inrShort', () => {
    it('formats crores (>= 1e7) with Cr suffix', () => {
      expect(inrShort(14200000)).toBe('₹1.42 Cr');
      expect(inrShort(-25000000)).toBe('-₹2.50 Cr');
    });

    it('formats lakhs (>= 1e5) with L suffix', () => {
      expect(inrShort(350000)).toBe('₹3.50 L');
      expect(inrShort(895000)).toBe('₹8.95 L');
    });

    it('formats below 1 lakh using standard Indian numbering without suffix', () => {
      expect(inrShort(45000)).toBe('₹45,000');
      expect(inrShort(999)).toBe('₹999');
    });

    it('returns "-" for null or undefined', () => {
      expect(inrShort(null)).toBe('-');
      expect(inrShort(undefined)).toBe('-');
    });
  });

  describe('fmtQty', () => {
    it('formats quantities up to 3 decimals', () => {
      expect(fmtQty(150.25)).toBe('150.25');
      expect(fmtQty(1000)).toBe('1,000');
    });

    it('returns "-" for null or undefined', () => {
      expect(fmtQty(null)).toBe('-');
      expect(fmtQty(undefined)).toBe('-');
    });
  });

  describe('fmtCount', () => {
    it('formats integers with commas', () => {
      expect(fmtCount(1250)).toBe('1,250');
      expect(fmtCount(0)).toBe('0');
      expect(fmtCount(null)).toBe('0');
      expect(fmtCount(undefined)).toBe('0');
    });
  });

  describe('fmtDate', () => {
    it('formats ISO date string into "D Mon YYYY"', () => {
      expect(fmtDate('2024-05-12T10:00:00.000Z')).toBe('12 May 2024');
      expect(fmtDate('2023-11-01')).toBe('1 Nov 2023');
    });

    it('handles Date instances', () => {
      const d = new Date('2025-01-15T00:00:00.000Z');
      expect(fmtDate(d)).toBe('15 Jan 2025');
    });

    it('returns "-" for null or undefined or empty', () => {
      expect(fmtDate(null)).toBe('-');
      expect(fmtDate(undefined)).toBe('-');
      expect(fmtDate('')).toBe('-');
    });
  });

  describe('pct', () => {
    it('formats percentages with given decimals', () => {
      expect(pct(42.56, 1)).toBe('42.6%');
      expect(pct(100, 0)).toBe('100%');
      expect(pct(null)).toBe('0%');
    });
  });

  describe('cap', () => {
    it('capitalizes first letter and lowercases the rest', () => {
      expect(cap('VERIFIED')).toBe('Verified');
      expect(cap('active')).toBe('Active');
      expect(cap('')).toBe('');
      expect(cap(null)).toBe('');
    });
  });

  describe('sgn & pnlClass', () => {
    it('computes sign correctly', () => {
      expect(sgn(100)).toBe('+');
      expect(sgn(-50)).toBe('-');
      expect(sgn(0)).toBe('');
      expect(sgn(0.002)).toBe('');
    });

    it('computes pnlClass correctly', () => {
      expect(pnlClass(100)).toBe('up');
      expect(pnlClass(-50)).toBe('down');
      expect(pnlClass(0)).toBe('');
    });
  });
});

