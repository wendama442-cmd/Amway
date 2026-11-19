import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {FRAMEWORK,validateReport,renderHtml} from './render-report.mjs';
import {buildGeographies,resolveIssueGeographies,resolveSourceGeographies} from './geography.mjs';
import {renderReadingList,FOCUS_EXPLANATION} from './report-presentation.mjs';
import {basis,fixture,twoNeeds} from './report-test-fixtures.mjs';
test('requires authored report prose and every insight has a visible report relation',()=>{
 const r=fixture();assert.equal(validateReport(r),r);
 for(const change of [r=>delete r.reportViews,r=>r.reportViews[0].overview=[],r=>{r.reportViews[0].overview=[];r.reportViews[0].status='insufficient';},r=>{r.reportViews[0].overview=[];r.reportViews[0].chapters.forEach(c=>{c.items=[];c.note='未覆盖'});r.reportViews[0].status='insufficient';},r=>r.reportViews[0].chapters.pop(),r=>r.overviewItems=[]]){const x=fixture();change(x);assert.throws(()=>validateReport(x));}
});
test('validates explicit focus reasons, actual issue links and chapter assignment',()=>{
 for(const change of [r=>delete r.reportViews[0].overview[0].focusReason,r=>r.reportViews[0].overview[0].issueIds=['missing'],r=>r.reportViews[0].chapters[0].items[0].focus='yes',r=>{r.categories[1].groups[0].issueIds=[];r.reportViews[0].chapters[1].items[0].issueIds=['i1'];}]){const x=fixture();change(x);assert.throws(()=>validateReport(x));}
});
test('local reports require explicit issue provenance and do not inherit parent conclusions',()=>{
 const r=fixture(),local=structuredClone(r.reportViews[0]);local.id='local';local.geographyId='city';r.reportViews.push(local);assert.equal(validateReport(r),r);
 const x=structuredClone(r);x.issues[0].geographyIds=['region'];assert.throws(()=>validateReport(x),/地域报告/);
 const y=fixture();y.geographies[2].parentId='city';assert.throws(()=>validateReport(y),/层级/);
 const direct=fixture();direct.geographies[2].parentId='op';direct.reportViews=direct.reportViews.filter(v=>v.geographyId!=='region');assert.equal(validateReport(direct),direct);
 const z=structuredClone(r);z.reportViews.push({...local,id:'duplicate'});assert.throws(()=>validateReport(z),/同一地域/);
 const empty=structuredClone(local);empty.id='empty';empty.geographyId='cityEmpty';empty.status='insufficient';empty.overview=[];empty.chapters.forEach(c=>{c.items=[];c.note='无独立材料'});r.geographies.push({id:'cityEmpty',name:'无独立材料城市群',level:'city',parentId:'region'});r.reportViews.push(empty);assert.equal(validateReport(r),r);
});

test('upward rollups require full authored narratives, without leaking region-only facts to cities',()=>{
 const r=fixture();assert.deepEqual(resolveIssueGeographies(r).get('i1'),['city','region','op']);
 r.issues[0].geographyIds=['region'];assert.deepEqual(resolveIssueGeographies(r).get('i1'),['region','op']);
 assert.equal(validateReport(r),r);
 const missing=fixture();missing.reportViews=missing.reportViews.filter(v=>v.geographyId!=='op');assert.throws(()=>validateReport(missing),/汇总报告/);
 const omitted=fixture();omitted.reportViews.find(v=>v.geographyId==='op').chapters.forEach(c=>{c.items=[];c.note='工程遗漏';});assert.throws(()=>validateReport(omitted),/不得遗漏/);
});

test('confirmed filename profiles resolve all six interviews only when explicitly selected',()=>{
 const r=fixture();r.geographies=buildGeographies();r.sources=['Murphy','Yanchi','Hans','Ivy','Michael','Bill'].map((name,n)=>({id:'s'+n,name:'访谈_'+name+'_整理.txt',role:'interview'}));
 const unmapped=resolveSourceGeographies(r);assert([...unmapped.values()].every(ids=>ids.length===0));
 r.sourceGeographyProfile='confirmed-six-interviews';const mapped=resolveSourceGeographies(r),byId=new Map(r.geographies.map(g=>[g.id,g]));
 for(const [n,ids] of [...mapped.values()].entries()){
  assert.equal(ids.length,2);assert.equal(byId.get(ids[0]).level,'region');assert.equal(byId.get(ids[1]).name,n<2?'北京营运区':'上海营运区');assert(!ids.some(id=>byId.get(id).level==='city'));
 }
 r.issues[0].geographyIds=[];r.issues[0].geographyMode='source';r.evidence[0].sourceId='s0';
 assert.deepEqual(resolveIssueGeographies(r).get('i1'),mapped.get('s0'));
 r.sources[0].geographyIds=[mapped.get('s2')[0]];assert.throws(()=>resolveSourceGeographies(r),/冲突/);
 r.sources[0].geographyIds=[];r.sources[0].name='Murphy 与 Hans 访谈.txt';assert.throws(()=>resolveSourceGeographies(r),/多个地域/);
});

test('focus requires a reasoning chain; bullets reject manual line breaks and ambiguous categories',()=>{
 for(const change of [p=>delete p.focusBasis,p=>p.focusBasis={...basis,explanation:''},p=>p.text+='\n另起一行',p=>delete p.groupId,p=>p.groupId='mechanism']){
  const r=fixture();change(r.reportViews[0].chapters[0].items[0]);assert.throws(()=>validateReport(r));
 }
});

test('fixed tags sort categories stably while preserving each paragraph verbatim',()=>{
 const groups=[{id:'strategy',name:'战略方向层',tone:'purple'},{id:'mechanism',name:'机制与打法层',tone:'blue'},{id:'execution',name:'执行颗粒层',tone:'leaf'}];
 const points=['execution','mechanism','strategy','execution'].map((g,n)=>({groupId:g,heading:'判断'+n,text:'保留具体解释与条件'+n,issueIds:['i'+n]}));
 const html=renderReadingList(points,groups);assert.deepEqual([...html.matchAll(/<li data-group="([^"]+)/g)].map(m=>m[1]),['strategy','mechanism','execution','execution']);
 assert(html.includes('tone-purple'));assert(html.includes('tone-blue'));assert(!html.includes('<br'));
 for(const p of points)assert(html.includes('<strong class="aspect-label">'+p.heading+'</strong> <span class="key-message">'+p.text+'</span>'));
});

test('theme paragraphs can combine detailed needs while preserving visible items and independent assessments',async()=>{
 const r=twoNeeds();assert.equal(validateReport(r),r);
 const html=await renderHtml(r);assert(html.includes('data-issues="i1,i2"'));assert.equal(r.supplyAssessment.length,2);assert.notEqual(r.supplyAssessment[0].satisfactionLevel,r.supplyAssessment[1].satisfactionLevel);
 for(const change of [p=>delete p.needMentions,p=>p.needMentions[1].text='正文没有解释的隐藏子项',p=>p.needMentions[1].issueId='i1']){const x=twoNeeds();change(x.reportViews[0].chapters[2].items[0]);assert.throws(()=>validateReport(x),/合并需求正文/);}
});

test('regional narratives may reframe shared evidence and retain local-only issues outside the global body',async()=>{
 const r=twoNeeds(),global=r.reportViews[0];global.regionalIssueIds=['i2'];global.chapters[2].items=[{heading:'总部资源仍需进入真实任务',text:'【虚构】总体围绕查询权限的使用约束形成跨市场主题。',issueIds:['i1'],groupId:'strategy',focus:false}];
 r.reportViews[1].chapters[2].items[0].heading='本地助理跟进与晚间练习遇到不同障碍';
 assert.equal(validateReport(r),r);const html=await renderHtml(r),paper=html.split('id="report-paper">')[1].split('</article>')[0];assert(!paper.includes('本地对练开放时段妨碍日常练习'));assert(html.includes('data-issue="i2"'));
 const lost=structuredClone(r);for(const v of lost.reportViews.slice(1))v.chapters[2].items[0].issueIds=['i1'];assert.throws(()=>validateReport(lost));
 const dangling=structuredClone(r);dangling.reportViews[0].regionalIssueIds=['missing'];assert.throws(()=>validateReport(dangling));
});

test('composite stars require the current paragraph basis and do not inherit from linked detail flags',async()=>{
 const r=twoNeeds(),p=r.reportViews[0].chapters[2].items[0];r.issues[0].focus=true;
 let html=await renderHtml(r);let needs=html.split('id="chapter-needs"')[1].split('</section>')[0];assert(!needs.includes('focus-marker'));
 p.focus=true;p.focusReason='本段把权限和开放时段的背景、卡点、已有回应与不同剩余需要连接起来';p.focusBasis={...basis,issueIds:['i1']};assert.throws(()=>validateReport(r),/综合段落标星/);
 p.focusBasis.issueIds=['i1','i2'];assert.equal(validateReport(r),r);html=await renderHtml(r);needs=html.split('id="chapter-needs"')[1].split('</section>')[0];assert(needs.includes('focus-marker'));
 const point={heading:'具体发现',text:'解释与条件',groupId:'strategy',issueIds:['i1'],focus:true};const rows=renderReadingList([point,{...point,focus:false}], [{id:'strategy',name:'战略方向层',tone:'purple'}],undefined,'test',FOCUS_EXPLANATION);
 assert.equal((rows.match(/class="focus-marker"/g)||[]).length,1);assert(rows.includes('tabindex="0" role="img"'));assert(rows.includes('>★</span>'));assert(!rows.includes('★ 重点洞察</span>'));
});
test('renders report first, one canonical insight and offline filter data',async()=>{
 const html=await renderHtml(fixture()),body=html.replace(/<script>[\s\S]*?<\/script>/g,'');
 assert(html.includes('id="report-paper"'));assert.equal((body.match(/class="insight"/g)||[]).length,1);
 assert(!body.includes('class="framework-root"'));assert(!body.includes('id="executive"'));
 for(const id of ['op-select','region-select','city-select','filter-all','filter-focus','report-detail','assessment','sources'])assert(body.includes('id="'+id+'"'));
 assert(!/(?:src|href)=["']https?:\/\//.test(html));
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);scripts.forEach(s=>new vm.Script(s));
});
test('safe embedded JSON round-trips hostile strings without executing markup',async()=>{
 const r=fixture(),text='</script><script>alert(1)</script>\u2028&';r.reportViews[0].overview[0].text=text;
 const html=await renderHtml(r);assert(!html.includes('<script>alert(1)</script>'));assert(html.includes('&lt;/script&gt;'));
 const data=html.match(/const reportPayload=([\s\S]*?);insightInteractions\(reportPayload\.interactions\);/)[1];
 assert.equal(JSON.parse(data).views[0].overview[0].text,text);
});

test('all chapters accept explained problems without measures or feedback; weak signals stay unstarred',async()=>{
 const r=fixture();
 for(const v of r.reportViews)for(const c of v.chapters){const p=c.items[0];p.heading='虚构任务受身份条件限制';p.text='伙伴愿承担任务，但可用权限不匹配，因此无法执行；支持尚未实施，效果未知。';p.focusReason='本段解释任务与权限不匹配及其后果';p.focusBasis={explanation:'任务意愿不能转为动作，权限支持尚未实施',evidenceIds:['e1']};}
 assert.equal(validateReport(r),r);
 const html=await renderHtml(r);for(const c of FRAMEWORK)assert(html.split('id="chapter-'+c[0]+'"')[1].split('</section>')[0].includes('focus-marker'));
 const weak=['只有一个增减数字','反复强调很严重','希望建一个平台','多人重复同一个想法'];
 for(const text of weak){const rows=renderReadingList([{heading:text,text,issueIds:['i1'],focus:false}]);assert(!rows.includes('focus-marker'));}
 for(const mutate of [p=>p.focusBasis.evidenceIds=['missing'],p=>p.focusBasis.evidenceIds=[],p=>delete p.focusBasis.explanation]){const x=fixture();mutate(x.reportViews[0].overview[0]);assert.throws(()=>validateReport(x));}
 const x=fixture();x.evidence.push({...x.evidence[0],id:'unrelated'});x.reportViews[0].overview[0].focusBasis.evidenceIds=['unrelated'];assert.throws(()=>validateReport(x),/本段关联/);
});
