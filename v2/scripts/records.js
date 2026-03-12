async function loadRecordsPage() {
  const now=new Date();
  // 保留当前月份视图，默认显示今天
  if(!calYear){ calYear=now.getFullYear(); calMonth=now.getMonth(); }
  selectedCalDate=todayStr();
  // 显示 loading
  document.getElementById('feedList').innerHTML='<div class="loading">加载中…</div>';
  try {
    const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?order=date.desc,created_at.desc`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
    if(!res.ok) throw new Error('HTTP '+res.status);
    allLogs=await res.json();
    // 建立日期→打卡人映射
    calDates={};
    allLogs.forEach(r=>{ if(!calDates[r.date]) calDates[r.date]=[]; if(!calDates[r.date].includes(r.name)) calDates[r.date].push(r.name); });
    renderCalendar();
    renderFeed();
    if(allLogs.length) document.getElementById('exportBtn').style.display='block';
  } catch(e){
    console.error('loadRecordsPage error:', e);
    document.getElementById('feedList').innerHTML=`<div class="empty-state"><div class="state-icon-wrap">${icon('circle-alert','state')}</div><p>加载失败，请检查网络<br><small style="font-size:11px;opacity:0.6">${e.message}</small></p></div>`;
    renderLucideIcons();
  }
}

function renderCalendar() {
  const months=['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  document.getElementById('calTitle').textContent=`${calYear} · ${months[calMonth]}`;
  const grid=document.getElementById('calGrid'); grid.innerHTML='';
  ['日','一','二','三','四','五','六'].forEach(d=>{ const el=document.createElement('div'); el.className='cal-dow'; el.textContent=d; grid.appendChild(el); });
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const todayS=todayStr();
  for(let i=0;i<firstDay;i++){ const el=document.createElement('div'); el.className='cal-day empty'; grid.appendChild(el); }
  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const el=document.createElement('div'); el.className='cal-day';
    if(dateStr===todayS) el.classList.add('today');
    if(dateStr>todayS) el.classList.add('future');
    if(dateStr<todayS) el.classList.add('past');
    if(dateStr===selectedCalDate) el.classList.add('selected');
    const num=document.createElement('span'); num.textContent=d; el.appendChild(num);
    // dots
    const who=calDates[dateStr]||[];
    if(who.length>0){
      const dots=document.createElement('div'); dots.className='cal-dots';
      if(who.includes('HH')){ const dot=document.createElement('div'); dot.className='cal-dot hh'; dots.appendChild(dot); }
      if(who.includes('JLL')){ const dot=document.createElement('div'); dot.className='cal-dot jll'; dots.appendChild(dot); }
      el.appendChild(dots);
    }
    el.onclick=()=>selectCalDate(dateStr);
    grid.appendChild(el);
  }
}

function calPrevMonth(){ calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); }
function calNextMonth(){ calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); }

function toggleCalCard(){
  const card = document.getElementById('calCard'); if(!card) return;
  const isOpen = card.classList.contains('open');
  if(isOpen){ card.classList.remove('open'); card.classList.add('collapsed'); }
  else {
    card.classList.add('open');
    card.classList.remove('collapsed');
    renderCalendar();
  }
}

// Date selector sliding indicator
function createDateIndicator(){
  const row = document.querySelector('.date-row'); if(!row) return;
  if(row.querySelector('.date-active')) return;
  const ind=document.createElement('div'); ind.className='date-active'; row.insertBefore(ind, row.firstChild);
}
function positionDateIndicator(target){
  const row = document.querySelector('.date-row'); const ind=row&&row.querySelector('.date-active'); if(!row||!ind||!target) return;
  // compute left relative to row and width
  const rowRect=row.getBoundingClientRect(), tRect=target.getBoundingClientRect();
  const left = tRect.left - rowRect.left; const width = tRect.width;
  ind.style.width = width + 'px';
  ind.style.transform = `translateX(${left}px)`;
  ind.style.opacity = '1';
}

// Bottom nav active overlay
function createNavActive(){
  const nav=document.querySelector('.bottom-nav'); if(!nav) return;
  if(nav.querySelector('.nav-active')) return;
  const bar=document.createElement('div'); bar.className='nav-active'; nav.insertBefore(bar, nav.firstChild);
}
function positionNavActive(target){
  const nav=document.querySelector('.bottom-nav'); const bar=nav&&nav.querySelector('.nav-active'); if(!nav||!bar||!target) return;
  const nRect=nav.getBoundingClientRect(), tRect=target.getBoundingClientRect();
  const inset = 8;
  const left = (tRect.left - nRect.left) + inset;
  const width = Math.max(0, tRect.width - inset * 2);
  bar.style.width = width + 'px';
  bar.style.setProperty('--nav-x', `${left}px`);
  bar.style.transform = `translateX(${left}px)`;
  bar.classList.remove('nav-bounce');
  void bar.offsetWidth;
  bar.classList.add('nav-bounce');
}

function openDatePicker(e){
  if(e) e.stopPropagation();
  const input = document.getElementById('planDateInput');
  if(!input) return;
  // If flatpickr is initialized, open it
  try{ if(input._flatpickr && typeof input._flatpickr.open==='function'){ input._flatpickr.open(); return; } }catch(e){}
  // Prefer modern showPicker if available
  try{ if(typeof input.showPicker==='function'){ input.showPicker(); return; } }catch(err){}
  // Fallback: focus and dispatch click
  input.focus(); input.click();
}

function selectCalDate(dateStr) {
  selectedCalDate = dateStr;
  // 同步日历月份到选中日期
  const d=new Date(dateStr+'T00:00:00'); calYear=d.getFullYear(); calMonth=d.getMonth();
  renderCalendar();
  renderFeed();
  // 滚动到已发布日记列表
  const feed = document.getElementById('feedList');
  if(feed) feed.scrollIntoView({behavior:'smooth', block:'start'});
}

function renderFeed() {
  const list=document.getElementById('feedList'); list.innerHTML='';
  if(!allLogs.length){ list.innerHTML=`<div class="empty-state"><div class="state-icon-wrap">${icon('book-open','state')}</div><p>还没有日记<br>完成今日计划后发布吧！</p></div>`; renderLucideIcons(); return; }
  // 按日期分组
  const byDate={};
  allLogs.forEach(r=>{ if(!byDate[r.date]) byDate[r.date]=[]; byDate[r.date].push(r); });
  const sortedDates=Object.keys(byDate).sort((a,b)=>b.localeCompare(a));

  // 如果选择了特定日期，则仅显示该日期的记录；若无则提示没有发布
  if(selectedCalDate){
    const date=selectedCalDate;
    const recordsForDate=byDate[date]||[];
    if(!recordsForDate.length){
      list.innerHTML=`<div class="empty-state"><div class="state-icon-wrap">${icon('inbox','state')}</div><p>没有发布的日记记录</p></div>`;
      renderLucideIcons();
      return;
    }
    const sep=document.createElement('div'); sep.className='date-separator'+(isPast(date)&&!isToday(date)?' past':'');
    sep.innerHTML=`<div class="date-separator-line"></div><div class="date-separator-label">${formatDisplay(date)}</div><div class="date-separator-line"></div>`;
    list.appendChild(sep);
    recordsForDate.forEach(r=>renderFeedCard(r,list,isPast(date)&&!isToday(date)));
    // 仅当选中的是今天时，才尝试后台刷新今天任务
    const todayKey=todayStr();
    if(date===todayKey){
      (async ()=>{
        try {
          const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_progress?date=eq.${todayKey}&order=updated_at.desc`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
          const records=await res.json();
          if(records.length>0){
            const byName={}; records.forEach(r=>{ if(!byName[r.name]) byName[r.name]=r; });
            recordsForDate.forEach(originalRecord=>{
              if(byName[originalRecord.name]){
                const updatedRecord={...originalRecord, tasks:byName[originalRecord.name].tasks};
                const oldCard=document.getElementById(`feed-${originalRecord.id}`);
                if(oldCard){ const tmp=document.createElement('div'); renderFeedCard(updatedRecord,tmp,false); oldCard.parentNode.replaceChild(tmp.firstChild,oldCard); renderLucideIcons(); }
              }
            });
          }
        }catch(e){ console.warn('无法加载今天的最新任务', e); }
      })();
    }
    renderLucideIcons();
    return;
  }
  
  // 没有选中日期时，默认只显示今天
  const todayKey=todayStr();
  const todayRecords=byDate[todayKey]||[];
  if(!todayRecords.length){
    list.innerHTML=`<div class="empty-state"><div class="state-icon-wrap">${icon('notebook-pen','state')}</div><p>今天还没有日记<br>完成今日计划后发布吧！</p></div>`;
    renderLucideIcons();
    return;
  }
  const sep=document.createElement('div'); sep.className='date-separator';
  sep.innerHTML=`<div class="date-separator-line"></div><div class="date-separator-label">${formatDisplay(todayKey)}</div><div class="date-separator-line"></div>`;
  list.appendChild(sep);
  todayRecords.forEach(r=>renderFeedCard(r,list,false));

  // 后台刷新今天最新任务
  const todayKey2=todayKey;
  if(byDate[todayKey2]) {
    (async ()=>{
      try {
        const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_progress?date=eq.${todayKey2}&order=updated_at.desc`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
        const records=await res.json();
        if(records.length>0) {
          // 更新每个人今天的日记卡片
          const byName={};
          records.forEach(r=>{ 
            if(!byName[r.name]) byName[r.name]=r; 
          });
          // 找到原始的日记记录并更新任务数据
          byDate[todayKey2].forEach(originalRecord=>{
            if(byName[originalRecord.name]) {
              const updatedRecord={...originalRecord, tasks:byName[originalRecord.name].tasks};
              const oldCard=document.getElementById(`feed-${originalRecord.id}`);
              if(oldCard) {
                const tmp=document.createElement('div');
                renderFeedCard(updatedRecord,tmp,false);
                oldCard.parentNode.replaceChild(tmp.firstChild,oldCard);
                renderLucideIcons();
              }
            }
          });
        }
      } catch(e){ console.warn('无法加载今天的最新任务', e); }
    })();
  }
  renderLucideIcons();
}

function renderFeedCard(r,container,isPastDay=false){
  const div=document.createElement('div'); div.className='feed-card'+(isPastDay?' past':''); div.id=`feed-${r.id}`;
  const tasks=r.tasks||[], done=tasks.filter(t=>t.done).length, total=tasks.length;
  const pct=total===0?0:Math.round(done/total*100);
  const summaries=r.summaries&&r.summaries.length?r.summaries:(r.summary?[{text:r.summary,time:''}]:[]);
  const canEditDiary = !!myName && myName===r.name;
  const tasksHtml=tasks.length?`
    <div class="feed-section-title"><span class="icon-title">${icon('clipboard-list','small')}<span>计划 ${done}/${total} · ${pct}%</span></span></div>
    <div class="feed-tasks">${[...tasks].sort((a,b)=>{if(a.done!==b.done)return a.done?1:-1;return priOrder[a.pri]-priOrder[b.pri];}).map(t=>`
      <div class="feed-task ${t.done?'done':''}">
        <div class="feed-task-dot ${t.pri}"></div>
        <span>${t.text}</span>
        ${t.done?`<span class="feed-task-status">已完成</span>`:''}
      </div>`).join('')}
    </div>`:'';
  const workoutNorm=normalizeWorkout(r.workout_tags||[]);
  const isRest=workoutNorm.some(w=>isRestWorkoutName(w.name));
  const workoutHtml=workoutNorm.length?`
    <div class="feed-workout-card">
      <div class="feed-workout-title"><span class="icon-title">${icon('dumbbell','small')}<span>训练打卡</span></span></div>
      ${isRest ? `
        <div class="feed-workout-row">
          <span style="font-size:14px;font-weight:600;color:#4a90d9" class="icon-label">${icon('moon','small')}<span>休息</span></span>
        </div>
      ` : workoutNorm.map(w=>`
        <div class="feed-workout-row">
          <div style="width:22px;height:22px;border-radius:50%;border:2px solid ${w.done?'var(--green)':'rgba(26,22,20,0.22)'};background:${w.done?'var(--green)':'transparent'};display:flex;align-items:center;justify-content:center;font-size:11px;color:white;flex-shrink:0">${w.done?'✓':''}</div>
          <span style="font-size:14px;font-weight:600;color:${w.done?'var(--text)':'#6f6760'};${w.done?'':'opacity:0.92'}">${w.name}</span>
          <span class="feed-workout-state" style="color:${w.done?'var(--green)':'#8d847c'}">${w.done?'已完成':'未完成'}</span>
        </div>`).join('')}
    </div>`:''
  const foodHtml=(r.food_tags&&r.food_tags.length)||r.meals?`<div class="feed-section-title" style="margin-top:16px"><span class="icon-title">${icon('utensils-crossed','small')}<span>饮食${r.meals?' · '+(r.meals===4?'4顿+':r.meals+'顿'):''}</span></span></div><div class="feed-tags" style="margin-bottom:4px">${(r.food_tags||[]).map(f=>`<span class="feed-food-tag">${f}</span>`).join('')}</div>`:'';
  const summaryHtml=summaries.length?summaries.map((s,si)=>`
    <div class="feed-summary" id="sum-${r.id}-${si}">
      <div class="diary-top">
        ${s.time?`<div class="diary-time">${s.time}</div>`:'<div></div>'}
        ${canEditDiary?`<div class="diary-more-wrap">
          <button class="diary-more-btn" onclick="event.stopPropagation();toggleDiaryMenu('${r.id}',${si})" aria-label="更多操作">⋯</button>
          <div class="diary-more-menu hidden" id="dm-${r.id}-${si}">
            <button class="diary-more-item" onclick="event.stopPropagation();startEditDiary('${r.id}',${si})">编辑</button>
            <button class="diary-more-item danger" onclick="event.stopPropagation();openDeleteDiaryConfirm('${r.id}',${si})">删除</button>
          </div>
        </div>`:''}
      </div>
      <div class="diary-text" id="sum-text-${r.id}-${si}">${s.text}</div>
      <div class="diary-editor hidden" id="sum-edit-${r.id}-${si}">
        <textarea class="diary-editor-ta" id="sum-ta-${r.id}-${si}"></textarea>
        <div class="diary-editor-actions">
          <button class="mini-btn primary" onclick="event.stopPropagation();saveDiaryEdit('${r.id}',${si})">保存</button>
          <button class="mini-btn" onclick="event.stopPropagation();cancelDiaryEdit('${r.id}',${si})">取消</button>
        </div>
      </div>
      <div class="diary-delete-confirm hidden" id="sum-del-${r.id}-${si}">
        <span class="mini-tip">确认删除这条日记？</span>
        <button class="mini-btn" onclick="event.stopPropagation();cancelDeleteDiary('${r.id}',${si})">取消</button>
        <button class="mini-btn danger" onclick="event.stopPropagation();confirmDeleteDiary('${r.id}',${si})">确认</button>
      </div>
    </div>`).join(''):'';
  const reactions=r.reactions||{};
  const reactionHtml=REACTIONS.map(reaction=>{ const count=(reactions[reaction.key]||0)+(reactions[reaction.legacy]||0); return `<button class="reaction-btn ${count>0?'reacted':''}" onclick="toggleReaction('${r.id}','${reaction.key}')"><span>${reaction.emoji}</span><span class="reaction-count">${count>0?' '+count:''}</span></button>`; }).join('');
  const comments=Array.isArray(r.comments)?r.comments:Object.entries(r.comments||{}).map(([name,text])=>({name,text,time:''}));
  const commentsHtml=comments.map((c,ci)=>`<div class="comment-item"><span class="comment-name">${c.name}</span><span class="comment-text">${c.text}</span>${c.time?`<span class="comment-time">${c.time}</span>`:''}${(myName&&c.name===myName)?`<span class="comment-action"><button class="comment-del" onclick="event.stopPropagation();requestDeleteComment('${r.id}',${ci})" aria-label="删除评论">×</button><span class="comment-del-confirm hidden" id="cdel-${r.id}-${ci}"><span class="mini-tip">确认删除？</span><button class="mini-btn" onclick="event.stopPropagation();cancelDeleteComment('${r.id}',${ci})">取消</button><button class="mini-btn danger" onclick="event.stopPropagation();confirmDeleteComment('${r.id}',${ci})">删除</button></span></span>`:''}</div>`).join('');
  div.innerHTML=`
    <div class="feed-header"><span class="feed-name">${r.name}</span></div>
    ${tasksHtml}${workoutHtml}${foodHtml}${summaryHtml}
    <div class="feed-reactions">${reactionHtml}</div>
    <div class="feed-comment-section">${commentsHtml}
      <div class="comment-input-row">
        <input class="comment-input" id="ci-${r.id}" placeholder="留下评论…">
        <button class="comment-send-btn" onclick="sendComment('${r.id}')">发送</button>
      </div>
    </div>`;
  container.appendChild(div);
}

async function toggleReaction(logId,emoji){
  try {
    const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${logId}`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
    const records=await res.json(); if(!records.length) return;
    const r=records[0], reactions=r.reactions||{}; reactions[emoji]=(reactions[emoji]||0)+1;
    await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${logId}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`},body:JSON.stringify({reactions})});
    // 更新allLogs
    const idx=allLogs.findIndex(x=>x.id===logId); if(idx>=0) allLogs[idx].reactions=reactions;
    const container=document.getElementById('feedList'),oldCard=document.getElementById(`feed-${logId}`),tmp=document.createElement('div');
    renderFeedCard({...r,reactions},tmp,isPast(r.date)&&!isToday(r.date)); container.replaceChild(tmp.firstChild,oldCard);
    renderLucideIcons();
  } catch(e){console.error(e);}
}

function closeDiaryMenus(){
  document.querySelectorAll('.diary-more-menu').forEach(m=>m.classList.add('hidden'));
}
function toggleDiaryMenu(logId, idx){
  const m=document.getElementById(`dm-${logId}-${idx}`);
  if(!m) return;
  const willOpen=m.classList.contains('hidden');
  closeDiaryMenus();
  if(willOpen) m.classList.remove('hidden');
}
function getDiarySummariesFromRecord(r){
  return r.summaries&&r.summaries.length?[...r.summaries]:(r.summary?[{text:r.summary,time:''}]:[]);
}
function upsertAllLogsRecord(updated){
  const idx=allLogs.findIndex(x=>x.id===updated.id);
  if(idx>=0) allLogs[idx]=updated;
}
function rerenderLogCard(updated){
  const container=document.getElementById('feedList');
  const oldCard=document.getElementById(`feed-${updated.id}`);
  if(!container||!oldCard) return;
  const tmp=document.createElement('div');
  renderFeedCard(updated,tmp,isPast(updated.date)&&!isToday(updated.date));
  container.replaceChild(tmp.firstChild,oldCard);
  renderLucideIcons();
}
function startEditDiary(logId, idx){
  closeDiaryMenus();
  const card=allLogs.find(x=>String(x.id)===String(logId));
  if(!card || !myName || card.name!==myName) return;
  document.querySelectorAll('.diary-editor').forEach(el=>el.classList.add('hidden'));
  const textEl=document.getElementById(`sum-text-${logId}-${idx}`);
  const editEl=document.getElementById(`sum-edit-${logId}-${idx}`);
  const ta=document.getElementById(`sum-ta-${logId}-${idx}`);
  if(!textEl||!editEl||!ta) return;
  ta.value=(textEl.textContent||'').trim();
  ta.oninput=()=>autoResizeDiaryTextarea(ta);
  textEl.classList.add('hidden');
  editEl.classList.remove('hidden');
  autoResizeDiaryTextarea(ta);
}
function cancelDiaryEdit(logId, idx){
  const textEl=document.getElementById(`sum-text-${logId}-${idx}`);
  const editEl=document.getElementById(`sum-edit-${logId}-${idx}`);
  if(textEl) textEl.classList.remove('hidden');
  if(editEl) editEl.classList.add('hidden');
}
async function saveDiaryEdit(logId, idx){
  try{
    const ta=document.getElementById(`sum-ta-${logId}-${idx}`);
    if(!ta) return;
    const text=ta.value.trim();
    if(!text){ alert('内容不能为空'); return; }
    const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${logId}`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
    const records=await res.json(); if(!records.length) return;
    const r=records[0];
    if(!myName || r.name!==myName) return;
    const summaries=getDiarySummariesFromRecord(r);
    if(idx<0 || idx>=summaries.length) return;
    summaries[idx]={...summaries[idx], text};
    await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${logId}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`},body:JSON.stringify({summaries,summary:''})});
    const updated={...r,summaries,summary:''};
    upsertAllLogsRecord(updated);
    rerenderLogCard(updated);
  }catch(e){ alert('编辑失败，请重试'); }
}
function autoResizeDiaryTextarea(el){
  if(!el) return;
  el.style.height='auto';
  const maxH=420;
  const next=Math.min(el.scrollHeight, maxH);
  el.style.height=next+'px';
  el.style.overflowY=el.scrollHeight>maxH?'auto':'hidden';
}
function openDeleteDiaryConfirm(logId, idx){
  closeDiaryMenus();
  const card=allLogs.find(x=>String(x.id)===String(logId));
  if(!card || !myName || card.name!==myName) return;
  const box=document.getElementById(`sum-del-${logId}-${idx}`);
  if(box) box.classList.remove('hidden');
}
function cancelDeleteDiary(logId, idx){
  const box=document.getElementById(`sum-del-${logId}-${idx}`);
  if(box) box.classList.add('hidden');
}
async function confirmDeleteDiary(logId, idx){
  try{
    const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${logId}`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
    const records=await res.json(); if(!records.length) return;
    const r=records[0];
    if(!myName || r.name!==myName) return;
    const summaries=getDiarySummariesFromRecord(r);
    if(idx<0 || idx>=summaries.length) return;
    summaries.splice(idx,1);
    await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${logId}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`},body:JSON.stringify({summaries,summary:''})});
    const updated={...r,summaries,summary:''};
    upsertAllLogsRecord(updated);
    rerenderLogCard(updated);
  }catch(e){ alert('删除失败，请重试'); }
}

async function sendComment(logId){
  const input=document.getElementById(`ci-${logId}`),text=input.value.trim(); if(!text) return;
  if(!myName){alert('请先选择你是谁！');return;}
  try {
    const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${logId}`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
    const records=await res.json(); if(!records.length) return;
    const r=records[0];
    let comments=Array.isArray(r.comments)?r.comments:Object.entries(r.comments||{}).map(([name,text])=>({name,text,time:''}));
    const n=new Date(), timeStr=`${n.getMonth()+1}/${n.getDate()} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
    comments.push({name:myName,text,time:timeStr});
    await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${logId}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`},body:JSON.stringify({comments})});
    const idx=allLogs.findIndex(x=>x.id===logId); if(idx>=0) allLogs[idx].comments=comments;
    const container=document.getElementById('feedList'),oldCard=document.getElementById(`feed-${logId}`),tmp=document.createElement('div');
    renderFeedCard({...r,comments},tmp,isPast(r.date)&&!isToday(r.date)); container.replaceChild(tmp.firstChild,oldCard);
    document.getElementById(`ci-${logId}`).value='';
  } catch(e){alert('发送失败，请重试');}
}

function requestDeleteComment(logId, commentIndex){
  const card=allLogs.find(x=>String(x.id)===String(logId));
  if(!card) return;
  const comments=Array.isArray(card.comments)?card.comments:Object.entries(card.comments||{}).map(([name,text])=>({name,text,time:''}));
  const c=comments[commentIndex];
  if(!c || !myName || c.name!==myName) return;
  document.querySelectorAll('.comment-del-confirm').forEach(el=>el.classList.add('hidden'));
  const box=document.getElementById(`cdel-${logId}-${commentIndex}`);
  if(box) box.classList.remove('hidden');
}
function cancelDeleteComment(logId, commentIndex){
  const box=document.getElementById(`cdel-${logId}-${commentIndex}`);
  if(box) box.classList.add('hidden');
}
async function confirmDeleteComment(logId, commentIndex){
  try{
    const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${logId}`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
    const records=await res.json(); if(!records.length) return;
    const r=records[0];
    let comments=Array.isArray(r.comments)?r.comments:Object.entries(r.comments||{}).map(([name,text])=>({name,text,time:''}));
    if(commentIndex<0 || commentIndex>=comments.length) return;
    if(!myName || comments[commentIndex].name!==myName) return;
    comments.splice(commentIndex,1);
    await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${logId}`,{method:'PATCH',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`},body:JSON.stringify({comments})});
    const updated={...r,comments};
    upsertAllLogsRecord(updated);
    rerenderLogCard(updated);
  }catch(e){ alert('删除评论失败，请重试'); }
}

document.addEventListener('click', ()=>{
  closeDiaryMenus();
  document.querySelectorAll('.comment-del-confirm').forEach(el=>el.classList.add('hidden'));
  document.querySelectorAll('.diary-delete-confirm').forEach(el=>el.classList.add('hidden'));
});

async function exportCSV(){
  const rows=[['日期','姓名','计划完成','训练内容','饮食','心得']];
  allLogs.forEach(r=>{const tasks=r.tasks||[],done=tasks.filter(t=>t.done).length;rows.push([r.date,r.name,`${done}/${tasks.length}`,(r.workout_tags||[]).join('、'),(r.food_tags||[]).join('、'),r.summary||'']);});
  const csv='\uFEFF'+rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));a.download=`JH日记_${todayStr()}.csv`;a.click();
}
