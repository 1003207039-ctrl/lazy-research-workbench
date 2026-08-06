/* ============================================================
   打败懒惰科研工作台 — 云端同步核心模块
   基于 Supabase：Auth + PostgreSQL (RLS) + Realtime
   ============================================================
   架构：localStorage 为主，云端为辅
   - 离线时正常使用 localStorage
   - 在线时自动推送/拉取，实现跨设备同步
   - saveData() 触发防抖推送（2秒）
   - Realtime 监听其他设备的变更，自动拉取并合并
   - 临床病例上传前自动去标识化
   ============================================================ */

/* ===== 全局状态 ===== */
let _supabase = null;          // Supabase client 实例
let _currentUser = null;       // 当前登录用户 { id, email }
let _cloudReady = false;       // 云端功能是否可用
let _pushTimer = null;         // 防抖推送定时器
let _lastPushAt = 0;           // 上次推送时间戳（用于过滤自回声）
let _cloudUpdatedAt = null;    // 云端数据最后更新时间
let _realtimeChannel = null;   // Realtime 频道
let _isSyncing = false;        // 是否正在同步中（防止循环）
let _initialSyncDone = false;  // 初始同步是否完成
let _lastSyncTime = null;      // 最后同步时间（用于 UI 显示）

/* ===== 初始化 ===== */
async function initCloud() {
  // 检查是否已配置
  if (!isCloudConfigured()) {
    console.log('[Cloud] 未配置 Supabase，云端同步已禁用');
    updateAuthUI();
    return;
  }

  try {
    // 创建 Supabase client（使用全局 window.supabase.createClient）
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    // 检查现有 session
    const { data: { session }, error } = await _supabase.auth.getSession();
    if (error) {
      console.warn('[Cloud] 获取 session 失败:', error.message);
    } else if (session) {
      _currentUser = session.user;
      _cloudReady = true;
      console.log('[Cloud] 已登录:', _currentUser.email);
      await _initialSync();
      _subscribeRealtime();
    }

    // 监听认证状态变化
    _supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Cloud] Auth 事件:', event);
      if (event === 'SIGNED_IN' && session) {
        _currentUser = session.user;
        _cloudReady = true;
        await _initialSync();
        _subscribeRealtime();
      } else if (event === 'SIGNED_OUT') {
        _currentUser = null;
        _cloudReady = false;
        if (_realtimeChannel) {
          _realtimeChannel.unsubscribe();
          _realtimeChannel = null;
        }
        _initialSyncDone = false;
        _lastSyncTime = null;
      }
      updateAuthUI();
    });

    updateAuthUI();
  } catch (e) {
    console.error('[Cloud] 初始化失败:', e);
    updateAuthUI();
  }
}

/* ===== 认证 ===== */
async function cloudSignUp(email, password) {
  if (!_supabase) return { error: '云端未初始化' };
  const { data, error } = await _supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (data.user && !data.session) {
    return { needConfirm: true, message: '注册成功！请检查邮箱确认后登录。' };
  }
  return { success: true };
}

async function cloudSignIn(email, password) {
  if (!_supabase) return { error: '云端未初始化' };
  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { success: true };
}

async function cloudSignOut() {
  if (!_supabase) return;
  await _supabase.auth.signOut();
  _currentUser = null;
  _cloudReady = false;
  _initialSyncDone = false;
  _lastSyncTime = null;
  toast('已退出登录');
  updateAuthUI();
}

/* ===== 保存钩子（被 app.js 的 saveData() 调用）===== */
function cloudSaveHook() {
  if (!_cloudReady || !_currentUser) return;
  // 防抖推送：2秒后执行，避免频繁写入
  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(() => _pushToCloud(), 2000);
}

/* ===== 推送数据到云端 ===== */
async function _pushToCloud(isMigration = false) {
  if (!_cloudReady || !_currentUser || _isSyncing) return;
  _isSyncing = true;
  _lastPushAt = Date.now();
  updateSyncStatus('pushing');

  try {
    // 深拷贝并去标识化临床病例
    const dataCopy = JSON.parse(JSON.stringify(DATA));
    _anonymizeCases(dataCopy);

    const { error } = await _supabase
      .from('user_data')
      .upsert({
        user_id: _currentUser.id,
        data: dataCopy,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    _cloudUpdatedAt = new Date().toISOString();
    _lastSyncTime = new Date();
    updateSyncStatus(isMigration ? 'synced' : 'idle');
    console.log('[Cloud] 推送成功', isMigration ? '(迁移)' : '');
  } catch (e) {
    console.error('[Cloud] 推送失败:', e.message);
    updateSyncStatus('error');
  } finally {
    _isSyncing = false;
  }
}

/* ===== 从云端拉取数据 ===== */
async function _pullFromCloud() {
  if (!_cloudReady || !_currentUser) return null;
  _isSyncing = true;

  try {
    const { data, error } = await _supabase
      .from('user_data')
      .select('data, updated_at')
      .eq('user_id', _currentUser.id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      _cloudUpdatedAt = data.updated_at;
      return data.data;
    }
    return null;
  } catch (e) {
    console.error('[Cloud] 拉取失败:', e.message);
    return null;
  } finally {
    _isSyncing = false;
  }
}

/* ===== 初始同步（登录后首次）===== */
async function _initialSync() {
  if (_initialSyncDone) return;
  updateSyncStatus('syncing');

  try {
    // 1. 先创建静默备份（安全第一）
    _exportBackupSilent();

    // 2. 拉取云端数据
    const cloudData = await _pullFromCloud();

    if (!cloudData || Object.keys(cloudData).length === 0) {
      // 云端无数据 → 检查本地是否有数据需要迁移
      const localHasData = _checkLocalHasData();
      if (localHasData) {
        // 弹出迁移确认对话框
        const shouldMigrate = await _showMigrationPrompt();
        if (shouldMigrate) {
          console.log('[Cloud] 用户确认迁移，执行首次上传');
          await _pushToCloud(true);
          _lastSyncTime = new Date();
          toast('数据已迁移到云端');
        } else {
          console.log('[Cloud] 用户跳过迁移');
          toast('已跳过迁移，本地数据不受影响');
        }
      } else {
        // 本地也无数据，无需迁移
        console.log('[Cloud] 本地无数据，跳过迁移');
      }
    } else {
      // 云端有数据 → 合并
      console.log('[Cloud] 云端有数据，执行合并');
      _mergeData(DATA, cloudData);
      saveData(); // 保存合并后的数据到 localStorage
      // 重新渲染当前页面
      renderPage(currentPage);
      updateBadges();
      _lastSyncTime = new Date();
      toast('已从云端同步数据');
    }

    _initialSyncDone = true;
    updateSyncStatus('idle');
    updateAuthUI();
  } catch (e) {
    console.error('[Cloud] 初始同步失败:', e);
    updateSyncStatus('error');
  }
}

/* ===== 检查本地是否有实质数据 ===== */
function _checkLocalHasData() {
  if (!DATA) return false;
  const keys = ['tasks', 'inbox', 'weeklyPapers', 'dailyPapers', 'researchProjects',
    'paperWritings', 'paperSubmits', 'library', 'clinicGuidelines', 'clinicSkills',
    'clinicCases', 'clinicDuties', 'clinicWords', 'clinicRounds', 'clinicQuizzes', 'checkinGoals'];
  for (const k of keys) {
    if (DATA[k] && Array.isArray(DATA[k]) && DATA[k].length > 0) return true;
  }
  if (DATA.checkin && Object.keys(DATA.checkin).length > 0) return true;
  return false;
}

/* ===== 迁移确认对话框 ===== */
function _showMigrationPrompt() {
  return new Promise(resolve => {
    const bodyHTML = `
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:48px;margin-bottom:12px">☁️</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">检测到本地有数据</div>
        <div style="font-size:13px;color:var(--text-sub);line-height:1.6;margin-bottom:16px">
          云端暂无数据。是否将本地数据迁移到云端？<br/>
          迁移后即可在多设备间同步。
        </div>
        <div class="alert-box alert-warning" style="margin-bottom:16px;text-align:left">
          <span>⚠️</span>
          <div>建议先导出备份再迁移。迁移不会删除本地数据。</div>
        </div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn-mini" id="btn-export-first" style="background:var(--border);color:var(--text)">
            💾 先导出备份
          </button>
          <button class="btn-mini" id="btn-migrate-yes" style="background:var(--primary);color:#fff">
            ✅ 确认迁移
          </button>
          <button class="btn-mini" id="btn-migrate-no" style="background:var(--border);color:var(--text-sub)">
            跳过
          </button>
        </div>
      </div>
    `;

    openModal('数据迁移', bodyHTML, null);

    // 绑定按钮
    setTimeout(() => {
      const btnExport = document.getElementById('btn-export-first');
      const btnYes = document.getElementById('btn-migrate-yes');
      const btnNo = document.getElementById('btn-migrate-no');

      if (btnExport) {
        btnExport.onclick = () => {
          exportBackupBeforeMigration();
          toast('备份已下载');
        };
      }
      if (btnYes) {
        btnYes.onclick = () => {
          closeModal();
          resolve(true);
        };
      }
      if (btnNo) {
        btnNo.onclick = () => {
          closeModal();
          resolve(false);
        };
      }
    }, 50);
  });
}

/* ===== Realtime 订阅 ===== */
function _subscribeRealtime() {
  if (!_supabase || !_currentUser || _realtimeChannel) return;

  _realtimeChannel = _supabase
    .channel('user_data_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_data',
      filter: `user_id=eq.${_currentUser.id}`
    }, async (payload) => {
      // 自回声过滤：忽略自己刚推送的变更
      const payloadTime = new Date(payload.commit_timestamp || payload.new?.updated_at).getTime();
      if (_lastPushAt && payloadTime < _lastPushAt + 3000) {
        console.log('[Cloud] 忽略自身推送回声');
        return;
      }

      console.log('[Cloud] 收到 Realtime 变更');
      // 拉取最新数据并合并
      const cloudData = await _pullFromCloud();
      if (cloudData) {
        _mergeData(DATA, cloudData);
        saveData();
        renderPage(currentPage);
        updateBadges();
        _lastSyncTime = new Date();
        toast('已同步其他设备的更新');
        updateSyncStatus('idle');
        updateAuthUI();
      }
    })
    .subscribe();

  console.log('[Cloud] Realtime 已订阅');
}

/* ===== 数据合并（深度合并，云端优先）===== */
function _mergeData(localData, cloudData) {
  // 对每个集合，云端数据优先
  // 对于数组类数据，使用并集合并（按 id 去重）
  // 对于设置类数据，取云端版本
  // 对于打卡历史类，使用并集

  const arrayKeys = [
    'tasks', 'inbox', 'weeklyPapers', 'dailyPapers', 'researchProjects',
    'paperWritings', 'paperSubmits', 'library', 'clinicGuidelines',
    'clinicSkills', 'clinicCases', 'clinicDuties', 'clinicWords',
    'clinicRounds', 'clinicQuizzes', 'checkinGoals'
  ];

  // 数组类：按 id 并集，同 id 取较新版本
  arrayKeys.forEach(key => {
    if (!cloudData[key]) return;
    const localArr = localData[key] || [];
    const cloudArr = cloudData[key];
    const merged = [];
    const idMap = new Map();

    // 先放云端数据
    cloudArr.forEach(item => {
      if (item.id) {
        idMap.set(item.id, { ...item, _source: 'cloud' });
      }
    });

    // 再合并本地数据（本地独有的添加，冲突时保留云端版本）
    localArr.forEach(item => {
      if (item.id) {
        if (!idMap.has(item.id)) {
          idMap.set(item.id, { ...item, _source: 'local' });
        }
        // 已有则保留云端版本
      } else {
        // 无 id 的直接添加
        merged.push(item);
      }
    });

    // 合并结果
    idMap.forEach(v => merged.push(v));
    localData[key] = merged;
  });

  // 设置类：深度合并
  if (cloudData.settings) {
    localData.settings = deepMerge(localData.settings || {}, cloudData.settings);
  }

  // 打卡类：并集合并 history
  if (cloudData.checkin) {
    Object.keys(cloudData.checkin).forEach(k => {
      if (!localData.checkin[k]) {
        localData.checkin[k] = cloudData.checkin[k];
      } else {
        // 合并 history（并集）
        const mergedHistory = { ...localData.checkin[k].history, ...cloudData.checkin[k].history };
        localData.checkin[k].history = mergedHistory;
        // 取较大的 target
        localData.checkin[k].target = cloudData.checkin[k].target || localData.checkin[k].target;
      }
    });
  }

  // fitness / weight
  if (cloudData.fitness) {
    localData.fitness = {
      records: localData.fitness?.records || [],
      target: cloudData.fitness.target || localData.fitness?.target || 2,
      history: { ...(localData.fitness?.history || {}), ...cloudData.fitness.history }
    };
  }
  if (cloudData.weight) {
    const localW = localData.weight || {};
    const cloudW = cloudData.weight;
    localData.weight = {
      records: localW.records || [],
      fastingLog: { ...localW.fastingLog, ...cloudW.fastingLog },
      target: cloudW.target || localW.target || 3,
      weightHistory: cloudW.weightHistory || localW.weightHistory || [],
      dietLog: { ...localW.dietLog, ...cloudW.dietLog }
    };
  }

  // meta
  if (cloudData.meta) {
    localData.meta = { ...localData.meta, ...cloudData.meta };
  }
}

/* ===== 临床病例去标识化 ===== */
function _anonymizeCases(data) {
  if (!data.clinicCases || !Array.isArray(data.clinicCases)) return;
  data.clinicCases = data.clinicCases.map(c => {
    const anon = JSON.parse(JSON.stringify(c));
    // patient 字段已为去标识化格式（如"女，52岁，G3P2，绝经2年"），保留
    // 但标记为已去标识化
    anon._anonymized = true;
    // 清除可能存在的姓名/住院号等
    delete anon.patientName;
    delete anon.hospitalId;
    delete anon.bedNo;
    return anon;
  });
}

/* ===== 静默导出备份（不触发下载，仅存 localStorage）===== */
function _exportBackupSilent() {
  try {
    const backupKey = `defeat_lazy_backup_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(DATA));
    console.log('[Cloud] 本地备份已创建:', backupKey);
    // 保留最近 3 个备份
    const backups = Object.keys(localStorage)
      .filter(k => k.startsWith('defeat_lazy_backup_'))
      .sort();
    while (backups.length > 3) {
      localStorage.removeItem(backups.shift());
    }
  } catch (e) {
    console.warn('[Cloud] 备份创建失败:', e);
  }
}

/* ===== 迁移前导出备份（触发下载）===== */
function exportBackupBeforeMigration() {
  try {
    const json = JSON.stringify(DATA, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `defeat_lazy_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[Cloud] 备份文件已下载');
  } catch (e) {
    console.error('[Cloud] 备份导出失败:', e);
  }
}

/* ===== 格式化同步时间 ===== */
function _formatSyncTime() {
  if (!_lastSyncTime) return '';
  const now = new Date();
  const diff = now - _lastSyncTime;
  if (diff < 60000) return '刚刚同步';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前同步`;
  const h = _lastSyncTime.getHours().toString().padStart(2, '0');
  const m = _lastSyncTime.getMinutes().toString().padStart(2, '0');
  return `今天 ${h}:${m} 同步`;
}

/* ===== UI：认证状态显示 ===== */
function updateAuthUI() {
  const container = document.getElementById('auth-container');
  if (!container) return;

  if (!_supabase || !isCloudConfigured()) {
    container.innerHTML = `
      <div class="auth-notice">
        <span class="auth-dot auth-dot-off"></span>
        <span class="auth-text-off">云端未配置</span>
      </div>`;
    // 也更新设置页的云端状态
    _updateSettingsCloudStatus();
    return;
  }

  if (_currentUser) {
    const email = _currentUser.email || '';
    const initial = email.charAt(0).toUpperCase();
    const syncTimeStr = _formatSyncTime();
    container.innerHTML = `
      <div class="auth-user">
        <div class="auth-avatar">${initial}</div>
        <div class="auth-info">
          <div class="auth-email" title="${email}">${email}</div>
          <div class="auth-status">
            <span class="sync-dot" id="sync-dot"></span>
            <span id="sync-text">已同步</span>
            ${syncTimeStr ? `<span class="sync-time" id="sync-time">${syncTimeStr}</span>` : ''}
          </div>
        </div>
        <button class="auth-logout" onclick="cloudSignOut()" title="退出登录">退出</button>
      </div>`;
  } else {
    container.innerHTML = `
      <button class="btn-cloud-login" onclick="showAuthModal()">
        <span class="cloud-icon">☁️</span> 登录 / 注册
      </button>`;
  }

  // 更新设置页的云端状态
  _updateSettingsCloudStatus();
}

/* ===== 更新设置页云端状态 ===== */
function _updateSettingsCloudStatus() {
  const statusBox = document.getElementById('cloud-status-box');
  const statusText = document.getElementById('cloud-status-text');
  if (!statusBox || !statusText) return;

  if (!isCloudConfigured()) {
    statusBox.className = 'alert-box alert-warning';
    statusText.innerHTML = '云端同步未配置。请参考 <b>CLOUD_SETUP.md</b> 配置 Supabase。';
  } else if (_currentUser) {
    statusBox.className = 'alert-box alert-success';
    const syncTimeStr = _formatSyncTime();
    statusText.innerHTML = `已登录：<b>${_currentUser.email}</b>${syncTimeStr ? ' · ' + syncTimeStr : ''}`;
  } else {
    statusBox.className = 'alert-box alert-info';
    statusText.innerHTML = '云端已配置，请点击左下角「登录 / 注册」开始使用。';
  }
}

/* ===== UI：同步状态指示器 ===== */
function updateSyncStatus(status) {
  const dot = document.getElementById('sync-dot');
  const text = document.getElementById('sync-text');
  if (!dot || !text) return;

  const states = {
    idle:    { color: 'var(--green)', label: '已同步' },
    pushing: { color: 'var(--orange)', label: '推送中…' },
    syncing: { color: 'var(--orange)', label: '同步中…' },
    error:   { color: 'var(--red)', label: '同步失败' },
    synced:  { color: 'var(--green)', label: '同步完成' }
  };

  const s = states[status] || states.idle;
  dot.style.background = s.color;
  text.textContent = s.label;

  // 同步完成后更新同步时间
  if (status === 'idle' || status === 'synced') {
    const timeEl = document.getElementById('sync-time');
    if (timeEl && _lastSyncTime) {
      timeEl.textContent = _formatSyncTime();
    }
  }
}

/* ===== UI：登录/注册模态框 ===== */
function showAuthModal() {
  const bodyHTML = `
    <div class="auth-tabs">
      <button class="auth-tab active" id="tab-login" onclick="switchAuthTab('login')">登录</button>
      <button class="auth-tab" id="tab-signup" onclick="switchAuthTab('signup')">注册</button>
    </div>
    <div class="auth-form">
      <div class="form-field">
        <label>邮箱</label>
        <input type="email" id="auth-email" placeholder="your@email.com" autocomplete="email" />
      </div>
      <div class="form-field">
        <label>密码</label>
        <input type="password" id="auth-password" placeholder="至少6位" autocomplete="current-password" />
      </div>
      <div id="auth-message" class="auth-message"></div>
    </div>
  `;

  openModal('云端同步 · 账号', bodyHTML, async () => {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const msgEl = document.getElementById('auth-message');
    const tab = document.querySelector('.auth-tab.active');
    const isLogin = tab && tab.id === 'tab-login';

    if (!email || !password) {
      msgEl.innerHTML = '<span style="color:var(--red)">请填写邮箱和密码</span>';
      return;
    }
    if (password.length < 6) {
      msgEl.innerHTML = '<span style="color:var(--red)">密码至少6位</span>';
      return;
    }

    msgEl.innerHTML = '<span style="color:var(--text-sub)">处理中…</span>';

    const result = isLogin
      ? await cloudSignIn(email, password)
      : await cloudSignUp(email, password);

    if (result.error) {
      msgEl.innerHTML = `<span style="color:var(--red)">${result.error}</span>`;
      return;
    }

    if (result.needConfirm) {
      msgEl.innerHTML = `<span style="color:var(--green)">${result.message}</span>`;
      setTimeout(() => closeModal(), 2000);
      return;
    }

    // 登录/注册成功
    closeModal();
    toast(isLogin ? '登录成功！正在同步数据…' : '注册成功！正在同步数据…');
    // _initialSync 会在 auth state change 时自动触发
  });
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(el => {
    el.classList.toggle('active', el.id === 'tab-' + tab);
  });
  const title = document.getElementById('modal-title');
  if (title) title.textContent = tab === 'login' ? '云端同步 · 登录' : '云端同步 · 注册';
}

/* ===== 手动同步（设置页面按钮）===== */
async function manualSyncNow() {
  if (!_cloudReady || !_currentUser) {
    toast('请先登录');
    return;
  }
  toast('正在同步…');
  await _pushToCloud();
  const cloudData = await _pullFromCloud();
  if (cloudData) {
    _mergeData(DATA, cloudData);
    saveData();
    renderPage(currentPage);
    updateBadges();
    _lastSyncTime = new Date();
    toast('同步完成');
    updateAuthUI();
  }
}

/* ===== 全局暴露 ===== */
window.initCloud = initCloud;
window.cloudSaveHook = cloudSaveHook;
window.cloudSignUp = cloudSignUp;
window.cloudSignIn = cloudSignIn;
window.cloudSignOut = cloudSignOut;
window.showAuthModal = showAuthModal;
window.switchAuthTab = switchAuthTab;
window.manualSyncNow = manualSyncNow;
window.exportBackupBeforeMigration = exportBackupBeforeMigration;
