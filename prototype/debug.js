// On-screen diagnostics for checking the prototype on real phones (iPhone Safari has no console
// without a Mac). Active only with ?debug=1. Without it this file reads the URL once and stops:
// no listeners, frames, timers, elements or replaced functions. Loaded before Three.js so that
// errors and warnings during loading are kept. Keep the syntax plain for older browsers.
(() => {
  if (new URLSearchParams(location.search).get('debug') !== '1') return;
  const now = () => performance.now();
  const sec = ms => (ms / 1000).toFixed(2);
  const fps = ms => Math.round(1000 / ms);
  const short = url => String(url).split(/[?#]/)[0].split('/').pop();

  // Errors and warnings stay on screen. The console still receives everything as before.
  const entries = [], counts = {error: 0, warn: 0};
  function note(kind, text, where, level) {
    counts[level === 'warn' ? 'warn' : 'error'] += level === 'info' ? 0 : 1;
    entries.push({time: now(), kind: kind, text: String(text).slice(0, 300), where: where || ''});
    if (entries.length > 30) entries.shift();
  }
  function describe(value) {
    if (value instanceof Error) return value.name + ': ' + value.message;
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value) } catch (e) { return String(value) }
  }
  addEventListener('error', e => {
    try {
      if (e instanceof ErrorEvent) {
        note('エラー', e.message, e.filename ? short(e.filename) + ':' + e.lineno + ':' + e.colno : '');
      } else if (e.target && e.target.tagName) {
        note('読み込み失敗', '<' + e.target.tagName.toLowerCase() + '>', e.target.src || e.target.href || '');
      }
    } catch (err) { /* never disturb the page */ }
  }, true);
  addEventListener('unhandledrejection', e => {
    try { note('Promise', describe(e.reason)) } catch (err) { /* never disturb the page */ }
  });
  // Three.js reports shader failures and similar problems through the console, not as exceptions.
  [['error', 'console.error', 'error'], ['warn', '警告', 'warn']].forEach(([method, kind, level]) => {
    const original = console[method];
    console[method] = function () {
      try { note(kind, Array.prototype.map.call(arguments, describe).join(' '), '', level) } catch (e) { /* ignore */ }
      return original.apply(this, arguments);
    };
  });
  const canvas = document.querySelector('#world');
  if (canvas) {
    canvas.addEventListener('webglcontextlost', () => note('WebGL', 'コンテキストが失われた'));
    canvas.addEventListener('webglcontextrestored', () => note('WebGL', 'コンテキストが戻った', '', 'info'));
  }
  let contentLoaded = null;
  document.addEventListener('DOMContentLoaded', () => { contentLoaded = now() });

  // The panel sits on the right below the header row and never covers the walking pad.
  const style = document.createElement('style');
  style.textContent = '#debug-panel{position:fixed;z-index:10;top:calc(env(safe-area-inset-top,0px) + 70px);' +
    'right:calc(env(safe-area-inset-right,0px) + 14px);max-width:min(340px,calc(50vw - 14px));' +
    'max-height:calc(100dvh - 90px);display:flex;flex-direction:column;color:#f6f1e4;' +
    'background:#121a16d9;border-radius:6px;font:11px/1.35 ui-monospace,Menlo,Consolas,monospace}' +
    '#debug-panel button{margin:0;padding:5px 8px;border:0;background:none;text-align:left;' +
    'white-space:pre-wrap;font:inherit;font-weight:bold}' +
    '#debug-panel pre{margin:0;padding:0 8px 6px;overflow:auto;white-space:pre-wrap;word-break:break-all;' +
    'font:inherit;touch-action:pan-y}' +
    '@media(max-width:760px),(pointer:coarse){#debug-panel{top:calc(env(safe-area-inset-top,0px) + 63px);' +
    'right:calc(env(safe-area-inset-right,0px) + 8px);max-width:min(340px,calc(50vw - 8px));' +
    'max-height:calc(100dvh - 63px - 116px)}}' +
    '#debug-safe{position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) ' +
    'env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)}';
  document.head.appendChild(style);
  const panel = document.createElement('div');
  panel.id = 'debug-panel';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'true');
  const text = document.createElement('pre');
  panel.append(toggle, text);
  const safe = document.createElement('div');
  safe.id = 'debug-safe';
  document.body.append(panel, safe);
  toggle.addEventListener('click', () => {
    text.hidden = !text.hidden;
    toggle.setAttribute('aria-expanded', String(!text.hidden));
    update();
  });

  // Connect to the town once town.js has run. If town.js failed, reading `town` throws forever.
  let link = null, failed = false, rendered = false, renders = 0, firstRender = null, firstShown = null;
  function getTown() {
    try { return town } catch (e) { return null }
  }
  function connect(t) {
    const renderer = t.renderer, render = renderer.render;
    renderer.render = function () {
      try { return render.apply(this, arguments) } finally {
        rendered = true; renders++;
        if (firstRender === null) firstRender = now();
      }
    };
    link = {renderer: renderer, size: new THREE.Vector2()};
    const gl = renderer.getContext();
    let name = gl.getParameter(gl.RENDERER);
    // Chrome and Safari mask the name; Firefox gives it directly and warns about the extension.
    if (!name || name === 'WebKit WebGL') {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      if (info) name = gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
    }
    let sun = null;
    t.scene.traverse(o => { if (!sun && o.isDirectionalLight && o.castShadow) sun = o });
    Object.assign(link, {gl: gl, version: gl.getParameter(gl.VERSION), name: name,
      maxTexture: renderer.capabilities.maxTextureSize, sun: sun});
  }

  // FPS counts only frames that drew: walk.js renders while something moves and idles otherwise.
  let previous = null, stalls = 0, lastUpdate = -1e9;
  const ticks = [], samples = [], minutes = [];
  let minute = {index: 0, count: 0, total: 0, longest: 0};
  document.addEventListener('visibilitychange', () => { previous = null });
  function closeMinute(index) {
    while (minute.index < index) {
      minutes.push(minute.count ? fps(minute.total / minute.count) + '/' + fps(minute.longest) : '-');
      if (minutes.length > 10) minutes.shift();
      minute = {index: minute.index + 1, count: 0, total: 0, longest: 0};
    }
  }
  function tick(time) {
    requestAnimationFrame(tick);
    try {
      if (!link && !failed) {
        const t = getTown();
        if (t) connect(t);
        else if (document.readyState !== 'loading') failed = true;
      }
      const at = now();
      if (previous !== null) {
        const dt = time - previous;
        // Long gaps while loading belong to the load time, not to the stall count.
        if (dt > 1000) { if (firstShown !== null) stalls++ }
        else {
          ticks.push(time);
          if (rendered) {
            samples.push([time, dt]);
            closeMinute(Math.floor(at / 60000));
            minute.count++; minute.total += dt; minute.longest = Math.max(minute.longest, dt);
          }
        }
      }
      if (rendered && firstShown === null) firstShown = at;
      previous = time; rendered = false;
      while (ticks.length && ticks[0] < time - 1000) ticks.shift();
      while (samples.length && samples[0][0] < time - 5000) samples.shift();
      if (at - lastUpdate >= 500) { lastUpdate = at; update() }
    } catch (e) {
      try { note('診断表示', describe(e)) } catch (err) { /* ignore */ }
    }
  }

  function fpsLine() {
    if (!samples.length) return 'FPS 操作なし（描いたフレームだけを数える）';
    let total = 0, longest = 0;
    samples.forEach(([, dt]) => { total += dt; longest = Math.max(longest, dt) });
    return 'FPS 平均 ' + fps(total / samples.length) + ' ／ 最低 ' + fps(longest) + '（描画中・直近5秒）';
  }
  function summary() {
    const s = samples.length ? fpsLine().replace(/（.*$/, '').replace('FPS 平均 ', 'FPS ').replace(' ／ 最低 ', '/') : 'FPS -';
    return (text.hidden ? '▸ ' : '▾ ') + '診断  ' + s + '  エラー ' + counts.error + '  警告 ' + counts.warn;
  }
  function update() {
    toggle.textContent = summary();
    if (text.hidden) return;
    const lines = [fpsLine(), '画面の更新 ' + ticks.length + '回/秒　1秒を超える停止 ' + stalls + '回',
      '1分ごと（平均/最低） ' + (minutes.length ? minutes.join(' ') : 'まだなし'),
      '経過 ' + Math.floor(now() / 60000) + '分' + String(Math.floor(now() / 1000) % 60).padStart(2, '0') + '秒'];
    const vv = window.visualViewport;
    const orientation = screen.orientation ? screen.orientation.type + ' ' + screen.orientation.angle + '°'
      : (matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape');
    const pad = getComputedStyle(safe);
    lines.push('', '窓 ' + innerWidth + '×' + innerHeight + '　DPR ' + devicePixelRatio);
    if (link) {
      const r = link.renderer, s = r.getSize(link.size);
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      const off = Math.abs(cw - s.x) > 1 || Math.abs(ch - s.y) > 1;
      lines.push('canvas ' + cw + '×' + ch + '　描画 ' + s.x + '×' + s.y + (off ? '　⚠ 不一致' : ''),
        '描画バッファ ' + link.gl.drawingBufferWidth + '×' + link.gl.drawingBufferHeight +
        '　ピクセル比 ' + r.getPixelRatio());
    }
    lines.push('visualViewport ' + (vv ? Math.round(vv.width) + '×' + Math.round(vv.height) + ' ×' + vv.scale.toFixed(2) : 'なし'),
      '画面 ' + screen.width + '×' + screen.height + '　' + orientation,
      '安全領域 上' + parseFloat(pad.paddingTop) + ' 右' + parseFloat(pad.paddingRight) +
        ' 下' + parseFloat(pad.paddingBottom) + ' 左' + parseFloat(pad.paddingLeft), '');
    if (link) {
      const shadow = link.sun ? link.sun.shadow : null;
      lines.push(link.version, 'レンダラー ' + link.name, '最大テクスチャ ' + link.maxTexture,
        '影 ' + (shadow ? shadow.mapSize.x + '×' + shadow.mapSize.y + (shadow.map ? '（作成済み）' : '（未作成）') : 'なし'));
    } else {
      lines.push(failed ? '町の準備に失敗（下のエラーを見る）' : '町を準備中…');
    }
    lines.push('読み込み ' + (firstShown === null ? '—' : '画面に出るまで ' + sec(firstShown) + '秒') +
      '（DOMContentLoaded ' + (contentLoaded === null ? '—' : sec(contentLoaded)) +
      '／最初の描画 ' + (firstRender === null ? '—' : sec(firstRender)) + '）　描画 ' + renders + '回', '',
      'エラー ' + counts.error + '　警告 ' + counts.warn);
    entries.forEach(e => lines.push('[' + sec(e.time) + '秒] ' + e.kind + ' ' + e.text + (e.where ? '　' + e.where : '')));
    lines.push('', navigator.userAgent);
    text.textContent = lines.join('\n');
  }
  update();
  requestAnimationFrame(tick);
})();
