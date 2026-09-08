import {apiFetch, initializeConnection, remoteMode} from './connection.js';
import {mobileViews, mobileNavigation} from './mobile.js';
import {notificationView, loadNotifications, notificationAction} from './notifications.js';
await initializeConnection();
const phoneMedia=matchMedia('(max-width: 760px)');
const phoneMode=()=>phoneMedia.matches&&sessionStorage.getItem('jarvis.layout')!=='full';
const modeButton=document.createElement('button');modeButton.className='view-mode-toggle quiet small';
document.querySelector('.topbar').append(modeButton);
const phoneNav=document.createElement('nav');phoneNav.className='phone-nav';phoneNav.setAttribute('aria-label','手机导航');document.body.append(phoneNav);
function updateLayout(){document.body.classList.toggle('phone-mode',phoneMode());modeButton.textContent=phoneMode()?'完整界面':'手机界面';modeButton.hidden=!phoneMedia.matches;}
modeButton.onclick=()=>{sessionStorage.setItem('jarvis.layout',phoneMode()?'full':'phone');updateLayout();if(state&&!form)render();};
document.addEventListener('click',e=>{if(e.target.closest('[data-phone-full]'))modeButton.click();});
phoneMedia.addEventListener('change',()=>{updateLayout();if(state&&!form&&!document.activeElement?.closest('#chat-compose'))render();});
updateLayout();
const main = document.querySelector('#main');
const phoneStatus=document.createElement('div');phoneStatus.className='phone-sync';phoneStatus.setAttribute('role','status');main.before(phoneStatus);
function connectionStatus(message){document.querySelector('#save-status').textContent=message;phoneStatus.textContent=message;phoneStatus.classList.toggle('offline',message.includes('断开'));}
const labels = {inbox:'待整理',backlog:'稍后',next:'下一步',in_progress:'进行中',waiting:'等待',done:'已完成',cancelled:'已取消',active:'进行中',planned:'计划中',paused:'已暂停',completed:'已完成',retired:'已停用',pending:'待执行',skipped:'已跳过',missed:'已错过',open:'未完成',resolved:'已解决'};
const routineFrequency = r => r.frequency==='daily'&&r.interval_days>1 ? `每 ${r.interval_days} 天` : frequency[r.frequency];
const frequency = {daily:'每天',weekly:'每周',monthly:'每月',manual:'手动触发'};
const kinds = {note:'笔记',decision:'决策',question:'开放问题',artifact:'资料'};
const icons = {notifications:'♧',records:'≡',chat:'◎',today:'◷',projects:'▧',routines:'↻',inbox:'▱',calendar:'▦'};
let state, form = null, filter = 'active', expanded = new Set(), busy = false, boardMode = true, dragged = null, renderedDay = null, renderedMinute = null, initialRoute = true;
let lastRenderedRoute='';
function setBusy(value){
  busy=value;
  main.setAttribute('aria-busy',String(value));
  document.querySelectorAll('[data-action], .board-controls select, #editor [type=submit]').forEach(node=>node.disabled=value);
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId = (table,id) => state[table].find(x=>x.id===id);
const localDate = () => new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateText = value => value ? new Date(value.length===10?value+'T12:00:00':value).toLocaleDateString('zh-CN',{month:'short',day:'numeric'}) : '未设置';
const path = () => (location.hash.slice(1) || 'today').split('/');
const button = (text,action,cls='',id='',extra='') => `<button class="${cls}" data-action="${action}" ${id?`data-id="${esc(id)}"`:''} ${extra}>${text}</button>`;
const pill = (text,cls='') => `<span class="pill ${cls}">${esc(text)}</span>`;
const empty = (title,body,action='',text='') => `<div class="empty"><strong>${esc(title)}</strong><p>${esc(body)}</p>${action?button(text,action,'small'):''}</div>`;
const section = (title,body,meta='',action='') => `<section class="section"><div class="section-head"><h2>${title}</h2><span class="section-meta">${meta}</span><div class="right">${action}</div></div>${body}</section>`;
const areaName = obj => byId('areas',obj.project_id ? byId('projects',obj.project_id)?.area_id : obj.area_id)?.name || '';
const activeProject = t => !t.project_id || ['active'].includes(byId('projects',t.project_id)?.status);
const blocked = t => t.blocker || (t.depends_on && byId('tasks',t.depends_on)?.status!=='done');

async function api(url,method='GET',body){
  let headers=method==='GET'?{}:{'Content-Type':'application/json','X-Jarvis-Client':'local'};
  const match=url.match(/^\/api\/(areas|projects|tasks|routines|occurrences|milestones|entries|calendar_events|project_contexts|memories|agent_runs|capture_sources|inbox_items|inbox_candidates|conversation_summaries|reminder_preferences|reminder_states)(?:\/([^/]+))?(?:\/(trigger))?$/);
  if(match&&method!=='GET'){
    const [,entity,id,trigger]=match;
    const operation=trigger?'trigger':method==='POST'?'create':'update';
    const command={request_id:crypto.randomUUID(),actor:'user:web',reason:operation==='create'?'在界面创建事项':'在界面调整工作安排',operation,entity,data:trigger?{}:body};
    if(id){command.id=id;command.expected_revision=byId(entity,id)?.revision;}
    const response=await api('/api/commands','POST',command);
    return response.record;
  }
  const response = await apiFetch(url,{method,headers,body:body?JSON.stringify(body):undefined});
  let data;
  try { data = await response.json(); } catch { throw Error('服务返回了无效响应，请检查终端。'); }
  if(!response.ok){const error=Error(data.error||'操作失败');error.code=data.code;throw error;}
  return data;
}
function toast(text,error=false){
  const node = document.querySelector('#toast'); node.textContent=text; node.className='visible'+(error?' error':'');
  clearTimeout(toast.timer); toast.timer=setTimeout(()=>node.className='',5000);
}
async function refresh(){state=await api('/api/state');connectionStatus(remoteMode?'已同步到服务器':'已保存到本地');render();}
async function routineCommand(id,operation,data={}){return api('/api/commands','POST',{request_id:crypto.randomUUID(),actor:'user:web',reason:'调整 Routine 的未来规则',operation,entity:'routines',id,expected_revision:byId('routines',id).revision,data});}
function heading(tag,title,sub,actions=''){return `<div class="page-heading"><div><div class="eyebrow">${esc(tag)}</div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>${actions}</div>`;}
function taskRow(t){
  const project=byId('projects',t.project_id), done=t.status==='done';
  return `<div class="task-row ${done?'is-done':''}">${button(done?'✓':'',done?'task-reopen':'task-done','check '+(done?'done':''),t.id,`aria-label="${done?'重新打开':'完成任务'}：${esc(t.title)}"`)}<div class="task-body">${button(esc(t.title),'edit-task','task-title',t.id)}<div class="task-meta">${project?`<a href="#project/${project.id}">${esc(project.name)}</a>`:pill(t.status==='inbox'?'Inbox':'独立任务')}${areaName(t)?`<span>${esc(areaName(t))}</span>`:''}${t.due_date?`<span class="${t.due_date<localDate()&&!done?'overdue':''}">${dateText(t.due_date)}${t.due_date<localDate()&&!done?' · 已过期':''}</span>`:''}${blocked(t)?pill(t.blocker||'等待前置任务','red'):''}${t.minutes?`<span>${t.minutes} 分钟</span>`:''}${t.planned_date?`<span>计划 ${dateText(t.planned_date)}</span>`:''}</div></div><div class="task-tail">${!['done','cancelled'].includes(t.status)?button(t.planned_date===localDate()?'移出今日':'加入今日',t.planned_date===localDate()?'unplan-task':'plan-task','quiet small',t.id):''}${pill(labels[t.status])}${t.priority===1?'<span class="overdue">优先</span>':''}</div></div>`;
}
function taskBoard(tasks){
  const columns=['backlog','next','in_progress','waiting','done'];
  return `<p class="help board-help">拖动卡片改变状态；也可以使用卡片上的状态菜单。加入今日不改变截止日期。</p><div class="board-scroll"><div class="task-board">${columns.map(status=>{
    const cards=tasks.filter(t=>t.status===status||(status==='backlog'&&t.status==='inbox'));
    return `<section class="board-column" data-drop-status="${status}" aria-label="${labels[status]}列"><h3>${labels[status]} <span>${cards.length}</span></h3>${cards.map(t=>`<article class="board-card" data-task-id="${t.id}"><div class="drag-handle" draggable="true" data-task-id="${t.id}" aria-label="拖动任务：${esc(t.title)}" title="拖动改变状态">⋮⋮</div>${button(esc(t.title),'edit-task','task-title',t.id)}${blocked(t)?`<p class="help overdue">${esc(t.blocker||'等待前置任务')}</p>`:''}<div class="task-meta">${t.due_date?`<span>截止 ${dateText(t.due_date)}</span>`:''}${t.planned_date?pill('计划 '+dateText(t.planned_date),'accent'):''}</div><div class="board-controls"><select aria-label="${esc(t.title)}的状态" data-task-status="${t.id}">${columns.map(s=>`<option value="${s}" ${t.status===s?'selected':''}>${labels[s]}</option>`).join('')}</select>${!['done','cancelled'].includes(t.status)?button(t.planned_date===localDate()?'移出今日':'加入今日',t.planned_date===localDate()?'unplan-task':'plan-task','quiet small',t.id):''}</div></article>`).join('')||'<div class="board-empty">暂无任务</div>'}</section>`;
  }).join('')}</div></div>`;
}
function ruleHistory(r){
  const rules=(state.routine_rules||[]).filter(rule=>rule.routine_id===r.id).slice().reverse(), pending=rules.find(x=>x.status==='pending');
  return `${pending?`<div class="rule-pending"><strong>下周期将调整</strong><p>${routineFrequency(pending)} ${pending.target} 次 · ${esc(pending.timezone)}<br>${new Date(pending.effective_at).toLocaleString('zh-CN')} 生效（浏览器本地时间）</p>${button('取消这次调整','cancel-rule','small',r.id)}</div>`:''}<details><summary>规则版本 · ${rules.length}</summary>${rules.map(rule=>`<div class="activity"><span>v${rule.version} · ${{active:'当前',pending:'待生效',superseded:'历史',cancelled:'已撤回'}[rule.status]}</span><span>${routineFrequency(rule)} ${rule.target} 次 · ${esc(rule.timezone)}</span></div>`).join('')}</details>`;
}
function changeList(changes){
  return changes.filter(c=>!c.actor.startsWith('system:')).slice(0,15).map(c=>{
    const entity=c.after||c.before||{}, names=Object.keys(c.after||{}).filter(k=>JSON.stringify(c.before?.[k])!==JSON.stringify(c.after?.[k]));
    return `<article class="entry"><div class="entry-top">${pill(c.actor,c.actor.startsWith('agent:')?'accent':'')}<time>${new Date(c.created_at).toLocaleString('zh-CN')}</time></div><h3>${esc(entity.name||entity.title||c.entity)}</h3><p>${esc(c.reason)}</p><details><summary>${c.before?'变更字段：'+esc(names.join('、')):'新建记录'}</summary><pre class="change-json">${esc(JSON.stringify({before:c.before,after:c.after},null,2))}</pre></details></article>`;
  }).join('')||empty('还没有操作记录','由界面或 agent 更新后，来源与变更会显示在这里。');
}
async function moveTask(id,status,revision){
  if(busy)return;setBusy(true);
  try{
    await api('/api/commands','POST',{request_id:crypto.randomUUID(),actor:'user:web',reason:'在项目看板调整任务状态',operation:'update',entity:'tasks',id,expected_revision:revision||byId('tasks',id).revision,data:{status}});
    await refresh();toast('任务已移动');
  }catch(err){toast(err.message,true);await refresh();}
  finally{setBusy(false);}
}
document.addEventListener('change',event=>{if(event.target.matches('[data-task-status]'))moveTask(event.target.dataset.taskStatus,event.target.value);});
document.addEventListener('dragstart',event=>{
  const card=event.target.closest('[data-task-id]');if(!card||form||busy)return event.preventDefault();
  dragged={id:card.dataset.taskId,revision:byId('tasks',card.dataset.taskId).revision};
  event.dataTransfer.setData('text/plain',dragged.id);event.dataTransfer.effectAllowed='move';card.classList.add('dragging');
});
document.addEventListener('dragover',event=>{const column=event.target.closest('[data-drop-status]');if(column&&dragged){event.preventDefault();event.dataTransfer.dropEffect='move';}});
document.addEventListener('drop',event=>{const column=event.target.closest('[data-drop-status]');if(column&&dragged){event.preventDefault();const item=dragged;dragged=null;moveTask(item.id,column.dataset.dropStatus,item.revision);}});
document.addEventListener('dragend',()=>{dragged=null;document.querySelectorAll('.dragging').forEach(n=>n.classList.remove('dragging'));});
function currentOccurrences(r){return state.occurrences.filter(o=>o.routine_id===r.id && (r.frequency==='manual'?o.status==='pending':o.period_start===r.current_period));}
function pendingOccurrences(r){return state.occurrences.filter(o=>o.routine_id===r.id&&o.status==='pending'&&(!o.scheduled_date||o.scheduled_date<=r.local_date)).sort((a,b)=>a.period_start.localeCompare(b.period_start)||a.slot-b.slot);}
function routineRow(r,full=false){
  const current=currentOccurrences(r), done=current.filter(o=>o.status==='done').length, pending=pendingOccurrences(r), next=pending[0];
  const project=byId('projects',r.project_id), open=expanded.has(r.id);
  const progress = r.frequency==='manual'?'手动触发':`${routineFrequency(r)} ${r.target} 次`;
  const controls=r.status==='active'?`${r.frequency==='manual'?button('＋ 触发一次','trigger','small',r.id):''}${next?button('✓ 完成一次','occ-done','small',next.id):r.frequency!=='manual'?pill(done>=r.target?'本期完成':current.some(o=>o.status==='pending')?'已安排稍后':'本期已处理',done>=r.target?'green':''):''}${next?button('跳过','occ-skip','quiet small',next.id):''}`:pill(labels[r.status]);
  return `<div class="routine-row"><div class="routine-symbol">↻</div><div class="routine-body"><h3>${button(esc(r.name),'expand-routine','task-title',r.id,`aria-expanded="${open}"`)}</h3><p>${progress}${project?' · '+esc(project.name):areaName(r)?' · '+esc(areaName(r)):''}${r.minutes?' · '+r.minutes+' 分钟':''}</p>${r.frequency!=='manual'?`<div class="progress-dots" aria-label="本周期完成 ${done}/${r.target}">${Array.from({length:r.target},(_,i)=>`<i class="${current[i]?.status==='done'?'done':current[i]?.status==='skipped'?'skipped':''}"></i>`).join('')}</div>`:''}</div><div class="routine-actions">${r.frequency!=='manual'?`<span class="count">${done}<span class="muted">/${r.target}</span></span>`:''}${controls}${full?button(open?'收起':'详情','expand-routine','quiet small',r.id):''}</div></div>${open?routineDetail(r):''}`;
}
function routineDetail(r){
  const rows=state.occurrences.filter(o=>o.routine_id===r.id).slice().reverse();
  return `<div class="routine-detail"><p class="support-copy">${esc(r.purpose||'还没有填写目的。')}</p><div class="task-meta"><span>时区：${esc(r.timezone)}</span><span>负责人：${esc(r.owner||'未设置')}</span><span>${r.frequency!=='manual'?'下一周期：'+r.next_period:'按需手动触发'}</span><span>${r.carry_over?'保留未完成实例':'旧周期未完成项记为错过'}</span></div><div class="form-actions">${button('编辑说明','edit-routine','small',r.id)}${r.status!=='retired'?button('调整周期','edit-rule','small',r.id):''}${r.status==='active'?button('暂停 Routine','routine-pause','small',r.id):button('恢复 Routine','routine-resume','small',r.id)}${r.status!=='retired'?button('停用 Routine','routine-retire','quiet small',r.id):''}</div>${ruleHistory(r)}<p class="help">暂停或停用会跳过现有待执行实例；恢复后从当前周期继续，已跳过的本期实例保留。</p><details open><summary>执行历史 · ${rows.length} 条</summary>${rows.length?`<div class="break"><table class="history-table"><thead><tr><th>周期起点</th><th>状态</th><th>完成 / 延后</th><th>操作</th></tr></thead><tbody>${rows.slice(0,80).map(o=>`<tr><td>${o.period_start}</td><td>${labels[o.status]}</td><td>${o.completed_at?dateText(o.completed_at):o.scheduled_date||'—'}</td><td>${r.status==='active'&&o.status==='pending'?`${button('完成','occ-done','quiet small',o.id)}${button('延后','occ-defer','quiet small',o.id)}`:r.status==='active'&&['done','skipped'].includes(o.status)?button('撤销','occ-undo','quiet small',o.id):'—'}</td></tr>`).join('')}</tbody></table></div>`:empty('还没有执行记录','按需触发一次，开始记录。')}</details></div>`;
}
function today(){
  const day=localDate();
  const eligible=t=>activeProject(t)&&!blocked(t)&&!['done','cancelled','waiting','inbox'].includes(t.status);
  const tasks=state.tasks.filter(t=>eligible(t)&&t.planned_date===day).sort((a,b)=>a.priority-b.priority);
  const nextActions=state.tasks.filter(t=>eligible(t)&&['next','in_progress'].includes(t.status)&&t.planned_date!==day);
  const overdue=state.tasks.filter(t=>eligible(t)&&t.planned_date&&t.planned_date<day);
  const due=state.tasks.filter(t=>eligible(t)&&t.due_date&&t.due_date<=day&&t.planned_date!==day);
  const waiting=state.tasks.filter(t=>activeProject(t)&&!['done','cancelled','inbox'].includes(t.status)&&(t.status==='waiting'||blocked(t)));
  const routines=state.routines.filter(r=>r.status==='active'&&activeProject(r));
  const complete=state.tasks.filter(t=>t.status==='done'&&t.completed_at&&new Intl.DateTimeFormat('en-CA').format(new Date(t.completed_at))===day);
  const welcome=!state.projects.length&&!state.routines.length&&!state.tasks.length;
  return '<a class="chat-entry" href="#chat">◎ 和 Agent 聊聊 · 一起决定今天做什么 <span>开始晨间规划 ↗</span></a>'+heading('TODAY / 今日','把注意力留给下一步。','项目向目标推进，Routine 让日常持续。',`<div class="date-stamp">${new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'})}<span>${new Date().getFullYear()} · YOUR LOCAL TIME</span></div>`)+`<div class="today-grid"><div>${welcome?`<div class="empty large"><div class="empty-number">YOUR WORKSPACE, FROM ZERO</div><strong>从一件你想完成的事开始。</strong><p>创建一个有终点的项目，或先记录一个念头。这里没有预填的工作，只有你接下来要做的事。</p>${button('＋ 创建第一个项目','new-project','primary')} ${button('先记录一件事','new-task','quiet')}</div><div class="section"></div>`:''}${section('今天要做',tasks.length?tasks.map(taskRow).join(''):empty('今天的安排，还可以留白。','从下一步选择任务加入今日，也可以让 agent 安排。','new-task','＋ 添加任务'),String(tasks.length),button('＋ 添加','new-task','quiet small'))}${nextActions.length?section('可选择的下一步',nextActions.map(taskRow).join(''),String(nextActions.length)):''}${overdue.length?section('之前计划的任务',overdue.map(taskRow).join(''),'未自动搬到今天'):''}${due.length?section('已到截止日期',due.map(taskRow).join(''),'截止日期与计划日期分开'):''}${section('日常节奏',routines.length?routines.map(r=>routineRow(r)).join(''):empty('让重复发生的事，有自己的节奏。','每周阅读、运动或整理。完成本次，保留下次。','new-routine','＋ 创建 Routine'),String(routines.length),'<a class="muted small" href="#routines">全部 Routine ↗</a>')}${waiting.length?section('等待与阻塞',waiting.map(taskRow).join(''),String(waiting.length)):''}${complete.length?`<details><summary>今天已完成 · ${complete.length}</summary>${complete.map(taskRow).join('')}</details>`:''}</div><aside class="today-aside">${reminderPanel()}${calendarToday()}<div class="onboarding"><div class="eyebrow">WORK, WITH CONTEXT</div><h2>不同的事，各有归属。</h2><p>不用把所有事情都变成项目。</p><ol><li><div>Project · 项目<span>一个结果，多步推进，能够结束。</span></div></li><li><div>Routine · 例行事项<span>反复执行，维持你在意的日常。</span></div></li><li><div>Task · 一次性任务<span>一个具体动作，做完就结束。</span></div></li></ol></div><div class="aside-note">${state.projects.filter(p=>p.status==='active').length} 个进行中的项目<br>${state.tasks.filter(t=>t.status==='inbox').length} 件事等待整理<br><br>今日安排可由你或 agent 更新。<br>日历占用可在「日历」查看。</div></aside></div>`;
}
function projects(){
  const items=state.projects.filter(p=>filter==='all'||p.status===filter);
  return heading('PROJECTS / 项目','给想完成的事，一个位置。','从名字和工作目录开始，随工作推进逐步完善。',`<div class="heading-actions">${button('＋ 新建项目','new-project','primary')}</div>`)+tabs(['active','planned','paused','completed','cancelled','all'])+(items.length?`<div class="project-list-head"><span>项目 / 工作目录</span><span>状态</span><span class="project-progress">任务进度</span><span class="project-date">截止日期</span><span></span></div>${items.map(p=>{const tasks=state.tasks.filter(t=>t.project_id===p.id&&t.status!=='cancelled');return `<a class="project-row" href="#project/${p.id}"><div><h2>${esc(p.name)}</h2><p>${esc(p.directory||'尚未关联目录')}</p></div><div class="cell">${pill(labels[p.status],p.status==='active'?'accent':'')}</div><div class="cell project-progress">${tasks.filter(t=>t.status==='done').length} / ${tasks.length}</div><div class="cell project-date">${p.deadline?dateText(p.deadline):'—'}</div><span class="arrow">↗</span></a>`;}).join('')}`:empty(state.projects.length?'这里还没有项目。':'你的第一个项目，还未开始。','一个新研究、一篇论文，或者一次搬家。先起个名字，关联工作目录。','new-project','＋ 新建项目'));
}
function tabs(values){return `<div class="tabs" role="group" aria-label="状态筛选">${values.map(v=>button(v==='all'?'全部':labels[v],'filter',filter===v?'selected':'','',`data-value="${v}" aria-pressed="${filter===v}"`)).join('')}</div>`;}
function projectPage(id){
  const p=byId('projects',id);if(!p)return empty('项目不存在','返回项目列表查看。');
  const tasks=state.tasks.filter(t=>t.project_id===id), ms=state.milestones.filter(m=>m.project_id===id), entries=state.entries.filter(e=>e.project_id===id).reverse();
  const running=!['completed','cancelled'].includes(p.status);
  return `<a class="back-link" href="#projects">← 全部项目</a>`+heading('PROJECT / '+(byId('areas',p.area_id)?.name||'未设置领域'),p.name,p.directory,`<div class="heading-actions">${button('编辑项目','edit-project','',id)}</div>`)+`<div class="detail-layout"><div>${p.goal?`<div class="eyebrow">当前方向</div><p class="detail-summary">${esc(p.goal)}</p>`:''}${p.criteria?`<div class="eyebrow">SUCCESS CRITERIA</div><p class="detail-summary">${esc(p.criteria)}</p>`:''}${projectContextView(p)}${conversationInbox(p.id)}${section('任务',boardMode?taskBoard(tasks):tasks.filter(t=>!['done','cancelled'].includes(t.status)).map(taskRow).join('')||empty('把结果拆成下一步。','先添加一个可以执行的动作。'),`${tasks.filter(t=>t.status==='done').length}/${tasks.filter(t=>t.status!=='cancelled').length}`,button(boardMode?'列表':'看板','toggle-board','quiet small')+(running?button('＋ 添加任务','new-project-task','quiet small',id):''))}${!boardMode&&tasks.some(t=>['done','cancelled'].includes(t.status))?`<details class="section"><summary>已结束的任务</summary>${tasks.filter(t=>['done','cancelled'].includes(t.status)).map(taskRow).join('')}</details>`:''}${section('里程碑',ms.length?ms.map(m=>`<div class="task-row">${button(m.status==='done'?'✓':'','milestone-toggle','check '+(m.status==='done'?'done':''),m.id,`aria-label="${m.status==='done'?'重新打开':'完成里程碑'}：${esc(m.title)}"`)}<div class="task-body"><span>${esc(m.title)}</span>${m.due_date?`<div class="task-meta">${dateText(m.due_date)}</div>`:''}</div>${pill(labels[m.status])}</div>`).join(''):empty('标记重要的阶段成果。','里程碑帮助你判断项目推进到哪里。'),'',running?button('＋ 添加','new-milestone','quiet small',id):'')}${section('关联日程',calendarRows(liveEvents().filter(e=>e.project_id===id))||empty('还没有关联日程','可以让 agent 将会议关联到这个项目。'))}${section('资料与思考',entries.length?entries.map(entryRow).join(''):empty('把工作过程留在项目里。','添加资料、笔记、开放问题或决策。'),'',running?button('＋ 添加记录','new-entry','quiet small',id):'')}${section('关联的 Routine',state.routines.filter(r=>r.project_id===id).map(r=>routineRow(r,true)).join('')||empty('这里还没有例行事项。','例如每周复盘这个项目。'),'',running?button('＋ 创建','new-project-routine','quiet small',id):'')}<details><summary>活动记录</summary>${state.activity.filter(a=>a.project_id===id).slice(-25).reverse().map(a=>`<div class="activity"><time>${dateText(a.created_at)}</time><span>${esc(a.text)}</span></div>`).join('')}</details></div><aside class="detail-aside"><h3>项目属性</h3><dl class="properties"><dt>状态</dt><dd>${pill(labels[p.status],'accent')}</dd><dt>优先级</dt><dd>${['','高','普通','低'][p.priority]}</dd><dt>领域</dt><dd>${esc(byId('areas',p.area_id)?.name||'未设置')}</dd><dt>目标日期</dt><dd>${p.target_date||'未设置'}</dd><dt>硬截止日期</dt><dd>${p.deadline||'未设置'}</dd></dl>${running?button('结束项目…','close-project','',id):button('重新启用项目','reopen-project','',id)}</aside></div>`;
}
function entryRow(e){return `<article class="entry"><div class="entry-top">${pill(kinds[e.kind])}<time>${dateText(e.created_at)}</time></div><h3>${esc(e.title)} ${e.kind==='question'&&e.status==='resolved'?pill('已解决','green'):''}</h3>${e.body?`<p>${esc(e.body)}</p>`:''}${e.url?(e.url.startsWith('http')?`<a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.url)} ↗</a>`:`<p>本地资料：${esc(e.url)}</p>`):''}${e.kind==='question'?button(e.status==='open'?'标记已解决':'重新打开','question-toggle','quiet small',e.id):''}</article>`;}
const providerName = p => p==='google'?'Google Calendar':'Outlook Calendar';
function sourceStatus(s){
  if(!s)return '待连接';
  if(s.status==='auth_required')return '需要重新授权';
  if(s.status==='error')return '同步失败 · 保留上次日程';
  if(s.status!=='synced')return '待连接';
  return Date.now()-Date.parse(s.observed_at)>15*60*1000?'等待 agent 更新':'已同步';
}
let calendarAnchor=new Date(),calendarMode='week';
const calendarKinds={meeting:'会议',work:'工作',personal:'个人',other:'未分类'};
const liveEvents=()=> (state.calendar_events||[]).filter(e=>!e.all_day&&e.remote_status==='active');
function calendarRows(events){
  return events.map(e=>`<div class="calendar-event"><div class="task-meta">${new Date(e.start).toLocaleString('zh-CN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${e.busy?'占用':'空闲'}</div><strong><a href="#calendar/${e.id}">${esc(e.title)}</a></strong><div class="task-meta">${esc(byId('projects',e.project_id)?.name||'未关联项目')}</div></div>`).join('');
}
function calendarToday(day=localDate()){
  const a=new Date(day+'T00:00:00');const b=new Date(a);b.setDate(b.getDate()+1);
  const events=liveEvents().filter(e=>Date.parse(e.start)<+b&&Date.parse(e.end)>+a).sort((x,y)=>x.start.localeCompare(y.start));
  return `<section class="calendar-today"><div class="section-head"><h2>${day===localDate()?'今日日程':esc(dateText(day))+' 日程'}</h2><a href="#calendar" class="small right">全部 ↗</a></div>${events.length?calendarRows(events):'<p class="muted">暂无已同步的定时日程。</p>'}<p class="help">已忽略全天事件。</p></section>`;
}
function calendarEditor(){
  if(form?.type!=='calendar-event')return '';
  const e=byId('calendar_events',form.id);if(!e)return '';
  const src=state.calendar_sources.find(s=>s.id===e.source_id);
  return `<aside class="event-inspector"><form id="editor"><div class="section-head"><span class="eyebrow">EVENT / 本地记录</span>${button('关闭','cancel-form','quiet small')}</div><h2>${esc(e.title)}</h2><p class="event-time">${new Date(e.start).toLocaleString('zh-CN')}<br>至 ${new Date(e.end).toLocaleString('zh-CN')}</p><p class="help">${esc(src?.name)} · ${e.busy?'占用':'空闲'}${e.tentative?' · 待确认':''}</p>${e.remote_status!=='active'?'<p class="help">此事件当前未在同步范围内出现，本地关联仍保留。</p>':''}<div class="form-grid">${field('所属项目','project_id',e.project_id,'text',{full:true,choices:[['','暂不关联'],...state.projects.map(p=>[p.id,p.name])]})}${field('事件类型','kind',e.kind,'text',{full:true,choices:Object.entries(calendarKinds)})}${field('本地备注','notes',e.notes,'textarea',{full:true,placeholder:'议题、准备事项或会后记录'})}</div><div class="form-error" role="alert"></div><button type="submit" class="primary">保存关联</button><p class="help">项目与备注保存在本地，日历同步会保留。</p>${e.url?`<a class="event-source-link" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">在 ${providerName(src?.provider)} 打开 ↗</a>`:''}<details><summary>记录标识</summary><p class="help event-id">${esc(e.external_id)}</p></details></form></aside>`;
}
function calendarDays(){
  const start=new Date(calendarAnchor);start.setHours(0,0,0,0);
  if(calendarMode==='week')start.setDate(start.getDate()-(start.getDay()+6)%7);
  return Array.from({length:calendarMode==='week'?7:1},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;});
}
// Split cross-midnight events and assign overlapping events to parallel lanes per day.
function dayLayout(day){
  const end=new Date(day);end.setDate(end.getDate()+1);
  const mins=d=>d.getHours()*60+d.getMinutes()+d.getSeconds()/60;
  const items=liveEvents().filter(e=>Date.parse(e.start)<+end&&Date.parse(e.end)>+day).map(e=>{
    const start=new Date(e.start),finish=new Date(e.end);
    const top=+start<+day?0:mins(start),bottom=+finish>=+end?1440:mins(finish);
    return {e,top,bottom:Math.max(top+18,bottom),lane:0,lanes:1};
  }).sort((a,b)=>a.top-b.top||b.bottom-a.bottom);
  let group=[],groupEnd=-1;
  const assign=()=>{const ends=[];for(const item of group){let lane=ends.findIndex(end=>end<=item.top);if(lane<0)lane=ends.length;ends[lane]=item.bottom;item.lane=lane;}for(const item of group)item.lanes=ends.length;};
  for(const item of items){if(item.top>=groupEnd){assign();group=[];groupEnd=-1;}group.push(item);groupEnd=Math.max(groupEnd,item.bottom);}assign();return items;
}
function calendar(){
  const days=calendarDays(),first=days[0],last=days[days.length-1];
  const range=calendarMode==='registry'?'事件记录':first.toLocaleDateString('zh-CN',{year:'numeric',month:'numeric'})+(first.getMonth()!==last.getMonth()?' — '+last.toLocaleDateString('zh-CN',{month:'numeric'}):'');
  const sources=state.calendar_sources||[];
  const controls=`<div class="calendar-toolbar"><div class="calendar-title"><span class="eyebrow">CALENDAR</span><h1>${range}</h1></div><div class="calendar-navigation">${button('今天','calendar-today','small')}${button('‹','calendar-prev','small','','aria-label="上一页日历"')}${button('›','calendar-next','small','','aria-label="下一页日历"')}</div><div class="calendar-modes" role="group" aria-label="日历视图">${[['week','周'],['day','日'],['registry','记录']].map(([mode,title])=>button(title,'calendar-mode',calendarMode===mode?'selected':'',mode,`aria-pressed="${calendarMode===mode}"`)).join('')}</div></div>`;
  const status=`<div class="calendar-statusbar"><span>${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)} · 忽略全天事件</span><details class="calendar-connections"><summary>日历来源 · ${sources.length}</summary><div>${['google','outlook'].map(provider=>`<section><h3>${providerName(provider)}</h3>${sources.filter(s=>s.provider===provider).map(s=>`<p>${esc(s.name)} · ${sourceStatus(s)}</p><small>${s.synced_at?'最近同步 '+new Date(s.synced_at).toLocaleString('zh-CN'):'等待授权'}${s.window_start?'<br>覆盖 '+dateText(s.window_start)+' — '+dateText(s.window_end):''}</small>`).join('')||'<p>待连接</p>'}</section>`).join('')}</div></details></div>`;
  let body;
  if(calendarMode==='registry'){
    const records=(state.calendar_events||[]).filter(e=>!e.all_day).sort((a,b)=>b.start.localeCompare(a.start));
    body=`<div class="event-registry"><table><thead><tr><th>事件 / 时间</th><th>项目</th><th>类型</th><th>同步状态</th></tr></thead><tbody>${records.map(e=>`<tr><td>${button(esc(e.title),'edit-calendar-event','quiet',e.id)}<div class="help">${new Date(e.start).toLocaleString('zh-CN')}</div></td><td>${esc(byId('projects',e.project_id)?.name||'未关联')}</td><td>${calendarKinds[e.kind]}</td><td>${{active:'已同步',missing:'本轮未出现',out_of_window:'范围外'}[e.remote_status]}</td></tr>`).join('')}</tbody></table>${records.length?'':empty('还没有事件记录','同步定时日程后，会在这里建立本地记录。')}</div>`;
  }else{
    const header=`<div class="week-header ${calendarMode}"><div class="time-zone-label">GMT${-new Date().getTimezoneOffset()/60>=0?'+':''}${-new Date().getTimezoneOffset()/60}</div>${days.map(d=>`<div class="day-heading ${d.toDateString()===new Date().toDateString()?'is-today':''}"><span>${d.toLocaleDateString('zh-CN',{weekday:'short'})}</span><button data-action="calendar-date" data-id="${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}" aria-label="查看 ${d.toLocaleDateString('zh-CN')}">${d.getDate()}</button></div>`).join('')}</div>`;
    body=`<div class="week-scroll" tabindex="0" aria-label="日历时间网格"><div class="week-canvas ${calendarMode}">${header}<div class="week-body ${calendarMode}"><div class="hour-ruler">${Array.from({length:24},(_,h)=>`<span data-y="${h*56}">${String(h).padStart(2,'0')}:00</span>`).join('')}</div>${days.map(d=>{
      const next=new Date(d);next.setDate(next.getDate()+1);
      const covered=sources.length&&sources.every(s=>s.window_start&&Date.parse(s.window_start)<=+d&&Date.parse(s.window_end)>=+next);
      return `<div class="day-column ${covered?'':'uncovered'}" aria-label="${d.toLocaleDateString('zh-CN')}">${!covered?'<span class="coverage-note">未同步</span>':''}${dayLayout(d).map(({e,top,bottom,lane,lanes})=>`<button class="week-event ${e.project_id?'linked':''} ${e.busy?'':'free'} ${bottom-top<40?'short':''}" data-action="edit-calendar-event" data-id="${e.id}" data-y="${top/60*56}" data-height="${(bottom-top)/60*56-1}" data-left="${lane/lanes*100}" data-width="${100/lanes}" aria-label="${esc(e.title)}，${new Date(e.start).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}"><strong>${esc(e.title)}</strong><span>${new Date(e.start).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}–${new Date(e.end).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</span>${e.project_id?`<small>${esc(byId('projects',e.project_id)?.name)}</small>`:''}</button>`).join('')}${d.toDateString()===new Date().toDateString()?`<div class="now-line" data-y="${(new Date().getHours()+new Date().getMinutes()/60)*56}"></div>`:''}</div>`;
    }).join('')}</div></div></div>`;
  }
  return `<div class="calendar-workspace">${controls}${status}<div class="calendar-content ${form?.type==='calendar-event'?'with-inspector':''}"><div class="calendar-view">${body}</div>${calendarEditor()}</div></div>`;
}
function routines(){const items=state.routines.filter(r=>filter==='all'||r.status===filter);return heading('ROUTINES / 例行事项','重复发生，也值得被认真记录。','完成的是本次执行，延续的是你的节奏。',`<div class="heading-actions">${button('＋ 创建 Routine','new-routine','primary')}</div>`)+tabs(['active','paused','retired','all'])+(items.length?items.map(r=>routineRow(r,true)).join(''):empty('从一个你想持续的习惯开始。','每天一次、每周三次，或在需要的时候手动触发。','new-routine','＋ 创建 Routine'));}
function inbox(){const tasks=state.tasks.filter(t=>t.status==='inbox');return heading('UNASSIGNED / 待归属','把讨论放回项目。','这里只暂存归属尚不明确的摘要。',`<div class="heading-actions">${button('随手记','new-capture','primary')} ${button('＋ 快速任务','new-task','')}</div>`)+captureInbox()+section('等待整理',tasks.length?tasks.map(taskRow).join(''):empty('收件箱是空的。','按 N 记录一个念头；点击条目，可以归属到项目或设为独立任务。'),String(tasks.length))+section('独立任务',state.tasks.filter(t=>!t.project_id&&!['inbox','done','cancelled'].includes(t.status)).map(taskRow).join('')||empty('小事不需要一个大项目。','买东西、发材料，都可以直接作为任务。'))+`<details><summary>已完成的独立任务</summary>${state.tasks.filter(t=>!t.project_id&&['done','cancelled'].includes(t.status)).map(taskRow).join('')||empty('还没有记录','完成任务后会保留在这里。')}</details>`;}
function settings(){return heading('WORKSPACE / 设置','领域与数据','保持简单，也保持可追溯。')+section('责任领域',state.areas.map(a=>`<div class="area-row"><span class="area-name">${esc(a.name)} ${a.status==='retired'?pill('已停用'):''}</span>${button('改名','rename-area','quiet small',a.id)}${button(a.status==='active'?'停用':'恢复','toggle-area','quiet small',a.id)}</div>`).join('')||empty('领域是归类，不是待办。','按需要创建 Research、Home 或其他领域；无需一次建全。'),'',button('＋ 新建领域','new-area','small'))+wechatSources()+section('本地数据',`<p class="support-copy">工作空间保存在这台电脑的 SQLite 文件中。旧工作样本不会自动导入。创建备份会在本地保存一份独立副本。</p>${button('创建数据备份','backup','')}<p class="help">恢复方式见项目 README；请先停止服务。恢复前会自动备份当前数据。</p>`)+section('最近的更新',changeList(state.changes||[]))+section('关于工作空间',`<p class="support-copy">支持界面与本地 agent 共同更新项目、任务、Routine 和项目记录。通讯与日历接入将在后续加入。</p><p class="support-copy">Routine 规则调整在下个周期生效，已完成的历史记录保留。每周从周一开始，每月从 1 日开始。</p>`);}

function field(label,name,value='',type='text',options={}){
  const full=options.full?' full':'';
  let input;
  if(options.choices)input=`<select name="${name}" ${options.required?'required':''}>${options.choices.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
  else if(type==='textarea') input=`<textarea name="${name}" ${options.required?'required':''} placeholder="${esc(options.placeholder||'')}" maxlength="20000">${esc(value)}</textarea>`;
  else input=`<input name="${name}" type="${type}" value="${esc(value)}" ${options.required?'required':''} ${options.min?`min="${options.min}"`:''} ${options.max?`max="${options.max}"`:''} ${type==='text'?'maxlength="500"':''} placeholder="${esc(options.placeholder||'')}" autocomplete="off">`;
  input=input.replace(/^<(input|select|textarea)/, `<$1 aria-labelledby="label-${name}"`);
  return `<label class="field${full}"><span id="label-${name}">${label}${options.required?' *':''}</span>${input}${options.help?`<small class="help">${esc(options.help)}</small>`:''}</label>`;
}
const areaChoices=()=>[['','暂不设置'],...state.areas.filter(a=>a.status==='active').map(a=>[a.id,a.name])];
const projectChoices=(selected)=>[['','独立任务 / 无项目'],...state.projects.filter(p=>p.id===selected||!['completed','cancelled'].includes(p.status)).map(p=>[p.id,p.name])];
const priorities=[['1','高'],['2','普通'],['3','低']];
function formView(){
  if(!form||form.type==='calendar-event')return '';
  const {type,id,projectId}=form; let title='',description='',fields='',submit='保存';
  if(type==='capture'){
    title='随手记';description='先接住这件事，之后再决定要不要做、属于哪里。';
    fields=field('一句话记下','title','','text',{required:true,full:true})+field('内容或链接','body','','textarea',{full:true});
  }else if(type==='confirm-candidate'){
    const c=byId('inbox_candidates',id),i=byId('inbox_items',c.inbox_item_id);title='确认待处理事项';description='先核对责任和范围，再加入任务。日期留空也可以。';submit='确认并加入任务';
    fields=`<blockquote class="candidate-evidence">${esc(c.evidence)}</blockquote><p class="help">${esc(byId('capture_sources',i.source_id)?.name||'随手记')} · ${esc(i.sender)}</p>`+field('要跟进什么','title',c.title,'text',{required:true,full:true})+field('这件事属于','kind',c.kind==='clarify'?'':c.kind,'text',{required:true,choices:[['','请选择责任'],['request','别人找我办的事'],['commitment','我答应的事'],['waiting','等待对方']]})+field('所属项目','project_id',c.project_id,'text',{choices:projectChoices(c.project_id)})+field('计划日期','planned_date','','date')+field('截止日期','due_date','','date');
  }else if(type==='reminder-settings'){
    const p=state.reminders.preferences;title='提醒设置';description='在今日页和聊天旁显示提醒。静默期间收起提醒，稍后仍可查看。';
    fields=field('晚间护理时间','routine_time',p.routine_time||'','time',{help:'只提醒已选护理项目；清空可关闭。'})+field('提醒','enabled',String(p.enabled),'text',{choices:[['1','开启'],['0','关闭']]})+field('时区','timezone',p.timezone,'text',{required:true})+field('静默开始','quiet_start',p.quiet_start,'time')+field('静默结束','quiet_end',p.quiet_end,'time')+field('会议前多少分钟','meeting_lead_minutes',p.meeting_lead_minutes,'number',{min:1,max:1440})+field('等待多少天后跟进','waiting_days',p.waiting_days,'number',{min:1,max:365});
  }else if(type==='file-capture'){
    const i=byId('inbox_items',id);title='整理为任务';description='确认这是你要做的事。原文和来源会保留。';
    fields=field('任务名称','title',i.title,'text',{required:true,full:true})+field('所属项目','project_id',i.project_id,'text',{choices:[['','独立任务'],...state.projects.filter(p=>p.status==='active').map(p=>[p.id,p.name])]});
  }else if(type==='context'){
    const c=id?byId('project_contexts',id):{};title='项目上下文';description='当前 plan 可以持续修订；只读取你选择的项目内文件。';
    fields=field('当前 plan','plan',c.plan,'textarea',{full:true})+field('上下文文件（每行一个相对路径）','context_files',c.context_files,'textarea',{full:true,placeholder:'ROADMAP.md\ndocs/jarvis_handoff.md'})+field('检查间隔（分钟，0 为关闭）','check_interval_minutes',c.check_interval_minutes||0,'number',{min:0,max:10080});
  }else if(type==='project'){
    const p=id?byId('projects',id):{}; title=id?'编辑项目':'新建项目';description='先给项目一个名字，关联工作目录。其他信息可以在与 agent 的讨论中逐步明确。';
    fields=field('项目名称','name',p.name,'text',{required:true,placeholder:'例如：新的研究项目',full:true})+field('工作目录','directory',p.directory,'text',{full:true,placeholder:'/Users/lrz/my-project',help:'可先留空，支持绝对路径或 ~/。这里只关联目录，不会创建文件夹。'});
  }else if(type==='task'){
    const t=id?byId('tasks',id):{project_id:projectId,status:projectId?'next':'inbox'};
    title=id?'整理任务':'快速记录';description='一次具体动作。可以属于项目，也可以独立完成。';
    fields=field('要做什么','title',t.title,'text',{required:true,full:true,placeholder:'先把想到的事情记下来…'})+field('所属项目','project_id',t.project_id,'text',{choices:projectChoices(t.project_id)})+field('领域（独立任务）','area_id',t.area_id,'text',{choices:areaChoices(),help:'属于项目时继承项目领域。'})+field('状态','status',t.status,'text',{choices:(id?['inbox','backlog','next','in_progress','waiting','done','cancelled']:['inbox','next','backlog']).map(s=>[s,labels[s]])})+field('优先级','priority',t.priority||2,'text',{choices:priorities})+field('计划哪天做','planned_date',t.planned_date,'date')+field('截止日期','due_date',t.due_date,'date')+field('预计分钟','minutes',t.minutes,'number',{min:1,max:1440})+(id?field('里程碑','milestone_id',t.milestone_id,'text',{choices:[['','无'],...state.milestones.filter(m=>m.project_id===t.project_id).map(m=>[m.id,m.title])]})+field('前置任务','depends_on',t.depends_on,'text',{choices:[['','无'],...state.tasks.filter(x=>x.id!==id&&!['cancelled'].includes(x.status)).map(x=>[x.id,x.title])]})+field('阻塞原因','blocker',t.blocker,'text',{full:true,help:'解除阻塞后清空此字段，再开始或完成任务。'}):'');
  }else if(type==='rule'){
    const r=byId('routines',id), pending=state.routine_rules.find(x=>x.routine_id===id&&x.status==='pending'), value=pending||r;
    title='调整 Routine 周期';description='从当前规则的下个周期开始生效；当前实例与历史记录不变。已有待生效修改会被新版本替代。';submit='安排下周期规则';
    fields=field('重复周期','frequency',value.frequency,'text',{choices:Object.entries(frequency)})+field('天数间隔（按天重复）','interval_days',value.interval_days||1,'number',{required:true,min:1,max:365})+field('每周期次数','target',value.target,'number',{required:true,min:1,max:31})+field('时区','timezone',value.timezone,'text',{required:true,full:true})+`<label class="checkbox-field field full"><input type="checkbox" name="carry_over" ${value.carry_over?'checked':''}>保留旧周期未完成实例</label>`;
  }else if(type==='routine-edit'){
    const r=byId('routines',id);title='编辑 Routine';description='修改说明与预计时长；周期和历史执行记录保持不变。';
    fields=field('名称','name',r.name,'text',{required:true,full:true})+field('目的','purpose',r.purpose,'textarea',{full:true})+field('负责人','owner',r.owner)+field('预计每次分钟','minutes',r.minutes,'number',{min:1,max:1440});
  }else if(type==='routine'){
    title='创建 Routine';description='设定规则，分别记录每次执行。今天开始，不回填过去。';submit='创建 Routine';
    fields=field('名称','name','','text',{required:true,full:true,placeholder:'例如：读论文、运动、每月整理材料'})+field('目的','purpose','','text',{full:true})+field('重复周期','frequency','weekly','text',{choices:Object.entries(frequency),help:'每周从周一开始，每月从 1 日开始。'})+field('天数间隔（按天重复）','interval_days',1,'number',{required:true,min:1,max:365})+field('每周期次数','target',1,'number',{required:true,min:1,max:31,help:'例如每周 3 次；手动触发每次生成一个实例。'})+field('关联项目（可选）','project_id',projectId,'text',{choices:projectChoices()})+field('领域','area_id','','text',{choices:areaChoices()})+field('负责人','owner')+field('预计每次分钟','minutes','','number',{min:1,max:1440})+field('时区','timezone',Intl.DateTimeFormat().resolvedOptions().timeZone,'text',{required:true,full:true})+`<label class="checkbox-field field full"><input type="checkbox" name="carry_over">保留旧周期的未完成实例（默认只显示当前周期）</label>`;
  }else if(type==='entry'){
    title='添加项目记录';description='留下资料、判断与理由，方便以后回看。';
    fields=field('类型','kind','note','text',{choices:Object.entries(kinds)})+field('标题','title','','text',{required:true})+field('内容 / 决策理由','body','','textarea',{full:true})+field('资料链接或本地路径','url','','text',{full:true,placeholder:'https://… 或 /Users/…'});
  }else if(type==='milestone'){
    title='添加里程碑';description='描述一个阶段性成果。';fields=field('里程碑','title','','text',{required:true})+field('目标日期','due_date','','date');
  }else if(type==='area'){
    title=id?'修改领域':'新建领域';description='一个长期责任范围，用于归类。';fields=field('名称','name',id?byId('areas',id).name:'','text',{required:true,full:true});
  }else if(type==='defer'){
    title='延后这次执行';description='只调整这个实例，重复规则保持不变。';fields=field('执行日期','scheduled_date',localDate(),'date',{required:true,min:localDate(),full:true});
  }else if(type==='close'){
    title='结束项目';description='完成项目需要先处理未完任务和里程碑。取消会取消剩余任务，历史记录仍会保留。';
    fields=field('结束方式','status','completed','text',{choices:[['completed','完成项目'],['cancelled','取消项目']]})+field('关联 Routine','routine_action','','text',{choices:[['','请选择处理方式'],['retire','结束这些 Routine'],['detach','转为独立 Routine，继续保留']]})+`<label class="checkbox-field field full"><input type="checkbox" name="task_action" value="cancel">如取消项目，同时取消剩余任务</label>`;submit='确认结束';
  }
  return `<form id="editor" class="form-panel"><h2>${title}</h2><p class="form-description">${description}</p><div class="form-grid">${fields}</div><div class="form-actions"><span class="form-error" role="alert"></span>${button('取消','cancel-form','quiet')}<button type="submit" class="primary">${submit}</button></div></form>`;
}

function render(){
  renderedDay=localDate();renderedMinute=Math.floor(Date.now()/60000);
  const [route,id]=path(), name={more:'更多',notifications:'通知',records:'记忆与运行',chat:'和 Agent 聊聊',today:'今日',projects:'项目',project:'项目详情',routines:'Routine',inbox:'待归属',settings:'领域与数据',calendar:'日历'}[route]||'今日';
  document.title=`${name} · JARVIS`;
  document.querySelector('#breadcrumb').textContent='工作空间 / '+name;
  document.querySelector('#nav').innerHTML=[['chat','和 Agent 聊聊'],['today','今日'],['projects','项目'],['routines','Routine'],['inbox','待归属'],['calendar','日历'],['records','记忆与运行'],['notifications','通知']].map(([key,label])=>{
    const count=key==='projects'?state.projects.filter(p=>p.status==='active').length:key==='routines'?state.routines.filter(r=>r.status==='active').length:key==='inbox'?state.tasks.filter(t=>t.status==='inbox').length+(state.inbox_items||[]).filter(i=>!i.source_id&&i.status==='new').length+(state.conversation_windows||[]).filter(g=>g.summary&&!g.ignored&&!g.summary.project_id&&g.summary.signal!=='chatter').length:'';
    const selected=route===key||route==='project'&&key==='projects';
    return `<a href="#${key}" class="nav-item ${selected?'active':''}" ${selected?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">${icons[key]}</span><span>${label}</span><span class="nav-count">${count}</span></a>`;
  }).join('');
  if(initialRoute){initialRoute=false;if(route==='chat'&&/^\d{4}-\d{2}-\d{2}$/.test(id||''))chatDay=id;if(route==='calendar'&&id){const e=byId('calendar_events',id);if(e){form={type:'calendar-event',id};calendarAnchor=new Date(e.start);}}}
  const views={notifications:notificationView,records,chat,today,projects,routines,inbox,settings,calendar,project:()=>projectPage(id)};
  const mobile=mobileViews({state,esc,button,section,empty,taskRow,routineRow,calendarEditor,byId,localDate,dateText,activeProject,blocked,liveEvents,filter,tabs,projectPage,form,calendarAnchor,sourceStatus});
  views.more=mobile.more;
  if(phoneMode()){Object.assign(views,mobile);views.project=()=>mobile.project(id);}
  phoneNav.innerHTML=mobileNavigation(['today','calendar','chat'].includes(route)?route:'more');
  document.body.classList.toggle('mobile-editing',phoneMode()&&Boolean(form));
  const opened=[...main.querySelectorAll('details[data-mobile-section][open]')].map(el=>el.dataset.mobileSection);
  const previousScroll=document.querySelector('.week-scroll');
  const scroll=previousScroll?{top:previousScroll.scrollTop,left:previousScroll.scrollLeft}:null;
  main.classList.toggle('calendar-main',route==='calendar');
  main.innerHTML=formView()+(phoneMode()&&form&&form.type!=='calendar-event'?'':(views[route]||today)());
  for(const el of main.querySelectorAll('details[data-mobile-section]'))if(opened.includes(el.dataset.mobileSection))el.open=true;
  for(const el of main.querySelectorAll('[data-y]')){
    el.style.top=el.dataset.y+'px';
    if(el.dataset.height)el.style.height=el.dataset.height+'px';
    if(el.dataset.left)el.style.left='calc('+el.dataset.left+'% + 2px)';
    if(el.dataset.width)el.style.width='calc('+el.dataset.width+'% - 4px)';
  }
  const weekScroll=document.querySelector('.week-scroll');
  if(weekScroll){weekScroll.scrollTop=scroll?.top??(8*56);weekScroll.scrollLeft=scroll?.left??0;}
  const editor=document.querySelector('#editor');if(editor)editor.addEventListener('submit',submitForm);
  if(phoneMode()&&editor&&['task','project'].includes(form?.type)){
    const grid=editor.querySelector('.form-grid'), primary=new Set(form.type==='task'?['title','project_id','planned_date','due_date','status']:['name']);
    const extra=[...grid.children].filter(el=>el.querySelector('[name]')&&!primary.has(el.querySelector('[name]').name));
    if(extra.length){const details=document.createElement('details');details.className='phone-fold';details.innerHTML='<summary>更多属性</summary><div class="form-grid"></div>';extra.forEach(el=>details.lastElementChild.append(el));grid.after(details);}
  }
  setBusy(busy);
  bindChat();
  const enteredNotifications=route==='notifications'&&lastRenderedRoute!==route;
  lastRenderedRoute=route;
  if(enteredNotifications)loadNotifications(api,()=>{if(path()[0]==='notifications'&&!form)render();});
}
function openForm(next){form=next;render();main.scrollIntoView({block:'start'});document.querySelector('#editor input, #editor select')?.focus();}
async function submitForm(event){
  event.preventDefault(); if(busy)return;setBusy(true);
  const element=event.currentTarget, savedForm={...form}; const data=Object.fromEntries(new FormData(element));
  if(['routine','rule'].includes(savedForm.type))data.carry_over=Boolean(data.carry_over);
  if(['entry','milestone'].includes(savedForm.type))data.project_id=savedForm.projectId;
  if(savedForm.type==='context'){data.status='active';data.project_id=savedForm.projectId;data.check_interval_minutes=Number(data.check_interval_minutes);}
  if(savedForm.type==='reminder-settings'){for(const k of ['enabled','meeting_lead_minutes','waiting_days'])data[k]=Number(data[k]);}
  if(savedForm.type==='task'&&(data.project_id||data.area_id)&&data.status==='inbox')data.status='next';
  if(savedForm.type==='task'&&savedForm.id&&data.project_id!==byId('tasks',savedForm.id).project_id)data.milestone_id='';
  const entity={capture:'inbox_items',context:'project_contexts',project:'projects',task:'tasks',routine:'routines','routine-edit':'routines',entry:'entries',milestone:'milestones',area:'areas',defer:'occurrences',close:'projects','calendar-event':'calendar_events'}[savedForm.type];
  const submit=element.querySelector('[type=submit]');submit.disabled=true;
  try{
    const result=savedForm.type==='reminder-settings'?await api('/api/reminder_preferences'+(savedForm.id?'/'+savedForm.id:''),savedForm.id?'PATCH':'POST',data):savedForm.type==='confirm-candidate'?await api('/api/inbox/confirm','POST',{...data,id:savedForm.id,request_id:crypto.randomUUID(),expected_revision:byId('inbox_candidates',savedForm.id).revision}):savedForm.type==='file-capture'?await api('/api/inbox/file','POST',{...data,id:savedForm.id,request_id:crypto.randomUUID(),expected_revision:byId('inbox_items',savedForm.id).revision}):savedForm.type==='rule'?await routineCommand(savedForm.id,'schedule_rule',data):await api('/api/'+entity+(savedForm.id?'/'+savedForm.id:''),savedForm.id?'PATCH':'POST',data);
    form=null; await refresh();
    if(savedForm.type==='project'&&!savedForm.id)location.hash='project/'+result.id;
    toast('已保存');
  }catch(err){element.querySelector('.form-error').textContent=err.message;submit.disabled=false;if(err.code==='conflict'){element.querySelector('.form-error').textContent+='。草稿仍在；请取消后重新打开记录核对。';}}
  finally{setBusy(false);}
}
document.addEventListener('click',async event=>{
  const node=event.target.closest('[data-action]');if(!node||busy)return;
  // All non-submit buttons have explicit action semantics.
  event.preventDefault(); const action=node.dataset.action,id=node.dataset.id;
  if(!state){if(action==='retry')refresh().catch(err=>toast(err.message,true));else toast('请先连接工作空间',true);return;}
  if(action==='conversation-chatter')return; // Handled by the conversation command listener.
  if(action==='confirm-candidate')return openForm({type:'confirm-candidate',id});
  if(action==='phone-day-prev'||action==='phone-day-next'){calendarAnchor.setDate(calendarAnchor.getDate()+(action==='phone-day-next'?1:-1));return render();}
  if(action==='file-capture'){
    const candidate=state.inbox_candidates?.find(c=>c.inbox_item_id===id&&c.status==='proposed');
    if(candidate)return openForm({type:'confirm-candidate',id:candidate.id});
  }
  if(action==='reminder-settings')return openForm({type:'reminder-settings',id:state.reminders.preferences.id});
  const opens={'new-capture':{type:'capture'},'file-capture':{type:'file-capture',id},'edit-context':{type:'context',projectId:id,id:state.project_contexts?.find(c=>c.project_id===id)?.id},'edit-calendar-event':{type:'calendar-event',id},'new-task':{type:'task'},'new-project':{type:'project'},'new-routine':{type:'routine'},'edit-task':{type:'task',id},'edit-project':{type:'project',id},'edit-routine':{type:'routine-edit',id},'edit-rule':{type:'rule',id},'new-project-task':{type:'task',projectId:id},'new-project-routine':{type:'routine',projectId:id},'new-milestone':{type:'milestone',projectId:id},'new-entry':{type:'entry',projectId:id},'new-area':{type:'area'},'rename-area':{type:'area',id},'occ-defer':{type:'defer',id},'close-project':{type:'close',id}};
  if(opens[action])return openForm(opens[action]);
  if(action==='cancel-form'){form=null;return render();}
  if(action==='calendar-mode'){calendarMode=id;return render();}
  if(action==='calendar-date'){const [y,m,d]=id.split('-').map(Number);calendarAnchor=new Date(y,m-1,d);calendarMode='day';return render();}
  if(['calendar-today','calendar-prev','calendar-next'].includes(action)){
    if(action==='calendar-today')calendarAnchor=new Date();
    else calendarAnchor.setDate(calendarAnchor.getDate()+(action==='calendar-next'?1:-1)*(calendarMode==='week'?7:1));
    return render();
  }
  if(action==='toggle-board'){boardMode=!boardMode;return render();}
  if(action==='filter'){filter=node.dataset.value;return render();}
  if(action==='expand-routine'){expanded.has(id)?expanded.delete(id):expanded.add(id);return render();}
  setBusy(true);node.disabled=true;
  try{
    const changes={
      'plan-task':['tasks',{planned_date:localDate(),...(byId('tasks',id)?.status==='inbox'?{status:'next'}:{})}], 'unplan-task':['tasks',{planned_date:null}],
      'task-done':['tasks',{status:'done'}], 'task-reopen':['tasks',{status:'next'}],
      'occ-done':['occurrences',{status:'done'}], 'occ-skip':['occurrences',{status:'skipped'}], 'occ-undo':['occurrences',{status:'pending'}],
      'routine-pause':['routines',{status:'paused'}], 'routine-resume':['routines',{status:'active'}], 'routine-retire':['routines',{status:'retired'}],
      'reopen-project':['projects',{status:'active'}],
    };
    if(action==='milestone-toggle')changes[action]=['milestones',{status:byId('milestones',id).status==='done'?'open':'done'}];
    if(action==='question-toggle')changes[action]=['entries',{status:byId('entries',id).status==='resolved'?'open':'resolved'}];
    if(action==='toggle-area')changes[action]=['areas',{status:byId('areas',id).status==='active'?'retired':'active'}];
    if(changes[action]){const [table,data]=changes[action];await api(`/api/${table}/${id}`,'PATCH',data);toast(action==='occ-done'?'本次已完成，Routine 继续保留。':'已保存');}
    else if(action==='wechat-sync'){const result=await api('/api/wechat/sync','POST',{});toast(`接收 ${result.imported} 条消息，稍后按会话总结。`+(result.errors?.length?' '+result.errors.length+' 个会话尚未完整同步，请查看来源状态。':''),Boolean(result.errors?.length));}
    else if(action==='summarize-conversations'){const result=await api('/api/conversations/summarize','POST',{});toast(result.message);}
    else if(action==='dismiss-candidate'){await api('/api/inbox_candidates/'+id,'PATCH',{status:'dismissed'});toast('已略过候选，原文仍保留');}
    else if(['snooze-reminder','dismiss-reminder','restore-reminder'].includes(action)){
      const r=[...state.reminders.items,...state.reminders.suppressed].find(x=>x.key===id),s=r.state;
      await api('/api/reminder_states'+(s?'/'+s.id:''),s?'PATCH':'POST',{reminder_key:r.key,status:action==='dismiss-reminder'?'dismissed':'active',snoozed_until:action==='snooze-reminder'?new Date(Date.now()+3600000).toISOString():null});
      toast(action==='snooze-reminder'?'一小时后再提醒':'提醒已更新');
    }
    else if(action==='dismiss-capture'){await api('/api/inbox_items/'+id,'PATCH',{status:'dismissed'});toast('已略过，原文仍保留');}
    else if(action==='toggle-source'){await api('/api/capture_sources/'+id,'PATCH',{status:byId('capture_sources',id).status==='active'?'paused':'active'});}
    else if(action==='check-project'){await api('/api/project-check','POST',{project_id:id,request_id:crypto.randomUUID()});toast('检查结果已记录');}
    else if(action==='retire-memory'){await api('/api/memories/'+id,'PATCH',{status:'retired'});toast('已停用这条记忆');}
    else if(action==='cancel-rule'){await routineCommand(id,'cancel_rule');toast('已取消待生效规则');}
    else if(action==='trigger'){await api(`/api/routines/${id}/trigger`,'POST',{token:crypto.randomUUID()});toast('已添加一次待执行记录');expanded.add(id);}
    else if(action==='backup'){const result=await api('/api/backup','POST',{});toast('备份已保存：'+result.path);}
    else if(action==='retry'){}
    await refresh();
  }catch(err){toast(err.message,true);node.disabled=false;}
  finally{setBusy(false);}
});
window.addEventListener('hashchange',()=>{if(path()[0]==='chat'&&/^\d{4}-\d{2}-\d{2}$/.test(path()[1]||''))chatDay=path()[1];form=path()[0]==='calendar'&&path()[1]?{type:'calendar-event',id:path()[1]}:null;if(form){const e=byId('calendar_events',form.id);if(e)calendarAnchor=new Date(e.start);}filter='active';if(state)render();window.scrollTo(0,0);});
document.addEventListener('click',async e=>{const target=e.target.closest('[data-push-action]');if(!target||busy)return;target.disabled=true;setBusy(true);try{const message=await notificationAction(target.dataset.pushAction,api);if(message)toast(message);}catch(err){toast(err.message,true);}finally{setBusy(false);if(path()[0]==='notifications')render();}});
document.addEventListener('keydown',event=>{
  if(!state || document.querySelector('dialog[open]'))return;
  if(event.key==='Escape'&&form){form=null;render();return;}
  if(event.key.toLowerCase()==='n'&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&!event.target.closest('input,textarea,select,[contenteditable]')){event.preventDefault();openForm({type:'task'});}
});
// Keep agent writes visible without wiping drafts or moving an active drag target.
let lastStatePoll=0;
setInterval(async()=>{
  if(!state||form||busy||dragged||document.hidden)return;
  if(phoneMode()&&Date.now()-lastStatePoll<10000)return;lastStatePoll=Date.now();
  try{const latest=await api('/api/state');if(!form&&!busy&&!dragged&&(latest.change_seq!==state.change_seq||JSON.stringify(latest.capture_status)!==JSON.stringify(state.capture_status)||localDate()!==renderedDay||Math.floor(Date.now()/60000)!==renderedMinute)){state=latest;if(path()[0]!=='chat'||!document.activeElement?.closest('#chat-compose'))render();}connectionStatus(remoteMode?'已同步到服务器':'已同步到本地');}
  catch{connectionStatus('连接已断开 · 暂时无法保存修改');}
},2000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)lastStatePoll=0;});
document.addEventListener('change',e=>{if(e.target.matches('[data-phone-date]')&&e.target.value){calendarAnchor=new Date(e.target.value+'T12:00:00');render();}});

let chatDay=localDate(), chatTurns=[], chatDraft='', chatLoaded=false, chatSending=false, chatError='', chatRequest=null;
function chat(){
  if(phoneMode())return `<div class="phone-heading"><h1>和 Agent 聊聊</h1></div><section class="chat-room"><div class="chat-toolbar"><label>日期 <input id="chat-day" type="date" value="${chatDay}"></label></div><div id="chat-log" class="chat-log" role="log" aria-live="polite"></div><form id="chat-compose"><label class="sr-only" for="chat-message">给 Agent 的消息</label><textarea id="chat-message" rows="3" maxlength="12000" placeholder="记一件事，或一起理理今天…">${esc(chatDraft)}</textarea><div class="chat-compose-footer"><span class="muted">明确指令会更新工作空间</span><button class="primary" type="submit">发送 ↗</button></div><p id="chat-error" role="alert"></p></form></section>`;
  const selected=state.tasks.filter(t=>t.planned_date===chatDay&&!['done','cancelled'].includes(t.status));
  return heading('DAILY CONVERSATION','先聊聊，再开始。','一起决定重点，也给今天留一点余地。')+`<div class="chat-layout"><section class="chat-room" aria-label="与 Agent 聊天"><div class="chat-toolbar"><label>对话日期 <input id="chat-day" type="date" value="${chatDay}"></label><span class="muted">Codex · 当前登录账号</span></div><div id="chat-log" class="chat-log" role="log" aria-live="polite"></div><div class="chat-starters">${['早上好，结合项目和日历，讨论今天做什么','今天时间不够了，帮我重新排优先级','一起复盘今天，看看还有什么没收尾'].map((s,i)=>`<button type="button" data-chat-prompt="${esc(s)}">${['晨间规划','临时重排','晚间复盘'][i]}</button>`).join('')}</div><form id="chat-compose"><label class="sr-only" for="chat-message">给 Agent 的消息</label><textarea id="chat-message" rows="3" maxlength="12000" placeholder="今天我有大约两小时，想先把研究结果整理清楚…">${esc(chatDraft)}</textarea><div class="chat-compose-footer"><span class="muted">明确指令直接更新 · 建议先讨论</span><button class="primary" type="submit">发送 ↗</button></div><p id="chat-error" role="alert"></p></form></section><aside class="chat-context"><div id="daily-brief"></div>${reminderPanel()}${section(chatDay===localDate()?'今天要做':dateText(chatDay)+' 的安排',selected.length?selected.map(t=>`<div class="chat-plan-item"><a href="#project/${esc(t.project_id||'')}">${esc(t.title)}</a><div class="muted">${esc(byId('projects',t.project_id)?.name||'独立任务')} · ${esc(labels[t.status])}${t.minutes?' · '+t.minutes+' 分钟':''}</div></div>`).join(''):'<p class="muted">还没有安排。先和 Agent 聊聊。</p>','', '<a href="#today" class="small">打开今日 ↗</a>')}${calendarToday(chatDay)}<p class="muted small">${state.calendar_sources.map(s=>esc(s.name)+' · '+(s.synced_at?'上次同步 '+esc(new Date(s.synced_at).toLocaleString('zh-CN')):'尚未同步')).join('<br>')||'尚未连接日历，不能据此判断空闲。'}</p><p class="muted small">Agent 读取工作空间；回复前会尝试刷新过期的 Google 日历。聊天会发送给当前 Codex 使用的模型，并在本机保存。</p></aside></div>`;
}
function paintChat(){
  const log=document.querySelector('#chat-log');if(!log)return;
  const nearBottom=log.scrollHeight-log.scrollTop-log.clientHeight<90;
  log.innerHTML=!chatLoaded?'<p class="muted">正在读取对话…</p>':!chatTurns.length?'<div class="chat-welcome"><span class="eyebrow">A MOMENT TO THINK</span><h2>今天，什么最值得做？</h2><p>讨论安排、记录决定，或告诉我新的进展。<br>明确交代的本地修改会直接写入，并留下回执。</p></div>':chatTurns.map(t=>`<article class="chat-turn"><div class="chat-who">你</div><div class="chat-text user-text">${esc(t.message)}</div><div class="chat-who">JARVIS</div><div class="chat-text">${esc(t.status==='running'?'正在结合工作空间思考…':t.status==='error'?t.error:t.reply)}</div>${t.error&&t.status!=='error'?`<p class="chat-inline-error">${esc(t.error)}</p>`:''}${t.actions.length?`<div class="chat-proposal"><strong>${t.status==='applied'?'已写入工作空间 ✓':t.status==='undone'?'已撤回修改':'建议调整'}</strong>${t.actions.map(chatActionView).join('')}${t.status==='ready'?`<button type="button" data-chat-apply="${esc(t.id)}">应用方案</button>`:t.status==='applied'&&t.results?.length?`<button type="button" data-chat-undo="${esc(t.id)}">撤回这次修改</button>`:''}${t.status==='undone'?'<p class="muted small">已有记录恢复原值；本次新建记录已取消或停用，历史保留。</p>':''}</div>`:''}</article>`).join('');
  if(nearBottom)log.scrollTop=log.scrollHeight;
  const sending=chatSending||chatTurns.some(t=>t.status==='running');
  document.querySelector('#chat-compose button').disabled=sending;
  document.querySelector('#chat-error').textContent=chatError;
}
async function loadChat(){
  const day=chatDay;
  try{const [result,brief]=await Promise.all([api('/api/chat?day='+day),phoneMode()?Promise.resolve(null):api('/api/chat/brief?day='+day+'&timezone='+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone))]);if(day!==chatDay)return;const changed=JSON.stringify(result.turns)!==JSON.stringify(chatTurns)||!chatLoaded;chatTurns=result.turns;chatLoaded=true;if(changed)paintChat();paintBrief(brief);}
  catch(err){chatError=err.message;paintChat();}
}
function bindChat(){
  if(path()[0]!=='chat')return;paintChat();loadChat();
  document.querySelector('#chat-message').addEventListener('input',e=>{chatDraft=e.target.value;chatRequest=null;});
  document.querySelector('#chat-day').addEventListener('change',e=>{if(!e.target.value)return;chatDay=e.target.value;chatRequest=null;chatTurns=[];chatLoaded=false;render();});
  document.querySelector('#chat-compose').addEventListener('submit',async e=>{
    e.preventDefault();if(chatSending||chatTurns.some(t=>t.status==='running')||!chatDraft.trim())return;
    chatSending=true;chatError='';chatRequest??={day:chatDay,message:chatDraft,request_id:crypto.randomUUID(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone};paintChat();
    try{await api('/api/chat','POST',chatRequest);chatDraft='';chatRequest=null;document.querySelector('#chat-message').value='';await loadChat();}
    catch(err){chatError=err.message;}finally{chatSending=false;paintChat();}
  });
}
document.addEventListener('click',async e=>{
  const prompt=e.target.closest('[data-chat-prompt]');if(prompt){chatDraft=prompt.dataset.chatPrompt;chatRequest=null;const input=document.querySelector('#chat-message');input.value=chatDraft;input.focus();}
  const undo=e.target.closest('[data-chat-undo]');if(undo){undo.disabled=true;try{await api('/api/chat/undo','POST',{id:undo.dataset.chatUndo});await loadChat();await refresh();toast('修改已撤回，历史记录保留');}catch(err){chatError=err.message;paintChat();}}
  const apply=e.target.closest('[data-chat-apply]');if(apply){apply.disabled=true;try{await api('/api/chat/apply','POST',{id:apply.dataset.chatApply});await loadChat();await refresh();toast('安排已更新');}catch(err){chatError=err.message+'。请告诉 Agent 重新核对当前安排。';paintChat();}}
});
setInterval(()=>{if(path()[0]==='chat'&&!document.hidden)loadChat();},2000);

function runRow(r){
  const expired=r.status==='running'&&r.lease_until&&Date.parse(r.lease_until)<Date.now();
  const status=expired?'租约已过期':({running:'正在处理',completed:'已交付',failed:'检查 / 运行失败',cancelled:'已取消'}[r.status]||r.status);
  return `<details class="run-record"><summary>${esc(r.kind==='check'?'文件检查':'任务执行')} · ${esc(status)} <span class="muted">${esc(r.actor)} · ${esc(new Date(r.created_at).toLocaleString('zh-CN'))}</span></summary><p>${esc(r.summary||'尚未交付结果')}</p>${r.task_id?`<p class="muted">任务：${esc(byId('tasks',r.task_id)?.title||r.task_id)}</p>`:''}<pre>${esc(r.evidence||'尚无证据')}</pre><p>${esc(r.handoff)}</p></details>`;
}
function projectContextView(p){
  const context=state.project_contexts?.find(c=>c.project_id===p.id&&c.status==='active');
  const runs=(state.agent_runs||[]).filter(r=>r.project_id===p.id).slice(-12).reverse();
  const body=context?`<div class="plan-body">${esc(context.plan||'还没有当前 plan，可以和 Agent 一起整理。')}</div><div class="context-meta"><span>检查：${context.check_interval_minutes?'每 '+context.check_interval_minutes+' 分钟':'未开启定时检查'}</span><span>上下文：${esc(context.context_files||'尚未选择文件')}</span></div><p class="help">检查只读取所选文件，记录变化；不会据此自动完成任务。</p>`:empty('让下一次工作接得上。','和 Agent 讨论后，当前 plan、上下文与交接会留在这里。');
  return section('当前 plan 与上下文',body,'',button('设置上下文','edit-context','quiet small',p.id)+(context?.context_files?button('检查一次','check-project','small',p.id):''))+ (runs.length?section('最近运行与交接',runs.map(runRow).join('')):'');
}
function records(){
  const memories=state.memories||[], runs=(state.agent_runs||[]).slice().reverse();
  return heading('CONTINUITY','记住共识，接着推进。','记忆跨天保留，运行记录保留依据。')+section('有效记忆',memories.filter(m=>m.status==='active').map(m=>`<article class="memory-record"><div class="section-head"><h3>${esc(m.title)}</h3><span class="pill">${esc({preference:'偏好',commitment:'承诺',constraint:'临时约束'}[m.kind])}${m.expires_on&&m.expires_on<localDate()?' · 已过期':''}</span>${button('停用','retire-memory','quiet small',m.id)}</div><p>${esc(m.body)}</p><p class="muted small">${esc(m.project_id?byId('projects',m.project_id)?.name:'跨项目')}${m.expires_on?' · 有效至 '+esc(m.expires_on):''}<br>来源：${esc(m.source)}</p></article>`).join('')||empty('还没有长期记忆。','在聊天里说“记住……”即可记录偏好、承诺或临时约束。'))+section('运行与检查',runs.map(runRow).join('')||empty('目前没有 agent 运行。','项目可以设置文件检查；工作 agent 可以通过接口领取任务、提交证据与交接。'));
}
function chatActionView(a){
  const names={inbox_candidates:'待确认事项',tasks:'任务',entries:'项目记录',projects:'项目方向',project_contexts:'当前 plan',memories:'记忆'};
  const fields={planned_date:'计划日期',status:'状态',title:'名称',body:'内容',plan:'Plan',context_files:'上下文文件',goal:'当前方向',criteria:'判断标准',minutes:'预计分钟',blocker:'阻塞',depends_on:'前置任务',kind:'类型',expires_on:'有效至',project_id:'项目',source:'来源',url:'资料链接'};
  return `<div class="chat-action"><strong>${esc(names[a.entity]||'任务')} · ${a.operation==='create'?'新增':'更新'} · ${esc(a.title)}</strong>${Object.entries(a.data).map(([k,v])=>`<div><span>${esc(fields[k]||k)}</span><div class="action-value">${esc(k==='status'?(labels[v]||v):k==='project_id'?(byId('projects',v)?.name||'独立'):v??'清空')}</div></div>`).join('')}${a.source_quote?`<p class="muted small">依据：“${esc(a.source_quote)}”</p>`:''}</div>`;
}


function captureInbox(){
  const items=state.inbox_items||[],pending=items.filter(i=>i.status==='new').reverse();
  const row=i=>`<article class="capture-item"><div class="section-head"><h3>${esc(i.title)}</h3><span class="pill">${esc({text:'文字',link:'链接',audio:'语音',image:'图片',other:'附件'}[i.kind]||i.kind)}</span></div><p class="muted small">${esc(byId('capture_sources',i.source_id)?.name||'随手记')} · ${esc(i.sender)} · ${esc(new Date(i.received_at).toLocaleString('zh-CN'))}</p><div class="capture-body">${esc(i.body)}</div>${i.status==='new'?`<div class="form-actions">${button('整理为任务','file-capture','small',i.id)}${button('略过','dismiss-capture','quiet small',i.id)}</div>`:`<p class="muted small">${i.task_id?'已关联任务：'+esc(byId('tasks',i.task_id)?.title):'已略过'}</p>`}</article>`;
  return conversationInbox()+section('随手记',pending.filter(i=>!i.source_id).map(row).join('')||empty('还没有随手记。','你主动记录的事情留在这里。'))+`<details class="section"><summary>已整理的随手记</summary>${items.filter(i=>!i.source_id&&i.status!=='new').slice(-30).reverse().map(row).join('')}</details>`;
}
function conversationInbox(projectId=null){
  const groups=(state.conversation_windows||[]).filter(g=>g.summary&&!g.ignored&&g.summary.signal!=='chatter'&&(g.summary.project_id||null)===projectId);
  const row=g=>{const s=g.summary;return `<article class="conversation-card"><div class="section-head"><h3>${esc(s?.title||g.source_name+' · 对话进行中')}</h3>${pill(s?({work:'工作讨论',mixed:'讨论与闲聊',chatter:'闲聊'}[s.signal]):'等待总结')}</div><p class="muted small">${esc(g.source_name)} · ${esc(new Date(g.start).toLocaleString('zh-CN'))} — ${esc(new Date(g.end).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}))} · ${g.message_count} 条消息</p><p class="conversation-text">${esc(s?.summary||'稍后从微信临时读取并总结。')}</p>${g.stale?'<p class="help">这段对话有新消息，摘要稍后更新。</p>':''}${g.attempt?.error&&(!s||g.stale)?`<p class="help overdue">${esc(g.attempt.error)}</p>`:''}${s?`<label class="help">所属项目 <select data-summary-project="${esc(s.id)}" aria-label="${esc(s.title)}的所属项目"><option value="">待归属</option>${state.projects.filter(p=>p.id===s.project_id||p.status==='active').map(p=>`<option value="${esc(p.id)}" ${s.project_id===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><div class="form-actions">${button('无关','conversation-chatter','quiet small',s.id,'title="这是闲聊，清除摘要并过滤"')}</div>`:''}</article>`;};
  const useful=groups;
  const analysisFailed=!projectId&&(state.conversation_windows||[]).some(g=>!g.summary&&!g.ignored&&g.attempt?.error);
  return section(projectId?'最近讨论':'待归属摘要',`${useful.map(row).join('')||empty(projectId?'还没有关联讨论。':'没有待归属的讨论。',projectId?'与这个项目有关的会话摘要会留在这里。':'已明确归属的摘要直接出现在项目中。')}${analysisFailed?'<p class="help overdue">部分会话暂未分析成功，系统稍后重试。</p>':''}<p class="help">只保留有实质信息的摘要，闲聊自动略过。原文留在微信。</p>`,String(useful.length),projectId?'':button('总结当前对话','summarize-conversations','quiet small'));
}
document.addEventListener('click',async event=>{
  const control=event.target.closest('[data-action="conversation-chatter"]');if(!control||busy)return;
  const summary=byId('conversation_summaries',control.dataset.id);if(!summary)return;
  setBusy(true);
  try{await api('/api/commands','POST',{entity:'conversation_summaries',operation:'mark_chatter',id:summary.id,expected_revision:summary.revision,data:{},request_id:crypto.randomUUID(),actor:'user:web',reason:'用户点选无关：这段是闲聊，清除摘要并过滤'});await refresh();toast('已按闲聊过滤');}
  catch(err){toast(err.message,true);await refresh();}finally{setBusy(false);}
});
document.addEventListener('change',async event=>{
  const input=event.target.closest('[data-summary-project]');if(!input||busy)return;
  setBusy(true);
  try{await api('/api/conversation_summaries/'+input.dataset.summaryProject,'PATCH',{project_id:input.value||null});await refresh();toast('讨论归属已更新');}
  catch(err){toast(err.message,true);await refresh();}finally{setBusy(false);}
});

function reminderPanel(){
  const r=state.reminders;if(!r)return '';
  const row=(i,suppressed=false)=>`<article class="reminder-item"><strong>${esc(i.title)}</strong><p class="muted small">${esc(i.detail)}${i.kind==='meeting'?' · '+esc(new Date(i.when).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})):''}</p>${i.entity==='routines'?'<a class="small" href="#routines">查看护理清单</a>':i.entity==='tasks'?button('查看任务','edit-task','quiet small',i.entity_id):`<a class="small" href="#calendar/${esc(i.entity_id)}">查看日程</a>`}<div class="form-actions">${suppressed?(i.state?button('恢复提醒','restore-reminder','quiet small',i.key):''):button('一小时后','snooze-reminder','small',i.key)+button('本次不再提醒','dismiss-reminder','quiet small',i.key)}</div></article>`;
  return section('提醒与跟进',`${r.quiet_now?'<p class="muted">静默时段 · 提醒已收起</p>':!r.preferences.enabled?'<p class="muted">提醒已关闭</p>':''}${r.items.map(i=>row(i)).join('')||'<p class="muted small">目前没有需要提醒的事项。</p>'}${r.suppressed.length?`<details><summary>稍后或已收起 · ${r.suppressed.length}</summary>${r.suppressed.map(i=>row(i,true)).join('')}</details>`:''}<p class="help">本地页面提醒 · 不会向联系人发送消息</p>`,'',button('设置','reminder-settings','quiet small'));
}
function paintBrief(b){
  const el=document.querySelector('#daily-brief');if(!el)return;
  const counts=[['会话摘要',b.conversation_summaries?.length||0],['之前未收尾',b.carryover_candidates?.length||0],['等待与阻塞',b.waiting_tasks?.length||0],['已完成',b.completed_today?.length||0]];
  el.innerHTML=section('每日简报',`<div class="brief-counts">${counts.map(([label,n])=>`<div><strong>${n}</strong><span>${esc(label)}</span></div>`).join('')}</div><p class="help">${b.calendar?.free===null?'日历空闲时间尚未确认。':'可在对话中结合日历安排今天。'} 遗留事项等复盘后再决定是否顺延。</p>${(b.inbox_warnings||[]).length?'<p class="help overdue">部分收件尚未完整同步，今日信息可能不全。</p>':''}<a href="#inbox" class="small">查看待归属摘要 ↗</a>`);
}
function wechatSources(){
  const sources=state.capture_sources||[];
  return section('微信收件入口',`<p class="support-copy">只跟踪你指定的联系人或群。新消息按会话总结，归入项目；本地不留微信原文。</p>${sources.map(s=>{const sync=(state.capture_status||[]).find(x=>x.source_id===s.id);return `<div class="capture-source"><strong>${esc(s.name)}</strong><span class="muted">${s.status==='active'?'跟踪中':'已暂停'} · 从 ${esc(new Date(s.since).toLocaleString('zh-CN'))} 开始</span>${button(s.status==='active'?'暂停':'恢复','toggle-source','small',s.id)}<p class="help">${sync?.error?esc(sync.error):sync?.checked_at?'上次检查 '+esc(new Date(sync.checked_at).toLocaleString('zh-CN')):'等待首次读取'}</p></div>`;}).join('')||'<p class="muted">尚未绑定会话。告诉 Agent 需要跟踪的准确名称，解析后接入。</p>'}<p class="help">本机 wechat-mcp 读取工具专用微信；需要登录并完成初始化。</p>`,'',button('同步一次','wechat-sync','small'));
}

refresh().catch(err=>{main.innerHTML=`<div class="error-screen"><h1>暂时无法打开工作空间</h1><p>${esc(err.message)}</p>${button('重试','retry','')}</div>`;});
