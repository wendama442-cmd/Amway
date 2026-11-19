function insightInteractions(data) {
  'use strict';
  const items=new Map(data.content.map(x=>[x.id,x]));
  const status=document.getElementById('ix-status'),manual=document.getElementById('ix-manual'),selectionButton=document.getElementById('ix-selection');
  const checkIcon='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
  const names={'Report passage':'报告正文',Insight:'核心判断', 'Sub-insight':'子判断', Reasoning:'推理说明', Evidence:'访谈依据', 'Follow-up':'追问', 'Suggested action':'动作建议', Selection:'选中文字'};
  let timer,lastButton=null,selected=null;
  function formatEntry(entry){
    const item=items.get(entry.issueId),m=data.meta[entry.contextKey];
    const lines=['报告：'+document.title,'所属判断：'+item.title];
    if(entry.reportScope)lines.push('报告地域范围：'+entry.reportScope);
    if(entry.relatedIssueTitles?.length)lines.push('相关洞察：'+entry.relatedIssueTitles.join('；'));
    if(m?.subInsight)lines.push('对应子判断：'+m.subInsight);
    lines.push('内容类型：'+(names[entry.kind]||entry.kind));
    if(entry.kind==='Evidence'){
      lines.push('','访谈原文：',entry.text,'来源与定位：'+entry.source);
    }else if(entry.kind==='Follow-up'){
      lines.push('','当前讨论的内容：'+m.text);
      if(m.provenance)lines.push('推理来源：'+m.provenance,'来源与验证边界：'+m.provenanceNote);
      if(m.suggestedAction)lines.push('可尝试的动作（分析建议，供小范围检验）：'+m.suggestedAction);
    }else{
      lines.push('',entry.kind==='Selection'?'选中的内容：'+entry.text:'当前内容：'+entry.text);
      if(entry.kind==='Suggested action')lines.push('该动作是根据材料提出的分析建议，供小范围尝试和检验，不代表已验证方案。');
      if(entry.kind==='Reasoning'&&m?.provenance)lines.push('推理来源：'+m.provenance,'来源与验证边界：'+m.provenanceNote);
      if(entry.source)lines.push('来源与定位：'+entry.source);
    }
    lines.push('','我的问题：'+(entry.question||''),'','原始材料（后续回答前请回查相关上下文）：'+Object.values(data.sources).join('；'),'回答要求：重新访问相关原始材料，不只依赖HTML或其摘录；区分材料事实、受访者解释、分析推断与建议。建议问题不代表已有答案。若原始材料不可访问，请明确回答范围和缺失信息；材料未说明处不补造。');
    return lines.join('\n');
  }
  function position(node,rect){
    node.style.left=Math.max(8,Math.min(rect.left,innerWidth-node.offsetWidth-8))+'px';
    node.style.top=Math.max(8,Math.min(rect.bottom+6,innerHeight-node.offsetHeight-8))+'px';
  }
  function resetButton(){
    if(!lastButton)return;
    lastButton.innerHTML=data.copyIcon;lastButton.classList.remove('is-copied');
    lastButton.setAttribute('aria-label',lastButton.dataset.originalLabel);lastButton.title=lastButton.dataset.originalLabel;lastButton=null;
  }
  function fallbackCopy(text,host){
    const temporary=document.createElement('textarea'),active=document.activeElement;
    temporary.value=text;temporary.readOnly=true;temporary.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0';(host.closest('dialog[open]')||document.body).append(temporary);
    try{temporary.focus({preventScroll:true});temporary.select();temporary.setSelectionRange(0,text.length);return document.execCommand('copy')===true;}catch{return false;}finally{temporary.remove();active?.focus?.({preventScroll:true});}
  }
  async function copy(entry,host){
    const text=formatEntry(entry),rect=host.getBoundingClientRect();clearTimeout(timer);resetButton();status.hidden=true;selectionButton.hidden=true;
    let ok=false;
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);ok=true;}}catch{}
    if(!ok)ok=fallbackCopy(text,host);
    if(ok){
      if(!host.dataset.originalLabel)host.dataset.originalLabel=host.getAttribute('aria-label')||host.title;
      host.innerHTML=checkIcon;host.classList.add('is-copied');host.setAttribute('aria-label','已复制');host.title='已复制';lastButton=host;
      (host.closest('dialog[open]')||document.body).append(status);status.textContent='✓ 已复制';status.hidden=false;position(status,rect);
      timer=setTimeout(()=>{status.hidden=true;resetButton();},3000);
    }else{
      const t=manual.querySelector('textarea');t.value=text;if(!manual.open)manual.showModal();t.focus();t.select();t.setSelectionRange(0,text.length);
    }
    return ok;
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest('button[data-copy-key]');if(!button)return;
    event.preventDefault();event.stopPropagation();const entry=data.copyEntries[button.dataset.copyKey];if(!entry)return;
    button.disabled=true;try{await copy(entry,button);}finally{button.disabled=false;}
  });
  document.addEventListener('submit',async event=>{
    const form=event.target;if(!form.matches('.custom-followup'))return;event.preventDefault();
    const input=form.querySelector('textarea'),question=input.value.trim(),feedback=form.querySelector('.custom-feedback');
    if(!question){feedback.textContent='请先写下你想追问的问题。';input.focus();return;}
    const row=form.closest('[data-context]'),issue=row.closest('.insight'),button=form.querySelector('.copy-icon');
    const entry={kind:'Follow-up',issueId:issue.dataset.issue,contextKey:row.dataset.context,question};button.disabled=true;feedback.textContent='';
    try{const ok=await copy(entry,button);feedback.textContent=ok?(data.meta[row.dataset.context]?.subInsight?'✓ 已复制，已带上当前子判断和上下文。':'✓ 已复制，已带上当前判断和上下文。'):'请在弹窗中手动复制。';}finally{button.disabled=false;}
  });
  document.addEventListener('input',event=>{const form=event.target.closest('.custom-followup');if(form)form.querySelector('.custom-feedback').textContent='';});
  manual.querySelector('.close').addEventListener('click',()=>manual.close());
  manual.querySelector('.manual-select').addEventListener('click',()=>{const t=manual.querySelector('textarea');t.focus();t.select();t.setSelectionRange(0,t.value.length);});
  const owner=node=>(node?.nodeType===1?node:node?.parentElement)?.closest('[data-copy-selection]');
  document.addEventListener('selectionchange',()=>{
    selectionButton.hidden=true;selected=null;const sel=window.getSelection();
    if(!sel||sel.isCollapsed||!sel.rangeCount||manual.open)return;
    const a=owner(sel.anchorNode),b=owner(sel.focusNode),text=sel.toString().trim();if(!a||a!==b||!text)return;
    const base=data.copyEntries[a.dataset.copySelection];if(!base)return;
    selected={...base,kind:'Selection',text,question:undefined};const rect=sel.getRangeAt(0).getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return;
    (a.closest('dialog[open]')||document.body).append(selectionButton);selectionButton.hidden=false;position(selectionButton,rect);
  });
  selectionButton.addEventListener('mousedown',e=>e.preventDefault());
  selectionButton.addEventListener('click',async event=>{event.preventDefault();const entry=selected;if(entry)await copy(entry,selectionButton);selectionButton.hidden=true;});
  document.addEventListener('scroll',()=>{selectionButton.hidden=true;},true);
  window.addEventListener('resize',()=>{selectionButton.hidden=true;status.hidden=true;});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')selectionButton.hidden=true;});
  window.__insightInteraction={data,copy,formatEntry};
}

function readingContext() {
  const bar=document.getElementById('reading-context');
  const insightText=bar.querySelector('.context-insight-title'),subText=bar.querySelector('.context-sub-title'),subLine=bar.querySelector('.context-sub'),button=bar.querySelector('.context-back');
  let scheduled=false,target=null;
  function update(){
    scheduled=false;
    if(document.querySelector('dialog[open]')){bar.hidden=true;target=null;return;}
    const rows=[...document.querySelectorAll('.drill-sub[open]')];
    const row=rows.find(r=>r.getClientRects().length&&r.getBoundingClientRect().top<=82&&r.getBoundingClientRect().bottom>92);
    const issue=row?.closest('.insight')||[...document.querySelectorAll('.insight[open]')].find(i=>i.getClientRects().length&&i.getBoundingClientRect().top<0&&i.getBoundingClientRect().bottom>92);
    if(!issue){bar.hidden=true;target=null;return;}
    const rootHeader=issue.querySelector(':scope>summary'),subHeader=row?.querySelector(':scope>summary');
    if(rootHeader.getBoundingClientRect().bottom>0&&(!subHeader||subHeader.getBoundingClientRect().bottom>0)){bar.hidden=true;target=null;return;}
    const a=issue.querySelector('.insight-heading').textContent.trim(),b=row?.querySelector('.sub-heading').textContent.trim()||'';
    if(insightText.textContent!==a){insightText.textContent=a;insightText.title=a;}
    if(subText.textContent!==b){subText.textContent=b;subText.title=b;}
    subLine.hidden=!b;button.textContent=b?'回到当前子判断 ↑':'回到当前判断 ↑';target=subHeader||rootHeader;bar.hidden=false;
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  button.addEventListener('click',()=>{const header=target;if(!header)return;header.scrollIntoView({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});header.focus({preventScroll:true});});
  document.addEventListener('scroll',schedule,{capture:true,passive:true});
  document.addEventListener('toggle',schedule,true);window.addEventListener('resize',schedule);
  // A narrow, non-interrupting context cue; report contents and expansion states remain intact.
  window.__readingContext={update};update();
}
