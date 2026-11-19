import {resolveIssueGeographies} from './geography.mjs';
// The reading layer requires authored narratives. It never generates local conclusions from labels or keywords.
export function validateReadingReport(r,framework){
 const ok=(v,m)=>{if(!v)throw Error(m)},text=x=>typeof x==='string'&&!!x.trim(),arr=Array.isArray;
 ok(arr(r.geographies)&&arr(r.reportViews)&&r.reportViews.length>0,'报告式输出需显式提供 geographies 和 reportViews；不得从卡片自动拼正文');
 ok(r.scopeLabel===undefined||text(r.scopeLabel),'scopeLabel 应为实际材料范围的非空文字');
 const geo=new Map(),views=new Map(),issues=new Set(r.issues.map(i=>i.id));
 const id=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_-]*$/.test(x);
 for(const g of r.geographies){ok(id(g.id)&&!geo.has(g.id)&&text(g.name)&&['operation','region','city'].includes(g.level),'地域标识、名称或层级无效');ok(g.parentId===null||id(g.parentId),'地域上级无效');geo.set(g.id,g);}
 for(const g of geo.values()){
  ok(g.level==='operation'?g.parentId===null:geo.has(g.parentId),'地域须有已登记上级，营运区为根');
  if(g.parentId!==null)ok(g.level==='region'?geo.get(g.parentId).level==='operation':['region','operation'].includes(geo.get(g.parentId).level),'地域须符合正式层级；未列片区的城市群可直接归属营运区');
 }
 const issueGeographies=resolveIssueGeographies(r);
 const referenced=new Set(),regionalReferenced=new Set();
 for(const v of r.reportViews){
  ok(id(v.id)&&!views.has(v.id)&&text(v.title)&&text(v.lead)&&arr(v.overview)&&arr(v.chapters)&&v.chapters.length===4,'报告视图缺少标题、整体判断或四章正文');
  ok(v.geographyId===null||geo.has(v.geographyId),'报告地域未登记');
  ok(v.status==='supported'||v.status==='insufficient','视图需说明 supported 或 insufficient');
  ok(![...views.values()].some(x=>x.geographyId===v.geographyId),'同一地域只能有一个报告视图');
  const allowed=new Map(framework.map((f,n)=>[f[0],new Set(r.categories[n].groups.flatMap(g=>g.issueIds))]));
  const point=(p,category)=>{
   ok(text(p.heading)&&text(p.text)&&arr(p.issueIds)&&p.issueIds.length>0&&new Set(p.issueIds).size===p.issueIds.length&&p.issueIds.every(x=>issues.has(x)),'正文判断须有完整文字并关联真实洞察');
   ok(!/[\r\n]/.test(p.heading+p.text),'正文 bullet 须连续成段，不在判断或解释内手动换行');
   ok(typeof p.focus==='boolean'&&(!p.focus||text(p.focusReason)&&p.focusBasis&&text(p.focusBasis.explanation)&&arr(p.focusBasis.evidenceIds)&&p.focusBasis.evidenceIds.length>0&&new Set(p.focusBasis.evidenceIds).size===p.focusBasis.evidenceIds.length&&p.focusBasis.evidenceIds.every(id=>r.evidence.some(e=>e.id===id))),'重点洞察须有本段解释依据和真实材料引用；不要求措施、反馈或剩余需求');
   if(p.focus){
    const linkedEvidence=new Set(p.issueIds.flatMap(id=>{const i=r.issues.find(x=>x.id===id);return [...(i.blocks||[]).flatMap(b=>b.evidenceIds||[]),...(i.subtopics||[]).flatMap(s=>[...(s.primaryEvidenceIds||[]),...(s.blocks||[]).flatMap(b=>b.evidenceIds||[])])];}));
    ok(p.focusBasis.evidenceIds.every(id=>linkedEvidence.has(id)),'星标材料须属于本段关联洞察的实际依据');
   }
   if(p.focus&&p.issueIds.length>1)ok(arr(p.focusBasis.issueIds)&&p.focusBasis.issueIds.length===p.issueIds.length&&new Set(p.focusBasis.issueIds).size===p.issueIds.length&&p.issueIds.every(id=>p.focusBasis.issueIds.includes(id)),'综合段落标星须检验本段全部相关问题的逻辑联系，不能继承单个地方洞察的星标');
   if(category){
    ok(p.issueIds.every(x=>allowed.get(category).has(x)),'正文判断链接的洞察必须属于对应章节');
    const group=r.categories.find(c=>c.id===category).groups.find(g=>g.id===p.groupId);
    ok(group&&p.issueIds.some(x=>group.issueIds.includes(x)),'章节 bullet 须明确主二级分类，至少一个关联洞察属于该分类');
    if(category==='needs'&&p.issueIds.length>1){
     const mentions=p.needMentions;
     ok(arr(mentions)&&mentions.length===p.issueIds.length&&new Set(mentions.map(m=>m.issueId)).size===p.issueIds.length&&new Set(mentions.map(m=>m.text)).size===p.issueIds.length&&p.issueIds.every(id=>mentions.some(m=>m.issueId===id&&text(m.text)&&(p.heading+' '+p.text).includes(m.text))),'合并需求正文须以 needMentions 逐项对应可见的具体子项，不得只留隐藏入口');
    }
   }
   if(v.geographyId!==null)for(const x of p.issueIds)ok(issueGeographies.get(x).includes(v.geographyId),'地域报告不得把未明确归属的上级或其他地区洞察当作当地依据');
   if(v.geographyId===null)p.issueIds.forEach(x=>referenced.add(x));
   else p.issueIds.forEach(x=>regionalReferenced.add(x));
  };
  v.overview.forEach(p=>point(p));
  v.chapters.forEach((c,n)=>{ok(c.categoryId===framework[n][0]&&text(c.lead)&&arr(c.items),'四章顺序及章级判断须明确');c.items.forEach(p=>point(p,c.categoryId));if(!c.items.length)ok(text(c.note),'空章节需说明材料范围');});
  if(v.status==='supported')ok(v.overview.length>0,'有依据的报告须有总体判断');
  else ok(v.overview.length===0&&v.chapters.every(c=>!c.items.length),'材料不足视图只能说明缺口，不能包含当地结论');
  views.set(v.id,v);
 }
 // Supported material must not disappear at an operation or regional selector.
 for(const g of geo.values())if(g.level!=='city'){
  const ids=[...issueGeographies].filter(([,gs])=>gs.includes(g.id)).map(([id])=>id);
  if(!ids.length)continue;
  const view=[...views.values()].find(v=>v.geographyId===g.id);
  ok(view?.status==='supported','有下级或来源范围材料时，须显式撰写对应片区／大群和营运区汇总报告：'+g.name);
  const linked=new Set(view.chapters.flatMap(c=>c.items.flatMap(p=>p.issueIds)));
  ok(ids.every(id=>linked.has(id)),'地域汇总报告不得遗漏该范围已形成的独立洞察：'+g.name);
 }
 ok([...views.values()].some(v=>v.geographyId===null),'必须有全范围综合报告');
 const global=[...views.values()].find(v=>v.geographyId===null),regionalIds=global.regionalIssueIds===undefined?[]:global.regionalIssueIds;
 ok(arr(regionalIds)&&new Set(regionalIds).size===regionalIds.length&&regionalIds.every(id=>issues.has(id)&&!referenced.has(id)&&regionalReferenced.has(id)),'regionalIssueIds 仅登记总体未展开、但在地域正文有明确入口的独立问题');
 ok([...issues].every(id=>referenced.has(id)||regionalIds.includes(id)),'独立洞察须在总体或已登记地域正文有可见入口，不得只藏在下钻库');
 for(const v of views.values())if(v.geographyId!==null)ok(v.regionalIssueIds===undefined,'regionalIssueIds 仅在总体视图登记地域独有问题');
 for(const i of r.issues)ok(i.geographyIds===undefined||arr(i.geographyIds)&&new Set(i.geographyIds).size===i.geographyIds.length&&i.geographyIds.every(x=>geo.has(x)),'洞察地域必须使用已登记的明确归属');
 ok(r.overviewItems===undefined,'新版总体判断维护在 reportViews.overview，不再另写 overviewItems');
 return r;
}

export function readingRuntime(data,renderReadingList){
 'use strict';
 const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const main=$('report-paper'),drawer=$('report-detail'),geo=new Map(data.geographies.map(g=>[g.id,g]));
 const op=$('op-select'),region=$('region-select'),city=$('city-select');
 let selected=null,focusOnly=false,returnFocus=null,currentView=null;
 const hidden=(id,value)=>{$(id).hidden=value;};
 function options(select,list,label){select.replaceChildren(new Option(label,''),...list.map(g=>new Option(g.name,g.id)));}
 options(op,data.geographies.filter(g=>g.level==='operation'),'全部地域');
 function pathLabel(id){const names=[];for(let g=geo.get(id);g;g=geo.get(g.parentId))names.unshift(g.name);return names.join(' › ');}
 function fallback(id){const city=geo.get(id).level==='city';return {id:'missing-'+id,title:geo.get(id).name,lead:city?'当前材料尚不足以形成该城市群的独立判断。':'当前材料尚不足以形成该地域的独立判断。',status:'insufficient',overview:[],chapters:data.framework.map(c=>({categoryId:c.id,lead:'尚无足够的独立地域材料。',items:[],note:'暂无可独立呈现的当地判断；上级或其他城市的结论不作为本地事实。'}))};}
 function copyPoint(p,key){
  data.interactions.copyEntries[key]={kind:'Report passage',issueId:p.issueIds[0],relatedIssueTitles:p.issueIds.map(id=>data.issues.find(i=>i.id===id).title),text:p.heading+'：'+p.text,reportScope:currentView.title+' · '+(selected?pathLabel(selected):'全部地域 · '+data.scopeLabel),source: p.issueIds.map(id=>data.issues.find(i=>i.id===id).scope).join('；')};
  return `<button type="button" class="copy-icon report-copy" data-copy-key="${key}" aria-label="复制报告判断及上下文" title="复制报告判断及上下文">${data.interactions.copyIcon}</button>`;
 }
 function list(items,key,groups=[]){
  const visible=items.filter(p=>!focusOnly||p.focus);
  return visible.length?renderReadingList(visible,groups,(p,n)=>copyPoint(p,'report-'+key+'-'+n),key,data.focusExplanation):'';
 }
 let observer;
 function render(){
  currentView=data.views.find(v=>v.geographyId===selected)||(selected?fallback(selected):data.views.find(v=>v.geographyId===null));
  // Old point keys must not outlive a view change and point at a different report scope.
  for(const key of Object.keys(data.interactions.copyEntries))if(key.startsWith('report-'))delete data.interactions.copyEntries[key];
  const view=currentView;
  const hasFocus=view.overview.some(p=>p.focus)||view.chapters.some(c=>c.items.some(p=>p.focus));
  main.innerHTML=`<section id="report-top" class="report-opening"><p class="report-eyebrow">${escape(selected?pathLabel(selected):'综合报告 · '+data.scopeLabel)}</p><h2>${escape(view.title)}</h2><p class="overall-lead">${escape(view.lead)}</p>${focusOnly&&!hasFocus?'<p class="scope-note">'+escape(data.focusEmpty)+'</p>':view.status==='insufficient'?'<p class="scope-note">材料覆盖不足</p>':list(view.overview,view.id+'-overview')}</section>`+view.chapters.map((c,n)=>{
   if(focusOnly&&!c.items.some(p=>p.focus))return '';
   return `<section class="report-chapter" id="chapter-${c.categoryId}" data-print-title="${escape(data.framework[n].name)}"><h2><span>0${n+1}</span>${escape(data.framework[n].name)}</h2><p class="chapter-lead">${escape(c.lead)}</p>${c.items.length?list(c.items,view.id+'-'+c.categoryId,data.framework[n].groups):'<p class="scope-note">'+escape(c.note)+'</p>'}${c.categoryId==='needs'?'<button type="button" class="assessment-link" data-open-assessment>查看供需评估 ↗</button>':''}</section>`;
  }).join('');
  $('scope-name').textContent=selected?pathLabel(selected):'全部地域 · 综合报告';
  $('scope-status').textContent=focusOnly?'仅看 ★ 重点洞察':'全部洞察';
  $('filter-all').setAttribute('aria-pressed',String(!focusOnly));$('filter-focus').setAttribute('aria-pressed',String(focusOnly));
  $('reset-filters').disabled=!selected&&!focusOnly;
  document.querySelectorAll('#assessment tbody tr').forEach(row=>{row.hidden=!!selected&&!data.issues.find(i=>i.id===row.dataset.issue)?.geographyIds?.includes(selected);});
  const shown=[...document.querySelectorAll('#assessment tbody tr')].filter(r=>!r.hidden).length;
  $('assessment-empty').hidden=shown>0;$('assessment-table-wrap').hidden=shown===0;
  $('assessment-scope').textContent='当前地域范围：'+(selected?pathLabel(selected):'综合报告')+' · 保留该范围全部具体需求';
  document.querySelectorAll('.report-toc a').forEach((a,n)=>{a.hidden=!main.querySelector(a.hash);n===0?a.setAttribute('aria-current','location'):a.removeAttribute('aria-current');});
  observer?.disconnect();
  if('IntersectionObserver' in window){observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)document.querySelectorAll('.report-toc a').forEach(a=>a.hash==='#'+e.target.id?a.setAttribute('aria-current','location'):a.removeAttribute('aria-current'));},{rootMargin:'-120px 0px -65% 0px'});main.querySelectorAll('.report-opening,.report-chapter').forEach(s=>observer.observe(s));}
 }
 function changed(){selected=city.value||region.value||op.value||null;render();}
 op.addEventListener('change',()=>{const regions=data.geographies.filter(g=>g.parentId===op.value&&g.level==='region'),directCities=data.geographies.filter(g=>g.parentId===op.value&&g.level==='city');options(region,regions,'全部片区／大群');options(city,directCities,'全部城市群');hidden('region-level',!op.value||!regions.length);hidden('city-level',!directCities.length);changed();});
 region.addEventListener('change',()=>{const cities=data.geographies.filter(g=>g.parentId===(region.value||op.value)&&g.level==='city');options(city,cities,'全部城市群');hidden('city-level',!cities.length);changed();});
 city.addEventListener('change',changed);
 $('filter-all').addEventListener('click',()=>{focusOnly=false;render();});$('filter-focus').addEventListener('click',()=>{focusOnly=true;render();});
 $('reset-filters').addEventListener('click',()=>{op.value='';options(region,[],'全部片区／大群');options(city,[],'全部城市群');hidden('region-level',true);hidden('city-level',true);selected=null;focusOnly=false;render();});
 function showRelated(ids,label,brief,origin){
  returnFocus=origin||document.activeElement;
  const chosen=new Set(ids);let count=0;
  drawer.querySelectorAll('.insight').forEach(i=>{i.hidden=!chosen.has(i.dataset.issue);i.open=false;if(!i.hidden)count++;i.querySelectorAll('details').forEach(d=>d.open=false);});
  if(!count)return;
  $('detail-title').textContent=label||'相关洞察';$('detail-context').textContent=currentView.title+' · '+count+' 条相关洞察';$('related-brief').textContent=brief||'';
  if(!drawer.open)drawer.showModal();drawer.scrollTop=0;
 }
 main.addEventListener('click',e=>{const button=e.target.closest('[data-issues]');if(button)showRelated(button.dataset.issues.split(','),button.dataset.context,button.dataset.support,button);if(e.target.closest('[data-open-assessment]'))$('assessment').showModal();});
 document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
 document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}));
 drawer.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
 $('assessment-trigger').addEventListener('click',()=>$('assessment').showModal());
 $('sources-trigger').addEventListener('click',()=>$('sources').showModal());$('print-report').addEventListener('click',()=>window.print());
 window.jumpTo=(id)=>showRelated([id],data.issues.find(i=>i.id===id)?.title,'',document.activeElement);
 window.openDialog=id=>$(id).showModal();window.closeDialog=id=>$(id).close();
 render();
 window.__reportReading={getState:()=>({geographyId:selected,focusOnly,viewId:currentView.id}),showRelated};
}
