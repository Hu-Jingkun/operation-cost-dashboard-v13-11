function render() {
  updateNav();
  let content = "";
  if (state.view === "home") content = renderHome();
  if (state.view === "monthAnalysis") content = renderMonthAnalysis();
  if (state.view === "compare") content = renderCompare();
  if (state.view === "activity") content = renderActivity();
  if (state.view === "activityDetail") content = renderActivityDetail();
  if (state.view === "details") content = renderDetails();
  if (state.view === "source") content = renderExecutiveSource();
  const actionType = V116_RENDER_ACTION_TYPE || "navigation";
  const pageClass = actionType === "navigation" ? "page-transition page-transition-soft" : "page-transition is-stable";
  const template = document.createElement("template");
  template.innerHTML = `
    ${renderV116InteractionBar()}
    <div class="${pageClass}" data-render-action="${actionType}">${content}</div>
    ${renderV116DetailDrawer()}
    ${renderSingleRecordDetailDrawer()}
    <button class="back-to-top-fab" type="button" data-action="back-to-top" aria-label="返回顶部" title="返回顶部">
      <span class="back-to-top-icon" aria-hidden="true"></span>
    </button>
  `.trim();
  app.replaceChildren(template.content);
  V116_RENDER_ACTION_TYPE = "navigation";
}

function resetPageScrollToTop() {
  requestAnimationFrame(() => {
    const scrollRoot = document.scrollingElement || document.documentElement;
    if (scrollRoot) scrollRoot.scrollTop = 0;
    document.body.scrollTop = 0;
  });
}

function updateNav() {
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });
}

function v116ActiveMonth() {
  if (state.view === "home") return "all";
  if (state.view === "profile" && state.month !== "all") return String(state.month);
  if (state.view === "details" && state.detail.month !== "all") return String(state.detail.month);
  if (state.view === "activity" && state.activity.month !== "all") return String(state.activity.month);
  if (state.view === "activityDetail") {
    const activity = getActivityById(state.activityDetail.activityId);
    return activity ? String(activity.month) : "all";
  }
  return V116_INTERACTION_STATE.selectedMonth || "all";
}

function v116ActiveCostType() {
  if (state.view === "home") return "all";
  if (state.view === "profile" && V116_COST_TYPES.includes(state.scope) && state.scope !== "all") return state.scope;
  if (state.view === "details" && state.detail.subjectKey && subjectIndex[state.detail.subjectKey]?.level === 0) return state.detail.subjectKey;
  if (["activity", "activityDetail", "details"].includes(state.view)) return "all";
  return V116_INTERACTION_STATE.selectedCostType || "all";
}

function v116CostTypeLabel(value) {
  return value === "all" ? "全部成本" : value;
}

function v116MonthFilterLabel(value) {
  return value === "all" ? "累计" : `2026年${value}月`;
}

function v116ProjectLabel(projectId) {
  if (!projectId) return "";
  if (projectId === "all") return "全部项目";
  return getProject(projectId).shortName;
}

function renderProjectToken(name) {
  return `<span class="project-token">${escapeHtml(name || "-")}</span>`;
}

function renderProjectTokenList(names = []) {
  return names.filter(Boolean).map(renderProjectToken).join(`<span class="project-separator">、</span>`);
}

function v116SubjectLabel(subjectKey) {
  if (!subjectKey) return "";
  return subjectIndex[subjectKey]?.pathText || subjectKey.replaceAll("|", " / ");
}

function v127UniqueChips(chips = []) {
  const seen = new Set();
  return chips.filter((chip) => {
    const label = String(chip.label || "").trim();
    if (!label) return false;
    const key = label.replace(/\s+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function v116SetSelectedProject(projectId) {
  V116_INTERACTION_STATE.selectedProjectId = projectId && projectId !== "all" ? projectId : null;
}

function v116SetSelectedSubject(subjectKey) {
  V116_INTERACTION_STATE.selectedSubject = subjectKey || null;
}

function v116ApplyMonth(value, { syncPage = true } = {}) {
  const next = value || "all";
  V116_INTERACTION_STATE.selectedMonth = next;
  if (!syncPage) return;
  if (state.view === "compare") {
    state.benchmark.month = next;
    state.benchmark.selectedRowKey = "";
    state.activityBenchmark.month = next;
    state.activityBenchmark.selectedActivityId = "";
  }
  if (state.view === "details") {
    state.detail.month = next;
    state.detail.page = 1;
    state.detail.selectedId = "";
  }
  if (state.view === "activity") {
    state.activity.month = next;
    state.activity.cardsExpanded = false;
    state.activity.tableExpanded = false;
  }
}

function v116ApplyCostType(value, { syncPage = true } = {}) {
  const next = value || "all";
  V116_INTERACTION_STATE.selectedCostType = next;
  if (!syncPage) return;
  if (state.view === "details") {
    state.detail.subjectKey = next === "all" ? "" : next;
    state.detail.activityCostItem = "";
    state.detail.benchmarkItem = "";
    state.detail.page = 1;
    state.detail.selectedId = "";
  }
}

function v116ClearInteractionFilter(filter) {
  if (filter === "month") v116ApplyMonth("all");
  if (filter === "costType") v116ApplyCostType("all");
  if (filter === "project") V116_INTERACTION_STATE.selectedProjectId = null;
  if (filter === "subject") {
    v116SetSelectedSubject("");
    if (state.view === "details") state.detail.subjectKey = "";
  }
}

function v116ClearAllInteractionFilters() {
  V116_INTERACTION_STATE.selectedMonth = "all";
  V116_INTERACTION_STATE.selectedCostType = "all";
  V116_INTERACTION_STATE.selectedProjectId = null;
  V116_INTERACTION_STATE.selectedSubject = null;
  if (state.view === "details") {
    state.detail.month = "all";
    state.detail.subjectKey = "";
    state.detail.activityCostItem = "";
    state.detail.benchmarkItem = "";
    state.detail.page = 1;
    state.detail.selectedId = "";
  }
  if (state.view === "activity") {
    state.activity.month = "all";
    state.activity.costItem = "全部";
  }
}

function renderV116InteractionBar() {
  if (!["compare", "activity", "activityDetail", "details"].includes(state.view)) return "";
  const activeMonth = v116ActiveMonth();
  const activeCostType = v116ActiveCostType();
  const rawChips = [];
  if (activeMonth !== "all") rawChips.push({ key: "month", label: v116MonthFilterLabel(activeMonth) });
  if (activeCostType !== "all") rawChips.push({ key: "costType", label: activeCostType });
  const projectId = state.view === "home" ? "" : V116_INTERACTION_STATE.selectedProjectId || "";
  if (projectId) rawChips.push({ key: "project", label: v116ProjectLabel(projectId) });
  const subjectKey = state.view === "home" ? "" : V116_INTERACTION_STATE.selectedSubject || (state.view === "details" ? state.detail.subjectKey : "");
  if (subjectKey) rawChips.push({ key: "subject", label: v116SubjectLabel(subjectKey) });
  const chips = v127UniqueChips(rawChips);
  return `
    <section class="v116-interaction-bar" aria-label="交互筛选状态">
      <div class="v116-filter-controls">
        <div class="v116-control-group" aria-label="月份切换">
          <span>时间范围</span>
          <div class="v116-segmented">
            ${V116_MONTH_FILTERS.map((item) => `
              <button class="v116-month-toggle ${activeMonth === item.value ? "is-active" : ""}" data-action="v116-month-filter" data-month="${item.value}">${item.label}</button>
            `).join("")}
          </div>
        </div>
        <div class="v116-control-group" aria-label="成本类型切换">
          <span>成本类型</span>
          <div class="v116-segmented">
            ${V116_COST_TYPES.map((item) => `
              <button class="v116-cost-toggle ${activeCostType === item ? "is-active" : ""}" data-action="v116-cost-filter" data-main="${item}">${v116CostTypeLabel(item)}</button>
            `).join("")}
          </div>
        </div>
      </div>
      <div class="v116-chip-row">
        <strong>当前筛选</strong>
        ${chips.length ? chips.map((chip) => `
          <button class="filter-chip" data-action="v116-chip-clear" data-filter="${chip.key}">${chip.label}<span aria-hidden="true">×</span></button>
        `).join("") : `<span class="filter-chip is-empty">全部项目 · 累计 · 全部成本</span>`}
        ${chips.length ? `<button class="v116-clear-link" data-action="v116-clear-all">清空筛选</button>` : ""}
      </div>
    </section>
  `;
}

function v116KpiTooltip(label) {
  const tips = {
    "1-5月累计成本": "累计成本按1-5月直接归集成本汇总。",
    "累计成本": "当前项目累计直接归集成本汇总。",
    "5月成本": "2026年5月直接归集成本汇总。",
    "当前月份成本": "当前月份直接归集成本汇总。",
    "固定成本金额": "固定成本来自统一成本科目分类。",
    "固定成本": "固定成本来自统一成本科目分类。",
    "变动成本金额": "变动成本来自统一成本科目分类。",
    "变动成本": "变动成本来自统一成本科目分类。",
    "管理费用金额": "管理费用含销售费用等管理类科目。",
    "管理费用": "管理费用含销售费用等管理类科目。",
    "NC明细笔数": "当前口径可追溯明细笔数。",
    "NC台账笔数": "当前筛选下可追溯明细笔数。",
    "全年预算消耗率": "累计实际 / 全年预算。",
    "序时预算执行率": "累计实际 / 序时预算。",
  };
  return tips[label] || "点击查看筛选或明细。";
}

function renderHome() {
  const summary = getOverallSummary();
  const trend = getTrendData(RECORDS);
  const activeMonth = "all";
  const activeCostType = "all";
  const ranking = getV116HomeProjectRanking({ month: activeMonth, costType: activeCostType });
  if (!state.v126HomeOverviewDefaultApplied) {
    state.homeOverviewExpanded = true;
    state.v126HomeOverviewDefaultApplied = true;
  }
  const rankingScopeNote = activeMonth === "all" && activeCostType === "all"
    ? "按1-5月累计成本排序"
    : `按${v116MonthFilterLabel(activeMonth)} / ${v116CostTypeLabel(activeCostType)}排序`;
  const explanation = buildBudgetExecutionExplanation({ month: 5 });
  return `
    <div class="home-executive-page">
      ${renderHomeExecutiveSummary(summary, explanation, ranking)}
      ${renderHomeRegionalSupport(summary, ranking)}
      ${renderHomeExecutiveKpis(summary, explanation)}
      ${renderHomeLeaderFocusList(explanation)}
      ${renderHomeSignalStrip(explanation)}
      ${renderV117SectionDivider("支撑分析")}
      <div class="grid-2 home-analysis-grid home-support-grid">
        <section class="section home-support-section">
          <div class="section-header">
            <h2 class="section-title">全项目成本趋势</h2>
            <span class="section-note">点击月份查看全项目月度成本分析。</span>
          </div>
          ${renderTrendChart(trend, { interactive: true, context: "home", selectedMonth: activeMonth })}
        </section>
        <section class="section home-ranking-section home-support-section">
          <div class="section-header">
            <h2 class="section-title">项目成本排名</h2>
            <span class="section-note">${rankingScopeNote}</span>
          </div>
          ${renderRanking(ranking, "total", ranking.length, { scrollable: true })}
        </section>
      </div>

      ${renderStructureSummary()}

      ${renderBenchmarkEntryCards()}

      ${renderRecentActivities()}

      ${renderV117SectionDivider("数据明细入口")}
      <section class="section home-support-section">
        <div class="section-header">
          <div>
            <h2 class="section-title">全项目入口</h2>
            <div class="section-note">点击项目卡片查看项目画像，继续查看活动和NC明细。</div>
          </div>
          <button class="btn" data-action="toggle-home-projects">${state.homeProjectsExpanded ? "收起项目" : "展开全部项目"}</button>
        </div>
        <div class="project-grid home-project-entry-grid">
          ${(state.homeProjectsExpanded ? PROJECTS : PROJECTS.slice(0, 4)).map((project) => renderProjectCard(project)).join("")}
        </div>
      </section>

      <section class="section home-support-section">
        <div class="section-header">
          <div>
            <h2 class="section-title">项目成本概览表</h2>
            <span class="section-note">辅助明细默认展开，可点击收起。</span>
          </div>
          <button class="btn" data-action="toggle-home-overview">${state.homeOverviewExpanded ? "收起概览表" : "展开概览表"}</button>
        </div>
        ${state.homeOverviewExpanded ? renderProjectOverviewTable() : `<div class="folded-table-note">展开后查看各项目月度金额和成本结构。</div>`}
      </section>
    </div>
  `;
}

function renderV117SectionDivider(label) {
  return `
    <div class="v117-section-divider" aria-label="${escapeHtml(label)}">
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function renderHomeExecutiveSummary(summary, explanation, ranking) {
  const execution = explanation.companyBudgetSummary;
  const focusNames = renderProjectTokenList(explanation.topExplanationProjects.slice(0, 5).map((row) => row.project.shortName));
  const topProject = ranking[0];
  const topProjectText = topProject ? `${renderProjectToken(topProject.project.shortName)} ${moneyWan(topProject.total)}` : "-";
  const topRegion = getMapDistributionStats(ranking, summary).topRegion;
  const keyNotes = explanation.executiveNotes.slice(0, 3);
  return `
    <section class="home-executive-hero">
      <div class="home-executive-copy">
        <div class="eyebrow">首页汇报版 · 2026年1月-5月 · 成本侧经营摘要</div>
        <h1 class="home-title">智慧运营成本管理看板</h1>
        <p class="home-executive-lead">当前公司1-5月累计成本 ${moneyWan(summary.total)}，5月成本 ${moneyWan(summary.may)}；全年预算完成率 ${percent(execution.annualBudgetRatio)}，序时执行率 ${percent(execution.sequenceBudgetRatio)}。</p>
        <div class="home-executive-note-list">
          ${keyNotes.map((line) => `<span>${line}</span>`).join("")}
        </div>
        <div class="home-executive-actions">
          <button class="btn" data-action="profile-open" data-project="${state.projectId}">查看项目画像</button>
          <button class="btn" data-action="subject-compare-open">查看科目横向对比</button>
          <button class="btn ghost" data-action="nav" data-view="details">查看NC明细</button>
        </div>
      </div>
      <div class="home-executive-brief">
        <div class="home-brief-row">
          <span>领导关注清单</span>
          <strong>${focusNames || "暂无重点关注项目"}</strong>
        </div>
        <div class="home-brief-row">
          <span>成本最高项目</span>
          <strong>${topProjectText}</strong>
        </div>
        <div class="home-brief-row">
          <span>区域支撑观察</span>
          <strong>${topRegion.name} ${moneyWan(topRegion.amount)} / ${percent(topRegion.share)}</strong>
        </div>
        <div class="home-brief-row">
          <span>台账穿透</span>
          <strong>${summary.count}笔 NC 明细</strong>
        </div>
      </div>
    </section>
  `;
}

function renderHomeExecutiveKpis(summary, explanation) {
  const execution = explanation.companyBudgetSummary;
  return `
    <section class="home-kpi-section">
      <div class="kpi-grid executive-kpis home-executive-kpis">
        ${renderKpi("1-5月累计成本", moneyWan(summary.total), "点击查看全量明细", `data-action="v116-drawer-open" data-title="全项目累计成本" data-month="all" data-amount="${summary.total}"`)}
        ${renderKpi("5月成本", moneyWan(summary.may), "点击筛选5月", `data-action="v116-drawer-open" data-title="全项目5月成本" data-month="5" data-amount="${summary.may}"`)}
        ${renderKpi("固定成本金额", moneyWan(summary.byMain.固定成本), "点击筛选固定成本", `data-action="v116-drawer-open" data-title="固定成本明细" data-main="固定成本" data-month="all" data-amount="${summary.byMain.固定成本}"`)}
        ${renderKpi("变动成本金额", moneyWan(summary.byMain.变动成本), "点击筛选变动成本", `data-action="v116-drawer-open" data-title="变动成本明细" data-main="变动成本" data-month="all" data-amount="${summary.byMain.变动成本}"`)}
        ${renderKpi("管理费用金额", moneyWan(summary.byMain.管理费用), "点击筛选管理费用", `data-action="v116-drawer-open" data-title="管理费用明细" data-main="管理费用" data-month="all" data-amount="${summary.byMain.管理费用}"`)}
        ${renderKpi("序时预算执行率", percent(execution.sequenceBudgetRatio), `全年预算${moneyWan(execution.annualBudget)}`, `data-action="v116-drawer-open" data-title="预算执行口径下的成本明细" data-month="all" data-amount="${summary.total}"`)}
      </div>
    </section>
  `;
}

function renderHomeLeaderFocusList(explanation) {
  const month = 5;
  const rows = explanation.topExplanationProjects.slice(0, 5);
  return `
    <section class="section home-leader-focus-panel">
      <div class="section-header">
        <div>
          <h2 class="section-title">领导关注清单 TOP5</h2>
        </div>
        <span class="budget-status-pill ${budgetStatus(explanation.companyBudgetSummary.sequenceBudgetRatio).className}">${budgetStatusText(explanation.companyBudgetSummary.sequenceBudgetRatio)}</span>
      </div>
      <div class="home-focus-list">
        ${rows.length ? rows.map((row, index) => {
          const projectSummary = getProjectSummary(row.project.id);
          const ratios = getMainRatios(projectSummary.byMain);
          return `
            <article class="home-focus-item">
              <div class="home-focus-rank">${String(index + 1).padStart(2, "0")}</div>
              <div class="home-focus-main">
                <div class="home-focus-title">
                  <strong>${renderProjectToken(row.project.shortName)}</strong>
                  <span>${PROJECT_BUDGETS[row.project.id] ? PROJECT_BUDGETS[row.project.id].budgetName : row.project.fullName}</span>
                </div>
                <div class="home-focus-tags">
                  <span>${row.managementSignal}</span>
                </div>
              </div>
              <div class="home-focus-cost">
                <em>累计成本</em>
                <strong>${moneyWan(projectSummary.total)}</strong>
                <div class="home-focus-structure">
                  ${renderMainStructureTrack(ratios)}
                  <small>固定 ${percent(ratios.固定成本)} · 变动 ${percent(ratios.变动成本)} · 管理 ${percent(ratios.管理费用)}</small>
                </div>
              </div>
              <div class="home-focus-budget ${row.deviationAmount >= 0 ? "is-positive" : "is-negative"}">
                <em>预算执行</em>
                <strong>${percent(row.sequenceBudgetRatio)}</strong>
                <small>较序时预算 ${signedMoneyWan(row.deviationAmount)}</small>
              </div>
              <button class="plain-link detail-link" data-action="profile-open" data-project="${row.project.id}">查看项目画像 ›</button>
            </article>
          `;
        }).join("") : renderV121EmptyState("当前无新增重点解释事项，保持按月跟踪。", "平稳")}
      </div>
    </section>
  `;
}

function renderHomeRegionalSupport(summary, ranking) {
  const mapItems = getMapProjectItems(ranking);
  const maxCost = Math.max(...ranking.map((item) => item.total), 1);
  const distribution = getMapDistributionStats(ranking, summary);
  const topRegion = distribution.topRegion || { name: "-", amount: 0, share: 0 };
  return `
    <section class="section home-region-support home-region-panorama">
      <div class="section-header">
        <div>
          <h2 class="section-title">区域经营全景</h2>
          <div class="section-note">从项目点位、区域成本梯度和集中区域同步看经营支撑面。</div>
        </div>
        <span class="map-range-pill">2026年1月-5月</span>
      </div>
      <div class="home-region-thesis">
        <strong>${topRegion.name}是当前成本支撑主区域</strong>
        <span>${moneyWan(topRegion.amount)}，占授权范围${percent(topRegion.share)}；地图点位越大、颜色越深，累计成本越高。</span>
      </div>
      <div class="home-region-layout">
        <div class="home-region-map">
          <div class="geo-map-canvas">
            <div class="home-map-legend" aria-label="地图图示">
              <strong>图示说明</strong>
              <span><i class="map-dot-s"></i><b>低</b><small>累计成本较低</small></span>
              <span><i class="map-dot-m"></i><b>中</b><small>累计成本中等</small></span>
              <span><i class="map-dot-l"></i><b>高</b><small>累计成本较高</small></span>
              <em>点位越大、颜色越深，累计成本越高。</em>
            </div>
            <img class="china-map-bg" src="assets/china-map.svg" alt="中国地图示意图（非测绘用途）">
            <div class="map-point-layer">
              ${mapItems.map((item) => renderMapPoint(item, maxCost)).join("")}
            </div>
          </div>
        </div>
        <div class="home-region-stats">
          <div class="home-region-stat">
            <span>区域最高</span>
            <strong>${topRegion.name}</strong>
            <em>${moneyWan(topRegion.amount)} / ${percent(topRegion.share)}</em>
          </div>
          <div class="home-region-stat">
            <span>TOP5合计</span>
            <strong>${distribution.top5Share}</strong>
            <em>关注项目成本集中度</em>
          </div>
          <div class="home-region-stat">
            <span>${distribution.focusRegionLabel}</span>
            <strong>${distribution.focusRegionShare}</strong>
            <em>${distribution.focusRegionNote}</em>
          </div>
          <div class="home-region-share-list">
            ${distribution.regions.map((region) => `
              <div class="region-share-row">
                <span>${region.name}<em>${region.count}个项目</em></span>
                <strong>${percent(region.share)}</strong>
                <i style="--share:${Math.max(4, region.share * 100)}%"></i>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderHomeSignalStrip(explanation) {
  const cards = explanation.signalCards.map((card) => {
    const projectText = card.projectNames.slice(0, 2).join("、");
    const tone = card.count ? card.className : "signal-calm";
    return `
      <div class="home-signal-card ${tone}">
        <span>${card.cardTitle}</span>
        <strong>${card.count || 0}项</strong>
        <em>${card.count ? `${card.subLabel}：${projectText}${card.count > 2 ? "等" : ""}` : "本期平稳，无需专项解释"}</em>
      </div>
    `;
  }).join("");
  return `
    <section class="section home-signal-strip-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">管理信号压缩条</h2>
          <div class="section-note">保留经营关注入口，不展开成长表格，减少首页阅读负担。</div>
        </div>
      </div>
      <div class="home-signal-strip">
        ${cards}
      </div>
    </section>
  `;
}

function renderHomeManagementConclusion(explanation) {
  const lines = explanation.executiveNotes;
  return `
    <div class="management-conclusion-card">
      <strong>关注要点</strong>
      <ol class="management-conclusion-list">
        ${lines.map((line) => `<li>${line}</li>`).join("")}
      </ol>
    </div>
  `;
}

function renderBudgetAttentionPanel(month = 5, explanation = buildBudgetExecutionExplanation({ month })) {
  const focusRows = explanation.topExplanationProjects;
  const cards = explanation.signalCards.map((card) => {
    const projectText = card.projectNames.slice(0, 2).join("、");
    return `
      <div class="attention-summary-card v12-management-signal-card ${card.count ? "" : "v12-state-calm"} ${card.className}">
        <span>${card.cardTitle}</span>
        <strong>${card.count || 0}项</strong>
        <em>${card.count ? `${card.subLabel}：${projectText}${card.count > 2 ? "等" : ""}` : "本期平稳，无需专项解释"}</em>
      </div>
    `;
  }).join("");
  return `
    <div class="attention-panel">
      <div class="section-header">
        <div>
          <h3 class="section-title">管理信号与重点解释项目</h3>
          <div class="section-note">四类信号卡、关注要点和 TOP5 均来自同一份预算执行解释数据。</div>
        </div>
      </div>
      <div class="attention-summary-grid">
        ${cards}
      </div>
      <div class="attention-list-head">
        <strong>重点解释项目 TOP5</strong>
        <span>按成本效率、入账完整性、预算偏高、预算偏低、活动带动和金额兜底的固定优先级生成。</span>
      </div>
      <div class="table-wrap attention-table-wrap">
        <table class="matrix-table attention-table">
          <thead>
            <tr>
              <th>项目</th>
              <th class="num">预算执行率</th>
              <th>管理信号</th>
              <th>主要解释</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${focusRows.length ? focusRows.map((row) => `
              <tr>
                <td><strong>${row.project.shortName}</strong><div class="section-note">${PROJECT_BUDGETS[row.project.id] ? PROJECT_BUDGETS[row.project.id].budgetName : row.project.fullName}</div></td>
                <td class="num attention-rate-cell"><strong>${percent(row.sequenceBudgetRatio)}</strong><span class="${row.deviationAmount >= 0 ? "is-positive" : "is-negative"}">较序时预算 ${signedMoneyWan(row.deviationAmount)}</span></td>
                <td><span class="attention-type-pill ${row.managementSignalClass}">${row.managementSignal}</span><div class="section-note">${row.selectionPriorityLabel}</div></td>
                <td>${row.mainExplanation}</td>
                <td><button class="plain-link detail-link" data-action="project-month" data-project="${row.project.id}" data-month="${month}">查看项目画像</button></td>
              </tr>
              `).join("") : renderV121EmptyTableCell(5, "本期无新增需重点解释事项，保持按月跟踪。")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAttentionTypePill(attention) {
  return `<span class="attention-type-pill ${attention.className}">${attention.typeDisplay}</span>`;
}

function renderV121EmptyState(message = "本期无此类事项", status = "平稳") {
  return `<div class="empty-state v12-empty-state v12-state-calm"><strong>${status}</strong><span>${message}</span></div>`;
}

function renderV121EmptyTableCell(colspan, message = "本期无此类事项", status = "平稳") {
  return `<tr><td colspan="${colspan}" class="empty-state v12-empty-state v12-state-calm"><strong>${status}</strong><span>${message}</span></td></tr>`;
}

function v121RankBadgeClass(index) {
  return `v12-rank-badge ${index < 3 ? "v12-rank-badge--top" : "v12-rank-badge--normal"}`;
}

function renderBudgetMetric(label, value, foot = "") {
  return `
    <div class="budget-metric">
      <span>${label}</span>
      <strong>${value}</strong>
      ${foot ? `<em>${foot}</em>` : ""}
    </div>
  `;
}

function renderKpi(label, value, foot, action = "") {
  const tag = action ? "button" : "div";
  const title = v116KpiTooltip(label);
  return `
    <${tag} class="kpi-card v12-kpi-card ${action ? "interactive-card clickable" : ""}" ${action} title="${escapeHtml(title)}">
      <span class="kpi-head v12-kpi-head">
        <span class="kpi-icon v12-kpi-icon">${iconSvg(kpiIconType(label))}</span>
        <span class="kpi-label v12-kpi-label">${label}</span>
      </span>
      <span class="kpi-value v12-kpi-main">${renderV117KpiValue(value)}</span>
      <span class="kpi-foot v12-kpi-subline">${foot}</span>
    </${tag}>
  `;
}

function renderV117KpiValue(value) {
  const text = String(value ?? "");
  const unit = ["万元", "笔", "项", "场", "个", "%"].find((candidate) => text.endsWith(candidate) && text.length > candidate.length);
  if (!unit) {
    return `<span class="kpi-value-wrap"><span class="kpi-number v12-kpi-number">${escapeHtml(text)}</span></span>`;
  }
  return `
    <span class="kpi-value-wrap">
      <span class="kpi-number v12-kpi-number">${escapeHtml(text.slice(0, -unit.length))}</span>
      <span class="kpi-unit v12-kpi-unit">${escapeHtml(unit)}</span>
    </span>
  `;
}

function getMapDistributionStats(ranking, summary) {
  const amountByProject = Object.fromEntries(ranking.map((item) => [item.project.id, item.total]));
  const total = Math.max(summary.total, 1);
  const sumByIds = (ids) => ids.reduce((sum, projectId) => sum + (amountByProject[projectId] || 0), 0);
  const regions = [
    { name: "华北", ids: ["sjz", "langfang"] },
    { name: "华中", ids: ["zmd", "jingzhou", "ezhou", "zhashan", "daye"] },
    { name: "华南/西南", ids: ["lzhz", "lzwh", "lzsd", "lzlib", "liuti"] },
    { name: "华东", ids: ["weifang", "yunqi"] },
  ].map((region) => {
    const amount = sumByIds(region.ids);
    const visibleCount = region.ids.filter((projectId) => amountByProject[projectId]).length;
    return { ...region, amount, count: visibleCount, share: amount / total };
  }).sort((a, b) => b.amount - a.amount);
  const top5Amount = ranking.slice(0, 5).reduce((sum, item) => sum + item.total, 0);
  const topRegion = regions[0] || { name: "-", amount: 0, share: 0, count: 0 };
  const singleProject = ranking.length === 1 ? ranking[0].project : null;
  return {
    regions,
    topRegion,
    top5Share: percent(top5Amount / total),
    focusRegionLabel: singleProject ? `${singleProject.shortName}所在区域` : `${topRegion.name}区域`,
    focusRegionShare: percent(topRegion.share),
    focusRegionNote: singleProject ? "当前授权项目成本占比" : "当前成本支撑区域合计",
  };
}

function getMapProjectItems(ranking) {
  const summaryMap = Object.fromEntries(ranking.map((item) => [item.project.id, item]));
  const projectItem = (projectId) => ({
    project: getProject(projectId),
    summary: summaryMap[projectId] || getProjectSummary(projectId),
  });
  return MAP_POINTS.map((point) => ({
    ...point,
    projects: point.type === "single"
      ? [projectItem(point.projectId)]
      : point.projectIds.map(projectItem),
  }));
}

function renderMapPoint(item, maxCost) {
  const total = item.projects.reduce((sum, projectItem) => sum + projectItem.summary.total, 0);
  const pointSizes = { small: 22, medium: 31, large: 42 };
  const size = pointSizes[item.size] || 22;
  const level = total / maxCost;
  const className = level > 0.78 ? "is-high" : level > 0.45 ? "is-mid" : "is-low";
  const label = item.label || item.projects[0].project.shortName;
  const labelOffsetX = Number(item.labelOffsetX) || 0;
  const labelOffsetY = Number(item.labelOffsetY) || 0;
  const leaderLengthRaw = Math.sqrt((labelOffsetX ** 2) + (labelOffsetY ** 2)) - size * 0.55;
  const leaderLength = item.useLeaderLine ? Math.min(68, Math.max(0, leaderLengthRaw)) : 0;
  const leaderAngle = Math.atan2(labelOffsetY || 0.01, labelOffsetX || 0.01) * 180 / Math.PI;
  const style = `left:${item.x}%;top:${item.y}%;--point-size:${size}px;--label-x:${labelOffsetX}px;--label-y:${labelOffsetY}px;--leader-length:${leaderLength}px;--leader-angle:${leaderAngle}deg`;
  const labelClass = item.showLabel || item.type === "cluster" ? "map-point-label" : "map-point-label is-subtle";
  const tooltipClass = item.tooltip || "tooltip-above";
  const leader = leaderLength > 12 ? `<span class="map-leader-line" aria-hidden="true"></span>` : "";
  if (item.type === "cluster") {
    const isOpen = state.mapOpenCluster === item.id;
    return `
      <div class="map-point-wrap map-group map-cluster ${className} ${tooltipClass} ${isOpen ? "is-open" : ""}" style="${style}">
        <button type="button" class="map-point-button" data-action="map-cluster-toggle" data-cluster="${item.id}" aria-label="${label}"></button>
        ${leader}
        <div class="map-tooltip group-tooltip">
          <strong>${label}</strong>
          <span>合计：${moneyWan(total)}</span>
          <div class="map-group-list">
            ${item.projects.map((projectItem) => renderMapProjectLink(projectItem)).join("")}
          </div>
        </div>
        <button type="button" class="${labelClass}" data-action="map-cluster-toggle" data-cluster="${item.id}">${label}</button>
      </div>
    `;
  }
  const projectItem = item.projects[0];
  const topSubject = getProjectCumulativeTopSubject(projectItem.project.id);
  return `
    <button type="button" class="map-point-wrap map-point ${className} ${tooltipClass}" style="${style}" data-action="profile-open" data-project="${projectItem.project.id}" aria-label="${projectItem.project.shortName}">
      <span class="map-point-button"></span>
      ${leader}
      <span class="map-tooltip">
        <strong>${projectItem.project.shortName}</strong>
        <em>1-5月累计：${moneyWan(projectItem.summary.total)}</em>
        <em>5月成本：${moneyWan(projectItem.summary.may)}</em>
        <em>最高科目：${topSubject.name}</em>
        <em>点击查看项目画像</em>
      </span>
      <span class="${labelClass}">${projectItem.project.shortName}</span>
    </button>
  `;
}

function renderMapProjectLink(projectItem) {
  return `
    <button type="button" data-action="profile-open" data-project="${projectItem.project.id}">
      <span>${projectItem.project.shortName}</span>
      <em>累计 ${moneyWan(projectItem.summary.total)} · 5月 ${moneyWan(projectItem.summary.may)}</em>
      <small>查看项目画像</small>
    </button>
  `;
}

function renderBreadcrumb(items) {
  return `
    <nav class="breadcrumb" aria-label="当前位置">
      ${items.map((item, index) => `
        ${index ? `<span class="breadcrumb-separator">&gt;</span>` : ""}
        ${item.current || item.disabled
          ? `<span class="breadcrumb-current">${escapeHtml(item.label)}</span>`
          : `<button class="breadcrumb-link" ${dataAttrs(item.action, item.data)}>${escapeHtml(item.label)}</button>`}
      `).join("")}
    </nav>
  `;
}

function dataAttrs(action, data = {}) {
  return `data-action="${escapeHtml(action)}" ${Object.entries(data).map(([key, value]) => `data-${key}="${escapeHtml(value)}"`).join(" ")}`;
}

function kpiIconType(label) {
  if (label.includes("累计")) return "ledger";
  if (label.includes("5月") || label.includes("当前月份")) return "calendar";
  if (label.includes("覆盖") || label.includes("项目数")) return "building";
  if (label.includes("NC")) return "document";
  if (label.includes("固定")) return "lock";
  if (label.includes("变动")) return "trend";
  if (label.includes("管理")) return "org";
  return "ledger";
}

function iconSvg(type) {
  const common = `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  const icons = {
    ledger: `<svg ${common}><path d="M6 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1Z"/><path d="M8 8h7"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>`,
    calendar: `<svg ${common}><path d="M7 3v4"/><path d="M17 3v4"/><path d="M4 8h16"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 12h3"/><path d="M13 12h3"/><path d="M8 16h3"/></svg>`,
    building: `<svg ${common}><path d="M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"/><path d="M3 21h18"/><path d="M9 7h3"/><path d="M9 11h3"/><path d="M9 15h3"/><path d="M16 9h3v12"/></svg>`,
    document: `<svg ${common}><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/><path d="M8 12h8"/><path d="M8 16h8"/></svg>`,
    lock: `<svg ${common}><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2"/></svg>`,
    trend: `<svg ${common}><path d="M4 18h16"/><path d="m5 15 5-5 4 3 5-7"/><path d="M16 6h3v3"/></svg>`,
    org: `<svg ${common}><rect x="8" y="3" width="8" height="5" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/><rect x="14" y="16" width="7" height="5" rx="1"/><path d="M12 8v4"/><path d="M6.5 16v-4h11v4"/></svg>`,
    arrow: `<svg ${common}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>`,
    shield: `<svg ${common}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="M9 12l2 2 4-4"/></svg>`,
    broom: `<svg ${common}><path d="M14 4l6 6"/><path d="M13 5 4 14"/><path d="M3 15l6 6 3-8-1-1-8 3Z"/><path d="M6 17l3 3"/></svg>`,
    wrench: `<svg ${common}><path d="M14.5 6.5a4 4 0 0 0 5 5L11 20l-5-5 8.5-8.5Z"/><path d="M7 17l-3 3"/></svg>`,
    build: `<svg ${common}><path d="M4 20h16"/><path d="M6 20V9l6-4 6 4v11"/><path d="M9 20v-6h6v6"/><path d="M9 10h6"/></svg>`,
    box: `<svg ${common}><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>`,
    utensils: `<svg ${common}><path d="M6 3v8"/><path d="M4 3v8"/><path d="M8 3v8"/><path d="M4 11h4l-1 10H5L4 11Z"/><path d="M16 3c2 2 3 4 3 7 0 2-1 4-3 4v7h-2V3h2Z"/></svg>`,
    people: `<svg ${common}><path d="M16 11a3 3 0 1 0-3-3"/><path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M2 20a6 6 0 0 1 12 0"/><path d="M14 14a5 5 0 0 1 8 4"/></svg>`,
    megaphone: `<svg ${common}><path d="M4 13h3l9 5V6l-9 5H4v2Z"/><path d="M7 13l2 7"/><path d="M19 9a4 4 0 0 1 0 6"/></svg>`,
  };
  return icons[type] || icons.ledger;
}

function renderProjectCard(project) {
  const summary = getProjectSummary(project.id);
  const ratios = getMainRatios(summary.byMain);
  const trend = getTrendData(filterRecords({ projectId: project.id }));
  return `
    <article class="project-card">
      <div class="project-card-head">
        <div>
          <div class="project-name">${project.shortName}</div>
          <div class="project-full">${project.fullName}</div>
        </div>
      </div>
      <div class="project-card-metrics">
        <span><span class="metric-label">1-5月累计</span><span class="metric-value">${moneyWan(summary.total)}</span></span>
        <span><span class="metric-label">5月成本</span><span class="metric-value">${moneyWan(summary.may)}</span></span>
      </div>
      <div class="project-visuals">
        <div>
          <span class="metric-label">成本结构</span>
          <div class="ratio-track compact-track">
            <span class="ratio-fixed" style="width:${ratios.固定成本 * 100}%"></span>
            <span class="ratio-variable" style="width:${ratios.变动成本 * 100}%"></span>
            <span class="ratio-manage" style="width:${ratios.管理费用 * 100}%"></span>
          </div>
        </div>
        <div>
          <span class="metric-label">月度趋势</span>
          ${renderMiniTrend(trend)}
        </div>
      </div>
      <div class="project-card-actions">
        <button class="btn primary" data-action="profile-open" data-project="${project.id}">查看项目画像</button>
      </div>
    </article>
  `;
}

function renderMiniTrend(trend) {
  const values = trend.map((item) => item.total);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, max);
  const range = Math.max(1, max - min);
  const points = trend.map((item, index) => ({
    x: trend.length <= 1 ? 50 : (index / (trend.length - 1)) * 100,
    y: 82 - ((item.total - min) / range) * 58,
  }));
  const path = smoothPath(points);
  return `
    <span class="mini-trend mini-line-trend" aria-label="小型月度趋势">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path class="mini-trend-line" d="${path}"></path>
      </svg>
    </span>
  `;
}

function smoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${formatCoord(points[0].x)} ${formatCoord(points[0].y)}`;
  return points.slice(0, -1).reduce((path, point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const current = point;
    const next = points[index + 1];
    const following = points[Math.min(points.length - 1, index + 2)];
    const c1x = current.x + (next.x - previous.x) / 6;
    const c1y = current.y + (next.y - previous.y) / 6;
    const c2x = next.x - (following.x - current.x) / 6;
    const c2y = next.y - (following.y - current.y) / 6;
    return `${path} C ${formatCoord(c1x)} ${formatCoord(c1y)}, ${formatCoord(c2x)} ${formatCoord(c2y)}, ${formatCoord(next.x)} ${formatCoord(next.y)}`;
  }, `M ${formatCoord(points[0].x)} ${formatCoord(points[0].y)}`);
}

function formatCoord(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}

function renderProjectOverviewTable() {
  const rows = PROJECTS.map((project) => {
    const summary = getProjectSummary(project.id);
    return `
      <tr>
        <td><button class="plain-link" data-action="profile-open" data-project="${project.id}">${project.shortName}</button><div class="section-note">${project.fullName}</div></td>
        ${MONTHS.map((month) => {
          const amount = sumRecords(filterRecords({ projectId: project.id, month }));
          return `<td class="num"><button class="link-cell" data-action="v116-drawer-open" data-project="${project.id}" data-month="${month}" data-title="${project.shortName}${month}月NC明细" data-amount="${amount}">${moneyWan(amount)}</button></td>`;
        }).join("")}
        <td class="num"><button class="link-cell" data-action="v116-drawer-open" data-project="${project.id}" data-month="all" data-title="${project.shortName}累计NC明细" data-amount="${summary.total}">${moneyWan(summary.total)}</button></td>
        <td class="num">${moneyWan(summary.byMain.固定成本)}</td>
        <td class="num">${moneyWan(summary.byMain.变动成本)}</td>
        <td class="num">${moneyWan(summary.byMain.管理费用)}</td>
        <td>
          <button class="plain-link detail-link" data-action="profile-open" data-project="${project.id}">查看项目画像</button>
        </td>
      </tr>
    `;
  }).join("");
  return `
    <div class="table-wrap">
      <table class="matrix-table">
        <thead>
          <tr>
            <th>项目</th>
            <th class="num">1月</th>
            <th class="num">2月</th>
            <th class="num">3月</th>
            <th class="num">4月</th>
            <th class="num">5月</th>
            <th class="num">累计成本</th>
            <th class="num">固定成本</th>
            <th class="num">变动成本</th>
            <th class="num">管理费用</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderStructureSummary() {
  const summary = getOverallSummary();
  const ratios = getMainRatios(summary.byMain);
  const activeCostType = v116ActiveCostType();
  return `
    <section class="structure-summary">
      <div class="summary-title">${iconSvg("document")}<span>结构摘要</span></div>
      <div class="summary-ratio-block">
        <div class="summary-stack">
          <button class="ratio-fixed ${activeCostType === "固定成本" ? "is-active" : ""}" style="width:${ratios.固定成本 * 100}%" data-action="v116-cost-filter" data-main="固定成本" title="固定成本 ${percent(ratios.固定成本)}"></button>
          <button class="ratio-variable ${activeCostType === "变动成本" ? "is-active" : ""}" style="width:${ratios.变动成本 * 100}%" data-action="v116-cost-filter" data-main="变动成本" title="变动成本 ${percent(ratios.变动成本)}"></button>
          <button class="ratio-manage ${activeCostType === "管理费用" ? "is-active" : ""}" style="width:${ratios.管理费用 * 100}%" data-action="v116-cost-filter" data-main="管理费用" title="管理费用 ${percent(ratios.管理费用)}"></button>
        </div>
        <div class="summary-ratios">
          <button class="${activeCostType === "固定成本" ? "is-active" : ""}" data-action="v116-cost-filter" data-main="固定成本">固定成本 ${percent(ratios.固定成本)}</button>
          <button class="${activeCostType === "变动成本" ? "is-active" : ""}" data-action="v116-cost-filter" data-main="变动成本">变动成本 ${percent(ratios.变动成本)}</button>
          <button class="${activeCostType === "管理费用" ? "is-active" : ""}" data-action="v116-cost-filter" data-main="管理费用">管理费用 ${percent(ratios.管理费用)}</button>
        </div>
        <div class="summary-desc">2026年1-5月成本按固定成本、变动成本、管理费用三类展示。</div>
      </div>
    </section>
  `;
}

function renderBenchmarkEntryCards() {
  const items = getHomeKeyCostItemSummaries();
  return `
    <section class="section benchmark-entry-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">重点成本项对标</h2>
          <div class="section-note">按1-5月累计金额降序展示前六项，查看各项目间的单价和工程量差异。</div>
        </div>
        <button class="btn" data-action="open-benchmark" data-item="${items[0]?.name || HOME_KEY_COST_CANDIDATES[0]}">查看全部对标</button>
      </div>
      <div class="benchmark-entry-grid">
        ${items.map((item) => {
          return `
            <button class="benchmark-entry-card" data-action="open-benchmark" data-item="${item.name}">
              <span class="benchmark-entry-icon">${iconSvg(item.icon)}</span>
              <span class="benchmark-entry-name">${item.name}</span>
              <strong>${moneyWan(item.totalAmount)}</strong>
              <span>覆盖项目：${item.projectCount}个</span>
              <span>价差：${formatSpread(item.priceSpread)} · ${item.statusLabel}</span>
              <i class="key-cost-status ${item.statusClass}">${item.statusLabel}</i>
              <em>查看对标</em>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function getHomeKeyCostCandidateSummaries() {
  const normalizedItems = (UNIT_COST_ITEMS || [])
    .map((item) => item.normalizedName ? item : normalizeUnitBenchmarkItem(item))
    .filter((item) => item.canBenchmark && HOME_KEY_COST_CANDIDATES.includes(item.normalizedName));
  return HOME_KEY_COST_CANDIDATES.map((name, index) => {
    const records = normalizedItems.filter((item) => item.normalizedName === name);
    const priceRows = aggregateUnitCostByProject(records).filter((row) => row.canBenchmark && row.averageUnitPrice > 0);
    const unitGroups = groupUnitBenchmarkRows(priceRows);
    const primaryRows = Object.values(unitGroups).sort((a, b) => b.length - a.length)[0] || [];
    const prices = primaryRows.map((row) => row.averageUnitPrice).filter((value) => value > 0);
    const priceSpread = prices.length ? Math.max(...prices) / Math.max(1, Math.min(...prices)) : 0;
    const status = getCostSpreadStatus(priceSpread);
    return {
      name,
      candidateIndex: index,
      icon: HOME_KEY_COST_ITEM_ICONS[name] || "ledger",
      records,
      totalAmount: sumRecords(records),
      projectCount: new Set(records.map((record) => record.projectId)).size,
      priceSpread,
      statusLabel: status.label,
      statusClass: status.className,
      hasBenchmarkAction: true,
    };
  })
    .filter((item) => item.records.length)
    .sort((a, b) => (b.totalAmount - a.totalAmount) || (a.candidateIndex - b.candidateIndex));
}

function getHomeKeyCostItemSummaries() {
  return getHomeKeyCostCandidateSummaries().slice(0, HOME_KEY_COST_DISPLAY_LIMIT);
}

function getCostSpreadStatus(spread) {
  if (!Number.isFinite(spread) || spread <= 0) return { label: "样本不足", className: "is-sample" };
  if (spread < 1.5) return { label: "正常波动", className: "is-normal" };
  if (spread <= 2.5) return { label: "建议关注", className: "is-watch" };
  return { label: "重点复核", className: "is-review" };
}

function renderRecentActivities() {
  const featured = getFeaturedActivities().slice(0, 4);
  return `
    <section class="section activity-home-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">近期活动成本概览</h2>
          <div class="section-note">展示近期重点活动成本及其占当月项目成本比例。</div>
        </div>
        <button class="btn" data-action="nav" data-view="activity">查看全部活动</button>
      </div>
      <div class="activity-home-grid">
        ${featured.map((activity) => renderActivitySummaryCard(activity, { compact: true })).join("")}
      </div>
    </section>
  `;
}

function getFeaturedActivities() {
  const preferred = [
    ["sjz", 5],
    ["yunqi", 2],
    ["liuti", 4],
    ["lzhz", 1],
    ["zmd", 1],
  ];
  const activities = preferred
    .map(([projectId, month]) => getActivity(projectId, month))
    .filter(Boolean);
  return activities.length ? activities : ACTIVITIES.slice(-5);
}

function renderActivitySummaryCard(activity, options = {}) {
  const relation = activityRelationPercents(activity);
  const topTags = activity.topItems.slice(0, 3).map((item) => `<span>${item.name}</span>`).join("");
  if (options.compact) {
    return `
      <article class="activity-card compact">
        <div class="activity-card-head">
          <span class="activity-icon">${iconSvg(activityIconType(activity.activityType))}</span>
          <div>
            <h3>${activity.name}</h3>
            <p>${activity.projectName} · ${activity.monthLabel} · ${activity.activityType}</p>
          </div>
        </div>
        <div class="activity-card-primary">
          <span>活动总成本</span>
          <strong>${moneyWan(activity.totalCost)}</strong>
          <em>占当月项目成本 ${percent(activity.costRatio)}</em>
        </div>
        <div class="activity-tag-list">${topTags}</div>
        <div class="activity-relation">
          <div class="relation-track" title="活动成本 + 非活动/日常运营成本 = 项目当月总成本">
            <span class="relation-activity" style="width:${relation.activity}%"></span>
            <span class="relation-daily" style="width:${relation.daily}%"></span>
          </div>
        </div>
        <div class="activity-card-foot muted-foot">
          <span>主要成本项：${activity.topItems.slice(0, 2).map((item) => item.name).join("、")}</span>
        </div>
        <div class="activity-card-actions">
          <button class="btn primary" data-action="activity-open" data-activity="${activity.activityId}">查看活动</button>
        </div>
      </article>
    `;
  }
  const topItems = activity.topItems.map((item) => item.name).join("、");
  return `
    <article class="activity-card ${options.compact ? "compact" : ""}">
      <div class="activity-card-head">
        <span class="activity-icon">${iconSvg(activityIconType(activity.activityType))}</span>
        <div>
          <h3>${activity.name}</h3>
          <p>${activity.projectName} · ${activity.monthLabel} · ${activity.activityType}</p>
        </div>
      </div>
      <div class="activity-card-metrics">
        <span><em>活动总成本</em><strong>${moneyWan(activity.totalCost)}</strong></span>
        <span><em>直接成本</em><strong>${moneyWan(activity.directCost)}</strong></span>
        <span><em>分摊成本</em><strong>${moneyWan(activity.allocationCost)}</strong></span>
        <span><em>占当月成本</em><strong>${percent(activity.costRatio)}</strong></span>
      </div>
      <div class="activity-relation">
        <div class="relation-track" title="活动成本 + 非活动/日常运营成本 = 项目当月总成本">
          <span class="relation-activity" style="width:${relation.activity}%"></span>
          <span class="relation-daily" style="width:${relation.daily}%"></span>
        </div>
        <div class="relation-legend">
          <span>活动成本 ${moneyWan(activity.totalCost)}</span>
          <span>非活动/日常运营成本 ${moneyWan(activity.nonActivityCost)}</span>
        </div>
      </div>
      <div class="activity-card-foot">
        <span>主要成本项：${topItems}</span>
        <span>NC台账：${activity.ncCount}笔</span>
      </div>
      <div class="activity-card-actions">
        <button class="btn primary" data-action="activity-open" data-activity="${activity.activityId}">查看活动</button>
      </div>
    </article>
  `;
}

function renderCompare() {
  return `
    <div class="page-title-row">
      <div>
        <h1 class="page-title">全项目横向对比</h1>
        <p class="page-subtitle">项目总体对比保留原有经营总览；重点成本项和活动成本对标用于比较同类成本在不同项目之间的差异和分布。</p>
      </div>
      <div class="page-actions">
        <button class="btn" data-action="nav" data-view="home">返回首页</button>
      </div>
    </div>
    <div class="compare-tabs">
      <button class="${state.compareTab === "overall" ? "is-active" : ""}" data-action="compare-tab" data-tab="overall">项目总体对比</button>
      <button class="${state.compareTab === "benchmark" ? "is-active" : ""}" data-action="compare-tab" data-tab="benchmark">重点成本项对标</button>
      <button class="${state.compareTab === "activityBenchmark" ? "is-active" : ""}" data-action="compare-tab" data-tab="activityBenchmark">活动成本对标</button>
    </div>
    ${state.compareTab === "activityBenchmark" ? renderActivityBenchmarkCompare() : state.compareTab === "benchmark" ? renderBenchmarkCompare() : renderOverallCompare()}
  `;
}

function renderOverallCompare() {
  const monthScope = getCompareMonthScope();
  const scopeMeta = getCompareScopeLabel(monthScope);
  const summaries = PROJECTS.map((project) => getProjectCompareSummary(project.id, monthScope));
  const byScope = [...summaries].sort((a, b) => b.total - a.total);
  const maySnapshot = PROJECTS.map((project) => getProjectCompareSummary(project.id, 5)).sort((a, b) => b.total - a.total);
  return `
    <section class="section compare-overall-intro">
      <div>
        <h2 class="section-title">${scopeMeta.title}</h2>
        <div class="section-note">${scopeMeta.note}</div>
      </div>
      <span class="condition-pill">${scopeMeta.badge}</span>
    </section>

    <div class="grid-3">
      <section class="section">
        <div class="section-header"><h2 class="section-title">${scopeMeta.rankTitle}</h2></div>
        ${renderRanking(byScope, "total", byScope.length, { scrollable: true })}
      </section>
      <section class="section">
        <div class="section-header"><h2 class="section-title">${monthScope === "all" ? "5月成本快照" : scopeMeta.shareTitle}</h2></div>
        ${monthScope === "all" ? renderRanking(maySnapshot, "total", maySnapshot.length, { scrollable: true }) : renderShareCompare(summaries)}
      </section>
      <section class="section">
        <div class="section-header"><h2 class="section-title">${monthScope === "all" ? scopeMeta.shareTitle : `${scopeMeta.shortLabel}预算执行对比`}</h2></div>
        ${monthScope === "all" ? renderShareCompare(summaries) : renderCompareBudgetExecution(monthScope)}
      </section>
    </div>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">${scopeMeta.matrixTitle}</h2>
        <span class="section-note">点击固定成本、变动成本、管理费用金额进入对应项目并自动带入${scopeMeta.shortLabel}口径。</span>
      </div>
      ${renderMatrixTable(summaries, monthScope, scopeMeta)}
    </section>
  `;
}

function getCompareMonthScope() {
  const activeMonth = v116ActiveMonth();
  return activeMonth === "all" ? "all" : String(normalizeMonthValue(activeMonth));
}

function getCompareScopeLabel(monthScope) {
  const isCumulative = monthScope === "all";
  const shortLabel = isCumulative ? "累计" : `${monthScope}月`;
  return {
    shortLabel,
    badge: isCumulative ? "1-5月累计口径" : `2026年${monthScope}月`,
    title: isCumulative ? "项目总体对比（累计口径）" : `项目总体对比（2026年${monthScope}月）`,
    note: isCumulative
      ? "排名、三大类占比和矩阵均使用1-5月累计数据；5月成本快照仅作为辅助观察。"
      : `排名、三大类占比和矩阵均使用2026年${monthScope}月数据。`,
    rankTitle: isCumulative ? "累计成本排名" : `${monthScope}月成本排名`,
    shareTitle: isCumulative ? "累计三大类占比对比" : `${monthScope}月三大类占比对比`,
    matrixTitle: isCumulative ? "累计项目 × 成本科目矩阵" : `${monthScope}月项目 × 成本科目矩阵`,
    totalTitle: isCumulative ? "累计成本" : `${monthScope}月成本`,
  };
}

function getProjectCompareSummary(projectId, monthScope) {
  const project = getProject(projectId);
  const records = filterRecords({ projectId, month: monthScope });
  const cumulativeRecords = filterRecords({ projectId });
  return {
    project,
    total: sumRecords(records),
    scopeTotal: sumRecords(records),
    cumulativeTotal: sumRecords(cumulativeRecords),
    may: sumRecords(filterRecords({ projectId, month: 5 })),
    count: filterLedgerRecords({ projectId, month: monthScope }).length,
    byMain: sumsByMain(records),
  };
}

function renderCompareBudgetExecution(monthScope) {
  const month = normalizeMonthValue(monthScope);
  const rows = PROJECTS.map((project) => {
    const execution = getProjectBudgetExecution(project.id, month);
    return {
      ...execution,
      status: budgetStatus(execution.monthBudgetRatio),
    };
  }).sort((a, b) => (b.monthBudgetRatio || 0) - (a.monthBudgetRatio || 0));
  const maxRatio = Math.max(...rows.map((row) => row.monthBudgetRatio || 0), 1);
  return `
    <div class="compare-budget-execution-list is-scrollable">
      ${rows.map((row, index) => {
        const ratio = row.monthBudgetRatio;
        const width = ratio === null || ratio === undefined ? 0 : Math.min(130, Math.max(4, (ratio / maxRatio) * 100));
        return `
          <button class="compare-budget-row" data-action="profile-open" data-project="${row.project.id}">
            <span class="rank-no ${v121RankBadgeClass(index)}">${String(index + 1).padStart(2, "0")}</span>
            <span class="compare-budget-project">
              <strong>${row.project.shortName}</strong>
              <small>${PROJECT_BUDGETS[row.project.id] ? PROJECT_BUDGETS[row.project.id].budgetName : row.project.fullName}</small>
            </span>
            <span class="compare-budget-track"><i class="${row.status.className}" style="width:${width}%"></i></span>
            <span class="compare-budget-value">
              <strong>${ratio === null || ratio === undefined ? "-" : percent(ratio)}</strong>
              <small>${moneyWan(row.monthActual)} / ${moneyWan(row.monthBudget)}</small>
            </span>
            <span class="budget-status-pill ${row.status.className}">${row.status.label}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderBenchmarkCompare() {
  const current = state.benchmark;
  const items = filterUnitCostItems(current);
  const rows = aggregateUnitCostByProject(items);
  const ranking = sortUnitBenchmarkRows(rows, current.metric);
  const referenceRange = calculateBenchmarkReferenceRange({
    benchmarkRows: rows,
    costItem: current.item,
    unit: current.unit,
    projectFilter: current.projectScope,
    monthRange: current.month,
  });
  const selectedRow = ranking.find((row) => row.rowKey === current.selectedRowKey)
    || ranking.find((row) => row.project.id === current.selectedProjectId)
    || ranking[0]
    || null;
  const stats = getUnitCostBenchmarkStats(rows);
  const unitCount = new Set(rows.map((row) => row.unit)).size;
  const groupedRows = groupUnitBenchmarkRows(ranking);
  return `
    <section class="section benchmark-panel unit-benchmark-panel">
      <div class="section-header">
        <div>
          <h2 class="section-title">重点成本项单价对标</h2>
          <div class="section-note">当前选择：${current.item} / ${monthLabel(current.month)} / ${current.projectScope} / ${current.unit || "全部单位"} / ${current.metric}</div>
        </div>
      </div>
      ${renderBenchmarkFilters()}
      <div class="benchmark-note">
        可计量成本项按单价 × 工程量拆分；无法合理拆分的综合服务类成本按 1项或1场 × 合同金额展示，不参与单价横向排名。不同计量单位不混合计算单价。
      </div>
      ${renderBenchmarkDiagnosis(rows, stats, current, referenceRange)}
      <div class="kpi-grid unit-cost-kpis">
        ${renderKpi("对标项目数", `${stats.projectCount}个`, "当前筛选样本")}
        ${renderKpi("总金额", moneyWan(stats.totalAmount), "当前筛选合计")}
        ${renderKpi("平均单价", unitCount > 1 ? "按单位分组统计" : formatUnitPrice(stats.averageUnitPrice, stats.unit), unitCount > 1 ? "不同单位不混算" : `元/${stats.unit || "单位"}`)}
        ${renderKpi("最高单价", unitCount > 1 ? "按单位分组统计" : formatUnitPrice(stats.highUnitPrice, stats.unit), unitCount > 1 ? "查看下方分组" : "项目最高")}
        ${renderKpi("最低单价", unitCount > 1 ? "按单位分组统计" : formatUnitPrice(stats.lowUnitPrice, stats.unit), unitCount > 1 ? "查看下方分组" : "项目最低")}
        ${renderKpi("价差倍数", unitCount > 1 ? "按单位分组统计" : formatSpread(stats.spread), unitCount > 1 ? "不同单位不混算" : "最高 / 最低")}
        ${renderKpi("工程量合计", unitCount > 1 ? "按单位分组统计" : `${formatQuantity(stats.totalQuantity)}${stats.unit || ""}`, "当前筛选合计")}
        ${renderKpi("NC笔数", `${stats.ncCount}笔`, "可追溯到单笔")}
      </div>
    </section>

    <div class="benchmark-main-grid unit-benchmark-grid">
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">单价对标排行榜</h2>
          <span class="section-note">按${current.metric}从高到低排列；综合包干项不参与单价排名。</span>
        </div>
        ${renderUnitBenchmarkRankTable(groupedRows, selectedRow)}
      </section>
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">项目摘要</h2>
          <span class="section-note">点击排行榜行后更新</span>
        </div>
        ${renderUnitBenchmarkProjectSummary(selectedRow, referenceRange)}
      </section>
    </div>
  `;
}

function renderBenchmarkFilters() {
  const current = state.benchmark;
  const itemOptions = getUnitBenchmarkOptions();
  const unitOptions = getUnitBenchmarkUnitOptions(current);
  const selectedItem = itemOptions.some((item) => item.name === current.item) ? current.item : "保安服务";
  return `
    <div class="benchmark-filter-bar">
      <div class="field">
        <label>成本项</label>
        <select data-action="benchmark-filter" data-field="item">
          ${itemOptions.map((item) => `<option value="${item.name}" ${selectedItem === item.name ? "selected" : ""}>${item.name}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>月份</label>
        <select data-action="benchmark-filter" data-field="month">
          ${MONTH_OPTIONS.map((item) => `<option value="${item.value}" ${String(current.month) === item.value ? "selected" : ""}>${item.label}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>项目范围</label>
        <select data-action="benchmark-filter" data-field="projectScope">
          ${["全部项目", "PPP项目", "轻资产项目"].map((item) => `<option value="${item}" ${current.projectScope === item ? "selected" : ""}>${item}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>单位</label>
        <select data-action="benchmark-filter" data-field="unit">
          ${["全部单位", ...unitOptions].map((item) => `<option value="${item}" ${(current.unit || "全部单位") === item ? "selected" : ""}>${item}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>对比口径</label>
        <select data-action="benchmark-filter" data-field="metric">
          ${["单价", "总金额", "工程量"].map((item) => `<option value="${item}" ${current.metric === item ? "selected" : ""}>${item}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>是否仅看可拆分项</label>
        <select data-action="benchmark-filter" data-field="splitFilter">
          ${["全部", "仅可拆分项", "仅综合包干项"].map((item) => `<option value="${item}" ${(current.splitFilter || "全部") === item ? "selected" : ""}>${item}</option>`).join("")}
        </select>
      </div>
    </div>
  `;
}

function renderUnitBenchmarkRankTable(groupedRows, selectedRow) {
  const groups = Object.entries(groupedRows);
  if (!groups.length) return renderV121EmptyState("当前筛选条件下无单价对标样本。");
  let rank = 1;
  return `
    <div class="unit-rank-table">
      ${groups.map(([unit, rows]) => {
        const comparable = rows.filter((row) => row.canBenchmark);
        const maxPrice = Math.max(...comparable.map((row) => row.averageUnitPrice), 0);
        const minPrice = Math.min(...comparable.map((row) => row.averageUnitPrice), maxPrice || 0);
        return `
          <div class="unit-group">
            <div class="unit-group-title"><span class="unit-pill">${unit}</span><em>${rows.length}个项目样本</em></div>
            <div class="table-wrap">
              <table class="matrix-table unit-rank-matrix">
                <thead>
                  <tr>
                    <th>排名</th>
                    <th>项目</th>
                    <th>成本项</th>
                    <th>单位</th>
                    <th class="num">加权平均单价</th>
                    <th class="num">工程量</th>
                    <th class="num">总金额</th>
                    <th class="num">关联活动数</th>
                    <th class="num">供应商/合同</th>
                    <th class="num">NC笔数</th>
                    <th>合理性状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map((row) => {
                    const priceStatus = getUnitPriceStatus(row, rows);
                    const rankText = state.benchmark.metric !== "单价" || row.canBenchmark ? String(rank++).padStart(2, "0") : "—";
                    const extremeClass = row.canBenchmark && row.averageUnitPrice === maxPrice && maxPrice !== minPrice ? "benchmark-extreme-high" : row.canBenchmark && row.averageUnitPrice === minPrice && maxPrice !== minPrice ? "benchmark-extreme-low" : "";
                    return `
                      <tr class="${selectedRow && selectedRow.rowKey === row.rowKey ? "is-selected" : ""}">
                        <td>${rankText}</td>
                        <td><button class="plain-link" data-action="benchmark-select-project" data-project="${row.project.id}" data-row-key="${row.rowKey}">${row.project.shortName}</button><div class="section-note">${row.project.fullName}</div></td>
                        <td>${row.normalizedName}</td>
                        <td><span class="unit-pill">${row.unit}</span></td>
                        <td class="num ${extremeClass}">${row.canBenchmark ? formatUnitPrice(row.averageUnitPrice, row.unit) : "不参与单价排名"}</td>
                        <td class="num">${formatQuantity(row.quantity)}${row.unit}</td>
                        <td class="num">${moneyWan(row.amount)}</td>
                        <td class="num">${row.activityCount}</td>
                        <td class="num">${row.supplierCount}/${row.contractCount}</td>
                        <td class="num">${row.ncCount}</td>
                        <td><span class="price-status-pill ${priceStatus.className}">${priceStatus.label}</span></td>
                        <td>
                          <button class="plain-link detail-link" data-action="unit-benchmark-nc" data-row-key="${row.rowKey}">明细 ›</button>
                          <button class="plain-link detail-link" data-action="profile-open" data-project="${row.project.id}">画像 ›</button>
                        </td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderUnitBenchmarkProjectSummary(row, referenceRange = null) {
  if (!row) return renderV121EmptyState("请选择一个项目查看对标摘要。", "待选择");
  const activityIds = [...row.activityIds];
  const supplierNames = [...row.supplierNames].slice(0, 3);
  const activityNames = activityIds.map((id) => getActivityById(id)).filter(Boolean).slice(0, 3);
  const groupRows = getCurrentUnitBenchmarkRows().filter((item) => item.normalizedName === row.normalizedName && item.unit === row.unit);
  const priceStatus = getUnitPriceStatus(row, groupRows);
  const possibleReason = getBenchmarkPossibleReason(row, priceStatus.label);
  const managementSuggestion = getBenchmarkManagementSuggestion(row, priceStatus.label);
  return `
    <div class="benchmark-summary-card">
      <h3>${row.project.shortName} · ${row.normalizedName}</h3>
      <dl class="info-list">
        <div class="info-row"><dt>项目名称</dt><dd>${row.project.fullName}</dd></div>
        <div class="info-row"><dt>月份</dt><dd>${monthLabel(state.benchmark.month)}</dd></div>
        <div class="info-row"><dt>单位</dt><dd>${row.unit}</dd></div>
        <div class="info-row"><dt>加权平均单价</dt><dd><strong>${row.canBenchmark ? formatUnitPrice(row.averageUnitPrice, row.unit) : "综合包干，不参与单价排名"}</strong></dd></div>
        <div class="info-row"><dt>工程量</dt><dd>${formatQuantity(row.quantity)}${row.unit}</dd></div>
        <div class="info-row"><dt>总金额</dt><dd><strong>${moneyWan(row.amount)}</strong></dd></div>
        <div class="info-row"><dt>参考区间</dt><dd>${row.canBenchmark ? benchmarkReferenceText(row, referenceRange) : "不参与单价对标"}</dd></div>
        <div class="info-row"><dt>区间口径</dt><dd>${row.canBenchmark ? benchmarkReferenceMethodText(referenceRange) : "综合包干项不参与分位区间计算"}</dd></div>
        <div class="info-row"><dt>主要供应商</dt><dd>${supplierNames.join("、") || "-"}</dd></div>
        <div class="info-row"><dt>关联活动</dt><dd>${activityNames.map((activity) => activity.name).join("、") || "-"}</dd></div>
        <div class="info-row"><dt>合同数</dt><dd>${row.contractCount}个</dd></div>
        <div class="info-row"><dt>NC笔数</dt><dd>${row.ncCount}笔</dd></div>
        <div class="info-row"><dt>数据属性</dt><dd>${row.canBenchmark ? "可拆分" : "综合包干"}</dd></div>
        <div class="info-row"><dt>合理性状态</dt><dd><span class="price-status-pill ${priceStatus.className}">${priceStatus.label}</span></dd></div>
        <div class="info-row benchmark-reason-card"><dt>可能原因</dt><dd>${possibleReason}</dd></div>
        <div class="info-row benchmark-suggestion"><dt>管理建议</dt><dd>${managementSuggestion}</dd></div>
        <div class="info-row"><dt>口径说明</dt><dd>${row.canBenchmark ? "按总金额 / 工程量计算加权平均单价。" : "按1项或1场 × 合同金额展示，不参与单价横向排名。"}</dd></div>
      </dl>
      <div class="summary-actions">
        <button class="btn primary" data-action="unit-benchmark-nc" data-row-key="${row.rowKey}">查看NC明细</button>
        <button class="btn" data-action="profile-open" data-project="${row.project.id}">查看项目画像</button>
      </div>
      ${activityNames.length ? `
        <div class="summary-activity-list">
          ${activityNames.map((activity) => `<button class="plain-link detail-link" data-action="activity-open" data-activity="${activity.activityId}">${activity.name}</button>`).join("")}
        </div>
      ` : `<div class="section-note">当前摘要下无可直接打开的活动。</div>`}
    </div>
  `;
}

function renderShareCompare(summaries) {
  const top = [...summaries].sort((a, b) => b.total - a.total);
  return `
    <div class="rank-list share-compare-list is-scrollable">
      ${top.map((item) => {
        const ratios = getMainRatios(item.byMain);
        return `
          <button class="rank-row" data-action="profile-open" data-project="${item.project.id}">
            <span class="rank-no share-project-name">${item.project.shortName}</span>
            <span class="rank-name">${percent(ratios.固定成本)}</span>
            <span class="rank-bar-track">
              <span class="ratio-track">
                <span class="ratio-fixed" style="width:${ratios.固定成本 * 100}%"></span>
                <span class="ratio-variable" style="width:${ratios.变动成本 * 100}%"></span>
                <span class="ratio-manage" style="width:${ratios.管理费用 * 100}%"></span>
              </span>
            </span>
            <span class="rank-value">${percent(ratios.管理费用)}</span>
          </button>
        `;
      }).join("")}
    </div>
    <div class="chart-legend">
      ${legendItem("固定成本", "fixed")}
      ${legendItem("变动成本", "variable")}
      ${legendItem("管理费用", "manage")}
    </div>
  `;
}

function renderMatrixTable(summaries, monthScope = "all", scopeMeta = getCompareScopeLabel(monthScope)) {
  const rows = [...summaries].sort((a, b) => b.total - a.total).map((summary) => `
    <tr>
      <td><button class="plain-link" data-action="profile-open" data-project="${summary.project.id}">${summary.project.shortName}</button><div class="section-note">${summary.project.fullName}</div></td>
      <td class="num"><button class="link-cell" data-action="v116-drawer-open" data-project="${summary.project.id}" data-main="固定成本" data-month="${monthScope}" data-title="${summary.project.shortName}${scopeMeta.shortLabel}固定成本" data-amount="${summary.byMain.固定成本}">${moneyWan(summary.byMain.固定成本)}</button></td>
      <td class="num"><button class="link-cell" data-action="v116-drawer-open" data-project="${summary.project.id}" data-main="变动成本" data-month="${monthScope}" data-title="${summary.project.shortName}${scopeMeta.shortLabel}变动成本" data-amount="${summary.byMain.变动成本}">${moneyWan(summary.byMain.变动成本)}</button></td>
      <td class="num"><button class="link-cell" data-action="v116-drawer-open" data-project="${summary.project.id}" data-main="管理费用" data-month="${monthScope}" data-title="${summary.project.shortName}${scopeMeta.shortLabel}管理费用" data-amount="${summary.byMain.管理费用}">${moneyWan(summary.byMain.管理费用)}</button></td>
      <td class="num"><button class="link-cell" data-action="v116-drawer-open" data-project="${summary.project.id}" data-month="${monthScope}" data-title="${summary.project.shortName}${scopeMeta.totalTitle}" data-amount="${summary.total}">${moneyWan(summary.total)}</button></td>
      <td class="num">${summary.count}</td>
      <td><button class="btn" data-action="profile-open" data-project="${summary.project.id}">查看项目画像</button></td>
    </tr>
  `).join("");
  return `
    <div class="table-wrap">
      <table class="matrix-table compare-matrix-table">
        <thead>
          <tr>
            <th>项目</th>
            <th class="num">固定成本</th>
            <th class="num">变动成本</th>
            <th class="num">管理费用</th>
            <th class="num">${scopeMeta.totalTitle}</th>
            <th class="num">NC台账笔数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderActivity() {
  const current = state.activity;
  const filteredActivities = filterActivities(current);
  const activityMonthSummaries = buildActivityMonthSummaryFromFactCostDetail({
    projectId: current.projectId,
    activityType: current.type,
    costItem: current.costItem,
    includeAllocated: true,
    includeBaseActivity: false,
  });
  const selectedSummaryRows = current.month === "all"
    ? activityMonthSummaries
    : activityMonthSummaries.filter((row) => Number(row.month) === Number(current.month));
  const selectedSummary = selectedSummaryRows.reduce((summary, row) => ({
    directActivityCost: summary.directActivityCost + row.directActivityCost,
    allocatedActivityCost: summary.allocatedActivityCost + row.allocatedActivityCost,
    totalActivityCost: summary.totalActivityCost + row.totalActivityCost,
    businessActivityCount: summary.businessActivityCount + row.businessActivityCount,
    ncCount: summary.ncCount + row.ncCount,
  }), { directActivityCost: 0, allocatedActivityCost: 0, totalActivityCost: 0, businessActivityCount: 0, ncCount: 0 });
  const selectedMonthLabel = current.month === "all" ? "全部月份" : `2026年${current.month}月`;
  const visibleActivities = current.cardsExpanded ? filteredActivities : filteredActivities.slice(0, 12);
  const activityRecords = activityRecordsForActivities(filteredActivities, current.costItem);
  const total = filteredActivities.reduce((sum, activity) => sum + activityMetricValue(activity, current.metric, current.costItem), 0);
  const direct = selectedSummary.directActivityCost;
  const allocated = selectedSummary.allocatedActivityCost;
  return `
    <div class="page-title-row">
      <div>
        <h1 class="page-title">活动成本</h1>
        <p class="page-subtitle">按项目、月份、活动类型和成本项查看单场活动成本，并继续穿透到NC台账。</p>
      </div>
      <div class="page-actions">
        <button class="btn" data-action="nav" data-view="home">返回首页</button>
      </div>
    </div>

    <section class="section">
      ${renderActivityFilters()}
      <div class="activity-scope-note">基础运营/固定成本归集入口不作为经营活动统计，相关成本在项目画像和成本结构中展示；分摊成本仅作为活动解释层，不重复计入公司总成本。</div>
      <div class="kpi-grid activity-kpis">
        ${renderKpi("活动总成本", moneyWan(selectedSummary.totalActivityCost), selectedMonthLabel, `data-action="v116-drawer-open" data-project="${current.projectId}" data-month="${current.month}" data-item="${current.costItem === "全部" ? "" : current.costItem}" data-title="活动总成本明细" data-amount="${selectedSummary.totalActivityCost}"`)}
        ${renderKpi("分摊参考", moneyWan(allocated), "固定成本和管理费用分摊", `data-action="v116-drawer-open" data-project="${current.projectId}" data-month="${current.month}" data-title="活动分摊参考" data-amount="${allocated}"`)}
        ${renderKpi("活动数量", `${filteredActivities.length}场`, selectedMonthLabel)}
        ${renderKpi("平均单场成本", moneyWan(total / Math.max(1, filteredActivities.length)), current.metric)}
        ${renderKpi("直接成本占比", percent(direct / Math.max(1, selectedSummary.totalActivityCost)), "经营活动直接成本")}
        ${renderKpi("NC台账笔数", `${activityRecords.length}笔`, "点击打开明细侧栏", `data-action="v116-drawer-open" data-project="${current.projectId}" data-month="${current.month}" data-item="${current.costItem === "全部" ? "" : current.costItem}" data-title="活动NC明细预览" data-amount="${selectedSummary.totalActivityCost}"`)}
      </div>
    </section>

    <div class="grid-2 activity-visual-grid">
      <section class="section">
        <div class="section-header">
          <div>
            <h2 class="section-title">活动成本趋势</h2>
            <span class="section-note">趋势图保留全部月份真实数据，当前联动口径：${selectedMonthLabel}</span>
          </div>
          ${current.month !== "all" ? `<button class="btn" data-action="activity-clear-month">查看全部月份</button>` : ""}
        </div>
        <div class="activity-trend-helper">
          <span>点击月份可联动下方活动列表，趋势图始终保留全部月份真实数据。</span>
        </div>
        ${renderActivityTrend(activityMonthSummaries, current.month)}
      </section>
      <section class="section">
        <div class="section-header"><h2 class="section-title">活动类型分布</h2><span class="section-note">蓝色条形展示不同活动类型成本分布</span></div>
        ${renderActivityTypeDistribution(filteredActivities)}
      </section>
    </div>

    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">活动成本列表</h2>
          <span class="section-note">点击卡片查看活动详情和NC明细。</span>
        </div>
        ${filteredActivities.length > 12 ? `<button class="btn" data-action="toggle-activity-cards">${current.cardsExpanded ? "收起活动" : "展开本月全部活动"}</button>` : ""}
      </div>
      <div class="activity-list-grid">
      ${visibleActivities.map((activity) => renderActivitySummaryCard(activity)).join("") || renderV121EmptyState("当前筛选条件下无匹配活动样本。")}
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">活动成本明细表</h2>
          <span class="section-note">活动成本明细表用于查看活动成本样本及台账入口，默认收起，避免影响经营看板主视图。</span>
        </div>
        <button class="btn" data-action="toggle-activity-table">${current.tableExpanded ? "收起明细表" : "展开明细表"}</button>
      </div>
      ${current.tableExpanded ? renderActivityOverviewTable(filteredActivities) : `<div class="folded-table-note">明细表已收起。展开后默认显示前15条活动样本，作为活动卡片和图表的证据层。</div>`}
    </section>
  `;
}

function renderActivityFilters() {
  const current = state.activity;
  return `
    <div class="benchmark-filter-bar activity-filter-bar">
      <div class="field">
        <label>项目</label>
        <select data-action="activity-filter" data-field="projectId">
          <option value="all" ${current.projectId === "all" ? "selected" : ""}>全部项目</option>
          ${PROJECTS.map((project) => `<option value="${project.id}" ${current.projectId === project.id ? "selected" : ""}>${project.shortName}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>月份</label>
        <select data-action="activity-filter" data-field="month">
          <option value="all" ${current.month === "all" ? "selected" : ""}>全部</option>
          ${MONTHS.map((month) => `<option value="${month}" ${String(current.month) === String(month) ? "selected" : ""}>2026年${month}月</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>活动类型</label>
        <select data-action="activity-filter" data-field="type">
          ${ACTIVITY_TYPES.map((item) => `<option value="${item}" ${current.type === item ? "selected" : ""}>${item}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>成本项</label>
        <select data-action="activity-filter" data-field="costItem">
          ${ACTIVITY_COST_OPTIONS.map((item) => `<option value="${item}" ${current.costItem === item ? "selected" : ""}>${item}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>对比口径</label>
        <select data-action="activity-filter" data-field="metric">
          ${ACTIVITY_METRICS.map((item) => `<option value="${item}" ${current.metric === item ? "selected" : ""}>${item}</option>`).join("")}
        </select>
      </div>
    </div>
  `;
}

function v102ActivityTypeLabel(activityType) {
  return { exhibition: "展会", concert: "演唱会", sports_event: "体育赛事", meeting: "会议论坛", base: "基础活动", other: "其他" }[activityType] || "其他";
}

function v102FactCostItemName(fact, maps = {}) {
  const subject = maps.subjectMap ? maps.subjectMap[fact.subject_id] : {};
  const contractItem = maps.contractItemMap ? maps.contractItemMap[fact.contract_item_id] : {};
  return compatCostItemName({
    contract_item_name: contractItem ? contractItem.item_name : "",
    item_name: contractItem ? contractItem.item_name : "",
    subject_name: subject ? subject.subject_name : "",
    level3_name: subject ? subject.level3_name : "",
  });
}

function buildActivityMonthSummaryFromFactCostDetail({
  factRows = V10_DATA?.FACT_COST_DETAIL || [],
  includeAllocated = true,
  includeBaseActivity = false,
  costItem = "全部",
  projectId = "all",
  activityType = "全部",
} = {}) {
  const activityMap = Object.fromEntries((V10_DATA?.ACTIVITIES_V10 || []).map((activity) => [activity.activity_id, activity]));
  const subjectMap = Object.fromEntries((V10_DATA?.COST_SUBJECTS || []).map((subject) => [subject.subject_id, subject]));
  const contractItemMap = Object.fromEntries((V10_DATA?.CONTRACT_ITEMS || []).map((item) => [item.contract_item_id, item]));
  const maps = { subjectMap, contractItemMap };
  return MONTHS.map((month) => {
    const directActivityIds = new Set();
    const allActivityIds = new Set();
    const rows = factRows.filter((fact) => {
      if (!fact.activity_id) return false;
      if (Number(fact.cost_month) !== Number(month)) return false;
      if (fact.fact_type !== "raw_cost" && !(includeAllocated && fact.fact_type === "allocated_cost")) return false;
      const activity = activityMap[fact.activity_id];
      if (!activity) return false;
      if (!includeBaseActivity && activity.is_base_activity) return false;
      if (projectId !== "all" && fact.project_id !== projectId) return false;
      if (activityType !== "全部" && v102ActivityTypeLabel(activity.activity_type) !== activityType) return false;
      if (costItem !== "全部" && v102FactCostItemName(fact, maps) !== costItem) return false;
      allActivityIds.add(fact.activity_id);
      if (fact.fact_type === "raw_cost") directActivityIds.add(fact.activity_id);
      return true;
    });
    const directRows = rows.filter((fact) => fact.fact_type === "raw_cost");
    const allocatedRows = rows.filter((fact) => fact.fact_type === "allocated_cost");
    return {
      month,
      directActivityCost: v10RoundMoney(v10Sum(directRows, "cost_amount")),
      allocatedActivityCost: v10RoundMoney(v10Sum(allocatedRows, "cost_amount")),
      totalActivityCost: v10RoundMoney(v10Sum(directRows, "cost_amount") + v10Sum(allocatedRows, "cost_amount")),
      businessActivityCount: allActivityIds.size,
      ncCount: directRows.length,
      activityIds: [...allActivityIds],
      directActivityIds: [...directActivityIds],
    };
  });
}

function buildActivityTrendData(monthSummaries, { selectedMonth = "all" } = {}) {
  return MONTHS.map((month) => {
    const summary = monthSummaries.find((row) => Number(row.month) === Number(month)) || {};
    return {
      month,
      amount: compatNumber(summary.totalActivityCost, 0),
      directAmount: compatNumber(summary.directActivityCost, 0),
      allocatedAmount: compatNumber(summary.allocatedActivityCost, 0),
      activityCount: compatNumber(summary.businessActivityCount, 0),
      ncCount: compatNumber(summary.ncCount, 0),
      selected: selectedMonth !== "all" && Number(selectedMonth) === Number(month),
    };
  });
}

function renderActivityTrend(monthSummaries, selectedMonth = "all") {
  const rows = buildActivityTrendData(monthSummaries, { selectedMonth });
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return `
    <div class="activity-trend">
      ${rows.map((row) => `
        <button class="activity-trend-month ${row.selected ? "is-selected" : ""}" data-action="activity-filter-month" data-month="${row.month}" aria-pressed="${row.selected ? "true" : "false"}" title="2026年${row.month}月：${moneyWan(row.amount)}，活动${row.activityCount}场，NC台账${row.ncCount}笔">
          <span class="activity-trend-value">${moneyWan(row.amount)}</span>
          <span class="activity-trend-bar"><span style="height:${Math.max(10, (row.amount / max) * 100)}%"></span></span>
          <strong>${row.month}月</strong>
          <em>${row.activityCount}场 / ${row.ncCount}笔</em>
        </button>
      `).join("")}
    </div>
  `;
}

function renderActivityTypeDistribution(activities) {
  const typeOrder = [
    ...ACTIVITY_TYPES.filter((item) => item !== "全部"),
    ...[...new Set(activities.map((activity) => activity.activityType))].filter((type) => type && !ACTIVITY_TYPES.includes(type)),
  ];
  const rows = typeOrder.map((type) => ({
    type,
    amount: activities.filter((activity) => activity.activityType === type).reduce((sum, activity) => sum + activity.totalCost, 0),
  })).filter((row) => row.amount > 0).sort((a, b) => b.amount - a.amount);
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return `
    <div class="activity-type-list">
      ${rows.map((row) => `
        <div class="activity-type-row">
          <span>${row.type}</span>
          <span class="activity-type-bar"><span style="width:${(row.amount / max) * 100}%"></span></span>
          <strong>${moneyWan(row.amount)}</strong>
        </div>
    `).join("") || renderV121EmptyState("当前筛选条件下无类型分布记录。")}
    </div>
  `;
}

function renderActivityOverviewTable(activities) {
  const visible = activities.slice(0, 15);
  const rows = visible.map((activity) => `
    <tr>
      <td>${activity.name}</td>
      <td>${activity.projectName}</td>
      <td>${activity.monthLabel}</td>
      <td>${activity.activityType}</td>
      <td class="num">${moneyWan(activity.totalCost)}</td>
      <td class="num">${moneyWan(activity.directCost)}</td>
      <td class="num">${moneyWan(activity.fixedAllocation)}</td>
      <td class="num">${moneyWan(activity.manageAllocation)}</td>
      <td>${activity.topItems.map((item) => item.name).join("、")}</td>
      <td class="num">${activity.ncCount}</td>
      <td>
        <button class="plain-link detail-link" data-action="activity-open" data-activity="${activity.activityId}">查看活动</button>
        <button class="plain-link detail-link" data-action="activity-nc" data-activity="${activity.activityId}">查看NC台账</button>
        <button class="plain-link detail-link" data-action="profile-open" data-project="${activity.projectId}">查看项目画像</button>
      </td>
    </tr>
  `).join("");
  return `
    <div class="table-wrap">
      <table class="matrix-table">
        <thead>
          <tr>
            <th>活动名称</th><th>项目</th><th>月份</th><th>活动类型</th>
            <th class="num">活动总成本</th><th class="num">活动直接成本</th>
            <th class="num">固定成本分摊</th><th class="num">管理费用分摊</th>
            <th>主要成本项</th><th class="num">NC台账笔数</th><th>操作</th>
          </tr>
        </thead>
        <tbody>${rows || renderV121EmptyTableCell(11, "当前筛选条件下无活动明细记录。")}</tbody>
      </table>
    </div>
    ${activities.length > visible.length ? `<div class="table-limit-note">当前展示前 ${visible.length}/${activities.length} 条活动明细；更多样本可通过筛选条件缩小范围后查看。</div>` : ""}
  `;
}

function renderActivityDetail() {
  const activity = getActivityById(state.activityDetail.activityId) || ACTIVITIES[0];
  if (!activity) return renderV121EmptyState("当前条件下无可展开的活动数据。");
  const selectedCostItem = state.activityDetail.selectedCostItem;
  const records = activityRecordsFor(activity.activityId, selectedCostItem);
  const allRecords = activityRecordsFor(activity.activityId);
  const topCostItems = aggregateBy(allRecords, "activityCostItem").slice(0, 6);
  const previewRecords = records.slice(0, 8);
  const relation = activityRelationPercents(activity);
  return `
    <div class="page-title-row">
      <div>
        ${renderBreadcrumb([
          { label: "首页", action: "nav", data: { view: "home" } },
          { label: "项目画像", action: "profile-open", data: { project: activity.projectId } },
          { label: activity.projectName, action: "profile-open", data: { project: activity.projectId } },
          { label: activity.monthLabel, disabled: true },
          { label: activity.name, current: true },
        ])}
        <h1 class="page-title">${activity.projectName} · ${activity.name} · 活动详情</h1>
        <p class="page-subtitle">活动成本由直接成本、固定成本分摊和管理费用分摊构成，可继续追溯至NC台账。</p>
      </div>
    </div>

    <section class="section">
      <div class="activity-basic-grid">
        ${renderInfoTile("所属项目", activity.projectFullName)}
        ${renderInfoTile("活动类型", activity.activityType)}
        ${renderInfoTile("活动时间", `${activity.startDate} 至 ${activity.endDate}`)}
        ${renderInfoTile("使用区域", activity.areaName)}
        ${renderInfoTile("使用面积", `${activity.area.toLocaleString("zh-CN")}㎡`)}
        ${renderInfoTile("活动规模", `${activity.audience.toLocaleString("zh-CN")}人次${activity.booths ? ` / ${activity.booths}个展位` : ""}`)}
        ${renderInfoTile("数据来源", activity.dataSource)}
      </div>
    </section>

    ${renderActivityConclusion(activity, allRecords)}

    <section class="section">
      <div class="kpi-grid activity-detail-kpis">
        ${renderKpi("活动总成本", moneyWan(activity.totalCost), "单场活动")}
        ${renderKpi("活动直接成本", moneyWan(activity.directCost), "直接归集")}
        ${renderKpi("分摊成本", moneyWan(activity.allocatedCost || activity.allocationCost || 0), "固定成本 + 管理费用分摊")}
        ${renderKpi("固定成本分摊", moneyWan(activity.fixedAllocation), "按口径分摊")}
        ${renderKpi("管理费用分摊", moneyWan(activity.manageAllocation), "按口径分摊")}
        ${renderKpi("成本项数量", `${new Set(allRecords.map((record) => record.activityCostItem)).size}项`, "活动相关成本项")}
        ${renderKpi("NC台账笔数", `${allRecords.length}笔`, "可追溯到单笔")}
        ${renderKpi("单位成本指标", activity.unitCostLabel, activity.measureName)}
      </div>
    </section>

    ${renderActivityManagementConclusion(activity, allRecords)}

    <section class="section">
      <div class="section-header"><h2 class="section-title">项目月度成本关系条</h2><span class="section-note">活动成本 + 非活动/日常运营成本 = 项目当月总成本</span></div>
      <div class="activity-relation large">
        <div class="relation-head"><strong>项目当月总成本 ${moneyWan(activity.projectMonthTotal)}</strong><span>活动成本 ${percent(activity.costRatio)} / 非活动部分 ${percent(1 - activity.costRatio)}</span></div>
        <div class="relation-track"><span class="relation-activity" style="width:${relation.activity}%"></span><span class="relation-daily" style="width:${relation.daily}%"></span></div>
        <div class="relation-legend"><span>活动成本 ${moneyWan(activity.totalCost)}</span><span>非活动/日常运营成本 ${moneyWan(activity.nonActivityCost)}</span></div>
      </div>
    </section>

    <section class="section activity-composition-section">
      <div class="section-header"><h2 class="section-title">活动成本构成</h2><span class="section-note">仅保留三大类摘要，具体科目以活动成本科目树为主。</span></div>
      ${renderActivityComposition(activity, allRecords)}
    </section>

    <section class="section activity-subject-tree-section">
      <div class="section-header">
        <div>
          <h2 class="section-title">活动成本科目树</h2>
          <span class="section-note">按公司统一成本科目口径归集本活动成本，点击科目可继续追溯至 NC 明细。</span>
        </div>
      </div>
      ${renderActivitySubjectTree(activity)}
    </section>

    <section class="section activity-distribution-section">
      <div class="section-header"><h2 class="section-title">供应商/合同/成本项分布</h2><span class="section-note">横向三列展示本场活动的经营分布。</span></div>
      ${renderActivityDistribution(allRecords)}
    </section>

    <section class="section">
      <div class="section-header"><h2 class="section-title">重点成本项卡片</h2><span class="section-note">点击成本项后刷新下方NC台账预览。</span></div>
      <div class="activity-cost-card-grid">
        ${topCostItems.map((item) => renderActivityCostItemCard(activity, item, selectedCostItem)).join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">活动成本科目明细</h2>
          <span class="section-note">默认收起明细表，优先查看活动成本科目树和 NC 追溯。</span>
        </div>
        <button class="btn" data-action="toggle-activity-detail-table">${state.activityDetail.costTableExpanded ? "收起活动成本明细表" : "展开活动成本明细表"}</button>
      </div>
      ${state.activityDetail.costTableExpanded ? renderActivityCostTable(activity, allRecords) : `<div class="folded-table-note">明细表已收起，可展开查看活动成本科目明细。</div>`}
    </section>

    <section class="section">
      <div class="section-header"><h2 class="section-title">NC台账预览</h2><span class="section-note">${selectedCostItem || "全部成本项"} / 前${previewRecords.length}笔</span></div>
      ${renderActivityLedgerPreview(previewRecords)}
      <div class="activity-detail-actions"><button class="btn" data-action="activity-nc" data-activity="${activity.activityId}" data-item="${selectedCostItem}">查看该活动成本明细</button></div>
    </section>
  `;
}

function renderActivitySubjectTree(activity) {
  const tree = getActivitySubjectTreeRows(activity.activityId);
  if (!tree.length) return renderV121EmptyState("当前活动无可展开的科目拆分数据。");
  return `
    <div class="activity-subject-tree">
      <div class="table-wrap">
        <table class="matrix-table activity-subject-table">
          <thead>
            <tr>
              <th>科目名称</th>
              <th>类别</th>
              <th class="num">实际金额</th>
              <th class="num">占比</th>
              <th>归集方式</th>
              <th class="num">合同数</th>
              <th class="num">NC笔数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${tree.map((group) => `
              <tr class="activity-subject-main">
                <td><strong>${group.category}</strong></td>
                <td>${group.category}</td>
                <td class="num">${moneyWan(group.amount)}</td>
                <td class="num">${percent(group.amount / Math.max(1, activity.totalCost))}</td>
                <td>${group.collectType}</td>
                <td class="num">${group.contractCount}</td>
                <td class="num">${group.ncCount}</td>
                <td><button class="plain-link detail-link" data-action="activity-subject-nc" data-activity="${activity.activityId}" data-subject-id="${group.subjectId}">查看NC明细</button></td>
              </tr>
              ${group.children.map((row) => `
                <tr>
                  <td><span class="activity-subject-child">${row.subjectName}</span></td>
                  <td>${row.category}</td>
                  <td class="num">${moneyWan(row.amount)}</td>
                  <td class="num">${percent(row.amount / Math.max(1, activity.totalCost))}</td>
                  <td>${row.collectType}</td>
                  <td class="num">${row.contractCount}</td>
                  <td class="num">${row.ncCount}</td>
                  <td><button class="plain-link detail-link" data-action="activity-subject-nc" data-activity="${activity.activityId}" data-subject-id="${row.subjectId}">查看NC明细</button></td>
                </tr>
              `).join("")}
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function getActivitySubjectTreeRows(activityId) {
  const rows = ACTIVITY_COST_SUBJECTS.filter((item) => item.activityId === activityId && item.amount > 0);
  return ["固定成本", "变动成本", "管理费用"].map((category) => {
    const categoryRows = rows.filter((item) => item.category === category);
    if (!categoryRows.length) return null;
    const childrenMap = new Map();
    categoryRows.forEach((item) => {
      if (!childrenMap.has(item.subjectId)) {
        childrenMap.set(item.subjectId, {
          subjectId: item.subjectId,
          subjectName: item.subjectName,
          category: item.category,
          amount: 0,
          collectItems: [],
          contractCount: 0,
          ncCount: 0,
        });
      }
      const target = childrenMap.get(item.subjectId);
      target.amount += item.amount;
      target.collectItems.push(item);
      target.contractCount += item.contractCount;
      target.ncCount += item.ncCount;
    });
    const children = [...childrenMap.values()]
      .map((item) => ({ ...item, collectType: budgetCollectType(item.collectItems) }))
      .sort((a, b) => b.amount - a.amount);
    return {
      category,
      subjectId: costSubjectIdForCategory(category),
      amount: children.reduce((sum, item) => sum + item.amount, 0),
      collectType: budgetCollectType(categoryRows),
      contractCount: children.reduce((sum, item) => sum + item.contractCount, 0),
      ncCount: children.reduce((sum, item) => sum + item.ncCount, 0),
      children,
    };
  }).filter(Boolean);
}

function costSubjectIdForCategory(category) {
  const subject = COST_SUBJECT_TREE.find((item) => item.level === 0 && item.category === category);
  return subject ? subject.id : "";
}

function renderInfoTile(label, value) {
  return `<div class="info-tile"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderActivityConclusion(activity, records) {
  const topItems = aggregateBy(records, "activityCostItem").slice(0, 3).map((item) => item.name);
  return `
    <section class="activity-conclusion">
      <strong>一句话结论</strong>
      <span>本场活动成本${moneyWan(activity.totalCost)}，占项目当月成本约${percent(activity.costRatio)}，成本主要集中在${topItems.join("、")}等项目。</span>
    </section>
  `;
}

function renderActivityManagementConclusion(activity, records) {
  const subjectRows = getActivitySubjectTreeRows(activity.activityId)
    .flatMap((group) => group.children)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
  const unitItems = UNIT_COST_ITEMS.filter((item) => item.activityId === activity.activityId);
  const benchmarkable = [...new Set(unitItems.filter((item) => item.canBenchmark).map((item) => item.normalizedName))].slice(0, 4);
  const hasComprehensive = unitItems.some((item) => !item.canBenchmark || item.benchmarkType === "综合包干");
  const hasAllocation = records.some((record) => record.allocated) || activity.fixedAllocation > 0 || activity.manageAllocation > 0;
  const lines = [
    `本活动成本主要集中于${subjectRows.map((row) => row.subjectName).join("、") || "现场服务、搭建和运营保障"}等科目。`,
    benchmarkable.length
      ? `其中${benchmarkable.join("、")}可继续进入重点成本项对标页查看单价差异。`
      : "当前活动以综合服务和分摊成本为主，不宜直接进行单价横向排名。",
    `${hasAllocation ? "存在固定成本分摊或管理费用分摊，需结合分摊口径理解活动成本。" : "本活动以直接归集成本为主。"}${hasComprehensive ? " 同时存在综合包干项目，页面已标记不参与单价排名。" : ""}`,
  ];
  return `
    <section class="management-conclusion-card activity-management-card">
      <strong>本活动管理结论</strong>
      <ol class="management-conclusion-list">
        ${lines.slice(0, 3).map((line) => `<li>${line}</li>`).join("")}
      </ol>
    </section>
  `;
}

function renderActivityComposition(activity, records = []) {
  const total = activity.totalCost || 1;
  const treeRows = getActivitySubjectTreeRows(activity.activityId);
  const categoryAmount = (category, fallback) => {
    const row = treeRows.find((item) => item.category === category);
    return row ? row.amount : fallback;
  };
  const rows = [
    ["固定成本", categoryAmount("固定成本", activity.fixedAllocation), "按活动使用、场馆运行和固定成本分摊口径归集。"],
    ["变动成本", categoryAmount("变动成本", activity.directCost), "与本场活动直接相关的现场服务、搭建、餐饮和能耗成本。"],
    ["管理费用", categoryAmount("管理费用", activity.manageAllocation), "按活动组织管理、宣传和支持口径归集。"],
  ];
  return `
    <div class="composition-box">
      <div class="composition-summary">
        <div class="summary-stack composition-stack">
          <span class="ratio-fixed" style="width:${(rows[0][1] / total) * 100}%"></span>
          <span class="ratio-variable" style="width:${(rows[1][1] / total) * 100}%"></span>
          <span class="ratio-manage" style="width:${(rows[2][1] / total) * 100}%"></span>
        </div>
        <div class="composition-metric-grid">
          ${rows.map((row) => `
            <div class="composition-metric">
              <span>${row[0]}</span>
              <strong>${moneyWan(row[1])}</strong>
              <em>${percent(row[1] / total)}</em>
              <small>${row[2]}</small>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderActivityCostItemCard(activity, item, selectedCostItem) {
  const records = activityRecordsFor(activity.activityId, item.name);
  const first = records[0] || {};
  const ratio = item.amount / Math.max(1, activity.totalCost);
  return `
    <button class="activity-cost-item-card ${selectedCostItem === item.name ? "is-selected" : ""}" data-action="activity-cost-select" data-item="${item.name}">
      <span>${item.name}</span>
      <strong>${moneyWan(item.amount)}</strong>
      <em>占比 ${percent(ratio)}</em>
      <small>${first.measureQty || "-"}${first.measureUnit || ""} / 单位成本 ${(first.unitCost || 0).toLocaleString("zh-CN", { maximumFractionDigits: 1 })}元</small>
      <small>供应商 ${new Set(records.map((record) => record.supplier)).size}家</small>
      <b>查看NC台账</b>
    </button>
  `;
}

function renderActivityCostTable(activity, records) {
  const rows = records.map((record) => `
    <tr>
      <td>${record.main}</td>
      <td>${record.l1}</td>
      <td>${record.activityCostItem}</td>
      <td class="num">${moneyWan(record.amount)}</td>
      <td class="num">${percent(record.amount / Math.max(1, activity.totalCost))}</td>
      <td>${record.directCollected ? "是" : "否"}</td>
      <td>${record.allocated ? "是" : "否"}</td>
      <td class="num">1</td>
      <td><button class="plain-link detail-link" data-action="activity-nc" data-activity="${activity.activityId}" data-item="${record.activityCostItem}">查看NC台账</button></td>
    </tr>
  `).join("");
  return `
    <div class="table-wrap">
      <table class="matrix-table">
        <thead><tr><th>主类</th><th>一级科目</th><th>成本项</th><th class="num">金额</th><th class="num">占比</th><th>直接归集</th><th>分摊</th><th class="num">NC台账笔数</th><th>操作</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderDistributionCard(title, rows) {
  if (!rows.length) {
    return `<div class="distribution-card"><h3>${title}</h3>${renderV121EmptyState("当前条件下无分布数据。")}</div>`;
  }
  const maxAmount = Math.max(...rows.map((row) => row.amount), 1);
  return `
    <div class="distribution-card">
      <h3>${title}</h3>
      ${rows.map((row) => `
        <div class="distribution-row">
          <div><strong>${row.name}</strong><span>${moneyWan(row.amount)}</span></div>
          <div class="distribution-bar"><span style="width:${Math.max(4, (row.amount / maxAmount) * 100)}%"></span></div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderActivityDistribution(records) {
  return `
    <div class="distribution-grid activity-distribution-grid">
      ${renderDistributionCard("供应商TOP5", aggregateBy(records, "supplier").slice(0, 5))}
      ${renderDistributionCard("合同TOP5", aggregateBy(records, "contractName").slice(0, 5))}
      ${renderDistributionCard("成本项TOP5", aggregateBy(records, "activityCostItem").slice(0, 5))}
    </div>
  `;
}

function renderActivityLedgerPreview(records) {
  if (!records.length) return renderV121EmptyState("当前筛选条件下无匹配台账记录。");
  const rows = records.map((record) => `
    <tr>
      <td>${record.occurDate}</td>
      <td>${record.postDate}</td>
      <td>${record.activityCostItem}</td>
      <td class="num">${moneyWan(record.amount)}</td>
      <td>${record.supplier}</td>
      <td>${record.contractName}</td>
      <td>${record.settlementNo}</td>
      <td>${record.paymentNo}</td>
      <td><button class="plain-link detail-link" data-action="activity-preview-record" data-id="${record.id}">查看单笔详情</button></td>
    </tr>
  `).join("");
  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>成本发生日期</th><th>入账日期</th><th>成本项</th><th class="num">金额</th><th>供应商</th><th>合同名称</th><th>结算单号</th><th>付款单号</th><th>操作</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderActivityBenchmarkCompare() {
  const current = state.activityBenchmark;
  const activities = filterBenchmarkActivities(current);
  const ranking = [...activities].sort((a, b) => activityMetricValue(b, current.metric, current.costItem) - activityMetricValue(a, current.metric, current.costItem));
  const selected = ranking.find((item) => item.activityId === current.selectedActivityId) || ranking[0] || null;
  const records = activityRecordsForActivities(activities, current.costItem);
  return `
    <section class="section benchmark-panel">
      <div class="section-header">
        <div>
          <h2 class="section-title">活动成本对标</h2>
          <div class="section-note">按活动类型、月份、项目范围和成本项对比单场活动成本。</div>
        </div>
      </div>
      ${renderActivityBenchmarkFilters()}
      <div class="kpi-grid benchmark-kpis">
        ${renderKpi("活动总成本", moneyWan(activities.reduce((sum, activity) => sum + activity.totalCost, 0)), "当前筛选样本")}
        ${renderKpi("活动数量", `${activities.length}场`, "活动样本")}
        ${renderKpi("平均单场成本", moneyWan(activities.reduce((sum, activity) => sum + activityMetricValue(activity, current.metric, current.costItem), 0) / Math.max(1, activities.length)), current.metric)}
        ${renderKpi("覆盖项目数", `${new Set(activities.map((activity) => activity.projectId)).size}个`, "项目范围")}
        ${renderKpi("NC台账笔数", `${records.length}笔`, "可追溯到单笔")}
      </div>
    </section>

    <div class="benchmark-main-grid">
      <section class="section">
        <div class="section-header"><h2 class="section-title">活动成本横向排名图</h2><span class="section-note">点击条形后查看活动摘要</span></div>
        ${renderActivityBenchmarkRank(ranking, selected)}
      </section>
      <section class="section">
        <div class="section-header"><h2 class="section-title">活动摘要</h2></div>
        ${renderActivityBenchmarkSummary(selected)}
      </section>
    </div>

    <section class="section">
      <div class="section-header"><h2 class="section-title">活动类型成本分布</h2><span class="section-note">按活动类型汇总当前筛选样本。</span></div>
      ${renderActivityTypeDistribution(activities)}
    </section>

    <section class="section activity-matrix-section">
      <div class="section-header"><h2 class="section-title">项目 × 月份活动成本矩阵</h2><span class="section-note">颜色越深，活动成本越高；点击单元格进入活动详情。</span></div>
      ${renderActivityHeatmap(current)}
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">活动对标明细表</h2>
          <span class="section-note">默认展示前15条，作为对标分析的证据层。</span>
        </div>
        ${ranking.length > 15 ? `<button class="btn" data-action="toggle-activity-benchmark-table">${state.activityBenchmark.tableExpanded ? "收起" : "查看更多对标明细"}</button>` : ""}
      </div>
      ${renderActivityBenchmarkTable(ranking)}
    </section>
  `;
}

function renderActivityBenchmarkFilters() {
  const current = state.activityBenchmark;
  return `
    <div class="benchmark-filter-bar activity-filter-bar">
      <div class="field"><label>活动类型</label><select data-action="activity-benchmark-filter" data-field="type">${ACTIVITY_TYPES.map((item) => `<option value="${item}" ${current.type === item ? "selected" : ""}>${item}</option>`).join("")}</select></div>
      <div class="field"><label>月份</label><select data-action="activity-benchmark-filter" data-field="month"><option value="all" ${current.month === "all" ? "selected" : ""}>全部</option>${MONTHS.map((month) => `<option value="${month}" ${String(current.month) === String(month) ? "selected" : ""}>2026年${month}月</option>`).join("")}</select></div>
      <div class="field"><label>项目范围</label><select data-action="activity-benchmark-filter" data-field="projectScope">${["全部项目", "PPP项目", "轻资产项目"].map((item) => `<option value="${item}" ${current.projectScope === item ? "selected" : ""}>${item}</option>`).join("")}</select></div>
      <div class="field"><label>成本项</label><select data-action="activity-benchmark-filter" data-field="costItem">${ACTIVITY_COST_OPTIONS.map((item) => `<option value="${item}" ${current.costItem === item ? "selected" : ""}>${item}</option>`).join("")}</select></div>
      <div class="field"><label>对比口径</label><select data-action="activity-benchmark-filter" data-field="metric">${ACTIVITY_METRICS.map((item) => `<option value="${item}" ${current.metric === item ? "selected" : ""}>${item}</option>`).join("")}</select></div>
    </div>
  `;
}

function renderActivityBenchmarkRank(ranking, selected) {
  if (!ranking.length) return renderV121EmptyState("当前筛选条件下无匹配活动样本。");
  const max = Math.max(...ranking.map((activity) => activityMetricValue(activity, state.activityBenchmark.metric, state.activityBenchmark.costItem)), 1);
  return `
    <div class="benchmark-rank-list">
      ${ranking.slice(0, 12).map((activity, index) => {
        const value = activityMetricValue(activity, state.activityBenchmark.metric, state.activityBenchmark.costItem);
        return `
          <button class="benchmark-rank-row activity-rank-row ${selected && selected.activityId === activity.activityId ? "is-selected" : ""}" data-action="activity-benchmark-select" data-activity="${activity.activityId}">
            <span class="rank-no ${v121RankBadgeClass(index)}">${String(index + 1).padStart(2, "0")}</span>
            <span class="rank-info"><strong>${activity.projectName} · ${activity.name}</strong><small>${activity.monthLabel} / ${activity.activityType}</small></span>
            <span class="benchmark-bar"><span style="width:${(value / max) * 100}%"></span></span>
            <span class="rank-value"><strong>${formatActivityMetric(value, state.activityBenchmark.metric)}</strong><small>${activity.ncCount}笔NC台账</small></span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderActivityBenchmarkSummary(activity) {
  if (!activity) return renderV121EmptyState("请选择一场活动查看摘要。", "待选择");
  return `
    <div class="benchmark-summary-card">
      <h3>${activity.projectName} · ${activity.name}</h3>
      <dl class="info-list">
        <div class="info-row"><dt>活动类型</dt><dd>${activity.activityType}</dd></div>
        <div class="info-row"><dt>月份</dt><dd>${activity.monthLabel}</dd></div>
        <div class="info-row"><dt>活动总成本</dt><dd><strong>${moneyWan(activity.totalCost)}</strong></dd></div>
        <div class="info-row"><dt>直接成本</dt><dd>${moneyWan(activity.directCost)}</dd></div>
        <div class="info-row"><dt>占当月成本</dt><dd>${percent(activity.costRatio)}</dd></div>
        <div class="info-row"><dt>NC台账</dt><dd>${activity.ncCount}笔</dd></div>
      </dl>
      <div class="page-actions">
        <button class="btn primary" data-action="activity-open" data-activity="${activity.activityId}">查看活动成本</button>
        <button class="btn" data-action="activity-nc" data-activity="${activity.activityId}">查看NC台账</button>
      </div>
    </div>
  `;
}

function renderActivityHeatmap(current) {
  const projectIds = getBenchmarkProjectIds(current.projectScope);
  const cells = [];
  projectIds.forEach((projectId) => {
    MONTHS.forEach((month) => {
      const activity = getActivity(projectId, month);
      const matched = activity && (current.type === "全部" || activity.activityType === current.type) && activityHasCostItem(activity, current.costItem);
      const amount = matched ? activityMetricValue(activity, current.metric, current.costItem) : 0;
      cells.push({ projectId, month, amount, activity });
    });
  });
  const max = Math.max(...cells.map((cell) => cell.amount), 1);
  return `
    <div class="heatmap-legend"><span></span><em>颜色越深，金额越高</em></div>
    <div class="activity-matrix-wrap">
      <table class="activity-matrix-table">
        <thead>
          <tr>
            <th class="project-col">项目</th>
            ${MONTHS.map((month) => `<th>${month}月</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${projectIds.map((projectId) => {
            const project = getProject(projectId);
            return `
              <tr>
                <th class="project-col">${project.shortName}<small>${project.fullName}</small></th>
                ${MONTHS.map((month) => {
                  const cell = cells.find((item) => item.projectId === projectId && item.month === month);
                  const level = cell.amount / max;
                  return `
                    <td>
                      <button class="activity-matrix-cell" style="background:${heatColor(level)};color:${heatTextColor(level)}" data-action="activity-open" data-activity="${cell.activity ? cell.activity.activityId : ""}" title="${project.shortName} / 2026年${month}月 / ${cell.activity ? cell.activity.name : "无"} / ${moneyWan(cell.amount)}">
                        <strong>${cell.amount ? moneyWan(cell.amount) : "-"}</strong>
                        <span>${cell.activity ? cell.activity.name : "无活动"}</span>
                      </button>
                    </td>
                  `;
                }).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderActivityBenchmarkTable(activities) {
  const visible = state.activityBenchmark.tableExpanded ? activities : activities.slice(0, 15);
  const rows = visible.map((activity) => `
    <tr>
      <td>${activity.projectName}</td>
      <td>${activity.name}</td>
      <td>${activity.monthLabel}</td>
      <td>${activity.activityType}</td>
      <td class="num">${formatActivityMetric(activityMetricValue(activity, state.activityBenchmark.metric, state.activityBenchmark.costItem), state.activityBenchmark.metric)}</td>
      <td class="num">${moneyWan(activity.totalCost)}</td>
      <td class="num">${activity.ncCount}</td>
      <td><button class="plain-link detail-link" data-action="activity-open" data-activity="${activity.activityId}">查看活动成本</button><button class="plain-link detail-link" data-action="activity-nc" data-activity="${activity.activityId}">查看NC台账</button></td>
    </tr>
  `).join("");
  return `
    <div class="table-wrap">
      <table class="matrix-table">
        <thead><tr><th>项目</th><th>活动名称</th><th>月份</th><th>活动类型</th><th class="num">当前口径</th><th class="num">活动总成本</th><th class="num">NC台账笔数</th><th>操作</th></tr></thead>
        <tbody>${rows || renderV121EmptyTableCell(8, "当前筛选条件下无匹配活动样本。")}</tbody>
      </table>
    </div>
    ${activities.length > visible.length ? `<div class="table-limit-note">当前展示 ${visible.length}/${activities.length} 条对标明细，展开后可查看全部。</div>` : ""}
  `;
}

function renderMonthAnalysis() {
  const month = normalizeMonthValue(state.month);
  const selectedSubject = subjectIndex[state.monthSubjectKey] || null;
  const selectedProject = state.monthProjectFilter ? getProject(state.monthProjectFilter) : null;
  const projectFilter = selectedProject ? selectedProject.id : "";
  const summary = getMonthSummary(month, projectFilter ? { projectId: projectFilter } : {});
  const previousSummary = month > 1 ? getMonthSummary(month - 1, projectFilter ? { projectId: projectFilter } : {}) : null;
  const trendData = getTrendData(projectFilter ? filterRecords({ projectId: projectFilter }) : RECORDS);
  const focusMain = state.monthCategoryFilter === "all" ? "" : state.monthCategoryFilter;
  const focusText = selectedSubject
    ? `聚焦${selectedSubject.pathText}`
    : focusMain
      ? `聚焦${focusMain}`
      : "全部成本";
  const reportScopeLabel = selectedProject ? selectedProject.shortName : "全项目";
  const detailScopeText = [
    selectedProject ? selectedProject.shortName : "",
    selectedSubject ? selectedSubject.pathText : focusMain || "全部成本",
  ].filter(Boolean).join(" / ");
  const filteredRecords = getMonthRecords(month, {
    main: focusMain || "all",
    subjectKey: state.monthSubjectKey,
    projectId: state.monthProjectFilter,
  });
  const subjectRows = getMonthSubjectRanking(month, {
    main: focusMain || "all",
    subjectKey: state.monthSubjectKey,
    projectId: projectFilter,
  });
  const projectRows = getMonthProjectRanking(month, projectFilter ? { projectId: projectFilter } : {});
  const activities = getMonthActivities(month, {
    main: focusMain || "all",
    subjectKey: state.monthSubjectKey,
    projectId: projectFilter,
  });
  const detailRows = getMonthDetailRows(month, {
    main: focusMain || "all",
    subjectKey: state.monthSubjectKey,
    projectId: state.monthProjectFilter,
  });
  const topProject = summary.projectRanking[0] || { project: selectedProject || PROJECTS[0], total: 0 };
  const topSubject = (focusMain || state.monthSubjectKey ? subjectRows[0] : summary.subjectRanking[0]) || { name: "-", main: "-", amount: 0 };
  const monthDelta = previousSummary ? summary.total - previousSummary.total : 0;
  const monthAverage = trendData.reduce((sum, item) => sum + item.total, 0) / Math.max(1, trendData.length);
  const printHeader = `中建科工投资运营公司｜${selectedProject ? selectedProject.shortName : "全项目"}｜${monthLabel(month)}成本分析报告`;
  const printFooter = `数据范围：2026年1—5月｜导出日期：${formatExportDate()}｜内部资料 注意保密`;

  return `
    <div class="month-report-print-header">${printHeader}</div>
    <div class="page-title-row">
      <div>
        ${renderBreadcrumb([
          { label: "首页", action: "nav", data: { view: "home" } },
          { label: "月度成本分析", action: "month-reset" },
          { label: monthLabel(month), current: true },
        ])}
        <h1 class="page-title">${monthLabel(month)}${reportScopeLabel}成本分析报告</h1>
        <p class="page-subtitle">展示本月${reportScopeLabel}成本结构、预算执行、项目贡献、科目归因、活动解释和明细摘要。</p>
        <div class="source-trace">当前月份：${monthLabel(month)} · 报告范围：${reportScopeLabel} · 当前视角：${focusText}</div>
      </div>
      <div class="page-actions">
        <button class="btn primary" data-action="month-print">导出月度成本分析报告</button>
        <button class="btn ghost" data-action="nav" data-view="home">返回首页</button>
      </div>
    </div>

    ${renderMonthBudgetOverview(month, projectFilter)}

    <section class="section month-report-lead">
      <div class="section-header">
        <div>
          <h2 class="section-title">本月成本结论</h2>
          <span class="section-note">先看总额变化、项目集中度和重点科目。</span>
        </div>
        ${(state.monthCategoryFilter !== "all" || state.monthSubjectKey || state.monthProjectFilter) ? `<button class="btn ghost" data-action="month-clear-filter">清除聚焦</button>` : ""}
      </div>
      ${renderMonthConclusion(month, summary, previousSummary, projectRows, topSubject, activities)}
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">预算执行情况</h2>
          <span class="section-note">按累计成本、序时预算和全年预算消耗率综合展示各项目预算执行情况。</span>
        </div>
      </div>
      ${renderProjectBudgetRanking(month, projectFilter)}
    </section>

    <section class="section">
      <div class="kpi-grid month-kpis">
        ${renderKpi("本月总成本", moneyWan(summary.total), monthLabel(month))}
        ${renderKpi("较上月变化", previousSummary ? signedMoneyWan(monthDelta) : "基准月", previousSummary ? `${changeVerb(monthDelta)} ${percent(Math.abs(monthDelta) / Math.max(1, previousSummary.total))}` : "分析期首月")}
        ${renderKpi("固定成本", moneyWan(summary.byMain.固定成本), `占比 ${percent(summary.ratios.固定成本)}`)}
        ${renderKpi("变动成本", moneyWan(summary.byMain.变动成本), `占比 ${percent(summary.ratios.变动成本)}`)}
        ${renderKpi("管理费用", moneyWan(summary.byMain.管理费用), `占比 ${percent(summary.ratios.管理费用)}`)}
        ${renderKpi("成本最高项目", moneyWan(topProject.total), `${topProject.project.shortName} / ${percent(topProject.total / Math.max(1, summary.total))}`)}
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">较上月变化分析</h2>
          <span class="section-note">对比上月和1-5月均值，定位主要变化贡献。</span>
        </div>
      </div>
      ${renderMonthChangeDiagnosis(month, summary, previousSummary, trendData, monthAverage, projectFilter)}
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">本月管理关注</h2>
          <span class="section-note">围绕项目集中、重点科目和活动解释形成下钻建议。</span>
        </div>
      </div>
      ${renderMonthManagementFocus(summary, activities)}
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">建议复核事项</h2>
          <span class="section-note">面向管理层形成可执行的复核动作。</span>
        </div>
      </div>
      ${renderMonthReviewActions(summary, activities, selectedProject)}
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">成本科目结构</h2>
          <span class="section-note">${monthLabel(month)} / ${focusText}，点击科目在本页聚焦。</span>
        </div>
      </div>
      <div class="month-structure-grid">
        <div class="month-category-grid">
          ${["固定成本", "变动成本", "管理费用"].map((main) => renderMonthCategoryCard(main, summary.byMain, summary.total)).join("")}
        </div>
        <div class="month-subject-panel">
          <div class="mini-panel-title">一级科目TOP10</div>
          ${renderMonthSubjectRanking(subjectRows.slice(0, 10), summary.total, month)}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">项目成本贡献</h2>
        <span class="section-note">${focusMain ? `${focusText}仅用于提示，项目结构保留完整三类成本。` : "默认展示前8名，其余项目合并展示。"}</span>
      </div>
      ${renderMonthProjectContribution(projectRows, month, summary.total, focusMain)}
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">项目 × 成本科目矩阵</h2>
          <span class="section-note">展示本月重点项目在主要成本科目上的金额分布。</span>
        </div>
      </div>
      ${renderProjectSubjectMatrix(month, projectRows.slice(0, 6), summary.subjectRanking.slice(0, 6))}
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">本月活动解释</h2>
          <span class="section-note">活动成本用于解释本月成本发生背景，不与月度总成本重复相加。</span>
        </div>
      </div>
      ${renderMonthActivityModule(activities.slice(0, 5))}
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">NC明细摘要</h2>
          <span class="section-note">${detailScopeText}口径，按项目、主类和一级科目汇总。</span>
        </div>
        <button class="btn" data-action="month-toggle-detail" data-has-more="${detailRows.length > 10}">${detailToggleLabel(detailRows.length)}</button>
      </div>
      ${renderMonthDetailTable(detailRows, sumRecords(filteredRecords) || summary.total, detailScopeText)}
    </section>
    <div class="month-report-print-footer">${printFooter}</div>
  `;
}

function formatExportDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderMonthBudgetOverview(month, projectId = "") {
  const execution = projectId ? getProjectBudgetExecution(projectId, month) : getCompanyBudgetExecution(month);
  const rows = getProjectBudgetRows(month, projectId);
  const scopeName = projectId && execution.project ? execution.project.shortName : "公司";
  return `
    <section class="section budget-execution-panel">
      <div class="section-header">
        <div>
          <h2 class="section-title">${scopeName}预算执行概览</h2>
          <span class="section-note">${monthLabel(month)} / 预算数据按年度预算月度权重拆分。</span>
        </div>
        <span class="budget-status-pill ${budgetStatus(execution.sequenceBudgetRatio).className}">${budgetStatusText(execution.sequenceBudgetRatio)}</span>
      </div>
      <div class="budget-kpi-grid">
        ${renderKpi(`${scopeName}全年成本预算`, moneyWan(execution.annualBudget), "年度预算")}
        ${renderKpi("本月预算", moneyWan(execution.monthBudget), `${monthLabel(month)}预算`)}
        ${renderKpi("本月实际成本", moneyWan(execution.monthActual), "当前月实际")}
        ${renderKpi("本月预算执行率", percent(execution.monthBudgetRatio), "本月实际 / 本月预算")}
        ${renderKpi("累计序时预算", moneyWan(execution.sequenceBudget), `1-${month}月预算`)}
        ${renderKpi("当前累计成本", moneyWan(execution.cumulativeActual), `1-${month}月实际`)}
        ${renderKpi("累计预算执行率", percent(execution.sequenceBudgetRatio), "累计实际 / 序时预算")}
        ${renderKpi("全年预算消耗率", percent(execution.annualBudgetRatio), "累计实际 / 全年预算")}
      </div>
      ${renderMonthBudgetConclusion(execution, rows, projectId)}
    </section>
  `;
}

function renderMonthBudgetConclusion(execution, rows, projectId = "") {
  if (projectId) {
    const project = execution.project || getProject(projectId);
    const overall = budgetStatusText(execution.sequenceBudgetRatio);
    return `
      <div class="budget-conclusion">
        <strong>${project.shortName}预算执行结论</strong>
        <ul>
          <li>截至${monthLabel(execution.month)}，本项目累计成本占全年预算 ${percent(execution.annualBudgetRatio)}，占序时预算 ${percent(execution.sequenceBudgetRatio)}，整体处于${overall}区间。</li>
          <li>本月实际成本为 ${moneyWan(execution.monthActual)}，本月预算执行率为 ${percent(execution.monthBudgetRatio)}，建议结合活动安排和入账节奏解释变化。</li>
          <li>后续复核重点为本项目高金额科目、活动集中月份和可追溯明细完整性。</li>
        </ul>
      </div>
    `;
  }
  const fastRows = rows.slice(0, 2);
  const slowRows = [...rows].sort((a, b) => a.sequenceBudgetRatio - b.sequenceBudgetRatio).slice(0, 2);
  const overall = budgetStatusText(execution.sequenceBudgetRatio);
  const lines = [
    `截至${monthLabel(execution.month)}，公司累计成本占全年预算 ${percent(execution.annualBudgetRatio)}，占序时预算 ${percent(execution.sequenceBudgetRatio)}，整体处于${overall}区间。`,
    `预算消耗相对偏快项目主要为${fastRows.map((row) => row.project.shortName).join("、")}，主要受活动集中、现场服务和活动变动成本阶段性发生影响。`,
    `预算消耗相对偏低项目主要为${slowRows.map((row) => row.project.shortName).join("、")}，主要受部分维保、保险、租赁等固定成本暂未集中发生影响。`,
  ];
  return `
    <div class="budget-conclusion">
      <strong>公司预算执行结论</strong>
      <ul>
        ${lines.map((line) => `<li>${line}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderProjectBudgetRanking(month, projectId = "") {
  const rows = getProjectBudgetRows(month, projectId);
  const counts = rows.reduce((acc, row) => {
    acc[row.status.label] = (acc[row.status.label] || 0) + 1;
    return acc;
  }, { 偏高: 0, 正常: 0, 偏低: 0 });
  return `
    <div class="budget-overview-summary">
      当前共有 ${rows.length} 个项目纳入预算执行分析，其中偏高 ${counts.偏高 || 0} 个、正常 ${counts.正常 || 0} 个、偏低 ${counts.偏低 || 0} 个；预算偏高项目建议结合活动集中、变动成本发生和固定成本入账节奏继续穿透分析。
    </div>
    <div class="table-wrap">
      <table class="matrix-table budget-ranking-table">
        <thead>
          <tr>
            <th>排名</th>
            <th>项目</th>
            <th class="num">年度预算</th>
            <th class="num">当前累计成本</th>
            <th class="num">累计序时预算</th>
            <th class="num">全年预算消耗率</th>
            <th class="num">序时预算执行率</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, index) => {
            return `
            <tr>
              <td><span class="rank-no ${v121RankBadgeClass(index)}">${String(index + 1).padStart(2, "0")}</span></td>
              <td><strong>${row.project.shortName}</strong><div class="section-note">${PROJECT_BUDGETS[row.project.id] ? PROJECT_BUDGETS[row.project.id].budgetName : row.project.fullName}</div></td>
              <td class="num">${moneyWan(row.annualBudget)}</td>
              <td class="num">${moneyWan(row.cumulativeActual)}</td>
              <td class="num">${moneyWan(row.sequenceBudget)}</td>
              <td class="num">${renderBudgetRate(row.annualBudgetRatio, "全年消耗")}</td>
              <td class="num">${renderBudgetRate(row.sequenceBudgetRatio, "序时执行")}</td>
              <td><span class="budget-status-pill ${row.status.className}">${row.status.label}</span></td>
                <td><button class="plain-link detail-link" data-action="project-month" data-project="${row.project.id}" data-month="${month}">查看项目画像</button></td>
            </tr>
          `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderBudgetRate(value, label = "") {
  const width = Math.min(130, Math.max(3, value * 100));
  const status = budgetStatus(value);
  return `
    <span class="budget-rate-cell">
      <strong>${percent(value)}</strong>
      <span class="budget-rate-track" aria-label="${label}">
        <i class="${status.className}" style="width:${width}%"></i>
      </span>
    </span>
  `;
}

function renderMonthCategoryCard(main, byMain, total) {
  const active = state.monthCategoryFilter === main && !state.monthSubjectKey;
  return `
    <button class="month-category-card ${active ? "is-active" : ""}" data-action="month-category" data-main="${main}">
      <span>${main}</span>
      <strong>${moneyWan(byMain[main])}</strong>
      <em>${percent(byMain[main] / Math.max(1, total))}</em>
      <span class="ratio-track"><span class="ratio-${MAIN_CLASS[main]}" style="width:${(byMain[main] / Math.max(1, total)) * 100}%"></span></span>
    </button>
  `;
}

function renderMonthConclusion(month, summary, previousSummary, projectRows, topSubject, activities) {
  const topProject = projectRows[0] || { project: PROJECTS[0], total: 0 };
  const topProjects = projectRows.slice(0, 2);
  const topProjectShare = topProjects.reduce((sum, row) => sum + row.total, 0) / Math.max(1, summary.total);
  const topSubjects = summary.subjectRanking.slice(0, 2);
  const firstLine = previousSummary
    ? `本月总成本 ${moneyWan(summary.total)}，较上月${changeVerb(summary.total - previousSummary.total)} ${moneyWan(Math.abs(summary.total - previousSummary.total))}。`
    : `本月总成本 ${moneyWan(summary.total)}，为分析期首月。`;
  const lines = [
    firstLine,
    `成本主要集中在 ${topProjects.map((row) => row.project.shortName).join("、") || topProject.project.shortName} 项目，合计占比 ${percent(topProjectShare)}。`,
    `主要成本科目为 ${topSubjects.map((row) => row.name).join("、") || topSubject.name}，建议结合项目页继续下钻。`,
  ];
  return `
    <ol class="month-conclusion-list">
      ${lines.slice(0, 3).map((line) => `<li>${line}</li>`).join("")}
    </ol>
  `;
}

function renderMonthChangeDiagnosis(month, summary, previousSummary, trendData, monthAverage, projectId = "") {
  const averageDelta = summary.total - monthAverage;
  const changes = getMonthProjectChangeContributions(month, projectId).slice(0, 3);
  return `
    <div class="month-diagnosis-grid">
      <div class="month-trend-panel">
        <div class="mini-panel-title">1-5月总成本趋势</div>
        ${renderMonthTrendStrip(trendData, month, projectId)}
      </div>
      <div class="month-diagnosis-panel">
        <div class="month-change-summary">
          <div>
            <span>较上月</span>
            <strong>${previousSummary ? signedMoneyWan(summary.total - previousSummary.total) : "基准月"}</strong>
            <small>${previousSummary ? `${changeVerb(summary.total - previousSummary.total)} ${percent(Math.abs(summary.total - previousSummary.total) / Math.max(1, previousSummary.total))}` : "分析期首月"}</small>
          </div>
          <div>
            <span>较1-5月均值</span>
            <strong>${signedMoneyWan(averageDelta)}</strong>
            <small>${changeVerb(averageDelta)} ${percent(Math.abs(averageDelta) / Math.max(1, monthAverage))}</small>
          </div>
        </div>
        <div class="mini-panel-title">本月变化贡献TOP3</div>
        <div class="month-change-list">
          ${previousSummary
            ? changes.map((item) => `
              <div class="month-change-card">
                <strong>${item.project.shortName}${changeVerb(item.delta)} ${moneyWan(Math.abs(item.delta))}</strong>
                <span>主要参考 ${item.topSubject.name} / ${item.topSubject.main} 的本月金额变化。</span>
              </div>
            `).join("")
            : `<div class="month-change-card"><strong>本月为基准月</strong><span>后续月份将以本月作为环比对照。</span></div>`}
        </div>
      </div>
    </div>
  `;
}

function renderMonthTrendStrip(trendData, currentMonth, projectId = "") {
  const max = Math.max(...trendData.map((item) => item.total), 1);
  return `
    <div class="month-trend-strip">
      ${trendData.map((item) => `
        <button class="month-trend-item ${item.month === currentMonth ? "is-current" : ""}" data-action="${projectId ? "profile-month-report" : "home-trend-month"}" data-project="${projectId}" data-month="${item.month}">
          <span>${item.short}</span>
          <strong>${moneyWan(item.total)}</strong>
          <em style="width:${Math.max(8, (item.total / max) * 100)}%"></em>
        </button>
      `).join("")}
    </div>
    <div class="month-trend-print-list" aria-hidden="true">
      ${trendData.map((item) => `
        <div class="month-trend-print-row ${item.month === currentMonth ? "is-current" : ""}">
          <span>${item.short}</span>
          <strong>${moneyWan(item.total)}</strong>
          <em><i style="width:${Math.max(8, (item.total / max) * 100)}%"></i></em>
        </div>
      `).join("")}
    </div>
  `;
}

function renderMonthSubjectRanking(rows, total, month) {
  if (!rows.length) return renderV121EmptyState("当前筛选条件下无科目数据。");
  const max = Math.max(...rows.map((row) => row.amount), 1);
  return `
    <div class="month-subject-list">
      ${rows.map((row, index) => `
        <button class="month-subject-row ${state.monthSubjectKey === row.subjectKey ? "is-active" : ""}" data-action="month-subject" data-key="${row.subjectKey}">
          <span class="rank-no ${v121RankBadgeClass(index)}">${String(index + 1).padStart(2, "0")}</span>
          <span class="subject-name"><strong>${row.name}</strong><small>${row.main}</small></span>
          <span class="subject-projects"><small>主要贡献项目</small><strong>${getSubjectProjectContributors(month, row.subjectKey).slice(0, 2).map((item) => item.project.shortName).join("、") || "-"}</strong></span>
          <span class="rank-bar-track"><span class="rank-bar" style="width:${(row.amount / max) * 100}%"></span></span>
          <span class="rank-value"><strong>${moneyWan(row.amount)}</strong><small>${percent(row.amount / Math.max(1, total))}</small></span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderMonthProjectContribution(rows, month, total, focusMain = "") {
  if (!rows.length) return renderV121EmptyState("当前筛选条件下无项目数据。");
  const visibleRows = state.monthProjectsExpanded ? rows : rows.slice(0, 8);
  const hiddenRows = rows.slice(8);
  return `
    <div class="month-project-contrib-list">
      ${visibleRows.map((row, index) => renderMonthProjectContributionRow(row, index, month, total, focusMain)).join("")}
      ${!state.monthProjectsExpanded && hiddenRows.length ? renderOtherProjectContributionRow(hiddenRows, month, total, focusMain) : ""}
    </div>
    ${hiddenRows.length ? `<div class="rank-toggle-row"><button class="btn" data-action="month-toggle-projects">${state.monthProjectsExpanded ? "收起项目" : "展开全部项目"}</button></div>` : ""}
  `;
}

function renderMonthProjectContributionRow(row, index, month, total, focusMain = "") {
  const ratios = getMainRatios(row.byMain);
  const topSubject = getProjectTopSubject(month, row.project.id);
  return `
    <div class="month-project-contrib-row">
      <div class="project-contrib-rank ${v121RankBadgeClass(index)}">${String(index + 1).padStart(2, "0")}</div>
      <div class="project-contrib-main">
        <button class="plain-link project-contrib-name" data-action="project-month" data-project="${row.project.id}" data-month="${month}">${row.project.shortName}</button>
        <small>${row.project.fullName}</small>
      </div>
      <div class="project-contrib-amount">
        <strong>${moneyWan(row.total)}</strong>
        <small>占比 ${percent(row.total / Math.max(1, total))}</small>
      </div>
      <div class="project-contrib-structure">
        ${renderMainStructureTrack(ratios, focusMain)}
        <small>固定 ${percent(ratios.固定成本)} · 变动 ${percent(ratios.变动成本)} · 管理 ${percent(ratios.管理费用)}</small>
      </div>
      <div class="project-contrib-subject">
        <span>最高科目</span>
        <strong>${topSubject.name}</strong>
        <small>${moneyWan(topSubject.amount)}</small>
      </div>
      <button class="btn ghost" data-action="project-month" data-project="${row.project.id}" data-month="${month}">查看项目画像</button>
    </div>
  `;
}

function renderOtherProjectContributionRow(rows, month, total, focusMain = "") {
  const byMain = rows.reduce((acc, row) => {
    Object.keys(MAIN_CLASS).forEach((main) => acc[main] += row.byMain[main] || 0);
    return acc;
  }, { 固定成本: 0, 变动成本: 0, 管理费用: 0 });
  const otherTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const ratios = getMainRatios(byMain);
  const topSubject = getTopSubjectForProjects(month, rows.map((row) => row.project.id));
  return `
    <div class="month-project-contrib-row is-other">
      <div class="project-contrib-rank">其他</div>
      <div class="project-contrib-main">
        <span class="project-contrib-name is-static">其他项目合计</span>
        <small>第9名及以后共 ${rows.length} 个项目</small>
      </div>
      <div class="project-contrib-amount">
        <strong>${moneyWan(otherTotal)}</strong>
        <small>占比 ${percent(otherTotal / Math.max(1, total))}</small>
      </div>
      <div class="project-contrib-structure">
        ${renderMainStructureTrack(ratios, focusMain)}
        <small>固定 ${percent(ratios.固定成本)} · 变动 ${percent(ratios.变动成本)} · 管理 ${percent(ratios.管理费用)}</small>
      </div>
      <div class="project-contrib-subject">
        <span>最高科目</span>
        <strong>${topSubject.name}</strong>
        <small>${moneyWan(topSubject.amount)}</small>
      </div>
      <span class="section-note">展开查看项目</span>
    </div>
  `;
}

function renderMainStructureTrack(ratios, focusMain = "") {
  return `
    <span class="ratio-track" title="固定 ${percent(ratios.固定成本)} / 变动 ${percent(ratios.变动成本)} / 管理 ${percent(ratios.管理费用)}">
      <span class="ratio-fixed ${focusMain === "固定成本" ? "is-focused" : ""}" style="width:${ratios.固定成本 * 100}%"></span>
      <span class="ratio-variable ${focusMain === "变动成本" ? "is-focused" : ""}" style="width:${ratios.变动成本 * 100}%"></span>
      <span class="ratio-manage ${focusMain === "管理费用" ? "is-focused" : ""}" style="width:${ratios.管理费用 * 100}%"></span>
    </span>
  `;
}

function renderProjectSubjectMatrix(month, projectRows, subjectRows) {
  if (!projectRows.length || !subjectRows.length) return renderV121EmptyState("当前月份无可展开的项目科目矩阵数据。");
  const cells = [];
  projectRows.forEach((projectRow) => {
    subjectRows.forEach((subjectRow) => {
      cells.push(getSubjectAmountForProject(month, projectRow.project.id, subjectRow.subjectKey));
    });
  });
  const max = Math.max(...cells, 1);
  return `
    <div class="matrix-legend">颜色越深表示该项目在该科目下金额越高。</div>
    <div class="month-matrix-wrap">
      <table class="month-matrix-table">
        <thead>
          <tr>
            <th>项目</th>
            ${subjectRows.map((subject) => `
              <th><button class="matrix-head-btn" data-action="month-subject" data-key="${subject.subjectKey}">${subject.name}<small>${subject.main}</small></button></th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${projectRows.map((projectRow) => `
            <tr>
              <th><button class="matrix-project-btn" data-action="project-month" data-project="${projectRow.project.id}" data-month="${month}">${projectRow.project.shortName}<small>${moneyWan(projectRow.total)}</small></button></th>
              ${subjectRows.map((subject) => {
                const amount = getSubjectAmountForProject(month, projectRow.project.id, subject.subjectKey);
                const level = amount / max;
                return `
                  <td>
                    <button class="month-matrix-cell" data-action="month-matrix-cell" data-project="${projectRow.project.id}" data-key="${subject.subjectKey}" style="background:${heatColor(level)};color:${heatTextColor(level)}">
                      <strong>${amount ? moneyWan(amount) : "-"}</strong>
                      <span>${amount ? percent(amount / Math.max(1, projectRow.total)) : ""}</span>
                    </button>
                  </td>
                `;
              }).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMonthActivityModule(activities) {
  if (!activities.length) return renderV121EmptyState("当前月份无匹配活动样本。");
  return `
    <div class="table-wrap">
      <table class="matrix-table">
        <thead>
          <tr>
            <th>活动名称</th>
            <th>所属项目</th>
            <th class="num">活动成本</th>
            <th class="num">占项目当月成本</th>
            <th>主要成本项</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${activities.map((activity) => `
            <tr>
              <td><strong>${activity.name}</strong><div class="section-note">${activity.activityType} · ${activity.monthLabel}</div></td>
              <td>${activity.projectName}</td>
              <td class="num">${moneyWan(activity.totalCost)}</td>
              <td class="num">${percent(activity.costRatio)}</td>
              <td>${activity.topItems.slice(0, 3).map((item) => item.name).join("、")}</td>
              <td><button class="plain-link detail-link" data-action="activity-open" data-activity="${activity.activityId}">查看活动</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMonthManagementFocus(summary, activities) {
  const topProjects = summary.projectRanking.slice(0, 2);
  const projectShare = topProjects.reduce((sum, row) => sum + row.total, 0) / Math.max(1, summary.total);
  const topSubjects = summary.subjectRanking.slice(0, 2);
  const topActivity = activities[0] || null;
  const lines = [
    `成本集中项目：${topProjects.map((row) => row.project.shortName).join("、")} 合计占比 ${percent(projectShare)}，建议关注其成本结构变化。`,
    `重点成本科目：${topSubjects.map((row) => row.name).join("、")} 金额较高，建议进入项目页核查合同和供应商。`,
    topActivity
      ? `活动解释：本月活动成本主要集中在 ${topActivity.name}，建议结合活动复盘判断投入产出。`
      : "活动解释：本月无重点活动样本，建议关注项目日常运营成本构成。",
  ];
  return `
    <ul class="management-focus-list">
      ${lines.slice(0, 3).map((line) => `<li>${line}</li>`).join("")}
    </ul>
  `;
}

function renderMonthReviewActions(summary, activities, selectedProject = null) {
  const topProject = selectedProject || (summary.projectRanking[0] && summary.projectRanking[0].project) || PROJECTS[0];
  const topSubject = summary.subjectRanking[0] || { name: "重点科目", amount: 0 };
  const topActivity = activities[0] || null;
  const lines = [
    `${topProject.shortName}建议复核 ${topSubject.name} 的合同范围、结算依据和本月入账节奏。`,
    topActivity
      ? `围绕 ${topActivity.name} 核对活动投入、供应商服务范围和活动复盘结论。`
      : "本月无重点活动样本，建议重点复核日常运营成本的稳定性和周期性。",
    "对本月高金额明细抽样复核供应商、合同、结算和付款链路，确认金额归集完整。",
  ];
  return `
    <ol class="month-review-actions">
      ${lines.map((line) => `<li>${line}</li>`).join("")}
    </ol>
  `;
}

function renderMonthDetailTable(rows, total, scopeText = "全部成本") {
  if (!state.monthDetailVisible) {
    return `<div class="folded-table-note">可展开查看本月项目、主类、一级科目维度的成本摘要。</div>`;
  }
  const visible = state.monthDetailExpanded ? rows : rows.slice(0, 10);
  if (!visible.length) return renderV121EmptyState("当前筛选条件下无可展开的成本摘要。");
  return `
    <div class="table-scope-note">当前摘要口径：${scopeText}</div>
    <div class="table-wrap">
      <table class="matrix-table">
        <thead>
          <tr>
            <th>项目</th>
            <th>主类</th>
            <th>一级科目</th>
            <th class="num">金额</th>
            <th class="num">占比</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${visible.map((row) => `
            <tr>
              <td>${row.project.shortName}</td>
              <td>${row.main}</td>
              <td>${row.l1}</td>
              <td class="num">${moneyWan(row.amount)}</td>
              <td class="num">${percent(row.amount / Math.max(1, total))}</td>
              <td><button class="plain-link detail-link" data-action="month-subject" data-key="${row.subjectKey}">筛选科目</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ${rows.length > visible.length ? `<div class="table-limit-note">当前展示前 ${visible.length}/${rows.length} 条摘要。</div>` : ""}
  `;
}

function detailToggleLabel(rowCount) {
  if (!state.monthDetailVisible) return "展开明细摘要";
  if (!state.monthDetailExpanded && rowCount > 10) return "展开更多";
  return "收起摘要";
}

function safeDisplay(value) {
  if (value === undefined || value === null || value === "" || Number.isNaN(value)) return "-";
  return String(value);
}

function sourceSystemDisplay(record = {}) {
  if (record.sourceSystem === "finance") return "财务一体化";
  if (record.sourceSystem === "allocation") return "分摊生成";
  return "NC";
}

function detailTraceSummary(record = {}) {
  const source = sourceSystemDisplay(record);
  if (record.sourceSystem === "finance") {
    return `财务一体化：单据 ${safeDisplay(record.docNo || record.settlementNo)}；凭证 ${safeDisplay(record.voucherNo)}；摘要 ${safeDisplay(record.summary)}`;
  }
  if (record.sourceSystem === "allocation") {
    return `分摊生成：固定成本池 ${safeDisplay(record.fixedPoolId)}；分摊明细 ${safeDisplay(record.allocationLineId)}；分摊依据 ${safeDisplay(record.allocationBasis)}`;
  }
  return `${source}：供应商 ${safeDisplay(record.supplier)}；合同 ${safeDisplay(record.contractName)}；清单项 ${safeDisplay(record.activityCostItem || record.costItemName)}；工程量 ${safeDisplay(record.measureQty || record.quantity)}${safeDisplay(record.measureUnit || record.unit)}；进度结算 ${safeDisplay(record.settlementNo)}；付款 ${safeDisplay(record.paymentNo)}`;
}

function benchmarkReferenceText(row = {}, referenceRange = null) {
  const range = referenceRange && referenceRange.unit === row.unit ? referenceRange : calculateBenchmarkReferenceRange({
    benchmarkRows: getCurrentUnitBenchmarkRows(),
    costItem: row.normalizedName,
    unit: row.unit,
    projectFilter: state.benchmark.projectScope,
    monthRange: state.benchmark.month,
  });
  if (range && range.hasRange) {
    return `${formatUnitPrice(range.low, range.unit)} - ${formatUnitPrice(range.high, range.unit)}`;
  }
  if (range) {
    return range.message;
  }
  if (row.lowerBound && row.upperBound && row.unit) {
    return `${formatUnitPrice(row.lowerBound, row.unit)} - ${formatUnitPrice(row.upperBound, row.unit)}`;
  }
  return getBenchmarkReferenceRange(row.normalizedName || row.costItemName || "");
}

function benchmarkReferenceMethodText(referenceRange = null) {
  if (!referenceRange) return "基于当前筛选下同成本项、同单位、可对标样本计算。";
  if (!referenceRange.hasRange) {
    return `当前仅有 ${referenceRange.projectCount} 个可比项目，样本不足，仅供参考。`;
  }
  return `基于当前筛选下 ${referenceRange.projectCount} 个项目同单位样本 ${referenceRange.method} 分位区间。`;
}

function v1394TraceValue(record, key) {
  if (!record) return "";
  if (key === "project") return record.projectName || record.projectFullName || "";
  if (key === "activity") return record.activityName || "未关联活动";
  if (key === "subject") return record.subjectPath || record.l1 || record.main || "";
  if (key === "supplier") return record.supplier || "";
  if (key === "contract") return record.contractName || v116SafeNcField(record.contractNo) || "";
  if (key === "settlement") return v116SafeNcField(record.settlementNo) || "";
  if (key === "payment") return v116SafeNcField(record.paymentNo) || "";
  return "";
}

function v1394IsDirectTraceRecord(record) {
  return record && record.factType !== "allocated_cost" && record.allocated !== true && record.directCollected !== false;
}

function v1394AggregateTrace(records, key) {
  const groups = new Map();
  records.forEach((record) => {
    const value = v1394TraceValue(record, key) || "未匹配信息";
    if (!groups.has(value)) groups.set(value, { name: value, amount: 0, count: 0 });
    const group = groups.get(value);
    group.amount += Number(record.amount || 0);
    group.count += 1;
  });
  return Array.from(groups.values()).sort((a, b) => b.amount - a.amount || b.count - a.count);
}

function renderV1394TraceChain(records, options = {}) {
  const allRecords = Array.isArray(records) ? records : [];
  const directRecords = allRecords.filter(v1394IsDirectTraceRecord);
  const allocatedRecords = allRecords.filter((record) => !v1394IsDirectTraceRecord(record));
  const traceRecords = directRecords;
  const steps = [
    { key: "project", label: "项目", note: "成本归属" },
    { key: "activity", label: "活动", note: "业务场景" },
    { key: "subject", label: "科目", note: "管理分类" },
    { key: "supplier", label: "供应商", note: "履约主体" },
    { key: "contract", label: "合同", note: "合同依据" },
    { key: "settlement", label: "结算", note: "结算单据" },
    { key: "payment", label: "付款", note: "付款追踪" },
  ];
  const selectedKey = options.traceStage || (state.detail && state.detail.traceStage) || "project";
  const selectedIndex = Math.max(0, steps.findIndex((step) => step.key === selectedKey));
  const selectedStep = steps[selectedIndex] || steps[0];
  const directAmount = sumRecords(traceRecords);
  const allocatedAmount = Number(options.activityAllocatedCost || 0) || sumRecords(allocatedRecords);
  const selectedRows = v1394AggregateTrace(traceRecords, selectedStep.key);
  const selectedTop = selectedRows[0];
  const stepCards = steps.map((step, index) => {
    const isActive = index === selectedIndex;
    const isPassed = index <= selectedIndex;
    const stepRows = v1394AggregateTrace(traceRecords, step.key);
    return `
      <button class="trace-step-card ${isActive ? "is-active" : ""} ${isPassed ? "is-passed" : ""}" type="button" data-action="trace-stage" data-stage="${step.key}" aria-label="查看${escapeHtml(step.label)}层级">
        <span class="trace-step-index">${index + 1}</span>
        <span class="trace-step-main">
          <strong>${escapeHtml(step.label)}</strong>
          <em>${escapeHtml(step.note)}</em>
        </span>
        <span class="trace-step-count">${stepRows.length}项</span>
      </button>
    `;
  }).join("");
  const detailRows = selectedRows.slice(0, 4).map((row) => `
    <div class="trace-stage-row">
      <span>${escapeHtml(row.name)}</span>
      <strong>${moneyWan(row.amount)}</strong>
      <em>${row.count}笔</em>
    </div>
  `).join("");
  const title = options.title || "穿透可溯源链路";
  const scope = options.scopeText || "当前筛选范围";
  return `
    <section class="v1394-trace-chain ${options.compact ? "is-compact" : ""}">
      <div class="trace-chain-head">
        <div>
          <span class="trace-eyebrow">记忆点A · 穿透可溯源</span>
          <h2>${escapeHtml(title)}</h2>
          <p>一笔成本沿“项目 → 活动 → 科目 → 供应商 → 合同 → 结算 → 付款”逐级查看，直接归集与分摊参考分开表达。</p>
        </div>
        <div class="trace-chain-proof">
          <span>直接归集</span><strong>${traceRecords.length}笔</strong><em>${moneyWan(directAmount)}</em>
        </div>
        <div class="trace-chain-proof is-muted">
          <span>分摊参考</span><strong>${allocatedRecords.length ? `${allocatedRecords.length}笔` : "单独说明"}</strong><em>${moneyWan(allocatedAmount)}</em>
        </div>
      </div>
      <div class="trace-chain-body">
        <div class="trace-chain-visual">
          <div class="trace-chain-step-list" role="list" aria-label="成本七级穿透链路">
            ${stepCards}
          </div>
        </div>
        <aside class="trace-stage-panel">
          <span>${escapeHtml(scope)}</span>
          <h3>${escapeHtml(selectedStep.label)}层级数据</h3>
          <p>${selectedTop ? `${escapeHtml(selectedTop.name)}贡献${moneyWan(selectedTop.amount)}，共${selectedTop.count}笔。` : "当前筛选下没有直接归集明细，分摊金额已单独列示，不混入逐笔链路。"}</p>
          <div class="trace-stage-list">
            ${detailRows || `<div class="trace-stage-row is-empty"><span>无直接归集明细</span><strong>单独复核</strong><em>0笔</em></div>`}
          </div>
        </aside>
      </div>
      <div class="trace-chain-note">口径说明：七级链路只承载可逐笔追溯的直接归集明细；分摊参考用于解释活动成本，不重复进入逐笔追溯链路。</div>
    </section>
  `;
}

function renderDetails() {
  const detail = state.detail;
  if (typeof detail.query === "string" && detail.query.startsWith("__NO_MATCH")) {
    detail.query = "";
    detail.page = 1;
    detail.selectedId = "";
  }
  const project = detail.projectId === "all"
    ? { id: "all", shortName: "全部项目", fullName: "全部项目" }
    : getProject(detail.projectId);
  const subject = subjectIndex[detail.subjectKey] || null;
  const records = filterLedgerRecords({
    projectId: detail.projectId,
    month: detail.month,
    subjectKey: detail.subjectKey,
    benchmarkItem: detail.benchmarkItem,
    activityId: detail.activityId,
    activityCostItem: detail.activityCostItem,
    directActivityOnly: detail.directActivityOnly,
    ncRecordIds: detail.ncRecordIds,
    query: detail.query,
  }).sort((a, b) => detail.sort === "asc" ? a.amount - b.amount : b.amount - a.amount);
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  if (detail.page > pageCount) detail.page = pageCount;
  const pageRecords = records.slice((detail.page - 1) * pageSize, detail.page * pageSize);
  const activity = detail.activityId ? getActivityById(detail.activityId) : null;
  const subjectLabel = detail.unitBenchmarkName || detail.activityCostItem || detail.benchmarkItem || (subject ? subject.pathText : "全部科目");
  const sourceLine = `来源：${project.shortName} / ${monthLabel(detail.month)}${activity ? ` / ${activity.name}` : ""} / ${subjectLabel} / ${activity ? "直接归集NC明细" : "NC明细、结算和付款辅助信息"}`;
  const breadcrumbItems = detail.returnView === "profile"
    ? [
      { label: "首页总览", action: "nav", data: { view: "home" } },
      { label: "项目画像", action: "profile-open", data: { project: project.id } },
      { label: project.shortName, action: "profile-open", data: { project: project.id } },
      ...(detail.month !== "all" ? [{ label: monthLabel(detail.month), disabled: true }] : []),
      ...(subject && detail.subjectKey ? [{ label: subject.pathText || subject.name || subject.key, disabled: true }] : []),
    ]
    : [
      { label: "首页总览", action: "nav", data: { view: "home" } },
      detail.projectId === "all" ? { label: "全项目明细", disabled: true } : { label: "项目画像", action: "profile-open", data: { project: project.id } },
      detail.projectId === "all" ? { label: project.shortName, disabled: true } : { label: project.shortName, action: "profile-open", data: { project: project.id } },
      { label: monthLabel(detail.month), disabled: true },
    ];
  if (activity) {
    breadcrumbItems.push({ label: activity.name, action: "activity-open", data: { activity: activity.activityId } });
    breadcrumbItems.push({ label: "成本明细", current: true });
  } else {
    breadcrumbItems.push({ label: "NC成本明细", current: true });
  }

  return `
    <div class="page-title-row">
      <div>
        ${renderBreadcrumb(breadcrumbItems)}
        <h1 class="page-title">成本明细追溯</h1>
        <p class="page-subtitle">成本明细追溯：${activity ? "当前活动仅列示直接归集NC明细，分摊成本在活动总成本中说明。" : "覆盖NC明细、结算和付款辅助信息。"}${project.shortName} / ${monthLabel(detail.month)}${activity ? ` / ${activity.name}` : ""} / ${subjectLabel}</p>
        <div class="source-trace">${sourceLine}</div>
        <div class="status-line">
          <span class="condition-pill">当前筛选已匹配 ${records.length} 笔 NC 明细</span>
          ${detail.unitBenchmarkName ? `<span class="condition-pill">来源：重点成本项单价对标</span>` : ""}
          <span class="condition-pill">项目：${project.fullName}</span>
          <span class="condition-pill">月份：${monthLabel(detail.month)}</span>
          ${activity ? `<span class="condition-pill">活动：${activity.name}</span>` : ""}
          ${activity ? `<span class="condition-pill">明细口径：直接归集NC明细</span>` : ""}
          ${detail.unitBenchmarkName ? `<span class="condition-pill">成本项：${detail.unitBenchmarkName}</span>` : ""}
          ${detail.unitBenchmarkUnit ? `<span class="condition-pill">单位：${detail.unitBenchmarkUnit}</span>` : ""}
          ${detail.unitBenchmarkName ? `<span class="condition-pill">当前筛选NC笔数：${records.length}笔</span>` : ""}
          <span class="condition-pill">科目：${subjectLabel}</span>
          <span class="condition-pill">数据来源：${activity ? "NC直接归集样本" : "NC明细及辅助追溯信息"}</span>
        </div>
      </div>
      <div class="page-actions">
        <button class="btn ghost" data-action="return-source">返回上一级</button>
      </div>
    </div>

    ${renderV1394TraceChain(records, {
      traceStage: detail.traceStage,
      title: activity ? "活动NC明细七级穿透链" : "NC明细七级穿透链",
      scopeText: `${project.shortName} / ${monthLabel(detail.month)} / ${subjectLabel}`,
      activityAllocatedCost: activity ? Math.max(0, Number(activity.totalCost || 0) - sumRecords(records)) : 0,
    })}

    <section class="section">
      <div class="detail-filter-bar">
        <div class="field">
          <label for="detailProject">项目筛选</label>
          <select id="detailProject" data-action="detail-project">
            <option value="all" ${detail.projectId === "all" ? "selected" : ""}>全部项目</option>
            ${PROJECTS.map((item) => `<option value="${item.id}" ${item.id === detail.projectId ? "selected" : ""}>${item.shortName}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="detailMonth">月份筛选</label>
          <select id="detailMonth" data-action="detail-month">
            ${MONTH_OPTIONS.map((item) => `<option value="${item.value}" ${String(detail.month) === item.value ? "selected" : ""}>${item.label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="detailSubject">科目筛选</label>
          <select id="detailSubject" data-action="detail-subject-filter">
            <option value="" ${!detail.subjectKey ? "selected" : ""}>全部科目</option>
            ${ACTIVITY_COST_OPTIONS.filter((item) => item !== "全部").map((item) => `<option value="activity:${item}" ${detail.activityCostItem === item ? "selected" : ""}>${item}</option>`).join("")}
            ${BENCHMARK_ITEMS.map((item) => `<option value="benchmark:${item.name}" ${detail.benchmarkItem === item.name ? "selected" : ""}>${item.name}</option>`).join("")}
            ${flatSubjects.filter((item) => item.level <= 1).map((item) => `<option value="${item.key}" ${item.key === detail.subjectKey ? "selected" : ""}>${item.pathText}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="detailActivity">活动名称</label>
          <select id="detailActivity" data-action="detail-activity">
            <option value="" ${!detail.activityId ? "selected" : ""}>全部活动</option>
            ${ACTIVITIES.filter((item) => !detail.projectId || detail.projectId === "all" || item.projectId === detail.projectId).map((item) => `<option value="${item.activityId}" ${item.activityId === detail.activityId ? "selected" : ""}>${item.monthLabel} · ${item.name}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="detailSearch">供应商、合同名称或编号搜索</label>
          <input id="detailSearch" data-action="detail-query" value="${escapeHtml(detail.query)}" placeholder="输入供应商、合同名称、合同编号" />
        </div>
        <div class="field">
          <label for="detailSort">金额排序</label>
          <select id="detailSort" data-action="detail-sort">
            <option value="desc" ${detail.sort === "desc" ? "selected" : ""}>金额从高到低</option>
            <option value="asc" ${detail.sort === "asc" ? "selected" : ""}>金额从低到高</option>
          </select>
        </div>
      </div>

      <div class="detail-layout detail-layout-full">
        <div class="detail-table-stack">
          ${renderDetailTable(pageRecords)}
          ${records.length ? `
            <div class="pager">
              <span>共${records.length}笔，第${detail.page}/${pageCount}页</span>
              <button class="btn" data-action="detail-page" data-page="${Math.max(1, detail.page - 1)}">上一页</button>
              <button class="btn" data-action="detail-page" data-page="${Math.min(pageCount, detail.page + 1)}">下一页</button>
            </div>
          ` : `<div class="pager detail-empty-pager"><span>共0笔</span></div>`}
        </div>
      </div>
    </section>
  `;
}

function renderDetailTable(records) {
  if (!records.length) {
    return `<div class="empty-state v12-empty-state v127-detail-empty"><span>当前筛选条件下无匹配台账记录。</span><small>可调整项目、月份、科目或搜索关键词后重试。</small></div>`;
  }
  const rows = records.map((record) => {
    const unitItem = unitCostForRecord(record.id);
    return `
      <tr class="${state.detail.selectedId === record.id ? "is-selected" : ""}" data-action="select-record" data-id="${record.id}">
        <td><button class="plain-link" data-action="select-record" data-id="${record.id}">${renderProjectToken(record.projectName)}</button></td>
        <td>${record.costMonth}</td>
        <td>${record.occurDate}</td>
        <td>${record.postDate}</td>
        <td>${record.subjectPath}</td>
        <td>${unitItem ? unitItem.normalizedName : record.activityCostItem || record.benchmarkItem || record.l1}</td>
        <td class="num">${moneyWan(record.amount)}</td>
        <td>${record.supplier}</td>
        <td>${unitItem ? unitItem.unit : record.measureUnit || "-"}</td>
        <td><button class="plain-link detail-link" data-action="select-record" data-id="${record.id}">查看单笔</button></td>
      </tr>
    `;
  }).join("");
  return `
    <div class="table-wrap">
      <table class="data-table detail-ledger-table">
        <thead>
          <tr>
            <th>项目名称</th>
            <th>成本月份</th>
            <th>成本发生日期</th>
            <th>入账日期</th>
            <th>成本科目</th>
            <th>成本项</th>
            <th class="num">金额</th>
            <th>供应商</th>
            <th>单位</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderSingleRecordDetailDrawer() {
  if (state.view !== "details" || !state.detail.selectedId) return "";
  const record = getAllLedgerRecords().find((item) => item.id === state.detail.selectedId);
  if (!record) return "";
  const unitItem = unitCostForRecord(record.id);
  const title = unitItem ? unitItem.normalizedName : record.activityCostItem || record.benchmarkItem || record.l3 || record.l2 || record.l1 || "成本明细";
  return `
    <div class="detail-drawer-backdrop" data-action="single-detail-close" aria-hidden="true"></div>
    <aside class="detail-drawer single-record-drawer" role="dialog" aria-label="单笔详情">
      <div class="drawer-head">
        <div>
          <span>单笔详情</span>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <button class="drawer-close" data-action="single-detail-close" aria-label="关闭单笔详情">×</button>
      </div>
      ${renderSingleRecordDetailBody(record)}
    </aside>
  `;
}

function renderSingleRecordDetailBody(record) {
  const unitItem = unitCostForRecord(record.id);
  const costItem = unitItem ? unitItem.normalizedName : record.activityCostItem || record.benchmarkItem || record.l1 || record.main || "-";
  const unit = unitItem ? unitItem.unit : record.measureUnit || "-";
  const quantity = unitItem ? `${formatQuantity(unitItem.quantity)}${unitItem.unit}` : record.measureQty || "-";
  const unitPrice = unitItem ? formatUnitPrice(unitItem.unitPrice, unitItem.unit) : record.unitCost ? `${record.unitCost.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}元/${record.measureUnit || "单位"}` : "-";
  return `
      <div class="detail-card-group">
        <div class="related-card">
          <h4>基础信息</h4>
          <dl class="info-list compact-list">
            <div class="info-row"><dt>项目</dt><dd>${renderProjectToken(record.projectFullName || record.projectName || "-")}</dd></div>
            <div class="info-row"><dt>成本月份</dt><dd>${escapeHtml(record.costMonth || "-")}</dd></div>
            <div class="info-row"><dt>活动名称</dt><dd>${escapeHtml(record.activityName || "-")}</dd></div>
            <div class="info-row"><dt>发生日期</dt><dd>${escapeHtml(record.occurDate || "-")}</dd></div>
            <div class="info-row"><dt>入账日期</dt><dd>${escapeHtml(record.postDate || "-")}</dd></div>
            <div class="info-row"><dt>成本科目</dt><dd>${escapeHtml(record.subjectPath || "-")}</dd></div>
            <div class="info-row"><dt>成本项</dt><dd>${escapeHtml(costItem)}</dd></div>
            <div class="info-row"><dt>金额</dt><dd><strong>${moneyWan(record.amount)}</strong></dd></div>
            <div class="info-row"><dt>供应商</dt><dd>${escapeHtml(record.supplier || "-")}</dd></div>
            <div class="info-row"><dt>单位</dt><dd>${escapeHtml(unit)}</dd></div>
            <div class="info-row"><dt>工程量</dt><dd>${escapeHtml(String(quantity))}</dd></div>
            <div class="info-row"><dt>单价</dt><dd>${escapeHtml(String(unitPrice))}</dd></div>
            <div class="info-row"><dt>数据来源</dt><dd>${sourceSystemDisplay(record)}</dd></div>
            <div class="info-row"><dt>来源口径</dt><dd>${record.factType === "allocated_cost" ? "按规则分摊成本" : "直接归集成本"}</dd></div>
          </dl>
        </div>
        <div class="related-card">
          <h4>合同信息</h4>
          <dl class="info-list compact-list">
            <div class="info-row"><dt>合同名称</dt><dd>${escapeHtml(record.contractName || "-")}</dd></div>
            <div class="info-row"><dt>合同编号</dt><dd><strong class="doc-text">${v116SafeNcField(record.contractNo)}</strong></dd></div>
            <div class="info-row"><dt>合同金额</dt><dd>${moneyWan(record.contractAmount)}</dd></div>
          </dl>
        </div>
        <div class="related-card">
          <h4>结算信息</h4>
          <dl class="info-list compact-list">
            <div class="info-row"><dt>结算单号</dt><dd><strong class="doc-text">${v116SafeNcField(record.settlementNo)}</strong></dd></div>
            <div class="info-row"><dt>结算月份</dt><dd>${escapeHtml(record.costMonth || "-")}</dd></div>
            <div class="info-row"><dt>结算金额</dt><dd>${moneyWan(record.amount)}</dd></div>
          </dl>
        </div>
        <div class="related-card">
          <h4>付款信息</h4>
          <dl class="info-list compact-list">
            <div class="info-row"><dt>付款单号</dt><dd><strong class="doc-text">${v116SafeNcField(record.paymentNo)}</strong></dd></div>
            <div class="info-row"><dt>付款金额</dt><dd>${moneyWan(record.amount)}</dd></div>
            <div class="info-row"><dt>关联合同</dt><dd>${v116SafeNcField(record.contractNo)}</dd></div>
          </dl>
        </div>
        <div class="related-card emphasis-card">
          <h4>成本追溯摘要</h4>
          <div>${detailTraceSummary(record)}</div>
        </div>
      </div>
  `;
}

function renderSourceBlock(title, note, cards, extraClass = "") {
  return `
    <section class="section source-v1394-block ${extraClass}">
      <div class="section-header">
        <div>
          <h2 class="section-title">${escapeHtml(title)}</h2>
          <span class="section-note">${escapeHtml(note)}</span>
        </div>
      </div>
      <div class="source-grid activity-scope-grid">
        ${cards.map((card) => `
          <div class="source-note-card">
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.text)}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderExecutiveSource() {
  const summary = getOverallSummary();
  const budgetWeight = MONTH_BUDGET_WEIGHTS
    .filter((item) => item.month <= 5)
    .reduce((sum, item) => sum + item.weight, 0);
  const timelyBudget = BUDGET_BASELINE_2026.companyAnnualCostBudgetWan * budgetWeight;
  const budgetRate = (summary.total / 10000) / BUDGET_BASELINE_2026.companyAnnualCostBudgetWan;
  const timelyRate = (summary.total / 10000) / timelyBudget;
  const implementedCards = [
    { title: "公司总览", text: "展示1—5月累计成本、5月成本、预算执行、区域分布、项目排名和重点经营结论。" },
    { title: "项目画像", text: "以项目为唯一主页，串联预算执行、成本结构、月度趋势、活动解释和明细入口。" },
    { title: "组织与科目穿透", text: "支持公司项目群、项目、成本性质、科目和明细逐层查看，也支持科目横向对比和80%集中度观察。" },
    { title: "明细追溯", text: "成本金额可追到项目、活动、科目、供应商、合同、结算和付款信息，支撑复核与说明。" },
  ];
  const boundaryCards = [
    { title: "系统边界", text: "当前不接真实NC接口，不接真实外部大模型，不作为最终财务结算系统。" },
    { title: "经营边界", text: "当前聚焦成本侧管理，不做收入、利润、GOP、开票、回款和现金流完整分析。" },
    { title: "AI边界", text: "运营成本分析助手仅生成经营复核参考，正式结论以人工复核和NC原始数据为准。" },
    { title: "展示边界", text: "本版用于汇报展示、动线验证和管理口径确认，后续真实系统接入时保持同一管理框架。" },
  ];
  const dataCards = [
    { title: "时间范围", text: "当前分析范围为2026年1—5月，首页默认按当前账号授权范围内的全量画像展示。" },
    { title: "金额口径", text: `1—5月累计成本${moneyWan(summary.total)}，5月成本${moneyWan(summary.may)}，全年预算消耗率约${percent(budgetRate)}。` },
    { title: "预算口径", text: `1—5月序时预算约${timelyBudget.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}万元，序时预算执行率约${percent(timelyRate)}。` },
    { title: "去重口径", text: "总览、月报和项目画像只计入直接归集成本；活动页可展示分摊参考，但不重复计入项目总成本。" },
    { title: "科目口径", text: "成本按固定成本、变动成本和管理费用三大类组织，下钻时继续保留下级科目和明细台账。" },
    { title: "权限口径", text: "总经理和成本管理角色查看授权范围内汇总及明细；项目角色仅查看本项目数据。" },
  ];
  const routeCards = [
    { title: "真实NC接入", text: "围绕成本发生、合同、结算、付款、供应商、科目和活动编号字段开展真实数据接入。" },
    { title: "结算线上化", text: "逐步衔接合同、清单、工程量、结算和付款流程，让复核链条从展示走向流程闭环。" },
    { title: "商务系统统一", text: "推动供应商、合同、清单、成本科目和项目活动编码统一，减少多口径人工对账。" },
    { title: "经营分析扩展", text: "在成本侧稳定后，再扩展收入、利润、GOP等经营端分析，不影响当前成本主线。" },
    { title: "安全AI辅助", text: "后续AI能力限定在授权数据、辅助草稿和复核建议范围内，避免替代人工结论。" },
  ];
  return `
    <div class="page-title-row source-title-row">
      <div>
        <h1 class="page-title">口径说明</h1>
        <p class="page-subtitle">用四块内容说明本版已经做到什么、暂时不做什么、数据怎样计算，以及后续怎么演进。</p>
      </div>
      <div class="page-actions">
        <button class="btn" data-action="nav" data-view="home">返回首页</button>
      </div>
    </div>

    <section class="section source-v1394-summary">
      <div class="kpi-grid source-kpi-grid">
        ${renderKpi("覆盖项目", `${PROJECTS.length}个`, "按当前账号权限展示")}
        ${renderKpi("成本明细", `${summary.count.toLocaleString("zh-CN")}笔`, "可继续查看单笔追溯")}
        ${renderKpi("累计成本", moneyWan(summary.total), "2026年1—5月")}
        ${renderKpi("序时预算执行率", percent(timelyRate), "按预算权重测算")}
      </div>
    </section>

    ${renderSourceBlock("本版已实现", "围绕“看得清、钻得下、追得到”形成PC端展示闭环。", implementedCards, "is-implemented")}
    ${renderSourceBlock("本版边界", "明确当前版本不是完整财务系统，也不替代人工复核。", boundaryCards, "is-boundary")}
    ${renderSourceBlock("数据口径", "所有页面围绕统一成本明细、统一权限和统一去重规则展示。", dataCards, "is-data")}
    ${renderSourceBlock("后续路线", "先把成本侧主线夯实，再进入真实系统接入和经营端扩展。", routeCards, "is-roadmap")}
  `;
}

function renderTrendChart(data, options) {
  const max = Math.max(...data.map((item) => item.total), 1);
  const domain = max * 1.18;
  const points = data.map((item, index) => {
    const x = 10 + index * 20;
    const y = 92 - (item.total / domain) * 80;
    return `${x},${y}`;
  }).join(" ");
  const actionForMonth = options.context === "home" ? "home-trend-month" : "trend-month";
  const actionForSegment = options.mode === "monthOnly" ? actionForMonth : options.context === "home" ? "home-trend-segment" : "trend-segment";
  return `
    <div class="trend-chart ${options.interactive ? "" : "is-static"}">
      <div class="chart-topline">
        <div class="chart-legend">
        ${legendItem("固定成本", "fixed")}
        ${legendItem("变动成本", "variable")}
        ${legendItem("管理费用", "manage")}
          ${legendItem("总成本折线", "line")}
        </div>
        <span class="section-note">单位：万元</span>
      </div>
      <div class="chart-plot enhanced-plot">
        <div class="y-axis-labels">
          <span>${moneyWan(domain)}</span>
          <span>${moneyWan(domain / 2)}</span>
          <span>0</span>
        </div>
        <div class="plot-field">
          <span class="grid-line top"></span>
          <span class="grid-line middle"></span>
          <span class="grid-line bottom"></span>
          <svg class="trend-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points="${points}" fill="none" stroke="var(--blue)" stroke-width="2" vector-effect="non-scaling-stroke"></polyline>
          </svg>
          <div class="trend-point-layer">
            ${data.map((item, index) => {
              const x = 10 + index * 20;
              const y = 92 - (item.total / domain) * 80;
              return `<button type="button" class="trend-point-dot" style="left:${x}%;top:${y}%" ${options.interactive ? `data-action="${actionForMonth}" data-month="${item.month}"` : ""} title="${item.label} 总成本 ${moneyWan(item.total)}"><span></span></button>`;
            }).join("")}
          </div>
          <div class="bar-grid">
            ${data.map((item) => `
              <div class="bar-column ${String(options.selectedMonth) === String(item.month) ? "is-selected" : ""}">
                <div class="bar-total">${moneyWan(item.total)}</div>
                <div class="bar-stack" style="height:${Math.max(20, (item.total / domain) * 100)}%" title="${item.label} 总成本 ${moneyWan(item.total)}">
                  ${["固定成本", "变动成本", "管理费用"].map((main) => `
                    <button class="bar-segment ${MAIN_CLASS[main]}" style="height:${Math.max(3, (item.byMain[main] / item.total) * 100)}%" ${options.interactive ? `data-action="${actionForSegment}" data-month="${item.month}" ${options.mode === "monthOnly" ? "" : `data-main="${main}"`}` : ""} title="${item.label} ${main} ${moneyWan(item.byMain[main])}"></button>
                  `).join("")}
                </div>
              </div>
            `).join("")}
          </div>
          <div class="chart-labels">
            ${data.map((item) => `<button class="${String(options.selectedMonth) === String(item.month) ? "is-selected" : ""}" ${options.interactive ? `data-action="${actionForMonth}" data-month="${item.month}"` : ""}>${item.short}</button>`).join("")}
          </div>
        </div>
      </div>
      <div class="month-summary-grid">
        ${data.map((item) => {
          const ratios = getMainRatios(item.byMain);
          return `
            <button class="month-summary-card ${String(options.selectedMonth) === String(item.month) ? "is-selected" : ""}" ${options.interactive ? `data-action="${actionForMonth}" data-month="${item.month}"` : ""}>
              <span class="month-name">${item.short}</span>
              <strong>${moneyWan(item.total)}</strong>
              <span>固定 ${percent(ratios.固定成本)}</span>
              <span>变动 ${percent(ratios.变动成本)}</span>
              <span>管理 ${percent(ratios.管理费用)}</span>
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function legendItem(label, className) {
  const color = className === "line" ? "var(--blue)" : `var(--${className})`;
  return `<span class="legend-item"><span class="legend-dot" style="background:${color}"></span>${label}</span>`;
}

function renderRanking(items, field, limit = 13, options = {}) {
  const top = items.slice(0, limit);
  const max = Math.max(...top.map((item) => item[field]), 1);
  const total = items.reduce((sum, item) => sum + item[field], 0) || 1;
  return `
    <div class="rank-list ${options.scrollable ? "is-scrollable" : ""}" ${options.scrollable ? 'tabindex="0" aria-label="项目成本排名滚动列表"' : ""}>
      ${top.map((item, index) => `
        <button class="rank-row executive-rank-row ${index < 3 ? "top-rank" : ""}" data-action="profile-open" data-project="${item.project.id}">
          <span class="rank-no ${v121RankBadgeClass(index)}">${String(index + 1).padStart(2, "0")}</span>
          <span class="rank-info"><strong>${item.project.shortName}</strong><small>${item.project.fullName}</small></span>
          <span class="rank-bar-track"><span class="rank-bar" style="width:${(item[field] / max) * 100}%"></span></span>
          <span class="rank-value"><strong>${moneyWan(item[field])}</strong><small>占比 ${percent(item[field] / total)}</small></span>
          <span class="rank-structure">
            <span class="ratio-track">
              <span class="ratio-fixed" style="width:${getMainRatios(item.byMain).固定成本 * 100}%"></span>
              <span class="ratio-variable" style="width:${getMainRatios(item.byMain).变动成本 * 100}%"></span>
              <span class="ratio-manage" style="width:${getMainRatios(item.byMain).管理费用 * 100}%"></span>
            </span>
          </span>
          <span class="rank-enter">画像</span>
        </button>
      `).join("")}
    </div>
    ${options.expandable ? `
      <div class="rank-toggle-row">
        <button class="btn" data-action="toggle-home-rank">${state.homeRankExpanded ? "收起排名" : "查看更多排名"}</button>
      </div>
    ` : ""}
  `;
}

function normalizeMonthValue(value) {
  if (typeof value === "string" && value.includes("-")) {
    return Number(value.split("-").pop());
  }
  return Number(value) || 5;
}

function getMonthRecords(month, { main = "all", subjectKey = "", projectId = "" } = {}) {
  const monthValue = normalizeMonthValue(month);
  return RECORDS.filter((record) => {
    if (record.month !== monthValue) return false;
    if (projectId && projectId !== "all" && record.projectId !== projectId) return false;
    if (main && main !== "all" && record.main !== main) return false;
    if (subjectKey && !record.pathKeys.includes(subjectKey)) return false;
    return true;
  });
}

function getMonthSummary(month, filters = {}) {
  const records = getMonthRecords(month, filters);
  const total = sumRecords(records);
  const byMain = sumsByMain(records);
  return {
    total,
    byMain,
    ratios: getMainRatios(byMain),
    projectRanking: getMonthProjectRanking(month, filters.projectId ? { projectId: filters.projectId } : {}),
    subjectRanking: getMonthSubjectRanking(month, filters),
  };
}

function getMonthProjectRanking(month, filters = {}) {
  const projectList = filters.projectId ? PROJECTS.filter((project) => project.id === filters.projectId) : PROJECTS;
  return projectList.map((project) => {
    const records = getMonthRecords(month, { ...filters, projectId: project.id });
    return {
      project,
      total: sumRecords(records),
      byMain: sumsByMain(records),
    };
  }).filter((row) => row.total > 0).sort((a, b) => b.total - a.total);
}

function getMonthSubjectRanking(month, filters = {}) {
  const rows = {};
  getMonthRecords(month, filters).forEach((record) => {
    const subjectKey = `${record.main}|${record.l1}`;
    if (!rows[subjectKey]) {
      rows[subjectKey] = {
        subjectKey,
        name: record.l1,
        main: record.main,
        amount: 0,
      };
    }
    rows[subjectKey].amount += record.amount;
  });
  return Object.values(rows).sort((a, b) => b.amount - a.amount);
}

function getMonthActivities(month, filters = {}) {
  const monthValue = normalizeMonthValue(month);
  return ACTIVITIES.filter((activity) => {
    if (activity.month !== monthValue) return false;
    if (filters.projectId && activity.projectId !== filters.projectId) return false;
    if (filters.subjectKey) {
      return ACTIVITY_RECORDS.some((record) => record.activityId === activity.activityId && record.pathKeys.includes(filters.subjectKey));
    }
    if (filters.main && filters.main !== "all") {
      return ACTIVITY_RECORDS.some((record) => record.activityId === activity.activityId && record.main === filters.main);
    }
    return true;
  }).sort((a, b) => b.totalCost - a.totalCost);
}

function getMonthDetailRows(month, filters = {}) {
  const rows = {};
  getMonthRecords(month, filters).forEach((record) => {
    const key = `${record.projectId}|${record.main}|${record.l1}`;
    if (!rows[key]) {
      rows[key] = {
        key,
        project: getProject(record.projectId),
        main: record.main,
        l1: record.l1,
        subjectKey: `${record.main}|${record.l1}`,
        amount: 0,
      };
    }
    rows[key].amount += record.amount;
  });
  return Object.values(rows).sort((a, b) => b.amount - a.amount);
}

function dominantMain(summary) {
  return Object.keys(MAIN_CLASS).map((main) => ({
    name: main,
    amount: summary.byMain[main] || 0,
  })).sort((a, b) => b.amount - a.amount)[0] || { name: "固定成本", amount: 0 };
}

function getMonthProjectChangeContributions(month, projectId = "") {
  const monthValue = normalizeMonthValue(month);
  if (monthValue <= 1) return [];
  const projectList = projectId ? PROJECTS.filter((project) => project.id === projectId) : PROJECTS;
  return projectList.map((project) => {
    const current = sumRecords(getMonthRecords(monthValue, { projectId: project.id }));
    const previous = sumRecords(getMonthRecords(monthValue - 1, { projectId: project.id }));
    return {
      project,
      current,
      previous,
      delta: current - previous,
      topSubject: getProjectTopSubject(monthValue, project.id),
    };
  }).filter((item) => item.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function getProjectTopSubject(month, projectId) {
  return getMonthSubjectRanking(month, { projectId })[0] || { name: "-", main: "-", amount: 0, subjectKey: "" };
}

function getProjectCumulativeTopSubject(projectId) {
  return getSubjectRankingFromRecords(filterRecords({ projectId }))[0] || { name: "-", main: "-", amount: 0, subjectKey: "" };
}

function getOverallSubjectRanking() {
  return getSubjectRankingFromRecords(RECORDS);
}

function getSubjectRankingFromRecords(records) {
  const rows = {};
  records.forEach((record) => {
    const subjectKey = `${record.main}|${record.l1}`;
    if (!rows[subjectKey]) {
      rows[subjectKey] = {
        subjectKey,
        name: record.l1,
        main: record.main,
        amount: 0,
      };
    }
    rows[subjectKey].amount += record.amount;
  });
  return Object.values(rows).sort((a, b) => b.amount - a.amount);
}

function getSubjectProjectContributors(month, subjectKey) {
  return PROJECTS.map((project) => ({
    project,
    amount: sumRecords(getMonthRecords(month, { projectId: project.id, subjectKey })),
  })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
}

function getSubjectAmountForProject(month, projectId, subjectKey) {
  return sumRecords(getMonthRecords(month, { projectId, subjectKey }));
}

function getTopSubjectForProjects(month, projectIds) {
  const rows = {};
  getMonthRecords(month).filter((record) => projectIds.includes(record.projectId)).forEach((record) => {
    const subjectKey = `${record.main}|${record.l1}`;
    if (!rows[subjectKey]) {
      rows[subjectKey] = {
        subjectKey,
        name: record.l1,
        main: record.main,
        amount: 0,
      };
    }
    rows[subjectKey].amount += record.amount;
  });
  return Object.values(rows).sort((a, b) => b.amount - a.amount)[0] || { name: "-", main: "-", amount: 0, subjectKey: "" };
}

function getOverallSummary() {
  return {
    total: sumRecords(RECORDS),
    may: sumRecords(filterRecords({ month: 5 })),
    count: getAllLedgerRecords().length,
    byMain: sumsByMain(RECORDS),
  };
}

function getProjectSummary(projectId) {
  const project = getProject(projectId);
  const records = filterRecords({ projectId });
  return {
    project,
    total: sumRecords(records),
    may: sumRecords(filterRecords({ projectId, month: 5 })),
    count: records.length + ACTIVITY_RECORDS.filter((record) => record.projectId === projectId).length,
    byMain: sumsByMain(records),
  };
}

function getV116HomeProjectRanking(options = {}) {
  const activeMonth = options.month || v116ActiveMonth();
  const activeCostType = options.costType || v116ActiveCostType();
  return PROJECTS.map((project) => {
    const records = filterRecords({
      projectId: project.id,
      month: activeMonth,
      subjectKey: activeCostType === "all" ? "" : activeCostType,
    });
    return {
      project,
      total: sumRecords(records),
      may: sumRecords(filterRecords({
        projectId: project.id,
        month: activeMonth === "all" ? 5 : activeMonth,
        subjectKey: activeCostType === "all" ? "" : activeCostType,
      })),
      count: records.length,
      byMain: sumsByMain(records),
    };
  }).sort((a, b) => b.total - a.total);
}

function getTrendData(records) {
  return MONTHS.map((month) => {
    const monthRecords = records.filter((record) => record.month === month);
    const byMain = sumsByMain(monthRecords);
    return {
      month,
      label: `2026年${month}月`,
      short: `${month}月`,
      total: sumRecords(monthRecords),
      byMain,
    };
  });
}

function getSubjectStats(projectId, subjectKey) {
  const currentMonth = state.month === "all" ? 5 : Number(state.month);
  const current = sumRecords(filterRecords({ projectId, month: currentMonth, subjectKey }));
  const cumulative = sumRecords(filterRecords({ projectId, subjectKey }));
  const count = filterRecords({ projectId, month: state.month, subjectKey }).length;
  const base = sumRecords(filterRecords({ projectId, month: state.month, subjectKey: scopeSubjectKey() })) || sumRecords(filterRecords({ projectId, month: state.month })) || 1;
  const value = state.month === "all" ? cumulative : sumRecords(filterRecords({ projectId, month: state.month, subjectKey }));
  return {
    current,
    cumulative,
    count,
    ratio: value / base,
  };
}

function getAllSubjectStats(projectId) {
  const currentMonth = state.month === "all" ? 5 : Number(state.month);
  const current = sumRecords(filterRecords({ projectId, month: currentMonth }));
  const cumulative = sumRecords(filterRecords({ projectId }));
  const count = filterRecords({ projectId, month: state.month }).length;
  return {
    current,
    cumulative,
    count,
    ratio: 1,
  };
}

function filterRecords({ projectId, month = "all", subjectKey = "", benchmarkItem = "", query = "" } = {}) {
  const term = query.trim();
  return RECORDS.filter((record) => {
    if (projectId && record.projectId !== projectId) return false;
    if (month !== "all" && Number(record.month) !== Number(month)) return false;
    if (benchmarkItem && record.benchmarkItem !== benchmarkItem) return false;
    if (subjectKey && !record.pathKeys.includes(subjectKey)) return false;
    if (term) {
      const text = `${record.supplier} ${record.contractName} ${record.contractNo} ${record.benchmarkItem || ""}`.toLowerCase();
      if (!text.includes(term.toLowerCase())) return false;
    }
    return true;
  });
}

function getAllLedgerRecords() {
  if (V10_COMPAT_DATA && Array.isArray(DETAIL_RECORDS) && DETAIL_RECORDS.length) return DETAIL_RECORDS;
  return [...RECORDS, ...ACTIVITY_RECORDS];
}

function filterLedgerRecords({ projectId, month = "all", subjectKey = "", benchmarkItem = "", activityId = "", activityCostItem = "", directActivityOnly = false, ncRecordIds = [], query = "" } = {}) {
  const term = query.trim().toLowerCase();
  const ncRecordSet = new Set(ncRecordIds || []);
  return getAllLedgerRecords().filter((record) => {
    if (ncRecordSet.size) {
      if (!ncRecordSet.has(record.id)) return false;
      if (term) {
        const text = `${record.supplier} ${record.contractName} ${record.contractNo} ${record.activityName || ""} ${record.activityCostItem || ""} ${record.benchmarkItem || ""}`.toLowerCase();
        if (!text.includes(term)) return false;
      }
      return true;
    }
    if (projectId && projectId !== "all" && record.projectId !== projectId) return false;
    if (month !== "all" && Number(record.month) !== Number(month)) return false;
    if (activityId) {
      if (record.activityId !== activityId) return false;
      if (directActivityOnly || record.activityId) {
        if (record.factType === "allocated_cost" || record.allocated === true || record.directCollected === false) return false;
      }
    }
    if (activityCostItem && record.activityCostItem !== activityCostItem) return false;
    if (benchmarkItem && record.benchmarkItem !== benchmarkItem) return false;
    if (subjectKey && !record.pathKeys.includes(subjectKey)) return false;
    if (term) {
      const text = `${record.supplier} ${record.contractName} ${record.contractNo} ${record.activityName || ""} ${record.activityCostItem || ""} ${record.benchmarkItem || ""}`.toLowerCase();
      if (!text.includes(term)) return false;
    }
    return true;
  });
}

function filterBenchmarkRecords({ itemName = state.benchmark.item, month = "all", projectScope = "全部项目", scene = "全部", projectId = "" } = {}) {
  const projectIds = getBenchmarkProjectIds(projectScope);
  return RECORDS.filter((record) => {
    if (!record.benchmarkItem) return false;
    if (itemName && record.benchmarkItem !== itemName) return false;
    if (projectId && record.projectId !== projectId) return false;
    if (!projectId && !projectIds.includes(record.projectId)) return false;
    if (month !== "all" && Number(record.month) !== Number(month)) return false;
    if (scene !== "全部" && record.businessScene !== scene) return false;
    return true;
  });
}

function getBenchmarkProjectIds(projectScope) {
  if (projectScope === "PPP项目") return PROJECT_GROUPS.PPP项目;
  if (projectScope === "轻资产项目") return PROJECT_GROUPS.轻资产项目;
  return PROJECTS.map((project) => project.id);
}

function aggregateBenchmarkByProject(records, metric) {
  return getBenchmarkProjectIds(state.benchmark.projectScope).map((projectId) => {
    const project = getProject(projectId);
    const projectRecords = records.filter((record) => record.projectId === projectId);
    return {
      project,
      records: projectRecords,
      count: projectRecords.length,
      value: benchmarkMetricValue(projectRecords, metric),
    };
  }).filter((row) => row.records.length).sort((a, b) => b.value - a.value);
}

function benchmarkMetricValue(records, metric) {
  const total = sumRecords(records);
  if (metric === "月均金额") return total / Math.max(1, new Set(records.map((record) => record.month)).size);
  if (metric === "单场金额") return total / Math.max(1, new Set(records.map((record) => record.activityName)).size);
  if (metric === "单位面积成本") return total / Math.max(1, records.reduce((sum, record) => sum + (record.measureQty || 0), 0));
  if (metric === "单笔均额") return total / Math.max(1, records.length);
  return total;
}

function getBenchmarkStats(records, metric) {
  const rows = aggregateBenchmarkByProject(records, metric);
  const values = rows.map((row) => row.value);
  return {
    average: values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length),
    high: Math.max(...values, 0),
    low: values.length ? Math.min(...values) : 0,
  };
}

function formatMetricValue(value, metric) {
  if (metric === "单位面积成本") {
    return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}元/单位`;
  }
  return moneyWan(value);
}

const UNIT_BENCHMARK_ORDER = [
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
  "综合包干",
];

function normalizeUnitBenchmarkItem(item) {
  const name = item.costItemName || item.activityCostItem || item.benchmarkItem || "";
  const profile = resolveUnitBenchmarkProfile(name, item);
  const isComprehensive = profile.name === "综合包干" || profile.canBenchmark === false;
  const rawAmount = roundMoney(Number(item.amount) || 0);
  const calibration = getUnitCostCalibration(profile.name, name, item);
  const unit = isComprehensive ? comprehensiveUnitFor(name, item) : calibration.unit;
  const unitPrice = isComprehensive ? rawAmount : calibratedUnitPrice(profile.name, name, item, calibration);
  const quantity = isComprehensive ? 1 : calibratedQuantity(rawAmount, unitPrice);
  const amount = roundMoney(quantity * unitPrice);
  return {
    ...item,
    normalizedName: profile.name,
    unit,
    quantity,
    unitPrice,
    amount,
    canBenchmark: !isComprehensive,
    benchmarkType: isComprehensive ? "综合包干" : profile.benchmarkType,
  };
}

function unitBenchmarkNcRecordIds(item = {}) {
  const ids = [];
  if (Array.isArray(item.ncRecordIds)) ids.push(...item.ncRecordIds);
  if (Array.isArray(item.costDetailIds)) ids.push(...item.costDetailIds);
  if (Array.isArray(item.cost_detail_ids)) ids.push(...item.cost_detail_ids);
  if (item.ncRecordId) ids.push(item.ncRecordId);
  return [...new Set(ids.filter(Boolean).map(String))];
}

function comprehensiveUnitFor(name, item = {}) {
  if (item.unit === "场" || String(name).includes("会务") || String(name).includes("活动") || String(name).includes("现场")) return "场";
  return "项";
}

function calibratedQuantity(amount, unitPrice) {
  return Math.max(0.01, Number((amount / Math.max(0.01, unitPrice)).toFixed(2)));
}

function calibratedUnitPrice(normalizedName, sourceName, item, calibration) {
  const seed = seededNumber(`unit-price-v91-${normalizedName}-${sourceName}-${item.ncRecordId || item.itemId || ""}`);
  return roundMoney(calibration.min + seed * (calibration.max - calibration.min));
}

function getUnitCostCalibration(normalizedName, sourceName = "", item = {}) {
  const text = String(sourceName);
  if (normalizedName === "保安服务") return { unit: "人/天", min: 180, max: 360 };
  if (normalizedName === "保洁服务") return { unit: "人/天", min: 120, max: 220 };
  if (normalizedName === "餐饮服务") return { unit: "份", min: text.includes("茶歇") ? 15 : 13, max: text.includes("茶歇") ? 25 : 18 };
  if (normalizedName === "标准搭建") return { unit: "平方米", min: text.includes("特装") || text.includes("木结构") ? 260 : 180, max: text.includes("特装") || text.includes("木结构") ? 520 : 360 };
  if (normalizedName === "地毯铺设") return { unit: "平方米", min: 4, max: 15 };
  if (normalizedName === "电力接驳") return { unit: "点位", min: 150, max: 800 };
  if (normalizedName === "广告物料") {
    if (text.includes("证件") || text.includes("活动物资") || text.includes("保障物资")) return { unit: "套", min: 500, max: 8000 };
    if (text.includes("块")) return { unit: "块", min: 80, max: 800 };
    return { unit: "平方米", min: 30, max: 180 };
  }
  if (normalizedName === "设备租赁") {
    if (text.includes("铁马") || text.includes("围挡")) return { unit: "米", min: 10, max: 30 };
    if (text.includes("移动厕所")) return { unit: "个/场", min: 200, max: 500 };
    if (text.includes("X光机")) return { unit: "台/天", min: 1000, max: 3000 };
    if (text.includes("安检门")) return { unit: "台/天", min: 300, max: 800 };
    return { unit: "台/天", min: 300, max: 800 };
  }
  if (normalizedName === "垃圾清运") return { unit: "车", min: 500, max: 1500 };
  if (normalizedName === "临勤服务") return { unit: "人/天", min: 180, max: 320 };
  return { unit: item.unit || "项", min: 1, max: Math.max(1, Number(item.amount) || 1) };
}

function resolveUnitBenchmarkProfile(name, item = {}) {
  const text = String(name);
  const includesAny = (words) => words.some((word) => text.includes(word));

  if (includesAny(["保洁", "临勤保洁", "清洁", "清洁临勤"])) {
    return { name: "保洁服务", benchmarkType: "人工服务", unit: "人/天", canBenchmark: true };
  }
  if (includesAny(["活动临勤人员", "临勤服务", "临时用工", "现场临勤"])) {
    return { name: "临勤服务", benchmarkType: "人工服务", unit: "人/天", canBenchmark: true };
  }
  if (includesAny(["保安", "安保", "临勤安保", "秩序维护", "安检引导"])) {
    return { name: "保安服务", benchmarkType: "人工服务", unit: "人/天", canBenchmark: true };
  }
  if (includesAny(["标准展位搭建", "标展搭建", "标准搭建", "特装搭建", "木结构搭建", "桁架搭建", "篷房搭建", "展位搭建"])) {
    return { name: "标准搭建", benchmarkType: "搭建服务", unit: "平方米", canBenchmark: true };
  }
  if (includesAny(["地毯", "地毯铺设"])) {
    return { name: "地毯铺设", benchmarkType: "物料制作", unit: "平方米", canBenchmark: true };
  }
  if (includesAny(["餐饮", "工作餐", "茶歇", "盒饭", "人员餐饮"])) {
    return { name: "餐饮服务", benchmarkType: "餐饮服务", unit: "份", canBenchmark: true };
  }
  if (includesAny(["电力接驳", "水电气接驳", "接驳"])) {
    return { name: "电力接驳", benchmarkType: "能耗资源", unit: "点位", canBenchmark: true };
  }
  if (includesAny(["广告物料", "宣传物料", "证件制作", "物料制作", "氛围布置", "广告氛围"])) {
    return { name: "广告物料", benchmarkType: "物料制作", unit: item.unit || "套", canBenchmark: true };
  }
  if (includesAny(["设备租赁", "铁马", "铁马围挡", "移动厕所", "围挡"])) {
    return { name: "设备租赁", benchmarkType: "设备租赁", unit: item.unit || "台/天", canBenchmark: true };
  }
  if (includesAny(["垃圾清运"])) {
    return { name: "垃圾清运", benchmarkType: "综合包干", unit: item.unit || "车", canBenchmark: true };
  }
  if (includesAny(["主场服务", "现场服务", "会务执行", "宣传推广", "活动策划", "数字化服务", "引流活动", "开幕式", "自办展成本", "现场零星费用", "管理费", "招标代理费", "采购平台服务费", "固定成本分摊", "管理费用分摊", "讲师", "主持", "摄影摄像", "维修保障", "报备", "场地及服务"])) {
    return { name: "综合包干", benchmarkType: "综合包干", unit: "项", canBenchmark: false };
  }
  if (item.benchmarkType === "餐饮服务") return { name: "餐饮服务", benchmarkType: "餐饮服务", unit: "份", canBenchmark: true };
  if (item.benchmarkType === "搭建服务") return { name: "标准搭建", benchmarkType: "搭建服务", unit: "平方米", canBenchmark: true };
  if (item.benchmarkType === "能耗资源" && includesAny(["电力接驳", "水电气接驳", "接驳"])) return { name: "电力接驳", benchmarkType: "能耗资源", unit: "点位", canBenchmark: true };
  if (item.benchmarkType === "物料制作") return { name: "广告物料", benchmarkType: "物料制作", unit: item.unit || "套", canBenchmark: true };
  if (item.benchmarkType === "设备租赁") return { name: "设备租赁", benchmarkType: "设备租赁", unit: item.unit || "台/天", canBenchmark: true };
  return { name: "综合包干", benchmarkType: "综合包干", unit: "项", canBenchmark: false };
}

function getUnitBenchmarkOptions() {
  const groups = UNIT_COST_ITEMS.reduce((map, item) => {
    const normalized = item.normalizedName ? item : normalizeUnitBenchmarkItem(item);
    if (!map.has(normalized.normalizedName)) map.set(normalized.normalizedName, { count: 0, canBenchmark: false });
    const group = map.get(normalized.normalizedName);
    group.count += 1;
    group.canBenchmark = group.canBenchmark || Boolean(normalized.canBenchmark);
    return map;
  }, new Map());
  const ordered = UNIT_BENCHMARK_ORDER
    .filter((name) => name !== "综合包干" && groups.has(name) && groups.get(name).canBenchmark)
    .map((name) => ({ name, count: groups.get(name).count }));
  const packageGroup = groups.get("综合包干");
  if (packageGroup) ordered.push({ name: "综合包干", count: packageGroup.count });
  return ordered;
}

function getUnitBenchmarkUnitOptions(filters = state.benchmark) {
  const items = filterUnitCostItems({ ...filters, unit: "全部单位" });
  return [...new Set(items.map((item) => item.unit))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function filterUnitCostItems(filters = {}) {
  const itemName = filters.item || state.benchmark.item || "保安服务";
  const projectIds = getBenchmarkProjectIds(filters.projectScope || state.benchmark.projectScope || "全部项目");
  const month = filters.month || "all";
  const unit = filters.unit || "全部单位";
  const splitFilter = filters.splitFilter || "全部";
  return UNIT_COST_ITEMS
    .map((item) => item.normalizedName ? item : normalizeUnitBenchmarkItem(item))
    .filter((item) => {
      if (item.normalizedName !== itemName) return false;
      if (!projectIds.includes(item.projectId)) return false;
      if (month !== "all" && Number(item.month) !== Number(month)) return false;
      if (unit !== "全部单位" && item.unit !== unit) return false;
      if (splitFilter === "仅可拆分项" && !item.canBenchmark) return false;
      if (splitFilter === "仅综合包干项" && item.canBenchmark) return false;
      return true;
    });
}

function aggregateUnitCostByProject(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = `${item.projectId}|${item.normalizedName}|${item.unit}`;
    if (!groups.has(key)) {
      groups.set(key, {
        rowKey: key,
        project: getProject(item.projectId),
        projectId: item.projectId,
        normalizedName: item.normalizedName,
        unit: item.unit,
        amount: 0,
        quantity: 0,
        canBenchmark: item.canBenchmark,
        supplierNames: new Set(),
        contractNos: new Set(),
        activityIds: new Set(),
        ncRecordIds: new Set(),
        subjectKeys: new Set(),
        subjectNames: new Set(),
        costItemNames: new Set(),
        lowerBounds: [],
        upperBounds: [],
      });
    }
    const group = groups.get(key);
    group.amount += item.amount;
    group.quantity += item.quantity;
    group.canBenchmark = group.canBenchmark && item.canBenchmark;
    group.supplierNames.add(item.supplierName);
    group.contractNos.add(item.contractNo);
    group.activityIds.add(item.activityId);
    unitBenchmarkNcRecordIds(item).forEach((id) => group.ncRecordIds.add(id));
    if (item.subjectKey) group.subjectKeys.add(item.subjectKey);
    if (item.subjectName) group.subjectNames.add(item.subjectName);
    if (item.costItemName) group.costItemNames.add(item.costItemName);
    if (Number.isFinite(item.lowerBound) && item.lowerBound > 0) group.lowerBounds.push(item.lowerBound);
    if (Number.isFinite(item.upperBound) && item.upperBound > 0) group.upperBounds.push(item.upperBound);
  });
  return [...groups.values()].map((group) => {
    const amount = roundMoney(group.amount);
    const quantity = roundMoney(group.quantity);
    return {
      ...group,
      amount,
      quantity,
      averageUnitPrice: group.canBenchmark ? roundMoney(amount / Math.max(1, quantity)) : amount,
      lowerBound: group.lowerBounds.length ? roundMoney(group.lowerBounds.reduce((sum, value) => sum + value, 0) / group.lowerBounds.length) : 0,
      upperBound: group.upperBounds.length ? roundMoney(group.upperBounds.reduce((sum, value) => sum + value, 0) / group.upperBounds.length) : 0,
      supplierCount: group.supplierNames.size,
      contractCount: group.contractNos.size,
      activityCount: group.activityIds.size,
      ncCount: group.ncRecordIds.size,
    };
  });
}

function getUnitCostBenchmarkStats(rows) {
  const comparableRows = rows.filter((row) => row.canBenchmark);
  const unitSet = new Set(rows.map((row) => row.unit));
  const singleUnit = unitSet.size === 1 ? [...unitSet][0] : "";
  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
  const totalQuantity = singleUnit ? rows.reduce((sum, row) => sum + row.quantity, 0) : 0;
  const comparableAmount = comparableRows.reduce((sum, row) => sum + row.amount, 0);
  const comparableQuantity = comparableRows.reduce((sum, row) => sum + row.quantity, 0);
  const prices = comparableRows.map((row) => row.averageUnitPrice).filter((value) => value > 0);
  const highUnitPrice = Math.max(...prices, 0);
  const lowUnitPrice = prices.length ? Math.min(...prices) : 0;
  return {
    projectCount: new Set(rows.map((row) => row.projectId)).size,
    totalAmount,
    totalQuantity,
    averageUnitPrice: prices.length ? comparableAmount / Math.max(1, comparableQuantity) : 0,
    highUnitPrice,
    lowUnitPrice,
    spread: lowUnitPrice > 0 ? highUnitPrice / lowUnitPrice : 0,
    ncCount: rows.reduce((sum, row) => sum + row.ncCount, 0),
    unit: singleUnit,
  };
}

function getWeightedUnitAverage(rows) {
  const comparableRows = rows.filter((row) => row.canBenchmark && row.quantity > 0 && row.averageUnitPrice > 0);
  const amount = comparableRows.reduce((sum, row) => sum + row.amount, 0);
  const quantity = comparableRows.reduce((sum, row) => sum + row.quantity, 0);
  return quantity > 0 ? amount / quantity : 0;
}

function getUnitPriceStatus(row, groupRows = []) {
  if (!row) return { label: "-", className: "is-muted" };
  if (!row.canBenchmark) return { label: "综合包干", className: "is-package" };
  const comparableRows = groupRows.filter((item) => item.canBenchmark && item.unit === row.unit && item.quantity > 0);
  if (!comparableRows.some((item) => item.rowKey === row.rowKey)) {
    return { label: "单位不可比", className: "is-muted" };
  }
  if (comparableRows.length < 3) {
    return { label: "样本较少", className: "is-sample" };
  }
  const average = getWeightedUnitAverage(comparableRows);
  if (!average) return { label: "样本较少", className: "is-sample" };
  if (row.averageUnitPrice > average * 1.2) return { label: "偏高", className: "is-high" };
  if (row.averageUnitPrice < average * 0.8) return { label: "偏低", className: "is-low" };
  return { label: "正常", className: "is-normal" };
}

function calculateBenchmarkReferenceRange({ benchmarkRows = [], costItem = "", unit = "全部单位", projectFilter = "全部项目", monthRange = "all" } = {}) {
  const removedNames = new Set(["能耗费", "能耗", "能源成本", "空调能源", "特装搭建"]);
  const comparable = benchmarkRows.filter((row) => {
    if (!row || row.canBenchmark !== true) return false;
    if (!row.unit || row.unit === "项" || row.unit === "场") return false;
    if (row.normalizedName === "综合包干" || removedNames.has(row.normalizedName)) return false;
    if (costItem && costItem !== "综合包干" && row.normalizedName !== costItem) return false;
    if (unit && unit !== "全部单位" && row.unit !== unit) return false;
    if (!(row.averageUnitPrice > 0)) return false;
    return true;
  });
  const groups = groupUnitBenchmarkRows(comparable);
  const selectedUnit = unit && unit !== "全部单位"
    ? unit
    : Object.entries(groups).sort((a, b) => b[1].length - a[1].length)[0]?.[0] || "";
  const sampleRows = selectedUnit ? (groups[selectedUnit] || []) : [];
  const values = sampleRows.map((row) => row.averageUnitPrice).filter((value) => value > 0).sort((a, b) => a - b);
  const projectCount = new Set(sampleRows.map((row) => row.projectId)).size;
  const sampleCount = values.length;
  const method = sampleCount >= 10 ? "P25—P75" : sampleCount >= 5 ? "P20—P80" : "";
  const lowPercentile = sampleCount >= 10 ? 0.25 : sampleCount >= 5 ? 0.2 : 0;
  const highPercentile = sampleCount >= 10 ? 0.75 : sampleCount >= 5 ? 0.8 : 0;
  const hasRange = sampleCount >= 5;
  const low = hasRange ? roundMoney(percentile(values, lowPercentile)) : 0;
  const high = hasRange ? roundMoney(percentile(values, highPercentile)) : 0;
  return {
    costItem,
    unit: selectedUnit,
    projectFilter,
    monthRange,
    sampleCount,
    projectCount,
    method,
    low,
    high,
    hasRange,
    sampleRows,
    message: hasRange
      ? `样本参考区间：${formatUnitPrice(low, selectedUnit)} - ${formatUnitPrice(high, selectedUnit)}`
      : `样本不足，仅供参考。当前仅有 ${projectCount} 个可比项目，暂不计算分位区间。`,
  };
}

function percentile(sortedValues = [], p = 0.5) {
  if (!sortedValues.length) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const position = (sortedValues.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sortedValues[lower];
  const weight = position - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function renderBenchmarkReferenceRangeNote(referenceRange) {
  if (!referenceRange) return "";
  const rangeText = referenceRange.hasRange
    ? `样本参考区间：${formatUnitPrice(referenceRange.low, referenceRange.unit)}—${formatUnitPrice(referenceRange.high, referenceRange.unit)}`
    : "样本不足，仅供参考";
  const methodText = referenceRange.hasRange
    ? `计算口径：基于当前筛选下 ${referenceRange.projectCount} 个项目同单位样本 ${referenceRange.method} 分位区间。`
    : `当前仅有 ${referenceRange.projectCount} 个可比项目，暂不计算分位区间，建议结合合同清单和招采数据复核。`;
  return `
    <div class="reference-range-note dynamic-reference-note">
      <strong>${rangeText}</strong>
      <span>${methodText}</span>
      <span>价差倍数 1.5 倍以内通常视为正常波动；1.5—2.5 倍建议关注；2.5 倍以上建议重点复核。</span>
      <span>经验参考：服务成本受结构、工期、服务范围影响较大，后续以真实合同和招采数据校准。</span>
    </div>
  `;
}

function getBenchmarkReferenceRange(itemName) {
  const ranges = {
    保安服务: "180—360元/人天；班次250—600元/班次；人/月4500—8500元/人月",
    保洁服务: "120—220元/人天；场次1500—12000元/场；场馆清洁0.8—8元/平方米",
    餐饮服务: "13—25元/份，大型活动盒饭和工作餐优先控制在13—18元/份",
    标展搭建: "普通标展180—450元/套，豪华标展450—900元/套；按面积80—250元/平方米",
    特装搭建: "桁架结构180—350元/平方米，木结构或复杂结构600—850元/平方米",
    地毯铺设: "4—15元/平方米",
    电力接驳: "150—800元/点位；80—300元/kW；按项包干时不参与单价排名",
    能耗费: "电费0.85—1.5元/度；水费3—6元/吨",
    广告物料: "30—180元/平方米；80—800元/块；500—8000元/套",
    设备租赁: "铁马10—30元/米；移动厕所200—500元/个/场；安检门300—800元/台/天；X光机1000—3000元/台/天",
    垃圾清运: "30—50元/桶；500—1500元/车；按场次包干时不参与单价排名",
    综合包干: "按1项或1场 × 合同金额展示，不参与单价横向排名",
  };
  return ranges[itemName] || "参考区间需结合真实合同、招采数据和服务标准校准";
}

function benchmarkReviewFocus(itemName) {
  if (["保安服务", "保洁服务"].includes(itemName)) return "活动规模、服务标准、临勤配置、夜间服务和供应商合同";
  if (["标展搭建", "特装搭建"].includes(itemName)) return "结构类型、展位规格、复杂造型、工期要求和工程量确认";
  if (itemName === "餐饮服务") return "餐标、配送范围、人员保障和活动时段";
  if (["能耗费", "电力接驳"].includes(itemName)) return "展馆面积、布撤展照明、空调能源、设备测试和接驳点位";
  if (["地毯铺设", "广告物料"].includes(itemName)) return "铺设范围、材质标准、临时追加和主办方指定要求";
  if (["设备租赁", "垃圾清运"].includes(itemName)) return "租赁时长、设备规格、现场动线和清运频次";
  return "合同范围、服务内容和交付边界";
}

function renderBenchmarkDiagnosis(rows, stats, current, referenceRange = null) {
  if (!rows.length) {
    return `
      <div class="benchmark-diagnosis-panel">
        <strong>成本项诊断结论</strong>
        <ul><li>当前筛选条件下无可用于查看的成本项样本，请调整成本项、月份、单位或项目范围。</li></ul>
        ${renderBenchmarkReferenceRangeNote(referenceRange)}
      </div>
    `;
  }
  const comparableRows = rows.filter((row) => row.canBenchmark);
  const unitCount = new Set(rows.map((row) => row.unit)).size;
  const isComprehensive = current.item === "综合包干" || current.splitFilter === "仅综合包干项" || !comparableRows.length;
  if (isComprehensive) {
    return `
      <div class="benchmark-diagnosis-panel">
        <strong>成本项诊断结论</strong>
        <ul>
          <li>当前成本项为综合包干类，按1项/1场 × 合同金额展示，不参与单价横向排名。</li>
          <li>当前筛选涉及${stats.projectCount}个项目，总金额${moneyWan(stats.totalAmount)}，建议重点复核合同范围、服务内容和交付边界。</li>
          <li>综合包干项适合做合同范围和NC追溯复核，不宜直接作为单价压降依据。</li>
        </ul>
        ${renderBenchmarkReferenceRangeNote(referenceRange)}
      </div>
    `;
  }

  const unitGroups = Object.values(groupUnitBenchmarkRows(comparableRows));
  const primaryGroup = unitGroups.sort((a, b) => b.length - a.length)[0] || comparableRows;
  const primaryStats = getUnitCostBenchmarkStats(primaryGroup);
  const highRows = comparableRows
    .map((row) => ({ row, status: getUnitPriceStatus(row, comparableRows.filter((item) => item.unit === row.unit)) }))
    .filter((item) => item.status.label === "偏高")
    .sort((a, b) => b.row.averageUnitPrice - a.row.averageUnitPrice)
    .map((item) => item.row);
  const focusProjects = highRows.length
    ? highRows.slice(0, 2).map((row) => row.project.shortName).join("、")
    : primaryGroup.slice().sort((a, b) => b.averageUnitPrice - a.averageUnitPrice).slice(0, 2).map((row) => row.project.shortName).join("、");
  const firstLine = unitCount > 1
    ? `当前${current.item}参与对标项目${stats.projectCount}个，存在${unitCount}种计量单位，单价按单位分组诊断，不跨单位混算。`
    : `当前${current.item}参与对标项目${stats.projectCount}个，最高单价为${formatUnitPrice(primaryStats.highUnitPrice, primaryStats.unit)}，最低单价为${formatUnitPrice(primaryStats.lowUnitPrice, primaryStats.unit)}，价差${formatSpread(primaryStats.spread)}。`;
  const secondLine = highRows.length
    ? `单价偏高项目主要为${focusProjects}，建议结合${benchmarkReviewFocus(current.item)}继续复核。`
    : `当前样本无明显偏高项目，可重点查看${focusProjects || "样本项目"}的合同清单、工程量确认和服务标准差异。`;
  return `
    <div class="benchmark-diagnosis-panel">
      <strong>成本项诊断结论</strong>
      <ul>
        <li>${firstLine}</li>
        <li>${secondLine}</li>
        <li>该成本项可纳入后续招采参考价或集采复核范围；综合包干项不参与单价横向排名。</li>
      </ul>
      ${renderBenchmarkReferenceRangeNote(referenceRange)}
    </div>
  `;
}

function getBenchmarkPossibleReason(row, statusLabel) {
  if (!row || !row.canBenchmark || statusLabel === "综合包干") {
    return "该项按合同服务范围整体计价，不宜直接按单价横向比较。";
  }
  if (statusLabel === "样本较少") return "同单位样本数量不足，暂不形成横向偏高偏低判断。";
  if (statusLabel === "单位不可比") return "当前行计量单位与筛选分组不一致，需要先统一单位后再判断。";
  if (statusLabel === "偏低") return "可能存在服务范围缺项、分摊不足、计量口径差异或服务标准低于其他项目。";
  if (statusLabel === "正常") return "当前单价处于同单位样本正常区间，差异主要来自活动规模、服务标准和计量口径。";

  const reasonMap = {
    特装搭建: "可能受结构类型、木结构比例、复杂造型和工期要求影响。",
    标展搭建: "可能受豪华标展、非常规尺寸或展位数量较少影响。",
    保安服务: "可能受临勤高峰、夜间服务、活动人流和保障等级影响。",
    保洁服务: "可能受临勤高峰、夜间服务、活动人流和保障等级影响。",
    餐饮服务: "可能受餐标、配送、人员保障和活动时段影响。",
    能耗费: "可能受展馆面积、空调或供热、布撤展照明和设备测试影响。",
    电力接驳: "可能受接驳点位、负荷需求、临时增容和布撤展工期影响。",
    地毯铺设: "可能受铺设范围、材质标准、临时追加和主办方指定要求影响。",
    广告物料: "可能受制作材质、尺寸规格、临时追加和主办方指定要求影响。",
    设备租赁: "可能受设备规格、租赁天数、现场布点和保障标准影响。",
    垃圾清运: "可能受清运频次、展陈垃圾量、车型和现场动线影响。",
  };
  return reasonMap[row.normalizedName] || "可能受服务范围、交付标准、供应商报价和工程量确认影响。";
}

function getBenchmarkManagementSuggestion(row, statusLabel) {
  if (!row || !row.canBenchmark || statusLabel === "综合包干") {
    return "建议重点核查服务范围、交付内容和合同边界，不作单价排名。";
  }
  if (statusLabel === "样本较少") return "样本数量不足，暂作为个案参考。";
  if (statusLabel === "单位不可比") return "建议先统一计量单位和服务范围，再进行横向对标。";
  if (statusLabel === "偏高") return "建议复核合同清单、工程量确认和供应商报价，必要时纳入后续招采参考价。";
  if (statusLabel === "偏低") return "建议核实是否存在范围缺项、分摊不足或服务标准差异。";
  return "当前单价处于样本正常区间，可作为后续同类活动参考。";
}

function sortUnitBenchmarkRows(rows, metric = "单价") {
  return [...rows].sort((a, b) => {
    if (metric === "总金额") return b.amount - a.amount;
    if (metric === "工程量") return b.quantity - a.quantity;
    if (a.canBenchmark !== b.canBenchmark) return a.canBenchmark ? -1 : 1;
    return b.averageUnitPrice - a.averageUnitPrice;
  });
}

function groupUnitBenchmarkRows(rows) {
  return rows.reduce((groups, row) => {
    if (!groups[row.unit]) groups[row.unit] = [];
    groups[row.unit].push(row);
    return groups;
  }, {});
}

function getCurrentUnitBenchmarkRows() {
  return sortUnitBenchmarkRows(aggregateUnitCostByProject(filterUnitCostItems(state.benchmark)), state.benchmark.metric);
}

function getUnitBenchmarkRow(rowKey) {
  return getCurrentUnitBenchmarkRows().find((row) => row.rowKey === rowKey) || null;
}

function getBenchmarkNcDetailRows(rowOrContext = {}) {
  const row = rowOrContext.rowKey ? rowOrContext : null;
  let ids = row ? [...row.ncRecordIds] : (rowOrContext.ncRecordIds || []);
  if (!ids.length && rowOrContext.projectId && rowOrContext.costItem) {
    const items = filterUnitCostItems({
      item: rowOrContext.costItem,
      month: rowOrContext.month || "all",
      projectScope: "全部项目",
      unit: rowOrContext.unit || "全部单位",
      splitFilter: "全部",
    }).filter((item) => item.projectId === rowOrContext.projectId);
    ids = items.flatMap((item) => unitBenchmarkNcRecordIds(item));
  }
  return filterLedgerRecords({ ncRecordIds: [...new Set(ids)] });
}

function unitCostForRecord(recordId) {
  const item = UNIT_COST_ITEMS.find((entry) => unitBenchmarkNcRecordIds(entry).includes(recordId));
  return item ? (item.normalizedName ? item : normalizeUnitBenchmarkItem(item)) : null;
}

function formatUnitPrice(value, unit = "单位") {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}元/${unit}`;
}

function formatQuantity(value) {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function formatSpread(value) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}倍`;
}

function auditUnitCostReasonableness(items = UNIT_COST_ITEMS) {
  const normalizedItems = items.map((item) => item.normalizedName ? item : normalizeUnitBenchmarkItem(item));
  const issues = [];
  const byItem = {};

  normalizedItems.forEach((item) => {
    const productAmount = roundMoney(item.quantity * item.unitPrice);
    if (Math.abs(productAmount - item.amount) > 0.011) {
      issues.push(`${item.itemId} 金额不等于工程量×单价`);
    }
    if (item.quantity <= 0 && item.amount > 0) {
      issues.push(`${item.itemId} 存在 quantity = 0 但 amount > 0`);
    }
    if (item.normalizedName === "综合包干") {
      if (item.canBenchmark || item.benchmarkType !== "综合包干" || item.quantity !== 1 || item.unitPrice !== item.amount) {
        issues.push(`${item.itemId} 综合包干口径错误`);
      }
      return;
    }

    const range = getUnitCostCalibration(item.normalizedName, item.costItemName, item);
    if (item.unit !== range.unit) {
      issues.push(`${item.itemId} ${item.normalizedName} 单位应为 ${range.unit}`);
    }
    if (item.unitPrice < range.min || item.unitPrice > range.max) {
      issues.push(`${item.itemId} ${item.normalizedName} 单价 ${item.unitPrice} 超出 ${range.min}-${range.max}`);
    }
  });

  normalizedItems.forEach((item) => {
    if (!byItem[item.normalizedName]) {
      byItem[item.normalizedName] = {
        count: 0,
        units: new Set(),
        minUnitPrice: Infinity,
        maxUnitPrice: 0,
        benchmarkRows: 0,
      };
    }
    const target = byItem[item.normalizedName];
    target.count += 1;
    target.units.add(item.unit);
    if (item.canBenchmark) {
      target.benchmarkRows += 1;
      target.minUnitPrice = Math.min(target.minUnitPrice, item.unitPrice);
      target.maxUnitPrice = Math.max(target.maxUnitPrice, item.unitPrice);
    }
  });

  Object.keys(byItem).forEach((name) => {
    const target = byItem[name];
    target.units = [...target.units];
    target.minUnitPrice = Number.isFinite(target.minUnitPrice) ? roundMoney(target.minUnitPrice) : 0;
    target.maxUnitPrice = roundMoney(target.maxUnitPrice);
  });

  const groupedRows = aggregateUnitCostByProject(normalizedItems);
  const unitGroupingOk = groupedRows.every((row) => row.unit && row.rowKey.endsWith(`|${row.unit}`));
  if (!unitGroupingOk) issues.push("存在未按单位分组的对标汇总行");

  return {
    passed: issues.length === 0,
    checkedCount: normalizedItems.length,
    issueCount: issues.length,
    issues,
    unitGroupingOk,
    byItem,
  };
}

function aggregateBy(records, field) {
  const map = new Map();
  records.forEach((record) => {
    const name = record[field] || "未列明";
    map.set(name, (map.get(name) || 0) + record.amount);
  });
  return [...map.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
}

function heatColor(level) {
  const alpha = Math.max(0.08, Math.min(0.92, level));
  if (alpha > 0.72) return "#123B6D";
  if (alpha > 0.48) return "#2F6FA3";
  if (alpha > 0.24) return "#6F93B7";
  return "#EAF1F8";
}

function heatTextColor(level) {
  return level > 0.36 ? "#ffffff" : "#0b2447";
}

function scopeSubjectKey() {
  return state.scope === "all" ? "" : state.scope;
}

function sumsByMain(records) {
  return records.reduce((acc, record) => {
    acc[record.main] = (acc[record.main] || 0) + record.amount;
    return acc;
  }, { 固定成本: 0, 变动成本: 0, 管理费用: 0 });
}

function getProjectMonthStructureByMain(projectId, month = state.month) {
  return sumsByMain(filterRecords({ projectId, month }));
}

function sumRecords(records) {
  return records.reduce((sum, record) => sum + record.amount, 0);
}

function sumObject(object) {
  return Object.values(object).reduce((sum, value) => sum + value, 0);
}

function getMainRatios(byMain) {
  const total = sumObject(byMain) || 1;
  return {
    固定成本: byMain.固定成本 / total,
    变动成本: byMain.变动成本 / total,
    管理费用: byMain.管理费用 / total,
  };
}

function getProject(projectId) {
  return PROJECTS.find((project) => project.id === projectId) || PROJECTS[0];
}

function getActivity(projectId, month) {
  return ACTIVITIES.find((activity) => activity.projectId === projectId && Number(activity.month) === Number(month));
}

function getActivityById(activityId) {
  return ACTIVITIES.find((activity) => activity.activityId === activityId);
}

function filterActivities({ projectId = "all", month = "all", type = "全部", costItem = "全部", includeBaseActivity = false } = {}) {
  return ACTIVITIES.filter((activity) => {
    if (!includeBaseActivity && activity.isBaseActivity) return false;
    if (projectId !== "all" && activity.projectId !== projectId) return false;
    if (month !== "all" && Number(activity.month) !== Number(month)) return false;
    if (type !== "全部" && activity.activityType !== type) return false;
    if (!activityHasCostItem(activity, costItem)) return false;
    return true;
  });
}

function filterBenchmarkActivities({ type = "全部", month = "all", projectScope = "全部项目", costItem = "全部" } = {}) {
  const projectIds = getBenchmarkProjectIds(projectScope);
  return ACTIVITIES.filter((activity) => {
    if (!projectIds.includes(activity.projectId)) return false;
    if (type !== "全部" && activity.activityType !== type) return false;
    if (month !== "all" && Number(activity.month) !== Number(month)) return false;
    if (!activityHasCostItem(activity, costItem)) return false;
    return true;
  });
}

function activityHasCostItem(activity, costItem) {
  if (!costItem || costItem === "全部") return true;
  return ACTIVITY_RECORDS.some((record) => record.activityId === activity.activityId && record.activityCostItem === costItem);
}

function activityRecordsFor(activityId, costItem = "") {
  return ACTIVITY_RECORDS.filter((record) => {
    if (record.activityId !== activityId) return false;
    if (costItem && record.activityCostItem !== costItem) return false;
    return true;
  });
}

function activityRecordsForActivities(activities, costItem = "全部") {
  const ids = new Set(activities.map((activity) => activity.activityId));
  return ACTIVITY_RECORDS.filter((record) => ids.has(record.activityId) && (costItem === "全部" || record.activityCostItem === costItem));
}

function activityMetricValue(activity, metric, costItem = "全部") {
  const records = activityRecordsFor(activity.activityId, costItem === "全部" ? "" : costItem);
  const costItemAmount = costItem !== "全部" ? sumRecords(records) : activity.totalCost;
  if (metric === "活动直接成本") return costItem === "全部" ? activity.directCost : costItemAmount;
  if (metric === "单位面积成本") return costItemAmount / Math.max(1, activity.area);
  if (metric === "单观众成本") return costItemAmount / Math.max(1, activity.audience);
  if (metric === "单展位成本") return costItemAmount / Math.max(1, activity.booths || 1);
  if (metric === "单笔均额") return costItemAmount / Math.max(1, records.length || activity.ncCount);
  return costItemAmount;
}

function formatActivityMetric(value, metric) {
  if (["单位面积成本", "单观众成本", "单展位成本"].includes(metric)) {
    return `${value.toLocaleString("zh-CN", { maximumFractionDigits: 1 })}元`;
  }
  return moneyWan(value);
}

function activityRelationPercents(activity) {
  const total = Math.max(1, activity.projectMonthTotal);
  return {
    activity: Math.max(1, (activity.totalCost / total) * 100),
    daily: Math.max(1, (activity.nonActivityCost / total) * 100),
  };
}

function activityIconType(type) {
  if (type === "演唱会" || type === "体育赛事") return "people";
  if (type === "会议论坛" || type === "研学文化") return "document";
  if (type === "筹开活动") return "building";
  if (type === "消费活动") return "box";
  return "build";
}

function moneyWan(value) {
  const amount = value / 10000;
  return `${amount.toLocaleString("zh-CN", { minimumFractionDigits: amount >= 100 ? 0 : 1, maximumFractionDigits: 1 })}万元`;
}

function signedMoneyWan(value) {
  if (value > 0) return `+${moneyWan(value)}`;
  if (value < 0) return `-${moneyWan(Math.abs(value))}`;
  return "持平";
}

function changeVerb(value) {
  if (value > 0) return "增加";
  if (value < 0) return "减少";
  return "基本持平";
}

function percent(value) {
  return `${(value * 100).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function monthLabel(value) {
  const option = MONTH_OPTIONS.find((item) => item.value === String(value));
  return option ? option.label : "累计";
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function v116SafeNcField(value) {
  return value ? escapeHtml(value) : "待NC字段接入";
}

function v116Aggregate(records, getKey, limit = 3) {
  const map = new Map();
  records.forEach((record) => {
    const key = getKey(record) || "未分类";
    map.set(key, (map.get(key) || 0) + (Number(record.amount) || 0));
  });
  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}
