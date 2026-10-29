import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

const VISITOR_COOKIE = "romc_visitor";
const DEMO_COOKIE = "romc_demo";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function isValidVisitorId(value: string | undefined): value is string {
  return Boolean(
    value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}

export function getOrCreateVisitorId(): string {
  const cookieStore = cookies();
  const existing = cookieStore.get(VISITOR_COOKIE)?.value;

  if (isValidVisitorId(existing)) {
    return existing;
  }

  const visitorId = randomUUID();
  cookieStore.set(VISITOR_COOKIE, visitorId, cookieOptions(ONE_YEAR_SECONDS));
  return visitorId;
}

export function isDemoMode(): boolean {
  return cookies().get(DEMO_COOKIE)?.value === "1";
}

export function setDemoMode(enabled: boolean): void {
  const cookieStore = cookies();

  if (enabled) {
    cookieStore.set(DEMO_COOKIE, "1", cookieOptions(ONE_WEEK_SECONDS));
    return;
  }

  cookieStore.set(DEMO_COOKIE, "", {
    ...cookieOptions(0),
    maxAge: 0,
  });
}

export function hasDemoModeCookie(): boolean {
  return isDemoMode();
}
