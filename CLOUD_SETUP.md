# 云端同步配置指南

打败懒惰科研工作台使用 **Supabase**（开源 BaaS）实现账号登录和跨设备数据同步。

## 为什么选择 Supabase？

- **免费层**：500MB PostgreSQL + 5万月活用户
- **安全**：Row Level Security (RLS) 确保用户只能访问自己的数据
- **实时**：Realtime 订阅实现跨设备即时同步
- **anon key 安全**：设计上可公开暴露，通过 RLS 保护数据（service_role key 绝不入仓库）

## 配置步骤（约 10 分钟）

### 第 1 步：注册 Supabase

1. 打开 https://supabase.com 注册账号（可用 GitHub 登录）
2. 点击 **New Project**，填入：
   - Name：`defeat-lazy`（或任意）
   - Database Password：记好这个密码
   - Region：Southeast Asia (Singapore) 离中国最近

### 第 2 步：执行数据库 SQL

1. 项目创建后，左侧导航 → **SQL Editor** → **New snippet**
2. 将本仓库的 `schema.sql` 全部内容粘贴进去
3. 点击 **Run**，确认无报错

### 第 3 步：获取 API 密钥

1. 左侧导航 → **Project Settings**（齿轮图标）→ **API**
2. 找到以下两项：
   - **Project URL**：形如 `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key**：以 `eyJ...` 开头的长字符串

### 第 4 步：配置 cloud-config.js

打开本仓库的 `cloud-config.js`，填写：

```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';    // 换成你的
const SUPABASE_ANON_KEY = 'eyJhbGci...';                      // 换成你的
```

保存后推送到 GitHub。

### 第 5 步：调整认证设置（可选）

左侧导航 → **Authentication** → **Settings**：
- **Enable email signup**：开启
- **Confirm email**：测试期间可关闭（避免每次注册都要查邮件）；正式使用时建议开启

### 第 6 步：验证

1. 打开已部署的 GitHub Pages 站点
2. 左下角应出现 **☁️ 登录 / 注册** 按钮
3. 注册账号 → 自动触发数据迁移到云端
4. 在另一台设备上用同一账号登录 → 数据自动同步

## 安全说明

| 项目 | 是否公开 | 说明 |
|------|---------|------|
| SUPABASE_URL | 公开 | 项目 URL，非密钥 |
| SUPABASE_ANON_KEY | 公开 | 设计上可暴露，RLS 保护数据 |
| service_role key | **绝不公开** | 仅用于服务端，不入此仓库 |
| Database Password | **绝不公开** | 仅你本人知道 |

## 数据安全

- **迁移前自动备份**：首次同步时自动下载 JSON 备份
- **localStorage 保留**：云端为辅，离线时本地数据不受影响
- **临床病例去标识化**：上传云端前自动清除患者姓名、住院号等
- **RLS 用户隔离**：每个用户只能读写自己的数据行

## 故障排查

**Q: 注册后提示"请检查邮箱确认"**
A: 去 Supabase Authentication > Users 手动确认用户，或关闭 Confirm email 选项。

**Q: 登录后数据没有同步**
A: 打开浏览器控制台 (F12)，搜索 `[Cloud]` 开头的日志查看详细错误。确认 cloud-config.js 中的 URL 和 Key 正确。

**Q: 实时同步不工作**
A: 确认 schema.sql 中的 `ALTER PUBLICATION supabase_realtime ADD TABLE user_data;` 执行成功。检查 Supabase Dashboard > Database > Replication，确认 `user_data` 表在 supabase_realtime 中。

**Q: 跨设备同步有延迟**
A: 防抖推送间隔为 2 秒，Realtime 通常在 1 秒内推送。如果仍然慢，可点击设置页"立即同步"手动触发。
