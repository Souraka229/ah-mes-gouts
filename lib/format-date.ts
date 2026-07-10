/** Date du jour en français, ex. « mardi 2 juillet » */
export function formatTodayFrench(date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
