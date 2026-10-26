import type { ReactNode } from "react";

import { Icon, type IconName } from "./icons";

export function PageHeader({ title, description, aside }: { title: string; description?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="mt-6 mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-ink text-2xl font-bold tracking-tight md:text-[28px]">{title}</h1>
        {description && <p className="text-muted mt-1 max-w-3xl text-sm leading-relaxed">{description}</p>}
      </div>
      {aside && <div className="sm:text-right">{aside}</div>}
    </header>
  );
}

/** Right-aligned "label / value" pair for the page header (e.g. the data window). */
export function HeaderStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <div className="text-muted text-[11px]">{label}</div>
      <div className="text-ink text-sm font-semibold">{value}</div>
    </>
  );
}

export function Section({ title, description, children, actions }: { title: ReactNode; description?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-ink text-base font-semibold">{title}</h2>
          {description && <p className="text-ink-2 mt-0.5 text-sm">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border-border bg-surface shadow-card rounded-2xl border ${className}`}>{children}</div>;
}

export function ChartCard({ title, subtitle, actions, children, className = "" }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={`p-5 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <div className="text-ink text-[15px] font-semibold">{title}</div>}
            {subtitle && <div className="text-muted mt-0.5 text-xs">{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      <div className={title || subtitle || actions ? "mt-4" : ""}>{children}</div>
    </Card>
  );
}

/**
 * KPI tile with an icon chip. `primary` fills the tile with the accent (use once per row).
 * `info` (e.g. an animated explainer trigger) takes the place of the plain `hint` marker.
 */
export function Kpi({
  label,
  value,
  icon,
  hint,
  info,
  footer,
  primary = false,
}: {
  label: string;
  value: ReactNode;
  icon?: IconName;
  hint?: string;
  info?: ReactNode;
  footer?: ReactNode;
  primary?: boolean;
}) {
  return (
    <div
      className={`shadow-card flex flex-col rounded-2xl border p-4 ${
        primary ? "on-accent bg-accent text-on-accent border-transparent" : "border-border bg-surface text-ink"
      }`}
    >
      {icon && (
        <span className={`flex size-8 items-center justify-center rounded-lg ${primary ? "bg-white/20" : "bg-accent-soft text-accent"}`}>
          <Icon name={icon} size={16} />
        </span>
      )}
      <div className={`mt-3 flex items-center text-[13px] font-medium ${primary ? "text-on-accent/90" : "text-ink-2"}`} title={info ? undefined : hint}>
        {label}
        {info ?? (hint && <span className={`ml-1 cursor-help ${primary ? "text-on-accent/70" : "text-muted"}`}>ⓘ</span>)}
      </div>
      <div className="tabular mt-0.5 text-2xl font-bold tracking-tight md:text-[28px]">{value}</div>
      {footer && <div className={`mt-1 text-xs ${primary ? "text-on-accent/80" : "text-muted"}`}>{footer}</div>}
    </div>
  );
}

type Status = "pass" | "fail" | "pending";

/** Status always carries an icon + label, never color alone. */
export function StatusBadge({ status, label }: { status: Status; label: string }) {
  const styles: Record<Status, { cls: string; icon: string }> = {
    pass: { cls: "text-good-text border-good/40 bg-good/10", icon: "✓" },
    fail: { cls: "text-critical border-critical/40 bg-critical/10", icon: "✕" },
    pending: { cls: "text-warning-text border-warning-text/40 bg-warning-text/10", icon: "!" },
  };
  const s = styles[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {label}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <Card className="text-ink-2 p-6 text-sm">{children}</Card>;
}

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
}

export function DataTable<T>({ rows, columns, maxHeight }: { rows: T[]; columns: Column<T>[]; maxHeight?: number }) {
  return (
    <div className="border-border overflow-auto rounded-xl border" style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full text-sm">
        <thead className="bg-surface text-muted sticky top-0 text-xs">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`border-border border-b px-3 py-2 font-medium whitespace-nowrap ${c.align === "right" ? "text-right" : "text-left"}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map((r, i) => (
            <tr key={i} className="border-border hover:bg-hover border-b last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={`text-ink-2 px-3 py-2 whitespace-nowrap ${c.align === "right" ? "text-right" : ""}`}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Every chart gets a table twin, collapsed by default. */
export function TableView({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group border-border bg-surface shadow-card mt-4 rounded-2xl border">
      <summary className="text-ink-2 hover:bg-hover cursor-pointer rounded-2xl px-5 py-3 text-sm font-medium select-none">{label}</summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

/** Color swatch + label for legends. */
export function LegendItem({ color, label, shape = "square" }: { color: string; label: string; shape?: "square" | "line" | "dot" | "diamond" }) {
  const swatch =
    shape === "line" ? (
      <span className="inline-block h-0.5 w-4 rounded" style={{ background: color }} />
    ) : shape === "dot" ? (
      <span className="inline-block size-2.5 rounded-full" style={{ background: color }} />
    ) : shape === "diamond" ? (
      <span className="inline-block size-2.5 rotate-45" style={{ background: color }} />
    ) : (
      <span className="inline-block size-2.5 rounded-sm" style={{ background: color }} />
    );
  return (
    <span className="text-ink-2 inline-flex items-center gap-1.5 text-xs">
      {swatch}
      {label}
    </span>
  );
}

export function Legend({ children }: { children: ReactNode }) {
  return <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">{children}</div>;
}
