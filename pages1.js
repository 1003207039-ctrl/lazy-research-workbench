/* ============================================================
   页面渲染函数
   ============================================================ */

/* ============== 今日看板 ============== */
function renderDashboard(root) {
  const today = new Date();
  const hour = today.getHours();
  const week = getWeek(today);
  const todayKey = todayStr();

  // 时间问候
  let greeting = '晚上好';
  if (hour < 6) greeting = '夜深了';
  else if (hour < 11) greeting = '早上好';
  else if (hour < 14) greeting = '中午好';
  else if (hour < 18) greeting = '下午好';
  else if (hour < 22) greeting = '晚上好';

  const profileName = DATA.settings?.profile?.name || 'Doctor';
  const dayNames = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];

  // 连续打卡天数（取所有打卡项的最大值）
  const checkinKeys = Object.keys(DATA.checkin);
  let maxStreak = 0;
  checkinKeys.forEach(k => { const s = calcStreak(DATA.checkin[k].history); if (s > maxStreak) maxStreak = s; });

  // 今日必须完成（最多3项，优先紧急+自定义）
  const allTasks = getTodayTasks();
  const mustDo = [...allTasks.filter(t => t.urgent || t.custom), ...allTasks.filter(t => !t.urgent && !t.custom)].slice(0, 3);

  // 快速打卡项
  const checkinItems = [
    { key: 'weekly-paper', icon: '📖', label: '文献精读', page: 'weekly-paper' },
    { key: 'daily-paper', icon: '📰', label: '每日推送', page: 'daily-paper' },
    { key: 'guideline', icon: '📋', label: '临床指南', page: 'clinic-guideline' },
    { key: 'clinic-skill', icon: '🩺', label: '临床操作', page: 'clinic-skill' },
    { key: 'clinic-case', icon: '📊', label: '病例分析', page: 'clinic-case' },
    { key: 'words', icon: '🔤', label: '英语单词', page: 'clinic-words' },
    { key: 'quiz', icon: '📝', label: '规培刷题', page: 'clinic-quiz' },
    { key: 'fitness', icon: '💪', label: '健身打卡', page: 'fitness' },
    { key: 'weight-fast', icon: '🌙', label: '晚间空腹', page: 'weight' }
  ];

  // 本周目标
  const goals = getWeekGoals();

  // 近7天打卡趋势
  const trendLabels = [], trendData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = fmtDate(d);
    trendLabels.push(['日','一','二','三','四','五','六'][d.getDay()]);
    let cnt = 0; checkinKeys.forEach(k => { if (DATA.checkin[k].history[ds]) cnt++; });
    trendData.push(cnt);
  }

  // 三单元完成率
  const researchTasks = ['weekly-paper', 'daily-paper'];
  const clinicTasks = ['guideline', 'clinic-skill', 'clinic-case', 'words', 'quiz'];
  const lifeTasks = ['fitness', 'weight-fast'];
  const unitRate = keys => Math.round(keys.filter(k => isCheckinDone(k, todayKey)).length / keys.length * 100);

  // 统计数据
  const wp = DATA.weeklyPapers.filter(x => x.week === week);
  const dp = DATA.dailyPapers.filter(x => x.date === todayKey).length;
  const onWrit = DATA.paperWritings.filter(x => x.status !== '已发表' && x.status !== '已投稿').length;
  const onSub = DATA.paperSubmits.filter(x => !['见刊','Accepted','已上线'].includes(x.status)).length;
  const monthStats = calcMonthStats(DATA.fitness.history, today.getFullYear(), today.getMonth());
  const kwTags = (DATA.settings?.keywords || []).filter(k => k.active).slice(0, 13).map(k => `<span>#${k.text}</span>`).join('');

  root.innerHTML = `
    <div class="welcome-banner">
      <h2>${greeting}，${profileName} 👩‍⚕️</h2>
      <p>${cnDate(today)} · ${dayNames[today.getDay()]} · 第${week}周 · 🔥连续打卡 <b style="color:#e17055">${maxStreak}</b> 天 · 已坚持 <b>${Math.ceil((Date.now() - DATA.meta.created) / 86400000) + 1}</b> 天</p>
      <div class="keywords">${kwTags}</div>
    </div>

    <div class="grid-4">
      <div class="stat-card">
        <div class="stat-icon t-purple">📅</div>
        <div class="stat-label">本周精读文献</div>
        <div class="stat-value">${wp.length} <span style="font-size:14px;font-weight:400;color:var(--text-sub)">/${DATA.settings?.goals?.weeklyPaper || 1} 篇</span></div>
        <div class="stat-foot">${wp.length >= 1 ? '🎉 本周已完成' : '⏰ 还没开始'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-pink">📰</div>
        <div class="stat-label">今日文献推送</div>
        <div class="stat-value">${dp} <span style="font-size:14px;font-weight:400;color:var(--text-sub)">/${DATA.settings?.goals?.dailyPaper || 10} 篇</span></div>
        <div class="stat-foot">${dp >= 10 ? '✨ 已收齐' : '继续浏览'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-orange">✍️</div>
        <div class="stat-label">撰写中论文</div>
        <div class="stat-value">${onWrit} <span style="font-size:14px;font-weight:400;color:var(--text-sub)">篇</span></div>
        <div class="stat-foot">投稿中 ${onSub} 篇</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-green">💪</div>
        <div class="stat-label">本月健身</div>
        <div class="stat-value">${monthStats.count} <span style="font-size:14px;font-weight:400;color:var(--text-sub)">次</span></div>
        <div class="stat-foot">连续 ${calcStreak(DATA.fitness.history)} 天</div>
      </div>
    </div>

    <!-- 今日必须完成 -->
    <div class="card" style="margin-top:20px">
      <div class="card-title">
        <span class="icon t-pink">🎯</span>今日必须完成
        <span style="margin-left:auto;font-size:12px;color:var(--text-sub);font-weight:400">最多 3 项</span>
      </div>
      ${mustDo.length ? mustDo.map(t => `
        <div class="task-item ${t.done ? 'done' : ''}" onclick="gotoPage('${t.page}')">
          <div class="task-check" onclick="event.stopPropagation();${t.custom && t.id ? `toggleTask('${t.id}');renderPage('dashboard')` : ''}">${t.done ? '✓' : ''}</div>
          <span class="task-icon">${t.icon}</span>
          <span class="task-title">${t.text}</span>
          ${t.urgent ? '<span class="tag tag-orange" style="flex-shrink:0">紧急</span>' : ''}
        </div>
      `).join('') : '<div class="empty" style="padding:20px"><div class="emoji">🎉</div>今天没有必须完成的事项，继续保持！</div>'}
    </div>

    <!-- 快速打卡 -->
    <div class="card" style="margin-top:4px">
      <div class="card-title">
        <span class="icon t-green">⚡</span>快速打卡
        <span style="margin-left:auto;font-size:12px;color:var(--text-sub);font-weight:400">点击切换打卡状态</span>
      </div>
      <div class="quick-checkin-grid" id="dash-checkin"></div>
    </div>

    <!-- 本周目标 + 7天趋势 -->
    <div class="grid-2" style="margin-top:4px">
      <div class="card">
        <div class="card-title"><span class="icon t-purple">📊</span>本周目标进度</div>
        ${goals.map(g => `
          <div class="week-goal" onclick="gotoPage('${g.page}')">
            <span class="wg-label">${g.label}</span>
            <div class="wg-bar"><div class="wg-bar-fill" style="width:${Math.min(100, g.current / g.target * 100)}%;background:${g.color}"></div></div>
            <span class="wg-text">${g.current}/${g.target}</span>
          </div>
        `).join('')}
      </div>
      <div class="card">
        <div class="card-title"><span class="icon t-orange">📈</span>近7天打卡趋势</div>
        <div class="trend-row" id="dash-trend"></div>
        <div class="trend-labels" id="dash-trend-labels"></div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-sub);text-align:center">每日打卡项完成数（共${checkinKeys.length}项）</div>
      </div>
    </div>

    <!-- 三单元完成率 -->
    <div class="grid-3" style="margin-top:4px">
      <div class="card" style="text-align:center">
        <div class="card-title" style="justify-content:center"><span class="icon t-purple">🔬</span>科研奋斗</div>
        <div id="dash-donut-research" style="display:flex;justify-content:center"></div>
        <div style="font-size:11px;color:var(--text-sub);margin-top:4px">今日 ${researchTasks.filter(k => isCheckinDone(k, todayKey)).length}/${researchTasks.length}</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="card-title" style="justify-content:center"><span class="icon t-pink">🩺</span>临床工作</div>
        <div id="dash-donut-clinic" style="display:flex;justify-content:center"></div>
        <div style="font-size:11px;color:var(--text-sub);margin-top:4px">今日 ${clinicTasks.filter(k => isCheckinDone(k, todayKey)).length}/${clinicTasks.length}</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="card-title" style="justify-content:center"><span class="icon t-green">🌿</span>生活精致</div>
        <div id="dash-donut-life" style="display:flex;justify-content:center"></div>
        <div style="font-size:11px;color:var(--text-sub);margin-top:4px">今日 ${lifeTasks.filter(k => isCheckinDone(k, todayKey)).length}/${lifeTasks.length}</div>
      </div>
    </div>

    <!-- 项目+论文进度 -->
    <div class="grid-2" style="margin-top:4px">
      <div class="card">
        <div class="card-title"><span class="icon t-purple">🚀</span>科研项目进度</div>
        ${DATA.researchProjects.map(p => `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:4px">
              <span style="flex:1;margin-right:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${p.name}</b></span>
              <span class="tag tag-purple" style="flex-shrink:0">${p.status}</span>
            </div>
            <div class="progress"><div class="progress-bar" style="width:${p.progress}%"></div></div>
          </div>
        `).join('') || '<div class="empty">还没有科研项目</div>'}
      </div>
      <div class="card">
        <div class="card-title"><span class="icon t-orange">✍️</span>论文撰写进度</div>
        ${DATA.paperWritings.slice(0, 3).map(p => `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:4px">
              <span style="flex:1;margin-right:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${p.title}</b></span>
              <span class="tag tag-pink" style="flex-shrink:0">${p.status}</span>
            </div>
            <div class="progress"><div class="progress-bar" style="width:${p.progress}%;background:linear-gradient(90deg,var(--pink),#fab1a0)"></div></div>
          </div>
        `).join('') || '<div class="empty">还没有论文</div>'}
      </div>
    </div>
  `;

  // 渲染快速打卡网格
  const qcc = document.getElementById('dash-checkin');
  qcc.innerHTML = checkinItems.map(item => {
    const done = isCheckinDone(item.key, todayKey);
    return `<div class="quick-checkin-item ${done ? 'done' : ''}" data-key="${item.key}">
      <span class="qc-icon">${item.icon}</span>
      <span class="qc-label">${item.label}</span>
      <span style="font-size:10px;color:${done ? 'var(--green)' : 'var(--text-sub)'}">${done ? '✓ 已打卡' : '○ 未打卡'}</span>
    </div>`;
  }).join('');
  qcc.querySelectorAll('.quick-checkin-item').forEach(el => {
    el.onclick = () => {
      const key = el.dataset.key;
      const item = checkinItems.find(i => i.key === key);
      if (isCheckinDone(key, todayKey)) {
        uncheckin(key, todayKey);
      } else {
        checkin(key, todayKey);
        toast('🎉 ' + item.label + ' 打卡成功！');
      }
      renderPage('dashboard');
    };
  });

  // 渲染7天趋势
  const trendEl = document.getElementById('dash-trend');
  const trendLbl = document.getElementById('dash-trend-labels');
  const maxT = Math.max(...trendData, 1);
  trendEl.innerHTML = trendData.map((v, i) => {
    const isToday = i === 6;
    return `<div class="trend-bar" style="height:${v / maxT * 100}%;background:${isToday ? 'var(--orange)' : 'var(--primary)'};opacity:${isToday ? 1 : 0.55}" title="${v}项完成"></div>`;
  }).join('');
  trendLbl.innerHTML = trendLabels.map(l => `<span>${l}</span>`).join('');

  // 渲染三单元环形图
  renderDonut(document.getElementById('dash-donut-research'), unitRate(researchTasks), '#6c5ce7');
  renderDonut(document.getElementById('dash-donut-clinic'), unitRate(clinicTasks), '#e84393');
  renderDonut(document.getElementById('dash-donut-life'), unitRate(lifeTasks), '#00b894');
}

/* ============== 每周文献 ============== */
function renderWeeklyPaper(root) {
  const week = getWeek(new Date());
  const wp = [...DATA.weeklyPapers].sort((a, b) => b.date.localeCompare(a.date));

  root.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-title">
          <span class="icon t-purple">📅</span>本周文献打卡
          <span style="margin-left:auto;font-size:12px;color:var(--text-sub);font-weight:400">第${week}周</span>
        </div>
        <div id="wp-cal"></div>
        <div style="margin-top:14px;display:flex;gap:8px">
          <button class="btn-mini" id="wp-checkin" style="flex:1;padding:8px">✓ 今日已精读(打卡)</button>
          <button class="btn-mini" id="wp-add" style="flex:1;padding:8px">+ 记录文献</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="icon t-orange">📊</span>每周精读统计</div>
        <div class="grid-2" style="gap:8px;margin-bottom:14px">
          <div class="stat-card" style="padding:12px">
            <div class="stat-label">本月已精读</div>
            <div class="stat-value" style="font-size:22px">${DATA.weeklyPapers.filter(p => new Date(p.date).getMonth() === new Date().getMonth()).length}</div>
          </div>
          <div class="stat-card" style="padding:12px">
            <div class="stat-label">连续周打卡</div>
            <div class="stat-value" style="font-size:22px;color:var(--green)">${calcStreak(DATA.checkin['weekly-paper'].history)} <span style="font-size:13px">周</span></div>
          </div>
        </div>
        <div id="wp-bar"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        <span class="icon t-purple">📚</span>精读记录
        <span style="margin-left:auto;font-size:12px;color:var(--text-sub);font-weight:400">共 ${wp.length} 篇</span>
      </div>
      <div id="wp-list"></div>
    </div>
  `;

  renderCalendar(document.getElementById('wp-cal'), DATA.checkin['weekly-paper'].history, {
    onClick: (d) => {
      DATA.checkin['weekly-paper'].history[d] = DATA.checkin['weekly-paper'].history[d] ? 0 : 1;
      if (!DATA.checkin['weekly-paper'].history[d]) delete DATA.checkin['weekly-paper'].history[d];
      saveData();
      renderPage('weekly-paper');
    }
  });

  document.getElementById('wp-checkin').onclick = () => {
    DATA.checkin['weekly-paper'].history[todayStr()] = 1;
    saveData();
    toast('🎉 今日打卡成功！');
    renderPage('weekly-paper');
  };
  document.getElementById('wp-add').onclick = () => showWeeklyPaperForm();

  // 柱状图 - 近8周精读数
  const labels = [], data = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const w = getWeek(d);
    labels.push('W' + w);
    data.push(DATA.weeklyPapers.filter(p => p.week === w).length);
  }
  renderBarChart(document.getElementById('wp-bar'), data, { unit: '篇', labels });

  const list = document.getElementById('wp-list');
  if (!wp.length) list.innerHTML = '<div class="empty"><div class="emoji">📖</div>还没有记录,点击右上角"记录文献"开始你的第一篇精读</div>';
  else list.innerHTML = wp.map(p => `
    <div class="doc-card">
      <div class="doc-head">
        <div style="flex:1">
          <div class="doc-title">${p.title}</div>
          <div class="doc-meta">
            <span>👥 ${p.authors}</span>
            <span>📖 ${p.journal} (${p.year})</span>
            <span class="tag tag-orange">IF ${p.impactFactor}</span>
            <span class="tag tag-purple">第${p.week}周</span>
          </div>
        </div>
        <div class="doc-actions">
          ${p.pubmedLink ? `<a href="${p.pubmedLink}" target="_blank" class="btn-mini" style="text-decoration:none">🔗 PubMed</a>` : ''}
          ${p.doi ? `<a href="https://doi.org/${p.doi}" target="_blank" class="btn-mini" style="text-decoration:none">📄 DOI</a>` : ''}
          <button class="btn-mini" onclick="viewWeeklyPaper('${p.id}')">详情</button>
          <button class="btn-mini" onclick="showWeeklyPaperForm('${p.id}')">编辑</button>
          <button class="btn-danger" onclick="delWeeklyPaper('${p.id}')">删除</button>
        </div>
      </div>
      ${p.doi ? `<div style="margin:4px 0 6px;font-size:12px;color:var(--text-sub)">DOI: <a href="https://doi.org/${p.doi}" target="_blank" style="color:var(--purple)">${p.doi}</a></div>` : ''}
      ${p.abstract ? `<div class="doc-content"><b>📋 摘要：</b>${p.abstract}</div>` : ''}
      ${p.value ? `<div class="doc-content" style="background:var(--orange-soft);padding:8px;border-radius:6px;margin-top:6px"><b>⭐ 可引用价值：</b>${p.value}</div>` : ''}
      ${p.summary ? `<div class="doc-content" style="background:var(--purple-soft);padding:8px;border-radius:6px;margin-top:6px"><b>🔑 关键发现：</b>${p.summary}</div>` : ''}
      ${p.thoughts ? `<div class="doc-content" style="background:var(--green-soft);padding:8px;border-radius:6px;margin-top:6px"><b>💡 我的思考：</b>${p.thoughts}</div>` : ''}
      <div class="doc-footer">${(p.tags || []).map(t => `<span class="tag tag-purple">#${t}</span>`).join('')} <span class="tag ${p.status === '已精读' ? 'tag-green' : 'tag-orange'}">${p.status || '待精读'}</span></div>
    </div>
  `).join('');
}

function showWeeklyPaperForm(id) {
  const p = id ? DATA.weeklyPapers.find(x => x.id === id) : null;
  openModal(id ? '编辑精读文献' : '记录本周精读文献', `
    <div class="form-group">
      <label>文献标题 *</label>
      <input id="f-title" value="${(p?.title||'').replace(/"/g,'&quot;')}" placeholder="例如：Mechanical force regulates..." />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>作者</label>
        <input id="f-authors" value="${p?.authors||''}" placeholder="Zhang Y, Li X, ..." />
      </div>
      <div class="form-group">
        <label>发表年份</label>
        <input id="f-year" type="number" value="${p?.year||2025}" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>期刊</label>
        <input id="f-journal" value="${p?.journal||''}" placeholder="Nature Aging" />
      </div>
      <div class="form-group">
        <label>影响因子</label>
        <input id="f-if" type="number" step="0.1" value="${p?.impactFactor||''}" placeholder="16.6" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>DOI</label>
        <input id="f-doi" value="${p?.doi||''}" placeholder="10.1038/s43587-025-..." />
      </div>
      <div class="form-group">
        <label>PubMed链接</label>
        <input id="f-pubmed" value="${p?.pubmedLink||''}" placeholder="https://pubmed.ncbi.nlm.nih.gov/..." />
      </div>
    </div>
    <div class="form-group">
      <label>关键词(逗号分隔)</label>
      <input id="f-tags" value="${(p?.tags||[]).join(', ')}" placeholder="机械力, Piezo1, 衰老" />
    </div>
    <div class="form-group">
      <label>摘要</label>
      <textarea id="f-abstract" rows="3" placeholder="研究的核心内容...">${p?.abstract||''}</textarea>
    </div>
    <div class="form-group">
      <label>可引用价值</label>
      <textarea id="f-value" rows="2" placeholder="这篇文献对我课题的启发、可借鉴的方法、可参考的数据...">${p?.value||''}</textarea>
    </div>
    <div class="form-group">
      <label>精读总结（关键发现/机制/实验设计要点）</label>
      <textarea id="f-summary" rows="2" placeholder="关键发现、机制、实验设计要点...">${p?.summary||''}</textarea>
    </div>
    <div class="form-group">
      <label>💡 我的思考（与课题的联系/可延伸方向）</label>
      <textarea id="f-thoughts" rows="2" placeholder="这篇文献给我什么启发？可以怎样延伸到我的课题？">${p?.thoughts||''}</textarea>
    </div>
  `, () => {
    const obj = {
      id: id || genId(),
      week: getWeek(new Date()),
      date: id ? (p.date || todayStr()) : todayStr(),
      title: document.getElementById('f-title').value.trim(),
      authors: document.getElementById('f-authors').value.trim(),
      year: parseInt(document.getElementById('f-year').value) || new Date().getFullYear(),
      journal: document.getElementById('f-journal').value.trim(),
      impactFactor: parseFloat(document.getElementById('f-if').value) || 0,
      doi: document.getElementById('f-doi').value.trim(),
      pubmedLink: document.getElementById('f-pubmed').value.trim(),
      tags: document.getElementById('f-tags').value.split(/[,，]/).map(x => x.trim()).filter(Boolean),
      abstract: document.getElementById('f-abstract').value.trim(),
      value: document.getElementById('f-value').value.trim(),
      summary: document.getElementById('f-summary').value.trim(),
      thoughts: document.getElementById('f-thoughts').value.trim(),
      status: '已精读',
      is_demo: false
    };
    if (!obj.title) { toast('请填写文献标题'); return; }
    if (id) {
      const idx = DATA.weeklyPapers.findIndex(x => x.id === id);
      DATA.weeklyPapers[idx] = { ...DATA.weeklyPapers[idx], ...obj };
    } else {
      DATA.weeklyPapers.unshift(obj);
      DATA.checkin['weekly-paper'].history[todayStr()] = 1;
    }
    saveData();
    closeModal();
    toast('🎉 精读记录已保存');
    renderPage('weekly-paper');
  });
}

function viewWeeklyPaper(id) {
  const p = DATA.weeklyPapers.find(x => x.id === id);
  if (!p) return;
  openModal('文献详情', `
    <h3 style="margin-bottom:8px">${p.title}</h3>
    <div class="doc-meta" style="margin-bottom:12px">
      <span>👥 ${p.authors}</span> · <span>${p.journal} ${p.year}</span> · <span class="tag tag-orange">IF ${p.impactFactor}</span>
    </div>
    <div class="form-group">
      <label>摘要</label>
      <div style="background:var(--panel-2);padding:10px;border-radius:6px;line-height:1.7">${p.abstract || '未填写'}</div>
    </div>
    <div class="form-group">
      <label>可引用价值</label>
      <div style="background:var(--orange-soft);padding:10px;border-radius:6px;line-height:1.7">${p.value || '未填写'}</div>
    </div>
    <div class="form-group">
      <label>精读总结</label>
      <div style="background:var(--primary-soft);padding:10px;border-radius:6px;line-height:1.7">${p.summary || '未填写'}</div>
    </div>
    <div class="form-group">
      <label>标签</label>
      <div>${(p.tags || []).map(t => `<span class="tag tag-purple">#${t}</span>`).join(' ')}</div>
    </div>
  `);
}

function delWeeklyPaper(id) {
  if (!confirm('确认删除这篇精读记录？')) return;
  DATA.weeklyPapers = DATA.weeklyPapers.filter(x => x.id !== id);
  saveData();
  toast('已删除');
  renderPage('weekly-paper');
}

/* ============== 每日文献 ============== */
function renderDailyPaper(root) {
  const today = new Date();
  const todayP = DATA.dailyPapers.filter(p => p.date === todayStr());
  const all = [...DATA.dailyPapers].sort((a, b) => b.date.localeCompare(a.date));
  const favs = DATA.dailyPapers.filter(p => p.fav);

  root.innerHTML = `
    <div class="card" style="background:linear-gradient(135deg,#fff5f7,#f3e7ff);border:none">
      <div class="card-title">
        <span class="icon t-purple">📰</span>今日文献推送
        <span style="margin-left:auto;font-size:12px;color:var(--text-sub)">每日10篇,关注：衰老·肌肉·脂肪·线粒体·内异症·机械力·雌激素·腺肌症·肌肉再生·昼夜节律</span>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <div style="font-size:13px;color:var(--text-sub)">已推送 <b style="color:var(--primary);font-size:18px">${todayP.length}</b> / 10 篇</div>
        <button class="btn-mini" onclick="generateDailyPapers()">🤖 一键智能推送10篇</button>
        <button class="btn-mini" onclick="manualAddPaper()">+ 手动添加</button>
        <div style="margin-left:auto">
          <select id="dp-filter" style="width:auto;display:inline-block;padding:6px 10px">
            <option value="all">全部</option>
            <option value="fav">⭐ 我的收藏</option>
            <option value="unread">未读</option>
            <option value="read">已读</option>
          </select>
        </div>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom:16px">
      <div class="stat-card">
        <div class="stat-icon t-orange">⭐</div>
        <div class="stat-label">累计收藏</div>
        <div class="stat-value">${favs.length}</div>
        <div class="stat-foot">慢慢积累</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-green">✅</div>
        <div class="stat-label">累计已读</div>
        <div class="stat-value">${DATA.dailyPapers.filter(p => p.read).length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-pink">📈</div>
        <div class="stat-label">累计推送</div>
        <div class="stat-value">${DATA.dailyPapers.length}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        <span class="icon t-pink">📋</span>今日推送列表
        <span class="tag tag-purple">${todayP.length} 篇</span>
      </div>
      <div id="dp-list"></div>
    </div>
  `;

  const filterEl = document.getElementById('dp-filter');
  filterEl.onchange = () => paintList(filterEl.value);

  function paintList(filter) {
    const list = document.getElementById('dp-list');
    let data = todayP;
    if (filter === 'fav') data = DATA.dailyPapers.filter(p => p.fav);
    else if (filter === 'unread') data = DATA.dailyPapers.filter(p => !p.read);
    else if (filter === 'read') data = DATA.dailyPapers.filter(p => p.read);

    if (!data.length) list.innerHTML = '<div class="empty"><div class="emoji">📰</div>暂无内容</div>';
    else list.innerHTML = data.map(p => `
      <div class="doc-card" style="${p.read ? 'opacity:0.7' : ''}">
        <div class="doc-head">
          <div style="flex:1">
            <div class="doc-title">${p.title}</div>
            <div class="doc-meta">
              <span>📅 ${p.date}</span>
              <span>📖 ${p.source}</span>
              <span>📚 ${p.journal} ${p.year}</span>
              <span class="tag tag-orange">IF ${p.impactFactor}</span>
              ${p.contentType ? `<span class="tag tag-purple">${p.contentIcon||'📄'} ${p.contentType}</span>` : ''}
              ${p.read ? '<span class="tag tag-green">已读</span>' : ''}
            </div>
          </div>
          <div class="doc-actions" style="display:flex;align-items:center;gap:6px">
            <span class="fav-icon ${p.fav ? 'active' : ''}" onclick="toggleFav('${p.id}')">${p.fav ? '★' : '☆'}</span>
            <button class="btn-mini" onclick="window.open('${p.link}','_blank')">阅读</button>
            <button class="btn-mini" onclick="toggleRead('${p.id}')">${p.read ? '标为未读' : '已读'}</button>
          </div>
        </div>
        ${p.summary ? `<div class="doc-content">${p.summary}</div>` : ''}
        <div class="doc-footer">${(p.tags || []).map(t => `<span class="tag tag-purple">#${t}</span>`).join('')}</div>
      </div>
    `).join('');
  }
  paintList('all');
}

function toggleFav(id) {
  const p = DATA.dailyPapers.find(x => x.id === id);
  if (p) { p.fav = !p.fav; saveData(); renderPage('daily-paper'); }
}
function toggleRead(id) {
  const p = DATA.dailyPapers.find(x => x.id === id);
  if (p) { p.read = !p.read; saveData(); renderPage('daily-paper'); }
}

function generateDailyPapers() {
  // 模拟智能推送 - 基于关键词和当前热点
  const keywords = (DATA.settings?.keywords || []).filter(k => k.active).map(k => k.text);
  if (keywords.length < 3) keywords.push('衰老', '肌肉', '脂肪', '线粒体', '内异症', '机械力', '雌激素', '腺肌症');
  const journals = [
    { name: 'Nature', if: 64.8, zone: '综合1区' },
    { name: 'Cell', if: 64.5, zone: '综合1区' },
    { name: 'Science', if: 56.9, zone: '综合1区' },
    { name: 'Nat Med', if: 82.9, zone: '医学1区' },
    { name: 'Cell Metab', if: 27.2, zone: '生物1区' },
    { name: 'Nat Aging', if: 16.6, zone: '生物1区' },
    { name: 'Nat Commun', if: 16.6, zone: '综合1区' },
    { name: 'Cell Death Differ', if: 12.4, zone: '生物1区' }
  ];
  const sources = ['BioArt', '解螺旋', '医学界', 'NEJM前沿', 'Cell Press', 'Nature Portfolio', '丁香园', '科研圈', '医学干货', 'PaperRSS'];
  const contentTypes = [
    { type: '论著', icon: '📄', color: 'tag-purple' },
    { type: '综述', icon: '📚', color: 'tag-pink' },
    { type: '方法', icon: '🔧', color: 'tag-orange' },
    { type: '评论', icon: '💬', color: 'tag-green' },
    { type: '论著', icon: '📄', color: 'tag-purple' },
    { type: '论著', icon: '📄', color: 'tag-purple' },
    { type: '综述', icon: '📚', color: 'tag-pink' },
    { type: '方法', icon: '🔧', color: 'tag-orange' },
    { type: '论著', icon: '📄', color: 'tag-purple' },
    { type: '新闻', icon: '📰', color: 'tag-green' }
  ];

  // 删除今日已推送
  DATA.dailyPapers = DATA.dailyPapers.filter(p => p.date !== todayStr());

  for (let i = 0; i < 10; i++) {
    const j = journals[i % journals.length];
    const k1 = keywords[i % keywords.length];
    const k2 = keywords[(i + 5) % keywords.length];
    const ct = contentTypes[i];
    DATA.dailyPapers.unshift({
      id: genId(),
      date: todayStr(),
      title: `[${k1}] ${k1}在${k2}相关疾病中的机制新发现`,
      source: sources[i % sources.length],
      journal: j.name,
      year: 2026,
      impactFactor: j.if,
      contentType: ct.type,
      contentIcon: ct.icon,
      summary: `本文顶刊最新研究,聚焦${k1}与${k2}的交叉机制,采用单细胞测序+空间转录组+功能验证,机制清晰,值得精读。`,
      link: 'https://pubmed.ncbi.nlm.nih.gov/?term=' + encodeURIComponent(k1 + ' ' + k2),
      tags: [k1, k2],
      fav: false,
      read: false,
      is_demo: false
    });
  }
  saveData();
  toast('🎉 已为你智能推送 10 篇今日文献');
  renderPage('daily-paper');
}

function manualAddPaper() {
  openModal('手动添加文献', `
    <div class="form-group"><label>标题 *</label><input id="f-title" /></div>
    <div class="form-row">
      <div class="form-group"><label>公众号/来源</label><input id="f-source" placeholder="BioArt" /></div>
      <div class="form-group"><label>期刊</label><input id="f-journal" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>年份</label><input id="f-year" type="number" value="2026"/></div>
      <div class="form-group"><label>影响因子</label><input id="f-if" type="number" step="0.1" /></div>
    </div>
    <div class="form-group"><label>关键词(逗号分隔)</label><input id="f-tags" /></div>
    <div class="form-group"><label>链接</label><input id="f-link" placeholder="https://..." /></div>
  `, () => {
    const obj = {
      id: genId(),
      date: todayStr(),
      title: document.getElementById('f-title').value.trim(),
      source: document.getElementById('f-source').value.trim() || '手动添加',
      journal: document.getElementById('f-journal').value.trim() || '未知',
      year: parseInt(document.getElementById('f-year').value) || new Date().getFullYear(),
      impactFactor: parseFloat(document.getElementById('f-if').value) || 0,
      tags: document.getElementById('f-tags').value.split(/[,，]/).map(x => x.trim()).filter(Boolean),
      link: document.getElementById('f-link').value.trim() || '#',
      fav: false, read: false, summary: ''
    };
    if (!obj.title) { toast('请填写标题'); return; }
    DATA.dailyPapers.unshift(obj);
    saveData();
    closeModal();
    renderPage('daily-paper');
  });
}

/* ============== 科研项目 ============== */
function renderProjects(root) {
  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;margin-bottom:4px">科研项目地图</h2>
        <p style="color:var(--text-sub);font-size:12px;margin:0">这里是你的课题全景 · 每个项目含研究设计、实验计划、进展</p>
      </div>
      <button class="btn-primary" onclick="addProject()">+ 新建项目</button>
    </div>
    <div id="proj-list"></div>
  `;
  const list = document.getElementById('proj-list');
  if (!DATA.researchProjects.length) list.innerHTML = '<div class="empty"><div class="emoji">🧪</div>还没有科研项目,点击"新建项目"开始</div>';
  else list.innerHTML = DATA.researchProjects.map(p => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="flex:1">
          <h3 style="font-size:15px;margin-bottom:6px">${p.name} <span class="tag tag-purple">${p.status}</span></h3>
          <div class="doc-meta" style="margin-bottom:10px">
            <span>📅 截止 ${p.deadline || '未设定'}</span>
            <span>📈 进度 ${p.progress}%</span>
          </div>
          <div class="progress" style="margin-bottom:14px"><div class="progress-bar" style="width:${p.progress}%"></div></div>
        </div>
        <div class="doc-actions">
          <button class="btn-mini" onclick="editProject('${p.id}')">编辑</button>
          <button class="btn-danger" onclick="delProject('${p.id}')">删除</button>
        </div>
      </div>

      <div class="grid-2">
        <div>
          <div style="font-size:12px;color:var(--text-sub);margin-bottom:4px">📋 研究设计思路</div>
          <div style="background:var(--primary-soft);padding:10px;border-radius:8px;line-height:1.7;white-space:pre-wrap;font-size:12px">${p.plan || '尚未填写研究设计'}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-sub);margin-bottom:4px">🔬 实验进展</div>
          <div style="background:var(--green-soft);padding:10px;border-radius:8px;line-height:1.7;white-space:pre-wrap;font-size:12px">${p.notes || '尚未记录'}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function addProject() { editProject(null); }
function editProject(id) {
  const p = id ? DATA.researchProjects.find(x => x.id === id) : { name:'', status:'进行中', deadline:'', progress:0, plan:'', notes:'' };
  openModal(id ? '编辑科研项目' : '新建科研项目', `
    <div class="form-group"><label>项目名称 *</label><input id="f-name" value="${p.name || ''}" placeholder="例如：机械力通过Piezo1调控..." /></div>
    <div class="form-row">
      <div class="form-group">
        <label>状态</label>
        <select id="f-status">
          <option ${p.status === '筹备中' ? 'selected' : ''}>筹备中</option>
          <option ${p.status === '进行中' ? 'selected' : ''}>进行中</option>
          <option ${p.status === '数据补充' ? 'selected' : ''}>数据补充</option>
          <option ${p.status === '撰写中' ? 'selected' : ''}>撰写中</option>
          <option ${p.status === '已结题' ? 'selected' : ''}>已结题</option>
        </select>
      </div>
      <div class="form-group"><label>截止日期</label><input id="f-deadline" type="date" value="${p.deadline || ''}" /></div>
      <div class="form-group"><label>进度(%)</label><input id="f-progress" type="number" min="0" max="100" value="${p.progress || 0}" /></div>
    </div>
    <div class="form-group">
      <label>研究设计思路 (可粘贴幕布导图大纲)</label>
      <textarea id="f-plan" rows="6" placeholder="1. 研究背景&#10;2. 关键科学问题&#10;3. 研究假设&#10;4. 技术路线&#10;5. 预期结果">${p.plan || ''}</textarea>
    </div>
    <div class="form-group">
      <label>实验进展与记录</label>
      <textarea id="f-notes" rows="4" placeholder="本周完成：&#10;下一步计划：&#10;遇到的问题：">${p.notes || ''}</textarea>
    </div>
  `, () => {
    const obj = {
      id: id || genId(),
      name: document.getElementById('f-name').value.trim(),
      status: document.getElementById('f-status').value,
      deadline: document.getElementById('f-deadline').value,
      progress: parseInt(document.getElementById('f-progress').value) || 0,
      plan: document.getElementById('f-plan').value,
      notes: document.getElementById('f-notes').value,
      createdAt: p.createdAt || Date.now()
    };
    if (!obj.name) { toast('请填写项目名称'); return; }
    if (id) {
      const idx = DATA.researchProjects.findIndex(x => x.id === id);
      DATA.researchProjects[idx] = obj;
    } else {
      DATA.researchProjects.unshift(obj);
    }
    saveData();
    closeModal();
    toast(id ? '已更新' : '🎉 项目已创建');
    renderPage('research-projects');
  });
}

function delProject(id) {
  if (!confirm('确认删除该项目？')) return;
  DATA.researchProjects = DATA.researchProjects.filter(x => x.id !== id);
  saveData();
  renderPage('research-projects');
}

/* ============== 论文撰写 ============== */
function renderPaperWriting(root) {
  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;margin-bottom:4px">论文撰写追踪</h2>
        <p style="color:var(--text-sub);font-size:12px;margin:0">记录每篇论文的撰写状态、章节完成度</p>
      </div>
      <button class="btn-primary" onclick="addPaperWriting()">+ 新增论文</button>
    </div>
    <div id="pw-list"></div>
  `;
  const list = document.getElementById('pw-list');
  if (!DATA.paperWritings.length) list.innerHTML = '<div class="empty"><div class="emoji">✍️</div>还没有论文,点击"新增论文"开始</div>';
  else list.innerHTML = DATA.paperWritings.map(p => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="flex:1">
          <h3 style="font-size:15px;margin-bottom:4px">${p.title}</h3>
          <div class="doc-meta" style="margin-bottom:8px">
            <span>🎯 目标期刊 ${p.targetJournal}</span>
            <span>📅 截止 ${p.deadline || '未设定'}</span>
            <span class="tag ${p.status === '已发表' ? 'tag-green' : p.status === '撰写中' ? 'tag-pink' : 'tag-orange'}">${p.status}</span>
          </div>
          <div class="progress" style="margin-bottom:12px"><div class="progress-bar" style="width:${p.progress}%"></div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${(p.sections || []).map(s => `<span class="tag ${s.done ? 'tag-green' : ''}">${s.done ? '✓' : '○'} ${s.name}</span>`).join('')}
          </div>
          ${p.notes ? `<div style="background:var(--orange-soft);padding:8px;border-radius:6px;margin-top:10px;font-size:12px">📝 ${p.notes}</div>` : ''}
        </div>
        <div class="doc-actions">
          <button class="btn-mini" onclick="editPaperWriting('${p.id}')">编辑</button>
          <button class="btn-mini" onclick="toggleSection('${p.id}')">切换章节</button>
          <button class="btn-danger" onclick="delPaperWriting('${p.id}')">删除</button>
        </div>
      </div>
    </div>
  `).join('');
}

function addPaperWriting() { editPaperWriting(null); }
function editPaperWriting(id) {
  const p = id ? DATA.paperWritings.find(x => x.id === id) : { title:'', targetJournal:'', status:'构思中', progress:0, sections:[{name:'Introduction',done:false},{name:'Methods',done:false},{name:'Results',done:false},{name:'Discussion',done:false}], deadline:'', notes:'' };
  openModal(id ? '编辑论文' : '新增论文', `
    <div class="form-group"><label>论文标题 *</label><input id="f-title" value="${p.title.replace(/"/g, '&quot;')}" /></div>
    <div class="form-row">
      <div class="form-group"><label>目标期刊</label><input id="f-tj" value="${p.targetJournal}" /></div>
      <div class="form-group"><label>截止日期</label><input id="f-deadline" type="date" value="${p.deadline || ''}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>状态</label>
        <select id="f-status">
          ${['构思中','数据补充','撰写中','已投稿'].map(s => `<option ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>总进度(%)</label><input id="f-progress" type="number" min="0" max="100" value="${p.progress}" /></div>
    </div>
    <div class="form-group">
      <label>章节进度</label>
      <div id="f-sections">
        ${(p.sections || []).map((s, i) => `
          <div style="display:flex;gap:6px;margin-bottom:4px;align-items:center">
            <input type="checkbox" ${s.done ? 'checked' : ''} data-idx="${i}" style="width:auto" />
            <input value="${s.name.replace(/"/g, '&quot;')}" data-idx="${i}" style="flex:1" />
            <button type="button" class="btn-mini" onclick="this.parentNode.remove()">×</button>
          </div>
        `).join('')}
      </div>
      <button type="button" class="btn-mini" onclick="addSectionRow()">+ 添加章节</button>
    </div>
    <div class="form-group">
      <label>备注</label>
      <textarea id="f-notes">${p.notes || ''}</textarea>
    </div>
  `, () => {
    const sections = [];
    document.querySelectorAll('#f-sections > div').forEach(div => {
      const cb = div.querySelector('input[type=checkbox]');
      const tx = div.querySelector('input[type=text], input:not([type])');
      if (tx && tx.value.trim()) sections.push({ name: tx.value.trim(), done: cb.checked });
    });
    const obj = {
      id: id || genId(),
      title: document.getElementById('f-title').value.trim(),
      targetJournal: document.getElementById('f-tj').value.trim(),
      deadline: document.getElementById('f-deadline').value,
      status: document.getElementById('f-status').value,
      progress: parseInt(document.getElementById('f-progress').value) || 0,
      sections,
      notes: document.getElementById('f-notes').value,
      createdAt: p.createdAt || Date.now()
    };
    if (!obj.title) { toast('请填写标题'); return; }
    if (id) {
      const idx = DATA.paperWritings.findIndex(x => x.id === id);
      DATA.paperWritings[idx] = obj;
    } else DATA.paperWritings.unshift(obj);
    saveData();
    closeModal();
    renderPage('paper-writing');
  });
}

function addSectionRow() {
  const wrap = document.getElementById('f-sections');
  const div = document.createElement('div');
  div.style = 'display:flex;gap:6px;margin-bottom:4px;align-items:center';
  div.innerHTML = `
    <input type="checkbox" style="width:auto" />
    <input style="flex:1" placeholder="新章节名" />
    <button type="button" class="btn-mini" onclick="this.parentNode.remove()">×</button>
  `;
  wrap.appendChild(div);
}

function toggleSection(id) {
  const p = DATA.paperWritings.find(x => x.id === id);
  if (!p) return;
  // 简单的循环切换
  const idx = p.sections.findIndex(s => !s.done);
  if (idx >= 0) p.sections[idx].done = true;
  p.progress = Math.round(p.sections.filter(s => s.done).length / p.sections.length * 100);
  if (p.progress === 100) p.status = '已投稿';
  saveData();
  renderPage('paper-writing');
}

function delPaperWriting(id) {
  if (!confirm('确认删除？')) return;
  DATA.paperWritings = DATA.paperWritings.filter(x => x.id !== id);
  saveData();
  renderPage('paper-writing');
}

/* ============== 论文投稿 ============== */
function renderPaperSubmit(root) {
  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;margin-bottom:4px">论文投稿追踪</h2>
        <p style="color:var(--text-sub);font-size:12px;margin:0">从投稿→审稿→见刊的完整轨迹,附带影响因子和中科院分区</p>
      </div>
      <button class="btn-primary" onclick="addPaperSubmit()">+ 新增投稿</button>
    </div>
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>论文题目</th>
            <th>期刊</th>
            <th>IF</th>
            <th>中科院分区</th>
            <th>投稿日期</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="ps-tbody"></tbody>
      </table>
    </div>
  `;
  const tb = document.getElementById('ps-tbody');
  if (!DATA.paperSubmits.length) tb.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="emoji">📮</div>还没有投稿记录</div></td></tr>';
  else tb.innerHTML = DATA.paperSubmits.map(p => {
    const statusColor = { 'Submitted':'tag-orange', 'Under Review':'tag-purple', 'Major Revision':'tag-pink', 'Minor Revision':'tag-pink', 'Accepted':'tag-green', 'Rejected':'tag-orange', '见刊':'tag-green' }[p.status] || 'tag-orange';
    return `<tr>
      <td><b>${p.title}</b></td>
      <td>${p.journal}</td>
      <td><span class="if-badge" style="background:var(--orange-soft);color:var(--orange)">${p.if}</span></td>
      <td><span class="tag tag-green">${p.casZone}</span></td>
      <td>${p.submittedAt}</td>
      <td><span class="tag ${statusColor}">${p.status}</span></td>
      <td>
        <button class="btn-mini" onclick="viewSubmit('${p.id}')">详情</button>
        <button class="btn-mini" onclick="addDecision('${p.id}')">+ 状态</button>
        <button class="btn-danger" onclick="delPaperSubmit('${p.id}')">删除</button>
      </td>
    </tr>`;
  }).join('');
}

function addPaperSubmit() { editPaperSubmit(null); }
function editPaperSubmit(id) {
  const p = id ? DATA.paperSubmits.find(x => x.id === id) : { title:'', journal:'', if:0, casZone:'医学2区', status:'Submitted', submittedAt:todayStr(), decisions:[] };
  openModal(id ? '编辑投稿' : '新增投稿', `
    <div class="form-group"><label>论文题目 *</label><input id="f-title" value="${(p.title || '').replace(/"/g, '&quot;')}" /></div>
    <div class="form-row">
      <div class="form-group"><label>期刊 *</label><input id="f-journal" value="${p.journal || ''}" placeholder="Nature Communications" /></div>
      <div class="form-group"><label>影响因子</label><input id="f-if" type="number" step="0.1" value="${p.if || ''}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>中科院分区</label>
        <select id="f-zone">
          <option ${p.casZone === '医学1区' ? 'selected' : ''}>医学1区</option>
          <option ${p.casZone === '医学2区' ? 'selected' : ''}>医学2区</option>
          <option ${p.casZone === '生物1区' ? 'selected' : ''}>生物1区</option>
          <option ${p.casZone === '生物2区' ? 'selected' : ''}>生物2区</option>
          <option ${p.casZone === '综合1区' ? 'selected' : ''}>综合1区</option>
          <option ${p.casZone === 'SCI' ? 'selected' : ''}>SCI</option>
        </select>
      </div>
      <div class="form-group"><label>投稿日期</label><input id="f-submit" type="date" value="${p.submittedAt || todayStr()}" /></div>
      <div class="form-group">
        <label>当前状态</label>
        <select id="f-status">
          ${['Submitted','Under Review','Major Revision','Minor Revision','Accepted','Rejected','见刊'].map(s => `<option ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
  `, () => {
    const obj = {
      id: id || genId(),
      title: document.getElementById('f-title').value.trim(),
      journal: document.getElementById('f-journal').value.trim(),
      if: parseFloat(document.getElementById('f-if').value) || 0,
      casZone: document.getElementById('f-zone').value,
      submittedAt: document.getElementById('f-submit').value,
      status: document.getElementById('f-status').value,
      decisions: p.decisions || [],
      publishedAt: ''
    };
    if (!obj.title || !obj.journal) { toast('请填写论文和期刊'); return; }
    if (id) {
      const idx = DATA.paperSubmits.findIndex(x => x.id === id);
      DATA.paperSubmits[idx] = obj;
    } else {
      obj.decisions = [{ date: obj.submittedAt, result: 'Submitted', note: '投出' }];
      DATA.paperSubmits.unshift(obj);
    }
    saveData();
    closeModal();
    renderPage('paper-submit');
  });
}

function viewSubmit(id) {
  const p = DATA.paperSubmits.find(x => x.id === id);
  if (!p) return;
  openModal('投稿详情', `
    <h3 style="margin-bottom:8px">${p.title}</h3>
    <div class="doc-meta" style="margin-bottom:14px">
      <span>📖 ${p.journal}</span> · <span class="tag tag-orange">IF ${p.if}</span> · <span class="tag tag-green">${p.casZone}</span>
    </div>
    <div class="form-group">
      <label>📅 投稿时间线</label>
      <div style="background:var(--panel-2);padding:12px;border-radius:8px">
        ${(p.decisions || []).map((d, i) => `
          <div style="display:flex;gap:10px;padding:6px 0;${i > 0 ? 'border-top:1px dashed var(--border)' : ''}">
            <div style="color:var(--text-sub);font-size:12px;min-width:90px">${d.date}</div>
            <div style="flex:1">
              <b style="color:var(--primary)">${d.result}</b>
              ${d.note ? `<div style="color:var(--text-sub);font-size:12px;margin-top:2px">${d.note}</div>` : ''}
            </div>
          </div>
        `).join('') || '<div style="color:var(--text-sub)">暂无时间线</div>'}
      </div>
    </div>
  `, null, true);
}

function addDecision(id) {
  const p = DATA.paperSubmits.find(x => x.id === id);
  if (!p) return;
  openModal('添加审稿状态', `
    <div class="form-row">
      <div class="form-group"><label>日期</label><input id="f-date" type="date" value="${todayStr()}" /></div>
      <div class="form-group">
        <label>结果</label>
        <select id="f-result">
          ${['Under Review','Major Revision','Minor Revision','Accepted','Rejected','见刊','拒稿重投'].map(s => `<option>${s}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label>备注</label><textarea id="f-note" placeholder="审稿人意见、修改要点等"></textarea></div>
  `, () => {
    p.decisions = p.decisions || [];
    p.decisions.push({
      date: document.getElementById('f-date').value,
      result: document.getElementById('f-result').value,
      note: document.getElementById('f-note').value
    });
    p.status = document.getElementById('f-result').value;
    if (p.status === '见刊') p.publishedAt = document.getElementById('f-date').value;
    saveData();
    closeModal();
    renderPage('paper-submit');
  });
}

function delPaperSubmit(id) {
  if (!confirm('确认删除？')) return;
  DATA.paperSubmits = DATA.paperSubmits.filter(x => x.id !== id);
  saveData();
  renderPage('paper-submit');
}

/* ============== 文献库 ============== */
function renderLibrary(root) {
  const viewModes = [
    { key: 'category', label: '📁 按分类', icon: '📁' },
    { key: 'tag', label: '# 按标签', icon: '#' },
    { key: 'timeline', label: '📅 时间线', icon: '📅' }
  ];

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div>
        <h2 style="font-size:18px;margin-bottom:4px">我的文献库</h2>
        <p style="color:var(--text-sub);font-size:12px;margin:0">按研究方向沉淀的文献资产,共 ${DATA.library.length} 篇</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="lib-search" placeholder="🔍 搜索文献..." style="width:180px" />
        <button class="btn-primary" onclick="addLibrary()">+ 添加文献</button>
      </div>
    </div>
    <div class="view-tabs" style="margin-bottom:12px">
      ${viewModes.map(v => `<div class="view-tab ${v.key === 'category' ? 'active' : ''}" data-view="${v.key}">${v.label}</div>`).join('')}
    </div>
    <div id="lib-content"></div>
  `;

  let currentView = 'category';
  const searchEl = document.getElementById('lib-search');

  // Tab switching
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.onclick = () => {
      currentView = tab.dataset.view;
      document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('active', t === tab));
      paint();
    };
  });

  searchEl.oninput = () => paint();

  function paint() {
    const kw = (searchEl.value || '').toLowerCase().trim();
    const items = DATA.library.filter(l =>
      !kw || (l.title||'').toLowerCase().includes(kw) || (l.tags||[]).some(t => t.toLowerCase().includes(kw)) || (l.journal||'').toLowerCase().includes(kw)
    );
    const wrap = document.getElementById('lib-content');

    if (!items.length) { wrap.innerHTML = '<div class="empty"><div class="emoji">📚</div>暂无文献</div>'; return; }

    if (currentView === 'category') {
      // Group by category
      const cats = {};
      items.forEach(l => { const c = l.category || '未分类'; if (!cats[c]) cats[c] = []; cats[c].push(l); });
      wrap.innerHTML = Object.entries(cats).map(([cat, list]) => `
        <div class="card">
          <div class="card-title"><span class="icon t-purple">📁</span>${cat}<span class="tag tag-purple">${list.length} 篇</span></div>
          ${list.map(l => libCard(l)).join('')}
        </div>
      `).join('');
    } else if (currentView === 'tag') {
      // Group by tag
      const tagMap = {};
      items.forEach(l => { (l.tags||[]).forEach(t => { if (!tagMap[t]) tagMap[t] = []; tagMap[t].push(l); }); });
      if (!Object.keys(tagMap).length) { wrap.innerHTML = '<div class="empty"><div class="emoji">#</div>暂无标签</div>'; return; }
      wrap.innerHTML = Object.entries(tagMap).sort((a,b) => b[1].length - a[1].length).map(([tag, list]) => `
        <div class="card">
          <div class="card-title"><span class="icon t-pink">#</span>${tag}<span class="tag tag-pink">${list.length} 篇</span></div>
          ${list.map(l => libCard(l)).join('')}
        </div>
      `).join('');
    } else {
      // Timeline (sorted by addedAt)
      const sorted = [...items].sort((a,b) => (b.addedAt||0) - (a.addedAt||0));
      wrap.innerHTML = `<div class="card"><div class="card-title"><span class="icon t-orange">📅</span>按添加时间排序</div>
        ${sorted.map(l => `
          <div class="timeline-item">
            <div style="font-size:11px;color:var(--text-sub);min-width:90px">${fmtDate(l.addedAt)}</div>
            <div style="flex:1">${libCard(l, true)}</div>
          </div>
        `).join('')}
      </div>`;
    }
  }

  function libCard(l, compact) {
    return `
      <div class="doc-card" ${compact ? 'style="border:none;padding:4px 0"' : ''}>
        <div class="doc-head">
          <div style="flex:1">
            <div class="doc-title" style="${compact ? 'font-size:13px' : ''}">${l.title}</div>
            <div class="doc-meta">
              <span>📖 ${l.journal} ${l.year}</span>
              ${!compact ? `<span>📅 ${fmtDate(l.addedAt)}</span>` : ''}
            </div>
          </div>
          <div class="doc-actions">
            <button class="btn-mini" onclick="window.open('${l.link}','_blank')">查看</button>
            <button class="btn-mini" onclick="editLibrary('${l.id}')">编辑</button>
            <button class="btn-danger" onclick="delLib('${l.id}')">删除</button>
          </div>
        </div>
        ${!compact ? `<div class="doc-footer">${(l.tags||[]).map(t => `<span class="tag tag-purple">#${t}</span>`).join('')}</div>` : ''}
      </div>
    `;
  }

  paint();
}

function addLibrary() { editLibrary(null); }
function editLibrary(id) {
  const l = id ? DATA.library.find(x => x.id === id) : { title:'', journal:'', year:2025, category:'', tags:[], link:'' };
  const cats = ['盆底功能障碍·线粒体', '盆底功能障碍·衰老', '盆底功能障碍·雌激素', '盆底功能障碍·临床转化', '机械力·Piezo1', '子宫腺肌症·铁死亡', '子宫腺肌症·脂质代谢', '雌激素·肌肉再生', '脂滴·铁死亡', '时钟基因·昼夜节律', '衰老·NAD+', '其他'];
  openModal(id ? '编辑文献' : '添加文献', `
    <div class="form-group"><label>题目 *</label><input id="f-title" value="${(l.title||'').replace(/"/g,'&quot;')}" /></div>
    <div class="form-row">
      <div class="form-group"><label>期刊</label><input id="f-journal" value="${l.journal||''}" /></div>
      <div class="form-group"><label>年份</label><input id="f-year" type="number" value="${l.year||2025}" /></div>
    </div>
    <div class="form-group">
      <label>研究方向分类</label>
      <select id="f-cat">
        ${cats.map(c => `<option ${l.category === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>关键词(逗号分隔)</label><input id="f-tags" value="${(l.tags||[]).join(', ')}" /></div>
    <div class="form-group"><label>链接</label><input id="f-link" value="${l.link||''}" placeholder="https://pubmed..." /></div>
  `, () => {
    const obj = {
      id: id || genId(),
      title: document.getElementById('f-title').value.trim(),
      journal: document.getElementById('f-journal').value.trim(),
      year: parseInt(document.getElementById('f-year').value) || new Date().getFullYear(),
      category: document.getElementById('f-cat').value,
      tags: document.getElementById('f-tags').value.split(/[,，]/).map(x => x.trim()).filter(Boolean),
      link: document.getElementById('f-link').value.trim() || '#',
      addedAt: l.addedAt || Date.now(),
      is_demo: false
    };
    if (!obj.title) { toast('请填写题目'); return; }
    if (id) {
      const idx = DATA.library.findIndex(x => x.id === id);
      DATA.library[idx] = { ...DATA.library[idx], ...obj };
    } else {
      DATA.library.unshift(obj);
    }
    saveData();
    closeModal();
    renderPage('library');
  });
}

function delLib(id) {
  if (!confirm('确认删除？')) return;
  DATA.library = DATA.library.filter(x => x.id !== id);
  saveData();
  renderPage('library');
}
