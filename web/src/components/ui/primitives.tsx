import type { ReactNode } from "react";

export function PageHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <header className="mt-6 mb-5">
      <h1 className="text-ink text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      {description && <p className="text-ink-2 mt-1.5 max-w-3xl text-sm leading-relaxed">{description}</p>}
    </header>
  );
}

export function Section({ title, description, children, actions }: { title: ReactNode; description?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-ink text-lg font-semibold">{title}</h2>
          {description && <p className="text-ink-2 mt-0.5 text-sm">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border-border bg-surface rounded-lg border ${className}`}>{children}</div>;
}

export function ChartCard({ title, subtitle, children }: { title?: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-4">
      {title && <div className="text-ink text-sm font-medium">{title}</div>}
      {subtitle && <div className="text-muted mt-0.5 text-xs">{subtitle}</div>}
      <div className={title || subtitle ? "mt-3" : ""}>{children}</div>
    </Card>
  );
}

/** `info` (e.g. an animated explainer trigger) takes the place of the plain `hint` marker. */
export function Kpi({ label, value, hint, info, footer }: { label: string; value: ReactNode; hint?: string; info?: ReactNode; footer?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-ink-2 flex items-center text-xs" title={info ? undefined : hint}>
        {label}
        {info ?? (hint && <span className="text-muted ml-1 cursor-help">ⓘ</span>)}
      </div>
      <div className="text-ink mt-1 text-2xl font-semibold md:text-[28px]">{value}</div>
      {footer && <div className="mt-2 text-xs">{footer}</div>}
    </Card>
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
    <div className="border-border overflow-auto rounded-md border" style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full text-sm">
        <thead className="bg-raised text-muted sticky top-0 text-xs">
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
                <td key={c.key} className={`text-ink-2 px-3 py-1.5 whitespace-nowrap ${c.align === "right" ? "text-right" : ""}`}>
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
    <details className="group border-border bg-surface mt-3 rounded-lg border">
      <summary className="text-ink-2 hover:bg-hover cursor-pointer rounded-lg px-4 py-2.5 text-sm select-none">{label}</summary>
      <div className="px-4 pb-4">{children}</div>
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
