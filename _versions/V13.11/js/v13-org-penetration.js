(function (global) {
  "use strict";

  const ORG_VIEW = "org";
  const ORG_HASHES = new Set(["org", "organization", "org-penetration"]);
  const MONTH_OPTIONS = [
    { value: "all", label: "累计" },
    { value: "1", label: "1月" },
    { value: "2", label: "2月" },
    { value: "3", label: "3月" },
    { value: "4", label: "4月" },
    { value: "5", label: "5月" },
  ];
  const NATURE_LABELS = ["固定成本", "变动成本", "管理费用", "销售费用", "税金", "财务费用", "其他", "其他成本", "财税成本"];

  let renderPatched = false;
  let detailsPatched = false;
  let drawerPatched = false;
  let eventsBound = false;

  function h(value) {
    if (typeof escapeHtml === "function") return escapeHtml(value == null ? "" : String(value));
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function views() {
    return (global.OPERATION_COST_DATA_VIEWS && global.OPERATION_COST_DATA_VIEWS.views) || {};
  }

  function coreTables() {
    return (global.OPERATION_COST_DATA_CORE && global.OPERATION_COST_DATA_CORE.tables) || {};
  }

  function role() {
    return global.V13Auth && typeof global.V13Auth.getCurrentRole === "function"
      ? global.V13Auth.getCurrentRole()
      : null;
  }

  function roleAllows(projectId, currentRole = role()) {
    if (!currentRole) return true;
    if (currentRole.visibleProjectIds === "all") return true;
    return (currentRole.visibleProjectIds || []).indexOf(projectId) >= 0;
  }

  function money(value) {
    if (global.V133OrgCharts && typeof global.V133OrgCharts.money === "function") return global.V133OrgCharts.money(value);
    const wan = Number(value || 0) / 10000;
    return wan.toLocaleString("zh-CN", { minimumFractionDigits: wan >= 100 ? 0 : 1, maximumFractionDigits: 1 }) + "万元";
  }

  function pct(value) {
    if (global.V133OrgCharts && typeof global.V133OrgCharts.percent === "function") return global.V133OrgCharts.percent(value);
    if (!Number.isFinite(Number(value))) return "-";
    return (Number(value || 0) * 100).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  }

  function signedMoney(value) {
    const amount = Number(value || 0);
    return (amount >= 0 ? "+" : "-") + money(Math.abs(amount));
  }

  function orgState() {
    if (!state.org) {
      state.org = {
        month: "all",
        nature: "all",
        projectScope: "all",
        query: "",
        focusOnly: false,
        selectedType: "company",
        projectId: "",
        natureName: "",
        subjectId: "",
        subjectKey: "",
        subjectName: "",
        expandedProjects: {},
        expandedNatures: {},
        analysisTab: "contribution",
        focusDrawerOpen: false,
        projectFocusOpen: false,
        notice: "",
        ncContext: null,
      };
    }
    return state.org;
  }

  function sortOrderByProjectId() {
    return (coreTables().PROJECTS_V10 || []).reduce((map, project, index) => {
      map[project.project_id] = Number(project.sort_order || index + 1);
      return map;
    }, {});
  }

  function projectCatalog() {
    const order = sortOrderByProjectId();
    const coreById = (coreTables().PROJECTS_V10 || []).reduce((map, item) => {
      map[item.project_id] = item;
      return map;
    }, {});
    const fallback = typeof PROJECTS !== "undefined" ? PROJECTS : [];
    const fallbackById = fallback.reduce((map, item) => {
      map[item.id] = item;
      return map;
    }, {});
    return (views().VIEW_HOME_PROJECT_SUMMARY || []).map((row) => {
      const core = coreById[row.project_id] || {};
      const local = fallbackById[row.project_id] || {};
      return {
        id: row.project_id,
        shortName: row.project_short_name || core.project_short_name || local.shortName || row.project_id,
        fullName: row.project_name || core.project_name || local.fullName || row.project_id,
        totalCost: Number(row.total_cost || 0),
        currentMonthCost: Number(row.current_month_cost || 0),
        ncCount: Number(row.nc_detail_count || 0),
        activityCount: Number(row.activity_count || 0),
        sequenceBudget: Number(row.sequence_budget || 0),
        budgetRate: Number(row.budget_execution_rate || 0),
        executionCategory: row.execution_category || "",
        projectType: row.project_type || core.project_type || local.project_type || "",
        order: order[row.project_id] || 999,
      };
    }).sort((a, b) => a.order - b.order);
  }

  function allowedProjects() {
    const currentRole = role();
    return projectCatalog().filter((project) => roleAllows(project.id, currentRole));
  }

  function projectById(projectId) {
    return projectCatalog().find((project) => project.id === projectId) || allowedProjects()[0] || projectCatalog()[0] || null;
  }

  function clampProjectId(projectId) {
    const rows = allowedProjects();
    if (!rows.length) return "";
    if (rows.some((project) => project.id === projectId)) return projectId;
    return rows[0].id;
  }

  function selectedMonthValue() {
    const org = orgState();
    return org.month === "all" ? 5 : Number(org.month || 5);
  }

  function previousMonthValue() {
    return Math.max(1, selectedMonthValue() - 1);
  }

  function monthLabel(value) {
    const hit = MONTH_OPTIONS.find((item) => item.value === String(value));
    return hit ? hit.label : `${value}月`;
  }

  function ncMonthLabel(value = orgState().month) {
    return value === "all" ? "累计" : `2026年${Number(value)}月`;
  }

  function ncButtonLabel(value = orgState().month, suffix = "NC明细") {
    return value === "all" ? `查看累计${suffix}` : `查看${Number(value)}月${suffix}`;
  }

  function monthlyRows(projectId) {
    return (views().VIEW_MONTH_COST_SUMMARY || []).filter((row) => row.project_id === projectId);
  }

  function monthAmount(projectId, month) {
    const row = monthlyRows(projectId).find((item) => Number(item.cost_month) === Number(month));
    return Number(row && row.raw_cost_amount || 0);
  }

  function currentProjectAmount(project) {
    const org = orgState();
    if (org.month === "all") return Number(project.totalCost || 0);
    return monthAmount(project.id, org.month);
  }

  function projectNcAmountContext(project, month = orgState().month) {
    const selected = month === "all" ? Number(project.totalCost || 0) : monthAmount(project.id, month);
    return {
      titleSuffix: `${ncMonthLabel(month)}NC明细范围`,
      primaryLabel: month === "all" ? "累计金额" : `${Number(month)}月金额`,
      primaryAmount: selected,
      secondaryAmounts: month === "all"
        ? [{ label: "其中5月金额", amount: monthAmount(project.id, 5) }]
        : [{ label: "累计金额", amount: Number(project.totalCost || 0) }],
    };
  }

  function subjectNcAmountContext(subject, month = orgState().month) {
    const selected = month === "all" ? Number(subject.cumulativeAmount || 0) : Number(subject.selectedAmount || 0);
    return {
      titleSuffix: `${ncMonthLabel(month)}NC明细`,
      primaryLabel: month === "all" ? "累计金额" : `${Number(month)}月金额`,
      primaryAmount: selected,
      secondaryAmounts: month === "all"
        ? [{ label: "其中5月金额", amount: Number(subject.currentMonthAmount || 0) }]
        : [{ label: "累计金额", amount: Number(subject.cumulativeAmount || 0) }],
    };
  }

  function projectDelta(project) {
    const current = monthAmount(project.id, selectedMonthValue());
    const previous = monthAmount(project.id, previousMonthValue());
    return {
      current,
      previous,
      delta: current - previous,
      absDelta: Math.abs(current - previous),
    };
  }

  function subjectRows(projectId) {
    const rows = (views().VIEW_PROJECT_SUBJECT_TREE || []).filter((row) => row.project_id === projectId);
    const groups = new Map();
    rows.forEach((row) => {
      const id = row.subject_id || [row.level1_name, row.level2_name, row.level3_name, row.subject_name].filter(Boolean).join("|");
      if (!groups.has(id)) {
        groups.set(id, {
          projectId,
          subjectId: row.subject_id || "",
          subjectCode: row.subject_code || "",
          subjectName: row.subject_name || row.level3_name || row.level2_name || row.level1_name || "成本科目",
          level1: row.level1_name || "其他",
          level2: row.level2_name || "",
          level3: row.level3_name || row.subject_name || "",
          costNature: row.cost_nature || "",
          cumulativeAmount: 0,
          currentMonthAmount: 0,
          previousMonthAmount: 0,
          selectedAmount: 0,
          rawRows: [],
        });
      }
      const item = groups.get(id);
      const amount = Number(row.raw_cost_amount || 0);
      item.cumulativeAmount += amount;
      if (Number(row.cost_month) === selectedMonthValue()) item.currentMonthAmount += amount;
      if (Number(row.cost_month) === previousMonthValue()) item.previousMonthAmount += amount;
      if (orgState().month === "all" || Number(row.cost_month) === Number(orgState().month)) item.selectedAmount += amount;
      item.rawRows.push(row);
    });
    const detailBySubject = detailSubjectIndex(projectId);
    return [...groups.values()].map((item) => {
      const detailRows = detailBySubject[item.subjectId] || [];
      const subjectKey = detailRows[0] ? detailRows[0].subjectKey : [item.level1, item.level2, item.level3 || item.subjectName].filter(Boolean).join("|");
      return {
        ...item,
        subjectKey,
        ncCount: detailRows.length || traceRows(projectId, { subjectId: item.subjectId }).length,
        projectRatio: item.cumulativeAmount / Math.max(1, (projectById(projectId) || {}).totalCost || 1),
        delta: item.currentMonthAmount - item.previousMonthAmount,
        absDelta: Math.abs(item.currentMonthAmount - item.previousMonthAmount),
      };
    }).sort((a, b) => b.cumulativeAmount - a.cumulativeAmount);
  }

  function detailSubjectIndex(projectId) {
    const records = typeof DETAIL_RECORDS !== "undefined" && Array.isArray(DETAIL_RECORDS) ? DETAIL_RECORDS : [];
    return records.filter((record) => record.projectId === projectId).reduce((map, record) => {
      const key = record.subjectId || "";
      if (!key) return map;
      if (!map[key]) map[key] = [];
      map[key].push(record);
      return map;
    }, {});
  }

  function traceRows(projectId, options = {}) {
    return (views().VIEW_COST_DETAIL_TRACE || []).filter((row) => {
      if (projectId && row.project_id !== projectId) return false;
      if (options.month && options.month !== "all" && Number(row.cost_month) !== Number(options.month)) return false;
      if (options.subjectId && row.subject_id !== options.subjectId) return false;
      if (options.nature && options.nature !== "all" && row.level1_name !== options.nature) return false;
      return true;
    });
  }

  function natureRows(projectId) {
    const map = new Map();
    subjectRows(projectId).forEach((subject) => {
      const key = subject.level1 || "其他";
      if (!map.has(key)) {
        map.set(key, {
          projectId,
          name: key,
          cumulativeAmount: 0,
          selectedAmount: 0,
          currentMonthAmount: 0,
          previousMonthAmount: 0,
          ncCount: 0,
          subjects: [],
        });
      }
      const row = map.get(key);
      row.cumulativeAmount += subject.cumulativeAmount;
      row.selectedAmount += subject.selectedAmount;
      row.currentMonthAmount += subject.currentMonthAmount;
      row.previousMonthAmount += subject.previousMonthAmount;
      row.ncCount += subject.ncCount;
      row.subjects.push(subject);
    });
    return [...map.values()].map((row) => ({
      ...row,
      delta: row.currentMonthAmount - row.previousMonthAmount,
      absDelta: Math.abs(row.currentMonthAmount - row.previousMonthAmount),
    })).sort((a, b) => {
      const ai = NATURE_LABELS.indexOf(a.name);
      const bi = NATURE_LABELS.indexOf(b.name);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  }

  function topProjectChangeIds(projectRows = focusProjectRows()) {
    return new Set(projectRows
      .map((project) => ({ id: project.id, ...projectDelta(project) }))
      .filter((row) => row.absDelta > 0)
      .sort((a, b) => b.absDelta - a.absDelta)
      .slice(0, 5)
      .map((row) => row.id));
  }

  function topSubjectIds(projectId, rows = activeSubjectRows(projectId)) {
    return new Set(rows
      .filter((row) => row.absDelta > 0)
      .sort((a, b) => b.absDelta - a.absDelta)
      .slice(0, 5)
      .map((row) => row.subjectId || row.subjectKey));
  }

  function projectMarkers(project, topIds = topProjectChangeIds()) {
    const labels = [];
    if (project.executionCategory === "执行偏低") labels.push({ label: "执行偏低", className: "is-low" });
    if (topIds.has(project.id) && projectDelta(project).absDelta > 0) labels.push({ label: "变化较大", className: "is-focus" });
    return labels;
  }

  function subjectMarkers(subject, topIds = topSubjectIds(subject.projectId)) {
    const labels = [];
    if (subject.previousMonthAmount === 0 && subject.currentMonthAmount > 0) labels.push({ label: "本期新增", className: "is-focus" });
    if (topIds.has(subject.subjectId || subject.subjectKey) && subject.absDelta > 0) labels.push({ label: "变化较大", className: "is-focus" });
    return labels;
  }

  function markerHtml(markers, limit = 2) {
    const visible = (markers || []).slice(0, limit);
    const hidden = (markers || []).length - visible.length;
    return `${visible.map((marker) => `<span class="org-badge ${marker.className || ""}">${h(marker.label)}</span>`).join("")}${
      hidden > 0 ? `<span class="org-badge is-more">+${hidden}</span>` : ""
    }`;
  }

  function ensureOrgState(options = {}) {
    const org = orgState();
    const route = options.syncRoute === false ? null : parseOrgHash();
    if (route) {
      org.projectId = route.projectId || org.projectId;
      org.natureName = route.nature || org.natureName;
      org.subjectId = route.subjectId || org.subjectId;
      org.month = route.month || org.month || "all";
    }
    const requested = org.projectId || org.projectScope || "";
    const clamped = requested && requested !== "all" ? clampProjectId(requested) : "";
    if (requested && requested !== "all" && clamped !== requested) {
      org.notice = "已切换到当前可查看项目。";
    }
    org.projectId = clamped || (org.selectedType === "company" ? "" : clampProjectId(org.projectId));
    if (!org.projectId && org.selectedType !== "company") org.projectId = clampProjectId("");
    if (org.projectScope !== "all" && !roleAllows(org.projectScope)) org.projectScope = clampProjectId(org.projectScope);
    if (org.selectedType === "company") {
      org.natureName = "";
      org.subjectId = "";
      org.subjectKey = "";
      org.subjectName = "";
    }
    return org;
  }

  function parseOrgHash() {
    const raw = String(global.location && global.location.hash ? global.location.hash.slice(1) : "");
    if (!raw) return null;
    const parts = raw.split("?");
    if (!ORG_HASHES.has(parts[0])) return null;
    const params = new URLSearchParams(parts[1] || "");
    return {
      projectId: params.get("projectId") || params.get("project") || "",
      nature: params.get("nature") || "",
      subjectId: params.get("subjectId") || "",
      month: params.get("month") || "",
    };
  }

  function replaceOrgHash(org = orgState()) {
    if (!global.history || !global.location) return;
    const params = new URLSearchParams();
    if (org.projectId) params.set("projectId", org.projectId);
    if (org.natureName) params.set("nature", org.natureName);
    if (org.subjectId) params.set("subjectId", org.subjectId);
    if (org.month && org.month !== "all") params.set("month", org.month);
    const next = "#org" + (params.toString() ? "?" + params.toString() : "");
    if (global.location.hash !== next) global.history.pushState(null, "", next);
  }

  function openOrg(options = {}) {
    const org = orgState();
    const shouldPreserveScroll = Boolean(options.preserveScroll && state.view === ORG_VIEW && typeof global.scrollY === "number");
    const previousScrollY = shouldPreserveScroll ? global.scrollY : 0;
    state.view = ORG_VIEW;
    org.selectedType = options.type || org.selectedType || "company";
    org.projectId = options.projectId !== undefined ? options.projectId : org.projectId;
    org.natureName = options.natureName !== undefined ? options.natureName : org.natureName;
    org.subjectId = options.subjectId !== undefined ? options.subjectId : org.subjectId;
    org.subjectKey = options.subjectKey !== undefined ? options.subjectKey : org.subjectKey;
    org.subjectName = options.subjectName !== undefined ? options.subjectName : org.subjectName;
    org.notice = options.notice || (options.source === "subjectCompare"
      ? `来自科目横向对比：${options.projectId || "项目"} / ${options.subjectName || "成本科目"}，已定位对应项目与科目节点。`
      : "");
    ensureOrgState({ syncRoute: false });
    if (org.projectId && options.expandProject !== false) org.expandedProjects[org.projectId] = true;
    if (org.projectId && org.natureName && options.expandNature !== false) org.expandedNatures[org.projectId + "|" + org.natureName] = true;
    if (options.hash !== false) replaceOrgHash(org);
    if (typeof v116SetRenderActionType === "function") v116SetRenderActionType("navigation");
    render();
    if (shouldPreserveScroll && typeof global.scrollTo === "function") {
      global.requestAnimationFrame(() => global.scrollTo({ top: previousScrollY, behavior: "auto" }));
    } else if (typeof resetPageScrollToTop === "function") {
      resetPageScrollToTop();
    }
  }

  function selectCompany() {
    orgState().projectFocusOpen = false;
    openOrg({ type: "company", projectId: "", natureName: "", subjectId: "", subjectKey: "", subjectName: "" });
  }

  function selectProject(projectId, options = {}) {
    orgState().projectFocusOpen = false;
    const targetProjectId = clampProjectId(projectId);
    const org = orgState();
    const wasExpanded = Boolean(targetProjectId && org.expandedProjects[targetProjectId]);
    const shouldCollapse = Boolean(options.toggleExpansion && wasExpanded && org.selectedType === "project" && org.projectId === targetProjectId);
    if (targetProjectId) {
      if (shouldCollapse) delete org.expandedProjects[targetProjectId];
      else org.expandedProjects[targetProjectId] = true;
    }
    openOrg({
      type: "project",
      projectId: targetProjectId,
      natureName: "",
      subjectId: "",
      subjectKey: "",
      subjectName: "",
      preserveScroll: options.preserveScroll,
      expandProject: !shouldCollapse,
    });
  }

  function selectNature(projectId, natureName, options = {}) {
    orgState().projectFocusOpen = false;
    const org = orgState();
    const targetProjectId = clampProjectId(projectId);
    const key = targetProjectId + "|" + natureName;
    const wasExpanded = Boolean(org.expandedNatures[key]);
    const shouldCollapse = Boolean(options.toggleExpansion && wasExpanded && org.selectedType === "nature" && org.projectId === targetProjectId && org.natureName === natureName);
    if (shouldCollapse) delete org.expandedNatures[key];
    else org.expandedNatures[key] = true;
    openOrg({
      type: "nature",
      projectId: targetProjectId,
      natureName,
      subjectId: "",
      subjectKey: "",
      subjectName: "",
      preserveScroll: options.preserveScroll,
      expandNature: !shouldCollapse,
    });
  }

  function selectSubject(projectId, subjectId, options = {}) {
    const subject = subjectRows(projectId).find((row) => row.subjectId === subjectId);
    if (!subject) return;
    orgState().projectFocusOpen = false;
    openOrg({
      type: "subject",
      projectId: clampProjectId(projectId),
      natureName: subject.level1,
      subjectId: subject.subjectId,
      subjectKey: subject.subjectKey,
      subjectName: subject.subjectName,
      preserveScroll: options.preserveScroll,
    });
  }

  function collapseOrgTree(options = {}) {
    const shouldPreserveScroll = Boolean(options.preserveScroll && typeof global.scrollY === "number");
    const previousScrollY = shouldPreserveScroll ? global.scrollY : 0;
    const org = orgState();
    org.expandedProjects = {};
    org.expandedNatures = {};
    render();
    if (shouldPreserveScroll && typeof global.scrollTo === "function") {
      global.requestAnimationFrame(() => global.scrollTo({ top: previousScrollY, behavior: "auto" }));
    }
  }

  function activeProjectRows() {
    const org = orgState();
    let rows = allowedProjects();
    if (org.projectScope && org.projectScope !== "all") rows = rows.filter((project) => project.id === org.projectScope);
    if (org.query) {
      const term = org.query.trim().toLowerCase();
      rows = rows.filter((project) => `${project.shortName} ${project.fullName}`.toLowerCase().includes(term)
        || subjectRows(project.id).some((subject) => `${subject.subjectName} ${subject.level1} ${subject.level2} ${subject.level3}`.toLowerCase().includes(term)));
    }
    return rows;
  }

  function activeSubjectRows(projectId) {
    const org = orgState();
    let rows = subjectRows(projectId);
    if (org.nature && org.nature !== "all") rows = rows.filter((subject) => subject.level1 === org.nature);
    if (org.query) {
      const project = projectById(projectId);
      const term = org.query.trim().toLowerCase();
      const projectMatches = project && `${project.shortName} ${project.fullName}`.toLowerCase().includes(term);
      if (!projectMatches) {
        rows = rows.filter((subject) => `${subject.subjectName} ${subject.level1} ${subject.level2} ${subject.level3}`.toLowerCase().includes(term));
      }
    }
    return rows;
  }

  function focusProjectRows() {
    const rows = activeProjectRows();
    const org = orgState();
    if (org.selectedType !== "company" && org.projectId && rows.some((project) => project.id === org.projectId)) {
      return rows.filter((project) => project.id === org.projectId);
    }
    return rows;
  }

  function focusNodes() {
    const rows = focusProjectRows();
    const projectTopIds = topProjectChangeIds(rows);
    const nodes = [];
    rows.forEach((project) => {
      const markers = projectMarkers(project, projectTopIds);
      const delta = projectDelta(project);
      markers.forEach((marker) => {
        nodes.push({
          type: "project",
          projectId: project.id,
          title: project.shortName,
          label: marker.label,
          detail: marker.label === "执行偏低"
            ? `执行分类来自当前共享视图，执行率${pct(project.budgetRate)}。`
            : `最近两月变化${signedMoney(delta.delta)}，建议核查明细范围。`,
          sort: marker.label === "执行偏低" ? 2e15 : delta.absDelta,
        });
      });
    });
    rows.forEach((project) => {
      const subjectRowsInScope = activeSubjectRows(project.id);
      const subjectTop = topSubjectIds(project.id, subjectRowsInScope);
      subjectRowsInScope.forEach((subject) => {
        subjectMarkers(subject, subjectTop).forEach((marker) => {
          nodes.push({
            type: "subject",
            projectId: project.id,
            subjectId: subject.subjectId,
            title: rows.length === 1 ? subject.subjectName : `${project.shortName} · ${subject.subjectName}`,
            label: marker.label,
            detail: `环比变化${signedMoney(subject.delta)}，NC明细${subject.ncCount}笔。`,
            sort: subject.absDelta,
          });
        });
      });
    });
    return nodes.sort((a, b) => b.sort - a.sort).slice(0, 10);
  }

  function focusSummary(nodes = focusNodes()) {
    const projects = new Set(nodes.map((node) => node.projectId).filter(Boolean));
    return `已筛选 ${nodes.length} 个需关注节点，涉及 ${projects.size} 个项目`;
  }

  function breadcrumbItems() {
    const org = orgState();
    const project = projectById(org.projectId);
    const items = [
      { label: "首页总览", action: "nav", data: { view: "home" } },
      { label: "组织穿透", action: "org-open", data: { type: "company" } },
    ];
    if (project && org.selectedType !== "company") {
      items.push({ label: project.fullName || project.shortName, action: "org-select", data: { type: "project", project: project.id } });
    }
    if (org.natureName && (org.selectedType === "nature" || org.selectedType === "subject")) {
      items.push({ label: org.natureName, action: "org-select", data: { type: "nature", project: org.projectId, nature: org.natureName } });
    }
    if (org.subjectName && org.selectedType === "subject") {
      items.push({ label: org.subjectName, current: true });
    } else {
      items[items.length - 1].current = true;
    }
    return items;
  }

  function renderOrgShell() {
    ensureOrgState();
    if (typeof updateNav === "function") updateNav();
    const actionType = V116_RENDER_ACTION_TYPE || "navigation";
    const pageClass = actionType === "navigation" ? "page-transition page-transition-soft" : "page-transition is-stable";
    const template = document.createElement("template");
    template.innerHTML = `
      ${typeof renderV116InteractionBar === "function" ? renderV116InteractionBar() : ""}
      <div class="${pageClass}" data-render-action="${h(actionType)}">${renderOrgPage()}</div>
      ${typeof renderV116DetailDrawer === "function" ? renderV116DetailDrawer() : ""}
      ${typeof renderSingleRecordDetailDrawer === "function" ? renderSingleRecordDetailDrawer() : ""}
      <button class="back-to-top-fab" type="button" data-action="back-to-top" aria-label="返回顶部" title="返回顶部">
        <span class="back-to-top-icon" aria-hidden="true"></span>
      </button>
    `.trim();
    app.replaceChildren(template.content);
    V116_RENDER_ACTION_TYPE = "navigation";
  }

  function renderOrgPage() {
    const org = orgState();
    return `
      <div class="org-page" data-org-view="true">
        <div class="page-title-row">
          <div>
            ${renderBreadcrumb(breadcrumbItems())}
            <h1 class="page-title">组织穿透页</h1>
            <p class="page-subtitle">公司全景 → 项目群 → 单个项目 → 项目内成本科目 → NC明细。当前页仅做只读穿透和建议核查定位。</p>
          </div>
        </div>
        ${org.notice ? `<div class="org-notice">${h(org.notice)}</div>` : ""}
        ${renderFilters()}
        ${renderFocusStrip()}
        <div class="org-layout">
          ${renderTreePanel()}
          <main class="org-main">${renderMainView()}</main>
        </div>
        ${org.focusDrawerOpen ? renderFocusDrawer() : ""}
      </div>
    `;
  }

  function renderFilters() {
    const org = orgState();
    const projects = allowedProjects();
    const natures = [...new Set((views().VIEW_PROJECT_SUBJECT_TREE || []).map((row) => row.level1_name).filter(Boolean))];
    return `
      <section class="org-filter-bar" aria-label="组织穿透筛选器">
        <div class="field">
          <label for="orgMonth">时间范围</label>
          <select id="orgMonth" data-action="org-filter" data-field="month">
            ${MONTH_OPTIONS.map((item) => `<option value="${item.value}" ${org.month === item.value ? "selected" : ""}>${item.label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="orgNature">成本性质</label>
          <select id="orgNature" data-action="org-filter" data-field="nature">
            <option value="all" ${org.nature === "all" ? "selected" : ""}>全部</option>
            ${natures.map((name) => `<option value="${h(name)}" ${org.nature === name ? "selected" : ""}>${h(name)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="orgProjectScope">项目范围</label>
          <select id="orgProjectScope" data-action="org-filter" data-field="projectScope">
            <option value="all" ${org.projectScope === "all" ? "selected" : ""}>全部授权项目</option>
            ${projects.map((project) => `<option value="${project.id}" ${org.projectScope === project.id ? "selected" : ""}>${h(project.shortName)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="orgSearch">搜索项目、科目、节点</label>
          <input id="orgSearch" data-action="org-search" value="${h(org.query)}" placeholder="输入项目或科目名称" />
        </div>
      </section>
    `;
  }

  function renderTreePanel() {
    const org = orgState();
    org.focusOnly = false;
    const focusItems = focusNodes();
    return `
      <aside class="org-panel org-tree-panel">
        <div class="org-panel-head">
          <div>
            <h2>穿透树</h2>
            <p>来自当前共享视图，按授权范围展示。</p>
          </div>
        </div>
        <div class="org-tree-tools">
          <button class="org-link" type="button" data-action="org-collapse-tree">全部收起</button>
          <button class="org-link" type="button" data-action="org-open" data-type="company">回到公司全景</button>
        </div>
        ${org.focusOnly ? `<div class="org-filter-result">${h(focusSummary(focusItems))}</div>` : ""}
        <div class="org-tree">
          ${renderTree()}
        </div>
      </aside>
    `;
  }

  function renderTree() {
    const org = orgState();
    const rows = activeProjectRows();
    const projectTop = topProjectChangeIds(rows);
    const visibleProjects = rows.filter((project) => {
      if (!org.focusOnly) return true;
      if (projectMarkers(project, projectTop).length) return true;
      return activeSubjectRows(project.id).some((subject) => subjectMarkers(subject).length);
    });
    return `
      <div class="org-tree-node">
        <button class="org-node-button is-root ${org.selectedType === "company" ? "is-active" : ""}" type="button" data-action="org-select" data-type="company">
          <span><span class="org-node-title">公司全景</span><span class="org-node-meta">${rows.length}个当前范围项目 · ${monthLabel(org.month)}</span></span>
          <span class="org-node-badges">${focusNodes().length ? `<span class="org-badge is-focus">${focusNodes().length}项</span>` : ""}</span>
        </button>
      </div>
      ${visibleProjects.map((project) => renderProjectNode(project, projectTop)).join("") || `<div class="org-empty">当前条件下暂无节点</div>`}
    `;
  }

  function renderProjectNode(project, projectTop) {
    const org = orgState();
    const expanded = Boolean(org.expandedProjects[project.id]);
    const markers = projectMarkers(project, projectTop);
    return `
      <div class="org-tree-node" data-org-project="${h(project.id)}">
        <button class="org-node-button ${org.projectId === project.id && org.selectedType === "project" ? "is-active" : ""}" type="button" data-action="org-select" data-type="project" data-project="${h(project.id)}">
          <span><span class="org-node-title">${expanded ? "▾" : "▸"} ${h(project.shortName)}</span><span class="org-node-meta">${money(currentProjectAmount(project))} · 执行率${pct(project.budgetRate)} · NC ${project.ncCount}笔</span></span>
          <span class="org-node-badges">${markerHtml(markers)}</span>
        </button>
        ${expanded ? `<div class="org-children">${renderNatureNodes(project.id)}</div>` : ""}
      </div>
    `;
  }

  function renderNatureNodes(projectId) {
    const org = orgState();
    const scopedSubjects = activeSubjectRows(projectId);
    const scopedSubjectIds = new Set(scopedSubjects.map((subject) => subject.subjectId || subject.subjectKey));
    return natureRows(projectId)
      .filter((nature) => org.nature === "all" || org.nature === nature.name)
      .map((nature) => ({ ...nature, subjects: nature.subjects.filter((subject) => scopedSubjectIds.has(subject.subjectId || subject.subjectKey)) }))
      .filter((nature) => nature.subjects.length)
      .filter((nature) => !org.focusOnly || nature.subjects.some((subject) => subjectMarkers(subject).length))
      .map((nature) => {
        const key = projectId + "|" + nature.name;
        const expanded = Boolean(org.expandedNatures[key]);
        return `
          <div class="org-tree-node" data-org-nature="${h(nature.name)}">
            <button class="org-node-button ${org.projectId === projectId && org.natureName === nature.name && org.selectedType === "nature" ? "is-active" : ""}" type="button" data-action="org-select" data-type="nature" data-project="${h(projectId)}" data-nature="${h(nature.name)}">
              <span><span class="org-node-title">${expanded ? "▾" : "▸"} ${h(nature.name)}</span><span class="org-node-meta">${money(nature.selectedAmount || nature.cumulativeAmount)} · ${signedMoney(nature.delta)} · NC ${nature.ncCount}笔</span></span>
              <span class="org-node-badges">${nature.absDelta > 0 ? `<span class="org-badge is-focus">变化</span>` : ""}</span>
            </button>
            ${expanded ? `<div class="org-children">${renderSubjectNodes(projectId, nature)}</div>` : ""}
          </div>
        `;
      }).join("") || `<div class="org-empty">当前成本性质下暂无科目</div>`;
  }

  function renderSubjectNodes(projectId, nature) {
    const topIds = topSubjectIds(projectId);
    const org = orgState();
    return nature.subjects
      .filter((subject) => !org.focusOnly || subjectMarkers(subject, topIds).length)
      .map((subject) => `
        <div class="org-tree-node" data-org-subject="${h(subject.subjectId)}">
          <button class="org-node-button ${org.subjectId === subject.subjectId ? "is-active" : ""}" type="button" data-action="org-select" data-type="subject" data-project="${h(projectId)}" data-subject-id="${h(subject.subjectId)}">
            <span><span class="org-node-title">${h(subject.subjectName)}</span><span class="org-node-meta">${money(subject.selectedAmount || subject.cumulativeAmount)} · ${signedMoney(subject.delta)} · NC ${subject.ncCount}笔</span></span>
            <span class="org-node-badges">${markerHtml(subjectMarkers(subject, topIds))}</span>
          </button>
        </div>
      `).join("") || `<div class="org-empty">当前条件下暂无需展示科目</div>`;
  }

  function renderMainView() {
    const org = orgState();
    if (org.selectedType === "subject") return renderSubjectView();
    if (org.selectedType === "nature") return renderNatureView();
    if (org.selectedType === "project") return renderProjectView();
    return renderCompanyView();
  }

  function companySummary() {
    const rows = activeProjectRows();
    const total = rows.reduce((sum, project) => sum + currentProjectAmount(project), 0);
    const may = rows.reduce((sum, project) => sum + monthAmount(project.id, 5), 0);
    const budget = rows.reduce((sum, project) => sum + Number(project.sequenceBudget || 0), 0);
    const ncCount = rows.reduce((sum, project) => sum + Number(project.ncCount || 0), 0);
    const focusProjectCount = rows.filter((project) => projectMarkers(project).length).length;
    return { rows, total, may, budget, ncCount, focusProjectCount, rate: budget ? total / budget : null };
  }

  function renderCompanyView() {
    const summary = companySummary();
    const org = orgState();
    const activeTab = org.analysisTab || "contribution";
    const primaryCostLabel = org.month === "all" ? "累计成本" : `${selectedMonthValue()}月成本`;
    const primaryCostFoot = org.month === "all" ? `${summary.rows.length}个项目` : `${summary.rows.length}个项目 · ${ncMonthLabel(org.month)}`;
    const projectBars = summary.rows
      .map((project) => ({ label: project.shortName, value: currentProjectAmount(project) }))
      .sort((a, b) => b.value - a.value);
    const deltas = summary.rows
      .map((project) => ({ label: project.shortName, value: projectDelta(project).delta, absValue: projectDelta(project).absDelta }))
      .sort((a, b) => b.absValue - a.absValue);
    const distribution = Object.entries(summary.rows.reduce((map, project) => {
      const key = project.executionCategory || "未分类";
      map[key] = (map[key] || 0) + 1;
      return map;
    }, {})).map(([label, count]) => ({ label, count }));
    const tabs = [
      { id: "contribution", label: "项目贡献" },
      { id: "change", label: "最近变化" },
      { id: "execution", label: "执行率分布" },
    ];
    const analysisBody = activeTab === "change"
      ? global.V133OrgCharts.changeBars(deltas, { title: "项目环比变化", limit: 8 })
      : activeTab === "execution"
        ? global.V133OrgCharts.distribution(distribution)
        : `${global.V133OrgCharts.barList(projectBars, { total: summary.total, title: "项目成本贡献", limit: 8 })}${renderProjectTable(summary.rows.slice(0, 8), { compact: true, total: summary.total })}`;
    return `
      <section class="org-section">
        <div class="org-panel-head"><div><h2>公司全景</h2><p>从授权项目总盘进入项目群、科目和NC明细。</p></div></div>
        <div class="org-section-body">
          <div class="org-kpi-grid">
            ${renderKpi(primaryCostLabel, money(summary.total), primaryCostFoot)}
            ${renderKpi("5月成本", money(summary.may), "当前月份")}
            ${renderKpi("整体执行率", pct(summary.rate), "累计成本 / 序时预算")}
            ${renderKpi("需关注项目数", `${summary.focusProjectCount}个`, `NC ${summary.ncCount}笔`)}
          </div>
        </div>
      </section>
      <section class="org-section">
        <div class="org-panel-head"><div><h3>分析视图</h3><p>按需切换，不一次性展开全部图表。</p></div></div>
        <div class="org-section-body">
          <div class="org-analysis-tabs" role="tablist">
            ${tabs.map((tab) => `<button class="org-analysis-tab ${activeTab === tab.id ? "is-active" : ""}" type="button" role="tab" data-action="org-analysis-tab" data-tab="${h(tab.id)}">${h(tab.label)}</button>`).join("")}
          </div>
          <div class="org-analysis-panel">${analysisBody}</div>
        </div>
      </section>
      <section class="org-section">
        <div class="org-panel-head"><div><h3>项目列表</h3><p>点击“展开组织穿透”进入单个项目。</p></div></div>
        <div class="org-section-body">${renderProjectTable(summary.rows)}</div>
      </section>
    `;
  }

  function renderProjectTable(rows, options = {}) {
    const total = options.total || rows.reduce((sum, project) => sum + currentProjectAmount(project), 0);
    return `
      <div class="org-table-wrap ${options.compact ? "is-compact" : ""}">
        <table class="org-table">
          <thead><tr><th>项目</th><th class="num">累计成本</th><th class="num">5月成本</th><th class="num">环比增减额</th><th class="num">执行率</th><th class="num">占比</th><th class="num">NC笔数</th><th>标记</th><th>操作</th></tr></thead>
          <tbody>
            ${rows.map((project) => {
              const delta = projectDelta(project);
              return `
                <tr>
                  <td><button class="org-link" data-action="org-select" data-type="project" data-project="${h(project.id)}">${h(project.shortName)}</button><div class="org-muted">${h(project.fullName)}</div></td>
                  <td class="num">${money(project.totalCost)}</td>
                  <td class="num">${money(project.currentMonthCost)}</td>
                  <td class="num">${signedMoney(delta.delta)}</td>
                  <td class="num">${pct(project.budgetRate)}</td>
                  <td class="num">${pct(currentProjectAmount(project) / Math.max(1, total))}</td>
                  <td class="num">${project.ncCount}</td>
                  <td>${markerHtml(projectMarkers(project)) || `<span class="org-muted">持续跟踪</span>`}</td>
                  <td><span class="org-inline-actions"><button class="org-link" data-action="org-select" data-type="project" data-project="${h(project.id)}">展开组织穿透</button><button class="org-link" data-action="profile-open" data-project="${h(project.id)}">查看项目画像</button></span></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderProjectView() {
    const org = orgState();
    const project = projectById(org.projectId);
    if (!project) return `<section class="org-section"><div class="org-section-body"><div class="org-empty">当前角色暂无可见项目</div></div></section>`;
    const natures = natureRows(project.id);
    const subjects = subjectRows(project.id);
    const topSubjects = subjects.filter((row) => row.absDelta > 0).sort((a, b) => b.absDelta - a.absDelta).slice(0, 5);
    const structure = natures.map((nature) => ({ label: nature.name, value: nature.selectedAmount || nature.cumulativeAmount }));
    const projectTotal = Math.max(1, currentProjectAmount(project));
    const focusOpen = !!org.projectFocusOpen;
    const primaryCostLabel = org.month === "all" ? "累计成本" : `${selectedMonthValue()}月成本`;
    const ncRangeLabel = ncButtonLabel(org.month, "NC明细范围");
    return `
      <section class="org-section">
        <div class="org-panel-head">
          <div><h2>${h(project.fullName)}</h2><p>项目级穿透概览，继续向成本性质和科目下钻。</p></div>
          <div class="org-inline-actions">
            <button class="btn" data-action="profile-open" data-project="${h(project.id)}">查看完整项目画像</button>
            <button class="btn secondary" data-action="org-open-project-nc" data-project="${h(project.id)}" data-month="${h(org.month)}" data-amount="${currentProjectAmount(project)}">${h(ncRangeLabel)}</button>
          </div>
        </div>
        <div class="org-section-body">
          <div class="org-kpi-grid">
            ${renderKpi(primaryCostLabel, money(currentProjectAmount(project)), project.executionCategory || "共享视图分类")}
            ${renderKpi("5月成本", money(project.currentMonthCost), "当前月份")}
            ${renderKpi("环比增减额", signedMoney(projectDelta(project).delta), "各科目增减相抵后的项目净变化")}
            ${renderKpi("NC笔数", `${project.ncCount}笔`, `执行率${pct(project.budgetRate)}`)}
          </div>
        </div>
      </section>
      <div class="org-two-col org-two-col-balanced">
        <section class="org-section">
          <div class="org-panel-head"><div><h3>项目内成本结构</h3><p>按当前共享科目树聚合。</p></div></div>
          <div class="org-section-body">${global.V133OrgCharts.barList(structure, { total: projectTotal, title: "项目内成本结构", limit: 8 })}</div>
        </section>
        <section class="org-section">
          <div class="org-section-body">
            <div class="org-action-card">
              <span>项目节点动作</span>
              <h3>${h(project.shortName)}</h3>
              <p>项目环比增减额为各科目增减相抵后的项目净变化，建议结合下方成本性质逐级核查。</p>
              <div class="org-action-list">
                <button class="btn primary" type="button" data-action="org-open-project-nc" data-project="${h(project.id)}" data-month="${h(org.month)}" data-amount="${currentProjectAmount(project)}">${h(ncRangeLabel)}</button>
                <button class="btn" type="button" data-action="profile-open" data-project="${h(project.id)}">查看项目画像</button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <section class="org-section">
        <div class="org-panel-head"><div><h3>成本性质下钻</h3><p>先进入成本性质，再选择科目查看动作卡和NC入口。</p></div></div>
        <div class="org-section-body">
          <div class="org-nature-grid">
            ${natures.map((nature) => `
              <button class="org-nature-card" type="button" data-action="org-select" data-type="nature" data-project="${h(project.id)}" data-nature="${h(nature.name)}">
                <span>${h(nature.name)}</span>
                <strong>${money(nature.selectedAmount || nature.cumulativeAmount)}</strong>
                <em>${signedMoney(nature.delta)} · NC ${nature.ncCount}笔</em>
              </button>
            `).join("")}
          </div>
        </div>
      </section>
      <section class="org-section org-collapsible-section">
        <div class="org-panel-head">
          <div><h3>项目内需关注科目</h3><p>按 Math.abs(本月金额 - 上月金额) 排序，默认收起以保留主线。</p></div>
          <button class="btn secondary small" type="button" data-action="org-toggle-project-focus">${focusOpen ? "收起" : "展开"}</button>
        </div>
        <div class="org-section-body">
          ${focusOpen
            ? `${global.V133OrgCharts.changeBars(topSubjects.map((item) => ({ label: item.subjectName, value: item.delta, absValue: item.absDelta })), { title: "项目内科目变化", limit: 5 })}${renderSubjectTable(project, topSubjects)}`
            : `<div class="org-compact-note">当前项目已识别 ${topSubjects.length} 个变化较大的科目，点击“展开”查看明细列表。</div>`}
        </div>
      </section>
    `;
  }

  function renderNatureView() {
    const org = orgState();
    const project = projectById(org.projectId);
    const nature = natureRows(org.projectId).find((row) => row.name === org.natureName);
    if (!project || !nature) return renderProjectView();
    return `
      <section class="org-section">
        <div class="org-panel-head"><div><h2>${h(project.shortName)} · ${h(nature.name)}</h2><p>当前成本性质下的科目分布与NC明细入口。</p></div></div>
        <div class="org-section-body">
          <div class="org-kpi-grid">
            ${renderKpi("累计金额", money(nature.cumulativeAmount), "当前成本性质")}
            ${renderKpi("本月金额", money(nature.currentMonthAmount), `${selectedMonthValue()}月`)}
            ${renderKpi("环比增减额", signedMoney(nature.delta), `${previousMonthValue()}月 → ${selectedMonthValue()}月`)}
            ${renderKpi("NC笔数", `${nature.ncCount}笔`, "可继续追溯")}
          </div>
        </div>
      </section>
      <section class="org-section">
        <div class="org-panel-head"><div><h3>${h(nature.name)}科目</h3><p>选择科目继续下钻。</p></div></div>
        <div class="org-section-body">${renderSubjectTable(project, nature.subjects)}</div>
      </section>
    `;
  }

  function renderSubjectView() {
    const org = orgState();
    const project = projectById(org.projectId);
    const subject = subjectRows(org.projectId).find((row) => row.subjectId === org.subjectId);
    if (!project || !subject) return renderProjectView();
    const trace = traceRows(project.id, { subjectId: subject.subjectId, month: org.month });
    const suppliers = new Set(trace.map((row) => row.supplier_name).filter(Boolean));
    const contracts = new Set(trace.map((row) => row.contract_code || row.contract_id).filter(Boolean));
    const settlements = new Set(trace.map((row) => row.settlement_doc_no || row.settlement_id).filter(Boolean));
    const payments = new Set(trace.map((row) => row.payment_doc_no || row.payment_id).filter(Boolean));
    const markers = subjectMarkers(subject);
    const ncLabel = ncButtonLabel(org.month);
    return `
      <section class="org-section">
        <div class="org-panel-head">
          <div><h2>${h(project.shortName)} · ${h(subject.subjectName)}</h2><p>${h(subject.level1)} / ${h(subject.level2)} / ${h(subject.level3 || subject.subjectName)}</p>${org.notice ? `<small class="org-source-line">来自科目横向对比：${h(project.shortName)} / ${h(subject.subjectName)}</small>` : ""}</div>
          <span>${markerHtml(markers) || `<span class="org-muted">持续跟踪</span>`}</span>
        </div>
        <div class="org-section-body">
          <div class="org-kpi-grid">
            ${renderKpi("本月金额", money(subject.currentMonthAmount), `${selectedMonthValue()}月`)}
            ${renderKpi("上月金额", money(subject.previousMonthAmount), `${previousMonthValue()}月`)}
            ${renderKpi("环比增减额", signedMoney(subject.delta), "为该科目最近两月金额变化")}
            ${renderKpi("累计金额", money(subject.cumulativeAmount), `占项目${pct(subject.projectRatio)}`)}
          </div>
        </div>
      </section>
      <section class="org-section">
        <div class="org-section-body">
          <div class="org-action-card is-subject">
            <span>科目节点动作</span>
            <h3>${h(subject.subjectName)}</h3>
            <p>该节点已定位到项目内成本科目，可继续查看NC明细，并保留组织穿透面包屑。</p>
            <div class="org-action-metrics">
              <div><span>NC明细</span><strong>${trace.length}笔</strong></div>
              <div><span>占项目</span><strong>${pct(subject.projectRatio)}</strong></div>
              <div><span>建议动作</span><strong>${markers.length ? "建议核查" : "持续跟踪"}</strong></div>
            </div>
            <div class="org-action-list">
              <button class="btn primary" data-action="org-open-nc" data-project="${h(project.id)}" data-nature="${h(subject.level1)}" data-subject-id="${h(subject.subjectId)}" data-subject-key="${h(subject.subjectKey)}" data-subject-name="${h(subject.subjectName)}" data-month="${h(org.month)}" data-amount="${subject.selectedAmount || subject.cumulativeAmount}">${h(ncLabel)}</button>
              <button class="btn" data-action="profile-open" data-project="${h(project.id)}">查看项目画像</button>
              <button class="btn" data-action="subject-compare-open" data-subject-id="${h(subject.subjectId)}" data-month="${h(org.month)}">查看科目横向对比</button>
            </div>
          </div>
        </div>
      </section>
      <section class="org-section">
        <div class="org-panel-head"><div><h3>供应商 / 合同 / 结算追溯概览</h3><p>只读聚合现有NC明细字段。</p></div></div>
        <div class="org-section-body">
          <div class="org-context-grid">
            ${renderContextCard("供应商", traceCoverageText(suppliers))}
            ${renderContextCard("合同", traceCoverageText(contracts))}
            ${renderContextCard("结算", traceCoverageText(settlements))}
            ${renderContextCard("付款", traceCoverageText(payments))}
          </div>
          <p class="org-field-note">当前组织穿透页基于已接入NC明细字段展示，供应商、合同、结算、付款结构化覆盖率将随NC字段接入继续完善。</p>
        </div>
      </section>
    `;
  }

  function renderSubjectTable(project, rows) {
    const topIds = topSubjectIds(project.id);
    const filtered = rows.filter((row) => orgState().nature === "all" || row.level1 === orgState().nature);
    return `
      <div class="org-table-wrap">
        <table class="org-table">
          <thead><tr><th>科目层级</th><th>成本性质</th><th class="num">本月金额</th><th class="num">上月金额</th><th class="num">环比增减额</th><th class="num">累计金额</th><th class="num">占项目比例</th><th class="num">NC笔数</th><th>标记</th><th>操作</th></tr></thead>
          <tbody>
            ${filtered.map((row) => `
              <tr>
                <td><button class="org-link" data-action="org-select" data-type="subject" data-project="${h(project.id)}" data-subject-id="${h(row.subjectId)}">${h(row.subjectName)}</button><div class="org-muted">${h([row.level2, row.level3].filter(Boolean).join(" / "))}</div></td>
                <td>${h(row.level1)}</td>
                <td class="num">${money(row.currentMonthAmount)}</td>
                <td class="num">${money(row.previousMonthAmount)}</td>
                <td class="num">${signedMoney(row.delta)}</td>
                <td class="num">${money(row.cumulativeAmount)}</td>
                <td class="num">${pct(row.projectRatio)}</td>
                <td class="num">${row.ncCount}</td>
                <td>${markerHtml(subjectMarkers(row, topIds)) || `<span class="org-muted">持续跟踪</span>`}</td>
                <td><span class="org-inline-actions"><button class="org-link" data-action="org-open-nc" data-project="${h(project.id)}" data-nature="${h(row.level1)}" data-subject-id="${h(row.subjectId)}" data-subject-key="${h(row.subjectKey)}" data-subject-name="${h(row.subjectName)}" data-month="${h(orgState().month)}" data-amount="${row.selectedAmount || row.cumulativeAmount}">${h(ncButtonLabel(orgState().month))}</button><button class="org-link" data-action="subject-compare-open" data-subject-id="${h(row.subjectId)}" data-month="${h(orgState().month)}">横向对比</button></span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderFocusStrip() {
    const nodes = focusNodes();
    const org = orgState();
    const preview = nodes.slice(0, 5);
    return `
      <section class="org-focus-strip" aria-label="需关注节点焦点条">
        <div class="org-focus-summary">
          <span>需关注节点</span>
          <strong>${nodes.length}</strong>
          <em>执行分类 + 环比绝对增减额</em>
        </div>
        <div class="org-focus-chips">
          ${preview.map((node, index) => `
            <button class="org-focus-chip ${isFocusActive(node, org) ? "is-active" : ""}" type="button" data-action="org-focus-jump" data-type="${h(node.type)}" data-project="${h(node.projectId || "")}" data-subject-id="${h(node.subjectId || "")}">
              <span>${index + 1}</span>
              <strong>${h(node.title)}</strong>
              <em>${h(node.label)}</em>
            </button>
          `).join("") || `<span class="org-empty-inline">当前范围暂无需关注节点</span>`}
        </div>
        <button class="btn secondary small" type="button" data-action="org-focus-drawer-open">查看全部</button>
      </section>
    `;
  }

  function renderFocusDrawer() {
    const nodes = focusNodes();
    const org = orgState();
    return `
      <div class="org-drawer-backdrop" data-action="org-focus-drawer-close"></div>
      <aside class="org-focus-drawer" role="dialog" aria-modal="true" aria-label="需关注节点全部列表">
        <div class="org-drawer-head">
          <div>
            <h3>需关注节点</h3>
            <p>${h(focusSummary(nodes))}，用于快速定位建议核查范围。</p>
          </div>
          <button class="org-icon-button" type="button" data-action="org-focus-drawer-close" aria-label="关闭">×</button>
        </div>
        <div class="org-focus-list">
          ${nodes.map((node, index) => `
            <button class="org-focus-card ${isFocusActive(node, org) ? "is-active" : ""}" type="button" data-action="org-focus-jump" data-type="${h(node.type)}" data-project="${h(node.projectId || "")}" data-subject-id="${h(node.subjectId || "")}">
              <strong>${index + 1}. ${h(node.title)} <span class="org-badge is-focus">${h(node.label)}</span></strong>
              <span>${h(node.detail)}</span>
            </button>
          `).join("") || `<div class="org-empty">当前范围暂无需关注节点</div>`}
        </div>
      </aside>
    `;
  }

  function isFocusActive(node, org) {
    if (node.type === "project") return org.selectedType === "project" && org.projectId === node.projectId;
    if (node.type === "subject") return org.selectedType === "subject" && org.subjectId === node.subjectId;
    return false;
  }

  function renderKpi(label, value, foot) {
    return `<div class="org-kpi"><span>${h(label)}</span><strong>${h(value)}</strong><em>${h(foot || "")}</em></div>`;
  }

  function traceCoverageText(values) {
    return values && values.size > 0 ? `${values.size}个` : "字段待覆盖";
  }

  function renderContextCard(label, value) {
    return `<div class="org-context-card"><span>${h(label)}</span><strong>${h(value)}</strong></div>`;
  }

  function openNcDrawer(target) {
    const projectId = clampProjectId(target.dataset.project || orgState().projectId);
    const subjectId = target.dataset.subjectId || "";
    const subjectName = target.dataset.subjectName || "";
    const subjectKey = target.dataset.subjectKey || "";
    const month = target.dataset.month || orgState().month || "all";
    const project = projectById(projectId);
    const subject = subjectRows(projectId).find((row) => row.subjectId === subjectId);
    const amountContext = subject
      ? subjectNcAmountContext(subject, month)
      : { titleSuffix: `${ncMonthLabel(month)}NC明细`, primaryLabel: month === "all" ? "累计金额" : `${Number(month)}月金额`, primaryAmount: Number(target.dataset.amount || 0), secondaryAmounts: [] };
    orgState().ncContext = {
      projectId,
      subjectId,
      subjectKey,
      subjectName,
      natureName: target.dataset.nature || "",
      month,
    };
    selectSubject(projectId, subjectId);
    if (typeof v116OpenDetailDrawer === "function") {
      v116OpenDetailDrawer({
        projectId,
        month,
        subjectKey,
        title: `${project ? project.shortName : ""}${subjectName ? " · " + subjectName : ""} · ${amountContext.titleSuffix}`,
        amount: amountContext.primaryAmount,
      });
      if (V116_INTERACTION_STATE.drawerContext) {
        Object.assign(V116_INTERACTION_STATE.drawerContext, {
          returnView: ORG_VIEW,
          orgSubjectName: subjectName,
          orgAmountLabel: amountContext.primaryLabel,
          orgSecondaryAmounts: amountContext.secondaryAmounts,
        });
        if (typeof v116SetRenderActionType === "function") v116SetRenderActionType("drawer");
        render();
      }
    }
  }

  function openProjectNcDrawer(target) {
    const projectId = clampProjectId(target.dataset.project || orgState().projectId);
    const project = projectById(projectId);
    const month = target.dataset.month || orgState().month || "all";
    if (!project) return;
    const amountContext = projectNcAmountContext(project, month);
    selectProject(projectId);
    if (typeof v116OpenDetailDrawer === "function") {
      v116OpenDetailDrawer({
        projectId,
        month,
        title: `${project.shortName} · ${amountContext.titleSuffix}`,
        amount: amountContext.primaryAmount,
      });
      if (V116_INTERACTION_STATE.drawerContext) {
        Object.assign(V116_INTERACTION_STATE.drawerContext, {
          returnView: ORG_VIEW,
          orgSubjectName: "",
          orgAmountLabel: amountContext.primaryLabel,
          orgSecondaryAmounts: amountContext.secondaryAmounts,
        });
        if (typeof v116SetRenderActionType === "function") v116SetRenderActionType("drawer");
        render();
      }
    }
  }

  function patchDetailsRenderer() {
    if (detailsPatched || typeof renderDetails !== "function") return;
    const originalRenderDetails = renderDetails;
    renderDetails = function () {
      const html = originalRenderDetails();
      if (!state.detail || state.detail.returnView !== ORG_VIEW) return html;
      const context = orgState().ncContext || {};
      const project = projectById(state.detail.projectId);
      const subjectLabel = context.subjectName || orgState().subjectName || (subjectIndex[state.detail.subjectKey] || {}).pathText || "NC明细";
      const crumb = renderBreadcrumb([
        { label: "首页总览", action: "nav", data: { view: "home" } },
        { label: "组织穿透", action: "org-open", data: { type: "company" } },
        project ? { label: project.fullName || project.shortName, action: "org-select", data: { type: "project", project: project.id } } : { label: "授权项目", disabled: true },
        ...(context.natureName ? [{ label: context.natureName, action: "org-select", data: { type: "nature", project: state.detail.projectId, nature: context.natureName } }] : []),
        { label: subjectLabel, disabled: true },
        { label: "NC明细", current: true },
      ]);
      return html.replace(/<nav class="breadcrumb"[\s\S]*?<\/nav>/, crumb);
    };
    detailsPatched = true;
  }

  function patchDrawerRenderer() {
    if (drawerPatched || typeof renderV116DetailDrawer !== "function") return;
    const originalRenderDrawer = renderV116DetailDrawer;
    renderV116DetailDrawer = function () {
      const html = originalRenderDrawer();
      const context = V116_INTERACTION_STATE.drawerContext || {};
      if (!html || context.returnView !== ORG_VIEW || !context.orgAmountLabel) return html;
      const records = typeof v116FilterDrawerRecords === "function" ? v116FilterDrawerRecords(context) : [];
      const amount = context.amount || (typeof sumRecords === "function" ? sumRecords(records) : 0);
      const secondaries = Array.isArray(context.orgSecondaryAmounts) ? context.orgSecondaryAmounts : [];
      const items = [
        `<div><span>${h(context.orgAmountLabel)}</span><strong>${money(amount)}</strong></div>`,
        ...secondaries.map((item) => `<div><span>${h(item.label)}</span><strong>${money(item.amount)}</strong></div>`),
        `<div><span>NC笔数</span><strong>${records.length}笔</strong></div>`,
      ].join("");
      return html.replace(/<div class="drawer-summary">[\s\S]*?<\/div>\s*<dl class="drawer-filter-list">/, `<div class="drawer-summary org-drawer-summary">${items}</div><dl class="drawer-filter-list">`);
    };
    drawerPatched = true;
  }

  function patchRender() {
    if (renderPatched || typeof render !== "function") return;
    const originalRender = render;
    render = function () {
      if (state.view === ORG_VIEW) {
        renderOrgShell();
        return;
      }
      originalRender();
    };
    renderPatched = true;
  }

  function bindEvents() {
    if (eventsBound || typeof document === "undefined") return;

    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      if (target.dataset.action === "return-source" && state.detail && state.detail.returnView === ORG_VIEW) {
        event.preventDefault();
        event.stopImmediatePropagation();
        state.view = ORG_VIEW;
        render();
        if (typeof resetPageScrollToTop === "function") resetPageScrollToTop();
      }
    }, true);

    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      if (action === "org-open") {
        event.preventDefault();
        if (target.dataset.type === "company") selectCompany();
        else openOrg();
      }
      if (action === "org-select") {
        event.preventDefault();
        const preserveScroll = Boolean(target.closest(".org-tree-panel"));
        if (target.dataset.type === "company") selectCompany();
        if (target.dataset.type === "project") selectProject(target.dataset.project, { preserveScroll, toggleExpansion: preserveScroll });
        if (target.dataset.type === "nature") selectNature(target.dataset.project, target.dataset.nature, { preserveScroll, toggleExpansion: preserveScroll });
        if (target.dataset.type === "subject") selectSubject(target.dataset.project, target.dataset.subjectId, { preserveScroll });
      }
      if (action === "org-collapse-tree") {
        event.preventDefault();
        collapseOrgTree({ preserveScroll: true });
      }
      if (action === "org-focus-jump") {
        event.preventDefault();
        orgState().focusDrawerOpen = false;
        if (target.dataset.type === "project") selectProject(target.dataset.project);
        if (target.dataset.type === "subject") selectSubject(target.dataset.project, target.dataset.subjectId);
      }
      if (action === "org-open-nc") {
        event.preventDefault();
        openNcDrawer(target);
      }
      if (action === "org-open-project-nc") {
        event.preventDefault();
        openProjectNcDrawer(target);
      }
      if (action === "org-focus-drawer-open") {
        event.preventDefault();
        orgState().focusDrawerOpen = true;
        render();
      }
      if (action === "org-focus-drawer-close") {
        event.preventDefault();
        orgState().focusDrawerOpen = false;
        render();
      }
      if (action === "org-analysis-tab") {
        event.preventDefault();
        orgState().analysisTab = target.dataset.tab || "contribution";
        render();
      }
      if (action === "org-toggle-project-focus") {
        event.preventDefault();
        orgState().projectFocusOpen = !orgState().projectFocusOpen;
        render();
      }
      if (action === "org-toggle-focus") {
        orgState().focusOnly = target.checked;
        render();
      }
      if (action === "org-v134-planned") {
        event.preventDefault();
        orgState().notice = "科目横向对比页已开放，可从科目动作或表格行进入。";
        if (state.view === ORG_VIEW) render();
      }
    });

    document.addEventListener("change", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target || target.dataset.action !== "org-filter") return;
      const org = orgState();
      const field = target.dataset.field;
      org[field] = target.value;
      if (field === "projectScope" && target.value !== "all") {
        org.projectId = clampProjectId(target.value);
        org.selectedType = "project";
      } else if (field === "projectScope") {
        org.selectedType = "company";
        org.projectId = "";
        org.natureName = "";
        org.subjectId = "";
        org.subjectKey = "";
        org.subjectName = "";
      }
      org.focusDrawerOpen = false;
      render();
    });

    document.addEventListener("input", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target || target.dataset.action !== "org-search") return;
      orgState().query = target.value;
      render();
      const input = document.getElementById("orgSearch");
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });

    global.addEventListener("hashchange", () => {
      const route = parseOrgHash();
      if (!route) return;
      state.view = ORG_VIEW;
      ensureOrgState();
      render();
    });

    eventsBound = true;
  }

  function applyInitialHash() {
    const route = parseOrgHash();
    if (!route || typeof state === "undefined") return;
    const org = orgState();
    state.view = ORG_VIEW;
    org.selectedType = route.subjectId ? "subject" : route.nature ? "nature" : route.projectId ? "project" : "company";
    org.projectId = route.projectId || "";
    org.natureName = route.nature || "";
    org.subjectId = route.subjectId || "";
    org.month = route.month || org.month;
    if (org.projectId) org.expandedProjects[org.projectId] = true;
    if (org.projectId && org.natureName) org.expandedNatures[org.projectId + "|" + org.natureName] = true;
  }

  function extendAiContext(context) {
    if (typeof state === "undefined" || state.view !== ORG_VIEW) return context;
    const org = ensureOrgState();
    const summary = companySummary();
    const project = projectById(org.projectId);
    const subject = org.subjectId && project ? subjectRows(project.id).find((row) => row.subjectId === org.subjectId) : null;
    const nodes = focusNodes().slice(0, 5);
    return {
      ...context,
      pageName: "组织穿透",
      visibleProjectNames: activeProjectRows().map((item) => item.shortName),
      metrics: {
        totalCostWan: (summary.total / 10000).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        mayCostWan: (summary.may / 10000).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        annualBudgetWan: (summary.budget / 10000).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        ncCount: summary.ncCount,
      },
      orgPenetration: {
        selectedType: org.selectedType,
        selectedProjectName: project ? project.fullName || project.shortName : "公司全景",
        selectedNature: org.natureName || "",
        selectedSubjectName: subject ? subject.subjectName : "",
        focusNodes: nodes.map((node) => ({ title: node.title, label: node.label, detail: node.detail })),
        monthLabel: monthLabel(org.month),
      },
    };
  }

  applyInitialHash();
  patchDetailsRenderer();
  patchDrawerRenderer();
  patchRender();
  bindEvents();

  global.V133OrgPenetration = {
    openOrg,
    extendAiContext,
    getState: () => orgState(),
    getAllowedProjects: allowedProjects,
    getFocusNodes: focusNodes,
    getSubjectRows: (projectId) => subjectRows(projectId || orgState().projectId),
    roleAllows,
  };
})(typeof window !== "undefined" ? window : globalThis);
