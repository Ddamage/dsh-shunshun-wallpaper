import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = path.resolve(__dirname, '..')
const WALLPAPER_DIR = path.join(PKG_ROOT, 'assets', 'wallpapers')
const MUSIC_DIR = path.join(PKG_ROOT, 'assets', 'music')
const playlistFile = path.join(MUSIC_DIR, 'playlist.json')
const stateFile = path.join(MUSIC_DIR, 'settings.json')

const MIME = {
  '.gif': 'image/gif', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
}

export default {
  name: 'dsh-wallpaper',
  inject: ['webServer'],
  async apply(ctx) {
    const webServer = ctx.webServer

    // 壁纸表：扫描 assets/wallpapers
    const wallpapers = {}
    fs.readdirSync(WALLPAPER_DIR).filter((f) => /\.(gif|png|jpe?g|webp)$/i.test(f)).sort().forEach((f) => { wallpapers[f] = f })

    // 被删文件记录（重启后不恢复）
    let removed = new Set()
    try {
      const pl = JSON.parse(fs.readFileSync(playlistFile, 'utf8'))
      if (Array.isArray(pl.removed)) removed = new Set(pl.removed)
    } catch (err) {}

    // 歌曲表：扫描 assets/music（排除已删文件）
    let songs = {}
    // 内置歌曲固定顺序（与作者默认一致，song-5 = 飞八分钱 PHONK）
    const BUILTIN = [
      '飞在八分前.mp3',
      '绝不认输.mp3',
      '天下.mp3',
      '我会一直顺.mp3',
      '飞八分钱PHONK.mp3',
    ]
    const rebuildSongs = () => {
      const next = {}
      let n = 0
      BUILTIN.forEach((f) => {
        if (removed.has(f)) return
        if (!fs.existsSync(path.join(MUSIC_DIR, f))) return
        n++
        const dot = f.lastIndexOf('.')
        const ext = f.slice(dot).toLowerCase()
        next['song-' + n + ext] = { file: f, title: f.slice(0, dot) }
      })
      // 追加目录中其他音频文件（按文件名排序）
      fs.readdirSync(MUSIC_DIR).filter((f) => /\.(mp3|m4a)$/i.test(f) && BUILTIN.indexOf(f) < 0).sort().forEach((f) => {
        if (removed.has(f)) return
        n++
        const dot = f.lastIndexOf('.')
        const ext = f.slice(dot).toLowerCase()
        next['song-' + n + ext] = { file: f, title: f.slice(0, dot) }
      })
      songs = next
    }
    const savePlaylist = () => {
      try { fs.writeFileSync(playlistFile, JSON.stringify({ removed: [...removed] })) } catch (err) {}
    }
    rebuildSongs()

    // 静态文件服务
    const serveFile = (res, absPath, ext) => {
      try {
        const st = fs.statSync(absPath)
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Content-Length': String(st.size),
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        })
        fs.createReadStream(absPath).pipe(res)
      } catch (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('not found')
      }
    }
    const nameOf = (url) => String(url || '').split('/').filter(Boolean).pop() || ''

    const disposeWall = webServer.register({
      kind: 'prefix', path: '/dsh-wallpaper',
      handler: (req, res) => {
        const name = nameOf(req.url)
        const file = wallpapers[name]
        if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('wallpaper not found: ' + name); return }
        const dot = file.lastIndexOf('.')
        serveFile(res, path.join(WALLPAPER_DIR, file), dot >= 0 ? file.slice(dot).toLowerCase() : '')
      },
    })
    ctx.effect(() => disposeWall)

    const disposeMusic = webServer.register({
      kind: 'prefix', path: '/dsh-music',
      handler: (req, res) => {
        const name = nameOf(req.url)
        const entry = songs[name]
        if (!entry) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('song not found: ' + name); return }
        const dot = entry.file.lastIndexOf('.')
        serveFile(res, path.join(MUSIC_DIR, entry.file), dot >= 0 ? entry.file.slice(dot).toLowerCase() : '')
      },
    })
    ctx.effect(() => disposeMusic)

    // B站音频下载（Node 原生 fetch，带超时）
    const fetchTimeout = (url, opts) => fetch(url, Object.assign({}, opts, { signal: AbortSignal.timeout(120000) }))
    async function downloadBilibili(link) {
      const H = { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com' }
      const clean = (s) => {
        let o = ''
        const bad = String.fromCharCode(92, 47, 58, 42, 63, 34, 60, 62, 124)
        for (const ch of s) o += bad.indexOf(ch) >= 0 ? '_' : ch
        return o.slice(0, 80)
      }
      let key = link
      const mBV = link.match(/BV[0-9A-Za-z]{10}/)
      const mAv = link.match(/av([0-9]+)/)
      if (!mBV && !mAv) {
        const r = await fetchTimeout(link, { redirect: 'follow', headers: H })
        const m2 = r.url.match(/BV[0-9A-Za-z]{10}/) || r.url.match(/av([0-9]+)/)
        if (!m2) return { ok: false, error: '无法解析B站链接' }
        key = m2[0].startsWith('BV') ? m2[0] : m2[1]
      }
      const q = key.startsWith('BV') ? ('bvid=' + encodeURIComponent(key)) : ('aid=' + key)
      const v = await (await fetchTimeout('https://api.bilibili.com/x/web-interface/view?' + q, { headers: H })).json()
      if (v.code !== 0) return { ok: false, error: '视频信息失败: ' + v.message }
      const cid = v.data.cid
      const p = await (await fetchTimeout('https://api.bilibili.com/x/player/playurl?' + q + '&cid=' + cid + '&fnval=16', { headers: H })).json()
      if (p.code !== 0) return { ok: false, error: '音频流失败: ' + p.message }
      const auds = (p.data && p.data.dash && p.data.dash.audio) || []
      const a = auds.find((x) => x.id === 30280) || auds[0]
      if (!a) return { ok: false, error: '未找到音频流' }
      const buf = Buffer.from(await (await fetchTimeout(a.baseUrl, { headers: H })).arrayBuffer())
      const headOk = buf.length > 8 && buf.readUInt32BE(0) > 0 && buf.readUInt32BE(0) <= buf.length && buf.toString('latin1', 4, 8) === 'ftyp'
      let data = buf
      if (!headOk) { const f = buf.indexOf('ftyp'); if (f > 0) data = buf.slice(f) }
      const title = v.data.title
      const dup = Object.keys(songs).find((k) => songs[k].title === title)
      if (dup) return { ok: false, error: '该歌曲已存在：' + title }
      const safe = clean(title)
      let file = safe + '.m4a'
      let n = 2
      while (fs.existsSync(path.join(MUSIC_DIR, file))) { file = safe + '_' + n + '.m4a'; n++ }
      fs.writeFileSync(path.join(MUSIC_DIR, file), data)
      return { ok: true, title, file, size: data.length }
    }

    // JSON RPC（Client 通过 HTTP 调用）
    const readJson = (req) => new Promise((resolve) => {
      let b = ''
      req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy() })
      req.on('end', () => { try { resolve(JSON.parse(b)) } catch (err) { resolve(null) } })
      req.on('error', () => resolve(null))
    })
    const disposeRpc = webServer.register({
      kind: 'exact', path: '/dsh-wallpaper-rpc',
      handler: async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405, { 'Content-Type': 'text/plain' }); res.end('method not allowed'); return }
        const body = await readJson(req)
        const method = body && body.method
        const args = body && body.args
        const send = (obj) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(obj)) }
        try {
          if (method === 'list-songs') {
            send({ songs: Object.keys(songs).map((id) => ({ title: songs[id].title, url: '/dsh-music/' + id, key: id })) })
          } else if (method === 'load-state') {
            let st = null
            try { st = JSON.parse(fs.readFileSync(stateFile, 'utf8')) } catch (err) {}
            send({ state: st })
          } else if (method === 'save-state') {
            try { fs.writeFileSync(stateFile, JSON.stringify(args && args.state ? args.state : null)) } catch (err) {}
            send({ ok: true })
          } else if (method === 'remove-song') {
            const key = String((args && args.key) || '')
            const entry = songs[key]
            if (!entry) { send({ ok: false, error: '歌曲不存在' }); return }
            removed.add(entry.file)
            try { fs.unlinkSync(path.join(MUSIC_DIR, entry.file)) } catch (err) {}
            rebuildSongs()
            savePlaylist()
            send({ ok: true, key })
          } else if (method === 'add-bilibili-song') {
            const link = String((args && args.url) || '').trim()
            if (!link) { send({ ok: false, error: '链接为空' }); return }
            const result = await downloadBilibili(link)
            if (!result.ok) { send({ ok: false, error: result.error }); return }
            // 重新添加 = 撤销该文件的删除记录，确保列表重新显示
            if (removed.has(result.file)) {
              removed.delete(result.file)
              savePlaylist()
            }
            rebuildSongs()
            const key = Object.keys(songs).find((k) => songs[k].file === result.file)
            send({ ok: true, title: result.title, url: '/dsh-music/' + key, size: result.size })
          } else {
            send({ ok: false, error: 'unknown method: ' + method })
          }
        } catch (err) {
          send({ ok: false, error: (err && err.message) || String(err) })
        }
      },
    })
    ctx.effect(() => disposeRpc)

    console.log('[dsh-wallpaper] host ready (' + Object.keys(songs).length + ' songs, ' + Object.keys(wallpapers).length + ' wallpapers)')
  },
}
