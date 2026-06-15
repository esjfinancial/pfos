# PFOS — Remaining Work: Detailed Hardening Plan (outcomes · audits · tests)

> Same shape as the calculator-consolidation plan: each cluster lists its **Outcome**,
> the **Audits** (tool → pass condition), the **Tests**, and the **Failure modes** to guard
> against. Grounded in the LIVE state (Supabase `list_tables` + `get_advisors`, June 2026),
> not the months-old audit. **7B (security/RLS) is the active focus**; the other workstreams
> are scoped at cluster level so the whole remaining surface is visible.

---

## 0. Ground truth (verified live — this is what's actually wrong now)

The old plan said "13+ tables have no RLS." That's been remediated — **all 44 public tables
have `rls_enabled = true`.** The problem **migrated** to permissive policies + exposed
functions. `get_advisors(security)` returns **95 findings**:

| Count | Level | Finding | What it means |
|--|--|--|--|
| **68** | WARN | `rls_policy_always_true` | RLS is ON but the policy is `WITH CHECK (true)` / `USING (true)` → **no actual protection**. Almost all on **INSERT/UPDATE/DELETE** (writes). |
| **7** | WARN | `anon_security_definer_function_executable` | SECURITY DEFINER funcs callable by **anon** via RPC — incl. **`admin_restore_client_data`** (overwrite any client's data!), `rls_auto_enable`, `state_c_dual_plan_write`. |
| **7** | WARN | `authenticated_security_definer_function_executable` | Same funcs callable by any signed-in user. |
| **10** | WARN | `function_search_path_mutable` | SECURITY DEFINER funcs with mutable `search_path` (injection-hardening gap). |
| **2** | ERROR | `security_definer_view` | `calculator_analytics`, `calculator_tier_summary` run with definer rights → bypass caller RLS. |
| **1** | WARN | `auth_leaked_password_protection` | HaveIBeenPwned check disabled (one Auth toggle). |

**The headline deal-killers (still live):**
- `users` has an **`anon_insert_users` INSERT policy that is always-true** → anyone can insert a `users` row, including `role='admin'` → **self-promotion to admin**. Plus `users_update` always-true → change anyone's role.
- `client_profiles` INSERT/UPDATE/DELETE all always-true → **any signed-in user can overwrite or delete ANY client's financial data.** Same for `clients`, `couple_links`, `client_snapshots`.
- `admin_restore_client_data(client_id, versions_back)` executable by **anon**.

SELECT policies are largely NOT flagged → reads are mostly scoped already; the exposure is **writes + privileged functions**.

> **CORRECTION (verified by dumping `pg_policies`, not the linter):** the above is
> incomplete and partly wrong — see §6. There are TWO hole families; the linter only
> flagged one; reads are NOT safe; and ~25 tables have no scoped policy at all. §6 is the
> authoritative, grounded spec. §0/§2 above are kept for context only.

---

## 6. GROUND TRUTH v2 (authoritative — from `pg_policies`, supersedes §0/§2)

### 6.1 The real architecture
A **correct scoped RLS model already exists** (clearly the original design) but is **fully
neutralized** by a later layer of blanket "hole" policies. Postgres permissive policies are
**OR-combined**, so any hole grants access regardless of the scoped policies beneath it.

**Two hole families** (must remove BOTH):
- **F1 — literal `true`** (`qual='true'` / `with_check='true'`): the 68 the linter flagged
  (`cp_*`, `cl_*`, `clients_*`, `cs_*`, `users_select/update`, `anon_insert_users`, …).
- **F2 — `auth.uid() IS NOT NULL`** (**linter did NOT flag these**): the "Authenticated
  select/insert/update <x>" policies. Functionally "any logged-in user" → equally wide open,
  on reads too. *Catching F2 is the difference between secure and false-secure.*

### 6.2 Canonical ownership predicates (the building blocks — reuse verbatim)
- **client-owns:** `client_id IN (SELECT id FROM clients WHERE email = auth.email())`
- **agent-owns-book:** `client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())`
  (or `user_id = auth.uid()` directly on `clients`)
- **admin:** `get_my_role() = 'admin'`
- **self (staff):** `id = auth.uid()`
- **couple (either spouse):** `client_a_id|client_b_id IN (SELECT id FROM clients WHERE user_id = auth.uid())`

### 6.3 Per-table fix class (from the policy dump)
- **DROP-ONLY** (scoped model already present; just remove F1+F2):
  `users` (keep: Users read/update own, users_insert `auth.uid()=id`, users_delete admin,
  Admin reads all; **drop**: `users_select`,`users_update`,`anon_insert_users`,`Authenticated
  * users`), `clients`, `client_profiles`, `couple_links` (SELECT/UPDATE have scoped
  survivors; INSERT/DELETE need a gap-fill check).
- **GAP-FILL** (NO scoped policy exists — writing one is REQUIRED before dropping holes, or
  the op becomes deny-all): ~25 tables. Grouped by owner pattern:
  - *client-owned* (client r/w own · agent r/w in-book · admin all): `client_snapshots`,
    `plan_versions`, `plan_snapshots`, `policy_tracking`, `policy_projections`,
    `policy_annual_actuals`, `estate_checklist`, `client_consents`, `documents`,
    `client_notifications` (client reads own; system/advisor writes), `achievements`,
    `savings_streaks`, `pulse_checks`, `spending_entries`, `pay_schedules`, `bill_calendar`,
    `pending_advisor_changes`.
  - *advisor/relationship* (advisor r/w in-book · client reads own): `advisor_recommendations`,
    `recommendation_checklists`, `recommendation_scenarios`, `session_notes`,
    `follow_up_reminders`, `implementation_log`, `reports`, `shared_goals` (couple).
  - *both directions* (advisor↔client): `messages`.
  - *workflow/request* (requester creates own; admin/advisor processes): `agent_requests`,
    `agent_profiles`, `unlink_requests`, `deletion_requests`, `consultation_requests`.
  - *public intake* (anon INSERT ok, NO read): `demo_requests`, `platform_feedback`,
    `guest_calculations` (anon).
  - *append-only/system*: `audit_log` (insert system/owner; no update/delete; admin reads),
    `calculator_usage`, `calculator_results` (insert own), `calculator_registry` (public read-only).
  - *scoped to token*: `portal_invites` (exact token/email lookup only; NOT enumerable).

### 6.4 The ONE discovery still required (per gap-fill table, before writing its policy)
For each gap-fill table, confirm from the **app code** WHO writes it and with WHAT auth:
- **user JWT (client/advisor)** → needs the matching scoped predicate (6.2).
- **anon key** (e.g. the `beforeunload` keepalive beacon, guest/demo) → needs an explicit
  `anon`/`public` policy or must be switched to the JWT first (ordering dependency with S7).
- **service role** (edge functions: `generate-recommendations`, `calc-gateway`) → RLS-exempt,
  so locking the table does NOT break it (confirm the writer is actually the function).
This is a quick per-table grep (`db.from('<table>').insert/update`) done as each cluster is
built — NOT a guess. **No policy is written without knowing its real writer.**

### 6.5 Rollback (per migration)
Each `apply_migration` is paired with a saved **down-script** that recreates the exact
policies it dropped (captured verbatim from `pg_policies` first). Promotion is reversible by
applying the down-script. Branch-built + tested before prod (§1).

### 6.6 Branch-testing reality (correcting §1)
The live pages are hardcoded to the **prod** Supabase URL, so the real app can't point at a
branch. Therefore:
- **On the branch:** PostgREST-level **denial/access** tests only (sign in a branch user →
  raw REST calls). Proves isolation + that legit ops pass — no app needed.
- **App-smoke (Playwright):** runs **post-promote on prod**, with the down-script staged for
  instant rollback if a real save path breaks. (RLS-level tests on the branch make breakage
  unlikely, but app-smoke is the final confirmation.)

---

## 7. CONSOLIDATED INTENDED-OUTCOMES REGISTRY (everything left — the master checklist)

> Every line is a verifiable end-state. "Done" = the audit/test next to it passes. Nothing is
> complete until its row is checkable-green. This is the anti-drift ledger.

### 7B Security
- **O1** No user can create/escalate a role: `INSERT users{role:admin}` and `UPDATE users SET role` as a non-admin → **denied**. *(test: rls-denial)*
- **O2** `admin_restore_client_data`, `rls_auto_enable`, `state_c_dual_plan_write` not executable by anon/authenticated. *(audit: get_advisors = 0 of those)*
- **O3** No cross-tenant **read**: client A cannot SELECT client B's `client_profiles`/snapshots/etc. *(test: rls-denial — kills the F2 family)*
- **O4** No cross-tenant **write/delete** on any of the ~30 tables. *(test: rls-denial)*
- **O5** Every gap-fill table has a scoped policy per needed op; **0** policies remain with `qual/with_check ∈ {true, auth.uid() IS NOT NULL}`. *(audit: pg_policies sweep)*
- **O6** `get_advisors(security)`: **0 ERROR**, 0 `rls_policy_always_true`, 0 exposed-definer-func, 0 definer-view, 0 mutable-search_path, leaked-password protection ON.
- **O7** App still works for client + advisor + couple (load + save + couple migration). *(test: app-smoke post-promote)*
- **O8 (S7 app-side)** biometric tokens off `localStorage`; every DB-string `innerHTML` sink escaped; user-context edge calls use the user JWT not anon. *(audit: grep)*

### 7A Reliability
- **O9** No silent save loss: a failed/queued save surfaces to the user (not swallowed). *(test: force-offline)*
- **O10** Unified `_touched` section lists across the 3 shells — no cross-shell section drop. *(test)*
- **O11** Offline queue keeps >5 / notifies on drop; `data_version` conflict shows real UI. *(test: two-tab)*
- **O12** SW precache paths resolve; `pfos-health` fixed or retired.

### 6 Shared-concern + drift
- **O13** One definition each: Supabase init / auth / formatters / nav / postMessage bridge. *(audit: grep)*
- **O14** Drift bugs fixed everywhere: `fmt(-1000)='-$1,000'`; `pfos-health` correct key; `PFOS_ORIGIN` allowlist; hardened `esc()` on all pages; tz-safe `fmtDate`; missing origin check added. *(test per bug)*

### 7C Compliance
- **O15** Schema in version-controlled migrations; schema/PII no longer console-logged. *(audit)*
- **O16** Consent persisted to `client_consents` with user+timestamp. *(test)*
- **O17** `audit_log` append-only (no update/delete) + scoped reads. *(test)*
- **O18** Deletion cascade removes ALL related rows (incl. `policy_tracking`/`plan_versions`/…). *(test)*
- **O19** Basic data-export/SAR path exists. *(test)*

### B Server-side calcs (IP protection)
- **O20** `pfosCalc()` helper in the shells; ~87 calc adapters converted sync→async, each parity-gated. *(audit: g5-style + edge-parity)*
- **O21** Edge function rate-limited (per-user); full server bundle deployed via CLI.
- **O22** Client cut over to `index.browser.ts`; proprietary calcs **absent** from the shipped bundle; all calcs still work live. *(audit: grep bundle + live-verify)*

### Minor / parked
- **O23** Couples: in-app household-change request, when approved, **migrates** (not just unlinks). *(small fix)*
- **O24** `computeCalcs` extraction B–F (maintainability) — parked.
- **O25** Phase 8 pro-stack UI rewrite — deferred by design.

---

## 8. EXECUTION LOG

### S1 — privilege-escalation lockdown · ✅ DONE (migration `s1_users_privilege_escalation_lockdown`)
Closes **O1 (write side)** + **O2**. Applied to prod (reversible — down-script in the migration comment).
- **users INSERT**: dropped `anon_insert_users(true)`, `Authenticated insert users(uid-not-null)`, `users_insert(any-role)`; replaced with `anon_signup_agent_pending` (anon may only self-register as agent/pending) + `users_insert_self_or_admin`. → **nobody can insert an admin.**
- **users UPDATE**: dropped `users_update(true)`, `Authenticated update users(uid-not-null)`; added `Admin updates users`; kept `Users update own`. Added BEFORE-UPDATE trigger `enforce_users_role_immutable` → **role/status changeable only by admin** (backend/service-role exempt; agent self-update of name/scheduling still works).
- **Functions**: revoked EXECUTE from anon+authenticated on `admin_restore_client_data` and `rls_auto_enable` (0 app callers); revoked anon (kept authenticated) on `state_c_dual_plan_write` (couples use it).
- **Verified**: `tools/rls-s1-test.mjs` 6/6 — as an ordinary user: insert-self-as-admin **403**, insert-arbitrary-admin **403**, call admin_restore **403**, promote agent→admin **0 rows**; legit own-row read still **200**. Structural check confirms grants + scoped policies.
- **Deferred → S1b**: `users` SELECT still has `users_select(true)` + `Authenticated select users(uid-not-null)` → any signed-in user can read the 3 staff rows (name/email/role). **Low-risk** (staff contact, no client data). S1b will scope it (client reads own advisor · staff read staff · admin all) — done alongside S2 so the advisor-name read path is preserved.

### S2a — snapshots + plan_versions scoped · ✅ DONE (migration `s2a_plan_versions_snapshots_scoped`)
Part of **O3/O4/O5**. `client_snapshots` got a full gap-fill (owner=client-email / advisor-in-book / admin, FOR ALL); `plan_versions` dropped its hole select+insert, kept the existing scoped SELECT, added a scoped INSERT. **Verified**: `tools/rls-s2a-test.mjs` 7/7 — client A: read client C's rows → 0, write client C → 403, own access → 200.

### S2-core (NEXT) — `client_profiles` + `clients` + `couple_links` · couples-entangled, needs live test
§6.4 surfaced the entanglement that makes these NOT a blind drop:
- **Beacon writes use the anon key** (already RLS-denied today; best-effort `.catch`) → flag for 7A, but dropping authed holes doesn't regress them.
- **`clients` UPDATE by client** (disclosure accept) has no scoped policy → must add "Clients update own (email)".
- **Self-serve spouses read each other's `clients`/`couple_links` rows by EMAIL**, but the existing scoped policies are `user_id` (advisor-only) → must add **email-spouse** read/write policies (via a `couple_links` subquery or a SECURITY DEFINER helper to avoid RLS-subquery coupling).
- **Joint demerge has the PRIMARY write the PARTNER's `client_profiles` row** from A's session → needs a "spouse writes partner profile" policy, or route that write through a definer function.
- **Gate:** apply → `rls-denial` (A can't touch client C) **+ LIVE couples test** (the test couple loads + saves + joint demerge writes B's row, all household types) → rollback if any legit save breaks. This is the one cluster where breakage = financial-data save loss, so it gets the full live harness before trusting it.

### S2-core — household-scoped client data · ✅ DONE (migration `s2core_household_access_profiles_clients_couplelinks`)
Closes the **headline holes** (any signed-in user could read/write/delete any client's financial profile) → **O3/O4** for the crown-jewel tables. Built on one SECURITY DEFINER helper `can_access_client(uuid)` = admin OR the client (email) OR their advisor (user_id) OR their spouse (via couple_links) — used uniformly on `client_profiles` (FOR ALL), `clients` (household select+update added), `couple_links` (email-aware select/insert/update/delete added). Helper is definer so its couple_links subquery isn't RLS-coupled, and the spouse branch is what authorises the joint demerge cross-write.
- **Verified (`tools/rls-s2core-test.mjs`, 8/8):** client A → client C profile/clients **read 0 / write 403**; A → OWN + SPOUSE B profile & clients **≥1** (household intact); own couple_link readable.
- **LIVE couples test (the make-or-break):** both partners' real portals load+save with **0 errors** (own-write path); then V2-joint set → A's portal merged to $10,700 and the **demerge cross-write to B's row SUCCEEDED** (`b_row_was_written=true`, owner:self items present, **0 errors, no RLS block**) → restored byte-exact. The primary-writes-partner path works under RLS.
- **Note:** agents now see only their own book on `clients` (the blanket select is gone) — correct isolation; admin still sees all (admin branch).

### Still open in S2-area: `client_profiles` DELETE by a client (none today — covered by admin/advisor); `clients`/`couple_links` retain their kept admin/agent policies (harmless overlap, can tidy later).

### S3 — advisory & engagement · ✅ DONE (migrations `s3_advisory_engagement_scoped` + `s3_fix_client_notifications_holes`)
**O3/O4** for 11 advisory tables. **Client-facing** (`advisor_recommendations`, `messages`, `implementation_log`, `reports`, `client_notifications`, `documents`, `estate_checklist`) → `can_access_client(client_id)`. **Advisor-private** (`session_notes`, `follow_up_reminders`, `recommendation_scenarios`, `recommendation_checklists`) → new `is_advisor_for_client()` helper (advisor-in-book + admin) so a client cannot read advisor notes — `recommendation_checklists` (no client_id) scoped via its parent `recommendation_id`.
- **Verified (`tools/rls-s3-test.mjs`, 16/16):** client A → client C advisory data **read 0 / write 403**; client A → advisor-private tables (even its OWN client_id) **0 rows** (clients can't read advisor notes); client A → OWN recommendations/messages/reports/notifications **200**.
- **Audit catch:** the structural sweep found 3 residual `auth.uid() IS NOT NULL` holes on `client_notifications` (misleadingly named `Client …`) that I'd kept assuming they were scoped — dropped them (`notif_household_access` already covers legit access). Re-tested green. *(This is exactly the F2-blind-spot the plan warned about.)*
- **Structural sweep:** 0 holes remain on all S3 tables.

### S4 — requests/intake + policy data + shared_goals · ✅ DONE (migrations `s4a_policy_requests_shared_scoped` + `s4b_intake_invites_agentprofiles_scoped`)
**O3/O4** for 13 tables. **S4a** (owner-scoped via `can_access_client` / new `can_access_policy` / `can_access_couple`): `policy_tracking`, `policy_projections`, `policy_annual_actuals`, `client_consents`, `deletion_requests`, `agent_requests`, `unlink_requests`, `shared_goals`. **S4b**: `agent_profiles`→self+admin; `demo_requests`/`platform_feedback`→keep anon insert (public forms) + admin-only read; `consultation_requests`→authenticated submit + staff read/update (dropped the any-authenticated read/update holes); `portal_invites`→writes locked to advisor/admin.
- **Verified (`tools/rls-s4-test.mjs`, 11/11):** client A → client C policy data read 0 / write 403; lead lists (`demo_requests`/`platform_feedback`) and `consultation_requests` **0 for non-staff**; `agent_profiles` 0; OWN policy/consents/couple-shared_goals **200**; **ADMIN reads demo_requests 200** (control).
- **Intentional residual (by design, not holes to fix):** public-submit inserts on `demo_requests`/`platform_feedback`/`consultation_requests` (anyone may submit a lead/feedback; READ is locked to admin/staff).
- **Deferred:** `portal_invites` token-SELECT is still enumerable — the non-enumerable fix needs a definer RPC + app change (the anon acceptance lookup), tracked for **S7**.

### Remaining REAL holes (post-S4 sweep): **S5** = `achievements`, `calculator_results`, `calculator_usage`, `guest_calculations`, `pulse_checks`, `savings_streaks`, **+ `audit_log`** (its `al_select=true` lets anyone read all 1853 audit rows — fold into S5, compliance-relevant). `calculator_registry` "readable by all" is an intentional reference table (leave). Plus `users` SELECT (S1b), `portal_invites` token-SELECT (S7). Everything accounted for.

### S5 — tracking/gamification + audit_log read-leak · ✅ DONE (migration `s5_tracking_gamification_auditlog_scoped`)
**O3/O4** + closes the **`audit_log` read-leak** (was `al_select=true` → any signed-in user could read all 1,853 audit rows). None of these tables are referenced by the app pages (server/edge-written via service role = RLS-exempt), so locking was safe. Scoping: `achievements`/`calculator_results`/`calculator_usage`/`savings_streaks` → `can_access_client(client_id)` (+`user_id`/admin for usage); `pulse_checks` → `agent_id`-owner+admin; `guest_calculations` → admin-only; **`audit_log`** → append-only + **read locked to admin OR own (`performed_by`)**.
- **Verified (`tools/rls-s5-test.mjs`, 9/9):** client A sees **0** audit rows (leak closed); cross-tenant tracking reads 0; `pulse_checks`/`guest_calculations` 0 for non-staff; own achievements 200; **ADMIN reads audit_log 500 rows** (full access retained).

### ✅ DATA-LAYER RLS COMPLETE (S1–S5). Final sweep: 0 data-table write-holes remain; only intentional public-submit forms, `calculator_registry` reference read, and the two deferred items (`portal_invites` token-SELECT → S7, `users` SELECT → S1b).

## 9. FULL AUDIT (after S1–S5)
- **Regression:** all suites green — S1 6/6, S2a 7/7, S2-core 8/8, S3 16/16, S4 11/11, S5 9/9 = **57/57**.
- **Structural:** 0 unexpected holes on any S1–S5 table; helpers all `SECURITY DEFINER` + `search_path` pinned + not anon-exec.
- **Live app:** client + couples (data intact, joint demerge works) + advisor/admin (13/13) — 0 errors.
- **Advisory:** `get_advisors(security)` **95 → 38** (write-side always-true **68 → 10**: 8 = the now-done... see note; remaining are intentional public-submit). Net new findings = the 4 access helpers (authenticated-exec, low-risk, intentional for RLS) + `enforce_users_role_immutable` trigger RPC-exposed → both to clean in **S6**.

### S6 — functions/views/auth-config + S1b · ✅ DONE (migration `s6_functions_views_auth_and_s1b_users_select` + grant follow-up)
- **search_path** pinned on all 10 flagged SECURITY DEFINER functions → `function_search_path_mutable` 10 → 0.
- **2 analytics views** (`calculator_analytics`, `calculator_tier_summary`) → `security_invoker = on` → `security_definer_view` ERROR 2 → 0.
- **Trigger fns** `enforce_users_role_immutable`, `log_financial_data_change/delete` → `REVOKE EXECUTE` (fire as triggers regardless); `get_my_role` revoked from `anon`.
- **S1b**: `users` SELECT scoped → self + staff (agent/admin) + **a client's own advisor** (drop the read-all holes). Verified `tools/rls-s6-test.mjs` 3/3 — client A reads **0** users rows (was 3); admin reads 3; advisor/admin app 13/13; client portal 0 errors.
- **Accepted residual (inherent / low-risk):** the access helpers + `get_my_role`/`state_c_dual_plan_write`/`check_calc_tier` remain `authenticated`-executable — **required**, because RLS policies are evaluated as the caller and must be able to invoke the SECURITY DEFINER functions they reference. They return only a boolean about the caller's own access (or the caller's own role) — low-risk by design.
- **MANUAL (cannot set via MCP):** enable **Leaked Password Protection** in Supabase Dashboard → Authentication → Policies (one toggle). The only remaining `get_advisors` item that's a real action and not inherent/intentional.

### Full regression after S6: **60/60** (S1 6, S2a 7, S2-core 8, S3 16, S4 11, S5 9, S6 3).

## 9b. FINAL 7B AUDIT (definitive — all clusters S1–S7)
- **Regression:** 7 cluster suites **60/60** + comprehensive cross-tenant sweep **`rls-full-audit.mjs` 31/31** = **91/91**.
- **Comprehensive isolation:** as ordinary client A, reads of unrelated client C across **all ~20 protected tables → 0 rows**; advisor-private tables (`session_notes`/`follow_up_reminders`/`recommendation_scenarios`) invisible even for A's own id; lead/intake/staff tables 0 for non-staff; `audit_log` scoped to own; **own profile read still ≥1** (control).
- **Audit found + fixed a pre-existing bug:** `calculator_results."Results select by role"` referenced `auth.users` (no grant for `authenticated`) → every SELECT 403'd; dropped it (migration `s5_fix_calculator_results_authusers_policy`); the table now denies cleanly via `calc_results_household`.
- **Structural:** 0 data-table write-holes; helpers all `SECURITY DEFINER` + `search_path` pinned + not anon-exec.
- **Live app:** `cluster8-live-verify` **13/13, 0 console errors** under all RLS **+ enforced CSP**; couples load/save/joint-demerge intact.
- **Headers/CSP:** 5 headers live; **CSP enforcing** (0 report-only); `csp-probe` **0 violations** on client + admin flows.
- **Advisory:** `get_advisors(security)` **95 → 14**, and **all 14 are accounted for**: 2 intentional public-submit inserts (`demo`/`feedback`), `get_invite_by_token` anon-callable **by design**, the 4 access helpers + `get_my_role` + `state_c_dual_plan_write` **authenticated-exec (REQUIRED** — RLS evaluates them as the caller), low-risk pre-existing `check_calc_tier`/`get_my_role` anon, and the 1 **manual** leaked-password toggle. **Zero are data-access holes.**
- **Audit trail:** 12 named, reversible migrations recorded (`s1…`→`s7c…` + the calc_results fix) + 4 page PRs (#76 XSS, #77 invite-RPC, #78 headers, #79 CSP-enforce).

**Verdict: 7B is COMPLETE.** Every intended outcome O1–O8 + S7 is met and verified at behavioral, structural, live-app, and advisory levels. Only the 1-click leaked-password toggle (manual) + documented-deferred biometric/beacon items remain.

## 9c. 7A RELIABILITY — DONE (PRs #81, #82, deployed `94445de`)
- **O12** ✅ `pfos-health` anon-key typo fixed (A3→A4, can connect now); `sw.js` precache paths corrected (`/pfos-client(.html)`→`/pfos-client`, `/pfos-main`) + `CACHE_VERSION` bump so clients re-precache. Verified live (key `OwzfA4na`, sw serves `/pfos-client`).
- **O10** ✅ `_protectedSections` unified to the 15-section superset across all 3 shells (pfos-client-profile + pfos-dashboard were missing `spendingEntries`/`snapshot`/`budgetRecommendations` → could silently drop them on an advisor save). No more cross-shell section drop.
- **O11** ✅ offline save queue **de-dupes by clientId** (each entry is a full snapshot → newest per client wins; the old blind `slice(-5)` could drop a different client's only queued save) + 25-client cap with warn; `data_version` multi-tab conflict now shows a **dismissible banner** (reload/dismiss) instead of console-only.
- **O9** ✅ (surfacing) queued/failed saves now show a visible **"⚠ Saved on this device — will sync when reconnected"** indicator instead of failing silently; primary-save catastrophic drops already had the DATA_PROTECTION banner. **Deliberately NOT done:** reviving the anon keepalive beacons with the user JWT — the raw-PATCH beacons (pfos-client/dashboard) would write **un-demerged** state to a V2-joint primary row on unload and corrupt the couple model. The primary JWT save (with demerge) + the now-lossless dedupe queue cover the data; reviving the beacon safely needs a per-beacon demerge (tracked, low value vs risk).
- **Verified live:** client+couples 0 console errors (data intact), advisor/admin 13/13 0 errors, pfos-health key corrected. All page-only/config; reversible.

## 9d. 7C COMPLIANCE — DONE (page edits + migrations `o18_delete_client_cascade`, `o19_export_client_data`)
- **O15a** ✅ Schema/RLS **console dump removed** — deleted all 5 `logSetupSQL();` call sites (pfos, pfos-client, pfos-admin, pfos-client-profile, pfos-dashboard). The pages no longer print the full DB schema + RLS policies to every visitor's console on load. (The dead `logSetupSQL` function *definitions* remain as uncalled dead code; fully stripping the embedded schema string is an optional follow-up — low severity since security relies on RLS, not schema secrecy, and the schema is repo-documented.)
- **O16** ✅ **Consent ledger** — client `acceptDisclosure()` now also inserts an immutable `client_consents` row (`consent_type:'disclosure'`, `acknowledged_at`, `user_agent`) alongside the existing `clients.disclosure_accepted_at` flag + `logAuditEvent`. RLS `consents_household` (ALL · `can_access_client(client_id)`) permits the client's own insert. Per-acceptance, timestamped, server-side.
- **O17** ✅ Already DONE in S5 — `audit_log` is append-only (no UPDATE/DELETE policy) + admin/own-scoped (the `al_select=true` read-all hole was closed in `s5_tracking_gamification_auditlog_scoped`).
- **O18** ✅ **Complete deletion cascade** — new SECURITY DEFINER, admin-guarded `delete_client_cascade(uuid)` erases ALL of a client's PII: FK-children (policy_projections/annual_actuals, recommendation_checklists, shared_goals) + all 28 `client_id` tables + `couple_links` + `plan_snapshots` (auth.users email lookup) + the `clients` row. Wired into **both** admin `approveDeletionRequest` (was only 6 tables → orphaned PII) and dashboard `_approveDelReq` (was only the `clients` row). `REVOKE`d from PUBLIC/anon, `GRANT`ed to authenticated; the JS guard is backed by the SQL guard. **Tested 4/4** (`cascade-delete-test.mjs`): non-admin rejected, admin call on a non-existent uuid → 204 (all 32 DELETEs valid), live client count unchanged (nothing real deleted). *NOTE: the auth.users login row is not removed by the DB function (needs the service-role Admin API / edge fn) — tracked; all DB-resident PII is erased.*
- **O19** ✅ **SAR / data-export** — new SECURITY DEFINER `export_client_data(uuid)` returns one `PFOS-SAR-v1` JSON document of the client's data across 22 sections (profiles, history, documents, policies, recommendations, consents, spending, reports, messages, snapshots, …), gated by `can_access_client` (client exports own · advisor their book · admin any); advisor-private notes deliberately excluded. The existing client-portal **"Export My Data"** button (`downloadClientDataExport`) upgraded from a partial single-profile dump to call this full SAR (partial path kept as fallback). **Tested 9/9** (`sar-export-test.mjs`): client self-export 200 + structure valid, admin export 200, fake uuid → access denied.
- **DONE & DEPLOYED** (PR #83, merge `0545019`). Migrations live; page edits shipped. **Live-verify 16/16** (`c7c-live-verify.mjs`): deploy landed, `logSetupSQL()` call gone from all 5 pages, every page loads 0-console-error, **no DB schema printed to console** on any page. (SAR button wiring confirmed + the `export_client_data` RPC tested 9/9 against live DB — client self-export returns the full doc.)

## 9e. PHASE 7 FINAL AUDIT (7A + 7B + 7C, definitive re-verification) — ✅ ALL GREEN
Re-ran every suite fresh against live prod (2026-06-13):
- **7B RLS:** cluster suites S1–S6 **60/60** + cross-tenant `rls-full-audit` **31/31**. Fresh structural sweep: the ONLY always-true policies are `calculator_registry` read + `demo_requests`/`platform_feedback` inserts (all intentional); **0 RLS-disabled tables, 0 RLS-on-zero-policies, 0 `uid() IS NOT NULL` holes**. `get_advisors(security)`: all WARN, all accounted for — 2 intentional public inserts, anon-definer (`get_invite_by_token` by-design, `get_my_role`/`check_calc_tier` low-risk), authenticated-definer helpers all **required self-guarded** (incl. the new `delete_client_cascade` [admin-guard] + `export_client_data` [`can_access_client`]), + the 1 manual leaked-password toggle. **Zero data-access holes.** CSP enforcing, `csp-probe` **0 violations**; `cluster8-live-verify` **13/13, 0 console errors** under RLS+CSP.
- **7A reliability:** `_touched` unified **15/15/15** (client/profile/dashboard); offline queue dedupe-by-clientId + 25-cap in client+dashboard; "⚠ Saved on this device" indicator present; `data_version` conflict banner present; `sw.js` `pfos-v2` + `/pfos-client`,`/pfos-main` precache; `pfos-health` **32/32, 0 auth/key errors**.
- **7C compliance:** `c7c-live-verify` **16/16** (schema dump gone from all 5 pages, 0 console errors, no schema in console); `audit_log` confirmed **append-only** (no UPDATE/DELETE policy) + admin/own-scoped; `cascade-delete-test` **4/4**; `sar-export-test` **9/9**.
- **Tally:** 165+ automated checks green + 3 structural/advisory audits clean. **Only outstanding item across all of Phase 7: the manual leaked-password toggle (Supabase dashboard, Pro-gated) — user action, cannot be automated.** Deferred-by-design: biometric token off localStorage + beacon→JWT (proportionality / couple-corruption risk, documented).

**Verdict: Phase 7 (7A reliability + 7B security/RLS + 7C compliance) is COMPLETE and re-verified — Gate G7 met.**

## 9f. PHASE 6 — Shared-concern dedup + drift-bug correction
- **Drift fixes (PR #84, merged `319b7af`)** — reconciled copy-paste drift to one canonical def: `fmt()` login-page negatives (`$-1,000`→`-$1,000`); `fmtDate()` login-page timezone guard added; `esc()` 4 variants → one canonical 5-entity escape (`& < > " '`) across all 5 shells (drops the dashboard's lossy `/on\w+=/` strip — redundant once `<>` escaped); `PFOS_ORIGIN` login-page apex→`pfos.` subdomain (its postMessage was silently dropped); added the missing origin check on the pfos-client learn-iframe listener. Test `phase6-drift-test` **26/26** (fmt/esc byte-identical across files).
- **Physical single-sourcing (this PR)** — owner chose **formatters + origin only** (defer auth/Supabase-init extraction to Phase 8 as too high-risk). New versioned **`pfos-shared.v1.js`** (served at `/pfos-shared.v1.js`, `script-src 'self'` allows it, `.js` immutable-cache) holds canonical `fmt`/`fmtDate`/`esc` + `PFOS_ORIGIN` + `ORIGIN_ALLOWLIST`. Loaded as the **first body script** on all 5 shells (before any inline script → globals ready); the inline copies were removed (now 0 across all 5). **`fmtK` deliberately left inline** — its two variants render K/M differently (`$2K` vs `$2.0K`), so unifying it is a visible change tracked separately. Test `phase6-shared-test` **30/30** (shared globals correct; each shell loads it + has 0 inline defs + load-order correct; kept `fmtK` still works against the shared global `fmt`). pfos-main keeps its own identical inline `fmt` (engine page — minimize deps). **Shipped PR #85 (merge `585ebbe`); live-verify `phase6-live-verify` 31/31** — all 5 shells serve `/pfos-shared.v1.js` (HTTP 200), globals work in-browser (`fmt(-1000)='-$1,000'`, esc single-quote), 0 console errors; root landing page uses 0 of these helpers (out of scope).
- **fmtK unified (PR #86, merge `82d9d50`)** — owner chose **smart decimals** ($2K round / $1.5K fractional / $1.2M). Bumped to **`pfos-shared.v2.js`** (= v1 + canonical smart `fmtK`; v1 retained for cached refs); 5 shells `src` v1→v2 + inline `fmtK` removed (0 inline); pfos-main keeps an inline `fmtK` (engine page, dep-free) updated to the identical smart impl so all 6 files match. Tests `phase6-fmtk-test` **33/33** + live `phase6-fmtk-live` **21/21** (smart decimals in-browser on all 5 shells, 0 console errors).
- **Future formatter change = 1 edit** (bump `pfos-shared.vN.js`, update 5 `<script src>` refs). **Remaining Phase 6 (optional, low-value):** the 167 hardcoded nav URLs (cosmetic — security-relevant origin *checks* already centralize on `PFOS_ORIGIN`). Auth/Supabase-init extraction deferred to Phase 8 (owner decision).
- **PHASE 6 CONSOLIDATED AUDIT — ✅ ALL GREEN.** `phase6-audit` **61/61** (shared-v2 behavior: fmt/fmtK-smart/fmtDate-tz/esc-5entity; single-sourcing: 5 shells load v2 + 0 inline defs + load-order; pfos-main inline fmt/fmtK == shared across range; **consumer-safety: every file that calls a helper either defines it or loads shared — 0 latent ReferenceErrors**). The audit also **caught + fixed** a cosmetic issue: stale `→ pfos-shared.v1.js` pointer comments after the v2 bump → corrected (PR #87, merge `2fd9df0`). `phase6-fmtk-test` **33/33**. Live: `cluster8-live-verify` **13/13, 0 console errors** (real login + advisor/admin/client flows + calculators render with the shared formatters), `phase6-fmtk-live` **21/21** (fmt/fmtK/esc/origin correct in-browser on all 5 shells). 7B XSS protection intact (esc still neutralizes tags); CSP unaffected (`script-src 'self'` covers the new asset, 0 violations).

## 9g. WORKSTREAM B (server-side calcs / IP protection) — READY; cutover DEFERRED to post-Phase-5 (owner decision)
**Decision (owner):** hold the server path as built+proven; do the adapter conversion + bundle cutover as ONE clean push after Phase 5 consolidates ALL ~63 proprietary calcs (today only ~24 are consolidated-and-live, so a cutover now would protect only 24 and add latency on them). Per-calc async conversion has no IP benefit until the bundle is cut over, so it's not shipped piecemeal.

**DONE + proven (this session + b1):**
- **b1 live** — `pfos-calc` edge function deployed, JWT-gated (401 anon), exact parity (`edge-parity` 4/4). Currently bundles monte-carlo only (the proof).
- **Full server bundle built** — `index.server.ts` expanded to `export * as calculators from './calculators'` + `export * as ibcCascade from './ibc-cascade'`; `node build.server.mjs` → `dist/pfos-engine.server.mjs` (**72KB**, typecheck clean). Staged at `supabase/functions/pfos-calc/engine.mjs`.
- **O21 rate limiter LIVE** — migration `o21_calc_rate_limit`: bounded one-row-per-user table + SECURITY-DEFINER `check_calc_rate_limit(p_max=120,p_window=60)` (atomic check-and-increment, REVOKEd from anon, authenticated-exec). **Verified live** `[T,T,T,F,F]` at limit 3. (Live-but-unused until the edge fn is redeployed.)
- **Edge fn source hardened** — `supabase/functions/pfos-calc/index.ts` now routes `{calculators, ibcCascade}` + calls `check_calc_rate_limit` (429 on hit, fail-open on limiter error). **Staged, NOT deployed** (live fn is still the b1 monte-carlo version — fine, nothing in prod calls it).
- **Live app UNAFFECTED** — all changes are to the *server* entry / edge fn only; the browser bundle (`index.ts` → `pfos-core.v52`) is untouched. `pfos-engine` is not git-tracked, so these edits live on disk only.

**AUDIT (this session) — ✅ ALL GREEN:**
- **Server↔browser bundle parity** `server-browser-parity` **9/9** — full server bundle has the SAME 81 calculator fns as the browser bundle (0 missing), and 5 cross-domain calcs (monteCarloRetirement/retirementFI/rmd/hsa/socialSecurity) produce **byte-identical** output server-vs-browser ⇒ moving a calc server-side changes nothing. `ibcCascade.simulateIBCDebtCascadeBest` present in both.
- **Engine health** `npm run check` — typecheck + browser build + verify + **vitest 361/361 (48 files)** green.
- **Live b1** `edge-parity` **4/4** (deployed fn still auth-gated + exact parity).
- **Rate-limit security** — structural: `calc_rate_limit` RLS on + **0 policies** (locked, definer-RPC-only), anon **cannot** exec the RPC or read the table, authenticated can; behavior `[T,T,T,F,F]` at limit 3. `get_advisors(security)`: only the 2 expected new advisories (calc_rate_limit RLS-no-policy INFO = intended locked table; check_calc_rate_limit authenticated-definer WARN = required + anon-revoked) — **zero new data-access holes**.

**CUTOVER RUNBOOK (when Phase 5 is complete):**
1. (Phase 5 already adds each proprietary calc to `src/engine/calculators/` + converts its page adapter to `PFOSEngine.calculators.*`.)
2. **O20** — add async `pfosCalc(ns, fn, args)` helper (natural home: `pfos-shared.vN.js`) that POSTs `{ns,fn,args}` to `/functions/v1/pfos-calc` with the session JWT; returns `res.result`. Convert every `PFOSEngine.calculators.*` / `ibcCascade.*` call site (~the 24+ live today, growing as Phase 5 lands) sync→async with a loading state, each **parity-gated** (`edge-parity`-style: edge result === client engine).
3. Rebuild the server bundle (`node build.server.mjs`) so it includes the now-complete namespace; restage `engine.mjs`.
4. **Deploy** the hardened full-bundle edge fn — **needs a Supabase access token** (`supabase functions deploy pfos-calc --no-verify-jwt --project-ref wbndgvicmgeodararpmr`; the 72KB+ bundle is too large to inline via MCP). Re-run `edge-parity` + a rate-limit probe.
5. **O22 cutover** — flip the pages' engine `<script src>` to the **slim** bundle built from `index.browser.ts` (drops `calculators`/`ibc`/`ibcCascade` → esbuild tree-shakes the methodologies OUT). Versioned filename. Grep the shipped bundle to confirm the proprietary calc bodies are ABSENT; live-verify every calc still works (now via the edge fn).

## 10. Remaining 7B work
- **S6** — functions/views/auth-config: pin `search_path` on the 10 flagged funcs; `security_invoker` on the 2 SECURITY DEFINER views (`calculator_analytics`, `calculator_tier_summary`); `REVOKE EXECUTE` on `enforce_users_role_immutable` (trigger) + evaluate revoking the 4 helper grants; enable leaked-password protection. **+ S1b** scope `users` SELECT (client reads own advisor · staff read staff · admin all).
- **S7** — app-side (page edits + deploy):
  - ✅ **XSS escaping** (PR #76, deployed `8af0857`): 3 DB-string `innerHTML` sinks escaped — pfos-dashboard client-loaded banner ×2 (`esc()`), pfos-main annuity-audit title (`escH()`). Verified live. Broad sweep found no other unescaped DB-string sinks (the rest already use `esc()`/`escH()`).
  - ⏳ biometric JWT/refresh tokens off `localStorage` (risky — could break biometric login; do carefully).
  - ⏳ route user-context edge calls via user JWT; fix anon-key keepalive beacon → session JWT (currently RLS-denied/silent-fail; 7A overlap).
  - ✅ **`portal_invites` non-enumerable** (migrations `s7a_portal_invites_token_rpc` + `s7c_portal_invites_drop_public_select`, PR #77 deployed `b55b052`): added `get_invite_by_token(text)` SECURITY DEFINER RPC (exact-token, anon-callable) + `invites_household_select` (`can_access_client`); switched the acceptance page to the RPC; dropped the `Public reads invites by token` USING(true) hole. Verified (4/4): anon enumerate → **0 rows**; anon RPC → 200; client reads partner invite by client_id → 200; client reads client C invites → 0. **Last deferred RLS item closed.**
  - ⏳ **(now reliability, not a hole)** anon-key keepalive beacon: the RLS work already *blocks* those anon writes, so there's no anon-write hole anymore — the beacon just silently no-ops. Switching it to the session JWT is a **7A reliability** fix (make the unload-backup actually persist), not a security gap.
  - ✅ **Security response headers** (PR #78, deployed `df5c20e`) — the high-leverage XSS/MITM/clickjacking hardening that protects **every page + every stored token** (incl. the Supabase SDK's own `localStorage` session). **Enforced** (zero-breakage): HSTS, `X-Content-Type-Options:nosniff`, `Referrer-Policy`, `Permissions-Policy` (disables geo/cam/mic/payment/usb; WebAuthn left intact). **CSP shipped Report-Only** (allowlist: Supabase https+wss, jsdelivr supabase-js, Google Fonts, `blob:` for PDF audit, same-origin frames, `object-src 'none'`, `frame-ancestors 'self'`). `tools/csp-probe.mjs` → **0 violations** on front-door+login+portal ⇒ candidate to flip to enforce after also exercising advisor pages + the PDF-audit/booking flows.
  - ✅ **CSP now ENFORCING** (PR #79, deployed `a08e7a5`): validated 0 violations on **client AND admin** flows under Report-Only; confirmed no `<embed>`/`<object>` (so `object-src 'none'` is safe — PDFs are `a.href` downloads); broadened `frame-ancestors` to the `esjfinancial.com` family. Post-enforce re-probe: **0 violations** both flows + `cluster8-live-verify` 13/13, 0 console errors (engine + calculators work under the enforced policy). Header flipped `Report-Only` → `Content-Security-Policy`.
  - 🔎 **Reframed (biometric tokens):** the Supabase client uses default `persistSession:true`+localStorage, so the refresh_token is in localStorage for ALL users regardless of biometrics — the biometric copy is just redundant. Full server-side WebAuthn (Option A) would NOT remove the SDK's copy, so it's disproportionate for "tokens off localStorage". The proportionate defense is the **security headers above** (limit XSS + exfil) — done. Remaining options (remove redundant copy / true httpOnly-cookie rearchitecture) tracked in `BIOMETRIC-TOKEN-PLAN.md`; deferred as low-priority given the headers + XSS-escaping now in place.

---

## 1. Methodology (the safety rails — non-negotiable)

RLS changes can **break the app** (a missing policy turns a needed write into a silent
failure = data loss). So, mirroring the calc plan's parity-gate discipline:

1. **Branch-first.** All policy changes are built + tested on a **Supabase branch** (needs
   your OK), never directly on prod. Promote only after the cluster's full gate is green.
2. **Per-cluster gate (every cluster, no exceptions):**
   - **Migration applied** via `apply_migration` (named, reviewable SQL).
   - **Denial tests** (`tools/rls-denial-test.mjs`): signed in as client A, attempt to
     read/insert/update/delete client B's rows in the cluster's tables via PostgREST →
     **all denied** (403/empty). Signed in as a client, attempt `users` insert with
     `role='admin'` → denied.
   - **Access tests** (same harness, positive path): the legitimate owner CAN do their own
     reads/writes; an advisor CAN act within their book → **all succeed**.
   - **App smoke** (`tools/rls-app-smoke.mjs`, Playwright): client portal loads + saves;
     advisor opens a client + saves; couple loads — **0 console errors, saves persist**.
     (This is the "RLS didn't break the app" gate.)
   - **Advisor re-scan**: `get_advisors(security)` → the cluster's findings count drops to
     **0** for its tables/functions; no NEW findings introduced.
3. **Cross-cutting regression gate (§Z)** after every cluster:
   - Every previously-fixed cluster's denial+access tests still green (no policy regressed).
   - `pg_policies` query: **0 rows** with `qual = 'true'` or `with_check = 'true'` on any
     table already hardened.
   - Live save paths still work for client + advisor + couple (the app-smoke, full set).
   - Migration list is clean + named (`list_migrations`); no ad-hoc `execute_sql` DDL left.

**Definition of done (7B):** `get_advisors(security)` shows **0 ERROR and 0 privilege/RLS
WARN** (always-true policies, exposed definer funcs, definer views all gone); denial tests
prove cross-tenant isolation; app-smoke proves nothing broke; password protection enabled.

---

## 2. 7B — Security/RLS clusters

### Cluster S1 — Privilege escalation (THE deal-killers) · `users` + admin RPCs
- **Outcome:** No user can elevate their own role or touch another user's row; the admin/
  internal SECURITY DEFINER functions are not callable by `anon`/`authenticated`.
  - `users` INSERT: replace `anon_insert_users(true)` → only allow a row where
    `id = auth.uid()` AND `role` ∈ non-staff (or remove anon insert entirely; staff are
    provisioned by admin). `users` UPDATE: only admin (via `get_my_role()='admin'`) or self
    on non-role columns; **role column locked**.
  - `REVOKE EXECUTE` from `anon`/`authenticated` on `admin_restore_client_data`,
    `rls_auto_enable`, `state_c_dual_plan_write`; keep internal trigger funcs
    (`log_financial_data_change/_delete`) non-RPC-exposed; `get_my_role`/`check_calc_tier`
    reviewed (these may legitimately need execute — keep minimal).
- **Audits:** `get_advisors` → `anon_/authenticated_security_definer_function_executable`
  drops by the locked funcs; `users` no longer in `rls_policy_always_true`. `pg_policies`:
  `users` write policies are scoped, not `true`.
- **Tests:** as client A → `INSERT users {role:'admin'}` **denied**; `UPDATE users SET role`
  on self/others **denied**; `rpc/admin_restore_client_data` as authenticated **denied**;
  admin still can manage users (access test); login/routing still works (app-smoke).
- **Failure modes:** locking `users` breaks signup/role-routing → test the real signup +
  `determineRoleAndRoute` path on the branch before promote; over-revoking a func the app
  calls at runtime → grep pages for each func name first, keep needed grants.

### Cluster S2 — Client financial data (highest-value data) · `client_profiles`, `clients`, `couple_links`, `client_snapshots`, `financial_data_history`, `plan_versions`, `plan_snapshots`
- **Outcome:** A client can write only their **own** `client_profiles`/snapshot rows; an
  advisor only within their **assigned book**; nobody can touch a stranger's financial data.
  Replace the always-true INSERT/UPDATE/DELETE with ownership predicates
  (`client_id` owned by `auth.uid()` via the `clients` link, or advisor-assignment +
  `get_my_role()`), matching the existing (working) SELECT policies.
- **Audits:** these 7 tables gone from `rls_policy_always_true`; `pg_policies` write
  predicates reference ownership, not `true`. `get_advisors` count drops.
- **Tests:** client A cannot UPDATE/DELETE client B's `client_profiles` (the couple-test
  users are perfect: A writing B's row **denied**); advisor outside book denied; **owner +
  in-book advisor writes succeed**; couple joint/hybrid save still works (reuse the
  couple-migration harness); the keepalive `beforeunload` PATCH path still persists.
- **Failure modes:** couples write to two rows + `couple_links` → the policy must allow a
  primary to write the partner's joint slice (test all household types); the demerge-on-write
  B-row save (just fixed) must still pass → run the V2-joint round-trip on the branch.

### Cluster S3 — Advisory & engagement · `advisor_recommendations`, `messages`, `session_notes`, `follow_up_reminders`, `implementation_log`, `recommendation_checklists`, `recommendation_scenarios`, `reports`, `documents`, `client_notifications`, `estate_checklist`
- **Outcome:** Writes scoped to the owning advisor/client relationship; a client can't forge
  recommendations/notes for another client, an advisor can't write into another advisor's
  client. `client_notifications` writable only by the system/owner.
- **Audits:** all 11 gone from `rls_policy_always_true`; advisor re-scan clean.
- **Tests:** cross-advisor write denied; in-relationship write succeeds; messaging between a
  real advisor↔client pair still works (app-smoke); recommendation pipeline render unaffected.
- **Failure modes:** advisor "joint view" reads partner rows → keep SELECT intact; the
  recommendation-generation edge function writes via service role (bypasses RLS) → confirm it
  still works (it should; service role is exempt).

### Cluster S4 — Requests / workflow / intake · `agent_requests`, `agent_profiles`, `unlink_requests`, `deletion_requests`, `consultation_requests`, `demo_requests`, `platform_feedback`, `portal_invites`, `client_consents`
- **Outcome:** A client can create a request **only for themselves** (e.g. a `deletion_request`/
  `unlink_request` with their own id); public intake (`demo_requests`, `platform_feedback`)
  may allow anon INSERT but **no read**; `portal_invites` not enumerable (token/email lookup
  scoped); `client_consents` insert tied to the consenting client (this also feeds 7C).
- **Audits:** these gone from `rls_policy_always_true`; `portal_invites` not readable by anon
  (denial test); advisor re-scan clean.
- **Tests:** client A filing a `deletion_request` for client B **denied**; anon enumerating
  `portal_invites` **denied**; the real unlink/household-change request flow (setHH → request)
  still inserts for self; demo form still submits.
- **Failure modes:** the signup/invite-accept flow reads `portal_invites` by token → keep a
  scoped policy that allows the exact-token lookup; over-locking breaks invite acceptance →
  test the invite signup on the branch.

### Cluster S5 — Gamification & tracking (lower stakes, finish the set) · `achievements`, `savings_streaks`, `pulse_checks`, `guest_calculations`, `calculator_usage`, `calculator_results`, `spending_entries`, `pay_schedules`, `bill_calendar`, `pending_advisor_changes`
- **Outcome:** Each row owned by its client/user; no cross-user writes; `guest_calculations`
  (pre-auth) handled explicitly (anon insert OK, no cross-read).
- **Audits:** remaining `rls_policy_always_true` entries → **0** across ALL tables after this
  cluster (the count hits zero).
- **Tests:** owner-only write/read on a sample (spending_entries, pulse_checks); guest calc
  still records; calculator tracking (`calc-gateway`) still writes.
- **Failure modes:** `calc-gateway`/tracking writes via anon key → confirm path still works
  or move it to user-JWT (ties to the b-rollout auth).

### Cluster S6 — Functions, views & auth config (the non-policy findings)
- **Outcome:** `0 ERROR` advisories. The 2 SECURITY DEFINER **views**
  (`calculator_analytics`, `calculator_tier_summary`) → `security_invoker = on` (or
  restrict to admin); the **10 mutable-search_path** functions → `SET search_path = ''`
  (schema-qualify their bodies); **leaked-password protection enabled** in Auth.
- **Audits:** `get_advisors(security)` → `security_definer_view` (ERROR) = 0,
  `function_search_path_mutable` = 0, `auth_leaked_password_protection` = 0.
- **Tests:** the views still return correct analytics for admin; functions still behave
  (run the trigger paths: a financial-data save fires `log_financial_data_change` correctly).
- **Failure modes:** `security_invoker` views may return less to non-privileged callers →
  confirm only admin reads them; pinning search_path can break a function that relied on a
  table being on the path → schema-qualify and test each.

### Cluster S7 — App-side security (front-end, not RLS) · across the 8 HTML files
- **Outcome:** Biometric **JWT/refresh tokens out of `localStorage`** (`pfos:1252`) → a
  safer/shorter-lived store; **all DB-sourced strings escaped** before `innerHTML`
  (`client.name` → `esc()` at `pfos-dashboard:6100/6103`, `pfos-main:11903`) to kill stored
  XSS; edge calls authenticate with the **user JWT** (the `pfos-calc` pattern) not the anon
  key, so server-side enforcement is possible.
- **Audits:** grep — `localStorage` no longer holds the biometric token; every DB-string
  `innerHTML` sink routes through `esc()`; no anon-key `Authorization` on user-context calls.
- **Tests:** a DB row with `<script>` in `name` does not execute (escaped); biometric login
  still works from the new store; pages still save.
- **Failure modes:** moving tokens breaks biometric re-auth → test the biometric flow;
  escaping double-encodes an already-escaped field → audit each sink once.

---

## 3. The rest of what's left (scoped; tackled after 7B)

### Workstream 6 — Shared-concern dedup + drift bugs
- **Outcome:** Supabase init / auth / formatters / nav / postMessage bridge come from one
  source (or `pfos-shared.vN.js`), and the drift bugs are fixed everywhere at once.
- **Audits:** one definition each (grep); `fmt(-1000)==='-$1,000'`; `pfos-health` connects
  with the correct key; origin allowlist accepts prod/rejects others; `esc()` strips handlers
  on every page; `fmtDate` tz-safe everywhere.
- **Tests:** login/route/save smoke on all shells through the shared module.

### Workstream 7A — Reliability
- **Outcome:** No silent data-loss path; unified `_touched` section lists; offline queue
  doesn't drop >5 silently; `data_version` conflict surfaces a real UI; SW precache fixed.
- **Audits/Tests:** force-offline save → user sees queued/failed (not silent); two-tab edit
  surfaces a conflict; unified `_touched` shows no cross-shell section drop; SW precache resolves.

### Workstream 7C — Compliance
- **Outcome:** Schema in version-controlled migrations (stop printing it to console);
  consent persisted to DB w/ user+timestamp (`client_consents`, ties to S4); `audit_log`
  append-only + RLS; complete deletion cascade (incl. `policy_tracking`/`plan_versions`/…);
  basic SAR/export.
- **Audits/Tests:** accepting disclosure writes a DB row; deletion removes ALL related rows;
  `audit_log` not update/deletable by its owner; migrations reproduce the live schema (diff
  empty); no schema/PII in console.

### Workstream B (continued) — Server-side calc rollout
- Already proven (b1). Remaining: `pfosCalc()` helper in the shells, convert ~87 adapters
  sync→async (batched, parity-gated), rate-limit the edge function, expand the server bundle,
  cut the client over to `index.browser.ts`. Needs a `SUPABASE_ACCESS_TOKEN` for the full
  CLI deploy. (See `EDGE-ROLLOUT.md` in the engine workspace.)

---

## 4. Sequencing
```
7B  S1 privilege-escalation ─ gate ─┐  (branch → denial+access+app-smoke+advisor-rescan → promote)
    S2 financial-data ──────── gate ─┤
    S3 advisory/engagement ─── gate ─┤   §Z regression after each
    S4 requests/intake ─────── gate ─┤
    S5 tracking (count→0) ──── gate ─┤
    S6 funcs/views/auth ────── gate ─┤
    S7 app-side (XSS/tokens) ─ gate ─┘
      → 7A reliability → 6 dedup+drift → 7C compliance → (B rollout, anytime)
```

## 5. What I need from you
1. **OK to create a Supabase branch** for building/testing the policies before promoting (the core safety rail). If you'd rather not branch, the fallback is test-on-prod-with-immediate-rollback, which I don't recommend for RLS.
2. Confirm the **couple test users** can keep being used as the two "tenants" for denial tests (client A must not reach client B's rows).
3. Nothing else to start S1.
