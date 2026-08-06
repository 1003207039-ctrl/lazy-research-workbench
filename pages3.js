/* ============================================================
   全局功能页面: 统一日历 / 任务中心 / 收件箱 / 统计中心 / 设置
   ============================================================ */

/* ============== 统一日历 ============== */
function renderUnifiedCalendar(root) {
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();

  function getEvents(y, m, d) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const events = [];
    // 打卡事件
    if (DATA.fitness.history[dateStr]) events.push({ type: 'life', text: '💪 健身' });
    if (DATA.weight.fastingLog[dateStr]) events.push({ type: 'life', text: '🌙 空腹' });
    if (DATA.checkin['weekly-paper'] && DATA.checkin['weekly-paper'].history[dateStr]) events.push({ type: 'research', text: '📖 精读' });
    if (DATA.checkin['guideline'] && DATA.checkin['guideline'].history[dateStr]) events.push({ type: 'clinic', text: '📋 指南' });
    // 论文截止
    DATA.paperWritings.forEach(p => {
      if (p.deadline === dateStr) events.push({ type: 'research', text: '✍️ 论文截止: ' + (p.title || '').substring(0, 20) });
    });
    // 投稿事件
    DATA.paperSubmits.forEach(p => {
      (p.decisions || []).forEach(d => {
        if (d.date === dateStr) events.push({ type: 'research', text: '📮 ' + d.result });
      });
    });
    // 每日文献
    if (DATA.dailyPapers.some(p => p.date === dateStr)) events.push({ type: 'research', text: '📰 文献推送' });
    // 单词学习
    if (DATA.clinicWords.some(w => w.date === dateStr)) events.push({ type: 'clinic', text: '🔤 英语单词' });
    // 指南学习
    DATA.clinicGuidelines.forEach(g => { if (g.date === dateStr) events.push({ type: 'clinic', text: '📋 ' + (g.title || '').substring(0, 15) }); });
    // 病例
    DATA.clinicCases.forEach(c => { if (c.date === dateStr) events.push({ type: 'clinic', text: '🧠 病例分析' }); });
    return events;
  }

  function paint(y, m) {
    const first = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0).getDate();
    const startWday = first.getDay();
    const todayStr2 = todayStr();

    let cells = '';
    ['日','一','二','三','四','五','六'].forEach(d => { cells += `<div class="cal-head">${d}</div>`; });
    for (let i = 0; i < startWday; i++) cells += '<div></div>';
    for (let d = 1; d <= lastDay; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const events = getEvents(y, m, d);
      cells += `<div class="unified-cal-day ${ds === todayStr2 ? 'today' : ''}">
        <div class="ucd-date">${d}</div>
        ${events.slice(0, 3).map(e => `<div class="unified-cal-event uce-${e.type}">${e.text}</div>`).join('')}
        ${events.length > 3 ? `<div style="font-size:10px;color:var(--text-sub)">+${events.length - 3}</div>` : ''}
      </div>`;
    }

    root.innerHTML = `
      <div class="card">
        <div class="cal-toolbar">
          <button class="cal-prev" id="uc-prev">‹</button>
          <div class="cal-month">${y}年${m + 1}月</div>
          <button class="cal-next" id="uc-next">›</button>
        </div>
        <div class="calendar" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
          ${cells}
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="icon t-purple">📌</span>图例</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <span class="unified-cal-event uce-research">科研奋斗</span>
          <span class="unified-cal-event uce-clinic">临床工作</span>
          <span class="unified-cal-event uce-life">生活精致</span>
          <span class="unified-cal-event uce-checkin">打卡记录</span>
        </div>
      </div>
    `;
    document.getElementById('uc-prev').onclick = () => paint(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1);
    document.getElementById('uc-next').onclick = () => paint(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1);
  }
  paint(year, month);
}

/* ============== 任务中心 ============== */
function renderTaskCenter(root) {
  const today = todayStr();
  const allTasks = getTodayTasks();
  const customTasks = DATA.tasks || [];
  const upcomingTasks = customTasks.filter(t => !t.done && t.dueDate && t.dueDate > today);
  const overdueTasks = customTasks.filter(t => !t.done && t.dueDate && t.dueDate < today);
  const doneTasks = customTasks.filter(t => t.done);

  root.innerHTML = `
    <div class="grid-4" style="margin-bottom:16px">
      <div class="stat-card">
        <div class="stat-icon t-red">⚠️</div>
        <div class="stat-label">逾期</div>
        <div class="stat-value" style="color:var(--red)">${overdueTasks.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-orange">📌</div>
        <div class="stat-label">今日待办</div>
        <div class="stat-value">${allTasks.filter(t => !t.done).length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-purple">📅</div>
        <div class="stat-label">即将到期</div>
        <div class="stat-value">${upcomingTasks.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-green">✅</div>
        <div class="stat-label">已完成</div>
        <div class="stat-value">${doneTasks.length}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title">
          <span class="icon t-orange">📌</span>今日待办
          <button class="btn-mini" style="margin-left:auto" onclick="addCustomTask()">+ 新增任务</button>
        </div>
        <div id="tc-today"></div>
      </div>
      <div>
        <div class="card">
          <div class="card-title"><span class="icon t-red">⚠️</span>逾期任务</div>
          <div id="tc-overdue"></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="icon t-purple">📅</span>即将到期</div>
          <div id="tc-upcoming"></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><span class="icon t-green">✅</span>已完成</div>
      <div id="tc-done"></div>
    </div>
  `;

  function renderTaskList(containerId, tasks, emptyMsg) {
    const el = document.getElementById(containerId);
    if (!tasks.length) { el.innerHTML = `<div class="empty" style="padding:20px">${emptyMsg}</div>`; return; }
    el.innerHTML = tasks.map(t => `
      <div class="task-item ${t.done ? 'done' : ''}" ${t.page ? `onclick="gotoPage('${t.page}')"` : ''}>
        <div class="task-check">${t.done ? '✓' : ''}</div>
        <span class="task-icon">${t.icon}</span>
        <div class="task-title">${t.text}</div>
        ${t.urgent ? '<span class="task-urgent">紧急</span>' : ''}
        ${t.dueDate ? `<span style="font-size:11px;color:var(--text-sub)">${t.dueDate}</span>` : ''}
      </div>
    `).join('');
  }

  renderTaskList('tc-today', allTasks, '今日无待办');
  renderTaskList('tc-overdue', overdueTasks.map(t => ({...t, icon:'📌', text:t.title, dueDate:t.dueDate})), '无逾期任务');
  renderTaskList('tc-upcoming', upcomingTasks.map(t => ({...t, icon:'📅', text:t.title, dueDate:t.dueDate})), '无即将到期任务');
  renderTaskList('tc-done', doneTasks.map(t => ({...t, icon:'✅', text:t.title, done:true})), '还没有完成的任务');
}

function addCustomTask() {
  openModal('新增任务', `
    <div class="form-group"><label>任务标题 *</label><input id="f-title" placeholder="例如：整理本周实验数据" /></div>
    <div class="form-row">
      <div class="form-group">
        <label>类型</label>
        <select id="f-type">
          <option value="must">今日必须完成</option>
          <option value="optional" selected>有空再做</option>
        </select>
      </div>
      <div class="form-group"><label>截止日期</label><input id="f-due" type="date" /></div>
    </div>
  `, () => {
    const title = document.getElementById('f-title').value.trim();
    if (!title) { toast('请填写任务标题'); return; }
    addTask(title, {
      type: document.getElementById('f-type').value,
      dueDate: document.getElementById('f-due').value
    });
    closeModal();
    toast('✅ 任务已添加');
    renderPage('tasks');
  });
}

/* ============== 收件箱 ============== */
function renderInbox(root) {
  const items = [...(DATA.inbox || [])].sort((a, b) => b.createdAt - a.createdAt);
  const unprocessed = items.filter(i => !i.processed);
  const processed = items.filter(i => i.processed);

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;margin-bottom:4px">收件箱</h2>
        <p style="color:var(--text-sub);font-size:12px;margin:0">临时想法 · 待整理链接 · 待确认指南 · 共 ${items.length} 条</p>
      </div>
      <button class="btn-primary" onclick="addInboxItem()">+ 添加</button>
    </div>

    <div class="grid-3" style="margin-bottom:16px">
      <div class="stat-card">
        <div class="stat-icon t-orange">📥</div>
        <div class="stat-label">待处理</div>
        <div class="stat-value">${unprocessed.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-green">✅</div>
        <div class="stat-label">已处理</div>
        <div class="stat-value">${processed.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-purple">📊</div>
        <div class="stat-label">总计</div>
        <div class="stat-value">${items.length}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><span class="icon t-orange">📥</span>待处理</div>
      <div id="ib-unprocessed"></div>
    </div>
    ${processed.length ? `
    <div class="card">
      <div class="card-title"><span class="icon t-green">✅</span>已处理</div>
      <div id="ib-processed"></div>
    </div>` : ''}
  `;

  function paintItems(containerId, list) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!list.length) { el.innerHTML = '<div class="empty" style="padding:20px">暂无内容</div>'; return; }
    el.innerHTML = list.map(i => `
      <div class="inbox-item ${i.processed ? 'processed' : ''}">
        <span style="font-size:16px">${{link:'🔗',idea:'💡',guide:'📋',paper:'📄'}[i.type] || '📌'}</span>
        <div style="flex:1">
          <div style="font-weight:500;font-size:13px">${i.title}</div>
          ${i.content ? `<div style="font-size:12px;color:var(--text-sub);margin-top:4px">${i.content}</div>` : ''}
          ${i.link ? `<a href="${i.link}" target="_blank" style="font-size:11px;color:var(--primary);display:block;margin-top:4px">${i.link}</a>` : ''}
          <div style="font-size:11px;color:var(--text-sub);margin-top:4px">${fmtDate(i.createdAt)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${!i.processed ? `<button class="btn-mini" onclick="processInbox('${i.id}')">处理</button>` : ''}
          <button class="btn-danger" style="font-size:11px" onclick="delInbox('${i.id}')">删除</button>
        </div>
      </div>
    `).join('');
  }
  paintItems('ib-unprocessed', unprocessed);
  paintItems('ib-processed', processed);
}

function addInboxItem() {
  openModal('添加到收件箱', `
    <div class="form-group">
      <label>类型</label>
      <select id="f-type">
        <option value="idea">💡 临时想法</option>
        <option value="link">🔗 待整理链接</option>
        <option value="guide">📋 待确认指南</option>
        <option value="paper">📄 待读文献</option>
      </select>
    </div>
    <div class="form-group"><label>标题 *</label><input id="f-title" /></div>
    <div class="form-group"><label>内容/备注</label><textarea id="f-content" rows="3"></textarea></div>
    <div class="form-group"><label>链接</label><input id="f-link" placeholder="https://..." /></div>
  `, () => {
    const title = document.getElementById('f-title').value.trim();
    if (!title) { toast('请填写标题'); return; }
    DATA.inbox = DATA.inbox || [];
    DATA.inbox.unshift({
      id: genId(), title, type: document.getElementById('f-type').value,
      content: document.getElementById('f-content').value,
      link: document.getElementById('f-link').value.trim(),
      processed: false, createdAt: Date.now()
    });
    saveData();
    closeModal();
    renderPage('inbox');
  });
}

function processInbox(id) {
  const item = DATA.inbox.find(x => x.id === id);
  if (item) { item.processed = true; saveData(); renderPage('inbox'); }
}

function delInbox(id) {
  DATA.inbox = DATA.inbox.filter(x => x.id !== id);
  saveData();
  renderPage('inbox');
}

/* ============== 统计中心 ============== */
function renderStatsCenter(root) {
  const week = getWeek(new Date());
  const weekDates = getWeekDates(new Date());

  // 各栏目统计
  const stats = {
    weeklyPaper: { total: DATA.weeklyPapers.length, weekCount: DATA.weeklyPapers.filter(p => p.week === week).length },
    dailyPaper: { total: DATA.dailyPapers.length, favCount: DATA.dailyPapers.filter(p => p.fav).length, readCount: DATA.dailyPapers.filter(p => p.read).length },
    projects: { total: DATA.researchProjects.length, ongoing: DATA.researchProjects.filter(p => p.status === '进行中').length },
    paperWriting: { total: DATA.paperWritings.length, writing: DATA.paperWritings.filter(p => p.status === '撰写中' || p.status === '数据补充').length },
    paperSubmit: { total: DATA.paperSubmits.length, reviewing: DATA.paperSubmits.filter(p => !['Accepted','见刊'].includes(p.status)).length },
    library: { total: DATA.library.length },
    guidelines: { total: DATA.clinicGuidelines.length, weekCount: DATA.clinicGuidelines.filter(g => g.week === week).length },
    skills: { total: DATA.clinicSkills.length, totalCount: DATA.clinicSkills.reduce((s, x) => s + (x.count || 0), 0) },
    cases: { total: DATA.clinicCases.length, weekCount: DATA.clinicCases.filter(c => c.week === week).length },
    duties: { total: DATA.clinicDuties.length },
    words: { total: DATA.clinicWords.length, mastered: DATA.clinicWords.filter(w => w.mastered).length },
    rounds: { total: DATA.clinicRounds.length },
    quizzes: { total: DATA.clinicQuizzes.length, mastered: DATA.clinicQuizzes.filter(q => q.mastered).length },
    fitness: { weekCount: weekDates.filter(d => DATA.fitness.history[d]).length, monthCount: calcMonthStats(DATA.fitness.history).count },
    weight: { weekCount: weekDates.filter(d => DATA.weight.fastingLog[d]).length, monthCount: calcMonthStats(DATA.weight.fastingLog).count }
  };

  // 三单元完成率
  const weekGoals = getWeekGoals();
  const researchRate = Math.round((weekGoals[0].current / weekGoals[0].target) * 100);
  const clinicRate = Math.round(((weekGoals[1].current + weekGoals[2].current + stats.quizzes.mastered / stats.quizzes.total * weekGoals[3].target) / (weekGoals[1].target + weekGoals[2].target + weekGoals[3].target)) * 100);
  const lifeRate = Math.round(((weekGoals[4].current + weekGoals[5].current) / (weekGoals[4].target + weekGoals[5].target)) * 100);

  // 近12周趋势
  const trendLabels = [], trendData = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const w = getWeek(d);
    trendLabels.push('W' + w);
    let count = 0;
    count += DATA.weeklyPapers.filter(p => p.week === w).length;
    count += DATA.clinicGuidelines.filter(g => g.week === w).length;
    count += DATA.clinicCases.filter(c => c.week === w).length;
    count += DATA.clinicQuizzes.filter(q => q.week === w).length / 10;
    trendData.push(Math.round(count));
  }

  root.innerHTML = `
    <div class="grid-3" style="margin-bottom:16px">
      <div class="card" style="text-align:center">
        <div style="font-size:13px;color:var(--text-sub);margin-bottom:8px">🔬 科研奋斗单元</div>
        <div id="stats-donut-research"></div>
      </div>
      <div class="card" style="text-align:center">
        <div style="font-size:13px;color:var(--text-sub);margin-bottom:8px">🩺 临床工作单元</div>
        <div id="stats-donut-clinic"></div>
      </div>
      <div class="card" style="text-align:center">
        <div style="font-size:13px;color:var(--text-sub);margin-bottom:8px">🌿 生活精致单元</div>
        <div id="stats-donut-life"></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title"><span class="icon t-purple">📈</span>近12周完成趋势</div>
        <div id="stats-trend"></div>
      </div>
      <div class="card">
        <div class="card-title"><span class="icon t-orange">📊</span>各栏目统计</div>
        <div class="stat-row"><span class="sr-label">📅 每周精读文献</span><span class="sr-value">${stats.weeklyPaper.total} 篇 (本周 ${stats.weeklyPaper.weekCount})</span></div>
        <div class="stat-row"><span class="sr-label">📰 每日文献推送</span><span class="sr-value">${stats.dailyPaper.total} 篇 (收藏 ${stats.dailyPaper.favCount})</span></div>
        <div class="stat-row"><span class="sr-label">🧪 科研项目</span><span class="sr-value">${stats.projects.total} 个 (进行中 ${stats.projects.ongoing})</span></div>
        <div class="stat-row"><span class="sr-label">✍️ 论文撰写</span><span class="sr-value">${stats.paperWriting.total} 篇 (撰写中 ${stats.paperWriting.writing})</span></div>
        <div class="stat-row"><span class="sr-label">📮 论文投稿</span><span class="sr-value">${stats.paperSubmit.total} 篇 (审稿中 ${stats.paperSubmit.reviewing})</span></div>
        <div class="stat-row"><span class="sr-label">📚 文献库</span><span class="sr-value">${stats.library.total} 篇</span></div>
        <div class="stat-row"><span class="sr-label">📋 临床指南</span><span class="sr-value">${stats.guidelines.total} 份 (本周 ${stats.guidelines.weekCount})</span></div>
        <div class="stat-row"><span class="sr-label">🩺 临床操作</span><span class="sr-value">${stats.skills.total} 项 (累计 ${stats.skills.totalCount} 次)</span></div>
        <div class="stat-row"><span class="sr-label">🧠 临床病例</span><span class="sr-value">${stats.cases.total} 例 (本周 ${stats.cases.weekCount})</span></div>
        <div class="stat-row"><span class="sr-label">🌙 值班笔记</span><span class="sr-value">${stats.duties.total} 条</span></div>
        <div class="stat-row"><span class="sr-label">🔤 英语单词</span><span class="sr-value">${stats.words.total} 个 (掌握 ${stats.words.mastered})</span></div>
        <div class="stat-row"><span class="sr-label">💬 英语查房</span><span class="sr-value">${stats.rounds.total} 段</span></div>
        <div class="stat-row"><span class="sr-label">📝 规培题库</span><span class="sr-value">${stats.quizzes.total} 题 (掌握 ${stats.quizzes.mastered})</span></div>
        <div class="stat-row"><span class="sr-label">💪 健身打卡</span><span class="sr-value">本周 ${stats.fitness.weekCount} 次 / 本月 ${stats.fitness.monthCount} 次</span></div>
        <div class="stat-row"><span class="sr-label">⚖️ 空腹打卡</span><span class="sr-value">本周 ${stats.weight.weekCount} 晚 / 本月 ${stats.weight.monthCount} 晚</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><span class="icon t-pink">🎯</span>本周目标完成率</div>
      <div id="stats-goals"></div>
    </div>
  `;

  // 环形图
  setTimeout(() => {
    const dr = document.getElementById('stats-donut-research');
    const dc = document.getElementById('stats-donut-clinic');
    const dl = document.getElementById('stats-donut-life');
    if (dr) renderDonut(dr, Math.min(100, researchRate), 'var(--primary)');
    if (dc) renderDonut(dc, Math.min(100, isNaN(clinicRate) ? 0 : clinicRate), 'var(--pink)');
    if (dl) renderDonut(dl, Math.min(100, lifeRate), 'var(--green)');

    // 趋势图
    const trendEl = document.getElementById('stats-trend');
    if (trendEl) renderBarChart(trendEl, trendData, { unit: '', labels: trendLabels });

    // 本周目标
    const goalsEl = document.getElementById('stats-goals');
    if (goalsEl) {
      goalsEl.innerHTML = weekGoals.map(g => `
        <div class="week-goal" onclick="gotoPage('${g.page}')">
          <span class="wg-label">${g.label}</span>
          <div class="wg-bar"><div class="wg-bar-fill" style="width:${Math.min(100, g.current / g.target * 100)}%;background:${g.color}"></div></div>
          <span class="wg-text">${g.current}/${g.target}</span>
        </div>
      `).join('');
    }
  }, 50);
}

/* ============== 设置 ============== */
function renderSettings(root) {
  const s = DATA.settings || {};
  const kw = s.keywords || [];
  const goals = s.goals || {};
  const profile = s.profile || {};
  const api = s.apiConnections || {};

  root.innerHTML = `
    <div class="card">
      <div class="card-title"><span class="icon t-purple">👤</span>个人资料</div>
      <div class="form-row">
        <div class="form-group"><label>称谓/头衔</label><input id="set-title" value="${profile.title || ''}" /></div>
        <div class="form-group"><label>研究方向</label><input id="set-research" value="${profile.research || ''}" /></div>
      </div>
      <button class="btn-mini" onclick="saveProfile()">保存资料</button>
    </div>

    <div class="card">
      <div class="card-title">
        <span class="icon t-purple">🏷️</span>研究关键词库
        <button class="btn-mini" style="margin-left:auto" onclick="addKeyword()">+ 添加关键词</button>
      </div>
      <p style="font-size:12px;color:var(--text-sub);margin-bottom:10px">点击关键词可切换启用/停用 · 优先级 1=高 2=中 3=低 · 文献推荐依据关键词权重优化</p>
      <div id="set-keywords">
        ${kw.map((k, i) => `
          <span class="keyword-tag ${k.active ? '' : 'inactive'}" onclick="toggleKeyword(${i})">
            ${k.text}
            <span class="kw-priority">P${k.priority}</span>
            <span class="kw-remove" onclick="event.stopPropagation();delKeyword(${i})">×</span>
          </span>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title"><span class="icon t-orange">🎯</span>目标设定</div>
      <div class="grid-3">
        <div class="form-group"><label>每周精读文献</label><input id="set-g-wp" type="number" min="1" value="${goals.weeklyPaper || 1}" /></div>
        <div class="form-group"><label>每日文献推送</label><input id="set-g-dp" type="number" min="1" value="${goals.dailyPaper || 10}" /></div>
        <div class="form-group"><label>每周临床指南</label><input id="set-g-gl" type="number" min="1" value="${goals.guideline || 1}" /></div>
        <div class="form-group"><label>每周复杂病例</label><input id="set-g-cs" type="number" min="1" value="${goals.case || 1}" /></div>
        <div class="form-group"><label>每周规培题</label><input id="set-g-qz" type="number" min="1" value="${goals.quiz || 50}" /></div>
        <div class="form-group"><label>每天英语单词</label><input id="set-g-wd" type="number" min="1" value="${goals.words || 5}" /></div>
        <div class="form-group"><label>每周健身次数</label><input id="set-g-ft" type="number" min="1" value="${goals.fitness || 2}" /></div>
        <div class="form-group"><label>每周空腹晚数</label><input id="set-g-wt" type="number" min="1" value="${goals.weightFast || 3}" /></div>
      </div>
      <button class="btn-mini" onclick="saveGoals()">保存目标</button>
    </div>

    <div class="card">
      <div class="card-title"><span class="icon t-green">🔌</span>数据源连接</div>
      <div class="stat-row">
        <span class="sr-label">微信公众号内容 API</span>
        <span class="sr-value">
          ${api.wechat?.connected ? '<span class="tag tag-green">已连接</span>' : '<span class="tag tag-orange">未连接</span>'}
          ${api.wechat?.keyLast4 ? ' ···' + api.wechat.keyLast4 : ''}
        </span>
      </div>
      <div class="stat-row">
        <span class="sr-label">PubMed 文献检索</span>
        <span class="sr-value">
          ${api.pubmed?.connected ? '<span class="tag tag-green">已连接</span>' : '<span class="tag tag-orange">未连接</span>'}
          ${api.pubmed?.lastSync ? ' | 最后同步: ' + api.pubmed.lastSync : ''}
        </span>
      </div>
      <div style="margin-top:10px;font-size:12px;color:var(--text-sub);line-height:1.7">
        ℹ️ API Key 仅存储在服务端环境变量中，前端不保存密钥。<br/>
        如接口暂未配置，可使用手动添加链接或 CSV 导入替代。
      </div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn-mini" onclick="testApiConnection('wechat')">测试微信连接</button>
        <button class="btn-mini" onclick="testApiConnection('pubmed')">测试 PubMed</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><span class="icon t-pink">💾</span>数据管理</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-mini" onclick="exportData()">📥 导出全部数据 (JSON)</button>
        <button class="btn-mini" onclick="importData()">📤 导入数据</button>
        <button class="btn-mini" onclick="clearDemoData()">🧹 清除示例数据</button>
      </div>
      <div class="alert-box alert-warning" style="margin-top:12px">
        <span>⚠️</span>
        <div>清除示例数据只会删除标记为 demo 的记录，你的真实数据不会受到影响。导入数据会覆盖当前数据，请先导出备份。</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><span class="icon t-orange">ℹ️</span>关于</div>
      <div style="font-size:13px;line-height:1.8;color:var(--text-sub)">
        <b>打败懒惰科研工作台 v2.0</b><br/>
        妇科博士后 · 盆底功能障碍性疾病发病机制研究<br/>
        所有数据存储在浏览器本地 (localStorage)，不会上传到服务器。<br/>
        临床区域默认私密去标识化，医学内容仅供参考学习。
      </div>
    </div>
  `;
}

function saveProfile() {
  if (!DATA.settings) DATA.settings = {};
  if (!DATA.settings.profile) DATA.settings.profile = {};
  DATA.settings.profile.title = document.getElementById('set-title').value;
  DATA.settings.profile.research = document.getElementById('set-research').value;
  saveData();
  toast('✅ 资料已保存');
}

function addKeyword() {
  openModal('添加关键词', `
    <div class="form-group"><label>关键词 *</label><input id="f-kw" placeholder="例如：mtDNA" /></div>
    <div class="form-group">
      <label>优先级</label>
      <select id="f-pri">
        <option value="1">P1 高</option>
        <option value="2" selected>P2 中</option>
        <option value="3">P3 低</option>
      </select>
    </div>
  `, () => {
    const text = document.getElementById('f-kw').value.trim();
    if (!text) { toast('请填写关键词'); return; }
    if (!DATA.settings) DATA.settings = {};
    if (!DATA.settings.keywords) DATA.settings.keywords = [];
    DATA.settings.keywords.push({
      text, priority: parseInt(document.getElementById('f-pri').value),
      active: true
    });
    saveData();
    closeModal();
    renderPage('settings');
  });
}

function toggleKeyword(idx) {
  const kw = DATA.settings?.keywords;
  if (kw && kw[idx]) { kw[idx].active = !kw[idx].active; saveData(); renderPage('settings'); }
}

function delKeyword(idx) {
  const kw = DATA.settings?.keywords;
  if (kw && kw[idx]) { kw.splice(idx, 1); saveData(); renderPage('settings'); }
}

function saveGoals() {
  if (!DATA.settings) DATA.settings = {};
  if (!DATA.settings.goals) DATA.settings.goals = {};
  DATA.settings.goals.weeklyPaper = parseInt(document.getElementById('set-g-wp').value) || 1;
  DATA.settings.goals.dailyPaper = parseInt(document.getElementById('set-g-dp').value) || 10;
  DATA.settings.goals.guideline = parseInt(document.getElementById('set-g-gl').value) || 1;
  DATA.settings.goals.case = parseInt(document.getElementById('set-g-cs').value) || 1;
  DATA.settings.goals.quiz = parseInt(document.getElementById('set-g-qz').value) || 50;
  DATA.settings.goals.words = parseInt(document.getElementById('set-g-wd').value) || 5;
  DATA.settings.goals.fitness = parseInt(document.getElementById('set-g-ft').value) || 2;
  DATA.settings.goals.weightFast = parseInt(document.getElementById('set-g-wt').value) || 3;
  saveData();
  toast('✅ 目标已保存');
  updateBadges();
}

function testApiConnection(type) {
  if (!DATA.settings) DATA.settings = {};
  if (!DATA.settings.apiConnections) DATA.settings.apiConnections = {};
  if (!DATA.settings.apiConnections[type]) DATA.settings.apiConnections[type] = {};
  const conn = DATA.settings.apiConnections[type];
  conn.connected = false;
  conn.error = '接口未配置。请通过服务端环境变量设置 API Key。';
  conn.lastSync = '';
  saveData();
  toast('⚠️ ' + (type === 'wechat' ? '微信公众号' : 'PubMed') + ' 接口未配置，请使用手动添加替代');
  renderPage('settings');
}

function exportData() {
  const dataStr = JSON.stringify(DATA, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workbench-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✅ 数据已导出');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (confirm('⚠️ 确认导入？当前数据将被覆盖。建议先导出备份。')) {
          DATA = imported;
          migrateData(DATA);
          saveData();
          toast('✅ 数据已导入');
          gotoPage('dashboard');
        }
      } catch (err) {
        toast('❌ 文件格式错误');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearDemoData() {
  if (!confirm('确认清除所有标记为 demo 的示例数据？\n你的真实数据不会被删除。')) return;
  const cols = ['weeklyPapers','dailyPapers','researchProjects','paperWritings','paperSubmits','library','clinicGuidelines','clinicSkills','clinicCases','clinicDuties','clinicWords','clinicRounds','clinicQuizzes'];
  let count = 0;
  cols.forEach(c => {
    if (DATA[c]) {
      count += DATA[c].filter(x => x.is_demo).length;
      DATA[c] = DATA[c].filter(x => !x.is_demo);
    }
  });
  saveData();
  toast(`✅ 已清除 ${count} 条示例数据`);
  updateBadges();
  renderPage('settings');
}
