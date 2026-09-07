// Phone views share the desktop command gate and records.
export function mobileViews(c) {
  const {esc, button, section, empty, taskRow, routineRow, calendarEditor, byId, localDate, dateText, activeProject, blocked, liveEvents} = c;
  const s = c.state;
  const title = (name, sub='', action='') => `<div class="phone-heading"><div><h1>${esc(name)}</h1>${sub?`<p>${esc(sub)}</p>`:''}</div>${action}</div>`;
  const fold = (key, label, body, count='') => `<details class="phone-fold" data-mobile-section="${key}"><summary>${esc(label)} <span>${count}</span></summary>${body}</details>`;
  const task = t => `<div class="phone-task ${t.status==='done'?'is-done':''}">${button(t.status==='done'?'✓':'',t.status==='done'?'task-reopen':'task-done','check',t.id,`aria-label="${t.status==='done'?'重新打开':'完成任务'}：${esc(t.title)}"`)}<div>${button(esc(t.title),'edit-task','task-title',t.id)}<p>${esc([byId('projects',t.project_id)?.name,blocked(t)?t.blocker||'等待前置任务':t.status==='waiting'?'等待中':'',t.due_date?'截止 '+dateText(t.due_date):''].filter(Boolean).join(' · '))}</p></div></div>`;
  const eventsOn = date => {
    const start=new Date(date+'T00:00:00'), end=new Date(start);end.setDate(end.getDate()+1);
    return liveEvents().filter(e=>Date.parse(e.start)<+end&&Date.parse(e.end)>+start).sort((a,b)=>a.start.localeCompare(b.start));
  };
  const eventRow = e => `<a class="phone-event" href="#calendar/${e.id}"><time>${new Date(e.start).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</time><div><strong>${esc(e.title)}</strong><p>${esc(byId('projects',e.project_id)?.name||'')}${e.location?' · '+esc(e.location):''}</p></div><span aria-hidden="true">›</span></a>`;
  function today() {
    const day=localDate(), planned=s.tasks.filter(t=>activeProject(t)&&t.planned_date===day&&!['done','cancelled'].includes(t.status)).sort((a,b)=>a.priority-b.priority);
    const next=s.tasks.filter(t=>activeProject(t)&&!blocked(t)&&['next','in_progress'].includes(t.status)&&t.planned_date!==day);
    const due=s.tasks.filter(t=>activeProject(t)&&!['done','cancelled'].includes(t.status)&&t.due_date&&t.due_date<=day&&t.planned_date!==day);
    const waiting=s.tasks.filter(t=>activeProject(t)&&!['done','cancelled'].includes(t.status)&&(t.status==='waiting'||blocked(t))&&!planned.includes(t)&&!due.includes(t));
    const routines=s.routines.filter(r=>r.status==='active'&&activeProject(r));
    const completed=s.tasks.filter(t=>t.status==='done'&&t.planned_date===day);
    const upcoming=eventsOn(day).filter(e=>Date.parse(e.end)>Date.now()).slice(0,2);
    return title('今天',new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'}))+
      `<a class="phone-chat-link" href="#chat"><span>和 Agent 理一理今天</span><span aria-hidden="true">↗</span></a>`+
      (upcoming.length?section('接下来的日程',upcoming.map(eventRow).join(''),'','<a href="#calendar">全部</a>'):'')+
      section('今天要做',planned.length?planned.map(task).join(''):empty('今天还没有安排','记下一件事，或和 Agent 一起安排。','new-task','添加任务'),String(planned.length))+
      (due.length?fold('due','已到截止日期',due.map(taskRow).join(''),due.length):'')+
      (routines.length?section('日常',routines.map(r=>routineRow(r)).join(''),'','<a href="#routines">全部</a>'):'')+
      (next.length?fold('next','选择下一步',next.map(taskRow).join(''),next.length):'')+
      (waiting.length?fold('waiting','等待与阻塞',waiting.map(taskRow).join(''),waiting.length):'')+
      (completed.length?fold('done','今天已完成',completed.map(task).join(''),completed.length):'');
  }
  function projects() {
    const items=s.projects.filter(p=>c.filter==='all'||p.status===c.filter);
    return title('项目','',button('新建','new-project','quiet'))+c.tabs(['active','paused','all'])+
      (items.map(p=>{const count=s.tasks.filter(t=>t.project_id===p.id&&!['done','cancelled'].includes(t.status)).length;return `<a class="phone-project" href="#project/${p.id}"><div><h2>${esc(p.name)}</h2><p>${esc(p.goal||'查看任务与当前计划')}</p></div><span>${count} 项待做 ›</span></a>`;}).join('')||empty('还没有项目','先给想做的事起个名字。','new-project','新建项目'));
  }
  function project(id) {
    const p=byId('projects',id);if(!p)return empty('项目不存在','请返回项目列表。');
    const tasks=s.tasks.filter(t=>t.project_id===id), active=tasks.filter(t=>!['done','cancelled'].includes(t.status));
    const plan=s.project_contexts?.find(x=>x.project_id===id&&x.status==='active');
    return `<a class="back-link" href="#projects">← 项目</a>`+title(p.name,'',button('编辑','edit-project','quiet',id))+
      (p.goal?`<p class="phone-project-goal">${esc(p.goal)}</p>`:'')+
      section('待做',active.map(task).join('')||'<p class="muted">暂时没有待做任务。</p>',String(active.length),button('添加任务','new-project-task','quiet',id))+
      (plan?.plan?fold('plan','当前计划',`<p class="plan-body">${esc(plan.plan)}</p>`):'')+
      (tasks.length>active.length?fold('closed','已结束的任务',tasks.filter(t=>!active.includes(t)).map(taskRow).join(''),tasks.length-active.length):'')+
      `<button class="phone-project-details" data-phone-full>查看完整项目详情 ↗</button>`;
  }
  function calendar() {
    if(c.form?.type==='calendar-event')return calendarEditor();
    const day=new Intl.DateTimeFormat('en-CA').format(c.calendarAnchor), events=eventsOn(day);
    return title('日程')+`<div class="phone-date">${button('‹','phone-day-prev','', '', 'aria-label="前一天"')}<label><span class="sr-only">查看日期</span><input type="date" data-phone-date value="${day}"></label>${button('›','phone-day-next','', '', 'aria-label="后一天"')}</div>`+
      (events.length?events.map(eventRow).join(''):empty('没有已同步的定时日程','可以切换日期查看。'))+
      fold('sources','日历同步状态',s.calendar_sources.map(source=>`<p>${esc(source.name)} · ${esc(c.sourceStatus(source))}</p>`).join('')||'<p>尚未连接日历。</p>');
  }
  function more() {
    const links=[['projects','项目','任务、计划与资料'],['routines','日常','查看与管理 Routine'],['inbox','待归属','随手记与会话摘要'],['notifications','通知','提醒与推送设置'],['records','记忆与运行','共识与 Agent 交接'],['settings','设置','领域、数据与备份']];
    return title('更多')+links.map(([route,name,sub])=>`<a class="phone-menu" href="#${route}"><div><strong>${name}</strong><p>${sub}</p></div><span aria-hidden="true">›</span></a>`).join('');
  }
  return {today,projects,project,calendar,more};
}

export function mobileNavigation(route) {
  const item=(key,label,icon)=>`<a href="#${key}" ${route===key?'aria-current="page"':''}><span aria-hidden="true">${icon}</span>${label}</a>`;
  return item('today','今日','◷')+item('calendar','日程','▦')+'<button data-action="new-capture" aria-label="随手记"><span aria-hidden="true">＋</span></button>'+item('chat','聊天','◎')+item('more','更多','☰');
}
