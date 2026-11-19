export const CATEGORY_TONES={short:'blue',long:'purple',acquisition:'green',retention:'cyan',talent:'indigo',middle:'amber',senior:'violet',strategy:'purple',mechanism:'blue',execution:'leaf'};
export const FOCUS_EXPLANATION='业务逻辑较完整的洞察。';
export const FOCUS_EMPTY='当前地域暂无业务逻辑较完整的重点洞察，可切换“全部洞察”查看已有内容。';

// Shared by the initial HTML and the browser. Filtering never rewrites a paragraph.
export function renderReadingList(items,groups=[],decorate=()=> '',key='',focusDefinition=''){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const sorted=items.map((p,n)=>({p,n})).sort((a,b)=>{
  const rank=p=>{const i=groups.findIndex(g=>g.id===p.groupId);return i<0?groups.length:i;};return rank(a.p)-rank(b.p)||a.n-b.n;
 });
 return '<ul class="aspect-list">'+sorted.map(({p},n)=>{
  const g=groups.find(g=>g.id===p.groupId);
  const tag=g?`<span class="category-tag tone-${esc(g.tone)}" data-group="${esc(g.id)}">${esc(g.name)}</span>`:'';
  const star=p.focus?`<span class="focus-marker" tabindex="0" role="img" aria-label="重点洞察：${esc(focusDefinition)}" title="${esc(focusDefinition)}" data-definition="${esc(focusDefinition)}">★</span>`:'';
  return `<li${g?` data-group="${esc(g.id)}"`:''}${p.focus?' class="is-focus"':''}>${star}<div class="aspect-copy"${key?` data-copy-selection="report-${esc(key)}-${n}"`:''}>${tag}<strong class="aspect-label">${esc(p.heading)}</strong> <span class="key-message">${esc(p.text)}</span>${decorate(p,n)}</div><button type="button" class="related-link" data-issues="${p.issueIds.join(',')}" data-context="${esc(p.heading)}" data-support="${esc(p.text)}">相关洞察 <span>${p.issueIds.length} ↗</span></button></li>`;
 }).join('')+'</ul>';
}
