function v116FilterDrawerRecords(context = {}) {
  const term = (context.query || "").trim().toLowerCase();
  return getAllLedgerRecords().filter((record) => {
    if (context.projectId && context.projectId !== "all" && record.projectId !== context.projectId) return false;
    if (context.month && context.month !== "all" && Number(record.month) !== Number(context.month)) return false;
    if (context.costType && context.costType !== "all" && record.main !== context.costType) return false;
    if (context.subjectKey && !record.pathKeys.includes(context.subjectKey)) return false;
    if (context.activityId) {
      if (record.activityId !== context.activityId) return false;
      if (record.factType === "allocated_cost" || record.allocated === true || record.directCollected === false) return false;
    }
    if (context.activityCostItem && record.activityCostItem !== "全部" && record.activityCostItem !== context.activityCostItem) return false;
    if (context.benchmarkItem && record.benchmarkItem !== context.benchmarkItem) return false;
    if (Array.isArray(context.ncRecordIds) && context.ncRecordIds.length && !context.ncRecordIds.includes(record.id)) return false;
    if (term) {
      const text = `${record.supplier} ${record.contractName} ${record.contractNo} ${record.subjectPath} ${record.summary || ""}`.toLowerCase();
      if (!text.includes(term)) return false;
    }
    return true;
  });
}

function v1343SetDetailDrawerBodyClass(isOpen) {
  if (typeof document === "undefined" || !document.body || !document.body.classList) return;
  document.body.classList.toggle("is-detail-drawer-open", Boolean(isOpen));
}

function v1343ActivityScopeText(context = {}) {
  if (!context.activityId) return "";
  return [
    context.activityName ? `活动：${context.activityName}` : "",
    "明细口径：直接归集NC明细"
  ].filter(Boolean).join(" / ");
}

function v1343DrawerFilterText(context = {}) {
  return [
    v116ProjectLabel(context.projectId),
    v116MonthFilterLabel(context.month || "all"),
    v1343ActivityScopeText(context),
    v116CostTypeLabel(context.costType || "all"),
    v116SubjectLabel(context.subjectKey),
    context.activityCostItem,
  ].filter(Boolean).join(" / ");
}

function v1343DrawerSummaryHtml(context, records, amount) {
  if (!context.activityId) {
    return `
      <div><span>当前金额</span><strong>${moneyWan(amount)}</strong></div>
      <div><span>明细笔数</span><strong>${records.length}笔</strong></div>
    `;
  }
  const activityTotal = Number(context.activityTotalCost || amount || 0);
  const directCost = Number(context.activityDirectCost || sumRecords(records));
  const allocatedCost = Number(context.activityAllocatedCost || Math.max(0, activityTotal - directCost));
  return `
    <div><span>活动总成本</span><strong>${moneyWan(activityTotal)}</strong></div>
    <div><span>直接归集成本</span><strong>${moneyWan(directCost)}</strong></div>
    <div><span>分摊计入成本</span><strong>${moneyWan(allocatedCost)}</strong></div>
    <div><span>直接NC明细</span><strong>${records.length}笔</strong></div>
  `;
}

function v1343DrawerNotes(context = {}) {
  const common = "口径说明：明细基于已归集NC样本，正式结论以NC原始数据、合同及结算单为准。";
  const subjectCompareNote = context.subjectCompareDrawer ? `
    <div class="drawer-scope-note">当前明细为所选项目、所选科目、所选月份范围内的NC记录；明细用于追溯供应商、合同、结算和付款，不参与页面金额重复计算。</div>
  ` : "";
  if (!context.activityId) return `<div class="drawer-scope-note">${escapeHtml(common)}</div>${subjectCompareNote}`;
  const fallbackNote = context.fallbackFromSubject ? `
    <div class="drawer-scope-note is-activity">科目【${escapeHtml(context.fallbackSubjectName || "该科目")}】在本活动下全部为按规则分摊成本，无直接归集NC明细；已切换至本活动全部直接归集明细。</div>
  ` : "";
  return `
    <div class="drawer-scope-note">${escapeHtml(common)}</div>
    ${subjectCompareNote}
    <div class="drawer-scope-note is-activity">本抽屉仅列示直接归集到该活动的NC明细；分摊成本按活动期间分摊规则计入活动总成本，底层明细归属对应日常基础成本科目。</div>
    ${fallbackNote}
  `;
}

function v116OpenDetailDrawer(context = {}) {
  const month = context.month || v116ActiveMonth();
  const costType = context.costType || context.main || v116ActiveCostType();
  const subjectKey = context.subjectKey || context.key || "";
  const projectId = context.projectId || context.project || "";
  if (state.view === "details") state.detail.selectedId = "";
  V116_INTERACTION_STATE.drawerOpen = true;
  V116_INTERACTION_STATE.drawerContext = {
    title: context.title || "金额明细",
    amount: Number(context.amount) || 0,
    projectId: projectId || "all",
    month,
    costType,
    subjectKey,
    activityId: context.activityId || context.activity || "",
    activityName: context.activityName || "",
    activityTotalCost: Number(context.activityTotalCost || 0),
    activityDirectCost: Number(context.activityDirectCost || 0),
    activityAllocatedCost: Number(context.activityAllocatedCost || 0),
    fallbackFromSubject: Boolean(context.fallbackFromSubject),
    fallbackSubjectName: context.fallbackSubjectName || "",
    subjectCompareDrawer: Boolean(context.subjectCompareDrawer),
    directActivityOnly: Boolean(context.activityId || context.activity || context.directActivityOnly),
    activityCostItem: context.activityCostItem || context.item || "",
    benchmarkItem: context.benchmarkItem || "",
    returnView: state.view,
    traceStage: "project",
  };
  v1343SetDetailDrawerBodyClass(true);
  if (month && month !== "all") V116_INTERACTION_STATE.selectedMonth = String(month);
  if (costType && costType !== "all") V116_INTERACTION_STATE.selectedCostType = costType;
  if (projectId && projectId !== "all") v116SetSelectedProject(projectId);
  if (subjectKey) v116SetSelectedSubject(subjectKey);
  v116SetRenderActionType("drawer");
  render();
}

function v116OpenDetailDrawerFromTarget(target) {
  v116OpenDetailDrawer({
    title: target.dataset.title,
    amount: target.dataset.amount,
    projectId: target.dataset.project,
    month: target.dataset.month,
    costType: target.dataset.main,
    subjectKey: target.dataset.key,
    activityId: target.dataset.activity,
    activityCostItem: target.dataset.item,
    benchmarkItem: target.dataset.benchmark,
  });
}

function v116CloseDetailDrawer({ shouldRender = true } = {}) {
  V116_INTERACTION_STATE.drawerOpen = false;
  V116_INTERACTION_STATE.drawerContext = null;
  v1343SetDetailDrawerBodyClass(false);
  if (shouldRender) {
    v116SetRenderActionType("drawer");
    render();
  }
}

function v116OpenDetailsFromDrawer() {
  const context = V116_INTERACTION_STATE.drawerContext || {};
  state.detail.projectId = context.projectId || "all";
  state.detail.month = context.month || "all";
  state.detail.subjectKey = context.subjectKey || (context.costType && context.costType !== "all" ? context.costType : "");
  state.detail.benchmarkItem = context.benchmarkItem || "";
  state.detail.activityId = context.activityId || "";
  state.detail.activityCostItem = context.activityCostItem || "";
  state.detail.directActivityOnly = Boolean(context.directActivityOnly || context.activityId);
  state.detail.unitBenchmarkName = "";
  state.detail.unitBenchmarkUnit = "";
  state.detail.ncRecordIds = Array.isArray(context.ncRecordIds) ? [...context.ncRecordIds] : [];
  state.detail.query = "";
  state.detail.page = 1;
  state.detail.selectedId = "";
  state.detail.returnView = context.returnView || state.view || "home";
  state.detail.traceStage = context.traceStage || "project";
  V116_INTERACTION_STATE.drawerOpen = false;
  V116_INTERACTION_STATE.drawerContext = null;
  v1343SetDetailDrawerBodyClass(false);
  state.view = "details";
  v116SetRenderActionType("navigation");
  render();
  resetPageScrollToTop();
}

function renderV116DetailDrawer() {
  if (!V116_INTERACTION_STATE.drawerOpen || !V116_INTERACTION_STATE.drawerContext) return "";
  const context = V116_INTERACTION_STATE.drawerContext;
  const records = v116FilterDrawerRecords(context).sort((a, b) => b.amount - a.amount);
  const amount = context.amount || sumRecords(records);
  const topSubjects = v116Aggregate(records, (record) => record.l1 || record.subjectPath, 3);
  const topSuppliers = v116Aggregate(records, (record) => record.supplier, 3);
  const sampleRows = records.slice(0, 5);
  const filterText = v1343DrawerFilterText(context);
  return `
    <div class="detail-drawer-backdrop" data-action="v116-drawer-close" aria-hidden="true"></div>
    <aside class="detail-drawer" role="dialog" aria-label="金额明细">
      <div class="drawer-head">
        <div>
          <span>明细侧栏</span>
          <h2>${escapeHtml(context.title || "金额明细")}</h2>
        </div>
        <button class="drawer-close" data-action="v116-drawer-close" aria-label="关闭明细侧栏">×</button>
      </div>
      <div class="drawer-summary">
        ${v1343DrawerSummaryHtml(context, records, amount)}
      </div>
      ${renderV1394TraceChain(records, {
        traceStage: context.traceStage || "project",
        title: context.activityId ? "活动NC明细七级穿透链" : "金额明细七级穿透链",
        scopeText: filterText || "当前筛选范围",
        activityAllocatedCost: Number(context.activityAllocatedCost || 0),
        compact: true,
      })}
      <dl class="drawer-filter-list">
        <div><dt>筛选条件</dt><dd>${filterText || "全部项目 / 累计 / 全部成本"}</dd></div>
        <div><dt>TOP科目</dt><dd>${topSubjects.map((item) => `${item.name} ${moneyWan(item.amount)}`).join(" / ") || "无"}</dd></div>
        <div><dt>TOP供应商</dt><dd>${topSuppliers.map((item) => `${item.name} ${moneyWan(item.amount)}`).join(" / ") || "无"}</dd></div>
      </dl>
      ${v1343DrawerNotes(context)}
      <div class="drawer-sample-list">
        <h3>代表性明细</h3>
        ${sampleRows.length ? sampleRows.map((record) => `
          <article class="drawer-sample-row">
            <div><strong>${renderProjectToken(record.projectName || record.projectFullName || "")}</strong><span>${escapeHtml(record.costMonth || "")} · ${escapeHtml(record.subjectPath || "")}</span></div>
            <em>${moneyWan(record.amount)}</em>
            <p>${escapeHtml(record.supplier || "")} / ${escapeHtml(record.contractName || "")}</p>
            <small>合同编号：${v116SafeNcField(record.contractNo)} · 结算单号：${v116SafeNcField(record.settlementNo)} · 付款单号：${v116SafeNcField(record.paymentNo)}</small>
          </article>
        `).join("") : `<div class="empty-state">当前筛选条件下无代表性明细</div>`}
      </div>
      <div class="drawer-actions">
        <button class="btn primary" data-action="v116-drawer-details">查看全部NC明细</button>
        <button class="btn ghost" data-action="v116-drawer-close">关闭</button>
      </div>
    </aside>
  `;
}

function v127OpenSingleRecordDrawer(recordId) {
  if (!recordId) return;
  V116_INTERACTION_STATE.drawerOpen = false;
  V116_INTERACTION_STATE.drawerContext = null;
  state.detail.selectedId = recordId;
  v116SetRenderActionType("drawer");
  render();
}

function v127CloseSingleRecordDrawer({ shouldRender = true } = {}) {
  state.detail.selectedId = "";
  if (shouldRender) {
    v116SetRenderActionType("drawer");
    render();
  }
}

function openMonthAnalysis(month, categoryFilter = "all") {
  state.view = "monthAnalysis";
  state.month = String(normalizeMonthValue(month));
  state.monthCategoryFilter = categoryFilter || "all";
  state.monthSubjectKey = "";
  state.monthProjectFilter = "";
  state.monthProjectsExpanded = false;
  state.monthDetailVisible = false;
  state.monthDetailExpanded = false;
  render();
  resetPageScrollToTop();
}

function openProject(projectId, month = "all", subjectKey = "") {
  const options = { month, subjectKey };
  if (typeof openProjectProfileEntry === "function") {
    return openProjectProfileEntry(projectId, options);
  }
  state.view = "profile";
  state.projectId = projectId || state.projectId || "sjz";
  state.profileProjectId = state.projectId;
  state.search = "";
  render();
  resetPageScrollToTop();
}

function openBenchmarkCompare(itemName, month = "all") {
  const normalized = normalizeUnitBenchmarkItem({ costItemName: itemName || "保安服务", amount: 1, quantity: 1, unit: "项", canBenchmark: true });
  const availableItems = getUnitBenchmarkOptions().map((item) => item.name);
  state.view = "compare";
  state.compareTab = "benchmark";
  state.benchmark.item = availableItems.includes(normalized.normalizedName) ? normalized.normalizedName : "保安服务";
  state.benchmark.month = month || "all";
  state.benchmark.projectScope = "全部项目";
  state.benchmark.unit = "全部单位";
  state.benchmark.metric = "单价";
  state.benchmark.splitFilter = "全部";
  state.benchmark.selectedProjectId = state.projectId || "sjz";
  state.benchmark.selectedRowKey = "";
  render();
  resetPageScrollToTop();
}

function openBenchmarkDetails(projectId, month, itemName) {
  state.detail.projectId = projectId;
  state.detail.month = month || "all";
  state.detail.subjectKey = "";
  state.detail.benchmarkItem = itemName;
  state.detail.activityId = "";
  state.detail.activityCostItem = "";
  state.detail.unitBenchmarkName = "";
  state.detail.unitBenchmarkUnit = "";
  state.detail.ncRecordIds = [];
  state.detail.query = "";
  state.detail.page = 1;
  state.detail.selectedId = "";
  state.detail.returnView = "compare";
  state.view = "details";
  render();
  resetPageScrollToTop();
}

function openUnitBenchmarkDetails(row) {
  if (!row) return;
  state.detail.projectId = row.project.id;
  state.detail.month = state.benchmark.month || "all";
  state.detail.subjectKey = "";
  state.detail.benchmarkItem = "";
  state.detail.activityId = "";
  state.detail.activityCostItem = "";
  state.detail.unitBenchmarkName = row.normalizedName;
  state.detail.unitBenchmarkUnit = row.unit;
  state.detail.ncRecordIds = [...row.ncRecordIds];
  state.detail.query = "";
  state.detail.page = 1;
  state.detail.selectedId = "";
  state.detail.returnView = "compare";
  state.view = "details";
  render();
  resetPageScrollToTop();
}

function openActivityDetail(activityId, returnView = state.view) {
  const activity = getActivityById(activityId);
  if (!activity) return;
  state.activityDetail.activityId = activity.activityId;
  state.activityDetail.selectedCostItem = "";
  state.activityDetail.costTableExpanded = false;
  state.activityDetail.returnView = returnView || "activity";
  state.view = "activityDetail";
  render();
  resetPageScrollToTop();
}

function openActivityLedger(activityId, costItem = "", returnView = state.view) {
  const activity = getActivityById(activityId);
  if (!activity) return;
  state.detail.projectId = activity.projectId;
  state.detail.month = String(activity.month);
  state.detail.subjectKey = "";
  state.detail.benchmarkItem = "";
  state.detail.activityId = activity.activityId;
  state.detail.activityCostItem = costItem || "";
  state.detail.directActivityOnly = true;
  state.detail.unitBenchmarkName = "";
  state.detail.unitBenchmarkUnit = "";
  state.detail.ncRecordIds = [];
  state.detail.query = "";
  state.detail.page = 1;
  state.detail.selectedId = "";
  state.detail.returnView = returnView || "activityDetail";
  state.view = "details";
  render();
  resetPageScrollToTop();
}

function openActivitySubjectLedger(activityId, subjectId, returnView = "activityDetail") {
  const activity = getActivityById(activityId);
  if (!activity) return;
  state.detail.projectId = activity.projectId;
  state.detail.month = String(activity.month);
  state.detail.subjectKey = subjectKeyFromCostSubjectId(subjectId);
  state.detail.benchmarkItem = "";
  state.detail.activityId = activity.activityId;
  state.detail.activityCostItem = "";
  state.detail.directActivityOnly = true;
  state.detail.unitBenchmarkName = "";
  state.detail.unitBenchmarkUnit = "";
  state.detail.ncRecordIds = [];
  state.detail.query = "";
  state.detail.page = 1;
  state.detail.selectedId = "";
  state.detail.returnView = returnView;
  state.view = "details";
  render();
  resetPageScrollToTop();
}

function subjectKeyFromCostSubjectId(subjectId) {
  const subject = COST_SUBJECT_TREE.find((item) => item.id === subjectId);
  if (!subject) return "";
  if (subject.level === 0) return subject.category;
  return `${subject.category}|${subject.name}`;
}

function mapSubjectToBenchmark(subject) {
  const text = subject ? subject.pathText : "";
  if (text.includes("安保")) return "保安服务";
  if (text.includes("保洁")) return "保洁服务";
  if (text.includes("维保") || text.includes("维护")) return "设备维保";
  if (text.includes("搭建")) return "标准搭建";
  if (text.includes("物料") || text.includes("材料设备")) return "活动物资";
  if (text.includes("餐饮")) return "餐饮服务";
  if (text.includes("临勤") || text.includes("现场服务") || text.includes("现场保障")) return "现场服务 / 临时用工";
  if (text.includes("宣传推广") || text.includes("宣传")) return "宣传推广";
  return "保安服务";
}

function syncDetailFromProject(subjectKey = state.selectedSubjectKey || scopeSubjectKey()) {
  state.detail.projectId = state.projectId;
  state.detail.month = state.month;
  state.detail.subjectKey = subjectKey || "";
  state.detail.benchmarkItem = "";
  state.detail.activityId = "";
  state.detail.activityCostItem = "";
  state.detail.directActivityOnly = false;
  state.detail.unitBenchmarkName = "";
  state.detail.unitBenchmarkUnit = "";
  state.detail.ncRecordIds = [];
  state.detail.query = "";
  state.detail.page = 1;
  state.detail.selectedId = "";
  state.detail.returnView = "project";
}
