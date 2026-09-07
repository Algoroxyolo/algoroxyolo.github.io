const localHost = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
export const remoteMode = !localHost || location.pathname.startsWith('/jarvis/');
const storageKey = 'jarvis.remote.v1';
let connection = null, pending = null, suggested = null;

function readConnection() {
  try { return JSON.parse(localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey) || 'null'); }
  catch { return null; }
}

function validate(value) {
  const url = new URL(value.endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw Error('请输入完整的 HTTPS 服务地址，不含路径、参数或密钥。');
  }
  if (!/^[A-Za-z0-9_-]{40,}$/.test(value.token)) throw Error('访问密钥格式不正确。');
  return {endpoint: url.origin, token: value.token};
}

export function configureConnection() {
  if (pending) return pending;
  pending = new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'connection-dialog';
    dialog.innerHTML = `<form id="connection-form"><div class="eyebrow">JARVIS · CONNECT</div><h1>连接你的工作空间</h1><p>工作数据保存在你的服务器上。连接后，手机和电脑使用同一份项目与计划。</p><label>服务地址<input name="endpoint" type="url" inputmode="url" placeholder="https://你的服务器地址" autocomplete="url" required></label><label>访问密钥<input name="token" type="password" autocomplete="off" required spellcheck="false"></label><label class="connection-remember"><input name="remember" type="checkbox" checked>在这台个人设备上记住连接</label><p class="help">使用 Tailscale 时，请先开启 Tailscale 连接。服务器需要保持在线。</p><p class="connection-error" role="alert"></p><div class="form-actions"><button type="button" class="quiet connection-cancel">取消</button><button type="submit" class="primary">连接工作空间</button></div><p class="help">在 Safari 添加到主屏幕后，若系统未保留连接，请在主屏幕 App 中再连接一次。</p></form>`;
    const saved = suggested || connection || readConnection();
    const form = dialog.querySelector('form');
    form.elements.endpoint.value = saved?.endpoint || '';
    form.elements.token.value = saved?.token || '';
    const close = value => {dialog.close();dialog.remove();pending = null;resolve(value);};
    dialog.addEventListener('cancel', event => {event.preventDefault();close(false);});
    dialog.querySelector('.connection-cancel').onclick = () => close(false);
    form.onsubmit = async event => {
      event.preventDefault();
      const button = form.querySelector('[type=submit]');
      const error = form.querySelector('[role=alert]');
      button.disabled = true; error.textContent = ''; button.textContent = '正在连接…';
      try {
        const next = validate({endpoint: form.elements.endpoint.value.trim(), token: form.elements.token.value.trim()});
        const response = await fetch(next.endpoint + '/api/schema', {
          headers: {Authorization: 'Bearer ' + next.token}, credentials: 'omit', cache: 'no-store',
          signal: AbortSignal.timeout(20000), redirect: 'error',
        });
        if (response.status === 401) throw Error('访问密钥不正确，请核对后重试。');
        if (!response.ok) throw Error('服务器暂时不可用，请稍后重试。');
        const schema = await response.json();
        if (!schema || typeof schema !== 'object' || !schema.api_version || !schema.command) throw Error('此地址没有返回 JARVIS 接口。');
        localStorage.removeItem(storageKey); sessionStorage.removeItem(storageKey);
        (form.elements.remember.checked ? localStorage : sessionStorage).setItem(storageKey, JSON.stringify(next));
        connection = next;
        suggested = null;
        close(true);
      } catch (err) {
        error.textContent = err instanceof TypeError || err.name === 'TimeoutError'
          ? '无法连接。请确认服务器在线、地址正确；使用 Tailscale 时请先开启连接。' : err.message;
      } finally {button.disabled = false; button.textContent = '连接工作空间';}
    };
    document.body.append(dialog); dialog.showModal();
  });
  return pending;
}

export async function initializeConnection() {
  if (!remoteMode) return;
  if(location.hash.startsWith('#connect=')){
    try {suggested = validate(JSON.parse(decodeURIComponent(location.hash.slice(9))));} catch {suggested = null;}
    // Pairing material stays in the fragment and is removed before navigation.
    history.replaceState(null, '', location.pathname + location.search);
  }
  const control = document.createElement('button');
  control.className = 'quiet small'; control.textContent = '连接设置';
  control.onclick = async () => {if (await configureConnection()) location.reload();};
  const controls = document.querySelector('.topbar-right');
  controls.classList.add('remote-controls'); controls.replaceChildren(control);
  document.querySelector('.sidebar-note').innerHTML = '<span class="signal"></span> 私人工作空间<p>手机与电脑，共用一份计划。</p>';
  try {connection = validate(readConnection());} catch {connection = null;}
  if (!connection || suggested) await configureConnection();
}

export async function apiFetch(path, options) {
  if (!remoteMode) return fetch(path, options);
  if (!connection) throw Error('请通过右上角的连接设置，连接你的工作空间。');
  if (!path.startsWith('/api/')) throw Error('无效接口地址');
  let response;
  try {
    response = await fetch(connection.endpoint + path, {...options,
      headers: {...options.headers, Authorization: 'Bearer ' + connection.token},
      credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(250000),
    });
  } catch {
    throw Error('连接已断开。请确认服务器和网络在线；刚提交的修改请在恢复后核对。');
  }
  if (response.status === 401) throw Error('连接已失效，请在右上角连接设置中更新访问密钥。');
  return response;
}
