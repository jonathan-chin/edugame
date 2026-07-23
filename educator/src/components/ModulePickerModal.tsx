/**
 * A modal for choosing which question modules new questions are drawn from. The educator
 * ticks as many as they like; "Next question" then picks randomly (server-side, seeded)
 * from the selected pool.
 *
 * Every way out of this modal commits: the Done button, the backdrop, and Escape all mean the
 * same thing. Ticking a box is the decision — losing it to a stray tap outside the sheet is
 * never what someone meant, least of all mid-class.
 *
 * That includes clearing every module. An empty pool is a legitimate state to leave things in;
 * "Start game" is disabled until something is selected, so nothing here needs to second-guess it.
 */

import type { ModuleInfo } from "@edugame/shared";
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useEffect, useRef, useState } from "react";

export function ModulePickerModal({
  isOpen,
  modules,
  selected,
  onClose,
  onApply,
}: {
  isOpen: boolean;
  modules: ModuleInfo[];
  selected: string[];
  /** Close the modal (clear the parent's open state). */
  onClose: () => void;
  /** Commit the selection, which may be empty. */
  onApply: (moduleIds: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [filter, setFilter] = useState("");

  // Re-seed the draft from the committed selection each time the modal opens, and clear any
  // leftover filter so the full list is shown next time.
  useEffect(() => {
    if (isOpen) {
      setDraft(selected);
      setFilter("");
    }
  }, [isOpen, selected]);

  // Filter is display-only — it narrows the shown rows, never the selection. A ticked module
  // filtered out of view stays in the draft.
  const needle = filter.trim().toLowerCase();
  const shown = needle ? modules.filter((m) => m.title.toLowerCase().includes(needle)) : modules;

  const toggle = (id: string) =>
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  // `onDidDismiss` binds its handler when the modal mounts, so reading `draft` from the closure
  // there yields the value as of that render — empty — and every tick would be silently dropped.
  // A ref always holds the latest.
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // The single commit path. `onDidDismiss` fires however the modal was closed — including when
  // Done flips the parent's open state — so Done only needs to close, and this runs exactly once.
  const commit = () => {
    onApply(draftRef.current);
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={commit}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            {/* Clears the draft only — like any other tick, it lands when the modal closes. */}
            <IonButton onClick={() => setDraft([])} disabled={draft.length === 0}>
              Clear
            </IonButton>
          </IonButtons>
          <IonTitle>Question modules</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={onClose}>
              Done
            </IonButton>
          </IonButtons>
        </IonToolbar>
        {/* A second toolbar keeps the filter fixed above the scrolling list. */}
        <IonToolbar>
          <IonSearchbar
            className="module-filter"
            value={filter}
            placeholder="Filter by title"
            debounce={0}
            onIonInput={(e) => setFilter(e.detail.value ?? "")}
          />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <p className="caption" style={{ padding: "12px 16px 0" }}>
          {draft.length > 0
            ? "New questions are drawn at random from the selected modules."
            : "No modules selected — you won't be able to start a game until you pick one."}
        </p>
        <IonList>
          {shown.map((m) => (
            <IonItem key={m.id} button onClick={() => toggle(m.id)}>
              <IonCheckbox slot="start" checked={draft.includes(m.id)} />
              <IonLabel>
                <h2>{m.title}</h2>
                <p>{m.description}</p>
              </IonLabel>
            </IonItem>
          ))}
          {shown.length === 0 ? (
            <IonItem lines="none">
              <IonLabel className="ion-text-wrap">
                <p>No modules match “{filter.trim()}”.</p>
              </IonLabel>
            </IonItem>
          ) : null}
        </IonList>
      </IonContent>
    </IonModal>
  );
}
