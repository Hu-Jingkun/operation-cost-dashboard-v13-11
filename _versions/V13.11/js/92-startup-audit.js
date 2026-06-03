// V12 startup + current-data audit retained from former 90/91 legacy files.
// This file only preserves functions required by V12 startup, shared-data hardlock, and manual V12 acceptance audit.
// It must not contain renderV10* page rendering code or obsolete V10/V102/V103/V104 audit suites unless they are dependency-closure requirements of current V12 startup audit.

const V10_MONTHS = [1, 2, 3, 4, 5];

const V10_BENCHMARK_ITEM_DEFINITIONS = [
  { name: "保安服务", benchmarkType: "人工服务", unit: "人/天", canBenchmark: true, keywords: ["安保", "临勤安保", "秩序维护", "安检引导", "活动临勤人员", "临时保安", "临勤人员"] },
  { name: "保洁服务", benchmarkType: "人工服务", unit: "人/天", canBenchmark: true, keywords: ["保洁", "临勤保洁", "清洁", "夜间保洁", "日常保洁人员"] },
  { name: "标准搭建", benchmarkType: "搭建服务", unit: "平方米", canBenchmark: true, keywords: ["标准展位搭建", "标展搭建", "标准搭建", "特装搭建", "桁架搭建", "木结构搭建", "篷房搭建", "展位搭建"] },
  { name: "地毯铺设", benchmarkType: "物料制作", unit: "平方米", canBenchmark: true, keywords: ["地毯"] },
  { name: "电力接驳", benchmarkType: "能耗资源", unit: "点位", canBenchmark: true, keywords: ["电力接驳", "水电气接驳", "接驳"] },
  { name: "广告物料", benchmarkType: "物料制作", unit: "平方米", canBenchmark: true, keywords: ["广告喷绘", "广告物料", "导视物料", "氛围布置", "证件制作", "物料制作"] },
  { name: "设备租赁", benchmarkType: "设备租赁", unit: "台/天", canBenchmark: true, keywords: ["设备租赁", "音响灯光", "铁马", "围挡", "移动厕所", "安检门", "X光机"] },
  { name: "餐饮服务", benchmarkType: "餐饮服务", unit: "份", canBenchmark: true, keywords: ["盒饭", "工作人员用餐", "餐饮", "茶歇"] },
  { name: "垃圾清运", benchmarkType: "现场服务", unit: "车", canBenchmark: true, keywords: ["垃圾清运", "清运服务", "垃圾桶"] },
  { name: "临勤服务", benchmarkType: "人工服务", unit: "人/天", canBenchmark: true, keywords: ["活动临勤人员", "临勤服务", "临时用工", "现场临勤"] },
  { name: "综合包干", benchmarkType: "综合包干", unit: "项", canBenchmark: false, keywords: ["包干", "综合服务", "主场服务", "会务执行", "综合运营", "分摊", "基础物业综合服务", "现场执行设备包"] },
];

const V10_BENCHMARK_DEFINITION_BY_NAME = Object.fromEntries(V10_BENCHMARK_ITEM_DEFINITIONS.map((item) => [item.name, item]));

function normalizeBenchmarkUnit(unit, benchmarkName = "") {
  const text = String(unit || "").trim();
  if (benchmarkName === "标准搭建") return "平方米";
  if (benchmarkName === "广告物料") return "平方米";
  if (benchmarkName === "设备租赁") return "台/天";
  if (/人[\s/·]*天|人天/.test(text)) return "人/天";
  if (/平米|平方米|㎡/.test(text)) return "平方米";
  if (/台[\s/]*天|台天/.test(text)) return "台/天";
  if (/点位|点|处/.test(text)) return "点位";
  if (/个[\s/]*(场|次)|个/.test(text)) return "个/场";
  if (/份/.test(text)) return "份";
  if (/套/.test(text)) return "套";
  if (/车/.test(text)) return "车";
  if (/桶/.test(text)) return "桶";
  if (/米/.test(text)) return "米";
  if (/度/.test(text)) return "度";
  if (/吨/.test(text)) return "吨";
  if (/场/.test(text)) return benchmarkName === "综合包干" ? "场" : text;
  if (/项|月/.test(text)) return benchmarkName === "综合包干" ? "项" : text;
  return V10_BENCHMARK_DEFINITION_BY_NAME[benchmarkName]?.unit || text || "项";
}

function resolveV10BenchmarkDefinition(input = {}) {
  const text = `${input.benchmark_item_name || ""}|${input.item_name || ""}|${input.item_category || ""}|${input.subject_name || ""}|${input.contract_name || ""}`.toLowerCase();
  const originalText = `${input.benchmark_item_name || ""}${input.item_name || ""}${input.item_category || ""}${input.subject_name || ""}${input.contract_name || ""}`;
  if (input.benchmark_item_name && V10_BENCHMARK_DEFINITION_BY_NAME[input.benchmark_item_name]) {
    return V10_BENCHMARK_DEFINITION_BY_NAME[input.benchmark_item_name];
  }
  if (input.is_lump_sum || input.canBenchmark === false || /包干|综合服务|主场服务|会务执行|综合运营|分摊|基础物业综合服务|现场执行设备包/.test(originalText)) {
    return V10_BENCHMARK_DEFINITION_BY_NAME["综合包干"];
  }
  const categoryMap = {
    cleaning: "保洁服务",
    temporary_labor: /活动临勤|临勤服务|临时用工/.test(originalText) ? "临勤服务" : "保安服务",
    booth: "标准搭建",
    carpet: "地毯铺设",
    power: /用电|能耗|空调|用水/.test(originalText) ? "综合包干" : "电力接驳",
    advertising: "广告物料",
    equipment: "设备租赁",
    catering: "餐饮服务",
    garbage: "垃圾清运",
    lump_sum: "综合包干",
    property: "综合包干",
  };
  if (categoryMap[input.item_category]) return V10_BENCHMARK_DEFINITION_BY_NAME[categoryMap[input.item_category]];
  return V10_BENCHMARK_ITEM_DEFINITIONS.find((definition) => definition.keywords.some((keyword) => text.includes(keyword.toLowerCase()) || originalText.includes(keyword)))
    || V10_BENCHMARK_DEFINITION_BY_NAME["综合包干"];
}

function v10RoundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function v10Sum(rows, field = "amount") {
  return rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
}

function cloneCompatValue(value) {
  return JSON.parse(JSON.stringify(value || null));
}

function cloneV92LegacySnapshot() {
  const warnings = [];
  const capture = (name, value, fallback) => {
    if (typeof value === "undefined") {
      warnings.push(`${name} 不存在`);
      return fallback;
    }
    return cloneCompatValue(value);
  };
  return {
    PROJECTS: capture("PROJECTS", PROJECTS, []),
    MAP_POINTS: capture("MAP_POINTS", MAP_POINTS, []),
    RECORDS: capture("RECORDS", RECORDS, []),
    DETAIL_RECORDS: capture("DETAIL_RECORDS", DETAIL_RECORDS, []),
    ACTIVITIES: capture("ACTIVITIES", ACTIVITIES, []),
    ACTIVITY_RECORDS: capture("ACTIVITY_RECORDS", ACTIVITY_RECORDS, []),
    ACTIVITY_COST_SUBJECTS: capture("ACTIVITY_COST_SUBJECTS", ACTIVITY_COST_SUBJECTS, []),
    UNIT_COST_ITEMS: capture("UNIT_COST_ITEMS", UNIT_COST_ITEMS, []),
    PROJECT_BUDGETS: capture("PROJECT_BUDGETS", PROJECT_BUDGETS, {}),
    MONTH_BUDGET_WEIGHTS: capture("MONTH_BUDGET_WEIGHTS", MONTH_BUDGET_WEIGHTS, []),
    COST_SUBJECT_TREE: capture("COST_SUBJECT_TREE", COST_SUBJECT_TREE, []),
    TAXONOMY: capture("TAXONOMY", TAXONOMY, []),
    warnings,
  };
}

function compatText(value, fallback = "-") {
  if (value === undefined || value === null || value === "" || Number.isNaN(value)) return fallback;
  return String(value);
}

function compatNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function compatMonthLabel(month) {
  return `2026年${Number(month) || 1}月`;
}

function compatDate(month, day = 15) {
  return `2026-${String(Number(month) || 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function compatMainFromNature(nature, fallback = "固定成本") {
  if (nature === "variable") return "变动成本";
  if (nature === "management" || nature === "sales") return "管理费用";
  if (nature === "fixed") return "固定成本";
  if (nature === "tax") return "管理费用";
  return fallback || "固定成本";
}

function compatSubjectMeta(row = {}) {
  const subjectName = compatText(row.subject_name || row.level3_name || row.contract_item_name || row.item_name, "综合成本");
  const rawMain = ["固定成本", "变动成本", "管理费用"].includes(row.level1_name) ? row.level1_name : "";
  const main = rawMain || compatMainFromNature(row.cost_nature, "固定成本");
  let l1 = row.level2_name || subjectName;
  if (main === "固定成本") {
    if (/维保|维护|维修/.test(subjectName)) l1 = "设备及设施维护成本";
    else if (/物业|保洁|安保|水电|能耗|能源/.test(subjectName)) l1 = "场馆运行成本（日常运营）";
    else if (/薪酬|人工|人员/.test(subjectName)) l1 = "人工成本";
    else if (/税|保险|财务/.test(subjectName)) l1 = "财税成本";
    else l1 = "其他成本";
  }
  if (main === "变动成本") {
    if (/搭建|临勤|保洁|安保|接驳|现场/.test(subjectName)) l1 = "现场服务成本";
    else if (/水电|能耗|能源/.test(subjectName)) l1 = "场馆运行成本（活动期间）";
    else if (/广告|物料|地毯/.test(subjectName)) l1 = "材料设备成本";
    else if (/餐饮/.test(subjectName)) l1 = "餐饮成本";
    else l1 = "其他成本";
  }
  if (main === "管理费用") {
    if (/薪酬|工资|人员/.test(subjectName)) l1 = "职工薪酬";
    else if (/宣传|推广|广告/.test(subjectName)) l1 = "宣传推广费";
    else if (/招待/.test(subjectName)) l1 = "业务招待费";
    else if (/税|财务/.test(subjectName)) l1 = "其他费用";
    else l1 = row.level2_name || "其他费用";
  }
  const l2 = row.level2_name && row.level2_name !== l1 ? row.level2_name : l1;
  const l3 = subjectName;
  const subjectKey = [main, l1, l2, l3].join("|");
  return {
    main,
    l1,
    l2,
    l3,
    subjectKey,
    subjectPath: [main, l1, l2, l3].join("-"),
    pathKeys: [main, `${main}|${l1}`, `${main}|${l1}|${l2}`, subjectKey],
  };
}

function compatCostItemName(row = {}) {
  const text = `${row.contract_item_name || ""} ${row.item_name || ""} ${row.subject_name || ""} ${row.level3_name || ""}`;
  if (/保洁/.test(text)) return "保洁服务";
  if (/活动临勤|临勤服务|临时用工/.test(text)) return "临勤服务";
  if (/安保|保安|秩序维护|安检/.test(text)) return "保安服务";
  if (/标准展位|标展|标准搭建|特装|搭建/.test(text)) return "标准搭建";
  if (/地毯/.test(text)) return "地毯铺设";
  if (/餐饮|工作餐|茶歇/.test(text)) return "餐饮服务";
  if (/电力|接驳/.test(text)) return "电力接驳";
  if (/广告|物料|宣传/.test(text)) return "广告物料";
  if (/设备|租赁/.test(text)) return "设备租赁";
  if (/垃圾清运|清运/.test(text)) return "垃圾清运";
  if (/包干|综合/.test(text)) return "综合包干";
  return compatText(row.contract_item_name || row.item_name || row.subject_name, "综合包干");
}

function compatDataSourceLabel(source) {
  if (source === "finance") return "财务一体化";
  if (source === "allocation") return "分摊生成";
  return "NC系统";
}

function compatProjectMaps(v10Data) {
  return {
    byId: Object.fromEntries((v10Data.PROJECTS_V10 || []).map((project) => [project.project_id, project])),
    summaryById: Object.fromEntries((v10Data.VIEWS.VIEW_HOME_PROJECT_SUMMARY || []).map((row) => [row.project_id, row])),
  };
}

function buildCompatProjectsFromV10(v10Data, legacySnapshot) {
  const { byId, summaryById } = compatProjectMaps(v10Data);
  const legacyProjects = legacySnapshot.PROJECTS || [];
  const projects = legacyProjects.map((legacy, index) => {
    const v10Project = byId[legacy.id] || {};
    const summary = summaryById[legacy.id] || {};
    const budgetAmount = v10Sum((v10Data.BUDGET_LINES || []).filter((line) => line.project_id === legacy.id && line.budget_version_id && line.budget_version_id.includes("BASE")), "budget_amount");
    const cumulativeCost = compatNumber(summary.total_cost, 0);
    const currentMonthCost = compatNumber(summary.current_month_cost, 0);
    return {
      ...legacy,
      shortName: legacy.shortName || v10Project.project_short_name || legacy.id,
      fullName: legacy.fullName || v10Project.project_name || legacy.shortName || legacy.id,
      cumulativeCost,
      currentMonthCost,
      detailCount: compatNumber(summary.nc_detail_count, 0),
      budgetAmount,
      deviationRate: budgetAmount ? (cumulativeCost - budgetAmount) / budgetAmount : 0,
      projectType: v10Project.project_type || legacy.projectType || "other",
      budgetStatus: v10Project.budget_status || (projectHasBudgetBaseline(legacy.id) ? "baseline_confirmed" : "no_budget_baseline"),
      displayStatus: v10Project.display_status || projectBudgetDisplayStatus(legacy.id),
      dashboardStatus: v10Project.dashboard_status || "active",
      ncEnabled: v10Project.nc_enabled !== false,
      financeEnabled: v10Project.finance_enabled !== false,
      sortOrder: v10Project.sort_order || index + 1,
    };
  });
  const legacyIds = new Set(legacyProjects.map((project) => project.id));
  const reservedProjects = (v10Data.PROJECTS_V10 || []).filter((project) => !legacyIds.has(project.project_id));
  return { projects, reservedProjects };
}

function buildCompatRecordFromTrace(row, index, { detail = false } = {}) {
  const meta = compatSubjectMeta(row);
  const project = getProject(row.project_id);
  const month = compatNumber(row.cost_month, 1);
  const amount = roundMoney(compatNumber(row.cost_amount, 0));
  const costItem = compatCostItemName(row);
  const id = row.cost_detail_id || `V10-COMPAT-${String(index + 1).padStart(5, "0")}`;
  const isAllocation = row.fact_type === "allocated_cost";
  return {
    id,
    projectId: compatText(row.project_id, project.id),
    projectName: project ? project.shortName : compatText(row.project_name, "-"),
    projectFullName: project ? project.fullName : compatText(row.project_name, "-"),
    costMonth: compatMonthLabel(month),
    month,
    occurDate: compatDate(month, 12 + (index % 12)),
    postDate: compatDate(month, 15 + (index % 10)),
    ...meta,
    subjectId: compatText(row.subject_id, ""),
    amount,
    supplier: compatText(row.supplier_name, row.source_system === "allocation" ? "分摊生成" : "-"),
    contractName: compatText(row.contract_name, row.source_system === "finance" ? row.finance_summary : row.source_system === "allocation" ? "固定成本分摊" : "-"),
    contractNo: compatText(row.contract_code || row.contract_id, "-"),
    settlementNo: compatText(row.settlement_doc_no || row.settlement_id || row.source_doc_no, "-"),
    paymentNo: compatText(row.payment_doc_no || row.payment_id, "-"),
    summary: compatText(row.finance_summary || `${compatText(row.project_name, "")}${compatMonthLabel(month)}${meta.l3}成本明细`, "-"),
    dataSource: compatDataSourceLabel(row.source_system),
    sourceSystem: row.source_system || "NC",
    sourceDocType: row.source_doc_type || "",
    docNo: compatText(row.source_doc_no, "-"),
    ncNo: compatText(row.source_doc_no, "-"),
    activityId: compatText(row.activity_id, ""),
    activityName: compatText(row.activity_name, ""),
    activityCostItem: costItem,
    costItemName: costItem,
    benchmarkItem: detail || !isAllocation ? costItem : "",
    businessScene: row.activity_id ? "活动成本" : "项目成本",
    quantity: compatNumber(row.quantity, 0),
    unit: compatText(row.unit, "项"),
    unitPrice: compatNumber(row.unit_price, amount),
    measureUnit: compatText(row.unit, "项"),
    measureQty: compatNumber(row.quantity, 1),
    unitCost: compatNumber(row.unit_price, amount),
    contractAmount: amount,
    factType: row.fact_type || "raw_cost",
    traceAvailable: row.trace_available !== false,
    fixedPoolId: row.fixed_pool_id || "",
    allocationLineId: row.allocation_line_id || "",
    voucherNo: row.voucher_no || "",
    directCollected: row.fact_type !== "allocated_cost",
    allocated: row.fact_type === "allocated_cost",
    allocationBasis: row.fact_type === "allocated_cost" ? "固定成本池分摊" : "直接归集",
  };
}

function buildCompatRecordsFromV10(v10Data) {
  return (v10Data.VIEWS.VIEW_COST_DETAIL_TRACE || [])
    .filter((row) => row.fact_type === "raw_cost")
    .map((row, index) => buildCompatRecordFromTrace(row, index));
}

function buildCompatDetailRecordsFromV10(v10Data) {
  return (v10Data.VIEWS.VIEW_COST_DETAIL_TRACE || []).map((row, index) => buildCompatRecordFromTrace(row, index, { detail: true }));
}

function buildCompatActivitiesFromV10(v10Data, legacySnapshot) {
  const costByActivityMonth = Object.fromEntries((v10Data.VIEWS.VIEW_ACTIVITY_COST || []).map((row) => [`${row.activity_id}|${row.cost_month}`, row]));
  const rawCostByProjectMonth = (v10Data.FACT_COST_DETAIL || []).filter((row) => row.fact_type === "raw_cost").reduce((map, row) => {
    const key = `${row.project_id}|${row.cost_month}`;
    map[key] = (map[key] || 0) + compatNumber(row.cost_amount, 0);
    return map;
  }, {});
  const usageByActivity = (v10Data.ACTIVITY_VENUE_USAGE || []).reduce((map, usage) => {
    if (!map[usage.activity_id]) map[usage.activity_id] = [];
    map[usage.activity_id].push(usage);
    return map;
  }, {});
  const venueById = Object.fromEntries((v10Data.VENUES || []).map((venue) => [venue.venue_id, venue]));
  const legacyByProject = (legacySnapshot.ACTIVITIES || []).reduce((map, activity) => {
    if (!map[activity.projectId]) map[activity.projectId] = activity;
    return map;
  }, {});
  return (v10Data.ACTIVITIES_V10 || []).filter((activity) => !activity.is_base_activity).map((activity, index) => {
    const cost = costByActivityMonth[`${activity.activity_id}|${activity.cost_month}`] || {};
    const project = getProject(activity.project_id);
    const usages = usageByActivity[activity.activity_id] || [];
    const venues = usages.map((usage) => venueById[usage.venue_id]).filter(Boolean);
    const legacy = legacyByProject[activity.project_id] || {};
    const area = Math.round(v10Sum(usages, "used_area")) || legacy.area || 10000;
    const directCost = roundMoney(compatNumber(cost.direct_cost_amount, 0));
    const allocationCost = roundMoney(compatNumber(cost.allocated_cost_amount, 0));
    const totalCost = roundMoney(compatNumber(cost.total_activity_cost, directCost + allocationCost));
    const fixedAllocation = roundMoney(allocationCost * 0.65);
    const manageAllocation = roundMoney(allocationCost - fixedAllocation);
    const projectMonthTotal = roundMoney(rawCostByProjectMonth[`${activity.project_id}|${activity.cost_month}`] || 0);
    const nonActivityCost = roundMoney(Math.max(0, projectMonthTotal - totalCost));
    const typeMap = { exhibition: "展会", concert: "演唱会", sports_event: "体育赛事", meeting: "会议论坛", base: "基础活动", other: "其他" };
    const subjectRows = (v10Data.VIEWS.VIEW_ACTIVITY_COST_BY_SUBJECT || [])
      .filter((row) => row.activity_id === activity.activity_id && Number(row.cost_month) === Number(activity.cost_month))
      .sort((a, b) => compatNumber(b.cost_amount) - compatNumber(a.cost_amount))
      .slice(0, 3);
    return {
      activityId: activity.activity_id,
      id: activity.activity_id,
      name: activity.is_base_activity ? `${activity.activity_name} / 固定成本归集入口` : activity.activity_name,
      activityName: activity.activity_name,
      projectId: activity.project_id,
      projectName: project ? project.shortName : compatText(cost.project_name, "-"),
      projectFullName: project ? project.fullName : compatText(cost.project_name, "-"),
      month: compatNumber(activity.cost_month, 1),
      monthLabel: compatMonthLabel(activity.cost_month),
      startDate: activity.start_date,
      endDate: activity.end_date,
      activityType: typeMap[activity.activity_type] || "其他",
      venueType: venues.map((venue) => venue.venue_type).filter(Boolean).join("、") || "综合场馆",
      areaName: venues.map((venue) => venue.venue_name).join("、") || legacy.areaName || "项目综合区域",
      area,
      booths: legacy.booths || Math.max(0, Math.round(area / 55)),
      audience: legacy.audience || Math.max(0, Math.round(area * 0.8 + index * 120)),
      meetingArea: legacy.meetingArea || 0,
      totalCost,
      directCost,
      fixedAllocation,
      manageAllocation,
      allocationCost,
      allocatedCost: allocationCost,
      nonActivityCost,
      projectMonthTotal,
      costRatio: projectMonthTotal ? totalCost / projectMonthTotal : 0,
      topItems: subjectRows.map((row) => ({ name: row.subject_name, amount: compatNumber(row.cost_amount) })),
      ncCount: compatNumber(cost.detail_count, 0),
      detailCount: compatNumber(cost.detail_count, 0),
      supplierCount: 0,
      contractCount: 0,
      measureName: "使用面积",
      unitCostLabel: `${(totalCost / Math.max(1, area)).toLocaleString("zh-CN", { maximumFractionDigits: 1 })}元/平方米`,
      dataSource: "V10兼容数据",
      note: activity.is_base_activity ? "基础活动 / 固定成本归集入口。" : "由 V10_DATA 活动成本视图适配至 V9.2 页面结构。",
      isBaseActivity: Boolean(activity.is_base_activity),
      status: activity.status || "completed",
    };
  });
}

function buildCompatActivityRecordsFromV10(v10Data) {
  return (v10Data.VIEWS.VIEW_COST_DETAIL_TRACE || [])
    .filter((row) => row.activity_id)
    .map((row, index) => buildCompatRecordFromTrace(row, index, { detail: true }));
}

function buildCompatActivityCostSubjectsFromV10(v10Data) {
  const detailByActivitySubject = (v10Data.VIEWS.VIEW_COST_DETAIL_TRACE || []).reduce((map, row) => {
    if (!row.activity_id) return map;
    const key = `${row.activity_id}|${row.subject_id}`;
    if (!map[key]) map[key] = { supplierIds: new Set(), ncRecordIds: new Set(), contractIds: new Set() };
    if (row.supplier_id) map[key].supplierIds.add(row.supplier_id);
    if (row.cost_detail_id) map[key].ncRecordIds.add(row.cost_detail_id);
    if (row.contract_id) map[key].contractIds.add(row.contract_id);
    return map;
  }, {});
  const rows = {};
  (v10Data.VIEWS.VIEW_ACTIVITY_COST_BY_SUBJECT || []).forEach((row) => {
    const key = `${row.activity_id}|${row.subject_id}`;
    const meta = compatSubjectMeta(row);
    if (!rows[key]) {
      rows[key] = {
        activityId: row.activity_id,
        projectId: row.project_id,
        subjectId: row.subject_id,
        subjectName: row.subject_name,
        category: meta.main,
        costNature: row.cost_nature,
        amount: 0,
        directCost: 0,
        allocatedCost: 0,
        collectType: "直接归集",
        contractCount: 0,
        ncCount: 0,
        supplierIds: [],
        ncRecordIds: [],
      };
    }
    const amount = compatNumber(row.cost_amount, 0);
    rows[key].amount += amount;
    if (row.fact_type === "allocated_cost") {
      rows[key].allocatedCost += amount;
      rows[key].collectType = "直接 + 分摊";
    } else {
      rows[key].directCost += amount;
    }
  });
  Object.entries(rows).forEach(([key, row]) => {
    const detail = detailByActivitySubject[key] || { supplierIds: new Set(), ncRecordIds: new Set(), contractIds: new Set() };
    row.supplierIds = [...detail.supplierIds];
    row.ncRecordIds = [...detail.ncRecordIds];
    row.contractCount = detail.contractIds.size;
    row.ncCount = detail.ncRecordIds.size;
  });
  return Object.values(rows);
}

function buildCompatUnitCostItemsFromV10(v10Data) {
  const refs = (v10Data.UNIT_COST_REFERENCE || []).reduce((map, ref) => {
    const benchmarkName = ref.benchmark_item_name || ref.item_name;
    const unit = normalizeBenchmarkUnit(ref.normalized_unit || ref.unit, benchmarkName);
    map[`${benchmarkName}|${unit}`] = ref;
    return map;
  }, {});
  const supplierMap = Object.fromEntries((v10Data.SUPPLIERS || []).map((supplier) => [supplier.supplier_id, supplier]));
  const contractMap = Object.fromEntries((v10Data.CONTRACTS || []).map((contract) => [contract.contract_id, contract]));
  return (v10Data.VIEWS.VIEW_UNIT_COST_BENCHMARK || []).filter((row) => {
    if (!projectHasBudgetBaseline(row.project_id)) return false;
    const definition = resolveV10BenchmarkDefinition(row);
    return !["特装搭建", "标展搭建", "能耗费"].includes(definition.name);
  }).map((row, index) => {
    const benchmarkName = row.benchmark_item_name || resolveV10BenchmarkDefinition(row).name || compatCostItemName(row);
    const normalizedUnit = normalizeBenchmarkUnit(row.normalized_unit || row.unit, benchmarkName);
    const ref = refs[`${benchmarkName}|${normalizedUnit}`] || {};
    const canBenchmark = Boolean(row.canBenchmark === true && benchmarkName !== "综合包干");
    const subjectMeta = compatSubjectMeta({ subject_name: benchmarkName, level1_name: "变动成本", cost_nature: "variable" });
    const status = canBenchmark && row.status === "不参与" ? "样本较少" : (row.status || (canBenchmark ? "样本较少" : "不参与"));
    const supplierNames = [...new Set((row.supplier_ids || []).map((id) => supplierMap[id]?.supplier_name).filter(Boolean))];
    const contract = contractMap[row.contract_id] || {};
    const ncRecordIds = [...new Set(row.cost_detail_ids || [])].map(String);
    return {
      itemId: `V10-UCI-${String(index + 1).padStart(5, "0")}`,
      projectId: row.project_id,
      projectName: row.project_name,
      month: compatNumber(row.cost_month, 1),
      activityId: row.activity_id,
      activityName: row.activity_name,
      subjectId: subjectMeta.pathKeys[1],
      subjectName: subjectMeta.l1,
      subjectKey: subjectMeta.subjectKey,
      costItemName: row.item_name,
      supplierName: supplierNames.join("、") || "-",
      contractName: contract.contract_name || "-",
      contractNo: contract.contract_code || compatText((row.contract_item_ids || [])[0], "-"),
      ncRecordId: compatText(ncRecordIds[0], `V10-UCI-${index + 1}`),
      ncRecordIds,
      unit: compatText(normalizedUnit, "项"),
      quantity: compatNumber(row.quantity, 0),
      unitPrice: compatNumber(row.average_unit_price, 0),
      amount: compatNumber(row.amount, 0),
      canBenchmark,
      benchmarkType: row.benchmark_type || ref.benchmark_type || (canBenchmark ? compatText(row.item_category, "单价对标") : "综合包干"),
      normalizedName: benchmarkName,
      referenceUnitPrice: compatNumber(row.reference_unit_price || ref.reference_unit_price, 0),
      lowerBound: compatNumber(row.lower_bound || ref.lower_bound, 0),
      upperBound: compatNumber(row.upper_bound || ref.upper_bound, 0),
      status,
    };
  });
}

function buildCompatBudgetsFromV10(v10Data, legacySnapshot) {
  const baselineImports = new Set((v10Data.BUDGET_IMPORTS || []).filter((row) => row.version_type === "baseline").map((row) => row.budget_version_id));
  const budgets = cloneCompatValue(legacySnapshot.PROJECT_BUDGETS || {});
  Object.keys(budgets).forEach((key) => {
    budgets[key].annualBudgetWan = 0;
  });
  (v10Data.BUDGET_LINES || []).forEach((line) => {
    if (!baselineImports.has(line.budget_version_id)) return;
    if (!budgets[line.project_id]) {
      const project = getProject(line.project_id);
      budgets[line.project_id] = {
        projectId: line.project_id,
        projectName: project ? project.shortName : line.project_id,
        budgetName: project ? project.fullName : line.project_id,
        annualBudgetWan: 0,
        budgetStatus: "no_budget_baseline",
        displayStatus: "待预算基准确认",
      };
    }
    budgets[line.project_id].annualBudgetWan += compatNumber(line.budget_amount, 0) / 10000;
  });
  Object.keys(budgets).forEach((key) => {
    const maxBudgetMonth = Math.max(...V10_MONTHS);
    const sequenceWeight = sequenceBudgetWeight(maxBudgetMonth) || 1;
    budgets[key].annualBudgetWan = roundMoney((budgets[key].annualBudgetWan || 0) / sequenceWeight);
    budgets[key].budgetStatus = BUDGET_BASELINE_2026.projects[key] ? "baseline_confirmed" : "no_budget_baseline";
    budgets[key].displayStatus = BUDGET_BASELINE_2026.projects[key] ? "预算基准已确认" : "待预算基准确认";
  });
  return budgets;
}

function buildCompatCostSubjectTreeFromV10(v10Data, legacySnapshot) {
  const tree = cloneCompatValue(legacySnapshot.COST_SUBJECT_TREE || []);
  const byName = Object.fromEntries((v10Data.COST_SUBJECTS || []).map((subject) => [subject.subject_name, subject]));
  return tree.map((node) => {
    const subject = byName[node.name] || {};
    return {
      ...node,
      v10SubjectId: subject.subject_id || node.v10SubjectId || "",
      measurementPolicy: subject.measurement_policy || node.measurementPolicy || "",
      costNature: subject.cost_nature || node.costNature || "",
    };
  });
}

function buildV92CompatibleDataFromV10(v10Data, legacySnapshot) {
  const projectResult = buildCompatProjectsFromV10(v10Data, legacySnapshot);
  const RECORDS_COMPAT = buildCompatRecordsFromV10(v10Data);
  const DETAIL_RECORDS_COMPAT = buildCompatDetailRecordsFromV10(v10Data);
  const ACTIVITIES_COMPAT = buildCompatActivitiesFromV10(v10Data, legacySnapshot);
  const ACTIVITY_RECORDS_COMPAT = buildCompatActivityRecordsFromV10(v10Data);
  const ACTIVITY_COST_SUBJECTS_COMPAT = buildCompatActivityCostSubjectsFromV10(v10Data);
  const UNIT_COST_ITEMS_COMPAT = buildCompatUnitCostItemsFromV10(v10Data);
  return {
    PROJECTS: projectResult.projects,
    RECORDS: RECORDS_COMPAT,
    DETAIL_RECORDS: DETAIL_RECORDS_COMPAT,
    ACTIVITIES: ACTIVITIES_COMPAT,
    ACTIVITY_RECORDS: ACTIVITY_RECORDS_COMPAT,
    ACTIVITY_COST_SUBJECTS: ACTIVITY_COST_SUBJECTS_COMPAT,
    UNIT_COST_ITEMS: UNIT_COST_ITEMS_COMPAT,
    PROJECT_BUDGETS: buildCompatBudgetsFromV10(v10Data, legacySnapshot),
    MONTH_BUDGET_WEIGHTS: cloneCompatValue(legacySnapshot.MONTH_BUDGET_WEIGHTS || MONTH_BUDGET_WEIGHTS),
    COST_SUBJECT_TREE: buildCompatCostSubjectTreeFromV10(v10Data, legacySnapshot),
    META: {
      source: "V10_DATA",
      generatedAt: "runtime",
      reservedProjects: projectResult.reservedProjects,
      legacyWarnings: legacySnapshot.warnings || [],
      rawRecordCount: RECORDS_COMPAT.length,
      detailRecordCount: DETAIL_RECORDS_COMPAT.length,
      allocatedDetailCount: DETAIL_RECORDS_COMPAT.filter((record) => record.factType === "allocated_cost").length,
    },
  };
}

function replaceArrayContents(target, source) {
  if (Array.isArray(target)) target.splice(0, target.length, ...(source || []));
}

function replaceObjectContents(target, source) {
  Object.keys(target).forEach((key) => delete target[key]);
  Object.assign(target, source || {});
}

function applyV10CompatDataToV92Shell(v10CompatData) {
  if (!v10CompatData) return;
  replaceArrayContents(PROJECTS, v10CompatData.PROJECTS);
  replaceArrayContents(RECORDS, v10CompatData.RECORDS);
  replaceArrayContents(DETAIL_RECORDS, v10CompatData.DETAIL_RECORDS);
  replaceArrayContents(ACTIVITIES, v10CompatData.ACTIVITIES);
  replaceArrayContents(ACTIVITY_RECORDS, v10CompatData.ACTIVITY_RECORDS);
  replaceArrayContents(ACTIVITY_COST_SUBJECTS, v10CompatData.ACTIVITY_COST_SUBJECTS);
  replaceArrayContents(UNIT_COST_ITEMS, v10CompatData.UNIT_COST_ITEMS);
  replaceArrayContents(MONTH_BUDGET_WEIGHTS, v10CompatData.MONTH_BUDGET_WEIGHTS);
  replaceArrayContents(COST_SUBJECT_TREE, v10CompatData.COST_SUBJECT_TREE);
  replaceObjectContents(PROJECT_BUDGETS, v10CompatData.PROJECT_BUDGETS);
  state.activityDetail.activityId = ACTIVITIES.find((activity) => !activity.isBaseActivity)?.activityId || ACTIVITIES[0]?.activityId || "";
  state.activityBenchmark.selectedActivityId = state.activityDetail.activityId;
  const unitOptions = getUnitBenchmarkOptions();
  const preferredBenchmark = unitOptions.find((item) => item.name === "保安服务")
    || unitOptions.find((item) => item.name !== "综合包干")
    || unitOptions[0];
  if (preferredBenchmark && (!state.benchmark.item || state.benchmark.item === "综合包干" || !unitOptions.some((item) => item.name === state.benchmark.item))) {
    state.benchmark.item = preferredBenchmark.name;
  }
}

function v111SharedGlobal() {
  return typeof window !== "undefined" ? window : globalThis;
}

function v111SharedSourceObjects() {
  const global = v111SharedGlobal();
  return {
    core: global.OPERATION_COST_DATA_CORE || null,
    views: global.OPERATION_COST_DATA_VIEWS || null,
    dictionary: global.OPERATION_COST_DATA_DICTIONARY || null,
    audit: global.OPERATION_COST_DATA_AUDIT || null,
  };
}

function v111CloneSharedValue(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function v111SharedDataStatus() {
  const source = v111SharedSourceObjects();
  const loadedFiles = [
    source.core ? V11_SHARED_DATA_FILES[0] : null,
    source.views ? V11_SHARED_DATA_FILES[1] : null,
    source.dictionary ? V11_SHARED_DATA_FILES[2] : null,
    source.audit ? V11_SHARED_DATA_FILES[3] : null,
  ].filter(Boolean);
  return {
    source,
    loadedFiles,
    hasCoreTables: Boolean(source.core?.tables),
    hasViews: Boolean(source.views?.views),
    hasDictionary: Boolean(source.dictionary),
    hasAudit: Boolean(source.audit),
  };
}

function buildV10DataFromSharedCurrent() {
  const status = v111SharedDataStatus();
  if (!status.hasCoreTables || !status.hasViews || !status.hasDictionary || !status.hasAudit) {
    throw new Error("V12 shared data layer is not fully loaded from _data/current.");
  }
  const data = {
    ...v111CloneSharedValue(status.source.core.tables),
    VIEWS: v111CloneSharedValue(status.source.views.views),
    AUDIT: v111CloneSharedValue(status.source.audit),
  };
  Object.defineProperty(data, "__sharedDataSource", {
    value: V11_SHARED_DATA_SOURCE,
    enumerable: false,
    configurable: false,
  });
  Object.defineProperty(data, "__sharedDataFiles", {
    value: [...V11_SHARED_DATA_FILES],
    enumerable: false,
    configurable: false,
  });
  Object.defineProperty(data, "__sourceVersion", {
    value: V11_VERSION,
    enumerable: false,
    configurable: false,
  });
  ensureSharedCurrentDataLoaded(data);
  return data;
}

function v112Close(actual, expected, tolerance = 0.05) {
  return Math.abs(Number(actual) - Number(expected)) <= tolerance;
}

function v112CurrentMetricSnapshot(data = V10_DATA) {
  const rawFacts = (data?.FACT_COST_DETAIL || []).filter((row) => row.fact_type === "raw_cost");
  const activityRows = data?.VIEWS?.VIEW_ACTIVITY_COST || [];
  const annualBudgetWan = BUDGET_BASELINE_2026.companyAnnualCostBudgetWan;
  const subjectById = new Map((data?.COST_SUBJECTS || []).map((subject) => [subject.subject_id, subject]));
  const janMayYuan = v10Sum(rawFacts.filter((row) => Number(row.cost_month) >= 1 && Number(row.cost_month) <= 5), "cost_amount");
  const mayYuan = v10Sum(rawFacts.filter((row) => Number(row.cost_month) === 5), "cost_amount");
  const sequenceBudget = getCompanySequenceBudget(5);
  const byNature = rawFacts.reduce((map, row) => {
    const subject = subjectById.get(row.subject_id) || {};
    const level1Name = String(row.level1_name || row.main || subject.level1_name || "");
    const key = level1Name.includes("固定")
      ? "fixed"
      : level1Name.includes("变动")
        ? "variable"
        : level1Name.includes("管理") || level1Name.includes("销售") || level1Name.includes("财税") || level1Name.includes("税")
          ? "management"
          : row.cost_nature === "management" || row.cost_nature === "sales"
            ? "management"
            : row.cost_nature;
    map[key] = (map[key] || 0) + (Number(row.cost_amount) || 0);
    return map;
  }, {});
  return {
    factRows: data?.FACT_COST_DETAIL?.length || 0,
    companyAnnualBudgetWan: annualBudgetWan,
    janMayCostWan: v10RoundMoney(janMayYuan / 10000),
    mayCostWan: v10RoundMoney(mayYuan / 10000),
    januaryCostWan: v10RoundMoney(v10Sum(rawFacts.filter((row) => Number(row.cost_month) === 1), "cost_amount") / 10000),
    januaryActivityCostWan: v10RoundMoney(v10Sum(activityRows.filter((row) => !row.is_base_activity && Number(row.cost_month) === 1), "total_activity_cost") / 10000),
    shijiazhuangCostWan: v10RoundMoney(v10Sum(rawFacts.filter((row) => row.project_id === "sjz"), "cost_amount") / 10000),
    liuzhouExhibitionCostWan: v10RoundMoney(v10Sum(rawFacts.filter((row) => row.project_id === "lzhz"), "cost_amount") / 10000),
    dayeSampleWan: v10RoundMoney(v10Sum(rawFacts.filter((row) => row.project_id === "daye"), "cost_amount") / 10000),
    fixedCostWan: v10RoundMoney((byNature.fixed || 0) / 10000),
    variableCostWan: v10RoundMoney((byNature.variable || 0) / 10000),
    managementCostWan: v10RoundMoney((byNature.management || 0) / 10000),
    annualBudgetRateText: percent(janMayYuan / Math.max(1, annualBudgetWan * 10000)),
    sequenceBudgetRateText: percent(janMayYuan / Math.max(1, sequenceBudget)),
  };
}

function ensureSharedCurrentDataLoaded(data = null) {
  const global = v111SharedGlobal();
  const source = v111SharedSourceObjects();
  const issues = [];
  const tables = source.core?.tables || data || null;
  const views = source.views?.views || data?.VIEWS || null;
  const candidate = data || (tables && views ? { ...tables, VIEWS: views } : null);
  if (!source.core?.tables) issues.push("OPERATION_COST_DATA_CORE.tables 未加载。");
  if (!source.views?.views) issues.push("OPERATION_COST_DATA_VIEWS.views 未加载。");
  if (!source.dictionary) issues.push("OPERATION_COST_DATA_DICTIONARY 未加载。");
  if (!source.audit) issues.push("OPERATION_COST_DATA_AUDIT 未加载。");
  if (!views?.VIEW_MANAGEMENT_ATTENTION_PROJECTS?.length) issues.push("VIEW_MANAGEMENT_ATTENTION_PROJECTS 未加载。");
  if (!candidate?.FACT_COST_DETAIL) issues.push("FACT_COST_DETAIL 未加载。");
  if (candidate?.FACT_COST_DETAIL?.length !== V112_EXPECTED_CURRENT_METRICS.factRows) issues.push(`FACT_COST_DETAIL 行数不是 ${V112_EXPECTED_CURRENT_METRICS.factRows}。`);
  if (data && data.__sharedDataSource !== V11_SHARED_DATA_SOURCE) issues.push("V10_DATA 未标记为 _data/current。");
  if (candidate?.FACT_COST_DETAIL?.length) {
    const snapshot = v112CurrentMetricSnapshot(candidate);
    if (!v112Close(snapshot.janMayCostWan, V112_EXPECTED_CURRENT_METRICS.janMayCostWan)) issues.push(`1-5月累计成本不匹配：${snapshot.janMayCostWan}`);
    if (!v112Close(snapshot.mayCostWan, V112_EXPECTED_CURRENT_METRICS.mayCostWan)) issues.push(`5月成本不匹配：${snapshot.mayCostWan}`);
    if (!v112Close(snapshot.companyAnnualBudgetWan, V112_EXPECTED_CURRENT_METRICS.companyAnnualBudgetWan, 0.01)) issues.push(`全年预算不匹配：${snapshot.companyAnnualBudgetWan}`);
  }
  if (issues.length) {
    V112_HARDLOCK_STATUS.sharedLoaded = false;
    V112_HARDLOCK_STATUS.blocked = true;
    V112_HARDLOCK_STATUS.source = "";
    V112_HARDLOCK_STATUS.error = issues.join(" ");
    throw new Error(`共享数据层未加载：${issues.join(" ")}`);
  }
  V112_HARDLOCK_STATUS.sharedLoaded = true;
  V112_HARDLOCK_STATUS.blocked = false;
  V112_HARDLOCK_STATUS.source = V11_SHARED_DATA_SOURCE;
  V112_HARDLOCK_STATUS.error = "";
  global.V112_HARDLOCK_STATUS = V112_HARDLOCK_STATUS;
  return true;
}

function renderV112SharedDataBlocked(error) {
  V112_HARDLOCK_STATUS.blocked = true;
  V112_HARDLOCK_STATUS.sharedLoaded = false;
  V112_HARDLOCK_STATUS.error = error && error.message ? error.message : String(error || "");
  if (!app) return;
  const template = document.createElement("template");
  template.innerHTML = `
    <section class="section" data-v112-hardlock-blocked="true">
      <div class="section-header">
        <div>
          <h1 class="section-title">共享数据层未加载</h1>
          <div class="section-note">当前页面禁止使用本地兼容数据展示。请确认 _data/current 文件是否存在，或通过正确路径打开页面。</div>
        </div>
      </div>
      <div class="management-conclusion-card">
        <strong>已阻断旧本地数据渲染</strong>
        <ol class="management-conclusion-list">
          <li>V12 必须读取 _data/current，禁止静默回退到旧本地数据。</li>
          <li>当前共享数据加载失败，页面已停止展示经营数据，防止展示旧本地口径。</li>
          <li>错误信息：${escapeHtml(V112_HARDLOCK_STATUS.error)}</li>
        </ol>
      </div>
    </section>
  `.trim();
  app.replaceChildren(template.content);
}

function v112BodyText() {
  return typeof document !== "undefined" && document.body ? document.body.innerText || "" : "";
}

function v112HasBadToken(text = v112BodyText()) {
  return /(^|[^A-Za-z0-9_])(undefined|null|NaN)(?=$|[^A-Za-z0-9_])/i.test(text);
}

function v112LegacyTokensInDom(text = v112BodyText()) {
  return V112_LEGACY_BAD_TOKENS.filter((token) => text.includes(token));
}

function v112RenderedAttentionTop5() {
  const rows = Array.from(document.querySelectorAll(".attention-table tbody tr"));
  return rows.slice(0, 5).map((row) => {
    const strong = row.querySelector("td strong");
    return strong ? strong.textContent.trim() : row.textContent.trim().slice(0, 12);
  }).filter(Boolean);
}

function auditV112RenderedDomMatchesCurrent() {
  const originalState = {
    view: state.view,
    compareTab: state.compareTab,
    projectId: state.projectId,
    month: state.month,
    detail: { ...state.detail },
    activityDetail: { ...state.activityDetail },
  };
  if (V10_DATA) {
    state.view = "home";
    render();
  }
  const text = v112BodyText();
  const errors = [];
  const warnings = [];
  const metrics = V10_DATA ? v112CurrentMetricSnapshot(V10_DATA) : {};
  const expectedDisplay = {
    janMayCost: "8,199.4",
    mayCost: "1,811.6",
    fixedCost: "1,388.1",
    variableCost: "6,108.7",
    managementCost: "702.6",
    annualBudget: "24,098.9",
    annualBudgetRate: "34.0%",
    sequenceBudgetRate: "94.0%",
  };
  const requiredTokens = Object.entries(expectedDisplay);
  requiredTokens.forEach(([key, token]) => {
    if (!text.includes(token)) errors.push({ code: "DOM_EXPECTED_VALUE_MISSING", key, token });
  });
  const legacyTokens = v112LegacyTokensInDom(text);
  if (legacyTokens.length) errors.push({ code: "DOM_LEGACY_VALUE_DETECTED", tokens: legacyTokens });
  if (v112HasBadToken(text)) errors.push({ code: "DOM_BAD_TOKEN", message: "页面出现 undefined/null/NaN。" });
  const sharedTop5 = (V10_DATA?.VIEWS?.[V111_MANAGEMENT_ATTENTION_VIEW_NAME] || [])
    .slice(0, 5)
    .map((row) => row.project_short_name);
  const renderedTop5 = v112RenderedAttentionTop5();
  const top5Matched = sharedTop5.length === 5 && sharedTop5.every((name, index) => renderedTop5[index] === name);
  if (!top5Matched) errors.push({ code: "DOM_TOP5_MISMATCH", sharedTop5, renderedTop5 });
  Object.assign(state, originalState);
  state.detail = originalState.detail;
  state.activityDetail = originalState.activityDetail;
  if (V10_DATA) render();
  return {
    ok: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
    dataSource: {
      sharedLoaded: Boolean(V112_HARDLOCK_STATUS.sharedLoaded),
      source: V10_DATA?.__sharedDataSource || "",
      factRows: V10_DATA?.FACT_COST_DETAIL?.length || 0,
    },
    expected: {
      ...V112_EXPECTED_CURRENT_METRICS,
      display: expectedDisplay,
    },
    rendered: {
      textLength: text.length,
      contains: Object.fromEntries(requiredTokens.map(([key, token]) => [key, text.includes(token)])),
      metrics,
    },
    legacyValueDetected: legacyTokens.length > 0,
    legacyTokens,
    top5: {
      shared: sharedTop5,
      rendered: renderedTop5,
      matched: top5Matched,
    },
  };
}

function auditV112CurrentDataHardLock() {
  const errors = [];
  const warnings = [];
  const addError = (code, message, detail = {}) => errors.push({ code, message, detail });
  const scripts = Array.from(document.querySelectorAll("script[src]")).map((script) => script.getAttribute("src"));
  const expectedScripts = V11_SHARED_DATA_FILES;
  expectedScripts.forEach((src) => {
    if (!scripts.includes(src)) addError("INDEX_SHARED_SCRIPT_PATH", "index.html 未使用预期相对路径加载共享数据脚本。", { src, scripts });
  });
  const source = v111SharedSourceObjects();
  if (!window.V10_DATA) addError("NO_V10_DATA", "window.V10_DATA 不存在。");
  if (!source.views?.views) addError("NO_SHARED_VIEWS", "OPERATION_COST_DATA_VIEWS.views 不存在。");
  if (!source.views?.views?.[V111_MANAGEMENT_ATTENTION_VIEW_NAME]?.length) addError("NO_MANAGEMENT_ATTENTION_VIEW", "共享经营关注视图不存在。");
  if (V10_DATA?.__sharedDataSource !== V11_SHARED_DATA_SOURCE) addError("V10_DATA_NOT_CURRENT", "V10_DATA 未标记为 _data/current。");
  if (V10_DATA?.FACT_COST_DETAIL?.length !== V112_EXPECTED_CURRENT_METRICS.factRows) addError("FACT_ROWS", "FACT_COST_DETAIL 行数不正确。", { actual: V10_DATA?.FACT_COST_DETAIL?.length });
  if (V112_HARDLOCK_STATUS.fallbackTriggered || V111_ATTENTION_VIEW_STATUS.fallbackUsed) addError("FALLBACK_TRIGGERED", "V12 触发了本地 fallback。", { hardlock: V112_HARDLOCK_STATUS, attention: V111_ATTENTION_VIEW_STATUS });
  if (!V112_HARDLOCK_STATUS.sharedLoaded) addError("SHARED_NOT_LOADED", "共享数据硬锁未确认加载成功。", V112_HARDLOCK_STATUS);
  let ensureOk = false;
  try {
    ensureOk = ensureSharedCurrentDataLoaded(V10_DATA);
  } catch (error) {
    addError("ENSURE_SHARED_FAILED", error.message || String(error));
  }
  const metrics = V10_DATA ? v112CurrentMetricSnapshot(V10_DATA) : {};
  if (!v112Close(metrics.janMayCostWan, V112_EXPECTED_CURRENT_METRICS.janMayCostWan)) addError("JAN_MAY_COST", "1-5月累计成本不正确。", metrics);
  if (!v112Close(metrics.mayCostWan, V112_EXPECTED_CURRENT_METRICS.mayCostWan)) addError("MAY_COST", "5月成本不正确。", metrics);
  if (!v112Close(metrics.companyAnnualBudgetWan, V112_EXPECTED_CURRENT_METRICS.companyAnnualBudgetWan, 0.01)) addError("ANNUAL_BUDGET", "全年预算不正确。", metrics);
  const domAudit = auditV112RenderedDomMatchesCurrent();
  if (!domAudit.ok) addError("DOM_AUDIT", "DOM 显示值与 _data/current 不一致。", domAudit.errors);
  if (domAudit.warnings?.length) warnings.push(...domAudit.warnings);
  const result = {
    ok: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
    dataSource: {
      sharedLoaded: Boolean(V112_HARDLOCK_STATUS.sharedLoaded),
      source: V10_DATA?.__sharedDataSource || "",
      factRows: V10_DATA?.FACT_COST_DETAIL?.length || 0,
      ensureOk,
    },
    indexScripts: scripts,
    expectedScripts,
    metrics,
    hardlockStatus: { ...V112_HARDLOCK_STATUS },
    attentionStatus: { ...V111_ATTENTION_VIEW_STATUS },
    domAudit,
  };
  console.group("V12 数据源强制统一审计");
  console.log("error 数量", result.errorCount);
  console.log("warning 数量", result.warningCount);
  console.table(errors);
  console.groupEnd();
  return result;
}
