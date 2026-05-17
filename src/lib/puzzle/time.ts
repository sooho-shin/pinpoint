const KST_TIME_ZONE = "Asia/Seoul";
const PUBLICATION_HOUR_KST = 17;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getKstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour")
  };
}

function formatUtcDateMs(utcMs: number) {
  return new Date(utcMs).toISOString().slice(0, 10);
}

export function getKstDateString(date = new Date()) {
  const { year, month, day } = getKstParts(date);
  return formatUtcDateMs(Date.UTC(year, month - 1, day));
}

export function getActivePublicationDateKst(date = new Date()) {
  const { year, month, day, hour } = getKstParts(date);
  const currentKstDateUtcMs = Date.UTC(year, month - 1, day);
  const publicationDateUtcMs = hour < PUBLICATION_HOUR_KST ? currentKstDateUtcMs - ONE_DAY_MS : currentKstDateUtcMs;
  return formatUtcDateMs(publicationDateUtcMs);
}

export function getNextPublicationIso(date = new Date()) {
  const { year, month, day, hour } = getKstParts(date);
  const daysToAdd = hour < PUBLICATION_HOUR_KST ? 0 : 1;
  const nextKstFivePmUtcMs = Date.UTC(year, month - 1, day + daysToAdd, 8, 0, 0);
  return new Date(nextKstFivePmUtcMs).toISOString();
}
