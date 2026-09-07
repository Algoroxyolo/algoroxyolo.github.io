// Notifications only: never cache workspace responses or credentials.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let data={};try{data=event.data?.json()||{};}catch{}
  const route=typeof data.url==='string'&&/^#(?:today|calendar|chat|notifications)(?:\/[A-Za-z0-9_-]+)?$/.test(data.url)?data.url:'#today';
  event.waitUntil(self.registration.showNotification(data.title||'JARVIS',{
    body:data.body||'工作空间有一条新提醒。',icon:new URL('icon-192.png',self.registration.scope).href,
    data:{url:new URL(route,self.registration.scope).href},
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const url=new URL(event.notification.data?.url||self.registration.scope);
    if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(w=>w.url.startsWith(self.registration.scope));
    if(existing){await existing.navigate(url.href);await existing.focus();}else await self.clients.openWindow(url.href);
  })());
});
