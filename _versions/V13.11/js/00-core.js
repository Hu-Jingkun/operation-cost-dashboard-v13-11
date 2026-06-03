window.V12Dashboard = window.V12Dashboard || {};

const MONTHS = [1, 2, 3, 4, 5];
const MONTH_OPTIONS = [
  { value: "all", label: "累计", short: "累计" },
  ...MONTHS.map((month) => ({ value: String(month), label: `2026年${month}月`, short: `${month}月` })),
];

var V10_DATA = null;
var V92_LEGACY_SNAPSHOT = null;
var V10_COMPAT_DATA = null;

const V11_VERSION = "V12";
const V11_SHARED_DATA_SOURCE = "_data/current";
const V11_SHARED_DATA_FILES = [
  "../../_data/current/data-core.js",
  "../../_data/current/data-views.js",
  "../../_data/current/data-dictionary.js",
  "../../_data/current/data-audit.js",
];
const V11_V20_SHARED_DATA_REFERENCE = {
  checkedMobileVersion: "_versions/V20.2",
  sourceFiles: [
    "../../_data/current/data-core.js",
    "../../_data/current/data-views.js",
    "../../_data/current/data-dictionary.js",
    "../../_data/current/data-audit.js",
  ],
};
const V111_MANAGEMENT_ATTENTION_VIEW_NAME = "VIEW_MANAGEMENT_ATTENTION_PROJECTS";
const V111_MANAGEMENT_ATTENTION_RULE_VERSION = "management_attention_v11_2026-05-20";
const V111_ATTENTION_VIEW_STATUS = {
  primarySource: "",
  usedSharedView: false,
  fallbackUsed: false,
  fallbackWarnings: 0,
  lastTop5: [],
};
let V116_RENDER_ACTION_TYPE = "navigation";
const V116_FILTER_RENDER_ACTIONS = new Set([
  "v116-month-filter",
  "v116-cost-filter",
  "v116-chip-clear",
  "v116-clear-all",
  "compare-tab",
  "map-cluster-toggle",
  "toggle-home-rank",
  "toggle-home-overview",
  "toggle-home-projects",
  "benchmark-select-project",
  "activity-cost-select",
  "toggle-activity-detail-table",
  "activity-filter-month",
  "activity-clear-month",
  "activity-benchmark-select",
  "toggle-activity-cards",
  "toggle-activity-table",
  "toggle-activity-benchmark-table",
  "trend-month",
  "trend-segment",
  "home-trend-month",
  "home-trend-segment",
  "month-category",
  "month-subject",
  "month-reset",
  "month-clear-filter",
  "month-matrix-cell",
  "month-toggle-projects",
  "month-toggle-detail",
  "subject-row",
  "subject-toggle",
  "tree-expand-all",
  "tree-collapse-all",
  "select-record",
  "detail-page",
  "trace-stage",
]);
const V116_DRAWER_RENDER_ACTIONS = new Set(["v116-drawer-open", "v116-drawer-close"]);

function v116SetRenderActionType(type = "navigation") {
  V116_RENDER_ACTION_TYPE = type;
}

function v116PrepareRenderAction(action) {
  if (V116_DRAWER_RENDER_ACTIONS.has(action)) {
    v116SetRenderActionType("drawer");
    return;
  }
  if (V116_FILTER_RENDER_ACTIONS.has(action)) {
    v116SetRenderActionType("filter");
    return;
  }
  v116SetRenderActionType("navigation");
}
const V112_EXPECTED_CURRENT_METRICS = {
  factRows: 9323,
  companyAnnualBudgetWan: 24098.86,
  janMayCostWan: 8199.38,
  mayCostWan: 1811.56,
  januaryCostWan: 1471.63,
  januaryActivityCostWan: 1076.37,
  shijiazhuangCostWan: 2357.03,
  liuzhouExhibitionCostWan: 1125.29,
  dayeSampleWan: 10.2,
  fixedCostWan: 1388.06,
  variableCostWan: 6108.73,
  managementCostWan: 702.58,
  annualBudgetRateText: "34.0%",
  sequenceBudgetRateText: "94.0%",
  top5ProjectIds: ["zmd", "sjz", "lzhz", "liuti", "langfang"],
};
const V112_LEGACY_BAD_TOKENS = ["11,205.2", "11205.2", "2,325.4", "2325.4", "4,860.6", "4860.6", "4,496.9", "4496.9", "1,847.7", "1847.7", "46.5%"];
const V112_HARDLOCK_STATUS = {
  sharedLoaded: false,
  source: "",
  blocked: false,
  fallbackTriggered: false,
  error: "",
};

const MAIN_CLASS = {
  固定成本: "fixed",
  变动成本: "variable",
  管理费用: "manage",
};

const PROJECTS = [
  { id: "sjz", code: "SJZ", shortName: "石家庄", fullName: "石家庄国展", scale: 1880000, province: "河北" },
  { id: "zmd", code: "ZMD", shortName: "驻马店", fullName: "驻马店国展", scale: 860000, province: "河南" },
  { id: "lzhz", code: "LZHZ", shortName: "柳州会展", fullName: "柳州会展", scale: 1640000, province: "广西" },
  { id: "lzwh", code: "LZWH", shortName: "柳州文化", fullName: "柳州文化", scale: 760000, province: "广西" },
  { id: "lzsd", code: "LZSD", shortName: "柳州湿地", fullName: "柳州湿地", scale: 520000, province: "广西" },
  { id: "lzlib", code: "LZTSG", shortName: "柳州图书馆", fullName: "柳州图书馆", scale: 470000, province: "广西" },
  { id: "zhashan", code: "ZS", shortName: "奓山", fullName: "奓山还建房", scale: 680000, province: "湖北" },
  { id: "ezhou", code: "EZ", shortName: "鄂州", fullName: "鄂州会展", scale: 980000, province: "湖北" },
  { id: "weifang", code: "WF", shortName: "潍坊", fullName: "潍坊会展", scale: 1120000, province: "山东" },
  { id: "langfang", code: "LF", shortName: "廊坊", fullName: "廊坊临空会展", scale: 1430000, province: "河北" },
  { id: "liuti", code: "LT", shortName: "柳体", fullName: "柳州市体育中心", scale: 1780000, province: "广西" },
  { id: "yunqi", code: "YQ", shortName: "云栖", fullName: "云栖小镇", scale: 1240000, province: "浙江" },
  { id: "jingzhou", code: "JZ", shortName: "荆州", fullName: "荆州项目", scale: 360000, province: "湖北" },
  { id: "daye", code: "DYXSD", shortName: "大冶", fullName: "大冶新时代文明实践综合体运营项目", scale: 420000, province: "湖北" },
];

const MAP_POINTS = [
  { id: "shijiazhuang", label: "石家庄", type: "single", projectId: "sjz", x: 59.8, y: 42.0, size: "large", showLabel: true, useLeaderLine: false, labelOffsetX: -54, labelOffsetY: -30, tooltip: "tooltip-right" },
  { id: "langfang", label: "廊坊", type: "single", projectId: "langfang", x: 63.4, y: 38.3, size: "medium", showLabel: true, useLeaderLine: false, labelOffsetX: 36, labelOffsetY: -24, tooltip: "tooltip-below" },
  { id: "weifang", label: "潍坊", type: "single", projectId: "weifang", x: 67.3, y: 45.7, size: "medium", showLabel: true, useLeaderLine: false, labelOffsetX: 36, labelOffsetY: 4, tooltip: "tooltip-left" },
  { id: "zhumadian", label: "驻马店", type: "single", projectId: "zmd", x: 57.1, y: 56.9, size: "medium", showLabel: true, useLeaderLine: false, labelOffsetX: -50, labelOffsetY: -18, tooltip: "tooltip-right" },
  { id: "hubeiCluster", label: "湖北项目群", type: "cluster", projectIds: ["ezhou", "jingzhou", "zhashan", "daye"], x: 58.9, y: 64.4, size: "large", useLeaderLine: true, labelOffsetX: -66, labelOffsetY: 14, tooltip: "tooltip-right tooltip-clamp-mid" },
  { id: "yunqi", label: "云栖", type: "single", projectId: "yunqi", x: 69.7, y: 68.0, size: "medium", showLabel: true, useLeaderLine: false, labelOffsetX: 36, labelOffsetY: 22, tooltip: "tooltip-left" },
  { id: "liuzhouCluster", label: "柳州项目群", type: "cluster", projectIds: ["lzhz", "lzwh", "lzsd", "lzlib", "liuti"], x: 49.4, y: 75.5, size: "large", useLeaderLine: true, labelOffsetX: -70, labelOffsetY: 18, tooltip: "tooltip-right tooltip-clamp-low" },
];

const BUDGET_BASELINE_2026 = {
  sourceFile: "_reference_activity_costs/运营业务2026年预算调整0416.xlsx",
  sheetName: "2026年运营业务年度预算",
  sourceColumn: "20260415调整版-预计成本",
  unit: "万元",
  companyAnnualCostBudgetWan: 24098.86,
  sourceValidation: {
    fileExists: true,
    sheetFound: true,
    projectNameColumn: "B",
    costBudgetColumn: "AC",
    readTotalWan: 24098.86,
    toleranceWan: 0.1,
    validatedAt: "2026-05-17",
  },
  projects: {
    lzhz: { projectName: "柳州会展", budgetName: "柳州会展", annualCostBudgetWan: 3221.28 },
    lzwh: { projectName: "柳州文化", budgetName: "柳州文化", annualCostBudgetWan: 1268.23 },
    lzlib: { projectName: "柳州图书馆", budgetName: "柳州图书馆", annualCostBudgetWan: 750 },
    lzsd: { projectName: "柳州湿地", budgetName: "柳州湿地", annualCostBudgetWan: 1025.2 },
    liuti: { projectName: "柳体", budgetName: "柳州市体育中心", annualCostBudgetWan: 2156 },
    ezhou: { projectName: "鄂州", budgetName: "鄂州三中心", annualCostBudgetWan: 1088.01 },
    zhashan: { projectName: "奓山", budgetName: "奓山还建房", annualCostBudgetWan: 1048.84 },
    yunqi: { projectName: "云栖", budgetName: "云栖小镇", annualCostBudgetWan: 1121.06 },
    langfang: { projectName: "廊坊", budgetName: "廊坊临空会展", annualCostBudgetWan: 1367.76 },
    weifang: { projectName: "潍坊", budgetName: "潍坊鲁台会展", annualCostBudgetWan: 666 },
    zmd: { projectName: "驻马店", budgetName: "驻马店国展", annualCostBudgetWan: 2602.48 },
    sjz: { projectName: "石家庄", budgetName: "石家庄国展", annualCostBudgetWan: 6644 },
    jingzhou: { projectName: "荆州", budgetName: "荆州", annualCostBudgetWan: 1140 },
  },
};

const PROJECT_BUDGET_MAPPING = {
  "柳州会展": "lzhz",
  "柳州文化": "lzwh",
  "柳州图书馆": "lzlib",
  "柳州湿地": "lzsd",
  "柳州市体育中心": "liuti",
  "鄂州三中心": "ezhou",
  "奓山还建房": "zhashan",
  "云栖小镇": "yunqi",
  "廊坊临空会展": "langfang",
  "潍坊鲁台会展": "weifang",
  "驻马店国展": "zmd",
  "石家庄国展": "sjz",
  "荆州": "jingzhou",
};

const PROJECT_BUDGETS = Object.fromEntries(Object.entries(BUDGET_BASELINE_2026.projects).map(([projectId, budget]) => [projectId, {
  projectId,
  projectName: budget.projectName,
  budgetName: budget.budgetName,
  annualBudgetWan: budget.annualCostBudgetWan,
  budgetStatus: "baseline_confirmed",
  displayStatus: "预算基准已确认",
}]));

const COMPANY_BUDGET = {
  name: "合计",
  annualBudgetWan: BUDGET_BASELINE_2026.companyAnnualCostBudgetWan,
};

const MONTH_BUDGET_WEIGHTS = [
  { month: 1, label: "1月", percent: 6.5, weight: 0.065 },
  { month: 2, label: "2月", percent: 6.0, weight: 0.06 },
  { month: 3, label: "3月", percent: 7.5, weight: 0.075 },
  { month: 4, label: "4月", percent: 8.2, weight: 0.082 },
  { month: 5, label: "5月", percent: 8.0, weight: 0.08 },
  { month: 6, label: "6月", percent: 8.5, weight: 0.085 },
  { month: 7, label: "7月", percent: 8.0, weight: 0.08 },
  { month: 8, label: "8月", percent: 8.0, weight: 0.08 },
  { month: 9, label: "9月", percent: 8.5, weight: 0.085 },
  { month: 10, label: "10月", percent: 9.5, weight: 0.095 },
  { month: 11, label: "11月", percent: 9.5, weight: 0.095 },
  { month: 12, label: "12月", percent: 11.8, weight: 0.118 },
];

const COST_SUBJECT_TREE = createCostSubjectTree([
  {
    id: "fixed",
    name: "固定成本",
    description: "归集项目日常运营中相对稳定、持续发生的基础运行成本。",
    collectType: "混合归集",
    children: [
      { id: "fixed-labor", name: "人工成本", description: "自有人员、外包人力和日常岗位人员相关成本。", collectType: "直接归集" },
      { id: "fixed-material-equipment", name: "材料设备成本", description: "日常运营耗材、安防耗材、办公及运营设备相关成本。", collectType: "直接归集" },
      { id: "fixed-facility-maintenance", name: "设备及设施维护成本", description: "场馆设备、机电系统和基础设施维保维修成本。", collectType: "直接归集" },
      { id: "fixed-daily-venue", name: "场馆运行成本（日常运营）", description: "日常开放、基础物业、安保保洁和能源保障成本。", collectType: "混合归集" },
      { id: "fixed-sharing", name: "分成成本", description: "停车、商业配套、合作运营等持续经营分成成本。", collectType: "直接归集" },
      { id: "fixed-tax-finance", name: "财税成本", description: "税费缴纳、银行服务、保函及财税服务成本。", collectType: "直接归集" },
      { id: "fixed-other", name: "其他成本", description: "低值易耗、零星修缮、保险保障等其他固定成本。", collectType: "混合归集" },
    ],
  },
  {
    id: "variable",
    name: "变动成本",
    description: "归集随展会、会议、赛事和活动开展而变化的专项成本。",
    collectType: "混合归集",
    children: [
      { id: "variable-labor", name: "人工成本", description: "活动临勤、接待引导、展会服务等临时人员成本。", collectType: "直接归集" },
      { id: "variable-material-equipment", name: "材料设备成本", description: "活动物料、音响灯光、网络设备和临时设施成本。", collectType: "直接归集" },
      { id: "variable-planning", name: "活动策划成本", description: "活动方案、现场执行、导演统筹和氛围布置成本。", collectType: "直接归集" },
      { id: "variable-audience-invitation", name: "观众邀请成本", description: "客群邀请、定向邀约、嘉宾接待和活动引流成本。", collectType: "直接归集" },
      { id: "variable-onsite-service", name: "现场服务成本", description: "搭建执行、主场服务、秩序维护和现场保障成本。", collectType: "直接归集" },
      { id: "variable-event-venue", name: "场馆运行成本（活动期间）", description: "活动期间临时用电、空调用能、加班物业和夜间安保成本。", collectType: "混合归集" },
      { id: "variable-catering", name: "餐饮成本", description: "工作餐、茶歇、嘉宾餐饮和人员餐饮保障成本。", collectType: "直接归集" },
      { id: "variable-sharing", name: "分成成本", description: "票务、招商、平台服务和资源合作形成的活动分成成本。", collectType: "直接归集" },
      { id: "variable-other", name: "其他成本", description: "现场零星采购、应急服务、运输仓储和杂项活动成本。", collectType: "混合归集" },
    ],
  },
  {
    id: "manage",
    name: "管理费用",
    description: "归集项目经营管理、销售拓展、办公支持和专业服务费用。",
    collectType: "混合归集",
    children: [
      { id: "manage-industry-dues", name: "行业会费", description: "协会会费、行业会议、会员服务和资料费用。", collectType: "直接归集" },
      { id: "manage-sales-business", name: "销售业务费", description: "客户拜访、渠道维护、商务接待和销售支持费用。", collectType: "直接归集" },
      { id: "manage-sales-expense", name: "销售费用", description: "销售拓展、客源开发、渠道推广和销售工具费用。", collectType: "直接归集" },
      { id: "manage-promo-materials", name: "宣传物料费", description: "宣传物料设计、制作、印刷和现场宣传布置费用。", collectType: "直接归集" },
      { id: "manage-promotion", name: "宣传推广费", description: "媒体投放、活动传播、品牌推广和专题宣传费用。", collectType: "直接归集" },
      { id: "manage-photo-video", name: "摄影摄像费", description: "现场摄影、影像采集、视频制作和图片服务费用。", collectType: "直接归集" },
      { id: "manage-online-development", name: "线上应用开发", description: "线上系统、数字化服务和应用开发支持费用。", collectType: "直接归集" },
      { id: "manage-compensation", name: "职工薪酬", description: "管理团队工资薪金、福利补贴和社保公积金费用。", collectType: "分摊归集" },
      { id: "manage-office", name: "办公费", description: "办公用品、通讯服务、低值耗材和日常办公支持费用。", collectType: "直接归集" },
      { id: "manage-travel-transport", name: "差旅交通费", description: "住宿、城际交通、市内交通和车辆租赁费用。", collectType: "直接归集" },
      { id: "manage-business-reception", name: "业务招待费", description: "客户接待、商务洽谈和业务餐叙相关费用。", collectType: "直接归集" },
      { id: "manage-agency", name: "中介机构费", description: "审计、咨询、法律、招标代理和专业服务费用。", collectType: "直接归集" },
      { id: "manage-rent", name: "房屋租赁费", description: "项目办公、仓储、临时场地和配套房屋租赁费用。", collectType: "直接归集" },
      { id: "manage-other", name: "其他费用", description: "除明确管理费用科目外的其他经营管理支出。", collectType: "混合归集" },
    ],
  },
]);

const TAXONOMY = [
  {
    name: "固定成本",
    children: [
      {
        name: "人工成本",
        children: [
          { name: "自有人员薪酬", children: ["基本薪酬", "社保公积金", "岗位津贴"] },
          { name: "外包人力服务", children: ["物业人员服务", "临勤人员服务"] },
        ],
      },
      {
        name: "材料设备成本",
        children: [
          { name: "基础耗材", children: ["保洁耗材", "安防耗材"] },
          { name: "运营设备", children: ["办公设备租赁", "工具器具"] },
        ],
      },
      {
        name: "设备及设施维护成本",
        children: [
          { name: "设备维保", children: ["电梯维保", "空调维保", "消防维保"] },
          { name: "设施维修", children: ["照明维修", "管网维修"] },
        ],
      },
      {
        name: "场馆运行成本（日常运营）",
        children: [
          { name: "能耗费用", children: ["水电费", "燃气费"] },
          { name: "日常物业运行", children: ["保洁服务", "安保服务"] },
        ],
      },
      {
        name: "分成成本",
        children: [
          { name: "场地经营分成", children: ["停车分成", "商业配套分成"] },
          { name: "合作运营分成", children: ["品牌合作分成", "票务服务分成"] },
        ],
      },
      {
        name: "财税成本",
        children: [
          { name: "税费缴纳", children: ["增值税附加", "印花税"] },
          { name: "财务服务", children: ["银行手续费", "保函服务费"] },
        ],
      },
      {
        name: "其他成本",
        children: [
          { name: "综合支持", children: ["低值易耗品", "零星修缮"] },
          { name: "保险保障", children: ["公众责任险", "财产保险"] },
        ],
      },
    ],
  },
  {
    name: "变动成本",
    children: [
      {
        name: "人工成本",
        children: [
          { name: "活动临勤人员", children: ["临时安保", "临时保洁"] },
          { name: "展会服务人员", children: ["接待人员", "引导人员"] },
        ],
      },
      {
        name: "材料设备成本",
        children: [
          { name: "活动物料", children: ["证件胸牌", "指示标识"] },
          { name: "设备租赁", children: ["音响灯光", "网络设备"] },
        ],
      },
      {
        name: "活动策划成本",
        children: [
          { name: "方案策划", children: ["活动方案", "嘉宾流程"] },
          { name: "现场执行", children: ["导演统筹", "彩排保障"] },
        ],
      },
      {
        name: "观众邀请成本",
        children: [
          { name: "客群邀请", children: ["定向邀约", "社群通知"] },
          { name: "嘉宾接待", children: ["嘉宾邀请", "交通接驳"] },
        ],
      },
      {
        name: "现场服务成本",
        children: [
          { name: "搭建执行", children: ["标准展位搭建", "主场服务"] },
          { name: "现场保障", children: ["秩序维护", "现场清洁"] },
        ],
      },
      {
        name: "场馆运行成本（活动期间）",
        children: [
          { name: "活动能耗", children: ["临时用电", "空调用能"] },
          { name: "现场运行", children: ["加班物业", "夜间安保"] },
        ],
      },
      {
        name: "餐饮成本",
        children: [
          { name: "工作餐", children: ["人员餐饮", "嘉宾餐饮"] },
          { name: "茶歇保障", children: ["会议茶歇", "饮用水"] },
        ],
      },
      {
        name: "分成成本",
        children: [
          { name: "活动合作分成", children: ["票务分成", "招商分成"] },
          { name: "服务商分成", children: ["平台服务分成", "资源合作分成"] },
        ],
      },
      {
        name: "其他成本",
        children: [
          { name: "现场杂项", children: ["临时采购", "应急服务"] },
          { name: "运输仓储", children: ["短驳运输", "仓储管理"] },
        ],
      },
    ],
  },
  {
    name: "管理费用",
    children: [
      {
        name: "行业会费",
        children: [
          { name: "协会会费", children: ["会籍费", "年度服务费"] },
          { name: "行业会议", children: ["参会费", "资料费"] },
        ],
      },
      {
        name: "销售业务费",
        children: [
          { name: "客户拜访", children: ["商务接待", "客户沟通"] },
          { name: "渠道维护", children: ["渠道服务", "客户资料"] },
        ],
      },
      {
        name: "销售费用",
        children: [
          { name: "销售推广", children: ["客源拓展", "渠道推广"] },
          { name: "销售支持", children: ["销售工具", "客户活动"] },
        ],
      },
      {
        name: "宣传物料费",
        children: [
          { name: "物料制作", children: ["海报画册", "展架展板"] },
          { name: "印刷服务", children: ["宣传单页", "指南手册"] },
        ],
      },
      {
        name: "宣传推广费",
        children: [
          { name: "媒体推广", children: ["新媒体投放", "户外宣传"] },
          { name: "品牌传播", children: ["专题报道", "活动传播"] },
        ],
      },
      {
        name: "摄影摄像费",
        children: [
          { name: "影像采集", children: ["现场摄影", "视频拍摄"] },
          { name: "后期制作", children: ["剪辑包装", "图片精修"] },
        ],
      },
      {
        name: "线上应用开发",
        children: [
          { name: "系统开发", children: ["小程序开发", "页面维护"] },
          { name: "云资源服务", children: ["短信服务", "云服务器"] },
        ],
      },
      {
        name: "职工薪酬",
        children: [
          { name: "管理人员薪酬", children: ["工资薪金", "福利补贴"] },
          { name: "社保福利", children: ["社保公积金", "工会经费"] },
        ],
      },
      {
        name: "办公费",
        children: [
          { name: "办公耗材", children: ["办公用品", "打印耗材"] },
          { name: "通讯服务", children: ["电话网络", "软件订阅"] },
        ],
      },
      {
        name: "差旅交通费",
        children: [
          { name: "差旅费用", children: ["住宿费", "城际交通"] },
          { name: "市内交通", children: ["车辆租赁", "打车费用"] },
        ],
      },
      {
        name: "业务招待费",
        children: [
          { name: "商务宴请", children: ["客户宴请", "工作餐叙"] },
          { name: "接待用品", children: ["茶品饮品", "礼品物料"] },
        ],
      },
      {
        name: "中介机构费",
        children: [
          { name: "审计咨询", children: ["专项咨询", "审计服务"] },
          { name: "法律服务", children: ["合同审查", "法律顾问"] },
        ],
      },
      {
        name: "房屋租赁费",
        children: [
          { name: "办公租赁", children: ["办公房租", "物业管理"] },
          { name: "仓储租赁", children: ["仓储场地", "临时用房"] },
        ],
      },
      {
        name: "其他费用",
        children: [
          { name: "综合杂费", children: ["证照年检", "快递邮寄"] },
          { name: "培训学习", children: ["员工培训", "资料采购"] },
        ],
      },
    ],
  },
];

const L1_WEIGHTS = {
  固定成本: {
    人工成本: 0.28,
    材料设备成本: 0.11,
    设备及设施维护成本: 0.17,
    "场馆运行成本（日常运营）": 0.22,
    分成成本: 0.06,
    财税成本: 0.09,
    其他成本: 0.07,
  },
  变动成本: {
    人工成本: 0.16,
    材料设备成本: 0.13,
    活动策划成本: 0.12,
    观众邀请成本: 0.08,
    现场服务成本: 0.19,
    "场馆运行成本（活动期间）": 0.13,
    餐饮成本: 0.08,
    分成成本: 0.07,
    其他成本: 0.04,
  },
  管理费用: {
    行业会费: 0.035,
    销售业务费: 0.07,
    销售费用: 0.09,
    宣传物料费: 0.055,
    宣传推广费: 0.095,
    摄影摄像费: 0.045,
    线上应用开发: 0.075,
    职工薪酬: 0.22,
    办公费: 0.07,
    差旅交通费: 0.06,
    业务招待费: 0.055,
    中介机构费: 0.055,
    房屋租赁费: 0.055,
    其他费用: 0.025,
  },
};

const SUBJECT_DESCRIPTIONS = {
  全部成本: {
    scope: "汇总当前项目在所选月份范围内的全部运营成本，用于从公司总览进入项目、月份、科目和NC台账的完整穿透。",
    examples: "固定成本、变动成本、管理费用及其下级科目。",
  },
  固定成本: {
    scope: "用于归集项目日常运营中相对稳定、持续发生的成本支出，体现项目基础运行成本水平。",
    examples: "人员薪酬、基础物业、设施维保、日常能耗、财税服务等。",
  },
  变动成本: {
    scope: "用于归集随展会、会议、赛事、活动开展而变化的专项成本支出。",
    examples: "活动临勤、现场服务、搭建执行、活动能耗、餐饮保障等。",
  },
  管理费用: {
    scope: "用于归集项目经营管理、销售拓展、办公支持和专业服务等管理类费用。",
    examples: "销售费用、宣传推广、职工薪酬、办公费、差旅交通费、中介机构费等。",
  },
  人工成本: {
    scope: "用于归集项目日常运营中与固定人员、外包人员、临勤人员相关的成本支出。",
    examples: "自有人员薪酬、外包人力服务、临时安保、临时保洁、接待引导人员等。",
  },
  "场馆运行成本（日常运营）": {
    scope: "用于归集场馆日常开放和基础运行过程中发生的能耗、保洁、安保、日常保障等成本。",
    examples: "水电费、燃气费、保洁服务、安保服务、日常物业运行等。",
  },
  "场馆运行成本（活动期间）": {
    scope: "用于归集活动期间因开放时间、现场人流和服务强度变化形成的运行成本。",
    examples: "临时用电、空调用能、加班物业、夜间安保、现场运行保障等。",
  },
  现场服务成本: {
    scope: "用于归集展会、会议、赛事、活动期间因搭建、接驳、现场保障、临时服务发生的专项成本。",
    examples: "标准展位搭建、主场服务、秩序维护、现场清洁、临时保障服务等。",
  },
  宣传推广费: {
    scope: "用于归集项目宣传推广、媒体投放、活动传播、品牌推广等费用。",
    examples: "新媒体投放、户外宣传、专题报道、活动传播、品牌推广等。",
  },
  销售费用: {
    scope: "作为管理费用下的子科目，归集销售拓展、渠道维护、客源开发等相关支出。",
    examples: "客源拓展、渠道推广、销售工具、客户活动、销售支持等。",
  },
  材料设备成本: {
    scope: "用于归集项目运营及活动执行中发生的材料、耗材、设备租赁和工具器具成本。",
    examples: "保洁耗材、安防耗材、活动物料、音响灯光、网络设备等。",
  },
  设备及设施维护成本: {
    scope: "用于归集场馆设备、机电系统和基础设施的定期维保及维修支出。",
    examples: "电梯维保、空调维保、消防维保、照明维修、管网维修等。",
  },
  宣传物料费: {
    scope: "用于归集宣传物料设计、制作、印刷和现场布置所发生的费用。",
    examples: "海报画册、展架展板、宣传单页、指南手册等。",
  },
  职工薪酬: {
    scope: "用于归集项目管理团队薪酬、福利补贴及社保福利等人员相关管理费用。",
    examples: "工资薪金、福利补贴、社保公积金、工会经费等。",
  },
  办公费: {
    scope: "用于归集项目日常办公支持、通讯服务、低值办公耗材等费用。",
    examples: "办公用品、打印耗材、电话网络、软件订阅等。",
  },
  差旅交通费: {
    scope: "用于归集项目经营管理和业务推进过程中发生的差旅及交通费用。",
    examples: "住宿费、城际交通、市内交通、车辆租赁等。",
  },
  中介机构费: {
    scope: "用于归集项目经营所需的审计、咨询、法律等专业机构服务费用。",
    examples: "专项咨询、审计服务、合同审查、法律顾问等。",
  },
};

const CATEGORY_BASE_SHARE = {
  固定成本: 0.48,
  变动成本: 0.33,
  管理费用: 0.19,
};

const PROJECT_GROUPS = {
  PPP项目: ["sjz", "zmd", "lzhz", "liuti", "langfang", "weifang", "ezhou"],
  轻资产项目: ["lzwh", "lzsd", "lzlib", "zhashan", "yunqi", "jingzhou", "daye"],
};

const BENCHMARK_ITEMS = [
  {
    id: "security",
    name: "保安服务",
    main: "固定成本",
    parent: "场馆运行成本（日常运营）",
    subjectKey: "固定成本|场馆运行成本（日常运营）|日常物业运行|安保服务",
    scene: "日常运营",
    activityType: "日常运营",
    measureName: "服务岗次",
    icon: "shield",
    base: 76000,
  },
  {
    id: "cleaning",
    name: "保洁服务",
    main: "固定成本",
    parent: "场馆运行成本（日常运营）",
    subjectKey: "固定成本|场馆运行成本（日常运营）|日常物业运行|保洁服务",
    scene: "日常运营",
    activityType: "日常运营",
    measureName: "服务面积",
    icon: "broom",
    base: 62000,
  },
  {
    id: "maintenance",
    name: "设备维保",
    main: "固定成本",
    parent: "设备及设施维护成本",
    subjectKey: "固定成本|设备及设施维护成本|设备维保|空调维保",
    scene: "日常运营",
    activityType: "日常运营",
    measureName: "维保点位",
    icon: "wrench",
    base: 68000,
  },
  {
    id: "booth",
    name: "特装搭建",
    main: "变动成本",
    parent: "现场服务成本",
    subjectKey: "变动成本|现场服务成本|搭建执行|标准展位搭建",
    scene: "展会活动",
    activityType: "展会活动",
    measureName: "搭建面积",
    icon: "build",
    base: 118000,
  },
  {
    id: "materials",
    name: "活动物资",
    main: "变动成本",
    parent: "材料设备成本",
    subjectKey: "变动成本|材料设备成本|活动物料|指示标识",
    scene: "展会活动",
    activityType: "展会活动",
    measureName: "物资批次",
    icon: "box",
    base: 54000,
  },
  {
    id: "catering",
    name: "餐饮服务",
    main: "变动成本",
    parent: "餐饮成本",
    subjectKey: "变动成本|餐饮成本|工作餐|人员餐饮",
    scene: "培训会议",
    activityType: "会议保障",
    measureName: "餐饮人次",
    icon: "utensils",
    base: 42000,
  },
  {
    id: "temporary",
    name: "现场服务 / 临时用工",
    main: "变动成本",
    parent: "现场服务成本",
    subjectKey: "变动成本|现场服务成本|现场保障|秩序维护",
    scene: "展会活动",
    activityType: "现场保障",
    measureName: "临勤人次",
    icon: "people",
    base: 72000,
  },
  {
    id: "promotion",
    name: "宣传推广",
    main: "管理费用",
    parent: "宣传推广费",
    subjectKey: "管理费用|宣传推广费|媒体推广|新媒体投放",
    scene: "展会活动",
    activityType: "宣传推广",
    measureName: "推广批次",
    icon: "megaphone",
    base: 50000,
  },
];

const BENCHMARK_ITEM_BY_NAME = Object.fromEntries(BENCHMARK_ITEMS.map((item) => [item.name, item]));

const HOME_KEY_COST_CANDIDATES = [
  "保安服务",
  "保洁服务",
  "标准搭建",
  "地毯铺设",
  "餐饮服务",
  "电力接驳",
  "广告物料",
  "设备租赁",
  "垃圾清运",
  "临勤服务",
];

const HOME_KEY_COST_DISPLAY_LIMIT = 6;

const HOME_KEY_COST_ITEM_ICONS = {
  保安服务: "shield",
  保洁服务: "broom",
  标准搭建: "build",
  地毯铺设: "box",
  餐饮服务: "utensils",
  电力接驳: "lock",
  广告物料: "megaphone",
  设备租赁: "wrench",
  垃圾清运: "box",
  临勤服务: "people",
};

const SUPPLIER_BANK = {
  物业: ["华展物业服务有限公司", "中联城市物业服务有限公司", "诚安物业管理有限公司"],
  安保: ["国盾安保服务有限公司", "鼎安安保服务有限公司", "中城安全服务有限公司"],
  会展: ["博远会展服务有限公司", "合创会展运营有限公司", "嘉汇活动服务有限公司"],
  广告: ["方正广告传媒有限公司", "蓝海文化传播有限公司", "启明广告传媒有限公司"],
  设备: ["恒达设备维保有限公司", "瑞通设施工程有限公司", "中维机电服务有限公司"],
  餐饮: ["悦享餐饮服务有限公司", "和膳餐饮管理有限公司", "臻味餐饮服务有限公司"],
  人力: ["汇才人力资源服务有限公司", "联达人力资源服务有限公司", "众合劳务服务有限公司"],
  科技: ["云图信息科技有限公司", "数联应用开发有限公司", "智汇云科技有限公司"],
  财务: ["信和财务咨询有限公司", "中审咨询服务有限公司", "正衡税务服务有限公司"],
  法务: ["明德法律咨询有限公司", "华信法律服务有限公司", "中诚咨询服务有限公司"],
  物料: ["聚彩图文制作有限公司", "盛世印务有限公司", "宏博物料供应有限公司"],
  租赁: ["安捷设备租赁有限公司", "鼎盛场地服务有限公司", "通达车辆租赁有限公司"],
};

const CONTRACT_BY_SUBJECT = [
  { test: "人工", name: "2026年度人力服务合同", supplier: "人力" },
  { test: "物业", name: "2026年度物业服务合同", supplier: "物业" },
  { test: "安保", name: "场馆安保服务合同", supplier: "安保" },
  { test: "保洁", name: "场馆保洁服务合同", supplier: "物业" },
  { test: "设备", name: "设备维修维保合同", supplier: "设备" },
  { test: "设施", name: "设施维修服务合同", supplier: "设备" },
  { test: "活动", name: "活动策划执行合同", supplier: "会展" },
  { test: "现场", name: "展会现场服务合同", supplier: "会展" },
  { test: "搭建", name: "活动搭建服务合同", supplier: "会展" },
  { test: "宣传", name: "宣传推广服务合同", supplier: "广告" },
  { test: "销售", name: "销售推广服务合同", supplier: "广告" },
  { test: "摄影", name: "摄影摄像服务合同", supplier: "广告" },
  { test: "餐饮", name: "餐饮保障服务合同", supplier: "餐饮" },
  { test: "线上", name: "线上应用开发服务合同", supplier: "科技" },
  { test: "系统", name: "线上应用开发服务合同", supplier: "科技" },
  { test: "财", name: "财税咨询服务合同", supplier: "财务" },
  { test: "税", name: "财税咨询服务合同", supplier: "财务" },
  { test: "法律", name: "法律咨询服务合同", supplier: "法务" },
  { test: "租赁", name: "场地及设备租赁合同", supplier: "租赁" },
  { test: "物料", name: "宣传物料制作合同", supplier: "物料" },
];

const app = document.getElementById("app");
const subjectIndex = {};
const flatSubjects = [];
let RECORDS = [];
let DETAIL_RECORDS = [];
let ACTIVITIES = [];
let ACTIVITY_RECORDS = [];
let ACTIVITY_COST_SUBJECTS = [];
let UNIT_COST_ITEMS = [];

const state = {
  view: "home",
  projectId: "sjz",
  month: "all",
  scope: "all",
  search: "",
  selectedSubjectKey: "",
  homeRankExpanded: false,
  homeOverviewExpanded: false,
  homeProjectsExpanded: false,
  mapOpenCluster: "",
  monthCategoryFilter: "all",
  monthSubjectKey: "",
  monthProjectFilter: "",
  monthProjectsExpanded: false,
  monthDetailVisible: false,
  monthDetailExpanded: false,
  compareTab: "overall",
  benchmark: {
    item: "保安服务",
    month: "all",
    projectScope: "全部项目",
    scene: "全部",
    unit: "全部单位",
    metric: "单价",
    splitFilter: "全部",
    selectedProjectId: "sjz",
    selectedRowKey: "",
  },
  expandedKeys: new Set(),
  detail: {
    projectId: "sjz",
    month: "all",
    subjectKey: "",
    benchmarkItem: "",
    query: "",
    sort: "desc",
    page: 1,
    selectedId: "",
    activityId: "",
    activityCostItem: "",
    unitBenchmarkName: "",
    unitBenchmarkUnit: "",
    ncRecordIds: [],
    returnView: "project",
    traceStage: "project",
  },
  activity: {
    projectId: "all",
    month: "5",
    type: "全部",
    costItem: "全部",
    metric: "活动总成本",
    cardsExpanded: false,
    tableExpanded: false,
  },
  activityDetail: {
    activityId: "",
    selectedCostItem: "",
    costTableExpanded: false,
    returnView: "activity",
  },
  activityBenchmark: {
    type: "全部",
    month: "all",
    projectScope: "全部项目",
    costItem: "全部",
    metric: "活动总成本",
    selectedActivityId: "",
    tableExpanded: false,
  },
};

const V116_INTERACTION_STATE = {
  selectedMonth: "all",
  selectedCostType: "all",
  selectedProjectId: null,
  selectedSubject: null,
  drawerOpen: false,
  drawerContext: null,
};

const V116_MONTH_FILTERS = [
  { value: "all", label: "累计" },
  ...MONTHS.map((month) => ({ value: String(month), label: `${month}月` })),
];
const V116_COST_TYPES = ["all", "固定成本", "变动成本", "管理费用"];

const ATTENTION_TYPE_META = {
  businessHigh: {
    label: "业务活动带动",
    subLabel: "活动成本驱动，待收入端验证",
    display: "业务活动带动",
    className: "attention-high-business",
    priority: 3,
  },
  costHigh: {
    label: "成本效率关注",
    subLabel: "建议穿透科目和单价",
    display: "成本效率关注",
    className: "attention-high-cost",
    priority: 1,
  },
  businessLow: {
    label: "经营节奏偏慢",
    subLabel: "关注后续业务排期",
    display: "经营节奏偏慢",
    className: "attention-low-business",
    priority: 4,
  },
  entryLag: {
    label: "入账完整性关注",
    subLabel: "数据待校准",
    display: "入账完整性关注",
    className: "attention-entry-lag",
    priority: 2,
  },
  normal: {
    label: "正常波动",
    subLabel: "",
    display: "正常波动",
    className: "attention-normal",
    priority: 5,
  },
};

const MANAGEMENT_SIGNAL_META = {
  activity_driven: {
    label: "活动带动型",
    cardTitle: "活动带动型",
    subLabel: "成本较高主要由重点活动集中发生带动",
    className: "attention-high-business",
    priority: 5,
  },
  efficiency_review: {
    label: "成本效率复核型",
    cardTitle: "成本效率复核型",
    subLabel: "单价、工程量、科目结构需要进一步复核",
    className: "attention-high-cost",
    priority: 1,
  },
  slow_pace: {
    label: "经营节奏偏慢型",
    cardTitle: "经营节奏偏慢型",
    subLabel: "结合活动排期或固定成本入账判断",
    className: "attention-low-business",
    priority: 4,
  },
  entry_integrity: {
    label: "入账完整性待确认",
    cardTitle: "入账完整性待确认",
    subLabel: "成本发生、固定成本入账或 NC 明细匹配待确认",
    className: "attention-entry-lag",
    priority: 2,
  },
};

const ATTENTION_SIGNAL_TYPES = [
  { key: "activity_driven", label: "活动带动型", legacyKeys: ["businessHigh", "normal", "成本带动型", "活动带动", "业务活动带动"] },
  { key: "efficiency_review", label: "成本效率复核型", legacyKeys: ["costHigh", "成本效率关注", "成本效率需复核"] },
  { key: "slow_pace", label: "经营节奏偏慢型", legacyKeys: ["businessLow", "经营节奏偏慢"] },
  { key: "entry_integrity", label: "入账完整性待确认", legacyKeys: ["entryLag", "入账完整性关注"] },
];

const TOP_EXPLANATION_PRIORITY = [
  { key: "costHigh", label: "成本效率需复核项目", match: (row) => row.typeKey === "costHigh" },
  { key: "entryLag", label: "入账完整性待确认项目", match: (row) => row.typeKey === "entryLag" },
  { key: "budgetHigh", label: "预算执行偏高项目", match: (row) => row.sequenceBudgetRatio > ATTENTION_THRESHOLDS.HIGH_RATIO },
  { key: "budgetLow", label: "预算执行偏低项目", match: (row) => row.sequenceBudgetRatio < ATTENTION_THRESHOLDS.LOW_RATIO },
  { key: "businessHigh", label: "活动带动明显项目", match: (row) => row.typeKey === "businessHigh" },
  { key: "amountFallback", label: "成本金额靠前兜底", match: () => true },
];

const ATTENTION_THRESHOLDS = {
  HIGH_RATIO: 1.1,
  LOW_RATIO: 0.8,
  ACTIVITY_DRIVEN_RATIO: 0.28,
};



function indexTaxonomy() {
  TAXONOMY.forEach((mainNode) => {
    addSubject(mainNode.name, 0, [mainNode.name], []);
    mainNode.children.forEach((l1Node) => {
      addSubject(l1Node.name, 1, [mainNode.name, l1Node.name], [mainNode.name]);
      l1Node.children.forEach((l2Node) => {
        addSubject(l2Node.name, 2, [mainNode.name, l1Node.name, l2Node.name], [mainNode.name, `${mainNode.name}|${l1Node.name}`]);
        l2Node.children.forEach((l3Name) => {
          addSubject(l3Name, 3, [mainNode.name, l1Node.name, l2Node.name, l3Name], [
            mainNode.name,
            `${mainNode.name}|${l1Node.name}`,
            `${mainNode.name}|${l1Node.name}|${l2Node.name}`,
          ]);
        });
      });
    });
  });
}

function addSubject(name, level, path, ancestors) {
  const key = path.join("|");
  const item = {
    key,
    name,
    level,
    path,
    main: path[0],
    l1: path[1] || "",
    l2: path[2] || "",
    l3: path[3] || "",
    ancestors,
    pathText: path.join("-"),
    type: ["主类", "一级科目", "二级科目", "三级科目"][level],
  };
  subjectIndex[key] = item;
  flatSubjects.push(item);
}

function createCostSubjectTree(definitions) {
  return definitions.flatMap((category) => {
    const root = {
      id: category.id,
      name: category.name,
      level: 0,
      parentId: "",
      category: category.name,
      description: category.description,
      collectType: category.collectType,
    };
    const children = category.children.map((child) => ({
      id: child.id,
      name: child.name,
      level: 1,
      parentId: category.id,
      category: category.name,
      description: child.description,
      collectType: child.collectType,
    }));
    return [root, ...children];
  });
}

function annualBudgetYuan(projectId) {
  const budget = PROJECT_BUDGETS[projectId];
  return budget ? Math.round(budget.annualBudgetWan * 10000) : 0;
}

function projectHasBudgetBaseline(projectId) {
  return Boolean(PROJECT_BUDGETS[projectId] && PROJECT_BUDGETS[projectId].budgetStatus === "baseline_confirmed");
}

function projectBudgetDisplayStatus(projectId) {
  return projectHasBudgetBaseline(projectId) ? "预算基准已确认" : "待预算基准确认";
}

function monthBudgetWeight(month) {
  const monthValue = normalizeMonthValue(month);
  const row = MONTH_BUDGET_WEIGHTS.find((item) => item.month === monthValue);
  return row ? row.weight : 0;
}

function sequenceBudgetWeight(month) {
  const monthValue = normalizeMonthValue(month);
  return MONTH_BUDGET_WEIGHTS
    .filter((item) => item.month <= monthValue)
    .reduce((sum, item) => sum + item.weight, 0);
}

function getProjectAnnualBudget(projectId) {
  return annualBudgetYuan(projectId);
}

function getProjectMonthBudget(projectId, month) {
  return Math.round(annualBudgetYuan(projectId) * monthBudgetWeight(month));
}

function getProjectSequenceBudget(projectId, month) {
  return Math.round(annualBudgetYuan(projectId) * sequenceBudgetWeight(month));
}

function getCompanyAnnualBudget() {
  return Math.round(COMPANY_BUDGET.annualBudgetWan * 10000);
}

function getCompanyMonthBudget(month) {
  return Math.round(getCompanyAnnualBudget() * monthBudgetWeight(month));
}

function getCompanySequenceBudget(month) {
  return Math.round(getCompanyAnnualBudget() * sequenceBudgetWeight(month));
}

function getBudgetProgress(actualCost, annualBudget, sequenceBudget) {
  if (!(annualBudget > 0) || !(sequenceBudget > 0)) {
    return {
      actualCost,
      annualBudget,
      sequenceBudget,
      annualBudgetRatio: null,
      sequenceBudgetRatio: null,
    };
  }
  return {
    actualCost,
    annualBudget,
    sequenceBudget,
    annualBudgetRatio: actualCost / Math.max(1, annualBudget),
    sequenceBudgetRatio: actualCost / Math.max(1, sequenceBudget),
  };
}

function getCompanyActualCostThrough(month) {
  const monthValue = normalizeMonthValue(month);
  return sumRecords(RECORDS.filter((record) => record.month <= monthValue));
}

function getProjectActualCostThrough(projectId, month) {
  const monthValue = normalizeMonthValue(month);
  return sumRecords(RECORDS.filter((record) => record.projectId === projectId && record.month <= monthValue));
}

function getCompanyBudgetExecution(month) {
  const monthValue = normalizeMonthValue(month);
  const annualBudget = getCompanyAnnualBudget();
  const monthBudget = getCompanyMonthBudget(monthValue);
  const sequenceBudget = getCompanySequenceBudget(monthValue);
  const monthActual = sumRecords(filterRecords({ month: monthValue }));
  const cumulativeActual = getCompanyActualCostThrough(monthValue);
  return {
    month: monthValue,
    annualBudget,
    monthBudget,
    monthActual,
    monthBudgetRatio: monthActual / Math.max(1, monthBudget),
    sequenceBudget,
    cumulativeActual,
    ...getBudgetProgress(cumulativeActual, annualBudget, sequenceBudget),
  };
}

function getProjectBudgetExecution(projectId, month) {
  const monthValue = normalizeMonthValue(month);
  const annualBudget = getProjectAnnualBudget(projectId);
  const monthBudget = getProjectMonthBudget(projectId, monthValue);
  const sequenceBudget = getProjectSequenceBudget(projectId, monthValue);
  const monthActual = sumRecords(filterRecords({ projectId, month: monthValue }));
  const cumulativeActual = getProjectActualCostThrough(projectId, monthValue);
  return {
    project: getProject(projectId),
    month: monthValue,
    annualBudget,
    monthBudget,
    monthActual,
    monthBudgetRatio: monthBudget > 0 ? monthActual / monthBudget : null,
    sequenceBudget,
    cumulativeActual,
    budgetStatus: projectHasBudgetBaseline(projectId) ? "baseline_confirmed" : "no_budget_baseline",
    displayStatus: projectBudgetDisplayStatus(projectId),
    ...getBudgetProgress(cumulativeActual, annualBudget, sequenceBudget),
  };
}

function getProjectBudgetRows(month, projectId = "") {
  return PROJECTS
    .filter((project) => (!projectId || project.id === projectId) && projectHasBudgetBaseline(project.id))
    .map((project) => {
    const execution = getProjectBudgetExecution(project.id, month);
    return {
      ...execution,
      status: budgetStatus(execution.sequenceBudgetRatio),
      topSubject: getProjectCumulativeTopSubject(project.id),
    };
  }).sort((a, b) => b.sequenceBudgetRatio - a.sequenceBudgetRatio);
}

function getProjectBudgetAttention(projectId, month = 5) {
  return classifyProjectAttention(projectId, normalizeMonthValue(month));
}

function v111RecordAttentionFallback(reason) {
  V111_ATTENTION_VIEW_STATUS.primarySource = "local_fallback";
  V111_ATTENTION_VIEW_STATUS.usedSharedView = false;
  V111_ATTENTION_VIEW_STATUS.fallbackUsed = true;
  V111_ATTENTION_VIEW_STATUS.fallbackWarnings += 1;
  if (!v111RecordAttentionFallback.warned && typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn(`${V111_MANAGEMENT_ATTENTION_VIEW_NAME} 缺失，已回退本地派生逻辑。`, reason || "");
    v111RecordAttentionFallback.warned = true;
  }
}

function v111SelectionPriorityLabel(key) {
  const matched = TOP_EXPLANATION_PRIORITY.find((priority) => priority.key === key);
  return matched ? matched.label : "共享经营关注视图";
}

function v111SignalTypeFromAttentionType(type) {
  if (type === "entry_integrity") return { signalKey: "entry_integrity", legacyTypeKey: "entryLag", typeDisplay: "入账完整性关注" };
  if (type === "efficiency_review") return { signalKey: "efficiency_review", legacyTypeKey: "costHigh", typeDisplay: "成本效率关注" };
  if (type === "slow_pace") return { signalKey: "slow_pace", legacyTypeKey: "businessLow", typeDisplay: "经营节奏偏慢" };
  return { signalKey: "activity_driven", legacyTypeKey: "normal", typeDisplay: "正常波动" };
}

function getSharedManagementAttentionRows(data = V10_DATA) {
  const rows = data?.VIEWS?.[V111_MANAGEMENT_ATTENTION_VIEW_NAME];
  return Array.isArray(rows) ? rows : [];
}

function mapSharedManagementAttentionRow(row) {
  const project = getProject(row.project_id) || {
    id: row.project_id,
    shortName: row.project_short_name,
    fullName: row.project_name,
  };
  const signalType = v111SignalTypeFromAttentionType(row.attention_type);
  const signalMeta = MANAGEMENT_SIGNAL_META[signalType.signalKey] || MANAGEMENT_SIGNAL_META.activity_driven;
  const sequenceBudget = Number(row.sequence_budget) || 0;
  const totalCost = Number(row.total_cost) || 0;
  const annualBudget = Number(row.annual_budget) || 0;
  const currentMonthCost = Number(row.current_month_cost) || 0;
  const sequenceBudgetRatio = Number(row.budget_execution_rate) || (sequenceBudget > 0 ? totalCost / sequenceBudget : 0);
  const deviationAmount = Number(row.budget_gap) || (totalCost - sequenceBudget);
  return {
    project,
    projectId: row.project_id,
    month: 5,
    typeKey: signalType.legacyTypeKey,
    typeLabel: signalType.typeDisplay,
    typeDisplay: signalType.typeDisplay,
    className: signalMeta.className,
    meta: ATTENTION_TYPE_META[signalType.legacyTypeKey] || ATTENTION_TYPE_META.normal,
    signalKey: signalType.signalKey,
    managementSignal: row.management_signal || signalMeta.label,
    managementSignalClass: signalMeta.className,
    selectionPriorityKey: row.selection_priority_key || "amountFallback",
    selectionPriorityLabel: v111SelectionPriorityLabel(row.selection_priority_key),
    mainExplanation: row.primary_reason || "",
    advice: row.secondary_reason || "",
    reasonTags: Array.isArray(row.tags) ? row.tags : [],
    annualBudget,
    sequenceBudget,
    cumulativeActual: totalCost,
    currentMonthCost,
    monthActual: currentMonthCost,
    deviationAmount,
    sequenceBudgetRatio,
    annualBudgetRatio: annualBudget > 0 ? totalCost / annualBudget : null,
    deviationScore: Number(row.score) || Math.abs(sequenceBudgetRatio - 1),
    attentionLevel: row.attention_level || "",
    ruleVersion: row.rule_version || "",
    ncDetailCount: Number(row.nc_detail_count) || 0,
    activityCount: Number(row.activity_count) || 0,
    costSignal: {
      annualBudget,
      sequenceBudget,
      cumulativeActual: totalCost,
      monthActual: currentMonthCost,
      deviationAmount,
      sequenceBudgetRatio,
      annualBudgetRatio: annualBudget > 0 ? totalCost / annualBudget : null,
    },
    activitySignal: {
      activityCount: Number(row.activity_count) || 0,
    },
    ncSignal: {
      ncCount: Number(row.nc_detail_count) || 0,
    },
  };
}

function getSharedManagementAttentionProjects(month = 5, data = V10_DATA) {
  const rows = getSharedManagementAttentionRows(data)
    .filter((row) => !row.rule_month || Number(row.rule_month) === normalizeMonthValue(month))
    .sort((a, b) => (Number(a.rank) || 999) - (Number(b.rank) || 999));
  if (!rows.length) return [];
  const mapped = rows.map(mapSharedManagementAttentionRow);
  V111_ATTENTION_VIEW_STATUS.primarySource = V111_MANAGEMENT_ATTENTION_VIEW_NAME;
  V111_ATTENTION_VIEW_STATUS.usedSharedView = true;
  V111_ATTENTION_VIEW_STATUS.lastTop5 = mapped.slice(0, 5).map((row) => row.projectId);
  return mapped;
}

function getLocalBudgetAttentionProjects(month = 5) {
  const monthValue = normalizeMonthValue(month);
  return PROJECTS.filter((project) => projectHasBudgetBaseline(project.id)).map((project) => getProjectBudgetAttention(project.id, monthValue))
    .sort((a, b) => {
      if (a.meta.priority !== b.meta.priority) return a.meta.priority - b.meta.priority;
      return b.deviationScore - a.deviationScore;
    });
}

function getBudgetAttentionProjects(month = 5, options = {}) {
  if (!V10_DATA) return getLocalBudgetAttentionProjects(month);
  if (!options.forceLocal) {
    const sharedRows = getSharedManagementAttentionProjects(month);
    if (sharedRows.length) return sharedRows;
    v111RecordAttentionFallback("shared view empty or unavailable");
  }
  return getLocalBudgetAttentionProjects(month);
}

function classifyProjectAttention(projectId, month = 5) {
  const monthValue = normalizeMonthValue(month);
  const project = getProject(projectId);
  const costSignal = getProjectCostDeviationSignal(projectId, monthValue);
  const activitySignal = getProjectActivitySignal(projectId, monthValue);
  const unitCostSignal = getProjectUnitCostSignal(projectId, monthValue);
  const ncSignal = getProjectNcCompletenessSignal(projectId, monthValue);
  const tags = new Set();
  let typeKey = "normal";

  if (costSignal.sequenceBudgetRatio > ATTENTION_THRESHOLDS.HIGH_RATIO) {
    const businessDriven = activitySignal.activityDriven
      && activitySignal.activityCostRatio >= ATTENTION_THRESHOLDS.ACTIVITY_DRIVEN_RATIO
      && !unitCostSignal.hasHighUnitCost
      && !ncSignal.lowNcCount;
    const costEfficiencyConcern = unitCostSignal.hasHighUnitCost
      || unitCostSignal.hasEngineeringHigh
      || unitCostSignal.packageConcentrated
      || costSignal.fixedHigh
      || costSignal.manageHigh;
    typeKey = businessDriven ? "businessHigh" : costEfficiencyConcern ? "costHigh" : "businessHigh";
  } else if (costSignal.sequenceBudgetRatio < ATTENTION_THRESHOLDS.LOW_RATIO) {
    typeKey = ncSignal.entryLagLikely ? "entryLag" : "businessLow";
  }

  if (activitySignal.activityDriven) tags.add("活动驱动");
  if (activitySignal.recentConcentrated) tags.add("活动集中");
  if (costSignal.variableIncrease) tags.add("变动成本增加");
  if (unitCostSignal.hasHighUnitCost) tags.add("单价偏高");
  if (unitCostSignal.hasEngineeringHigh) tags.add("工程量偏高");
  if (costSignal.fixedHigh) tags.add("固定成本集中入账");
  if (costSignal.manageHigh) tags.add("管理费用偏高");
  if (unitCostSignal.packageConcentrated) tags.add("综合包干集中");
  if (activitySignal.activityLow) tags.add("活动不足");
  if (activitySignal.businessPaceDelayed) tags.add("业务节奏后移");
  if (ncSignal.entryLagLikely) tags.add("入账滞后");
  if (ncSignal.fixedCostMissing) tags.add("固定成本未入账");
  if (ncSignal.lowNcCount) tags.add("NC 明细偏少");

  if (typeKey === "businessHigh") {
    tags.add("活动驱动");
    if (activitySignal.activityCostRatio > 0.32) tags.add("变动成本增加");
  }
  if (typeKey === "costHigh" && !tags.size) tags.add("固定成本集中入账");
  if (typeKey === "businessLow") {
    tags.add("活动不足");
    tags.add("业务节奏后移");
  }
  if (typeKey === "entryLag") {
    tags.add("入账滞后");
    if (!ncSignal.lowNcCount) tags.add("固定成本未入账");
  }
  if (typeKey === "normal") tags.add("正常波动");

  const reasonTags = normalizeAttentionTags(typeKey, [...tags]);
  const meta = ATTENTION_TYPE_META[typeKey];
  const attention = {
    project,
    projectId,
    month: monthValue,
    typeKey,
    meta,
    typeLabel: meta.label,
    typeDisplay: meta.display,
    className: meta.className,
    reasonTags,
    advice: getProjectManagementAdvice(typeKey, reasonTags, projectId),
    activityStatus: typeKey === "entryLag" ? "入账待确认" : activitySignal.status,
    benchmarkItem: unitCostSignal.primaryBenchmarkItem || mapSubjectToBenchmark(costSignal.topSubjects[0] ? subjectIndex[costSignal.topSubjects[0].subjectKey] : null),
    deviationScore: Math.abs(costSignal.sequenceBudgetRatio - 1) + Math.abs(costSignal.deviationAmount) / Math.max(1, costSignal.sequenceBudget),
    costSignal,
    activitySignal,
    unitCostSignal,
    ncSignal,
  };
  return {
    ...attention,
    annualBudget: costSignal.annualBudget,
    sequenceBudget: costSignal.sequenceBudget,
    cumulativeActual: costSignal.cumulativeActual,
    deviationAmount: costSignal.deviationAmount,
    sequenceBudgetRatio: costSignal.sequenceBudgetRatio,
    annualBudgetRatio: costSignal.annualBudgetRatio,
  };
}

function normalizeAttentionTags(typeKey, tags) {
  const priorityMap = {
    businessHigh: ["活动驱动", "活动集中", "变动成本增加", "正常波动"],
    costHigh: ["单价偏高", "工程量偏高", "固定成本集中入账", "管理费用偏高", "综合包干集中", "变动成本增加"],
    businessLow: ["活动不足", "业务节奏后移", "固定成本未入账", "NC 明细偏少"],
    entryLag: ["入账滞后", "NC 明细偏少", "固定成本未入账", "活动不足"],
    normal: ["正常波动"],
  };
  const unique = [...new Set(tags)];
  const priority = priorityMap[typeKey] || [];
  return unique
    .sort((a, b) => {
      const ai = priority.includes(a) ? priority.indexOf(a) : 99;
      const bi = priority.includes(b) ? priority.indexOf(b) : 99;
      return ai - bi;
    })
    .slice(0, 3);
}

function getAttentionShortJudgement(typeKey, reasonTags = []) {
  const has = (tag) => reasonTags.includes(tag);
  if (typeKey === "businessHigh") {
    if (has("活动驱动") && has("活动集中")) return "活动密集，变动成本同步增加";
    if (has("活动驱动") && has("变动成本增加")) return "活动多，变动成本占比上升";
    if (has("活动驱动")) return "活动驱动，NC明细完整";
    return "业务活动带动成本上升";
  }
  if (typeKey === "costHigh") {
    if (has("单价偏高") && has("工程量偏高")) return "单价和工程量高于同类项目";
    if (has("单价偏高")) return "重点成本项单价偏高";
    if (has("固定成本集中入账")) return "固定成本入账集中";
    if (has("综合包干集中")) return "综合包干合同集中";
    if (has("管理费用偏高")) return "管理费用占比偏高";
    return "成本结构偏离同类项目";
  }
  if (typeKey === "businessLow") {
    if (has("活动不足")) return "活动开展不足，业务节奏后移";
    return "业务节奏偏慢";
  }
  if (typeKey === "entryLag") {
    if (has("固定成本未入账")) return "固定成本暂未入账";
    if (has("入账滞后")) return "活动成本入账滞后";
    return "活动已发生，成本待入账";
  }
  return "预算执行处于正常波动";
}

function getAttentionExecutiveNotes(rows, month = 5) {
  const execution = getCompanyBudgetExecution(month);
  const topProjects = selectTopExplanationProjects(rows, 5);
  return buildExecutiveNotesFromTopProjects(topProjects, execution, month);
}

function buildBudgetExecutionExplanation({ month = 5, rows = null } = {}) {
  const monthValue = normalizeMonthValue(month);
  const companyBudgetSummary = getCompanyBudgetExecution(monthValue);
  const projectRows = rows || getBudgetAttentionProjects(monthValue);
  const topExplanationProjects = selectTopExplanationProjects(projectRows, 5);
  const signalCards = buildSignalCardsFromTopExplanationProjects(topExplanationProjects);
  return {
    companyBudgetSummary,
    signalCards,
    topExplanationProjects,
    executiveNotes: buildExecutiveNotesFromTopProjects(topExplanationProjects, companyBudgetSummary, monthValue),
  };
}

function selectTopExplanationProjects(rows = [], limit = 5) {
  const selected = [];
  const selectedIds = new Set();
  const addRows = (candidateRows, priority) => {
    candidateRows.forEach((row) => {
      if (selected.length >= limit || selectedIds.has(row.projectId)) return;
      selected.push(enrichExplanationProject(row, priority));
      selectedIds.add(row.projectId);
    });
  };
  TOP_EXPLANATION_PRIORITY.forEach((priority) => {
    const sortedRows = [...rows]
      .filter(priority.match)
      .sort((a, b) => {
        if (priority.key === "amountFallback") return b.cumulativeActual - a.cumulativeActual;
        return b.deviationScore - a.deviationScore;
      });
    addRows(sortedRows, priority);
  });
  return selected;
}

function enrichExplanationProject(row, priority) {
  const signalKey = getCanonicalAttentionSignalKey(row, priority);
  const meta = MANAGEMENT_SIGNAL_META[signalKey] || MANAGEMENT_SIGNAL_META.activity_driven;
  return {
    ...row,
    signalKey,
    selectionPriorityKey: priority.key,
    selectionPriorityLabel: priority.label,
    managementSignal: meta.label,
    managementSignalClass: meta.className,
    mainExplanation: buildProjectExplanation(row, signalKey),
  };
}

function getCanonicalAttentionSignalKey(row = {}, priority = {}) {
  const rawType = String(row.typeKey || row.managementSignal || row.typeLabel || "").trim();
  const direct = ATTENTION_SIGNAL_TYPES.find((type) => type.key === rawType || type.legacyKeys.includes(rawType));
  if (direct) return direct.key;
  if (priority.key === "costHigh" || priority.key === "budgetHigh") return "efficiency_review";
  if (priority.key === "entryLag") return "entry_integrity";
  if (priority.key === "budgetLow") return "slow_pace";
  if (priority.key === "businessHigh" || priority.key === "amountFallback") return "activity_driven";
  return "activity_driven";
}

function buildSignalCardsFromTopExplanationProjects(topProjects = []) {
  return ATTENTION_SIGNAL_TYPES.map((type) => {
    const meta = MANAGEMENT_SIGNAL_META[type.key];
    const typeRows = topProjects.filter((row) => row.signalKey === type.key);
    return {
      signalKey: type.key,
      typeKey: type.key,
      ...meta,
      count: typeRows.length,
      projects: typeRows,
      projectNames: typeRows.map((row) => row.project.shortName),
      displayCount: typeRows.length ? `${typeRows.length}个` : "暂无",
    };
  });
}

function buildProjectExplanation(row, signalKey = getCanonicalAttentionSignalKey(row)) {
  if (signalKey === "efficiency_review") {
    return `重点成本项或科目结构出现复核信号，建议结合${row.benchmarkItem || "核心成本项"}、工程量和 NC 明细核验。`;
  }
  if (signalKey === "entry_integrity") {
    return "成本发生、固定成本入账或 NC 明细匹配存在待确认事项，需核对入账节奏。";
  }
  if (signalKey === "slow_pace") {
    return "成本执行偏低，需结合活动排期、固定成本入账和经营节奏判断。";
  }
  if (signalKey === "activity_driven") {
    return "成本较高主要由重点活动集中发生带动，当前作为经营解释口径持续跟踪。";
  }
  return "预算执行与成本结构处于可持续跟踪范围，作为金额靠前项目保留解释入口。";
}

function buildExecutiveNotesFromTopProjects(topProjects, execution, month = 5) {
  const statusText = budgetStatusText(execution.sequenceBudgetRatio);
  const namesBySignal = (signalKey, limit = 2) => topProjects.filter((row) => row.signalKey === signalKey).slice(0, limit).map((row) => row.project.shortName);
  const costHighNames = namesBySignal("efficiency_review");
  const entryLagNames = namesBySignal("entry_integrity");
  const businessLowNames = namesBySignal("slow_pace");
  const businessHighNames = namesBySignal("activity_driven");
  const priorityNames = [...costHighNames, ...entryLagNames, ...businessLowNames, ...businessHighNames].slice(0, 2);
  let secondLine = "本期重点解释项目以成本金额靠前项目为主，建议保持月度跟踪。";
  if (costHighNames.length) {
    secondLine = `${costHighNames.join("、")}存在成本效率复核信号，需结合活动规模、服务标准、工程量、NC 明细进一步复核。`;
  } else if (entryLagNames.length) {
    secondLine = `${entryLagNames.join("、")}存在入账完整性待确认事项，需核对固定成本入账、成本发生和 NC 明细匹配。`;
  } else if (businessLowNames.length) {
    secondLine = `${businessLowNames.join("、")}成本执行偏低，需关注活动排期、固定成本入账或经营节奏。`;
  } else if (businessHighNames.length && topProjects.every((row) => row.signalKey === "activity_driven")) {
    secondLine = `${businessHighNames.join("、")}主要由活动集中发生带动，当前为正常经营解释。`;
  } else if (priorityNames.length) {
    secondLine = `${priorityNames.join("、")}为本期优先解释项目，建议结合活动、科目结构和 NC 明细继续穿透。`;
  }
  return [
    `截至2026年${month}月，公司累计成本完成全年预算${percent(execution.annualBudgetRatio)}，序时预算执行率${percent(execution.sequenceBudgetRatio)}，整体处于${statusText}区间。`,
    secondLine,
    "收入端尚未接入，成本偏高不直接代表经营结论，成本偏低不等于节约，本模块只做成本侧经营解释。",
  ];
}

function getProjectCostDeviationSignal(projectId, month = 5) {
  const monthValue = normalizeMonthValue(month);
  const execution = getProjectBudgetExecution(projectId, monthValue);
  const records = RECORDS.filter((record) => record.projectId === projectId && record.month <= monthValue);
  const byMain = sumsByMain(records);
  const total = Math.max(1, sumRecords(records));
  const topSubjects = getSubjectRankingFromRecords(records).slice(0, 3);
  return {
    ...execution,
    deviationAmount: execution.cumulativeActual - execution.sequenceBudget,
    byMain,
    fixedShare: byMain.固定成本 / total,
    variableShare: byMain.变动成本 / total,
    manageShare: byMain.管理费用 / total,
    fixedHigh: execution.sequenceBudgetRatio > ATTENTION_THRESHOLDS.HIGH_RATIO && byMain.固定成本 / total > 0.54,
    manageHigh: execution.sequenceBudgetRatio > ATTENTION_THRESHOLDS.HIGH_RATIO && byMain.管理费用 / total > 0.24,
    variableIncrease: byMain.变动成本 / total > 0.39,
    topSubjects,
  };
}

function getProjectActivitySignal(projectId, month = 5) {
  const monthValue = normalizeMonthValue(month);
  const activities = ACTIVITIES.filter((activity) => activity.projectId === projectId && activity.month <= monthValue);
  const activityCost = activities.reduce((sum, activity) => sum + activity.totalCost, 0);
  const actual = Math.max(1, getProjectActualCostThrough(projectId, monthValue));
  const currentActivity = getActivity(projectId, monthValue);
  const averageActivityCost = activityCost / Math.max(1, activities.length);
  const activityCostRatio = activityCost / actual;
  const highCostActivityCount = activities.filter((activity) => activity.costRatio >= 0.35 || activity.totalCost > averageActivityCost * 1.15).length;
  const recentConcentrated = Boolean(currentActivity && currentActivity.totalCost > averageActivityCost * 1.18);
  const activityDriven = activityCostRatio >= 0.28 && (highCostActivityCount >= 2 || recentConcentrated || (currentActivity && currentActivity.costRatio >= 0.35));
  const activityLow = activityCostRatio < 0.22 || Boolean(currentActivity && currentActivity.totalCost < averageActivityCost * 0.72);
  return {
    activities,
    activityCount: activities.length,
    activityCost,
    activityCostRatio,
    currentActivity,
    averageActivityCost,
    highCostActivityCount,
    recentConcentrated,
    activityDriven,
    activityLow,
    businessPaceDelayed: activityLow,
    status: activityDriven ? "活动多" : activityLow ? "活动少" : "正常",
  };
}

function getProjectUnitCostSignal(projectId, month = 5) {
  const monthValue = normalizeMonthValue(month);
  const normalizedItems = UNIT_COST_ITEMS
    .map((item) => item.normalizedName ? item : normalizeUnitBenchmarkItem(item))
    .filter((item) => item.month <= monthValue);
  const projectItems = normalizedItems.filter((item) => item.projectId === projectId);
  const names = [...new Set(projectItems.map((item) => item.normalizedName))];
  const highRows = [];
  const engineeringRows = [];

  names.forEach((name) => {
    const rows = aggregateUnitCostByProject(normalizedItems.filter((item) => item.normalizedName === name));
    rows.filter((row) => row.projectId === projectId).forEach((row) => {
      const sameUnitRows = rows.filter((item) => item.unit === row.unit && item.canBenchmark);
      const status = getUnitPriceStatus(row, rows);
      if (status.label === "偏高") highRows.push({ ...row, status });
      const averageQuantity = sameUnitRows.reduce((sum, item) => sum + item.quantity, 0) / Math.max(1, sameUnitRows.length);
      if (row.canBenchmark && sameUnitRows.length >= 3 && row.quantity > averageQuantity * 1.25) {
        engineeringRows.push(row);
      }
    });
  });

  const projectUnitAmount = projectItems.reduce((sum, item) => sum + item.amount, 0);
  const highAmount = highRows.reduce((sum, item) => sum + item.amount, 0);
  const engineeringAmount = engineeringRows.reduce((sum, item) => sum + item.amount, 0);
  const packageAmount = projectItems.filter((item) => item.normalizedName === "综合包干" || !item.canBenchmark).reduce((sum, item) => sum + item.amount, 0);
  const highAmountShare = highAmount / Math.max(1, projectUnitAmount);
  const engineeringAmountShare = engineeringAmount / Math.max(1, projectUnitAmount);
  const packageShare = packageAmount / Math.max(1, projectUnitAmount);
  return {
    hasHighUnitCost: highRows.length >= 2 && highAmountShare > 0.18,
    hasEngineeringHigh: engineeringRows.length >= 2 && engineeringAmountShare > 0.18,
    packageAmount,
    packageShare,
    packageConcentrated: packageShare > 0.36 && packageAmount > 1200000,
    highRows,
    engineeringRows,
    primaryBenchmarkItem: highRows[0] ? highRows[0].normalizedName : engineeringRows[0] ? engineeringRows[0].normalizedName : "保安服务",
  };
}

function getProjectNcCompletenessSignal(projectId, month = 5) {
  const monthValue = normalizeMonthValue(month);
  const execution = getProjectBudgetExecution(projectId, monthValue);
  const activities = ACTIVITIES.filter((activity) => activity.projectId === projectId && activity.month <= monthValue);
  const activityRecords = ACTIVITY_RECORDS.filter((record) => record.projectId === projectId && record.month <= monthValue);
  const baseRecords = RECORDS.filter((record) => record.projectId === projectId && record.month <= monthValue);
  const fixedAmount = sumRecords(baseRecords.filter((record) => record.main === "固定成本"));
  const activityNcPerActivity = activityRecords.length / Math.max(1, activities.length);
  const lowNcCount = activities.length > 0 && activityNcPerActivity < 6.5;
  const fixedCostMissing = execution.sequenceBudgetRatio < 0.8 && fixedAmount < execution.sequenceBudget * 0.24;
  return {
    ledgerCount: baseRecords.length + activityRecords.length,
    activityNcCount: activityRecords.length,
    activityNcPerActivity,
    lowNcCount,
    fixedCostMissing,
    entryLagLikely: execution.sequenceBudgetRatio < 0.8 && (lowNcCount || fixedCostMissing),
  };
}

function getProjectManagementAdvice(attentionType, reasonTags, projectId) {
  const project = getProject(projectId);
  const prefix = project ? `${project.shortName}：` : "";
  if (attentionType === "businessHigh") {
    return `${prefix}结合活动收入复核经营效果，重点穿透活动成本、变动成本和活动相关 NC 明细；收入端接入前暂不直接判断盈亏。`;
  }
  if (attentionType === "costHigh") {
    return `${prefix}复核偏差科目、合同清单、工程量确认和供应商报价；单价偏高项目可纳入后续招采参考价或集采复核范围。`;
  }
  if (attentionType === "businessLow") {
    return `${prefix}关注后续活动排期、招商进展和业务恢复情况；该状态不宜简单认定为成本节约，应结合收入端后续判断经营影响。`;
  }
  if (attentionType === "entryLag") {
    return `${prefix}核对 NC 入账、结算单、付款单、固定成本分摊和活动成本归集完整性，避免因数据滞后导致成本判断失真。`;
  }
  return `${prefix}按月持续跟踪预算执行、活动成本、固定成本入账和重点成本项单价变化。`;
}

function getProjectAttentionConclusion(attention) {
  if (attention.typeKey === "businessHigh") {
    return "当前项目成本偏离主要由活动增加和变动成本上升带动，收入端接入前暂不直接判断经营结果。";
  }
  if (attention.typeKey === "costHigh") {
    return "当前项目成本偏离更集中在单价、工程量、固定成本或管理费用效率层面，需要在项目页继续穿透。";
  }
  if (attention.typeKey === "businessLow") {
    return "当前项目成本低于序时预算，可能与活动排期后移或业务开展不足有关，不宜简单视为节约。";
  }
  if (attention.typeKey === "entryLag") {
    return "当前项目成本低于序时预算且存在入账完整性信号，需要结合结算、付款和 NC 入账节奏校准。";
  }
  return "当前项目成本执行与序时预算基本匹配，建议保持月度跟踪和重点成本项观察。";
}

function getAttentionReasonDetail(tag) {
  const details = {
    活动驱动: "活动成本占项目累计成本比重较高。",
    活动集中: "近期活动成本集中发生，影响当期执行进度。",
    变动成本增加: "现场服务、搭建、餐饮或能耗等随活动同步增加。",
    单价偏高: "重点成本项单价高于同单位样本平均区间。",
    工程量偏高: "同类成本项工程量高于项目样本平均水平。",
    固定成本集中入账: "物业、维保或场馆运行成本在当前周期集中体现。",
    管理费用偏高: "管理费用占比高于当前项目成本结构常规水平。",
    综合包干集中: "综合服务类合同金额集中，需要结合服务范围理解。",
    活动不足: "累计活动成本占比偏低，活动开展节奏偏慢。",
    业务节奏后移: "成本发生节奏可能随业务排期向后移动。",
    入账滞后: "活动已发生但结算、付款或 NC 入账节奏滞后。",
    固定成本未入账: "固定成本或分摊成本在当前周期体现不足。",
    "NC 明细偏少": "活动相关 NC 明细数量低于同类项目常规水平。",
    正常波动: "预算执行、成本结构和入账情况处于可持续跟踪范围。",
  };
  return details[tag] || "该因素用于解释当前预算偏离来源。";
}

function getProjectManagementActions(attention) {
  const actionMap = {
    businessHigh: [
      ["项目公司", "说明活动增量、招商进展和收入实现情况。"],
      ["成本中心", "关注活动变动成本和重点成本项单价。"],
      ["后续判断", "收入端接入后，进一步评估成本偏离对经营效果的影响。"],
    ],
    costHigh: [
      ["成本中心", "牵头分析主要偏差科目、单价、工程量和合同清单。"],
      ["项目公司", "说明供应商选择、活动规模和工程量确认依据。"],
      ["商务/财务", "结合合同、结算单和 NC 明细确认成本归集口径。"],
      ["后续判断", "收入端接入后，进一步评估成本偏离对经营效果的影响。"],
    ],
    businessLow: [
      ["项目公司", "补充后续活动排期、招商计划和业务恢复安排。"],
      ["经营管理条线", "跟踪收入实现预判和活动落地节奏。"],
      ["后续判断", "收入端接入后，进一步评估成本偏离对经营效果的影响。"],
    ],
    entryLag: [
      ["商务/财务", "核对结算办理、付款单形成和 NC 入账完整性。"],
      ["成本中心", "核对固定成本分摊和活动成本归集规则。"],
      ["项目公司", "补充已发生活动的结算办理情况。"],
    ],
    normal: [
      ["项目公司", "按月跟踪预算执行和活动排期。"],
      ["成本中心", "持续关注重点成本项单价变化。"],
    ],
  };
  return actionMap[attention.typeKey] || actionMap.normal;
}

function budgetStatus(ratio) {
  if (ratio === null || ratio === undefined || Number.isNaN(Number(ratio))) return { label: "待预算基准确认", className: "is-neutral" };
  if (ratio < 0.8) return { label: "偏低", className: "is-low" };
  if (ratio <= 1.1) return { label: "正常", className: "is-normal" };
  return { label: "偏高", className: "is-high" };
}

function budgetStatusText(ratio) {
  return budgetStatus(ratio).label;
}

function budgetCollectType(items) {
  const types = new Set(items.map((item) => item.collectType));
  if (types.has("直接归集") && types.has("分摊归集")) return "混合归集";
  return [...types][0] || "直接归集";
}

function generateRecords() {
  const records = [];
  let index = 1;
  PROJECTS.forEach((project, projectIndex) => {
    MONTHS.forEach((month) => {
      const monthFactor = [0.92, 0.97, 1.05, 1.12, 1.08][month - 1];
      const monthNoise = 0.94 + seededNumber(`${project.id}-${month}-month`) * 0.14;
      const monthTarget = project.scale * monthFactor * monthNoise;
      const categoryShares = projectCategoryShares(projectIndex);

      TAXONOMY.forEach((mainNode) => {
        const mainName = mainNode.name;
        const mainTarget = monthTarget * categoryShares[mainName];
        mainNode.children.forEach((l1Node, l1Index) => {
          const weight = L1_WEIGHTS[mainName][l1Node.name] || 0.05;
          const amountNoise = 0.86 + seededNumber(`${project.id}-${month}-${mainName}-${l1Node.name}`) * 0.28;
          const amount = roundHundred(mainTarget * weight * amountNoise);
          const l2Node = pick(l1Node.children, `${project.id}-${month}-${l1Node.name}-l2`);
          const l3Name = pick(l2Node.children, `${project.id}-${month}-${l2Node.name}-l3`);
          const subjectKey = [mainName, l1Node.name, l2Node.name, l3Name].join("|");
          const contract = contractFor(`${mainName}-${l1Node.name}-${l2Node.name}-${l3Name}`, project, month, index);
          const occurDay = 3 + Math.floor(seededNumber(`${index}-occur`) * 23);
          const postLag = 1 + Math.floor(seededNumber(`${index}-post`) * 6);
          const occurDate = makeDate(month, occurDay);
          const postDate = makeDate(month, Math.min(28, occurDay + postLag));
          const serial = String(index).padStart(5, "0");
          records.push({
            id: `NC-${project.code}-${month}-${serial}`,
            projectId: project.id,
            projectName: project.shortName,
            projectFullName: project.fullName,
            costMonth: `2026年${month}月`,
            month,
            occurDate,
            postDate,
            main: mainName,
            l1: l1Node.name,
            l2: l2Node.name,
            l3: l3Name,
            subjectKey,
            subjectPath: `${mainName}-${l1Node.name}-${l2Node.name}-${l3Name}`,
            pathKeys: [
              mainName,
              `${mainName}|${l1Node.name}`,
              `${mainName}|${l1Node.name}|${l2Node.name}`,
              subjectKey,
            ],
            amount,
            supplier: contract.supplier,
            contractName: contract.name,
            contractNo: `HT-2026-${project.code}-${mainCode(mainName)}-${String(month).padStart(2, "0")}-${String(l1Index + 1).padStart(2, "0")}`,
            settlementNo: `JS-2026-${project.code}-${String(month).padStart(2, "0")}-${serial}`,
            paymentNo: `FK-2026-${project.code}-${String(month).padStart(2, "0")}-${serial}`,
            summary: `${project.fullName}2026年${month}月${l1Node.name}${l3Name}成本入账，关联${contract.name}`,
            dataSource: "NC系统",
            contractAmount: roundHundred(amount * (2.8 + seededNumber(`${index}-contract`) * 2.4)),
          });
          index += 1;
        });
      });
    });
  });
  return records;
}

function generateBenchmarkRecords() {
  const records = [];
  let index = 1;
  PROJECTS.forEach((project, projectIndex) => {
    MONTHS.forEach((month) => {
      BENCHMARK_ITEMS.forEach((item, itemIndex) => {
        const activityFactor = ["booth", "materials", "catering", "temporary", "promotion"].includes(item.id)
          ? [0.72, 0.86, 1.18, 1.42, 1.05][month - 1]
          : [0.96, 0.98, 1.01, 1.03, 1.02][month - 1];
        const projectFactor = 0.52 + (project.scale / 1900000) * 0.88;
        const highlightFactor = ["sjz", "liuti", "lzhz", "weifang", "langfang"].includes(project.id) && ["booth", "materials", "catering", "temporary"].includes(item.id)
          ? 1.18
          : 1;
        const lowFactor = ["lzsd", "lzlib", "jingzhou"].includes(project.id) ? 0.72 : 1;
        const noise = 0.86 + seededNumber(`bm-${project.id}-${month}-${item.id}`) * 0.28;
        const totalAmount = roundHundred(item.base * projectFactor * activityFactor * highlightFactor * lowFactor * noise);
        const detailCount = item.id === "security" || item.id === "cleaning" || item.id === "maintenance"
          ? 2 + Math.floor(seededNumber(`bm-count-${project.id}-${month}-${item.id}`) * 2)
          : 2 + Math.floor(seededNumber(`bm-count-${project.id}-${month}-${item.id}`) * 3);
        const quantity = benchmarkQuantity(item, project, month, detailCount);
        const parts = item.subjectKey.split("|");
        const supplierPool = benchmarkSuppliers(item, project);
        const contractName = benchmarkContractName(item, month);
        for (let i = 0; i < detailCount; i += 1) {
          const shareSeed = 0.82 + seededNumber(`bm-share-${project.id}-${month}-${item.id}-${i}`) * 0.36;
          const amount = i === detailCount - 1
            ? Math.max(1200, roundHundred(totalAmount - sumRecords(records.filter((record) => record.batchKey === `${project.id}-${month}-${item.id}`))))
            : roundHundred((totalAmount / detailCount) * shareSeed);
          const supplier = supplierPool[i % supplierPool.length];
          const occurDay = 4 + Math.floor(seededNumber(`bm-day-${project.id}-${month}-${item.id}-${i}`) * 22);
          const serial = String(index).padStart(5, "0");
          const businessScene = benchmarkScene(item, project, month);
          const activityName = benchmarkActivityName(project, month, item, businessScene);
          records.push({
            id: `BM-${project.code}-${month}-${item.id}-${serial}`,
            batchKey: `${project.id}-${month}-${item.id}`,
            projectId: project.id,
            projectName: project.shortName,
            projectFullName: project.fullName,
            costMonth: `2026年${month}月`,
            month,
            occurDate: makeDate(month, occurDay),
            postDate: makeDate(month, Math.min(28, occurDay + 3)),
            main: item.main,
            l1: item.parent,
            l2: parts[2] || item.name,
            l3: parts[3] || item.name,
            subjectKey: item.subjectKey,
            subjectPath: `${item.main}-${item.parent}-${item.name}`,
            pathKeys: [parts[0], `${parts[0]}|${parts[1]}`, `${parts[0]}|${parts[1]}|${parts[2]}`, item.subjectKey],
            benchmarkItem: item.name,
            benchmarkItemId: item.id,
            businessScene,
            activityName,
            activityType: businessScene === "日常运营" ? "日常运营" : item.activityType,
            measureName: item.measureName,
            measureQty: Math.max(1, Math.round(quantity / detailCount)),
            unitCost: amount / Math.max(1, Math.round(quantity / detailCount)),
            amount,
            supplier,
            contractName,
            contractNo: `HT-2026-${project.code}-${item.id.toUpperCase()}-${String(month).padStart(2, "0")}-${String(itemIndex + 1).padStart(2, "0")}`,
            settlementNo: `JS-2026-${project.code}-${item.id.toUpperCase()}-${String(month).padStart(2, "0")}-${serial}`,
            paymentNo: `FK-2026-${project.code}-${item.id.toUpperCase()}-${String(month).padStart(2, "0")}-${serial}`,
            summary: `${project.fullName}2026年${month}月${item.name}成本入账，关联${contractName}`,
            dataSource: "NC系统",
            contractAmount: roundHundred(totalAmount * (2.1 + seededNumber(`bm-contract-${project.id}-${item.id}`) * 1.4)),
          });
          index += 1;
        }
      });
    });
  });
  return records.map(({ batchKey, ...record }) => record);
}

const ACTIVITY_TYPES = ["全部", "展会", "演唱会", "体育赛事", "会议论坛", "研学文化", "消费活动", "筹开活动"];
const ACTIVITY_COST_OPTIONS = [
  "全部",
  "特装搭建",
  "标准展位搭建",
  "主场服务",
  "临勤安保",
  "临勤保洁",
  "电力接驳",
  "能耗",
  "广告物料",
  "活动物资",
  "餐饮服务",
  "设备租赁",
  "现场服务",
  "固定成本分摊",
  "管理费用分摊",
  "物耗",
  "水电网接驳",
  "空调能源",
  "展位搭建",
  "临勤",
  "物料搭建",
  "清洁临勤",
  "广告氛围",
  "临时用工",
  "引流活动/布置/开幕式",
  "物料制作",
  "保洁易耗品",
  "活动报备支出",
  "场地及服务",
  "工作人员餐饮",
  "能耗及维修",
  "物料",
  "铁马围挡",
  "移动厕所",
  "能源成本",
  "餐饮费用",
  "自办展成本",
  "现场零星费用",
  "数字化服务",
  "宣传费用",
  "招标代理费",
  "采购平台服务费",
  "管理费",
  "差旅费用",
];
const ACTIVITY_METRICS = ["活动总成本", "活动直接成本", "单位面积成本", "单观众成本", "单展位成本", "单笔均额"];

const ACTIVITY_PLAN = {
  sjz: [
    ["2026特色年货主题展", "消费活动"],
    ["特色食品展", "展会"],
    ["2026HPE热泵展", "展会"],
    ["纺织服装展", "展会"],
    ["2026新能源智能汽车博览会", "展会"],
  ],
  zmd: [
    ["2026天中年货节", "消费活动"],
    ["农产品展销会", "展会"],
    ["农机装备展", "展会"],
    ["数字融合应用博览会", "展会"],
    ["新能源汽车展", "展会"],
  ],
  lzhz: [
    ["柳州农博会", "展会"],
    ["柳州汽车展", "展会"],
    ["县域电商发展展", "展会"],
    ["食品消费展", "消费活动"],
    ["工业装备展", "展会"],
  ],
  lzwh: [
    ["非遗文化展", "研学文化"],
    ["研学教育活动", "研学文化"],
    ["文旅推介会", "会议论坛"],
    ["城市文化节", "研学文化"],
    ["青少年艺术展", "研学文化"],
  ],
  lzsd: [
    ["湿地自然研学活动", "研学文化"],
    ["生态市集", "消费活动"],
    ["亲子露营节", "研学文化"],
    ["湿地科普活动", "研学文化"],
    ["春季户外体验活动", "研学文化"],
  ],
  lzlib: [
    ["城市读书节", "研学文化"],
    ["少儿阅读活动", "研学文化"],
    ["文化讲座", "会议论坛"],
    ["文创市集", "消费活动"],
    ["研学阅读营", "研学文化"],
  ],
  zhashan: [
    ["农产品展销会", "消费活动"],
    ["产业推介会", "会议论坛"],
    ["培训会议", "会议论坛"],
    ["节庆市集", "消费活动"],
    ["招商交流活动", "筹开活动"],
  ],
  ezhou: [
    ["食品消费展", "消费活动"],
    ["家居家装展", "展会"],
    ["文旅演出活动", "演唱会"],
    ["农产品展销会", "消费活动"],
    ["城市消费节", "消费活动"],
  ],
  weifang: [
    ["山东国际农业机械展", "展会"],
    ["宠物产业展", "展会"],
    ["风筝文化消费节", "消费活动"],
    ["装备制造展", "展会"],
    ["食品饮品展", "展会"],
  ],
  langfang: [
    ["低空经济产业展", "展会"],
    ["服装订货会", "展会"],
    ["临空产业推介会", "会议论坛"],
    ["春季消费品展", "消费活动"],
    ["城市会客厅活动", "会议论坛"],
  ],
  liuti: [
    ["潮音风暴超级演唱会", "演唱会"],
    ["足球邀请赛", "体育赛事"],
    ["篮球城市赛", "体育赛事"],
    ["体育消费节", "消费活动"],
    ["青少年体育赛事", "体育赛事"],
  ],
  yunqi: [
    ["好房子建设暨建材创新应用展", "展会"],
    ["杭州国际具身机器人场景应用大赛", "会议论坛"],
    ["意法秋季联合订货会", "展会"],
    ["茶产业展", "展会"],
    ["数字经济论坛", "会议论坛"],
  ],
  jingzhou: [
    ["产业交流中心开放活动", "筹开活动"],
    ["招商推介会", "筹开活动"],
    ["城市会客厅活动", "会议论坛"],
    ["筹开阶段业务推介", "筹开活动"],
    ["文旅体验活动", "研学文化"],
  ],
  daye: [
    ["大冶开馆筹备活动", "筹开活动"],
    ["青少年科普体验活动", "研学文化"],
    ["群众文化展示活动", "研学文化"],
    ["新时代文明实践开放日", "研学文化"],
    ["综合体商业配套筹备会", "会议论坛"],
  ],
};

const ACTIVITY_ITEM_META = {
  标准展位搭建: { main: "变动成本", l1: "现场服务成本", l2: "搭建执行", l3: "标准展位搭建", supplierType: "会展", unit: "平方米", contract: "标准展位搭建服务合同" },
  特装搭建: { main: "变动成本", l1: "现场服务成本", l2: "搭建执行", l3: "标准展位搭建", supplierType: "会展", unit: "平方米", contract: "特装搭建服务合同" },
  主场服务: { main: "变动成本", l1: "现场服务成本", l2: "搭建执行", l3: "主场服务", supplierType: "会展", unit: "场", contract: "主场运营服务合同" },
  临勤安保: { main: "变动成本", l1: "人工成本", l2: "活动临勤人员", l3: "临时安保", supplierType: "安保", unit: "人次", contract: "活动临勤安保服务合同" },
  临勤保洁: { main: "变动成本", l1: "人工成本", l2: "活动临勤人员", l3: "临时保洁", supplierType: "物业", unit: "人次", contract: "活动临勤保洁服务合同" },
  电力接驳: { main: "变动成本", l1: "场馆运行成本（活动期间）", l2: "活动能耗", l3: "临时用电", supplierType: "设备", unit: "点位", contract: "活动电力接驳服务合同" },
  水电气接驳: { main: "变动成本", l1: "场馆运行成本（活动期间）", l2: "活动能耗", l3: "临时用电", supplierType: "设备", unit: "点位", contract: "水电气接驳服务合同" },
  能耗: { main: "变动成本", l1: "场馆运行成本（活动期间）", l2: "活动能耗", l3: "空调用能", supplierType: "设备", unit: "千瓦时", contract: "活动能耗保障服务合同" },
  广告物料: { main: "管理费用", l1: "宣传物料费", l2: "物料制作", l3: "海报画册", supplierType: "广告", unit: "批", contract: "广告物料制作服务合同" },
  地毯铺设: { main: "变动成本", l1: "材料设备成本", l2: "活动物料", l3: "指示标识", supplierType: "物料", unit: "平方米", contract: "活动地毯铺设服务合同" },
  氛围布置: { main: "变动成本", l1: "活动策划成本", l2: "现场执行", l3: "导演统筹", supplierType: "会展", unit: "项", contract: "活动氛围布置服务合同" },
  证件制作: { main: "变动成本", l1: "材料设备成本", l2: "活动物料", l3: "证件胸牌", supplierType: "物料", unit: "张", contract: "证件物料制作服务合同" },
  垃圾清运: { main: "变动成本", l1: "其他成本", l2: "现场杂项", l3: "临时采购", supplierType: "物业", unit: "车次", contract: "活动垃圾清运服务合同" },
  餐饮服务: { main: "变动成本", l1: "餐饮成本", l2: "工作餐", l3: "人员餐饮", supplierType: "餐饮", unit: "人次", contract: "活动餐饮保障服务合同" },
  活动物资: { main: "变动成本", l1: "材料设备成本", l2: "活动物料", l3: "指示标识", supplierType: "物料", unit: "批", contract: "活动物资供应合同" },
  临时安保: { main: "变动成本", l1: "人工成本", l2: "活动临勤人员", l3: "临时安保", supplierType: "安保", unit: "人次", contract: "临时安保服务合同" },
  临时保洁: { main: "变动成本", l1: "人工成本", l2: "活动临勤人员", l3: "临时保洁", supplierType: "物业", unit: "人次", contract: "临时保洁服务合同" },
  现场服务: { main: "变动成本", l1: "现场服务成本", l2: "现场保障", l3: "秩序维护", supplierType: "会展", unit: "人次", contract: "现场服务保障合同" },
  工作人员餐饮: { main: "变动成本", l1: "餐饮成本", l2: "工作餐", l3: "人员餐饮", supplierType: "餐饮", unit: "人次", contract: "工作人员餐饮服务合同" },
  现场保障物资: { main: "变动成本", l1: "材料设备成本", l2: "活动物料", l3: "指示标识", supplierType: "物料", unit: "批", contract: "现场保障物资服务合同" },
  铁马围挡: { main: "变动成本", l1: "材料设备成本", l2: "设备租赁", l3: "音响灯光", supplierType: "租赁", unit: "米", contract: "铁马围挡租赁服务合同" },
  移动厕所: { main: "变动成本", l1: "其他成本", l2: "现场杂项", l3: "应急服务", supplierType: "租赁", unit: "个", contract: "移动厕所租赁服务合同" },
  设备租赁: { main: "变动成本", l1: "材料设备成本", l2: "设备租赁", l3: "音响灯光", supplierType: "租赁", unit: "套", contract: "活动设备租赁服务合同" },
  维修保障: { main: "固定成本", l1: "设备及设施维护成本", l2: "设施维修", l3: "照明维修", supplierType: "设备", unit: "项", contract: "活动维修保障服务合同" },
  会务执行: { main: "变动成本", l1: "活动策划成本", l2: "现场执行", l3: "导演统筹", supplierType: "会展", unit: "场", contract: "会务执行服务合同" },
  宣传物料: { main: "管理费用", l1: "宣传物料费", l2: "物料制作", l3: "海报画册", supplierType: "广告", unit: "批", contract: "宣传物料制作合同" },
  茶歇餐饮: { main: "变动成本", l1: "餐饮成本", l2: "茶歇保障", l3: "会议茶歇", supplierType: "餐饮", unit: "人次", contract: "茶歇餐饮服务合同" },
  "讲师/主持服务": { main: "变动成本", l1: "人工成本", l2: "展会服务人员", l3: "接待人员", supplierType: "人力", unit: "人次", contract: "讲师主持服务合同" },
  摄影摄像: { main: "管理费用", l1: "摄影摄像费", l2: "影像采集", l3: "现场摄影", supplierType: "广告", unit: "场", contract: "摄影摄像服务合同" },
  临勤服务: { main: "变动成本", l1: "人工成本", l2: "活动临勤人员", l3: "临时安保", supplierType: "人力", unit: "人次", contract: "临勤人员服务合同" },
  固定成本分摊: { main: "固定成本", l1: "场馆运行成本（日常运营）", l2: "日常物业运行", l3: "安保服务", supplierType: "物业", unit: "项", contract: "活动固定成本分摊单" },
  管理费用分摊: { main: "管理费用", l1: "职工薪酬", l2: "管理人员薪酬", l3: "工资薪金", supplierType: "财务", unit: "项", contract: "活动管理费用分摊单" },
  物耗: { main: "变动成本", l1: "材料设备成本", l2: "活动物料", l3: "低值易耗品", supplierType: "物料", unit: "批", contract: "活动物耗采购合同" },
  水电网接驳: { main: "变动成本", l1: "场馆运行成本（活动期间）", l2: "活动能耗", l3: "临时用电", supplierType: "设备", unit: "点位", contract: "水电网接驳服务合同" },
  空调能源: { main: "变动成本", l1: "场馆运行成本（活动期间）", l2: "活动能耗", l3: "空调用能", supplierType: "设备", unit: "千瓦时", contract: "空调能源保障服务合同" },
  展位搭建: { main: "变动成本", l1: "现场服务成本", l2: "搭建执行", l3: "标准展位搭建", supplierType: "会展", unit: "平方米", contract: "展位搭建服务合同" },
  临勤: { main: "变动成本", l1: "人工成本", l2: "活动临勤人员", l3: "临勤服务", supplierType: "人力", unit: "人次", contract: "临勤人员服务合同" },
  物料搭建: { main: "变动成本", l1: "活动策划成本", l2: "现场执行", l3: "氛围布置", supplierType: "会展", unit: "项", contract: "物料搭建服务合同" },
  清洁临勤: { main: "变动成本", l1: "人工成本", l2: "活动临勤人员", l3: "临时保洁", supplierType: "物业", unit: "人次", contract: "清洁临勤服务合同" },
  广告氛围: { main: "管理费用", l1: "宣传物料费", l2: "物料制作", l3: "现场广告氛围", supplierType: "广告", unit: "批", contract: "广告氛围布置合同" },
  临时用工: { main: "变动成本", l1: "人工成本", l2: "活动临勤人员", l3: "临时用工", supplierType: "人力", unit: "人次", contract: "临时用工服务合同" },
  "引流活动/布置/开幕式": { main: "变动成本", l1: "活动策划成本", l2: "现场执行", l3: "配套活动执行", supplierType: "会展", unit: "项", contract: "引流活动及开幕式执行合同" },
  物料制作: { main: "变动成本", l1: "材料设备成本", l2: "活动物料", l3: "物料制作", supplierType: "物料", unit: "批", contract: "活动物料制作合同" },
  保洁易耗品: { main: "变动成本", l1: "材料设备成本", l2: "活动物料", l3: "保洁易耗品", supplierType: "物业", unit: "批", contract: "保洁易耗品采购合同" },
  活动报备支出: { main: "变动成本", l1: "其他成本", l2: "现场杂项", l3: "活动报备", supplierType: "会展", unit: "项", contract: "活动报备服务合同" },
  场地及服务: { main: "变动成本", l1: "现场服务成本", l2: "现场保障", l3: "场地服务", supplierType: "会展", unit: "场", contract: "场地及服务保障合同" },
  能耗及维修: { main: "变动成本", l1: "场馆运行成本（活动期间）", l2: "活动能耗", l3: "能耗维修", supplierType: "设备", unit: "项", contract: "能耗及维修保障合同" },
  物料: { main: "变动成本", l1: "材料设备成本", l2: "活动物料", l3: "现场物料", supplierType: "物料", unit: "批", contract: "活动物料供应合同" },
  能源成本: { main: "变动成本", l1: "场馆运行成本（活动期间）", l2: "活动能耗", l3: "能源成本", supplierType: "设备", unit: "千瓦时", contract: "活动能源保障合同" },
  餐饮费用: { main: "变动成本", l1: "餐饮成本", l2: "工作餐", l3: "人员餐饮", supplierType: "餐饮", unit: "人次", contract: "活动餐饮服务合同" },
  自办展成本: { main: "变动成本", l1: "活动策划成本", l2: "现场执行", l3: "自办展执行", supplierType: "会展", unit: "项", contract: "自办展执行服务合同" },
  现场零星费用: { main: "变动成本", l1: "其他成本", l2: "现场杂项", l3: "现场零星支出", supplierType: "物料", unit: "批", contract: "现场零星服务合同" },
  数字化服务: { main: "变动成本", l1: "现场服务成本", l2: "现场保障", l3: "数字化服务", supplierType: "会展", unit: "项", contract: "数字化服务合同" },
  宣传费用: { main: "管理费用", l1: "宣传推广费", l2: "媒体投放", l3: "活动传播", supplierType: "广告", unit: "项", contract: "宣传推广服务合同" },
  招标代理费: { main: "管理费用", l1: "中介机构费", l2: "代理服务", l3: "招标代理", supplierType: "会展", unit: "项", contract: "招标代理服务合同" },
  采购平台服务费: { main: "管理费用", l1: "中介机构费", l2: "平台服务", l3: "采购平台", supplierType: "会展", unit: "项", contract: "采购平台服务合同" },
  管理费: { main: "管理费用", l1: "办公费", l2: "活动管理", l3: "管理服务", supplierType: "财务", unit: "项", contract: "活动管理服务合同" },
  差旅费用: { main: "管理费用", l1: "差旅交通费", l2: "活动差旅", l3: "交通住宿", supplierType: "财务", unit: "项", contract: "活动差旅服务合同" },
};

const ACTIVITY_SAMPLE_OVERRIDES = {
  "sjz-1": {
    name: "2026特色年货主题展",
    type: "消费活动",
    areaName: "石家庄国际会展中心1、2、3号馆",
    area: 24000,
    audience: 52000,
    booths: 380,
    startDate: "2026-01-12",
    endDate: "2026-01-18",
    totalCost: 504600,
    directCost: 415200,
    fixedAllocation: 54000,
    manageAllocation: 35400,
    items: [
      ["标准展位搭建", 105000],
      ["临勤", 56000],
      ["水电网接驳", 52000],
      ["能耗", 45000],
      ["地毯铺设", 36000],
      ["物耗", 32000],
      ["空调能源", 32000],
      ["物料搭建", 27000],
      ["展位搭建", 18000],
      ["电力接驳", 12200],
    ],
    note: "参考年货主题展样本，按场地相关成本、二次项成本和自办部分成本拆分。",
  },
  "sjz-3": {
    name: "2026HPE热泵展",
    type: "展会",
    areaName: "石家庄国际会展中心1、2、3、5、6、8号馆",
    area: 55000,
    meetingArea: 9114,
    audience: 68000,
    booths: 538,
    startDate: "2026-03-16",
    endDate: "2026-03-18",
    totalCost: 1910600,
    directCost: 1688100,
    fixedAllocation: 121900,
    manageAllocation: 100600,
    items: [
      ["标准展位搭建", 445000],
      ["特装搭建", 318000],
      ["水电气接驳", 186000],
      ["广告氛围", 162000],
      ["地毯铺设", 148000],
      ["临勤安保", 126000],
      ["清洁临勤", 87000],
      ["能耗", 93000],
      ["餐饮服务", 64000],
      ["物耗", 59100],
    ],
    note: "参考热泵展样本，保留变动成本为主、固定成本分摊和管理费用分摊为辅的结构。",
  },
  "zmd-1": {
    name: "2026天中年货节",
    type: "消费活动",
    areaName: "驻马店国际会展中心E展厅及中庭",
    area: 20000,
    audience: 46000,
    booths: 320,
    startDate: "2026-01-31",
    endDate: "2026-02-08",
    totalCost: 303000,
    directCost: 303000,
    fixedAllocation: 0,
    manageAllocation: 0,
    items: [
      ["主场服务", 109000],
      ["临时用工", 49300],
      ["引流活动/布置/开幕式", 135800],
      ["物料制作", 900],
      ["保洁易耗品", 5000],
      ["活动报备支出", 3000],
    ],
    note: "参考天中年货节样本，按现场运营成本和配套活动成本拆分。",
  },
  "lzhz-1": {
    name: "柳州农博会",
    type: "展会",
    areaName: "柳州会展A馆",
    area: 12000,
    audience: 52000,
    booths: 310,
    startDate: "2026-01-10",
    endDate: "2026-01-13",
    totalCost: 428000,
    directCost: 410000,
    fixedAllocation: 10000,
    manageAllocation: 8000,
    items: [
      ["展位搭建", 82000],
      ["自办展成本", 50000],
      ["临勤安保", 56000],
      ["临勤保洁", 52000],
      ["能源成本", 48000],
      ["广告物料", 45000],
      ["电力接驳", 42000],
      ["餐饮费用", 35000],
    ],
    note: "参考柳州农博会样本，重点体现展会现场变动成本。",
  },
  "liuti-1": {
    name: "潮音风暴超级演唱会",
    type: "演唱会",
    areaName: "柳州市体育中心主场馆、停车场、集市区域",
    area: 36000,
    audience: 34000,
    booths: 0,
    startDate: "2026-01-17",
    endDate: "2026-01-17",
    totalCost: 841900,
    directCost: 532600,
    fixedAllocation: 190000,
    manageAllocation: 119300,
    items: [
      ["场地及服务", 24600],
      ["现场服务", 69300],
      ["临勤保洁", 60000],
      ["工作人员餐饮", 48000],
      ["能耗及维修", 82000],
      ["物料", 55000],
      ["铁马围挡", 75000],
      ["移动厕所", 35000],
      ["垃圾清运", 8400],
      ["设备租赁", 75300],
    ],
    note: "参考潮音风暴演唱会样本，按体育场馆现场服务和保障类成本拆分。",
  },
  "yunqi-1": {
    name: "好房子建设暨建材创新应用展",
    type: "展会",
    areaName: "规划政策展示区、数字化体验区、企业展示区、室外样板房区、路演区",
    area: 5000,
    audience: 4381,
    booths: 20,
    startDate: "2026-01-09",
    endDate: "2026-01-12",
    totalCost: 866000,
    directCost: 742000,
    fixedAllocation: 62000,
    manageAllocation: 62000,
    items: [
      ["数字化服务", 250000],
      ["主场服务", 180000],
      ["宣传费用", 120000],
      ["差旅费用", 68000],
      ["招标代理费", 45000],
      ["管理费", 41000],
      ["采购平台服务费", 38000],
    ],
    note: "参考好房子展样本，按当前项目月度成本缩放，保留数字化服务、主场服务和宣传费用为主要构成。",
  },
};

function generateActivityData(baseRecords) {
  const activities = [];
  const records = [];
  let serial = 1;
  PROJECTS.forEach((project) => {
    MONTHS.forEach((month) => {
      const plan = ACTIVITY_PLAN[project.id][month - 1];
      const sample = ACTIVITY_SAMPLE_OVERRIDES[`${project.id}-${month}`];
      const name = sample ? sample.name : plan[0];
      const type = sample ? sample.type : plan[1];
      const projectMonthTotal = sumRecords(baseRecords.filter((record) => record.projectId === project.id && record.month === month));
      const sampleCost = sample ? resolveSampleActivityCost(sample, projectMonthTotal) : null;
      const targetShare = sampleCost ? 0 : activityShare(project, type, month);
      const totalCost = sampleCost ? sampleCost.totalCost : roundHundred(projectMonthTotal * targetShare);
      const fixedAllocation = sampleCost ? sampleCost.fixedAllocation : roundHundred(totalCost * (0.11 + seededNumber(`act-fixed-${project.id}-${month}`) * 0.06));
      const manageAllocation = sampleCost ? sampleCost.manageAllocation : roundHundred(totalCost * (0.08 + seededNumber(`act-manage-${project.id}-${month}`) * 0.05));
      const directCost = sampleCost ? sampleCost.directCost : Math.max(1200, totalCost - fixedAllocation - manageAllocation);
      const startDay = sample && sample.startDate ? Number(sample.startDate.slice(-2)) : 5 + Math.floor(seededNumber(`act-start-${project.id}-${month}`) * 12);
      const duration = type === "展会" ? 3 : type === "演唱会" ? 1 : type === "体育赛事" ? 2 : 2;
      const activityId = `ACT-${project.code}-${String(month).padStart(2, "0")}`;
      const area = sample && sample.area ? sample.area : activityArea(project, type, month);
      const audience = sample && sample.audience ? sample.audience : activityAudience(project, type, month);
      const booths = sample && Number.isFinite(sample.booths) ? sample.booths : activityBooths(type, area, month);
      const costItems = buildActivityCostRecords({
        project,
        month,
        activityId,
        name,
        type,
        totalCost,
        directCost,
        fixedAllocation,
        manageAllocation,
        area,
        audience,
        booths,
        startDay,
        sampleItems: sampleCost ? sampleCost.items : null,
        serialStart: serial,
      });
      records.push(...costItems.records);
      serial = costItems.nextSerial;
      const suppliers = new Set(costItems.records.map((record) => record.supplier));
      const contracts = new Set(costItems.records.map((record) => record.contractNo));
      const topItems = costItems.records
        .map((record) => ({ name: record.activityCostItem, amount: record.amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);
      activities.push({
        activityId,
        name,
        projectId: project.id,
        projectName: project.shortName,
        projectFullName: project.fullName,
        month,
        monthLabel: `2026年${month}月`,
        startDate: sample && sample.startDate ? sample.startDate : makeDate(month, startDay),
        endDate: sample && sample.endDate ? sample.endDate : makeDate(month, Math.min(28, startDay + duration)),
        activityType: type,
        venueType: ["liuti"].includes(project.id) ? "体育场馆" : ["lzwh", "lzsd", "lzlib"].includes(project.id) ? "公共文化空间" : "会展场馆",
        areaName: sample && sample.areaName ? sample.areaName : activityAreaName(project, type),
        area,
        booths,
        audience,
        meetingArea: sample && sample.meetingArea ? sample.meetingArea : 0,
        totalCost,
        directCost,
        fixedAllocation,
        manageAllocation,
        allocationCost: fixedAllocation + manageAllocation,
        nonActivityCost: Math.max(0, projectMonthTotal - totalCost),
        projectMonthTotal,
        costRatio: totalCost / Math.max(1, projectMonthTotal),
        topItems,
        ncCount: costItems.records.length,
        supplierCount: suppliers.size,
        contractCount: contracts.size,
        measureName: activityMeasureName(type),
        unitCostLabel: activityUnitCostLabel(type, totalCost, area, audience, booths),
        dataSource: "NC系统",
        note: sample && sample.note ? sample.note : "按当前项目月度成本等比例生成活动成本结构，用于展示活动成本查看。",
      });
    });
  });
  return { activities, records };
}

function resolveSampleActivityCost(sample, projectMonthTotal) {
  const maxTotal = Math.max(1200, Math.floor(projectMonthTotal * 0.82));
  const scale = sample.totalCost >= projectMonthTotal ? maxTotal / sample.totalCost : 1;
  const totalCost = roundSampleAmount(sample.totalCost * scale);
  const fixedAllocation = sample.fixedAllocation ? roundSampleAmount(sample.fixedAllocation * scale) : 0;
  const manageAllocation = sample.manageAllocation ? roundSampleAmount(sample.manageAllocation * scale) : 0;
  const directCost = Math.max(0, totalCost - fixedAllocation - manageAllocation);
  const sourceItems = sample.items.map(([name, amount]) => ({ name, amount: roundSampleAmount(amount * scale) }));
  const itemTotal = sourceItems.reduce((sum, item) => sum + item.amount, 0);
  const diff = directCost - itemTotal;
  if (sourceItems.length && Math.abs(diff) > 0) {
    const target = sourceItems.reduce((maxIndex, item, index, list) => item.amount > list[maxIndex].amount ? index : maxIndex, 0);
    sourceItems[target].amount = Math.max(0, sourceItems[target].amount + diff);
  }
  return { totalCost, directCost, fixedAllocation, manageAllocation, items: sourceItems };
}

function roundSampleAmount(value) {
  return Math.max(0, Math.round(value / 100) * 100);
}

function buildActivityCostRecords(context) {
  const templateItems = context.sampleItems ? context.sampleItems.map((item) => item.name) : activityTemplateItems(context.type);
  const directItems = context.sampleItems || templateItems.filter((name) => !["固定成本分摊", "管理费用分摊"].includes(name)).map((name) => ({ name }));
  const weights = directItems.map((item, index) => item.amount || 0.72 + seededNumber(`act-weight-${context.activityId}-${item.name}-${index}`) * 0.52);
  const weightTotal = weights.reduce((sum, item) => sum + item, 0) || 1;
  const records = [];
  let usedDirect = 0;
  let serial = context.serialStart;

  directItems.forEach((item, index) => {
    const itemName = item.name;
    const isLast = index === directItems.length - 1;
    const remainingItems = directItems.length - index;
    const suggested = item.amount || roundHundred(context.directCost * (weights[index] / weightTotal));
    const minReserve = context.sampleItems ? 0 : 1200;
    const maxAllowed = Math.max(0, context.directCost - usedDirect - minReserve * (remainingItems - 1));
    const amount = isLast ? Math.max(0, context.directCost - usedDirect) : Math.min(suggested, maxAllowed);
    usedDirect += amount;
    records.push(activityRecord(context, itemName, amount, serial, true, false, "直接归集"));
    serial += 1;
  });
  if (context.fixedAllocation > 0) {
    records.push(activityRecord(context, "固定成本分摊", context.fixedAllocation, serial, false, true, "按使用面积和活动天数分摊"));
    serial += 1;
  }
  if (context.manageAllocation > 0) {
    records.push(activityRecord(context, "管理费用分摊", context.manageAllocation, serial, false, true, "按活动组织工时分摊"));
    serial += 1;
  }
  return { records, nextSerial: serial };
}

function activityRecord(context, itemName, amount, serial, directCollected, allocated, allocationBasis) {
  const project = context.project;
  const meta = ACTIVITY_ITEM_META[itemName] || ACTIVITY_ITEM_META.活动物资;
  const subjectKey = [meta.main, meta.l1, meta.l2, meta.l3].join("|");
  const supplierPool = SUPPLIER_BANK[meta.supplierType] || SUPPLIER_BANK.会展;
  const supplier = `${project.province}${supplierPool[serial % supplierPool.length]}`;
  const occurDay = Math.min(27, context.startDay + Math.floor(seededNumber(`act-day-${context.activityId}-${itemName}`) * 4));
  const quantity = activityItemQuantity(itemName, context, meta.unit);
  const serialText = String(serial).padStart(5, "0");
  return {
    id: `ACTNC-${project.code}-${String(context.month).padStart(2, "0")}-${serialText}`,
    activityId: context.activityId,
    activityName: context.name,
    projectId: project.id,
    projectName: project.shortName,
    projectFullName: project.fullName,
    costMonth: `2026年${context.month}月`,
    month: context.month,
    occurDate: makeDate(context.month, occurDay),
    postDate: makeDate(context.month, Math.min(28, occurDay + 2)),
    main: meta.main,
    l1: meta.l1,
    l2: meta.l2,
    l3: meta.l3,
    subjectKey,
    subjectPath: `${meta.main}-${meta.l1}-${meta.l2}-${meta.l3}`,
    pathKeys: [meta.main, `${meta.main}|${meta.l1}`, `${meta.main}|${meta.l1}|${meta.l2}`, subjectKey],
    activityCostItem: itemName,
    costItemName: itemName,
    amount,
    directCollected,
    allocated,
    allocationBasis,
    measureUnit: meta.unit,
    measureQty: quantity,
    unitCost: amount / Math.max(1, quantity),
    supplier,
    contractName: `${context.name}${meta.contract}`,
    contractNo: `HT-2026-${project.code}-ACT-${String(context.month).padStart(2, "0")}-${serialText}`,
    settlementNo: `JS-2026-${project.code}-ACT-${String(context.month).padStart(2, "0")}-${serialText}`,
    paymentNo: `FK-2026-${project.code}-ACT-${String(context.month).padStart(2, "0")}-${serialText}`,
    summary: `${project.fullName}2026年${context.month}月${context.name}${itemName}成本入账`,
    dataSource: "NC系统",
    contractAmount: roundHundred(amount * (1.8 + seededNumber(`act-contract-${context.activityId}-${itemName}`))),
  };
}

function generateActivityCostSubjects(activities, activityRecords) {
  const activityById = Object.fromEntries(activities.map((activity) => [activity.activityId, activity]));
  const groups = new Map();
  activityRecords.forEach((record) => {
    const subject = costSubjectForRecord(record);
    const collectType = record.allocated ? "分摊归集" : "直接归集";
    const key = `${record.activityId}|${record.projectId}|${subject.id}|${collectType}`;
    if (!groups.has(key)) {
      const activity = activityById[record.activityId] || {};
      groups.set(key, {
        activityId: record.activityId,
        projectId: record.projectId,
        subjectId: subject.id,
        subjectName: subject.name,
        category: subject.category,
        amount: 0,
        collectType,
        contractNos: new Set(),
        supplierIds: new Set(),
        ncRecordIds: [],
        activityName: activity.name || record.activityName || "",
      });
    }
    const group = groups.get(key);
    group.amount += record.amount;
    group.contractNos.add(record.contractNo);
    group.supplierIds.add(supplierIdFor(record.supplier));
    group.ncRecordIds.push(record.id);
  });

  return [...groups.values()].map((group) => ({
    activityId: group.activityId,
    projectId: group.projectId,
    subjectId: group.subjectId,
    subjectName: group.subjectName,
    category: group.category,
    amount: Math.round(group.amount),
    collectType: group.collectType,
    contractCount: group.contractNos.size,
    ncCount: group.ncRecordIds.length,
    supplierIds: [...group.supplierIds],
    ncRecordIds: group.ncRecordIds,
  }));
}

function generateUnitCostItems(activityRecords) {
  return activityRecords.map((record, index) => {
    const subject = costSubjectForRecord(record);
    const profile = unitCostProfile(record);
    const quantity = profile.quantity;
    const unitPrice = roundMoney(record.amount / Math.max(1, quantity));
    const amount = roundMoney(quantity * unitPrice);
    return normalizeUnitBenchmarkItem({
      itemId: `UCI-${String(index + 1).padStart(5, "0")}`,
      projectId: record.projectId,
      projectName: record.projectName,
      month: record.month,
      activityId: record.activityId,
      activityName: record.activityName,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectKey: record.subjectKey,
      costItemName: record.activityCostItem,
      supplierName: record.supplier,
      contractName: record.contractName,
      contractNo: record.contractNo,
      ncRecordId: record.id,
      unit: profile.unit,
      quantity,
      unitPrice,
      amount,
      canBenchmark: profile.canBenchmark,
      benchmarkType: profile.benchmarkType,
    });
  });
}

function costSubjectForRecord(record) {
  return COST_SUBJECT_TREE.find((subject) => subject.level === 1 && subject.category === record.main && subject.name === record.l1)
    || COST_SUBJECT_TREE.find((subject) => subject.level === 0 && subject.category === record.main)
    || COST_SUBJECT_TREE[0];
}

function supplierIdFor(name) {
  return `SUP-${stableHash(name).toString(36).toUpperCase().padStart(6, "0")}`;
}

function stableHash(text) {
  return String(text).split("").reduce((hash, char) => {
    const next = ((hash << 5) - hash) + char.charCodeAt(0);
    return next >>> 0;
  }, 2166136261);
}

function unitCostProfile(record) {
  const name = record.activityCostItem || record.costItemName || "";
  const defaultQuantity = Math.max(1, Number(record.measureQty) || 1);
  const oneItem = { unit: "项", quantity: 1, canBenchmark: false, benchmarkType: "综合包干" };

  if (record.allocated || name.includes("分摊")) return oneItem;
  if (name.includes("安保") || name.includes("临勤") || name.includes("临时用工") || name.includes("讲师") || name.includes("主持")) {
    return { unit: "人/天", quantity: defaultQuantity, canBenchmark: true, benchmarkType: "人工服务" };
  }
  if (name.includes("保洁") || name.includes("清洁")) {
    return { unit: "人/天", quantity: defaultQuantity, canBenchmark: true, benchmarkType: "人工服务" };
  }
  if (name.includes("特装搭建") || name.includes("标准展位搭建") || name.includes("展位搭建")) {
    return { unit: "平方米", quantity: defaultQuantity, canBenchmark: true, benchmarkType: "搭建服务" };
  }
  if (name.includes("地毯")) {
    return { unit: "平方米", quantity: defaultQuantity, canBenchmark: true, benchmarkType: "物料制作" };
  }
  if (name.includes("餐饮") || name.includes("工作餐") || name.includes("茶歇")) {
    return { unit: "份", quantity: defaultQuantity, canBenchmark: true, benchmarkType: "餐饮服务" };
  }
  if (name.includes("电费") || name.includes("用电") || name.includes("能耗") || name.includes("能源") || name.includes("空调")) {
    return { unit: "度", quantity: defaultQuantity, canBenchmark: true, benchmarkType: "能耗资源" };
  }
  if (name.includes("水费")) {
    return { unit: "吨", quantity: defaultQuantity, canBenchmark: true, benchmarkType: "能耗资源" };
  }
  if (name.includes("电力接驳") || name.includes("水电") || name.includes("接驳")) {
    return { unit: "点位", quantity: defaultQuantity, canBenchmark: true, benchmarkType: "能耗资源" };
  }
  if (name.includes("广告") || name.includes("物料") || name.includes("证件") || name.includes("宣传物料")) {
    return { unit: "套", quantity: defaultQuantity, canBenchmark: true, benchmarkType: "物料制作" };
  }
  if (name.includes("设备租赁")) {
    return { unit: "台/天", quantity: defaultQuantity, canBenchmark: true, benchmarkType: "设备租赁" };
  }
  if (name.includes("铁马") || name.includes("围挡")) {
    return { unit: "米", quantity: defaultQuantity, canBenchmark: true, benchmarkType: "设备租赁" };
  }
  if (name.includes("移动厕所")) {
    return { unit: "台/天", quantity: defaultQuantity, canBenchmark: true, benchmarkType: "设备租赁" };
  }
  if (name.includes("垃圾清运")) {
    return { unit: "车", quantity: defaultQuantity, canBenchmark: true, benchmarkType: "综合包干" };
  }
  if (name.includes("宣传") || name.includes("推广") || name.includes("策划") || name.includes("主场") || name.includes("会务") || name.includes("现场服务") || name.includes("数字化") || name.includes("管理费") || name.includes("代理") || name.includes("平台") || name.includes("自办展") || name.includes("零星") || name.includes("报备")) {
    return { unit: "场", quantity: 1, canBenchmark: false, benchmarkType: "综合包干" };
  }
  return oneItem;
}

function roundMoney(value) {
  return Number(value.toFixed(2));
}

function activityTemplateItems(type) {
  if (type === "演唱会" || type === "体育赛事") {
    return ["临时安保", "临时保洁", "现场服务", "工作人员餐饮", "能耗", "垃圾清运", "现场保障物资", "铁马围挡", "移动厕所", "设备租赁", "维修保障", "固定成本分摊", "管理费用分摊"];
  }
  if (type === "会议论坛" || type === "研学文化" || type === "筹开活动") {
    return ["会务执行", "宣传物料", "设备租赁", "现场服务", "茶歇餐饮", "讲师/主持服务", "活动物资", "摄影摄像", "临勤服务", "固定成本分摊", "管理费用分摊"];
  }
  return ["标准展位搭建", "特装搭建", "主场服务", "临勤安保", "临勤保洁", "电力接驳", "水电气接驳", "能耗", "广告物料", "地毯铺设", "氛围布置", "证件制作", "垃圾清运", "餐饮服务", "活动物资", "固定成本分摊", "管理费用分摊"];
}

function activityShare(project, type, month) {
  let base = 0.32;
  if (type === "展会") base = ["sjz", "lzhz", "weifang", "langfang", "yunqi"].includes(project.id) ? 0.54 : 0.42;
  if (type === "演唱会") base = 0.62;
  if (type === "体育赛事" || type === "消费活动") base = 0.38;
  if (type === "会议论坛" || type === "研学文化") base = 0.23;
  if (type === "筹开活动") base = 0.17;
  if (["lzsd", "lzlib", "jingzhou"].includes(project.id)) base -= 0.05;
  return Math.min(0.68, Math.max(0.12, base + (seededNumber(`act-share-${project.id}-${month}`) - 0.5) * 0.1));
}

function activityArea(project, type, month) {
  const base = type === "演唱会" || type === "体育赛事" ? project.scale / 95 : type === "研学文化" ? project.scale / 230 : project.scale / 70;
  return Math.max(600, Math.round(base * (0.82 + seededNumber(`act-area-${project.id}-${month}`) * 0.34)));
}

function activityAudience(project, type, month) {
  const base = type === "演唱会" ? project.scale / 95 : type === "体育赛事" ? project.scale / 120 : type === "研学文化" ? project.scale / 260 : project.scale / 115;
  return Math.max(120, Math.round(base * (0.75 + seededNumber(`act-aud-${project.id}-${month}`) * 0.6)));
}

function activityBooths(type, area, month) {
  if (type === "演唱会" || type === "体育赛事" || type === "研学文化") return 0;
  return Math.max(18, Math.round(area / (42 + month * 2)));
}

function activityAreaName(project, type) {
  if (project.id === "liuti") return type === "演唱会" ? "主体育场及外场" : "体育馆及训练区";
  if (["lzwh", "lzsd", "lzlib"].includes(project.id)) return "公共活动区";
  return "展厅及配套会议区";
}

function activityMeasureName(type) {
  if (type === "展会" || type === "消费活动") return "使用面积";
  if (type === "演唱会" || type === "体育赛事") return "观众人次";
  return "参会人数";
}

function activityUnitCostLabel(type, totalCost, area, audience, booths) {
  if (type === "展会" || type === "消费活动") return `${(totalCost / Math.max(1, area)).toLocaleString("zh-CN", { maximumFractionDigits: 1 })}元/平方米`;
  if (type === "演唱会" || type === "体育赛事") return `${(totalCost / Math.max(1, audience)).toLocaleString("zh-CN", { maximumFractionDigits: 1 })}元/人次`;
  return `${(totalCost / Math.max(1, audience)).toLocaleString("zh-CN", { maximumFractionDigits: 1 })}元/人`;
}

function activityItemQuantity(itemName, context, unit) {
  if (unit === "平方米") return Math.max(100, Math.round(context.area * (0.12 + seededNumber(`${context.activityId}-${itemName}-qty`) * 0.38)));
  if (unit === "人次") return Math.max(20, Math.round(context.audience * (0.08 + seededNumber(`${context.activityId}-${itemName}-qty`) * 0.24)));
  if (unit === "千瓦时") return Math.max(800, Math.round(context.area * (0.28 + seededNumber(`${context.activityId}-${itemName}-qty`) * 0.5)));
  if (unit === "点位") return Math.max(4, Math.round(context.booths / 18 + seededNumber(`${context.activityId}-${itemName}-qty`) * 8));
  if (unit === "张") return Math.max(100, Math.round(context.audience * 0.55));
  if (unit === "米") return Math.max(60, Math.round(context.area / 18));
  if (unit === "个") return Math.max(2, Math.round(context.audience / 650));
  if (unit === "套") return Math.max(1, Math.round(context.area / 2800));
  return 1 + Math.floor(seededNumber(`${context.activityId}-${itemName}-qty`) * 5);
}

function benchmarkQuantity(item, project, month, count) {
  const scale = 0.6 + project.scale / 2200000;
  const base = {
    security: 120,
    cleaning: 52000,
    maintenance: 80,
    booth: 1800,
    materials: 45,
    catering: 900,
    temporary: 380,
    promotion: 12,
  }[item.id] || 100;
  return base * scale * (0.85 + seededNumber(`qty-${project.id}-${item.id}-${month}`) * 0.3) * count;
}

function benchmarkSuppliers(item, project) {
  const map = {
    security: "安保",
    cleaning: "物业",
    maintenance: "设备",
    booth: "会展",
    materials: "物料",
    catering: "餐饮",
    temporary: "人力",
    promotion: "广告",
  };
  return (SUPPLIER_BANK[map[item.id]] || SUPPLIER_BANK.会展).map((name) => project.province + name);
}

function benchmarkContractName(item, month) {
  const names = {
    security: "2026年度场馆安保服务合同",
    cleaning: "2026年度场馆保洁服务合同",
    maintenance: "设备维修维保服务合同",
    booth: `2026年${month}月展会特装搭建合同`,
    materials: `2026年${month}月活动物资服务合同`,
    catering: `2026年${month}月餐饮保障服务合同`,
    temporary: `2026年${month}月现场临勤人员服务合同`,
    promotion: `2026年${month}月宣传推广服务合同`,
  };
  return names[item.id] || `${item.name}服务合同`;
}

function benchmarkScene(item, project, month) {
  if (item.scene === "日常运营") return "日常运营";
  const scenes = item.id === "catering" ? ["培训会议", "展会活动", "演艺赛事"] : ["展会活动", "演艺赛事", "培训会议"];
  return scenes[Math.floor(seededNumber(`scene-${project.id}-${month}-${item.id}`) * scenes.length) % scenes.length];
}

function benchmarkActivityName(project, month, item, scene) {
  if (scene === "日常运营") return `${project.shortName}场馆日常运营`;
  const names = ["春季展会", "城市招商推介会", "体育演艺活动", "行业培训会议", "综合会展活动"];
  return `${project.shortName}${MONTHS.includes(month) ? month : ""}月${names[(month + project.shortName.length) % names.length]}`;
}

function projectCategoryShares(projectIndex) {
  const fixedShift = (seededNumber(`fixed-${projectIndex}`) - 0.5) * 0.06;
  const variableShift = (seededNumber(`variable-${projectIndex}`) - 0.5) * 0.06;
  let fixed = CATEGORY_BASE_SHARE.固定成本 + fixedShift;
  let variable = CATEGORY_BASE_SHARE.变动成本 + variableShift;
  let manage = 1 - fixed - variable;
  if (manage < 0.15) {
    manage = 0.15;
    variable = 1 - fixed - manage;
  }
  return {
    固定成本: fixed,
    变动成本: variable,
    管理费用: manage,
  };
}

function contractFor(text, project, month, index) {
  const matched = CONTRACT_BY_SUBJECT.find((item) => text.includes(item.test)) || {
    name: "运营支持服务合同",
    supplier: "会展",
  };
  const supplierList = SUPPLIER_BANK[matched.supplier] || SUPPLIER_BANK.会展;
  const supplier = project.province + pick(supplierList, `${project.id}-${month}-${index}-supplier`);
  return {
    name: matched.name,
    supplier,
  };
}

function mainCode(mainName) {
  return {
    固定成本: "GD",
    变动成本: "BD",
    管理费用: "GL",
  }[mainName];
}

function makeDate(month, day) {
  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function seededNumber(input) {
  let hash = 0;
  const text = String(input);
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

function pick(list, seed) {
  return list[Math.floor(seededNumber(seed) * list.length) % list.length];
}

function roundHundred(value) {
  return Math.max(1200, Math.round(value / 100) * 100);
}
