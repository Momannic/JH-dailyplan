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
  const activeNavBtn=document.querySelector('.bottom-nav-btn.active');
  if(activeNavBtn) positionNavActive(activeNavBtn);
}, 220);
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


initRealtimeSync();
