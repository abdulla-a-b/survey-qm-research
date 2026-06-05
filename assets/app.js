/* =========================================================================
   Meeting Practices Q-Study — application logic
   ========================================================================= */
(function () {
  "use strict";

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const SAVE_KEY = "qstudy_meetings_bd_v1";
  const COLS = ["-5","-4","-3","-2","-1","0","1","2","3","4","5"];

  /* ---------------- state ---------------- */
  let state = freshState();
  function freshState(){
    return {
      responseId: "R-" + Math.random().toString(36).slice(2,8).toUpperCase() + Date.now().toString(36).slice(-4).toUpperCase(),
      startedAt: Date.now(),
      lang: "en",
      mode: "guided",
      consent: false,
      demo: {},
      coarseOrder: [],
      coarsePos: 0,
      buckets: {},                 // id -> -1 | 0 | 1
      columns: blankColumns(),     // guided placements
      ratings: {},                 // flexible: id -> value
      reflect: { agree:"", disagree:"", other:"" },
      screen: "welcome"
    };
  }
  function blankColumns(){ const o={}; COLS.forEach(c=>o[c]=[]); return o; }

  /* ---------------- i18n ---------------- */
  const t = (k) => (I18N[state.lang] && I18N[state.lang][k]) || I18N.en[k] || k;
  function applyLang(){
    document.body.dataset.lang = state.lang;
    $$("[data-i18n]").forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    $$("[data-i18n-ph]").forEach(el => { el.setAttribute("placeholder", t(el.dataset.i18nPh)); });
    // re-render dynamic screens that hold statement text
    renderProgress();
    if (state.screen === "coarse") renderCoarseHead(), renderCurrentCard(true);
    if (state.screen === "instructions") renderInstructions();
    if (state.screen === "fine") renderTray(), renderGridLabels();
    if (state.screen === "flex") renderFlex();
    if (state.screen === "reflect") renderReflect();
    if (state.screen === "demographics") renderDemoForm();
    if (state.screen === "done" && state._certShown) drawCertificate();
  }

  /* ---------------- persistence ---------------- */
  function save(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e){} }
  function loadSaved(){ try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch(e){ return null; } }
  function clearSaved(){ try { localStorage.removeItem(SAVE_KEY); } catch(e){} }

  /* ---------------- flow ---------------- */
  const flow = () => state.mode === "flexible"
    ? ["welcome","demographics","instructions","flex","reflect","done"]
    : ["welcome","demographics","instructions","coarse","fine","reflect","done"];

  function show(name){
    state.screen = name;
    $$(".screen").forEach(s => s.classList.toggle("active", s.dataset.screen === name));
    window.scrollTo({top:0, behavior:"instant"});
    renderProgress();
    if (name === "demographics") renderDemoForm();
    if (name === "instructions") renderInstructions();
    if (name === "coarse") startCoarse();
    if (name === "fine") startFine();
    if (name === "flex") renderFlex();
    if (name === "reflect") renderReflect();
    if (name === "done") onDone();
    save();
  }
  function goNext(){ const f=flow(); const i=f.indexOf(state.screen); if(i>=0 && i<f.length-1) show(f[i+1]); }
  function goBack(){ const f=flow(); const i=f.indexOf(state.screen); if(i>0) show(f[i-1]); }

  function renderProgress(){
    const f = flow().filter(s=>s!=="done");
    const wrap = $("#progressPips"); wrap.innerHTML="";
    const cur = f.indexOf(state.screen);
    f.forEach((s,i)=>{
      const pip=document.createElement("i");
      if (i<cur) pip.classList.add("on");
      if (i===cur) pip.classList.add("cur");
      wrap.appendChild(pip);
    });
  }

  /* ---------------- WELCOME ---------------- */
  function initWelcome(){
    $$(".mode-opt").forEach(btn=>{
      btn.addEventListener("click",()=>{
        $$(".mode-opt").forEach(b=>b.classList.remove("selected"));
        btn.classList.add("selected");
        state.mode = btn.dataset.mode;
      });
    });
    const box = $("#consentBox"), begin = $("#beginBtn");
    box.addEventListener("change",()=>{ state.consent = box.checked; begin.disabled = !box.checked; });
    begin.addEventListener("click",()=>{ state.startedAt = Date.now(); save(); goNext(); });

    // resume?
    const saved = loadSaved();
    if (saved && saved.screen && saved.screen !== "welcome" && saved.screen !== "done"){
      $("#resumeRow").hidden = false;
      $("#resumeBtn").addEventListener("click",()=>{
        state = Object.assign(freshState(), saved);
        if (!state.columns) state.columns = blankColumns();
        applyLang();
        $$(".mode-opt").forEach(b=>b.classList.toggle("selected", b.dataset.mode===state.mode));
        show(state.screen);
      });
      $("#freshBtn").addEventListener("click",()=>{ clearSaved(); $("#resumeRow").hidden = true; });
    }
  }

  /* ---------------- DEMOGRAPHICS ---------------- */
  function renderDemoForm(){
    const wrap = $("#demoForm"); wrap.innerHTML="";
    DEMOGRAPHICS.forEach(q=>{
      const field=document.createElement("div"); field.className="field"; field.dataset.qid=q.id;
      const lbl=document.createElement("label"); lbl.className="field-label";
      lbl.textContent = state.lang==="bn" ? q.bn : q.en;
      const sel=document.createElement("select"); sel.dataset.qid=q.id;
      const ph=document.createElement("option"); ph.value=""; ph.textContent= state.lang==="bn"?"নির্বাচন করুন…":"Select…"; ph.disabled=true;
      sel.appendChild(ph);
      q.options.forEach(o=>{
        const op=document.createElement("option"); op.value=o.v; op.textContent= state.lang==="bn"?o.bn:o.en;
        sel.appendChild(op);
      });
      sel.value = state.demo[q.id] || "";
      if (!sel.value) ph.selected = true;
      sel.addEventListener("change",()=>{ state.demo[q.id]=sel.value; field.classList.remove("invalid"); save(); });
      field.appendChild(lbl); field.appendChild(sel); wrap.appendChild(field);
    });
  }
  function validateDemo(){
    let ok=true;
    DEMOGRAPHICS.forEach(q=>{
      const field = $(`.field[data-qid="${q.id}"]`);
      if (!state.demo[q.id]){ field.classList.add("invalid"); ok=false; }
    });
    if (!ok) toast(t("fillAll"));
    return ok;
  }

  /* ---------------- INSTRUCTIONS ---------------- */
  function renderInstructions(){
    $("#howTitle").textContent = state.lang==="bn" ? "তিনটি দ্রুত ধাপ" : "Three quick steps";
    const ol = $(".steps");
    const steps = state.mode==="flexible"
      ? [["1","howStep2FlexTitle","howStep2FlexDesc"],["2","howStep3Title","howStep3Desc"]]
      : [["1","howStep1Title","howStep1Desc"],["2","howStep2Title","howStep2Desc"],["3","howStep3Title","howStep3Desc"]];
    ol.innerHTML = steps.map(([n,tt,dd])=>`
      <li class="step"><span class="step-no">${n}</span>
        <div><h3>${t(tt)}</h3><p>${t(dd)}</p></div></li>`).join("");
  }

  /* ---------------- COARSE SORT ---------------- */
  function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

  function startCoarse(){
    if (!state.coarseOrder.length) state.coarseOrder = shuffle(STATEMENTS.map(s=>s.id));
    renderCoarseHead();
    renderCurrentCard(true);
    updateBucketCounts();
  }
  function renderCoarseHead(){
    const total = STATEMENTS.length;
    const pos = Math.min(state.coarsePos+1, total);
    $(".coarse-head .muted-p").innerHTML =
      `${t("coarseSub1")} <b>${pos}</b> ${t("coarseSub2")}`;
    $("#coarseFill").style.width = (state.coarsePos/total*100) + "%";
  }
  function stmt(id){ return STATEMENTS.find(s=>s.id===id); }

  function renderCurrentCard(instant){
    const stage = $("#cardStage");
    if (state.coarsePos >= state.coarseOrder.length){ goNext(); return; }
    const s = stmt(state.coarseOrder[state.coarsePos]);
    stage.innerHTML="";
    const card=document.createElement("div");
    card.className="qcard stage-card"; if(instant) card.style.animation="rise .35s ease both";
    card.innerHTML = `
      <div class="qcard-theme">${state.lang==="bn"?s.themeBn:s.theme}</div>
      <div class="qcard-text">${state.lang==="bn"?s.bn:s.en}</div>
      <div class="qcard-id">${s.id}</div>`;
    stage.appendChild(card);
  }
  function chooseBucket(val){
    if (state.coarsePos >= state.coarseOrder.length) return;
    const id = state.coarseOrder[state.coarsePos];
    state.buckets[id] = val;
    const card = $(".stage-card");
    if (card){ card.classList.add("card-fly"); }
    state.coarsePos++;
    updateBucketCounts(); renderCoarseHead(); save();
    setTimeout(()=>renderCurrentCard(false), 180);
  }
  function undoCoarse(){
    if (state.coarsePos===0) return;
    state.coarsePos--;
    delete state.buckets[state.coarseOrder[state.coarsePos]];
    updateBucketCounts(); renderCoarseHead(); renderCurrentCard(true); save();
  }
  function updateBucketCounts(){
    let d=0,n=0,a=0;
    Object.values(state.buckets).forEach(v=> v===-1?d++:v===0?n++:a++);
    $("#cntDis").textContent=d; $("#cntNeu").textContent=n; $("#cntAgr").textContent=a;
    $("#coarseUndo").style.visibility = state.coarsePos>0 ? "visible":"hidden";
  }

  /* ---------------- FINE SORT (guided grid) ---------------- */
  let trayFilter = "all";
  function startFine(){
    buildGrid();
    renderTray();
    updateFineState();
  }
  function buildGrid(){
    const board = $("#gridBoard"); board.innerHTML="";
    COLS.forEach(c=>{
      const cap = DISTRIBUTION[c]||0;
      const col=document.createElement("div"); col.className="col"; col.dataset.col=c;
      col.dataset.tilt = c<0?"neg":c>0?"pos":"neu";
      const head=document.createElement("div"); head.className="col-head";
      head.textContent = (+c>0?"+":"")+c;
      const slots=document.createElement("div"); slots.className="col-slots";
      for(let i=0;i<cap;i++){ const sl=document.createElement("div"); sl.className="slot"; slots.appendChild(sl); }
      col.appendChild(head); col.appendChild(slots);
      col.addEventListener("click",(e)=>{ if(state.dragging) return; if(state.selected){ placeCard(state.selected, c); clearSelection(); } });
      board.appendChild(col);
    });
    paintColumns();
  }
  function renderGridLabels(){ /* labels are +/-n, language-agnostic */ }

  function paintColumns(){
    COLS.forEach(c=>{
      const col = $(`.col[data-col="${c}"]`); if(!col) return;
      const slots = $$(".slot", col);
      slots.forEach(s=>{ s.innerHTML=""; s.classList.remove("full"); });
      state.columns[c].forEach((id,idx)=>{
        const sl = slots[idx]; if(!sl) return;
        sl.classList.add("full");
        const s = stmt(id);
        const pc=document.createElement("div"); pc.className="placed-card"; pc.dataset.id=id; pc.dataset.col=c;
        pc.innerHTML = `<span class="pc-id">${id}</span>${state.lang==="bn"?s.bn:s.en}`;
        if (state.selected===id) pc.style.outline="2px solid var(--lime)";
        attachDrag(pc, id);
        sl.appendChild(pc);
      });
    });
  }
  function renderTray(){
    const wrap = $("#trayCards"); wrap.innerHTML="";
    const placed = new Set(); COLS.forEach(c=>state.columns[c].forEach(id=>placed.add(id)));
    let list = STATEMENTS.map(s=>s.id).filter(id=>!placed.has(id));
    if (trayFilter!=="all") list = list.filter(id=> String(state.buckets[id]) === trayFilter);
    if (!list.length){
      wrap.innerHTML = `<div class="tray-empty">${state.lang==="bn"?"কোনো কার্ড নেই":"No cards here"}</div>`;
    }
    list.forEach(id=>{
      const s = stmt(id);
      const m=document.createElement("div"); m.className="mini"; m.dataset.id=id;
      if (state.buckets[id]!==undefined) m.dataset.bucket=state.buckets[id];
      if (state.selected===id) m.classList.add("sel");
      m.innerHTML = `<span class="mini-theme">${state.lang==="bn"?s.themeBn:s.theme}</span>${state.lang==="bn"?s.bn:s.en}`;
      attachDrag(m, id);
      wrap.appendChild(m);
    });
    // tray as drop zone (return cards)
    const tray = $("#tray");
    tray.onclick = (e)=>{ if(state.dragging) return; if(state.selected){ if(isPlaced(state.selected)){ removeCard(state.selected);} clearSelection(); } };
  }
  function initTrayFilter(){
    $$(".tf-btn").forEach(b=>b.addEventListener("click",()=>{
      $$(".tf-btn").forEach(x=>x.classList.remove("active")); b.classList.add("active");
      trayFilter=b.dataset.filter; renderTray();
    }));
  }
  function isPlaced(id){ return COLS.some(c=>state.columns[c].includes(id)); }
  function removeCard(id){ COLS.forEach(c=>{ const i=state.columns[c].indexOf(id); if(i>=0) state.columns[c].splice(i,1); }); paintColumns(); renderTray(); updateFineState(); save(); }
  function placeCard(id, col){
    const cap = DISTRIBUTION[col]||0;
    if (state.columns[col].length >= cap && !state.columns[col].includes(id)){
      toast(state.lang==="bn"?"এই কলাম পূর্ণ":"That column is full"); return false;
    }
    COLS.forEach(c=>{ const i=state.columns[c].indexOf(id); if(i>=0) state.columns[c].splice(i,1); });
    state.columns[col].push(id);
    paintColumns(); renderTray(); updateFineState(); save(); return true;
  }
  function updateFineState(){
    let placed=0; COLS.forEach(c=>placed+=state.columns[c].length);
    const remaining = STATEMENTS.length - placed;
    $("#fineRemaining").textContent = remaining;
    $("#fineNext").disabled = remaining!==0;
  }
  function clearSelection(){ state.selected=null; paintColumns(); $$(".mini.sel").forEach(m=>m.classList.remove("sel")); }

  /* ---------- unified pointer drag + tap ---------- */
  function attachDrag(el, id){
    el.addEventListener("pointerdown", (e)=>{
      if (e.button && e.button!==0) return;
      const startX=e.clientX, startY=e.clientY;
      let moved=false;
      const ghost = $("#dragGhost");
      const onMove=(ev)=>{
        const dx=ev.clientX-startX, dy=ev.clientY-startY;
        if (!moved && Math.hypot(dx,dy)>7){
          moved=true; state.dragging=true;
          const s=stmt(id);
          ghost.innerHTML = `<b>${id}</b> ${state.lang==="bn"?s.bn:s.en}`;
          ghost.classList.add("show");
          el.style.opacity=".3";
        }
        if (moved){
          ghost.style.left=ev.clientX+"px"; ghost.style.top=ev.clientY+"px";
          highlightUnder(ev.clientX, ev.clientY);
        }
      };
      const onUp=(ev)=>{
        window.removeEventListener("pointermove",onMove);
        window.removeEventListener("pointerup",onUp);
        ghost.classList.remove("show"); el.style.opacity="";
        $$(".slot.hot").forEach(s=>s.classList.remove("hot"));
        if (moved){
          const target = dropTargetUnder(ev.clientX, ev.clientY);
          if (target==="tray"){ if(isPlaced(id)) removeCard(id); }
          else if (target!==null){ placeCard(id, target); }
          setTimeout(()=>{ state.dragging=false; },0);
        } else {
          // tap = toggle selection
          if (state.selected===id){ clearSelection(); }
          else { state.selected=id; refreshSelectionUI(); }
        }
      };
      window.addEventListener("pointermove",onMove);
      window.addEventListener("pointerup",onUp);
    });
  }
  function refreshSelectionUI(){
    $$(".mini").forEach(m=>m.classList.toggle("sel", m.dataset.id===state.selected));
    paintColumns();
  }
  function highlightUnder(x,y){
    $$(".slot.hot").forEach(s=>s.classList.remove("hot"));
    const col = colUnder(x,y);
    if (col){ const empty = $$(".slot", col).find(s=>!s.classList.contains("full")); if(empty) empty.classList.add("hot"); }
  }
  function colUnder(x,y){ const el=document.elementFromPoint(x,y); return el ? el.closest(".col") : null; }
  function dropTargetUnder(x,y){
    const el=document.elementFromPoint(x,y); if(!el) return null;
    if (el.closest("#tray")) return "tray";
    const col=el.closest(".col"); return col ? col.dataset.col : null;
  }

  /* ---------------- FLEXIBLE RATING ---------------- */
  function renderFlex(){
    const wrap=$("#flexList"); wrap.innerHTML="";
    if(!state.flexOrder) state.flexOrder = shuffle(STATEMENTS.map(s=>s.id));
    state.flexOrder.forEach(id=>{
      const s=stmt(id);
      const item=document.createElement("div"); item.className="flex-item"; item.dataset.id=id;
      if (state.ratings[id]!==undefined) item.classList.add("done");
      const scale = COLS.map(c=>{
        const on = String(state.ratings[id])===c ? "on":"";
        return `<button class="fs-btn ${on}" data-v="${c}" type="button">${(+c>0?"+":"")+c}</button>`;
      }).join("");
      item.innerHTML = `
        <div class="flex-theme">${state.lang==="bn"?s.themeBn:s.theme}</div>
        <div class="flex-text">${state.lang==="bn"?s.bn:s.en}</div>
        <div class="flex-scale">${scale}</div>`;
      item.querySelectorAll(".fs-btn").forEach(b=>{
        b.addEventListener("click",()=>{
          state.ratings[id]=+b.dataset.v;
          item.querySelectorAll(".fs-btn").forEach(x=>x.classList.remove("on"));
          b.classList.add("on"); item.classList.add("done");
          updateFlexState(); save();
        });
      });
      wrap.appendChild(item);
    });
    updateFlexState();
  }
  function updateFlexState(){
    const done = Object.keys(state.ratings).filter(k=>state.flexOrder.includes(k)).length;
    $("#flexDone").textContent = done;
    $("#flexNext").disabled = done !== STATEMENTS.length;
  }

  /* ---------------- REFLECTION ---------------- */
  function valuesMap(){
    const m={};
    if (state.mode==="flexible"){ Object.assign(m, state.ratings); }
    else { COLS.forEach(c=>state.columns[c].forEach(id=>m[id]=+c)); }
    return m;
  }
  function renderReflect(){
    const vals = valuesMap();
    const entries = Object.entries(vals);
    const maxV = Math.max(...entries.map(([,v])=>v));
    const minV = Math.min(...entries.map(([,v])=>v));
    const top = entries.filter(([,v])=>v===maxV).map(([id])=>id).slice(0,4);
    const bot = entries.filter(([,v])=>v===minV).map(([id])=>id).slice(0,4);

    $("#reflectTop").innerHTML = blockHTML(t("reflectTopLabel"), top, maxV, "agree");
    $("#reflectBottom").innerHTML = blockHTML(t("reflectBottomLabel"), bot, minV, "disagree");

    const taA = $("#reflectTop textarea"), taB = $("#reflectBottom textarea");
    taA.value = state.reflect.agree; taB.value = state.reflect.disagree;
    taA.addEventListener("input",()=>{state.reflect.agree=taA.value;save();});
    taB.addEventListener("input",()=>{state.reflect.disagree=taB.value;save();});
    const taX = $("#reflectExtra"); taX.value=state.reflect.other; taX.placeholder=t("placeholderWhy");
    taX.addEventListener("input",()=>{state.reflect.other=taX.value;save();});
  }
  function blockHTML(label, ids, val, key){
    const cards = ids.map(id=>{
      const s=stmt(id);
      return `<div class="rb-card ${key==='disagree'?'neg':''}">
        <span class="rb-score">${(val>0?"+":"")+val}</span>
        <span>${state.lang==="bn"?s.bn:s.en}</span></div>`;
    }).join("");
    return `<label class="field-label">${label}</label>
      <div class="rb-cards">${cards}</div>
      <textarea class="ta" rows="3" placeholder="${t("placeholderWhy")}"></textarea>`;
  }

  /* ---------------- SUBMIT ---------------- */
  function buildPayload(){
    const vals = valuesMap();
    const flat = {
      responseId: state.responseId,
      submittedAt: new Date().toISOString(),
      mode: state.mode,
      language: state.lang,
      durationSec: Math.round((Date.now()-state.startedAt)/1000)
    };
    DEMOGRAPHICS.forEach(q=> flat[q.id] = state.demo[q.id]||"");
    STATEMENTS.forEach(s=> flat[s.id] = (vals[s.id]!==undefined ? vals[s.id] : ""));
    flat.whyAgree = state.reflect.agree||"";
    flat.whyDisagree = state.reflect.disagree||"";
    flat.otherComments = state.reflect.other||"";
    flat.userAgent = navigator.userAgent;
    return flat;
  }

  async function submit(){
    const btn = $("#submitBtn"); btn.disabled=true; btn.textContent=t("submitting");
    const payload = buildPayload();
    state.lastPayload = payload;
    let ok=false;
    if (ENDPOINT_URL && !ENDPOINT_URL.includes("PASTE_YOUR")){
      try{
        const res = await fetch(ENDPOINT_URL, {
          method:"POST",
          headers:{ "Content-Type":"text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(()=>({ok:true}));
        ok = res.ok && (data.ok!==false);
      }catch(err){
        // fallback: opaque write (data still lands, can't read response)
        try{
          await fetch(ENDPOINT_URL,{method:"POST",mode:"no-cors",
            headers:{ "Content-Type":"text/plain;charset=utf-8" },body:JSON.stringify(payload)});
          ok=true;
        }catch(e2){ ok=false; }
      }
    } else {
      // no endpoint configured yet — treat as demo success but warn in console
      console.warn("ENDPOINT_URL not set — responses were not sent anywhere. Edit assets/data.js.");
      ok = true;
    }
    btn.disabled=false; btn.textContent=t("submit");
    if (ok){ clearSaved(); show("done"); }
    else { show("error"); }
  }

  function onDone(){
    const certNo = certNumber();
    $("#doneRef").textContent = "Ref: " + state.responseId;
    const zone = $("#certZone");
    if (typeof CERT !== "undefined" && CERT && CERT.enabled){
      zone.hidden = false;
      // reset to name-entry state each time done is shown fresh
      if (!state._certShown){
        $("#certNameRow").hidden = false;
        $("#certPreview").hidden = true;
      }
      if (state.certName) $("#certName").value = state.certName;
    } else {
      zone.hidden = true;
    }
  }

  /* ---------------- PARTICIPATION CERTIFICATE ---------------- */
  function certNumber(){
    if (!state._certNo){
      const yr = new Date().getFullYear();
      const tail = (state.responseId || "").replace(/[^A-Z0-9]/gi,"").slice(-6).toUpperCase() ||
                   Math.random().toString(36).slice(2,8).toUpperCase();
      const pfx = (typeof CERT!=="undefined" && CERT.idPrefix) ? CERT.idPrefix : "CERT";
      state._certNo = `${pfx}-${yr}-${tail}`;
    }
    return state._certNo;
  }

  async function ensureCertFonts(){
    if (!document.fonts || !document.fonts.load) return;
    const fams = [
      '900 64px "Fraunces"', '700 48px "Fraunces"', '600 30px "Fraunces"',
      '700 30px "Archivo"', '600 24px "Archivo"', '500 22px "Archivo"', '800 20px "Archivo"',
      '700 40px "Noto Serif Bengali"', '600 26px "Noto Serif Bengali"', '500 22px "Noto Serif Bengali"'
    ];
    try { await Promise.all(fams.map(f=>document.fonts.load(f))); await document.fonts.ready; }
    catch(e){ /* fall back to whatever is available */ }
  }

  async function generateCertificate(){
    const name = ($("#certName").value || "").trim();
    if (!name){ toast(t("certNeedName")); $("#certName").focus(); return; }
    state.certName = name; save();
    const btn = $("#certGenBtn"); const old = btn.textContent;
    btn.disabled = true; btn.textContent = "…";
    await ensureCertFonts();
    drawCertificate();
    state._certShown = true;
    $("#certNameRow").hidden = true;
    $("#certPreview").hidden = false;
    btn.disabled = false; btn.textContent = old;
    $("#certPreview").scrollIntoView({behavior:"smooth", block:"center"});
  }

  function drawCertificate(){
    const canvas = $("#certCanvas"); if (!canvas) return;
    const bn = state.lang === "bn";
    const W = 1600, H = 1130, S = 2;            // logical size + retina scale
    canvas.width = W*S; canvas.height = H*S;
    canvas.style.aspectRatio = W + " / " + H;
    const ctx = canvas.getContext("2d");
    ctx.scale(S,S);

    const TEAL="#0C4A47", TEAL2="#0F5C58", LIME="#84CC16", CREAM="#FBF6EA",
          INK="#13312E", MUTE="#5C726E", GOLD="#B9892F";
    const disp = bn ? "Noto Serif Bengali" : "Fraunces";
    const body = bn ? "Noto Serif Bengali" : "Archivo";
    const center = W/2;

    // background
    ctx.fillStyle = CREAM; ctx.fillRect(0,0,W,H);
    // subtle inner panel
    ctx.fillStyle = "#FFFDF7"; roundRect(ctx,34,34,W-68,H-68,10); ctx.fill();

    // double frame
    ctx.strokeStyle = TEAL; ctx.lineWidth = 6;
    roundRect(ctx,40,40,W-80,H-80,8); ctx.stroke();
    ctx.strokeStyle = LIME; ctx.lineWidth = 2;
    roundRect(ctx,56,56,W-112,H-112,6); ctx.stroke();
    // corner ticks
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
    cornerTicks(ctx, 40,40, W-80, H-80, 34);

    // header brand
    ctx.textAlign = "center";
    // Q mark badge
    ctx.fillStyle = TEAL; roundRect(ctx, center-26, 92, 52, 52, 12); ctx.fill();
    ctx.fillStyle = LIME; ctx.font = '900 34px "Fraunces", serif';
    ctx.textBaseline = "middle"; ctx.fillText("Q", center, 120);
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = MUTE; ctx.font = '800 18px "Archivo", sans-serif';
    ctx.fillText(spaced((typeof CERT!=="undefined"&&CERT.org)?CERT.org:"Workforce Research"), center, 178);

    // title
    ctx.fillStyle = INK; ctx.font = `700 60px "${disp}", serif`;
    ctx.fillText(t("certHeading"), center, 256);
    // lime underline rule
    ctx.strokeStyle = LIME; ctx.lineWidth = 4; ctx.beginPath();
    ctx.moveTo(center-120, 280); ctx.lineTo(center+120, 280); ctx.stroke();

    // presented to
    ctx.fillStyle = MUTE; ctx.font = `500 24px "${body}", sans-serif`;
    ctx.fillText(t("certPresentedTo"), center, 340);

    // NAME
    ctx.fillStyle = TEAL; ctx.font = `700 64px "${disp}","Noto Serif Bengali",serif`;
    const nm = state.certName || t("certFallbackName");
    fitText(ctx, nm, center, 414, W-360, 64, 36, disp);
    // name underline
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(center-300, 444); ctx.lineTo(center+300, 444); ctx.stroke();

    // body line
    ctx.fillStyle = INK; ctx.font = `500 24px "${body}", sans-serif`;
    ctx.fillText(t("certBody"), center, 498);

    // study title (italic-ish, wrapped)
    ctx.fillStyle = TEAL2; ctx.font = `600 27px "${disp}", serif`;
    const titleLines = wrapLines(ctx, t("certStudyTitle"), W-460);
    let ty = 542;
    titleLines.forEach(line=>{ ctx.fillText(line, center, ty); ty += 36; });

    // method line
    const method = state.mode === "flexible" ? t("certMethodFlex") : t("certMethodGuided");
    ctx.fillStyle = MUTE; ctx.font = `500 22px "${body}", sans-serif`;
    ctx.fillText("— " + method + " —", center, ty + 18);

    // contribution
    ctx.fillStyle = INK; ctx.font = `500 21px "${body}", sans-serif`;
    const contribLines = wrapLines(ctx, t("certContribution"), W-560);
    let cy = ty + 60;
    contribLines.forEach(line=>{ ctx.fillText(line, center, cy); cy += 28; });

    // ---- verified seal (right) ----
    drawSeal(ctx, W-250, H-250, 92, {TEAL,LIME,GOLD,CREAM}, t("certVerified"), bn?"Noto Serif Bengali":"Archivo");

    // ---- footer: issued date + cert no (left) ----
    const dateStr = formatDate(new Date(), bn);
    ctx.textAlign = "left";
    ctx.fillStyle = MUTE; ctx.font = `700 14px "Archivo", sans-serif`;
    ctx.fillText(spaced(t("certIssued")), 120, H-150);
    ctx.fillStyle = INK; ctx.font = `600 22px "${body}", sans-serif`;
    ctx.fillText(dateStr, 120, H-120);
    ctx.fillStyle = MUTE; ctx.font = `700 14px "Archivo", sans-serif`;
    ctx.fillText(spaced(t("certCertNo")), 120, H-86);
    ctx.fillStyle = INK; ctx.font = `700 20px "Archivo", sans-serif`;
    ctx.fillText(certNumber(), 120, H-58);

    // ---- footer: issuer signature (center-right) ----
    const sigX0 = center+40, sigX1 = center+360, sigCx = (sigX0+sigX1)/2;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(sigX0, H-120); ctx.lineTo(sigX1, H-120); ctx.stroke();
    ctx.textAlign = "center";
    const iName = (typeof CERT!=="undefined"&&CERT.issuerName)?CERT.issuerName:"";
    const iTitle = (typeof CERT!=="undefined"&&CERT.issuerTitle)?CERT.issuerTitle:"";
    if (iName){ ctx.fillStyle = INK; ctx.font = `600 22px "${disp}", serif`; ctx.fillText(iName, sigCx, H-90); }
    if (iTitle){ ctx.fillStyle = MUTE; ctx.font = `600 16px "${body}", sans-serif`; ctx.fillText(iTitle, sigCx, H-64); }
    ctx.textAlign = "left";
  }

  /* canvas helpers */
  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }
  function cornerTicks(ctx,x,y,w,h,len){
    const c=[[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]];
    c.forEach(([cx,cy,sx,sy])=>{
      ctx.beginPath(); ctx.moveTo(cx, cy+sy*len); ctx.lineTo(cx,cy); ctx.lineTo(cx+sx*len, cy); ctx.stroke();
    });
  }
  function spaced(s){ return String(s).toUpperCase().split("").join("\u200a\u200a"); }
  function wrapLines(ctx, text, maxW){
    const words = String(text).split(/\s+/); const lines=[]; let line="";
    words.forEach(w=>{
      const test = line ? line+" "+w : w;
      if (ctx.measureText(test).width > maxW && line){ lines.push(line); line=w; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }
  function fitText(ctx, text, cx, y, maxW, size, minSize, fam){
    let s = size;
    do { ctx.font = `700 ${s}px "${fam}","Noto Serif Bengali",serif`;
         if (ctx.measureText(text).width <= maxW) break; s -= 2; } while (s > minSize);
    ctx.textAlign = "center"; ctx.fillText(text, cx, y);
  }
  function formatDate(d, bn){
    const months = bn
      ? ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"]
      : ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const toBn = n => bn ? String(n).replace(/\d/g,d=>"০১২৩৪৫৬৭৮৯"[d]) : String(n);
    return `${toBn(d.getDate())} ${months[d.getMonth()]} ${toBn(d.getFullYear())}`;
  }
  function drawSeal(ctx, cx, cy, r, c, label, fam){
    ctx.save();
    // outer ring
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=c.TEAL; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,r-7,0,Math.PI*2); ctx.lineWidth=2; ctx.strokeStyle=c.LIME; ctx.stroke();
    // notched edge
    ctx.strokeStyle=c.GOLD; ctx.lineWidth=2;
    for(let i=0;i<40;i++){ const a=i/40*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*(r+1),cy+Math.sin(a)*(r+1));
      ctx.lineTo(cx+Math.cos(a)*(r+8),cy+Math.sin(a)*(r+8)); ctx.stroke(); }
    // inner disc
    ctx.beginPath(); ctx.arc(cx,cy,r-26,0,Math.PI*2); ctx.fillStyle=c.CREAM; ctx.fill();
    // check mark
    ctx.strokeStyle=c.TEAL; ctx.lineWidth=8; ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.beginPath(); ctx.moveTo(cx-22,cy-4); ctx.lineTo(cx-6,cy+14); ctx.lineTo(cx+24,cy-22); ctx.stroke();
    ctx.lineCap="butt";
    // label
    ctx.textAlign="center"; ctx.fillStyle=c.TEAL; ctx.font=`800 11px "${fam}", sans-serif`;
    ctx.fillText(label, cx, cy+r-12);
    ctx.restore();
  }

  function downloadCertificate(){
    const canvas = $("#certCanvas");
    const safe = (state.certName||"participant").replace(/[^\w\u0980-\u09FF]+/g,"_").slice(0,40);
    canvas.toBlob(blob=>{
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `certificate-${safe}-${certNumber()}.png`; a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 1500);
    }, "image/png");
  }

  function printCertificate(){
    const dataURL = $("#certCanvas").toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w){ toast("Pop-up blocked — use Download instead."); return; }
    w.document.write(
      '<!doctype html><title>Certificate</title>' +
      '<style>@page{size:landscape;margin:0}html,body{margin:0;height:100%}' +
      'img{width:100%;height:auto;display:block}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>' +
      '<img src="'+dataURL+'" onload="setTimeout(function(){window.focus();window.print();},250)">'
    );
    w.document.close();
  }

  function downloadResponses(){
    const blob = new Blob([JSON.stringify(state.lastPayload||buildPayload(),null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`qstudy-${state.responseId}.json`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  /* ---------------- toast ---------------- */
  let toastTimer;
  function toast(msg){
    let el=$(".toast"); if(!el){ el=document.createElement("div"); el.className="toast"; document.body.appendChild(el); }
    el.textContent=msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2200);
  }

  /* ---------------- nav wiring ---------------- */
  function wireNav(){
    $$('[data-nav="next"]').forEach(b=>b.addEventListener("click",()=>{
      if (state.screen==="demographics" && !validateDemo()) return;
      goNext();
    }));
    $$('[data-nav="back"]').forEach(b=>b.addEventListener("click", goBack));

    // coarse buckets
    $$(".bucket").forEach(b=>b.addEventListener("click",()=>chooseBucket(+b.dataset.bucket)));
    $("#coarseUndo").addEventListener("click", undoCoarse);

    $("#fineNext").addEventListener("click", goNext);
    $("#flexNext").addEventListener("click", goNext);
    $("#submitBtn").addEventListener("click", submit);
    $("#retryBtn").addEventListener("click", submit);
    $("#downloadBtn").addEventListener("click", downloadResponses);
    $("#downloadBtn2").addEventListener("click", downloadResponses);

    // certificate
    const cg = $("#certGenBtn"); if (cg) cg.addEventListener("click", generateCertificate);
    const cd = $("#certDownloadBtn"); if (cd) cd.addEventListener("click", downloadCertificate);
    const cp = $("#certPrintBtn"); if (cp) cp.addEventListener("click", printCertificate);
    const cn = $("#certName"); if (cn) cn.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); generateCertificate(); }});

    $("#langToggle").addEventListener("click",()=>{ state.lang = state.lang==="en"?"bn":"en"; applyLang(); save(); });
  }

  /* keyboard for coarse sort */
  window.addEventListener("keydown",(e)=>{
    if (state.screen!=="coarse") return;
    if (e.key==="ArrowLeft") chooseBucket(-1);
    else if (e.key==="ArrowRight") chooseBucket(1);
    else if (e.key==="ArrowDown"||e.key===" ") { e.preventDefault(); chooseBucket(0); }
    else if (e.key==="Backspace") { e.preventDefault(); undoCoarse(); }
  });

  /* ---------------- boot ---------------- */
  document.addEventListener("DOMContentLoaded",()=>{
    initWelcome();
    initTrayFilter();
    wireNav();
    applyLang();
    renderProgress();
  });
})();
