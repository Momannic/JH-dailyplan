function configureEventsTicker(){
  const wrap=document.querySelector('.events-ticker-wrap');
  const ticker=document.getElementById('eventsTicker');
  if(!wrap || !ticker) return;
  const itemsHtml=ticker.dataset.itemsHtml || '';
  ticker.style.animation='none';
  ticker.style.transform='translate3d(0,0,0)';
  if(!itemsHtml){
    return;
  }
  ticker.innerHTML=`<span class="events-ticker-group">${itemsHtml}</span>`;
  const firstGroup=ticker.querySelector('.events-ticker-group');
  if(!firstGroup) return;
  const singleWidth=Math.ceil(firstGroup.scrollWidth);
  const viewportWidth=Math.ceil(wrap.clientWidth);
  if(singleWidth<=viewportWidth-8){
    return;
  }
  ticker.innerHTML=`<span class="events-ticker-group">${itemsHtml}</span><span class="events-ticker-group" aria-hidden="true">${itemsHtml}</span>`;
  const gap=28;
  const distance=singleWidth+gap;
  const duration=Math.max(6, Math.min(14, distance/84));
  ticker.style.setProperty('--ticker-distance', `${distance}px`);
  ticker.style.setProperty('--ticker-duration', `${duration}s`);
  void ticker.offsetWidth;
  ticker.style.animation='tickerScroll var(--ticker-duration) linear infinite';
}


async function loadEvents(){
  try {
    const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_progress?id=eq.__shared_events__`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
    const data=await res.json();
    renderEvents(data.length>0?(data[0].tasks||[]):[]);
  } catch(e){ console.warn('loadEvents error',e); }
}

async function addEvent(){
  const textEl=document.getElementById('eventsTextInput');
  const text=textEl.value.trim();
  if(!text){ textEl.focus(); return; }
  try {
    const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_progress?id=eq.__shared_events__`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
    const data=await res.json();
    const existing=data.length>0?(data[0].tasks||[]):[];
    const newEvent={id:Date.now().toString(), date:eventsSelectedDate, text, author:myName||'?', done:false};
    const updated=[...existing, newEvent];
    await fetch(`${SUPABASE_URL}/rest/v1/daily_progress`,{method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify({id:'__shared_events__',name:'shared',date:'2099-01-01',tasks:updated})
    });
    textEl.value='';
    eventsSelectedDate='';
    document.getElementById('eventsDateBtn').textContent='选择日期';
    const cal=document.getElementById('eventsCalendar');
    cal.classList.remove('open'); cal.classList.add('closed');
    renderEvents(updated);
  } catch(e){ alert('添加失败：'+e.message); }
}

async function deleteEvent(id){
  try {
    const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_progress?id=eq.__shared_events__`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
    const data=await res.json();
    const existing=data.length>0?(data[0].tasks||[]):[];
    const updated=existing.filter(e=>e.id!==id);
    await fetch(`${SUPABASE_URL}/rest/v1/daily_progress?id=eq.__shared_events__`,{method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`},
      body:JSON.stringify({tasks:updated})
    });
    renderEvents(updated);
  } catch(e){}
}

function renderEvents(events){
  const list=document.getElementById('eventsList');
  const ticker=document.getElementById('eventsTicker');
  list.innerHTML=events.length?events.map(e=>`
    <div class="event-item">
      ${e.date?`<div class="event-item-date">${e.date}</div>`:'<div class="event-item-date" style="color:#555">—</div>'}
      <div class="event-item-text">${e.text}${e.author?` <span style="font-size:10px;color:#555">— ${e.author}</span>`:''}</div>
      <button class="event-item-del" onclick="deleteEvent('${e.id}')">×</button>
    </div>`).join(''):'<div style="color:#555;font-size:12px;padding:8px 0">还没有日程，添加一个吧</div>';
  if(events.length===0){
    ticker.dataset.itemsHtml='';
    ticker.innerHTML='<span class="events-empty">添加重要日程…</span>';
    ticker.style.animation='none';
    ticker.style.transform='translate3d(0,0,0)';
  } else {
    const items=events.map(e=>`<span class="events-ticker-item">${e.date?`<span class="date-tag">${e.date} </span>`:''}${e.text}</span>`).join('');
    ticker.dataset.itemsHtml=items;
    configureEventsTicker();
  }
  renderLucideIcons();
}

function toggleEventsBanner(){
  if(eventsBarMoved) return;
  document.getElementById('eventsBanner').classList.toggle('open');
}

function toggleEventsCalendar(){
  const cal=document.getElementById('eventsCalendar');
  const isOpen=cal.classList.contains('open');
  cal.classList.toggle('open',!isOpen);
  cal.classList.toggle('closed',isOpen);
  if(!isOpen) renderEventsCalendar();
}

function renderEventsCalendar(){
  const months=['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  document.getElementById('eventsCalTitle').textContent=`${eventsCalYear} · ${months[eventsCalMonth]}`;
  const grid=document.getElementById('eventsCalGrid'); grid.innerHTML='';
  ['日','一','二','三','四','五','六'].forEach(d=>{
    const el=document.createElement('div'); el.className='cal-dow'; el.textContent=d; grid.appendChild(el);
  });
  const firstDay=new Date(eventsCalYear,eventsCalMonth,1).getDay();
  const daysInMonth=new Date(eventsCalYear,eventsCalMonth+1,0).getDate();
  const todayS=todayStr();
  for(let i=0;i<firstDay;i++){ const el=document.createElement('div'); el.className='cal-day empty'; grid.appendChild(el); }
  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${eventsCalYear}-${String(eventsCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const label=`${eventsCalMonth+1}/${d}`;
    const el=document.createElement('div'); el.className='cal-day';
    if(dateStr===todayS) el.classList.add('today');
    if(label===eventsSelectedDate) el.classList.add('selected');
    const num=document.createElement('span'); num.textContent=d; el.appendChild(num);
    el.onclick=()=>{
      eventsSelectedDate=label;
      document.getElementById('eventsDateBtn').textContent=label;
      const cal=document.getElementById('eventsCalendar');
      cal.classList.remove('open'); cal.classList.add('closed');
      renderEventsCalendar();
    };
    grid.appendChild(el);
  }
}

function eventsCalPrev(){ eventsCalMonth--; if(eventsCalMonth<0){eventsCalMonth=11;eventsCalYear--;} renderEventsCalendar(); }
function eventsCalNext(){ eventsCalMonth++; if(eventsCalMonth>11){eventsCalMonth=0;eventsCalYear++;} renderEventsCalendar(); }

loadEvents();
setInterval(loadEvents, 60000);
window.addEventListener('resize', ()=>{ configureEventsTicker(); });
window.addEventListener('load', ()=>{ setTimeout(configureEventsTicker, 120); });
if(document.fonts && document.fonts.ready){
  document.fonts.ready.then(()=>setTimeout(configureEventsTicker, 120)).catch(()=>{});
}

// 避免在移动端纵向滚动时误触发“重要日程”展开，造成滚动卡顿/回顶感
(function bindEventsBarTouchGuard(){
  const bar=document.querySelector('.events-bar');
  if(!bar) return;
  bar.addEventListener('touchstart', (e)=>{
    eventsBarMoved=false;
    eventsBarTouchY=e.touches&&e.touches[0]?e.touches[0].clientY:0;
  }, {passive:true});
  bar.addEventListener('touchmove', (e)=>{
    const y=e.touches&&e.touches[0]?e.touches[0].clientY:eventsBarTouchY;
    if(Math.abs(y-eventsBarTouchY)>8) eventsBarMoved=true;
  }, {passive:true});
  bar.addEventListener('touchend', ()=>{
    setTimeout(()=>{ eventsBarMoved=false; }, 120);
  }, {passive:true});
})();

