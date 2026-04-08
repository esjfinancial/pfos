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

  // Welcome
  s.push({
    target:'center', icon:'👋',
    title:'Welcome to PFOS!',
    body: role==='advisor'
      ? 'This is your client\'s Personal Financial Operating System. Let\'s walk through the key sections so you can manage their finances effectively.'
      : 'This is your Personal Financial Operating System — everything you need to understand, plan, and optimize your finances. Let\'s take a quick tour.',
    delay:100
  });

  // Navigation
  s.push({
    target: isMobile ? '#navHome' : '#navHome',
    position: isMobile ? 'top' : 'right',
    icon:'🧭', title:'Navigation',
    body:'These tabs are your main sections. <strong>Home</strong> is your dashboard, <strong>Finances</strong> is where you enter data, <strong>My Plan</strong> tracks recommendations, <strong>Tools</strong> has 93 calculators, and <strong>Reports</strong> generates your financial reports.',
    before: function(){ if(typeof showSection==='function') showSection('home'); }
  });

  // Home Dashboard
  s.push({
    target:'#secHome',
    position:'bottom', icon:'🏠', title:'Home Dashboard',
    body:'Your financial snapshot at a glance — monthly cash flow, financial scores, key metrics, and smart alerts. This updates automatically as you enter data.',
    before: function(){ if(typeof showSection==='function') showSection('home'); }
  });

  // Scores
  s.push({
    target:'#scoreGrid',
    position:'bottom', icon:'📊', title:'Your 4 Financial Scores',
    body:'Each score rates you 1-10 across <strong>Cash Flow</strong> (income vs expenses), <strong>Protection</strong> (insurance coverage), <strong>Growth</strong> (retirement trajectory), and <strong>Efficiency</strong> (fees & tax optimization). Together they give a complete picture.',
  });

  // Finances
  s.push({
    target: isMobile ? '#navFinances' : '#navFinances',
    position: isMobile ? 'top' : 'right',
    icon:'💰', title:'My Finances',
    body:'This is where you enter all your financial data — income, expenses, debts, retirement accounts, insurance, and more. Each card represents a category. The more you fill in, the more accurate your scores and projections become.',
    before: function(){ if(typeof showSection==='function') showSection('finances'); }
  });

  // Finance Cards
  s.push({
    target:'#finCardsGrid',
    position:'bottom', icon:'📋', title:'Financial Categories',
    body:'Click any card to expand it and enter your data. Green checkmarks mean that section is complete. Work through each one — start with <strong>Income</strong> and <strong>Expenses</strong> for the biggest impact.',
    before: function(){ if(typeof showSection==='function') showSection('finances'); }
  });

  // Tools
  s.push({
    target: isMobile ? '#navTools' : '#navTools',
    position: isMobile ? 'top' : 'right',
    icon:'🔧', title:'93 Financial Calculators',
    body:'Every financial question has a dedicated calculator — from "Can I Afford This?" to retirement projections, student loan strategies, insurance comparisons, and more. Each one uses your profile data for personalized results.',
    before: function(){ if(typeof showSection==='function') showSection('tools'); }
  });

  // For Someone Else (client-facing)
  if(role !== 'advisor'){
    s.push({
      target:'center', icon:'👥', title:'"For Someone Else" Mode',
      body:'Every calculator has a <strong>For Someone Else</strong> button. Use it to run calculations for a family member, friend, or anyone — just enter their details and click Apply. Great for helping others without them needing their own account.',
    });
  }

  // Reports
  s.push({
    target: isMobile ? '#navReports' : '#navReports',
    position: isMobile ? 'top' : 'right',
    icon:'📄', title:'Reports',
    body:'Generate comprehensive financial reports you can save, print, or share. Reports include your scores, projections, and recommended actions.',
    before: function(){ if(typeof showSection==='function') showSection('reports'); }
  });

  // Advisor-specific
  if(role === 'advisor'){
    s.push({
      target:'.hdr-mode',
      position:'bottom', icon:'⚙️', title:'Advisor Mode',
      body:'You\'re in <strong>Advisor Mode</strong>. Click <strong>Switch</strong> to toggle between advisor and client view. In advisor mode you can see additional tools and save data to the client\'s profile.',
    });
  }

  // Client with advisor
  if(role === 'client-advisor'){
    s.push({
      target: isMobile ? '#navPlan' : '#navPlan',
      position: isMobile ? 'top' : 'right',
      icon:'📋', title:'My Plan — Advisor Recommendations',
      body:'Your advisor creates personalized recommendations here. You can view each one, track implementation progress, and communicate with your advisor about next steps.',
      before: function(){ if(typeof showSection==='function') showSection('plan'); }
    });
  }

  // Solo client
  if(role === 'client-solo'){
    s.push({
      target:'center', icon:'🤖', title:'AI-Powered Recommendations',
      body:'PFOS analyzes your financial data and generates personalized recommendations automatically — no advisor required. If you ever want professional guidance, you can request an advisor consultation directly from the platform.',
    });
  }

  // Done
  s.push({
    target:'center', icon:'🎉', title:'You\'re All Set!',
    body:'That\'s the tour! Start by entering your <strong>Income</strong> and <strong>Expenses</strong> in the Finances tab — everything else builds from there. You can replay this tour anytime by clicking the <strong>❓</strong> button in the bottom right.',
  });

  return s;
}

// ── DASHBOARD STEPS (placeholder — expand later) ──
function getDashboardSteps(){
  return [
    {target:'center',icon:'👋',title:'Welcome to the Advisor Dashboard',body:'This is your command center for managing clients, tracking recommendations, and monitoring your practice. Let\'s walk through the key features.',delay:100},
    {target:'center',icon:'📊',title:'Dashboard Overview',body:'Your main dashboard shows client stats, upcoming reviews, and follow-up reminders. Use the sidebar to navigate between sections.'},
    {target:'center',icon:'👥',title:'Client Management',body:'Add and manage advisory and product clients. Each client has a profile with financial data, recommendations, and session history.'},
    {target:'center',icon:'💓',title:'Pulse Check',body:'The Pulse Check is a 30-second tap-to-answer tool for networking events. Score prospects 0-100 and save them as new clients with one click.'},
    {target:'center',icon:'🧰',title:'Financial Tools',body:'Access all 93 calculators with a client selector. Pick a client, run any calculator with their data pre-filled, and save results as recommendations.'},
    {target:'center',icon:'🎉',title:'Ready to Go!',body:'Explore the sidebar for more features — Priority Dashboard, Rec Pipeline, Leaderboard, Bulk Messaging, and more. Click ❓ anytime to replay this tour.'},
  ];
}

// ── CLIENT PROFILE STEPS (placeholder) ──
function getClientProfileSteps(){
  return [
    {target:'center',icon:'👋',title:'Client Profile',body:'This is your detailed view of a client\'s financial life. From here you can edit their data, manage recommendations, generate reports, and open the full PFOS tool.',delay:100},
    {target:'center',icon:'⚡',title:'Open PFOS',body:'Click <strong>Open / Edit in PFOS</strong> to launch the full financial planning tool with this client\'s data loaded. Any changes you make can be saved back to their profile.'},
    {target:'center',icon:'📋',title:'Recommendations',body:'Add, track, and manage recommendations through their full lifecycle — from draft to implementation. Use AI Suggest for automated recommendation generation.'},
    {target:'center',icon:'📈',title:'Progress Reports',body:'Generate progress reports that show score changes, implemented recommendations, and financial trajectory over time.'},
    {target:'center',icon:'🎉',title:'All Set!',body:'Click ❓ anytime to replay this tour.'},
  ];
}

// ── CLIENT PORTAL STEPS (placeholder) ──
function getClientPortalSteps(role){
  return [
    {target:'center',icon:'👋',title:'Welcome to Your Financial Portal',body:'This is your personal financial hub. View your scores, track recommendations, and access your financial data anytime.',delay:100},
    {target:'center',icon:'📊',title:'Your Financial Health',body:'Your dashboard shows your 4 financial health scores and key metrics. These update automatically as your data changes.'},
    {target:'center',icon:'📋',title:'Recommendations',body: role==='client-advisor' ? 'Your advisor creates personalized recommendations here. Track what\'s been implemented and what\'s next.' : 'AI-powered recommendations appear here based on your financial data. No advisor required — but you can request one anytime.'},
    {target:'center',icon:'📄',title:'Reports & History',body:'View and download all your financial reports. Your timeline shows every milestone in your financial journey.'},
    {target:'center',icon:'🎉',title:'You\'re Ready!',body:'Explore your portal and click ❓ anytime to replay this tour.'},
  ];
}

// ── BOOT ──
// Don't run inside iframes (e.g. PFOS loaded from client-profile)
if(window.parent !== window){ return; }

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', detectContext);
} else {
  detectContext();
}

})();
