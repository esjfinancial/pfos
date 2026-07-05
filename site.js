
(function(){
  var bg='#07071D';
  function fix(){
    var s=document.documentElement.style;s.setProperty('background',bg,'important');s.setProperty('background-color',bg,'important');
    if(document.body){document.body.style.setProperty('background',bg,'important');document.body.style.setProperty('background-color',bg,'important');}
  }
  fix();
  document.addEventListener('DOMContentLoaded',function(){
    fix();
    document.querySelectorAll('body>div,body>section,body>main,[class*="wrapper"],[class*="container"]').forEach(function(el){
      if(!el.classList.contains('launch-banner')&&!el.querySelector('nav')){el.style.setProperty('background',bg,'important');}
    });
  });
})();



// ── PRICING TOGGLE ──
function switchPricing(tab){
  ['individual','couples','agents'].forEach(function(t){
    document.getElementById('pricing-'+t).style.display = t===tab ? 'block' : 'none';
    var btn = document.getElementById('pt-'+t);
    if(btn){ btn.classList.toggle('active', t===tab); }
  });
}

// ── BILLING TOGGLE (monthly / annual) ──
function switchBilling(cycle){
  var annual = cycle === 'annual';
  document.querySelectorAll('.bill-monthly').forEach(function(el){ el.style.display = annual ? 'none' : ''; });
  document.querySelectorAll('.bill-annual').forEach(function(el){ el.style.display = annual ? '' : 'none'; });
  var mBtn = document.getElementById('bt-monthly');
  var aBtn = document.getElementById('bt-annual');
  if(mBtn) mBtn.classList.toggle('active', !annual);
  if(aBtn) aBtn.classList.toggle('active', annual);
}

// ── FADE ON SCROLL ──
var observer = new IntersectionObserver(function(entries){
  entries.forEach(function(entry){
    if(entry.isIntersecting) entry.target.classList.add('visible');
  });
}, {threshold:0.1});
document.querySelectorAll('.fade-up').forEach(function(el){ observer.observe(el); });

// ── FAQ TOGGLE ──
function toggleFaq(el){
  var item = el.parentElement;
  var wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(function(i){ i.classList.remove('open'); });
  if(!wasOpen) item.classList.add('open');
}

// ── FEEDBACK MODAL ──
function openFeedback(){
  document.getElementById('feedbackModal').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeFeedback(){
  document.getElementById('feedbackModal').classList.remove('open');
  document.body.style.overflow='';
}
async function submitFeedback(){
  var type  = document.getElementById('fbType').value;
  var msg   = document.getElementById('fbMessage').value.trim();
  var email = document.getElementById('fbEmail').value.trim();
  if(!msg){ alert('Please enter your feedback.'); return; }
  try{
    // Save to Supabase
    var sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
    if(sb){
      await sb.from('platform_feedback').insert({
        feedback_type: type||'general', message: msg, email: email||null,
        source:'landing_page', created_at:new Date().toISOString()
      }).catch(function(){});
      // Email admin
      await sb.functions.invoke('send-notification', {
        body:{
          type:'agent_request',
          clientName: email||'Anonymous',
          clientEmail: email||null,
          recText: '[Feedback - '+(type||'general')+'] '+msg
        }
      }).catch(function(){});
    }
    // Fallback: localStorage
    var fb = JSON.parse(localStorage.getItem('pfos_feedback')||'[]');
    fb.push({type,msg,email,ts:new Date().toISOString()});
    localStorage.setItem('pfos_feedback',JSON.stringify(fb));
  }catch(err){ console.warn('Feedback error:',err); }
  document.getElementById('feedbackForm').style.display='none';
  document.getElementById('feedbackSuccess').style.display='block';
  setTimeout(function(){ closeFeedback(); document.getElementById('feedbackForm').style.display='flex'; document.getElementById('feedbackSuccess').style.display='none'; document.getElementById('fbMessage').value=''; document.getElementById('fbType').selectedIndex=0; document.getElementById('fbEmail').value=''; },3000);
}

// Supabase config for landing page forms
var SUPABASE_URL = 'https://wbndgvicmgeodararpmr.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndibmRndmljbWdlb2RhcmFycG1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTIwNzYsImV4cCI6MjA5MDIyODA3Nn0.OwzfA4naIbJZFPmCZo87NkKRanXdJXlYOvWsx1GGwPE';
// Load Supabase SDK for form submissions
// Defer Supabase until user touches a form (saves 90KB from initial load)
document.addEventListener('focusin',function(e){
  if(!window.supabase&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')){
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    document.head.appendChild(s);
  }
},{once:true});

// ── MEETING FORM ──
async function submitMeeting(e){
  e.preventDefault();
  var first = document.getElementById('mFirst').value.trim();
  var last  = document.getElementById('mLast').value.trim();
  var email = document.getElementById('mEmail').value.trim();
  var phone = document.getElementById('mPhone').value.trim();
  var role  = document.getElementById('mRole').value;
  var time  = document.getElementById('mTime').value;
  var msg   = document.getElementById('mMessage').value.trim();
  if(!first||!email||!role){ return; }
  var btn = document.querySelector('#meetingForm button[type="submit"]');
  if(btn){ btn.disabled=true; btn.textContent='Sending...'; }
  try{
    // Save to Supabase
    var sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
    if(sb){
      await sb.from('demo_requests').insert({
        first_name:first, last_name:last, email, phone, role,
        preferred_time:time, message:msg, created_at:new Date().toISOString()
      }).catch(function(){});
      // Send admin notification email
      await sb.functions.invoke('send-notification', {
        body:{
          type:'agent_request',
          clientName: first+' '+(last||''),
          clientEmail: email,
          recText: (role ? 'Role: '+role+'. ' : '')+(time ? 'Time: '+time+'. ' : '')+(msg||'')
        }
      }).catch(function(){});
    }
    // Fallback: localStorage
    var reqs = JSON.parse(localStorage.getItem('pfos_meeting_reqs')||'[]');
    reqs.push({first,last,email,phone,role,time,message:msg,ts:new Date().toISOString()});
    localStorage.setItem('pfos_meeting_reqs',JSON.stringify(reqs));
  }catch(err){ console.warn('Demo request error:',err); }
  document.getElementById('meetingForm').style.display='none';
  document.getElementById('meetingSuccess').style.display='block';
}

// ── SMOOTH SCROLL FOR ANCHOR LINKS ──
document.querySelectorAll('a[href^="#"]').forEach(function(a){
  a.addEventListener('click',function(e){
    var target=document.querySelector(this.getAttribute('href'));
    if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth',block:'start'}); }
  });
});
