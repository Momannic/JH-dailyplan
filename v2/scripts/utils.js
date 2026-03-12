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


function progressColorByPct(pct){
  const safe=Math.max(0, Math.min(100, Number(pct)||0));
  const hue=Math.round((safe/100)*120); // 0=red, 60=yellow, 120=green
  return `hsl(${hue} 82% 50%)`;
}
