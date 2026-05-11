export function getKstDateString(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

export function getNextPublicationIso(date = new Date()) {
  const kstParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = Number(kstParts.find((part) => part.type === "year")?.value);
  const month = Number(kstParts.find((part) => part.type === "month")?.value);
  const day = Number(kstParts.find((part) => part.type === "day")?.value);
  const nextKstFivePmUtcMs = Date.UTC(year, month - 1, day + 1, 8, 0, 0);
  return new Date(nextKstFivePmUtcMs).toISOString();
}
