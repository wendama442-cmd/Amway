export const DEPTH_WEIGHTS=[.20,.30,.20,.15,.15];
export const PRIORITY_WEIGHTS=[.30,.20,.20,.15,.15];
export const DISPLAY_CLASSES=['核心管理洞察','少数深度洞察','重要待验证问题','具体执行与局部需求'];
export function calculateAssessment(a){
 if(a.reviewStatus==='pending')return {...a,depth:null,level:null,completeness:null,priorityScore:null,priority:'待评估',displayClass:null};
 const check=(v,n,min,max,name)=>{if(!Array.isArray(v)||v.length!==n||v.some(x=>!Number.isInteger(x)||x<min||x>max))throw Error(name+' 分数范围或数量无效');};
 check(a.D,5,1,5,'D');check(a.C,6,0,2,'C');check(a.P,5,1,5,'P');
 for(const [key,n] of [['depthReasons',5],['completenessReasons',6],['priorityReasons',5]])if(!Array.isArray(a[key])||a[key].length!==n||a[key].some(x=>typeof x!=='string'||!x.trim()))throw Error(key+' 必须逐项有依据');
 for(const k of ['hasCausalExplanation','causalEvidenceSupported','transferConditionsSpecified'])if(typeof a[k]!=='boolean')throw Error(k+' 必须明确判断');
 for(const k of ['factConfidence','causalConfidence'])if(!['高','中','低'].includes(a[k]))throw Error(k+' 无效');
 if(!a.confidenceBasis?.trim()||!a.insightId||!Array.isArray(a.evidenceIds)||!a.evidenceIds.length)throw Error('缺少评分证据和可信度依据');
 if(!Array.isArray(a.tags)||!a.tags.length||a.tags.some(t=>!['Cross-market Commonality','Deep Minority Insight','Emerging / Distinctive Signal'].includes(t)))throw Error('共性与独特性标签无效');
 const weighted=(v,w)=>Math.round(v.reduce((s,x,i)=>s+x*w[i],0)*100)/100;
 const depth=weighted(a.D,DEPTH_WEIGHTS),priorityScore=weighted(a.P,PRIORITY_WEIGHTS);
 let level=depth<1.8?1:depth<2.6?2:depth<3.4?3:depth<4.2?4:5;
 const caps=[];
 if(!a.hasCausalExplanation){level=Math.min(level,2);caps.push('缺少真正因果解释，最高 L2');}
 if(!a.causalEvidenceSupported){level=Math.min(level,3);caps.push('核心因果缺证据，最高 L3');}
 if(!a.transferConditionsSpecified){level=Math.min(level,4);caps.push('其他市场适用条件未说明，最高 L4');}
 const priority=priorityScore>=3.8?'高':priorityScore>=2.6?'中':'低';
 let displayClass='具体执行与局部需求';
 if(priority==='高'&&(!a.causalEvidenceSupported||a.causalConfidence==='低'))displayClass='重要待验证问题';
 else if(a.tags.includes('Deep Minority Insight')&&level>=4)displayClass='少数深度洞察';
 else if(priority==='高'&&level>=3&&a.causalEvidenceSupported&&a.causalConfidence!=='低')displayClass='核心管理洞察';
 return {...a,depth,level:'L'+level,completeness:a.C.reduce((s,x)=>s+x,0),priorityScore,priority,displayClass,caps};
}
export function validateWorkflow(w,report){
 if(w?.version!=='insight-workflow-v1')throw Error('工作流版本无效');
 const unique=(xs,key,label)=>{if(!Array.isArray(xs))throw Error(label+' 必须为数组');const m=new Map();for(const x of xs){if(!x[key]||m.has(x[key]))throw Error(label+' ID 缺失或重复');m.set(x[key],x);}return m;};
 const info=unique(w.information,'id','信息'),candidate=unique(w.candidates,'id','候选'),ev=unique(w.evidence,'id','证据');
 const checkRefs=(xs,m,label)=>{if(!Array.isArray(xs)||!xs.length||new Set(xs).size!==xs.length||xs.some(x=>!m.has(x)))throw Error(label+' 引用缺失或重复');};
 for(const i of info.values())checkRefs(i.evidenceIds,ev,'信息证据');
 for(const c of candidate.values()){checkRefs(c.informationIds,info,'候选信息');checkRefs(c.evidenceIds,ev,'候选证据');for(const id of c.evidenceIds)if(!c.informationIds.some(i=>info.get(i).evidenceIds.includes(id)))throw Error('候选证据不在其信息点中');}
 const assessments=unique(w.assessments,'insightId','评估');
 if(assessments.size!==candidate.size||[...candidate.keys()].some(id=>!assessments.has(id)))throw Error('候选与评分必须一一对应');
 for(const a of assessments.values()){if(!candidate.has(a.insightId))throw Error('孤立评分');checkRefs(a.evidenceIds,ev,'评估证据');if(a.evidenceIds.some(id=>!candidate.get(a.insightId).evidenceIds.includes(id)))throw Error('评分引用其他候选证据');calculateAssessment(a);}
 if(report&&report.issues.some(i=>!candidate.has(i.id)))throw Error('报告洞察缺少工作流记录');
 return true;
}
