import * as pdfjsLib from "../vendor/pdfjs/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;

const $ = (selector) => document.querySelector(selector);
const refs = {
  publicationList: $("#publication-list"), dialog: $("#project-dialog"), close: $("#project-close"), meta: $("#project-dialog-meta"), title: $("#project-dialog-title"), authors: $("#project-dialog-authors"), abstract: $("#project-dialog-abstract"), introduction: $("#project-dialog-introduction"), results: $("#project-dialog-results"), citation: $("#project-dialog-citation"), facts: $("#project-facts"), topics: $("#project-dialog-topics"), read: $("#project-read-pdf"), repository: $("#project-repository"), panel: $("#project-pdf-panel"), pdfTitle: $("#project-pdf-title"), pdfOpen: $("#project-pdf-open"), pages: $("#pdf-pages"), thumbnails: $("#pdf-thumbnails"), status: $("#pdf-reader-status"), zoomOut: $("#pdf-zoom-out"), zoomIn: $("#pdf-zoom-in"), zoomLevel: $("#pdf-zoom-level"), zoomSlider: $("#pdf-zoom-slider"), fit: $("#pdf-fit-width"), thumbToggle: $("#pdf-thumbnails-toggle"), fullscreen: $("#pdf-fullscreen"), pageInput: $("#pdf-page-input"), pageTotal: $("#pdf-page-total"), searchForm: $("#pdf-search-form"), searchInput: $("#pdf-search-input"), searchStatus: $("#pdf-search-status")
};
let projects = [], activeProject = null, activePdf = null, pageObserver = null, pdfScale = 1, renderSession = 0, searchPage = 0, scrollFrame = 0;
const t = (key, vars) => window.siteI18n?.t(key, vars) || key;
const localized = (value) => value && typeof value === "object" ? (value[window.siteI18n?.language || "en"] || value.en || Object.values(value)[0]) : value;
function el(tag, className, text) { const node=document.createElement(tag); if(className) node.className=className; if(text !== undefined) node.textContent=text; return node; }
function updateDialogState(){ document.body.classList.toggle("dialog-open", Boolean(refs.dialog?.open)); }
function setReadLabel(open){ const span=refs.read?.querySelector("span"); if(span) span.textContent=t(open ? "hideFull" : "readFull"); }
function fact(label, value){ const item=el("div","project-fact"); item.append(el("span","",label),el("strong","",localized(value))); return item; }

function resetPdfReader(){ renderSession++; pageObserver?.disconnect(); pageObserver=null; activePdf?.destroy(); activePdf=null; refs.pages?.replaceChildren(); refs.thumbnails?.replaceChildren(); if(refs.pageInput) refs.pageInput.value="1"; if(refs.pageTotal) refs.pageTotal.textContent="—"; if(refs.searchStatus) refs.searchStatus.textContent=""; if(refs.searchInput) refs.searchInput.value=""; searchPage=0; if(refs.status){ refs.status.hidden=false; refs.status.textContent=t("preparing"); } }

function fillDialog(project){
  refs.meta.textContent=`${localized(project.type)} · ${project.year}`; refs.title.textContent=localized(project.title); refs.authors.textContent=project.authors; refs.abstract.textContent=localized(project.abstract); refs.introduction.textContent=localized(project.introduction); refs.results.textContent=localized(project.results); refs.citation.textContent=localized(project.citation);
  refs.facts.replaceChildren(fact(t("status"),project.status),fact(t("period"),project.period),fact(t("institution"),project.institution),fact(t("funding"),project.funding),fact(t("doi"),project.doi || t("noDoi")));
  refs.topics.replaceChildren(...project.technologies.map(topic=>el("li","",topic)));
  if(project.repository){ refs.repository.href=project.repository; refs.repository.target="_blank"; refs.repository.rel="noopener noreferrer"; refs.repository.classList.remove("disabled"); refs.repository.setAttribute("aria-disabled","false"); } else { refs.repository.removeAttribute("href"); refs.repository.classList.add("disabled"); refs.repository.setAttribute("aria-disabled","true"); }
}
function openProject(project){ if(!refs.dialog)return; activeProject=project; fillDialog(project); refs.panel.hidden=true; pdfScale=1; updateZoomControls(); setReadLabel(false); resetPdfReader(); refs.dialog.showModal(); updateDialogState(); }
function closeProject(){ if(!refs.dialog?.open)return; refs.dialog.close(); resetPdfReader(); updateDialogState(); }

async function renderPage(canvas,session){ if(!activePdf||canvas.dataset.rendered==="true"||canvas.dataset.rendering==="true")return; canvas.dataset.rendering="true"; const page=await activePdf.getPage(Number(canvas.dataset.page)); if(session!==renderSession)return; const viewport=page.getViewport({scale:pdfScale}); const ratio=Math.min(devicePixelRatio||1,2); const renderViewport=page.getViewport({scale:pdfScale*ratio}); canvas.width=Math.floor(renderViewport.width); canvas.height=Math.floor(renderViewport.height); canvas.style.width=`${Math.floor(viewport.width)}px`; canvas.style.aspectRatio=`${viewport.width}/${viewport.height}`; await page.render({canvasContext:canvas.getContext("2d",{alpha:false}),viewport:renderViewport}).promise; if(session!==renderSession)return; canvas.dataset.rendering="false"; canvas.dataset.rendered="true"; canvas.closest(".pdf-page")?.classList.add("rendered"); }
async function renderThumbnail(page,pageNumber,button,session){ const viewport=page.getViewport({scale:.2}); const ratio=Math.min(devicePixelRatio||1,1.5); const canvas=button.querySelector("canvas"); canvas.width=Math.floor(viewport.width*ratio); canvas.height=Math.floor(viewport.height*ratio); canvas.style.aspectRatio=`${viewport.width}/${viewport.height}`; await page.render({canvasContext:canvas.getContext("2d",{alpha:false}),viewport:page.getViewport({scale:.2*ratio})}).promise; if(session!==renderSession)return; button.classList.add("rendered"); button.addEventListener("click",()=>goToPage(pageNumber)); }

async function buildPdfPages(session){
  if(!activePdf||!refs.pages)return; pageObserver?.disconnect(); refs.pages.replaceChildren(); refs.thumbnails.replaceChildren(); refs.pageTotal.textContent=String(activePdf.numPages); refs.pageInput.max=String(activePdf.numPages);
  pageObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)renderPage(entry.target.querySelector("canvas"),session);}),{root:refs.pages,rootMargin:"900px 0px",threshold:.01});
  for(let number=1;number<=activePdf.numPages;number++){
    refs.status.textContent=t("preparingPage",{page:number,total:activePdf.numPages}); const page=await activePdf.getPage(number); if(session!==renderSession)return; const viewport=page.getViewport({scale:pdfScale}); const article=el("article","pdf-page"); article.dataset.page=String(number); const canvas=document.createElement("canvas"); canvas.dataset.page=String(number); canvas.style.width=`${Math.floor(viewport.width)}px`; canvas.style.aspectRatio=`${viewport.width}/${viewport.height}`; canvas.setAttribute("aria-label",`Page ${number} of ${activePdf.numPages}`); article.append(canvas,el("span","pdf-page-number",`${number} / ${activePdf.numPages}`)); refs.pages.append(article); pageObserver.observe(article);
    const thumb=el("button","pdf-thumbnail"); thumb.type="button"; thumb.setAttribute("aria-label",`Page ${number}`); thumb.append(document.createElement("canvas"),el("span","",String(number))); refs.thumbnails.append(thumb); renderThumbnail(page,number,thumb,session);
  }
  refs.status.hidden=true; updateCurrentPage();
}
async function loadPdf(project){ resetPdfReader(); const session=renderSession; refs.pdfTitle.textContent=localized(project.title); refs.pdfOpen.href=project.pdf; try{ activePdf=await pdfjsLib.getDocument(project.pdf).promise; if(session!==renderSession)return; await buildPdfPages(session); }catch(error){ if(session!==renderSession)return; refs.status.hidden=false; refs.status.textContent=t("pdfError"); console.error("PDF reader error",error); } }
function togglePdf(project){ const show=refs.panel.hidden; refs.panel.hidden=!show; setReadLabel(show); if(show){loadPdf(project); requestAnimationFrame(()=>refs.panel.scrollIntoView({behavior:"smooth",block:"start"}));}else resetPdfReader();}
function updateZoomControls(){ refs.zoomLevel.textContent=`${Math.round(pdfScale*100)}%`; refs.zoomSlider.value=String(Math.round(pdfScale*100)); refs.zoomOut.disabled=pdfScale<=.5; refs.zoomIn.disabled=pdfScale>=1.6; }
function setZoom(scale){ if(!activePdf)return; const current=Number(refs.pageInput.value)||1; pdfScale=Math.min(1.6,Math.max(.5,Number(scale.toFixed(2)))); updateZoomControls(); const session=++renderSession; buildPdfPages(session).then(()=>goToPage(current,"auto")); }
async function fitWidth(){ if(!activePdf)return; const page=await activePdf.getPage(1); setZoom(Math.max(.5,(refs.pages.clientWidth-56)/page.getViewport({scale:1}).width)); }
function goToPage(number,behavior="smooth"){ if(!activePdf)return; const page=Math.min(activePdf.numPages,Math.max(1,Number(number)||1)); refs.pages.querySelector(`[data-page="${page}"]`)?.scrollIntoView({behavior,block:"start"}); refs.pageInput.value=String(page); }
function updateCurrentPage(){ scrollFrame=0; const pages=[...refs.pages.querySelectorAll(".pdf-page")]; if(!pages.length)return; const center=refs.pages.getBoundingClientRect().top+refs.pages.clientHeight/2; let current=pages.reduce((best,page)=>Math.abs(page.getBoundingClientRect().top-center)<Math.abs(best.getBoundingClientRect().top-center)?page:best,pages[0]); const number=current.dataset.page; refs.pageInput.value=number; refs.thumbnails.querySelectorAll(".active").forEach(node=>node.classList.remove("active")); refs.thumbnails.children[Number(number)-1]?.classList.add("active"); }
async function searchPdf(event){ event.preventDefault(); if(!activePdf)return; const query=refs.searchInput.value.trim().toLocaleLowerCase(); if(!query)return; refs.searchStatus.textContent="…"; for(let offset=1;offset<=activePdf.numPages;offset++){ const number=((searchPage+offset-1)%activePdf.numPages)+1; const page=await activePdf.getPage(number); const content=await page.getTextContent(); const text=content.items.map(item=>item.str).join(" ").toLocaleLowerCase(); if(text.includes(query)){ searchPage=number; goToPage(number); refs.searchStatus.textContent=t("foundPage",{page:number}); refs.pages.querySelectorAll(".search-match").forEach(node=>node.classList.remove("search-match")); refs.pages.querySelector(`[data-page="${number}"]`)?.classList.add("search-match"); return; }} refs.searchStatus.textContent=t("notFound"); }

function renderPublication(project){
  const article=el("article",`publication-item${project.private ? " publication-private" : ""}`);
  const meta=el("div","publication-meta");
  meta.append(el("span","publication-year",project.year),el("span","",localized(project.type)),el("span","publication-status",localized(project.status)));
  const content=el("div","publication-content");
  content.append(el("h3","",localized(project.title)),el("p","",project.authors),el("small","",localized(project.citation)));
  if(project.private){
    const lock=el("div","publication-lock");
    lock.setAttribute("aria-label",t("privateManuscript"));
    const icon=el("i","fa-solid fa-lock");
    icon.setAttribute("aria-hidden","true");
    lock.append(icon,el("strong","",t("private")),el("span","",t("privateManuscript")));
    article.append(meta,content,lock);
  }else{
    const button=el("button","publication-action",t("readRecord"));
    button.type="button";
    button.addEventListener("click",()=>openProject(project));
    article.append(meta,content,button);
  }
  return article;
}
function renderAll(){ refs.publicationList?.replaceChildren(...projects.map(renderPublication)); if(activeProject&&refs.dialog?.open){ fillDialog(activeProject); setReadLabel(!refs.panel.hidden); } }
async function loadProjects(){ try{ const response=await fetch("data/projects.json"); if(!response.ok)throw new Error(response.status); projects=await response.json(); renderAll(); }catch(error){console.warn("Projects could not be loaded.",error);} }

refs.close?.addEventListener("click",closeProject); refs.read?.addEventListener("click",()=>activeProject&&togglePdf(activeProject)); refs.dialog?.addEventListener("click",event=>{if(event.target===refs.dialog)closeProject();}); refs.dialog?.addEventListener("cancel",event=>{event.preventDefault();closeProject();}); refs.zoomOut?.addEventListener("click",()=>setZoom(pdfScale-.1)); refs.zoomIn?.addEventListener("click",()=>setZoom(pdfScale+.1)); refs.zoomSlider?.addEventListener("input",()=>refs.zoomLevel.textContent=`${refs.zoomSlider.value}%`); refs.zoomSlider?.addEventListener("change",()=>setZoom(Number(refs.zoomSlider.value)/100)); refs.fit?.addEventListener("click",fitWidth); refs.thumbToggle?.addEventListener("click",()=>refs.thumbnails.classList.toggle("hidden")); refs.pageInput?.addEventListener("change",()=>goToPage(refs.pageInput.value)); refs.pageInput?.addEventListener("keydown",event=>{if(event.key==="Enter")goToPage(refs.pageInput.value);}); refs.searchForm?.addEventListener("submit",searchPdf); refs.pages?.addEventListener("scroll",()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateCurrentPage);}); refs.fullscreen?.addEventListener("click",()=>{ if(document.fullscreenElement)document.exitFullscreen(); else refs.panel.requestFullscreen?.(); }); window.addEventListener("languagechange",renderAll);
updateZoomControls(); loadProjects();
