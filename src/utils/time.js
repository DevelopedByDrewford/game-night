function ordinal(n) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

// Dashboard activity feed — always the full absolute moment, e.g.
// "9:21 am Thursday June 9th, 2026".
export function formatAbsoluteTime(timestamp) {
  if (!timestamp?.toDate) return '';
  const date = timestamp.toDate();
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
  const month = date.toLocaleDateString(undefined, { month: 'long' });
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm} ${weekday} ${month} ${ordinal(date.getDate())}, ${year}`;
}

// In-game activity tracker (the room's play-by-play log) — short relative
// phrasing. Same-day is elapsed-time based (minutes/hours); once the
// calendar day changes it switches to day-based buckets ("yesterday", "N
// days ago", "a week ago", "N weeks ago"), falling back to the absolute
// format above for anything older than that.
export function formatRelativeTime(timestamp) {
  if (!timestamp?.toDate) return '';
  const date = timestamp.toDate();
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (dayDiff === 0) {
    if (diffMinutes < 1) return 'less than a minute ago';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    return `${Math.floor(diffMinutes / 60)}h ago`;
  }
  if (dayDiff === 1) return 'yesterday';
  if (dayDiff < 7) return `${dayDiff} days ago`;
  if (dayDiff < 14) return 'a week ago';
  if (dayDiff < 28) return `${Math.floor(dayDiff / 7)} weeks ago`;
  return formatAbsoluteTime(timestamp);
}
