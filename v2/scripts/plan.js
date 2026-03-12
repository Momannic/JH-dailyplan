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
