/*! pfos-shared.v3.js — single source of truth for cross-page helpers.
 * Loaded by all shells via <script src="/pfos-shared.v3.js"></script> BEFORE their
 * inline scripts. Exposes globals (fmt/fmtK/fmtDate/esc/PFOS_ORIGIN/pfosCalc) so
 * existing bareword call sites keep working, plus a PFOSShared namespace.
 *
 * VERSIONING: this filename is cache-immutable on Vercel. To change a helper, create
 * pfos-shared.v4.js and update the <script src> references — never edit in place.
 *
 * v3: adds pfosCalc() — runs the PROPRIETARY one-off calculators in the pfos-calc edge
 *     function (Workstream B / IP protection). During the cutover it has a LOCAL
 *     fast-path: if the browser still bundles the calc it runs in-process (no latency,
 *     identical result); once the bundle is slimmed to index.browser.ts the local path
 *     is gone and every call routes to the edge fn. Pass {server:true} to force the edge.
 * v2: adds fmtK (smart decimals — "$2K" round / "$1.5K" fractional).
 */
(function (g) {
  'use strict';

  // Canonical app origin — used as postMessage targetOrigin and to validate inbound
  // message events. Every PFOS page is served under this host.
  var PFOS_ORIGIN = 'https://pfos.esjfinancial.com';
  // Accepted origins for inbound checks (apex + www redirect to the app host).
  var ORIGIN_ALLOWLIST = [
    'https://pfos.esjfinancial.com',
    'https://esjfinancial.com',
    'https://www.esjfinancial.com'
  ];

  // Money: "$1,000" / "-$1,000" (negative-safe).
  function fmt(n) {
    var v = Math.round(parseFloat(n) || 0);
    return (v < 0 ? '-$' + Math.abs(v).toLocaleString() : '$' + v.toLocaleString());
  }

  // Abbreviated money with SMART decimals: round values stay clean ("$2K", "$3M"),
  // fractional values keep one decimal ("$1.5K", "$2.4K", "$1.2M"). Negative-safe.
  function fmtK(n) {
    var v = Math.round(parseFloat(n) || 0), neg = v < 0, a = Math.abs(v), s;
    if (a >= 1000000) { s = (a / 1000000).toFixed(1); if (s.slice(-2) === '.0') s = s.slice(0, -2); s = '$' + s + 'M'; }
    else if (a >= 1000) { s = (a / 1000).toFixed(1); if (s.slice(-2) === '.0') s = s.slice(0, -2); s = '$' + s + 'K'; }
    else { s = '$' + a.toLocaleString(); }
    return neg ? '-' + s : s;
  }

  // Date: "Jun 13, 2026". Date-only strings get a noon stamp so a UTC parse can't
  // roll back a day in negative-offset timezones.
  function fmtDate(d) {
    if (!d) return '—';
    try {
      var s = String(d);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T12:00:00';
      return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return d; }
  }

  // HTML-escape for innerHTML interpolation: all 5 entities (& < > " '). Single-quote
  // escaping prevents breakout from single-quoted attributes. esc(0) -> "0";
  // esc(null|undefined|false|'') -> "".
  function esc(s) {
    if (s === null || s === undefined || s === false || s === '') return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function inAllowlist(origin) { return ORIGIN_ALLOWLIST.indexOf(origin) !== -1; }

  // Run a proprietary one-off calculator. Returns a Promise of the result object.
  //   await pfosCalc('calculators', 'taxEstimate', [input])
  //   await pfosCalc('ibcCascade', 'simulateIBCDebtCascadeBest', [input])
  // LOCAL fast-path: while the browser still bundles the calc (window.PFOSEngine[ns][fn]),
  // it runs in-process — identical result, no network. After the bundle is slimmed
  // (index.browser.ts drops `calculators`/`ibc`/`ibcCascade`), it routes to the pfos-calc
  // edge function with the signed-in user's JWT. {server:true} skips the local path.
  // Auth: uses window.db (shells) or window.parent.db (the pfos-main iframe).
  async function pfosCalc(ns, fn, args, opts) {
    args = args || [];
    if (!(opts && opts.server)) {
      try {
        var E = (typeof window !== 'undefined' && window.PFOSEngine) || null;
        if (E && E[ns] && typeof E[ns][fn] === 'function') return E[ns][fn].apply(null, args);
      } catch (e) {}
    }
    var token = '';
    try { if (window.db && window.db.auth) { var s = await window.db.auth.getSession(); token = (s.data.session && s.data.session.access_token) || ''; } } catch (e) {}
    if (!token) { try { var ps = await window.parent.db.auth.getSession(); token = (ps.data.session && ps.data.session.access_token) || ''; } catch (e) {} }
    if (!token) throw new Error('pfosCalc: not signed in');
    var base = window.SUPABASE_URL || (window.parent && window.parent.SUPABASE_URL) || '';
    var key = window.SUPABASE_ANON_KEY || (window.parent && window.parent.SUPABASE_ANON_KEY) || '';
    var res = await fetch(base + '/functions/v1/pfos-calc', {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ns: ns, fn: fn, args: args })
    });
    var j = await res.json();
    if (!j || j.ok !== true) throw new Error((j && j.error) || ('pfosCalc ' + ns + '.' + fn + ' failed'));
    return j.result;
  }

  // Expose as globals (existing call sites use barewords) ...
  g.PFOS_ORIGIN = PFOS_ORIGIN;
  g.PFOS_ORIGIN_ALLOWLIST = ORIGIN_ALLOWLIST;
  g.fmt = fmt;
  g.fmtK = fmtK;
  g.fmtDate = fmtDate;
  g.esc = esc;
  g.pfosCalc = pfosCalc;
  // ... and as a namespace.
  g.PFOSShared = {
    PFOS_ORIGIN: PFOS_ORIGIN,
    ORIGIN_ALLOWLIST: ORIGIN_ALLOWLIST,
    fmt: fmt, fmtK: fmtK, fmtDate: fmtDate, esc: esc, inAllowlist: inAllowlist, pfosCalc: pfosCalc
  };
})(typeof window !== 'undefined' ? window : this);
