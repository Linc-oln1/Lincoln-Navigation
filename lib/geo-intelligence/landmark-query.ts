// lib/geo-intelligence/landmark-query.ts  (client-safe)
//
// Cheap check for "this search is a landmark-relative description, not a
// place name" — e.g. "opposite the shell station", "behind MTN office".
// Kept separate from ghana-landmarks.ts (which does the Overpass lookup)
// so the search box can call it on every keystroke.

const RELATION = /\b(opposite|across from|behind|near|beside|next to|by the|after|before)\b/i

export function looksLikeLandmarkQuery(query: string): boolean {
  const q = query.trim()
  if (q.length < 8) return false
  const m = q.match(RELATION)
  if (!m || m.index === undefined) return false
  // Needs something to anchor on after the relation word.
  return q.slice(m.index + m[0].length).trim().length >= 3
}
