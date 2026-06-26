/*! pfos-shared.v6.js — single source of truth for cross-page helpers.
 * Loaded by all shells via <script src="/pfos-shared.v6.js"></script> BEFORE their
 * inline scripts. Exposes globals (fmt/fmtK/fmtDate/esc/PFOS_ORIGIN/pfosCalc/
 * calcDebounce/calcErr) so existing bareword call sites keep working, plus a
 * PFOSShared namespace.
 *
 * VERSIONING: this filename is cache-immutable on Vercel. To change a helper, create
 * pfos-shared.v7.js and update the <script src> references — never edit in place.
 *
 * v6: adds the empty PFOSIssues / PFOSHealth / PFOSImpact / PFOSRecs namespaces + a
 *     PFOS_FLAGS dark-launch bag — the M5 "FOS moat" single-source engine scaffold. The
 *     bodies land in later M5 sub-sections; here they are defined-EMPTY so the v5→v6
 *     cutover is byte-identical (every existing helper unchanged). PURE: ctx-in only;
 *     the engines never read S/CPLAN/computeCalcs (the 5b firewall).
 * v5: adds calcDebounce(key, runFn, delay) + calcErr(elId, err) for the server-side
 *     calc cutover — feature-calc adapters debounce their compute (~350ms) so the
 *     edge round-trip fires once after typing stops, and render a graceful error block
 *     if the edge call fails. (Does NOT affect computeCalcs — the core data-entry
 *     engine stays in the browser, instant.)
 * v4: pfosCalc resolves the Supabase URL/anon-key from hardcoded public constants
 *     (the page defines them as `const`, not on window) — v3's window-global lookup
 *     resolved to '' → a relative 404. Same public values used in every page.
 * v3: adds pfosCalc() — runs the PROPRIETARY one-off calculators in the pfos-calc edge
 *     function (Workstream B / IP protection). LOCAL fast-path while the browser still
 *     bundles the calc; routes to the edge fn once the bundle is slimmed. {server:true}
 *     forces the edge. Auth uses window.db (shells) or window.parent.db (pfos-main).
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
  // Public Supabase project URL + anon key (same hardcoded public values as every page;
  // security is enforced by RLS, not by hiding these). Used by pfosCalc.
  var SB_URL = 'https://wbndgvicmgeodararpmr.supabase.co';
  var SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndibmRndmljbWdlb2RhcmFycG1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTIwNzYsImV4cCI6MjA5MDIyODA3Nn0.OwzfA4naIbJZFPmCZo87NkKRanXdJXlYOvWsx1GGwPE';

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

  // Debounce a feature-calc's compute+render so per-keystroke `oninput` collapses to ONE
  // edge round-trip after the user stops typing (~350ms). One timer per key (the calc fn
  // name). The gather-inputs step stays OUTSIDE this (synchronous, instant input echo).
  var _pcTimers = {};
  function calcDebounce(key, runFn, delay) {
    if (_pcTimers[key]) clearTimeout(_pcTimers[key]);
    _pcTimers[key] = setTimeout(function () {
      _pcTimers[key] = null;
      try { var r = runFn(); if (r && typeof r.catch === 'function') r.catch(function (e) { try { console.warn('[pfosCalc]', (e && e.message) || e); } catch (x) {} }); }
      catch (e) { try { console.warn('[pfosCalc]', (e && e.message) || e); } catch (x) {} }
    }, delay || 350);
  }

  // Graceful render when an edge calc fails (offline / rate-limited / error) — a small
  // retry message instead of a broken/blank result block.
  function calcErr(elId, err) {
    try { console.warn('[pfosCalc] calc failed:', (err && err.message) || err); } catch (e) {}
    var el = (elId && elId.nodeType) ? elId : document.getElementById(elId);
    if (el) el.innerHTML = '<div style="padding:14px;border:1px solid rgba(239,68,68,.3);border-radius:6px;background:rgba(239,68,68,.06);color:#EF4444;font-size:13px;line-height:1.5">⚠ Couldn’t calculate right now — check your connection and adjust an input to retry.</div>';
  }

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
    // Public constants (the page declares these as `const`, not on window, so resolve
    // from the hardcoded values — same public URL/anon-key used in every PFOS file).
    var base = SB_URL, key = SB_ANON;
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
  g.calcDebounce = calcDebounce;
  g.calcErr = calcErr;
  // ... and as a namespace.
  g.PFOSShared = {
    PFOS_ORIGIN: PFOS_ORIGIN,
    ORIGIN_ALLOWLIST: ORIGIN_ALLOWLIST,
    fmt: fmt, fmtK: fmtK, fmtDate: fmtDate, esc: esc, inAllowlist: inAllowlist,
    pfosCalc: pfosCalc, calcDebounce: calcDebounce, calcErr: calcErr
  };

  // ── M5 (FOS moat) scaffold ── the single canonical engines for "what to do next" /
  // red-flags / health / recommendations. Defined-EMPTY in M5.0 so the v5→v6 cutover is
  // byte-identical; the bodies land in M5.1+. PURE: each method takes a plain ctx and
  // NEVER reads S/CPLAN/computeCalcs (the 5b firewall). Idempotent (|| {}) so a double
  // load can't clobber an already-populated namespace.
  // ── M5.1 — PFOSIssues.detect(ctx): the single canonical red-flag detector (pure; ctx-in only, 5b firewall).
  // Faithful merge of client + advisor _cpExtractRedFlags: PROFILE-only blocks fire only when their ctx gate is
  // present (selfMonthlyIncome / retExisting / hsaEligibleOwnerAware / spouse). Dark-launched via PFOS_FLAGS.issuesDetect.
function _issuesDetect(ctx){
    var flags=[];
    var d=ctx.d;
    var rawS2=ctx.rawS2||{};

    // Cash flow deficit
    if(d.income>0&&d.expenses>=d.income)flags.push({type:'crit',icon:'🚨',title:'Cash Flow Deficit',desc:'Spending exceeds income by '+fmt(Math.round(d.expenses-d.income))+'/mo. This must be addressed before building any plan.',action:'expenses'});
    else if(d.income>0&&(d.income-d.expenses)<200)flags.push({type:'warn',icon:'⚠️',title:'Razor-thin buffer: '+fmt(Math.round(d.income-d.expenses))+'/mo',desc:'One unexpected expense could force you into new debt.',action:'expenses'});

    // No emergency fund
    var _efMo=d._efMonthsTarget||3;
    if(d.efBal<d.efTarget*0.25)flags.push({type:'crit',icon:'🛡️',title:'Emergency fund critically low',desc:'You have '+fmt(Math.round(d.efBal))+' of a '+fmt(Math.round(d.efTarget))+' target. Any disruption forces debt.',action:'ef'});
    else if(d.efBal<d.efTarget)flags.push({type:'warn',icon:'🛡️',title:'Emergency fund gap: '+fmt(Math.round(d.efTarget-d.efBal)),desc:'Need '+fmt(Math.round(d.efTarget))+' for '+_efMo+' month'+(_efMo===1?'':'s')+' of expenses.',action:'ef'});

    // High-interest debt — honor include:false
    var _inclDebts=(d.debts||[]).filter(function(x){return !(x&&x.include===false);});
    var hiDebts=_inclDebts.filter(function(x){return(parseFloat(x.rate)||0)>=15;});
    if(hiDebts.length>0){var hiTotal=hiDebts.reduce(function(t,x){return t+(parseFloat(x.balance)||0);},0);var hiInt=hiDebts.reduce(function(t,x){return t+((parseFloat(x.balance)||0)*(parseFloat(x.rate)||0)/100/12);},0);
      flags.push({type:'crit',icon:'💳',title:'High-interest debt: '+fmtK(hiTotal),desc:hiDebts.length+' account'+(hiDebts.length>1?'s':'')+' above 15% APR costing '+fmt(Math.round(hiInt))+'/mo in interest.',action:'debt'});}
    else if(d.totalDebt>0)flags.push({type:'warn',icon:'💳',title:'Outstanding debt: '+fmtK(d.totalDebt),desc:_inclDebts.length+' account'+(_inclDebts.length>1?'s':'')+' — a payoff strategy could save thousands in interest.',action:'debt'});

    // ── Employer match capture (identical in both files) ──
    if(d.employer){
      var _matchInfo=ctx.matchInfo||null;
      var _curContrib=_matchInfo?(parseFloat(_matchInfo.currentContrib)||0):0;
      var _matchPct=_matchInfo?(parseFloat(_matchInfo.matchPct)||0):0;
      var _incForMatch=_matchInfo?(parseFloat(_matchInfo.monthlyIncome)||0):0;
      var _matchDollars=Math.round(_incForMatch*(_matchPct/100));
      var _planExtra=d.allocations.reduce(function(t,a){
        if(!a||a.type!=='401k')return t;
        if(a.owner&&a.owner!=='self'&&a.owner!=='personal')return t;
        return t+(parseFloat(a.amount)||0);
      },0);
      var _totalContrib=_curContrib+_planExtra;
      if(_matchDollars>0&&_totalContrib<_matchDollars){
        var _gap=Math.round(_matchDollars-_totalContrib);
        flags.push({type:'warn',icon:'💼',title:'Employer match partially captured',desc:'Contribute '+fmt(_gap)+'/mo more to capture the full '+_matchPct+'% match ('+fmt(_matchDollars)+'/mo) at '+d.employer+' — free money you\'re leaving on the table.',action:'401k'});
      } else if(_matchDollars===0 && _curContrib===0 && _planExtra===0){
        flags.push({type:'warn',icon:'💼',title:'Employer match not captured',desc:'Your employer ('+d.employer+') may offer free matching contributions — this is the highest guaranteed return available. Add your 401(k) details so we can confirm.',action:'401k'});
      }
      // ── 401(k) MAX-OUT OPPORTUNITY (identical in both files) ──
      if(_matchInfo && _curContrib>0){
        var _age=parseInt(d.age)||30;
        var _annualLimit=24500;
        if(_age>=50)_annualLimit=32500;
        if(_age>=60&&_age<=63)_annualLimit=35750;
        var _monthlyLimit=Math.round(_annualLimit/12);
        var _matchOk=(_matchDollars===0)||(_totalContrib>=_matchDollars);
        var _hasUrgentDebt=hiDebts.length>0;
        var _efOk=d.efBal>=d.efTarget*0.25;
        var _hasRoom=_totalContrib<_monthlyLimit;
        var _hasSurplus=(d.surplus||0)>=200;
        if(_matchOk && !_hasUrgentDebt && _efOk && _hasRoom && _hasSurplus){
          var _gapToMax=Math.round(_monthlyLimit-_totalContrib);
          var _ageNote='';
          if(_age>=60&&_age<=63)_ageNote=' (includes SECURE 2.0 super catch-up for ages 60–63)';
          else if(_age>=50)_ageNote=' (includes 50+ catch-up)';
          flags.push({
            type:'info',
            icon:'💰',
            title:'Room to max your 401(k)',
            desc:'You\'re contributing '+fmt(_totalContrib)+'/mo. The 2026 limit is '+fmt(_monthlyLimit)+'/mo ('+fmtK(_annualLimit)+'/yr)'+_ageNote+'. Contributing '+fmt(_gapToMax)+'/mo more would max out the account and capture the full tax benefit. Worth considering if your goal is tax-deferred retirement growth — but not required: many people hit retirement targets without maxing.',
            action:'401k'
          });
        }
      }
    }

    // ── No life insurance — branches on PROFILE-ONLY ctx.selfMonthlyIncome ──
    var hasLife=(d.policies||[]).some(function(p){var t=(p.type||'').toLowerCase();return t.indexOf('life')>=0||t.indexOf('term')>=0;});
    if(ctx.selfMonthlyIncome!=null){
      // ===== PROFILE copy =====
      var _selfMonthlyIncome=ctx.selfMonthlyIncome;
      if(!hasLife&&_selfMonthlyIncome>0){
        var _annIncLife=(_selfMonthlyIncome||0)*12;
        var _hasDeps=(d.marital==='Married'||d.children.length>0);
        var _lifeMin,_lifeMax,_lifeDesc,_lifeSev;
        if(_hasDeps){
          _lifeMin=Math.round(_annIncLife*8);_lifeMax=Math.round(_annIncLife*12);
          _lifeSev='warn';
          _lifeDesc='With dependents, a coverage gap puts your family at financial risk if something happens to you. Industry-standard guidance is 8-12x annual income for breadwinners with dependents — about '+fmtK(_lifeMin)+'-'+fmtK(_lifeMax)+' of death benefit on your '+fmtK(_annIncLife)+'/yr income. A 20- or 30-year level term policy is the standard structure. Get quotes from a licensed insurance professional.';
        } else {
          _lifeMin=Math.round(_annIncLife*5);_lifeMax=Math.round(_annIncLife*10);
          _lifeSev='opp';
          _lifeDesc='Even without current dependents, term life is worth evaluating now. Three reasons: (1) <strong style="color:var(--wh)">insurability lock-in</strong> — premiums are set at your current age and health classification, so getting coverage while young and healthy locks in low rates for 20-30 years before any future health changes raise your cost or make you uninsurable; (2) <strong style="color:var(--wh)">final expenses + non-dischargeable debts</strong> — funeral costs, private student loans (some don\'t die with you), co-signed debts, and business debts that pass to your estate; (3) <strong style="color:var(--wh)">future dependents</strong> — getting term before marriage or children is dramatically cheaper than getting it after. Industry guidance for single filers is 5-10x annual income (about '+fmtK(_lifeMin)+'-'+fmtK(_lifeMax)+' on your '+fmtK(_annIncLife)+'/yr income). A 20- or 30-year level term policy is the standard structure. Get quotes from a licensed insurance professional.';
        }
        flags.push({type:_lifeSev,icon:'🛡️',title:'No life insurance detected',desc:_lifeDesc,action:'protection'});
      }
      // No disability insurance (PROFILE copy)
      var hasDisabP=(d.policies||[]).some(function(p){var t=(p.type||'').toLowerCase();return t.indexOf('disab')>=0;});
      if(!hasDisabP&&_selfMonthlyIncome>0){
        var _disMonthly=Math.round((_selfMonthlyIncome||0)*0.65);
        flags.push({type:'warn',icon:'⚡',title:'No disability coverage detected',desc:'Your income ('+fmt(_selfMonthlyIncome)+'/mo) is your most valuable asset — long-term disability is statistically more likely than premature death during working years, and Social Security disability replaces only a fraction with strict eligibility. Industry-standard guidance is 60-70% income replacement (about '+fmt(_disMonthly)+'/mo for you), own-occupation definition, benefit period to age 65. If your employer offers group LTD, verify the amount and definition. Get quotes from a licensed insurance professional.',action:'protection'});
      }
    } else {
      // ===== CLIENT copy (income basis = d.income; note literal '$' diffs) =====
      if(!hasLife&&d.income>0){
        var _annIncLifeC=(d.income||0)*12;
        var _hasDepsC=(d.marital==='Married'||d.children.length>0);
        var _lifeMinC,_lifeMaxC,_lifeDescC,_lifeSevC;
        if(_hasDepsC){
          _lifeMinC=Math.round(_annIncLifeC*8);_lifeMaxC=Math.round(_annIncLifeC*12);
          _lifeSevC='warn';
          _lifeDescC='With dependents, a coverage gap puts your family at financial risk if something happens to you. Industry-standard guidance is 8-12x annual income for breadwinners with dependents'+(d.income?' — about '+fmtK(_lifeMinC)+'-'+fmtK(_lifeMaxC)+' of death benefit on your '+fmtK(_annIncLifeC)+'/yr income':'')+'. A 20- or 30-year level term policy is the standard structure. Get quotes from a licensed insurance professional.';
        } else {
          _lifeMinC=Math.round(_annIncLifeC*5);_lifeMaxC=Math.round(_annIncLifeC*10);
          _lifeSevC='opp';
          _lifeDescC='Even without current dependents, term life is worth evaluating now. Three reasons: (1) <strong style="color:var(--wh)">insurability lock-in</strong> — premiums are set at your current age and health classification, so getting coverage while young and healthy locks in low rates for 20-30 years before any future health changes raise your cost or make you uninsurable; (2) <strong style="color:var(--wh)">final expenses + non-dischargeable debts</strong> — funeral costs, private student loans (some don\'t die with you), co-signed debts, and business debts that pass to your estate; (3) <strong style="color:var(--wh)">future dependents</strong> — getting term before marriage or children is dramatically cheaper than getting it after. Industry guidance for single filers is 5-10x annual income'+(d.income?' (about '+fmtK(_lifeMinC)+'-'+fmtK(_lifeMaxC)+' on your '+fmtK(_annIncLifeC)+'/yr income)':'')+'. A 20- or 30-year level term policy is the standard structure. Get quotes from a licensed insurance professional.';
        }
        flags.push({type:_lifeSevC,icon:'🛡️',title:'No life insurance detected',desc:_lifeDescC,action:'protection'});
      }
      var hasDisabC=(d.policies||[]).some(function(p){var t=(p.type||'').toLowerCase();return t.indexOf('disab')>=0;});
      if(!hasDisabC&&d.income>0){
        var _disMonthlyC=Math.round((d.income||0)*0.65);
        flags.push({type:'warn',icon:'⚡',title:'No disability coverage detected',desc:'Your income ('+fmt(d.income)+'/mo) is your most valuable asset — long-term disability is statistically more likely than premature death during working years, and Social Security disability replaces only a fraction with strict eligibility. Industry-standard guidance is 60-70% income replacement (about $'+fmt(_disMonthlyC)+'/mo for you), own-occupation definition, benefit period to age 65. If your employer offers group LTD, verify the amount and definition. Get quotes from a licensed insurance professional.',action:'protection'});
      }
    }

    // Low savings rate — sr from ctx.d.savingsRate (both files feed sr here)
    var sr=(d.savingsRate!=null)?d.savingsRate:0;
    if(sr<5&&d.income>0)flags.push({type:'warn',icon:'📉',title:'Savings rate: '+sr.toFixed(1)+'%',desc:'Below 5% means surviving, not building. Target at least 15% for wealth growth.',action:'savings'});

    // No retirement accounts — PROFILE adds the hasExistingRet branch (ctx.retExisting)
    var _retTypesDetect=['roth','401k','roth401k','trad_ira','solo401k','sep_ira','iul','wl','ibc','hsa'];
    var hasRet=d.allocations.some(function(a){return _retTypesDetect.indexOf(a.type)>=0&&a.amount>0;});
    if(ctx.retExisting!=null){
      // ===== PROFILE branch =====
      var hasExistingRet=!!ctx.retExisting;
      if(!hasRet&&!hasExistingRet&&d.age>=25&&d.income>0)
        flags.push({type:'warn',icon:'🕒',title:'No retirement savings active',desc:'Time is the most powerful factor in retirement planning. Starting now, even small amounts compound significantly.',action:'retirement'});
      else if(!hasRet&&hasExistingRet&&d.age>=25&&d.income>0)
        flags.push({type:'opp',icon:'🎯',title:'Add to retirement savings',desc:'Existing retirement savings are a great start, but one account often isn\'t enough to reach the goal. Consider adding or boosting a retirement vehicle (Roth, IRA, IUL, and more).',action:'retirement'});
    } else {
      // ===== CLIENT branch =====
      if(!hasRet&&d.age>=25&&d.income>0)
        flags.push({type:'warn',icon:'🕒',title:'No retirement savings active',desc:'Time is the most powerful factor in retirement planning. Starting now, even small amounts compound significantly.',action:'retirement'});
    }

    // Children but no education savings
    if(d.children.length>0&&!d.allocations.some(function(a){return a.type==='edu'&&a.amount>0;}))
      flags.push({type:'opp',icon:'🎓',title:'No education funding for '+d.children.length+' child'+(d.children.length>1?'ren':''),desc:'Tax-advantaged education savings grow significantly with time. Multiple vehicle options available.',action:'edu'});

    // Old/orphaned retirement accounts (rollover candidates) — identical
    var retAccounts=rawS2.retAccounts||[];
    var oldAccounts=retAccounts.filter(function(ra){return ra.type&&(ra.type.indexOf('_old')>=0)&&(parseFloat(ra.balance)||0)>0;});
    if(oldAccounts.length>0){var oldBal=oldAccounts.reduce(function(t,a){return t+(parseFloat(a.balance)||0);},0);
      var rp2=(d.riskProfile||'moderate').toLowerCase();
      var rollRec=rp2==='conservative'?'Roth conversion or roll into current IRA (consolidate for simpler management)':rp2==='aggressive'?'Roth conversion or roll into current 401(k)/IRA (tax-free growth)':'Roll into current 401(k)/IRA or consider a Roth conversion ladder';
      flags.push({type:'warn',icon:'🔄',title:'Old retirement account'+(oldAccounts.length>1?'s':'')+': '+fmtK(oldBal),desc:oldAccounts.length+' orphaned account'+(oldAccounts.length>1?'s':'')+' from previous employer'+(oldAccounts.length>1?'s':'')+'. Based on your '+rp2+' risk profile, consider: '+rollRec+'. Discuss rollover options with a licensed professional.',action:'rollover'});
      var annuityEligibleAge=d.age>=45;
      var annuityEligibleBal=oldBal>=25000;
      var annuityEligibleRisk=rp2==='conservative'||rp2==='moderate';
      var rmdTooSoon=d.age>=66;
      if(annuityEligibleAge&&annuityEligibleBal&&annuityEligibleRisk&&!rmdTooSoon){
        var annuityRec=rp2==='conservative'
          ?'A <strong>Fixed Annuity or MYGA</strong> provides guaranteed rates (currently 4-5%) with no market risk — your principal is protected.'
          :'A <strong>Fixed Indexed Annuity (FIA)</strong> links growth to a market index with a 0% floor — you participate in gains but never lose principal.';
        var annuityPros=rp2==='conservative'
          ?'Guaranteed rate, no market risk, predictable growth, potential income rider'
          :'Market-linked growth with principal protection, 0% floor, potential income rider';
        var annuityCons='Surrender charges lock funds for 7-12 years. Fees (especially on variable annuities) can reach 2-4%. Your 401k/IRA is already tax-deferred — an annuity inside it adds no additional tax benefit, you\'re paying for guarantees only. Compare against a simple target-date index fund at 0.1% fees.';
        flags.push({type:'opp',icon:'🛡️',title:'Consider a guaranteed vehicle for '+fmtK(oldBal),desc:annuityRec+' <strong style="color:var(--gr)">Pros:</strong> '+annuityPros+'. <strong style="color:var(--or)">Cons:</strong> '+annuityCons+' Use the Policy Audit tool to analyze a specific product before committing.',action:'annuity_research'});
      }
    }

    // ── HSA eligibility — PROFILE owner-aware (ctx.hsaEligibleOwnerAware) vs CLIENT expData scan ──
    if(ctx.hsaEligibleOwnerAware!=null){
      // ===== PROFILE block: detection precomputed owner-aware by caller =====
      if(ctx.hsaEligibleOwnerAware&&!d.allocations.some(function(a){return a.type==='hsa'&&a.amount>0;}))
        flags.push({type:'opp',icon:'💊',title:'HSA eligible — triple tax advantage',desc:'Your high-deductible health plan unlocks the only triple-tax-advantaged account: tax-free contributions, growth, and withdrawals for medical. After 65, functions like a Traditional IRA for any purpose.',action:'hsa'});
    } else {
      // ===== CLIENT block: expData scan + profile.hasHDHP =====
      var hasHDHP=false;
      if(rawS2.expData){Object.keys(rawS2.expData).forEach(function(k){var exp=rawS2.expData[k];if(exp&&exp.name&&(exp.name.toLowerCase().indexOf('hdhp')>=0||exp.name.toLowerCase().indexOf('high deductible')>=0))hasHDHP=true;});}
      if(rawS2.profile&&rawS2.profile.hasHDHP)hasHDHP=true;
      if(hasHDHP&&!d.allocations.some(function(a){return a.type==='hsa'&&a.amount>0;}))
        flags.push({type:'opp',icon:'💊',title:'HSA eligible — triple tax advantage',desc:'Your high-deductible health plan unlocks the only triple-tax-advantaged account: tax-free contributions, growth, and withdrawals for medical. After 65, functions like a Traditional IRA for any purpose.',action:'hsa'});
    }

    // Existing IUL/WL not in plan — identical
    var ibcPolicies=(d.policies||[]).filter(function(p){return p.ibcFlag==='yes';});
    var unincorporatedIBC=ibcPolicies.filter(function(p){return!d.allocations.some(function(a){return a.type==='ibc';});});
    if(unincorporatedIBC.length>0)
      flags.push({type:'opp',icon:'🏛️',title:'IBC policy not in your plan',desc:'You have '+unincorporatedIBC.length+' policy'+(unincorporatedIBC.length>1?'ies':'')+' marked for Infinite Banking. Consider incorporating '+(unincorporatedIBC.length>1?'them':'it')+' into your plan for debt recapture, major purchases, and retirement supplement.',action:'ibc'});
    var unsureIBC=(d.policies||[]).filter(function(p){return p.ibcFlag==='not_sure';});
    if(unsureIBC.length>0)
      flags.push({type:'opp',icon:'🔍',title:'Policy needs IBC assessment',desc:unsureIBC.length+' policy'+(unsureIBC.length>1?'ies need':' needs')+' evaluation. Upload to the Policy Audit tool to determine IBC suitability and get a structural rating.',action:'ibc_audit'});
    var retPolicies=(d.policies||[]).filter(function(p){var t=(p.type||'').toLowerCase();return(t.indexOf('whole')>=0||t.indexOf('iul')>=0)&&p.ibcFlag!=='yes'&&p.ibcFlag!=='not_sure'&&(parseFloat(p.premium)||0)>0;});
    if(retPolicies.length>0&&!d.allocations.some(function(a){return a.type==='iul'||a.type==='wl';}))
      flags.push({type:'opp',icon:'📋',title:'Existing '+retPolicies[0].type+' not in plan',desc:'Your '+(retPolicies[0].company||'')+' policy at '+fmt(parseFloat(retPolicies[0].premium)||0)+'/mo is protection-focused. Its cash value could supplement retirement — discuss with your advisor.',action:'existing_policy'});

    // No estate plan (age 40+ or kids)
    if((d.age>=40||d.children.length>0)&&d.income>0)
      flags.push({type:'opp',icon:'📜',title:'Estate planning review',desc:'With '+(d.children.length>0?'dependents':'your age')+', an estate plan protects your family and assets. Consider: will, trust, power of attorney, beneficiary review.',action:'estate'});

    // Single income source
    var incSources=rawS2.incomeSources||[];
    if(incSources.length===1&&d.income>0)
      flags.push({type:'info',icon:'📌',title:'Single income source',desc:'All income comes from one source — a job loss eliminates 100% of household income at once with no second salary to absorb the shock. Common mitigations, in order of immediacy: (1) build a deeper emergency fund (6-9 months instead of 3, adjust the EF target above), (2) ensure disability insurance is in place (see the protection card), (3) develop a secondary income stream (consulting, rental, side business) over a 12-24 month timeline.',action:'diversify'});

    // No umbrella policy
    var hasUmbrella=(d.policies||[]).some(function(p){return(p.type||'').toLowerCase().indexOf('umbrella')>=0;});
    if(!hasUmbrella&&d.income>3000){
      var _nwUmb=0;
      try{_nwUmb=(rawS2.calcs&&rawS2.calcs.netWorth)||0;}catch(e){}
      var _coverSuggest=Math.max(1000000,Math.ceil((_nwUmb||0)/1000000)*1000000);
      flags.push({type:'opp',icon:'☂️',title:'No umbrella policy detected',desc:'Umbrella insurance provides additional liability coverage beyond your auto and home policies. A single lawsuit (auto accident, dog bite, slip-and-fall at home) can exceed standard policy limits and expose your assets. Industry-standard guidance is to size coverage to at least your net worth'+(_nwUmb>0?' ('+fmtK(_nwUmb)+'). For your situation, $'+(_coverSuggest/1000000).toFixed(0)+'M of coverage is a reasonable starting point':'. $1M is the common starting point; larger nets typically need $2-5M')+'. Typical cost: $150-$300/yr for $1M coverage. Most carriers require minimum auto/home liability limits before attaching umbrella ($250K/$500K auto, $300K home is typical). Consult a licensed property & casualty professional.',action:'protection_ext'});
    }

    // ── EXPANDED FLAGS ──
    function _hasCustom(needle){
      var n=needle.toLowerCase();
      return d.allocations.some(function(a){
        var nm=(a.customName||'').toLowerCase();
        return a.type==='custom'&&nm.indexOf(n)>=0;
      });
    }

    // No will
    var willStatus=rawS2.willStatus||'';
    var hasWillData=willStatus&&willStatus!=='none';
    if(!hasWillData&&!_hasCustom('will')&&d.income>0){
      var willSev=d.children.length>0?'warn':'opp';
      var willDesc=d.children.length>0
        ?'No will on file. With dependents, the state decides who raises your children and who inherits your assets. Typical attorney fee: $300-$1,500.'
        :'No will on file. Without one, the state decides who inherits your assets. Even simple online wills (~$200) cover most situations.';
      flags.push({type:willSev,icon:'📝',title:'No will on file',desc:willDesc,action:'estate'});
    }

    // No power of attorney
    var poaStatus=(rawS2.estateDocs&&rawS2.estateDocs.poa)||'';
    var hasPOA=poaStatus&&poaStatus!=='none';
    if(!hasPOA&&!_hasCustom('power of attorney')&&!_hasCustom('poa')&&d.age>=30){
      flags.push({type:'opp',icon:'⚖️',title:'No power of attorney',desc:'A POA lets someone you trust make healthcare and financial decisions if you become incapacitated. Without one, family must petition the court — slow, expensive, and stressful. Often included in a basic estate package.',action:'estate'});
    }

    // Beneficiary review
    var hasRetAccts=(rawS2.retAccounts||[]).some(function(ra){return(parseFloat(ra.balance)||0)>0;});
    var hasLifePolicy=(d.policies||[]).some(function(p){var t=(p.type||'').toLowerCase();return t.indexOf('life')>=0||t.indexOf('term')>=0||t.indexOf('whole')>=0||t.indexOf('iul')>=0;});
    var hasBenReview=!!(rawS2.estateDocs&&rawS2.estateDocs.beneficiary);
    if((hasRetAccts||hasLifePolicy)&&!hasBenReview&&!_hasCustom('beneficiary')){
      flags.push({type:'warn',icon:'📋',title:'Beneficiary designations not reviewed',desc:'Beneficiary designations on retirement accounts and life insurance OVERRIDE your will. If you\'ve had a marriage, divorce, birth, or death since you set them up, they may be wrong. Free to update — call your account custodians.',action:'estate'});
    }

    // Long-term care
    var hasLTC=(d.policies||[]).some(function(p){var t=(p.type||'').toLowerCase();return t.indexOf('long-term care')>=0||t.indexOf('ltc')>=0||t.indexOf('long term care')>=0;});
    if(!hasLTC&&d.age>=50&&d.age<=65&&d.income>0){
      flags.push({type:'opp',icon:'🏥',title:'No long-term care planning',desc:'70% of people 65+ will need LTC. Average nursing home costs run $108K/yr. Premiums for traditional LTC are best purchased between 50-60 — they nearly double after 65. Consider hybrid life/LTC policies as an alternative to standalone LTC.',action:'protection'});
    }

    // Underinsured life
    if(hasLifePolicy&&(d.children.length>0||d.marital==='Married')){
      var lifeCoverage=(d.policies||[]).filter(function(p){var t=(p.type||'').toLowerCase();return t.indexOf('life')>=0||t.indexOf('term')>=0||t.indexOf('whole')>=0||t.indexOf('iul')>=0;}).reduce(function(t,p){return t+(parseFloat(p.coverage)||0);},0);
      var annualIncome=d.income*12;
      var coverageMultiple=annualIncome>0?lifeCoverage/annualIncome:0;
      if(coverageMultiple>0&&coverageMultiple<8){
        flags.push({type:'warn',icon:'🛡️',title:'Life coverage may be too low',desc:'You have '+fmtK(lifeCoverage)+' in life coverage on '+fmtK(annualIncome)+'/yr income — that\'s '+coverageMultiple.toFixed(1)+'x. Industry guidance suggests 8-12x annual income for breadwinners with dependents. Compare term costs — your coverage may be cheaper to upgrade than you expect.',action:'protection'});
      }
    }

    // Income protection gap (has disability but coverage doesn't cover essentials)
    var disabPolicies=(d.policies||[]).filter(function(p){return(p.type||'').toLowerCase().indexOf('disab')>=0;});
    if(disabPolicies.length>0&&d.income>0&&d.expenses>0){
      var disabMonthlyBenefit=disabPolicies.reduce(function(t,p){return t+(parseFloat(p.coverage)||0);},0);
      if(disabMonthlyBenefit>d.income*5)disabMonthlyBenefit=disabMonthlyBenefit/12;
      if(disabMonthlyBenefit>0&&disabMonthlyBenefit<d.expenses*0.85){
        var gap=Math.round(d.expenses-disabMonthlyBenefit);
        flags.push({type:'warn',icon:'⚡',title:'Disability coverage gap: '+fmt(gap)+'/mo',desc:'Your disability benefit is '+fmt(Math.round(disabMonthlyBenefit))+'/mo, but your essential expenses are '+fmt(Math.round(d.expenses))+'/mo. A long disability would force you to deplete savings or take on debt. Consider supplemental coverage to close the gap.',action:'protection'});
      }
    }

    // HSA underutilized — uses ctx.hsaIRSMax (= _cpIRSMax('hsa') in both files)
    var hsaAlloc=d.allocations.find(function(a){return a.type==='hsa'&&a.amount>0;});
    if(hsaAlloc){
      var hsaIRSMax=(ctx.hsaIRSMax!=null)?ctx.hsaIRSMax:367;
      if(hsaAlloc.amount<hsaIRSMax*0.5){
        flags.push({type:'opp',icon:'💊',title:'HSA underfunded',desc:'You\'re contributing '+fmt(hsaAlloc.amount)+'/mo to your HSA. The IRS limit is around '+fmt(hsaIRSMax)+'/mo — and HSA dollars are the only triple-tax-free money in the code. If your budget allows, increase to capture the full benefit.',action:'savings'});
      }
    }

    // Roth-only allocation, high income
    if(d.income>=10000){
      var rothTypes=['roth','roth401k'];
      var preTaxTypes=['401k','trad_ira','solo401k','sep_ira'];
      var hasRoth=d.allocations.some(function(a){return rothTypes.indexOf(a.type)>=0&&a.amount>0;});
      var hasPreTax=d.allocations.some(function(a){return preTaxTypes.indexOf(a.type)>=0&&a.amount>0;});
      if(hasRoth&&!hasPreTax){
        flags.push({type:'opp',icon:'🧾',title:'Consider tax bracket diversification',desc:'You\'re contributing only to Roth at '+fmt(d.income)+'/mo income. Pre-tax 401(k) or Traditional IRA contributions could meaningfully reduce your current tax bill. The right mix depends on your expected retirement bracket vs current — a tax pro can model this.',action:'retirement'});
      }
    }

    // Liquidity concentration — identical
    var totalRetBal=(rawS2.retAccounts||[]).reduce(function(t,r){return t+(parseFloat(r.balance)||0);},0);
    var liquidAssets=parseFloat((rawS2.assets&&rawS2.assets.checking)||0)
      +parseFloat((rawS2.assets&&rawS2.assets.savings)||0);
    var _hasTypedInvLiq=((rawS2.investments)||[]).length>0;
    if(_hasTypedInvLiq){
      liquidAssets+=(rawS2.investments||[]).reduce(function(t,iv){
        if(!iv)return t;
        var typ=(iv.type||'').toLowerCase();
        if(typ==='brokerage'||typ==='mutual_fund'||typ==='robo_advisor'){
          return t+(parseFloat(iv.balance)||0);
        }
        return t;
      },0);
    } else {
      liquidAssets+=parseFloat((rawS2.assets&&rawS2.assets.invest)||0);
    }
    if(totalRetBal>50000&&d.age<55){
      var liquidRatio=totalRetBal>0?liquidAssets/totalRetBal:0;
      if(liquidRatio<0.15&&liquidAssets<d.expenses*6){
        flags.push({type:'opp',icon:'🔒',title:'Most savings locked until retirement',desc:fmtK(totalRetBal)+' in retirement accounts vs '+fmtK(liquidAssets)+' liquid. Pre-59½ withdrawals trigger a 10% penalty plus tax. A taxable brokerage or HYSA buffer gives you flexibility for goals before retirement.',action:'savings'});
      }
    }

    // Growth diversification chooser — identical
    var _growthTypes=['invest','iul','wl','fixed_annuity','fia','variable_annuity','spia'];
    var _hasGrowthAlloc=d.allocations.some(function(a){
      return _growthTypes.indexOf(a.type)>=0&&(parseFloat(a.amount)||0)>0;
    });
    var _hasGrowthAcct=((rawS2.investments)||[]).some(function(iv){
      if(!iv)return false;
      var t=(iv.type||'').toLowerCase();
      return t==='brokerage'||t==='mutual_fund'||t==='robo_advisor';
    });
    var _hasTypedInvestments=((rawS2.investments)||[]).length>0;
    var _legacyInvestBal=_hasTypedInvestments?0:(parseFloat((rawS2.assets&&rawS2.assets.invest)||0));
    var _hasPermInsurance=(rawS2.policies||[]).some(function(p){
      if(!p)return false;
      var t=(p.type||'').toLowerCase();
      return (t.indexOf('whole')>=0||t.indexOf('iul')>=0)&&(parseFloat(p.cv)||0)>0;
    });
    var _hasAnyGrowth=_hasGrowthAlloc||_hasGrowthAcct||_legacyInvestBal>1000||_hasPermInsurance;
    var _surplusRatio=d.income>0?(d.income-d.expenses)/d.income:0;
    if(!_hasAnyGrowth&&d.age>=25&&_surplusRatio>=0.10&&d.income>0){
      flags.push({
        type:'opp',
        icon:'📈',
        title:'No growth diversification in your plan',
        desc:'You have healthy surplus but no growth-bearing vehicle beyond retirement accounts. Growth options include taxable brokerage (flexible pre-retirement access, LTCG treatment), permanent insurance with cash value (WL/IUL — tax-deferred growth, tax-free access via loans), and annuities (FIA/MYGA — guaranteed minimums). Pick what fits your timeline and risk tolerance.',
        action:'growth'
      });
    }

    // Mortgage in retirement — CLIENT filters _inclDebts, PROFILE filters d.debts
    var _mortSrc=ctx._mortgageUsesInclDebts? _inclDebts : (d.debts||[]);
    var mortgages=_mortSrc.filter(function(x){var t=(x.type||x.name||'').toLowerCase();return t.indexOf('mortgage')>=0||t.indexOf('home loan')>=0;});
    if(mortgages.length>0&&d.age>=50){
      var mortBal=mortgages.reduce(function(t,m){return t+(parseFloat(m.balance)||0);},0);
      var annualIncomeMort=d.income*12;
      if(mortBal>0&&annualIncomeMort>0&&mortBal>annualIncomeMort*5){
        flags.push({type:'warn',icon:'🏠',title:'Mortgage may extend past retirement',desc:fmtK(mortBal)+' mortgage at age '+d.age+'. At standard amortization, this likely runs into your retirement years — putting fixed housing costs on top of reduced income. Consider accelerated payoff or a refinance to a shorter term.',action:'debt'});
      }
    }

    // Children approaching college age — identical
    var hasEduAlloc=d.allocations.some(function(a){return a.type==='edu'&&a.amount>0;});
    if(d.children.length>0&&!hasEduAlloc){
      var youngestYearsToCollege=18;
      d.children.forEach(function(c){
        var cAge=parseInt(c.age||c.currentAge||0);
        if(!isNaN(cAge)&&cAge>0){var yrs=Math.max(0,18-cAge);if(yrs<youngestYearsToCollege)youngestYearsToCollege=yrs;}
      });
      if(youngestYearsToCollege<=5&&youngestYearsToCollege>=0){
        flags.push({type:'warn',icon:'🎓',title:'College is '+(youngestYearsToCollege<=0?'now':youngestYearsToCollege+' year'+(youngestYearsToCollege===1?'':'s')+' away'),desc:'With limited time to compound, every contribution counts. A 529 still helps, but you\'ll likely need to pair it with cash flow or other vehicles. Run the numbers in the College Planner tool.',action:'edu'});
      }
    }

    // RMD risk — identical
    if(d.age>=68&&d.age<=74){
      var preTaxBal=(rawS2.retAccounts||[]).filter(function(r){var t=(r.type||'').toLowerCase();return t.indexOf('trad')>=0||t.indexOf('401k')>=0||t.indexOf('sep')>=0;}).reduce(function(t,r){return t+(parseFloat(r.balance)||0);},0);
      if(preTaxBal>=500000){
        flags.push({type:'warn',icon:'📅',title:'Approaching RMD age with large pre-tax balance',desc:fmtK(preTaxBal)+' in pre-tax retirement accounts. RMDs start at age 73 and force taxable income that can push you into higher Medicare premium tiers (IRMAA). Roth conversions in low-income years before 73 can reduce future forced distributions.',action:'rollover'});
      }
    }

    // ── M5.2d-1 — engine-parity flags (idle cash, high cash, DTI). These mirror the engine's
    // deDetectFlags so the plan/shell red-flag list surfaces them too (the engine already shows them).
    // They read S.calcs (rawS2.calcs) — the engine's authoritative computeCalcs outputs — NEVER a
    // recomputed CPLAN value, which avoids the CLAUDE.md §4 DTI/cash divergence. They ride the existing
    // issuesDetect dark-launch (emitted only when the unified detector is active) and reuse existing
    // action keys (savings→invest, debt), so NO sync-map change is needed; their action→level mapping
    // (savings/debt → level 3) matches DE's level-3 ordering exactly. (More engine-only flags — leaks,
    // estate_tax, the Roth-strategy items — are deferred pending rank/owner decisions, see M5.2d notes.)
    var _calc=rawS2.calcs||{};
    var _idle=parseFloat(_calc.idleCash)||0;
    if(_idle>2000) flags.push({type:'opp',icon:'💤',title:'Idle cash: '+fmtK(_idle),desc:fmtK(_idle)+' sits above your emergency-fund target, losing ~'+fmt(Math.round(_idle*0.035))+'/yr to inflation. Putting it to work (money market, index fund) captures the return you\'re currently giving up.',action:'savings'});
    var _aCash=parseFloat(_calc.aCash)||0, _tAssets=parseFloat(_calc.totalAssets)||0, _cashRatio=_tAssets>0?_aCash/_tAssets:0;
    if(_cashRatio>0.6&&_aCash>10000&&(parseFloat(_calc.efMonths)||0)>6) flags.push({type:'opp',icon:'🏦',title:'High cash allocation: '+Math.round(_cashRatio*100)+'%',desc:fmtK(_aCash)+' is in cash while your emergency fund is already full — cash loses purchasing power to inflation (~'+fmt(Math.round(_aCash*0.035))+'/yr). Consider moving the excess into investments.',action:'savings'});
    var _dti=parseFloat(_calc.dti)||0;
    if(_dti>43) flags.push({type:'warn',icon:'📊',title:'High debt-to-income: '+Math.round(_dti)+'%',desc:'Your DTI is above 43% — the threshold most lenders use to deny new credit. Reducing debt or raising income restores borrowing options.',action:'debt'});
    // M5.2d-1b — spending leaks (list-only, action 'leaks' → L3, no plan card; mirrors the engine's leaks flag).
    var _lk=parseFloat(_calc.leakCount)||0;
    if(_lk>0) flags.push({type:'warn',icon:'💧',title:'Spending leaks: '+_lk+' area'+(_lk>1?'s':''),desc:'You\'ve tagged '+_lk+' expense categor'+(_lk>1?'ies':'y')+' as low-value. Reclaiming even ~'+fmt(_lk*50)+'/mo and redirecting it to debt or savings compounds over time.',action:'leaks'});
    // M5.2d-1b — estate-tax exposure (HNW; action 'estate_tax' → L4 engine-exact, routes to the estate card).
    var _estCov=(rawS2.protCalcs&&parseFloat(rawS2.protCalcs.coverage))||0, _estVal=_tAssets+_estCov, _estExempt=15000000;
    if(_estVal>_estExempt*0.7){var _estExp=Math.max(0,_estVal-_estExempt),_estTax=Math.round(_estExp*0.40);
      flags.push({type:_estExp>0?'warn':'opp',icon:'🏛️',title:'Estate tax exposure: '+fmtK(_estTax),desc:'Your projected estate ('+fmtK(_estVal)+') approaches the federal exemption ('+fmtK(_estExempt)+'). Amounts above it are taxed at 40% — trusts, lifetime gifting, and beneficiary structuring can reduce the exposure.',action:'estate_tax'});}

    // ── Spouse pass — PROFILE-ONLY (ctx.spouse). Same call site + try/catch as source. ──
    if(ctx.spouse&&(ctx.spouse.householdType==='joint'||ctx.spouse.householdType==='hybrid'||ctx.spouse.householdType==='separate')){
      try{ _spouseFlags(flags, rawS2, d, ctx.spouse); }catch(_sf){console.warn('Spouse flags (cards):',_sf); }
    }

    return flags;
}
  // ── Income take-home helpers (M5.1b — ported VERBATIM from the shells; pure math). ──
  function _checksPerMonth(freq){
  return ({weekly:52/12,biweekly:26/12,semimonthly:2,monthly:1,irregular:1})[freq||'monthly']||1;
}
  function _incSrcMode(src){return (src&&src.mode==='detailed')?'detailed':'simple';}
  function _incSrcMonthlyTakeHome(src){
  if(!src)return 0;
  if(_incSrcMode(src)==='detailed'){
    return (parseFloat(src.take_home_per_check)||0)*_checksPerMonth(src.pay_frequency);
  }
  return parseFloat(src.amount)||0;
}
  // ── Spouse/partner red-flag scanner (M5.1b) — ported VERBATIM from pfos-client-profile
  // _cpAppendSpouseFlags so the advisor profile AND the self-serve portal feed ONE scanner.
  // Made pure (5b firewall): the partner object, household type, and plan allocations arrive
  // via `sp` instead of being read off the page-global CPLAN. sp = { householdType, partner,
  // allocations, [run] }. Back-compat: if a (stale) caller still passes sp.run, delegate to it.
  function _spouseFlags(flags, rawS2, d, sp){
    if(sp&&typeof sp.run==='function'){ return sp.run(flags, rawS2, d); }
    sp = sp || {};
    var _partner = sp.partner || null;
    var _householdType = sp.householdType;
    var _allocations = sp.allocations || [];

  if(!rawS2)return;
  var spName=(_partner&&_partner.firstName)||'Spouse';
  function _sp(arr,field){return (arr||[]).filter(function(x){return x&&(x[field||'owner']||'personal')==='spouse';});}
  // Data sourcing differs by household model:
  //  • JOINT: both spouses share ONE row; spouse items are owner==='spouse' in rawS2.
  //  • HYBRID + SEPARATE: each spouse has their OWN row; the partner's data is on
  //    _partner (a separate profile), where their accounts are owner
  //    'self'/'personal' on THEIR row. So for both we read straight from
  //    _partner rather than filtering rawS2.
  var _isHybridSp=((_householdType==='hybrid'||_householdType==='separate') && _partner);
  var spIncSrcs, spInc, spRetAccts, spPolicies;
  if(_isHybridSp){
    spInc=Math.max(0, _partner.income||0);
    spRetAccts=_partner.retAccounts||[];
    spPolicies=_partner.policies||[];
    // Hybrid/separate: partner's income sources live on THEIR own row. Set this so
    // the single-income check below (spIncSrcs.length) doesn't throw on undefined —
    // that crash aborted every spouse flag after it (single-income, LTC).
    spIncSrcs=(_partner.incomeSources)||[];
  } else {
    // Spouse income (sum of spouse-owned income sources)
    spIncSrcs=_sp(rawS2.incomeSources);
    spInc=spIncSrcs.reduce(function(t,s){return t+_incSrcMonthlyTakeHome(s);},0);
    spRetAccts=_sp(rawS2.retAccounts);
    spPolicies=_sp(rawS2.policies&&rawS2.policies.length?rawS2.policies:rawS2.insurancePolicies);
  }
  var spAge=(_partner&&_partner.age)||parseInt(rawS2.profile&&rawS2.profile.spCurrentAge)||0;
  var tag=' ['+spName+']';
  // Helper: does the plan already have a spouse-owned allocation of these types with money?
  function _spHasAlloc(types){
    return _allocations.some(function(a){return a&&a.owner==='spouse'&&types.indexOf(a.type)>=0&&(parseFloat(a.amount)||0)>0;});
  }
  // ── Core financial-health flags (spouse) — only when we have the partner's OWN
  // profile (hybrid + separate). Joint shares one row, so the primary extraction
  // already covers the household. These mirror the four self "core" flags
  // (cash-flow, emergency fund, debt, employer match) for the partner so Combined
  // surfaces every gap for BOTH spouses. efTarget = 3 months of expenses (mirrors
  // the self formula).
  if(_isHybridSp){
    var _pt=_partner;
    var _ptInc=Math.max(0,_pt.income||0);
    var _ptExp=Math.max(0,_pt.expenses||0);
    var _ptEf=Math.max(0,_pt.efBal||0);
    var _ptEfTarget=Math.round(_ptExp*3);
    var _ptDebts=(_pt.debts||[]).filter(function(x){return x&&(parseFloat(x.balance)||0)>0;});
    var _ptTotalDebt=_ptDebts.reduce(function(t,x){return t+(parseFloat(x.balance)||0);},0);
    // Cash flow
    if(_ptInc>0&&_ptExp>=_ptInc){
      flags.push({icon:'🚨',title:'Spending exceeds income'+tag,desc:spName+'\'s expenses ('+fmt(_ptExp)+'/mo) meet or exceed income ('+fmt(_ptInc)+'/mo). Trim spending or raise income before funding goals.',type:'warn',action:'cashflow_spouse',owner:'spouse'});
    } else if(_ptInc>0&&(_ptInc-_ptExp)<200){
      flags.push({icon:'⚠️',title:'Razor-thin cash flow'+tag,desc:spName+' has only '+fmt(_ptInc-_ptExp)+'/mo of buffer after expenses — a small surprise could mean new debt.',type:'warn',action:'cashflow_spouse',owner:'spouse'});
    }
    // Emergency fund
    if(_ptEfTarget>0&&_ptEf<_ptEfTarget*0.25){
      flags.push({icon:'🛟',title:'Emergency fund critically low'+tag,desc:spName+' has '+fmt(_ptEf)+' of a '+fmt(_ptEfTarget)+' target (3 months of expenses). Build this first.',type:'warn',action:'ef_spouse',owner:'spouse'});
    } else if(_ptEfTarget>0&&_ptEf<_ptEfTarget){
      flags.push({icon:'🛟',title:'Emergency fund below target'+tag,desc:spName+' needs '+fmt(_ptEfTarget)+' for 3 months of expenses ('+fmt(_ptEf)+' saved so far).',type:'opp',action:'ef_spouse',owner:'spouse'});
    }
    // High-interest / outstanding debt
    var _ptHi=_ptDebts.filter(function(x){return (parseFloat(x.rate)||0)>=15;});
    if(_ptHi.length>0){
      var _ptHiTotal=_ptHi.reduce(function(t,x){return t+(parseFloat(x.balance)||0);},0);
      flags.push({icon:'🔥',title:'High-interest debt'+tag+': '+fmtK(_ptHiTotal),desc:_ptHi.length+' account'+(_ptHi.length>1?'s':'')+' above 15% APR for '+spName+'. A payoff strategy could save thousands.',type:'warn',action:'debt_spouse',owner:'spouse'});
    } else if(_ptTotalDebt>0){
      flags.push({icon:'💳',title:'Outstanding debt'+tag+': '+fmtK(_ptTotalDebt),desc:_ptDebts.length+' account'+(_ptDebts.length>1?'s':'')+' for '+spName+' — a payoff strategy could save on interest.',type:'opp',action:'debt_spouse',owner:'spouse'});
    }
    // Employer 401(k) match (heuristic — mirrors the self fallback when match data
    // isn't separately modeled for the partner: an employer + no active 401k).
    var _ptHasEmployer=!!(_pt.employer&&String(_pt.employer).trim());
    var _ptHas401kContrib=(_pt.retAccounts||[]).some(function(r){var t=(r.type||'').toLowerCase();return t.indexOf('401k')>=0&&(parseFloat(r.contrib)||0)>0;});
    if(_ptHasEmployer&&!_ptHas401kContrib&&!_spHasAlloc(['401k','roth401k'])&&_ptInc>0){
      flags.push({icon:'🎁',title:'Employer match likely available'+tag,desc:spName+' has an employer but no active 401(k) contribution. Capturing any employer match is an immediate, guaranteed return — fund this first.',type:'warn',action:'retirement_spouse',owner:'spouse'});
    }
  }
  // ── No retirement savings (spouse) ──
  // Count BOTH a spouse-owned retirement allocation in the plan AND an existing
  // spouse-owned retirement account in the data (balance or current contribution).
  // Without the existing-account check, a spouse with a real 401k that hasn't been
  // seeded as a plan allocation yet was wrongly flagged "no retirement savings".
  var _retTypesDetect=['roth','401k','roth401k','trad_ira','solo401k','sep_ira','iul','wl','ibc','hsa'];
  var _spHasExistingRet=spRetAccts.some(function(ra){
    return ra && ((parseFloat(ra.balance)||0)>0 || (parseFloat(ra.contrib)||0)>0);
  });
  var _spHasExistingRetPolicy=spPolicies.some(function(p){var t=(p.type||'').toLowerCase();return (t.indexOf('iul')>=0||t.indexOf('whole')>=0||p.ibcFlag==='yes')&&(parseFloat(p.premium)||parseFloat(p.cashValue)||0)>0;});
  if(!_spHasAlloc(_retTypesDetect)&&!_spHasExistingRet&&!_spHasExistingRetPolicy&&spAge>=25&&spInc>0)
    flags.push({icon:'🕒',title:'No retirement savings active'+tag,desc:spName+' has no active retirement contribution. Starting now compounds significantly.',type:'warn',action:'retirement_spouse',owner:'spouse'});
  else if(!_spHasAlloc(_retTypesDetect)&&(_spHasExistingRet||_spHasExistingRetPolicy)&&spAge>=25&&spInc>0)
    flags.push({icon:'🎯',title:'Add to retirement savings'+tag,desc:spName+'\'s existing retirement is a great start, but one account often isn\'t enough to reach the goal. Consider adding or boosting a retirement vehicle.',type:'opp',action:'retirement_spouse',owner:'spouse'});
  // ── Old/orphaned retirement accounts (spouse) ──
  var spOld=spRetAccts.filter(function(ra){return ra.type&&ra.type.indexOf('_old')>=0&&(parseFloat(ra.balance)||0)>0;});
  if(spOld.length>0){
    var spOldBal=spOld.reduce(function(t,a){return t+(parseFloat(a.balance)||0);},0);
    flags.push({icon:'🔄',title:'Old retirement account'+(spOld.length>1?'s':'')+tag+': '+fmtK(spOldBal),desc:spOld.length+' orphaned account'+(spOld.length>1?'s':'')+' for '+spName+'. Consider rolling into a current IRA/401(k) or a Roth conversion.',type:'warn',action:'rollover_spouse',owner:'spouse'});
  }
  // ── HSA eligibility (spouse) — detect from the spouse's own income sources
  //    (HSA payroll deduction / HDHP coverage) and the spouse profile flag. ──
  var spHDHP=false;
  if(_isHybridSp){
    // Hybrid: read the partner's own profile/income sources.
    var _pPR=(_partner&&_partner._rawProfile)||null;
    if(_pPR&&_pPR.spHasHDHP)spHDHP=true; // (partner's own HDHP flag if captured)
    var _pSrcsH=(_partner&&_partner.incomeSources)||[];
    if(_pSrcsH.some(function(s){return (parseFloat(s&&s.deduction_hsa)||0)>0;}))spHDHP=true;
  } else {
    if(rawS2.profile&&rawS2.profile.spHasHDHP)spHDHP=true;
    var _spSrcs=(rawS2.incomeSources||[]).filter(function(s){return (s&&s.owner)==='spouse';});
    if(_spSrcs.some(function(s){return (parseFloat(s.deduction_hsa)||0)>0;}))spHDHP=true;
  }
  if(spHDHP&&!_spHasAlloc(['hsa']))
    flags.push({icon:'💊',title:'HSA eligible'+tag+' — triple tax advantage',desc:spName+'\'s HDHP unlocks the only triple-tax-advantaged account: tax-free in, growth, and medical withdrawals.',type:'opp',action:'hsa_spouse',owner:'spouse'});
  // ── Life insurance gap (spouse) — detailed, calculated copy (mirrors primary) ──
  var spHasLife=spPolicies.some(function(p){var t=(p.type||'').toLowerCase();return t.indexOf('life')>=0||t.indexOf('term')>=0||t.indexOf('whole')>=0||t.indexOf('iul')>=0;});
  if(!spHasLife&&spInc>0){
    var _spAnnInc=spInc*12;
    var _spHasDeps=((d.children&&d.children.length>0)||d.marital==='Married');
    var _spLifeMin,_spLifeMax,_spLifeDesc,_spLifeSev;
    if(_spHasDeps){
      _spLifeMin=Math.round(_spAnnInc*8);_spLifeMax=Math.round(_spAnnInc*12);_spLifeSev='warn';
      _spLifeDesc='With dependents, a coverage gap on '+spName+' puts the household at financial risk. Industry-standard guidance is 8-12x annual income for breadwinners with dependents — about '+fmtK(_spLifeMin)+'-'+fmtK(_spLifeMax)+' of death benefit on '+spName+'\'s '+fmtK(_spAnnInc)+'/yr income. A 20- or 30-year level term policy is the standard structure. Get quotes from a licensed insurance professional.';
    } else {
      _spLifeMin=Math.round(_spAnnInc*5);_spLifeMax=Math.round(_spAnnInc*10);_spLifeSev='opp';
      _spLifeDesc='Even without current dependents, term life on '+spName+' is worth evaluating now — premiums lock in at current age and health, covering final expenses and non-dischargeable debts, and getting term before future dependents is dramatically cheaper. Industry guidance for single filers is 5-10x annual income (about '+fmtK(_spLifeMin)+'-'+fmtK(_spLifeMax)+' on '+spName+'\'s '+fmtK(_spAnnInc)+'/yr income). A 20- or 30-year level term policy is standard. Get quotes from a licensed insurance professional.';
    }
    flags.push({icon:'🛡️',title:'No life insurance detected'+tag,desc:_spLifeDesc,type:_spLifeSev,action:'protection_spouse',owner:'spouse'});
  }
  // ── Disability coverage (spouse) — detailed, calculated copy (mirrors primary) ──
  var spHasDisab=spPolicies.some(function(p){return(p.type||'').toLowerCase().indexOf('disab')>=0;});
  if(!spHasDisab&&spInc>0){
    var _spDisMonthly=Math.round(spInc*0.65);
    flags.push({icon:'⚡',title:'No disability coverage detected'+tag,desc:spName+'\'s income ('+fmt(spInc)+'/mo) is their most valuable asset — long-term disability is statistically more likely than premature death during working years, and Social Security disability replaces only a fraction with strict eligibility. Industry-standard guidance is 60-70% income replacement (about '+fmt(_spDisMonthly)+'/mo for '+spName+'), own-occupation definition, benefit period to age 65. If their employer offers group LTD, verify the amount and definition. Get quotes from a licensed insurance professional.',type:'warn',action:'protection_spouse',owner:'spouse'});
  }
  // ── Existing IBC / WL / IUL policies (spouse) not in plan ──
  var spIBC=spPolicies.filter(function(p){return p.ibcFlag==='yes';});
  if(spIBC.length>0&&!_spHasAlloc(['ibc']))
    flags.push({icon:'🏛️',title:'IBC policy not in plan'+tag,desc:spIBC.length+' policy marked for Infinite Banking on '+spName+' — incorporate for debt recapture, major purchases, retirement supplement.',type:'opp',action:'ibc_spouse',owner:'spouse'});
  var spRetPol=spPolicies.filter(function(p){var t=(p.type||'').toLowerCase();return(t.indexOf('whole')>=0||t.indexOf('iul')>=0)&&p.ibcFlag!=='yes'&&(parseFloat(p.premium)||0)>0;});
  if(spRetPol.length>0&&!_spHasAlloc(['iul','wl']))
    flags.push({icon:'📋',title:'Existing '+spRetPol[0].type+' not in plan'+tag,desc:spName+'\'s cash value could supplement retirement — consider incorporating.',type:'opp',action:'existing_policy_spouse',owner:'spouse'});
  // ── Single income source (spouse) — detailed copy (mirrors primary) ──
  if(spIncSrcs.length===1&&spInc>0)
    flags.push({icon:'📌',title:'Single income source'+tag,desc:spName+'\'s income comes from one source — a job loss eliminates that salary at once. Common mitigations, in order of immediacy: (1) build a deeper emergency fund (6-9 months instead of 3), (2) ensure disability insurance is in place (see the protection card), (3) develop a secondary income stream (consulting, rental, side business) over a 12-24 month timeline.',type:'info',action:'diversify_spouse',owner:'spouse'});
  // ── Long-term care planning (spouse, age 50-65) ──
  var spHasLTC=spPolicies.some(function(p){var t=(p.type||'').toLowerCase();return t.indexOf('long-term care')>=0||t.indexOf('ltc')>=0||t.indexOf('long term care')>=0;});
  if(!spHasLTC&&spAge>=50&&spAge<=65&&spInc>0)
    flags.push({icon:'🏥',title:'No long-term care planning'+tag,desc:'Premiums for '+spName+' are best locked 50-60 — nearly double after 65. Consider hybrid life/LTC.',type:'opp',action:'protection_spouse',owner:'spouse'});
  // ── Estate documents (spouse) — PERSONAL: each spouse needs their OWN will & POA;
  //    beneficiary designations are per-account. Only hybrid/separate (the partner
  //    has their own row/docs); joint shares one row so the self extraction already
  //    covers the household. action 'estate_spouse' → _cpSyncFlagsToUnassigned
  //    normalizes to 'estate' and routes the card to the spouse (owner:'spouse').
  //    (Umbrella + growth-diversification are HOUSEHOLD/plan-level — fired once on
  //    the centered client, NOT duplicated per spouse.) ──
  if(_isHybridSp && spInc>0){
    var _ptEst=_partner||{};
    var _ptHasDeps=((d&&d.children&&d.children.length>0)||(d&&d.marital==='Married'));
    var _ptWill=_ptEst.willStatus||'';
    if(!(_ptWill&&_ptWill!=='none'))
      flags.push({icon:'📝',title:'No will on file'+tag,desc:spName+' has no will on file — '+(_ptHasDeps?'with dependents, the state decides guardianship and inheritance':'the state decides who inherits')+'. Typical attorney fee: $300-$1,500.',type:_ptHasDeps?'warn':'opp',action:'estate_spouse',owner:'spouse'});
    var _ptPoa=(_ptEst.estateDocs&&_ptEst.estateDocs.poa)||'';
    if(!(_ptPoa&&_ptPoa!=='none')&&spAge>=30)
      flags.push({icon:'⚖️',title:'No power of attorney'+tag,desc:'A POA lets someone make healthcare and financial decisions for '+spName+' if incapacitated. Without one, family must petition the court.',type:'opp',action:'estate_spouse',owner:'spouse'});
    var _ptHasRet=(spRetAccts||[]).some(function(ra){return ra&&(parseFloat(ra.balance)||0)>0;});
    var _ptHasLifePol=spPolicies.some(function(p){var t=(p.type||'').toLowerCase();return t.indexOf('life')>=0||t.indexOf('term')>=0||t.indexOf('whole')>=0||t.indexOf('iul')>=0;});
    var _ptBenRev=!!(_ptEst.estateDocs&&_ptEst.estateDocs.beneficiary);
    if((_ptHasRet||_ptHasLifePol)&&!_ptBenRev)
      flags.push({icon:'📋',title:'Beneficiary designations not reviewed'+tag,desc:spName+'’s beneficiary designations on retirement/insurance OVERRIDE the will — verify them after any marriage, divorce, birth, or death.',type:'warn',action:'estate_spouse',owner:'spouse'});
  }

  }
  function _issuesToCp(issue){ return issue; }
  // ── M5.2 — canonical PRIORITY RANK (engine-exact). Mirrors the engine's deDetectFlags ordering
  // (pfos-main deDetectFlags): sort by LEVEL (1 Stability → 4 Growth) then severity then a stable
  // tiebreak. PFOSIssues flags carry `action` + `type` (not DE's level/severity), so we map each
  // action → the level DE assigns the equivalent concern, and derive severity from `type`. The
  // within-level tiebreak is the ORIGINAL detector push-order (the authored ladder the unassigned
  // cards already render by). PURE: reads only the flags' own fields, never mutates them (the
  // push-index is captured in a throwaway wrapper). The `_spouse` action suffix is stripped so a
  // spouse flag ranks at its base concern's level (so a spouse EF crit sorts with EF, not last).
  var _ACTION_LEVEL = {
    // Level 1 — Stability: cash flow, emergency fund, employer match (= free money, DE level 1 critical)
    expenses:1, cashflow:1, ef:1, '401k':1,
    // Level 2 — Risk Protection: life/disability/LTC protection, estate (will/beneficiary)
    protection:2, estate:2,
    // Level 3 — Efficiency: high-interest debt/DTI, umbrella, HSA, savings rate, rollover/consolidation, spending leaks
    debt:3, protection_ext:3, hsa:3, savings:3, rollover:3, leaks:3,
    // Level 4 — Growth & opportunities: retirement, education, growth/diversification, annuity/IBC/policy, estate-tax
    retirement:4, edu:4, growth:4, annuity_research:4, ibc:4, ibc_audit:4, existing_policy:4, diversify:4, estate_tax:4
  };
  var _TYPE_SEV = { crit:0, warn:1, opp:2, info:3 };   // PFOSIssues `type` → DE severity rank (critical<high<medium<low)
  function _issuesRank(issues){
    if(!issues||!issues.length) return issues||[];
    function baseAction(a){ a=a||''; var k=a.indexOf('_spouse'); return k>0 ? a.slice(0,k) : a; }
    return issues
      .map(function(f,i){ var l=_ACTION_LEVEL[baseAction(f&&f.action)]; var s=_TYPE_SEV[f&&f.type];
        return { f:f, i:i, l:(l!=null?l:3), s:(s!=null?s:3) }; })
      .sort(function(a,b){ return (a.l-b.l) || (a.s-b.s) || (a.i-b.i); })
      .map(function(x){ return x.f; });
  }
  // ── M5.2b — rank an array of UNASSIGNED PLAN CARDS by canonical priority. Each flag-sourced card
  // already carries flagAction + flagType (set in _cpSyncFlagsToUnassigned), so we rank by those.
  // Non-flag cards (e.g. savings_goal cards, which have no flagAction) are NOT ranked — they keep
  // their order and trail the ranked flag cards, matching today's "flags then goals" layout. Pure:
  // never mutates the cards (the {action,type,_a} wrapper is throwaway); returns a NEW array of the
  // SAME card references. Used by the render sites behind PFOS_FLAGS.priorityEngine (OFF = no call).
  function _issuesRankCards(cards){
    if(!cards||!cards.length) return cards||[];
    var flagCards=[], others=[];
    for(var i=0;i<cards.length;i++){ var c=cards[i]; if(c&&c.flagAction) flagCards.push(c); else others.push(c); }
    if(!flagCards.length) return cards.slice();
    var ranked=_issuesRank(flagCards.map(function(c){ return { action:c.flagAction, type:c.flagType, _a:c }; }));
    return ranked.map(function(w){ return w._a; }).concat(others);
  }
  // ── M5.2b-2 — SELF-SERVE PORTAL spouse-issue VISIBILITY policy (household-aware privacy). The advisor
  // always sees both spouses; in the self-serve portal what one spouse sees OF THE PARTNER is gated by
  // household type: joint = ALL (merged finances, no privacy barrier); separate = NONE (independent —
  // not this person's concern); hybrid = only HOUSEHOLD-IMPACTING categories (emergency fund, insurance/
  // protection, estate) — hiding the partner's purely-personal money management (cash flow, debt,
  // retirement, hsa, ...). `baseAction` is the _spouse-stripped action. NOTE: spouse flags carry no item
  // reference, so there is no true per-item shared/private split — this is a CATEGORY allow-list, the
  // realizable form of the owner's "partial visibility for hybrid" intent (owner added `ef` explicitly).
  var _HYBRID_SPOUSE_SHOW = { ef:1, protection:1, estate:1 };
  function _spouseVisibleSelfServe(baseAction, householdType){
    if(householdType==='joint') return true;
    if(householdType==='hybrid') return !!_HYBRID_SPOUSE_SHOW[baseAction];
    return false;   // separate / individual / anything else → hide
  }
  // ── M5.3a — pure surplus-allocation TEASER. Given a surplus, a buffer %, and the user's detected
  // priority flags (each carrying an `action`), reserves the buffer then splits the remaining pool across
  // the top priorities WEIGHTED BY LEVEL (L1=50,L2=25,L3=15,else10) — the same Rule-2 math as the engine's
  // deCalcAllocation (pfos-main). PURE: reads only ctx + the closure-const _ACTION_LEVEL; no S/CPLAN/DE/
  // computeCalcs reads, mutates nothing, returns a NEW object (the 5b firewall). SIMPLIFIED per owner: it
  // OMITS the engine's impure Rules 1/3/4 (employer-match-off-top, EF<1mo cap, pre-tax gross-up), so it is
  // a "rough guide" awareness teaser — NOT the authoritative allocator (that stays in the Planning builder).
  // ctx = {surplus:Number, bufferPct:Number, flags:[{action,title,icon}], maxRows?:Number(default 5)}.
  function _impactAllocate(ctx){
    ctx = ctx || {};
    var surplus = Math.max(0, Math.round(parseFloat(ctx.surplus) || 0));
    var pct = Math.max(0, Math.min(100, parseFloat(ctx.bufferPct) || 0));
    var maxRows = ctx.maxRows > 0 ? ctx.maxRows : 5;
    var bufferAmt = Math.round(surplus * pct / 100);
    var pool = surplus - bufferAmt;
    var rows = [];
    if (surplus <= 0) return { surplus: 0, buffer: 0, pool: 0, rows: [] };
    rows.push({ label: 'Safety cushion (' + pct + '%)', amt: bufferAmt, level: 0, icon: '🛡️', flagId: '_buffer' });
    if (pool <= 0) return { surplus: surplus, buffer: bufferAmt, pool: 0, rows: rows };
    function baseAction(a){ a = a || ''; var k = a.indexOf('_spouse'); return k > 0 ? a.slice(0, k) : a; }
    function lvlOf(a){ var l = _ACTION_LEVEL[baseAction(a)]; return l != null ? l : 3; }
    function wt(l){ return l === 1 ? 50 : l === 2 ? 25 : l === 3 ? 15 : 10; }
    // map flags → distinct concerns (dedup self/spouse + repeats), highest priority (lowest level) first
    var seen = {}, leveled = [];
    (ctx.flags || []).forEach(function(f){
      if (!f || !f.action) return;
      var base = baseAction(f.action);
      if (seen[base]) return;
      seen[base] = 1;
      leveled.push({ id: base, level: lvlOf(f.action), title: ((f.title || '').split(':')[0] || base), icon: f.icon || '•' });
    });
    leveled.sort(function(a, b){ return a.level - b.level; });
    var top = leveled.slice(0, maxRows);
    if (!top.length){
      rows.push({ label: 'Additional savings & investing', amt: pool, level: 4, icon: '📈', flagId: '_extra' });
      return { surplus: surplus, buffer: bufferAmt, pool: pool, rows: rows };
    }
    var totalWeight = 0; top.forEach(function(f){ totalWeight += wt(f.level); });
    var assigned = 0;
    top.forEach(function(f){
      var slice = Math.round(pool * (wt(f.level) / Math.max(1, totalWeight)));
      if (slice <= 0) return;
      assigned += slice;
      rows.push({ label: f.title, amt: slice, level: f.level, icon: f.icon, flagId: f.id });
    });
    var leftover = pool - assigned;
    if (leftover > 10) rows.push({ label: 'Additional savings & investing', amt: leftover, level: 4, icon: '📈', flagId: '_extra' });
    return { surplus: surplus, buffer: bufferAmt, pool: pool, rows: rows };
  }
  // ── M5.4 — canonical RECOMMENDATION type + status vocabulary. PURE (the 5b firewall): every fn reads only
  // its args, never S/CPLAN/computeCalcs, and returns NEW values (no mutation). ONE Recommendation shape feeds
  // the unified card across sources (ai | behavioral | advisor). STATUS is the 4-value set the live
  // advisor_recommendations DB CHECK enforces (pending/in_progress/completed/dismissed — verified against the
  // live DB; the in-repo schema doc block is STALE) — so a normalized status is ALSO always a valid DB value;
  // _recsNormalizeStatus folds the scattered legacy labels onto it. The advisor DE pipeline is detected→drafted→
  // proposed→agreed→submitted→implemented→active: agreed/submitted (post-agreement, in-flight) → in_progress;
  // implemented/active → completed; detected/drafted/proposed (pre-agreement) → pending.
  var _RECS_STATUS = { PENDING: 'pending', IN_PROGRESS: 'in_progress', COMPLETED: 'completed', DISMISSED: 'dismissed' };
  function _recsNormalizeStatus(s) {
    s = (s == null ? '' : String(s)).toLowerCase();
    if (s === 'in_progress' || s === 'agreed' || s === 'submitted' || s === 'approved' || s === 'accepted' || s === 'modified' || s === 'started' || s === 'reviewed') return 'in_progress';
    if (s === 'completed' || s === 'complete' || s === 'implemented' || s === 'active' || s === 'done' || s === 'funded') return 'completed';
    if (s === 'dismissed' || s === 'rejected' || s === 'declined' || s === 'deferred' || s === 'denied' || s === 'cancelled') return 'dismissed';
    return 'pending';   // pending / drafted / draft / suggested / new / sent / viewed / '' → pending
  }
  function _recsClone(o) { var c = {}, k; for (k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) c[k] = o[k]; } return c; }
  // Recommendation factory. Minimal canonical shape; impactForecast is a placeholder M5.6 fills. created/updatedAt
  // default to 0 so make() is deterministic (the caller stamps the browser timestamp). id defaults to a stable
  // source:issue key so re-running a producer upserts in place instead of duplicating.
  function _recsMake(f) {
    f = f || {};
    var src = f.source || 'behavioral';
    var id = f.id || (src + ':' + (f.addressesIssueId || f.allocationRef || f.key || ''));
    return {
      id: id,
      source: src,                                                   // ai | behavioral | advisor
      addressesIssueId: (f.addressesIssueId != null ? f.addressesIssueId : null),
      allocationRef: (f.allocationRef != null ? f.allocationRef : null),
      status: _recsNormalizeStatus(f.status || _RECS_STATUS.PENDING),
      impactForecast: (f.impactForecast != null ? f.impactForecast : null),   // {metric,before,after,deltaText}|null (M5.6)
      title: f.title || '',                                          // optional display text (behavioral carries its own)
      created: f.created || 0,
      updatedAt: f.updatedAt || 0
    };
  }
  function _recsFind(recs, id) { if (!recs || !recs.length) return null; for (var i = 0; i < recs.length; i++) { if (recs[i] && recs[i].id === id) return recs[i]; } return null; }
  function _recsUpsert(recs, rec) {
    recs = (recs && recs.slice) ? recs.slice() : [];
    if (!rec || !rec.id) return recs;
    for (var i = 0; i < recs.length; i++) { if (recs[i] && recs[i].id === rec.id) { recs[i] = rec; return recs; } }
    recs.push(rec); return recs;
  }
  function _recsSetStatus(recs, id, status, ts) {
    recs = (recs && recs.slice) ? recs.slice() : [];
    var st = _recsNormalizeStatus(status);
    for (var i = 0; i < recs.length; i++) { if (recs[i] && recs[i].id === id) { var c = _recsClone(recs[i]); c.status = st; if (ts) c.updatedAt = ts; recs[i] = c; break; } }
    return recs;
  }
  // ── M5.4 U2 — stable ISSUE IDENTITY. An issue's id = its base concern, made stable + collision-free:
  // protection fires for multiple sub-flavors (life/disability/LTC/umbrella) sharing action='protection', so it
  // is discriminated by a title keyword (funding life insurance must NOT suppress the disability issue); every
  // other concern uses its base action — will/POA/beneficiary (all action 'estate') collapse to one 'estate' id
  // matching today's estate card; estate_tax keeps its OWN id (a distinct action + L4 concern — trusts/gifting is
  // not a basic will, so completing basic estate docs never hides estate-tax exposure; the plan card's type-dedup
  // folds it into the estate card regardless, so the distinct id has no plan-card effect either way).
  // Self vs spouse is derived from owner (or a trailing _spouse on the action) so they never cross-suppress. PURE:
  // reads only its arg. Callable with a RAW detector flag (suffixed action) OR a STAGED card (stripped action +
  // owner) — both yield the same id.
  function _issueId(f) {
    if (!f) return '';
    var a = String(f.action || '');
    var base = a.replace(/_spouse$/, '');
    var sp = (f.owner === 'spouse') || /_spouse$/.test(a);
    var id;
    if (base.indexOf('protection') === 0) {
      var t = String(f.title || '').toLowerCase(), d = 'other';
      if (t.indexOf('disab') >= 0) d = 'disability';
      else if (t.indexOf('ltc') >= 0 || t.indexOf('long-term care') >= 0 || t.indexOf('long term care') >= 0) d = 'ltc';
      else if (t.indexOf('umbrella') >= 0) d = 'umbrella';
      else if (t.indexOf('life') >= 0) d = 'life';
      id = base + ':' + d;
    } else {
      id = base;
    }
    return sp ? (id + ':spouse') : id;
  }
  g.PFOSIssues = g.PFOSIssues || {};
  g.PFOSIssues.detect = _issuesDetect;
  g.PFOSIssues.toCp = _issuesToCp;   // identity pass-through (per-shell transform seam)
  g.PFOSIssues.rank = _issuesRank;   // canonical engine-exact priority sort over {action,type} flags (M5.2a)
  g.PFOSIssues.rankCards = _issuesRankCards;   // rank unassigned plan cards by flagAction/flagType; goals trail (M5.2b)
  g.PFOSIssues.spouseVisible = _spouseVisibleSelfServe;   // self-serve portal household-aware spouse-issue visibility (M5.2b-2)
  g.PFOSIssues.issueId = _issueId;   // M5.4 U2 — stable issue identity for addressesIssueId linkage + funded-state suppression
  g.PFOSHealth = g.PFOSHealth || {};   // canonical financial-health scorer (7-category)
  g.PFOSImpact = g.PFOSImpact || {};   // canonical $-impact / cascade-bridge forecaster
  g.PFOSImpact.allocate = _impactAllocate;   // M5.3a — pure surplus → buffer + level-weighted tier split (rough-guide teaser)
  g.PFOSRecs   = g.PFOSRecs   || {};   // canonical Recommendation type + lifecycle
  g.PFOSRecs.STATUS = _RECS_STATUS;                 // M5.4 — canonical 4-value status (DB-CHECK-aligned)
  g.PFOSRecs.normalizeStatus = _recsNormalizeStatus;   // fold legacy labels (drafted/agreed/implemented/...) → canonical
  g.PFOSRecs.make = _recsMake;                      // Recommendation factory (minimal shape)
  g.PFOSRecs.find = _recsFind;                      // find by id (pure)
  g.PFOSRecs.upsert = _recsUpsert;                  // replace-by-id or append; returns a NEW array (pure)
  g.PFOSRecs.setStatus = _recsSetStatus;            // normalized status change; returns a NEW array (pure)
  g.PFOS_FLAGS = g.PFOS_FLAGS || {};   // dark-launch bag — each M5 sub-section gates here; default OFF = byte-identical
  g.PFOSShared.PFOSIssues = g.PFOSIssues;
  g.PFOSShared.PFOSHealth = g.PFOSHealth;
  g.PFOSShared.PFOSImpact = g.PFOSImpact;
  g.PFOSShared.PFOSRecs   = g.PFOSRecs;
  g.PFOSShared.PFOS_FLAGS = g.PFOS_FLAGS;
})(typeof window !== 'undefined' ? window : this);
