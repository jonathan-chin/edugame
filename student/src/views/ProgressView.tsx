/**
 * A student's own progress. Basic view = overall correct/percentage; deeper view =
 * the same broken down by question category and skill, followed by a newest-first history
 * of every question they answered. Refetches after each reveal (the reveal's questionId is
 * part of the query key), so the history grows live.
 */

import type { StudentHistoryItem, StudentProgress } from "@edugame/shared";
import { IonList, IonListHeader, IonSpinner, IonText } from "@ionic/react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { getProgress } from "../lib/api";
import { ContentView } from "../lib/ContentView";
import { type CachedQuestion, readQuestionCache } from "../lib/questionCache";

/** How many history rows to add per scroll. Rows render in full, so keep the first paint small. */
const PAGE = 8;

/** Start loading the next page once the end of the list is this close to the viewport. */
const LOOKAHEAD_PX = 200;

/**
 * Infinite scroll driven by a sentinel at the end of the list.
 *
 * Deliberately not `IonInfiniteScroll`: that only attaches its scroll listener when it is a
 * direct child of `ion-content`, and this view renders inside a wrapper, so it silently never
 * fires. A plain scroll listener on the content's scroll element has no such constraint.
 * Re-attaching on each `count` change — plus the check on attach — is what lets a short list
 * keep loading until the screen is full.
 */
function useInfiniteScroll(count: number, hasMore: boolean, loadMore: () => void) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinel.current || !hasMore) return;
    const content = sentinel.current.closest("ion-content");
    let scroller: HTMLElement | null = null;
    let cancelled = false;
    const check = () => {
      const rect = sentinel.current?.getBoundingClientRect();
      if (rect && rect.top <= window.innerHeight + LOOKAHEAD_PX) loadMore();
    };
    void (async () => {
      scroller = content ? await content.getScrollElement() : (document.scrollingElement as HTMLElement);
      if (cancelled || !scroller) return;
      scroller.addEventListener("scroll", check, { passive: true });
      check();
    })();
    return () => {
      cancelled = true;
      scroller?.removeEventListener("scroll", check);
    };
    // `loadMore` is a stable setState updater; `count` is what re-arms the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, hasMore]);
  return sentinel;
}

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function Breakdown({ title, rows }: { title: string; rows: StudentProgress["byModule"] }) {
  if (rows.length === 0) return null;
  return (
    <IonList style={{ background: "transparent" }}>
      <IonListHeader>{title}</IonListHeader>
      {rows.map((r) => (
        <div key={r.label} style={{ padding: "6px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>{r.label}</span>
            <span className="caption">
              {r.correct}/{r.answered} · {pct(r.accuracy)}
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: pct(r.accuracy) }} />
          </div>
        </div>
      ))}
    </IonList>
  );
}

/**
 * One answered question: what was asked, what they picked, and — only when they got it
 * wrong — what the answer actually was. The other options are in `item.options` but are
 * deliberately not shown; a wrong-answer review reads better as a straight comparison.
 */
function HistoryRow({ item, cached }: { item: StudentHistoryItem; cached?: CachedQuestion }) {
  const contentFor = (id?: string) => (id ? cached?.options.find((o) => o.id === id)?.content : undefined);
  const mine = contentFor(item.myOptionId);
  const correct = contentFor(item.correctOptionId);
  // Nothing to compare against when they were right, or when the answer key isn't a choice.
  const showCorrect = !item.isCorrect && Boolean(item.correctOptionId);

  return (
    <div className="history-item">
      <div className="history-meta">
        <span className={item.isCorrect ? "history-mark correct" : "history-mark wrong"}>
          {item.isCorrect ? "✓" : "✗"}
        </span>
        <span className="caption">
          {[item.moduleLabel, ...item.skills].join(" · ")}
        </span>
      </div>
      <div className="history-prompt">
        {cached ? <ContentView content={cached.prompt} /> : <span>{item.promptText ?? "Question"}</span>}
      </div>
      <div className={showCorrect ? "history-answers" : "history-answers single"}>
        <div className={item.isCorrect ? "history-answer correct" : "history-answer wrong"}>
          <p className="caption">Your answer</p>
          {mine ? <ContentView content={mine} /> : <span>{item.myAnswerText ?? item.myOptionId ?? "—"}</span>}
        </div>
        {showCorrect ? (
          <div className="history-answer correct">
            <p className="caption">Correct answer</p>
            {correct ? (
              <ContentView content={correct} />
            ) : (
              <span>{item.correctAnswerText ?? item.correctOptionId}</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProgressView({
  token,
  revealSignal,
  session,
}: {
  token: string;
  revealSignal: string | null;
  session: string | null;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["progress", token, revealSignal],
    queryFn: () => getProgress(token),
  });
  const [visible, setVisible] = useState(PAGE);
  // Re-read on each reveal: that's exactly when a newly-cached question shows up.
  const cache = useMemo(() => readQuestionCache(session), [session, revealSignal]);
  const total = data?.history?.length ?? 0;
  const sentinel = useInfiniteScroll(visible, visible < total, () => setVisible((v) => v + PAGE));

  if (isLoading || !data) {
    return (
      <div className="center" style={{ textAlign: "center" }}>
        <IonSpinner name="dots" />
      </div>
    );
  }

  const history = data.history ?? [];
  const shown = history.slice(0, visible);

  return (
    // Top-aligned rather than centered: with a long history, centering overflows off the top.
    <div className="center" style={{ justifyContent: "flex-start" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", fontWeight: 700, color: "var(--ion-color-primary)" }}>{pct(data.accuracy)}</div>
        <IonText className="caption">
          {data.correct} correct out of {data.answered} answered
        </IonText>
      </div>
      <Breakdown title="By module" rows={data.byModule} />
      <Breakdown title="By skill" rows={data.bySkill} />
      {history.length > 0 ? (
        <>
          <IonListHeader>History</IonListHeader>
          {shown.map((item) => (
            <HistoryRow key={item.questionId} item={item} cached={cache[item.questionId]} />
          ))}
          <div ref={sentinel} style={{ textAlign: "center", padding: 8 }}>
            {visible < history.length ? <IonSpinner name="dots" /> : null}
          </div>
        </>
      ) : null}
      {data.answered === 0 ? (
        <p className="caption" style={{ textAlign: "center" }}>
          Answer a question to start tracking your progress.
        </p>
      ) : null}
    </div>
  );
}
