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
  document.getElementById('progressLabel').innerHTML = myName ? `<span style="color:var(--page-strong);font-weight:800;font-family:'Montserrat',sans-serif">${myName}</span> ${dateLabel}完成度` : `${dateLabel}完成度`;
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
  applyPageTheme(page);
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
    requestAnimationFrame(()=>positionNavActive(activeBtn));
    setTimeout(()=>positionNavActive(activeBtn), 40);
    setTimeout(()=>positionNavActive(activeBtn), 160);
  }catch(e){}
  if(!isSamePage) window.scrollTo(0,0);
}

function applyPageTheme(page){
  const themeMap = {
    plan: 'plan',
    fitness: 'fitness',
    live: 'live',
    records: 'records'
  };
  document.body.dataset.theme = themeMap[page] || 'plan';
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
