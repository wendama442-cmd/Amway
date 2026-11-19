import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {FRAMEWORK,validateCoreReport as validateReport,renderHtml as renderReadingHtml} from './render-report.mjs';
// Build explicit fictional report prose for rendering tests; production never infers it from cards.
const renderHtml=report=>{const r=structuredClone(report);r.geographies=[];r.reportViews=[{id:'all',geographyId:null,title:'工程报告（虚构）',lead:r.summary,status:'supported',overview:r.overviewItems.map(x=>({heading:x.title,text:x.text,issueIds:[x.issueId],focus:false})),chapters:r.categories.map((c,n)=>({categoryId:c.id,lead:'工程样例章节，内容仅用于测试',items:[...new Set(c.groups.flatMap(g=>g.issueIds))].map(id=>{const i=r.issues.find(i=>i.id===id);return {heading:i.title,text:i.summary,groupId:c.groups.find(g=>g.issueIds.includes(id)).id,issueIds:[id],focus:false};}),note:'本工程样例未覆盖此章'}))}];delete r.overviewItems;return renderReadingHtml(r);};
import {createDrilldown} from './drilldown-v8.mjs';

// Fictional engineering fixture. Never use its business statements as report evidence.
export function fixture(){
 const topic={title:'练习后能否独立完成邀请仍待观察',blocks:[{kind:'inference',text:'示范带练提供练习机会，尚不能证明持续独立邀请。',evidenceIds:['e1']}],reasoningOrigin:'inference',reasoningNote:'材料只有一次练习反馈，没有持续经营结果。',primaryEvidenceIds:['e1'],caseIds:[],hypothesisIndexes:[],followupQuestions:['首次邀请和产品讲述中，哪一段更适合让伙伴轮流示范，减少对组织者的依赖？','回看一次真实邀请，伙伴在哪个动作还需要提示，从而决定下次带练重点？']};
 return {format:'amway-insight-v4',layout:'report-1027',experience:'report-reading-v6',title:'工程测试（虚构）',summary:'仅用于验证渲染',reportDate:'',reportDateKind:'unknown',sources:[{id:'s1',name:'测试材料.txt',role:'interview'}],evidence:[{id:'e1',sourceId:'s1',point:'练习后有三人能够独立讲述',excerpt:'练习后有三人能够独立讲述，但没有持续邀请记录。',location:'测试段落P1'}],cases:[],issues:[{id:'i1',kind:'judgment',managementImplication:'持续经营结果仍需核对',title:'有了练习机会，仍需观察能否独立邀请',summary:'材料反映一次练习后的变化，尚未证明持续经营结果。',scope:'仅用于工程验证',needTags:['common'],blocks:structuredClone(topic.blocks),subtopics:[topic],caseLinks:[],hypotheses:[]}],categories:FRAMEWORK.map(f=>({id:f[0],groups:f[3].map((g,k)=>({id:g[0],issueIds:k===0?['i1']:[],note:'未覆盖'}))})),overviewItems:[{title:'练习与迁移',text:'工程测试，不是业务输出',issueId:'i1'}],supplyAssessment:[]};
}
const rejects=mutations=>{for(const change of mutations){const r=fixture();change(r);assert.throws(()=>validateReport(r));}};
const scripts=h=>[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);

test('reading report output preserves framework, unique IDs and script-safe quoted content',async()=>{
 const r=fixture();r.sources[0].name='<script>file</script>.txt';r.evidence[0].excerpt='</script><script>alert("test")</script> & 原文\u2028新行';r.issues[0].subtopics[0].blocks[0].text='<img src=x onerror=alert(1)>';
 const h=await renderHtml(r);
 assert(h.includes('&lt;/script&gt;&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt; &amp; 原文'));
 assert(h.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert(!h.includes('<script>alert("test")</script>'));
 assert(!/(?:src|href)=["']https?:\/\//.test(h));
 const dom=h.replace(/<script>[\s\S]*?<\/script>/g,'');
 const ids=[...dom.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 assert([...dom.matchAll(/aria-controls="([^"]+)"/g)].every(m=>ids.includes(m[1])));
 assert.equal(scripts(h).length,2);scripts(h).forEach(s=>new vm.Script(s));
 for(const f of FRAMEWORK)assert(h.includes(`data-print-title="${f[1]}"`));
 assert(h.includes('id="reading-context"'));assert(h.includes('id="ix-manual"'));
});

test('rejects legacy schemas, invented provenance, dangling links and unsupported dates',()=>rejects([
 r=>delete r.experience,r=>r.layout='issue-chain-v1',r=>r.evidence[0].sourceId='missing',r=>r.sources[0].role='example',r=>r.evidence[0].location='',r=>r.categories[0].groups[0].issueIds=['missing'],r=>r.categories[2].groups.reverse(),r=>r.issues[0].subtopics[0].blocks[0].evidenceIds=['missing'],r=>r.reportDate='2026-10-15',r=>r.reportDateKind='meeting',r=>{r.reportDateKind='material';r.reportDate='  ';},r=>r.issues.push(structuredClone(r.issues[0]))
]));

test('explicit default evidence selection cannot leak another sub-insight or drop root references',()=>{
 rejects([r=>r.issues[0].subtopics=[],r=>r.issues[0].subtopics[0].primaryEvidenceIds=[],r=>r.issues[0].subtopics[0].primaryEvidenceIds=['missing'],r=>r.issues[0].subtopics[0].reasoningOrigin='confident',r=>r.issues[0].subtopics[0].reasoningNote='',r=>{r.evidence.push({...r.evidence[0],id:'e2'});r.issues[0].blocks[0].evidenceIds.push('e2');}]);
 const r=fixture();r.evidence=Array.from({length:5},(_,n)=>({...r.evidence[0],id:'e'+(n+1),excerpt:'虚构摘录'+(n+1)}));
 r.issues[0].subtopics[0].blocks[0].evidenceIds=r.evidence.map(e=>e.id);r.issues[0].subtopics[0].primaryEvidenceIds=['e4','e2'];
 const ui=createDrilldown(validateReport(r)),h=ui.issue('i1',0,0,'');
 const [shown,more]=h.split('<details class="evidence-more">');
 assert.deepEqual([...shown.matchAll(/data-evidence-id="([^"]+)"/g)].map(m=>m[1]),['e4','e2']);
 assert.deepEqual([...more.matchAll(/data-evidence-id="([^"]+)"/g)].map(m=>m[1]),['e1','e3','e5']);
 assert(!more.startsWith(' open'));assert(h.includes('data-columns="2"'));
});

test('an explicit unsupported hypothesis needs no fabricated quote; single citations remain valid',async()=>{
 const r=fixture(),t=r.issues[0].subtopics[0];
 r.issues[0].hypotheses=[{title:'轮流带练能否持续',origin:'additional',paragraphs:['需要验证组织条件'],evidenceIds:[]}];t.hypothesisIndexes=[0];
 t.blocks.push({kind:'unknown',text:'分析者补充的待验证解释：轮流带练可能减少组织者投入，但组织条件尚不清楚。',evidenceIds:[]});
 assert.equal(validateReport(r),r);const h=await renderHtml(r);assert(h.includes(t.blocks[1].text));assert(!h.includes('class="report-hypothesis"'));
 const broken=structuredClone(r);broken.issues[0].subtopics[0].hypothesisIndexes=[];assert.throws(()=>validateReport(broken));
 broken.issues[0].subtopics[0].hypothesisIndexes=[0,0];assert.throws(()=>validateReport(broken));
 const unknown=fixture();unknown.issues[0].blocks=[{kind:'inference',text:'未覆盖该机制',evidenceIds:[]}];Object.assign(unknown.issues[0].subtopics[0],{blocks:[{kind:'unknown',text:'没有持续结果记录',evidenceIds:[]}],reasoningOrigin:'unknown',primaryEvidenceIds:[]});
 assert((await renderHtml(unknown)).includes('本次材料未提供可直接支持'));
});

test('follow-up questions are two specific options; suggested actions need local basis and observable check',()=>{
 rejects([r=>r.issues[0].subtopics[0].followupQuestions=['问题'],r=>r.issues[0].subtopics[0].followupQuestions=['同一个问题','同一个问题'],r=>r.issues[0].subtopics[0].followupQuestions[0]='这个判断的依据是什么？',r=>r.issues[0].subtopics[0].suggestedAction={text:'试一次'},r=>r.issues[0].subtopics[0].suggestedAction={text:'试一次',basis:'材料理由',check:'观察独立完成',evidenceIds:['missing']}]);
 const r=fixture();r.issues[0].subtopics[0].suggestedAction={text:'在现有练习中试一次轮流示范',basis:'仅有一次练习反馈',check:'观察伙伴能否独立完成',evidenceIds:['e1']};
 assert.equal(validateReport(r),r);
});

function addCase(r){r.cases=[{id:'c1',title:'虚构练习案例',primaryIssueId:'i1',context:'工程测试场景',actions:'做了一次练习',observations:'三人能够讲述',status:'pilot',mechanism:'示范后练习',limits:'没有持续结果',evidenceIds:['e1']}];r.issues[0].caseLinks=[{caseId:'c1',relevance:'呈现一次练习后反馈'}];const t=r.issues[0].subtopics[0];t.caseIds=['c1'];t.blocks=[{kind:'inference',text:'工程测试场景中做了一次练习，三人能够讲述；示范后练习可能有助于掌握表达，但没有持续结果。',evidenceIds:['e1']}];return r;}
test('case metadata stays internal; each use explains its role in Reasoning with local Evidence',async()=>{
 const r=addCase(fixture()),second=structuredClone(r.issues[0]);second.id='i2';second.title='另一个判断';second.blocks[0].text='另一种作用';second.subtopics[0].followupQuestions=['三人能讲述之后，公司和伙伴各自应该承担哪一段跟进？','只复盘这三人的一次跟进，能否分清未行动和仍需代做，以决定是否交回伙伴？'];r.issues.push(second);r.categories[0].groups[1].issueIds=['i2'];
 second.subtopics[0].blocks=[{kind:'inference',text:'同一次练习提示伙伴可以承担讲述，但无法据此判断其能独立跟进。',evidenceIds:['e1']}];
 const ui=createDrilldown(validateReport(r));
 for(const [id,group] of [['i1',0],['i2',1]]){
  const h=ui.issue(id,0,group,'');
  assert(h.includes(r.issues.find(i=>i.id===id).subtopics[0].blocks[0].text));assert(h.includes('data-evidence-id="e1"'));
  assert(!/supporting-case|case-cross-reference|jumpToCase|data-case=/.test(h));
  assert.equal((h.match(/class="[^"]*stage-node/g)||[]).length,3);
 }
 const broken=structuredClone(r);broken.issues[0].subtopics[0].caseIds=[];assert.throws(()=>validateReport(broken));
 const h=await renderHtml(r);assert(!h.includes('jumpToCase'));
});

test('practices expand in one category only, with meaningful cross references elsewhere',async()=>{
 const r=fixture(),g=r.categories[3].groups;g[1].issueIds=['i1'];assert.throws(()=>validateReport(r),/主要分类/);
 g[1].issueIds=[];g[1].crossReferences=[{issueId:'i1',relevance:'同一做法对该层的不同作用'}];assert((await renderHtml(r)).includes('data-issue="i1"'));
 g[1].crossReferences[0].relevance='';assert.throws(()=>validateReport(r),/具体作用/);
});

test('frontline practice details and limits appear once in the existing chain, never as extra cards',()=>{
 for(const report of [fixture(),multiFixture()]){
  const r=addCase(report),issue=r.issues[0],topic=issue.subtopics[0];
  issue.hypotheses=[{title:'内部竞争解释',origin:'additional',paragraphs:['内部分析记录'],evidenceIds:[]}];topic.hypothesisIndexes=[0];
  topic.blocks.push({kind:'unknown',text:'另一个待验证解释是练习对象原本就有经验，现有记录无法区分。',evidenceIds:[]});
  r.categories.forEach(c=>c.groups.forEach(g=>g.issueIds=[]));r.categories[3].groups[2].issueIds=['i1'];
  const ui=createDrilldown(validateReport(r)),h=ui.issue('i1',3,2,'');
  assert(!/supporting-case|case-cross-reference|report-hypothesis|data-case=/.test(h));
  assert(!/案例展开|实践详情|补充总结|可迁移部分|适用边界/.test(h));
  assert(!h.includes('虚构练习案例'));assert(!h.includes('内部分析记录'));
  for(const block of topic.blocks){assert.equal(h.split(block.text).length-1,1);assert(h.indexOf(block.text)<h.indexOf('class="evidence-panel'));}
  const reason=Object.values(ui.data.copyEntries).find(e=>e.kind==='Reasoning');
  for(const block of topic.blocks)assert(reason.text.includes(block.text));
  assert(h.includes('data-evidence-id="e1"'));
  assert(!Object.values(ui.data.copyEntries).some(e=>e.kind==='Case'));
 }
});

test('all four categories allow zero, one or multiple Insights per fixed group without truncation',()=>{
 for(let a=0;a<FRAMEWORK.length;a++){
  const r=fixture();r.categories.forEach(c=>c.groups.forEach(g=>g.issueIds=[]));
  r.issues=Array.from({length:3},(_,n)=>{
   const i=structuredClone(fixture().issues[0]);i.id='i'+(n+1);i.title='独立工程判断'+(n+1);
   i.blocks[0].text+=' 工程场景'+n;
   i.subtopics[0].followupQuestions=i.subtopics[0].followupQuestions.map(q=>'工程场景'+n+'：'+q);return i;
  });
  r.categories[a].groups[0].issueIds=['i1','i2'];r.categories[a].groups[1].issueIds=['i3'];
  const ui=createDrilldown(validateReport(r));
  assert.equal(r.categories.length,4);assert.equal(r.categories[a].groups.length,FRAMEWORK[a][3].length);
  for(const [b,g] of r.categories[a].groups.entries())for(const id of g.issueIds)assert(ui.issue(id,a,b,'').includes(r.issues.find(i=>i.id===id).title));
 }
});

test('need assessment keeps supply, satisfaction, gap, urgency and evidence requirements',async()=>{
 const r=fixture();r.supplyAssessment=[{issueId:'i1',need:'测试需求',supply:'已有练习',satisfaction:'尚缺持续使用记录',satisfactionLevel:'partial',gap:'缺少迁移结果',urgency:'暂不判断',basis:'只有一次反馈',evidenceIds:['e1']}];
 const h=await renderHtml(r);for(const x of ['当前满足程度','剩余具体缺口','未满足部分紧迫度','尚缺持续使用记录','assessment-badge partial'])assert(h.includes(x));
 for(const key of ['supply','satisfaction','gap','urgency']){const b=structuredClone(r);delete b.supplyAssessment[0][key];assert.throws(()=>validateReport(b));}
 const missing=structuredClone(r);missing.supplyAssessment[0].evidenceIds=[];assert.throws(()=>validateReport(missing),/定性评级/);
 r.categories[2].groups.forEach(g=>g.issueIds=[]);assert.throws(()=>validateReport(r));
});

test('copy payload registration covers every layer, without disconnected implication footers',()=>{
 const r=addCase(fixture());r.issues[0].subtopics[0].suggestedAction={text:'一次小范围尝试',basis:'一次反馈',check:'观察是否独立完成',evidenceIds:['e1']};
 const ui=createDrilldown(validateReport(r)),h=ui.issue('i1',0,0,''),entries=Object.values(ui.data.copyEntries);
 for(const kind of ['Insight','Reasoning','Evidence','Follow-up','Suggested action'])assert(entries.some(e=>e.kind===kind),kind);
 assert(!entries.some(e=>e.kind==='Case'));
 assert(!entries.some(e=>e.kind==='Sub-insight'));
 assert.equal(entries.filter(e=>e.kind==='Follow-up'&&e.question).length,2);
 assert(h.includes('class="custom-followup copy-block"'));assert(!h.includes('class="management-implication"'));
 const ev=entries.find(e=>e.kind==='Evidence');assert.equal(ev.text,r.evidence[0].excerpt);assert(ev.source.includes('测试材料.txt · 测试段落P1'));
});

test('fictional multi-branch report preserves its visible content and safe script data',async()=>{
 const r=multiFixture();validateReport(r);const h=await renderHtml(r);scripts(h).forEach(s=>new vm.Script(s));
 for(const i of r.issues){assert(h.includes(i.title));for(const t of i.subtopics)assert(h.includes(t.title));}
 assert(!h.includes('data-copy-key="undefined"'));
});

export function multiFixture(){
 const r=fixture(),topic=structuredClone(r.issues[0].subtopics[0]);
 r.evidence.push({...r.evidence[0],id:'e2',point:'另一项虚构观察',excerpt:'工程测试：另一个小组需要组织者提示。',location:'测试段落P2'});
 Object.assign(topic,{title:'另一组仍依赖组织者提示',blocks:[{kind:'inference',text:'工程测试：两组独立程度不同。',evidenceIds:['e2']}],primaryEvidenceIds:['e2'],followupQuestions:['提示应由组织者逐次给，还是先交给伙伴互相提醒，哪一种更接近自主邀请？','在另一个小组的一次练习中去掉一个提示，能否决定下一轮是否继续减提示？']});
 r.issues[0].subtopics.push(topic);return r;
}

test('single branch directly renders the full chain without a synthetic Sub-insight or copy entry',()=>{
 const r=fixture();r.issues[0].subtopics[0].title='仅限内部的分支名';
 const ui=createDrilldown(validateReport(r)),h=ui.issue('i1',0,0,'');
 assert(h.includes('class="direct-analysis" data-context="context-i1-0"'));
 assert(!h.includes('class="sub-branches"'));assert(!h.includes('class="sub-insight drill-sub"'));assert(!h.includes('class="sub-tag"'));
 assert(!h.includes('仅限内部的分支名'));
 for(const label of ['Reasoning','Evidence','Follow-up'])assert(h.includes('>'+label+'</span>'));
 assert(!Object.values(ui.data.copyEntries).some(e=>e.kind==='Sub-insight'));
 assert(!Object.hasOwn(ui.data.meta['context-i1-0'],'subInsight'));
});

test('multiple branches retain independent details, evidence and copy context',()=>{
 const r=multiFixture(),ui=createDrilldown(validateReport(r)),h=ui.issue('i1',0,0,'');
 const parts=h.split('<details class="sub-insight drill-sub"');assert.equal(parts.length,3);
 assert(parts[1].includes('data-evidence-id="e1"'));assert(!parts[1].includes('data-evidence-id="e2"'));
 assert(parts[2].includes('data-evidence-id="e2"'));assert(!parts[2].includes('data-evidence-id="e1"'));
 assert(!h.includes('class="direct-analysis"'));
 const entries=Object.values(ui.data.copyEntries);assert.equal(entries.filter(e=>e.kind==='Sub-insight').length,2);
 for(const [n,t] of r.issues[0].subtopics.entries())assert.equal(ui.data.meta['context-i1-'+n].subInsight,t.title);
});

test('question validation catches empty, punctuation-only duplicates, stock questions and reused pairs',()=>{
 rejects([
  r=>r.issues[0].subtopics[0].followupQuestions[0]='  ',
  r=>r.issues[0].subtopics[0].followupQuestions[0]='？？？',
  r=>r.issues[0].subtopics[0].followupQuestions=['练习如何迁移？',' 练习如何迁移? '],
  ...['原始访谈是怎么说的？','有哪些材料支持？','为什么会形成这个结论？','哪些市场已经出现变化？','对此你有什么想法？','下一步应该如何验证？'].map(q=>r=>r.issues[0].subtopics[0].followupQuestions[0]=q)
 ]);
 const r=multiFixture();r.issues[0].subtopics[1].followupQuestions=[...r.issues[0].subtopics[0].followupQuestions].reverse();
 assert.throws(()=>validateReport(r),/同一组追问/);
});

test('a multi-branch case must have one owner, and hypothesis evidence stays in its assigned branch',()=>{
 const r=addCase(multiFixture());r.issues[0].subtopics[1].caseIds=['c1'];assert.throws(()=>validateReport(r),/明确分析分支/);
 const h=multiFixture();h.evidence.push({...h.evidence[0],id:'e3'});
 h.issues[0].hypotheses=[{title:'工程测试假设',origin:'material',paragraphs:['只属于第二分支'],evidenceIds:['e3']}];
 h.issues[0].subtopics[1].hypothesisIndexes=[0];h.issues[0].subtopics[1].primaryEvidenceIds=['e2','e3'];
 const ui=createDrilldown(validateReport(h)),parts=ui.issue('i1',0,0,'').split('<details class="sub-insight drill-sub"');
 assert(!parts[1].includes('data-evidence-id="e3"'));assert(parts[2].includes('data-evidence-id="e3"'));
 h.issues[0].subtopics[0].primaryEvidenceIds=['e1','e3'];assert.throws(()=>validateReport(h),/本子判断支持材料/);
});

test('follow-up copy includes reasoning and source boundary, with Sub-insight only when nested',async()=>{
 const runtime=await readFile(new URL('../assets/drilldown-v8.js',import.meta.url),'utf8');
 function format(data,entry){
  const node={addEventListener(){},querySelector(){return node;}};
  const sandbox={window:{addEventListener(){}},document:{title:'虚构报告',getElementById(){return node;},addEventListener(){}}};
  vm.runInNewContext(runtime+'\ninsightInteractions(data);',Object.assign(sandbox,{data}));
  return sandbox.window.__insightInteraction.formatEntry(entry);
 }
 for(const r of [fixture(),multiFixture()]){
  const ui=createDrilldown(r);ui.issue('i1',0,0,'');
  const entry=Object.values(ui.data.copyEntries).find(e=>e.kind==='Follow-up'&&e.question),text=format(ui.data,entry);
  assert(text.includes(r.issues[0].title));assert(text.includes(entry.question));assert(text.includes(r.issues[0].subtopics[0].blocks[0].text));
  assert(text.includes('重新访问相关原始材料'));assert(text.includes('若原始材料不可访问'));
  assert.equal(text.includes('对应子判断：'),r.issues[0].subtopics.length>1);
  const custom=format(ui.data,{...entry,question:'我自己写的探索问题'});assert(custom.includes('我的问题：我自己写的探索问题'));
 }
});

test('reading position shows only Insight for a direct branch and the current Sub-insight when nested',async()=>{
 const runtime=await readFile(new URL('../assets/drilldown-v8.js',import.meta.url),'utf8');
 for(const nested of [false,true]){
  const insightText={textContent:''},subText={textContent:''},subLine={hidden:false},button={addEventListener(){}},header={getBoundingClientRect:()=>({bottom:-1})};
  const bar={hidden:true,querySelector:s=>({'.context-insight-title':insightText,'.context-sub-title':subText,'.context-sub':subLine,'.context-back':button}[s])};
  const issue={getClientRects:()=>[{}],getBoundingClientRect:()=>({top:-150,bottom:800}),querySelector:s=>s===':scope>summary'?header:{textContent:'主判断'}};
  const row={getClientRects:()=>[{}],getBoundingClientRect:()=>({top:-40,bottom:700}),closest:()=>issue,querySelector:s=>s===':scope>summary'?header:{textContent:'当前子判断'}};
  let dialog=false;
  const sandbox={window:{addEventListener(){}},document:{getElementById:()=>bar,querySelector:()=>dialog?{}:null,querySelectorAll:s=>s==='.drill-sub[open]'?(nested?[row]:[]):[issue],addEventListener(){}}};
  vm.runInNewContext(runtime+'\nreadingContext();',sandbox);
  assert.equal(bar.hidden,false);assert.equal(insightText.textContent,'主判断');assert.equal(subLine.hidden,!nested);
  assert.equal(subText.textContent,nested?'当前子判断':'');
  assert.equal(button.textContent,nested?'回到当前子判断 ↑':'回到当前判断 ↑');
  dialog=true;sandbox.window.__readingContext.update();assert.equal(bar.hidden,true);
 }
});
