/* ============================================================
   打败懒惰科研工作台 - 核心逻辑
   ============================================================ */

/* ============== 数据层 ============== */
const STORAGE_KEY = 'defeat_lazy_workbench_v1';

const DEFAULT_DATA = {
  meta: { created: Date.now(), version: '2.0', dataVersion: 2 },
  // 全局设置
  settings: {
    keywords: [
      { text: '衰老', priority: 1, active: true },
      { text: '骨骼肌', priority: 1, active: true },
      { text: '肌肉再生', priority: 1, active: true },
      { text: '脂肪', priority: 2, active: true },
      { text: '脂滴', priority: 1, active: true },
      { text: '线粒体', priority: 1, active: true },
      { text: 'mtDNA', priority: 2, active: true },
      { text: 'cGAS-STING', priority: 2, active: true },
      { text: 'NRF2/氧化应激', priority: 2, active: true },
      { text: '机械力', priority: 1, active: true },
      { text: '雌激素', priority: 1, active: true },
      { text: '时钟基因', priority: 1, active: true },
      { text: '昼夜节律', priority: 1, active: true },
      { text: '子宫内膜异位症', priority: 1, active: true },
      { text: '子宫腺肌症', priority: 1, active: true },
      { text: '临床转化', priority: 2, active: true },
      { text: '多模态疾病监测', priority: 3, active: true }
    ],
    goals: {
      weeklyPaper: 1, dailyPaper: 10, guideline: 1, case: 1,
      quiz: 50, fitness: 2, weightFast: 3, words: 5
    },
    profile: {
      name: '', title: '妇科博士后 · 主治医师',
      research: '盆底功能障碍性疾病发病机制基础研究'
    },
    apiConnections: {
      wechat: { connected: false, keyLast4: '', lastSync: '', error: '' },
      pubmed: { connected: false, lastSync: '' }
    }
  },
  // 全局任务
  tasks: [],            // {id, title, type:'must'|'optional', page, entityId, done, dueDate, priority, createdAt}
  // 收件箱
  inbox: [],            // {id, title, type:'link'|'idea'|'guide'|'paper', content, link, createdAt, processed}
  // 统一日历事件(自动生成)
  // 统一打卡引擎 — 目标历史快照
  checkinGoals: [],     // {id, taskKey, target, effectiveFrom, effectiveUntil}
  weeklyPapers: [],
  dailyPapers: [],
  researchProjects: [],
  paperWritings: [],
  paperSubmits: [],
  library: [],
  clinicGuidelines: [],
  clinicSkills: [],
  clinicCases: [],
  clinicDuties: [],
  clinicWords: [],
  clinicRounds: [],
  clinicQuizzes: [],
  fitness: { records: [], target: 2, history: {} },
  weight: { records: [], fastingLog: {}, target: 3, weightHistory: [], dietLog: {} },
  checkin: {
    'weekly-paper': { history: {}, target: 1, period: 'weekly' },
    'daily-paper': { history: {}, target: 10, period: 'daily' },
    'fitness': { history: {}, target: 2, period: 'weekly' },
    'weight-fast': { history: {}, target: 3, period: 'weekly' },
    'guideline': { history: {}, target: 1, period: 'weekly' },
    'clinic-skill': { history: {}, target: 1, period: 'weekly' },
    'clinic-case': { history: {}, target: 1, period: 'weekly' },
    'words': { history: {}, target: 5, period: 'daily' },
    'quiz': { history: {}, target: 50, period: 'weekly' }
  }
};

let DATA = loadData();

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      seedData();
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    const parsed = JSON.parse(raw);
    const merged = deepMerge(JSON.parse(JSON.stringify(DEFAULT_DATA)), parsed);
    // 迁移旧数据
    migrateData(merged);
    return merged;
  } catch (e) {
    console.error('数据加载失败', e);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function deepMerge(target, source) {
  if (Array.isArray(target) || Array.isArray(source)) return source !== undefined ? source : target;
  if (typeof target === 'object' && target !== null && typeof source === 'object' && source !== null) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
  return source !== undefined ? source : target;
}

function migrateData(data) {
  // v1 -> v2: 添加缺失的字段
  if (!data.settings) data.settings = JSON.parse(JSON.stringify(DEFAULT_DATA.settings));
  if (!data.tasks) data.tasks = [];
  if (!data.inbox) data.inbox = [];
  if (!data.checkinGoals) data.checkinGoals = [];
  // 确保checkin有所有key
  if (!data.checkin) data.checkin = {};
  Object.keys(DEFAULT_DATA.checkin).forEach(k => {
    if (!data.checkin[k]) data.checkin[k] = { history: {}, ...DEFAULT_DATA.checkin[k] };
  });
  // 确保weight有dietLog
  if (data.weight && !data.weight.dietLog) data.weight.dietLog = {};
  // 标记示例数据
  const demoCollections = ['weeklyPapers','dailyPapers','researchProjects','paperWritings','paperSubmits','library','clinicGuidelines','clinicSkills','clinicCases','clinicDuties','clinicWords','clinicRounds','clinicQuizzes'];
  demoCollections.forEach(c => {
    if (data[c]) data[c].forEach(item => { if (item.is_demo === undefined) item.is_demo = false; });
  });
  // 更新meta版本
  if (!data.meta) data.meta = { created: Date.now(), version: '2.0', dataVersion: 2 };
  data.meta.dataVersion = 2;
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  } catch (e) {
    console.error('保存失败', e);
  }
  // 云端同步钩子：防抖推送
  if (typeof cloudSaveHook === 'function') cloudSaveHook();
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function getWeek(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const onejan = new Date(year, 0, 1);
  return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
}
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function cnDate(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;
}

/* ============== 初始示例数据 —— 盆腔生物力学·代谢·衰老 方向 ============== */
function seedData() {
  const keywords = ['衰老', '肌肉', '脂肪', '脂滴', '线粒体', '内异症', '临床转化', '机械力', '雌激素', '腺肌症', '肌肉再生', '时钟基因', '昼夜节律'];

  // ===== 1. 科研项目 — 3个真实课题方向 =====
  DATA.researchProjects.push(
    {
      id: genId(), name: '机械力—线粒体—衰老轴在盆底功能障碍发病中的分子机制（国自然面上项目）',
      status: '进行中', deadline: '2028-12-31', progress: 30,
      plan: '科学假说：盆底持续机械应力 → 激活Piezo1通道 → 钙超载 → 线粒体ROS↑/ΔΨm↓ → 成纤维细胞衰老(SASP) → ECM降解失衡 → POP发生\n\n实验设计(4个层次)：\n1. 临床队列(100例POP vs 50例对照)：收集盆底筋膜组织、单细胞测序(scRNA-seq)鉴定纤维细胞亚群衰老特征\n2. 体外机械牵张模型(Flexcell FX-6000T)：不同牵张参数(5%/10%/15%)对原代盆底成纤维细胞的衰老诱导\n3. Piezo1条件性敲除小鼠(FSP1-Cre)：通过阴道扩张+尾部悬吊模拟PFD，评估线粒体功能和衰老表型\n4. 干预策略：线粒体靶向抗氧化剂MitoQ + Piezo1抑制剂GsMTx4的体内外效果验证',
      notes: '✅ 伦理批件已获/样本已收集60例/单细胞测序第一批数据已出（成纤维细胞亚群6个）/Flexcell模型参数已确定',
      createdAt: Date.now() - 86400000 * 240
    },
    {
      id: genId(), name: '雌激素缺乏通过时钟基因BMAL1调控盆底肌卫星细胞衰老与再生障碍的机制（博后课题）',
      status: '进行中', deadline: '2027-06-30', progress: 55,
      plan: '假说：雌激素(E2)↓ → ERα-BMAL1转录调控轴失调 → 肌肉卫星细胞(MuSC)时钟节律紊乱 → 自噬流受阻/蛋白稳态失衡 → MuSC过早衰老 → 盆底肌再生障碍 → PFD\n\n设计：\n1. OVX大鼠模型：分别于去势后1/3/6月收集肛提肌，检测BMAL1节律和MuSC数量\n2. MuSC体外培养：E2剥夺 + 地塞米松同步化 → 检测时钟基因节律振幅\n3. 机制验证：ChIP-seq(ERα/BMAL1在MyoD启动子结合) + 双荧光素酶\n4. 功能回补：E2贴片 + AAV-BMAL1过表达对OVX大鼠盆底肌再生的影响',
      notes: 'OVX大鼠已建模完成/Western blot重复中/MuSC流式分选效率待提高',
      createdAt: Date.now() - 86400000 * 180
    },
    {
      id: genId(), name: '脂滴—铁死亡交互在子宫腺肌症肌层纤维化中的机制及临床转化探索',
      status: '筹备中', deadline: '2027-12-31', progress: 10,
      plan: '切入点：腺肌症异位内膜间质细胞存在异常脂滴积累 → 脂毒性 → 铁死亡 → 肌层纤维化\n\n技术路线：\n1. 临床样本：腺肌症全子宫标本(30例) vs 肌瘤(20例)，Oil Red O + Perls染色定位脂滴和铁沉积\n2. 脂质组学+氧化脂质组学：脂滴膜磷脂组成与脂质过氧化产物(4-HNE/MDA)\n3. 机制：ACSL4/LPCAT3在腺肌症组织中的表达 → 脂滴膜PUFA-PL积累 → 铁死亡易感性增加\n4. 治疗靶点验证：Fer-1/Liproxstatin-1在腺肌症小鼠模型中抗纤维化效果',
      notes: '伦理申请中/预实验已完成 Oil Red O 和 Perls 染色条件摸索',
      createdAt: Date.now() - 86400000 * 30
    }
  );

  // ===== 2. 论文撰写方面 =====
  DATA.paperWritings.push(
    {
      id: genId(),
      title: 'Mechanical Force-Activated Piezo1 Drives Pelvic Fibroblast Senescence via Mitochondrial Oxidative Stress in Pelvic Organ Prolapse',
      targetJournal: 'Nature Aging', status: '撰写中', progress: 65,
      sections: [
        { name: 'Introduction', done: true },
        { name: 'Methods', done: true },
        { name: 'Results - scRNA-seq', done: true },
        { name: 'Results - Flexcell & Piezo1', done: false },
        { name: 'Results - mitochondria & ROS', done: false },
        { name: 'Results - mouse model', done: false },
        { name: 'Discussion', done: false }
      ],
      deadline: '2027-01-15', notes: '补Figure 5 免疫荧光（TOM20/LC3共定位）和 Figure 6 小鼠组织Masson染色',
      createdAt: Date.now() - 86400000 * 40
    },
    {
      id: genId(),
      title: 'Estrogen Deficiency Disrupts Circadian Clock BMAL1 in Pelvic Muscle Stem Cells and Accelerates Sarcopenia in Pelvic Floor',
      targetJournal: 'Cell Reports', status: '数据补充', progress: 40,
      sections: [
        { name: 'Introduction', done: true },
        { name: 'Methods', done: true },
        { name: 'Results - OVX rat', done: false },
        { name: 'Results - MuSC clock', done: false },
        { name: 'Results - ChIP & rescue', done: false },
        { name: 'Discussion', done: false }
      ],
      deadline: '2027-04-30',
      notes: '等待qPCR批量重复/ChIP-seq送样准备中/E2贴片治疗组需补1批大鼠',
      createdAt: Date.now() - 86400000 * 25
    },
    {
      id: genId(),
      title: 'Lipid Droplet Accumulation Sensitizes Ectopic Endometrial Stromal Cells to Ferroptosis in Adenomyosis-Associated Fibrosis',
      targetJournal: 'Cell Death & Differentiation', status: '构思中', progress: 15,
      sections: [
        { name: 'Introduction', done: true },
        { name: 'Methods', done: false },
        { name: 'Results', done: false },
        { name: 'Discussion', done: false }
      ],
      deadline: '2027-09-30',
      notes: '已完成预实验数据整理/待确定合作方做脂质组学',
      createdAt: Date.now() - 86400000 * 15
    }
  );

  // ===== 3. 论文投稿方面 =====
  DATA.paperSubmits.push(
    {
      id: genId(),
      title: 'Adipose-Derived Stem Cell Exosomes Ameliorate Pelvic Floor Muscle Regeneration via miR-21 Mediated PI3K/Akt Pathway in a Rat Model of Simulated Birth Injury',
      journal: 'Stem Cell Research & Therapy', if: 7.5, casZone: '医学2区', status: 'Under Review',
      submittedAt: '2026-06-20',
      decisions: [
        { date: '2026-06-20', result: 'Submitted', note: '投出' },
        { date: '2026-07-08', result: 'Under Review', note: '编辑送审/已邀请3位审稿人' }
      ], publishedAt: ''
    },
    {
      id: genId(),
      title: 'Circadian Disruption Accelerates Endometriosis Progression via PER2-Mediated Epithelial-Mesenchymal Transition in Eutopic Endometrium',
      journal: 'Molecular Therapy', if: 12.4, casZone: '医学1区', status: 'Major Revision',
      submittedAt: '2026-04-10',
      decisions: [
        { date: '2026-04-10', result: 'Submitted', note: '投出' },
        { date: '2026-05-28', result: 'Major Revision', note: '审稿人#2要求补充EMT体内功能验证(PER2 KO小鼠异种移植模型)' },
        { date: '2026-07-20', result: 'Major Revision', note: '修回中/预计8月底提交revised version' }
      ], publishedAt: ''
    }
  );

  // ===== 4. 文献库 — 真实PubMed文献，按研究方向分类 =====
  const libData = [
    // 盆底功能障碍·线粒体
    { cat: '盆底功能障碍·线粒体', title: 'SIRT1 Alleviates Oxidative Stress-Induced Mitochondrial Dysfunction and Mitochondria-Associated Membrane Dysregulation in Stress Urinary Incontinence', journal: 'Cell Prolif', year: 2025, pmid: '39980436' },
    { cat: '盆底功能障碍·线粒体', title: '线粒体损伤在盆腔器官脱垂中的研究进展（综述）', journal: '医学研究杂志', year: 2025, pmid: '' },
    // 盆底功能障碍·衰老
    { cat: '盆底功能障碍·衰老', title: 'Cellular senescence: A pathogenic mechanism of pelvic organ prolapse (Review)', journal: 'Mol Med Rep', year: 2020, pmid: '' },
    { cat: '盆底功能障碍·衰老', title: 'The Anti-Senescence Effect and Mechanism of 17β-Estradiol on Pelvic Organ Prolapse Derived Fibroblasts', journal: 'Biochem Cell Biol', year: 2025, pmid: '' },
    // 盆底功能障碍·雌激素
    { cat: '盆底功能障碍·雌激素', title: 'Estrogen inhibits the differentiation of fibroblasts induced by high stiffness matrix by enhancing DNMT1 expression', journal: 'Acta Obstet Gynecol Scand', year: 2023, pmid: '' },
    { cat: '盆底功能障碍·雌激素', title: '17β-estradiol facilitates the proliferation, migration, and collagen production in uterosacral ligament fibroblasts from POP patients by activating HOXA13/TIMP1 axis', journal: 'J Mol Histol', year: 2025, pmid: '' },
    // 盆底功能障碍·临床转化
    { cat: '盆底功能障碍·临床转化', title: 'Recombinant Humanized Collagen: A Promising Treatment for Pelvic Organ Prolapse via Enhanced Fibroblast Function and Angiogenesis', journal: 'Int Urogynecol J', year: 2025, pmid: '40116904' },
    { cat: '盆底功能障碍·临床转化', title: 'Genetics of Female Pelvic Organ Prolapse: Up to Date', journal: 'Biomolecules', year: 2024, pmid: '' },
    // 机械力·Piezo1
    { cat: '机械力·Piezo1', title: 'Mechanical stretch-mediated fibroblast activation: The pivotal role of Piezo1 channels', journal: 'BBA Mol Cell Res', year: 2025, pmid: '40517844' },
    { cat: '机械力·Piezo1', title: 'Mechanical stiffness promotes skin fibrosis via Piezo1-Wnt2/Wnt11-CCL24 positive feedback loop', journal: 'Cell Death Dis', year: 2024, pmid: '38267432' },
    // 子宫腺肌症·铁死亡
    { cat: '子宫腺肌症·铁死亡', title: 'METTL3-mediated m6A modification promotes ferroptosis in adenomyosis through GPX4 in a YTHDF1-dependent manner', journal: 'Reproduction', year: 2025, pmid: '40911580' },
    { cat: '子宫腺肌症·铁死亡', title: 'Tongmai Huazheng mixture attenuates adenomyosis by inducing ferroptosis through suppression of the JAK2/STAT3 signaling pathway', journal: 'Phytomedicine', year: 2025, pmid: '41477983' },
    // 子宫腺肌症·脂质代谢
    { cat: '子宫腺肌症·脂质代谢', title: 'Metabolic changes in myometrium associated with adenomyosis revealed by LC-MS/MS-based high-throughput targeted lipid quantification', journal: 'RBMO', year: 2025, pmid: '40472664' },
    // 雌激素·肌肉再生
    { cat: '雌激素·肌肉再生', title: 'Estradiol deficiency as a consequence of aging contributes to the depletion of the satellite cell pool in female mice', journal: 'Aging Cell', year: 2025, pmid: '' },
    { cat: '雌激素·肌肉再生', title: 'Estrogen Regulates the Satellite Cell Compartment in Females', journal: 'Cell Rep', year: 2019, pmid: '' },
    // 脂滴·铁死亡
    { cat: '脂滴·铁死亡', title: 'FSP1-mediated lipid droplet quality control prevents neutral lipid peroxidation and ferroptosis', journal: 'Nat Cell Biol', year: 2025, pmid: '41162632' },
    // 时钟基因·昼夜节律
    { cat: '时钟基因·昼夜节律', title: 'Alterations in clock genes expression in eutopic and ectopic endometrial tissue', journal: 'Endocrine Abstracts', year: 2021, pmid: '' },
    // 衰老·NAD+
    { cat: '衰老·NAD+', title: 'Placental nicotinamide adenine dinucleotide modulates the timing of labor', journal: 'Science', year: 2026, pmid: '42275500' }
  ];
  libData.forEach(l => {
    DATA.library.push({
      id: genId(), title: l.title, journal: l.journal, year: l.year,
      tags: [l.cat],
      category: l.cat,
      link: l.pmid ? 'https://pubmed.ncbi.nlm.nih.gov/' + l.pmid + '/' : 'https://pubmed.ncbi.nlm.nih.gov/?term=' + encodeURIComponent(l.title.split(' ').slice(0, 5).join('+')),
      addedAt: Date.now() - Math.floor(Math.random() * 120) * 86400000
    });
  });

  // ===== 5. 临床指南方面 =====
  DATA.clinicGuidelines.push(
    {
      id: genId(), week: getWeek(Date.now()), date: fmtDate(Date.now()),
      title: '盆腔器官脱垂的中国诊治指南（2024年修订版）',
      source: '中华妇产科杂志', year: 2024,
      summary: '系统更新了POP诊断分度(POP-Q标准化)、保守治疗（盆底肌训练/子宫托适应证）、手术方案选择。新增：网片手术的严格适应证与知情同意规范、骶骨固定术标准化流程、保留子宫的曼氏手术长期随访数据。',
      keyPoints: ['POP-Q分度为金标准', '盆底肌训练为所有POP患者的一线保守治疗', '骶骨固定术为顶端脱垂手术金标准', '网片适用范围严格限于复发或高危患者', '术后需长期随访/生活质量评估'],
      important: true
    },
    {
      id: genId(), week: getWeek(Date.now()) - 2, date: fmtDate(Date.now() - 86400000 * 14),
      title: '子宫内膜异位症疼痛管理指南（2025版，中国医师协会）',
      source: '中华妇产科杂志', year: 2025,
      summary: '针对内异症相关疼痛的多维度管理：药物阶梯治疗(NSAIDs→激素→GnRH-a)、手术时机选择(囊肿>4cm或药物无效)、术后长期管理策略(复发预防)。强调：盆腔痛≠内异症,需排除间质性膀胱炎/盆底肌筋膜疼痛。',
      keyPoints: ['慢性盆腔痛的鉴别诊断框架', 'GnRH-a疗程≤6个月(需反向添加)', 'DIE深部浸润型内异症手术需多学科团队', '术后GnRH-a+曼月乐联合减少复发', '重视中枢敏化机制(疼痛与病灶不一定平行)'],
      important: true
    },
    {
      id: genId(), week: getWeek(Date.now()) - 4, date: fmtDate(Date.now() - 86400000 * 28),
      title: '围绝经期综合征管理中国专家共识（2025年版）',
      source: '中华妇产科杂志', year: 2025,
      summary: '重新定义围绝经期综合征评估体系,更新MHT(绝经激素治疗)的适应证与禁忌证。重点：MHT"窗口期"理论(60岁以下/绝经10年内)、乳腺癌风险评估模型、非激素替代方案的选择。',
      keyPoints: ['MHT的时机窗口：<60岁且绝经<10年获益最大', '乳腺癌风险需个体化评估', '阴道雌激素不增加全身风险', '植物雌激素/黑升麻提取物证据有限', '心血管保护作用证据更新'],
      important: false
    }
  );

  // ===== 6. 临床操作方面 =====
  DATA.clinicSkills.push(
    {
      id: genId(), week: getWeek(Date.now()), name: '腹腔镜下全子宫切除术(TLH)',
      category: '手术',
      steps: ['体位：膀胱截石位+头低脚高30°', 'Trocar布局：四孔法(脐部10mm镜头、左右下腹5mm、耻骨上5mm)', '举宫器操作：充分暴露操作平面', '处理圆韧带、卵巢固有韧带及输卵管峡部(双极电凝+超声刀)', '打开阔韧带前后叶/下推膀胱至宫颈外口下2cm', '骨骼化子宫血管上行支(双极电凝+剪刀切断)', '处理主骶韧带(紧贴宫颈操作/避免输尿管损伤)', '沿阴道穹隆环形切开/经阴道/经腹腔取出子宫', '缝合阴道残端(2-0可吸收线连续锁边缝合)', '检查各残端无出血/盆底腹膜化或不化'],
      count: 28, lastDate: fmtDate(Date.now()), notes: '核心安全要点:①输尿管全程可见(跨髂血管处确认后不再触碰该区域)②紧贴宫颈处理子宫血管③大子宫(>12周)需先处理双侧子宫动脉上行支以减少出血'
    },
    {
      id: genId(), week: getWeek(Date.now()) - 1, name: '宫腔镜下子宫内膜息肉电切术(TCRP)',
      category: '手术',
      steps: ['术前准备：月经干净3-7天/排除妊娠和感染', '扩宫至Hegar 10号(根据电切镜外鞘直径)', '膨宫液：生理盐水(双极)/5%甘露醇(单极)注意出入量差', '宫腔镜检查：观察息肉位置/大小/数目/蒂部宽度', '环状电极切除息肉(从顶端向基底部/切至内膜下肌层)', '检查切除创面：电凝止血/平整无残留', '标本送病理(子宫内膜息肉恶变率<1%但必须排除)', '术后注意事项：禁性生活及盆浴2周/酌情抗感染/关注病理结果'],
      count: 45, lastDate: fmtDate(Date.now() - 3), notes: '注意:绝经后息肉无论大小均建议切除送检/多发息肉可同时诊刮排除内膜病变'
    },
    {
      id: genId(), week: getWeek(Date.now()) - 2, name: '阴道镜检查+宫颈活检',
      category: '检查',
      steps: ['适应证确认：细胞学≥ASC-US/HPV16/18阳性/裸眼可疑', '生理盐水棉球擦拭宫颈/观察血管形态(绿光)', '3-5%醋酸试验：观察醋白上皮出现时间、厚度、边界', '卢戈碘试验(Schiller test)：不着色区为可疑病变区', '定位活检：选择醋白最厚区域/碘不着色区/异常血管区', '活检深度：含足够间质约3-4mm/钳取后压迫止血', 'ECC(宫颈管搔刮)：≥40岁或细胞学异常而阴道镜不满意时', '标本标注位置和序号/福尔马林固定', '填写阴道镜报告(附RCI评分/Swede评分)'],
      count: 120, lastDate: fmtDate(Date.now() - 1), notes: '关键点:①不满意的阴道镜(SCJ不可见)必须ECC②妊娠期仅活检不刮颈管③活检后24h避免重体力活动'
    }
  );

  // ===== 7. 临床病例方面 =====
  DATA.clinicCases.push(
    {
      id: genId(), week: getWeek(Date.now()), patient: '女，52岁，G3P2，绝经2年',
      complaint: '阴道块状物脱出伴下坠感2年余，加重半年',
      history: '2年前自觉阴道口有块状物脱出,初可自行回纳。近半年脱出物增大,站立或劳累后明显,需手推回纳,伴下腹坠胀和排尿不尽感。既往:顺产2次(新生儿体重分别为3800g/4000g),长期从事站立工作(超市收银员)。',
      exam: '妇检：嘱患者屏气用力,POP-Q分度——Aa +2, Ba +3, C -1, gh 5, pb 2, tvl 8, Ap -1, Bp -1。诊断:子宫脱垂Ⅲ度(顶端脱垂)+阴道前壁膨出Ⅲ度。压力试验(+),指压试验阳性(提示合并隐匿性SUI)。',
      diagnosis: '1.盆腔器官脱垂(子宫脱垂Ⅲ度+阴道前壁膨出Ⅲ度)\n2.隐匿性压力性尿失禁',
      plan: '方案讨论:1.盆底肌训练+子宫托(患者暂不愿手术先保守)→效果不佳转为手术\n2.手术方案:阴式全子宫切除术+阴道前后壁修补术→或→保留子宫的骶棘韧带固定术(SSLF)+阴道前壁修补术\n3.术式选择依据:①患者52岁无生育要求/可行子宫切除②若保留子宫适合顶端悬吊+自身组织修补③隐匿性SUI需术中同期行TVT-O',
      summary: '围绕POP手术决策中的两个核心问题——①切不切子宫(患者年龄/意愿/复发风险)②是否同期行抗SUI手术(术前漏尿症状/指压试验/尿动力学)。此外应重视POP复发的风险因素(年轻患者/重度脱垂/既往手术史)并做好长期随访。',
      date: fmtDate(Date.now())
    },
    {
      id: genId(), week: getWeek(Date.now()) - 1, patient: '女，35岁，G0，备孕2年未孕',
      complaint: '进行性痛经10年余，近2年加重伴性交痛',
      history: '初潮13岁,周期28-30天。13岁起即有痛经,近10年逐渐加重。月经第1-2天剧烈腹痛(VAS 8-9/10),需口服布洛芬。近2年出现深部性交痛,排便痛(经期明显)。备孕2年未孕,曾在外院HSG示双侧输卵管通畅。丈夫精液检查正常。',
      exam: '妇检：子宫后位固定,骶韧带可及触痛结节(双侧),直肠阴道隔可及质硬结节。阴道超声：右卵巢内膜样囊肿(4.5cm×3.8cm,毛玻璃样回声),左卵巢正常。CA125: 65U/mL(↑)。MRI：双侧骶韧带增厚伴DIE,直肠前壁可疑侵犯。',
      diagnosis: '深部浸润型子宫内膜异位症(DIE)Ⅳ期\n1.卵巢子宫内膜异位囊肿(右侧)\n2.深部DIE(骶韧带+直肠阴道隔)\n3.继发性不孕',
      plan: '多学科团队(MDT)讨论方案：\n1.首选腹腔镜手术(诊断+治疗) 术中r-ASRM分期+EFI评分\n2.手术范围：囊肿剥除(保护卵巢皮质)+DIE病灶切除术(骶韧带/直肠阴道隔)+输卵管通液\n3.术前谈话要点：①DIE手术风险(直肠/输尿管/膀胱损伤,需胃肠外科/泌尿外科备台)②术后卵巢储备功能下降风险(AMH/FSH随访)③术后复发率(5年复发率约30-40%)\n4.术后辅助：GnRH-a × 3-6个月→积极试孕→6个月未孕转IVF',
      summary: '35岁DIE合并不孕是高难度决策场景。核心矛盾:手术 vs 直接IVF。关键判断因素:①囊肿大小(>4cm需要手术排除恶性+减轻疼痛)②疼痛严重度(影响生活质量和性生活)③DIE对IVF成功率的影响(尚无定论)。本病例因疼痛严重+囊肿>4cm+存在备孕意愿但并非紧急 → 手术优先。术后要强调卵巢功能保护(巧囊剥除时沿囊壁剥离/减少电凝/止血用缝合)。',
      date: fmtDate(Date.now() - 7)
    },
    {
      id: genId(), week: getWeek(Date.now()) - 2, patient: '女，46岁，G2P1',
      complaint: '经量增多2年，加重伴头晕乏力3月',
      history: '既往月经5-7/28天,2年前经量开始增多(日用卫生巾换10+次),周期缩短至22-24天。近3个月经量进一步增多,经期延长至10天,伴明显头晕、乏力、面色苍白。Hb在外院查45g/L,予输RBC 2U后升至78g/L。',
      exam: '妇检：子宫增大如孕14周,形态不规则,表面可及多个结节,质硬。阴道超声：子宫肌壁间可见多个低回声团块,最大者位于后壁(8.5cm×6.3cm),压迫宫腔;另黏膜下可见一约3cm团块突入宫腔。',
      diagnosis: '多发性子宫肌瘤(FIGO分型:2-5型混合)\n1.肌壁间肌瘤(后壁,8.5cm,FIGO 3型)\n2.黏膜下肌瘤(3.0cm,FIGO 2型)\n3.重度缺铁性贫血(已纠正至78g/L)',
      plan: '治疗策略分两步：\n第一步:改善贫血。继续口服铁剂(多糖铁复合物)+叶酸,目标Hb>110g/L。术前GnRH-a 3.75mg皮下注射×1次(缩小子宫+闭经3月)。\n第二步:手术选择。方案A(保留子宫):宫腔镜下黏膜下肌瘤电切(TCRM)→3个月后腹腔镜下肌壁间肌瘤剔除(备子宫动脉阻断)。方案B(不保留子宫):腹腔镜下全子宫切除术。\n→患者选择方案A(保留子宫意愿强烈,无生育要求但心理不接受子宫切除)。',
      summary: '围绝经期症状性肌瘤的核心问题是:切不切子宫?三个决策维度:①患者意愿(最核心)②肌瘤特征(FIGO分型/大小/数目/有无恶变风险)③患者年龄和卵巢功能状态。46岁、贫血严重可先GnRH-a过渡,若多次复发+无生育要求+接近绝经,可推荐全子宫切除。保留子宫方案则需告知复发风险(5年约20-30%需再次干预)。',
      date: fmtDate(Date.now() - 14)
    }
  );

  // ===== 8. 值班笔记方面 =====
  DATA.clinicDuties.push(
    {
      id: genId(), symptom: '异位妊娠破裂(急腹症)',
      thinking: '⚠️注意：宫外孕破裂是妇科最紧急的急症之一,需要快速评估和决策\n\n1. 快速评估(5min内):①生命体征(血压<90/60 →休克)②腹痛程度和位置③末次月经/避孕方式④尿hCG(床旁)\n2. 病史关键点:停经天数(6-8周最常见)/前次超声有无宫内妊娠/有无异位妊娠高危因素(盆腔炎/输卵管手术/宫内节育器)\n3. 查体重点:腹部压痛反跳痛/移动性浊音/宫颈举痛/附件包块\n4. 辅助检查(急诊床旁超声优先):①β-hCG水平②超声看有无宫内妊娠囊+附件包块+腹腔积液(道格拉斯窝)\n5. 决策路径：\n  - 血流动力学不稳定+腹腔积液多+Hb下降→直接手术(不进超声室)\n  - 稳定+β-hCG<1500+包块<3.5cm+无胎心→MTX药物治疗\n  - 稳定+β-hCG高+包块大+胎心→手术\n6. 手术:首选腹腔镜患侧输卵管切除术(如对侧正常)/保留输卵管仅用于对侧已切除+有生育要求',
      drugs: '术前：林格液/生理盐水快速补液(建双通道14G留置针) 备血(RBC 4U+FFP 4U)\nMTX方案：50mg/m² im 单次→Day4/Day7复查β-hCG(下降<15%需补第二针)\n术后镇痛：酮咯酸氨丁三醇30mg iv q8h × 48h',
      notes: '⚠️切记：血流动力学不稳定的宫外孕→直接手术,不要等超声报告!腹腔穿刺抽出不凝血即可诊断。告知输血可能性和卵巢功能保护。',
      date: fmtDate(Date.now() - 2)
    },
    {
      id: genId(), symptom: '卵巢囊肿蒂扭转(急诊腹痛)',
      thinking: '1. 快速病史:突发一侧下腹剧痛+恶心呕吐+体位改变(翻身/起床/运动)后发生=高度怀疑蒂扭转\n2. 查体:患侧附件区明显压痛+反跳痛/肿瘤不活动/扭转>360°时剧痛\n3. 首选超声+多普勒:卵巢不对称增大+血流信号消失或减少(血流信号存在≠排除扭转!)\n4. 扭转多见于:①中等大小囊肿(5-10cm)②良性囊肿(畸胎瘤最常见)③妊娠期/产后/儿童期\n5. 治疗决策(核心矛盾:切不切卵巢?):\n  - 原则:任何年龄→首选保留卵巢(扭转复位+囊肿剔除)\n  - 即使卵巢紫黑色→仍有约90%可保留且功能恢复(除非组织完全坏死/感染)\n  - 不常规做卵巢切除术!除非绝经后/怀疑恶性\n6. 手术方式:腹腔镜探查(金标准),如术中扭转>720°需先复位观察血运恢复再决定',
      drugs: '术前:哌替啶50mg im(镇痛)+甲氧氯普胺10mg im(止吐)\n抗生素(如有坏死或感染):头孢西丁2g iv+多西环素100mg po bid×7d\n术后:低分子肝素预防DVT(长期卧床+大范围手术时)',
      notes: '⚠️新知:不要看到卵巢发黑就切!研究证实即使蓝黑色卵巢复位后仍可保留功能且恶变率极低。仅绝经后患者或高度怀疑恶性时考虑附件切除。',
      date: fmtDate(Date.now() - 5)
    },
    {
      id: genId(), symptom: '急性盆腔炎/输卵管卵巢脓肿(TOA)',
      thinking: '1. CDC最低诊断标准(满足一项即开始经验治疗):①宫颈举痛②子宫压痛③附件压痛\n2. 辅助检查:WBC↑、CRP↑、血沉↑/宫颈分泌物查衣原体+淋菌/超声看TOA/输卵管增粗/道格拉斯窝积液\n3. 需住院的指征(MUST入院):①TOA②妊娠③高热/恶心呕吐/不能口服④门诊抗生素治疗48h无效⑤青少年\n4. 抗生素方案(必须覆盖衣原体+淋菌+厌氧菌):\n  住院方案A:头孢西丁2g iv q6h + 多西环素100mg iv/po q12h\n  住院方案B:克林霉素900mg iv q8h + 庆大霉素负荷量2mg/kg iv→维持量1.5mg/kg q8h\n5. TOA的管理:①<7cm+无高热→抗生素+超声随访②>7cm+高热/抗生素无效→超声引导下穿刺引流③破裂TOA→急诊手术',
      drugs: '一线住院方案:头孢西丁2g iv q6h(或头孢替坦2g iv q12h) + 多西环素100mg iv/po bid × 14d\n备选:氨苄西林-舒巴坦3g iv q6h + 多西环素100mg bid × 14d\n症状改善后24h→可转口服:多西环素100mg bid + 甲硝唑500mg bid × 14d总疗程',
      notes: '⚠️关键注意事项:①治疗性伴侣(衣原体/淋菌)!②TOA抗生素疗程至少14天(更长至21天)③合并IUD→强烈建议取出④治疗后3个月复查确认病原体清除',
      date: fmtDate(Date.now() - 10)
    }
  );

  // ===== 9. 英语单词方面 =====
  const wordList = [
    { word: 'pelvic floor', phonetic: '/ˈpelvɪk flɔːr/', meaning: '盆底', example: 'Pelvic floor dysfunction affects up to 50% of parous women.' },
    { word: 'prolapse', phonetic: '/prəˈlæps/', meaning: '脱垂', example: 'POP-Q staging is the gold standard for quantifying pelvic organ prolapse.' },
    { word: 'adenomyosis', phonetic: '/ˌædɪnəʊmaɪˈəʊsɪs/', meaning: '子宫腺肌症', example: 'Junctional zone thickness ≥12 mm on MRI is diagnostic for adenomyosis.' },
    { word: 'endometriosis', phonetic: '/ˌendəʊmiːtrɪˈəʊsɪs/', meaning: '子宫内膜异位症', example: 'Deep infiltrating endometriosis requires multidisciplinary surgical planning.' },
    { word: 'dyspareunia', phonetic: '/ˌdɪspəˈruːniə/', meaning: '性交痛', example: 'Deep dyspareunia in endometriosis is often due to uterosacral ligament nodules.' },
    { word: 'sarcopenia', phonetic: '/ˌsɑːrkəˈpiːniə/', meaning: '肌肉衰减症', example: 'Pelvic floor sarcopenia contributes to POP in postmenopausal women.' },
    { word: 'mechanotransduction', phonetic: '/mɪˌkænəʊtrænzˈdʌkʃən/', meaning: '力学信号转导', example: 'Piezo1 is a key mechanotransduction channel in pelvic fibroblasts.' },
    { word: 'ferroptosis', phonetic: '/ˌferəpˈtəʊsɪs/', meaning: '铁死亡', example: 'Lipid peroxidation-driven ferroptosis is implicated in adenomyosis fibrosis.' }
  ];
  wordList.forEach(w => {
    DATA.clinicWords.push({ id: genId(), date: fmtDate(Date.now()), ...w, mastered: false });
  });

  // ===== 10. 英语查房方面 =====
  DATA.clinicRounds.push(
    {
      id: genId(), scenario: 'POP患者术前评估与知情同意(英语查房)',
      createdAt: Date.now(),
      dialogues: [
        { speaker: 'doctor', en: 'Good morning, Mrs. Wang. I am Dr. Chen. We reviewed your POP-Q examination, and you have stage III prolapse affecting both the anterior and apical compartments.', cn: '王女士早上好,我是陈医生。我们看了你的POP-Q检查,你有Ⅲ度脱垂,累及前壁和顶端。' },
        { speaker: 'patient', en: 'I see, doctor. So I definitely need surgery? Is there any other option?', cn: '我明白了。所以我肯定要做手术吗？有没有其他选择？' },
        { speaker: 'doctor', en: 'Based on your age and the severity of prolapse, surgery is recommended. However, we can also try a pessary first as a non-surgical option, or pelvic floor muscle training which is always the first-line conservative treatment.', cn: '根据你的年龄和脱垂严重程度,我们建议手术。但也可以先尝试子宫托作为非手术方案,盆底肌训练始终是一线保守治疗。' },
        { speaker: 'patient', en: 'What kind of surgery would you do? Will you remove my uterus?', cn: '你们会做什么样的手术？会切掉我的子宫吗？' },
        { speaker: 'doctor', en: 'We have two options. Option A: vaginal hysterectomy plus anterior and posterior colporrhaphy — we would remove the uterus. Option B: uterine-sparing sacrospinous ligament fixation with anterior repair — this keeps your uterus. Given that you are 58 and postmenopausal, option A has the lowest recurrence rate.', cn: '有两个选择。方案A:阴式全子宫切除加前后壁修补,需要切除子宫。方案B:保留子宫的骶棘韧带固定术加前壁修补。考虑到你58岁且已绝经,方案A复发率最低。' },
        { speaker: 'patient', en: 'I prefer option A. Will there be any effect on my bladder function? I already leak urine sometimes.', cn: '我选方案A。这会影响我排尿吗？我现在已经有时会漏尿。' },
        { speaker: 'doctor', en: 'Good question. Your cough stress test was positive, which means you also have stress urinary incontinence. During the same surgery, we will place a mid-urethral sling to correct both the prolapse and incontinence at once.', cn: '好问题。你的咳嗽压力试验阳性,说明你同时有压力性尿失禁。手术中我们会同期放置尿道中段悬吊带,一并解决脱垂和漏尿问题。' }
      ]
    },
    {
      id: genId(), scenario: '内异症合并不孕的术后咨询',
      createdAt: Date.now() - 86400000 * 14,
      dialogues: [
        { speaker: 'doctor', en: 'Mrs. Li, your laparoscopic surgery went well. We removed the endometriotic cyst and excised the deep lesions from both uterosacral ligaments.', cn: '李女士,你的腹腔镜手术很顺利。我们剥除了内膜样囊肿,也切除了双侧骶韧带的深部病灶。' },
        { speaker: 'patient', en: 'Thank you, doctor. When can I try to get pregnant? I have been trying for two years.', cn: '谢谢医生。我什么时候可以开始备孕？我已经尝试了两年了。' },
        { speaker: 'doctor', en: 'Your EFI score was 7 out of 10, which predicts a good spontaneous pregnancy rate. I recommend GnRH-a for three months to suppress residual disease, then actively try to conceive. If you are not pregnant within six months, we should consider IVF.', cn: '你的EFI评分是7分(满分10分),预测自然妊娠率良好。我建议你用GnRH-a治疗三个月抑制残余病灶,之后积极备孕。如果6个月内未孕,应该考虑试管婴儿。' }
      ]
    }
  );

  // ===== 11. 规培题库方面 =====
  const quizzes = [
    { q: '关于盆腔器官脱垂（POP）分度，正确的是？', opts: ['POP-Q分度采用3×3表格(9个指示点)', 'Ⅰ度为最严重', 'Ⅱ度脱垂可自行回纳', 'Ⅳ度为最轻度'], ans: 0, exp: 'POP-Q分度采用3×3网格(阴道前壁3点/后壁3点/顶端3点),0度=正常,-3到+3分度,Ⅳ度为最严重(完全脱出)。', knowledge: 'POP-Q分度/盆腔器官脱垂' },
    { q: '子宫腺肌症最敏感的MRI诊断指标是？', opts: ['子宫均匀增大', '结合带(JZ)最大厚度≥12mm', 'T2低信号', '增强后不均匀强化'], ans: 1, exp: 'MRI诊断腺肌症主要标准:结合带(JZ)最大厚度≥12mm、JZ与肌层比值>40%、JZ差值>5mm、结合带厚度不规则。其中JZ≥12mm最常用。', knowledge: '腺肌症/MRI诊断/结合带' },
    { q: 'GnRH-a治疗内异症的主要副作用及应对策略是？', opts: ['只需观察,不需处理', '反向添加雌孕激素缓解更年期症状和骨质流失', '增加钙剂摄入即可', '停药后会自愈,无需处理'], ans: 1, exp: 'GnRH-a导致低雌激素/FSH/LH,引起更年期症状和骨质流失。反向添加(Add-back)治疗:17β-E2 1mg+炔诺酮0.5mg或替勃龙1.25mg可有效缓解症状且不影响疗效。', knowledge: 'GnRH-a/反向添加/内异症' },
    { q: '产后出血的4T原因中占比最高的是？', opts: ['Tone(子宫收缩乏力)', 'Trauma(软产道裂伤)', 'Tissue(胎盘残留)', 'Thrombin(凝血功能障碍)'], ans: 0, exp: '4T:子宫收缩乏力(Tone,70-80%)>软产道裂伤(Trauma,约20%)>胎盘残留(Tissue,约10%)>凝血功能障碍(Thrombin,<1%)。', knowledge: '产后出血/4T' },
    { q: '压力性尿失禁的一线手术方式及治愈率是？', opts: ['Burch手术(开腹)', 'TVT-O/TOT尿道中段悬吊术', '尿道周围注射填充剂', 'Kelly折叠术'], ans: 1, exp: 'TVT-O/TOT是SUI标准术式,5年主观治愈率约80-90%。Burch手术目前已少用。尿道填充剂适用于无法耐受手术者(治愈率<50%)。', knowledge: 'SUI/TVT-O/手术' },
    { q: '关于深部浸润型内异症(DIE)的手术原则,错误的是？', opts: ['术前需行MRI评估病灶侵犯范围', '需多学科团队(MDT)协作', '首选腹腔镜手术', '尽量保留卵巢但可常规切除子宫'], ans: 3, exp: 'DIE手术原则:病灶完全切除+保留生育功能(年轻患者)+保护卵巢。常规切除子宫是不必要的。手术范围由病灶侵犯范围和患者生育意愿个体化决定。', knowledge: 'DIE/多学科团队/个体化手术' },
    { q: '关于围绝经期MHT"窗口期"理论,正确的是？', opts: ['适用于任何年龄和绝经年限的女性', '指年龄<60岁且绝经<10年时MHT获益/风险比最佳', '主要适用于有潮热症状的女性', '窗口期仅指雌激素治疗'], ans: 1, exp: 'MHT窗口期:年龄<60岁+绝经<10年内开始MHT,心血管保护效应可能最优,乳腺癌风险增加最小。超过窗口期开始MHT则风险增加。', knowledge: 'MHT/窗口期/围绝经期管理' },
    { q: '异位妊娠MTX药物治疗的适应证不包括？', opts: ['β-hCG<5000 IU/L', '附件包块<3.5cm且无胎心搏动', '血流动力学不稳定', '患者依从性好且能随访'], ans: 2, exp: 'MTX适应证:①血流动力学稳定②β-hCG≤5000 IU/L③包块<3.5-4cm④无胎心搏动⑤患者可随访。血流动力学不稳定需急诊手术。', knowledge: '异位妊娠/MTX/适应证' },
    { q: '关于卵巢囊肿蒂扭转手术时保留卵巢的决策,正确的是？', opts: ['卵巢紫黑色就必须切除', '无论卵巢外观如何,均应首选复位+保留', '绝经前患者可直接切除卵巢', '扭转>720°时保卵巢意义不大'], ans: 1, exp: '卵巢扭转手术“保卵巢”是原则。多项研究证实即使卵巢紫黑色(动脉及静脉回流中断),复位后绝大多数可恢复血运和功能。仅绝经后或高度怀疑恶性时考虑附件切除。', knowledge: '卵巢囊肿/蒂扭转/卵巢保护原则' },
    { q: '关于宫颈筛查,HPV初筛阳性+细胞学ASC-US后的处理是？', opts: ['直接LEEP手术', '6-12个月后复查', '行阴道镜检查(若HPV16/18阳性则更高危)', '无需处理/等待自愈'], ans: 2, exp: '30+岁:HPV阳性+ASC-US→阴道镜检查(尤其HPV16/18阳性)。25-29岁:可选择1年复查。HPV16/18阳性无论细胞学结果均应阴道镜。', knowledge: '宫颈癌筛查/HPV/ASC-US/阴道镜' }
  ];
  quizzes.forEach(qz => {
    DATA.clinicQuizzes.push({ id: genId(), week: getWeek(Date.now()), mastered: false, ...qz });
  });

  // ===== 12. 每日文献推送 — 10篇真实PubMed文献（围绕用户研究方向） =====
  const dailyItems = [
    {
      title: 'SIRT1减轻压力性尿失禁中氧化应激诱导的线粒体功能障碍和线粒体相关膜失调',
      source: 'BioArt', journal: 'Cell Prolif', year: 2025, if: 5.6,
      tags: ['线粒体', '盆底', 'SIRT1', '尿失禁'],
      link: 'https://pubmed.ncbi.nlm.nih.gov/39980436/',
      summary: '武汉大学人民医院洪莉团队发表。研究揭示压力性尿失禁(SUI)发病与盆底结缔组织氧化应激后线粒体稳态失调有关。SIRT1通过PGC-1α/NRF1/TFAM通路维持线粒体生物合成，通过PINK1/Parkin通路维持线粒体自噬。SIRT1激活可恢复成纤维细胞线粒体功能、修复线粒体相关膜(MAM)结构、缓解内质网应激，促进阴道前壁修复。SIRT1可能是SUI的潜在治疗靶点。'
    },
    {
      title: '机械牵张介导的成纤维细胞激活：Piezo1通道的关键作用',
      source: 'Nature Portfolio', journal: 'BBA Mol Cell Res', year: 2025, if: 4.6,
      tags: ['机械力', 'Piezo1', '成纤维细胞', 'YAP'],
      link: 'https://pubmed.ncbi.nlm.nih.gov/40517844/',
      summary: '该研究开发了基于PDMS拉伸膜的机械刺激培养平台，发现单轴循环牵张通过上调Piezo1表达促进成纤维细胞活化（形态变化、增殖增加、迁移增强），其机制涉及YAP通路。Piezo1活性调节可改变成纤维细胞活化程度。为理解机械转导机制提供了新见解，对组织重塑和纤维化研究有重要意义。'
    },
    {
      title: '基质硬度通过Piezo1-Wnt2/Wnt11-CCL24正反馈环路促进皮肤纤维化',
      source: 'BioArt', journal: 'Cell Death Dis', year: 2024, if: 8.1,
      tags: ['机械力', 'Piezo1', '纤维化', 'YAP'],
      link: 'https://pubmed.ncbi.nlm.nih.gov/38267432/',
      summary: '上海九院李青峰团队发表。研究发现ECM硬度通过Piezo1-Wnt2/Wnt11-CCL24正反馈环路驱动皮肤纤维化。Piezo1在纤维化皮肤中高表达，AAV介导的Piezo1敲低可改善小鼠皮肤纤维化进展。靶向Piezo1可打破成纤维细胞机械转导与异常组织力学之间的正反馈循环。该机制对盆底组织纤维化同样具有参考价值。'
    },
    {
      title: 'METTL3介导的m6A修饰通过GPX4以YTHDF1依赖方式促进子宫腺肌症铁死亡',
      source: '解螺旋', journal: 'Reproduction', year: 2025, if: 3.0,
      tags: ['腺肌症', '铁死亡', 'm6A', 'GPX4'],
      link: 'https://pubmed.ncbi.nlm.nih.gov/40911580/',
      summary: '郑州大学第一附属医院发表。研究发现腺肌症患者在位和异位子宫内膜组织中均存在铁死亡。METTL3下调导致GPX4 mRNA的m6A修饰减少，YTHDF1介导的翻译下调，引发铁死亡。GPX4与CA125、子宫大小和痛经严重程度呈负相关，可作为腺肌症严重程度的生物标志物。为腺肌症的铁死亡靶向治疗提供了新策略。'
    },
    {
      title: '通脉化症混合物通过抑制JAK2/STAT3信号通路诱导铁死亡以缓解子宫腺肌症',
      source: '医学界', journal: 'Phytomedicine', year: 2025, if: 6.7,
      tags: ['腺肌症', '铁死亡', 'JAK2/STAT3', '中药'],
      link: 'https://pubmed.ncbi.nlm.nih.gov/41477983/',
      summary: '该研究整合UPLC-MS/MS、网络药理学和RNA测序的多组学策略，发现通脉化症混合物(TMHZ)通过抑制JAK2/STAT3通路诱导异位病灶铁死亡，下调SLC7A11和GPX4表达。体内实验证实TMHZ显著缓解异位内膜腺体向肌层浸润。为腺肌症的中药治疗提供了机制依据。'
    },
    {
      title: '基于高通量靶向脂质定量揭示子宫腺肌症相关肌层代谢变化',
      source: '科研圈', journal: 'RBMO', year: 2025, if: 3.7,
      tags: ['腺肌症', '脂滴', '脂质组学', '酰基肉碱'],
      link: 'https://pubmed.ncbi.nlm.nih.gov/40472664/',
      summary: '前瞻性两中心观察性研究，纳入44例绝经前患者。在子宫腺肌症肌层组织中鉴定出1100种脂质，其中84种显著差异表达（76种上调/8种下调）。差异最大的脂质集中在甘油磷脂，酰基肉碱和溶血磷脂酰胆碱显著改变。揭示了腺肌症肌层的脂质代谢重编程，为理解肌层纤维化机制提供了脂质组学视角。'
    },
    {
      title: '衰老导致的雌二醇缺乏引起雌性小鼠卫星细胞池耗竭',
      source: 'BioArt', journal: 'Aging Cell', year: 2025, if: 7.6,
      tags: ['雌激素', '肌肉再生', '衰老', '卫星细胞'],
      link: 'https://pubmed.ncbi.nlm.nih.gov/39227498/',
      summary: '明尼苏达大学发表。在24-26月龄卵巢衰老小鼠中，TA和EDL肌肉的卫星细胞池严重缩小。补充17β-雌二醇可显著增加卫星细胞数量。移植实验显示老化环境对卫星细胞池的调控作用优于细胞自主性老化。转录组分析揭示老龄和卵巢切除小鼠卫星细胞共同差异表达基因。支持雌二醇缺乏是老年女性肌肉卫星细胞减少的主要驱动因素。'
    },
    {
      title: '17β-雌二醇对盆腔器官脱垂来源成纤维细胞的抗衰老效应及机制',
      source: 'NEJM前沿', journal: 'Biochem Cell Biol', year: 2025, if: 2.8,
      tags: ['雌激素', '盆底', '衰老', '成纤维细胞', 'SIRT1'],
      link: 'https://www.sciencedirect.com/science/article/pii/S0327954525000143',
      summary: '从POP III-IV期绝经后女性手术标本中分离原代成纤维细胞，发现E2显著促进增殖、降低SA-β-Gal染色率、上调COL-I/COL-III、抑制p16INK4a。机制上E2通过SIRT-1/p53/p21轴发挥抗衰老作用，同时改善细胞自噬和代谢活性。为雌激素局部治疗POP提供了理论依据。'
    },
    {
      title: 'FSP1介导的脂滴质量控制防止中性脂质过氧化和铁死亡',
      source: 'Cell Press', journal: 'Nat Cell Biol', year: 2025, if: 17.6,
      tags: ['脂滴', '铁死亡', 'FSP1', '线粒体'],
      link: 'https://pubmed.ncbi.nlm.nih.gov/41162632/',
      summary: '加州大学伯克利分校Olzmann实验室发表。首次揭示脂滴定位的FSP1通过回收CoQ10至亲脂性抗氧化形式，防止中性脂质（甘油三酯和胆固醇酯）过氧化。FSP1缺失导致氧化甘油三酯积累；富含多不饱和脂肪酸的脂滴在FSP1功能受损时触发脂滴起始的铁死亡。发现了首个脂滴脂质质量控制通路，对理解脂滴-线粒体-铁死亡轴具有里程碑意义。'
    },
    {
      title: '重组人源化胶原蛋白：通过增强成纤维细胞功能和血管生成治疗盆腔器官脱垂的新策略',
      source: '丁香园', journal: 'Int Urogynecol J', year: 2025, if: 3.1,
      tags: ['盆底', '胶原', '成纤维细胞', '临床转化'],
      link: 'https://pubmed.ncbi.nlm.nih.gov/40116904/',
      summary: '北京大学人民医院孙秀丽团队发表。POP患者阴道壁I型和III型胶原显著降低。重组III型人源化胶原蛋白(rhColIII)在1mg/ml浓度下促进成纤维细胞增殖和迁移、抑制细胞衰老、增强ECM合成。模拟产伤大鼠模型中，阴道壁局部注射rhColIII显著增加III型胶原含量、改善纤维结构、促进血管生成。为POP生物材料治疗提供了新方案。'
    }
  ];
  dailyItems.forEach((d, i) => {
    DATA.dailyPapers.push({
      id: genId(), date: fmtDate(Date.now() - i * 86400000),
      title: d.title, source: d.source, journal: d.journal, year: d.year,
      impactFactor: d.if, summary: d.summary,
      link: d.link, tags: d.tags, fav: i < 2, read: i < 3
    });
  });

  // ===== 13. 每周文献——用户上周精读的真实文献 =====
  DATA.weeklyPapers.push(
    {
      id: genId(), week: getWeek(Date.now()) - 1, date: fmtDate(Date.now() - 7),
      title: 'Placental nicotinamide adenine dinucleotide modulates the timing of labor',
      authors: 'Ciampa EJ, Machado LM, Lee KJ, Clark AJ, Vu KQ, Khan NA, Kispert S, Armstrong S, Li Y, Milne GL, Solmonson A, Karumanchi SA, Parikh SM.',
      journal: 'Science', year: 2026, impactFactor: 56.9,
      tags: ['NAD+', '代谢衰老', '分娩启动', '线粒体', '临床转化'],
      abstract: '分娩由妊娠组织内的前列腺素信号精确调控，必须在胎儿发育适当后才能发生。妊娠衰老伴随的代谢变化被认为是分娩时机的决定因素，但具体营养素、感受器和信使仍不清楚。本研究报道胎盘NAD+动态调节妊娠长度。在小鼠中，胎盘NAD+耗竭可诱发分娩启动，其机制是NAD+作为15-羟基前列腺素脱氢酶（15-PGDH）的辅因子——该酶负责抑制前列腺素积累。增强胎盘NAD+可延长基础妊娠时长，并在早产模型中预防早产。这些发现揭示了代谢耗竭在诱发分娩中的核心作用，并为早产预防和引产优化提供了潜在治疗途径。',
      value: '①Science正刊（IF 56.9），代谢衰老领域的重大突破\n②首次将胎盘"代谢衰老"与分娩启动直接联系起来——NAD+作为代谢时钟的核心分子\n③NAD+作为15-PGDH辅因子的全新机制发现，不同于已知的sirtuin/SARM通路\n④补充NAD+前体（如NR）可预防早产——具有直接临床转化价值\n⑤本研究的方法学（NAD+代谢流检测、15-PGDH酶活分析）可借鉴到我课题中NAD+相关实验',
      summary: '🔑 关键发现：\n1) 胎盘NAD+水平随妊娠进展动态下降——"代谢时钟"\n2) NAD+耗竭→15-PGDH活性下降→前列腺素降解减少→PGF2α/PGE2积累→分娩启动\n3) 补充NAD+前体NR可延长妊娠、预防早产模型中的提前分娩\n4) 该机制独立于已知的内分泌激素（缩宫素/孕酮撤退）通路\n5) 同期配发Perspective评论文章"The placental metabolic clock"',
      thoughts: '与本课题的关联：\n①NAD+代谢衰老的概念可迁移到盆底组织——盆底成纤维细胞是否也存在NAD+耗竭驱动的衰老？\n②15-PGDH是否在盆底组织中表达？NAD+水平是否调控盆底ECM代谢？\n③可检测POP患者盆底筋膜组织NAD+/NADH比值，验证是否存在代谢耗竭\n④NAD+前体（NR/NMN）是否可作为POP保守治疗的新策略？',
      status: '已精读',
      pubmedLink: 'https://pubmed.ncbi.nlm.nih.gov/42275500/',
      doi: '10.1126/science.adz1624'
    }
  );

  // ===== 14. 健身打卡 =====
  const fitLog = {};
  for (let i = 0; i < 20; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i * 2);
    if (Math.random() > 0.35) fitLog[fmtDate(d)] = 1;
  }
  DATA.fitness = { records: [], target: 2, history: fitLog };

  // ===== 15. 体重管理 =====
  const fastLog = {};
  for (let i = 0; i < 25; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if ([0, 2, 4].includes(d.getDay()) && Math.random() > 0.3) fastLog[fmtDate(d)] = 1;
    else if ([1, 3, 5, 6].includes(d.getDay()) && Math.random() > 0.7) fastLog[fmtDate(d)] = 1;
  }
  DATA.weight = { records: [], fastingLog: fastLog, target: 3, weightHistory: [], dietLog: {} };

  // 标记所有种子数据为 demo
  const demoCols = ['weeklyPapers','dailyPapers','researchProjects','paperWritings','paperSubmits','library','clinicGuidelines','clinicSkills','clinicCases','clinicDuties','clinicWords','clinicRounds','clinicQuizzes'];
  demoCols.forEach(c => {
    if (DATA[c]) DATA[c].forEach(item => { item.is_demo = true; });
  });

  saveData();
}

/* ============== 路由 ============== */
let currentPage = 'dashboard';

function gotoPage(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const pageInfo = PAGE_REGISTRY[page] || {};
  document.getElementById('page-title').textContent = pageInfo.title || '工作台';
  document.getElementById('page-sub').innerHTML = (pageInfo.sub || '') + ' · <span id="today-date">' + cnDate(Date.now()) + '</span>';
  // 更新顶部新建按钮 — onAdd 是字符串函数名，动态查找
  const addBtn = document.getElementById('btn-add');
  if (pageInfo.onAdd && typeof window[pageInfo.onAdd] === 'function') {
    addBtn.style.display = '';
    addBtn.textContent = pageInfo.addLabel || '+ 新建';
    addBtn.onclick = window[pageInfo.onAdd];
  } else {
    addBtn.style.display = 'none';
  }
  renderPage(page);
  updateBadges();
  // 移动端底部导航激活状态
  document.querySelectorAll('.bn-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

/* ============== 动态徽标 ============== */
function getBadgeCount(page) {
  const week = getWeek(new Date());
  const today = todayStr();
  switch (page) {
    case 'dashboard': {
      // 今日待办数
      return 0; // 看板不显示徽标
    }
    case 'weekly-paper': {
      const thisWeek = DATA.weeklyPapers.filter(p => p.week === week && p.status !== '已精读').length;
      const target = DATA.settings?.goals?.weeklyPaper || 1;
      return thisWeek < target ? target - thisWeek : 0;
    }
    case 'daily-paper': {
      const todayCount = DATA.dailyPapers.filter(p => p.date === today && !p.read).length;
      return todayCount;
    }
    case 'research-projects': {
      return DATA.researchProjects.filter(p => p.status === '进行中' || p.status === '筹备中').length;
    }
    case 'paper-writing': {
      return DATA.paperWritings.filter(p => p.status !== '已投稿' && p.status !== '已发表').length;
    }
    case 'paper-submit': {
      return DATA.paperSubmits.filter(p => !['Accepted', '见刊', '已上线'].includes(p.status)).length;
    }
    case 'library': {
      return DATA.library.length;
    }
    case 'clinic-guideline': {
      const thisWeekG = DATA.clinicGuidelines.filter(g => g.week === week).length;
      return thisWeekG < 1 ? 1 : 0;
    }
    case 'clinic-skill': {
      return DATA.clinicSkills.filter(s => s.week === week).length < 1 ? 1 : 0;
    }
    case 'clinic-case': {
      return DATA.clinicCases.filter(c => c.week === week).length < 1 ? 1 : 0;
    }
    case 'clinic-duty': {
      return DATA.clinicDuties.length;
    }
    case 'clinic-words': {
      const todayWords = DATA.clinicWords.filter(w => w.date === today).length;
      return todayWords < 5 ? 5 - todayWords : 0;
    }
    case 'clinic-round': {
      return DATA.clinicRounds.length;
    }
    case 'clinic-quiz': {
      const weekQuiz = DATA.clinicQuizzes.filter(q => q.week === week && !q.mastered).length;
      return weekQuiz;
    }
    case 'fitness': {
      // 本周已练次数
      const weekDates = getWeekDates(new Date());
      const count = weekDates.filter(d => DATA.fitness.history[d]).length;
      const target = DATA.settings?.goals?.fitness || 2;
      return count < target ? target - count : 0;
    }
    case 'weight': {
      const weekDates = getWeekDates(new Date());
      const count = weekDates.filter(d => DATA.weight.fastingLog[d]).length;
      const target = DATA.settings?.goals?.weightFast || 3;
      return count < target ? target - count : 0;
    }
    default: return 0;
  }
}

function getWeekDates(date) {
  const result = [];
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    result.push(fmtDate(d));
  }
  return result;
}

function updateBadges() {
  document.querySelectorAll('.nav-item').forEach(el => {
    const page = el.dataset.page;
    if (!page) return;
    const count = getBadgeCount(page);
    let badge = el.querySelector('.count');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'count';
        el.appendChild(badge);
      }
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = '';
    } else if (badge) {
      badge.style.display = 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => gotoPage(el.dataset.page));
  });
  document.getElementById('btn-darkmode').addEventListener('click', toggleDark);
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('⚠️ 确定要重置示例数据吗？\n\n• 示例数据（标记为 demo 的记录）将被清除并重新生成\n• 你手动添加的真实数据不会被删除\n• 此操作不可撤销')) {
      // 只删除示例数据
      const demoCols = ['weeklyPapers','dailyPapers','researchProjects','paperWritings','paperSubmits','library','clinicGuidelines','clinicSkills','clinicCases','clinicDuties','clinicWords','clinicRounds','clinicQuizzes'];
      demoCols.forEach(c => {
        if (DATA[c]) DATA[c] = DATA[c].filter(item => !item.is_demo);
      });
      // 重新播种示例数据
      seedData();
      toast('✅ 示例数据已重置，你的真实数据已保留');
      renderPage(currentPage);
      updateBadges();
    }
  });
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-mask').addEventListener('click', (e) => {
    if (e.target.id === 'modal-mask') closeModal();
  });
  // 全局搜索
  const searchInput = document.getElementById('quick-search');
  if (searchInput) {
    let searchTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => globalSearch(e.target.value), 300);
    });
  }
  // 全局功能按钮
  ['btn-calendar','btn-tasks','btn-inbox','btn-stats','btn-settings'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => gotoPage(id.replace('btn-','')));
  });
  // 移动端：汉堡菜单
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('btn-hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.add('open');
      overlay.classList.add('show');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
  // 移动端：点击导航项后关闭抽屉
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
      }
    });
  });
  // 移动端：底部导航
  document.querySelectorAll('.bn-item').forEach(el => {
    if (el.dataset.page) {
      el.addEventListener('click', () => gotoPage(el.dataset.page));
    }
  });
  // 移动端：底部新增按钮
  const bnAdd = document.getElementById('bn-add');
  if (bnAdd) {
    bnAdd.addEventListener('click', () => {
      const info = PAGE_REGISTRY[currentPage];
      if (info && info.onAdd && window[info.onAdd]) {
        window[info.onAdd]();
      } else {
        gotoPage('tasks');
      }
    });
  }
  // 深色模式
  if (localStorage.getItem('wb_theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  gotoPage('dashboard');
  // 初始化云端同步
  if (typeof initCloud === 'function') initCloud();
});

function toggleDark() {
  const html = document.documentElement;
  const cur = html.getAttribute('data-theme');
  if (cur === 'dark') {
    html.removeAttribute('data-theme');
    localStorage.setItem('wb_theme', 'light');
  } else {
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('wb_theme', 'dark');
  }
}

/* ============== 页面注册表 ============== */
/* renderer / onAdd 均为字符串函数名，运行时通过 window[name] 动态查找，
   避免 app.js 先于 pages1/2/3.js 加载时的 ReferenceError */
const PAGE_REGISTRY = {
  'dashboard': { title: '今日科研看板', sub: '看见懒惰,然后打败它', renderer: 'renderDashboard' },
  'weekly-paper': { title: '每周文献', sub: '一周一精读,贵在坚持', renderer: 'renderWeeklyPaper', addLabel: '+ 记录精读', onAdd: 'showWeeklyPaperForm' },
  'daily-paper': { title: '每日文献推送', sub: '每日10篇,持续输入', renderer: 'renderDailyPaper', addLabel: '🔄 智能推送', onAdd: 'generateDailyPapers' },
  'research-projects': { title: '科研项目管理', sub: '课题地图 · 实验推进', renderer: 'renderProjects', addLabel: '+ 新项目', onAdd: 'addProject' },
  'paper-writing': { title: '论文撰写', sub: '一篇一篇磨出来', renderer: 'renderPaperWriting', addLabel: '+ 新论文', onAdd: 'addPaperWriting' },
  'paper-submit': { title: '论文投稿', sub: '从投出到见刊的完整轨迹', renderer: 'renderPaperSubmit', addLabel: '+ 新投稿', onAdd: 'addPaperSubmit' },
  'library': { title: '我的文献库', sub: '按方向沉淀的文献资产', renderer: 'renderLibrary', addLabel: '+ 添加文献', onAdd: 'addLibrary' },
  'clinic-guideline': { title: '临床指南每周学习', sub: '保持循证医学的敏感度', renderer: 'renderClinicGuideline', addLabel: '+ 新指南', onAdd: 'addGuideline' },
  'clinic-skill': { title: '临床操作积累', sub: '把每台手术都变成自己的SOP', renderer: 'renderClinicSkill', addLabel: '+ 新操作', onAdd: 'addSkill' },
  'clinic-case': { title: '临床病例分析', sub: '从复杂病例里提取临床直觉', renderer: 'renderClinicCase', addLabel: '+ 新病例', onAdd: 'addCase' },
  'clinic-duty': { title: '临床值班笔记', sub: '值班的底气,来自平时的积累', renderer: 'renderClinicDuty', addLabel: '+ 新笔记', onAdd: 'addDuty' },
  'clinic-words': { title: '学术英语单词本', sub: '每天5个,慢慢长出英文思维', renderer: 'renderClinicWords', addLabel: '+ 新单词', onAdd: 'addWord' },
  'clinic-round': { title: '英语查房情景', sub: '情景对话,沉浸式训练', renderer: 'renderClinicRound', addLabel: '+ 新情景', onAdd: 'addRound' },
  'clinic-quiz': { title: '规培考试题库', sub: '一周50题,稳扎稳打', renderer: 'renderClinicQuiz', addLabel: '+ 新题目', onAdd: 'addQuiz' },
  'fitness': { title: '每周健身打卡', sub: '好身体是科研的本钱', renderer: 'renderFitness' },
  'weight': { title: '体重管理计划', sub: '每周3个空腹夜,管住嘴', renderer: 'renderWeight' },
  // 全局功能页面
  'calendar': { title: '统一日历', sub: '所有截止日期、计划和打卡', renderer: 'renderUnifiedCalendar' },
  'tasks': { title: '任务中心', sub: '今日 · 即将到期 · 逾期 · 已完成', renderer: 'renderTaskCenter' },
  'inbox': { title: '收件箱', sub: '临时想法 · 待整理链接 · 待确认指南', renderer: 'renderInbox', addLabel: '+ 新条目', onAdd: 'addInboxItem' },
  'stats': { title: '统计中心', sub: '周/月/季度趋势和各栏目统计', renderer: 'renderStatsCenter' },
  'settings': { title: '设置', sub: '关键词 · 目标 · 数据源 · 导入导出', renderer: 'renderSettings' }
};

function renderPage(page) {
  const info = PAGE_REGISTRY[page];
  const root = document.getElementById('page-root');
  if (!info) {
    if (root) root.innerHTML = '<div class="empty"><div class="emoji">🤔</div>页面未注册: ' + page + '</div>';
    return;
  }
  if (!root) return;
  root.innerHTML = '';
  // 动态查找 renderer 函数
  const fn = window[info.renderer];
  if (typeof fn !== 'function') {
    root.innerHTML = '<div class="empty"><div class="emoji">⏳</div>页面加载中…<br><span style="font-size:12px;color:var(--text-sub)">组件: ' + info.renderer + '</span></div>';
    return;
  }
  try {
    fn(root);
  } catch (e) {
    console.error('[renderPage] 渲染失败:', page, e);
    root.innerHTML = '<div class="empty"><div class="emoji">⚠️</div>页面渲染出错<br><span style="font-size:12px;color:var(--text-sub)">' + (e.message || e) + '</span><br><button class="btn-primary" style="margin-top:12px" onclick="renderPage(\'' + page + '\')">重试</button></div>';
  }
  // 更新顶部按钮
  const addBtn = document.getElementById('btn-add');
  if (addBtn) {
    if (info.onAdd && typeof window[info.onAdd] === 'function') {
      addBtn.style.display = '';
      addBtn.textContent = info.addLabel || '+ 新建';
      addBtn.onclick = window[info.onAdd];
    } else {
      addBtn.style.display = 'none';
    }
  }
}

/* ============== 模态框 ============== */
let modalOkHandler = null;
function openModal(title, bodyHTML, onOk) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  modalOkHandler = onOk;
  document.getElementById('modal-mask').classList.add('show');
}
function closeModal() {
  document.getElementById('modal-mask').classList.remove('show');
  modalOkHandler = null;
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-ok').addEventListener('click', () => {
    if (modalOkHandler) modalOkHandler();
  });
});

/* ============== Toast ============== */
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; t.style.transition = 'all .3s'; }, 1800);
  setTimeout(() => t.remove(), 2200);
}

/* ============== 全局搜索 ============== */
function globalSearch(kw) {
  const results = document.getElementById('search-results');
  if (!kw || kw.trim().length < 1) {
    if (results) results.style.display = 'none';
    return;
  }
  const q = kw.toLowerCase().trim();
  const hits = [];
  // 搜索文献库
  DATA.library.forEach(l => {
    if ((l.title || '').toLowerCase().includes(q) || (l.tags || []).some(t => t.toLowerCase().includes(q))) {
      hits.push({ type: '文献库', title: l.title, sub: `${l.journal} ${l.year}`, page: 'library', id: l.id });
    }
  });
  // 搜索每周文献
  DATA.weeklyPapers.forEach(p => {
    if ((p.title || '').toLowerCase().includes(q) || (p.abstract || '').toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q))) {
      hits.push({ type: '每周精读', title: p.title, sub: `${p.journal} ${p.year}`, page: 'weekly-paper', id: p.id });
    }
  });
  // 搜索每日文献
  DATA.dailyPapers.forEach(p => {
    if ((p.title || '').toLowerCase().includes(q) || (p.summary || '').toLowerCase().includes(q)) {
      hits.push({ type: '每日推送', title: p.title, sub: `${p.source} ${p.date}`, page: 'daily-paper', id: p.id });
    }
  });
  // 搜索科研项目
  DATA.researchProjects.forEach(p => {
    if ((p.name || '').toLowerCase().includes(q) || (p.plan || '').toLowerCase().includes(q) || (p.notes || '').toLowerCase().includes(q)) {
      hits.push({ type: '科研项目', title: p.name, sub: p.status, page: 'research-projects', id: p.id });
    }
  });
  // 搜索论文
  DATA.paperWritings.forEach(p => {
    if ((p.title || '').toLowerCase().includes(q)) hits.push({ type: '论文撰写', title: p.title, sub: p.targetJournal, page: 'paper-writing', id: p.id });
  });
  DATA.paperSubmits.forEach(p => {
    if ((p.title || '').toLowerCase().includes(q)) hits.push({ type: '论文投稿', title: p.title, sub: `${p.journal} IF${p.if}`, page: 'paper-submit', id: p.id });
  });
  // 搜索临床
  DATA.clinicGuidelines.forEach(g => {
    if ((g.title || '').toLowerCase().includes(q) || (g.summary || '').toLowerCase().includes(q)) hits.push({ type: '临床指南', title: g.title, sub: g.source, page: 'clinic-guideline', id: g.id });
  });
  DATA.clinicCases.forEach(c => {
    if ((c.patient || '').toLowerCase().includes(q) || (c.diagnosis || '').toLowerCase().includes(q) || (c.complaint || '').toLowerCase().includes(q)) {
      hits.push({ type: '临床病例', title: c.patient, sub: c.diagnosis, page: 'clinic-case', id: c.id });
    }
  });
  DATA.clinicDuties.forEach(d => {
    if ((d.symptom || '').toLowerCase().includes(q) || (d.thinking || '').toLowerCase().includes(q) || (d.drugs || '').toLowerCase().includes(q)) {
      hits.push({ type: '值班笔记', title: d.symptom, sub: d.date, page: 'clinic-duty', id: d.id });
    }
  });
  DATA.clinicSkills.forEach(s => {
    if ((s.name || '').toLowerCase().includes(q)) hits.push({ type: '临床操作', title: s.name, sub: s.category, page: 'clinic-skill', id: s.id });
  });
  DATA.clinicWords.forEach(w => {
    if ((w.word || '').toLowerCase().includes(q) || (w.meaning || '').toLowerCase().includes(q)) hits.push({ type: '英语单词', title: w.word, sub: w.meaning, page: 'clinic-words', id: w.id });
  });
  DATA.clinicQuizzes.forEach(qz => {
    if ((qz.q || '').toLowerCase().includes(q) || (qz.knowledge || '').toLowerCase().includes(q)) hits.push({ type: '规培题', title: qz.q, sub: qz.knowledge, page: 'clinic-quiz', id: qz.id });
  });

  if (!results) return;
  if (!hits.length) {
    results.innerHTML = '<div style="padding:12px;color:var(--text-sub);font-size:12px">未找到相关内容</div>';
    results.style.display = 'block';
    return;
  }
  results.innerHTML = hits.slice(0, 20).map(h => `
    <div class="search-hit" onclick="gotoPage('${h.page}');document.getElementById('search-results').style.display='none';document.getElementById('quick-search').value=''">
      <span class="tag tag-purple" style="flex-shrink:0">${h.type}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.title}</div>
        <div style="font-size:11px;color:var(--text-sub)">${h.sub}</div>
      </div>
    </div>
  `).join('');
  results.style.display = 'block';
}

/* ============== 统一打卡引擎 ============== */
function checkin(taskKey, dateStr) {
  dateStr = dateStr || todayStr();
  if (!DATA.checkin[taskKey]) DATA.checkin[taskKey] = { history: {}, target: 1, period: 'daily' };
  DATA.checkin[taskKey].history[dateStr] = 1;
  saveData();
  updateBadges();
}

function uncheckin(taskKey, dateStr) {
  if (!DATA.checkin[taskKey]) return;
  delete DATA.checkin[taskKey].history[dateStr];
  saveData();
  updateBadges();
}

function isCheckinDone(taskKey, dateStr) {
  return DATA.checkin[taskKey] && DATA.checkin[taskKey].history[dateStr];
}

function getCheckinStats(taskKey, period) {
  const checkinData = DATA.checkin[taskKey] || { history: {}, target: 1 };
  const history = checkinData.history;
  const target = checkinData.target || 1;
  if (period === 'weekly') {
    const weekDates = getWeekDates(new Date());
    const count = weekDates.filter(d => history[d]).length;
    return { count, target, rate: Math.min(100, Math.round(count / target * 100)) };
  } else {
    const today = todayStr();
    const count = history[today] ? 1 : 0;
    return { count, target: 1, rate: count * 100 };
  }
}

function updateCheckinTarget(taskKey, newTarget) {
  if (!DATA.checkin[taskKey]) DATA.checkin[taskKey] = { history: {}, target: newTarget, period: 'weekly' };
  // 保存目标历史快照
  const oldTarget = DATA.checkin[taskKey].target;
  if (oldTarget !== newTarget) {
    DATA.checkinGoals.push({
      id: genId(), taskKey, target: oldTarget,
      effectiveUntil: todayStr()
    });
    DATA.checkin[taskKey].target = newTarget;
  }
  saveData();
}

/* ============== 任务引擎 ============== */
function addTask(title, opts = {}) {
  DATA.tasks.unshift({
    id: genId(), title, type: opts.type || 'optional',
    page: opts.page || '', entityId: opts.entityId || '',
    done: false, dueDate: opts.dueDate || '',
    priority: opts.priority || 3, createdAt: Date.now()
  });
  saveData();
  updateBadges();
}

function toggleTask(id) {
  const t = DATA.tasks.find(x => x.id === id);
  if (t) { t.done = !t.done; saveData(); }
}

function getTodayTasks() {
  const today = todayStr();
  const week = getWeek(new Date());
  const tasks = [];
  // 自动生成今日任务
  if (!DATA.weeklyPapers.some(p => p.week === week && p.status === '已精读'))
    tasks.push({ icon: '📖', text: '完成本周文献精读', page: 'weekly-paper', done: isCheckinDone('weekly-paper', today) });
  const todayDailies = DATA.dailyPapers.filter(p => p.date === today && !p.read);
  if (todayDailies.length > 0)
    tasks.push({ icon: '📰', text: `浏览今日${todayDailies.length}篇文献推送`, page: 'daily-paper', done: false });
  const todayWords = DATA.clinicWords.filter(w => w.date === today).length;
  if (todayWords < 5)
    tasks.push({ icon: '🔤', text: `背诵${5 - todayWords}个学术英语单词`, page: 'clinic-words', done: todayWords >= 5 });
  const weekQuiz = DATA.clinicQuizzes.filter(q => q.week === week && !q.mastered).length;
  if (weekQuiz > 0)
    tasks.push({ icon: '📝', text: `本周还有${weekQuiz}道规培题未掌握`, page: 'clinic-quiz', done: false });
  if (!DATA.clinicGuidelines.some(g => g.week === week))
    tasks.push({ icon: '📋', text: '学习本周临床指南', page: 'clinic-guideline', done: false });
  // 即将到期的投稿返修
  DATA.paperSubmits.forEach(p => {
    if (p.status === 'Major Revision' || p.status === 'Minor Revision') {
      const lastDecision = p.decisions && p.decisions[p.decisions.length - 1];
      if (lastDecision) {
        const daysSince = Math.floor((Date.now() - new Date(lastDecision.date).getTime()) / 86400000);
        if (daysSince < 90)
          tasks.push({ icon: '📮', text: `返修中: ${p.title.substring(0, 30)}...`, page: 'paper-submit', done: false, urgent: daysSince > 60 });
      }
    }
  });
  // 即将到期的论文截止
  DATA.paperWritings.forEach(p => {
    if (p.deadline && p.status !== '已投稿' && p.status !== '已发表') {
      const daysLeft = Math.floor((new Date(p.deadline) - new Date()) / 86400000);
      if (daysLeft >= 0 && daysLeft <= 30)
        tasks.push({ icon: '✍️', text: `${p.title.substring(0, 25)}... 还剩${daysLeft}天`, page: 'paper-writing', done: false, urgent: daysLeft <= 7 });
    }
  });
  // 用户自定义任务
  DATA.tasks.filter(t => !t.done && (!t.dueDate || t.dueDate <= today)).forEach(t => {
    tasks.push({ icon: '📌', text: t.title, page: t.page || '', done: false, custom: true, id: t.id });
  });
  return tasks;
}

function getWeekGoals() {
  const week = getWeek(new Date());
  return [
    { label: '精读文献', target: DATA.settings?.goals?.weeklyPaper || 1, current: DATA.weeklyPapers.filter(p => p.week === week && p.status === '已精读').length, page: 'weekly-paper', color: 'var(--primary)' },
    { label: '临床指南', target: DATA.settings?.goals?.guideline || 1, current: DATA.clinicGuidelines.filter(g => g.week === week).length, page: 'clinic-guideline', color: 'var(--pink)' },
    { label: '复杂病例', target: DATA.settings?.goals?.case || 1, current: DATA.clinicCases.filter(c => c.week === week).length, page: 'clinic-case', color: 'var(--pink)' },
    { label: '规培刷题', target: DATA.settings?.goals?.quiz || 50, current: DATA.clinicQuizzes.filter(q => q.week === week && q.mastered).length, page: 'clinic-quiz', color: 'var(--pink)' },
    { label: '健身打卡', target: DATA.settings?.goals?.fitness || 2, current: getWeekDates(new Date()).filter(d => DATA.fitness.history[d]).length, page: 'fitness', color: 'var(--green)' },
    { label: '晚间饮食', target: DATA.settings?.goals?.weightFast || 3, current: getWeekDates(new Date()).filter(d => DATA.weight.fastingLog[d]).length, page: 'weight', color: 'var(--green)' }
  ];
}

/* ============== 通用打卡日历 ============== */
function renderCalendar(container, history, opts = {}) {
  // history: {'YYYY-MM-DD': any}
  const cur = opts.currentDate ? new Date(opts.currentDate) : new Date();
  let year = cur.getFullYear();
  let month = cur.getMonth();

  function paint(y, m) {
    const first = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0).getDate();
    const startWday = first.getDay();
    container.innerHTML = '';

    const tool = document.createElement('div');
    tool.className = 'cal-toolbar';
    tool.innerHTML = `
      <button class="cal-prev">‹</button>
      <div class="cal-month">${y}年${m + 1}月</div>
      <button class="cal-next">›</button>
    `;
    container.appendChild(tool);
    tool.querySelector('.cal-prev').onclick = () => paint(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1);
    tool.querySelector('.cal-next').onclick = () => paint(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1);

    const cal = document.createElement('div');
    cal.className = 'calendar';
    ['日','一','二','三','四','五','六'].forEach(d => {
      const h = document.createElement('div');
      h.className = 'cal-head';
      h.textContent = d;
      cal.appendChild(h);
    });
    for (let i = 0; i < startWday; i++) {
      const d = document.createElement('div');
      d.className = 'cal-day muted';
      d.textContent = '';
      cal.appendChild(d);
    }
    const today = todayStr();
    for (let d = 1; d <= lastDay; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cell.textContent = d;
      if (dateStr === today) cell.classList.add('today');
      if (history[dateStr]) cell.classList.add('checked');
      if (opts.onClick) {
        cell.style.cursor = 'pointer';
        cell.onclick = () => opts.onClick(dateStr);
      }
      cal.appendChild(cell);
    }
    container.appendChild(cal);
  }
  paint(year, month);
}

function calcStreak(history) {
  const dates = Object.keys(history).sort();
  if (!dates.length) return 0;
  let streak = 0;
  let cur = new Date();
  while (true) {
    const s = fmtDate(cur);
    if (history[s]) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else break;
  }
  return streak;
}

function calcMonthStats(history, year, month) {
  const m = (month !== undefined) ? month : new Date().getMonth();
  const y = year || new Date().getFullYear();
  let count = 0, total = 0;
  const lastDay = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const s = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    total++;
    if (history[s]) count++;
  }
  return { count, total, rate: total ? Math.round(count / total * 100) : 0 };
}

function renderBarChart(container, data, labels) {
  const max = Math.max(...data, 1);
  container.innerHTML = '<div class="bar-chart"></div><div class="bar-labels"></div>';
  const chart = container.querySelector('.bar-chart');
  const lbls = container.querySelector('.bar-labels');
  data.forEach((v, i) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = (v / max * 100) + '%';
    bar.innerHTML = `<div class="bar-tip">${v}${labels.unit || ''}</div>`;
    chart.appendChild(bar);
    const l = document.createElement('span');
    l.textContent = labels[i] || '';
    lbls.appendChild(l);
  });
}

function renderDonut(container, percent, color) {
  color = color || '#6c5ce7';
  const r = 56, cx = 70, cy = 70, circ = 2 * Math.PI * r;
  const off = circ * (1 - percent / 100);
  container.innerHTML = `
    <div class="donut">
      <svg width="140" height="140">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="12"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="12"
          stroke-dasharray="${circ}" stroke-dashoffset="${off}" stroke-linecap="round"/>
      </svg>
      <div class="donut-text">
        <div class="num">${percent}%</div>
        <div class="lbl">达成率</div>
      </div>
    </div>
  `;
}
