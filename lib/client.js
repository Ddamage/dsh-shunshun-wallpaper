window.__ModuleLoader__.load({ id: 'dsh-shunshun-wallpaper', factory: (require) => {
  const module = { exports: {} }
  const exports = module.exports
  const React = require('react')

const rpc = (method, args) =>
  fetch('/dsh-wallpaper-rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  }).then((r) => r.json()).catch(() => null)

const insertStyle = (css) => {
  const tag = document.createElement('style')
  tag.setAttribute('data-plugin', 'dsh-wallpaper')
  tag.textContent = css
  document.head.appendChild(tag)
  return () => { if (tag.parentNode) tag.parentNode.removeChild(tag) }
}

module.exports = {
  name: 'dsh-wallpaper',
  inject: ['slots'],
  apply(ctx) {
    const disposers = []
    const track = (d) => { disposers.push(d); return d }
    ctx.effect(() => () => { disposers.forEach((d) => { try { d() } catch (err) {} }) })

    const WALLPAPER_URL = '/dsh-wallpaper/rotating_horse_smooth.gif'
    let bgDispose = null
    let veilDispose = null
    const applyWallpaper = () => {
      if (bgDispose) { bgDispose(); bgDispose = null }
      bgDispose = track(insertStyle('body{background-image:url(\'' + WALLPAPER_URL + '\')!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important}'))
    }
    const clearWallpaper = () => {
      if (bgDispose) { bgDispose(); bgDispose = null }
      if (veilDispose) { veilDispose(); veilDispose = null }
    }
    const applyProminence = (prom) => {
      const t = 1 - 0.8 * (prom / 100)
      const a = (x) => (x * t).toFixed(3)
      if (veilDispose) { veilDispose(); veilDispose = null }
      veilDispose = track(insertStyle(
        'body:not([data-ds-dark-theme]){--dsw-alias-bg-base:rgba(255,255,255,' + a(0.55) + ')!important;--dsw-alias-bg-layer-1:rgba(255,255,255,' + a(0.63) + ')!important;--dsw-alias-bg-layer-2:rgba(255,255,255,' + a(0.72) + ')!important;--dsw-alias-bg-overlay:rgba(255,255,255,' + a(0.88) + ')!important;--dsw-specific-sidebar-fill:rgba(255,255,255,' + a(0.55) + ')!important}' +
        'body[data-ds-dark-theme]{--dsw-alias-bg-base:rgba(0,0,0,' + a(0.50) + ')!important;--dsw-alias-bg-layer-1:rgba(0,0,0,' + a(0.58) + ')!important;--dsw-alias-bg-layer-2:rgba(0,0,0,' + a(0.66) + ')!important;--dsw-alias-bg-overlay:rgba(0,0,0,' + a(0.78) + ')!important;--dsw-specific-sidebar-fill:rgba(0,0,0,' + a(0.52) + ')!important}'
      ))
    }
    applyWallpaper()
    applyProminence(50)

    const timerSvc = ctx.get('timer')
    const state = { enabled: true, prom: 50 }
    let saveTimer = null
    const saveState = () => {
      const payload = {
        enabled: state.enabled,
        prom: state.prom,
        volume: player.volume,
        loopMode: player.loopMode,
        currentKey: player.songs[player.current] ? player.songs[player.current].key : null,
        currentTime: Math.floor(player.currentTime),
      }
      if (saveTimer) { saveTimer(); saveTimer = null }
      if (timerSvc !== undefined) {
        saveTimer = timerSvc.timeout(() => { rpc('save-state', { state: payload }) }, 400)
      } else {
        rpc('save-state', { state: payload })
      }
    }
    const player = {
      songs: [],
      current: 0,
      playing: false,
      volume: 100,
      loopMode: 'single',
      currentTime: 0,
      duration: 0,
      lastTimeNotify: 0,
      pendingKey: null,
      pendingTime: 0,
      error: null,
      audioEl: null,
      listeners: [],
      subscribe(fn) {
        this.listeners.push(fn)
        return () => { this.listeners = this.listeners.filter((f) => f !== fn) }
      },
      notify() {
        this.listeners.forEach((fn) => { try { fn() } catch (err) {} })
      },
      setAudio(el) {
        this.audioEl = el
        if (el) {
          el.volume = this.volume / 100
          el.loop = this.loopMode === 'single'
        }
      },
      startPlay(i) {
        if (!this.audioEl || this.songs.length === 0) return
        this.currentTime = 0
        this.duration = 0
        this.error = null
        this.audioEl.src = this.songs[i].url
        this.audioEl.play().then(() => { this.playing = true; this.notify() }).catch(() => { this.playing = false; this.notify() })
      },
      randomNext(len, exclude) {
        if (len <= 1) return 0
        let r = Math.floor(Math.random() * len)
        while (r === exclude) r = Math.floor(Math.random() * len)
        return r
      },
      onEnded() {
        if (this.songs.length === 0) return
        if (this.loopMode === 'list') {
          this.current = (this.current + 1) % this.songs.length
          this.startPlay(this.current)
          saveState()
        } else if (this.loopMode === 'shuffle') {
          this.current = this.randomNext(this.songs.length, this.current)
          this.startPlay(this.current)
          saveState()
        }
      },
      loadSongs(firstLoad) {
        rpc('list-songs').then((res) => {
          const list = res && Array.isArray(res.songs) ? res.songs : []
          this.songs = list
          if (list.length === 0) {
            this.current = 0
            this.notify()
            return
          }
          if (this.current >= list.length) this.current = list.length - 1
          if (firstLoad) {
            let start = 0
            if (this.pendingKey) {
              const pi = list.findIndex((s) => s.key === this.pendingKey)
              if (pi >= 0) start = pi
              else this.pendingTime = 0
            } else {
              const idx = list.findIndex((s) => s.url.indexOf('song-5') >= 0)
              start = idx >= 0 ? idx : 0
            }
            this.pendingKey = null
            this.current = start
            if (this.audioEl) {
              this.audioEl.src = list[this.current].url
              this.audioEl.play().then(() => {
                this.playing = true
                if (this.pendingTime && this.audioEl && this.audioEl.currentTime !== undefined) {
                  this.audioEl.currentTime = this.pendingTime
                  this.currentTime = this.pendingTime
                }
                this.pendingTime = 0
                this.notify()
              }).catch(() => {})
            }
          }
          this.notify()
        }).catch(() => {})
      },
      togglePlay() {
        if (!this.audioEl || this.songs.length === 0) return
        if (this.playing) {
          this.audioEl.pause()
          this.playing = false
          this.notify()
        } else {
          this.startPlay(this.current)
        }
      },
      step(delta) {
        if (this.songs.length === 0) return
        if (this.loopMode === 'shuffle') {
          this.current = this.randomNext(this.songs.length, this.current)
        } else {
          this.current = (this.current + delta + this.songs.length) % this.songs.length
        }
        this.startPlay(this.current)
        saveState()
      },
      playIndex(i) {
        if (!this.audioEl || this.songs.length === 0) return
        this.current = i
        this.startPlay(i)
        saveState()
      },
      cycleMode() {
        this.loopMode = this.loopMode === 'single' ? 'list' : this.loopMode === 'list' ? 'shuffle' : 'single'
        if (this.audioEl) this.audioEl.loop = this.loopMode === 'single'
        this.notify()
        saveState()
      },
      setVolume(v) {
        this.volume = v
        if (this.audioEl) this.audioEl.volume = v / 100
        this.notify()
        saveState()
      },
      seek(v) {
        if (!this.audioEl) return
        this.audioEl.currentTime = v
        this.currentTime = v
        this.notify()
      },
      pause() {
        if (this.audioEl && this.playing) {
          this.audioEl.pause()
          this.playing = false
          this.notify()
        }
      },
      removeSong(key) {
        rpc('remove-song', { key }).then((res) => {
          if (!res || !res.ok) return
          const cur = this.songs[this.current]
          const wasCurrent = !!cur && cur.key === key
          this.loadSongs(false)
          saveState()
          if (wasCurrent && this.audioEl) {
            this.audioEl.pause()
            this.audioEl.removeAttribute('src')
            this.playing = false
            this.currentTime = 0
            this.duration = 0
            this.notify()
          }
        }).catch(() => {})
      },
    }

    function MiniPlayer() {
      const [, force] = React.useState(0)
      React.useEffect(() => player.subscribe(() => force((v) => v + 1)), [])
      React.useEffect(() => {
        let cancelled = false
        rpc('load-state').then((res) => {
          if (cancelled) return
          if (res && res.state) {
            const s = res.state
            if (typeof s.prom === 'number') state.prom = s.prom
            if (typeof s.enabled === 'boolean') state.enabled = s.enabled
            if (typeof s.volume === 'number') player.volume = s.volume
            if (s.loopMode === 'list' || s.loopMode === 'shuffle') player.loopMode = s.loopMode
            if (s.currentKey) player.pendingKey = s.currentKey
            if (typeof s.currentTime === 'number') player.pendingTime = s.currentTime
            if (state.enabled) { applyWallpaper(); applyProminence(state.prom) }
            else clearWallpaper()
          }
          player.loadSongs(true)
          player.notify()
        }).catch(() => { player.loadSongs(true) })
        return () => { cancelled = true }
      }, [])
      const can = player.songs.length > 0
      const miniBtn = {
        padding: '2px 6px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)',
      }
      return React.createElement('div', { style: { padding: '2px 4px', maxWidth: '100%' } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } },
          React.createElement('audio', {
            ref: (el) => player.setAudio(el),
            onEnded: () => player.onEnded(),
            onPlay: () => { player.playing = true; player.notify() },
            onPause: () => { player.playing = false; player.notify(); saveState() },
            onError: () => { player.playing = false; player.error = '播放失败，音频文件可能已被删除'; player.notify() },
            onCanPlay: () => { if (player.error) { player.error = null; player.notify() } },
            onTimeUpdate: () => {
              if (player.audioEl) {
                player.currentTime = player.audioEl.currentTime
                const now = Date.now()
                if (now - player.lastTimeNotify >= 500) {
                  player.lastTimeNotify = now
                  player.notify()
                }
              }
            },
            onLoadedMetadata: () => { if (player.audioEl && player.audioEl.duration) { player.duration = player.audioEl.duration; player.notify() } },
          }),
          React.createElement('button', { onClick: () => player.step(-1), disabled: !can, style: miniBtn }, '⏮'),
          React.createElement('button', { onClick: () => player.togglePlay(), disabled: !can, style: miniBtn }, player.playing ? '⏸' : '▶'),
          React.createElement('button', { onClick: () => player.step(1), disabled: !can, style: miniBtn }, '⏭'),
          React.createElement('span', { style: { fontSize: '11px', color: 'var(--dsw-alias-label-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 } },
            player.songs.length > 0 ? player.songs[player.current].title : ''),
        ),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' } },
          React.createElement('input', {
            type: 'range', min: 0, max: player.duration || 0, step: 1,
            value: Math.min(player.currentTime, player.duration || 0),
            disabled: !can || !player.duration,
            onChange: (e) => player.seek(Number(e.target.value)),
            style: { flex: 1, height: '3px', margin: '0', padding: '0', cursor: 'pointer', accentColor: 'var(--dsw-alias-accent-brand)' },
          }),
          React.createElement('span', { style: { fontSize: '10px', color: 'var(--dsw-alias-label-secondary)', minWidth: '64px', textAlign: 'right' } },
            fmtTime(player.currentTime) + ' / ' + fmtTime(player.duration)),
        ),
      )
    }

    function fmtTime(sec) {
      if (!sec || !isFinite(sec)) return '0:00'
      const m = Math.floor(sec / 60)
      const s = Math.floor(sec % 60)
      return m + ':' + (s < 10 ? '0' : '') + s
    }

    function MusicControl(props) {
      const enabled = props.enabled
      const [, force] = React.useState(0)
      React.useEffect(() => player.subscribe(() => force((v) => v + 1)), [])
      const ctrlBtn = {
        padding: '5px 12px', fontSize: '13px', borderRadius: '6px',
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)', cursor: 'pointer',
      }
      const playBtn = Object.assign({}, ctrlBtn, { minWidth: '88px' })
      const rowBtn = { padding: '6px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--dsw-alias-border-l2)', cursor: 'pointer' }
      const modeLabel = player.loopMode === 'single' ? '🔂 单曲循环' : player.loopMode === 'list' ? '🔁 列表循环' : '🔀 随机播放'
      const can = enabled && player.songs.length > 0
      const timeLbl = { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', minWidth: '38px' }
      return React.createElement('div', null,
        player.error ? React.createElement('p', { style: { margin: '4px 0', fontSize: '12px', color: 'var(--dsw-alias-state-error-primary)' } }, '⚠ ' + player.error) : null,
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' } },
          React.createElement('button', { onClick: () => player.step(-1), disabled: !can, style: ctrlBtn }, '⏮'),
          React.createElement('button', { onClick: () => player.togglePlay(), disabled: !can, style: playBtn }, player.playing ? '⏸ 暂停' : '▶ 播放'),
          React.createElement('button', { onClick: () => player.step(1), disabled: !can, style: ctrlBtn }, '⏭'),
          React.createElement('span', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
            player.songs.length > 0 ? player.songs[player.current].title : '暂无歌曲，可粘贴 B站链接添加'),
        ),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' } },
          React.createElement('span', { style: timeLbl }, fmtTime(player.currentTime)),
          React.createElement('input', {
            type: 'range', min: 0, max: player.duration || 0, step: 1, value: player.currentTime,
            disabled: !can || !player.duration,
            onChange: (e) => player.seek(Number(e.target.value)),
            style: { flex: 1 },
          }),
          React.createElement('span', { style: timeLbl }, fmtTime(player.duration)),
        ),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' } },
          React.createElement('label', { style: { minWidth: '36px', fontSize: '13px', color: 'var(--dsw-alias-label-primary)' } }, '音量'),
          React.createElement('input', {
            type: 'range', min: 0, max: 100, value: player.volume, disabled: !enabled,
            onChange: (e) => player.setVolume(Number(e.target.value)),
            style: { flex: 1, maxWidth: '160px' },
          }),
          React.createElement('span', { style: { minWidth: '36px', fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } }, player.volume + '%'),
          React.createElement('button', { onClick: () => player.cycleMode(), disabled: !enabled, style: ctrlBtn }, modeLabel),
        ),
        React.createElement('div', { style: { padding: '4px 0' } },
          player.songs.map((s, i) => React.createElement('div', {
            key: s.url,
            style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
          },
            React.createElement('button', {
              onClick: () => player.playIndex(i),
              disabled: !enabled,
              style: Object.assign({}, rowBtn, {
                flex: 1, textAlign: 'left', padding: '6px 10px',
                background: i === player.current ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
                color: 'var(--dsw-alias-label-primary)',
              }),
            }, (i === player.current ? '♪ ' : '') + s.title),
            React.createElement('button', {
              onClick: () => player.removeSong(s.key),
              disabled: !enabled,
              title: '删除这首歌',
              style: {
                padding: '6px 8px', fontSize: '12px', borderRadius: '6px',
                border: '1px solid var(--dsw-alias-border-l2)', cursor: 'pointer',
                background: 'transparent', color: 'var(--dsw-alias-label-secondary)',
              },
            }, '🗑'),
          )),
        ),
      )
    }

    function AddMusic(props) {
      const enabled = props.enabled
      const [url, setUrl] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [msg, setMsg] = React.useState('')
      const add = () => {
        const u = url.trim()
        if (!u || busy || !enabled) return
        setBusy(true)
        setMsg('正在解析并下载音频，请稍候…')
        rpc('add-bilibili-song', { url: u }).then((res) => {
          if (res && res.ok) {
            setMsg('已添加：' + res.title)
            setUrl('')
            player.loadSongs(false)
          } else {
            setMsg('添加失败：' + ((res && res.error) || '未知错误'))
          }
        }).catch((err) => {
          setMsg('添加失败：' + ((err && err.message) || String(err)))
        }).then(() => setBusy(false))
      }
      const inputStyle = {
        flex: 1, padding: '6px 10px', fontSize: '13px',
        background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)',
        border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '6px',
      }
      const btnStyle = {
        padding: '6px 14px', fontSize: '13px', borderRadius: '6px',
        border: '1px solid var(--dsw-alias-border-l2)', cursor: 'pointer',
        background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)',
      }
      return React.createElement('div', { style: { padding: '6px 0' } },
        React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
          React.createElement('input', {
            type: 'text',
            placeholder: '粘贴 B站视频链接（支持 BV / av / b23.tv）',
            value: url,
            onChange: (e) => setUrl(e.target.value),
            disabled: busy || !enabled,
            style: inputStyle,
          }),
          React.createElement('button', { onClick: add, disabled: busy || !url.trim() || !enabled, style: btnStyle }, busy ? '添加中…' : '添加'),
        ),
        msg ? React.createElement('p', { style: { margin: '6px 0 0', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } }, msg) : null,
      )
    }

    function ShunshunSettings() {
      const [, force] = React.useState(0)
      React.useEffect(() => player.subscribe(() => force((v) => v + 1)), [])
      const enabled = state.enabled
      const prom = state.prom
      const toggleEnabled = () => {
        state.enabled = !state.enabled
        if (!state.enabled) { clearWallpaper(); player.pause() }
        else { applyWallpaper(); applyProminence(state.prom) }
        player.notify()
        saveState()
      }
      const changeProm = (v) => {
        state.prom = v
        applyProminence(v)
        player.notify()
        saveState()
      }
      const row = { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }
      const lbl = { minWidth: '72px', fontSize: '13px', color: 'var(--dsw-alias-label-primary)' }
      const val = { minWidth: '40px', fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' }
      const btn = {
        padding: '6px 16px', fontSize: '13px', borderRadius: '6px',
        border: '1px solid var(--dsw-alias-border-l2)', cursor: 'pointer',
        background: enabled ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-bg-layer-2)',
        color: enabled ? '#fff' : 'var(--dsw-alias-label-primary)',
      }
      return React.createElement('div', { style: { padding: '16px 4px' } },
        React.createElement('h3', { style: { margin: '0 0 12px', fontSize: '15px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, '顺顺壁纸'),
        React.createElement('p', { style: { margin: '0 0 12px', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } }, '管理壁纸背景与音乐播放。'),
        React.createElement('div', { style: row },
          React.createElement('button', { onClick: toggleEnabled, style: btn }, enabled ? '停用插件' : '启用插件'),
          React.createElement('span', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } }, enabled ? '插件运行中' : '插件已停用，壁纸与音乐暂停'),
        ),
        React.createElement('div', { style: row },
          React.createElement('label', { style: lbl }, '突出度'),
          React.createElement('input', {
            type: 'range', min: 0, max: 100, value: prom, disabled: !enabled,
            onChange: (e) => changeProm(Number(e.target.value)),
            style: { flex: 1, maxWidth: '240px' },
          }),
          React.createElement('span', { style: val }, prom + '%'),
        ),
        React.createElement('p', { style: { margin: '4px 0 0', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } },
          '0% 为最不明显，100% 为壁纸完全突出。',
        ),
        React.createElement('h4', { style: { margin: '16px 0 4px', fontSize: '14px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } }, '音乐'),
        React.createElement(AddMusic, { enabled: enabled }),
        React.createElement(MusicControl, { enabled: enabled }),
      )
    }

    const slots = ctx.get('slots')
    if (slots === undefined) return
    slots.inject('sidebar.footer.action', () => slots.register(
      { name: 'sidebar.footer.action', id: 'dsh-wallpaper-player', order: 100 },
      () => React.createElement(MiniPlayer, null),
    ))
    slots.inject('settings.section', () => slots.register(
      { name: 'settings.section', id: 'shunshun-wallpaper', order: 30, label: '顺顺壁纸' },
      () => React.createElement(ShunshunSettings, null),
    ))
    console.log('[dsh-wallpaper] client ready')
  },
}
  return module.exports
} })
