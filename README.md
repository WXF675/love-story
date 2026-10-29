# 我们的恋爱记录

一个单文件的恋爱记录网页应用：在一起天数、时间线、相册、日记、纪念日倒计时、纪念卡、背景音乐，可选云端同步。

## 本地打开

双击 `index.html`，用浏览器打开即可。数据保存在当前浏览器的 localStorage 里，关掉再打开还在。

## 部署到网上

这是纯静态页面，任选一种方式，免费。

### Netlify（最简单）

1. 打开 <https://app.netlify.com/drop>
2. 把整个 `love-story` 文件夹拖进去
3. 等几秒拿到网址，手机扫码就能打开
4. 注册账号后可以改名、保留站点

### GitHub Pages

1. 在 GitHub 新建一个仓库
2. 上传 `index.html`（需要音乐的话连同 `music.mp3` 一起传）
3. 仓库 Settings → Pages → Source 选 **Deploy from a branch** → 分支 `main`、目录 `/ (root)` → Save
4. 等一两分钟，访问 `https://<用户名>.github.io/<仓库名>/`

> 部署后页面本身是公开的，但你录入的内容只存在各自设备的浏览器里。别人打开看到的是空白的初始页面，看不到你的照片和日记。

## 背景音乐

- 把 MP3 文件放到 `index.html` 同目录，在「设置 → 背景音乐」里填 `music.mp3`
- 或者填一个音频直链（`https://.../song.mp3`）
- 浏览器禁止自动播放，打开页面后点右下角的 ♪ 开始

## 云端同步（可选，Supabase）

用于两台设备共享同一份数据。

1. 注册 <https://supabase.com>，新建一个免费项目
2. 打开项目的 **SQL Editor**，执行下面这段（在应用的「设置 → 云端同步 → 查看建表 SQL」里也能复制）：

```sql
create table if not exists public.love_sync (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.love_sync enable row level security;

create policy "love_sync read" on public.love_sync
  for select using (true);
create policy "love_sync insert" on public.love_sync
  for insert with check (true);
create policy "love_sync update" on public.love_sync
  for update using (true) with check (true);
```

3. 在 **Project Settings → API** 复制 `Project URL` 和 `anon public` key
4. 两台设备都填这三项：项目 URL、anon key、同一个房间码（自己定一串随机字母数字）
5. 先在一台设备点「立即上传」，另一台点「从云端下载」

说明：

- 这是简化的整份覆盖方案：谁最后上传，云端就是谁的版本；下载会覆盖本机数据（会弹窗确认）。
- 同步包含照片（base64），数据量大时上传会慢一些。
- 知道 URL、anon key 和房间码的人可以读写这份数据，房间码请用足够随机的一串。

## 数据与隐私

- 数据存在浏览器 localStorage，容量约 5 MB；照片上传时会自动压缩，空间不足时先导出备份再删照片
- 「导出备份」会生成一个 JSON 文件，包含全部内容（含同步设置），**不要发给别人**
- 清除浏览器数据会丢失全部内容，建议定期导出备份

## 文件说明

- `index.html` — 全部功能，单文件
- `music.mp3` — 可选的背景音乐（自己放进来）
- `README.md` — 本说明
- `dev-server.js` — 仅用于本地预览（在项目目录运行 `node dev-server.js`，访问 http://127.0.0.1:5173），部署时不需要上传
