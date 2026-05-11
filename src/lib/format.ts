export function formatElapsed(ms: number | null | undefined) {
  if (!Number.isFinite(Number(ms))) return "--:--";
  const totalSeconds = Math.max(0, Math.floor(Number(ms) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatKoreanDate(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul"
  }).format(date);
}
