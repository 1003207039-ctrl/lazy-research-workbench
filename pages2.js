/* ============================================================
   临床单元 + 生活精致 页面
   ============================================================ */

/* ============== 临床指南 ============== */
function renderClinicGuideline(root) {
  const week = getWeek(new Date());
  const items = [...DATA.clinicGuidelines].sort((a, b) => b.date.localeCompare(a.date));

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;margin-bottom:4px">临床指南每周学习</h2>
        <p style="color:var(--text-sub);font-size:12px;margin:0">每周精读1个妇科指南 · 当前第 ${week} 周</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-mini" onclick="trackGuideline()">📡 追踪最新指南</button>
        <button class="btn-primary" onclick="addGuideline()">+ 记录指南</button>
      </div>
    </div>

    <div class="card" style="background:linear-gradient(135deg,#fff5f7,#fde4ec);border:none">
      <div class="card-title"><span class="icon t-pink">💡</span>本周推荐</div>
      <p style="font-size:13px;line-height:1.7;color:var(--text)">
        可关注方向：<b>POP/PFD</b>、<b>子宫内膜异位症/腺肌症</b>、<b>宫颈癌筛查</b>、<b>HPV疫苗</b>、<b>围绝经期管理</b>、<b>妇科肿瘤</b>、<b>盆底康复</b>、<b>女性生殖道感染</b>、<b>产科指南</b>。
      </p>
    </div>

    <div id="gl-list"></div>
  `;
  const list = document.getElementById('gl-list');
  if (!items.length) list.innerHTML = '<div class="empty"><div class="emoji">📋</div>还没有指南记录,点击右上角添加</div>';
  else list.innerHTML = items.map(g => `
    <div class="card" style="border-left:4px solid var(--pink)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1">
          <h3 style="font-size:15px;margin-bottom:6px">${g.title} ${g.important ? '<span class="tag tag-pink">重要</span>' : ''}</h3>
          <div class="doc-meta" style="margin-bottom:10px">
            <span>📅 ${g.date}</span>
            <span>📖 ${g.source} ${g.year}</span>
            <span class="tag tag-purple">第${g.week}周</span>
          </div>
          <div style="background:var(--panel-2);padding:10px;border-radius:8px;line-height:1.7;margin-bottom:8px;font-size:13px">
            <b>核心摘要：</b>${g.summary}
          </div>
          <div>
            <b style="font-size:12px;color:var(--text-sub)">关键更新要点：</b>
            <ul style="margin:6px 0 0;padding-left:20px;font-size:12px;line-height:1.7">
              ${(g.keyPoints || []).map(p => `<li>${p}</li>`).join('')}
            </ul>
          </div>
        </div>
        <div class="doc-actions">
          <button class="btn-mini" onclick="editGuideline('${g.id}')">编辑</button>
          <button class="btn-danger" onclick="delGuideline('${g.id}')">删除</button>
        </div>
      </div>
    </div>
  `).join('');
}

function addGuideline() { editGuideline(null); }
function editGuideline(id) {
  const g = id ? DATA.clinicGuidelines.find(x => x.id === id) : { title:'', source:'', year:2025, summary:'', keyPoints:[], important:false };
  openModal(id ? '编辑指南' : '记录指南', `
    <div class="form-group"><label>指南名称 *</label><input id="f-title" value="${(g.title || '').replace(/"/g, '&quot;')}" /></div>
    <div class="form-row">
      <div class="form-group"><label>发布机构/期刊</label><input id="f-source" value="${g.source || ''}" /></div>
      <div class="form-group"><label>年份</label><input id="f-year" type="number" value="${g.year}" /></div>
    </div>
    <div class="form-group"><label>核心摘要</label><textarea id="f-summary" rows="4">${g.summary || ''}</textarea></div>
    <div class="form-group">
      <label>关键更新要点(每行一条)</label>
      <textarea id="f-points" rows="5" placeholder="要点1&#10;要点2&#10;要点3">${(g.keyPoints || []).join('\n')}</textarea>
    </div>
    <div class="form-group">
      <label><input type="checkbox" id="f-important" ${g.important ? 'checked' : ''} style="width:auto;margin-right:6px" />标记为重要</label>
    </div>
  `, () => {
    const obj = {
      id: id || genId(),
      title: document.getElementById('f-title').value.trim(),
      source: document.getElementById('f-source').value.trim(),
      year: parseInt(document.getElementById('f-year').value) || new Date().getFullYear(),
      summary: document.getElementById('f-summary').value.trim(),
      keyPoints: document.getElementById('f-points').value.split('\n').map(x => x.trim()).filter(Boolean),
      important: document.getElementById('f-important').checked,
      week: getWeek(new Date()),
      date: todayStr()
    };
    if (!obj.title) { toast('请填写指南名称'); return; }
    if (id) {
      const idx = DATA.clinicGuidelines.findIndex(x => x.id === id);
      DATA.clinicGuidelines[idx] = obj;
    } else DATA.clinicGuidelines.unshift(obj);
    saveData();
    closeModal();
    renderPage('clinic-guideline');
  });
}

function delGuideline(id) {
  if (!confirm('确认删除？')) return;
  DATA.clinicGuidelines = DATA.clinicGuidelines.filter(x => x.id !== id);
  saveData();
  renderPage('clinic-guideline');
}

function trackGuideline() {
  const sources = [
    { org: '中华妇产科杂志', url: 'https://rs.yiigle.com/CN115673/home' },
    { org: 'UpToDate临床顾问', url: 'https://www.uptodate.com/contents/zh-Hans/gynecology' },
    { org: 'NCCN Guidelines', url: 'https://www.nccn.org/guidelines' },
    { org: 'ACOG Practice Bulletins', url: 'https://www.acog.org/clinical/clinical-guidance/practice-bulletin' },
    { org: 'RCOG Guidelines', url: 'https://www.rcog.org.uk/guidelines' }
  ];
  openModal('📡 追踪最新指南', `
    <p style="margin-bottom:12px">点击进入下列权威来源,追踪最新妇科指南：</p>
    ${sources.map(s => `
      <a href="${s.url}" target="_blank" style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--panel-2);border-radius:8px;margin-bottom:6px;text-decoration:none;color:var(--text)">
        <b>${s.org}</b>
        <span style="color:var(--primary);font-size:12px">打开 →</span>
      </a>
    `).join('')}
  `, null, true);
}

/* ============== 临床操作 ============== */
function renderClinicSkill(root) {
  const week = getWeek(new Date());
  const items = [...DATA.clinicSkills].sort((a, b) => b.week - a.week);

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;margin-bottom:4px">临床操作积累</h2>
        <p style="color:var(--text-sub);font-size:12px;margin:0">把每个操作变成自己的SOP · 当前第 ${week} 周</p>
      </div>
      <button class="btn-primary" onclick="addSkill()">+ 记录操作</button>
    </div>

    <div class="grid-4" style="margin-bottom:16px">
      <div class="stat-card">
        <div class="stat-icon t-pink">🩺</div>
        <div class="stat-label">本周新增</div>
        <div class="stat-value">${items.filter(s => s.week === week).length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-orange">🔁</div>
        <div class="stat-label">累计操作数</div>
        <div class="stat-value">${items.reduce((sum, s) => sum + (s.count || 0), 0)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-purple">📋</div>
        <div class="stat-label">SOP条目</div>
        <div class="stat-value">${items.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-green">📅</div>
        <div class="stat-label">最近操作</div>
        <div class="stat-value" style="font-size:14px">${items[0]?.lastDate || '—'}</div>
      </div>
    </div>

    <div id="sk-list"></div>
  `;

  const list = document.getElementById('sk-list');
  if (!items.length) list.innerHTML = '<div class="empty"><div class="emoji">🩺</div>还没有操作记录,点击右上角添加</div>';
  else list.innerHTML = items.map(s => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1">
          <h3 style="font-size:15px;margin-bottom:6px">${s.name} <span class="tag tag-purple">${s.category}</span></h3>
          <div class="doc-meta" style="margin-bottom:10px">
            <span>📅 第${s.week}周</span>
            <span>🔁 已做 ${s.count} 次</span>
            <span>⏱️ 最近 ${s.lastDate || '—'}</span>
          </div>
          <div style="background:var(--panel-2);padding:12px;border-radius:8px">
            <b style="font-size:12px;color:var(--text-sub)">📝 操作步骤：</b>
            <ol style="margin:6px 0 0;padding-left:24px;font-size:12px;line-height:1.8">
              ${(s.steps || []).map(st => `<li>${st}</li>`).join('')}
            </ol>
          </div>
          ${s.notes ? `<div style="background:var(--orange-soft);padding:8px;border-radius:6px;margin-top:8px;font-size:12px">💡 ${s.notes}</div>` : ''}
        </div>
        <div class="doc-actions" style="display:flex;flex-direction:column;gap:4px">
          <button class="btn-mini" onclick="addSkillCount('${s.id}')">+ 计数</button>
          <button class="btn-mini" onclick="editSkill('${s.id}')">编辑</button>
          <button class="btn-danger" onclick="delSkill('${s.id}')">删除</button>
        </div>
      </div>
    </div>
  `).join('');
}

function addSkill() { editSkill(null); }
function editSkill(id) {
  const s = id ? DATA.clinicSkills.find(x => x.id === id) : { name:'', category:'手术', steps:[], count:0, lastDate:'', notes:'' };
  openModal(id ? '编辑操作' : '记录操作', `
    <div class="form-group"><label>操作名称 *</label><input id="f-name" value="${(s.name || '').replace(/"/g, '&quot;')}" placeholder="腹腔镜下全子宫切除术" /></div>
    <div class="form-row">
      <div class="form-group">
        <label>分类</label>
        <select id="f-cat">
          ${['手术','操作','检查','急救','门诊小手术','其他'].map(c => `<option ${s.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>已做次数</label><input id="f-count" type="number" value="${s.count || 0}" /></div>
      <div class="form-group"><label>最近一次</label><input id="f-last" type="date" value="${s.lastDate || ''}" /></div>
    </div>
    <div class="form-group">
      <label>操作步骤(每行一步)</label>
      <textarea id="f-steps" rows="8" placeholder="1. 患者体位&#10;2. 切口选择&#10;3. ...">${(s.steps || []).join('\n')}</textarea>
    </div>
    <div class="form-group"><label>心得笔记</label><textarea id="f-notes">${s.notes || ''}</textarea></div>
  `, () => {
    const obj = {
      id: id || genId(),
      name: document.getElementById('f-name').value.trim(),
      category: document.getElementById('f-cat').value,
      count: parseInt(document.getElementById('f-count').value) || 0,
      lastDate: document.getElementById('f-last').value,
      steps: document.getElementById('f-steps').value.split('\n').map(x => x.trim()).filter(Boolean),
      notes: document.getElementById('f-notes').value,
      week: getWeek(new Date())
    };
    if (!obj.name) { toast('请填写操作名称'); return; }
    if (id) {
      const idx = DATA.clinicSkills.findIndex(x => x.id === id);
      DATA.clinicSkills[idx] = obj;
    } else DATA.clinicSkills.unshift(obj);
    saveData();
    closeModal();
    renderPage('clinic-skill');
  });
}

function addSkillCount(id) {
  const s = DATA.clinicSkills.find(x => x.id === id);
  if (s) {
    s.count = (s.count || 0) + 1;
    s.lastDate = todayStr();
    saveData();
    toast('+1 🎉 累计 ' + s.count + ' 次');
    renderPage('clinic-skill');
  }
}
function delSkill(id) {
  if (!confirm('确认删除？')) return;
  DATA.clinicSkills = DATA.clinicSkills.filter(x => x.id !== id);
  saveData();
  renderPage('clinic-skill');
}

/* ============== 临床病例 ============== */
function renderClinicCase(root) {
  const week = getWeek(new Date());
  const items = [...DATA.clinicCases].sort((a, b) => b.date.localeCompare(a.date));

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;margin-bottom:4px">临床病例分析</h2>
        <p style="color:var(--text-sub);font-size:12px;margin:0">每周一个复杂病例,提取自己的临床直觉 · 当前第 ${week} 周</p>
      </div>
      <button class="btn-primary" onclick="addCase()">+ 记录病例</button>
    </div>
    <div id="cs-list"></div>
  `;
  const list = document.getElementById('cs-list');
  if (!items.length) list.innerHTML = '<div class="empty"><div class="emoji">🧠</div>还没有病例,点击右上角添加</div>';
  else list.innerHTML = items.map(c => `
    <div class="card" style="border-left:4px solid var(--pink)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1">
          <h3 style="font-size:15px;margin-bottom:4px">${c.patient}</h3>
          <div class="doc-meta" style="margin-bottom:10px">
            <span>📅 ${c.date} (第${c.week}周)</span>
            <span class="tag tag-pink">${c.diagnosis}</span>
          </div>
          <div class="grid-2" style="gap:8px;margin-bottom:10px">
            <div>
              <div style="font-size:12px;color:var(--text-sub);margin-bottom:4px">主诉</div>
              <div style="background:var(--panel-2);padding:8px;border-radius:6px;font-size:12px">${c.complaint}</div>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-sub);margin-bottom:4px">病史</div>
              <div style="background:var(--panel-2);padding:8px;border-radius:6px;font-size:12px">${c.history}</div>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-sub);margin-bottom:4px">查体+辅助检查</div>
              <div style="background:var(--panel-2);padding:8px;border-radius:6px;font-size:12px">${c.exam}</div>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-sub);margin-bottom:4px">治疗方案</div>
              <div style="background:var(--green-soft);padding:8px;border-radius:6px;font-size:12px">${c.plan}</div>
            </div>
          </div>
          <div style="background:var(--primary-soft);padding:10px;border-radius:8px;font-size:13px;line-height:1.7">
            <b>💡 总结：</b>${c.summary}
          </div>
        </div>
        <div class="doc-actions" style="display:flex;flex-direction:column;gap:4px">
          <button class="btn-mini" onclick="editCase('${c.id}')">编辑</button>
          <button class="btn-danger" onclick="delCase('${c.id}')">删除</button>
        </div>
      </div>
    </div>
  `).join('');
}

function addCase() { editCase(null); }
function editCase(id) {
  const c = id ? DATA.clinicCases.find(x => x.id === id) : { patient:'', complaint:'', history:'', exam:'', diagnosis:'', plan:'', summary:'' };
  openModal(id ? '编辑病例' : '记录病例', `
    <div class="form-group"><label>患者基本信息 *</label><input id="f-patient" value="${(c.patient || '').replace(/"/g, '&quot;')}" placeholder="女，48岁，G2P2" /></div>
    <div class="form-group"><label>主诉</label><textarea id="f-complaint" rows="2">${c.complaint || ''}</textarea></div>
    <div class="form-group"><label>病史</label><textarea id="f-history" rows="3">${c.history || ''}</textarea></div>
    <div class="form-group"><label>查体与辅助检查</label><textarea id="f-exam" rows="3">${c.exam || ''}</textarea></div>
    <div class="form-group"><label>诊断</label><input id="f-diagnosis" value="${(c.diagnosis || '').replace(/"/g, '&quot;')}" /></div>
    <div class="form-group"><label>治疗方案</label><textarea id="f-plan" rows="3">${c.plan || ''}</textarea></div>
    <div class="form-group"><label>个人总结</label><textarea id="f-summary" rows="3">${c.summary || ''}</textarea></div>
  `, () => {
    const obj = {
      id: id || genId(),
      patient: document.getElementById('f-patient').value.trim(),
      complaint: document.getElementById('f-complaint').value,
      history: document.getElementById('f-history').value,
      exam: document.getElementById('f-exam').value,
      diagnosis: document.getElementById('f-diagnosis').value,
      plan: document.getElementById('f-plan').value,
      summary: document.getElementById('f-summary').value,
      week: getWeek(new Date()),
      date: todayStr()
    };
    if (!obj.patient) { toast('请填写患者信息'); return; }
    if (id) {
      const idx = DATA.clinicCases.findIndex(x => x.id === id);
      DATA.clinicCases[idx] = obj;
    } else DATA.clinicCases.unshift(obj);
    saveData();
    closeModal();
    renderPage('clinic-case');
  });
}
function delCase(id) {
  if (!confirm('确认删除？')) return;
  DATA.clinicCases = DATA.clinicCases.filter(x => x.id !== id);
  saveData();
  renderPage('clinic-case');
}

/* ============== 临床值班笔记 ============== */
function renderClinicDuty(root) {
  const items = [...DATA.clinicDuties].sort((a, b) => b.date.localeCompare(a.date));

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;margin-bottom:4px">临床值班笔记</h2>
        <p style="color:var(--text-sub);font-size:12px;margin:0">按症状整理值班思路和用药方案 · 值班的底气,来自平时的积累</p>
      </div>
      <button class="btn-primary" onclick="addDuty()">+ 添加症状</button>
    </div>
    <div id="dt-list"></div>
  `;
  const list = document.getElementById('dt-list');
  if (!items.length) list.innerHTML = '<div class="empty"><div class="emoji">🌙</div>还没有值班笔记,点击右上角添加第一个症状</div>';
  else list.innerHTML = items.map(d => `
    <div class="card" style="border-left:4px solid var(--orange)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1">
          <h3 style="font-size:15px;margin-bottom:6px">🆘 ${d.symptom}</h3>
          <div class="doc-meta" style="margin-bottom:10px"><span>📅 ${d.date}</span></div>
          <div class="grid-2" style="gap:8px">
            <div>
              <div style="font-size:12px;color:var(--text-sub);margin-bottom:4px">🧠 思路流程</div>
              <div style="background:var(--primary-soft);padding:10px;border-radius:6px;font-size:12px;line-height:1.7;white-space:pre-wrap">${d.thinking}</div>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-sub);margin-bottom:4px">💊 用药方案</div>
              <div style="background:var(--green-soft);padding:10px;border-radius:6px;font-size:12px;line-height:1.7;white-space:pre-wrap">${d.drugs}</div>
            </div>
          </div>
          ${d.notes ? `<div style="background:var(--orange-soft);padding:8px;border-radius:6px;margin-top:8px;font-size:12px">⚠️ ${d.notes}</div>` : ''}
        </div>
        <div class="doc-actions" style="display:flex;flex-direction:column;gap:4px">
          <button class="btn-mini" onclick="editDuty('${d.id}')">编辑</button>
          <button class="btn-danger" onclick="delDuty('${d.id}')">删除</button>
        </div>
      </div>
    </div>
  `).join('');
}

function addDuty() { editDuty(null); }
function editDuty(id) {
  const d = id ? DATA.clinicDuties.find(x => x.id === id) : { symptom:'', thinking:'', drugs:'', notes:'' };
  openModal(id ? '编辑值班笔记' : '添加值班症状', `
    <div class="form-group"><label>症状/急症 *</label><input id="f-symptom" value="${(d.symptom || '').replace(/"/g, '&quot;')}" placeholder="产后出血 / 急性腹痛 / 异位妊娠破裂" /></div>
    <div class="form-group">
      <label>🧠 思路流程(每行一步)</label>
      <textarea id="f-thinking" rows="6" placeholder="1. 评估生命体征&#10;2. 询问病史&#10;3. 查体&#10;4. 辅助检查&#10;5. 初步处理&#10;6. 请会诊指征">${d.thinking || ''}</textarea>
    </div>
    <div class="form-group">
      <label>💊 用药方案</label>
      <textarea id="f-drugs" rows="4" placeholder="缩宫素 20U iv...&#10;卡前列素氨丁三醇 250μg im...">${d.drugs || ''}</textarea>
    </div>
    <div class="form-group"><label>⚠️ 注意事项</label><textarea id="f-notes">${d.notes || ''}</textarea></div>
  `, () => {
    const obj = {
      id: id || genId(),
      symptom: document.getElementById('f-symptom').value.trim(),
      thinking: document.getElementById('f-thinking').value,
      drugs: document.getElementById('f-drugs').value,
      notes: document.getElementById('f-notes').value,
      date: todayStr()
    };
    if (!obj.symptom) { toast('请填写症状'); return; }
    if (id) {
      const idx = DATA.clinicDuties.findIndex(x => x.id === id);
      DATA.clinicDuties[idx] = obj;
    } else DATA.clinicDuties.unshift(obj);
    saveData();
    closeModal();
    renderPage('clinic-duty');
  });
}
function delDuty(id) {
  if (!confirm('确认删除？')) return;
  DATA.clinicDuties = DATA.clinicDuties.filter(x => x.id !== id);
  saveData();
  renderPage('clinic-duty');
}

/* ============== 英语单词本 ============== */
function renderClinicWords(root) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // 今日应背单词：基于今日+已学过的索引
  const all = DATA.clinicWords;
  const todayWords = all.filter(w => w.date === todayStr());

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;margin-bottom:4px">学术英语单词本</h2>
        <p style="color:var(--text-sub);font-size:12px;margin:0">每天5个妇科学术英语单词,慢慢长出英文思维</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-mini" onclick="addWord()">+ 手动添加</button>
        <button class="btn-primary" onclick="genTodayWords()">🎲 生成今日5词</button>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom:16px">
      <div class="stat-card">
        <div class="stat-icon t-pink">📅</div>
        <div class="stat-label">今日已学</div>
        <div class="stat-value">${todayWords.length} <span style="font-size:14px;font-weight:400;color:var(--text-sub)">/ 5</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-green">✅</div>
        <div class="stat-label">累计掌握</div>
        <div class="stat-value">${all.filter(w => w.mastered).length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-purple">📚</div>
        <div class="stat-label">总词库</div>
        <div class="stat-value">${all.length}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><span class="icon t-pink">📅</span>今日单词 (${todayWords.length}/5)</div>
      <div id="word-today"></div>
    </div>

    <div class="card">
      <div class="card-title"><span class="icon t-green">✅</span>已掌握 · 复习</div>
      <div id="word-mastered"></div>
    </div>

    <div class="card">
      <div class="card-title"><span class="icon t-orange">📖</span>全部词库</div>
      <div id="word-all"></div>
    </div>
  `;

  function paint() {
    const t = document.getElementById('word-today');
    if (!todayWords.length) t.innerHTML = '<div class="empty"><div class="emoji">📅</div>今日还没有单词,点击"生成今日5词"</div>';
    else t.innerHTML = todayWords.map(w => wordItem(w)).join('');

    const m = document.getElementById('word-mastered');
    const mastered = all.filter(w => w.mastered);
    if (!mastered.length) m.innerHTML = '<div class="empty" style="padding:20px">还没有掌握的单词</div>';
    else m.innerHTML = mastered.slice(0, 10).map(w => wordItem(w)).join('');

    const a = document.getElementById('word-all');
    a.innerHTML = all.map(w => wordItem(w)).join('');
  }

  function wordItem(w) {
    return `<div class="word-card">
      <div>
        <div class="word-en">${w.word}</div>
        <div class="word-phonetic">${w.phonetic || ''}</div>
      </div>
      <div class="word-cn">${w.meaning}</div>
      <div style="max-width:300px;font-size:11px;color:var(--text-sub);font-style:italic">${w.example || ''}</div>
      <div style="display:flex;gap:4px;align-items:center">
        ${w.mastered ? '<span class="tag tag-green">✓ 掌握</span>' : `<button class="btn-mini" onclick="markWord('${w.id}', true)">✓ 掌握</button>`}
        <button class="btn-danger" style="font-size:11px;padding:2px 6px" onclick="delWord('${w.id}')">×</button>
      </div>
    </div>`;
  }
  paint();
}

function markWord(id, mastered) {
  const w = DATA.clinicWords.find(x => x.id === id);
  if (w) { w.mastered = mastered; saveData(); renderPage('clinic-words'); }
}
function delWord(id) {
  DATA.clinicWords = DATA.clinicWords.filter(x => x.id !== id);
  saveData();
  renderPage('clinic-words');
}

function genTodayWords() {
  // 妇科常用学术词汇库
  const pool = [
    { word: 'amenorrhea', phonetic: '/əˌmiːnəˈrɪə/', meaning: '闭经', example: 'Secondary amenorrhea requires thorough evaluation.' },
    { word: 'menorrhagia', phonetic: '/ˌmenəˈreɪdʒə/', meaning: '经量过多', example: 'Menorrhagia is the most common symptom of adenomyosis.' },
    { word: 'metrorrhagia', phonetic: '/ˌmiːtrəˈreɪdʒə/', meaning: '子宫不规则出血', example: 'Metrorrhagia in perimenopause needs to rule out malignancy.' },
    { word: 'dysmenorrhea', phonetic: '/ˌdɪsmenəˈrɪə/', meaning: '痛经', example: 'Primary dysmenorrhea usually starts within 2 years of menarche.' },
    { word: 'dyspareunia', phonetic: '/ˌdɪspəˈruːniə/', meaning: '性交痛', example: 'Deep dyspareunia suggests endometriosis or pelvic adhesions.' },
    { word: 'leukorrhea', phonetic: '/ˌluːkəˈrɪə/', meaning: '白带', example: 'Foul-smelling leukorrhea indicates possible infection.' },
    { word: 'pruritus vulvae', phonetic: '/prʊˈraɪtəs ˈvʌlviː/', meaning: '外阴瘙痒', example: 'Pruritus vulvae is commonly caused by candidal infection.' },
    { word: 'cervical ectropion', phonetic: '/ˈsɜːrvɪkl ekˈtrəʊpɪən/', meaning: '宫颈柱状上皮异位', example: 'Cervical ectropion is a physiological phenomenon in young women.' },
    { word: 'colposcopy', phonetic: '/kɒlˈpɒskəpi/', meaning: '阴道镜检查', example: 'Colposcopy is recommended for HSIL cytology.' },
    { word: 'curettage', phonetic: '/kjʊərɪˈtɑːʒ/', meaning: '刮宫术', example: 'D&C is both diagnostic and therapeutic.' },
    { word: 'hysterosalpingography', phonetic: '/ˌhɪstərəʊsælpɪŋˈɡɒɡrəfi/', meaning: '子宫输卵管造影', example: 'HSG is used to assess tubal patency in infertility workup.' },
    { word: 'laparoscopy', phonetic: '/ˌlæpəˈrɒskəpi/', meaning: '腹腔镜检查', example: 'Laparoscopy is the gold standard for endometriosis diagnosis.' },
    { word: 'hysterectomy', phonetic: '/ˌhɪstəˈrektəmi/', meaning: '子宫切除术', example: 'Laparoscopic hysterectomy has faster recovery.' },
    { word: 'myomectomy', phonetic: '/ˌmaɪəˈmektəmi/', meaning: '肌瘤剔除术', example: 'Myomectomy preserves fertility in young patients.' },
    { word: 'oophorectomy', phonetic: '/ˌəʊəfəˈrektəmi/', meaning: '卵巢切除术', example: 'Bilateral oophorectomy induces surgical menopause.' },
    { word: 'salpingectomy', phonetic: '/ˌsælpɪnˈdʒektəmi/', meaning: '输卵管切除术', example: 'Salpingectomy is indicated for ectopic pregnancy.' },
    { word: 'cystectomy', phonetic: '/sɪˈstektəmi/', meaning: '囊肿剥除术', example: 'Ovarian cystectomy preserves ovarian reserve.' },
    { word: 'polycystic ovary syndrome', phonetic: '/ˌpɒlɪˈsɪstɪk/', meaning: '多囊卵巢综合征(PCOS)', example: 'PCOS is the most common endocrine disorder in reproductive age.' },
    { word: 'premenstrual syndrome', phonetic: '/ˌpriːˈmenstruəl/', meaning: '经前综合征(PMS)', example: 'PMS affects 20-30% of reproductive women.' },
    { word: 'pelvic inflammatory disease', phonetic: '/ˈpelvɪk ɪnˈflæmətri/', meaning: '盆腔炎性疾病(PID)', example: 'PID can lead to tubal factor infertility.' }
  ];

  // 清空今日
  DATA.clinicWords = DATA.clinicWords.filter(w => w.date !== todayStr());
  // 随机取5个
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
  shuffled.forEach(w => {
    DATA.clinicWords.unshift({ id: genId(), date: todayStr(), mastered: false, ...w });
  });
  saveData();
  toast('🎲 已生成今日5个单词,加油背诵！');
  renderPage('clinic-words');
}

function addWord() {
  openModal('添加单词', `
    <div class="form-group"><label>单词 *</label><input id="f-word" /></div>
    <div class="form-group"><label>音标</label><input id="f-phonetic" placeholder="/.../" /></div>
    <div class="form-group"><label>释义</label><input id="f-meaning" /></div>
    <div class="form-group"><label>例句</label><textarea id="f-example"></textarea></div>
  `, () => {
    const obj = {
      id: genId(),
      date: todayStr(),
      word: document.getElementById('f-word').value.trim(),
      phonetic: document.getElementById('f-phonetic').value.trim(),
      meaning: document.getElementById('f-meaning').value.trim(),
      example: document.getElementById('f-example').value,
      mastered: false
    };
    if (!obj.word) { toast('请填写单词'); return; }
    DATA.clinicWords.unshift(obj);
    saveData();
    closeModal();
    renderPage('clinic-words');
  });
}

/* ============== 英语查房情景 ============== */
function renderClinicRound(root) {
  const items = [...DATA.clinicRounds].sort((a, b) => b.createdAt - a.createdAt);

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;margin-bottom:4px">英语查房情景</h2>
        <p style="color:var(--text-sub);font-size:12px;margin:0">沉浸式英语问诊对话训练 · 适合每周1-2次</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-mini" onclick="generateRound()">🤖 智能生成情景</button>
        <button class="btn-primary" onclick="addRound()">+ 手动创建</button>
      </div>
    </div>

    <div class="card" style="background:linear-gradient(135deg,#e0f7fa,#fce4ec);border:none">
      <div class="card-title"><span class="icon t-pink">💡</span>常见查房情景</div>
      <p style="font-size:12px;line-height:1.8">
        术前知情同意 · 术后查房 · 急诊腹痛 · 不孕症问诊 · 妇科肿瘤病情告知 · 产后访视 · 化疗前评估 · 围绝经期咨询 · 宫颈癌筛查结果告知 · 避孕咨询
      </p>
    </div>

    <div id="rd-list"></div>
  `;
  const list = document.getElementById('rd-list');
  if (!items.length) list.innerHTML = '<div class="empty"><div class="emoji">💬</div>还没有情景,点击"智能生成"或"手动创建"</div>';
  else list.innerHTML = items.map(r => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1">
          <h3 style="font-size:15px;margin-bottom:4px">🎬 ${r.scenario}</h3>
          <div class="doc-meta" style="margin-bottom:12px"><span>📅 ${fmtDate(r.createdAt)}</span></div>
          <div>
            ${(r.dialogues || []).map(d => `
              <div class="dialogue">
                <span class="speaker ${d.speaker}">${d.speaker === 'doctor' ? '👩‍⚕️ Doctor' : '🤰 Patient'}</span>
                <div class="en">${d.en}</div>
                <div class="cn">💬 ${d.cn}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="doc-actions" style="display:flex;flex-direction:column;gap:4px">
          <button class="btn-mini" onclick="addRoundDialogue('${r.id}')">+ 对话</button>
          <button class="btn-danger" onclick="delRound('${r.id}')">删除</button>
        </div>
      </div>
    </div>
  `).join('');
}

function addRound() { editRound(null); }
function editRound(id) {
  const r = id ? DATA.clinicRounds.find(x => x.id === id) : { scenario:'', dialogues:[], createdAt:Date.now() };
  openModal(id ? '编辑情景' : '创建情景', `
    <div class="form-group"><label>情景名称 *</label><input id="f-scenario" value="${(r.scenario || '').replace(/"/g, '&quot;')}" placeholder="子宫肌瘤患者术前查房" /></div>
  `, () => {
    const obj = {
      id: id || genId(),
      scenario: document.getElementById('f-scenario').value.trim(),
      dialogues: r.dialogues || [],
      createdAt: r.createdAt || Date.now()
    };
    if (!obj.scenario) { toast('请填写情景'); return; }
    if (id) {
      const idx = DATA.clinicRounds.findIndex(x => x.id === id);
      DATA.clinicRounds[idx] = obj;
    } else DATA.clinicRounds.unshift(obj);
    saveData();
    closeModal();
    renderPage('clinic-round');
  });
}

function addRoundDialogue(id) {
  const r = DATA.clinicRounds.find(x => x.id === id);
  if (!r) return;
  openModal('添加对话', `
    <div class="form-group">
      <label>说话人</label>
      <select id="f-sp">
        <option value="doctor">👩‍⚕️ Doctor</option>
        <option value="patient">🤰 Patient</option>
      </select>
    </div>
    <div class="form-group"><label>英文 *</label><textarea id="f-en" rows="2"></textarea></div>
    <div class="form-group"><label>中文翻译</label><textarea id="f-cn" rows="2"></textarea></div>
  `, () => {
    r.dialogues = r.dialogues || [];
    r.dialogues.push({
      speaker: document.getElementById('f-sp').value,
      en: document.getElementById('f-en').value,
      cn: document.getElementById('f-cn').value
    });
    saveData();
    closeModal();
    renderPage('clinic-round');
  });
}

function delRound(id) {
  if (!confirm('确认删除？')) return;
  DATA.clinicRounds = DATA.clinicRounds.filter(x => x.id !== id);
  saveData();
  renderPage('clinic-round');
}

function generateRound() {
  const scenarios = [
    {
      scenario: '异位妊娠急诊问诊',
      dialogues: [
        { speaker: 'doctor', en: 'Hello, what brings you to the emergency room today?', cn: '你好,今天为什么来急诊？' },
        { speaker: 'patient', en: 'I have severe lower abdominal pain and some vaginal bleeding.', cn: '我有严重的下腹痛和少量阴道出血。' },
        { speaker: 'doctor', en: 'When did your last menstrual period start? Are you sexually active?', cn: '你最后一次月经是什么时候？有性生活吗？' },
        { speaker: 'patient', en: 'My period was 6 weeks ago, and I missed it. I could be pregnant.', cn: '我6周前来的月经,一直没来,可能怀孕了。' },
        { speaker: 'doctor', en: 'I will order a urine pregnancy test and a pelvic ultrasound immediately.', cn: '我会立即给你安排尿妊娠试验和盆腔超声。' }
      ]
    },
    {
      scenario: '宫颈癌筛查结果告知',
      dialogues: [
        { speaker: 'doctor', en: 'Mrs. Wang, I have your Pap smear results. Would you like to discuss them?', cn: '王女士,你的巴氏涂片结果出来了,要一起看一下吗？' },
        { speaker: 'patient', en: 'Yes, doctor. I am very nervous about the results.', cn: '好的医生,我很紧张。' },
        { speaker: 'doctor', en: 'The result shows ASCUS, which means atypical cells. It is not cancer, but we need further evaluation.', cn: '结果显示ASCUS,也就是非典型鳞状细胞。这不是癌症,但需要进一步评估。' },
        { speaker: 'patient', en: 'What is the next step? I am worried.', cn: '下一步怎么办？我很担心。' },
        { speaker: 'doctor', en: 'I recommend an HPV test and a colposcopy if needed. Most ASCUS cases resolve on their own.', cn: '我建议做HPV检测,必要时行阴道镜检查。多数ASCUS会自行恢复。' }
      ]
    },
    {
      scenario: '更年期综合征咨询',
      dialogues: [
        { speaker: 'patient', en: 'Doctor, I have been having hot flashes and trouble sleeping for 3 months.', cn: '医生,我3个月来一直潮热、失眠。' },
        { speaker: 'doctor', en: 'How old are you, and when was your last period?', cn: '你多大了？最后一次月经是什么时候？' },
        { speaker: 'patient', en: 'I am 51, and my period stopped about 6 months ago.', cn: '我51岁,月经6个月前停了。' },
        { speaker: 'doctor', en: 'These are typical perimenopausal symptoms. We can discuss treatment options including hormone therapy.', cn: '这是典型的围绝经期症状。我们可以讨论治疗方案,包括激素替代治疗。' }
      ]
    }
  ];
  const r = scenarios[Math.floor(Math.random() * scenarios.length)];
  DATA.clinicRounds.unshift({ id: genId(), createdAt: Date.now(), ...r });
  saveData();
  toast('🤖 已生成情景对话');
  renderPage('clinic-round');
}

/* ============== 规培题库 ============== */
function renderClinicQuiz(root) {
  const week = getWeek(new Date());
  const items = DATA.clinicQuizzes;
  const weekItems = items.filter(q => q.week === week);
  const mastered = items.filter(q => q.mastered).length;

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <h2 style="font-size:18px;margin-bottom:4px">规培考试题库</h2>
        <p style="color:var(--text-sub);font-size:12px;margin:0">每周50道 · 妇产科规培内容 · 做完记得归纳知识点</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-mini" onclick="addQuiz()">+ 添加题目</button>
        <button class="btn-mini" onclick="genQuiz()">🎲 生成新题</button>
      </div>
    </div>

    <div class="grid-4" style="margin-bottom:16px">
      <div class="stat-card">
        <div class="stat-icon t-purple">📚</div>
        <div class="stat-label">总题数</div>
        <div class="stat-value">${items.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-pink">📅</div>
        <div class="stat-label">本周新题</div>
        <div class="stat-value">${weekItems.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-green">✅</div>
        <div class="stat-label">已掌握</div>
        <div class="stat-value">${mastered}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon t-orange">🎯</div>
        <div class="stat-label">掌握率</div>
        <div class="stat-value">${items.length ? Math.round(mastered / items.length * 100) : 0}%</div>
      </div>
    </div>

    <div id="qz-list"></div>
  `;

  const list = document.getElementById('qz-list');
  if (!items.length) list.innerHTML = '<div class="empty"><div class="emoji">📝</div>还没有题目,点击"生成新题"或"添加题目"</div>';
  else list.innerHTML = items.slice(0, 50).map((q, i) => quizItem(q, i)).join('');
}

function quizItem(q, i) {
  return `<div class="quiz-item" data-id="${q.id}">
    <div class="q">${i + 1}. ${q.q}</div>
    <div class="opts">
      ${q.opts.map((o, j) => `<div class="opt" data-idx="${j}" onclick="answerQuiz('${q.id}', ${j})">${String.fromCharCode(65 + j)}. ${o}</div>`).join('')}
    </div>
    <div class="explain" style="display:none">${q.exp}</div>
    ${q.knowledge ? `<div class="explain" style="display:none"><b>📌 知识点：</b>${q.knowledge}</div>` : ''}
    <div style="margin-top:8px;display:flex;gap:6px">
      ${q.mastered ? '<span class="tag tag-green">✓ 已掌握</span>' : `<button class="btn-mini" onclick="markQuiz('${q.id}')">标记掌握</button>`}
      <button class="btn-mini" onclick="delQuiz('${q.id}')">删除</button>
    </div>
  </div>`;
}

function answerQuiz(id, idx) {
  const q = DATA.clinicQuizzes.find(x => x.id === id);
  if (!q) return;
  const item = document.querySelector(`.quiz-item[data-id="${id}"]`);
  if (!item) return;
  const opts = item.querySelectorAll('.opt');
  opts.forEach((o, i) => {
    o.style.pointerEvents = 'none';
    if (i === q.ans) o.classList.add('correct');
    else if (i === idx) o.classList.add('wrong');
  });
  item.querySelectorAll('.explain').forEach(e => e.style.display = 'block');
}

function markQuiz(id) {
  const q = DATA.clinicQuizzes.find(x => x.id === id);
  if (q) { q.mastered = true; saveData(); renderPage('clinic-quiz'); }
}

function delQuiz(id) {
  DATA.clinicQuizzes = DATA.clinicQuizzes.filter(x => x.id !== id);
  saveData();
  renderPage('clinic-quiz');
}

function addQuiz() {
  openModal('添加题目', `
    <div class="form-group"><label>题目 *</label><textarea id="f-q" rows="2"></textarea></div>
    <div class="form-group"><label>选项(每行一个,4个)</label><textarea id="f-opts" rows="5" placeholder="选项A&#10;选项B&#10;选项C&#10;选项D"></textarea></div>
    <div class="form-group"><label>正确答案 (0-3)</label><input id="f-ans" type="number" min="0" max="3" value="0" /></div>
    <div class="form-group"><label>解析</label><textarea id="f-exp" rows="3"></textarea></div>
    <div class="form-group"><label>知识点归纳</label><textarea id="f-klg" rows="2"></textarea></div>
  `, () => {
    const obj = {
      id: genId(),
      q: document.getElementById('f-q').value.trim(),
      opts: document.getElementById('f-opts').value.split('\n').map(x => x.trim()).filter(Boolean),
      ans: parseInt(document.getElementById('f-ans').value) || 0,
      exp: document.getElementById('f-exp').value,
      knowledge: document.getElementById('f-klg').value,
      week: getWeek(new Date()),
      mastered: false
    };
    if (!obj.q || obj.opts.length < 2) { toast('请填写完整题目和至少2个选项'); return; }
    DATA.clinicQuizzes.unshift(obj);
    saveData();
    closeModal();
    renderPage('clinic-quiz');
  });
}

function genQuiz() {
  const pool = [
    { q: '关于子宫肌瘤,错误的是?', opts: ['是女性最常见的良性肿瘤', '肌壁间肌瘤最常见', '黏膜下肌瘤常引起月经过多', '肉瘤变常见于绝经后生长迅速的肌瘤'], ans: 3, exp: '子宫肌瘤肉瘤变罕见(<1%),不能仅凭生长迅速诊断肉瘤变,需病理证实。', knowledge: '子宫肌瘤/肉瘤变/良性肿瘤' },
    { q: '卵巢囊肿蒂扭转的典型症状是?', opts: ['持续性钝痛', '突发一侧下腹剧痛伴恶心呕吐', '阴道不规则出血', '发热'], ans: 1, exp: '蒂扭转典型表现为体位改变后突发一侧下腹剧痛,常伴恶心呕吐,需急诊手术。', knowledge: '卵巢囊肿/蒂扭转/急腹症' },
    { q: '妊娠期高血压疾病使用硫酸镁的首要目的是?', opts: ['降压', '利尿', '解痉/预防子痫', '镇静'], ans: 2, exp: '硫酸镁是子痫预防和治疗的一线药物,通过解痉起作用,而非降压。', knowledge: '妊高征/硫酸镁/子痫' },
    { q: '关于宫颈上皮内瘤变(CIN),正确的是?', opts: ['CIN III等同于原位癌', 'HPV感染一定会导致CIN', 'CIN I 60%可自然消退', 'CIN必须立即手术'], ans: 2, exp: 'CIN I自然消退率约60%,CIN II约40%,CIN III约33%,需密切随访。', knowledge: 'CIN/HPV/宫颈病变' },
    { q: '原发性痛经的主要机制是?', opts: ['子宫内膜异位', '子宫肌瘤', '前列腺素(PG)升高', '感染'], ans: 2, exp: '原发性痛经主要与子宫内膜前列腺素(PGF2α)升高导致子宫过强收缩有关。', knowledge: '痛经/前列腺素/原发性' },
    { q: '宫外孕最常见的着床部位是?', opts: ['卵巢', '宫颈', '输卵管壶腹部', '腹腔'], ans: 2, exp: '输卵管壶腹部是异位妊娠最常见部位,占约60%。', knowledge: '异位妊娠/输卵管' },
    { q: '葡萄胎最典型的超声表现是?', opts: ['宫腔内蜂窝状回声', '胎心搏动', '羊水过多', '胎盘增厚'], ans: 0, exp: '完全性葡萄胎典型表现为宫腔内弥漫性蜂窝状或落雪状回声,无胎心。', knowledge: '葡萄胎/滋养细胞疾病' },
    { q: '关于多囊卵巢综合征(PCOS),错误的是?', opts: ['是育龄期最常见的内分泌疾病', '典型表现月经稀发、高雄、卵巢多囊', 'LH/FSH比值常>2', '首选治疗是IVF-ET'], ans: 3, exp: 'PCOS首选治疗是生活方式调整+药物(达英35、二甲双胍、促排卵),不是IVF。', knowledge: 'PCOS/内分泌' },
    { q: '侵蚀性葡萄胎与绒毛膜癌最重要的区别是?', opts: ['hCG水平', '有无绒毛结构', '转移部位', '治疗效果'], ans: 1, exp: '侵蚀性葡萄胎病理可见绒毛结构,绒毛膜癌无线毛结构,这是本质区别。', knowledge: '滋养细胞肿瘤/侵蚀性葡萄胎/绒癌' },
    { q: '关于滴虫性阴道炎,正确的是?', opts: ['白带呈豆腐渣样', 'pH<4.5', '显微镜下可见鞭毛', '首选甲硝唑2g顿服'], ans: 2, exp: '滴虫为有鞭毛的原虫,pH>4.5,白带黄绿色泡沫状,治疗首选甲硝唑或替硝唑。', knowledge: '阴道炎/滴虫' }
  ];
  // 随机选3题
  const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  shuffled.forEach(qz => {
    DATA.clinicQuizzes.unshift({ id: genId(), week: getWeek(new Date()), mastered: false, ...qz });
  });
  saveData();
  toast('🎲 已生成3道新题');
  renderPage('clinic-quiz');
}

/* ============== 健身打卡 ============== */
function renderFitness(root) {
  const today = new Date();
  const stats = calcMonthStats(DATA.fitness.history, today.getFullYear(), today.getMonth());
  const streak = calcStreak(DATA.fitness.history);

  // 计算本周打卡
  const weekDates = [];
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(fmtDate(d));
  }
  const weekCount = weekDates.filter(d => DATA.fitness.history[d]).length;

  // 近8周柱状图
  const labels = [], data = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - i * 7);
    const weekDates2 = [];
    for (let j = 0; j < 7; j++) {
      const d = new Date(start);
      d.setDate(start.getDate() + j);
      weekDates2.push(fmtDate(d));
    }
    const cnt = weekDates2.filter(d => DATA.fitness.history[d]).length;
    labels.push(`${i === 0 ? '本周' : i + '周前'}`);
    data.push(cnt);
  }

  root.innerHTML = `
    <div style="margin-bottom:16px">
      <h2 style="font-size:18px;margin-bottom:4px">每周健身打卡</h2>
      <p style="color:var(--text-sub);font-size:12px;margin:0">每周目标 ${DATA.fitness.target} 次 · 好身体是科研的本钱</p>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title"><span class="icon t-green">📅</span>健身打卡日历</div>
        <div id="ft-cal"></div>
        <div style="margin-top:14px">
          <button class="btn-primary" id="ft-check" style="width:100%;padding:10px;background:var(--green)">💪 今日完成健身(打卡)</button>
        </div>
        <div style="margin-top:10px;background:var(--green-soft);padding:10px;border-radius:8px;font-size:12px">
          💡 健身方式：跑步 / 撸铁 / 瑜伽 / 游泳 / HIIT / 普拉提 任选,记一次即可
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="icon t-orange">📊</span>健身统计</div>
        <div class="grid-2" style="gap:10px;margin-bottom:16px">
          <div class="stat-card" style="padding:14px">
            <div class="stat-label">本周已练</div>
            <div class="stat-value" style="font-size:24px;color:var(--green)">${weekCount} <span style="font-size:13px;font-weight:400;color:var(--text-sub)">/${DATA.fitness.target} 次</span></div>
          </div>
          <div class="stat-card" style="padding:14px">
            <div class="stat-label">连续打卡</div>
            <div class="stat-value" style="font-size:24px;color:var(--orange)">${streak} <span style="font-size:13px;font-weight:400;color:var(--text-sub)">天</span></div>
          </div>
          <div class="stat-card" style="padding:14px">
            <div class="stat-label">本月次数</div>
            <div class="stat-value" style="font-size:24px">${stats.count}</div>
          </div>
          <div class="stat-card" style="padding:14px">
            <div class="stat-label">本月达成</div>
            <div class="stat-value" style="font-size:24px;color:var(--green)">${Math.min(100, Math.round(stats.count / 8 * 100))}%</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-sub);margin-bottom:6px">近8周打卡</div>
        <div id="ft-bar"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><span class="icon t-green">🎯</span>健身目标设定</div>
      <div style="display:flex;gap:10px;align-items:center">
        <span style="font-size:13px">每周目标次数：</span>
        <input type="number" id="ft-target" min="1" max="14" value="${DATA.fitness.target}" style="width:80px" />
        <button class="btn-mini" onclick="updateFitTarget()">保存目标</button>
      </div>
    </div>
  `;

  renderCalendar(document.getElementById('ft-cal'), DATA.fitness.history, {
    onClick: (d) => {
      DATA.fitness.history[d] = DATA.fitness.history[d] ? 0 : 1;
      if (!DATA.fitness.history[d]) delete DATA.fitness.history[d];
      saveData();
      renderPage('fitness');
    }
  });
  document.getElementById('ft-check').onclick = () => {
    DATA.fitness.history[todayStr()] = 1;
    saveData();
    toast('💪 健身打卡成功!加油!');
    renderPage('fitness');
  };
  renderBarChart(document.getElementById('ft-bar'), data, { unit: '次', labels });
}

function updateFitTarget() {
  const v = parseInt(document.getElementById('ft-target').value);
  if (v > 0 && v < 15) { DATA.fitness.target = v; saveData(); toast('目标已更新'); }
}

/* ============== 体重管理 ============== */
function renderWeight(root) {
  const today = new Date();
  const stats = calcMonthStats(DATA.weight.fastingLog, today.getFullYear(), today.getMonth());
  const streak = calcStreak(DATA.weight.fastingLog);

  // 推荐的3个晚上：周日、周二、周四
  const recDays = ['周日', '周二', '周四'];

  // 本周
  const weekDates = [];
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push({ date: fmtDate(d), day: i, label: '一二三四五六日'[i] + (i === 0 ? '(周一)' : '') });
  }
  const weekCount = weekDates.filter(d => DATA.weight.fastingLog[d.date]).length;

  // 近8周
  const labels = [], data = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - i * 7);
    const weekDates2 = [];
    for (let j = 0; j < 7; j++) {
      const d = new Date(start);
      d.setDate(start.getDate() + j);
      weekDates2.push(fmtDate(d));
    }
    const cnt = weekDates2.filter(d => DATA.weight.fastingLog[d]).length;
    labels.push(i === 0 ? '本周' : i + '周前');
    data.push(cnt);
  }

  root.innerHTML = `
    <div style="margin-bottom:16px">
      <h2 style="font-size:18px;margin-bottom:4px">体重管理计划</h2>
      <p style="color:var(--text-sub);font-size:12px;margin:0">每周 ${DATA.weight.target} 个晚上空腹（推荐${recDays.join('、')}）· 管住嘴,迈开腿</p>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-title"><span class="icon t-pink">🌙</span>空腹打卡日历</div>
        <div id="wt-cal"></div>
        <div style="margin-top:14px">
          <button class="btn-primary" id="wt-check" style="width:100%;padding:10px;background:var(--pink)">🌙 今晚已空腹(打卡)</button>
        </div>
        <div style="margin-top:10px;background:var(--pink-soft);padding:10px;border-radius:8px;font-size:12px">
          💡 空腹晚餐 ≈ 16:8 间歇性禁食：晚餐提前到18点前,之后只喝水/无糖茶
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="icon t-orange">📊</span>体重管理统计</div>
        <div class="grid-2" style="gap:10px;margin-bottom:16px">
          <div class="stat-card" style="padding:14px">
            <div class="stat-label">本周已空腹</div>
            <div class="stat-value" style="font-size:24px;color:var(--pink)">${weekCount} <span style="font-size:13px;font-weight:400;color:var(--text-sub)">/${DATA.weight.target} 晚</span></div>
          </div>
          <div class="stat-card" style="padding:14px">
            <div class="stat-label">连续打卡</div>
            <div class="stat-value" style="font-size:24px;color:var(--orange)">${streak} <span style="font-size:13px;font-weight:400;color:var(--text-sub)">天</span></div>
          </div>
          <div class="stat-card" style="padding:14px">
            <div class="stat-label">本月空腹</div>
            <div class="stat-value" style="font-size:24px">${stats.count} 晚</div>
          </div>
          <div class="stat-card" style="padding:14px">
            <div class="stat-label">本月达成</div>
            <div class="stat-value" style="font-size:24px;color:var(--green)">${Math.min(100, Math.round(stats.count / 12 * 100))}%</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-sub);margin-bottom:6px">近8周空腹次数</div>
        <div id="wt-bar"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><span class="icon t-pink">⚖️</span>每周目标</div>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px">
        <span style="font-size:13px">每周空腹晚数：</span>
        <input type="number" id="wt-target" min="1" max="7" value="${DATA.weight.target}" style="width:80px" />
        <button class="btn-mini" onclick="updateWeightTarget()">保存</button>
      </div>
      <div style="font-size:12px;color:var(--text-sub);margin-bottom:8px">📌 本周推荐空腹日</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${weekDates.map(w => {
          const isRec = [0, 2, 4].includes(w.day); // 周一/三/五 (从0开始)
          const done = DATA.weight.fastingLog[w.date];
          return `<div class="tag ${done ? 'tag-green' : isRec ? 'tag-pink' : ''}" style="padding:6px 12px">${w.label} ${done ? '✓' : ''}</div>`;
        }).join('')}
      </div>
    </div>
  `;

  renderCalendar(document.getElementById('wt-cal'), DATA.weight.fastingLog, {
    onClick: (d) => {
      DATA.weight.fastingLog[d] = DATA.weight.fastingLog[d] ? 0 : 1;
      if (!DATA.weight.fastingLog[d]) delete DATA.weight.fastingLog[d];
      saveData();
      renderPage('weight');
    }
  });
  document.getElementById('wt-check').onclick = () => {
    DATA.weight.fastingLog[todayStr()] = 1;
    saveData();
    toast('🌙 空腹打卡成功!');
    renderPage('weight');
  };
  renderBarChart(document.getElementById('wt-bar'), data, { unit: '晚', labels });
}

function updateWeightTarget() {
  const v = parseInt(document.getElementById('wt-target').value);
  if (v > 0 && v < 8) { DATA.weight.target = v; saveData(); toast('目标已更新'); }
}
