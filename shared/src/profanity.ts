/**
 * Best-effort content checks.
 *
 * IMPORTANT (a concern we raised and the human accepted): this is a classroom
 * deterrent, not a safety guarantee. Wordlist filters have false positives (the
 * "Scunthorpe problem") and are trivially evaded. It exists to catch casual misuse of
 * the name field and free-text answers, and it runs identically on the client (instant
 * feedback) and on the server (authoritative rejection) by importing this one module.
 */

// A deliberately compact list of common slurs/obscenities kept as fragments. Matching
// is done on a normalized string so simple leetspeak ("a55") is collapsed first.
const BLOCKED_FRAGMENTS: readonly string[] = [
  "anal",
  "anus",
  "arse",
  "ass",
  "bastard",
  "bitch",
  "bollock",
  "boner",
  "boob",
  "clit",
  "cock",
  "coon",
  "crap",
  "cum",
  "cunt",
  "dick",
  "dildo",
  "douche",
  "dyke",
  "fag",
  "fuck",
  "goddamn",
  "handjob",
  "hell",
  "homo",
  "jerk",
  "jizz",
  "kike",
  "nazi",
  "nigg",
  "penis",
  "piss",
  "poon",
  "porn",
  "prick",
  "pussy",
  "queer",
  "retard",
  "rape",
  "scrotum",
  "semen",
  "sex",
  "shit",
  "slut",
  "spic",
  "tit",
  "twat",
  "vagina",
  "wank",
  "whore",
];

// Words that are safe but contain a blocked fragment as a substring. These are
// exempted to reduce false positives on innocent names/answers.
const ALLOWLIST: readonly string[] = [
  "class",
  "pass",
  "grass",
  "glass",
  "brass",
  "mass",
  "bass",
  "assess",
  "assam",
  "cassandra",
  "sussex",
  "essex",
  "middlesex",
  "shell",
  "hello",
  "shellac",
  "shelly",
  "michelle",
  "cockburn",
  "hancock",
  "scunthorpe",
  "analysis",
  "analy",
  "canal",
  "arsenal",
  "hitchcock",
];

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
};

/** Lowercase, map common leetspeak, and strip anything that isn't a letter. */
export function normalizeForCheck(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join("")
    .replace(/[^a-z]/g, "");
}

export function containsProfanity(input: string): boolean {
  const normalized = normalizeForCheck(input);
  if (!normalized) return false;

  // If the whole thing is an allowlisted word, let it through.
  if (ALLOWLIST.includes(normalized)) return false;

  for (const fragment of BLOCKED_FRAGMENTS) {
    let index = normalized.indexOf(fragment);
    while (index !== -1) {
      // Skip the hit if it falls inside an allowlisted word.
      const covered = ALLOWLIST.some((safe) => {
        const at = normalized.indexOf(safe);
        return at !== -1 && index >= at && index + fragment.length <= at + safe.length;
      });
      if (!covered) return true;
      index = normalized.indexOf(fragment, index + 1);
    }
  }
  return false;
}

export interface NameCheck {
  ok: boolean;
  /** The trimmed/collapsed value to actually use when ok. */
  value: string;
  reason?: "empty" | "too-short" | "too-long" | "profanity";
}

/** Validate and normalize a student-entered display name. */
export function checkName(raw: string): NameCheck {
  const value = raw.trim().replace(/\s+/g, " ");
  if (value.length === 0) return { ok: false, value, reason: "empty" };
  if (value.length < 2) return { ok: false, value, reason: "too-short" };
  if (value.length > 24) return { ok: false, value, reason: "too-long" };
  if (containsProfanity(value)) return { ok: false, value, reason: "profanity" };
  return { ok: true, value };
}
