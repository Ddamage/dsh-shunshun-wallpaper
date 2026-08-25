# 顺顺壁纸（dsh-wallpaper）

[English](./README.en.md) | 中文

为 DeepSeek Harness Web UI 提供 **GIF 壁纸** 与 **B站音乐播放器** 的一体化插件。

## 📸 预览

**壁纸动效（GIF 原片，非录屏）**

![平滑版壁纸动效](https://github.com/Ddamage/dsh-shunshun-wallpaper/releases/download/v1.0.1/rotating_horse_smooth.gif)

| 壁纸全屏效果 | 顺顺壁纸设置页 | 侧栏迷你播放器 |
|---|---|---|
| ![壁纸全屏效果](https://github.com/Ddamage/dsh-shunshun-wallpaper/releases/download/v1.0.1/wallpaper.png) | ![顺顺壁纸设置页](https://github.com/Ddamage/dsh-shunshun-wallpaper/releases/download/v1.0.1/settings.png) | ![侧栏迷你播放器](https://github.com/Ddamage/dsh-shunshun-wallpaper/releases/download/v1.0.1/mini-player.png) |

## ✨ 功能

### 壁纸
- 全屏 GIF 壁纸（动态飞马图片，大家一起干飞马⭐）
- **主题融合遮罩**：亮色主题白色遮罩、暗色主题深色遮罩，层级渐实保证文字可读
- **突出度滑块**（0–100%，默认 50%）：控制壁纸从"最不明显"到"完全突出"
- 插件启用/停用开关

### 音乐
- 随附 5 首内置歌曲（飞在八分前 / 绝不认输 / 天下 / 我会一直顺 / 飞八分钱 PHONK）
- **B站链接添加音乐**：输入 BV / av / b23.tv 链接，自动获取 30280 档位 AAC 音频流（约 200kbps）并保存为 m4a（重复标题自动拦截）
- 删除歌曲（随附歌曲删后重启不恢复，B站下载歌曲同步删除文件）
- 音量滑块、进度条 + 拖动 seek、播放失败提示
- 三种播放模式：单曲循环 / 列表循环 / 随机播放（随机模式下切歌也随机）
- 默认曲目「飞八分钱 PHONK」，自动连播
- **侧栏迷你播放器**（常驻控制：上一首 / 播放暂停 / 下一首 / 当前歌名）
- 关闭设置面板音乐不中断

### 持久化
- 设置（突出度 / 启用状态 / 音量 / 播放模式 / 当前曲目）自动保存，刷新或重启后恢复
- 播放列表与删除记录保存在 `assets/music/playlist.json`

## 📦 安装

### 方式一：npm 一键安装（推荐 🚀）

已发布到 npm：https://www.npmjs.com/package/dsh-shunshun-wallpaper

```bash
dsh plugin --profile web add dsh-shunshun-wallpaper
```

或（原生 npm 方式）：

```bash
npm install dsh-shunshun-wallpaper
```

安装后重启 DSH（`dsh web`）即可使用。

### 方式二：GitHub 源码安装

1. **克隆仓库**到本地任意位置：
   ```bash
   git clone https://github.com/Ddamage/dsh-shunshun-wallpaper.git
   ```
2. **把插件目录放入 DSH profile**（`DSH_HOME` 默认 `~/.dsh`）：
   ```bash
   cp -r dsh-wallpaper ~/.dsh/profiles/web/wallpaper-plugin
   ```
3. **在 profile 的 `package.json` 注册插件**（`~/.dsh/profiles/web/package.json`）：
   ```json
   {
     "dsh": { "profile": { "bundles": [ /* 追加 */ "dsh-shunshun-wallpaper" ] } },
     "dependencies": { /* 追加 */ "dsh-shunshun-wallpaper": "link:./wallpaper-plugin" }
   }
   ```
4. **重启 DSH**（`dsh web`），刷新浏览器即可使用。

> 机制说明：本包是 **profile bundle**——`package.json` 的 `dsh.bundle.patch` 指向包内 `cordis.patch.yml`，其中用 `insert:` 自动挂载插件行（`dsh-shunshun-wallpaper`），无需手动编辑 profile 的组合文件。profile 顶层 `cordis.patch.yml` 只用于覆盖已有条目、不能新增插件。

## 🎵 添加你自己的音乐

- **B站**：设置 → 顺顺壁纸 → 音乐 → 粘贴链接 → 添加（自动下载 30280 档位 AAC 音频）
- **本地文件**：把 `.mp3` / `.m4a` 放入 `assets/music/`，重启 DSH 自动出现在歌单

## 🖼️ 更换壁纸

把图片放入 `assets/wallpapers/`（支持 gif/png/jpg/webp），并修改 `lib/client.js` 中 `WALLPAPER_URL` 指向的文件名。

## ⚠️ 注意

- 仓库内的音乐文件为作者个人整理，发布前请自行确认版权合规
- 需要 DSH Web 模式（`dsh web`），依赖 `webServer` 服务
- **`lib/client.js` 必须是 `window.__ModuleLoader__.load({...})` 包裹的格式**（DSH 浏览器端加载要求）——修改客户端逻辑时请保持该格式，不要改回普通 ESM，否则 DSH 无法启动
- 修改代码后需同步更新安装副本（`~/.dsh/profiles/web/wallpaper-plugin/`）并重启 DSH 生效
