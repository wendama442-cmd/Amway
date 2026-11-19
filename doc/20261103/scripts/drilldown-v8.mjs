// Rendering contract shared by the generator and its tests. No model or browser dependency.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const origins={material:'材料归纳',respondent:'访谈直接解释',inference:'分析推导',mixed:'材料解释＋分析推导',unknown:'待验证解释'};
export const COPY_ICON='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';
export function topicEvidenceIds(topic,byCase,hypotheses=[]){return [...new Set(topic.blocks.flatMap(b=>b.evidenceIds).concat((topic.caseIds||[]).flatMap(id=>byCase.get(id).evidenceIds),(topic.hypothesisIndexes||[]).flatMap(n=>hypotheses[n]?.evidenceIds||[])))];}
// Catch exact stock questions and repeated pairs; semantic specificity still needs business review.
const questionKey=q=>q.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
const stockQuestions=new Set(['哪些市场已经出现变化','如果做小范围验证应该观察什么','这个判断还需要哪些数据支持','哪些人群适合这一做法','下一步应该如何验证','对此你有什么想法','还有哪些可能性','我们还能做些什么','哪些经验值得借鉴','你认为应该怎么办'].map(questionKey));
const asksForEvidence=q=>/^(?:请问|请)?(?:这个判断的依据是什么|原文说了什么|原始访谈是怎么说的|有哪些材料支持|有哪些证据支持|为什么会形成这个结论)(?:呢|吗)?$/.test(questionKey(q));
export function validateDrilldown(r){
 const ok=(v,m)=>{if(!v)throw Error(m)},text=s=>typeof s==='string'&&!!s.trim(),list=Array.isArray;
 ok(r.experience==='report-reading-v6','报告需使用 experience:"report-reading-v6"；按当前渲染协议补齐子判断、证据对应和追问');
 const byCase=new Map(r.cases.map(c=>[c.id,c])),byEvidence=new Map(r.evidence.map(e=>[e.id,e])),questionPairs=new Set();
 for(const issue of r.issues){
  ok(issue.subtopics.length>0,'每条Insight至少需要一个实际分析分支；仅多分支才显示Sub-insight');
  const assigned=new Set(),coveredEvidence=new Set(),coveredHypotheses=new Set();
  for(const topic of issue.subtopics){
   ok(list(topic.caseIds)&&new Set(topic.caseIds).size===topic.caseIds.length&&topic.caseIds.every(id=>issue.caseLinks.some(l=>l.caseId===id)),'子判断案例必须属于该Insight的caseLinks，不可悬空或重复');
   for(const id of topic.caseIds){ok(!assigned.has(id),'同一Insight中的案例需归属一个明确分析分支，不能重复下挂');assigned.add(id);}
   ok(origins[topic.reasoningOrigin]&&text(topic.reasoningNote),'子判断需显式说明推理来源与具体边界，不打置信分数');
   ok(topic.hypothesisIndexes===undefined||list(topic.hypothesisIndexes),'假设索引无效');
   for(const n of topic.hypothesisIndexes||[]){ok(Number.isInteger(n)&&n>=0&&n<issue.hypotheses.length&&!coveredHypotheses.has(n),'假设需唯一放到相关分析分支的Reasoning中');coveredHypotheses.add(n);}
   const ids=topicEvidenceIds(topic,byCase,issue.hypotheses);ids.forEach(id=>coveredEvidence.add(id));
   ok(list(topic.primaryEvidenceIds)&&topic.primaryEvidenceIds.length===Math.min(2,ids.length)&&new Set(topic.primaryEvidenceIds).size===topic.primaryEvidenceIds.length&&topic.primaryEvidenceIds.every(id=>ids.includes(id)),'默认依据必须从本子判断支持材料中明确选择最相关的两条；不足两条保留实际数量');
   ok(list(topic.followupQuestions)&&topic.followupQuestions.length===2&&topic.followupQuestions.every(q=>text(q)&&questionKey(q))&&new Set(topic.followupQuestions.map(questionKey)).size===2,'每个分析分支需有两个不同且具体的探索问题');
   ok(!topic.followupQuestions.some(asksForEvidence),'追问应探索增量问题，判断依据应在报告中直接提供');
   ok(!topic.followupQuestions.some(q=>stockQuestions.has(questionKey(q))),'追问不能使用脱离内容的通用模板');
   const pair=JSON.stringify(topic.followupQuestions.map(questionKey).sort());
   ok(!questionPairs.has(pair),'不能把同一组追问批量用于多个分析分支');questionPairs.add(pair);
   if(topic.suggestedAction!==undefined){
    const a=topic.suggestedAction;ok(a&&text(a.text)&&text(a.basis)&&text(a.check),'动作建议需有具体尝试、材料理由和观察点，不是已验证方案');
    ok(list(a.evidenceIds)&&a.evidenceIds.length>0&&new Set(a.evidenceIds).size===a.evidenceIds.length&&a.evidenceIds.every(id=>ids.includes(id)&&byEvidence.has(id)),'动作建议必须引用本子判断已有材料');
   }
  }
  ok(issue.caseLinks.every(l=>assigned.has(l.caseId)),'每个案例需关联到具体子判断，不能放在Insight的混合依据池中');
  ok(issue.blocks.flatMap(b=>b.evidenceIds).every(id=>coveredEvidence.has(id)),'Insight总述引用的材料需落到相应子判断，不能出现无法下钻的引用');
  ok(coveredHypotheses.size===issue.hypotheses.length,'每个假设需通过hypothesisIndexes放到相关子判断的Reasoning中');
 }
 return r;
}
export function createDrilldown(r){
 const issues=new Map(r.issues.map(x=>[x.id,x])),cases=new Map(r.cases.map(x=>[x.id,x])),sources=new Map(r.sources.map(x=>[x.id,x])),evidence=new Map(r.evidence.map(x=>[x.id,x]));
 const data={content:r.issues.map(i=>({id:i.id,title:i.title})),sources:Object.fromEntries(r.sources.map(s=>[s.id,s.name])),meta:{},copyEntries:{},copyIcon:COPY_ICON};let serial=0;
 const register=(entry,label,submit=false)=>{const key='copy-'+(++serial);data.copyEntries[key]=entry;return {key,html:`<button type="${submit?'submit':'button'}" class="copy-icon${submit?' custom-copy':''}"${submit?'':` data-copy-key="${key}"`} aria-label="${esc(label)}" title="${esc(label)}">${COPY_ICON}</button>`};};
 const metaKey=(issueId,index)=>'context-'+issueId+'-'+index;
 function point(text,issueId){const copy=register({kind:'Insight',issueId,text},'复制此判断内容');return `<div class="copy-block overview-point"><p data-copy-selection="${copy.key}">${esc(text)}</p>${copy.html}</div>`;}
 function evidenceCard(id,issueId,contextKey){
  const e=evidence.get(id),source=sources.get(e.sourceId).name+' · '+e.location,excerpt=e.excerpt.replace(/\s*\r?\n\s*/g,' ').trim();
  const copy=register({kind:'Evidence',issueId,contextKey,text:excerpt,source},'复制此条访谈依据及来源');
  return `<article class="evidence-quote copy-block" data-evidence-id="${esc(id)}"><blockquote class="spoken-quote" data-copy-selection="${copy.key}">${esc(excerpt)}</blockquote><p class="small">${esc(source)}</p>${copy.html}</article>`;
 }
 function evidenceCards(ids,issueId,contextKey){return `<div class="evidence-grid" data-columns="2">${[...new Set(ids)].map(id=>evidenceCard(id,issueId,contextKey)).join('')}</div>`;}
 // Case and hypothesis metadata never create visible modules. Relevant analysis belongs in topic.blocks.
 function issueView(id,a,b,needTagHtml){
  const issue=issues.get(id),nested=issue.subtopics.length>1,rootCopy=register({kind:'Insight',issueId:id,text:issue.summary},'复制此Insight及解释');
  const branches=issue.subtopics.map((topic,index)=>{
   const key=metaKey(id,index),text=topic.blocks.map(b=>b.text).join('\n\n'),action=topic.suggestedAction,visibleTitle=nested?topic.title:issue.title;
   data.meta[key]={title:issue.title,...(nested?{subInsight:topic.title}:{}),issueId:id,text,provenance:origins[topic.reasoningOrigin],provenanceNote:topic.reasoningNote};
   if(action)data.meta[key].suggestedAction=action.text+' 观察：'+action.check;
   const subCopy=nested?register({kind:'Sub-insight',issueId:id,contextKey:key,text:topic.title},'复制此Sub-insight'):null,reasonCopy=register({kind:'Reasoning',issueId:id,contextKey:key,text},'复制此Reasoning');
   const ids=topicEvidenceIds(topic,cases,issue.hypotheses),rest=ids.filter(id=>!topic.primaryEvidenceIds.includes(id));
   const quotations=ids.length?evidenceCards(topic.primaryEvidenceIds,id,key)+(rest.length?`<details class="evidence-more"><summary><span class="when-closed">展开全部依据</span><span class="when-open">收起补充依据</span><span class="more-count">另有 ${rest.length} 条</span><span class="more-chevron" aria-hidden="true">⌄</span></summary>${evidenceCards(rest,id,key)}</details>`:''):'<p class="evidence-missing">本次材料未提供可直接支持这一解释的证据，需按上述具体缺口验证。</p>';
   let actionHtml='';if(action){const copy=register({kind:'Suggested action',issueId:id,contextKey:key,text:data.meta[key].suggestedAction},'复制此动作建议及当前上下文');actionHtml=`<p class="suggested-action copy-block" data-copy-selection="${copy.key}" title="${esc(action.basis)}"><strong>可尝试的动作：</strong>${esc(action.text)} <span>观察：${esc(action.check)}</span>${copy.html}</p>`;}
   const questions=topic.followupQuestions.map(q=>{const copy=register({kind:'Follow-up',issueId:id,contextKey:key,question:q},'复制此问题及当前上下文');return `<li class="followup-example copy-block"><span class="followup-question-text" data-copy-selection="${copy.key}">${esc(q)}</span>${copy.html}</li>`;}).join('');
   const custom=register({kind:'Follow-up',issueId:id,contextKey:key},'复制自定义问题及当前上下文',true),input='custom-'+a+'-'+b+'-'+id+'-'+index;
   const workspace=`<div class="drill-workspace stage-branches"><section class="reason-panel stage-node copy-block text-copy-block"><div class="reasoning-label stage-heading"><span class="level-tag reasoning-tag">Reasoning</span><span class="stage-caption">判断逻辑</span><span class="provenance-tag" tabindex="0" title="${esc(topic.reasoningNote)}" aria-label="${esc(origins[topic.reasoningOrigin]+'：'+topic.reasoningNote)}">${esc(origins[topic.reasoningOrigin])}</span></div><div class="reason-copy-text" data-copy-selection="${reasonCopy.key}">${topic.blocks.map(block=>`<p class="copy-point">${esc(block.text)}</p>`).join('')}</div>${reasonCopy.html}</section><section class="evidence-panel stage-node" aria-label="${esc(visibleTitle)}的访谈依据"><div class="column-label stage-heading"><span class="level-tag evidence-tag">Evidence</span><span>对应访谈依据</span></div>${quotations}</section><section class="follow-panel vertical-followup stage-node"><div class="next-label stage-heading"><span class="level-tag follow-tag">Follow-up</span><span>下一步探索</span></div>${actionHtml}<ul class="followup-list">${questions}<li class="followup-custom"><form class="custom-followup copy-block"><label for="${input}">自定义提问</label><textarea id="${input}" aria-label="围绕${esc(visibleTitle)}的自定义追问" rows="1" required placeholder="我想进一步了解……"></textarea>${custom.html}<span class="custom-feedback" role="status" aria-live="polite"></span></form></li></ul></section></div>`;
   return nested?`<details class="sub-insight drill-sub" id="sub-${a}-${b}-${id}-${index}" data-context="${key}"><summary class="sub-summary copy-block"><span class="level-tag sub-tag">Sub-insight</span><span class="sub-heading" data-copy-selection="${subCopy.key}">${esc(topic.title)}</span><span class="drill-action"><span class="chevron" aria-hidden="true">⌄</span></span>${subCopy.html}</summary><div class="drill-detail">${workspace}</div></details>`:`<div class="direct-analysis" data-context="${key}">${workspace}</div>`;
  }).join('');
  return `<details class="insight" id="issue-${a}-${b}-${id}" data-issue="${id}" data-category="${a}" data-group="${b}"><summary class="copy-block insight-copy-block"><span class="insight-title-row"><span class="level-tag insight-tag">Insight</span><span class="insight-heading">${esc(issue.title)}</span>${needTagHtml}</span><span class="insight-scope" style="display:block;font-size:12px;line-height:1.65;color:#526275;margin-top:6px">相关反馈：${esc(issue.scope)}</span><span class="insight-summary" data-copy-selection="${rootCopy.key}">${esc(issue.summary)}</span>${rootCopy.html}</summary><div class="insight-flow drill-flow">${nested?'<div class="sub-branches">'+branches+'</div>':branches}</div></details>`;
 }
 function chrome(){return `<button id="ix-selection" class="copy-icon selection-icon" type="button" aria-label="复制选中文字及当前上下文" title="复制选中文字及当前上下文" hidden>${COPY_ICON}</button><div id="ix-status" role="status" aria-live="polite" hidden></div><dialog id="ix-manual" aria-labelledby="ix-manual-title"><div class="dialog-head"><h2 id="ix-manual-title">复制到原 Chat</h2><button type="button" class="close" aria-label="关闭复制窗口">×</button></div><div class="dialog-body"><p>自动复制未成功，内容已全选。请按 Ctrl+C（Mac：⌘C），回到原 Chat 粘贴。</p><textarea readonly aria-label="待复制的追问内容"></textarea><button type="button" class="manual-select">重新全选</button></div></dialog><div id="reading-context" role="region" aria-label="当前阅读位置" hidden><div class="reading-context-text"><div class="context-insight"><span>Insight</span><span class="context-insight-title"></span></div><div class="context-sub" hidden><span>Sub-insight</span><span class="context-sub-title"></span></div></div><button type="button" class="context-back">回到当前子判断 ↑</button></div>`;}
 return {data,point,evidenceCards,issue:issueView,chrome};
}
