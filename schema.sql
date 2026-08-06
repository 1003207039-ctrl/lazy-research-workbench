-- ============================================================
-- 打败懒惰科研工作台 — Supabase 数据库 Schema
-- ============================================================
-- 在 Supabase Dashboard > SQL Editor 中执行此文件
-- ============================================================

-- 1. 创建用户数据表（单表 JSONB 架构）
CREATE TABLE IF NOT EXISTS user_data (
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  data      JSONB  NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 启用行级安全 (RLS)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- 3. RLS 策略：用户只能操作自己的数据
--    SELECT: 只能读自己的行
CREATE POLICY "users_select_own" ON user_data
  FOR SELECT USING (auth.uid() = user_id);

--    INSERT: 只能插入自己的行
CREATE POLICY "users_insert_own" ON user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

--    UPDATE: 只能更新自己的行
CREATE POLICY "users_update_own" ON user_data
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

--    DELETE: 只能删除自己的行
CREATE POLICY "users_delete_own" ON user_data
  FOR DELETE USING (auth.uid() = user_id);

-- 4. updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_data_updated ON user_data;
CREATE TRIGGER trg_user_data_updated
  BEFORE UPDATE ON user_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. 启用 Realtime（用于跨设备实时同步）
ALTER TABLE user_data REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE user_data;

-- ============================================================
-- 执行完毕后，在 Authentication > Settings 中：
--   1. 确认 "Enable email signup" 已开启
--   2. 可选：关闭 "Confirm email" 方便测试（正式使用时再开启）
-- ============================================================
