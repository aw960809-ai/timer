(() => {
  // ===== 防呆：錯誤直接顯示在畫面上 =====
  const $ = (id) => document.getElementById(id);

  const debugBox = $("debugBox");
  function debug(msg){
    if (debugBox) debugBox.textContent = "Debug：" + msg;
  }

  window.addEventListener("error", (e) => {
    debug("JS 錯誤：" + (e.message || e.error || "unknown"));
  });
  window.addEventListener("unhandledrejection", (e) => {
    debug("Promise 錯誤：" + (e.reason?.message || String(e.reason)));
  });

  // ===== 先確保基本元素存在 =====
  const phaseTextEl = $("phaseText");
  const timerDisplayEl = $("timerDisplay");
  const progressBarEl = $("progressBar");

  if (!debugBox || !phaseTextEl || !timerDisplayEl || !progressBarEl) {
    debug("缺少必要元素：debugBox/phaseText/timerDisplay/progressBar（請確認 index.html）");
    return;
  }

  phaseTextEl.textContent = "JS 已載入 vFIX（請點任一角色）";
  debug("JS 已載入 vFIX");

  // ===== 可能不存在的元素：全部容錯 =====
  const startBtn = $("startBtn");
  const pauseBtn = $("pauseBtn");
  const resetBtn = $("resetBtn");
  const modeBtn = $("modeBtn");

  const prepareInput = $("prepareTime");
  const actionInput  = $("actionTime");
  const restInput    = $("restTime");
  const cyclesInput  = $("cycles");

  const historyListEl = $("historyList");
  const historyHintEl = $("historyHint");
  const exportArea = $("exportArea");
  const exportBtn = $("exportBtn");
  const clearBtn = $("clearBtn");

  // ===== 狀態 =====
  let currentCharacter = null;
  let timer = null;

  let timeLeft = 0;
  let phaseTotal = 0;

  let currentPhase = "idle";
  let currentCycle = 0;
  let totalCycles = 3;

  let isRunning = false;
  let isPaused = false;

  let teaseMode = "clean";
  let lastTeaseLine = "";

  const characterConfig = {
    seductive: { name: "御姐" },
    innocent:  { name: "JK" },
    yandere:   { name: "病嬌" },
    succubus:  { name: "魅魔" },
    jock:      { name: "體育生" },
    junior:    { name: "學弟" },
    straight:  { name: "直男" }
  };

  const teaseLinesClean = {
    seductive:{select:["敢選我，就要撐到最後。","把目光放回我這裡。","別退縮，開始。"],prepare:["先把呼吸收好。","慢慢升溫。","把雜念清掉。"],action:["照我的節奏走。","不准分心。","再撐一下。"],rest:["休息可以，但別放鬆。","下一輪更難。","喝口水回來。"],finish:["表現不錯。","今天先到這。","下次再加強。"]},
    innocent:{select:["你、你真的選我嗎…","那我會認真帶你…","不可以欺負我喔…"],prepare:["慢慢來就好。","把步調抓好。","先準備一下…"],action:["加油！別停！","再一下就好！","你很厲害耶…"],rest:["先休息一下。","喝水、深呼吸…","等下再繼續。"],finish:["辛苦了…","你做到了。","下次也一起。"]},
    yandere:{select:["選我就別想逃。","你只能聽我的。","把注意力交出來。"],prepare:["把雜念清掉。","別讓我失望。","聽話一點。"],action:["不准停。","我說繼續就繼續。","很好…乖乖照做。"],rest:["休息，但不准離開。","我在看著。","喘夠了就回來。"],finish:["很好，你很乖。","記住今天。","下次也要選我。"]},
    succubus:{select:["讓我看看你的意志。","選得真好。","我會慢慢加強。"],prepare:["先熱身…","把節奏交給我。","別急。"],action:["繼續…別躲。","很好…再多一點。","越努力我越喜歡。"],rest:["我允許你喘口氣。","別放空…我還在。","把渴望收好。"],finish:["真乖。","今天先放過你。","下次再來。"]},
    jock:{select:["別怕強度。","敢跟上就開始。","把狀態拉滿。"],prepare:["姿勢做對。","呼吸穩住。","我不會放水。"],action:["衝！別停！","很好，再撐！","撐到結束！"],rest:["喘口氣，下一輪更狠。","喝水，別裝死。","站起來回到節奏。"],finish:["漂亮！","不錯，有種。","下次再加強。"]},
    junior:{select:["我會努力跟上你…","那我開始囉！","你別笑我緊張…"],prepare:["準備好就點頭。","別急，我在旁邊。","先把步調抓好。"],action:["再一下！","加油！我在看！","你真的很強…"],rest:["我幫你算時間。","喝水、調整呼吸。","下一輪…更穩一點。"],finish:["我替你記下來了！","辛苦了！","下次也帶著我。"]},
    straight:{select:["行，開始。","照規矩來。","把效率拿出來。"],prepare:["準備好就別找藉口。","等下別拖。","呼吸穩住。"],action:["撐完。","別停，繼續。","維持住。"],rest:["休息，別浪費時間。","喝水，下一輪。","喘夠了就回來。"],finish:["結束。","不錯。","下次再來。"]}
  };
  const teaseLinesAdult = {
    seductive:{select:[],prepare:[],action:[],rest:[],finish:[]},
    innocent:{select:[],prepare:[],action:[],rest:[],finish:[]},
    yandere:{select:[],prepare:[],action:[],rest:[],finish:[]},
    succubus:{select:[],prepare:[],action:[],rest:[],finish:[]},
    jock:{select:[],prepare:[],action:[],rest:[],finish:[]},
    junior:{select:[],prepare:[],action:[],rest:[],finish:[]},
    straight:{select:[],prepare:[],action:[],rest:[],finish:[]}
  };

  // ===== 歷史（容錯）=====
  const HISTORY_KEY = "extreme_control_training_history_pwa_safe_v1";
  function loadHistory(){
    try{
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch{ return []; }
  }
  function saveHistory(arr){
    try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); }catch{}
  }

  // ===== 工具 =====
  function clampInt(v,min,max,fb){
    const n=parseInt(v,10);
    if(Number.isNaN(n)) return fb;
    return Math.min(max, Math.max(min, n));
  }
  function formatMMSS(sec){
    sec=Math.max(0,sec|0);
    const mm=String(Math.floor(sec/60)).padStart(2,'0');
    const ss=String(sec%60).padStart(2,'0');
    return `${mm}:${ss}`;
  }
  function setTimerDisplay(sec){ timerDisplayEl.textContent = formatMMSS(sec); }
  function setProgress(p){ progressBarEl.style.width = Math.min(100,Math.max(0,p)) + "%"; }
  function applyPhaseBackground(){
    document.body.classList.remove("bg-idle","bg-prepare","bg-action","bg-rest");
    document.body.classList.add(`bg-${currentPhase}`);
  }
  function setBodyTheme(key){
    document.body.className = document.body.className
      .split(/\s+/)
      .filter(c => !c.startsWith("theme-") && !c.startsWith("bg-"))
      .join(" ")
      .trim();
    if(key) document.body.classList.add(`theme-${key}`);
    applyPhaseBackground();
  }
  function getSettings(){
    const prepare = prepareInput ? clampInt(prepareInput.value,5,300,10) : 10;
    const action  = actionInput  ? clampInt(actionInput.value,10,600,30)  : 30;
    const rest    = restInput    ? clampInt(restInput.value,5,300,20)     : 20;
    const cycles  = cyclesInput  ? clampInt(cyclesInput.value,1,20,3)     : 3;

    if(prepareInput) prepareInput.value = prepare;
    if(actionInput)  actionInput.value  = action;
    if(restInput)    restInput.value    = rest;
    if(cyclesInput)  cyclesInput.value  = cycles;

    return {prepare, action, rest, cycles};
  }
  function setControlsState(){
    if(startBtn) startBtn.disabled = !currentCharacter || isRunning;
    if(pauseBtn){
      pauseBtn.disabled = !isRunning;
      pauseBtn.textContent = isPaused ? "繼續" : "暫停";
    }
    if(modeBtn) modeBtn.textContent = `模式：${teaseMode==="adult"?"成人":"一般"}`;
  }

  // ===== 調戲 =====
  function getTeaseDict(){ return teaseMode==="adult" ? teaseLinesAdult : teaseLinesClean; }
  function pickNotSame(arr, notSame){
    if(!arr || !arr.length) return "";
    if(arr.length === 1) return arr[0];
    let line="";
    for(let i=0;i<6;i++){
      line = arr[Math.floor(Math.random()*arr.length)];
      if(line !== notSame) return line;
    }
    return line;
  }
  function showTease(phaseKey){
    if(!currentCharacter) return;

    // 清掉舊台詞，避免堆疊
    phaseTextEl.textContent = phaseTextEl.textContent.replace(/\s—「[\s\S]*」\s*$/, "");

    const dict = getTeaseDict();
    const pool = dict[currentCharacter]?.[phaseKey] || [];
    const fallbackPool = teaseLinesClean[currentCharacter]?.[phaseKey] || [];

    let line = pickNotSame(pool, lastTeaseLine);
    if(!line) line = pickNotSame(fallbackPool, lastTeaseLine);
    if(!line) return;

    lastTeaseLine = line;
    phaseTextEl.textContent = `${phaseTextEl.textContent} —「${line}」`;
  }

  // ===== 歷史 UI =====
  function renderHistory(){
    if(!historyListEl || !historyHintEl) return;
    const arr = loadHistory();
    historyListEl.innerHTML = arr.length ? "" : `<li class="history-item muted">尚無紀錄。</li>`;
    if(!arr.length){ historyHintEl.textContent=""; return; }

    for(const it of arr){
      const li=document.createElement("li");
      li.className="history-item";
      li.innerHTML = `<div><strong>${it.characterName}</strong> <span class="muted">${it.endedAt}</span></div>
        <div class="muted">週期:${it.cycles} 準備:${it.prepare}s 行動:${it.action}s 休息:${it.rest}s 總:${formatMMSS(it.totalSeconds)}</div>
        <div class="muted">狀態:${it.status}｜模式:${it.teaseMode}${it.lastTease?`｜「${it.lastTease}」`:""}</div>`;
      historyListEl.appendChild(li);
    }
    historyHintEl.textContent = `已保存 ${arr.length} 筆（最多 100 筆）。`;
  }
  function addHistoryRecord(r){
    const arr=loadHistory();
    arr.unshift(r);
    if(arr.length>100) arr.length=100;
    saveHistory(arr);
    renderHistory();
  }

  // ===== 核心 =====
  function setPhaseTextBase(text){ phaseTextEl.textContent = text; }

  function selectCharacter(key){
    if(!characterConfig[key]) return;
    if(isRunning){ debug("訓練中不可切換角色"); return; }

    currentCharacter = key;
    lastTeaseLine = "";

    setBodyTheme(key);
    currentPhase="idle";
    applyPhaseBackground();

    setPhaseTextBase(`已選擇角色：${characterConfig[key].name}（可開始訓練）`);
    showTease("select");

    setTimerDisplay(0);
    setProgress(0);
    setControlsState();
    debug("選角：" + key);
  }

  function startPhase(phase, seconds){
    currentPhase=phase;
    timeLeft=seconds;
    phaseTotal=seconds;
    applyPhaseBackground();

    const name=characterConfig[currentCharacter]?.name ?? "";
    if(phase==="prepare") setPhaseTextBase(`${name}｜第 ${currentCycle}/${totalCycles} 輪：準備`);
    if(phase==="action")  setPhaseTextBase(`${name}｜第 ${currentCycle}/${totalCycles} 輪：行動`);
    if(phase==="rest")    setPhaseTextBase(`${name}｜休息（下一輪：${Math.min(currentCycle+1,totalCycles)}/${totalCycles}）`);

    showTease(phase);

    setTimerDisplay(timeLeft);
    setProgress(0);
    tickStart();
  }

  function tickStart(){
    if(timer) clearInterval(timer);
    timer=setInterval(()=>{
      if(!isRunning || isPaused) return;

      timeLeft -= 1;
      setTimerDisplay(timeLeft);
      setProgress(phaseTotal>0 ? ((phaseTotal-timeLeft)/phaseTotal)*100 : 0);

      if(timeLeft<=0){
        clearInterval(timer); timer=null;
        nextStep();
      }
    },1000);
  }

  function nextStep(){
    const {prepare, action, rest, cycles} = getSettings();
    totalCycles = cycles;

    if(currentPhase==="prepare") return startPhase("action", action);

    if(currentPhase==="action"){
      if(currentCycle>=totalCycles) return finishTraining();
      return startPhase("rest", rest);
    }

    if(currentPhase==="rest"){
      currentCycle += 1;
      return startPhase("prepare", prepare);
    }
  }

  function startTraining(){
    if(!currentCharacter){ debug("請先選擇角色"); return; }
    if(isRunning) return;

    const {prepare, cycles} = getSettings();
    totalCycles = cycles;

    isRunning=true;
    isPaused=false;
    currentCycle=1;

    startPhase("prepare", prepare);
    setControlsState();
    debug("開始");
  }

  function pauseTraining(){
    if(!isRunning) return;

    if(!isPaused){
      isPaused=true;
      if(timer) clearInterval(timer);
      timer=null;
      phaseTextEl.textContent = phaseTextEl.textContent.replace(/（已暫停）$/, "") + "（已暫停）";
      debug("暫停");
    }else{
      isPaused=false;
      phaseTextEl.textContent = phaseTextEl.textContent.replace(/（已暫停）$/, "");
      tickStart();
      debug("繼續");
    }
    setControlsState();
  }

  function resetTraining(){
    if(timer) clearInterval(timer);
    timer=null;

    isRunning=false;
    isPaused=false;

    currentPhase="idle";
    currentCycle=0;
    timeLeft=0;
    phaseTotal=0;

    applyPhaseBackground();

    setPhaseTextBase(currentCharacter
      ? `已選擇角色：${characterConfig[currentCharacter].name}（已重置）`
      : "請選擇角色開始訓練"
    );

    setTimerDisplay(0);
    setProgress(0);
    setControlsState();
    debug("重置");
  }

  function toggleMode(){
    teaseMode = teaseMode==="adult" ? "clean" : "adult";
    setControlsState();
    showTease(currentPhase==="idle" ? "select" : currentPhase);
    debug("切換模式：" + (teaseMode==="adult" ? "成人" : "一般"));
  }

  function finishTraining(){
    isRunning=false;
    isPaused=false;

    currentPhase="idle";
    applyPhaseBackground();

    const {prepare, action, rest, cycles} = getSettings();
    const totalSeconds = prepare*cycles + action*cycles + rest*Math.max(0,cycles-1);

    setPhaseTextBase(`訓練完成：${characterConfig[currentCharacter]?.name ?? ""}｜共 ${cycles} 輪｜總時長 ${formatMMSS(totalSeconds)}`);
    showTease("finish");

    setTimerDisplay(0);
    setProgress(100);

    addHistoryRecord({
      endedAt:new Date().toLocaleString(),
      status:"完成",
      characterKey:currentCharacter,
      characterName:characterConfig[currentCharacter]?.name ?? "未知",
      prepare, action, rest, cycles,
      totalSeconds,
      teaseMode: teaseMode==="adult" ? "成人" : "一般",
      lastTease:lastTeaseLine||""
    });

    setControlsState();
    debug("完成並寫入歷史");
  }

  function exportHistory(){
    if(!exportArea) return;
    exportArea.style.display="block";
    exportArea.value = JSON.stringify(loadHistory(), null, 2);
    exportArea.focus();
    exportArea.select();
    debug("已顯示匯出 JSON（可複製）");
  }

  function clearHistory(){
    saveHistory([]);
    renderHistory();
    debug("已清除歷史");
  }

  // 事件：pointerdown + touchstart + click
  function bindBtn(el, handler){
    if(!el) return;
    ["pointerdown","touchstart","click"].forEach(evt=>{
      el.addEventListener(evt, (e)=>{ e.preventDefault?.(); handler(e); }, {passive:false});
    });
  }

  function bindAll(){
    document.querySelectorAll("[data-character]").forEach(btn=>{
      bindBtn(btn, ()=>selectCharacter(btn.dataset.character));
    });

    bindBtn(startBtn, startTraining);
    bindBtn(pauseBtn, pauseTraining);
    bindBtn(resetBtn, resetTraining);
    bindBtn(modeBtn, toggleMode);

    bindBtn(exportBtn, exportHistory);
    bindBtn(clearBtn, clearHistory);

    [prepareInput, actionInput, restInput, cyclesInput].forEach(inp=>{
      if(!inp) return;
      inp.addEventListener("change", ()=>{ if(!isRunning) getSettings(); });
    });
  }

  function init(){
    setTimerDisplay(0);
    setProgress(0);
    setControlsState();
    renderHistory();
    bindAll();
    debug("初始化完成：點角色 → 開始");
  }

  init();
})();

  let currentPhase = "idle";
  let currentCycle = 0;
  let totalCycles = 3;

  let isRunning = false;
  let isPaused = false;

  let teaseMode = "clean"; // clean | adult
  let lastTeaseLine = "";

  const characterConfig = {
    seductive: { name: "御姐" },
    innocent:  { name: "JK" },
    yandere:   { name: "病嬌" },
    succubus:  { name: "魅魔" },
    jock:      { name: "體育生" },
    junior:    { name: "學弟" },
    straight:  { name: "直男" }
  };

  const teaseLinesClean = {
    seductive:{select:["敢選我，就要撐到最後。","把目光放回我這裡。","別退縮，開始。"],prepare:["先把呼吸收好。","慢慢升溫。","把雜念清掉。"],action:["照我的節奏走。","不准分心。","再撐一下。"],rest:["休息可以，但別放鬆。","下一輪更難。","喝口水回來。"],finish:["表現不錯。","今天先到這。","下次再加強。"]},
    innocent:{select:["你、你真的選我嗎…","那我會認真帶你…","不可以欺負我喔…"],prepare:["慢慢來就好。","把步調抓好。","先準備一下…"],action:["加油！別停！","再一下就好！","你很厲害耶…"],rest:["先休息一下。","喝水、深呼吸…","等下再繼續。"],finish:["辛苦了…","你做到了。","下次也一起。"]},
    yandere:{select:["選我就別想逃。","你只能聽我的。","把注意力交出來。"],prepare:["把雜念清掉。","別讓我失望。","聽話一點。"],action:["不准停。","我說繼續就繼續。","很好…乖乖照做。"],rest:["休息，但不准離開。","我在看著。","喘夠了就回來。"],finish:["很好，你很乖。","記住今天。","下次也要選我。"]},
    succubus:{select:["讓我看看你的意志。","選得真好。","我會慢慢加強。"],prepare:["先熱身…","把節奏交給我。","別急。"],action:["繼續…別躲。","很好…再多一點。","越努力我越喜歡。"],rest:["我允許你喘口氣。","別放空…我還在。","把渴望收好。"],finish:["真乖。","今天先放過你。","下次再來。"]},
    jock:{select:["別怕強度。","敢跟上就開始。","把狀態拉滿。"],prepare:["姿勢做對。","呼吸穩住。","我不會放水。"],action:["衝！別停！","很好，再撐！","撐到結束！"],rest:["喘口氣，下一輪更狠。","喝水，別裝死。","站起來回到節奏。"],finish:["漂亮！","不錯，有種。","下次再加強。"]},
    junior:{select:["我會努力跟上你…","那我開始囉！","你別笑我緊張…"],prepare:["準備好就點頭。","別急，我在旁邊。","先把步調抓好。"],action:["再一下！","加油！我在看！","你真的很強…"],rest:["我幫你算時間。","喝水、調整呼吸。","下一輪…更穩一點。"],finish:["我替你記下來了！","辛苦了！","下次也帶著我。"]},
    straight:{select:["行，開始。","照規矩來。","把效率拿出來。"],prepare:["準備好就別找藉口。","等下別拖。","呼吸穩住。"],action:["撐完。","別停，繼續。","維持住。"],rest:["休息，別浪費時間。","喝水，下一輪。","喘夠了就回來。"],finish:["結束。","不錯。","下次再來。"]}
  };

  // 成人版台詞自行填，留空會回退一般版
  const teaseLinesAdult = {
    seductive:{select:[],prepare:[],action:[],rest:[],finish:[]},
    innocent:{select:[],prepare:[],action:[],rest:[],finish:[]},
    yandere:{select:[],prepare:[],action:[],rest:[],finish:[]},
    succubus:{select:[],prepare:[],action:[],rest:[],finish:[]},
    jock:{select:[],prepare:[],action:[],rest:[],finish:[]},
    junior:{select:[],prepare:[],action:[],rest:[],finish:[]},
    straight:{select:[],prepare:[],action:[],rest:[],finish:[]}
  };

  // 歷史
  const HISTORY_KEY = "extreme_control_training_history_pwa_v4";
  function loadHistory(){ try{ const raw=localStorage.getItem(HISTORY_KEY); const arr=raw?JSON.parse(raw):[]; return Array.isArray(arr)?arr:[]; }catch{ return []; } }
  function saveHistory(arr){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); }catch{} }

  // 工具
  function clampInt(v,min,max,fb){ const n=parseInt(v,10); if(Number.isNaN(n)) return fb; return Math.min(max,Math.max(min,n)); }
  function formatMMSS(sec){ sec=Math.max(0,sec|0); const mm=String(Math.floor(sec/60)).padStart(2,'0'); const ss=String(sec%60).padStart(2,'0'); return `${mm}:${ss}`; }
  function setTimerDisplay(sec){ timerDisplayEl.textContent = formatMMSS(sec); }
  function setProgress(p){ progressBarEl.style.width = Math.min(100,Math.max(0,p)) + "%"; }

  function applyPhaseBackground(){
    document.body.classList.remove("bg-idle","bg-prepare","bg-action","bg-rest");
    document.body.classList.add(`bg-${currentPhase}`);
  }
  function setBodyTheme(key){
    document.body.className = document.body.className.split(/\s+/).filter(c=>!c.startsWith("theme-")&&!c.startsWith("bg-")).join(" ").trim();
    if(key) document.body.classList.add(`theme-${key}`);
    applyPhaseBackground();
  }
  function getSettings(){
    const prepare=clampInt(prepareInput.value,5,300,10);
    const action =clampInt(actionInput.value,10,600,30);
    const rest   =clampInt(restInput.value,5,300,20);
    const cycles =clampInt(cyclesInput.value,1,20,3);
    prepareInput.value=prepare; actionInput.value=action; restInput.value=rest; cyclesInput.value=cycles;
    return {prepare,action,rest,cycles};
  }
  function setControlsState(){
    startBtn.disabled = !currentCharacter || isRunning;
    pauseBtn.disabled = !isRunning;
    pauseBtn.textContent = isPaused ? "繼續" : "暫停";
    modeBtn.textContent = `模式：${teaseMode==="adult"?"成人":"一般"}`;
  }

  // 調戲（不堆疊 + 避免重複）
  function getTeaseDict(){ return teaseMode==="adult" ? teaseLinesAdult : teaseLinesClean; }
  function pickNotSame(arr, notSame){
    if(!arr || !arr.length) return "";
    if(arr.length===1) return arr[0];
    let line="";
    for(let i=0;i<6;i++){
      line = arr[Math.floor(Math.random()*arr.length)];
      if(line !== notSame) return line;
    }
    return line;
  }
  function showTease(phaseKey){
    if(!currentCharacter) return;
    // 先移除上一句，避免堆疊
    phaseTextEl.textContent = phaseTextEl.textContent.replace(/\s—「[\s\S]*」\s*$/, "");

    const dict = getTeaseDict();
    const pool = dict[currentCharacter]?.[phaseKey] || [];
    const fallbackPool = teaseLinesClean[currentCharacter]?.[phaseKey] || [];

    let line = pickNotSame(pool, lastTeaseLine);
    if(!line) line = pickNotSame(fallbackPool, lastTeaseLine);
    if(!line) return;

    lastTeaseLine = line;
    phaseTextEl.textContent = `${phaseTextEl.textContent} —「${line}」`;
  }

  // 歷史 UI
  function renderHistory(){
    const arr=loadHistory();
    historyListEl.innerHTML = arr.length ? "" : `<li class="history-item muted">尚無紀錄。</li>`;
    if(!arr.length){ historyHintEl.textContent=""; return; }
    for(const it of arr){
      const li=document.createElement("li");
      li.className="history-item";
      li.innerHTML = `<div><strong>${it.characterName}</strong> <span class="muted">${it.endedAt}</span></div>
        <div class="muted">週期:${it.cycles} 準備:${it.prepare}s 行動:${it.action}s 休息:${it.rest}s 總:${formatMMSS(it.totalSeconds)}</div>
        <div class="muted">狀態:${it.status}｜模式:${it.teaseMode}${it.lastTease?`｜「${it.lastTease}」`:""}</div>`;
      historyListEl.appendChild(li);
    }
    historyHintEl.textContent = `已保存 ${arr.length} 筆（最多 100 筆）。`;
  }
  function addHistoryRecord(r){
    const arr=loadHistory();
    arr.unshift(r);
    if(arr.length>100) arr.length=100;
    saveHistory(arr);
    renderHistory();
  }

  // 核心
  function setPhaseTextBase(text){ phaseTextEl.textContent = text; }

  function selectCharacter(key){
    if(!characterConfig[key]) return;
    if(isRunning){ debug("訓練中不可切換角色"); return; }
    currentCharacter=key;
    lastTeaseLine="";
    setBodyTheme(key);
    currentPhase="idle"; applyPhaseBackground();
    setPhaseTextBase(`已選擇角色：${characterConfig[key].name}（可開始訓練）`);
    showTease("select");
    setTimerDisplay(0); setProgress(0); setControlsState();
    debug("選角：" + key);
  }

  function startPhase(phase, seconds){
    currentPhase=phase;
    timeLeft=seconds;
    phaseTotal=seconds;
    applyPhaseBackground();

    const name=characterConfig[currentCharacter]?.name ?? "";
    if(phase==="prepare") setPhaseTextBase(`${name}｜第 ${currentCycle}/${totalCycles} 輪：準備`);
    if(phase==="action")  setPhaseTextBase(`${name}｜第 ${currentCycle}/${totalCycles} 輪：行動`);
    if(phase==="rest")    setPhaseTextBase(`${name}｜休息（下一輪：${Math.min(currentCycle+1,totalCycles)}/${totalCycles}）`);
    showTease(phase);

    setTimerDisplay(timeLeft);
    setProgress(0);
    tickStart();
  }

  function tickStart(){
    if(timer) clearInterval(timer);
    timer=setInterval(()=>{
      if(!isRunning || isPaused) return;
      timeLeft -= 1;
      setTimerDisplay(timeLeft);
      setProgress(phaseTotal>0 ? ((phaseTotal-timeLeft)/phaseTotal)*100 : 0);
      if(timeLeft<=0){
        clearInterval(timer); timer=null;
        nextStep();
      }
    },1000);
  }

  function nextStep(){
    const {prepare,action,rest,cycles}=getSettings();
    totalCycles=cycles;

    if(currentPhase==="prepare") return startPhase("action", action);
    if(currentPhase==="action"){
      if(currentCycle>=totalCycles) return finishTraining();
      return startPhase("rest", rest);
    }
    if(currentPhase==="rest"){
      currentCycle += 1;
      return startPhase("prepare", prepare);
    }
  }

  function startTraining(){
    if(!currentCharacter){ debug("請先選擇角色"); return; }
    if(isRunning) return;
    const {prepare,cycles}=getSettings();
    totalCycles=cycles;
    isRunning=true; isPaused=false; currentCycle=1;
    startPhase("prepare", prepare);
    setControlsState();
    debug("開始");
  }

  function pauseTraining(){
    if(!isRunning) return;
    if(!isPaused){
      isPaused=true;
      if(timer) clearInterval(timer);
      timer=null;
      phaseTextEl.textContent = phaseTextEl.textContent.replace(/（已暫停）$/, "") + "（已暫停）";
      debug("暫停");
    }else{
      isPaused=false;
      phaseTextEl.textContent = phaseTextEl.textContent.replace(/（已暫停）$/, "");
      tickStart();
      debug("繼續");
    }
    setControlsState();
  }

  function resetTraining(){
    if(timer) clearInterval(timer);
    timer=null;
    isRunning=false; isPaused=false;
    currentPhase="idle"; currentCycle=0; timeLeft=0; phaseTotal=0;
    applyPhaseBackground();
    setPhaseTextBase(currentCharacter ? `已選擇角色：${characterConfig[currentCharacter].name}（已重置）` : "請選擇角色開始訓練");
    setTimerDisplay(0); setProgress(0); setControlsState();
    debug("重置");
  }

  function toggleMode(){
    teaseMode = teaseMode==="adult" ? "clean" : "adult";
    setControlsState();
    showTease(currentPhase==="idle" ? "select" : currentPhase);
    debug("切換模式：" + (teaseMode==="adult" ? "成人" : "一般"));
  }

  function finishTraining(){
    isRunning=false; isPaused=false;
    currentPhase="idle"; applyPhaseBackground();

    const {prepare,action,rest,cycles}=getSettings();
    const totalSeconds = prepare*cycles + action*cycles + rest*Math.max(0,cycles-1);

    setPhaseTextBase(`訓練完成：${characterConfig[currentCharacter]?.name ?? ""}｜共 ${cycles} 輪｜總時長 ${formatMMSS(totalSeconds)}`);
    showTease("finish");

    setTimerDisplay(0);
    setProgress(100);

    addHistoryRecord({
      endedAt:new Date().toLocaleString(),
      status:"完成",
      characterKey:currentCharacter,
      characterName:characterConfig[currentCharacter]?.name ?? "未知",
      prepare,action,rest,cycles,totalSeconds,
      teaseMode: teaseMode==="adult" ? "成人" : "一般",
      lastTease:lastTeaseLine||""
    });

    setControlsState();
    debug("完成並寫入歷史");
  }

  function exportHistory(){
    exportArea.style.display="block";
    exportArea.value = JSON.stringify(loadHistory(), null, 2);
    exportArea.focus();
    exportArea.select();
    debug("已顯示匯出 JSON（可複製）");
  }
  function clearHistory(){
    saveHistory([]);
    renderHistory();
    debug("已清除歷史");
  }

  // 事件：pointerdown + touchstart + click
  function bindBtn(el, handler){
    ["pointerdown","touchstart","click"].forEach(evt=>{
      el.addEventListener(evt, (e)=>{ e.preventDefault?.(); handler(e); }, {passive:false});
    });
  }

  function bindAll(){
    document.querySelectorAll("[data-character]").forEach(btn=>{
      bindBtn(btn, ()=>selectCharacter(btn.dataset.character));
    });
    bindBtn(startBtn, startTraining);
    bindBtn(pauseBtn, pauseTraining);
    bindBtn(resetBtn, resetTraining);
    bindBtn(modeBtn, toggleMode);
    bindBtn(exportBtn, exportHistory);
    bindBtn(clearBtn, clearHistory);

    [prepareInput, actionInput, restInput, cyclesInput].forEach(inp=>{
      inp.addEventListener("change", ()=>{ if(!isRunning) getSettings(); });
    });
  }

  function init(){
    setTimerDisplay(0);
    setProgress(0);
    setControlsState();
    renderHistory();
    bindAll();
    debug("初始化完成：點角色 → 開始");
  }

  init();
})();
 let timer = null;

 let timeLeft = 0;
 let phaseTotal = 0;

 let currentPhase = "idle";
 let currentCycle = 0;
 let totalCycles = 3;

 let isRunning = false;
 let isPaused = false;

 let teaseMode = "clean"; // clean | adult
 / clean | adult
 let lastTeaseLine = "";

 const characterConfig = {
 seductive: { name: "御姐" },
 innocent: { name: "JK" },
 yandere: { name: "病嬌" },
 succubus: { name: "魅魔" },
 jock: { name: "體育生" },
 junior: { name: "學弟" },
 straight: { name: "直男" }
 };

 const teaseLinesClean = {
 }
 };

 const teaseLinesClean = {
 {
 seductive:{select:["敢選我，就要撐到最後。","把目光放回我這裡。","別退縮，開始。"],prepare:["先把呼吸收好。","慢慢升溫。","把雜念清掉。"],action:["照我的節奏走。","不准分心。","再撐一下。"],rest:["休息可以，但別放鬆。","下一輪更難。","喝口水回來。"],finish:["表現不錯。","今天先到這。","下次再加強。"]},
 ,
r){ debug("請先選擇角色"); return; }
    if (isRunning) return;

    const {prepare, cycles} = getSettings();
    totalCycles = cycles;

    isRunning = true;
    isPaused = false;
    currentCycle = 1;

    startPhase("prepare", prepare);
    setControlsState();
    debug("開始");
  }

  function pauseTraining(){
    if (!isRunning) return;

    if (!isPaused){
      isPaused = true;
      if (timer) clearInterval(timer);
      timer = null;
      phaseTextEl.textContent = phaseTextEl.textContent.replace(/（已暫停）$/, "") + "（已暫停）";
      debug("暫停");
    } else {
      isPaused = false;
      phaseTextEl.textContent = phaseTextEl.textContent.replace(/（已暫停）$/, "");
      tickStart();
      debug("繼續");
    }
    setControlsState();
  }

  function resetTraining(){
    if (timer) clearInterval(timer);
    timer = null;

    isRunning = false;
    isPaused = false;

    currentPhase = "idle";
    currentCycle = 0;
    timeLeft = 0;
    phaseTotal = 0;

    applyPhaseBackground();

    setPhaseTextBase(currentCharacter
      ? `已選擇角色：${characterConfig[currentCharacter].name}（已重置）`
      : "請選擇角色開始訓練"
    );

    setTimerDisplay(0);
    setProgress(0);
    setControlsState();

    debug("重置");
  }

  function toggleMode(){
    teaseMode = teaseMode === "adult" ? "clean" : "adult";
    setControlsState();

    // 切換模式後，重新抽一句（同樣避開上一句）
    showTease(currentPhase === "idle" ? "select" : currentPhase);

    debug("切換模式：" + (teaseMode === "adult" ? "成人" : "一般"));
  }

  function finishTraining(){
    isRunning = false;
    isPaused = false;

    currentPhase = "idle";
    applyPhaseBackground();

    const {prepare, action, rest, cycles} = getSettings();
    const totalSeconds = prepare*cycles + action*cycles + rest*Math.max(0, cycles-1);

    setPhaseTextBase(`訓練完成：${characterConfig[currentCharacter]?.name ?? ""}｜共 ${cycles} 輪｜總時長 ${formatMMSS(totalSeconds)}`);
    showTease("finish");

    setTimerDisplay(0);
    setProgress(100);

    addHistoryRecord({
      endedAt: new Date().toLocaleString(),
      status: "完成",
      characterKey: currentCharacter,
      characterName: characterConfig[currentCharacter]?.name ?? "未知",
      prepare, action, rest, cycles,
      totalSeconds,
      teaseMode: teaseMode === "adult" ? "成人" : "一般",
      lastTease: lastTeaseLine || ""
    });

    setControlsState();
    debug("完成並寫入歷史");
  }

  function exportHistory(){
    exportArea.style.display = "block";
    exportArea.value = JSON.stringify(loadHistory(), null, 2);
    exportArea.focus();
    exportArea.select();
    debug("已顯示匯出 JSON（可複製）");
  }

  function clearHistory(){
    saveHistory([]);
    renderHistory();
    debug("已清除歷史");
  }

  // ===== 事件：pointerdown + touchstart + click =====
  function bindBtn(el, handler){
    ["pointerdown","touchstart","click"].forEach(evt=>{
      el.addEventListener(evt, (e)=>{ e.preventDefault?.(); handler(e); }, { passive:false });
    });
  }

  function bindAll(){
    document.querySelectorAll("[data-character]").forEach(btn=>{
      bindBtn(btn, ()=>selectCharacter(btn.dataset.character));
    });

    bindBtn(startBtn, startTraining);
    bindBtn(pauseBtn, pauseTraining);
    bindBtn(resetBtn, resetTraining);
    bindBtn(modeBtn, toggleMode);

    bindBtn(exportBtn, exportHistory);
    bindBtn(clearBtn, clearHistory);

    [prepareInput, actionInput, restInput, cyclesInput].forEach(inp=>{
      inp.addEventListener("change", ()=>{ if(!isRunning) getSettings(); });
    });
  }

  function init(){
    setTimerDisplay(0);
    setProgress(0);
    setControlsState();
    renderHistory();
    bindAll();
    debug("初始化完成：點角色 → 開始");
  }

  init();
})();
  let phaseTotal = 0;

  let currentPhase = "idle"; // idle, prepare, action, rest
  let currentCycle = 0;
  let totalCycles = 3;

  let isRunning = false;
  let isPaused = false;

  let teaseMode = "clean"; // clean | adult
  let lastTeaseLine = "";

  const characterConfig = {
    seductive: { name: "御姐" },
    innocent:  { name: "JK" },
    yandere:   { name: "病嬌" },
    succubus:  { name: "魅魔" },
    jock:      { name: "體育生" },
    junior:    { name: "學弟" },
    straight:  { name: "直男" }
  };

  // 一般版台詞（可自行改）
  const teaseLinesClean = {
    seductive: {
      select:["敢選我，就要撐到最後。","把目光放回我這裡。","別退縮，開始。"],
      prepare:["先把呼吸收好。","慢慢升溫。","把雜念清掉。"],
      action:["照我的節奏走。","不准分心。","再撐一下。"],
      rest:["休息可以，但別放鬆。","下一輪更難。","喝口水回來。"],
      finish:["表現不錯。","今天先到這。","下次再加強。"]
    },
    innocent: {
      select:["你、你真的選我嗎…","那我會認真帶你…","不可以欺負我喔…"],
      prepare:["慢慢來就好。","把步調抓好。","先準備一下…"],
      action:["加油！別停！","再一下就好！","你很厲害耶…"],
      rest:["先休息一下。","喝水、深呼吸…","等下再繼續。"],
      finish:["辛苦了…","你做到了。","下次也一起。"]
    },
    yandere: {
      select:["選我就別想逃。","你只能聽我的。","把注意力交出來。"],
      prepare:["把雜念清掉。","別讓我失望。","聽話一點。"],
      action:["不准停。","我說繼續就繼續。","很好…乖乖照做。"],
      rest:["休息，但不准離開。","我在看著。","喘夠了就回來。"],
      finish:["很好，你很乖。","記住今天。","下次也要選我。"]
    },
    succubus: {
      select:["讓我看看你的意志。","選得真好。","我會慢慢加強。"],
      prepare:["先熱身…","把節奏交給我。","別急。"],
      action:["繼續…別躲。","很好…再多一點。","越努力我越喜歡。"],
      rest:["我允許你喘口氣。","別放空…我還在。","把渴望收好。"],
      finish:["真乖。","今天先放過你。","下次再來。"]
    },
    jock: {
      select:["別怕強度。","敢跟上就開始。","把狀態拉滿。"],
      prepare:["姿勢做對。","呼吸穩住。","我不會放水。"],
      action:["衝！別停！","很好，再撐！","撐到結束！"],
      rest:["喘口氣，下一輪更狠。","喝水，別裝死。","站起來回到節奏。"],
      finish:["漂亮！","不錯，有種。","下次再加強。"]
    },
    junior: {
      select:["我會努力跟上你…","那我開始囉！","你別笑我緊張…"],
      prepare:["準備好就點頭。","別急，我在旁邊。","先把步調抓好。"],
      action:["再一下！","加油！我在看！","你真的很強…"],
      rest:["我幫你算時間。","喝水、調整呼吸。","下一輪…更穩一點。"],
      finish:["我替你記下來了！","辛苦了！","下次也帶著我。"]
    },
    straight: {
      select:["行，開始。","照規矩來。","把效率拿出來。"],
      prepare:["準備好就別找藉口。","等下別拖。","呼吸穩住。"],
      action:["撐完。","別停，繼續。","維持住。"],
      rest:["休息，別浪費時間。","喝水，下一輪。","喘夠了就回來。"],
      finish:["結束。","不錯。","下次再來。"]
    }
  };

  // 成人版台詞（請你自行填；留空會自動回退一般版）
  const teaseLinesAdult = {
    seductive:{select:[],prepare:[],action:[],rest:[],finish:[]},
    innocent:{select:[],prepare:[],action:[],rest:[],finish:[]},
    yandere:{select:[],prepare:[],action:[],rest:[],finish:[]},
    succubus:{select:[],prepare:[],action:[],rest:[],finish:[]},
    jock:{select:[],prepare:[],action:[],rest:[],finish:[]},
    junior:{select:[],prepare:[],action:[],rest:[],finish:[]},
    straight:{select:[],prepare:[],action:[],rest:[],finish:[]}
  };

  // 歷史（容錯）
  const HISTORY_KEY = "extreme_control_training_history_pwa_v2";
  function loadHistory(){
    try{
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch{ return []; }
  }
  function saveHistory(arr){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); }catch{} }

  // 工具
  function clampInt(v,min,max,fb){ const n=parseInt(v,10); if(Number.isNaN(n)) return fb; return Math.min(max,Math.max(min,n)); }
  function formatMMSS(sec){ sec=Math.max(0,sec|0); const mm=String(Math.floor(sec/60)).padStart(2,'0'); const ss=String(sec%60).padStart(2,'0'); return `${mm}:${ss}`; }
  function setTimerDisplay(sec){ timerDisplayEl.textContent = formatMMSS(sec); }
  function setProgress(p){ progressBarEl.style.width = Math.min(100,Math.max(0,p)) + "%"; }
  function applyPhaseBackground(){
    document.body.classList.remove("bg-idle","bg-prepare","bg-action","bg-rest");
    document.body.classList.add(`bg-${currentPhase}`);
  }
  function setBodyTheme(key){
    document.body.className = document.body.className.split(/\s+/).filter(c=>!c.startsWith("theme-")&&!c.startsWith("bg-")).join(" ").trim();
    if(key) document.body.classList.add(`theme-${key}`);
    applyPhaseBackground();
  }
  function getSettings(){
    const prepare = clampInt(prepareInput.value,5,300,10);
    const action  = clampInt(actionInput.value,10,600,30);
    const rest    = clampInt(restInput.value,5,300,20);
    const cycles  = clampInt(cyclesInput.value,1,20,3);
    prepareInput.value=prepare; actionInput.value=action; restInput.value=rest; cyclesInput.value=cycles;
    return {prepare,action,rest,cycles};
  }
  function setControlsState(){
    startBtn.disabled = !currentCharacter || isRunning;
    pauseBtn.disabled = !isRunning;
    pauseBtn.textContent = isPaused ? "繼續" : "暫停";
    modeBtn.textContent = `模式：${teaseMode==="adult"?"成人":"一般"}`;
  }

  // 調戲
  function pick(arr){ return arr && arr.length ? arr[Math.floor(Math.random()*arr.length)] : ""; }
  function getTeaseDict(){ return teaseMode==="adult" ? teaseLinesAdult : teaseLinesClean; }

  function showTease(phaseKey){
    if(!currentCharacter) return;

    // 關鍵修正：先移除上一句，避免重複堆疊
    phaseTextEl.textContent = phaseTextEl.textContent.replace(/\s—「[\s\S]*」\s*$/, "");

    const dict = getTeaseDict();
    const line = pick(dict[currentCharacter]?.[phaseKey]);
    const fallback = pick(teaseLinesClean[currentCharacter]?.[phaseKey]);
    const finalLine = line || fallback;

    if(!finalLine) return;

    lastTeaseLine = finalLine;
    phaseTextEl.textContent = `${phaseTextEl.textContent} —「${finalLine}」`;
  }

  // 歷史 UI
  function renderHistory(){
    const arr=loadHistory();
    historyListEl.innerHTML = arr.length ? "" : `<li class="history-item muted">尚無紀錄。</li>`;
    if(!arr.length){ historyHintEl.textContent=""; return; }
    for(const it of arr){
      const li=document.createElement("li");
      li.className="history-item";
      li.innerHTML = `<div><strong>${it.characterName}</strong> <span class="muted">${it.endedAt}</span></div>
        <div class="muted">週期:${it.cycles} 準備:${it.prepare}s 行動:${it.action}s 休息:${it.rest}s 總:${formatMMSS(it.totalSeconds)}</div>
        <div class="muted">狀態:${it.status}｜模式:${it.teaseMode}${it.lastTease?`｜「${it.lastTease}」`:""}</div>`;
      historyListEl.appendChild(li);
    }
    historyHintEl.textContent = `已保存 ${arr.length} 筆（最多 100 筆）。`;
  }
  function addHistoryRecord(r){
    const arr=loadHistory(); arr.unshift(r); if(arr.length>100) arr.length=100;
    saveHistory(arr); renderHistory();
  }

  // 核心
  function setPhaseTextBase(text){
    phaseTextEl.textContent = text;
  }

  function selectCharacter(key){
    if(!characterConfig[key]) return;
    if(isRunning){ debug("訓練中不可切換角色"); return; }

    currentCharacter=key;
    lastTeaseLine="";

    setBodyTheme(key);
    currentPhase="idle";
    applyPhaseBackground();

    setPhaseTextBase(`已選擇角色：${characterConfig[key].name}（可開始訓練）`);
    showTease("select");

    setTimerDisplay(0);
    setProgress(0);
    setControlsState();
    debug("選角：" + key);
  }

  function startPhase(phase, seconds){
    currentPhase=phase;
    timeLeft=seconds;
    phaseTotal=seconds;

    applyPhaseBackground();

    const name=characterConfig[currentCharacter]?.name ?? "";
    if(phase==="prepare") setPhaseTextBase(`${name}｜第 ${currentCycle}/${totalCycles} 輪：準備`);
    if(phase==="action")  setPhaseTextBase(`${name}｜第 ${currentCycle}/${totalCycles} 輪：行動`);
    if(phase==="rest")    setPhaseTextBase(`${name}｜休息（下一輪：${Math.min(currentCycle+1,totalCycles)}/${totalCycles}）`);
    showTease(phase);

    setTimerDisplay(timeLeft);
    setProgress(0);
    tickStart();
  }

  function tickStart(){
    if(timer) clearInterval(timer);
    timer=setInterval(()=>{
      if(!isRunning || isPaused) return;
      timeLeft -= 1;
      setTimerDisplay(timeLeft);
      setProgress(phaseTotal>0 ? ((phaseTotal-timeLeft)/phaseTotal)*100 : 0);
      if(timeLeft<=0){
        clearInterval(timer); timer=null;
        nextStep();
      }
    },1000);
  }

  function nextStep(){
    const {prepare,action,rest,cycles}=getSettings();
    totalCycles=cycles;

    if(currentPhase==="prepare") return startPhase("action", action);

    if(currentPhase==="action"){
      if(currentCycle>=totalCycles) return finishTraining();
      return startPhase("rest", rest);
    }

    if(currentPhase==="rest"){
      currentCycle += 1;
      return startPhase("prepare", prepare);
    }
  }

  function startTraining(){
    if(!currentCharacter){ debug("請先選擇角色"); return; }
    if(isRunning) return;

    const {prepare,cycles}=getSettings();
    totalCycles=cycles;

    isRunning=true;
    isPaused=false;
    currentCycle=1;

    startPhase("prepare", prepare);
    setControlsState();
    debug("開始");
  }

  function pauseTraining(){
    if(!isRunning) return;

    if(!isPaused){
      isPaused=true;
      if(timer) clearInterval(timer);
      timer=null;
      phaseTextEl.textContent = phaseTextEl.textContent.replace(/（已暫停）$/, "") + "（已暫停）";
      debug("暫停");
    }else{
      isPaused=false;
      phaseTextEl.textContent = phaseTextEl.textContent.replace(/（已暫停）$/, "");
      tickStart();
      debug("繼續");
    }
    setControlsState();
  }

  function resetTraining(){
    if(timer) clearInterval(timer);
    timer=null;

    isRunning=false;
    isPaused=false;
    currentPhase="idle";
    currentCycle=0;
    timeLeft=0;
    phaseTotal=0;

    applyPhaseBackground();

    setPhaseTextBase(currentCharacter
      ? `已選擇角色：${characterConfig[currentCharacter].name}（已重置）`
      : "請選擇角色開始訓練"
    );

    setTimerDisplay(0);
    setProgress(0);
    setControlsState();
    debug("重置");
  }

  function toggleMode(){
    teaseMode = teaseMode==="adult" ? "clean" : "adult";
    setControlsState();

    // 讓切換模式時也不堆疊
    phaseTextEl.textContent = phaseTextEl.textContent.replace(/\s—「[\s\S]*」\s*$/, "");
    showTease(currentPhase==="idle" ? "select" : currentPhase);

    debug("切換模式：" + (teaseMode==="adult" ? "成人" : "一般"));
  }

  function finishTraining(){
    isRunning=false;
    isPaused=false;

    currentPhase="idle";
    applyPhaseBackground();

    const {prepare,action,rest,cycles}=getSettings();
    const totalSeconds = prepare*cycles + action*cycles + rest*Math.max(0,cycles-1);

    setPhaseTextBase(`訓練完成：${characterConfig[currentCharacter]?.name ?? ""}｜共 ${cycles} 輪｜總時長 ${formatMMSS(totalSeconds)}`);
    showTease("finish");

    setTimerDisplay(0);
    setProgress(100);

    addHistoryRecord({
      endedAt:new Date().toLocaleString(),
      status:"完成",
      characterKey:currentCharacter,
      characterName:characterConfig[currentCharacter]?.name ?? "未知",
      prepare,action,rest,cycles,totalSeconds,
      teaseMode: teaseMode==="adult" ? "成人" : "一般",
      lastTease:lastTeaseLine||""
    });

    setControlsState();
    debug("完成並寫入歷史");
  }

  function exportHistory(){
    exportArea.style.display="block";
    exportArea.value = JSON.stringify(loadHistory(), null, 2);
    exportArea.focus();
    exportArea.select();
    debug("已顯示匯出 JSON（可複製）");
  }

  function clearHistory(){
    saveHistory([]);
    renderHistory();
    debug("已清除歷史");
  }

  // 事件：pointerdown + touchstart + click
  function bindBtn(el, handler){
    ["pointerdown","touchstart","click"].forEach(evt=>{
      el.addEventListener(evt, (e)=>{ e.preventDefault?.(); handler(e); }, {passive:false});
    });
  }

  function bindAll(){
    document.querySelectorAll("[data-character]").forEach(btn=>{
      bindBtn(btn, ()=>selectCharacter(btn.dataset.character));
    });
    bindBtn(startBtn, startTraining);
    bindBtn(pauseBtn, pauseTraining);
    bindBtn(resetBtn, resetTraining);
    bindBtn(modeBtn, toggleMode);
    bindBtn(exportBtn, exportHistory);
    bindBtn(clearBtn, clearHistory);

    // 輸入變更時防呆
    [prepareInput, actionInput, restInput, cyclesInput].forEach(inp=>{
      inp.addEventListener("change", ()=>{ if(!isRunning) getSettings(); });
    });
  }

  function init(){
    setTimerDisplay(0);
    setProgress(0);
    setControlsState();
    renderHistory();
    bindAll();
    debug("初始化完成：點角色 → 開始");
  }

  init();
})();
  let phaseTotal = 0;

  let currentPhase = "idle";
  let currentCycle = 0;
  let totalCycles = 3;

  let isRunning = false;
  let isPaused = false;

  let teaseMode = "clean"; // clean | adult
  let lastTeaseLine = "";

  const characterConfig = {
    seductive: { name: "御姐" },
    innocent:  { name: "JK" },
    yandere:   { name: "病嬌" },
    succubus:  { name: "魅魔" },
    jock:      { name: "體育生" },
    junior:    { name: "學弟" },
    straight:  { name: "直男" }
  };

  const teaseLinesClean = {
    seductive:{select:["敢選我，就要撐到最後。"],prepare:["先把呼吸收好。"],action:["照我的節奏走。"],rest:["休息可以，但別放鬆。"],finish:["表現不錯。"]},
    innocent:{select:["你真的選我嗎…"],prepare:["慢慢來就好。"],action:["加油！別停！"],rest:["先休息一下。"],finish:["辛苦了…"]},
    yandere:{select:["選我就別想逃。"],prepare:["把雜念清掉。"],action:["不准停。"],rest:["休息，但不准離開。"],finish:["很好，你很乖。"]},
    succubus:{select:["讓我看看你的意志。"],prepare:["先熱身…"],action:["繼續…別躲。"],rest:["我允許你喘口氣。"],finish:["真乖。"]},
    jock:{select:["別怕強度。"],prepare:["姿勢做對。"],action:["衝！別停！"],rest:["喘口氣，下一輪更狠。"],finish:["漂亮！"]},
    junior:{select:["我會努力跟上你…"],prepare:["準備好就點頭。"],action:["再一下！"],rest:["我幫你算時間。"],finish:["我替你記下來了！"]},
    straight:{select:["行，開始。"],prepare:["準備好就別找藉口。"],action:["撐完。"],rest:["休息，別浪費時間。"],finish:["結束。"]}
  };

  // 成人版台詞（請你自行填；留空會自動回退一般版）
  const teaseLinesAdult = {
    seductive:{select:[],prepare:[],action:[],rest:[],finish:[]},
    innocent:{select:[],prepare:[],action:[],rest:[],finish:[]},
    yandere:{select:[],prepare:[],action:[],rest:[],finish:[]},
    succubus:{select:[],prepare:[],action:[],rest:[],finish:[]},
    jock:{select:[],prepare:[],action:[],rest:[],finish:[]},
    junior:{select:[],prepare:[],action:[],rest:[],finish:[]},
    straight:{select:[],prepare:[],action:[],rest:[],finish:[]}
  };

  // 歷史（容錯）
  const HISTORY_KEY = "extreme_control_training_history_pwa_v1";
  function loadHistory(){
    try{
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch{ return []; }
  }
  function saveHistory(arr){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); }catch{} }

  // 工具
  function clampInt(v,min,max,fb){ const n=parseInt(v,10); if(Number.isNaN(n)) return fb; return Math.min(max,Math.max(min,n)); }
  function formatMMSS(sec){ sec=Math.max(0,sec|0); const mm=String(Math.floor(sec/60)).padStart(2,'0'); const ss=String(sec%60).padStart(2,'0'); return `${mm}:${ss}`; }
  function setTimerDisplay(sec){ timerDisplayEl.textContent = formatMMSS(sec); }
  function setProgress(p){ progressBarEl.style.width = Math.min(100,Math.max(0,p)) + "%"; }
  function applyPhaseBackground(){
    document.body.classList.remove("bg-idle","bg-prepare","bg-action","bg-rest");
    document.body.classList.add(`bg-${currentPhase}`);
  }
  function setBodyTheme(key){
    document.body.className = document.body.className.split(/\\s+/).filter(c=>!c.startsWith("theme-")&&!c.startsWith("bg-")).join(" ").trim();
    if(key) document.body.classList.add(`theme-${key}`);
    applyPhaseBackground();
  }
  function getSettings(){
    const prepare = clampInt(prepareInput.value,5,300,10);
    const action  = clampInt(actionInput.value,10,600,30);
    const rest    = clampInt(restInput.value,5,300,20);
    const cycles  = clampInt(cyclesInput.value,1,20,3);
    prepareInput.value=prepare; actionInput.value=action; restInput.value=rest; cyclesInput.value=cycles;
    return {prepare,action,rest,cycles};
  }
  function setControlsState(){
    startBtn.disabled = !currentCharacter || isRunning;
    pauseBtn.disabled = !isRunning;
    pauseBtn.textContent = isPaused ? "繼續" : "暫停";
    modeBtn.textContent = `模式：${teaseMode==="adult"?"成人":"一般"}`;
  }

  // 調戲
  function pick(arr){ return arr && arr.length ? arr[Math.floor(Math.random()*arr.length)] : ""; }
  function getTeaseDict(){ return teaseMode==="adult" ? teaseLinesAdult : teaseLinesClean; }
  function showTease(phaseKey){
    if(!currentCharacter) return;
    const dict=getTeaseDict();
    const line=pick(dict[currentCharacter]?.[phaseKey]);
    const fallback=pick(teaseLinesClean[currentCharacter]?.[phaseKey]);
    const finalLine=line||fallback;
    if(!finalLine) return;
    lastTeaseLine=finalLine;
    phaseTextEl.textContent = `${phaseTextEl.textContent} —「${finalLine}」`;
  }

  // 歷史 UI
  function renderHistory(){
    const arr=loadHistory();
    historyListEl.innerHTML = arr.length ? "" : `<li class="history-item muted">尚無紀錄。</li>`;
    if(!arr.length){ historyHintEl.textContent=""; return; }
    for(const it of arr){
      const li=document.createElement("li");
      li.className="history-item";
      li.innerHTML = `<div><strong>${it.characterName}</strong> <span class="muted">${it.endedAt}</span></div>
        <div class="muted">週期:${it.cycles} 準備:${it.prepare}s 行動:${it.action}s 休息:${it.rest}s 總:${formatMMSS(it.totalSeconds)}</div>
        <div class="muted">狀態:${it.status}｜模式:${it.teaseMode}${it.lastTease?`｜「${it.lastTease}」`:""}</div>`;
      historyListEl.appendChild(li);
    }
    historyHintEl.textContent = `已保存 ${arr.length} 筆（最多 100 筆）。`;
  }
  function addHistoryRecord(r){
    const arr=loadHistory(); arr.unshift(r); if(arr.length>100) arr.length=100;
    saveHistory(arr); renderHistory();
  }

  // 核心
  function setPhaseTextBase(text){ phaseTextEl.textContent = text; }

  function selectCharacter(key){
    if(!characterConfig[key]) return;
    if(isRunning){ debug("訓練中不可切換角色"); return; }

    currentCharacter=key;
    lastTeaseLine="";

    setBodyTheme(key);
    currentPhase="idle";
    applyPhaseBackground();

    setPhaseTextBase(`已選擇角色：${characterConfig[key].name}（可開始訓練）`);
    showTease("select");

    setTimerDisplay(0);
    setProgress(0);
    setControlsState();
    debug("選角：" + key);
  }

  function startPhase(phase, seconds){
    currentPhase=phase;
    timeLeft=seconds;
    phaseTotal=seconds;

    applyPhaseBackground();

    const name=characterConfig[currentCharacter]?.name ?? "";
    if(phase==="prepare") setPhaseTextBase(`${name}｜第 ${currentCycle}/${totalCycles} 輪：準備`);
    if(phase==="action")  setPhaseTextBase(`${name}｜第 ${currentCycle}/${totalCycles} 輪：行動`);
    if(phase==="rest")    setPhaseTextBase(`${name}｜休息（下一輪：${Math.min(currentCycle+1,totalCycles)}/${totalCycles}）`);
    showTease(phase);

    setTimerDisplay(timeLeft);
    setProgress(0);
    tickStart();
  }

  function tickStart(){
    if(timer) clearInterval(timer);
    timer=setInterval(()=>{
      if(!isRunning || isPaused) return;
      timeLeft -= 1;
      setTimerDisplay(timeLeft);
      setProgress(phaseTotal>0 ? ((phaseTotal-timeLeft)/phaseTotal)*100 : 0);
      if(timeLeft<=0){
        clearInterval(timer); timer=null;
        nextStep();
      }
    },1000);
  }

  function nextStep(){
    const {prepare,action,rest,cycles}=getSettings();
    totalCycles=cycles;

    if(currentPhase==="prepare") return startPhase("action", action);
    if(currentPhase==="action"){
      if(currentCycle>=totalCycles) return finishTraining();
      return startPhase("rest", rest);
    }
    if(currentPhase==="rest"){
      currentCycle += 1;
      return startPhase("prepare", prepare);
    }
  }

  function startTraining(){
    if(!currentCharacter){ debug("請先選擇角色"); return; }
    if(isRunning) return;

    const {prepare,cycles}=getSettings();
    totalCycles=cycles;

    isRunning=true;
    isPaused=false;
    currentCycle=1;

    startPhase("prepare", prepare);
    setControlsState();
    debug("開始");
  }

  function pauseTraining(){
    if(!isRunning) return;

    if(!isPaused){
      isPaused=true;
      if(timer) clearInterval(timer);
      timer=null;
      phaseTextEl.textContent = phaseTextEl.textContent.replace(/（已暫停）$/, "") + "（已暫停）";
      debug("暫停");
    }else{
      isPaused=false;
      phaseTextEl.textContent = phaseTextEl.textContent.replace(/（已暫停）$/, "");
      tickStart();
      debug("繼續");
    }
    setControlsState();
  }

  function resetTraining(){
    if(timer) clearInterval(timer);
    timer=null;

    isRunning=false;
    isPaused=false;
    currentPhase="idle";
    currentCycle=0;
    timeLeft=0;
    phaseTotal=0;

    applyPhaseBackground();

    setPhaseTextBase(currentCharacter
      ? `已選擇角色：${characterConfig[currentCharacter].name}（已重置）`
      : "請選擇角色開始訓練"
    );

    setTimerDisplay(0);
    setProgress(0);
    setControlsState();
    debug("重置");
  }

  function toggleMode(){
    teaseMode = teaseMode==="adult" ? "clean" : "adult";
    setControlsState();
    phaseTextEl.textContent = phaseTextEl.textContent.replace(/\\s—「.*」\\s*$/, "");
    showTease(currentPhase==="idle" ? "select" : currentPhase);
    debug("切換模式：" + (teaseMode==="adult"?"成人":"一般"));
  }

  function finishTraining(){
    isRunning=false;
    isPaused=false;

    currentPhase="idle";
    applyPhaseBackground();

    const {prepare,action,rest,cycles}=getSettings();
    const totalSeconds = prepare*cycles + action*cycles + rest*Math.max(0,cycles-1);

    setPhaseTextBase(`訓練完成：${characterConfig[currentCharacter]?.name ?? ""}｜共 ${cycles} 輪｜總時長 ${formatMMSS(totalSeconds)}`);
    showTease("finish");

    setTimerDisplay(0);
    setProgress(100);

    addHistoryRecord({
      endedAt:new Date().toLocaleString(),
      status:"完成",
      characterKey:currentCharacter,
      characterName:characterConfig[currentCharacter]?.name ?? "未知",
      prepare,action,rest,cycles,totalSeconds,
      teaseMode: teaseMode==="adult" ? "成人" : "一般",
      lastTease:lastTeaseLine||""
    });

    setControlsState();
    debug("完成並寫入歷史");
  }

  function exportHistory(){
    exportArea.style.display="block";
    exportArea.value = JSON.stringify(loadHistory(), null, 2);
    exportArea.focus();
    exportArea.select();
    debug("已顯示匯出 JSON（可複製）");
  }

  function clearHistory(){
    saveHistory([]);
    renderHistory();
    debug("已清除歷史");
  }

  // 事件：pointerdown + touchstart + click
  function bindBtn(el, handler){
    ["pointerdown","touchstart","click"].forEach(evt=>{
      el.addEventListener(evt, (e)=>{ e.preventDefault?.(); handler(e); }, {passive:false});
    });
  }

  function bindAll(){
    document.querySelectorAll("[data-character]").forEach(btn=>{
      bindBtn(btn, ()=>selectCharacter(btn.dataset.character));
    });
    bindBtn(startBtn, startTraining);
    bindBtn(pauseBtn, pauseTraining);
    bindBtn(resetBtn, resetTraining);
    bindBtn(modeBtn, toggleMode);
    bindBtn(exportBtn, exportHistory);
    bindBtn(clearBtn, clearHistory);
  }

  function init(){
    setTimerDisplay(0);
    setProgress(0);
    setControlsState();
    renderHistory();
    bindAll();
    debug("初始化完成：點角色 → 開始");
  }

  init();
})();
    
