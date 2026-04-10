/* ═══════════════════════════════════════════════════════
   PFOS WALKTHROUGH ENGINE v1.0
   Standalone guided tour for all PFOS pages
   Add via: <script src="/pfos-walkthrough.js" defer></script>
   ═══════════════════════════════════════════════════════ */
(function(){
'use strict';

// ── Prevent double initialization (script loaded twice on same page) ──
if(window._wtInitialized) return;
window._wtInitialized = true;

// ── CONFIG ──
var WT_VERSION = '1.0';
var WT_STORAGE_KEY = 'pfos_wt_';
var WT_DELAY = 1500; // ms after page load before showing

// ── STATE ──
var currentPage = '';
var currentRole = '';
var currentStep = 0;
var steps = [];
var isMobile = window.innerWidth < 768;
var overlay, tooltip, spotlight;

// ── DETECT PAGE & ROLE ──
function detectContext(){
  var path = window.location.pathname;
  if(path.indexOf('pfos-main') >= 0) currentPage = 'main';
  else if(path.indexOf('pfos-dashboard') >= 0) currentPage = 'dashboard';
  else if(path.indexOf('pfos-client-profile') >= 0) currentPage = 'client-profile';
  else if(path.indexOf('pfos-client') >= 0) currentPage = 'client';
  else return false;

  // Detect role from page globals
  setTimeout(function(){
    if(currentPage === 'main'){
      if(window.S && window.S.mode === 'advisor') currentRole = 'advisor';
      else if(window.S && window.S.mode === 'client' && window.S.clientType === 'advisory') currentRole = 'client-advisor';
      else currentRole = 'client-solo';
    } else if(currentPage === 'dashboard' || currentPage === 'client-profile'){
      currentRole = 'advisor';
    } else if(currentPage === 'client'){
      currentRole = 'client';
    }
    initWalkthrough();
  }, WT_DELAY);
  return true;
}

// ── COMPLETION STATE ──
function getKey(){ return WT_STORAGE_KEY + currentPage + '_' + currentRole + '_v' + WT_VERSION; }

function isCompleted(){
  try{ return localStorage.getItem(getKey()) === 'done'; }catch(e){ return false; }
}
function markCompleted(){
  try{ localStorage.setItem(getKey(), 'done'); }catch(e){}
  // Also save to Supabase if available
  try{
    if(window.db && window.APP && window.APP.userId){
      var key = 'walkthrough_' + currentPage + '_' + currentRole;
      window.db.from('client_profiles').select('id').limit(1).then(function(){
        // Just verify db works, actual save is best-effort
      });
    }
  }catch(e){}
}
function resetCompletion(){
  try{ localStorage.removeItem(getKey()); }catch(e){}
}

// ── INIT ──
function initWalkthrough(){
  // If running inside an iframe (PFOS embedded in client portal or dashboard),
  // don't show the walkthrough — the parent page handles its own walkthrough
  if(window.self !== window.top){
    return; // In iframe — skip entirely to avoid double banner + double ❓
  }

  steps = getSteps(currentPage, currentRole);
  if(!steps || !steps.length) return;

  injectCSS();
  addReplayButton();

  if(!isCompleted()){
    showReminderBanner();
  }
}

// ── START TOUR ──
function startTour(){
  hideReminderBanner();
  currentStep = 0;
  steps = getSteps(currentPage, currentRole);
  if(!steps.length) return;
  createOverlay();
  showStep(0);
}

// ── CREATE OVERLAY ──
function createOverlay(){
  // Remove existing
  var old = document.getElementById('wt-spotlight');if(old)old.remove();
  var old2 = document.getElementById('wt-tooltip');if(old2)old2.remove();

  spotlight = null; // No separate spotlight — we style the target directly

  tooltip = document.createElement('div');
  tooltip.id = 'wt-tooltip';
  document.body.appendChild(tooltip);
}

// ── SHOW STEP ──
function showStep(idx){
  if(idx < 0 || idx >= steps.length){ endTour(); return; }
  currentStep = idx;
  var step = steps[idx];

  // Pre-action (e.g. navigate to a section)
  // Remove highlight from previous target
  var prevHighlight = document.querySelector('[data-wt-highlight]');
  if(prevHighlight){
    prevHighlight.removeAttribute('data-wt-highlight');
    prevHighlight.style.outline = '';
    prevHighlight.style.outlineOffset = '';
    prevHighlight.style.boxShadow = '';
    prevHighlight.style.zIndex = '';
  }

  if(step.before) step.before();

  // Small delay to let DOM update
  setTimeout(function(){
    var target = step.target && step.target !== 'center' ? document.querySelector(step.target) : null;

    // Skip if target element doesn't exist
    if(step.target && step.target !== 'center' && !target){
      if(idx < steps.length - 1){ showStep(idx + 1); return; }
      else { endTour(); return; }
    }

    // Position spotlight
    if(target && step.target !== 'center'){
      var rect = target.getBoundingClientRect();
      // Highlight the target directly
      target.setAttribute('data-wt-highlight','1');
      target.style.outline = '2px solid #5B9BFF';
      target.style.outlineOffset = '3px';
      target.style.boxShadow = '0 0 20px rgba(91,155,255,.4), 0 0 40px rgba(91,155,255,.15)';
      // Don't change position on fixed elements (like the ? button)
      var computedPos = window.getComputedStyle(target).position;
      if(computedPos !== 'fixed' && computedPos !== 'absolute'){
        target.style.position = 'relative';
      }
      target.style.zIndex = '100000';
      // Scroll into view if needed
      if(rect.top < 0 || rect.bottom > window.innerHeight){
        target.scrollIntoView({behavior:'smooth',block:'center'});
        setTimeout(function(){ positionTooltip(target, step); }, 400);
        return;
      }
    } else {
      // No spotlight for center steps
    }

    positionTooltip(target, step);
  }, step.delay || 300);
}

// ── POSITION TOOLTIP ──
function positionTooltip(target, step){
  var isCenter = !target || step.target === 'center';
  var total = steps.length;
  var idx = currentStep;

  var h = '<button class="wt-close" onclick="window._wtSkip()">✕</button>';
  h += '<div class="wt-step-count">Step '+(idx+1)+' of '+total+'</div>';
  if(step.icon) h += '<div class="wt-icon">'+step.icon+'</div>';
  h += '<div class="wt-title">'+step.title+'</div>';
  h += '<div class="wt-body">'+step.body+'</div>';
  h += '<div class="wt-progress"><div class="wt-progress-bar" style="width:'+Math.round((idx+1)/total*100)+'%"></div></div>';
  h += '<div class="wt-buttons">';
  if(idx > 0) h += '<button class="wt-btn wt-btn-ghost" onclick="window._wtPrev()">← Back</button>';
  h += '<button class="wt-btn wt-btn-skip" onclick="window._wtSkip()">Skip Tour</button>';
  if(idx < total - 1) h += '<button class="wt-btn wt-btn-next" onclick="window._wtNext()">Next →</button>';
  else h += '<button class="wt-btn wt-btn-next" onclick="window._wtEnd()">✓ Done!</button>';
  h += '</div>';

  tooltip.innerHTML = h;

  // Always use fixed positioning so tooltip is relative to viewport
  var tw = Math.min(380, window.innerWidth - 32);

  if(isCenter){
    tooltip.style.cssText = 'display:block;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:'+tw+'px;z-index:100001';
    return;
  }

  var rect = target.getBoundingClientRect();

  // Default: position to the right of the target
  var top = Math.max(20, rect.top + rect.height/2 - 100);
  var left = rect.right + 16;

  // If not enough room on right, try left
  if(left + tw > window.innerWidth - 16){
    left = rect.left - tw - 16;
  }

  // If not enough room on left either, position below
  if(left < 16){
    left = Math.max(16, rect.left);
    top = rect.bottom + 12;
  }

  // Clamp to viewport
  if(top + 300 > window.innerHeight) top = Math.max(20, window.innerHeight - 320);
  if(top < 20) top = 20;
  if(left < 16) left = 16;
  if(left + tw > window.innerWidth - 16) left = window.innerWidth - tw - 16;

  tooltip.style.cssText = 'display:block;position:fixed;top:'+top+'px;left:'+left+'px;width:'+tw+'px;z-index:100001';
}

// ── NAVIGATION ──
window._wtNext = function(){ showStep(currentStep + 1); };
window._wtPrev = function(){ showStep(currentStep - 1); };
window._wtSkip = function(){ endTour(); markCompleted(); };
window._wtEnd = function(){ endTour(); markCompleted(); };
window._wtStart = startTour;
window._wtReset = function(){ resetCompletion(); startTour(); };
window._wtHide = function(){ endTour(); hideReminderBanner(); var r=document.getElementById('wt-replay');if(r)r.style.display='none'; };
window._wtMarkDone = markCompleted;

function endTour(){
  var t = document.getElementById('wt-tooltip');if(t)t.remove();
  var prevHighlight = document.querySelector('[data-wt-highlight]');
  if(prevHighlight){
    prevHighlight.removeAttribute('data-wt-highlight');
    prevHighlight.style.outline = '';
    prevHighlight.style.outlineOffset = '';
    prevHighlight.style.boxShadow = '';
    prevHighlight.style.zIndex = '';
  }
}

// ── REMINDER BANNER ──
function showReminderBanner(){
  if(document.getElementById('wt-reminder')) return;
  var banner = document.createElement('div');
  banner.id = 'wt-reminder';
  banner.innerHTML = '<div style="display:flex;align-items:center;gap:12px;max-width:600px;margin:0 auto">'
    +'<span style="font-size:20px">📖</span>'
    +'<div style="flex:1"><strong>Take the guided tour</strong> to learn how to use this page</div>'
    +'<button onclick="window._wtStart()" style="padding:7px 16px;background:linear-gradient(135deg,#F97316,#EA580C);border:none;border-radius:4px;color:#fff;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;white-space:nowrap">Start Tour</button>'
    +'<button onclick="this.parentElement.parentElement.remove();if(window._wtMarkDone)window._wtMarkDone();" style="background:none;border:none;color:#64748B;font-size:16px;cursor:pointer">✕</button>'
    +'</div>';
  document.body.appendChild(banner);
}
function hideReminderBanner(){
  var el = document.getElementById('wt-reminder');
  if(el) el.remove();
}

// ── REPLAY BUTTON ──
function addReplayButton(){
  if(document.getElementById('wt-replay')) return;
  var btn = document.createElement('button');
  btn.id = 'wt-replay';
  btn.title = 'Help & guided tour';
  btn.innerHTML = '❓';
  btn.onclick = function(){ showContextHelp(); };
  document.body.appendChild(btn);
}

// ── CONTEXT HELP SYSTEM ──
function showContextHelp(){
  var tips = getContextTips();
  if(!tips) { window._wtReset(); return; }

  var old = document.getElementById('wt-context-help');
  if(old){ old.remove(); return; }

  var panel = document.createElement('div');
  panel.id = 'wt-context-help';
  var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
  h += '<div style="font-family:Rajdhani,sans-serif;font-size:14px;font-weight:700;color:#F0F6FF">'+tips.icon+' '+tips.title+'</div>';
  h += '<button onclick="document.getElementById(\'wt-context-help\').remove()" style="background:none;border:none;color:#64748B;font-size:18px;cursor:pointer">✕</button>';
  h += '</div>';
  for(var i=0;i<tips.items.length;i++){
    var t = tips.items[i];
    h += '<div style="padding:10px 12px;background:rgba(0,68,191,.06);border:1px solid rgba(91,155,255,.12);border-radius:4px;margin-bottom:6px">';
    h += '<div style="font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;color:#5B9BFF;margin-bottom:3px">'+t.tip+'</div>';
    h += '<div style="font-size:12px;color:rgba(240,246,255,.65);line-height:1.5">'+t.detail+'</div>';
    h += '</div>';
  }
  h += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(91,155,255,.1)">';
  h += '<button onclick="document.getElementById(\'wt-context-help\').remove();window._wtReset();" style="width:100%;padding:9px;background:rgba(0,68,191,.1);border:1px solid rgba(91,155,255,.2);border-radius:4px;color:#5B9BFF;font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer">🔄 Replay Full Page Tour</button>';
  h += '</div>';
  panel.innerHTML = h;
  document.body.appendChild(panel);
}

function getContextTips(){
  if(currentPage === 'main') return getMainContextTips();
  if(currentPage === 'dashboard') return getDashContextTips();
  if(currentPage === 'client-profile') return getCPContextTips();
  if(currentPage === 'client') return getPortalContextTips();
  return null;
}

function getMainContextTips(){
  // Check if calculator modal is open
  var calcModal = document.getElementById('insuranceCalcModal');
  if(calcModal && calcModal.style.display !== 'none' && calcModal.style.display !== ''){
    return {icon:'🧮',title:'Calculator Help',items:[
      {tip:'Enter your values',detail:'Type numbers into the input fields. The calculator updates automatically as you change values.'},
      {tip:'For Someone Else',detail:'Click "For Someone Else" at the top to run this calculator with custom profile values for another person.'},
      {tip:'Apply & Recalculate',detail:'After entering custom profile values, click "Apply & Recalculate" to update the results.'},
      {tip:'Share Results',detail:'Use the Share Results button at the bottom to copy or share your calculation.'},
      {tip:'Request Consultation',detail:'Click "Request Free Consultation" to connect with an advisor about these results.'},
    ]};
  }

  // Check which section is active
  var secHome = document.getElementById('secHome');
  var secFin = document.getElementById('secFinances');
  var secPlan = document.getElementById('secPlan');
  var secTools = document.getElementById('secTools');
  var secReports = document.getElementById('secReports');

  if(secHome && secHome.classList.contains('active')){
    return {icon:'🏠',title:'Home Dashboard Help',items:[
      {tip:'Financial Scores',detail:'Your 4 scores (Cash Flow, Protection, Growth, Efficiency) rate you 1-10. They update automatically as you enter data.'},
      {tip:'Monthly Cash Flow',detail:'Shows income minus expenses. Green means surplus, red means deficit.'},
      {tip:'Smart Alerts',detail:'Yellow and red alerts highlight issues that need attention — like low emergency funds or insurance gaps.'},
      {tip:'Key Metrics',detail:'Net worth, savings rate, and DTI ratio give you a quick health check.'},
    ]};
  }

  if(secFin && secFin.classList.contains('active')){
    // Check if a panel is open
    var activePanel = document.querySelector('.panel.active');
    if(activePanel){
      return {icon:'💰',title:'Entering Financial Data',items:[
        {tip:'Fill in the fields',detail:'Enter your real numbers. Every field updates your scores and projections immediately.'},
        {tip:'Save automatically',detail:'Your data saves as you go. No save button needed for individual fields.'},
        {tip:'Use the navigation',detail:'Click the step buttons at the top to move between sections, or click the back arrow.'},
        {tip:'Skip sections',detail:'You don\'t have to fill everything at once. Come back anytime to add more data.'},
      ]};
    }
    return {icon:'💰',title:'My Finances Help',items:[
      {tip:'Click any card',detail:'Each card represents a financial category. Click to expand and enter your data.'},
      {tip:'Start with Income & Expenses',detail:'These two give the biggest impact on your scores. Start here.'},
      {tip:'Green checkmarks',detail:'A green ✓ means that section has data. Fill in all sections for the most accurate picture.'},
      {tip:'Setup badges',detail:'Orange "SETUP" badges indicate sections that need attention.'},
    ]};
  }

  if(secPlan && secPlan.classList.contains('active')){
    return {icon:'📋',title:'My Plan Help',items:[
      {tip:'Recommendations',detail:'Each recommendation has a status — from draft through implementation. Track your progress here.'},
      {tip:'Implementation',detail:'Click a recommendation to see details, mark it as implemented, or discuss with your advisor.'},
      {tip:'AI Suggestions',detail:'The system analyzes your data and suggests prioritized actions you can take.'},
    ]};
  }

  if(secTools && secTools.classList.contains('active')){
    return {icon:'🔧',title:'Financial Tools Help',items:[
      {tip:'Search calculators',detail:'Use the search bar at the top to find any calculator by name or keyword.'},
      {tip:'93 calculators',detail:'Organized into 13 categories: Quick Tools, Loans, Debt, Student Loans, Investment, Insurance, Retirement, Tax, Estate, Life Events, Behavioral, Specialty, and Assessments.'},
      {tip:'Pre-filled data',detail:'Calculators automatically use your profile data. Change any value to see different scenarios.'},
      {tip:'For Someone Else',detail:'Click "For Someone Else" to run any calculator with custom values for another person.'},
    ]};
  }

  if(secReports && secReports.classList.contains('active')){
    return {icon:'📄',title:'Reports Help',items:[
      {tip:'Generate Report',detail:'Click "Generate Report" to create a comprehensive financial report with your current data.'},
      {tip:'Print or Save',detail:'Reports can be printed directly or saved as PDF.'},
      {tip:'Share with Advisor',detail:'Your advisor can see all generated reports in your client profile.'},
    ]};
  }

  return null;
}

function getDashContextTips(){
  var activePg = document.querySelector('.pg.active');
  var pgId = activePg ? activePg.id : '';

  if(pgId === 'pg-advisory-clients' || pgId === 'pg-all-clients' || pgId === 'pg-product-clients'){
    return {icon:'👥',title:'Client List Help',items:[
      {tip:'Click any client',detail:'Opens their detailed profile with financial data, recommendations, and session history.'},
      {tip:'Status column',detail:'New, Active, Review Due, Advisory, or Sold. Click the dropdown to change status.'},
      {tip:'Health scores',detail:'Shows each client\'s overall financial health score based on their data.'},
      {tip:'Search',detail:'Use the search bar to quickly find clients by name or email.'},
    ]};
  }

  if(pgId === 'pg-agent-tools'){
    return {icon:'🧰',title:'Financial Tools Help',items:[
      {tip:'Select a client first',detail:'Use the "Run for" dropdown to select a client. Their data pre-fills every calculator.'},
      {tip:'Manual mode',detail:'Leave the dropdown on "Manual Input" to enter custom values for any scenario.'},
      {tip:'Save as recommendation',detail:'After running a calculator with a client selected, scroll down to save the results as a recommendation.'},
      {tip:'Search',detail:'Use the search bar to filter across all 93 calculators.'},
    ]};
  }

  if(pgId === 'pg-priority'){
    return {icon:'🎯',title:'Priority Dashboard Help',items:[
      {tip:'Urgency ranking',detail:'Clients are ranked by urgency — overdue reviews, missing data, and low health scores push them higher.'},
      {tip:'Color coding',detail:'Red = urgent action needed. Orange = attention soon. Green = on track.'},
      {tip:'Click to open',detail:'Click any client to go directly to their profile.'},
    ]};
  }

  if(pgId === 'pg-rec-pipeline'){
    return {icon:'🔄',title:'Rec Pipeline Help',items:[
      {tip:'Status workflow',detail:'Recommendations flow: Draft → Pending → Proposed → Agreed → Submitted → Active → Implemented.'},
      {tip:'Compliance rate',detail:'Shows the percentage of recommendations that have been fully implemented.'},
      {tip:'Starter packs',detail:'Use bulk templates to quickly add common recommendation sets for new clients.'},
      {tip:'Effectiveness',detail:'90-day tracking shows whether implemented recommendations are actually improving the client\'s situation.'},
    ]};
  }

  if(pgId === 'pg-dashboard'){
    return {icon:'📊',title:'Dashboard Help',items:[
      {tip:'Client stats',detail:'Total clients, active, review due, and overdue at a glance.'},
      {tip:'Upcoming reviews',detail:'Shows clients with reviews scheduled in the next 30 days.'},
      {tip:'Follow-up reminders',detail:'Reminders you\'ve set for specific clients appear here.'},
      {tip:'Quick search',detail:'Start typing a client name to find them instantly.'},
    ]};
  }

  return null;
}

function getCPContextTips(){
  return {icon:'👤',title:'Client Profile Help',items:[
    {tip:'Open PFOS',detail:'Click "Open / Edit in PFOS" to launch the full planning tool with this client\'s data loaded.'},
    {tip:'Add Recommendations',detail:'Click "+ Add Recommendation" or use "AI Suggest" to generate recommendations automatically.'},
    {tip:'Session Notes',detail:'Log notes after each meeting. They\'re saved to the client\'s history.'},
    {tip:'Progress Report',detail:'Generate a report showing score changes, implemented recommendations, and financial trajectory.'},
    {tip:'Save to Client',detail:'After editing in PFOS, click "Save to Client" to push all changes to their profile.'},
  ]};
}

function getPortalContextTips(){
  var activePg = document.querySelector('.cpg.active,.client-page.active,[class*="client-pg"].active');
  // Check sidebar active item
  var activeNav = document.querySelector('.sb-item.active');
  var navText = activeNav ? activeNav.textContent.trim() : '';

  if(navText.indexOf('Financial Data') >= 0 || navText.indexOf('PFOS') >= 0){
    return {icon:'⚡',title:'Financial Data Help',items:[
      {tip:'Enter your data',detail:'Click any category card to expand it and enter your financial information.'},
      {tip:'Start with basics',detail:'Income and Expenses are the foundation. Fill these first for the biggest impact on your scores.'},
      {tip:'Auto-save',detail:'Your data saves automatically as you enter it.'},
      {tip:'Scores update live',detail:'As you add data, your 4 financial scores recalculate in real time.'},
    ]};
  }

  if(navText.indexOf('Tools') >= 0){
    return {icon:'🧰',title:'Financial Tools Help',items:[
      {tip:'Search',detail:'Use the search bar to find any of the 93 calculators by name.'},
      {tip:'Your data pre-fills',detail:'Calculators use your profile data automatically for personalized results.'},
      {tip:'For Someone Else',detail:'Click "For Someone Else" to run a calculator with custom values for another person.'},
    ]};
  }

  if(navText.indexOf('Messages') >= 0){
    return {icon:'💬',title:'Messages Help',items:[
      {tip:'Send a message',detail:'Type your message and click Send to communicate with your advisor.'},
      {tip:'Advisor response',detail:'Your advisor will see your message in their dashboard and respond.'},
    ]};
  }

  return {icon:'📊',title:'Portal Help',items:[
    {tip:'Overview',detail:'Your main dashboard shows your 4 financial health scores and key metrics.'},
    {tip:'Navigation',detail:'Use the sidebar to access different sections — Financial Data, Tools, Reports, Messages, and more.'},
    {tip:'Request Advisor',detail:'Don\'t have an advisor? You can request a consultation from within the platform anytime.'},
  ]};
}

// ── CSS ──
function injectCSS(){
  if(document.getElementById('wt-styles')) return;
  var style = document.createElement('style');
  style.id = 'wt-styles';
  style.textContent = ''
    +'#wt-overlay{position:fixed;inset:0;z-index:99999;pointer-events:none}'
    
    +'#wt-tooltip{position:absolute;background:linear-gradient(145deg,#111142,#0C0C34);border:1px solid rgba(91,155,255,.35);border-radius:8px;padding:20px;z-index:100001;pointer-events:auto;box-shadow:0 12px 40px rgba(0,0,0,.7);max-width:420px}'
    +'.wt-close{position:absolute;top:10px;right:12px;background:none;border:none;color:#64748B;font-size:18px;cursor:pointer;padding:4px;z-index:1}.wt-close:hover{color:#F0F6FF}'
    +'.wt-step-count{font-family:Rajdhani,sans-serif;font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#5B9BFF;margin-bottom:8px}'
    +'.wt-icon{font-size:32px;margin-bottom:8px}'
    +'.wt-title{font-family:Rajdhani,sans-serif;font-size:16px;font-weight:700;color:#F0F6FF;margin-bottom:6px}'
    +'.wt-body{font-size:13px;color:rgba(240,246,255,.7);line-height:1.6;margin-bottom:14px}'
    +'.wt-progress{height:3px;background:rgba(0,68,191,.15);border-radius:2px;margin-bottom:14px}'
    +'.wt-progress-bar{height:100%;background:linear-gradient(90deg,#5B9BFF,#F97316);border-radius:2px;transition:width .3s}'
    +'.wt-buttons{display:flex;gap:8px;align-items:center;flex-wrap:wrap}'
    +'.wt-btn{font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:8px 16px;border-radius:4px;cursor:pointer;border:none;transition:all .15s}'
    +'.wt-btn-next{background:linear-gradient(135deg,#F97316,#EA580C);color:#fff;margin-left:auto}'
    +'.wt-btn-next:hover{opacity:.9}'
    +'.wt-btn-ghost{background:rgba(91,155,255,.1);border:1px solid rgba(91,155,255,.25);color:#5B9BFF}'
    +'.wt-btn-skip{background:none;color:#64748B;font-size:10px;padding:8px 10px}'
    +'.wt-btn-skip:hover{color:#F0F6FF}'
    +'#wt-reminder{position:fixed;top:0;left:0;right:0;z-index:99990;background:linear-gradient(135deg,rgba(0,68,191,.15),rgba(14,14,56,.98));border-bottom:1px solid rgba(91,155,255,.2);padding:12px 20px;font-size:13px;color:#F0F6FF;backdrop-filter:blur(12px)}'
    +'#wt-replay{position:fixed;bottom:80px;right:16px;z-index:9990;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#0044BF,#1155D9);border:1px solid rgba(91,155,255,.3);color:#fff;font-size:18px;cursor:pointer;box-shadow:0 4px 16px rgba(0,68,191,.3);display:flex;align-items:center;justify-content:center;transition:transform .15s}'
    +'#wt-replay:hover{transform:scale(1.1)}'
    +'#wt-context-help{position:fixed;bottom:80px;right:16px;z-index:99998;width:340px;max-width:calc(100vw - 32px);max-height:70vh;overflow-y:auto;background:linear-gradient(145deg,#111142,#0C0C34);border:1px solid rgba(91,155,255,.25);border-radius:8px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.5)}'
    +'@media(max-width:767px){#wt-tooltip{max-width:calc(100vw - 32px);padding:16px}#wt-replay{bottom:140px}#wt-context-help{bottom:140px;right:8px;width:calc(100vw - 16px)}}'
    +'@media(max-width:767px){#wt-tooltip{max-width:calc(100vw - 32px);padding:16px}#wt-replay{bottom:140px}}';
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════
// STEP DEFINITIONS
// ═══════════════════════════════════════════════════════

function getSteps(page, role){
  if(page === 'main') return getMainSteps(role);
  if(page === 'dashboard') return getDashboardSteps();
  if(page === 'client-profile') return getClientProfileSteps();
  if(page === 'client') return getClientPortalSteps(role);
  return [];
}

// ── PFOS MAIN STEPS ──
function getMainSteps(role){
  var s = [];
  var mob = window.innerWidth < 768;
  function nav(sec){ if(typeof showSection==='function') showSection(sec); }

  s.push({
    target:'center', icon:'👋',
    title:'Welcome to PFOS!',
    body: role==='advisor'
      ? 'This is your client\'s Personal Financial Operating System. Let\'s walk through each section.'
      : 'This is your Personal Financial Operating System. Let\'s walk through everything available to you.',
    delay:100
  });

  s.push({
    target:'#navHome', position: mob?'top':'right',
    icon:'🏠', title:'Home — Your Dashboard',
    body:'Your financial snapshot — monthly cash flow, 4 health scores, key metrics, and smart alerts. Updated in real time as you enter data.',
    before: function(){ nav('home'); }
  });

  s.push({
    target:'#navFinances', position: mob?'top':'right',
    icon:'💰', title:'Finances — Enter Your Data',
    body:'Enter everything here — income, expenses, debts, retirement, insurance, and more. <strong>Start with Income and Expenses</strong> for the biggest impact.',
    before: function(){ nav('finances'); }
  });

  s.push({
    target:'#finCardsGrid', position:'top',
    icon:'📋', title:'Financial Categories',
    body:'Each card is a category. Click any card to expand it and enter data. Green checkmarks show completed sections. The more you fill in, the more accurate your scores become.',
    before: function(){ nav('finances'); }
  });

  s.push({
    target:'#navPlan', position: mob?'top':'right',
    icon:'📋', title:'My Plan',
    body: role==='advisor'
      ? 'This client\'s recommendations live here. Create drafts, track implementation, and monitor progress over time.'
      : role==='client-advisor'
      ? 'Your advisor\'s personalized recommendations. Track what\'s been implemented and what\'s coming next.'
      : 'AI-powered recommendations based on your data — no advisor required. Request one anytime for professional guidance.',
    before: function(){ nav('plan'); }
  });

  s.push({
    target:'#navTools', position: mob?'top':'right',
    icon:'🔧', title:'93 Financial Calculators',
    body:'Every financial question has a calculator — affordability, loans, retirement, insurance, student loans, tax strategy, behavioral finance, and more. All personalized with your data.',
    before: function(){ nav('tools'); }
  });

  if(role !== 'advisor'){
    s.push({
      target:'center', icon:'👥',
      title:'"For Someone Else" Mode',
      body:'Every calculator has a <strong>For Someone Else</strong> button. Enter someone else\'s details, click Apply, and the calculator recalculates with their profile. Great for helping family or friends.'
    });
  }

  s.push({
    target:'#navReports', position: mob?'top':'right',
    icon:'📄', title:'Reports',
    body:'Generate comprehensive financial reports you can save, print, or share. Includes scores, projections, and recommended actions.',
    before: function(){ nav('reports'); }
  });

  if(role === 'advisor'){
    s.push({
      target:'.hdr-mode', position:'bottom',
      icon:'⚙️', title:'Advisor Controls',
      body:'<strong>Switch</strong> toggles between advisor and client view. Use <strong>Save to Client</strong> to save changes, and <strong>Generate Report</strong> to create a downloadable report.',
      before: function(){ nav('home'); }
    });
  }

  s.push({
    target:'#wt-replay', position:'left',
    icon:'❓', title:'Need Help Anytime?',
    body:'This button is always available in the bottom-right corner. Tap it for <strong>instant help</strong> specific to whatever screen you\'re on — whether you\'re inside a calculator, entering data, or viewing reports. It adapts to where you are.'
  });

  s.push({
    target:'#navFinances', position: mob?'top':'right',
    icon:'🎉', title:'You\'re All Set!',
    body:'Start here — enter your <strong>Income</strong> and <strong>Expenses</strong> and everything else builds from there.<br><br>Click <strong>❓</strong> anytime to replay this tour.',
    before: function(){ nav('finances'); }
  });

  return s;
}

// ── DASHBOARD STEPS (placeholder — expand later) ──
function getDashboardSteps(){
  var mob = window.innerWidth < 768;
  function nav(pg){ if(typeof showPage==='function') showPage(pg); }

  return [
    {target:'center',icon:'👋',title:'Welcome to the Advisor Dashboard',body:'Your command center for managing clients, tracking recommendations, and running your practice. Let\'s walk through every tool available to you.',delay:100},
    {target:'#nav-dashboard',position:mob?'bottom':'right',icon:'📊',title:'Dashboard',body:'Your home base — client stats, upcoming reviews, follow-up reminders, and quick search. Everything at a glance.',before:function(){nav('dashboard');}},
    {target:'#nav-advisory-clients',position:mob?'bottom':'right',icon:'👥',title:'Advisory Clients',body:'Your full client list with status, tier, health scores, and compliance tracking. Click any client to open their detailed profile.',before:function(){nav('advisory-clients');}},
    {target:'#nav-new-client',position:mob?'bottom':'right',icon:'➕',title:'Add New Client',body:'Create advisory or product clients. Set their tier, assign an advisor, send portal invitations, and link couples — all from one form.',before:function(){nav('advisory-clients');}},
    {target:'#nav-reviews',position:mob?'bottom':'right',icon:'📅',title:'Reviews',body:'Track all scheduled client reviews. See overdue, upcoming, and completed reviews. Send reminder emails with one click.',before:function(){nav('reviews');}},
    {target:'#nav-priority',position:mob?'bottom':'right',icon:'🎯',title:'Priority Dashboard',body:'Clients ranked by urgency — overdue reviews, missing data, low health scores. Color-coded so you never miss a follow-up.',before:function(){nav('priority');if(typeof renderPriorityDashboard==='function')renderPriorityDashboard();}},
    {target:'#nav-rec-pipeline',position:mob?'bottom':'right',icon:'🔄',title:'Recommendation Pipeline',body:'Track every recommendation from draft to implementation. Compliance rates, effectiveness scoring, and bulk starter packs for new clients.',before:function(){nav('rec-pipeline');if(typeof renderRecPipeline==='function')renderRecPipeline();}},
    {target:'#nav-agent-tools',position:mob?'bottom':'right',icon:'🧰',title:'Financial Tools (93 Calculators)',body:'All 93 calculators with a client selector at the top. Select a client to pre-fill their data, or choose Manual Input to enter a custom profile. Run any calculator, then save the results as a recommendation directly to that client\'s profile — all without leaving this page.',before:function(){nav('agent-tools');}},
    {target:'#nav-leaderboard',position:mob?'bottom':'right',icon:'🏆',title:'Client Leaderboard',body:'See your healthiest clients, top compliance rates, and top savers. Great for identifying success stories and clients who need attention.',before:function(){nav('leaderboard');if(typeof renderClientLeaderboard==='function')renderClientLeaderboard();}},
    {target:'#nav-my-performance',position:mob?'bottom':'right',icon:'📊',title:'My Performance',body:'Your personal metrics — total clients, reviews completed, recommendations implemented, sessions logged, and average client health score.',before:function(){nav('my-performance');if(typeof renderAdvisorPerformancePage==='function')renderAdvisorPerformancePage();}},
    {target:'#nav-my-finances',position:mob?'bottom':'right',icon:'💰',title:'My Finances',body:'Your own personal financial profile using the full PFOS tool — separate from client data. Practice what you preach.',before:function(){nav('dashboard');}},
    {target:'[onclick*="openPulseCheck"]',position:'right',icon:'💓',title:'Pulse Check',before:function(){if(typeof showPage==='function')showPage('dashboard');},body:'A <strong>30-second tap-to-answer</strong> scoring tool for networking events and prospecting. Ask 6 quick questions, get a score 0-100, a pre-written opening line, and save the prospect as a new client with one click. Find it in the sidebar under Pulse Check.'},
    {target:'[onclick*="openQuickRec"]',position:'right',icon:'⚡',title:'Quick Rec',before:function(){if(typeof showPage==='function')showPage('dashboard');},body:'Create a recommendation for any client in seconds — select the client, pick a section, set priority, type or dictate your recommendation, and save. Perfect for capturing ideas on the go. Find it in the sidebar.'},
    {target:'#nav-bulk-msg',position:mob?'bottom':'right',icon:'📢',title:'Bulk Message',body:'Send a message to all your clients at once — announcements, market updates, or seasonal reminders. One click, every client gets it.'},
    {target:'[onclick*="exportClients"]',position:'right',icon:'⬇️',title:'Export & Utilities',before:function(){if(typeof showPage==='function')showPage('dashboard');},body:'<strong>Export CSV</strong> downloads your full client list as a spreadsheet. Use the <strong>theme toggle</strong> (🌙) to switch between dark and light mode. <strong>Keyboard shortcuts</strong> — press <strong>?</strong> on any screen for a list.'},
    {target:'#wt-replay',position:'left',icon:'❓',title:'Need Help Anytime?',body:'This button is always here. Tap it for <strong>instant help</strong> specific to whatever page you\'re viewing — client list, tools, pipeline, or any other screen.'},
    {target:'#nav-dashboard',position:mob?'bottom':'right',icon:'🎉',title:'Ready to Go!',body:'You have everything you need. Start by adding clients, running Pulse Checks at your next event, or exploring the 93 calculators.<br><br>Click <strong>❓</strong> anytime for help.',before:function(){nav('dashboard');}},
  ];
}

// ── CLIENT PROFILE STEPS (placeholder) ──
function getClientProfileSteps(){
  var mob = window.innerWidth < 768;
  return [
    {target:'center',icon:'👋',title:'Client Profile',body:'Everything about this client — financial data, recommendations, reports, and session history — all in one place. Let\'s walk through every feature.',delay:100},
    {target:'#profileHeaderArea',position:'bottom',icon:'👤',title:'Client Overview',body:'Client name, status, tier, contact info, review dates, and couple linking. Change their status, assign agents, or manage household type directly from here.'},
    {target:'#profileActionBtns',position:'bottom',icon:'⚡',title:'Quick Actions',body:'<strong>Open PFOS</strong> launches the full planning tool with their data. <strong>Save Notes</strong> records advisor notes. <strong>Edit Profile</strong> updates contact info. <strong>Net Worth Statement</strong> generates a formal one-pager.'},
    {target:'[onclick*="openPFOSForClient"]',position:'right',icon:'📊',title:'Open PFOS Tool',body:'Opens the complete PFOS planning tool with this client\'s data pre-loaded. Make changes to income, expenses, debts, retirement — then click Save to Client to push updates to their profile.'},
    {target:'[onclick*="openRecommendationModal"]',position:'right',icon:'➕',title:'Add Recommendation',body:'Create a recommendation manually — pick a section (Debt, Retirement, Protection, etc.), set priority, and write your recommendation. It saves as a draft for you to review before activating.'},
    {target:'[onclick*="generateMeetingAgenda"]',position:'right',icon:'📋',title:'Meeting Agenda',body:'Auto-generates a meeting agenda pulling open recommendations, overdue items, and key financial changes since last review. Perfect for prep before client meetings.'},
    {target:'[onclick*="generateProgressReport"]',position:'right',icon:'📈',title:'Progress Report',body:'Generates a comprehensive progress report showing score changes, implemented recommendations, net worth trajectory, and key improvements since the last report.'},
    {target:'#profileSnapshotData',position:'right',icon:'📊',title:'Financial Snapshot',body:'Quick overview of the client\'s key numbers — income, expenses, net worth, debt, savings rate, and DTI ratio. Updates automatically when PFOS data is saved.'},
    {target:'#advisorNotes',position:'top',icon:'📝',title:'Advisor Notes',body:'Persistent notes about this client — strategy ideas, preferences, important context. Saved separately from session notes. Use the template dropdown for quick-start formats.'},
    {target:'#sessionNotesInput',position:'top',icon:'📓',title:'Session Notes',body:'Log notes after each client meeting. Each session note is timestamped and saved to the client\'s history. Click <strong>Save Session Note</strong> to add it to the record.'},
    {target:'#advisorMsgThread',position:'top',icon:'💬',title:'Client Messages',body:'Two-way messaging with your client. See their messages here and send replies. Clients can message you from their portal — you respond right from this profile.'},
    {target:'#aiRecBtn',position:'bottom',icon:'✨',title:'AI Recommendations',body:'Click <strong>AI Suggest</strong> to analyze this client\'s full financial profile and auto-generate prioritized recommendations. Review each one before activating — the AI drafts, you decide.'},
    {target:'#scenarioComparePanel',position:'top',icon:'🔀',title:'Scenario Compare',body:'Run side-by-side comparisons of different financial strategies for this client. See how different approaches impact their trajectory over time.'},
    {target:'#inviteLinkBtn',position:'top',icon:'🔗',title:'Portal Access',body:'Copy and send the client their portal invitation link. They can log in to view their data, reports, and communicate with you directly.'},
    {target:'#wt-replay',position:'left',icon:'❓',title:'Need Help Anytime?',body:'This button is always in the bottom-right corner. Tap it for instant help specific to whatever you\'re doing on this page.'},
    {target:'#profileActionBtns',position:'bottom',icon:'🎉',title:'All Set!',body:'You have everything you need to manage this client. Start by opening PFOS to review their data, or add a recommendation.<br><br>Click <strong>❓</strong> anytime for help.'},
  ];
}

// ── CLIENT PORTAL STEPS (placeholder) ──
function getClientPortalSteps(role){
  var mob = window.innerWidth < 768;
  function nav(pg){ if(typeof showClientPage==='function') showClientPage(pg); }

  return [
    {target:'center',icon:'👋',title:'Welcome to Your Financial Portal',body:'Your personal financial hub — scores, reports, tools, and communication, all in one place. Let\'s walk through everything.',delay:100},
    {target:'#cnav-overview',position:mob?'bottom':'right',icon:'📊',title:'Overview',body:'Your dashboard with 4 health scores, key metrics, and financial summary. This updates automatically as your data changes.',before:function(){nav('overview');}},
    {target:'#cnav-pfos',position:mob?'bottom':'right',icon:'⚡',title:'My Financial Data',body:'View and update all your financial data — income, expenses, debts, retirement, insurance, and more. This is where you build your complete financial picture.',before:function(){nav('pfos');}},
     {target:'#cnav-quicktools',position:mob?'bottom':'right',icon:'⚡',title:'Financial Tools',body:'102 calculators across 13 categories — loans, retirement, insurance, student loans, taxes, estate planning, and more. All personalized with your data. Browse by category in the sidebar.',before:function(){nav('tools');}},
    {target:'#cnav-studentloans',position:mob?'bottom':'right',icon:'🎓',title:'Student Loans',body:'12 dedicated student loan tools — income-driven repayment estimator, Public Service Loan Forgiveness tracker, forgiveness checker, refi analysis, and more.',before:function(){nav('studentloans');}},
    {target:'#cnav-loantools',position:mob?'bottom':'right',icon:'🏠',title:'Loans & Deals',body:'Loan calculator, APR truth calculator, rate comparison, refinance analysis, buy vs lease, and buy vs rent — all the tools for major purchase decisions.',before:function(){nav('loantools');}},
    {target:'#cnav-lifeevents',position:mob?'bottom':'right',icon:'🎯',title:'Life Events',body:'Planning a wedding, having a baby, changing jobs, relocating, or going through a divorce? Each major life event has a dedicated calculator.',before:function(){nav('lifeevents');}},
    {target:'#cnav-reports',position:mob?'bottom':'right',icon:'📄',title:'My Reports',body:'View and download all your financial reports. Track your progress over time with score changes and projections.',before:function(){nav('reports');}},
    {target:'#cnav-messages',position:mob?'bottom':'right',icon:'💬',title:'Messages',body: role==='client-advisor' ? 'Two-way messaging with your advisor. Ask questions, share updates, or request a review.' : 'Communication center. Request an advisor consultation when you\'re ready for professional guidance.',before:function(){nav('messages');if(typeof loadClientMessages==='function')loadClientMessages();}},
    {target:'#cnav-notifications',position:mob?'bottom':'right',icon:'🔔',title:'Notifications',body:'Stay informed about changes to your account, new reports, recommendation updates, and advisor activity.',before:function(){nav('notifications');if(typeof loadNotificationCenter==='function')loadNotificationCenter();}},
    {target:'#cnav-journey',position:mob?'bottom':'right',icon:'🗺️',title:'My Journey',body:'Your financial timeline — every milestone, score improvement, and recommendation implemented in one visual history.',before:function(){nav('journey');if(typeof renderJourneyTimeline==='function')renderJourneyTimeline();}},
    {target:'#cnav-spending',position:mob?'bottom':'right',icon:'📊',title:'Spending Analysis',body:'See where your money goes — category breakdowns, trends, and spending patterns over time.',before:function(){nav('spending');if(typeof renderSpendingAnalysis==='function')renderSpendingAnalysis();}},
    {target:'#cnav-calendar',position:mob?'bottom':'right',icon:'📅',title:'Calendar',body:'Your financial calendar — bill due dates, pay dates, review appointments, and important financial milestones.',before:function(){nav('calendar');if(typeof renderClientCalendar==='function')renderClientCalendar();}},
    {target:'#cnav-payschedule',position:mob?'bottom':'right',icon:'💰',title:'Pay Schedule',body:'Track your paycheck timing, deductions, and take-home pay. See exactly what lands in your account and when.',before:function(){nav('payschedule');if(typeof renderClientPaySchedule==='function')renderClientPaySchedule();}},
    {target:'#cnav-policies',position:mob?'bottom':'right',icon:'🛡️',title:'Insurance Policies',body:'View all your insurance policies — life, disability, health, property. See coverage amounts, premiums, and identify gaps.',before:function(){nav('policies');if(typeof renderClientPolicies==='function')renderClientPolicies();}},
    {target:'#cnav-estate',position:mob?'bottom':'right',icon:'📜',title:'Estate Planning',body:'Estate tax exposure, wealth transfer strategies, beneficiary tracking, and legacy planning tools.',before:function(){nav('estate');if(typeof renderClientEstate==='function')renderClientEstate();}},
    {target:'#cnav-engage',position:mob?'bottom':'right',icon:'🏆',title:'Achievements',body:'Track your financial milestones and earn achievements as you build better financial habits.',before:function(){nav('engage');if(typeof initEngagementPage==='function')initEngagementPage();}},
    {target:'#cnav-privacy',position:mob?'bottom':'right',icon:'🔒',title:'Privacy & Sharing',body:'Control what your advisor can see, manage data sharing preferences, and request account changes.',before:function(){nav('privacy');}},
    {target:'#cnav-activity',position:mob?'bottom':'right',icon:'👁️',title:'Advisor Activity',body:'See exactly what your advisor has accessed, changed, or reviewed on your account. Full transparency.',before:function(){nav('activity');if(typeof loadAdvisorActivity==='function')loadAdvisorActivity();}},
    {target:'#wt-replay',position:'left',icon:'❓',title:'Need Help Anytime?',body:'This button is always in the bottom-right corner. Tap it for <strong>instant help</strong> specific to whatever screen you\'re viewing.'},
    {target:'#cnav-overview',position:mob?'bottom':'right',icon:'🎉',title:'You\'re Ready!',body:'You have access to everything you need to manage your financial life. Start with your Overview to see where you stand.<br><br>Click <strong>❓</strong> anytime for help.',before:function(){nav('overview');}},
  ];
}

// ── BOOT ──
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', detectContext);
} else {
  detectContext();
}

})();
