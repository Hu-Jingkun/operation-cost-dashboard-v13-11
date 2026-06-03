function init(options = {}) {
  indexTaxonomy();
  state.expandedKeys = new Set(TAXONOMY.map((node) => node.name));
  RECORDS = [...generateRecords(), ...generateBenchmarkRecords()];
  const activityBundle = generateActivityData(RECORDS);
  ACTIVITIES = activityBundle.activities;
  ACTIVITY_RECORDS = activityBundle.records;
  ACTIVITY_COST_SUBJECTS = generateActivityCostSubjects(ACTIVITIES, ACTIVITY_RECORDS);
  UNIT_COST_ITEMS = generateUnitCostItems(ACTIVITY_RECORDS);
  state.activityDetail.activityId = ACTIVITIES[0] ? ACTIVITIES[0].activityId : "";
  state.activityBenchmark.selectedActivityId = ACTIVITIES[0] ? ACTIVITIES[0].activityId : "";
  if (options.render !== false) render();
}

function openTopLevelDetails(returnView = "home") {
  state.detail.projectId = "all";
  state.detail.month = "all";
  state.detail.subjectKey = "";
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
  state.detail.returnView = returnView;
  state.detail.traceStage = "project";
  v116SetSelectedProject(null);
  v116SetSelectedSubject("");
  V116_INTERACTION_STATE.selectedMonth = "all";
  state.view = "details";
  render();
  resetPageScrollToTop();
}

function resolveMonthReportProjectId(projectId = "") {
  const role = window.V13Auth && typeof window.V13Auth.getCurrentRole === "function"
    ? window.V13Auth.getCurrentRole()
    : null;
  const visibleProjectIds = role && Array.isArray(role.visibleProjectIds)
    ? role.visibleProjectIds.filter(Boolean)
    : [];
  const requestedProjectId = String(projectId || "");
  if (requestedProjectId) {
    if (!role || role.visibleProjectIds === "all" || visibleProjectIds.includes(requestedProjectId)) return requestedProjectId;
    return visibleProjectIds.length === 1 ? visibleProjectIds[0] : "";
  }
  return visibleProjectIds.length === 1 ? visibleProjectIds[0] : "";
}

function v1398ParseTopRouteHash() {
  if (typeof window === "undefined" || !window.location) return null;
  const raw = String(window.location.hash || "").replace(/^#/, "");
  if (!raw) return null;
  const parts = raw.split("?");
  const routeKey = parts[0];
  const params = new URLSearchParams(parts[1] || "");
  if (routeKey === "home") return { view: "home" };
  if (routeKey === "source") return { view: "source" };
  if (routeKey === "monthAnalysis" || routeKey === "monthReport" || routeKey === "month") {
    return {
      view: "monthAnalysis",
      month: params.get("month") || params.get("m") || "5",
      projectId: params.get("projectId") || params.get("project") || ""
    };
  }
  return null;
}

function v1398BuildTopRouteHash(view = state.view) {
  if (view === "home") return "#home";
  if (view === "source") return "#source";
  if (view === "monthAnalysis") {
    const params = new URLSearchParams();
    params.set("month", String(normalizeMonthValue(state.month || 5)));
    if (state.monthProjectFilter) params.set("projectId", state.monthProjectFilter);
    return "#monthAnalysis?" + params.toString();
  }
  return "";
}

function v1398SyncTopRouteHash(view = state.view, options = {}) {
  if (typeof window === "undefined" || !window.history || !window.location) return;
  const next = v1398BuildTopRouteHash(view);
  if (!next || window.location.hash === next) return;
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method](null, "", next);
}

function v1398ApplyTopRoute(route) {
  if (!route) return false;
  if (route.view === "monthAnalysis") {
    state.view = "monthAnalysis";
    state.month = String(normalizeMonthValue(route.month || 5));
    state.monthCategoryFilter = "all";
    state.monthSubjectKey = "";
    state.monthProjectFilter = resolveMonthReportProjectId(route.projectId || "");
    state.monthProjectsExpanded = false;
    state.monthDetailVisible = false;
    state.monthDetailExpanded = false;
    V116_INTERACTION_STATE.selectedMonth = state.month;
    return true;
  }
  if (route.view === "home" || route.view === "source") {
    state.view = route.view;
    return true;
  }
  return false;
}

function v1398HandleTopRouteChange() {
  const route = v1398ParseTopRouteHash();
  if (!v1398ApplyTopRoute(route)) return;
  render();
  resetPageScrollToTop();
}

function v1398ApplyInitialRouteHash() {
  v1398ApplyTopRoute(v1398ParseTopRouteHash());
}

function v1398BindTopRouteEvents() {
  if (typeof window === "undefined" || window.__V1398_TOP_ROUTE_BOUND) return;
  window.__V1398_TOP_ROUTE_BOUND = true;
  window.addEventListener("hashchange", v1398HandleTopRouteChange);
  window.addEventListener("popstate", v1398HandleTopRouteChange);
}

function openMonthReport(month = 5, projectId = "", options = {}) {
  const monthValue = String(normalizeMonthValue(month));
  const targetProjectId = resolveMonthReportProjectId(projectId);
  state.view = "monthAnalysis";
  state.month = monthValue;
  state.monthCategoryFilter = options.categoryFilter || "all";
  state.monthSubjectKey = "";
  state.monthProjectFilter = targetProjectId;
  state.monthProjectsExpanded = false;
  state.monthDetailVisible = false;
  state.monthDetailExpanded = false;
  V116_INTERACTION_STATE.selectedMonth = monthValue;
  if (options.hash !== false) v1398SyncTopRouteHash("monthAnalysis", { replace: options.replaceHash === true });
  render();
  resetPageScrollToTop();
}

function openProjectProfileEntry(projectId, options = {}) {
  const targetProjectId = projectId || state.profileProjectId || state.projectId || "sjz";
  state.mapOpenCluster = "";
  state.projectId = targetProjectId;
  state.profileProjectId = targetProjectId;
  v116SetSelectedProject(targetProjectId);
  if (window.V132ProjectProfile && typeof window.V132ProjectProfile.openProfile === "function") {
    window.V132ProjectProfile.openProfile(targetProjectId, options);
    return;
  }
  state.view = "profile";
  render();
  resetPageScrollToTop();
}

function resolveSubjectIdForBenchmarkItem(itemName = "") {
  const targetName = String(itemName || "").trim();
  if (!targetName) return "";
  const views = (window.OPERATION_COST_DATA_VIEWS && window.OPERATION_COST_DATA_VIEWS.views) || {};
  const unitRows = Array.isArray(views.VIEW_UNIT_COST_BENCHMARK) ? views.VIEW_UNIT_COST_BENCHMARK : [];
  const subjectCounts = new Map();

  unitRows.forEach((row) => {
    const names = [
      row.benchmark_item_name,
      row.subject_name,
      row.level3_name,
      row.item_name
    ].map((value) => String(value || "").trim()).filter(Boolean);
    const matched = names.some((name) => name === targetName || name.includes(targetName) || targetName.includes(name));
    if (!matched || !row.subject_id) return;
    subjectCounts.set(row.subject_id, (subjectCounts.get(row.subject_id) || 0) + 1);
  });

  if (subjectCounts.size) {
    return Array.from(subjectCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  const subjectRows = Array.isArray(views.VIEW_PROJECT_SUBJECT_TREE) ? views.VIEW_PROJECT_SUBJECT_TREE : [];
  const fallback = subjectRows.find((row) => {
    const names = [row.subject_name, row.level3_name, row.level2_name].map((value) => String(value || "").trim()).filter(Boolean);
    return names.some((name) => name === targetName || name.includes(targetName) || targetName.includes(name));
  });
  return fallback ? fallback.subject_id || "" : "";
}

function openSubjectCompareFromBenchmarkItem(itemName = "", month = "all", projectId = "") {
  const subjectId = resolveSubjectIdForBenchmarkItem(itemName);
  if (window.V134SubjectCompare && typeof window.V134SubjectCompare.open === "function") {
    window.V134SubjectCompare.open({
      subjectId,
      month: month || "all",
      tab: "unit",
      projectId,
      notice: itemName ? `已从重点成本项对标进入：${itemName}` : "已进入科目横向对比"
    });
    return;
  }
  state.view = "subjectCompare";
  render();
  resetPageScrollToTop();
}

function bindV12DashboardEvents() {
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (V116_INTERACTION_STATE.drawerOpen) {
      v116SetRenderActionType("drawer");
      v116CloseDetailDrawer();
      return;
    }
    if (state.view === "details" && state.detail.selectedId) {
      v127CloseSingleRecordDrawer();
    }
  }
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  v116PrepareRenderAction(action);

  if (action === "v116-month-filter") {
    v116ApplyMonth(target.dataset.month || "all");
    render();
    return;
  }

  if (action === "v116-cost-filter") {
    v116ApplyCostType(target.dataset.main || "all");
    render();
    return;
  }

  if (action === "v116-chip-clear") {
    v116ClearInteractionFilter(target.dataset.filter);
    render();
    return;
  }

  if (action === "v116-clear-all") {
    v116ClearAllInteractionFilters();
    render();
    return;
  }

  if (action === "trace-stage") {
    const stage = target.dataset.stage || "project";
    if (V116_INTERACTION_STATE.drawerOpen && V116_INTERACTION_STATE.drawerContext) {
      V116_INTERACTION_STATE.drawerContext.traceStage = stage;
    } else {
      state.detail.traceStage = stage;
    }
    render();
    return;
  }

  if (action === "v116-drawer-open") {
    v116OpenDetailDrawerFromTarget(target);
    return;
  }

  if (action === "v116-drawer-close") {
    v116CloseDetailDrawer();
    return;
  }

  if (action === "single-detail-close") {
    v127CloseSingleRecordDrawer();
    return;
  }

  if (action === "back-to-top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (action === "v116-drawer-details") {
    v116OpenDetailsFromDrawer();
    return;
  }

  if (action === "nav") {
    const nextView = target.dataset.view;
    if (nextView === "details") {
      openTopLevelDetails("home");
      return;
    }
    if (nextView === "monthAnalysis") {
      openMonthReport(5, "");
      return;
    }
    if (nextView === "org") {
      if (window.V133OrgPenetration && typeof window.V133OrgPenetration.openOrg === "function") {
        window.V133OrgPenetration.openOrg({ type: "company", projectId: "", natureName: "", subjectId: "", subjectKey: "", subjectName: "" });
        return;
      }
      state.view = "org";
      if (window.history && window.location && window.location.hash !== "#org") window.history.pushState(null, "", "#org");
      render();
      resetPageScrollToTop();
      return;
    }
    if (nextView === "subjectCompare") {
      if (window.V134SubjectCompare && typeof window.V134SubjectCompare.open === "function") {
        window.V134SubjectCompare.open({});
        return;
      }
      state.view = "subjectCompare";
      if (window.history && window.location && window.location.hash !== "#subjectCompare") window.history.pushState(null, "", "#subjectCompare");
      render();
      resetPageScrollToTop();
      return;
    }
    state.view = nextView;
    v1398SyncTopRouteHash(nextView);
    render();
    resetPageScrollToTop();
    return;
  }

  if (action === "compare-tab") {
    state.compareTab = target.dataset.tab;
    render();
  }

  if (action === "open-benchmark") {
    openSubjectCompareFromBenchmarkItem(target.dataset.item || "", "all");
    return;
  }

  if (action === "project-open") {
    openProjectProfileEntry(target.dataset.project);
  }

  if (action === "map-cluster-toggle") {
    state.mapOpenCluster = state.mapOpenCluster === target.dataset.cluster ? "" : target.dataset.cluster;
    render();
  }

  if (action === "project-month") {
    openProjectProfileEntry(target.dataset.project);
  }

  if (action === "profile-month-report") {
    openMonthReport(target.dataset.month || 5, target.dataset.project || state.profileProjectId || state.projectId || "");
  }

  if (action === "month-print") {
    window.print();
    return;
  }

  if (action === "attention-nc") {
    state.projectId = target.dataset.project || state.projectId;
    state.month = target.dataset.month || state.month;
    v116SetSelectedProject(state.projectId);
    V116_INTERACTION_STATE.selectedMonth = state.month || "all";
    syncDetailFromProject("");
    state.view = "details";
    render();
    resetPageScrollToTop();
  }

  if (action === "attention-benchmark") {
    state.projectId = target.dataset.project || state.projectId;
    openSubjectCompareFromBenchmarkItem(target.dataset.item || "", target.dataset.month || state.month || "all", target.dataset.project || "");
    return;
  }

  if (action === "project-scroll") {
    const node = document.getElementById(target.dataset.target);
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (action === "demo-start") {
    openProjectProfileEntry("sjz");
  }

  if (action === "project-main") {
    openProjectProfileEntry(target.dataset.project);
  }

  if (action === "toggle-home-rank") {
    state.homeRankExpanded = !state.homeRankExpanded;
    render();
  }

  if (action === "toggle-home-overview") {
    state.homeOverviewExpanded = !state.homeOverviewExpanded;
    render();
  }

  if (action === "toggle-home-projects") {
    state.homeProjectsExpanded = !state.homeProjectsExpanded;
    render();
  }

  if (action === "benchmark-select-project") {
    state.benchmark.selectedProjectId = target.dataset.project;
    state.benchmark.selectedRowKey = target.dataset.rowKey || "";
    render();
  }

  if (action === "unit-benchmark-nc") {
    openUnitBenchmarkDetails(getUnitBenchmarkRow(target.dataset.rowKey));
  }

  if (action === "benchmark-nc") {
    openBenchmarkDetails(target.dataset.project, target.dataset.month || state.benchmark.month, target.dataset.item || state.benchmark.item);
  }

  if (action === "activity-open") {
    const activity = getActivityById(target.dataset.activity);
    if (activity) {
      v116SetSelectedProject(activity.projectId);
      V116_INTERACTION_STATE.selectedMonth = String(activity.month);
    }
    openActivityDetail(target.dataset.activity, state.view);
  }

  if (action === "activity-nc") {
    const activity = getActivityById(target.dataset.activity);
    if (activity) {
      v116SetSelectedProject(activity.projectId);
      V116_INTERACTION_STATE.selectedMonth = String(activity.month);
    }
    openActivityLedger(target.dataset.activity, target.dataset.item || "", state.view);
  }

  if (action === "activity-subject-nc") {
    openActivitySubjectLedger(target.dataset.activity, target.dataset.subjectId, "activityDetail");
  }

  if (action === "activity-back") {
    state.view = state.activityDetail.returnView || "activity";
    render();
    resetPageScrollToTop();
  }

  if (action === "activity-cost-select") {
    state.activityDetail.selectedCostItem = state.activityDetail.selectedCostItem === target.dataset.item ? "" : target.dataset.item;
    render();
  }

  if (action === "toggle-activity-detail-table") {
    state.activityDetail.costTableExpanded = !state.activityDetail.costTableExpanded;
    render();
  }

  if (action === "activity-preview-record") {
    const record = ACTIVITY_RECORDS.find((item) => item.id === target.dataset.id);
    if (record) {
      openActivityLedger(record.activityId, record.activityCostItem, "activityDetail");
      state.detail.selectedId = record.id;
      render();
      resetPageScrollToTop();
    }
  }

  if (action === "activity-filter-month") {
    state.activity.month = target.dataset.month;
    state.activity.cardsExpanded = false;
    state.activity.tableExpanded = false;
    render();
  }

  if (action === "activity-clear-month") {
    state.activity.month = "all";
    state.activity.cardsExpanded = false;
    state.activity.tableExpanded = false;
    render();
  }

  if (action === "activity-benchmark-select") {
    state.activityBenchmark.selectedActivityId = target.dataset.activity;
    render();
  }

  if (action === "toggle-activity-cards") {
    state.activity.cardsExpanded = !state.activity.cardsExpanded;
    render();
  }

  if (action === "toggle-activity-table") {
    state.activity.tableExpanded = !state.activity.tableExpanded;
    render();
  }

  if (action === "toggle-activity-benchmark-table") {
    state.activityBenchmark.tableExpanded = !state.activityBenchmark.tableExpanded;
    render();
  }

  if (action === "trend-month") {
    state.month = target.dataset.month;
    V116_INTERACTION_STATE.selectedMonth = target.dataset.month;
    render();
  }

  if (action === "trend-segment") {
    state.month = target.dataset.month;
    V116_INTERACTION_STATE.selectedMonth = target.dataset.month;
    state.scope = target.dataset.main;
    state.selectedSubjectKey = target.dataset.main;
    v116ApplyCostType(target.dataset.main, { syncPage: false });
    state.expandedKeys.add(target.dataset.main);
    render();
  }

  if (action === "home-trend-month") {
    openMonthReport(target.dataset.month || 5, "");
  }

  if (action === "home-trend-segment") {
    openMonthReport(target.dataset.month || 5, "", { categoryFilter: target.dataset.main || "all" });
  }

  if (action === "month-category") {
    const main = target.dataset.main;
    state.monthCategoryFilter = state.monthCategoryFilter === main && !state.monthSubjectKey ? "all" : main;
    state.monthSubjectKey = "";
    state.monthProjectFilter = resolveMonthReportProjectId();
    state.monthDetailVisible = false;
    state.monthDetailExpanded = false;
    render();
  }

  if (action === "month-subject") {
    const subject = subjectIndex[target.dataset.key];
    if (subject) {
      state.monthSubjectKey = subject.key;
      state.monthCategoryFilter = subject.main;
      state.monthProjectFilter = resolveMonthReportProjectId();
      state.monthDetailVisible = false;
      state.monthDetailExpanded = false;
      render();
    }
  }

  if (action === "month-reset") {
    state.monthCategoryFilter = "all";
    state.monthSubjectKey = "";
    state.monthProjectFilter = resolveMonthReportProjectId();
    state.monthProjectsExpanded = false;
    state.monthDetailVisible = false;
    state.monthDetailExpanded = false;
    render();
  }

  if (action === "month-clear-filter") {
    state.monthCategoryFilter = "all";
    state.monthSubjectKey = "";
    state.monthProjectFilter = resolveMonthReportProjectId();
    state.monthDetailVisible = false;
    state.monthDetailExpanded = false;
    render();
  }

  if (action === "month-matrix-cell") {
    const subject = subjectIndex[target.dataset.key];
    if (subject) {
      state.monthProjectFilter = target.dataset.project || "";
      state.monthSubjectKey = subject.key;
      state.monthCategoryFilter = subject.main;
      state.monthDetailVisible = true;
      state.monthDetailExpanded = false;
      render();
    }
  }

  if (action === "month-toggle-projects") {
    state.monthProjectsExpanded = !state.monthProjectsExpanded;
    render();
  }

  if (action === "month-toggle-detail") {
    if (!state.monthDetailVisible) {
      state.monthDetailVisible = true;
      state.monthDetailExpanded = false;
    } else if (target.dataset.hasMore === "true" && !state.monthDetailExpanded) {
      state.monthDetailExpanded = true;
    } else {
      state.monthDetailVisible = false;
      state.monthDetailExpanded = false;
    }
    render();
  }

  if (action === "subject-row") {
    const key = target.dataset.key;
    const subject = subjectIndex[key];
    if (!subject) return;
    state.selectedSubjectKey = key;
    v116SetSelectedSubject(key);
    subject.ancestors.forEach((ancestor) => state.expandedKeys.add(ancestor));
    render();
  }

  if (action === "subject-toggle") {
    const key = target.dataset.key;
    const subject = subjectIndex[key];
    if (!subject) return;
    if (state.expandedKeys.has(key)) {
      state.expandedKeys.delete(key);
    } else {
      state.expandedKeys.add(key);
      subject.ancestors.forEach((ancestor) => state.expandedKeys.add(ancestor));
    }
    render();
  }

  if (action === "tree-expand-all") {
    flatSubjects.forEach((subject) => {
      if (subject.level < 3) state.expandedKeys.add(subject.key);
    });
    render();
  }

  if (action === "tree-collapse-all") {
    state.expandedKeys = new Set();
    render();
  }

  if (action === "subject-benchmark") {
    const subject = subjectIndex[target.dataset.key];
    openSubjectCompareFromBenchmarkItem(mapSubjectToBenchmark(subject), state.month || "all");
    return;
  }

  if (action === "select-record") {
    v127OpenSingleRecordDrawer(target.dataset.id);
  }

  if (action === "return-source") {
    if (state.detail.returnView === "activityDetail" && state.detail.activityId) {
      state.activityDetail.activityId = state.detail.activityId;
      state.view = "activityDetail";
    } else if (state.detail.returnView === "compare") {
      state.view = "compare";
    } else if (state.detail.returnView === "profile") {
      state.view = "profile";
      state.profileProjectId = state.detail.projectId;
    } else if (state.detail.returnView === "activity") {
      state.view = "activity";
    } else {
      state.view = "profile";
      state.profileProjectId = state.detail.projectId || state.projectId;
      state.projectId = state.profileProjectId;
    }
    render();
    resetPageScrollToTop();
  }

  if (action === "detail-page") {
    state.detail.page = Number(target.dataset.page);
    render();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  v116SetRenderActionType("filter");

  if (action === "filter-project") {
    state.projectId = target.value;
    v116SetSelectedProject(target.value);
    state.selectedSubjectKey = state.scope === "all" ? "" : state.scope;
    render();
  }

  if (action === "benchmark-filter") {
    const field = target.dataset.field;
    state.benchmark[field] = target.value;
    state.benchmark.selectedRowKey = "";
    if (field === "item") {
      state.benchmark.unit = "全部单位";
      state.benchmark.selectedProjectId = "sjz";
    }
    if (field === "unit" && target.value !== "全部单位") {
      const rows = getCurrentUnitBenchmarkRows();
      state.benchmark.selectedProjectId = rows[0] ? rows[0].project.id : state.benchmark.selectedProjectId;
    }
    if (field === "projectScope") {
      const ids = getBenchmarkProjectIds(target.value);
      state.benchmark.selectedProjectId = ids[0] || "sjz";
    }
    render();
  }

  if (action === "activity-filter") {
    const field = target.dataset.field;
    state.activity[field] = target.value;
    if (field === "projectId") v116SetSelectedProject(target.value);
    if (field === "month") V116_INTERACTION_STATE.selectedMonth = target.value;
    state.activity.cardsExpanded = false;
    state.activity.tableExpanded = false;
    render();
  }

  if (action === "activity-benchmark-filter") {
    const field = target.dataset.field;
    state.activityBenchmark[field] = target.value;
    const activities = filterBenchmarkActivities(state.activityBenchmark);
    state.activityBenchmark.selectedActivityId = activities[0] ? activities[0].activityId : "";
    state.activityBenchmark.tableExpanded = false;
    render();
  }

  if (action === "filter-month") {
    state.month = target.value;
    V116_INTERACTION_STATE.selectedMonth = target.value;
    render();
  }

  if (action === "filter-scope") {
    state.scope = target.value;
    v116ApplyCostType(target.value, { syncPage: false });
    state.selectedSubjectKey = target.value === "all" ? "" : target.value;
    if (target.value !== "all") state.expandedKeys.add(target.value);
    render();
  }

  if (action === "detail-project") {
    state.detail.projectId = target.value;
    v116SetSelectedProject(target.value);
    state.detail.activityId = "";
    state.detail.unitBenchmarkName = "";
    state.detail.unitBenchmarkUnit = "";
    state.detail.ncRecordIds = [];
    state.detail.page = 1;
    state.detail.selectedId = "";
    render();
  }

  if (action === "detail-month") {
    state.detail.month = target.value;
    V116_INTERACTION_STATE.selectedMonth = target.value;
    state.detail.activityId = "";
    state.detail.unitBenchmarkName = "";
    state.detail.unitBenchmarkUnit = "";
    state.detail.ncRecordIds = [];
    state.detail.page = 1;
    state.detail.selectedId = "";
    render();
  }

  if (action === "detail-subject-filter") {
    if (target.value.startsWith("activity:")) {
      state.detail.activityCostItem = target.value.replace("activity:", "");
      state.detail.benchmarkItem = "";
      state.detail.subjectKey = "";
      v116SetSelectedSubject("");
    } else if (target.value.startsWith("benchmark:")) {
      state.detail.benchmarkItem = target.value.replace("benchmark:", "");
      state.detail.subjectKey = "";
      state.detail.activityCostItem = "";
      v116SetSelectedSubject("");
    } else {
      state.detail.subjectKey = target.value;
      v116SetSelectedSubject(target.value);
      v116ApplyCostType(subjectIndex[target.value]?.main || "all", { syncPage: false });
      state.detail.benchmarkItem = "";
      state.detail.activityCostItem = "";
    }
    state.detail.unitBenchmarkName = "";
    state.detail.unitBenchmarkUnit = "";
    state.detail.ncRecordIds = [];
    state.detail.page = 1;
    state.detail.selectedId = "";
    render();
  }

  if (action === "detail-activity") {
    state.detail.activityId = target.value;
    const activity = getActivityById(target.value);
    if (activity) {
      state.detail.projectId = activity.projectId;
      state.detail.month = String(activity.month);
      v116SetSelectedProject(activity.projectId);
      V116_INTERACTION_STATE.selectedMonth = String(activity.month);
    }
    state.detail.unitBenchmarkName = "";
    state.detail.unitBenchmarkUnit = "";
    state.detail.ncRecordIds = [];
    state.detail.page = 1;
    state.detail.selectedId = "";
    render();
  }

  if (action === "detail-sort") {
    state.detail.sort = target.value;
    state.detail.page = 1;
    render();
  }
});

document.addEventListener("input", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  v116SetRenderActionType("filter");

  if (action === "filter-search") {
    state.search = target.value;
    render();
    const input = document.getElementById("subjectSearch");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }

  if (action === "detail-query") {
    state.detail.query = target.value;
    state.detail.page = 1;
    state.detail.selectedId = "";
    render();
    const input = document.getElementById("detailSearch");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
});
}

function bootstrapV12SharedData() {
try {
  V10_DATA = buildV10DataFromSharedCurrent();
  V92_LEGACY_SNAPSHOT = cloneV92LegacySnapshot();
  V10_COMPAT_DATA = buildV92CompatibleDataFromV10(V10_DATA, V92_LEGACY_SNAPSHOT);
  applyV10CompatDataToV92Shell(V10_COMPAT_DATA);
} catch (error) {
  console.warn("V12 shared data hardlock blocked rendering", error);
  renderV112SharedDataBlocked(error);
  if (typeof window !== "undefined") {
    window.V10_BOOT_ERROR = error && error.stack ? error.stack : String(error);
    window.V112_HARDLOCK_STATUS = V112_HARDLOCK_STATUS;
  }
}

if (typeof window !== "undefined") {
  window.V10_DATA = V10_DATA;
  window.V92_LEGACY_SNAPSHOT = V92_LEGACY_SNAPSHOT;
  window.V10_COMPAT_DATA = V10_COMPAT_DATA;
  window.auditV112RenderedDomMatchesCurrent = auditV112RenderedDomMatchesCurrent;
  window.auditV112CurrentDataHardLock = auditV112CurrentDataHardLock;
  window.V111_MANAGEMENT_ATTENTION_VIEW_NAME = V111_MANAGEMENT_ATTENTION_VIEW_NAME;
  window.V111_ATTENTION_VIEW_STATUS = V111_ATTENTION_VIEW_STATUS;
  window.V112_HARDLOCK_STATUS = V112_HARDLOCK_STATUS;
  window.V112_EXPECTED_CURRENT_METRICS = { ...V112_EXPECTED_CURRENT_METRICS };
  window.V11_DATA_SOURCE = V11_SHARED_DATA_SOURCE;
  window.V11_SHARED_DATA_FILES = [...V11_SHARED_DATA_FILES];
  window.V11_VERSION = V11_VERSION;
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.dataset.v10DataReady = V10_DATA ? "true" : "false";
    document.documentElement.dataset.v10ProjectCount = V10_DATA ? String(V10_DATA.PROJECTS_V10.length) : "0";
    document.documentElement.dataset.v10CompatReady = V10_COMPAT_DATA ? "true" : "false";
    document.documentElement.dataset.v11DataSource = V11_SHARED_DATA_SOURCE;
    document.documentElement.dataset.v112Hardlock = V112_HARDLOCK_STATUS.sharedLoaded ? "shared-current-data" : "blocked";
  }
  if (V10_DATA && typeof render === "function") render();
}
}

function bootV12Dashboard() {
  init({ render: false });
  v1398ApplyInitialRouteHash();
  v1398BindTopRouteEvents();
  bindV12DashboardEvents();
  bootstrapV12SharedData();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootV12Dashboard, { once: true });
  } else {
    bootV12Dashboard();
  }
}
