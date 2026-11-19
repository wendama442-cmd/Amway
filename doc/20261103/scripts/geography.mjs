import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8').replace(/^\uFEFF/,''));
export const geographyCatalog=load('../knowledge/data/geography-catalog.json');
export const sourceGeographyProfiles=load('../knowledge/data/source-geography-profiles.json');
const normalize=s=>s.replace(/[／/\s]/g,'');

export function buildGeographies(catalog=geographyCatalog){
 const result=[],byName=new Map();
 const add=(name,level,parentId,row)=>{
  const key=level+':'+name;if(byName.has(key))return byName.get(key);
  const g={id:level+'-r'+row,name,level,parentId};result.push(g);byName.set(key,g);return g;
 };
 for(const c of catalog.cityGroups){
  const op=add(c.operatingRegion,'operation',null,c.row);
  const name=c.area||c.group;
  const parent=name?add(name,'region',op.id,c.row):op;
  add(c.name,'city',parent.id,c.row);
 }
 return result;
}

export function upwardGeographies(ids,geographies){
 const geo=new Map(geographies.map(g=>[g.id,g])),result=new Set();
 for(const id of ids){
  const seen=new Set();let at=id;
  while(at!==null){
   if(seen.has(at))throw Error('地域层级存在循环');seen.add(at);
   const g=geo.get(at);if(!g)throw Error('地域未登记：'+at);
   result.add(at);at=g.parentId;
  }
 }
 return [...result];
}

export function resolveSourceGeographies(r){
 const profile=r.sourceGeographyProfile&&sourceGeographyProfiles.profiles.find(p=>p.id===r.sourceGeographyProfile);
 if(r.sourceGeographyProfile&&!profile)throw Error('来源地域配置未登记');
 const byId=new Map(r.geographies.map(g=>[g.id,g]));
 const resolveMapping=m=>{
  const target=r.geographies.find(g=>g.level==='region'&&normalize(g.name)===normalize(m.geographyName));
  if(!target||byId.get(target.parentId)?.name!==m.operationName)throw Error('来源映射与正式地域层级不一致：'+m.geographyName);
  return target.id;
 };
 return new Map(r.sources.map(s=>{
  let ids=s.geographyIds;
  if(ids!==undefined&&(!Array.isArray(ids)||new Set(ids).size!==ids.length))throw Error('来源地域必须是无重复的地域 ID 数组');
  // A profile must be explicitly selected; a historical English name alone never activates it.
  const identity=s.name+' '+(s.respondent||'');
  const matches=profile?.mappings.filter(m=>m.aliases.some(a=>new RegExp('(^|[^A-Za-z])'+a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^A-Za-z])','i').test(identity)))||[];
  if(matches.length>1)throw Error('来源文件匹配多个地域，请显式核对：'+s.name);
  if(matches.length){const mapped=resolveMapping(matches[0]);if(ids?.length&&!ids.includes(mapped))throw Error('来源地域与已确认映射冲突：'+s.name);ids=ids?.length?ids:[mapped];}
  return [s.id,upwardGeographies(ids||[],r.geographies)];
 }));
}

export function resolveIssueGeographies(r){
 const sources=resolveSourceGeographies(r),evidence=new Map(r.evidence.map(e=>[e.id,e]));
 return new Map(r.issues.map(i=>{
  if(i.geographyMode!==undefined&&!['explicit','source'].includes(i.geographyMode))throw Error('geographyMode 只能是 explicit 或 source');
  let ids=i.geographyIds||[];
  if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw Error('洞察地域必须是无重复的地域 ID 数组');
  if(i.geographyMode==='source'){
   if(ids.length)throw Error('source 模式不同时手填洞察地域；具体城市案例请使用 explicit');
   const cited=new Set([...i.blocks,...i.subtopics.flatMap(t=>t.blocks)].flatMap(b=>b.evidenceIds).map(id=>evidence.get(id)?.sourceId));
   if(!cited.size||[...cited].some(id=>!sources.get(id)?.length))throw Error('来源模式的每份支撑材料都须有已确认地域');
   ids=[...new Set([...cited].flatMap(id=>sources.get(id)))];
  }
  return [i.id,upwardGeographies(ids,r.geographies)];
 }));
}

// Export the formal selector hierarchy; business narratives must still be authored from the materials.
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const json=JSON.stringify(buildGeographies(),null,2)+'\n';
 if(process.argv[2])writeFileSync(process.argv[2],json,'utf8');else process.stdout.write(json);
}
