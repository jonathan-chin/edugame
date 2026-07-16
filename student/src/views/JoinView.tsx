/**
 * Name entry. Validation runs client-side via the *same* shared `checkName` used by the
 * server, so profanity/format feedback is instant and the server still has the final say.
 *
 * Ionic inputs emit `onIonInput` (not a native `onChange`), so we bind them to React
 * Hook Form with `Controller` rather than `register`.
 */

import { checkName, type NameCheck } from "@edugame/shared";
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonModal,
  IonNote,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from "@ionic/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ApiError, joinGame } from "../lib/api";

const REASON_MESSAGE: Record<NonNullable<NameCheck["reason"]>, string> = {
  empty: "Please enter a name.",
  "too-short": "That name is too short.",
  "too-long": "Keep it under 24 characters.",
  profanity: "Please choose a classroom-appropriate name.",
};

/** Popular writers & poets — the name field's placeholder shows a random one each visit. */
const PLACEHOLDER_WRITERS = [
  "Maya Angelou",
  "Langston Hughes",
  "Emily Dickinson",
  "Pablo Neruda",
  "Toni Morrison",
  "Jane Austen",
  "Walt Whitman",
  "Sylvia Plath",
  "Mark Twain",
  "Virginia Woolf",
  "Edgar Allan Poe",
  "Robert Frost",
  "Zora Neale Hurston",
  "Chinua Achebe",
  "Oscar Wilde",
  "Leo Tolstoy",
  "Sappho",
  "Rumi",
];

function randomPlaceholder(): string {
  const name = PLACEHOLDER_WRITERS[Math.floor(Math.random() * PLACEHOLDER_WRITERS.length)] ?? "Jordan";
  return `e.g. ${name}`;
}

export function JoinView({ onJoined }: { onJoined: (token: string, name: string) => void }) {
  const { control, handleSubmit, formState } = useForm<{ name: string }>({
    mode: "onBlur",
    defaultValues: { name: "" },
  });
  const [toast, setToast] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  // Pick one random writer/poet placeholder per visit.
  const [placeholder] = useState(randomPlaceholder);

  const mutation = useMutation({
    mutationFn: (name: string) => joinGame(name),
    onSuccess: (res) => {
      onJoined(res.token, res.name);
    },
    onError: (err) => {
      const reason = err instanceof ApiError ? err.reason : undefined;
      if (reason === "name-taken") {
        setToast("That name's already taken — please choose a different one.");
        return;
      }
      const nameReason = reason as NonNullable<NameCheck["reason"]> | undefined;
      setToast((nameReason && REASON_MESSAGE[nameReason]) ?? "Could not join. Try again.");
    },
  });

  return (
    <div className="center">
      <IonText>
        <h1 style={{ fontSize: "2rem", marginBottom: 0 }}>EduGame</h1>
        <p className="caption">Enter a name to join the game.</p>
      </IonText>
      <IonCard style={{ background: "var(--card)" }}>
        <IonCardContent>
          <form onSubmit={handleSubmit((v) => mutation.mutate(checkName(v.name).value))}>
            <Controller
              control={control}
              name="name"
              rules={{
                validate: (v) => {
                  const c = checkName(v ?? "");
                  return c.ok || REASON_MESSAGE[c.reason!];
                },
              }}
              render={({ field }) => (
                <IonInput
                  label="Your name"
                  labelPlacement="stacked"
                  placeholder={placeholder}
                  autocapitalize="words"
                  value={field.value}
                  onIonInput={(e) => field.onChange(e.detail.value ?? "")}
                  onIonBlur={field.onBlur}
                />
              )}
            />
            {formState.errors.name ? <IonNote color="danger">{formState.errors.name.message}</IonNote> : null}
            <IonButton
              type="submit"
              expand="block"
              style={{ marginTop: 16 }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <IonSpinner name="dots" /> : "Join game"}
            </IonButton>
          </form>
        </IonCardContent>
      </IonCard>
      <div style={{ textAlign: "center" }}>
        <IonButton fill="clear" size="small" onClick={() => setPrivacyOpen(true)}>
          Privacy policy
        </IonButton>
      </div>

      <IonModal isOpen={privacyOpen} onDidDismiss={() => setPrivacyOpen(false)}>
        <IonHeader>
          <IonToolbar style={{ "--background": "var(--card)" } as React.CSSProperties}>
            <IonTitle>Privacy</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setPrivacyOpen(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p style={{ lineHeight: 1.5 }}>
            While you play, we reserve the right to record your progress — which questions you
            answer correctly and incorrectly — and to share it with the instructional staff for
            this class.
          </p>
          <p style={{ lineHeight: 1.5 }} className="caption">
            Your name is used only to label that progress for your teacher.
          </p>
        </IonContent>
      </IonModal>

      <IonToast isOpen={!!toast} message={toast ?? ""} duration={2600} onDidDismiss={() => setToast(null)} />
    </div>
  );
}
