/**
 * Vocabulary modules — help students use CS / tech-interview jargon intentionally and
 * confidently.
 *
 * Each domain (developer, QA, IT, security) is split into a **Beginner** and an **Advanced**
 * module, so eight selectable modules in all. They share one generator that assembles a
 * **fresh** multiple-choice question on the fly from a bank of *fact-atoms* (a term + its
 * definition, a common misconception, an analogy, and a "confused-with" pairing). Nothing is a
 * pre-written question: template × term × procedural distractors × shuffle, all off the seeded
 * RNG — so it stays reproducible and correct-by-construction (every distractor is some *other*
 * term's real fact).
 *
 * Level split: a module's *subject* terms (the thing being asked about) come from that level;
 * *distractors* and pair-partners are drawn from the whole domain bank. So an Advanced module
 * can still ask "which describes SSO, not MFA?" even though MFA is a Beginner term — it just
 * won't make MFA itself the subject of a question. Advanced terms carry the confusable pairs and
 * nuance, so Advanced modules naturally skew toward distinctions and red flags.
 *
 * Four sub-skills (tagged on `skills`): Definitions, Distinctions, Red flags, Analogies.
 *
 * Source material: a technical-recruiter question bank (strong answers → definitions, red flags
 * → misconceptions, "difference between X and Y" → contrasts, examples → analogies).
 */

import { gradeStandardAnswer, revealStandardAnswer, text, type AnswerOption, type GeneratedQuestion, type QuestionModule, type RNG } from "@edugame/module-api";

type Level = "beginner" | "advanced";

export interface VocabAtom {
  term: string;
  /** Which level module asks *about* this term. Omitted by modules that don't split by level. */
  level?: Level;
  definition: string;
  /**
   * Alternate wordings of `definition`. The correct answer is drawn from these *and* `definition`,
   * so a student meeting the term twice does not see the same sentence and cannot pass by
   * recognising a memorised string instead of the meaning.
   */
  phrasings?: string[];
  /**
   * Hand-authored near-misses for THIS term. When present these replace the generated distractors,
   * which can only ever be as believable as the nearest other definition in the bank — for a term
   * with no close neighbour that is not very believable at all.
   *
   * These are deliberately allowed to sit close to the truth: a distractor a student has to argue
   * with is worth more than one they can dismiss on sight, and a genuinely contested option is a
   * class discussion rather than a defect.
   */
  distractors?: string[];
  misconception?: string;
  analogy?: string;
  /** A term this is easily confused with, plus the phrase that distinguishes THIS one. */
  contrast?: { with: string; thisIs: string };
}

// ---------------------------------------------------------------------------
// Fact-atom banks (curated from the recruiter question bank)
// ---------------------------------------------------------------------------

const DEV: VocabAtom[] = [
  { term: "Front-end", level: "beginner", definition: "The part of an application users see and interact with, running in the browser.", misconception: "It just means design — making things look pretty.", contrast: { with: "Back-end", thisIs: "What the user sees and interacts with" } },
  { term: "Back-end", level: "beginner", definition: "The server-side logic, databases, and processing behind an app that users don't see.", contrast: { with: "Front-end", thisIs: "The server-side logic and data behind the scenes" } },
  { term: "API", level: "beginner", definition: "A defined way for two applications to communicate and exchange data.", misconception: "It's a kind of database, or a programming language.", analogy: "A weather app asking a weather service for today's forecast." },
  { term: "Database", level: "beginner", definition: "An organized store of data that applications can query and update.", misconception: "It's basically the same thing as a spreadsheet.", analogy: "A filing cabinet that apps can search and update instantly." },
  { term: "SQL", level: "beginner", definition: "A language for querying and managing data in relational databases.", misconception: "It's a general-purpose programming language like Python." },
  { term: "OOP", level: "beginner", definition: "A style of programming that organizes code into objects bundling data and behavior." },
  { term: "Bug", level: "beginner", definition: "An error or flaw that makes software behave incorrectly." },
  { term: "Git", level: "beginner", definition: "A version-control system that tracks code changes and helps teams collaborate.", misconception: "Git and GitHub are the same thing.", analogy: "A save-history for code, with a timeline you can rewind." },
  { term: "Code review", level: "beginner", definition: "Teammates reading each other's code to catch bugs and share knowledge." },
  { term: "Class", level: "advanced", definition: "A blueprint that defines the data and behavior for a kind of object.", analogy: "The blueprint for a car.", contrast: { with: "Object", thisIs: "A blueprint or template" } },
  { term: "Object", level: "advanced", definition: "A specific instance created from a class.", analogy: "An actual car built from a blueprint.", contrast: { with: "Class", thisIs: "A concrete instance built from the blueprint" } },
  { term: "Inheritance", level: "advanced", definition: "When one class reuses and extends the data and behavior of another." },
  { term: "Encapsulation", level: "advanced", definition: "Bundling data with the methods that use it, and hiding internal details.", misconception: "It just means making everything private so nothing can be reused." },
  { term: "Array", level: "advanced", definition: "An ordered collection of items, typically fixed in size.", misconception: "An array and a list are basically the same thing.", contrast: { with: "List", thisIs: "Fixed in size" } },
  { term: "List", level: "advanced", definition: "An ordered collection that can grow or shrink as needed.", contrast: { with: "Array", thisIs: "Can grow or shrink dynamically" } },
  { term: "Stack", level: "advanced", definition: "A collection where the last item added is the first removed.", analogy: "A stack of plates — you take the top one first.", contrast: { with: "Queue", thisIs: "Last In, First Out (LIFO)" } },
  { term: "Queue", level: "advanced", definition: "A collection where the first item added is the first removed.", analogy: "A line at a coffee shop — first in line is served first.", contrast: { with: "Stack", thisIs: "First In, First Out (FIFO)" } },
  { term: "Primary key", level: "advanced", definition: "A column that uniquely identifies each record in a table.", contrast: { with: "Foreign key", thisIs: "Uniquely identifies a record in its own table" } },
  { term: "Foreign key", level: "advanced", definition: "A column that links a record to a row in another table.", contrast: { with: "Primary key", thisIs: "Links a record to a row in another table" } },
];

const QA: VocabAtom[] = [
  { term: "Software testing", level: "beginner", definition: "Checking whether an application works as expected and finding defects before users do.", misconception: "Testing only happens after development is finished." },
  { term: "Manual testing", level: "beginner", definition: "A person interacting with the application to check that it works.", contrast: { with: "Automated testing", thisIs: "A person performs the checks by hand" } },
  { term: "Automated testing", level: "beginner", definition: "Using scripts or tools to run tests automatically.", analogy: "A script that logs into a page for you every night instead of you doing it.", contrast: { with: "Manual testing", thisIs: "Scripts or tools run the checks automatically" } },
  { term: "Test case", level: "beginner", definition: "A documented set of steps used to verify a feature works correctly." },
  { term: "Regression testing", level: "beginner", definition: "Re-checking that existing features still work after a change.", analogy: "After adding a new payment option, making sure checkout still works." },
  { term: "Smoke test", level: "beginner", definition: "A quick check that the most critical features work before deeper testing.", analogy: "Starting a car to confirm it runs before driving it." },
  { term: "Agile", level: "advanced", definition: "Working in short, repeated cycles (sprints) with continuous collaboration.", misconception: "QA only gets involved at the very end." },
  { term: "Sprint", level: "advanced", definition: "A short, fixed development cycle in which a team delivers working software." },
  { term: "Automation framework", level: "advanced", definition: "A structured set of tools, standards, and reusable code that supports automated testing.", analogy: "A toolbox with organized tools instead of loose ones scattered around." },
  { term: "Exploratory testing", level: "advanced", definition: "Unscripted, hands-on testing where the tester investigates the app as they go.", contrast: { with: "Automated testing", thisIs: "Unscripted, human-driven investigation" } },
  { term: "Test automation", level: "advanced", definition: "Using tools and scripts to execute test cases automatically.", misconception: "Everything should be automated — there's no reason to test by hand." },
];

const IT: VocabAtom[] = [
  { term: "IT administrator", level: "beginner", definition: "Someone who maintains systems, accounts, software, and devices so employees can work securely.", misconception: "The job is only about fixing broken computers." },
  { term: "Microsoft 365", level: "beginner", definition: "A cloud productivity suite — Outlook, Word, Excel, Teams, and OneDrive." },
  { term: "MFA", level: "beginner", definition: "Requiring more than one form of verification to sign in, such as a password plus a phone code.", analogy: "A door that needs both a key and a code.", contrast: { with: "SSO", thisIs: "Adds extra verification steps for security" } },
  { term: "Help desk ticket", level: "beginner", definition: "A tracked request for IT support that records an issue and its resolution." },
  { term: "DNS", level: "beginner", definition: "The system that translates website names into the numeric addresses computers use.", misconception: "It stores your files or your email.", analogy: "A phone book that turns 'google.com' into a number." },
  { term: "VPN", level: "beginner", definition: "A secure, encrypted connection to company resources over the internet.", analogy: "A private tunnel through the public internet." },
  { term: "SSO", level: "advanced", definition: "Signing in once to gain access to many systems.", misconception: "SSO and MFA are the same thing.", analogy: "One badge that opens every door in the building.", contrast: { with: "MFA", thisIs: "One login unlocks many systems" } },
  { term: "Device management", level: "advanced", definition: "Configuring, securing, updating, and monitoring an organization's devices." },
  { term: "Onboarding", level: "advanced", definition: "Setting up a new employee's accounts, permissions, device, and software." },
];

const SECURITY: VocabAtom[] = [
  { term: "SOC analyst", level: "beginner", definition: "Someone who monitors security systems, investigates alerts, and responds to threats.", misconception: "They only react after a breach has already happened." },
  { term: "Phishing", level: "beginner", definition: "A social-engineering attack that tricks users into revealing credentials or data.", analogy: "A fake email pretending to be your bank to steal your password.", contrast: { with: "Malware", thisIs: "Tricks a person into giving up information" } },
  { term: "Malware", level: "beginner", definition: "Malicious software designed to damage, disrupt, or gain access to systems.", analogy: "A digital germ that infects and spreads between computers.", contrast: { with: "Phishing", thisIs: "Malicious software, not a human trick" } },
  { term: "MFA", level: "beginner", definition: "Requiring more than one form of verification to sign in.", analogy: "A door that needs both a key and a code." },
  { term: "Firewall", level: "beginner", definition: "A barrier that filters network traffic to block unauthorized access.", analogy: "A guard at the door deciding what traffic is allowed in or out." },
  { term: "MITRE ATT&CK", level: "advanced", definition: "A knowledge base of how attackers behave, used to understand and detect threats." },
  { term: "Incident", level: "advanced", definition: "A confirmed security event that requires investigation and response.", contrast: { with: "Alert", thisIs: "A confirmed event that needs a response" } },
  { term: "Alert", level: "advanced", definition: "A notification that something might be a security issue and needs triage.", contrast: { with: "Incident", thisIs: "A possible issue that still needs triage" } },
  { term: "Social engineering", level: "advanced", definition: "Manipulating people, rather than systems, into giving up access or information." },
  { term: "Vulnerability", level: "advanced", definition: "A weakness in a system that an attacker could exploit.", misconception: "A vulnerability means the system has already been breached." },
];

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/** The question archetypes the vocabulary generator can produce. */
export type VocabArchetype = "definition" | "discriminate" | "redflag" | "analogy";
type QType = VocabArchetype;

const SKILL: Record<QType, string> = {
  definition: "Definitions",
  discriminate: "Distinctions",
  redflag: "Red flags",
  analogy: "Analogies",
};
// TODO(difficulty): this is a hand-assigned constant per question type, so it just restates the
// skill — "By difficulty" in the reports ends up duplicating "By skill". Revisit to make it
// measured (empirical) rather than guessed. See TODO.md.
const DIFFICULTY: Record<QType, number> = { definition: 1, analogy: 2, redflag: 2, discriminate: 3 };

/**
 * Words too common to say anything about what a definition is *about*. Kept small on purpose —
 * this only has to stop "the/of/that" from making two unrelated definitions look alike.
 */
const STOPWORDS = new Set(
  ("a an the of to and or in on for that this with is are be as it its you your from by not no than" +
    " then so which what when where who into onto over under out up down at if they them their can").split(" "),
);

/** The content words of a definition — what it is actually about. */
function contentWords(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

/**
 * How alike two definitions read, 0..1: mostly shared content words, nudged by similar length so a
 * conspicuously short or long option doesn't stand out on shape alone.
 */
function similarity(a: string, b: string): number {
  const A = contentWords(a);
  const B = contentWords(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  const jaccard = shared / (A.size + B.size - shared);
  const lengthAffinity = Math.min(a.length, b.length) / Math.max(a.length, b.length);
  return jaccard * 0.8 + lengthAffinity * 0.2;
}

/** How many near neighbours to draw the random distractors from. */
const DISTRACTOR_SHORTLIST = 6;

/**
 * Distractors a student cannot dismiss by reading alone.
 *
 * Drawing uniformly from the bank tends to offer definitions about visibly unrelated topics — a
 * question about `ngrok` sitting beside three definitions of SQL joins is answerable by
 * elimination, testing critical reading rather than the term. Instead: the subject's own contrast
 * partner first (the bank already marks that pair as the one people confuse, so it is the most
 * believable wrong answer available), then the nearest neighbours by wording. The remainder is
 * drawn from a shortlist rather than the single closest so repeat draws of a term still vary.
 */
function believableDistractors(rng: RNG, subject: VocabAtom, bankDefs: VocabAtom[], byTerm: Map<string, VocabAtom>): string[] {
  const pool = bankDefs.filter((x) => x !== subject);
  const chosen: VocabAtom[] = [];

  const partner = subject.contrast ? byTerm.get(subject.contrast.with) : undefined;
  if (partner && pool.includes(partner)) chosen.push(partner);

  const ranked = pool
    .filter((x) => !chosen.includes(x))
    .map((x) => ({ atom: x, score: similarity(subject.definition, x.definition) }))
    .sort((p, q) => q.score - p.score)
    .map((r) => r.atom);

  const shortlist = ranked.slice(0, Math.max(3, Math.min(ranked.length, DISTRACTOR_SHORTLIST)));
  chosen.push(...rng.shuffle(shortlist).slice(0, 3 - chosen.length));
  return chosen.map((x) => x.definition);
}

// Article-free templates so any term (acronym, phrase, hyphenated) reads correctly.
const DEFINITION_TEMPLATES: ((t: string) => string)[] = [
  (t) => `What does ${t} mean?`,
  (t) => `Which best describes ${t}?`,
  (t) => `Which of these defines ${t}?`,
];

/** Assemble a 4-option multiple-choice question from a correct answer + a distractor pool. */
function assemble(rng: RNG, moduleId: string, type: QType, prompt: string, correct: string, distractors: string[]): GeneratedQuestion {
  const items = rng.shuffle([{ t: correct, ok: true }, ...rng.shuffle(distractors).slice(0, 3).map((t) => ({ t, ok: false }))]);
  const options: AnswerOption[] = items.map((it, i) => ({ id: `o${i}`, content: text(it.t) }));
  const correctOptionId = options[items.findIndex((it) => it.ok)]!.id;
  return {
    public: { id: rng.id("voc"), moduleId, skills: [SKILL[type]], difficulty: DIFFICULTY[type], prompt: text(prompt), answerFormat: "multiple-choice", options },
    key: { correctOptionId },
  };
}

/** Per-module wording tweaks. The defaults are the interview-prep phrasing. */
export interface VocabOptions {
  /**
   * Archetypes this module must never generate, even where its bank could support them. Used to
   * keep an archetype that suits one module family out of another — e.g. "red flags" asks a
   * student to pick the *false* statement, which fits interview prep but not lecture review.
   * The underlying atom data (misconceptions and the like) is left intact either way.
   */
  exclude?: VocabArchetype[];
}

/**
 * The atom buckets each archetype draws on, plus which archetypes this module can actually
 * produce — a bank must carry the right fields, and the module may exclude some outright.
 *
 * @param subjects the atoms this module asks *about* (its difficulty level)
 * @param bank     the full domain bank, used for distractors and pair-partners
 */
function analyze(subjects: VocabAtom[], bank: VocabAtom[], opts: VocabOptions) {
  const byTerm = new Map(bank.map((a) => [a.term, a] as const));
  const bankDefs = bank.filter((a) => a.definition);
  const bankAnalogies = bank.filter((a) => a.analogy);

  const subjDef = subjects.filter((a) => a.definition);
  const subjAnalogy = subjects.filter((a) => a.analogy);
  const subjContrast = subjects.filter((a) => a.contrast && byTerm.has(a.contrast.with));
  const subjMisc = subjects.filter((a) => a.misconception);

  const feasible: QType[] = [];
  if (subjDef.length >= 1 && bankDefs.length >= 4) feasible.push("definition");
  if (subjContrast.length >= 1) feasible.push("discriminate");
  if (subjMisc.length >= 1 && bankDefs.length >= 3) feasible.push("redflag");
  if (subjAnalogy.length >= 1 && bankAnalogies.length >= 4) feasible.push("analogy");

  const excluded = opts.exclude ?? [];
  return {
    byTerm, bankDefs, bankAnalogies, subjDef, subjAnalogy, subjContrast, subjMisc,
    feasible: feasible.filter((t) => !excluded.includes(t)),
  };
}

function generateVocab(rng: RNG, moduleId: string, subjects: VocabAtom[], bank: VocabAtom[], opts: VocabOptions = {}): GeneratedQuestion {
  const { byTerm, bankDefs, bankAnalogies, subjDef, subjAnalogy, subjContrast, subjMisc, feasible } = analyze(subjects, bank, opts);

  const type = rng.pick(feasible);

  if (type === "definition") {
    const a = rng.pick(subjDef);
    const prompt = rng.pick(DEFINITION_TEMPLATES)(a.term);
    // The correct answer varies across draws when the atom carries alternate phrasings; the
    // distractors come from the atom's own hand-authored set when it has one, else from the
    // nearest other definitions in the bank.
    const correct = rng.pick([a.definition, ...(a.phrasings ?? [])]);
    const distractors = a.distractors?.length ? a.distractors : believableDistractors(rng, a, bankDefs, byTerm);
    return assemble(rng, moduleId, type, prompt, correct, distractors);
  }

  if (type === "discriminate") {
    const a = rng.pick(subjContrast);
    const partner = byTerm.get(a.contrast!.with)!;
    const trap = partner.contrast?.thisIs ?? partner.definition;
    // Prefer other atoms' `thisIs` phrases for the remaining distractors. Falling back to a full
    // definition makes that option visibly longer than the rest, which gives the answer away on
    // shape alone — so only reach for definitions when the bank has too few contrast phrases.
    const rest = bank.filter((x) => x !== a && x !== partner);
    const phrases = rest.filter((x) => x.contrast).map((x) => x.contrast!.thisIs);
    const others = phrases.length >= 2 ? phrases : [...phrases, ...rest.filter((x) => !x.contrast).map((x) => x.definition)];
    const distractors = [trap, ...rng.shuffle(others).slice(0, 2)];
    return assemble(rng, moduleId, type, `Which describes ${a.term}, but not ${partner.term}?`, a.contrast!.thisIs, distractors);
  }

  if (type === "redflag") {
    const a = rng.pick(subjMisc);
    const distractors = [a.definition, ...rng.shuffle(bankDefs.filter((x) => x !== a).map((x) => x.definition)).slice(0, 2)];
    const prompt = `A recruiter asks you about ${a.term}. Which answer is a red flag — something you should NOT say?`;
    return assemble(rng, moduleId, type, prompt, a.misconception!, distractors);
  }

  const a = rng.pick(subjAnalogy);
  return assemble(rng, moduleId, type, `Which everyday analogy best fits ${a.term}?`, a.analogy!, bankAnalogies.filter((x) => x !== a).map((x) => x.analogy!));
}

/**
 * Fail loudly on a malformed bank.
 *
 * A dangling `contrast.with` is the dangerous case: `generateVocab` filters those atoms out, so
 * the module quietly loses Distinctions questions instead of erroring. With a bank per course
 * week that silence is easy to miss, so this runs when the module is built — at import, long
 * before a class is waiting on it.
 */
function validateVocabBank(id: string, bank: VocabAtom[]): void {
  const terms = new Set(bank.map((a) => a.term));
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const a of bank) {
    if (seen.has(a.term)) problems.push(`duplicate term ${JSON.stringify(a.term)}`);
    seen.add(a.term);
    if (!a.definition) problems.push(`${JSON.stringify(a.term)} has no definition`);
    if (a.contrast && !terms.has(a.contrast.with)) {
      problems.push(`${JSON.stringify(a.term)} contrasts with ${JSON.stringify(a.contrast.with)}, which is not in this bank`);
    }
    // Hand-authored answer pools: a question needs three distractors, and no "wrong" answer may
    // duplicate a wording we would also accept as correct.
    const correctForms = new Set([a.definition, ...(a.phrasings ?? [])]);
    if (a.distractors && a.distractors.length < 3) {
      problems.push(`${JSON.stringify(a.term)} has only ${a.distractors.length} distractor(s); 3 are needed`);
    }
    for (const d of a.distractors ?? []) {
      if (correctForms.has(d)) problems.push(`${JSON.stringify(a.term)} lists a distractor identical to a correct answer: ${JSON.stringify(d)}`);
    }
    if (new Set(a.distractors ?? []).size !== (a.distractors ?? []).length) {
      problems.push(`${JSON.stringify(a.term)} has duplicate distractors`);
    }
    if (new Set(correctForms).size !== 1 + (a.phrasings?.length ?? 0)) {
      problems.push(`${JSON.stringify(a.term)} has a phrasing identical to another correct answer`);
    }
  }
  if (problems.length) {
    throw new Error(`Vocabulary module "${id}" is malformed:\n  - ${problems.join("\n  - ")}`);
  }
}

/** Wrap a bank as a selectable module. `subjects` are asked about; `bank` supplies distractors. */
export function makeVocabModule(id: string, title: string, shortTitle: string, description: string, subjects: VocabAtom[], bank: VocabAtom[], opts?: VocabOptions): QuestionModule {
  validateVocabBank(id, bank);
  // An exclusion that leaves nothing to generate would only surface when a class asked for a
  // question, so check it at import instead.
  if (analyze(subjects, bank, opts ?? {}).feasible.length === 0) {
    throw new Error(`Vocabulary module "${id}" can generate no questions: its bank supports no archetype that is not excluded.`);
  }
  return {
    id, title, shortTitle, description,
    generate: (rng) => generateVocab(rng, id, subjects, bank, opts),
    grade: gradeStandardAnswer,
    reveal: revealStandardAnswer,
  };
}

/** Build the Beginner + Advanced pair of modules for a domain. */
function domainModules(baseId: string, name: string, short: string, atoms: VocabAtom[]): [QuestionModule, QuestionModule] {
  const beginner = atoms.filter((a) => a.level === "beginner");
  const advanced = atoms.filter((a) => a.level === "advanced");
  return [
    makeVocabModule(`${baseId}-beginner`, `${name} vocabulary · Beginner`, `${short} · Beg`, `Foundational ${short.toLowerCase()} terms — recognition and everyday analogies.`, beginner, atoms),
    makeVocabModule(`${baseId}-advanced`, `${name} vocabulary · Advanced`, `${short} · Adv`, `Specialized ${short.toLowerCase()} terms — distinctions and misconceptions.`, advanced, atoms),
  ];
}

export const [devVocabBeginner, devVocabAdvanced] = domainModules("vocab-dev", "Software developer", "Dev", DEV);
export const [qaVocabBeginner, qaVocabAdvanced] = domainModules("vocab-qa", "QA & testing", "QA", QA);
export const [itVocabBeginner, itVocabAdvanced] = domainModules("vocab-it", "IT support", "IT", IT);
export const [securityVocabBeginner, securityVocabAdvanced] = domainModules("vocab-security", "Cybersecurity", "Security", SECURITY);

export const VOCAB_MODULES: readonly QuestionModule[] = [
  devVocabBeginner,
  devVocabAdvanced,
  qaVocabBeginner,
  qaVocabAdvanced,
  itVocabBeginner,
  itVocabAdvanced,
  securityVocabBeginner,
  securityVocabAdvanced,
];
