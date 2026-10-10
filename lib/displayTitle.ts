/** Seed titles sometimes include the student's name. The byline already shows it. */
export function displayTitle(title: string, studentName?: string | null): string {
  if (!studentName) return title
  const suffix = ` — ${studentName}`
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title
}
