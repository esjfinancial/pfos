# Scoped plan — biometric tokens off `localStorage` (S7, last genuine 7B security item)

> Standalone plan for the single highest-blast-radius change in the security program. Grounded
> in the actual code in `pfos/index.html` (the login/front-door page). Do this as its own
> focused session — a mistake locks users out of biometric sign-in.

## 1. The vulnerability (verified)
Biometric "quick login" stores the **Supabase session tokens in plaintext `localStorage`**:
- Enrollment (`pfos/index.html` ~1252, ~1321): on enroll, writes
  `pfos_biometric_token` = `session.access_token` and `pfos_biometric_refresh` = `session.refresh_token`.
- Login (`pfos/index.html` ~2138-2160): `navigator.credentials.get(...)` (Touch/Face ID) →
  on success reads those two keys → `db.auth.setSession({access_token, refresh_token})` → reload.

**Why it's a hole:** any XSS (and we just escaped the known sinks, but XSS risk is never zero)
can read `localStorage` and exfiltrate the **refresh_token** — a long-lived credential that mints
new sessions indefinitely = **full account takeover that survives password changes**. The
WebAuthn credential itself is hardware-secure, but here it only acts as a *local gate* that
releases plaintext tokens — so the tokens must sit somewhere readable, and `localStorage` is the
worst choice. The biometric `get()` never authenticates to the server; it just unlocks the cache.

Other biometric keys (`pfos_biometric_registered`, `_cred` = the WebAuthn rawId, `_user_id`) are
**not** sensitive — only `_token` and `_refresh` are. The refresh_token is the critical one.

## 2. Options (ranked)

### Option A — Server-side WebAuthn (the correct, acquisition-grade fix) ★ recommended
Make the biometric assertion a *real* authentication, so **no tokens are stored client-side at all.**
- **DB:** `webauthn_credentials` table (`user_id`, `credential_id`, `public_key`, `sign_count`, `created_at`), RLS: owner-only (reuse the S-cluster patterns).
- **Edge functions (deployable via MCP, like `pfos-calc`):**
  - `webauthn-challenge` — issues a random challenge (stored short-lived, e.g. in the table or a `challenges` row), JWT-gated for enroll, public (by email/credential lookup) for login.
  - `webauthn-verify` — verifies the signed assertion server-side (use a Deno WebAuthn lib, e.g. `@simplewebauthn/server`), checks `sign_count` monotonicity, and on success **issues a Supabase session** via the Admin API (`auth.admin.generateLink` / `createSession`-style) → returns tokens over the response (set into the SDK, never persisted to localStorage).
- **Client:** enrollment registers the public key to the server (not tokens); login calls challenge→`navigator.credentials.get`→verify→setSession with the *freshly issued* session. Remove all `pfos_biometric_token`/`_refresh` localStorage usage.
- **Effort:** medium-high (1–2 focused sessions). **Risk:** medium (new auth path; test thoroughly). **Result:** zero stored tokens — the real fix.

### Option D — Interim risk-reduction: drop the refresh_token (small, pragmatic)
Keep the current architecture but **stop storing `pfos_biometric_refresh`**; store only the
short-lived `access_token`. After it expires (~1h), biometric login fails gracefully →
fall back to password. 
- **Change:** delete the two `setItem('pfos_biometric_refresh', ...)` lines; in the login path call `setSession` with only the access_token (or `db.auth.setSession({access_token, refresh_token:access_token})` won't work — instead use the access_token to set the auth header / `getUser`, and if expired, prompt password).
- **Effort:** small. **Risk:** low-medium (biometric only works within the token's ~1h life; UX regression: re-password after expiry). **Result:** removes the long-lived-takeover vector; a stolen access_token expires fast. Still XSS-readable for its short life (partial).

### Option F — Remove biometric quick-login entirely (smallest, loses UX)
Delete the enroll + login token-caching path; keep password (+ Supabase's own session persistence). Many financial apps avoid client-stored tokens for exactly this reason.
- **Effort:** tiny. **Risk:** low. **Result:** hole gone; biometric convenience gone.

## 3. Recommendation — REVISED after checking the Supabase client config
**Critical correction:** every page calls `createClient(URL, ANON_KEY)` with **no auth options**,
so the SDK uses its defaults: `persistSession: true` + `localStorage`. The session refresh_token
is therefore **already in `localStorage` for every logged-in user** (key `sb-<ref>-auth-token`),
independent of biometrics. `pfos_biometric_refresh` is just a **redundant second copy**.

⇒ **Option A does NOT achieve "tokens off localStorage"** — after server-side WebAuthn issues a
session, the SDK still persists it to localStorage. A is a large, high-risk login-flow build for
*auth-integrity* gain only (the biometric gate becomes server-verified instead of a local JS
gate), not for the stated goal. **Not recommended as the primary fix.**

**Recommended instead (proportionate):**
1. **Remove the redundant biometric token copies** (`pfos_biometric_token`/`_refresh`). The SDK
   already restores the session on revisit; where biometric must re-establish a cleared session,
   prefer Option A's server-verified path OR accept that biometric re-auth falls back to password
   once the SDK session is gone. Net: one fewer copy of the refresh_token in localStorage.
2. **Add a Content-Security-Policy** header in `vercel.json` — the *actual* mitigation for the
   localStorage-token risk: it blocks the XSS injection that would be needed to read the token.
   Highest value-to-effort, and it protects the SDK's copy too. (Scope CSP carefully — the pages
   use inline scripts/styles, so a strict CSP needs `'unsafe-inline'` or nonces; even a moderate
   `script-src` allowlist + `object-src 'none'` + `frame-ancestors` helps.)
3. **Accept SDK localStorage persistence** as the standard SPA tradeoff. Truly removing it
   requires httpOnly-cookie sessions via a backend/edge session proxy — a major architecture
   change, disproportionate for a no-build SPA and not justified by the residual risk (gated
   behind no-known-XSS + the CSP above).

**Option A** remains worth doing ONLY if you want server-verified biometric (anti-forgery of the
local gate) for its own sake — but it should not be sold as "tokens off localStorage." Avoid C/E.

## 4. Test plan (whichever option)
- **Enroll** on a device (real biometric) → verify what's persisted: Option A = only the public key server-side, **nothing sensitive in localStorage**; Option D = no `pfos_biometric_refresh` key.
- **Biometric login** end-to-end → lands authenticated, session valid.
- **Negative:** simulate XSS reading `localStorage` → Option A: no tokens present; Option D: only a short-lived access_token, no refresh_token.
- **Fallback:** expired/cleared state → graceful prompt to password login (no lockout).
- **Cross-user guard** still works (the existing "different user signed in → wipe biometric" logic at ~756-763).
- Deploy via the standard page flow; the edge functions (Option A) via Supabase MCP `deploy_edge_function` (JWT-gated where appropriate, like `pfos-calc`).

## 5. Critical files
- `pfos/index.html`: enrollment (~1237 `maybeOfferBiometricEnrollment`, ~1300 `credentials.create`), login (~2138 `credentials.get` + `setSession`), cross-user wipe (~756). Token keys: `pfos_biometric_token`, `pfos_biometric_refresh`.
- `pfos-client/index.html`: clears `pfos_biometric_token`/`_refresh` on logout (~keep in sync with whatever store is chosen).
- (Option A) new: `webauthn_credentials` table + `webauthn-challenge` / `webauthn-verify` edge functions.

## 6. Risk note
This touches the **login flow** — the highest-blast-radius surface. Do it in isolation with a
real device test before deploying, and keep password login fully working as the fallback the
whole time. Until this ships, the residual exposure is gated behind (a) no known XSS sink (the
S7 escaping pass) and (b) the attacker needing XSS on the origin — real but not trivial.
