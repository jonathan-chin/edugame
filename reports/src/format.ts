/**
 * Human-facing formatting: dates, file sizes, and the report filenames.
 *
 * All wall-clock formatting is in the **machine's local timezone** — sessions are stored in UTC
 * (their timestamps end in `Z`), but the instructor running reports thinks in local time.
 */

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** e.g. "Monday, January 1 3:20 PM" — local time. */
export function humanDate(d: Date): string {
  const h24 = d.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ampm = h24 < 12 ? "AM" : "PM";
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} ${h12}:${mm} ${ampm}`;
}

/** e.g. "4.2 KB", "980 B", "1.1 MB". */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Local-time stamp for filenames: `YYYY-MM-DDTHHMM` (ISO-shaped, no illegal colon). */
export function fileStamp(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}`;
}

/** Filesystem-safe form of a student's display name: spaces to hyphens, drop the rest. */
export function safeName(name: string): string {
  return name.trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9._-]/g, "") || "unnamed";
}

/** The inclusive date range as a stamp: `<start>` for a single session, else `<start>_<end>`. */
export function reportRange(start: Date, end: Date): string {
  const a = fileStamp(start);
  const b = fileStamp(end);
  return a === b ? a : `${a}_${b}`;
}

/**
 * Report filename per the agreed scheme:
 *   `<start>_<end>_<student>.pdf`
 * The end stamp is omitted when the range is a single session (start === end); the student
 * portion is omitted for the whole-class report. The range prefix is kept even though the file
 * lives in a range-named folder, so a PDF shared on its own still says which sessions it covers.
 */
export function reportFilename(start: Date, end: Date, student: string | null, ext = "pdf"): string {
  const who = student ? `_${safeName(student)}` : "";
  return `${reportRange(start, end)}${who}.${ext}`;
}

/** Subdirectory grouping one generation run's reports, named by its date range. */
export function reportDirName(start: Date, end: Date): string {
  return reportRange(start, end);
}
