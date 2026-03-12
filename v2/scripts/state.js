let sbClient = null;
let realtimeChannel = null;
let realtimeRefreshTimer = null;

let myName = localStorage.getItem('jh-identity') || '';
let pendingIdentity = myName || '';
let liveRefreshTimer = null;

let tasks = [], selectedPri = 'high', selectedMeals = 0, isResting = false, foodExpanded = false, foodEntries = [];
let taskInsertHint = null;
let lastTaskLocalEditAt = 0;
const taskToggleLock = new Set();
let planDate = todayStr();
let planCalYear, planCalMonth;
let pendingDeleteTaskId = null;

let workoutItems = [];
let workoutLogged = false;
let workoutTransitionHint = null;
let workoutInsertHint = null;

let calYear, calMonth, allLogs = [], calDates = {};
let selectedCalDate = null;

let eventsCalYear = new Date().getFullYear(), eventsCalMonth = new Date().getMonth();
let eventsSelectedDate = '';
let eventsBarMoved = false;
let eventsBarTouchY = 0;
