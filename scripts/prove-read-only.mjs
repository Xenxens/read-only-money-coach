#!/usr/bin/env node
/**
 * Read-Only Money Coach — standalone write-rejection probe.
 *
 * This file is the ONLY place in the repository that intentionally references
 * a money-moving PayPal endpoint. The application runtime never imports this
 * script and never calls the Orders API. The probe exists to produce evidence
 * for the release gate:
 *
 *   1. Obtain a real sandbox OAuth token with the configured app credentials.
 *   2. Confirm that the token carries both required reporting scopes.
 *   3. Confirm that the token carries no write-capable scope.
 *   4. Attempt to create a $0.01 sandbox order.
 *   5. PASS only when PayPal rejects that attempt with HTTP 401 or 403.
 *
 * The endpoint is hard-coded to the PayPal sandbox. No production host is used.
 * If the probe ever returns 2xx, stop, revoke the sandbox app credentials, and
 * do not deploy live mode. A created sandbox order is not captured and no real
 * money is involved, but it proves the credential is broader than this app's
 * safety boundary allows.
 *
 * Usage:
 *   npm run prove:read-only
 *   PROOF_ENV_FILE=.env.local npm run prove:read-only
 */

import { existsSync, readFileSync } from "node:fs";

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";
const TOKEN_URL = `${SANDBOX_BASE}/v1/oauth2/token`;
const ORDER_PROBE_URL = `${SANDBOX_BASE}/v2/checkout/orders`;

const REQUIRED_READ_SCOPES = [
  "https://uri.paypal.com/services/reporting/search/read",
  "https://uri.paypal.com/services/reporting/balances/read",
];

const FORBIDDEN_SCOPE_PATTERNS = [
  /\/services\/payments(?:\/|$)/i,
  /\/services\/payouts?(?:\/|$)/i,
  /\/services\/invoicing(?:\/|$)/i,
  /\/services\/subscriptions(?:\/|$)/i,
  /\/services\/vault(?:\/|$)/i,
  /\/services\/disputes\/update/i,
  /\/services\/checkout(?:\/|$)/i,
  /\/v1\/payments(?:\/|$)/i,
  /\/v1\/payouts(?:\/|$)/i,
];

const PROBE_AMOUNT_USD = "0.01";

function loadEnvFile() {
  const path = process.env.PROOF_ENV_FILE || ".env.local";

  if (!existsSync(path)) {
    console.log(
      `[env] ${path} not found. Using PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET from the process environment.`,
    );
    return;
  }

  const contents = readFileSync(path, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/,
    );

    if (!match) {
      continue;
    }

    const key = match[1];
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  console.log(`[env] Loaded ${path} (values are never printed).`);
}

function redact(value) {
  if (!value) {
    return "(missing)";
  }

  if (value.length <= 6) {
    return "***";
  }

  return `${value.slice(0, 3)}…${value.slice(-2)}`;
}

function parseScopes(scopeValue) {
  if (!scopeValue || typeof scopeValue !== "string") {
    return [];
  }

  return [...new Set(scopeValue.split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean))];
}

function hasForbiddenScope(scope) {
  return FORBIDDEN_SCOPE_PATTERNS.some((pattern) => pattern.test(scope));
}

function statusLine(ok, label, detail = "") {
  const badge = ok ? "PASS" : "FAIL";
  console.log(`[${badge}] ${label}${detail ? ` — ${detail}` : ""}`);
}

async function fetchToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required. Put them in .env.local or export them in this shell.",
    );
  }

  console.log(`[auth] Client ID: ${redact(clientId)}`);
  console.log(`[auth] Client secret: ${redact(clientSecret)}`);

  const authorization = Buffer.from(
    `${clientId}:${clientSecret}`,
    "utf8",
  ).toString("base64");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Language": "en_US",
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(20_000),
  });

  const body = await response.text();
  let payload = null;

  try {
    payload = JSON.parse(body);
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.access_token) {
    const issue = payload?.error_description || payload?.error || "no error detail";
    throw new Error(
      `sandbox OAuth failed with HTTP ${response.status}: ${String(issue).slice(0, 200)}`,
    );
  }

  console.log(`[auth] OAuth token issued (HTTP ${response.status}).`);
  return {
    accessToken: payload.access_token,
    scopes: parseScopes(payload.scope),
    scopeWasReported: typeof payload.scope === "string" && payload.scope.length > 0,
  };
}

async function probeOrderCreation(accessToken) {
  const requestId = `romc-proof-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const response = await fetch(ORDER_PROBE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": requestId,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description: "Read-Only Money Coach write-rejection probe (do not capture)",
          amount: {
            currency_code: "USD",
            value: PROBE_AMOUNT_USD,
          },
        },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  return { response, body };
}

async function main() {
  console.log("Read-Only Money Coach — PayPal sandbox write-rejection probe");
  console.log(`Sandbox host: ${SANDBOX_BASE}`);
  console.log(
    "The application runtime never calls the Orders API. This standalone script does, once, to prove the credential cannot write.",
  );
  console.log("");

  loadEnvFile();

  const { accessToken, scopes, scopeWasReported } = await fetchToken();
  const missingReadScopes = REQUIRED_READ_SCOPES.filter(
    (scope) => !scopes.includes(scope),
  );
  const forbiddenScopes = scopes.filter(hasForbiddenScope);
  const missingScopeDetail = missingReadScopes.length
    ? `missing ${missingReadScopes.join(", ")}`
    : "both reporting scopes present";

  console.log("");
  console.log(`[scope] ${scopes.length} scope(s) reported by PayPal:`);
  if (scopes.length === 0) {
    console.log("        (none)");
  } else {
    for (const scope of scopes) {
      console.log(`        - ${scope}`);
    }
  }
  statusLine(
    scopeWasReported && missingReadScopes.length === 0,
    "Required read scopes",
    missingScopeDetail,
  );
  statusLine(
    forbiddenScopes.length === 0,
    "No write-capable scopes",
    forbiddenScopes.length === 0
      ? "none found"
      : `found ${forbiddenScopes.join(", ")}`,
  );

  console.log("");
  console.log(
    `[probe] Attempting POST ${ORDER_PROBE_URL} for a $${PROBE_AMOUNT_USD} sandbox order…`,
  );

  const { response, body } = await probeOrderCreation(accessToken);
  const rejected = response.status === 401 || response.status === 403;

  console.log(`[probe] PayPal responded with HTTP ${response.status}.`);

  if (rejected) {
    const issue =
      body?.name || body?.error || body?.error_description || "authorization rejected";
    console.log(`[probe] Rejection detail: ${String(issue).slice(0, 200)}`);
  } else if (body?.id) {
    console.log(`[probe] !! An order was created: ${body.id}`);
    console.log(
      "[probe] !! Do not capture it. This is sandbox-only, but the credential is broader than the app allows.",
    );
  } else if (body?.name || body?.message) {
    console.log(
      `[probe] Detail: ${String(body.name || body.message).slice(0, 200)}`,
    );
  }

  statusLine(
    rejected,
    "Orders API write attempt rejected",
    rejected ? "HTTP 401/403" : `expected 401/403, received ${response.status}`,
  );

  const passed =
    scopeWasReported &&
    missingReadScopes.length === 0 &&
    forbiddenScopes.length === 0 &&
    rejected;

  console.log("");
  console.log("------------------------------------------------------------");
  if (passed) {
    console.log(
      "RESULT: PASS — the token has both reporting scopes, no write-capable scope, and PayPal rejected the order probe.",
    );
    console.log(
      "The live-mode read-only release gate is satisfied for this credential.",
    );
    console.log("------------------------------------------------------------");
    return;
  }

  console.log("RESULT: FAIL — do not ship live mode with this credential.");
  console.log("");

  if (!scopeWasReported) {
    console.log("• PayPal did not report token scopes, so read-only status is unproven.");
  }
  if (missingReadScopes.length > 0) {
    console.log(
      `• Missing reporting scopes: ${missingReadScopes.join(", ")}. Enable Transaction Search and balance reporting for the sandbox app.`,
    );
  }
  if (forbiddenScopes.length > 0) {
    console.log(
      `• Write-capable scopes are present: ${forbiddenScopes.join(", ")}. The app's scope guard will block live mode by design.`,
    );
  }
  if (!rejected) {
    console.log(
      `• The Orders probe returned HTTP ${response.status}, not 401/403. Revoke this sandbox app's credentials and create a new app with only reporting access.`,
    );
  }

  console.log(
    "• Demo mode remains safe and fully functional. Do not claim live-mode read-only status until this script passes.",
  );
  console.log("------------------------------------------------------------");
  process.exitCode = 1;
}

main().catch((error) => {
  console.error("");
  console.error(
    `RESULT: FAIL — ${error instanceof Error ? error.message : String(error)}`,
  );
  console.error(
    "No secrets were printed. Fix the credential or configuration, then rerun.",
  );
  process.exitCode = 1;
});
