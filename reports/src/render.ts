/**
 * Rendering the report model to HTML. The same HTML is what Puppeteer prints to PDF, so the
 * layout is print-first: neutral colours, avoid breaking a question across pages.
 *
 * Media is resolved through `inlineContent`. Today only SVG is emitted by the game, and it is
 * inlined directly from its sidecar file. The switch has arms for image/audio so that when the
 * game grows non-SVG media, this is an additive change, not a rewrite.
 */

import fs from "node:fs";
import path from "node:path";
import type { RecordedContent, RecordedQuestion } from "@philosoph/shared";
import type { ClassDistribution, ClassReport, Group, QuestionResult, StudentAnswer, StudentReport } from "./aggregate.js";
import { humanDate } from "./format.js";

export interface RenderCtx {
  /** Absolute path to the sessions directory, for resolving sidecar asset paths. */
  sessionsDir: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The report's date range for the header: one datetime for a single session, else start — end. */
function rangeLabel(start: Date, end: Date): string {
  return start.getTime() === end.getTime() ? humanDate(start) : `${humanDate(start)} — ${humanDate(end)}`;
}

/**
 * Red-amber-green band for an accuracy: >=80% green, 60–80% yellow, below 60% red. Keyed off the
 * same rounded percentage that's displayed, so the square never contradicts the number beside it
 * (79.6% shows as "80%" and is green, not a yellow square next to an "80%").
 */
function ragClass(accuracy: number): "green" | "yellow" | "red" {
  const p = Math.round(accuracy * 100);
  return p >= 80 ? "green" : p >= 60 ? "yellow" : "red";
}

/** A small status square placed next to any aggregate accuracy. */
function rag(accuracy: number): string {
  return `<span class="rag ${ragClass(accuracy)}" title="${pct(accuracy)}"></span>`;
}

/** One chip per skill a question carries; nothing when it carries none. */
function skillChips(skills: string[]): string {
  return skills.map((s) => `<span class="chip">${esc(s)}</span>`).join("");
}

/** Render a recorded content node to HTML, inlining graphics from their sidecar files. */
function inlineContent(content: RecordedContent, ctx: RenderCtx): string {
  switch (content.kind) {
    case "text":
      return `<span${content.emphasis ? ' class="em"' : ""}>${esc(content.text)}</span>`;
    case "svg": {
      const file = path.join(ctx.sessionsDir, content.path);
      let svg = "";
      try {
        svg = fs.readFileSync(file, "utf8");
      } catch {
        return `<span class="missing">[graphic unavailable]</span>`;
      }
      const cap = content.caption ? `<figcaption>${esc(content.caption)}</figcaption>` : "";
      return `<figure class="svg">${svg}${cap}</figure>`;
    }
    case "image": {
      // Future media: inline as a data URI from the sidecar. SVG remains the only kind emitted today.
      const file = path.join(ctx.sessionsDir, content.path ?? "");
      try {
        const b64 = fs.readFileSync(file).toString("base64");
        const mime = content.path?.endsWith(".png") ? "image/png" : "image/jpeg";
        return `<img alt="${esc(content.alt ?? "")}" src="data:${mime};base64,${b64}" />`;
      } catch {
        return `<span class="missing">[image unavailable]</span>`;
      }
    }
    case "audio":
      return `<span class="missing">[audio: ${esc(content.label ?? "clip")}]</span>`;
    case "composite":
      return content.parts.map((p) => inlineContent(p, ctx)).join(" ");
  }
}

/** A labelled accuracy bar: "Definitions  12/18 · 67%" with a fill. */
function bar(g: Group): string {
  return `
    <div class="bar-row">
      <div class="bar-head"><span>${esc(g.label)}</span><span class="muted">${g.correct}/${g.answered} · ${pct(g.accuracy)}</span></div>
      <div class="bar-track"><div class="bar-fill ${ragClass(g.accuracy)}" style="width:${pct(g.accuracy)}"></div></div>
    </div>`;
}

/** A pie of how many items fall in each red-amber-green band, with a small count legend. */
function ragPie(accuracies: number[]): string {
  const total = accuracies.length;
  if (total === 0) return "";
  const counts = { green: 0, yellow: 0, red: 0 };
  for (const a of accuracies) counts[ragClass(a)]++;
  const slices = [
    { cls: "green", n: counts.green, color: "var(--ok)" },
    { cls: "yellow", n: counts.yellow, color: "#eab308" },
    { cls: "red", n: counts.red, color: "var(--no)" },
  ].filter((s) => s.n > 0);

  const CX = 60, CY = 60, R = 54;
  let angle = -90; // start at the top
  const shapes = slices
    .map((s) => {
      const frac = s.n / total;
      if (frac >= 1) return `<circle cx="${CX}" cy="${CY}" r="${R}" fill="${s.color}"/>`;
      const a0 = angle;
      const a1 = (angle += frac * 360);
      const rad = (d: number) => (d * Math.PI) / 180;
      const x0 = CX + R * Math.cos(rad(a0)), y0 = CY + R * Math.sin(rad(a0));
      const x1 = CX + R * Math.cos(rad(a1)), y1 = CY + R * Math.sin(rad(a1));
      const large = a1 - a0 > 180 ? 1 : 0;
      return `<path d="M ${CX} ${CY} L ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${s.color}"/>`;
    })
    .join("");
  const legend = slices.map((s) => `<span class="pie-leg"><span class="rag ${s.cls}"></span>${s.n}</span>`).join("");
  return `<div class="pie"><svg viewBox="0 0 120 120" role="img">${shapes}</svg><div class="pie-legend">${legend}</div></div>`;
}

/** A breakdown section: a RAG pie of its rows on the left third, the accuracy bars on the right. */
function groupSection(title: string, groups: Group[]): string {
  if (groups.length === 0) return "";
  return `<section class="group"><h2>${esc(title)}</h2>
    <div class="breakdown">
      <div class="breakdown-pie">${ragPie(groups.map((g) => g.accuracy))}</div>
      <div class="breakdown-main">${groups.map(bar).join("")}</div>
    </div>
  </section>`;
}

/** The class view of one question: the recreated question plus how answers were distributed. */
function questionCard(q: QuestionResult, ctx: RenderCtx): string {
  const rows = q.distribution
    .map((d) => {
      const share = q.answered > 0 ? d.count / q.answered : 0;
      // Render the option's real content (so a chart option shows its chart, not "curve-0"),
      // falling back to the precomputed text label.
      const opt = q.question.options?.find((o) => o.id === d.optionId);
      const label = opt ? inlineContent(opt.content, ctx) : esc(d.label);
      return `
      <div class="opt ${d.isCorrect ? "correct" : ""}">
        <div class="opt-head">
          <span class="mark">${d.isCorrect ? "✓" : ""}</span>
          <span class="opt-label">${label}</span>
          <span class="muted">${d.count} · ${pct(share)}</span>
        </div>
        <div class="bar-track thin"><div class="bar-fill" style="width:${pct(share)}"></div></div>
      </div>`;
    })
    .join("");
  return `
    <article class="qcard">
      <div class="qmeta"><span class="muted grow">${rag(q.accuracy)}${q.correct}/${q.answered} correct · ${pct(q.accuracy)}</span><span class="chip module">${esc(q.moduleLabel)}</span>${skillChips(q.question.skills)}</div>
      <div class="prompt">${inlineContent(q.question.prompt, ctx)}</div>
      <div class="opts">${rows}</div>
    </article>`;
}

/** A student's answer to one question: their pick, and the correct one when they missed. */
function answerCard(a: StudentAnswer, ctx: RenderCtx): string {
  const q = a.question;
  const prompt = q ? inlineContent(q.prompt, ctx) : esc(a.questionId || "question");
  const mine = q && a.chosenOptionId ? optionContent(q, a.chosenOptionId, ctx) : esc(a.chosenLabel ?? a.chosenOptionId);
  const showCorrect = !a.isCorrect && a.correctOptionId;
  const theirs = q && a.correctOptionId ? optionContent(q, a.correctOptionId, ctx) : esc(a.correctLabel ?? "");
  return `
    <article class="qcard">
      <div class="qmeta">
        <span class="mark ${a.isCorrect ? "ok" : "no"}">${a.isCorrect ? "✓" : "✗"}</span>
        <span class="chip module">${esc(a.moduleLabel)}</span>${skillChips(a.skills)}
      </div>
      <div class="prompt">${prompt}</div>
      <div class="answers ${showCorrect ? "" : "single"}">
        <div class="ans ${a.isCorrect ? "correct" : "wrong"}"><div class="ans-label">${a.isCorrect ? "Their answer & correct answer" : "Their answer"}</div>${mine}</div>
        ${showCorrect ? `<div class="ans correct"><div class="ans-label">Correct answer</div>${theirs}</div>` : ""}
      </div>
    </article>`;
}

function optionContent(q: RecordedQuestion, optionId: string, ctx: RenderCtx): string {
  const opt = q.options?.find((o) => o.id === optionId);
  return opt ? inlineContent(opt.content, ctx) : esc(optionId);
}

/**
 * Where this student sits in the class: a small histogram of everyone's accuracy with the
 * student's own score marked, plus how many standard deviations that is from the class mean.
 * The distribution is computed once on the class report and passed in.
 */
function classStanding(accuracy: number, dist: ClassDistribution): string {
  const svg = histogramSvg(dist.scores, accuracy, dist.mean);
  const meanσ = `class mean ${pct(dist.mean)} · σ ${pct(dist.stdev)}`;
  let caption: string;
  if (dist.stdev < 1e-9 || dist.scores.length < 2) {
    // No spread to measure against (one student, or everyone tied).
    caption = dist.scores.length < 2 ? "Only student in this range." : "Everyone scored the same.";
  } else {
    const z = (accuracy - dist.mean) / dist.stdev;
    const mag = Math.abs(z).toFixed(1);
    const dir = z >= 0 ? "above" : "below";
    caption =
      `<div><span class="standing-z ${ragClass(accuracy)}">${z >= 0 ? "+" : "−"}${mag}σ</span> ` +
      `<span class="muted">${mag === "0.0" ? "at the class mean" : `${dir} the class mean`}</span></div>` +
      `<div class="muted">${meanσ}</div>`;
  }
  return `
    <section class="group">
      <h2>Class standing</h2>
      <div class="standing">
        <div class="standing-plot">${svg}</div>
        <div class="standing-cap">${caption}</div>
      </div>
    </section>`;
}

/** A compact histogram of accuracies (0–100%) with a marker at `mark` and a dashed mean line. */
function histogramSvg(scores: number[], mark: number, mean: number): string {
  const W = 340, H = 120, padX = 10, top = 12, axisY = 92, bins = 10;
  const counts = new Array(bins).fill(0);
  for (const s of scores) counts[Math.min(bins - 1, Math.max(0, Math.floor(s * bins)))]++;
  const maxC = Math.max(1, ...counts);
  const spanX = W - 2 * padX;
  const xOf = (v: number) => padX + v * spanX;
  const barW = spanX / bins;
  const bars = counts
    .map((c, i) => {
      const h = (c / maxC) * (axisY - top);
      return `<rect x="${(padX + i * barW + 1).toFixed(1)}" y="${(axisY - h).toFixed(1)}" width="${(barW - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="#dfe3ee"/>`;
    })
    .join("");
  const meanX = xOf(mean);
  const markX = xOf(mark);
  const ticks = [0, 0.5, 1]
    .map((t) => `<text x="${xOf(t).toFixed(1)}" y="${H - 4}" text-anchor="${t === 0 ? "start" : t === 1 ? "end" : "middle"}" font-size="9" fill="#9ca3af">${pct(t)}</text>`)
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">
    ${bars}
    <line x1="${padX}" y1="${axisY}" x2="${W - padX}" y2="${axisY}" stroke="#e5e7eb"/>
    <line x1="${meanX.toFixed(1)}" y1="${top - 4}" x2="${meanX.toFixed(1)}" y2="${axisY}" stroke="#9ca3af" stroke-width="1" stroke-dasharray="3 3"/>
    <line x1="${markX.toFixed(1)}" y1="${top - 8}" x2="${markX.toFixed(1)}" y2="${axisY}" stroke="var(--accent)" stroke-width="2.5"/>
    <circle cx="${markX.toFixed(1)}" cy="${top - 8}" r="4" fill="var(--accent)"/>
    ${ticks}
  </svg>`;
}

function statTiles(tiles: { label: string; value: string; acc?: number }[]): string {
  return `<div class="tiles">${tiles
    .map((t) => `<div class="tile"><div class="tile-val">${t.acc !== undefined ? rag(t.acc) : ""}${esc(t.value)}</div><div class="tile-label">${esc(t.label)}</div></div>`)
    .join("")}</div>`;
}

export function classReportHtml(c: ClassReport, ctx: RenderCtx): string {
  const roster = c.roster
    .map((r) => `<tr><td>${rag(r.accuracy)}${esc(r.name)}</td><td class="num">${r.answered} / ${c.totalQuestions}</td><td class="num">${pct(r.accuracy)}</td></tr>`)
    .join("");
  const body = `
    <header class="report-head">
      <h1>Class report</h1>
      <div class="muted">${esc(rangeLabel(c.startedAt, c.endedAt))}</div>
    </header>
    ${statTiles([
      { label: "Overall accuracy", value: pct(c.accuracy), acc: c.accuracy },
      { label: "Students", value: String(c.studentCount) },
      { label: "Questions", value: String(c.totalQuestions) },
    ])}
    ${groupSection("By module", c.byModule)}
    ${groupSection("By skill", c.bySkill)}
    ${groupSection("By difficulty", c.byDifficulty)}
    <section class="group"><h2>Students</h2>
      <div class="breakdown">
        <div class="breakdown-pie">${ragPie(c.roster.map((r) => r.accuracy))}</div>
        <div class="breakdown-main">
          <table class="roster"><thead><tr><th>Name</th><th class="num">Answered</th><th class="num">Accuracy</th></tr></thead><tbody>${roster}</tbody></table>
        </div>
      </div>
    </section>
    <section class="group"><h2>Questions</h2>${c.questions.map((q) => questionCard(q, ctx)).join("")}</section>`;
  return documentHtml("Class report", body);
}

/**
 * @param solo omit the class-standing plot. Comparing a learner to a "class" of themselves says
 *        nothing, so a solo study report drops it rather than printing a degenerate chart.
 */
export function studentReportHtml(s: StudentReport, cls: ClassReport, ctx: RenderCtx, solo = false): string {
  const body = `
    <header class="report-head">
      <h1>${esc(s.name)}</h1>
      <div class="muted">${esc(rangeLabel(cls.startedAt, cls.endedAt))}</div>
    </header>
    ${statTiles([
      { label: "Accuracy", value: pct(s.accuracy), acc: s.accuracy },
      // Participation: how many of the session's questions they answered — catches a late arrival,
      // an early exit, or skipped questions in a way a bare "answered" count cannot.
      { label: "Questions answered", value: `${s.answered} / ${cls.totalQuestions}` },
    ])}
    ${solo ? "" : classStanding(s.accuracy, cls.distribution)}
    ${groupSection("By module", s.byModule)}
    ${groupSection("By skill", s.bySkill)}
    ${groupSection("By difficulty", s.byDifficulty)}
    <section class="group"><h2>Every question</h2>${s.answers.map((a) => answerCard(a, ctx)).join("")}</section>`;
  return documentHtml(s.name, body);
}

function documentHtml(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
}

const CSS = `
  :root { --ink:#1a1f36; --muted:#6b7280; --line:#e5e7eb; --accent:#4f6bed; --ok:#2fbf71; --no:#ef4444; --bg:#fff; }
  * { box-sizing: border-box; }
  body { font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: var(--ink); margin: 0; padding: 32px; background: var(--bg); }
  h1 { font-size: 26px; margin: 0; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); border-bottom: 1px solid var(--line); padding-bottom: 6px; margin: 28px 0 14px; }
  .muted { color: var(--muted); }
  .em { font-weight: 600; }
  .report-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
  .tile { border: 1px solid var(--line); border-radius: 12px; padding: 14px; text-align: center; }
  .tile-val { font-size: 24px; font-weight: 700; color: var(--accent); }
  .tile-label { font-size: 12px; color: var(--muted); margin-top: 4px; }
  .group { break-inside: avoid; }
  .bar-row { margin: 8px 0; }
  .bar-head { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px; }
  .bar-track { background: #eef0f4; border-radius: 6px; height: 9px; overflow: hidden; }
  .bar-track.thin { height: 6px; }
  .bar-fill { background: var(--accent); height: 100%; }
  table.roster { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.roster th, table.roster td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .qcard { border: 1px solid var(--line); border-radius: 12px; padding: 14px; margin: 12px 0; break-inside: avoid; }
  .qmeta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px; }
  .chip { background: #eef0f4; color: var(--muted); border-radius: 999px; padding: 2px 10px; }
  .chip.module { background: rgba(79, 107, 237, 0.12); color: var(--accent); }
  .qmeta .grow { margin-right: auto; margin-bottom: 0; }
  .prompt { font-weight: 600; margin-bottom: 10px; }
  .opts { display: flex; flex-direction: column; gap: 8px; }
  .opt-head { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .opt-label { flex: 1; }
  .opt.correct .opt-label { font-weight: 600; }
  .mark { width: 14px; color: var(--ok); font-weight: 700; }
  .mark.no { color: var(--no); }
  .mark.ok { color: var(--ok); }
  .answers { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .answers.single { grid-template-columns: 1fr; }
  .ans { border: 2px solid var(--line); border-radius: 10px; padding: 10px; }
  .ans-label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin-bottom: 6px; }
  .ans.correct { border-color: var(--ok); background: rgba(47,191,113,.08); }
  .ans.wrong { border-color: var(--no); background: rgba(239,68,68,.08); }
  figure.svg { margin: 0; text-align: center; }
  figure.svg svg { max-width: 100%; height: auto; }
  /* Keep graphics from ballooning a report: a prompt chart is medium, an option/answer chart is
     small, and a chart used as a distribution label is a thumbnail. */
  .prompt figure.svg svg { max-height: 200px; }
  .ans figure.svg svg { max-height: 150px; }
  .opt-label figure.svg svg { max-height: 60px; }
  .opt-label figure.svg { text-align: left; }
  .missing { color: var(--muted); font-style: italic; }
  .rag { display: inline-block; width: 11px; height: 11px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
  .rag.green { background: var(--ok); }
  .rag.yellow { background: #eab308; }
  .rag.red { background: var(--no); }
  /* Group bars carry their own red-amber-green band instead of a separate swatch. */
  .bar-fill.green { background: var(--ok); }
  .bar-fill.yellow { background: #eab308; }
  .bar-fill.red { background: var(--no); }
  .standing { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
  .standing-plot { flex: 0 0 340px; max-width: 100%; }
  .standing-plot svg { width: 100%; height: auto; }
  .standing-cap { flex: 1; min-width: 160px; }
  .standing-z { font-size: 22px; font-weight: 700; }
  .standing-z.green { color: var(--ok); }
  .standing-z.yellow { color: #eab308; }
  .standing-z.red { color: var(--no); }
  /* Breakdown row: RAG pie on the left third, bars/table on the right two thirds. */
  .breakdown { display: flex; align-items: center; gap: 24px; }
  .breakdown-pie { flex: 0 0 32%; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .breakdown-pie svg { width: 120px; height: 120px; }
  .breakdown-main { flex: 1; min-width: 0; }
  .pie-legend { display: flex; gap: 12px; font-size: 12px; color: var(--muted); }
  .pie-leg { display: inline-flex; align-items: center; }
  .pie-leg .rag { width: 9px; height: 9px; }
`;
