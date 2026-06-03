(function (global) {
  "use strict";

  const VIEW = "subjectCompare";
  const HASHES = new Set(["subjectCompare", "subject-compare", "subject"]);
  let renderPatched = false;
  let eventsBound = false;

  function h(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function shortName(value, max = 10) {
    const text = String(value || "");
    return text.length > max ? text.slice(0, Math.max(1, max - 1)) + "…" : text;
  }

  function views() {
    return (global.OPERATION_COST_DATA_VIEWS && global.OPERATION_COST_DATA_VIEWS.views) || {};
  }

  function tables() {
    return (global.OPERATION_COST_DATA_CORE && global.OPERATION_COST_DATA_CORE.tables) || {};
  }

  function workflowViews() {
    return (global.OPERATION_COST_NC_WORKFLOW && global.OPERATION_COST_NC_WORKFLOW.views) || {};
  }

  function currentRole() {
    return global.V13Auth && typeof global.V13Auth.getCurrentRole === "function"
      ? global.V13Auth.getCurrentRole()
      : null;
  }

  function scState() {
    if (typeof state === "undefined") return {};
    if (!state.subjectCompare) {
      state.subjectCompare = {
        subjectId: "",
        month: String(latestMonth()),
        chartTab: "amount",
        sort: "current_desc",
        selectedProjectId: "",
        focusProjectIds: [],
        focusMessage: "",
        notice: ""
      };
    }
    return state.subjectCompare;
  }

  function sharedProjects() {
    return (tables().PROJECTS_V10 || []).map((project) => ({
      id: project.project_id,
      code: project.project_code || project.project_id,
      fullName: project.project_name || project.project_id,
      shortName: project.project_short_name || project.project_name || project.project_id,
      type: project.project_type || "",
      budgetWan: Number(project.annual_cost_budget_wan || 0),
      raw: project
    }));
  }

  function roleProjectIds() {
    const role = currentRole();
    const allIds = sharedProjects().map((project) => project.id);
    if (!role) return allIds;
    if (role.visibleProjectIds === "all") return allIds;
    const allowed = new Set(role.visibleProjectIds || []);
    return allIds.filter((id) => allowed.has(id));
  }

  function allowedProjects() {
    const allowed = new Set(roleProjectIds());
    return sharedProjects().filter((project) => allowed.has(project.id));
  }

  function latestMonth() {
    const rows = views().VIEW_PROJECT_SUBJECT_TREE || [];
    return rows.reduce((max, row) => Math.max(max, Number(row.cost_month || 0)), 0) || 5;
  }

  function monthOptions() {
    const max = latestMonth();
    const months = Array.from({ length: Math.max(0, max) }, (_, index) => index + 1);
    return [{ value: "all", label: "累计" }].concat(months.map((month) => ({ value: String(month), label: `2026年${month}月` })));
  }

  function selectedMonthValue(subjectState = scState()) {
    return subjectState.month === "all" ? latestMonth() : Number(subjectState.month || latestMonth());
  }

  function previousMonthValue(subjectState = scState()) {
    return Math.max(1, selectedMonthValue(subjectState) - 1);
  }

  function subjectKeyFor(row) {
    return [row.level1_name, row.level2_name, row.level3_name || row.subject_name].filter(Boolean).join("|");
  }

  function subjectCatalog() {
    const allowed = new Set(roleProjectIds());
    const groups = new Map();
    (views().VIEW_PROJECT_SUBJECT_TREE || []).forEach((row) => {
      if (!allowed.has(row.project_id)) return;
      const subjectId = row.subject_id || subjectKeyFor(row);
      if (!groups.has(subjectId)) {
        groups.set(subjectId, {
          subjectId,
          subjectCode: row.subject_code || "",
          subjectName: row.subject_name || row.level3_name || row.level2_name || row.level1_name || "成本科目",
          level1: row.level1_name || "",
          level2: row.level2_name || "",
          level3: row.level3_name || row.subject_name || "",
          costNature: row.cost_nature || "",
          subjectKey: subjectKeyFor(row),
          projectIds: new Set(),
          currentMonthAmount: 0,
          previousMonthAmount: 0,
          cumulativeAmount: 0,
          ncCount: 0
        });
      }
      const item = groups.get(subjectId);
      const amount = Number(row.raw_cost_amount || 0);
      item.projectIds.add(row.project_id);
      item.cumulativeAmount += amount;
      if (Number(row.cost_month) === latestMonth()) item.currentMonthAmount += amount;
      if (Number(row.cost_month) === latestMonth() - 1) item.previousMonthAmount += amount;
    });
    const ncRows = rawDetailRows();
    return Array.from(groups.values()).map((item) => {
      item.projectCount = item.projectIds.size;
      item.projectIds = Array.from(item.projectIds);
      item.absDelta = Math.abs(item.currentMonthAmount - item.previousMonthAmount);
      item.unitName = unitBenchmarkName(item);
      item.ncCount = ncRows.filter((row) => row.subject_id === item.subjectId).length;
      return item;
    }).sort((a, b) => {
      const unitDiff = Number(Boolean(b.unitName)) - Number(Boolean(a.unitName));
      if (unitDiff) return unitDiff;
      const projectDiff = b.projectCount - a.projectCount;
      if (projectDiff) return projectDiff;
      const deltaDiff = b.absDelta - a.absDelta;
      if (deltaDiff) return deltaDiff;
      return b.currentMonthAmount - a.currentMonthAmount;
    });
  }

  function defaultSubjectId() {
    const subjects = subjectCatalog();
    return subjects[0] ? subjects[0].subjectId : "";
  }

  function selectedSubject() {
    const subjectState = scState();
    const subjects = subjectCatalog();
    if (!subjectState.subjectId || !subjects.some((item) => item.subjectId === subjectState.subjectId)) {
      subjectState.subjectId = defaultSubjectId();
    }
    return subjects.find((item) => item.subjectId === subjectState.subjectId) || subjects[0] || null;
  }

  function homeSummaryByProject() {
    return (views().VIEW_HOME_PROJECT_SUMMARY || []).reduce((index, row) => {
      index[row.project_id] = row;
      return index;
    }, {});
  }

  function monthSummaryRows() {
    return views().VIEW_MONTH_COST_SUMMARY || [];
  }

  function projectMonthTotal(projectId, month) {
    const row = monthSummaryRows().find((item) => item.project_id === projectId && Number(item.cost_month) === Number(month));
    return Number(row && row.raw_cost_amount || 0);
  }

  function projectCumulativeTotal(projectId, month) {
    return monthSummaryRows()
      .filter((row) => row.project_id === projectId && Number(row.cost_month || 0) <= Number(month))
      .reduce((sum, row) => sum + Number(row.raw_cost_amount || 0), 0);
  }

  function rawDetailRows() {
    const allowed = new Set(roleProjectIds());
    return (views().VIEW_COST_DETAIL_TRACE || []).filter((row) => row.fact_type === "raw_cost" && allowed.has(row.project_id));
  }

  function traceRows() {
    const allowed = new Set(roleProjectIds());
    return (workflowViews().VIEW_NC_WORKFLOW_TRACE_MIN || []).filter((row) => allowed.has(row.project_id));
  }

  function detailRecords() {
    return typeof DETAIL_RECORDS !== "undefined" && Array.isArray(DETAIL_RECORDS) ? DETAIL_RECORDS : [];
  }

  function detailSubjectKey(projectId, subjectId, fallback) {
    const record = detailRecords().find((item) => item.projectId === projectId && item.subjectId === subjectId && item.subjectKey);
    return record ? record.subjectKey : fallback || "";
  }

  function periodAllowsMonth(rowMonth, subjectState = scState()) {
    if (subjectState.month === "all") return Number(rowMonth) <= latestMonth();
    return Number(rowMonth) === Number(subjectState.month);
  }

  function subjectPeriodRows(subject, subjectState = scState()) {
    const allowed = new Set(roleProjectIds());
    return (views().VIEW_PROJECT_SUBJECT_TREE || []).filter((row) => {
      return allowed.has(row.project_id) && (row.subject_id || subjectKeyFor(row)) === subject.subjectId && periodAllowsMonth(row.cost_month, subjectState);
    });
  }

  function subjectMonthAmount(projectId, subjectId, month) {
    return (views().VIEW_PROJECT_SUBJECT_TREE || [])
      .filter((row) => row.project_id === projectId && (row.subject_id || subjectKeyFor(row)) === subjectId && Number(row.cost_month) === Number(month))
      .reduce((sum, row) => sum + Number(row.raw_cost_amount || 0), 0);
  }

  function fieldCoverage(projectId, subjectId, subjectState = scState()) {
    const rows = traceRows().filter((row) => {
      return row.project_id === projectId && row.cost_subject_id === subjectId && periodAllowsMonth(row.month || row.cost_month, subjectState);
    });
    const countUnique = (field) => new Set(rows.map((row) => row[field]).filter(Boolean)).size;
    return {
      supplierCount: countUnique("supplier_id"),
      contractCount: countUnique("contract_id"),
      settlementCount: countUnique("settlement_no"),
      paymentCount: countUnique("payment_no"),
      pending: rows.length > 0 && (!countUnique("supplier_id") || !countUnique("contract_id") || !countUnique("settlement_no") || !countUnique("payment_no"))
    };
  }

  function unitBenchmarkName(subject) {
    if (!subject || typeof getUnitBenchmarkOptions !== "function") return "";
    const available = new Set(getUnitBenchmarkOptions().filter((item) => item.name !== "综合包干").map((item) => item.name));
    const text = [subject.subjectName, subject.level1, subject.level2, subject.level3, subject.subjectKey].join(" ");
    const rules = [
      { name: "保洁服务", words: ["保洁", "清洁"] },
      { name: "保安服务", words: ["保安", "安保", "秩序维护", "安检"] },
      { name: "标准搭建", words: ["搭建", "展位"] },
      { name: "地毯铺设", words: ["地毯"] },
      { name: "餐饮服务", words: ["餐饮", "工作餐", "盒饭", "茶歇", "人员餐饮"] },
      { name: "电力接驳", words: ["电力", "水电", "接驳"] },
      { name: "广告物料", words: ["广告物料", "宣传物料", "物料", "氛围"] },
      { name: "设备租赁", words: ["设备租赁", "租赁", "移动厕所", "铁马"] },
      { name: "垃圾清运", words: ["垃圾"] },
      { name: "临勤服务", words: ["临勤", "临时用工"] }
    ];
    const match = rules.find((rule) => available.has(rule.name) && rule.words.some((word) => text.indexOf(word) >= 0));
    return match ? match.name : "";
  }

  function unitItemsForSubject(subject, subjectState = scState()) {
    const unitName = unitBenchmarkName(subject);
    if (!unitName || typeof normalizeUnitBenchmarkItem !== "function" || typeof UNIT_COST_ITEMS === "undefined") return [];
    const allowed = new Set(roleProjectIds());
    return UNIT_COST_ITEMS
      .map((item) => item.normalizedName ? item : normalizeUnitBenchmarkItem(item))
      .filter((item) => item.canBenchmark && item.normalizedName === unitName && allowed.has(item.projectId) && periodAllowsMonth(item.month, subjectState));
  }

  function median(values) {
    const nums = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
    if (!nums.length) return 0;
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  }

  function unitRowsByProject(subject, subjectState = scState()) {
    const groups = new Map();
    unitItemsForSubject(subject, subjectState).forEach((item) => {
      if (!groups.has(item.projectId)) {
        groups.set(item.projectId, {
          projectId: item.projectId,
          amount: 0,
          quantity: 0,
          unit: item.unit || "",
          ncRecordIds: []
        });
      }
      const group = groups.get(item.projectId);
      group.amount += Number(item.amount || 0);
      group.quantity += Number(item.quantity || 0);
      group.unit = group.unit || item.unit || "";
      if (item.ncRecordId) group.ncRecordIds.push(item.ncRecordId);
      if (Array.isArray(item.ncRecordIds)) group.ncRecordIds.push(...item.ncRecordIds);
    });
    return groups;
  }

  function buildCompareRows(subject = selectedSubject(), subjectState = scState()) {
    if (!subject) return [];
    const current = selectedMonthValue(subjectState);
    const previous = previousMonthValue(subjectState);
    const home = homeSummaryByProject();
    const unitGroups = unitRowsByProject(subject, subjectState);
    const rows = allowedProjects().map((project) => {
      const currentMonthAmount = subjectMonthAmount(project.id, subject.subjectId, current);
      const previousMonthAmount = subjectMonthAmount(project.id, subject.subjectId, previous);
      const cumulativeAmount = subjectPeriodRows(subject, { month: "all" })
        .filter((row) => row.project_id === project.id)
        .reduce((sum, row) => sum + Number(row.raw_cost_amount || 0), 0);
      const selectedAmount = subjectState.month === "all" ? cumulativeAmount : currentMonthAmount;
      const samePeriodTotal = subjectState.month === "all"
        ? Number(home[project.id] && home[project.id].total_cost || projectCumulativeTotal(project.id, current))
        : projectMonthTotal(project.id, current);
      const rawRows = rawDetailRows().filter((row) => {
        return row.project_id === project.id && row.subject_id === subject.subjectId && periodAllowsMonth(row.cost_month, subjectState);
      });
      const unit = unitGroups.get(project.id) || null;
      const coverage = fieldCoverage(project.id, subject.subjectId, subjectState);
      return {
        project,
        projectId: project.id,
        projectName: project.shortName,
        executionCategory: home[project.id] ? home[project.id].execution_category : "",
        currentMonthAmount,
        previousMonthAmount,
        delta: currentMonthAmount - previousMonthAmount,
        absDelta: Math.abs(currentMonthAmount - previousMonthAmount),
        cumulativeAmount,
        selectedAmount,
        projectRatio: selectedAmount / Math.max(1, samePeriodTotal),
        ncCount: rawRows.length,
        detailIds: rawRows.map((row) => row.cost_detail_id).filter(Boolean),
        drawerSubjectKey: detailSubjectKey(project.id, subject.subjectId, subject.subjectKey),
        coverage,
        unit: unit ? {
          amount: unit.amount,
          quantity: unit.quantity,
          unit: unit.unit,
          unitPrice: unit.quantity > 0 ? unit.amount / unit.quantity : 0,
          ncRecordIds: unit.ncRecordIds
        } : null
      };
    });
    const totalCurrent = rows.reduce((sum, row) => sum + row.currentMonthAmount, 0);
    let cumulative = 0;
    rows.slice().sort((a, b) => b.currentMonthAmount - a.currentMonthAmount).forEach((row) => {
      cumulative += row.currentMonthAmount;
      row.cumulativeShare = totalCurrent > 0 ? cumulative / totalCurrent : 0;
    });
    const amountTop = topSet(rows, "currentMonthAmount");
    const ratioTop = topSet(rows, "projectRatio");
    const deltaTop = topSet(rows, "absDelta");
    rows.forEach((row) => {
      row.statuses = statusLabels(row, amountTop, ratioTop, deltaTop, Boolean(subject.unitName));
    });
    return rows;
  }

  function topSet(rows, field) {
    return new Set(rows.slice()
      .filter((row) => Number(row[field] || 0) > 0)
      .sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0))
      .slice(0, 3)
      .map((row) => row.projectId));
  }

  function statusLabels(row, amountTop, ratioTop, deltaTop, comparable) {
    const labels = [];
    if (amountTop.has(row.projectId)) labels.push("金额较高");
    if (ratioTop.has(row.projectId)) labels.push("占比较高");
    if (deltaTop.has(row.projectId)) labels.push("变化较大");
    if (row.executionCategory === "执行偏低") labels.push("执行偏低");
    if (row.coverage && row.coverage.pending) labels.push("字段待覆盖");
    if (comparable && (!row.unit || !row.unit.quantity)) labels.push("数量待覆盖");
    return labels.length ? labels : ["持续跟踪"];
  }

  function sortRows(rows, sortKey) {
    const list = rows.slice();
    const getters = {
      current_desc: (row) => row.selectedAmount,
      abs_delta_desc: (row) => row.absDelta,
      ratio_desc: (row) => row.projectRatio,
      unit_desc: (row) => row.unit ? row.unit.unitPrice : -1,
      nc_desc: (row) => row.ncCount
    };
    const getter = getters[sortKey] || getters.current_desc;
    return list.sort((a, b) => {
      const diff = Number(getter(b) || 0) - Number(getter(a) || 0);
      if (diff) return diff;
      return String(a.projectName || "").localeCompare(String(b.projectName || ""), "zh-CN");
    });
  }

  function money(value) {
    return typeof moneyWan === "function" ? moneyWan(Number(value || 0)) : (Number(value || 0) / 10000).toFixed(1) + "万元";
  }

  function signedMoney(value) {
    if (typeof signedMoneyWan === "function") return signedMoneyWan(Number(value || 0));
    if (value > 0) return "+" + money(value);
    if (value < 0) return "-" + money(Math.abs(value));
    return "持平";
  }

  function pct(value) {
    return Number.isFinite(Number(value)) ? (Number(value || 0) * 100).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%" : "-";
  }

  function deltaRate(row) {
    if (!row.previousMonthAmount) return row.currentMonthAmount ? "不计算" : "-";
    return pct((row.currentMonthAmount - row.previousMonthAmount) / row.previousMonthAmount);
  }

  function unitPriceText(row) {
    if (!row.unit) return "—";
    if (!row.unit.quantity) return "数量待覆盖";
    return row.unit.unitPrice.toLocaleString("zh-CN", { maximumFractionDigits: 1 }) + "元/" + (row.unit.unit || "单位");
  }

  function comparableText(subject, row) {
    if (!subject.unitName) return "仅看金额对比";
    if (row.unit && row.unit.quantity > 0) return unitPriceText(row);
    return "数量待覆盖";
  }

  function ensureSelectedRow(rows, subjectState = scState()) {
    if (!rows.length) return null;
    let row = rows.find((item) => item.projectId === subjectState.selectedProjectId);
    if (!row) {
      row = rows.slice().sort((a, b) => b.selectedAmount - a.selectedAmount)[0];
      subjectState.selectedProjectId = row ? row.projectId : "";
    }
    return row;
  }

  function top80Info(rows) {
    const amountOf = (row) => Number(row.currentMonthAmount !== undefined ? row.currentMonthAmount : row.selectedAmount || 0);
    const sorted = rows.slice().sort((a, b) => amountOf(b) - amountOf(a));
    const hasSourceShare = sorted.every((row) => Number.isFinite(Number(row.cumulativeShare)));
    const total = sorted.reduce((sum, row) => sum + amountOf(row), 0);
    let cumulative = 0;
    let pivotIndex = sorted.length - 1;
    if (hasSourceShare) {
      pivotIndex = sorted.findIndex((row) => Number(row.cumulativeShare || 0) >= 0.8);
      if (pivotIndex < 0) pivotIndex = sorted.length - 1;
      cumulative = Number(sorted[pivotIndex] && sorted[pivotIndex].cumulativeShare || 0) * total;
    } else {
      for (let index = 0; index < sorted.length; index += 1) {
        cumulative += amountOf(sorted[index]);
        if (total > 0 && cumulative / total >= 0.8) {
          pivotIndex = index;
          break;
        }
      }
    }
    const ids = sorted.slice(0, pivotIndex + 1).map((row) => row.projectId);
    return {
      ids,
      count: ids.length,
      share: hasSourceShare ? Number(sorted[pivotIndex] && sorted[pivotIndex].cumulativeShare || 0) : (total > 0 ? cumulative / total : 0)
    };
  }

  function focusSet(subjectState = scState()) {
    return new Set(Array.isArray(subjectState.focusProjectIds) ? subjectState.focusProjectIds : []);
  }

  function subjectActivitySummary(subject, row, subjectState = scState()) {
    if (!subject || !row) return { relatedActivityCount: 0, relatedTopActivityName: "", relatedTopActivityCostWan: "0.0", topActivities: [] };
    const activitiesById = (views().VIEW_ACTIVITY_COST || []).reduce((map, item) => {
      if (item.project_id === row.projectId) map[item.activity_id] = item;
      return map;
    }, {});
    const groups = new Map();
    (views().VIEW_ACTIVITY_COST_BY_SUBJECT || []).forEach((item) => {
      if (item.project_id !== row.projectId) return;
      if (item.subject_id !== subject.subjectId) return;
      if (!periodAllowsMonth(item.cost_month, subjectState)) return;
      const activityId = item.activity_id || "";
      if (!activityId) return;
      if (!groups.has(activityId)) {
        const activity = activitiesById[activityId] || {};
        groups.set(activityId, {
          activityId,
          activityName: activity.activity_name || activityId,
          month: activity.cost_month || item.cost_month || "",
          amount: 0,
          ncCount: 0
        });
      }
      const group = groups.get(activityId);
      group.amount += Number(item.cost_amount || 0);
    });
    const list = Array.from(groups.values()).map((item) => {
      const directRows = rawDetailRows().filter((detail) => {
        return detail.project_id === row.projectId
          && detail.subject_id === subject.subjectId
          && detail.activity_id === item.activityId
          && periodAllowsMonth(detail.cost_month, subjectState);
      });
      return { ...item, ncCount: directRows.length };
    }).sort((a, b) => b.amount - a.amount);
    const top = list[0] || null;
    return {
      relatedActivityCount: list.length,
      relatedTopActivityName: top ? top.activityName : "",
      relatedTopActivityCostWan: top ? (top.amount / 10000).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0.0",
      relatedTopActivityMonth: top ? top.month : "",
      relatedTopActivityNcCount: top ? top.ncCount : 0,
      topActivities: list.slice(0, 3)
    };
  }

  function renderBreadcrumb(subject) {
    return `
      <nav class="breadcrumb" aria-label="当前位置">
        <button type="button" data-action="nav" data-view="home">首页</button>
        <span>/</span>
        <button type="button" data-action="nav" data-view="subjectCompare">科目横向</button>
        <span>/</span>
        <strong>${h(subject ? subject.subjectName : "成本科目")}</strong>
      </nav>
    `;
  }

  function renderTree(subjects, activeSubject) {
    const groups = subjects.reduce((map, subject) => {
      const level1 = subject.level1 || "其他";
      const level2 = subject.level2 || "未分组";
      if (!map.has(level1)) map.set(level1, new Map());
      if (!map.get(level1).has(level2)) map.get(level1).set(level2, []);
      map.get(level1).get(level2).push(subject);
      return map;
    }, new Map());
    return `
      <aside class="subject-tree-panel" aria-label="管理科目选择">
        <div class="subject-tree-head">
          <span>管理科目选择</span>
          <strong>${subjects.length}个科目</strong>
        </div>
        <div class="subject-tree-scroll">
          ${Array.from(groups.entries()).map(([level1, level2Map]) => `
            <details class="subject-tree-group" open>
              <summary><span>${h(level1)}</span><em>${Array.from(level2Map.values()).reduce((sum, children) => sum + children.length, 0)}项</em></summary>
              ${Array.from(level2Map.entries()).map(([level2, children]) => `
                <details class="subject-tree-branch" open>
                  <summary class="subject-tree-branch-title"><span>${h(level2)}</span><em>${children.length}项</em></summary>
                  ${children.map((subject) => `
                    <button class="subject-tree-item ${activeSubject && activeSubject.subjectId === subject.subjectId ? "is-active" : ""}" type="button" data-action="subject-compare-select" data-subject-id="${h(subject.subjectId)}">
                      <span>${h(subject.subjectName)}</span>
                      <em>${h(subject.unitName ? "可做单价对比" : "仅看金额")}</em>
                    </button>
                  `).join("")}
                </details>
              `).join("")}
            </details>
          `).join("")}
        </div>
      </aside>
    `;
  }

  function renderIdentity(subject, rows, subjectState) {
    const currentTotal = rows.reduce((sum, row) => sum + row.selectedAmount, 0);
    const cumulativeTotal = rows.reduce((sum, row) => sum + row.cumulativeAmount, 0);
    const previousTotal = rows.reduce((sum, row) => sum + row.previousMonthAmount, 0);
    const ncCount = rows.reduce((sum, row) => sum + row.ncCount, 0);
    const scope = currentRole() && currentRole().visibleProjectIds !== "all" ? "当前可查看项目" : "全部授权项目";
    return `
      <section class="subject-identity">
        <div class="subject-identity-main">
          <span class="subject-eyebrow">科目横向对比画像</span>
          <h2>${h(subject.subjectName)}</h2>
          <p>${h([subject.level1, subject.level2, subject.level3].filter(Boolean).join(" / "))}</p>
          <div class="subject-identity-tags">
            <span>${h(scope)}</span>
            <strong>${h(subject.unitName ? "可做单价对比" : "仅看金额对比")}</strong>
          </div>
        </div>
        <div class="subject-identity-metrics">
          ${renderMetric(subjectState.month === "all" ? "累计金额" : `${selectedMonthValue(subjectState)}月金额`, money(currentTotal), monthLabel(subjectState.month))}
          ${renderMetric("项目数量", rows.length + "个", "当前权限范围")}
          ${renderMetric("较上月变化", signedMoney(rows.reduce((sum, row) => sum + row.currentMonthAmount, 0) - previousTotal), `${selectedMonthValue(subjectState)}月 - ${previousMonthValue(subjectState)}月`)}
          ${renderMetric("NC明细", ncCount + "笔", "当前筛选范围")}
        </div>
      </section>
    `;
  }

  function renderMetric(label, value, foot) {
    return `<div class="subject-metric"><span>${h(label)}</span><strong>${h(value)}</strong><em>${h(foot || "")}</em></div>`;
  }

  function renderToolbar(subjectState, subject) {
    return `
      <div class="subject-toolbar">
        <label>月份
          <select data-action="subject-compare-month">
            ${monthOptions().map((item) => `<option value="${h(item.value)}" ${String(subjectState.month) === String(item.value) ? "selected" : ""}>${h(item.label)}</option>`).join("")}
          </select>
        </label>
        <label>排序
          <select data-action="subject-compare-sort-select">
            ${sortOptions(subject).map((item) => `<option value="${h(item.value)}" ${subjectState.sort === item.value ? "selected" : ""}>${h(item.label)}</option>`).join("")}
          </select>
        </label>
        <span class="subject-scope-note">${h(currentRole() && currentRole().visibleProjectIds !== "all" ? "当前仅展示可查看项目，横向对比范围随账号视角收敛。" : "当前为全部授权项目横向对比。")}</span>
      </div>
    `;
  }

  function sortOptions(subject) {
    const base = [
      { value: "current_desc", label: "本月金额" },
      { value: "abs_delta_desc", label: "环比绝对增减额" },
      { value: "ratio_desc", label: "占项目比例" },
      { value: "nc_desc", label: "NC笔数" }
    ];
    if (subject && subject.unitName) base.splice(5, 0, { value: "unit_desc", label: "单价" });
    return base;
  }

  function renderChartTabs(subjectState, subject) {
    return `
      <div class="subject-chart-tabs" role="tablist" aria-label="科目横向对比视图">
        <button class="${subjectState.chartTab === "amount" ? "is-active" : ""}" type="button" data-action="subject-compare-tab" data-tab="amount">金额集中度</button>
        <button class="${subjectState.chartTab === "unit" ? "is-active" : ""} ${subject.unitName ? "" : "is-muted"}" type="button" data-action="subject-compare-tab" data-tab="unit" ${subject.unitName ? "" : "disabled"}>单价水平对比</button>
      </div>
    `;
  }

  function renderMainChart(subject, rows, subjectState) {
    if (rows.length <= 1) return renderSingleProjectMode(subject, rows, subjectState);
    if (subjectState.chartTab === "unit") return renderUnitChart(subject, rows, subjectState);
    const sorted = rows.slice().sort((a, b) => b.selectedAmount - a.selectedAmount);
    const total = sorted.reduce((sum, row) => sum + row.selectedAmount, 0);
    let cumulative = 0;
    const chartRows = sorted.map((row) => {
      cumulative += row.selectedAmount;
      return {
        ...row,
        currentMonthAmount: row.selectedAmount,
        cumulativeShare: total > 0 ? cumulative / total : 0
      };
    });
    const info = top80Info(chartRows);
    return `
      <section class="subject-section">
        <div class="subject-section-head">
          <div><h3>金额集中度</h3><p>80%参考线用于识别主要成本贡献项目，算法沿用累计占比，仅强化展示；点击柱子可联动项目分析卡。</p></div>
          <span class="subject-chip subject-chip-strong">管住前${info.count}项 = 管住${pct(info.share)}成本</span>
        </div>
        ${global.V134SubjectCharts ? global.V134SubjectCharts.pareto(chartRows, { title: "金额集中度", selectedProjectId: subjectState.selectedProjectId, focusProjectIds: subjectState.focusProjectIds }) : ""}
      </section>
    `;
  }

  function renderUnitChart(subject, rows, subjectState) {
    if (!subject.unitName) {
      return `
        <section class="subject-section">
          <div class="subject-section-head"><div><h3>单价水平对比</h3><p>该科目暂无统一可比单位。</p></div></div>
          <div class="subject-empty">该科目暂无统一可比单位，仅支持金额集中度查看。</div>
        </section>
      `;
    }
    const unitRows = rows
      .filter((row) => row.unit && row.unit.quantity > 0)
      .map((row) => ({ ...row, quantity: row.unit.quantity, unitPrice: row.unit.unitPrice, unit: row.unit.unit, amount: row.unit.amount }))
      .sort((a, b) => b.unitPrice - a.unitPrice);
    const baseline = median(unitRows.map((row) => row.unitPrice));
    const unit = unitRows[0] ? unitRows[0].unit : "单位";
    return `
      <section class="subject-section">
        <div class="subject-section-head">
          <div><h3>单价水平对比</h3><p>突出中位水平参考线，仅表达高于中位水平或低于中位水平，不直接给出原因结论。</p></div>
          <span class="subject-chip">对标口径：${h(subject.unitName)}</span>
        </div>
        ${global.V134SubjectCharts ? global.V134SubjectCharts.unitBenchmark(unitRows, baseline, unit, { selectedProjectId: subjectState.selectedProjectId }) : ""}
      </section>
    `;
  }

  function renderSingleProjectMode(subject, rows, subjectState) {
    const row = ensureSelectedRow(rows, subjectState);
    if (!row) return `<section class="subject-section">${renderEmpty("当前角色暂无可见项目")}</section>`;
    const activity = subjectActivitySummary(subject, row, subjectState);
    return `
      <section class="subject-section subject-single-mode" id="subjectSingleProjectMode">
        <div class="subject-section-head">
          <div>
            <h3>本项目科目分析模式</h3>
            <p>当前账号仅授权查看本项目。本页展示该项目当前科目的金额、环比、活动和NC明细；横向对比需切换领导或成本管理权限。</p>
          </div>
          <span class="subject-chip">${h(row.project.shortName)}</span>
        </div>
        <div class="subject-single-grid">
          <div class="subject-single-change">
            <span>最近两月变化</span>
            <div class="single-change-bars">
              <i><b style="width:${Math.max(2, row.previousMonthAmount / Math.max(row.currentMonthAmount, row.previousMonthAmount, 1) * 100).toFixed(1)}%"></b><em>上月 ${money(row.previousMonthAmount)}</em></i>
              <i class="is-current"><b style="width:${Math.max(2, row.currentMonthAmount / Math.max(row.currentMonthAmount, row.previousMonthAmount, 1) * 100).toFixed(1)}%"></b><em>本月 ${money(row.currentMonthAmount)}</em></i>
            </div>
            <strong>环比变化 ${signedMoney(row.delta)}</strong>
          </div>
          <div class="subject-single-facts">
            <dl>
              <div><dt>累计金额</dt><dd>${money(row.cumulativeAmount)}</dd></div>
              <div><dt>占项目比例</dt><dd>${pct(row.projectRatio)}</dd></div>
              <div><dt>NC明细</dt><dd>${row.ncCount}笔</dd></div>
              <div><dt>可比性</dt><dd>${h(comparableText(subject, row))}</dd></div>
            </dl>
            <div class="subject-related-activities">
              <strong>关联活动Top3</strong>
              ${activity.topActivities.length ? activity.topActivities.map((item, index) => `
                <button type="button" data-action="subject-profile-activity-open" data-project="${h(row.projectId)}">
                  <span>${index + 1}. ${h(shortName(item.activityName, 18))}</span>
                  <em>${money(item.amount)} · 直接NC ${item.ncCount}笔</em>
                </button>
              `).join("") : `<p>当前项目该科目未匹配到明确活动样本，建议从NC明细核查合同、供应商和结算摘要。</p>`}
            </div>
          </div>
        </div>
        <div class="subject-selected-actions">
          <button class="btn primary" type="button" data-action="subject-profile-open" data-project="${h(row.projectId)}">查看项目画像</button>
          <button class="btn" type="button" data-action="subject-profile-activity-open" data-project="${h(row.projectId)}">查看活动轴</button>
          <button class="btn" type="button" data-action="subject-org-open" data-project="${h(row.projectId)}" data-subject-id="${h(subject.subjectId)}">组织定位</button>
          <button class="btn" type="button" data-action="subject-compare-nc" data-project="${h(row.projectId)}">查看NC明细</button>
        </div>
      </section>
    `;
  }

  function renderSelectedProjectCard(subject, rows, subjectState) {
    const row = ensureSelectedRow(rows, subjectState);
    if (!row) return "";
    const focus = focusSet(subjectState);
    const activity = subjectActivitySummary(subject, row, subjectState);
    return `
      <section class="subject-section subject-selected-card" id="subjectSelectedCard">
        <div class="subject-selected-head">
          <div>
            <span class="subject-eyebrow">选中项目分析卡</span>
            <h3>${h(row.project.shortName)} · ${h(subject.subjectName)}</h3>
          </div>
          <span class="subject-selected-state">${h(row.executionCategory || "持续跟踪")}</span>
        </div>
        <dl class="subject-selected-metrics">
          <div><dt>本期金额</dt><dd>${money(row.selectedAmount)}</dd></div>
          <div><dt>上月金额</dt><dd>${money(row.previousMonthAmount)}</dd></div>
          <div><dt>环比变化</dt><dd>${signedMoney(row.delta)}</dd></div>
          <div><dt>累计金额</dt><dd>${money(row.cumulativeAmount)}</dd></div>
          <div><dt>占项目比例</dt><dd>${pct(row.projectRatio)}</dd></div>
          <div><dt>NC明细</dt><dd>${row.ncCount}笔</dd></div>
          <div><dt>单价/可比性</dt><dd>${h(comparableText(subject, row))}</dd></div>
          <div><dt>高亮状态</dt><dd>${focus.has(row.projectId) ? "80%贡献范围" : "当前选中"}</dd></div>
          ${row.unit ? `
            <div><dt>单价</dt><dd>${row.unit.unitPrice.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}元/${h(row.unit.unit)}</dd></div>
            <div><dt>数量</dt><dd>${row.unit.quantity ? row.unit.quantity.toLocaleString("zh-CN", { maximumFractionDigits: 1 }) + h(row.unit.unit) : "数量口径待覆盖"}</dd></div>
          ` : ""}
        </dl>
        <div class="subject-related-activities">
          <strong>关联活动Top3</strong>
          ${activity.topActivities.length ? activity.topActivities.map((item, index) => `
            <button type="button" data-action="subject-profile-activity-open" data-project="${h(row.projectId)}" title="${h(`${item.activityName} / ${money(item.amount)} / 直接NC ${item.ncCount}笔`)}">
              <span>${index + 1}. ${h(shortName(item.activityName, 18))}</span>
              <em>${money(item.amount)} · 直接NC ${item.ncCount}笔</em>
            </button>
          `).join("") : `<p>当前项目该科目未匹配到明确活动样本，建议从NC明细核查合同、供应商和结算摘要。</p>`}
        </div>
        <div class="subject-selected-actions">
          <button class="btn primary" type="button" data-action="subject-profile-open" data-project="${h(row.projectId)}">查看项目画像</button>
          <button class="btn" type="button" data-action="subject-profile-activity-open" data-project="${h(row.projectId)}">查看活动轴</button>
          <button class="btn" type="button" data-action="subject-org-open" data-project="${h(row.projectId)}" data-subject-id="${h(subject.subjectId)}">组织定位</button>
          <button class="btn" type="button" data-action="subject-compare-nc" data-project="${h(row.projectId)}">查看NC明细</button>
        </div>
      </section>
    `;
  }

  function renderTable(subject, rows, subjectState) {
    const sorted = sortRows(rows, subjectState.sort);
    const focus = focusSet(subjectState);
    return `
      <section class="subject-section subject-table-section">
        <div class="subject-section-head">
          <div><h3>项目横向清单</h3><p>主表保留核心字段，更多上下文进入上方选中项目分析卡和NC抽屉。</p></div>
        </div>
        <div class="subject-table-wrap">
          <table class="subject-table">
            <thead>
              <tr>
                <th>项目</th>
                ${tableSortHead("本月金额", "current_desc", subjectState)}
                ${tableSortHead("环比增减额", "abs_delta_desc", subjectState)}
                ${tableSortHead("占项目比例", "ratio_desc", subjectState)}
                ${tableSortHead("单价/可比性", "unit_desc", subjectState, !subject.unitName)}
                ${tableSortHead("NC笔数", "nc_desc", subjectState)}
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map((row) => `
                <tr class="${row.projectId === subjectState.selectedProjectId ? "is-selected" : ""} ${focus.has(row.projectId) ? "is-focus" : ""}" data-subject-project="${h(row.projectId)}">
                  <td><strong>${h(row.project.shortName)}</strong><small>${h(row.project.fullName)}</small></td>
                  <td class="num">${money(row.selectedAmount)}</td>
                  <td class="num">${signedMoney(row.delta)}</td>
                  <td class="num">${pct(row.projectRatio)}</td>
                  <td class="num">${h(comparableText(subject, row))}</td>
                  <td class="num">${row.ncCount}</td>
                  <td>${row.statuses.map((label) => `<span class="subject-status">${h(label)}</span>`).join("")}</td>
                  <td>
                    <span class="subject-row-actions">
                      <button type="button" class="is-primary" data-action="subject-profile-open" data-project="${h(row.projectId)}">查看项目画像</button>
                      <button type="button" data-action="subject-select-project" data-project="${h(row.projectId)}">切换分析卡</button>
                      <button type="button" data-action="subject-compare-nc" data-project="${h(row.projectId)}">查看NC明细</button>
                    </span>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function tableSortHead(label, key, subjectState, disabled) {
    return `<th class="num"><button class="subject-sort-head ${subjectState.sort === key ? "is-active" : ""}" type="button" data-action="subject-compare-sort" data-sort="${h(key)}" ${disabled ? "disabled" : ""}>${h(label)}</button></th>`;
  }

  function renderAnalysisNote(subject, rows, subjectState) {
    const topAmount = rows.slice().sort((a, b) => b.currentMonthAmount - a.currentMonthAmount)[0];
    const topRatio = rows.slice().sort((a, b) => b.projectRatio - a.projectRatio)[0];
    const topDelta = rows.slice().sort((a, b) => b.absDelta - a.absDelta)[0];
    return `
      <section class="subject-section subject-ai-card">
        <div>
          <h3>运营成本分析助手</h3>
          <p>当前科目：${h(subject.subjectName)}；当前月份：${h(monthLabel(subjectState.month))}；金额最高项目：${h(topAmount ? topAmount.project.shortName : "-")}；占比最高项目：${h(topRatio ? topRatio.project.shortName : "-")}；变化较大项目：${h(topDelta ? topDelta.project.shortName : "-")}。</p>
        </div>
        <button class="btn primary" type="button" data-action="subject-compare-ai">生成本页解读</button>
      </section>
    `;
  }

  function monthLabel(value) {
    if (value === "all") return `2026年1-${latestMonth()}月累计`;
    return `2026年${value}月`;
  }

  function renderFootnote() {
    return `
      <p class="subject-footnote">
        本页金额、占比、环比和NC笔数均基于当前账号授权范围内数据计算。环比增减额 = 本月金额 - 上月金额；上月金额为0时，环比变化率不计算。单价水平对比仅适用于具有统一可比单位的科目。
      </p>
    `;
  }

  function renderSubjectPage() {
    const subjectState = scState();
    const subjects = subjectCatalog();
    const subject = selectedSubject();
    if (!subject) return `<div class="subject-compare-page"><div class="subject-empty">当前可查看项目暂无科目数据。</div></div>`;
    subject.unitName = unitBenchmarkName(subject);
    const rows = buildCompareRows(subject, subjectState);
    ensureSelectedRow(rows, subjectState);
    const singleProjectMode = rows.length <= 1;
    return `
      <div class="subject-compare-page" data-subject-compare="true">
        <div class="page-title-row subject-title-row">
          <div>
            ${renderBreadcrumb(subject)}
            <h1 class="page-title">科目横向对比页</h1>
            <p class="page-subtitle">锁定单一成本科目，横向比较各授权项目的金额规模、占比、最近两月变化、NC笔数和下钻链路。</p>
          </div>
          <div class="page-actions">
            <button class="btn ghost" type="button" data-action="nav" data-view="home">返回首页</button>
            <button class="btn primary" type="button" data-action="subject-compare-ai">生成本页解读</button>
          </div>
        </div>
        ${subjectState.notice ? `<div class="subject-notice">${h(subjectState.notice)}</div>` : ""}
        <div class="subject-compare-layout">
          ${renderTree(subjects, subject)}
          <main class="subject-main">
            ${renderIdentity(subject, rows, subjectState)}
            ${renderToolbar(subjectState, subject)}
            ${singleProjectMode ? "" : renderChartTabs(subjectState, subject)}
            <div class="subject-top-grid ${singleProjectMode ? "is-single" : ""}">
              ${renderMainChart(subject, rows, subjectState)}
              ${singleProjectMode ? "" : renderSelectedProjectCard(subject, rows, subjectState)}
            </div>
            ${renderTable(subject, rows, subjectState)}
            ${renderAnalysisNote(subject, rows, subjectState)}
            ${renderFootnote()}
          </main>
        </div>
      </div>
    `;
  }

  function renderSubjectShell() {
    if (typeof updateNav === "function") updateNav();
    const actionType = typeof V116_RENDER_ACTION_TYPE !== "undefined" ? V116_RENDER_ACTION_TYPE || "navigation" : "navigation";
    const pageClass = actionType === "navigation" ? "page-transition page-transition-soft" : "page-transition is-stable";
    const template = document.createElement("template");
    template.innerHTML = `
      ${typeof renderV116InteractionBar === "function" ? renderV116InteractionBar() : ""}
      <div class="${pageClass}" data-render-action="${h(actionType)}">${renderSubjectPage()}</div>
      ${typeof renderV116DetailDrawer === "function" ? renderV116DetailDrawer() : ""}
      ${typeof renderSingleRecordDetailDrawer === "function" ? renderSingleRecordDetailDrawer() : ""}
      <button class="back-to-top-fab" type="button" data-action="back-to-top" aria-label="返回顶部" title="返回顶部">
        <span class="back-to-top-icon" aria-hidden="true"></span>
      </button>
    `.trim();
    app.replaceChildren(template.content);
    if (typeof V116_RENDER_ACTION_TYPE !== "undefined") V116_RENDER_ACTION_TYPE = "navigation";
  }

  function parseHash() {
    const raw = String(global.location && global.location.hash ? global.location.hash.slice(1) : "");
    if (!raw) return null;
    const parts = raw.split("?");
    if (!HASHES.has(parts[0])) return null;
    const params = new URLSearchParams(parts[1] || "");
    return {
      subjectId: params.get("subjectId") || "",
      month: params.get("month") || "",
      tab: params.get("tab") || ""
    };
  }

  function replaceHash(subjectState = scState()) {
    if (!global.history || !global.location) return;
    const params = new URLSearchParams();
    if (subjectState.subjectId) params.set("subjectId", subjectState.subjectId);
    if (subjectState.month && subjectState.month !== String(latestMonth())) params.set("month", subjectState.month);
    if (subjectState.chartTab && subjectState.chartTab !== "amount") params.set("tab", subjectState.chartTab);
    const next = "#subjectCompare" + (params.toString() ? "?" + params.toString() : "");
    if (global.location.hash !== next) global.history.pushState(null, "", next);
  }

  function openSubjectCompare(options = {}) {
    const subjectState = scState();
    state.view = VIEW;
    const subjectChanged = Boolean(options.subjectId && options.subjectId !== subjectState.subjectId);
    if (options.subjectId !== undefined && options.subjectId) subjectState.subjectId = options.subjectId;
    if (options.month !== undefined && options.month) subjectState.month = options.month;
    if (options.tab !== undefined && options.tab) subjectState.chartTab = options.tab;
    if (subjectChanged) {
      subjectState.selectedProjectId = "";
      subjectState.focusProjectIds = [];
      subjectState.focusMessage = "";
    }
    if (options.projectId !== undefined && options.projectId) subjectState.selectedProjectId = options.projectId;
    subjectState.notice = options.notice || "";
    selectedSubject();
    if (options.hash !== false) replaceHash(subjectState);
    if (typeof v116SetRenderActionType === "function") v116SetRenderActionType("navigation");
    render();
    if (typeof resetPageScrollToTop === "function") resetPageScrollToTop();
  }

  function scrollSubjectSelection() {
    if (typeof document === "undefined") return;
    global.setTimeout(() => {
      const card = document.getElementById("subjectSelectedCard");
      if (card && typeof card.scrollIntoView === "function") {
        card.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 30);
  }

  function openNcDrawer(projectId) {
    const subjectState = scState();
    const subject = selectedSubject();
    const rows = buildCompareRows(subject, subjectState);
    const row = rows.find((item) => item.projectId === projectId);
    if (!subject || !row || typeof v116OpenDetailDrawer !== "function") return;
    v116OpenDetailDrawer({
      projectId,
      month: subjectState.month,
      subjectKey: row.drawerSubjectKey || subject.subjectKey,
      title: `${row.project.shortName} · ${subject.subjectName} · ${monthLabel(subjectState.month)}NC明细`,
      amount: row.selectedAmount,
      subjectCompareDrawer: true
    });
  }

  function openOrg(projectId) {
    const subjectState = scState();
    const subject = selectedSubject();
    if (!subject || !global.V133OrgPenetration || typeof global.V133OrgPenetration.openOrg !== "function") return;
    const org = global.V133OrgPenetration.getState && global.V133OrgPenetration.getState();
    if (org) org.month = subjectState.month || "all";
    global.V133OrgPenetration.openOrg({
      type: "subject",
      projectId,
      natureName: subject.level1,
      subjectId: subject.subjectId,
      subjectKey: detailSubjectKey(projectId, subject.subjectId, subject.subjectKey),
      subjectName: subject.subjectName,
      source: "subjectCompare"
    });
  }

  function openProfile(projectId, options = {}) {
    const subject = selectedSubject();
    if (global.V132ProjectProfile && typeof global.V132ProjectProfile.openProfile === "function") {
      global.V132ProjectProfile.openProfile(projectId, {
        fromSubjectCompare: true,
        subjectId: subject ? subject.subjectId : scState().subjectId,
        subjectName: subject ? subject.subjectName : "",
        month: scState().month,
        scrollToActivityAxis: Boolean(options.scrollToActivityAxis)
      });
      return;
    }
    state.view = "profile";
    state.profileProjectId = projectId;
    state.profileFromSubjectCompare = {
      subjectId: subject ? subject.subjectId : scState().subjectId,
      subjectName: subject ? subject.subjectName : "",
      month: scState().month,
      scrollToActivityAxis: Boolean(options.scrollToActivityAxis)
    };
    render();
  }

  function bindEvents() {
    if (eventsBound || typeof document === "undefined") return;
    eventsBound = true;
    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      if (action === "subject-compare-open" || action === "subject-compare-select") {
        openSubjectCompare({ subjectId: target.dataset.subjectId || "", month: target.dataset.month || "", tab: target.dataset.tab || "", projectId: target.dataset.project || "" });
        return;
      }
      if (action === "subject-compare-tab") {
        const subjectState = scState();
        const subject = selectedSubject();
        if (target.dataset.tab === "unit" && (!subject || !subject.unitName)) {
          subjectState.notice = "当前科目暂无统一可比单位，请先查看金额集中度。";
          render();
          return;
        }
        subjectState.chartTab = target.dataset.tab || "amount";
        subjectState.notice = "";
        replaceHash(subjectState);
        render();
        return;
      }
      if (action === "subject-compare-sort") {
        scState().sort = target.dataset.sort || "current_desc";
        render();
        return;
      }
      if (action === "subject-select-project") {
        const subjectState = scState();
        subjectState.selectedProjectId = target.dataset.project || "";
        subjectState.focusProjectIds = [];
        subjectState.focusMessage = "已根据图表或表格选中项目，可继续查看项目画像、活动轴、组织穿透或NC明细。";
        subjectState.notice = "";
        render();
        scrollSubjectSelection();
        return;
      }
      if (action === "subject-focus-top80") {
        const ids = String(target.dataset.projectIds || "").split(",").filter(Boolean);
        const subjectState = scState();
        subjectState.focusProjectIds = ids;
        subjectState.selectedProjectId = ids[0] || subjectState.selectedProjectId;
        subjectState.focusMessage = ids.length ? `已高亮前${ids.length}个主要贡献项目，表格同步标记。` : "";
        subjectState.notice = "";
        render();
        scrollSubjectSelection();
        return;
      }
      if (action === "subject-profile-open") {
        openProfile(target.dataset.project || "");
        return;
      }
      if (action === "subject-profile-activity-open") {
        openProfile(target.dataset.project || "", { scrollToActivityAxis: true });
        return;
      }
      if (action === "subject-org-open") {
        openOrg(target.dataset.project || "");
        return;
      }
      if (action === "subject-compare-nc") {
        openNcDrawer(target.dataset.project || "");
        return;
      }
      if (action === "subject-compare-ai") {
        if (global.V13Bridge && typeof global.V13Bridge.openAi === "function") global.V13Bridge.openAi("overview");
      }
    });
    document.addEventListener("change", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      if (target.dataset.action === "subject-compare-month") {
        const subjectState = scState();
        subjectState.month = target.value || String(latestMonth());
        replaceHash(subjectState);
        render();
      }
      if (target.dataset.action === "subject-compare-sort-select") {
        scState().sort = target.value || "current_desc";
        render();
      }
    });
    global.addEventListener("hashchange", () => {
      const route = parseHash();
      if (!route || typeof state === "undefined") return;
      const subjectState = scState();
      state.view = VIEW;
      subjectState.subjectId = route.subjectId || subjectState.subjectId || defaultSubjectId();
      subjectState.month = route.month || subjectState.month || String(latestMonth());
      subjectState.chartTab = route.tab || subjectState.chartTab || "amount";
      render();
    });
  }

  function applyInitialHash() {
    const route = parseHash();
    if (!route || typeof state === "undefined") return;
    const subjectState = scState();
    state.view = VIEW;
    subjectState.subjectId = route.subjectId || subjectState.subjectId || defaultSubjectId();
    subjectState.month = route.month || subjectState.month || String(latestMonth());
    subjectState.chartTab = route.tab || subjectState.chartTab || "amount";
  }

  function patchRender() {
    if (renderPatched || typeof render !== "function") return;
    const originalRender = render;
    render = function () {
      if (typeof state !== "undefined" && state.view === VIEW) {
        renderSubjectShell();
        return;
      }
      originalRender();
    };
    renderPatched = true;
  }

  function extendAiContext(context) {
    if (typeof state === "undefined" || state.view !== VIEW) return context;
    const subjectState = scState();
    const subject = selectedSubject();
    const rows = buildCompareRows(subject, subjectState);
    const currentTotal = rows.reduce((sum, row) => sum + row.currentMonthAmount, 0);
    const previousTotal = rows.reduce((sum, row) => sum + row.previousMonthAmount, 0);
    const cumulativeTotal = rows.reduce((sum, row) => sum + row.cumulativeAmount, 0);
    const topAmount = rows.slice().sort((a, b) => b.currentMonthAmount - a.currentMonthAmount)[0];
    const topRatio = rows.slice().sort((a, b) => b.projectRatio - a.projectRatio)[0];
    const topDelta = rows.slice().sort((a, b) => b.absDelta - a.absDelta)[0];
    const selectedRow = ensureSelectedRow(rows, subjectState);
    const activity = subjectActivitySummary(subject, selectedRow, subjectState);
    context.pageName = "科目横向";
    context.subjectCompare = {
      subjectName: subject ? subject.subjectName : "",
      subjectPath: subject ? [subject.level1, subject.level2, subject.level3].filter(Boolean).join(" / ") : "",
      monthLabel: monthLabel(subjectState.month),
      scopeLabel: currentRole() && currentRole().visibleProjectIds !== "all" ? "当前可查看项目" : "全部授权项目",
      projectCount: rows.length,
      currentTotalWan: (currentTotal / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 1 }),
      cumulativeTotalWan: (cumulativeTotal / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 1 }),
      deltaWan: ((currentTotal - previousTotal) / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 1 }),
      ncCount: rows.reduce((sum, row) => sum + row.ncCount, 0),
      topAmountProject: topAmount ? topAmount.project.shortName : "",
      topRatioProject: topRatio ? topRatio.project.shortName : "",
      topDeltaProject: topDelta ? topDelta.project.shortName : "",
      comparableLabel: subject && subject.unitName ? "可做单价对比" : "仅看金额对比",
      fieldPendingCount: rows.filter((row) => row.coverage && row.coverage.pending).length,
      selectedProjectName: selectedRow ? selectedRow.project.shortName : "",
      selectedProjectAmountWan: selectedRow ? (selectedRow.selectedAmount / 10000).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0.0",
      selectedProjectRatio: selectedRow ? pct(selectedRow.projectRatio) : "-",
      selectedProjectNcCount: selectedRow ? selectedRow.ncCount : 0,
      relatedActivityCount: activity.relatedActivityCount,
      relatedTopActivityName: activity.relatedTopActivityName,
      relatedTopActivityCostWan: activity.relatedTopActivityCostWan,
      relatedTopActivityMonth: activity.relatedTopActivityMonth,
      relatedTopActivityNcCount: activity.relatedTopActivityNcCount
    };
    return context;
  }

  patchRender();
  bindEvents();
  applyInitialHash();

  global.V134SubjectCompare = {
    open: openSubjectCompare,
    extendAiContext,
    getSubjectRows: () => buildCompareRows(selectedSubject(), scState()),
    getSelectedSubject: selectedSubject
  };
})(typeof window !== "undefined" ? window : globalThis);
