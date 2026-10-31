import { describe, it, expect } from 'vitest';

function calculatePageNumbers(page: number, totalPages: number): (number | 'ellipsis')[] {
  const pageNumbers: (number | 'ellipsis')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      pageNumbers.push(p);
    } else if (pageNumbers[pageNumbers.length - 1] !== 'ellipsis') {
      pageNumbers.push('ellipsis');
    }
  }
  return pageNumbers;
}

function calculateItemRange(page: number, limit: number, total: number) {
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(total, page * limit);
  return { from, to };
}

describe('Pagination logic', () => {
  it('calculates page range for first page', () => {
    const range = calculateItemRange(1, 20, 48);
    expect(range.from).toBe(1);
    expect(range.to).toBe(20);
  });

  it('calculates page range for last partial page', () => {
    const range = calculateItemRange(3, 20, 48);
    expect(range.from).toBe(41);
    expect(range.to).toBe(48);
  });

  it('calculates 0 items for empty dataset', () => {
    const range = calculateItemRange(1, 20, 0);
    expect(range.from).toBe(0);
    expect(range.to).toBe(0);
  });

  it('generates page numbers without ellipsis for small total pages', () => {
    const pages = calculatePageNumbers(1, 3);
    expect(pages).toEqual([1, 2, 3]);
  });

  it('generates ellipsis for many pages when on page 1', () => {
    const pages = calculatePageNumbers(1, 10);
    expect(pages).toEqual([1, 2, 'ellipsis', 10]);
  });

  it('generates double ellipsis when in the middle of many pages', () => {
    const pages = calculatePageNumbers(5, 10);
    expect(pages).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
  });

  it('generates leading ellipsis when on the last page', () => {
    const pages = calculatePageNumbers(10, 10);
    expect(pages).toEqual([1, 'ellipsis', 9, 10]);
  });
});

