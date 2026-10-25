import { Card, Section } from "@/components/ui/primitives";
import type { ScreenSummary } from "@/lib/analytics";
import { fmt1, fmtInt } from "@/lib/format";
import type { Dict } from "@/lib/i18n";

/** "How to read SEI" — static guide on the ranking page, with a worked example from the current selection. */
export function SeiGuide({ summary, labels, t }: { summary: ScreenSummary[]; labels: Map<number, string>; t: Dict }) {
  const G = t.ranking.guide;
  const top = summary[0];
  const blocks = [
    { title: G.windowTitle, body: G.window },
    { title: G.ciTitle, body: G.ci },
    { title: G.vsTitle, body: G.vs },
    { title: G.useTitle, body: G.use },
  ];

  return (
    <Section title={G.title}>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4 md:col-span-2">
          <div className="text-ink-2 text-xs font-medium">{G.formulaTitle}</div>
          <div className="text-ink mt-1 text-base font-semibold md:text-lg">{G.formula}</div>
          {top && (
            <p className="text-ink-2 mt-2 text-sm">
              {G.example(labels.get(top.screenId) ?? "", fmtInt(top.sei * top.hours), top.hours, fmt1(top.sei))}
            </p>
          )}
        </Card>
        {blocks.map((b) => (
          <Card key={b.title} className="p-4">
            <div className="text-ink text-sm font-semibold">{b.title}</div>
            <p className="text-ink-2 mt-1.5 text-sm leading-relaxed">{b.body}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
