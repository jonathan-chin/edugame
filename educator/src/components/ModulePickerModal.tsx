/**
 * A modal for choosing which question modules new questions are drawn from. The educator
 * ticks as many as they like; "Next question" then picks randomly (server-side, seeded)
 * from the selected pool. Edits are staged in a local draft and only committed on "Done",
 * so dismissing via the backdrop discards changes.
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
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useEffect, useState } from "react";

export function ModulePickerModal({
  isOpen,
  modules,
  selected,
  onDismiss,
  onApply,
}: {
  isOpen: boolean;
  modules: ModuleInfo[];
  selected: string[];
  onDismiss: () => void;
  onApply: (moduleIds: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(selected);

  // Re-seed the draft from the committed selection each time the modal opens.
  useEffect(() => {
    if (isOpen) setDraft(selected);
  }, [isOpen, selected]);

  const toggle = (id: string) =>
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Question modules</IonTitle>
          <IonButtons slot="end">
            <IonButton strong disabled={draft.length === 0} onClick={() => onApply(draft)}>
              Done
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <p className="caption" style={{ padding: "12px 16px 0" }}>
          New questions are drawn at random from the selected modules.
        </p>
        <IonList>
          {modules.map((m) => (
            <IonItem key={m.id} button onClick={() => toggle(m.id)}>
              <IonCheckbox slot="start" checked={draft.includes(m.id)} />
              <IonLabel>
                <h2>{m.title}</h2>
                <p>{m.description}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonModal>
  );
}
