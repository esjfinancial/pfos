/*! pfos-shared.v2.js — single source of truth for cross-page helpers.
 * Loaded by all shells via <script src="/pfos-shared.v2.js"></script> BEFORE their
 * inline scripts. Exposes globals (fmt/fmtK/fmtDate/esc/PFOS_ORIGIN) so existing
 * bareword call sites keep working, plus a PFOSShared namespace.
 *
 * VERSIONING: this filename is cache-immutable on Vercel. To change a helper, create
 * pfos-shared.v3.js and update the <script src> references — never edit in place.
 *
 * v2: adds fmtK (smart decimals — "$2K" for round, "$1.5K" for fractional). Older
 *     v1 (no fmtK) is retained in the repo for any page still referencing it.
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

  // Expose as globals (existing call sites use barewords) ...
  g.PFOS_ORIGIN = PFOS_ORIGIN;
  g.PFOS_ORIGIN_ALLOWLIST = ORIGIN_ALLOWLIST;
  g.fmt = fmt;
  g.fmtK = fmtK;
  g.fmtDate = fmtDate;
  g.esc = esc;
  // ... and as a namespace.
  g.PFOSShared = {
    PFOS_ORIGIN: PFOS_ORIGIN,
    ORIGIN_ALLOWLIST: ORIGIN_ALLOWLIST,
    fmt: fmt, fmtK: fmtK, fmtDate: fmtDate, esc: esc, inAllowlist: inAllowlist
  };
  // Field-level validation (#42): mark a form field aria-invalid (red border via .inp[aria-invalid="true"]) and
  // auto-clear it on the next keystroke; clearInvalid resets a set of fields before re-validating. Focuses the field.
  function markInvalid(id){var el=document.getElementById(id);if(!el)return;el.setAttribute('aria-invalid','true');var _h=function(){el.removeAttribute('aria-invalid');el.removeEventListener('input',_h);};el.addEventListener('input',_h);try{el.focus();}catch(e){}}
  function clearInvalid(ids){(ids||[]).forEach(function(id){var el=document.getElementById(id);if(el)el.removeAttribute('aria-invalid');});}
  g.markInvalid = markInvalid;
  g.clearInvalid = clearInvalid;
  if(g.PFOSShared){ g.PFOSShared.markInvalid = markInvalid; g.PFOSShared.clearInvalid = clearInvalid; }
})(typeof window !== 'undefined' ? window : this);
