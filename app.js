const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const STORE="moodTimelineDataV1", PIN="moodTimelinePinV1";
let pinInput="", setupFirst=null, selectedFeelings=[], selectedEvents=[], quality=null, wakes=null;

const feelings=["😔 低落","😰 焦慮","😡 煩躁","😌 平靜","😊 愉快","⚡ 精力旺盛","😴 疲累","💭 思緒很多"];
const events=["💼 工作","🏠 家庭","❤️ 關係","🏃 健康","🌙 睡眠","🌱 自己","⋯ 其他"];
const qualities=["很差","差","普通","好","很好"], wakeOptions=["0次","1次","2次","3次以上"];

function data(){try{return JSON.parse(localStorage.getItem(STORE))||{moods:[],sleeps:[]}}catch{return {moods:[],sleeps:[]}}}
function save(d){localStorage.setItem(STORE,JSON.stringify(d))}
async function hashPin(pin){
  const bytes=new TextEncoder().encode("mood-timeline:"+pin);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function renderDots(){ $$("#dots i").forEach((d,i)=>d.classList.toggle("fill",i<pinInput.length)) }
async function digit(n){
  if(pinInput.length>=4)return; pinInput+=n; renderDots();
  if(pinInput.length===4){
    const saved=localStorage.getItem(PIN);
    if(!saved){
      if(setupFirst===null){setupFirst=pinInput; $("#pinHint").textContent="請再輸入一次確認 PIN"; pinInput=""; setTimeout(renderDots,180)}
      else if(pinInput===setupFirst){localStorage.setItem(PIN,await hashPin(pinInput)); unlock()}
      else{$("#pinHint").textContent="兩次 PIN 不相同，請重新設定";setupFirst=null;pinInput="";setTimeout(renderDots,180)}
    }else{
      if(await hashPin(pinInput)===saved) unlock();
      else{$("#pinHint").textContent="PIN 不正確，請再試一次";pinInput="";setTimeout(renderDots,180)}
    }
  }
}
function unlock(){pinInput="";setupFirst=null;renderDots();$("#lockScreen").classList.add("hidden");$("#mainScreen").classList.remove("hidden");renderTimeline()}
function lock(){ $("#mainScreen").classList.add("hidden");$("#lockScreen").classList.remove("hidden");$("#pinHint").textContent=localStorage.getItem(PIN)?"請輸入 4 位數 PIN":"建立你的 4 位數 PIN"}
for(let i=1;i<=9;i++){let b=document.createElement("button");b.textContent=i;b.onclick=()=>digit(String(i));$("#keypad").appendChild(b)}
let spacer=document.createElement("span");$("#keypad").appendChild(spacer);let zero=document.createElement("button");zero.textContent="0";zero.onclick=()=>digit("0");$("#keypad").appendChild(zero);
$("#clearPin").onclick=()=>{pinInput="";renderDots()}; $("#lockBtn").onclick=lock;

function chipGroup(el,arr,type){
  arr.forEach(v=>{let b=document.createElement("button");b.textContent=v;b.onclick=()=>{
    if(type==="feel"){let i=selectedFeelings.indexOf(v);if(i>=0)selectedFeelings.splice(i,1);else if(selectedFeelings.length<3)selectedFeelings.push(v);b.classList.toggle("selected",selectedFeelings.includes(v))}
    if(type==="event"){let i=selectedEvents.indexOf(v);if(i>=0)selectedEvents.splice(i,1);else selectedEvents.push(v);b.classList.toggle("selected",selectedEvents.includes(v))}
    if(type==="quality"){quality=v;[...el.children].forEach(x=>x.classList.toggle("selected",x.textContent===v))}
    if(type==="wakes"){wakes=v;[...el.children].forEach(x=>x.classList.toggle("selected",x.textContent===v))}
  };el.appendChild(b)})
}
chipGroup($("#feelings"),feelings,"feel");chipGroup($("#events"),events,"event");chipGroup($("#quality"),qualities,"quality");chipGroup($("#wakeCount"),wakeOptions,"wakes");

$("#moodRange").oninput=e=>$("#moodValue").textContent=(+e.target.value>0?"+":"")+e.target.value;
$("#saveMood").onclick=()=>{
  let d=data();d.moods.push({id:Date.now(),ts:new Date().toISOString(),score:+$("#moodRange").value,feelings:[...selectedFeelings],events:[...selectedEvents],note:$("#moodNote").value.trim()});save(d);
  $("#moodRange").value=0;$("#moodValue").textContent="0";selectedFeelings=[];selectedEvents=[];$("#moodNote").value="";$("#feelings").querySelectorAll("button").forEach(b=>b.classList.remove("selected"));$("#events").querySelectorAll("button").forEach(b=>b.classList.remove("selected"));alert("已儲存這次情緒紀錄");renderTimeline()
};

function duration(){
  let s=$("#sleepTime").value,w=$("#wakeTime").value;if(!s||!w){$("#sleepDuration").textContent="請輸入入睡與起床時間";return null}
  let [sh,sm]=s.split(":").map(Number),[wh,wm]=w.split(":").map(Number),mins=(wh*60+wm)-(sh*60+sm);if(mins<0)mins+=1440;
  $("#sleepDuration").textContent=`約 ${Math.floor(mins/60)} 小時 ${mins%60} 分鐘`;return mins
}
$("#sleepTime").onchange=duration;$("#wakeTime").onchange=duration;
$("#saveSleep").onclick=()=>{
  let mins=duration();if(mins===null){alert("請至少輸入入睡與起床時間");return}
  let d=data(), day=new Date().toISOString().slice(0,10);
  d.sleeps=d.sleeps.filter(x=>x.day!==day);d.sleeps.push({day,bed:$("#bedTime").value,sleep:$("#sleepTime").value,wake:$("#wakeTime").value,minutes:mins,quality,wakes,note:$("#sleepNote").value.trim()});save(d);alert("睡眠紀錄已儲存");renderTimeline()
};

$$(".tabs button").forEach(b=>b.onclick=()=>{$$(".tabs button").forEach(x=>x.classList.toggle("active",x===b));$$(".panel").forEach(p=>p.classList.add("hidden"));$("#"+b.dataset.tab).classList.remove("hidden");if(b.dataset.tab==="timeline")renderTimeline()});
function localDay(iso){let d=new Date(iso);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function renderTimeline(){
  let now=new Date(), day=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`, d=data(), rows=d.moods.filter(x=>localDay(x.ts)===day).sort((a,b)=>a.ts.localeCompare(b.ts));
  $("#timelineDate").textContent=`${now.getMonth()+1}月${now.getDate()}日`;$("#todayLabel").textContent=now.toLocaleDateString("zh-TW",{year:"numeric",month:"long",day:"numeric",weekday:"short"});
  if(rows.length){let vals=rows.map(x=>x.score);$("#summary").innerHTML=`<div>最低<b>${Math.min(...vals)}</b></div><div>最高<b>+${Math.max(...vals)}</b></div><div>次數<b>${rows.length}</b></div>`}
  else $("#summary").innerHTML="";
  $("#timelineList").innerHTML=rows.length?rows.map(x=>{let t=new Date(x.ts).toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit",hour12:false});let s=x.score>0?`+${x.score}`:x.score;return `<div class="entry"><div class="time">${t}</div><div class="badge">${s}</div><div><small>${[...x.feelings,...x.events].join(" · ")}</small>${x.note?`<p>${escapeHtml(x.note)}</p>`:""}</div></div>`}).join(""):`<div class="empty">今天還沒有情緒紀錄</div>`
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
$("#exportBtn").onclick=()=>{let blob=new Blob([JSON.stringify(data(),null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`mood-timeline-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)};
document.addEventListener("visibilitychange",()=>{if(document.hidden && !$("#mainScreen").classList.contains("hidden")) setTimeout(()=>{if(document.hidden)lock()},60000)});
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js");
lock();