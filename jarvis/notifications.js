let config=null, registration=null, subscription=null, active=false, failure='', loading=null;
const supported=()=> 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const ios=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone;
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function notificationView(){
  const needsInstall=ios()&&!standalone();
  const unavailable=!supported()||needsInstall;
  return `<div class="phone-heading"><h1>通知</h1></div><p class="support-copy">晚间护理、日程开始前、到期任务和 Agent 回复，通过系统通知提醒你。</p><section class="section"><h2>这台设备</h2><p id="push-status" role="status">${needsInstall?'请先在 Safari 添加到主屏幕，再从主屏幕打开。':!supported()?'当前浏览器不支持推送通知。':active?'通知已开启':Notification.permission==='denied'?'通知权限已关闭，请在系统设置中允许 JARVIS 通知。':'通知尚未开启'}</p><div class="form-actions">${unavailable?'':`<button data-push-action="${active?'disable':'enable'}" ${!config?.configured||Notification.permission==='denied'?'disabled':''}>${active?'关闭这台设备的通知':'开启通知'}</button>${active?'<button data-push-action="test">发送测试通知</button>':''}`}</div><p class="form-error" role="alert">${safe(failure)}</p>${config&&!config.configured?'<p class="help">服务器尚未配置推送。</p>':''}</section><section class="section"><h2>提醒规则</h2><p>晚间护理按设定时间合并提醒，已完成的不再催；护发素按三天周期到期提醒。任务提醒每天汇总一次。日程按设置的提前时间提醒；未及时同步的日历不发推送。Agent 回复只提醒开启通知后的新对话。</p><button data-action="reminder-settings">提前时间与免打扰</button><p class="help">通知只显示简短提示，点开后查看内容。服务器需要在线才能发出新通知；打开内容时需连接 Tailscale。</p></section>`;
}
export async function loadNotifications(api,render){
  if(loading)return loading;
  loading=(async()=>{
    try{
      config=await api('/api/push/config');
      if(supported()){
        registration=await navigator.serviceWorker.register(new URL('./sw.js',import.meta.url),{scope:new URL('./',import.meta.url).pathname});
        await navigator.serviceWorker.ready;
        subscription=await registration.pushManager.getSubscription();
        const status=subscription?await api('/api/push/status','POST',{subscription:subscription.toJSON()}):{active:false};
        active=status.active;failure=status.error||'';
      }
    }catch(error){failure=error.message;}
    finally{loading=null;render();}
  })();
  return loading;
}
export async function notificationAction(action,api){
  failure='';
  try{
    if(action==='enable'){
      // Permission must be requested directly in the user's click handler.
      const permission=await Notification.requestPermission();
      if(permission!=='granted')throw Error('通知尚未获得允许。');
      if(!registration||!config?.publicKey)throw Error('通知还在准备，请稍后重试。');
      const b64=config.publicKey.replace(/-/g,'+').replace(/_/g,'/');
      const key=Uint8Array.from(atob(b64+'='.repeat((4-b64.length%4)%4)),c=>c.charCodeAt(0));
      subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
      await api('/api/push/subscribe','POST',{subscription:subscription.toJSON()});active=true;
    }else if(action==='disable'){
      if(subscription){await api('/api/push/unsubscribe','POST',{subscription:subscription.toJSON()});await subscription.unsubscribe();}
      subscription=null;active=false;
    }else if(action==='test'){
      await api('/api/push/test','POST',{subscription:subscription.toJSON()});
      return '测试通知已提交，请查看系统通知。';
    }
  }catch(error){failure=error.message;throw error;}
}
