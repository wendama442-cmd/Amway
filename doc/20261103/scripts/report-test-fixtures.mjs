// Fictional engineering data only; never an expected business answer.
import {FRAMEWORK} from './render-report.mjs';
const basis={explanation:'虚构材料解释练习与部分独立动作的联系，持续结果仍未知',evidenceIds:['e1']};
function fixture(){
 const point={heading:'虚构练习后出现部分独立动作',text:'一次示范后，有人能够独立主持；持续运营与覆盖成本仍需分别判断。',issueIds:['i1'],focus:true,focusReason:'已连接练习情境、独立主持卡点、一次反馈和持续支持缺口',focusBasis:basis};
 const t={title:'虚构直接分支',blocks:[{kind:'inference',text:point.text,evidenceIds:['e1']}],reasoningOrigin:'inference',reasoningNote:'仅一次虚构反馈，持续性未知',primaryEvidenceIds:['e1'],followupQuestions:['主持与后续联系中，哪项更适合先由伙伴独立承担？','回看这次主持，哪些提示仍影响伙伴能否自己完成？'],caseIds:[],hypothesisIndexes:[]};
 const r={format:'amway-insight-v4',layout:'report-1027',experience:'report-reading-v6',title:'虚构工程报告',summary:'工程测试',reportDate:'',reportDateKind:'unknown',sources:[{id:'s',name:'虚构访谈.txt',role:'interview'}],evidence:[{id:'e1',sourceId:'s',point:'部分伙伴能独立主持',excerpt:'【虚构】示范之后有伙伴能自己主持，但尚无后续记录。',location:'虚构P1'}],issues:[{id:'i1',kind:'judgment',title:point.heading,summary:point.text,scope:'虚构城市',geographyIds:['city'],blocks:structuredClone(t.blocks),managementImplication:'需要辨认独立动作与持续结果',needTags:[],subtopics:[t],caseLinks:[],hypotheses:[]}],cases:[],categories:FRAMEWORK.map(f=>({id:f[0],groups:f[3].map((g,n)=>({id:g[0],issueIds:n===0?['i1']:[],note:'工程未覆盖'}))})),supplyAssessment:[],geographies:[{id:'op',name:'虚构营运区',level:'operation',parentId:null},{id:'region',name:'虚构片区',level:'region',parentId:'op'},{id:'city',name:'虚构城市群',level:'city',parentId:'region'}],reportViews:[{id:'global',geographyId:null,title:'综合判断',status:'supported',lead:'工程样例，不代表真实市场',overview:[structuredClone(point)],chapters:FRAMEWORK.map(f=>({categoryId:f[0],lead:'工程章节完整判断',items:[{...structuredClone(point),groupId:f[3][0][0]}]}))}]};
 for(const id of ['op','region'])r.reportViews.push({...structuredClone(r.reportViews[0]),id:'view-'+id,geographyId:id});
 return r;
}
function twoNeeds(){
 const r=fixture(),second=structuredClone(r.issues[0]);second.id='i2';second.title='本地对练开放时段妨碍日常练习';second.summary='【虚构】开放时段影响对练，需与查询权限分别处理。';second.subtopics[0].followupQuestions=['对练开放时段与伙伴的日常安排，哪一项调整更便于持续练习？','复盘一次晚间练习，哪个实际等待环节会改变开放安排？'];
 r.issues.push(second);r.categories[2].groups[2].issueIds=['i2'];
 for(const v of r.reportViews)v.chapters[2].items=[{heading:'工具障碍在权限与开放时段，需要分别安排支持',text:'【虚构】助理查询权限影响跟进，对练开放时段影响练习；两项资源的用途与剩余缺口不同。',issueIds:['i1','i2'],groupId:'strategy',focus:false,needMentions:[{issueId:'i1',text:'查询权限'},{issueId:'i2',text:'对练开放时段'}]}];
 r.supplyAssessment=['i1','i2'].map((id,n)=>({issueId:id,need:n?'对练开放时段':'助理查询权限',supply:n?'尚未开放':'已有查询页面',satisfaction:n?'未满足':'部分满足',satisfactionLevel:n?'insufficient':'partial',gap:n?'日常可用时段':'助理身份权限',urgency:n?'高':'中',urgencyLevel:n?'high':'medium',basis:'【虚构】对应具体需求的观察',evidenceIds:['e1']}));
 return r;
}


export {basis,fixture,twoNeeds};
