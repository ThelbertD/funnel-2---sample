/* Shared funnel engine: hash router, VSL video cards, preview bar, notes/script drawer.
   Each funnel page defines window.FF_FUNNEL = { name, steps:[{ id, label, notes:{purpose, metric, build[]}, script? }] }
   and marks each page with <section data-page="id">. */
(function(){
  const ROOT = new URL("..", document.currentScript.src).href;
  const F = window.FF_FUNNEL;
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  /* ---------- storage ---------- */
  const LS = {
    get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
    set(k,v){ try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch(e){} }
  };
  function idb(){
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open("ff-videos", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("v");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch(e){ rej(e); }
    });
  }
  async function idbGet(k){
    try { const db = await idb(); return await new Promise(r => { const q = db.transaction("v").objectStore("v").get(k); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); }); }
    catch(e){ return null; }
  }
  async function idbSet(k, v){
    try { const db = await idb(); await new Promise(r => { const t = db.transaction("v", "readwrite"); const s = t.objectStore("v"); v == null ? s.delete(k) : s.put(v, k); t.oncomplete = r; t.onerror = r; }); return true; }
    catch(e){ return false; }
  }

  /* ---------- video source parsing ---------- */
  function parse(url){
    if (!url) return null;
    url = url.trim();
    let m;
    if ((m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)))
      return { kind:"iframe", src:`https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1&playsinline=1`, label:"YouTube" };
    if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/)))
      return { kind:"iframe", src:`https://player.vimeo.com/video/${m[1]}${m[2] ? "?h="+m[2] : ""}`, label:"Vimeo" };
    if ((m = url.match(/loom\.com\/(?:share|embed)\/([\w]+)/)))
      return { kind:"iframe", src:`https://www.loom.com/embed/${m[1]}`, label:"Loom" };
    if ((m = url.match(/(?:wistia\.(?:com|net)|wi\.st)\/(?:medias|embed\/iframe|embed\/medias)\/(\w+)/)))
      return { kind:"iframe", src:`https://fast.wistia.net/embed/iframe/${m[1]}?videoFoam=true`, label:"Wistia" };
    if (/^blob:/.test(url) || /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(url))
      return { kind:"video", src: /^(https?:|blob:|\/)/.test(url) ? url : new URL(url, ROOT).href, label:"Video file" };
    if (/^https?:\/\/.+\/(embed|player|iframe)/i.test(url))
      return { kind:"iframe", src:url, label:"Embed" };
    return null;
  }

  async function sourceFor(key){
    const blob = await idbGet("file:" + key);
    if (blob && blob.data) return { kind:"video", src:URL.createObjectURL(blob.data), label:"Uploaded: " + blob.name, from:"upload" };
    const saved = LS.get("ff-video:" + key);
    if (saved){ const p = parse(saved); if (p) return { ...p, from:"browser" }; }
    const cfg = (window.FF_VIDEOS || {})[key];
    if (cfg){ const p = parse(cfg); if (p) return { ...p, from:"config" }; }
    return null;
  }

  /* ---------- VSL card ---------- */
  async function renderCard(el){
    const key = el.dataset.vsl;
    const d = el.dataset;
    const src = await sourceFor(key);
    el.classList.add("vsl");
    let player;
    if (src && src.kind === "iframe")
      player = `<iframe src="${esc(src.src)}" title="${esc(d.title || "Video")}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;
    else if (src && src.kind === "video")
      player = `<video src="${esc(src.src)}" controls playsinline preload="metadata"></video>`;
    else
      player = `<button class="vsl-ph" type="button" data-vsl-add aria-label="Add video for ${esc(d.title || key)}">
        <span class="vsl-ttl"><small>${esc(d.eyebrow || "Video")}</small><span>${esc(d.title || "")}</span></span>
        <span class="vsl-play"></span>
        <span class="vsl-hint">+ Add your video</span>
        <span class="vsl-rail"><span>0:00</span><i></i><span>${esc(d.length || "")}</span></span></button>`;
    const fromTxt = !src ? "No video yet" : src.from === "config" ? "Set in videos.js" : src.from === "upload" ? "Uploaded file, saved in this browser" : "Link saved in this browser";
    el.innerHTML = `<div class="vsl-frame">${player}</div>
      <div class="vsl-tools"><span class="tag">Video slot · ${esc(key)}</span><span>${esc(fromTxt)}</span>
        <button type="button" data-vsl-add>${src ? "Change video" : "Add video"}</button>
        ${src && src.from !== "config" ? '<button type="button" data-vsl-remove>Remove</button>' : ""}</div>`;
  }
  function openPanel(card){
    const frame = $(".vsl-frame", card);
    if ($(".vsl-panel", frame)) return;
    const key = card.dataset.vsl;
    const p = document.createElement("form");
    p.className = "vsl-panel";
    p.innerHTML = `<b>Add your video · ${esc(card.dataset.title || key)}</b>
      <div class="row"><input type="url" id="vsl-url-${esc(key)}" placeholder="Paste a YouTube, Vimeo, Loom or Wistia link" value="${esc(LS.get("ff-video:"+key) || "")}"><button type="submit">Use link</button></div>
      <div class="row" style="align-items:center"><span style="color:#a99d8f">or</span><label class="file">Upload a video file<input type="file" accept="video/*"></label></div>
      <span class="err" hidden></span>
      <small>Saved in this browser. To show it for everyone, set "${esc(key)}" in videos.js.</small>
      <div><button type="button" class="cancel">Cancel</button></div>`;
    frame.appendChild(p);
    const err = $(".err", p);
    $("input[type=url]", p).focus();
    p.addEventListener("submit", async e => {
      e.preventDefault();
      const v = $("input[type=url]", p).value.trim();
      if (!parse(v)){ err.hidden = false; err.textContent = "That link isn't a video link we recognise. Try a YouTube, Vimeo, Loom or Wistia share link, or a link ending in .mp4."; return; }
      LS.set("ff-video:" + key, v);
      await idbSet("file:" + key, null);
      renderCard(card);
    });
    $("input[type=file]", p).addEventListener("change", async e => {
      const f = e.target.files[0];
      if (!f) return;
      const ok = await idbSet("file:" + key, { name:f.name, data:f });
      LS.set("ff-video:" + key, null);
      if (!ok){ err.hidden = false; err.textContent = "This browser wouldn't save the file. It will play until you refresh. For a permanent video, copy it into the videos folder and set it in videos.js."; }
      if (ok) renderCard(card);
      else { const fr = $(".vsl-frame", card); fr.innerHTML = `<video src="${URL.createObjectURL(f)}" controls playsinline></video>`; }
    });
    $(".cancel", p).addEventListener("click", () => p.remove());
  }
  document.addEventListener("click", async e => {
    const add = e.target.closest("[data-vsl-add]");
    const rem = e.target.closest("[data-vsl-remove]");
    if (add){
      const card = add.closest("[data-vsl]");
      openPanel(card);
    }
    if (rem){
      const card = rem.closest("[data-vsl]");
      LS.set("ff-video:" + card.dataset.vsl, null);
      await idbSet("file:" + card.dataset.vsl, null);
      renderCard(card);
    }
  });

  /* ---------- preview bar + drawer ---------- */
  const bar = document.createElement("div");
  bar.className = "ffbar";
  bar.innerHTML = `<span class="nm">${esc(F.name)}</span><span class="sep"></span>
    <nav aria-label="Funnel steps">${F.steps.map((s,i) => `<a href="#${s.id}" data-step="${s.id}"><span class="n">${i+1}</span>${esc(s.label)}</a>`).join("")}</nav>
    <span class="sep"></span><button type="button" class="act" data-ff-notes>Notes &amp; script</button><button type="button" data-ff-clean title="Hide preview tools for presenting">Present</button>`;
  const show = document.createElement("button");
  show.className = "ffshow"; show.type = "button"; show.title = "Show preview bar"; show.setAttribute("aria-label", "Show preview bar"); show.hidden = true;
  const drawer = document.createElement("aside");
  drawer.className = "ffdrawer"; drawer.setAttribute("aria-label", "Page notes and video script");
  const scrim = document.createElement("div"); scrim.className = "ffscrim"; scrim.hidden = true;
  // Preview bar, notes drawer and show-dot are built but not attached: the funnels ship without preview chrome.

  function setClean(on){
    document.body.classList.toggle("ff-clean", on);
    bar.hidden = on; show.hidden = !on;
    LS.set("ff-clean", on ? "1" : null);
  }
  function openDrawer(){ drawer.classList.add("open"); scrim.hidden = false; }
  function closeDrawer(){ drawer.classList.remove("open"); scrim.hidden = true; }
  bar.addEventListener("click", e => {
    if (e.target.closest("[data-ff-notes]")) openDrawer();
    if (e.target.closest("[data-ff-clean]")) setClean(true);
  });
  show.addEventListener("click", () => setClean(false));
  scrim.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });

  function fillDrawer(step, idx){
    const n = step.notes || {};
    let h = `<header><b>Step ${idx+1} · ${esc(step.label)}</b><button type="button" data-close>Close ✕</button></header><div class="in">`;
    if (n.purpose) h += `<div><div class="lab">What this page does</div><p style="margin-top:6px">${esc(n.purpose)}</p></div>`;
    if (n.metric) h += `<div class="met"><span>${esc(n.metric[0])}</span><b>${esc(n.metric[1])}</b></div>`;
    if (n.build) h += `<div><div class="lab" style="margin-bottom:6px">Build notes</div><ul>${n.build.map(b => `<li>${esc(b)}</li>`).join("")}</ul></div>`;
    if (step.script){
      const s = step.script;
      h += `<div class="scr"><div class="h"><b>${esc(s.name)}</b><span class="lab">${esc(s.dur)}</span></div><div class="fmt">${esc(s.fmt)}</div>
        ${s.parts.map((p,i) => `<details${i===0?" open":""}><summary><span class="tc">${esc(p[0])}</span><span>${esc(p[1])}</span></summary><div class="b">${p[2].map(l => l.startsWith("[") ? `<p class="dir">${esc(l)}</p>` : `<p>${esc(l)}</p>`).join("")}</div></details>`).join("")}</div>`;
    } else {
      h += `<p class="lab">No video on this page</p>`;
    }
    drawer.innerHTML = h + "</div>";
    $("[data-close]", drawer).addEventListener("click", closeDrawer);
  }

  /* ---------- router ---------- */
  function route(){
    const first = F.start || F.steps[0].id;
    const raw = location.hash.slice(1) || first;
    const pages = $$("[data-page]");
    let target = pages.find(p => p.dataset.page === raw), anchor = null;
    if (!target){
      // an in-page anchor such as #reserve: show its page and scroll to it
      anchor = document.getElementById(raw);
      target = anchor && anchor.closest("[data-page]");
    }
    if (!target){ location.replace("#" + first); return; }
    const id = target.dataset.page;
    const changed = target.hidden;
    pages.forEach(p => p.hidden = p !== target);
    if (anchor){
      if (changed) setTimeout(() => anchor.scrollIntoView({ behavior:"instant", block:"start" }), 120);
      else anchor.scrollIntoView({ behavior:"smooth", block:"start" });
    }
    else window.scrollTo({ top:0, behavior:"instant" });
    if (!changed && anchor) return;
    const idx = Math.max(0, F.steps.findIndex(s => s.id === id));
    $$("nav a", bar).forEach(a => a.classList.toggle("on", a.dataset.step === id));
    const on = $("nav a.on", bar); if (on) on.scrollIntoView({ block:"nearest", inline:"center" });
    if (F.steps[idx]) fillDrawer(F.steps[idx], idx);
    document.title = `${F.steps[idx] ? F.steps[idx].label + " · " : ""}${F.name}`;
    document.dispatchEvent(new CustomEvent("ff:page", { detail:id }));
  }
  window.addEventListener("hashchange", route);

  window.FF = { go: id => { if (location.hash.slice(1) === id) route(); else location.hash = id; }, LS, openDrawer };

  $$("[data-vsl]").forEach(renderCard);
  LS.set("ff-clean", null);
  route();
})();
