/* ============================================================
   云端同步配置 — Supabase
   ============================================================

   安全说明：
   - SUPABASE_URL 和 SUPABASE_ANON_KEY 是公开密钥，设计上可暴露在前端。
   - Supabase 使用 Row Level Security (RLS) 保护数据安全，
     anon key 只能访问当前登录用户自己的数据。
   - service_role key 绝对不可写入此文件或任何前端代码！
   - 如果这两个值为空，云端同步功能将自动禁用，不影响本地使用。

   使用前请填写以下两项（从 Supabase 项目 Settings > API 获取）：
============================================================ */

const SUPABASE_URL = '';       // 例：https://xxxxxxxxxxxx.supabase.co
const SUPABASE_ANON_KEY = '';  // eyJ... 开头的长字符串

/* 检查是否已配置 */
function isCloudConfigured() {
  return SUPABASE_URL && SUPABASE_ANON_KEY &&
         SUPABASE_URL.startsWith('https://') &&
         SUPABASE_ANON_KEY.length > 50;
}
