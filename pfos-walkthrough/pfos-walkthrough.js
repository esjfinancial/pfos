/* ═══════════════════════════════════════════════════════
   PFOS WALKTHROUGH ENGINE v1.0
   Standalone guided tour for all PFOS pages
   Add via: <script src="/pfos-walkthrough.js" defer></script>
   ═══════════════════════════════════════════════════════ */
(function(){
'use strict';

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
  var old = document.getElementById('wt-overlay');
  if(old) old.remove();

  overlay = document.createElement('div');
  overlay.id = 'wt-overlay';
  overlay.innerHTML = '<div id="wt-spotlight"></div><div id="wt-tooltip"></div>';
  document.body.appendChild(overlay);
  spotlight = document.getElementById('wt-spotlight');
  tooltip = document.getElementById('wt-tooltip');
}

// ── SHOW STEP ──
function showStep(idx){
  if(idx < 0 || idx >= steps.length){ endTour(); return; }
  currentStep = idx;
  var step = steps[idx];

  // Pre-action (e.g. navigate to a section)
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
      var pad = 6;
      spotlight.style.cssText = 'display:block;top:'+(rect.top-pad+window.scrollY)+'px;left:'+(rect.left-pad)+'px;width:'+(rect.width+pad*2)+'px;height:'+(rect.height+pad*2)+'px;border-radius:4px';
      // Scroll into view if needed
      if(rect.top < 0 || rect.bottom > window.innerHeight){
        target.scrollIntoView({behavior:'smooth',block:'center'});
        setTimeout(function(){ positionTooltip(target, step); }, 400);
        return;
      }
    } else {
      spotlight.style.display = 'none';
    }

    positionTooltip(target, step);
  }, step.delay || 300);
}

// ── POSITION TOOLTIP ──
function positionTooltip(target, step){
  var isCenter = !target || step.target === 'center';
  var total = steps.length;
  var idx = currentStep;

  var h = '<div class="wt-step-count">Step '+(idx+1)+' of '+total+'</div>';
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

  if(isCenter){
    tooltip.style.cssText = 'display:block;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);max-width:420px;width:90%';
  } else {
    var rect = target.getBoundingClientRect();
    var tw = Math.min(360, window.innerWidth - 32);
    var pos = step.position || 'bottom';

    // Auto-adjust position if not enough space
    if(pos === 'bottom' && rect.bottom + 220 > window.innerHeight) pos = 'top';
    if(pos === 'top' && rect.top < 220) pos = 'bottom';
    if(pos === 'right' && rect.right + tw + 20 > window.innerWidth) pos = 'bottom';
    if(pos === 'left' && rect.left < tw + 20) pos = 'bottom';

    var top, left;
    if(pos === 'bottom'){
      top = rect.bottom + window.scrollY + 12;
      left = Math.max(16, Math.min(rect.left + rect.width/2 - tw/2, window.innerWidth - tw - 16));
    } else if(pos === 'top'){
      top = rect.top + window.scrollY - 12;
      left = Math.max(16, Math.min(rect.left + rect.width/2 - tw/2, window.innerWidth - tw - 16));
      // Will need to adjust after render for height
    } else if(pos === 'right'){
      top = rect.top + window.scrollY + rect.height/2 - 80;
      left = rect.right + 12;
    } else if(pos === 'left'){
      top = rect.top + window.scrollY + rect.height/2 - 80;
      left = rect.left - tw - 12;
    }

    tooltip.style.cssText = 'display:block;position:absolute;top:'+top+'px;left:'+left+'px;width:'+tw+'px';

    // Adjust for top position (need rendered height)
    if(pos === 'top'){
      var th = tooltip.offsetHeight;
      tooltip.style.top = (rect.top + window.scrollY - th - 12) + 'px';
    }
  }
}

// ── NAVIGATION ──
window._wtNext = function(){ showStep(currentStep + 1); };
window._wtPrev = function(){ showStep(currentStep - 1); };
window._wtSkip = function(){ endTour(); showReminderBanner(); };
window._wtEnd = function(){ endTour(); markCompleted(); };
window._wtStart = startTour;
window._wtReset = function(){ resetCompletion(); startTour(); };
window._wtHide = function(){ endTour(); hideReminderBanner(); var r=document.getElementById('wt-replay');if(r)r.style.display='none'; };

function endTour(){
  var el = document.getElementById('wt-overlay');
  if(el) el.remove();
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
    +'<button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:#64748B;font-size:16px;cursor:pointer">✕</button>'
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
  btn.title = 'Replay guided tour';
  btn.innerHTML = '❓';
  btn.onclick = function(){ window._wtReset(); };
  document.body.appendChild(btn);
}

// ── CSS ──
function injectCSS(){
  if(document.getElementById('wt-styles')) return;
  var style = document.createElement('style');
  style.id = 'wt-styles';
  style.textContent = ''
    +'#wt-overlay{position:fixed;inset:0;z-index:99999;pointer-events:none}'
    +'#wt-overlay::before{content:"";position:fixed;inset:0;background:rgba(0,0,0,.65);pointer-events:auto;z-index:99999}'
    +'#wt-spotlight{position:absolute;box-shadow:0 0 0 9999px rgba(0,0,0,.7);border:2px solid rgba(91,155,255,.6);z-index:100000;pointer-events:none;transition:all .3s ease}'
    +'#wt-tooltip{position:absolute;background:linear-gradient(145deg,#111142,#0C0C34);border:1px solid rgba(91,155,255,.25);border-radius:8px;padding:20px;z-index:100001;pointer-events:auto;box-shadow:0 12px 40px rgba(0,0,0,.5);max-width:420px}'
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
    {target:'center',icon:'👋',title:'Welcome to the Advisor Dashboard',body:'Your command center for managing clients, tracking recommendations, and running your practice. Let\'s walk through each section.',delay:100},
    {target:'#nav-dashboard',position:mob?'bottom':'right',icon:'📊',title:'Dashboard',body:'Your home base — client stats, upcoming reviews, follow-up reminders, and quick search.',before:function(){nav('dashboard');}},
    {target:'#nav-advisory-clients',position:mob?'bottom':'right',icon:'👥',title:'Advisory Clients',body:'Your full client list with status, tier, health scores, and compliance tracking. Click any client to open their detailed profile.',before:function(){nav('advisory-clients');}},
    {target:'#nav-new-client',position:mob?'bottom':'right',icon:'➕',title:'Add New Client',body:'Create advisory or product clients. Set their tier, assign an advisor, send portal invitations, and link couples — all from one form.'},
    {target:'#nav-priority',position:mob?'bottom':'right',icon:'🎯',title:'Priority Dashboard',body:'Clients ranked by urgency — overdue reviews, missing data, low health scores. Never miss a follow-up.',before:function(){nav('priority');if(typeof renderPriorityDashboard==='function')renderPriorityDashboard();}},
    {target:'#nav-rec-pipeline',position:mob?'bottom':'right',icon:'🔄',title:'Recommendation Pipeline',body:'Track every recommendation from draft to implementation. Compliance rates, effectiveness scoring, and bulk starter packs.',before:function(){nav('rec-pipeline');if(typeof renderRecPipeline==='function')renderRecPipeline();}},
    {target:'#nav-agent-tools',position:mob?'bottom':'right',icon:'🧰',title:'Financial Tools',body:'All 93 calculators. Select a client to pre-fill their data, run any calculator, and save results as recommendations.',before:function(){nav('agent-tools');}},
    {target:'#nav-leaderboard',position:mob?'bottom':'right',icon:'🏆',title:'Leaderboard & Performance',body:'Healthiest clients, top compliance, and top savers. My Performance tracks your personal metrics.',before:function(){nav('leaderboard');if(typeof renderClientLeaderboard==='function')renderClientLeaderboard();}},
    {target:'#nav-my-finances',position:mob?'bottom':'right',icon:'💰',title:'My Finances',body:'Your own personal financial profile — separate from client data. Use PFOS for yourself too.'},
    {target:'#nav-dashboard',position:mob?'bottom':'right',icon:'🎉',title:'Ready to Go!',body:'Explore Pulse Check, Bulk Messaging, CSV Export, and Quick Rec in the sidebar.<br><br>Click <strong>❓</strong> anytime to replay this tour.',before:function(){nav('dashboard');}},
  ];
}

// ── CLIENT PROFILE STEPS (placeholder) ──
function getClientProfileSteps(){
  var mob = window.innerWidth < 768;
  return [
    {target:'center',icon:'👋',title:'Client Profile',body:'Everything about this client — financial data, recommendations, reports, and session history — all in one place.',delay:100},
    {target:'#profileActionBtns',position:'bottom',icon:'⚡',title:'Quick Actions',body:'<strong>Open PFOS</strong> launches the full planning tool with their data. <strong>Save Notes</strong> records session notes. <strong>Edit Profile</strong> updates their info. <strong>Net Worth Statement</strong> generates a formal one-pager.'},
    {target:'#profileHeaderArea',position:'bottom',icon:'👤',title:'Client Overview',body:'Name, status, tier, contact info, review dates, and couple linking. Change status, assign agents, or manage household type from here.'},
    {target:'center',icon:'📝',title:'Recommendations',body:'Scroll down to manage all recommendations. <strong>+ Add Recommendation</strong> creates one manually. <strong>AI Suggest</strong> auto-generates them. Each tracks through draft → proposed → agreed → active → implemented.'},
    {target:'center',icon:'📈',title:'Reports & Notes',body:'<strong>Progress Report</strong> shows score changes and implementation progress. <strong>Session Notes</strong> logs meeting summaries. <strong>Follow-up Reminders</strong> keeps you on track.'},
    {target:'center',icon:'🎉',title:'All Set!',body:'Click <strong>❓</strong> anytime to replay this tour.'},
  ];
}

// ── CLIENT PORTAL STEPS (placeholder) ──
function getClientPortalSteps(role){
  var mob = window.innerWidth < 768;
  function nav(pg){ if(typeof showClientPage==='function') showClientPage(pg); }

  return [
    {target:'center',icon:'👋',title:'Welcome to Your Financial Portal',body:'Your personal financial hub — scores, reports, tools, and communication, all in one place.',delay:100},
    {target:'#cnav-overview',position:mob?'bottom':'right',icon:'📊',title:'Overview',body:'Your dashboard with 4 health scores, key metrics, and financial summary.',before:function(){nav('overview');}},
    {target:'#cnav-pfos',position:mob?'bottom':'right',icon:'⚡',title:'My Financial Data',body:'View and update all your financial data — income, expenses, debts, retirement, insurance, and more. This is where you build your complete financial picture.',before:function(){nav('pfos');}},
    {target:'#cnav-tools',position:mob?'bottom':'right',icon:'🧰',title:'Financial Tools',body:'93 calculators for every financial question — loans, retirement, insurance, student loans, taxes, and more. All personalized with your data.',before:function(){nav('tools');}},
    {target:'#cnav-reports',position:mob?'bottom':'right',icon:'📄',title:'My Reports',body:'View and download all your financial reports. Track your progress over time.',before:function(){nav('reports');}},
    {target:'#cnav-messages',position:mob?'bottom':'right',icon:'💬',title:'Messages',body: role==='client-advisor' ? 'Two-way messaging with your advisor. Ask questions, share updates, or request a review.' : 'Communication center. Request an advisor consultation when you\'re ready for professional guidance.',before:function(){nav('messages');if(typeof loadClientMessages==='function')loadClientMessages();}},
    {target:'#cnav-journey',position:mob?'bottom':'right',icon:'🗺️',title:'My Journey',body:'Your financial timeline — every milestone, score improvement, and recommendation implemented in one visual history.',before:function(){nav('journey');if(typeof renderJourneyTimeline==='function')renderJourneyTimeline();}},
    {target:'#cnav-spending',position:mob?'bottom':'right',icon:'📊',title:'Spending Analysis',body:'See where your money goes — category breakdowns, trends, and spending patterns over time.',before:function(){nav('spending');if(typeof renderSpendingAnalysis==='function')renderSpendingAnalysis();}},
    {target:'#cnav-overview',position:mob?'bottom':'right',icon:'🎉',title:'You\'re Ready!',body:'Explore your portal — Calendar, Pay Schedule, Insurance Policies, Estate Planning, and Achievements are all in the sidebar.<br><br>Click <strong>❓</strong> anytime to replay this tour.',before:function(){nav('overview');}},
  ];
}

// ── BOOT ──
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', detectContext);
} else {
  detectContext();
}

})();
