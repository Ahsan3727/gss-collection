import React from 'react';

interface AdminPageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-line pb-5 mb-6 gap-4">
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-2 block">
          {eyebrow}
        </span>
        <h1 className="font-display text-3xl font-medium text-ink mt-1">{title}</h1>
        {subtitle && <p className="text-xs text-ink-2 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
