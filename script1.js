// Kévo scripts — externalized logic and enhancements with mood selector support

// Newsletter submit (works for both forms)
function newsletterSubmit(e){
  e.preventDefault();
  const emailInput = e.target.querySelector('input[type="email"]');
  const msg = e.target.querySelector('[id^="nl-msg"]');
  const email = emailInput?.value || '';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    if(msg) msg.textContent = 'Please enter a valid email address.';
    return false;
  }
  if(msg) msg.textContent = `Thanks — connect this form to your newsletter provider. For now: mailto:kevo@example.com?subject=Subscribe&body=${encodeURIComponent(email)}`;
  return false;
}

// Canvas background animation with reduced motion respect, and runtime hue control
(function(){
  const canvas = document.getElementById('bg-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = { blobs: [], hueMin: 120, hueMax: 180 };

  function resize(){
    canvas.width = window.innerWidth * 1.4;
    canvas.height = window.innerHeight * 1.4;
  }
  resize();
  window.addEventListener('resize', ()=>{ resize(); if(prefersReduced) paintStatic(); });

  function rand(min,max){return Math.random()*(max-min)+min}
  function initBlobs(){
    state.blobs.length = 0;
    for(let i=0;i<4;i++){
      state.blobs.push({x:rand(0,canvas.width),y:rand(0,canvas.height),r:rand(200,520),dx:rand(-0.3,0.3),dy:rand(-0.3,0.3),h:rand(state.hueMin,state.hueMax)});
    }
  }
  initBlobs();

  function paintStatic(){
    // Static subtle gradient roughly aligned with current hue range
    const midHue = (state.hueMin + state.hueMax) / 2;
    const g = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    g.addColorStop(0, `hsla(${midHue},70%,50%,0.10)`);
    g.addColorStop(1, `hsla(${midHue+20},70%,40%,0.0)`);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  function draw(){
    if(prefersReduced){ paintStatic(); return; }
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const b of state.blobs){
      b.x += b.dx; b.y += b.dy;
      if(b.x<-b.r) b.x = canvas.width + b.r; if(b.x>canvas.width+b.r) b.x = -b.r;
      if(b.y<-b.r) b.y = canvas.height + b.r; if(b.y>canvas.height+b.r) b.y = -b.r;
      const g = ctx.createRadialGradient(b.x,b.y,b.r*0.1,b.x,b.y,b.r);
      g.addColorStop(0, `hsla(${b.h},60%,55%,0.16)`);
      g.addColorStop(0.4, `hsla(${b.h+20},60%,45%,0.08)`);
      g.addColorStop(1, `hsla(${b.h+40},60%,30%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();

  function setHueRange(min,max){
    state.hueMin = min; state.hueMax = max;
    for(const b of state.blobs){ b.h = rand(min,max); }
    if(prefersReduced) paintStatic();
  }

  window.KevoBg = { setHueRange };
})();

// Audio player controls module with dynamic tracklist support
(function(){
  const audio = document.getElementById('audio');
  const cover = document.getElementById('cover');
  const live = document.getElementById('now-playing-live');
  const playAll = document.getElementById('play-all');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const list = document.getElementById('tracklist');

  let trackEls = [];
  let currentIndex = -1;

  function bindTrackEl(el, i){
    if(el.tagName !== 'BUTTON'){
      el.setAttribute('role','button');
      el.setAttribute('tabindex','0');
    }
    el.addEventListener('click', ()=> playIndex(i));
    el.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); playIndex(i); }
      if(e.key==='ArrowDown'){ e.preventDefault(); trackEls[Math.min(i+1, trackEls.length-1)]?.focus(); }
      if(e.key==='ArrowUp'){ e.preventDefault(); trackEls[Math.max(i-1, 0)]?.focus(); }
    });
  }

  function setActive(index){
    trackEls.forEach((el,i)=> el.setAttribute('aria-selected', i===index ? 'true' : 'false'));
    currentIndex = index;
  }

  function playIndex(index){
    const t = trackEls[index];
    if(!t) return;
    const src = t.dataset.src;
    if(!src || !audio) return;
    const source = audio.querySelector('source');
    if(source) source.src = src;
    audio.load();
    audio.play().catch(()=>{});
    const title = t.querySelector('.meta')?.textContent?.trim().split('\n')[0] || 'Kévo';
    if(cover) cover.textContent = title;
    if(live) live.textContent = `Now playing: ${title}`;
    setActive(index);
  }

  function setTracks(tracks){
    if(!list) return;
    list.innerHTML = '';
    const frag = document.createDocumentFragment();
    tracks.forEach((tr, i)=>{
      const btn = document.createElement('button');
      btn.className = 'track';
      btn.type = 'button';
      btn.dataset.src = tr.src;
      btn.setAttribute('aria-selected','false');
      btn.innerHTML = `<div class="meta">${tr.title} <div class="small">(${tr.dur})</div></div>`;
      frag.appendChild(btn);
    });
    list.appendChild(frag);
    trackEls = Array.from(list.querySelectorAll('.track'));
    trackEls.forEach((el,i)=> bindTrackEl(el,i));
    setActive(-1);
  }

  function initFromDOM(){
    trackEls = Array.from(document.querySelectorAll('.track'));
    trackEls.forEach((el,i)=> bindTrackEl(el,i));
  }

  // Wire controls and keyboard
  function bindControls(){
    playAll?.addEventListener('click', ()=> playIndex(0));
    prevBtn?.addEventListener('click', ()=>{ if(currentIndex<=0) return playIndex(0); playIndex(currentIndex-1); });
    nextBtn?.addEventListener('click', ()=>{ if(currentIndex<0) return playIndex(0); playIndex(Math.min(currentIndex+1, trackEls.length-1)); });

    document.addEventListener('keydown', (e)=>{
      const tag = document.activeElement?.tagName;
      if(tag==='INPUT' || tag==='TEXTAREA') return;
      if(e.code==='Space'){ e.preventDefault(); if(audio?.paused) audio.play(); else audio?.pause(); }
      if(e.code==='ArrowRight'){ if(audio) audio.currentTime = Math.min(audio.duration||1e9, audio.currentTime+5); }
      if(e.code==='ArrowLeft'){ if(audio) audio.currentTime = Math.max(0, audio.currentTime-5); }
    });

    audio?.addEventListener('error', ()=>{
      const msg = document.getElementById('audio-error');
      if(msg) msg.textContent = 'Audio failed to load. Check the track source path.';
    });
  }

  // Expose API
  window.KevoPlayer = { setTracks, playIndex };

  // Initialize
  initFromDOM();
  bindControls();
})();

// Smooth scroll and scroll spy for nav
(function(){
  const links = Array.from(document.querySelectorAll('a[href^="#"]'));
  links.forEach(a=>{
    a.addEventListener('click', (e)=>{
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if(!el) return;
      e.preventDefault();
      el.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });

  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const navLinks = new Map();
  document.querySelectorAll('header nav a[href^="#"]').forEach(a=>{
    const id = a.getAttribute('href').slice(1);
    navLinks.set(id, a);
  });
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        const id = entry.target.id;
        navLinks.forEach(a=>a.removeAttribute('aria-current'));
        const current = navLinks.get(id);
        if(current) current.setAttribute('aria-current','page');
      }
    });
  }, {rootMargin: '0px 0px -70% 0px', threshold: 0.1});
  sections.forEach(s=> io.observe(s));
})();

// JSON-LD structured data for Artist and Events
(function(){
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    'name': 'Kévo',
    'description': 'Kévo — immersive music, visuals and stories.',
    'url': location.origin + location.pathname,
    'sameAs': ['https://instagram.com/placeholder','https://youtube.com/placeholder','https://open.spotify.com/artist/placeholder'],
    'event': [
      {
        '@type':'Event',
        'name':'Kévo — The Blue Room, Halifax',
        'startDate':'2025-10-10T20:00:00-03:00',
        'eventStatus':'https://schema.org/EventScheduled',
        'eventAttendanceMode':'https://schema.org/OfflineEventAttendanceMode',
        'location':{'@type':'Place','name':'The Blue Room','address':{'@type':'PostalAddress','addressLocality':'Halifax','addressCountry':'CA'}},
        'offers':{'@type':'Offer','url':location.href,'availability':'https://schema.org/InStock'}
      },
      {
        '@type':'Event',
        'name':'Kévo — Smalltown Fest, Toronto',
        'startDate':'2025-11-06T20:00:00-05:00',
        'eventStatus':'https://schema.org/EventScheduled',
        'eventAttendanceMode':'https://schema.org/OfflineEventAttendanceMode',
        'location':{'@type':'Place','name':'Smalltown Fest','address':{'@type':'PostalAddress','addressLocality':'Toronto','addressCountry':'CA'}},
        'offers':{'@type':'Offer','url':location.href,'availability':'https://schema.org/InStock'}
      }
    ]
  };
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);
})();

// Mood engine: define moods and expose kevoSetMood
(function(){
  const MOODS = {
    'night-drive': {
      label: 'Night drive',
      accent: '#26ceaa',
      hue: [180, 210],
      tracks: [
        { title: 'Night Drive', dur: '3:42', src: 'tracks/track1.mp3' },
        { title: 'Soft Static', dur: '4:06', src: 'tracks/track2.mp3' },
        { title: 'After the Shows', dur: '2:58', src: 'tracks/track3.mp3' }
      ]
    },
    'longing': {
      label: 'Longing',
      accent: '#7bade2',
      hue: [210, 240],
      tracks: [
        { title: 'Soft Static', dur: '4:06', src: 'tracks/track2.mp3' },
        { title: 'After the Shows', dur: '2:58', src: 'tracks/track3.mp3' },
        { title: 'Night Drive', dur: '3:42', src: 'tracks/track1.mp3' }
      ]
    },
    'secret-crush': {
      label: 'Secret crush',
      accent: '#3b60e4',
      hue: [230, 270],
      tracks: [
        { title: 'After the Shows', dur: '2:58', src: 'tracks/track3.mp3' },
        { title: 'Soft Static', dur: '4:06', src: 'tracks/track2.mp3' },
        { title: 'Night Drive', dur: '3:42', src: 'tracks/track1.mp3' }
      ]
    }
  };

  function applyAccent(color){
    document.documentElement.style.setProperty('--accent', color);
  }

  function announceMood(label){
    const live = document.getElementById('now-playing-live');
    if(live) live.textContent = `Mood: ${label}`;
  }

  function updateUISelection(key){
    document.querySelectorAll('[data-mood]')?.forEach(btn=>{
      const is = btn.getAttribute('data-mood')===key;
      btn.setAttribute('aria-checked', is ? 'true' : 'false');
      if('ariaPressed' in btn) btn.setAttribute('aria-pressed', is ? 'true' : 'false');
    });
  }

  window.kevoSetMood = function(key){
    const m = MOODS[key];
    if(!m) return;
    applyAccent(m.accent);
    if(window.KevoBg) window.KevoBg.setHueRange(m.hue[0], m.hue[1]);
    if(window.KevoPlayer) window.KevoPlayer.setTracks(m.tracks);
    updateUISelection(key);
    announceMood(m.label);
  };

  // Set a sensible default on load
  window.addEventListener('DOMContentLoaded', ()=>{
    window.kevoSetMood('night-drive');
  });
})();
