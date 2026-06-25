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

    // ── Spouse pass — PROFILE-ONLY (ctx.spouse). Same call site + try/catch as source. ──
    if(ctx.spouse&&(ctx.spouse.householdType==='joint'||ctx.spouse.householdType==='hybrid'||ctx.spouse.householdType==='separate')){
      try{ ctx.spouse.run(flags, rawS2, d); }catch(_sf){console.warn('Spouse flags (cards):',_sf); }
    }

    return flags;
}
  function _issuesToCp(issue){ return issue; }
  g.PFOSIssues = g.PFOSIssues || {};
  g.PFOSIssues.detect = _issuesDetect;
  g.PFOSIssues.toCp = _issuesToCp;   // canonical red-flag / "what to do next" detector + ranking
  g.PFOSHealth = g.PFOSHealth || {};   // canonical financial-health scorer (7-category)
  g.PFOSImpact = g.PFOSImpact || {};   // canonical $-impact / cascade-bridge forecaster
  g.PFOSRecs   = g.PFOSRecs   || {};   // canonical Recommendation type + lifecycle
  g.PFOS_FLAGS = g.PFOS_FLAGS || {};   // dark-launch bag — each M5 sub-section gates here; default OFF = byte-identical
  g.PFOSShared.PFOSIssues = g.PFOSIssues;
  g.PFOSShared.PFOSHealth = g.PFOSHealth;
  g.PFOSShared.PFOSImpact = g.PFOSImpact;
  g.PFOSShared.PFOSRecs   = g.PFOSRecs;
  g.PFOSShared.PFOS_FLAGS = g.PFOS_FLAGS;
})(typeof window !== 'undefined' ? window : this);
