async function loadLive() {
  const list=document.getElementById('liveList');
  list.innerHTML='<div class="loading">加载中…</div>';
  if(liveRefreshTimer) clearInterval(liveRefreshTimer);
  liveRefreshTimer=setInterval(loadLive,30000);
  try {
    const today=todayStr();
    const yest=new Date(); yest.setDate(yest.getDate()-1);
    const yestStr=`${yest.getFullYear()}-${String(yest.getMonth()+1).padStart(2,'0')}-${String(yest.getDate()).padStart(2,'0')}`;
    const ALL_NAMES=['HH','JLL'];

    // 并行拉取：今日进度 + 昨日进度（实时勾选）+ 昨日发布记录（兜底）
    const [progressRes, yestProgressRes, yestLogsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/daily_progress?date=eq.${today}&order=name.asc`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}}),
      fetch(`${SUPABASE_URL}/rest/v1/daily_progress?date=eq.${yestStr}&order=name.asc`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}}),
      fetch(`${SUPABASE_URL}/rest/v1/daily_logs?date=eq.${yestStr}&select=name,tasks`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}})
    ]);
    const progressRecords=await progressRes.json();
    const yestProgressRecords=await yestProgressRes.json();
    const yestLogs=await yestLogsRes.json();

    // 建立昨日任务索引：优先用 daily_progress（实时勾选最新），兜底用 daily_logs（发布记录）
    // daily_progress 里的 tasks 是每次勾选都会同步的，所以比 daily_logs 更准确
    const yestTasksByName={};
    yestLogs.forEach(r=>{ yestTasksByName[r.name]=r.tasks||[]; }); // 兜底
    yestProgressRecords.forEach(r=>{ yestTasksByName[r.name]=r.tasks||[]; }); // 覆盖为最新

    // 建立昨日未完成任务索引（按name）
    const yestUnfinished={};
    Object.entries(yestTasksByName).forEach(([name, tasks])=>{
      const unfinished=tasks.filter(t=>!t.done);
      if(unfinished.length>0) yestUnfinished[name]=unfinished;
    });

    // 今日已有进度的人名
    const todayNames=new Set(progressRecords.map(r=>r.name));

    list.innerHTML='';

    // 渲染今日已有进度的人
    progressRecords.forEach(r=>{
      list.appendChild(buildLiveCard(r.name, r.tasks||[], false));
    });

    // 对于今天还没开始的人，如果昨天有未完成任务，显示"待顺延"卡片
    ALL_NAMES.forEach(name=>{
      if(!todayNames.has(name) && yestUnfinished[name]){
        list.appendChild(buildPendingCard(name, yestUnfinished[name]));
      }
    });

    // 如果两人都没有任何记录
    if(!progressRecords.length && Object.keys(yestUnfinished).length===0){
      list.innerHTML='';
      list.innerHTML=`<div class="empty-state"><div class="state-icon-wrap">${icon('sunrise','state')}</div><p>今天还没有人开始计划<br>去添加任务吧！</p></div>`;
      renderLucideIcons();
      return;
    }

    const n=new Date(), refreshDiv=document.createElement('div');
    refreshDiv.className='live-refresh';
    refreshDiv.textContent=`每30秒自动刷新 · 上次 ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
    list.appendChild(refreshDiv);
    renderLucideIcons();
  } catch(e){ list.innerHTML=`<div class="empty-state"><div class="state-icon-wrap">${icon('circle-alert','state')}</div><p>加载失败，请检查网络</p></div>`; renderLucideIcons(); }
}

function buildLiveCard(name, tasks, isPending) {
  const done=tasks.filter(t=>t.done).length, total=tasks.length;
  const pct=total===0?0:Math.round(done/total*100);
  const barColor=progressColorByPct(pct);
  const sorted=[...tasks].sort((a,b)=>{if(a.done!==b.done)return a.done?1:-1;return priOrder[a.pri]-priOrder[b.pri];});
  const card=document.createElement('div'); card.className='live-card';
  card.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div class="live-name">${name}</div>
      <div class="live-pct" style="color:${barColor}">${pct}%</div>
    </div>
    <div class="progress-bar-bg" style="margin-bottom:12px">
      <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width 0.4s"></div>
    </div>
    <div class="live-task-list">${sorted.map(t=>`
      <div class="live-task-card ${t.pri||'mid'} ${t.done?'done':''}" style="pointer-events:none">
        <div class="live-task-check ${t.done?'done':(t.pri||'mid')}"></div>
        <div class="live-task-content">
          <span class="live-task-text">${t.text}</span>
          ${t.daysLate&&!t.done?`<span class="live-task-late">已拖${t.daysLate}天</span>`:''}
        </div>
        ${t.done?`<span class="live-task-status">已完成</span>`:''}
      </div>`).join('')}
    </div>
    <div style="font-family:Montserrat,sans-serif;font-size:10px;color:var(--muted);text-align:right;margin-top:6px">${done}/${total} 完成</div>`;
  return card;
}

function buildPendingCard(name, unfinishedTasks) {
  const card=document.createElement('div'); card.className='live-card';
  card.style.cssText='border:1.5px dashed var(--border);opacity:0.75';
  card.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div class="live-name">${name}</div>
      <div style="font-family:Montserrat,sans-serif;font-size:11px;color:var(--muted);background:var(--surface2);padding:3px 9px;border-radius:10px">今天还没开始</div>
    </div>
    <div style="display:flex;align-items:center;gap:6px;font-family:Montserrat,sans-serif;font-size:10px;color:var(--red);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">
      ${icon('triangle-alert','small')}
      <span>昨日 ${unfinishedTasks.length} 件未完成，待顺延</span>
    </div>
    <div class="live-task-list">${unfinishedTasks.map(t=>`
      <div class="live-task-card ${t.pri||'mid'}" style="pointer-events:none;opacity:0.82">
        <div class="live-task-check ${t.pri||'mid'}"></div>
        <div class="live-task-content">
          <span class="live-task-text">${t.text}</span>
        </div>
        <span style="margin-left:auto;font-size:10px;color:var(--muted);font-family:Montserrat,sans-serif">昨日未完成</span>
      </div>`).join('')}
    </div>`;
  return card;
}

