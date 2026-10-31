import React from 'react';

export function BrandLogo({ className = 'w-[22px] h-[22px]' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 1.5 22.5 12 12 22.5 1.5 12z" fill="#e3a008" />
      <path d="M12 6.5 17.5 12 12 17.5 6.5 12z" fill="#1a2561" />
    </svg>
  );
}

