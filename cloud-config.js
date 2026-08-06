/* ============================================================
   云端同步配置 — Supabase
   ============================================================

   安全说明：
   - SUPABASE_URL 和 SUPABASE_PUBLISHABLE_KEY 是公开密钥，设计上可暴露在前端。
   - Supabase 使用 Row Level Security (RLS) 保护数据安全，
     publishable key 只能访问当前登录用户自己的数据。
   - service_role key / secret key / 数据库密码 绝对不可写入此文件！
   - 如果这两个值为空，云端同步功能将自动禁用，不影响本地使用。

   使用前请填写以下两项（从 Supabase 项目 Settings > API 获取）：
============================================================ */

const SUPABASE_URL = 'https://ocgrvdbpkuwcupyylcsq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_patXjfasP8xjJzJuv6SncQ_2CkEfro5';

/* 检查是否已配置 */
function isCloudConfigured() {
  return SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY &&
         SUPABASE_URL.startsWith('https://') &&
         SUPABASE_PUBLISHABLE_KEY.length > 20;
}
