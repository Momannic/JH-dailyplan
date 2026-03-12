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

