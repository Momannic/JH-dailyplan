  let sbClient = null;
  let realtimeChannel = null;
  let realtimeRefreshTimer = null;

  function icon(name, cls=''){
    return `<i data-lucide="${name}" class="ui-icon ${cls}"></i>`;
  }
  function renderLucideIcons(){
    if(window.lucide && typeof window.lucide.createIcons === 'function'){
      window.lucide.createIcons();
    }
  }
  function isRestWorkoutName(name){
    return name === '休息' || name === '\uD83D\uDE34 休息';
  }
  const WORKOUT_EMOJI = {
    '休息':'😴',
    '胸':'💪',
    '背':'🏋️',
    '腿':'🦵',
    '臀':'🦵',
    '肩':'💪',
    '腹':'🔥',
    '三头':'💪',
    '二头':'💪',
    '热身':'🏃',
    '爬坡':'⛰️',
    '短跑':'🏃',
    '长跑':'🏃'
  };
  function workoutLabel(name){
    const mark = WORKOUT_EMOJI[name];
    if(!mark) return name;
    return `<span class="emoji-label"><span class="tag-emoji">${mark}</span><span>${name}</span></span>`;
  }
  function getWorkoutTagName(btn){
    return (btn?.dataset?.name || btn?.textContent || '').trim();
  }
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

  // ── Identity ──────────────────────────────
  let myName = localStorage.getItem('jh-identity') || '';
  let pendingIdentity = myName || '';

  function selectIdentityOption(name) {
    pendingIdentity = name;
    const overlay=document.getElementById('identityOverlay');
    overlay?.classList.remove('identity-hh','identity-jll');
    if(name==='HH') overlay?.classList.add('identity-hh');
    if(name==='JLL') overlay?.classList.add('identity-jll');
    document.getElementById('identityBtnHH')?.classList.toggle('active', name === 'HH');
    document.getElementById('identityBtnJLL')?.classList.toggle('active', name === 'JLL');
    document.getElementById('identityConfirmBtn')?.classList.remove('hidden');
  }
  function confirmIdentity() {
    if (!pendingIdentity) return;
    const changed = myName !== pendingIdentity;
    myName = pendingIdentity;
    localStorage.setItem('jh-identity', myName);
    document.getElementById('identityOverlay').classList.add('hidden');
    document.getElementById('switchBtn').textContent = myName + ' · 切换';
    triggerMainEnterMotion();
    if (changed) refreshAfterIdentityChange();
    else {
      updateProgressLabel();
      loadTasks();
      requestAnimationFrame(updateFoodCollapseLayout);
    }
  }
  function setIdentity(name) {
    myName = name; localStorage.setItem('jh-identity', name);
    document.getElementById('identityOverlay').classList.add('hidden');
    document.getElementById('switchBtn').textContent = name + ' · 切换';
    triggerMainEnterMotion();
    refreshAfterIdentityChange();
    requestAnimationFrame(updateFoodCollapseLayout);
  }
  function switchIdentity() {
    pendingIdentity = myName || '';
    selectIdentityOption(pendingIdentity);
    document.getElementById('identityOverlay').classList.remove('hidden');
  }
  // 身份切换后刷新所有页面内容
  function refreshAfterIdentityChange() {
    // 重置日期回今天，避免停留在上一个身份选中的日期
    planDate=todayStr();
    document.getElementById('dateBtnToday') && document.querySelectorAll('#page-plan .date-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('dateBtnToday') && document.getElementById('dateBtnToday').classList.add('active');
    const fakeBtn=document.getElementById('dateFakeBtn'); if(fakeBtn){fakeBtn.innerHTML=`<span class="icon-button-label">${icon('calendar-days','small')}<span>选择日期</span></span>`;fakeBtn.classList.remove('active');}
    tasks=[]; renderTasks(); updateProgressLabel();
    setFinishBtnDefault();
    document.getElementById('summaryInput').value='';
    // 重置健身/饮食选项
    document.querySelectorAll('#tagsGrid .tag').forEach(t=>t.classList.remove('selected','gym-pending','gym-done'));
    workoutItems=[]; workoutLogged=false;
    renderWorkoutUI();
    foodEntries=[];
    updateFoodSummary();
    const foodInput=document.getElementById('newFoodInput'); if(foodInput) foodInput.value='';
    const foodSaveBtn=document.getElementById('foodSaveBtn'); if(foodSaveBtn){ foodSaveBtn.disabled=false; foodSaveBtn.classList.remove('success'); foodSaveBtn.innerHTML=`<span class="icon-button-label">${icon('notebook-pen','small')}<span>记入日记</span></span>`; }
    selectedMeals=0; isResting=false;
    // 刷新动态和日记（如果当前在这些页面）
    const livePage=document.getElementById('page-live');
    const recordsPage=document.getElementById('page-records');
    if(livePage&&livePage.classList.contains('active')) loadLive();
    if(recordsPage&&recordsPage.classList.contains('active')) loadRecordsPage();
    // 重新拉取新身份的今日任务
    loadTasks();
  }
  function initIdentity() {
      if (myName) {
        document.getElementById('switchBtn').textContent = myName + ' · 切换';
        updateProgressLabel();
        selectIdentityOption(myName);
      }
      renderLucideIcons();
  }
  function updateProgressLabel() {
    const today = todayStr();
    let dateLabel;
    if (!planDate || planDate === today) {
      dateLabel = '今日';
    } else {
      const yest = new Date(); yest.setDate(yest.getDate()-1);
      const yestStr = `${yest.getFullYear()}-${String(yest.getMonth()+1).padStart(2,'0')}-${String(yest.getDate()).padStart(2,'0')}`;
      if (planDate === yestStr) {
        dateLabel = '昨日';
      } else {
        const d = new Date(planDate+'T00:00:00');
        dateLabel = `${d.getMonth()+1}月${d.getDate()}日`;
      }
    }
    document.getElementById('progressLabel').innerHTML = myName ? `<span style="color:var(--yellow);font-weight:800;font-family:'Montserrat',sans-serif">${myName}</span> ${dateLabel}完成度` : `${dateLabel}完成度`;
  }
  function triggerMainEnterMotion(){
    document.body.classList.remove('main-entering');
    void document.body.offsetWidth;
    document.body.classList.add('main-entering');
    setTimeout(()=>document.body.classList.remove('main-entering'), 420);
  }

  function queueRealtimeRefresh() {
    if (realtimeRefreshTimer) clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(async () => {
      try {
        if (!myName) return;
        await loadTasks();
        const activePage = (document.querySelector('.page.active') || {}).id || '';
        if (activePage === 'page-live') await loadLive();
        if (activePage === 'page-records') await loadRecordsPage();
      } catch (e) {
        console.warn('realtime refresh error', e);
      }
    }, 250);
  }

  function initRealtimeSync() {
    try {
      if (!window.supabase || typeof window.supabase.createClient !== 'function') return;
      if (!sbClient) sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      if (realtimeChannel) {
        sbClient.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
      realtimeChannel = sbClient
        .channel('jh-realtime-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_progress' }, () => queueRealtimeRefresh())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, () => queueRealtimeRefresh())
        .subscribe();
    } catch (e) {
      console.warn('init realtime failed', e);
    }
  }

  // ── Utils ──────────────────────────────────
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function formatDisplay(s) {
    const d = new Date(s+'T00:00:00');
    const days=['日','一','二','三','四','五','六'];
    return `${d.getMonth()+1}月${d.getDate()}日 周${days[d.getDay()]}`;
  }
  function isToday(s){ return s===todayStr(); }
  function isPast(s){ return s<todayStr(); }

  const now = new Date();
  const daysW = ['日','一','二','三','四','五','六'];
  document.getElementById('headerDate').innerHTML = `${now.getMonth()+1}月${now.getDate()}日 周${daysW[now.getDay()]}`;

  // ── Page nav ───────────────────────────────
  let liveRefreshTimer = null;
  function showPage(page) {
    const current=document.querySelector('.page.active');
    const currentPage=current?current.id.replace('page-',''):'';
    const isSamePage=(currentPage===page);
    const navIndex={plan:0,fitness:1,live:2,records:3};
    if(page!=='live' && liveRefreshTimer){ clearInterval(liveRefreshTimer); liveRefreshTimer=null; }
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('page-'+page).classList.add('active');
    document.querySelectorAll('.bottom-nav-btn')[navIndex[page]].classList.add('active');
    if(page==='records') loadRecordsPage();
    if(page==='live') loadLive();
    if(page==='plan' && !isSamePage) { 
      // 确保每次进入计划页都刷新任务与日历
      loadTasks();
      renderPlanCalendar();
      // 进一步确保渲染完成后任务列表可见
      setTimeout(()=>{ try{ renderTasks(); }catch(e){} }, 0);
      requestAnimationFrame(updateFoodCollapseLayout);
    }
    if(page==='fitness' && !isSamePage) {
      loadWorkoutState();
      updateFoodSummary();
      requestAnimationFrame(updateFoodCollapseLayout);
    }
    // 移动底栏覆盖指示条
    try{
      const activeBtn = document.querySelectorAll('.bottom-nav-btn')[navIndex[page]];
      positionNavActive(activeBtn);
    }catch(e){}
    if(!isSamePage) window.scrollTo(0,0);
  }

  // ══ PLAN ═══════════════════════════════════
  let tasks=[], selectedPri='high', selectedMeals=0, isResting=false, foodExpanded=false, foodEntries=[];
  let taskInsertHint = null; // {id, at}
  let lastTaskLocalEditAt = 0;
  const taskToggleLock = new Set();
  let planDate = todayStr();
  // Plan page calendar state
  let planCalYear, planCalMonth;

  function tasksKey(d){ return 'jh-tasks-'+(d||planDate); }
  function tasksKeyNew(d){ return 'jh-tasks-'+(myName||'_')+'--'+(d||planDate); }

  function finishBtnDefaultHtml(){
    return `<span class="icon-button-label">${icon('share-2','small')}<span>完成今日任务，点击分享</span></span>`;
  }
  function finishBtnContinueHtml(){
    return `<span class="icon-button-label">${icon('share-2','small')}<span>继续分享</span></span>`;
  }
  function setFinishBtnDefault(){
    const btn=document.getElementById('finishBtn');
    if(!btn) return;
    btn.innerHTML=finishBtnDefaultHtml();
    renderLucideIcons();
  }
  function setFinishBtnContinue(){
    const btn=document.getElementById('finishBtn');
    if(!btn) return;
    btn.innerHTML=finishBtnContinueHtml();
    renderLucideIcons();
  }

  function selectPlanDate(btn, type) {
    closePlanCalDropdown();
    document.querySelectorAll('#page-plan .date-btn').forEach(b=>b.classList.remove('active'));
    const fakeBtn = document.getElementById('dateFakeBtn');
    fakeBtn.classList.remove('active');
    
    // 先设置 planDate
    if(type==='today'){
      planDate=todayStr();
    } else if(type==='yesterday'){
      const d=new Date(); d.setDate(d.getDate()-1);
      planDate=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    } else {
      // 自定义日期由内联日历选择，不再从输入框读取
      if(!planDate) planDate=todayStr();
    }
    
    // 更新 UI
    if(type==='today'){
      document.getElementById('dateBtnToday').classList.add('active');
      fakeBtn.innerHTML=`<span class="icon-button-label">${icon('calendar-days','small')}<span>选择日期</span></span>`; 
    } else if(type==='yesterday'){
      document.getElementById('dateBtnYesterday').classList.add('active');
      fakeBtn.innerHTML=`<span class="icon-button-label">${icon('calendar-days','small')}<span>选择日期</span></span>`;
    } else {
      const d=new Date(planDate+'T00:00:00');
      fakeBtn.textContent=`${d.getMonth()+1}/${d.getDate()}`;
      fakeBtn.classList.add('active');
    }
    
    positionDateIndicator(document.querySelector('#page-plan .date-btn.active') || fakeBtn);
    
    // 非今天时重置按钮文字（checkTodayPublished在loadTasks里会处理今天的情况）
    if(planDate!==todayStr()) setFinishBtnDefault();
    updateProgressLabel();
    // 加载任务和渲染
    loadTasks();
    renderPlanCalendar();
  }

  function togglePlanCalDropdown(){
    const dropdown = document.getElementById('planCalDropdown'); if(!dropdown) return;
    const isOpen = dropdown.classList.contains('open');
    if(isOpen){ dropdown.classList.remove('open'); dropdown.classList.add('closed'); }
    else { dropdown.classList.add('open'); dropdown.classList.remove('closed'); renderPlanCalendar(); }
  }
  
  function closePlanCalDropdown(){
    const dropdown = document.getElementById('planCalDropdown');
    if(dropdown){ dropdown.classList.remove('open'); dropdown.classList.add('closed'); }
  }

  function renderPlanCalendar() {
    const now=new Date();
    // 如果 planDate 更新了，同步日历到该日期的月份
    const selectedDate=new Date(planDate+'T00:00:00');
    if(planCalYear!==selectedDate.getFullYear() || planCalMonth!==selectedDate.getMonth()){
      planCalYear = selectedDate.getFullYear();
      planCalMonth = selectedDate.getMonth();
    }
    if(!planCalYear) planCalYear = now.getFullYear();
    if(planCalMonth === undefined || planCalMonth === null) planCalMonth = now.getMonth();
    const months=['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    document.getElementById('planCalTitle').textContent=`${planCalYear} · ${months[planCalMonth]}`;
    const grid=document.getElementById('planCalGrid'); grid.innerHTML='';
    ['日','一','二','三','四','五','六'].forEach(d=>{ const el=document.createElement('div'); el.className='cal-dow'; el.textContent=d; grid.appendChild(el); });
    const firstDay=new Date(planCalYear,planCalMonth,1).getDay();
    const daysInMonth=new Date(planCalYear,planCalMonth+1,0).getDate();
    const todayS=todayStr();
    for(let i=0;i<firstDay;i++){ const el=document.createElement('div'); el.className='cal-day empty'; grid.appendChild(el); }
    for(let d=1;d<=daysInMonth;d++){
      const dateStr=`${planCalYear}-${String(planCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const el=document.createElement('div'); el.className='cal-day';
      if(dateStr===todayS) el.classList.add('today');
      if(dateStr>todayS) el.classList.add('future');
      if(dateStr<todayS) el.classList.add('past');
      if(dateStr===planDate) el.classList.add('selected');
      const num=document.createElement('span'); num.textContent=d; el.appendChild(num);
      el.onclick=()=>selectPlanDateFromCal(dateStr);
      grid.appendChild(el);
    }
  }

  function planCalPrevMonth(){ planCalMonth--; if(planCalMonth<0){planCalMonth=11;planCalYear--;} renderPlanCalendar(); }
  function planCalNextMonth(){ planCalMonth++; if(planCalMonth>11){planCalMonth=0;planCalYear++;} renderPlanCalendar(); }

  function selectPlanDateFromCal(dateStr){
    planDate = dateStr;
    updateProgressLabel();
    const d = new Date(dateStr+'T00:00:00');
    // 清掉其他日期按钮的 active 状态
    document.querySelectorAll('#page-plan .date-btn').forEach(b=>b.classList.remove('active'));
    // 更新假按钮显示
    const fakeBtn = document.getElementById('dateFakeBtn');
    if(fakeBtn) { fakeBtn.textContent = `${d.getMonth()+1}/${d.getDate()}`; fakeBtn.classList.add('active'); }
    // 关闭日历下拉菜单
    closePlanCalDropdown();
    // 加载任务
    loadTasks();
    // 重新渲染日历以更新选中状态，并更新滑动指示器
    renderPlanCalendar();
    setTimeout(()=>{ positionDateIndicator(fakeBtn); },60);
  }

  async function loadTasks() {
    const reqStartedAt = Date.now();
    if(!myName){ renderTasks(); workoutItems=[]; renderWorkoutUI(); return; }
    // 刚做过本地勾选时，短时间内不接受远端回包覆盖，避免进度“点了又回去/不更新”
    if(planDate===todayStr() && (Date.now()-lastTaskLocalEditAt)<1500){
      renderTasks();
      checkTodayPublished();
      await loadWorkoutState();
      return;
    }
    tasks=[];
    try {
      if(planDate===todayStr()) {
        // 今天：先查 daily_progress（最实时）
        const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_progress?id=eq.${myName}-${planDate}`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
        const records=await res.json();
        if(records.length>0 && records[0].tasks && records[0].tasks.length>0) {
          if(lastTaskLocalEditAt > reqStartedAt){ renderTasks(); checkTodayPublished(); await loadWorkoutState(); return; }
          tasks=records[0].tasks;
          renderTasks(); checkTodayPublished(); await loadWorkoutState(); return;
        }
        // daily_progress 没有，再查 daily_logs（已发布的）
        const res2=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${myName}-${planDate}&select=tasks`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
        const logs=await res2.json();
        if(logs.length>0 && logs[0].tasks && logs[0].tasks.length>0) {
          if(lastTaskLocalEditAt > reqStartedAt){ renderTasks(); checkTodayPublished(); await loadWorkoutState(); return; }
          tasks=logs[0].tasks;
          renderTasks(); checkTodayPublished(); await loadWorkoutState(); return;
        }
        // 今天完全没有记录，从过去7天 Supabase 里找未完成任务顺延
        const carried=[], seen=new Set();
        for(let i=1;i<=7;i++){
          const d=new Date(); d.setDate(d.getDate()-i);
          const dateStr=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          try {
            // 优先查 daily_progress（最新勾选状态）
            const r1=await fetch(`${SUPABASE_URL}/rest/v1/daily_progress?id=eq.${myName}-${dateStr}&select=tasks`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
            const d1=await r1.json();
            let dayTasks=d1.length>0?d1[0].tasks:null;
            if(!dayTasks){
              const r2=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${myName}-${dateStr}&select=tasks`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
              const d2=await r2.json();
              dayTasks=d2.length>0?d2[0].tasks:null;
            }
            if(dayTasks){
              dayTasks.filter(t=>!t.done).forEach(t=>{
                const oid=t.originId||t.id;
                if(!seen.has(oid)){
                  seen.add(oid);
                  const od=new Date(); od.setDate(od.getDate()-i);
                  const fallbackOrigin=`${od.getFullYear()}-${String(od.getMonth()+1).padStart(2,'0')}-${String(od.getDate()).padStart(2,'0')}`;
                  const originDate=t.originDate||fallbackOrigin;
                  const daysLate=Math.max(1, Math.floor((new Date(todayStr())-new Date(originDate))/86400000));
                  carried.push({...t,id:Date.now().toString()+Math.random().toString().slice(2),originId:oid,pri:'high',daysLate,originDate,done:false});
                }
              });
              if(carried.length>0) break; // 找到最近一天有记录的就停
            }
          } catch(e){}
        }
        if(carried.length>0){ tasks=carried; syncProgress(); }
      } else {
        // 历史日期：查 daily_progress 优先，再查 daily_logs
        const r1=await fetch(`${SUPABASE_URL}/rest/v1/daily_progress?id=eq.${myName}-${planDate}&select=tasks`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
        const d1=await r1.json();
        if(d1.length>0 && d1[0].tasks && d1[0].tasks.length>0){ tasks=d1[0].tasks; }
        else {
          const r2=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${myName}-${planDate}&select=tasks`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
          const d2=await r2.json();
          if(d2.length>0 && d2[0].tasks) tasks=d2[0].tasks;
        }
      }
    } catch(e){ console.warn('loadTasks error', e); }
    if(planDate===todayStr() && lastTaskLocalEditAt > reqStartedAt){ renderTasks(); checkTodayPublished(); await loadWorkoutState(); return; }
    renderTasks();
    checkTodayPublished();
    await loadWorkoutState();
  }

  async function loadWorkoutState(){
    if(!myName){ workoutItems=[]; renderWorkoutUI(); return; }
    try{
      let loaded=[];
      const r1=await fetch(`${SUPABASE_URL}/rest/v1/daily_progress?id=eq.${myName}-${planDate}&select=workout_tags`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
      const d1=await r1.json();
      if(d1.length>0 && d1[0].workout_tags) loaded=normalizeWorkout(d1[0].workout_tags);
      else {
        const r2=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${myName}-${planDate}&select=workout_tags`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
        const d2=await r2.json();
        if(d2.length>0 && d2[0].workout_tags) loaded=normalizeWorkout(d2[0].workout_tags);
      }
      workoutItems=loaded;
      workoutLogged=workoutItems.some(i=>i.done);
      isResting=workoutItems.some(i=>isRestWorkoutName(i.name));
    } catch(e){ console.warn('loadWorkoutState failed',e); workoutItems=[]; }
    renderWorkoutUI();
  }

  function saveTasks() {
    if(planDate===todayStr() && myName) syncProgress();
  }

  async function syncProgress() {
    const base={id:`${myName}-${planDate}`,name:myName,date:planDate,tasks,updated_at:new Date().toISOString()};
    const full={...base, workout_tags:workoutItems};
    try {
      let res=await fetch(`${SUPABASE_URL}/rest/v1/daily_progress`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(full)
      });
      // 兼容表结构差异：若 full payload 被拒，降级为只同步任务，确保进度可更新
      if(!res.ok){
        const err=await res.text();
        console.warn('syncProgress full payload failed, fallback to tasks-only:', err);
        res=await fetch(`${SUPABASE_URL}/rest/v1/daily_progress`,{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'resolution=merge-duplicates,return=minimal'},
          body:JSON.stringify(base)
        });
      }
      if(!res.ok){
        const err2=await res.text();
        console.warn('syncProgress failed:', err2);
      }
    } catch(e){
      console.warn('syncProgress failed:', e);
    }
  }

  function progressColorByPct(pct){
    const safe=Math.max(0, Math.min(100, Number(pct)||0));
    const hue=Math.round((safe/100)*120); // 0=red, 60=yellow, 120=green
    return `hsl(${hue} 82% 50%)`;
  }

  async function upsertLiveDiaryLog(partial={}){
    if(!myName || planDate!==todayStr()) return;
    const logId=`${myName}-${planDate}`;
    try{
      const headers={'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`};
      let prev=null;
      let targetId=logId;

      const directRes=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${logId}`,{headers});
      if(directRes.ok){
        const rows=await directRes.json();
        if(rows.length){
          prev=rows[0];
          targetId=rows[0].id||logId;
        }
      }
      if(!prev){
        const fallbackRes=await fetch(
          `${SUPABASE_URL}/rest/v1/daily_logs?name=eq.${encodeURIComponent(myName)}&date=eq.${planDate}&order=updated_at.desc&limit=1`,
          {headers}
        );
        if(fallbackRes.ok){
          const rows=await fallbackRes.json();
          if(rows.length){
            prev=rows[0];
            targetId=rows[0].id||logId;
          }
        }
      }

      const existingSummaries=prev
        ? (prev.summaries&&prev.summaries.length?prev.summaries:(prev.summary?[{text:prev.summary,time:''}]:[]))
        : [];
      const existingComments=prev
        ? (Array.isArray(prev.comments)?prev.comments:Object.entries(prev.comments||{}).map(([name,text])=>({name,text,time:''})))
        : [];

      const record={
        id: targetId,
        name: myName,
        date: planDate,
        tasks: partial.tasks!==undefined ? partial.tasks : (prev?.tasks||[]),
        workout_tags: partial.workout_tags!==undefined ? partial.workout_tags : normalizeWorkout(prev?.workout_tags||[]),
        food_tags: partial.food_tags!==undefined ? partial.food_tags : (prev?.food_tags||[]),
        meals: partial.meals!==undefined ? partial.meals : (prev?.meals||0),
        summaries: partial.summaries!==undefined ? partial.summaries : existingSummaries,
        summary: '',
        reactions: partial.reactions!==undefined ? partial.reactions : (prev?.reactions||{}),
        comments: partial.comments!==undefined ? partial.comments : existingComments
      };

      const upsertRes=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(record)
      });
      if(!upsertRes.ok){
        const err=await upsertRes.text();
        console.warn('upsertLiveDiaryLog failed:', err);
      }
    } catch(e){
      console.warn('upsertLiveDiaryLog failed:', e);
    }
  }

  // 勾选任务后同步更新 daily_logs 里的 tasks，确保日记里的进度永远是最新的
  async function syncTasksToLog() {
    if(!myName || planDate!==todayStr()) return;
    await upsertLiveDiaryLog({tasks:[...tasks]});
  }

  function renderTasks() {
    console.log('renderTasks: start, tasks.length=', tasks.length);
    const list=document.getElementById('taskList');
    console.log('renderTasks: taskList element=', list);
    const sorted=[...tasks].sort((a,b)=>{ if(a.done!==b.done) return a.done?1:-1; return priOrder[a.pri]-priOrder[b.pri]; });
    const canDelete = planDate===todayStr();
    if(!sorted.length){ list.innerHTML=`<div class="empty-state"><div class="state-icon-wrap">${icon('sparkles','state')}</div><p>今天还没有计划<br>添加第一件事吧！</p></div>`; }
    else { list.innerHTML=sorted.map(t=>`
      <div class="task-item ${t.done?'done':''} ${shouldAnimateTaskInsert(t.id)?'anim-enter':''}" data-task-id="${t.id}" onclick="toggleTask('${t.id}')">
        <div class="task-status ${t.pri}">${t.done?'✓':''}</div>
        <div class="task-text">${t.text}${!t.done&&t.originDate?`<span class="days-late">已拖${Math.max(1,Math.floor((new Date(todayStr())-new Date(t.originDate))/86400000))}天</span>`:t.daysLate&&!t.done?`<span class="days-late">已拖${t.daysLate}天</span>`:''}</div>
        <div class="task-actions">
          ${canDelete?`<button class="task-delete" onclick="event.stopPropagation();requestDeleteTask('${t.id}')" aria-label="删除任务">${icon('trash-2','small')}</button>`:''}
        </div>
      </div>`).join(''); }
    clearTaskInsertHint();
    console.log('renderTasks: innerHTML updated, taskList.innerHTML.length=', list.innerHTML.length);
    renderLucideIcons();
    updateProgress();
  }

  function markTaskInsert(id){
    taskInsertHint={id:String(id),at:Date.now()};
  }
  function shouldAnimateTaskInsert(id){
    return !!(taskInsertHint && taskInsertHint.id===String(id) && Date.now()-taskInsertHint.at<900);
  }
  function clearTaskInsertHint(){
    if(taskInsertHint && Date.now()-taskInsertHint.at>=900) taskInsertHint=null;
  }
  function findTaskCardById(id){
    const list=document.getElementById('taskList');
    if(!list) return null;
    const cards=list.querySelectorAll('.task-item');
    for(const card of cards){
      if(String(card.dataset.taskId)===String(id)) return card;
    }
    return null;
  }

  function updateProgress() {
    const total=tasks.length, done=tasks.filter(t=>t.done).length;
    const pct=total===0?0:Math.round(done/total*100);
    const color=progressColorByPct(pct);
    document.getElementById('progressPctBig').textContent = pct+'%';
    document.getElementById('progressPctBig').style.color = color;
    document.getElementById('progressBar').style.width=pct+'%';
    document.getElementById('progressBar').style.background=`linear-gradient(90deg, ${color}, ${color})`;
    document.getElementById('progressSub').textContent=
      total===0?'今天还没有任务，加油！':
      pct===100?'全部完成！今天非常棒':
      pct>=75?`${done}/${total} 快了！`:
      pct>=50?`${done}/${total} 过半啦！`:
      pct>0?`${done}/${total} 继续！`:`共 ${total} 件事，开始吧！`;
  }

  async function toggleTask(id){ 
    if(taskToggleLock.has(id)) return;
    taskToggleLock.add(id);
    const t=tasks.find(t=>String(t.id)===String(id)); 
    if(t){
      t.done=!t.done;
      if(t.done){
        // 完成任务即终止拖延链，避免次日继续在旧链条上累加
        delete t.originDate;
        delete t.daysLate;
      }
      lastTaskLocalEditAt = Date.now();
      saveTasks();
      renderTasks();
      // 如果是今天的任务，同时同步到 Supabase
      if(planDate===todayStr() && myName) {
        try{
          await syncProgress();
          await syncTasksToLog(); // 同步最新勾选状态到 daily_logs，保证日记进度永远最新
        }catch(e){}
      }
      // 如果日记页面已打开，重新加载日记以显示最新的任务状态
      if(document.getElementById('page-records').classList.contains('active')) {
        loadRecordsPage();
      }
    }
    setTimeout(()=>taskToggleLock.delete(id), 900);
  }
  let pendingDeleteTaskId = null;

  function requestDeleteTask(id){
    if(planDate!==todayStr()) return;
    pendingDeleteTaskId = id;
    const overlay=document.getElementById('deleteConfirmOverlay');
    if(overlay) overlay.classList.remove('hidden');
  }

  function closeDeleteConfirm(){
    pendingDeleteTaskId = null;
    const overlay=document.getElementById('deleteConfirmOverlay');
    if(overlay) overlay.classList.add('hidden');
  }

  function confirmDeleteTask(){
    if(!pendingDeleteTaskId){ closeDeleteConfirm(); return; }
    const id=pendingDeleteTaskId;
    closeDeleteConfirm();
    removeTaskWithAnim(id);
  }

  function removeTaskWithAnim(id){
    const card=findTaskCardById(id);
    if(!card){
      deleteTask(id);
      return;
    }
    card.classList.remove('anim-enter');
    card.classList.add('anim-exit');
    setTimeout(()=>deleteTask(id),220);
  }

  function deleteTask(id){
    if(planDate!==todayStr()) return;
    const before=tasks.length;
    tasks=tasks.filter(t=>String(t.id)!==String(id));
    if(tasks.length===before) return;
    lastTaskLocalEditAt = Date.now();
    saveTasks();
    renderTasks();
    const recordsOpen=document.getElementById('page-records').classList.contains('active');
    if(planDate===todayStr() && myName){
      Promise.all([syncProgress(), syncTasksToLog()]).finally(()=>{
        if(recordsOpen) loadRecordsPage();
      });
      return;
    }
    if(recordsOpen) loadRecordsPage();
  }
  function selectPri(btn,pri){ document.querySelectorAll('.pri-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); selectedPri=pri; }
  function addTask(){
    const input=document.getElementById('taskInput'),text=input.value.trim(); if(!text) return;
    const id=Date.now().toString();
    tasks.push({id,text,pri:selectedPri,done:false});
    markTaskInsert(id);
    lastTaskLocalEditAt = Date.now();
    saveTasks(); 
    renderTasks(); 
    input.value='';
    const recordsOpen=document.getElementById('page-records').classList.contains('active');
    // 同步到 Supabase
    if(planDate===todayStr() && myName) {
      Promise.all([syncProgress(), syncTasksToLog()]).finally(()=>{
        if(recordsOpen) loadRecordsPage();
      });
      return;
    }
    // 如果日记页面已打开，重新加载以显示最新任务
    if(recordsOpen) loadRecordsPage();
  }
  function toggleRestOrTag(){
    const restName='休息';
    const idx=workoutItems.findIndex(i=>i.name===restName);
    if(idx===-1){
      workoutItems=[{name:restName,done:false}];
      markWorkoutInsert(restName);
      onWorkoutChanged();
      return;
    }
    removeWorkoutItemWithAnim(restName);
  }
  function toggleWorkoutTag(btn){
    const name=getWorkoutTagName(btn);
    workoutItems=workoutItems.filter(i=>!isRestWorkoutName(i.name));
    const idx=workoutItems.findIndex(i=>i.name===name);
    if(idx===-1){
      workoutItems.push({name,done:false});
      markWorkoutInsert(name);
      onWorkoutChanged();
      return;
    }
    removeWorkoutItemWithAnim(name);
  }
  function toggleTag(btn){ if(btn) btn.classList.toggle('selected'); updateFoodSummary(); }
  function removeCustomWorkoutTag(btn){
    const name=btn.textContent.trim();
    btn.remove();
    if(!workoutItems.some(i=>i.name===name)) return;
    removeWorkoutItemWithAnim(name);
  }
  function addCustomTag(){
    const i=document.getElementById('newTagInput'),v=i.value.trim();
    if(!v) return;
    const b=document.createElement('button');
    b.className='tag custom-workout-tag';
    b.textContent=v;
    b.onclick=function(){ removeCustomWorkoutTag(this); };
    document.getElementById('tagsGrid').appendChild(b);
    i.value='';
    workoutItems=workoutItems.filter(i=>!isRestWorkoutName(i.name));
    if(!workoutItems.some(w=>w.name===v)){
      workoutItems.push({name:v,done:false});
      markWorkoutInsert(v);
    }
    onWorkoutChanged();
  }
  function addCustomFood(){
    const input=document.getElementById('newFoodInput');
    const raw=(input?.value||'').trim();
    if(!raw) return;
    const nextItems=raw
      .split(/[\n,，、]/)
      .map(v=>v.trim())
      .filter(Boolean);
    nextItems.forEach(item=>{
      if(!foodEntries.includes(item)) foodEntries.push(item);
    });
    if(input) input.value='';
    updateFoodSummary();
  }
  function selectMeals(btn,n){ selectedMeals=0; }
  function getSelectedWorkout(){ return workoutItems; } // 返回 [{name, done}]

  // ── 健身打卡（与今日计划同逻辑） ──
  let workoutItems=[]; // [{name, done}]
  let workoutLogged=false;
  let workoutTransitionHint=null; // {name, toDone, at}
  let workoutInsertHint=null; // {name, at}

  function markWorkoutInsert(name){
    workoutInsertHint={name,at:Date.now()};
  }
  function shouldAnimateWorkoutInsert(name){
    return !!(workoutInsertHint && workoutInsertHint.name===name && Date.now()-workoutInsertHint.at<800);
  }
  function clearWorkoutInsertHint(){
    if(workoutInsertHint && Date.now()-workoutInsertHint.at>=800) workoutInsertHint=null;
  }
  function findWorkoutCardByName(name){
    const list=document.getElementById('gymTaskList');
    if(!list) return null;
    const cards=list.querySelectorAll('.gym-plan-item');
    for(const card of cards){
      if(card.dataset.name===name) return card;
    }
    return null;
  }
  function removeWorkoutItemWithAnim(name){
    const card=findWorkoutCardByName(name);
    if(!card){
      workoutItems=workoutItems.filter(i=>i.name!==name);
      onWorkoutChanged();
      return;
    }
    card.classList.remove('anim-enter');
    card.classList.add('anim-exit');
    setTimeout(()=>{
      workoutItems=workoutItems.filter(i=>i.name!==name);
      onWorkoutChanged();
    },220);
  }

  function renderWorkoutUI(){
    renderWorkoutList();
    applyWorkoutTagStyles();
  }

  function renderWorkoutList(){
    const list=document.getElementById('gymTaskList');
    if(!list) return;
    if(!workoutItems.length){
      list.style.display='none';
      list.innerHTML='';
      return;
    }
    list.style.display='block';
    list.innerHTML='';
    workoutItems.forEach((item,i)=>{
      const isRest=isRestWorkoutName(item.name);
      const emoji = WORKOUT_EMOJI[isRest?'休息':item.name] || '🏋️';
      const div=document.createElement('div');
      const animClass = (
        workoutTransitionHint &&
        workoutTransitionHint.name===item.name &&
        Date.now()-workoutTransitionHint.at<700 &&
        !isRest
      ) ? (workoutTransitionHint.toDone?'anim-to-done':'anim-to-pending') : '';
      div.className='gym-plan-item '+(isRest?'rest':(item.done?'done':'pending'))+(animClass?` ${animClass}`:'');
      div.dataset.name=isRest?'休息':item.name;
      if(shouldAnimateWorkoutInsert(isRest?'休息':item.name)) div.classList.add('anim-enter');
      if(!isRest){
        div.onclick=()=>{
          const nextDone=!workoutItems[i].done;
          workoutTransitionHint={name:item.name,toDone:nextDone,at:Date.now()};
          workoutItems[i].done=nextDone;
          onWorkoutChanged();
        };
      }
      div.innerHTML=`
        <div class="gym-plan-card-left">
          <div class="gym-plan-card-badge">${emoji}</div>
          <div class="gym-plan-card-meta">
            <div class="gym-plan-card-name">${isRest?'休息':item.name}</div>
            <div class="gym-plan-card-sub">${isRest?'休息模式':(item.done?'点击取消训练':'点击完成训练')}</div>
          </div>
        </div>
        <div class="gym-plan-card-action">${item.done?'已完成':'未完成'}</div>`;
      list.appendChild(div);
    });
    clearWorkoutInsertHint();
    renderLucideIcons();
  }

  function applyWorkoutTagStyles(){
    const map={};
    workoutItems.forEach(i=>{ map[i.name]=i; });
    document.querySelectorAll('#tagsGrid .tag').forEach(tag=>{
      const name=getWorkoutTagName(tag);
      tag.classList.remove('selected','gym-pending','gym-done');
      const item=map[name];
      if(!item) return;
      tag.classList.add('selected');
    });
  }

  function onWorkoutChanged(){
    workoutLogged=workoutItems.length>0;
    isResting=workoutItems.some(i=>isRestWorkoutName(i.name));
    renderWorkoutUI();
    const recordsOpen=document.getElementById('page-records').classList.contains('active');
    if(planDate===todayStr() && myName){
      syncWorkoutToLog().finally(()=>{
        if(recordsOpen) loadRecordsPage();
      });
      return;
    }
    if(recordsOpen) loadRecordsPage();
  }

  async function startWorkout(){ return; }
  async function finishWorkout(){ return; }
  function resetWorkout(){ workoutItems=[]; onWorkoutChanged(); }

  async function syncWorkoutToLog(){
    if(!myName || planDate!==todayStr()) return;
    try {
      await upsertLiveDiaryLog({workout_tags:normalizeWorkout(workoutItems)});
      await syncProgress();
    } catch(e){ console.warn('syncWorkoutToLog failed',e); }
  }

  // 兼容旧格式（字符串数组）和新格式（对象数组）
  function normalizeWorkout(arr){
    return (arr||[]).map(w=>{
      if(typeof w==='string') return {name:isRestWorkoutName(w)?'休息':w,done:true};
      return {...w, name:isRestWorkoutName(w.name)?'休息':w.name};
    });
  }
  function getSelectedFoods(){ return [...foodEntries]; }

  function toggleFoodExpand(){ foodExpanded=!foodExpanded; }

  function updateFoodCollapseLayout(){
    const btn=document.getElementById('foodExpandBtn');
    if(btn) btn.style.display='none';
  }

  function updateFoodSummary(){
    const summary=document.getElementById('foodSelectedSummary');
    const tags=document.getElementById('foodSelectedTags');
    if(!summary || !tags) return;
    if(foodEntries.length===0){ summary.style.display='none'; tags.innerHTML=''; return; }
    summary.style.display='block';
    tags.innerHTML='';
    foodEntries.forEach(item=>{
      const chip=document.createElement('button');
      chip.type='button';
      chip.className='food-selected-tag';
      chip.innerHTML=`<span>${item}</span><span class="food-selected-x">×</span>`;
      chip.onclick=()=>{
        foodEntries=foodEntries.filter(v=>v!==item);
        updateFoodSummary();
      };
      tags.appendChild(chip);
    });
  }

  async function saveFoodToDiary(){
    if(!myName){ alert('请先选择你是谁！'); return; }
    const foods=getSelectedFoods();
    if(!foods.length){ alert('请先填写今天吃了什么'); return; }

    const btn=document.getElementById('foodSaveBtn');
    if(btn){ btn.disabled=true; btn.textContent='保存中…'; }

    const logId=`${myName}-${planDate}`;
    try{
      const getRes=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${logId}`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
      if(!getRes.ok) throw new Error('读取现有数据失败');
      const existing=await getRes.json();
      const prev=existing.length>0?existing[0]:null;

      const prevTasks=prev?(prev.tasks||[]):[];
      const localIds=new Set(tasks.map(t=>t.originId||t.id));
      const onlyInPrev=prevTasks.filter(t=>!localIds.has(t.originId||t.id));
      const mergedTasks=[...tasks, ...onlyInPrev];

      const currentWorkout=normalizeWorkout(getSelectedWorkout());
      const mergedWorkout=currentWorkout.length ? currentWorkout : normalizeWorkout(prev?prev.workout_tags||[]:[]);

      const mergedFoods=[...new Set([...(prev?prev.food_tags||[]:[]), ...foods])];
      const mergedMeals=prev?prev.meals||0:0;

      const mergedSummaries=prev?(prev.summaries&&prev.summaries.length?prev.summaries:(prev.summary?[{text:prev.summary,time:''}]:[])):[];
      const mergedReactions=prev?prev.reactions||{}:{};
      const mergedComments=prev?(Array.isArray(prev.comments)?prev.comments:Object.entries(prev.comments||{}).map(([name,text])=>({name,text,time:''}))):[];

      const record={
        id:logId, name:myName, date:planDate,
        tasks:mergedTasks,
        workout_tags:mergedWorkout,
        food_tags:mergedFoods,
        meals:mergedMeals,
        summaries:mergedSummaries,
        summary:'',
        reactions:mergedReactions,
        comments:mergedComments
      };

      const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(record)
      });
      if(!res.ok) throw new Error(await res.text());

      if(btn){
        btn.innerHTML=`<span class="icon-button-label">${icon('check','small')}<span>已记入日记</span></span>`;
        btn.classList.add('success');
        setTimeout(()=>{
          btn.classList.remove('success');
          btn.disabled=false;
          btn.innerHTML=`<span class="icon-button-label">${icon('notebook-pen','small')}<span>记入日记</span></span>`;
          renderLucideIcons();
        },1400);
      }
      if(document.getElementById('page-records').classList.contains('active')) loadRecordsPage();
      checkTodayPublished();
    }catch(e){
      if(btn){ btn.disabled=false; btn.innerHTML=`<span class="icon-button-label">${icon('notebook-pen','small')}<span>记入日记</span></span>`; }
      alert('保存失败，请重试\n'+e.message);
      console.error(e);
    }
  }

  async function submitToday(){
    if(!myName){alert('请先选择你是谁！');return;}
    if(!tasks.length){alert('今天还没有任何计划任务哦！');return;}
    const summaryText=document.getElementById('summaryInput').value.trim();
    const newWorkout=getSelectedWorkout(), newFoods=getSelectedFoods();
    const btn=document.getElementById('finishBtn');
      btn.innerHTML=`<span class="icon-button-label">${icon('send','small')}<span>发布中…</span></span>`; btn.disabled=true; renderLucideIcons();
    const logId=`${myName}-${planDate}`;
    const n=new Date();
    const timeStr=`${n.getMonth()+1}/${n.getDate()} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
    try {
      // 先拉取已有记录 —— 拉取失败直接中止，绝不覆盖任何已有数据
      const getRes=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${logId}`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
      if(!getRes.ok) throw new Error('读取现有数据失败，请检查网络后重试');
      const existing=await getRes.json();
      const prev=existing.length>0?existing[0]:null;

      // 任务：用当前本地最新的（包含勾选状态），但如果旧记录有本地没有的任务也保留
      const prevTasks=prev?(prev.tasks||[]):[];
      const localIds=new Set(tasks.map(t=>t.originId||t.id));
      const onlyInPrev=prevTasks.filter(t=>!localIds.has(t.originId||t.id));
      const mergedTasks=[...tasks, ...onlyInPrev];

      // 训练：以当前页面状态为准（有选择则覆盖，没选择则保留旧记录）
      const currentWorkout=normalizeWorkout(newWorkout);
      const mergedWorkout=currentWorkout.length ? currentWorkout : normalizeWorkout(prev ? (prev.workout_tags || []) : []);

      // 饮食：合并去重
      const mergedFoods=[...new Set([...(prev?prev.food_tags||[]:[]), ...newFoods])];

      // 顿数：取最大值（今天吃的只会越来越多）
      const mergedMeals=prev?prev.meals||0:0;

      // 心得：追加新条（有内容才加）
      let mergedSummaries=[];
      if(prev){
        if(prev.summaries&&prev.summaries.length) mergedSummaries=[...prev.summaries];
        else if(prev.summary) mergedSummaries=[{text:prev.summary,time:''}];
      }
      if(summaryText) mergedSummaries.push({text:summaryText, time:timeStr});

      // 评论和点赞：完整保留
      const mergedReactions=prev?prev.reactions||{}:{};
      const mergedComments=prev?(Array.isArray(prev.comments)?prev.comments:Object.entries(prev.comments||{}).map(([name,text])=>({name,text,time:''}))):[];

      const record={
        id:logId, name:myName, date:planDate,
        tasks:mergedTasks,
        workout_tags:mergedWorkout,
        food_tags:mergedFoods,
        meals:mergedMeals,
        summaries:mergedSummaries,
        summary:'',
        reactions:mergedReactions,
        comments:mergedComments
      };
      const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(record)});
      if(!res.ok) throw new Error(await res.text());
      document.getElementById('summaryInput').value='';
      btn.innerHTML=`<span class="icon-button-label">${icon('check','small')}<span>已分享</span></span>`; btn.classList.add('success'); renderLucideIcons();
      setTimeout(()=>{ btn.classList.remove('success'); btn.disabled=false; checkTodayPublished(); },2000);
    } catch(e){ btn.disabled=false; checkTodayPublished(); alert('发布失败，请重试\n'+e.message); console.error(e); }
  }

  // 检查今天是否已发布，更新按钮文字
  async function checkTodayPublished() {
    if(!myName || planDate!==todayStr()) {
      setFinishBtnDefault();
      return;
    }
    try {
      const res=await fetch(`${SUPABASE_URL}/rest/v1/daily_logs?id=eq.${myName}-${planDate}&select=id`,{headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`}});
      const data=await res.json();
      if(data.length>0){ setFinishBtnContinue(); }
      else { setFinishBtnDefault(); }
    } catch(e){ setFinishBtnDefault(); }
  }

  // ══ LIVE ═══════════════════════════════════
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

  // ══ CALENDAR + RECORDS ════════════════════
  let calYear, calMonth, allLogs=[], calDates={};
  let selectedCalDate = null;

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
    const left = tRect.left - nRect.left; const width = tRect.width;
    bar.style.width = width + 'px';
    bar.style.transform = `translateX(${left}px)`;
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

  function applyNativeAppClass(){
    try{
      const capNative = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform==='function' && window.Capacitor.isNativePlatform());
      const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      const ua = navigator.userAgent || '';
      const webviewUA = /\bwv\b/i.test(ua);
      if(capNative || standalone || webviewUA){
        document.body.classList.add('capacitor-app');
      }
    }catch(e){}
  }

  // ── Init ─────────────────────────────────
  // 移除过时的 planDateInput 与 flatpickr 初始化，改为使用内联日历
  console.log('=== Initialization started ===');
  applyNativeAppClass();
  document.body.classList.add('app-in');
  setTimeout(()=>document.body.classList.remove('app-in'), 320);
  initIdentity();
  updateProgressLabel();
  console.log('Before loadTasks: planDate=', planDate, 'myName=', myName);
  (async()=>{
    console.log('Async IIFE: before loadTasks');
    await loadTasks();
    console.log('Async IIFE: after loadTasks, before renderPlanCalendar');
    renderPlanCalendar();
    console.log('Async IIFE: after renderPlanCalendar, calling showPage(\'plan\')');
    showPage('plan');
    setTimeout(()=>{ try{ renderTasks(); }catch(e){} }, 0);
    // 首屏明确检查按钮状态（loadTasks里调用时myName可能还没ready）
    await checkTodayPublished();
  })();
  // 初始化滑动高亮指示器
  console.log('About to createDateIndicator');
  createDateIndicator();
  // 初始化底栏覆盖指示条
  createNavActive();
  setTimeout(()=>{
    const activeNavBtn=document.querySelector('.bottom-nav-btn.active');
    if(activeNavBtn) positionNavActive(activeNavBtn);
  }, 60);
  setTimeout(()=>{
    const active = document.querySelector('.date-row .date-btn.active') || document.getElementById('dateFakeBtn');
    if(active) positionDateIndicator(active);
    updateFoodCollapseLayout();
    setTimeout(updateFoodCollapseLayout, 280);
  },60);
  window.addEventListener('resize',()=>{
    const active = document.querySelector('.date-row .date-btn.active') || document.getElementById('dateFakeBtn');
    if(active) positionDateIndicator(active);
    const activeNavBtn=document.querySelector('.bottom-nav-btn.active');
    if(activeNavBtn) positionNavActive(activeNavBtn);
    updateFoodCollapseLayout();
  });

  // ══ 重要日程 ══
  let eventsCalYear=new Date().getFullYear(), eventsCalMonth=new Date().getMonth();
  let eventsSelectedDate=''; // 'M/D' 格式
  let eventsBarMoved=false;
  let eventsBarTouchY=0;

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

  initRealtimeSync();
