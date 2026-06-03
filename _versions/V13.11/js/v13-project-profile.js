(function (global) {
  "use strict";

  const PROFILE_VIEW = "profile";
  const PROFILE_HASHES = new Set(["profile", "project-profile"]);
  const LEGACY_PROJECT_HASH = "project";
  const SEGMENTS = [
    { key: "fixed", label: "固定成本", field: "fixed_cost_amount" },
    { key: "variable", label: "变动成本", field: "variable_cost_amount" },
    { key: "management", label: "管理费用", field: "management_cost_amount" },
    { key: "sales", label: "销售费用", field: "sales_cost_amount" },
    { key: "tax", label: "税金", field: "tax_cost_amount" },
    { key: "finance", label: "财务费用", field: "finance_cost_amount", displayOnlyWhenPositive: true },
    { key: "other", label: "其他", field: "other_cost_amount" },
  ];
  const PROJECT_TYPE_LABELS = {
    ppp: "PPP",
    light_asset: "轻资产",
    other: "其他",
  };

  let renderPatched = false;
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

  function workflowViews() {
    return (global.OPERATION_COST_NC_WORKFLOW && global.OPERATION_COST_NC_WORKFLOW.views) || {};
  }

  function currentRole() {
    return global.V13Auth && typeof global.V13Auth.getCurrentRole === "function"
      ? global.V13Auth.getCurrentRole()
      : null;
  }

  function roleAllows(projectId, role = currentRole()) {
    if (!role) return true;
    if (role.visibleProjectIds === "all") return true;
    return (role.visibleProjectIds || []).indexOf(projectId) >= 0;
  }

  function allowedProjects() {
    const list = typeof PROJECTS !== "undefined" ? PROJECTS : [];
    const role = currentRole();
    return list.filter((project) => roleAllows(project.id, role));
  }

  function projectById(projectId) {
    const list = typeof PROJECTS !== "undefined" ? PROJECTS : [];
    return list.find((project) => project.id === projectId) || allowedProjects()[0] || list[0] || { id: projectId || "sjz", shortName: "项目", fullName: "项目" };
  }

  function parseProfileHash() {
    const raw = String(global.location && global.location.hash ? global.location.hash.slice(1) : "");
    if (!raw) return null;
    const parts = raw.split("?");
    const hashKey = parts[0];
    if (!PROFILE_HASHES.has(hashKey) && hashKey !== LEGACY_PROJECT_HASH) return null;
    const params = new URLSearchParams(parts[1] || "");
    return {
      view: PROFILE_VIEW,
      projectId: params.get("projectId") || params.get("project") || "",
      legacy: hashKey === LEGACY_PROJECT_HASH,
    };
  }

  function replaceProfileHash(projectId, options = {}) {
    if (!global.history || !global.location) return;
    const next = "#profile?projectId=" + encodeURIComponent(projectId || "");
    if (global.location.hash === next) return;
    const method = options.replace ? "replaceState" : "pushState";
    global.history[method](null, "", next);
  }

  function clampProjectId(projectId) {
    const allowed = allowedProjects();
    if (!allowed.length) return projectId || "sjz";
    if (allowed.some((project) => project.id === projectId)) return projectId;
    return allowed[0].id;
  }

  function routeToProfile(projectId, options = {}) {
    const requested = projectId || state.profileProjectId || state.projectId || "sjz";
    const next = clampProjectId(requested);
    state.view = PROFILE_VIEW;
    state.profileProjectId = next;
    state.projectId = next;
    if (next !== requested) {
      state.profileNotice = "当前账号仅可查看石家庄项目，已自动回到当前可查看项目。";
    }
    if (options.replaceHash) {
      replaceProfileHash(next, { replace: true });
    }
    return next;
  }

  function ensureProfileState() {
    const route = parseProfileHash();
    const requested = (route && route.projectId) || state.profileProjectId || state.projectId || "sjz";
    const next = clampProjectId(requested);
    if (next !== requested) {
      state.profileNotice = "当前账号仅可查看石家庄项目，已自动回到当前可查看项目。";
      if (route) replaceProfileHash(next, { replace: true });
    }
    state.profileProjectId = next;
    return projectById(next);
  }

  function homeSummary(projectId) {
    const row = (views().VIEW_HOME_PROJECT_SUMMARY || []).find((item) => item.project_id === projectId) || {};
    const monthRows = monthlyRows(projectId);
    return {
      projectId,
      totalCost: Number(row.total_cost || sum(monthRows, "raw_cost_amount")),
      mayCost: Number(row.current_month_cost || (monthRows.find((item) => Number(item.cost_month) === 5) || {}).raw_cost_amount || 0),
      ncCount: Number(row.nc_detail_count || rawDetailRows(projectId).length),
      activityCount: Number(row.activity_count || activityRows(projectId).length),
      venueCount: Number(row.venue_count || 0),
      budgetRate: Number(row.budget_execution_rate || 0),
      sequenceBudget: Number(row.sequence_budget || 0),
      projectType: PROJECT_TYPE_LABELS[row.project_type] || "其他",
      executionCategory: row.execution_category || "",
      allocatedForActivityOnly: Number(row.allocated_cost_for_activity_only || 0),
    };
  }

  function monthlyRows(projectId) {
    const rows = (views().VIEW_MONTH_COST_SUMMARY || []).filter((row) => row.project_id === projectId);
    return MONTHS.map((month) => {
      const row = rows.find((item) => Number(item.cost_month) === Number(month)) || {};
      return {
        project_id: projectId,
        cost_month: month,
        label: `2026年${month}月`,
        short: `${month}月`,
        raw_cost_amount: Number(row.raw_cost_amount || 0),
        fixed_cost_amount: Number(row.fixed_cost_amount || 0),
        variable_cost_amount: Number(row.variable_cost_amount || 0),
        management_cost_amount: Number(row.management_cost_amount || 0),
        sales_cost_amount: Number(row.sales_cost_amount || 0),
        tax_cost_amount: Number(row.tax_cost_amount || 0),
        finance_cost_amount: 0,
        other_cost_amount: Number(row.other_cost_amount || 0),
        budget_amount: Number(row.budget_amount || 0),
        detail_count: Number(row.detail_count || 0),
      };
    });
  }

  function activityRows(projectId) {
    return (views().VIEW_ACTIVITY_COST || [])
      .filter((row) => row.project_id === projectId && !row.is_base_activity)
      .sort((a, b) => {
        const monthDiff = Number(a.cost_month || 0) - Number(b.cost_month || 0);
        if (monthDiff) return monthDiff;
        return Number(b.total_activity_cost || 0) - Number(a.total_activity_cost || 0);
      });
  }

  function baseActivityRows(projectId) {
    return (views().VIEW_ACTIVITY_COST || []).filter((row) => row.project_id === projectId && row.is_base_activity);
  }

  function rawDetailRows(projectId, options = {}) {
    return (views().VIEW_COST_DETAIL_TRACE || []).filter((row) => {
      if (row.fact_type !== "raw_cost") return false;
      if (projectId && row.project_id !== projectId) return false;
      if (options.month && Number(row.cost_month) !== Number(options.month)) return false;
      if (options.subjectId && row.subject_id !== options.subjectId) return false;
      if (options.activityId && row.activity_id !== options.activityId) return false;
      return true;
    });
  }

  function activityDirectDetailRows(projectId, activityId, options = {}) {
    if (!activityId) return [];
    return rawDetailRows(projectId, {
      activityId,
      subjectId: options.subjectId || "",
      month: options.month || ""
    });
  }

  function activityDirectNcCount(projectId, activityId, subjectId = "") {
    return activityDirectDetailRows(projectId, activityId, { subjectId }).length;
  }

  function activityDirectNcLabel(item) {
    const count = Number(item && item.directNcCount || 0);
    if (count > 0) return `直接归集 ${count}笔`;
    return Number(item && item.allocatedAmount || 0) > 0 ? "按规则分摊 0笔" : "无分摊明细";
  }

  function activitySubjectRows(projectId, activityId) {
    const rows = (views().VIEW_ACTIVITY_COST_BY_SUBJECT || []).filter((row) => {
      return row.project_id === projectId && (!activityId || row.activity_id === activityId);
    });
    const groups = new Map();
    rows.forEach((row) => {
      const key = row.subject_id || row.subject_name || "";
      if (!groups.has(key)) {
        groups.set(key, {
          subjectId: row.subject_id || "",
          subjectName: row.subject_name || "成本科目",
          costNature: row.cost_nature || "",
          amount: 0,
          directAmount: 0,
          allocatedAmount: 0,
          months: new Set()
        });
      }
      const item = groups.get(key);
      item.amount += Number(row.cost_amount || 0);
      if (row.fact_type === "allocated_cost") item.allocatedAmount += Number(row.cost_amount || 0);
      else item.directAmount += Number(row.cost_amount || 0);
      if (row.cost_month) item.months.add(Number(row.cost_month));
    });
    return Array.from(groups.values()).map((item) => ({
      ...item,
      monthCount: item.months.size,
      directNcCount: activityId ? activityDirectNcCount(projectId, activityId, item.subjectId) : 0,
      costNatureLabel: costNatureFromKey(item.costNature)
    })).sort((a, b) => b.amount - a.amount);
  }

  function costNatureFromKey(key) {
    const map = { fixed: "固定成本", variable: "变动成本", management: "管理费用", sales: "销售费用", tax: "税金", finance: "财务费用" };
    return map[key] || key || "其他";
  }

  function activityTypeLabel(type) {
    const map = { base: "基础运营", exhibition: "展会活动", meeting: "会议活动", event: "专项活动", other: "其他活动" };
    return map[type] || "专项活动";
  }

  function activityStatusLabel(status) {
    const map = { completed: "已完成", active: "进行中", planned: "计划中" };
    return map[status] || "已归集";
  }

  function ensureActivityState(projectId) {
    const rows = activityRows(projectId);
    if (!state.profileActivity) {
      state.profileActivity = { selectedActivityId: "", selectedSubjectId: "", monthFilter: "", subjectFocusOnly: false, drawerOpen: false };
    }
    if (state.profileActivity.monthFilter === undefined) state.profileActivity.monthFilter = "";
    if (state.profileActivity.subjectFocusOnly === undefined) state.profileActivity.subjectFocusOnly = false;
    if (!rows.some((row) => row.activity_id === state.profileActivity.selectedActivityId)) {
      const top = rows.slice().sort((a, b) => Number(b.total_activity_cost || 0) - Number(a.total_activity_cost || 0))[0];
      state.profileActivity.selectedActivityId = top ? top.activity_id : "";
      state.profileActivity.selectedSubjectId = "";
      state.profileActivity.drawerOpen = false;
    }
    return state.profileActivity;
  }

  function ensureSubjectFilterState(projectId) {
    if (!state.profileSubjectFilter || state.profileSubjectFilter.projectId !== projectId) {
      state.profileSubjectFilter = { projectId, main: "" };
    }
    return state.profileSubjectFilter;
  }

  function activeSubjectFilter(projectId) {
    return ensureSubjectFilterState(projectId).main || "";
  }

  function filteredSubjectRows(projectId) {
    const filter = activeSubjectFilter(projectId);
    const rows = subjectRows(projectId);
    if (!filter) return rows;
    return rows.filter((item) => item.costNatureLabel === filter || item.level1 === filter);
  }

  function ensureActivityCalendarState(projectId) {
    const months = activityMonthlySummary(projectId);
    if (!state.profileActivityCalendar || state.profileActivityCalendar.projectId !== projectId) {
      const latest = months[months.length - 1];
      state.profileActivityCalendar = { projectId, month: latest ? String(latest.month) : "5" };
    }
    if (!months.some((item) => String(item.month) === String(state.profileActivityCalendar.month))) {
      const latest = months[months.length - 1];
      state.profileActivityCalendar.month = latest ? String(latest.month) : "5";
    }
    return state.profileActivityCalendar;
  }

  function subjectFocusContext(projectId) {
    const context = state.profileFromSubjectCompare || null;
    if (!context || context.projectId !== projectId || !context.subjectId) return null;
    return context;
  }

  function activityHasSubject(projectId, activityId, subjectId) {
    if (!subjectId) return true;
    return activitySubjectRows(projectId, activityId).some((row) => row.subjectId === subjectId && row.amount > 0);
  }

  function topActivityForSubject(projectId, subjectId, month = "") {
    return activityRows(projectId)
      .filter((activity) => !month || month === "all" || Number(activity.cost_month) === Number(month))
      .filter((activity) => activityHasSubject(projectId, activity.activity_id, subjectId))
      .map((activity) => {
        const subject = activitySubjectRows(projectId, activity.activity_id).find((row) => row.subjectId === subjectId);
        return { activity, amount: subject ? subject.amount : 0 };
      })
      .sort((a, b) => b.amount - a.amount)[0]?.activity || null;
  }

  function selectedActivity(projectId) {
    const activityState = ensureActivityState(projectId);
    return activityRows(projectId).find((row) => row.activity_id === activityState.selectedActivityId) || null;
  }

  function activitySummary(projectId) {
    const rows = activityRows(projectId);
    const baseRows = baseActivityRows(projectId);
    const top = rows.slice().sort((a, b) => Number(b.total_activity_cost || 0) - Number(a.total_activity_cost || 0))[0] || null;
    return {
      activityCount: rows.length,
      specialCost: sum(rows, "total_activity_cost"),
      directCost: sum(rows, "direct_cost_amount"),
      allocatedCost: sum(rows, "allocated_cost_amount"),
      ncCount: rows.reduce((count, row) => count + activityDirectNcCount(projectId, row.activity_id), 0),
      baseCost: sum(baseRows, "total_activity_cost"),
      baseCount: baseRows.length,
      topActivity: top
    };
  }

  function activityMonthlySummary(projectId) {
    const groups = new Map();
    activityRows(projectId).forEach((row) => {
      const month = Number(row.cost_month || 0);
      if (!groups.has(month)) groups.set(month, { month, count: 0, amount: 0, ncCount: 0 });
      const item = groups.get(month);
      item.count += 1;
      item.amount += Number(row.total_activity_cost || 0);
      item.ncCount += activityDirectNcCount(projectId, row.activity_id);
    });
    return Array.from(groups.values()).sort((a, b) => a.month - b.month);
  }

  function subjectKeyForSubjectId(projectId, subjectId) {
    const row = subjectRows(projectId).find((item) => item.subjectId === subjectId);
    return row ? row.subjectKey : "";
  }

  function activityLedgerSubjectKey(projectId, activityId, subjectName) {
    if (!subjectName || typeof getAllLedgerRecords !== "function") return "";
    const normalizedName = String(subjectName || "");
    const match = getAllLedgerRecords().find((record) => {
      if (record.projectId !== projectId || record.activityId !== activityId) return false;
      if (record.factType === "allocated_cost" || record.allocated === true || record.directCollected === false) return false;
      const pathText = String(record.subjectPath || "");
      const itemText = String(record.activityCostItem || "");
      return pathText.endsWith(normalizedName) || pathText.includes(`-${normalizedName}`) || itemText === normalizedName;
    });
    return match && Array.isArray(match.pathKeys) ? match.pathKeys[match.pathKeys.length - 1] || "" : "";
  }

  function shortName(text, max = 15) {
    const value = String(text || "");
    return value.length > max ? value.slice(0, max - 1) + "…" : value;
  }

  function workflowTraceRows(projectId) {
    return (workflowViews().VIEW_NC_WORKFLOW_TRACE_MIN || []).filter((row) => row.project_id === projectId);
  }

  function sum(rows, field) {
    return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
  }

  function moneyText(value) {
    if (typeof moneyWan === "function") return moneyWan(Number(value || 0));
    const wan = Number(value || 0) / 10000;
    return wan.toLocaleString("zh-CN", { minimumFractionDigits: wan >= 100 ? 0 : 1, maximumFractionDigits: 1 }) + "万元";
  }

  function moneyNumber(value) {
    return (Number(value || 0) / 10000).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function percentText(value) {
    if (!Number.isFinite(Number(value))) return "-";
    return (Number(value || 0) * 100).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  }

  function signedPercent(current, previous) {
    if (!previous && !current) return "-";
    if (!previous) return "新增";
    const value = (current - previous) / previous;
    return (value > 0 ? "+" : "") + percentText(value);
  }

  function structureItems(projectId) {
    const rows = monthlyRows(projectId);
    const total = sum(rows, "raw_cost_amount");
    const items = SEGMENTS.map((segment) => ({
      ...segment,
      value: sum(rows, segment.field),
    }));
    return { total, items };
  }

  function monthlyChartRows(projectId) {
    return monthlyRows(projectId).map((row) => {
      const item = {
        label: row.label,
        short: row.short,
        month: Number(row.cost_month),
        projectId,
        total: row.raw_cost_amount,
      };
      SEGMENTS.forEach((segment) => {
        item[segment.key] = row[segment.field] || 0;
      });
      return item;
    });
  }

  function waterfallSteps(projectId) {
    const rows = monthlyRows(projectId);
    const april = rows.find((row) => Number(row.cost_month) === 4);
    const may = rows.find((row) => Number(row.cost_month) === 5);
    if (!april || !may || (!april.raw_cost_amount && !may.raw_cost_amount)) return [];
    const steps = [{ label: "4月成本", value: april.raw_cost_amount }];
    SEGMENTS.filter((segment) => segment.key !== "finance" || (april[segment.field] || may[segment.field])).forEach((segment) => {
      const diff = Number(may[segment.field] || 0) - Number(april[segment.field] || 0);
      if (Math.abs(diff) > 0.01) steps.push({ label: segment.label.replace("费用", ""), value: diff });
    });
    steps.push({ label: "5月成本", value: may.raw_cost_amount });
    return steps;
  }

  function subjectKeyFor(row) {
    return [row.level1_name, row.level2_name, row.level3_name].filter(Boolean).join("|");
  }

  function subjectRows(projectId) {
    const rows = (views().VIEW_PROJECT_SUBJECT_TREE || []).filter((row) => row.project_id === projectId);
    const groups = new Map();
    rows.forEach((row) => {
      const key = row.subject_id || subjectKeyFor(row);
      if (!groups.has(key)) {
        groups.set(key, {
          subjectId: row.subject_id,
          subjectCode: row.subject_code || "",
          subjectName: row.subject_name || row.level3_name || row.level2_name || row.level1_name,
          level1: row.level1_name || "",
          level2: row.level2_name || "",
          level3: row.level3_name || row.subject_name || "",
          costNature: row.cost_nature || "",
          subjectKey: subjectKeyFor(row),
          currentMonthAmount: 0,
          previousMonthAmount: 0,
          cumulativeAmount: 0,
        });
      }
      const item = groups.get(key);
      const amount = Number(row.raw_cost_amount || 0);
      item.cumulativeAmount += amount;
      if (Number(row.cost_month) === 5) item.currentMonthAmount += amount;
      if (Number(row.cost_month) === 4) item.previousMonthAmount += amount;
    });
    const total = Math.max(1, homeSummary(projectId).totalCost);
    const allRawRows = rawDetailRows(projectId);
    return Array.from(groups.values()).map((item) => {
      item.projectRatio = item.cumulativeAmount / total;
      item.ncCount = allRawRows.filter((row) => row.subject_id === item.subjectId).length;
      item.currentNcCount = allRawRows.filter((row) => row.subject_id === item.subjectId && Number(row.cost_month) === 5).length;
      item.costNatureLabel = costNatureLabel(item);
      return item;
    }).sort((a, b) => b.cumulativeAmount - a.cumulativeAmount);
  }

  function costNatureLabel(item) {
    if (item.level1) return item.level1;
    const map = { fixed: "固定成本", variable: "变动成本", management: "管理费用", sales: "销售费用", tax: "税金", finance: "财务费用" };
    return map[item.costNature] || "其他";
  }

  function topSubjects(projectId) {
    return subjectRows(projectId)
      .filter((row) => getMoMDeltaAbs(row) > 0)
      .sort((a, b) => {
        const deltaDiff = getMoMDeltaAbs(b) - getMoMDeltaAbs(a);
        if (deltaDiff !== 0) return deltaDiff;
        return String(a.subjectName || "").localeCompare(String(b.subjectName || ""), "zh-CN");
      })
      .slice(0, 3);
  }

  function getMoMDelta(item) {
    const current = Number(item.currentMonthAmount || 0);
    const previous = Number(item.previousMonthAmount || 0);
    return current - previous;
  }

  function getMoMDeltaAbs(item) {
    const current = Number(item.currentMonthAmount || 0);
    const previous = Number(item.previousMonthAmount || 0);
    return Math.abs(current - previous);
  }

  function hasComparablePreviousMonth(item) {
    return Number(item.previousMonthAmount || 0) > 0;
  }

  function signedMoneyText(value) {
    const amount = Number(value || 0);
    if (amount > 0) return "+" + moneyText(amount);
    if (amount < 0) return "-" + moneyText(Math.abs(amount));
    return moneyText(0);
  }

  function momDirectionText(item) {
    if (!hasComparablePreviousMonth(item)) return "本期新增科目";
    const delta = getMoMDelta(item);
    if (delta > 0) return "环比上升";
    if (delta < 0) return "环比下降";
    return "环比持平";
  }

  function focusBasis(item, project) {
    const mayCost = Math.max(1, homeSummary(project.id).mayCost);
    const monthRatio = percentText(item.currentMonthAmount / mayCost);
    const mom = hasComparablePreviousMonth(item) ? signedPercent(item.currentMonthAmount, item.previousMonthAmount) : "本期新增科目";
    const delta = getMoMDelta(item);
    return `4月金额${moneyText(item.previousMonthAmount)}，5月金额${moneyText(item.currentMonthAmount)}，占项目5月成本${monthRatio}；环比${mom}，环比增减额${signedMoneyText(delta)}，按最近两月增减额绝对值${moneyText(getMoMDeltaAbs(item))}排序。仅用于辅助复核。`;
  }

  function focusAction(item) {
    const delta = getMoMDelta(item);
    if (!hasComparablePreviousMonth(item)) {
      return "该科目为本期新增，建议结合活动排期与NC明细确认。";
    }
    if (delta > 0) {
      return "该科目环比上升较大，建议核查近月增量是否对应活动排期与合同结算范围。";
    }
    if (delta < 0) {
      return "该科目环比下降较大，建议确认是否为阶段性回落或存在漏记。";
    }
    return "该科目环比基本持平，建议结合NC明细进行常规复核。";
  }

  function statusLabel(summary) {
    if (String(summary.executionCategory).includes("正常")) return "正常推进";
    if (summary.budgetRate && summary.budgetRate < 0.8) return "执行偏低";
    if (summary.budgetRate && summary.budgetRate > 1.05) return "需关注";
    return "数据待核验";
  }

  function budgetExecution(projectId) {
    if (typeof getProjectBudgetExecution === "function") return getProjectBudgetExecution(projectId, 5);
    return null;
  }

  function permissionScope(role, project) {
    if (!role) return "未登录";
    if (role.maskSensitive) return "脱敏演示";
    if (role.visibleProjectIds === "all") return "全部授权项目";
    return project ? "当前项目" : "当前可查看项目";
  }

  function projectOptions(activeProjectId) {
    const rows = allowedProjects();
    return rows.map((project) => `<option value="${h(project.id)}" ${project.id === activeProjectId ? "selected" : ""}>${h(project.shortName)} - ${h(project.fullName)}</option>`).join("");
  }

  function renderTabs(project) {
    return `
      <div class="profile-tabs" role="tablist" aria-label="V13穿透路径">
        <button class="profile-tab is-active" type="button">项目画像</button>
        <button class="profile-tab" type="button" data-action="org-select" data-type="project" data-project="${h(project.id)}">组织穿透</button>
        <button class="profile-tab" type="button" data-action="subject-compare-open">科目横向</button>
      </div>
    `;
  }

  function renderIdentity(project, summary, role) {
    const execution = budgetExecution(project.id);
    const mayChange = monthlyRows(project.id);
    const april = mayChange.find((row) => Number(row.cost_month) === 4)?.raw_cost_amount || 0;
    const may = mayChange.find((row) => Number(row.cost_month) === 5)?.raw_cost_amount || 0;
    return `
      <section class="profile-identity">
        <div class="profile-identity-main">
          <span class="profile-eyebrow">项目身份卡</span>
          <h2>${h(project.fullName || project.shortName)}</h2>
          <div class="profile-identity-tags">
            <span>${h(summary.projectType)}</span>
            <span>${h(permissionScope(role, project))}</span>
            <span>2026年1-5月</span>
            <span>${h(statusLabel(summary))}</span>
          </div>
        </div>
        <dl class="profile-identity-grid">
          <div><dt>项目简称</dt><dd>${h(project.shortName)}</dd></div>
          <div><dt>项目编码</dt><dd>${h(project.code || project.id)}</dd></div>
          <div><dt>累计成本</dt><dd>${h(moneyText(summary.totalCost))}</dd></div>
          <div><dt>5月成本</dt><dd>${h(moneyText(summary.mayCost))}</dd></div>
          <div><dt>最近两月环比</dt><dd>${h(signedPercent(may, april))}</dd></div>
          <div><dt>预算执行率</dt><dd>${h(percentText(summary.budgetRate || (execution && execution.sequenceBudgetRatio)))}</dd></div>
          <div><dt>NC明细</dt><dd>${summary.ncCount.toLocaleString("zh-CN")}笔</dd></div>
          <div><dt>活动 / 场馆</dt><dd>${summary.activityCount} / ${summary.venueCount || "-"}</dd></div>
        </dl>
      </section>
    `;
  }

  function renderMetrics(project, summary) {
    const subjects = topSubjects(project.id);
    const top = subjects[0];
    const execution = budgetExecution(project.id);
    return `
      <section class="profile-kpi-grid" aria-label="核心指标卡">
        ${renderMetric("1-5月累计成本", moneyText(summary.totalCost), "沿用原项目总成本口径")}
        ${renderMetric("5月成本", moneyText(summary.mayCost), "与首页项目表5月金额一致")}
        ${renderMetric("预算执行率", percentText(summary.budgetRate || (execution && execution.sequenceBudgetRatio)), "按既有预算视图读取")}
        ${renderMetric("NC明细笔数", `${summary.ncCount.toLocaleString("zh-CN")}笔`, "仅统计直接归集明细")}
        ${renderMetric("Top科目占比", top ? percentText(top.currentMonthAmount / Math.max(1, summary.mayCost)) : "-", top ? top.subjectName : "暂无")}
        ${renderMetric("活动数量", `${summary.activityCount}个`, "用于活动排期交叉核查")}
      </section>
    `;
  }

  function renderCostSummary(project, summary) {
    const subjects = topSubjects(project.id).slice(0, 3);
    const subjectNames = subjects.map((row) => row.subjectName).filter(Boolean).join("、") || "主要成本科目";
    return `
      <section class="section profile-summary-section">
        <div class="section-header">
          <div>
            <h2 class="section-title">项目成本摘要</h2>
            <span class="section-note">基于当前项目画像已计算指标生成，不新增金额口径。</span>
          </div>
        </div>
        <p class="profile-summary-text">${h(project.shortName)}项目2026年1—5月累计成本${h(moneyText(summary.totalCost))}，5月成本${h(moneyText(summary.mayCost))}，成本主要集中在${h(subjectNames)}等科目。建议结合Top科目和NC明细查看本月成本变化来源。</p>
      </section>
    `;
  }

  function renderMetric(label, value, note) {
    return `
      <article class="profile-kpi">
        <span>${h(label)}</span>
        <strong>${h(value)}</strong>
        <em>${h(note)}</em>
      </article>
    `;
  }

  function renderCharts(project, summary) {
    const charts = global.V132Charts || {};
    const structure = structureItems(project.id);
    const chartSegments = SEGMENTS.filter((segment) => segment.key !== "finance" || structure.items.some((item) => item.key === "finance" && item.value > 0));
    return `
      <div class="profile-chart-grid">
        <section class="section profile-chart-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">成本结构环形图</h2>
              <span class="section-note">中心值为项目1-5月累计成本。</span>
            </div>
          </div>
          ${charts.donut ? charts.donut(structure.items.map((item) => ({ label: item.label, value: item.value })), structure.total, { title: "成本结构环形图" }) : ""}
        </section>
        <section class="section profile-chart-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">最近两月环比瀑布图</h2>
              <span class="section-note">默认展示4月到5月的增减贡献。</span>
            </div>
          </div>
          ${charts.waterfall ? charts.waterfall(waterfallSteps(project.id)) : ""}
        </section>
      </div>
      <section class="section profile-chart-section profile-stack-section">
        <div class="section-header">
          <div>
            <h2 class="section-title">月度成本堆叠柱状图</h2>
            <span class="section-note">2026年1-5月，按成本性质分段展示。</span>
          </div>
        </div>
        ${charts.stackedBars ? charts.stackedBars(monthlyChartRows(project.id), chartSegments) : ""}
      </section>
    `;
  }

  function renderTopSubjects(project) {
    const subjects = topSubjects(project.id);
    if (!subjects.length) return `<section class="section">${renderEmpty("暂无Top3需关注科目")}</section>`;
    return `
      <section class="section">
        <div class="section-header">
          <div>
            <h2 class="section-title">Top3需关注科目</h2>
            <span class="section-note">按最近两月环比增减额排序，聚焦变化最大的科目，仅用于辅助复核，不代表正式判断。</span>
          </div>
        </div>
        <div class="profile-focus-grid">
          ${subjects.map((item, index) => `
            <article class="profile-focus-card">
              <div class="profile-focus-rank">TOP ${index + 1}</div>
              <h3><button type="button" class="profile-focus-title-link" data-action="profile-open-nc" data-project="${h(project.id)}" data-subject="${h(item.subjectId)}" data-subject-key="${h(item.subjectKey)}" data-month="5">${h(item.subjectName)}</button></h3>
              <dl>
                <div><dt>成本性质</dt><dd>${h(item.costNatureLabel)}</dd></div>
                <div><dt>5月金额</dt><dd>${h(moneyText(item.currentMonthAmount))}</dd></div>
                <div><dt>累计金额</dt><dd>${h(moneyText(item.cumulativeAmount))}</dd></div>
                <div><dt>占项目成本比例</dt><dd>${h(percentText(item.currentMonthAmount / Math.max(1, homeSummary(project.id).mayCost)))}</dd></div>
                <div><dt>环比变化</dt><dd>${h(hasComparablePreviousMonth(item) ? signedPercent(item.currentMonthAmount, item.previousMonthAmount) : "本期新增科目")}</dd></div>
                <div><dt>环比增减额</dt><dd>${h(signedMoneyText(getMoMDelta(item)))}</dd></div>
                <div><dt>NC笔数</dt><dd>${item.currentNcCount}笔</dd></div>
              </dl>
              <p><strong>关注原因：</strong>${h(focusBasis(item, project))}</p>
              <p><strong>建议动作：</strong>${h(focusAction(item))}</p>
              <div class="profile-focus-actions">
                <button class="btn primary" data-action="profile-open-nc" data-project="${h(project.id)}" data-subject="${h(item.subjectId)}" data-subject-key="${h(item.subjectKey)}" data-month="5">查看NC明细</button>
                <button class="btn" data-action="subject-compare-open" data-subject-id="${h(item.subjectId)}" data-month="5">横向对比</button>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function activityCostBalance(project, summary, axisSummary) {
    const total = Number(summary.totalCost || 0);
    const specialDirect = Number(axisSummary.directCost || 0);
    const dailyBase = Math.max(0, total - specialDirect);
    const activityShare = total > 0 ? specialDirect / total : 0;
    return {
      total,
      dailyBase,
      specialDirect,
      allocatedReference: Number(axisSummary.allocatedCost || 0),
      activityShare,
      baseShare: total > 0 ? dailyBase / total : 0,
      diff: total - dailyBase - specialDirect,
      statement: activityShare >= 0.5
        ? "本项目活动专项成本占比较高，建议结合活动排期、合同和NC明细核查成本节奏。"
        : "本项目日常基础成本占比较高，建议结合固定成本分摊规则和NC明细复核。"
    };
  }

  function renderBaseVsSpecial(project, summary, axisSummary) {
    const balance = activityCostBalance(project, summary, axisSummary);
    const total = Math.max(1, balance.total);
    const basePct = balance.dailyBase / total * 100;
    const specialPct = balance.specialDirect / total * 100;
    return `
      <div class="profile-activity-balance" id="profileActivityBalance">
        <div class="profile-activity-balance-head">
          <div>
            <strong>日常基础成本 vs 活动专项成本</strong>
            <span>活动专项按直接归集成本读取；分摊成本作为活动解释层展示，不重复进入项目总成本。</span>
          </div>
          <em>对账差额 ${moneyText(balance.diff)}</em>
        </div>
        <div class="profile-activity-balance-bars">
          <div class="balance-row is-base">
            <span>日常基础成本</span>
            <i><b style="width:${Math.max(2, basePct).toFixed(1)}%"></b></i>
            <strong>${h(moneyText(balance.dailyBase))} · ${percentText(balance.baseShare)}</strong>
          </div>
          <div class="balance-row is-special">
            <span>活动专项成本</span>
            <i><b style="width:${Math.max(2, specialPct).toFixed(1)}%"></b></i>
            <strong>${h(moneyText(balance.specialDirect))} · ${percentText(balance.activityShare)}</strong>
          </div>
        </div>
        <div class="profile-activity-balance-check">
          ${h(moneyText(balance.dailyBase))} + ${h(moneyText(balance.specialDirect))} = ${h(moneyText(balance.total))}
          <span>分摊计入成本参考：${h(moneyText(balance.allocatedReference))}</span>
        </div>
        <p>${h(balance.statement)}</p>
      </div>
    `;
  }

  function renderActivityCalendar(project) {
    const rows = activityRows(project.id);
    const months = activityMonthlySummary(project.id);
    const calendarState = ensureActivityCalendarState(project.id);
    const selectedMonth = String(calendarState.month || "5");
    const selectedSummary = months.find((item) => String(item.month) === selectedMonth) || months[months.length - 1] || { month: selectedMonth, count: 0, amount: 0, ncCount: 0 };
    const selectedRows = rows
      .filter((row) => String(row.cost_month || "") === String(selectedSummary.month))
      .sort((a, b) => Number(b.total_activity_cost || 0) - Number(a.total_activity_cost || 0));
    const baseCount = baseActivityRows(project.id).length;
    return `
      <section class="section profile-calendar-section" id="profileActivityCalendar">
        <div class="section-header">
          <div>
            <h2 class="section-title">活动月度概览</h2>
            <span class="section-note">当前基于活动专项成本记录展示活动发生月份和活动清单；日常基础运营成本不计入档期占用。待活动起止日期字段接入后，可升级为天级档期日历。</span>
          </div>
        </div>
        <div class="profile-calendar-rule">活动月度概览用于查看活动发生月份和活动清单；活动轴用于解释项目成本波动与活动专项成本构成。</div>
        <div class="profile-calendar-audit">
          <span>日期字段状态：待接入起止日期</span>
          <span>已过滤基础运营活动：${baseCount}类</span>
          <span>当前展示：${selectedSummary.month}月专项活动</span>
        </div>
        <div class="profile-calendar-month-grid" aria-label="月度活动概览">
          ${months.map((item) => `
            <button type="button" class="${String(item.month) === String(selectedSummary.month) ? "is-selected" : ""}" data-action="profile-calendar-month" data-project="${h(project.id)}" data-month="${h(item.month)}" title="${h(`${item.month}月活动专项：${item.count}项，${moneyText(item.amount)}，直接NC ${item.ncCount}笔`)}">
              <span>2026年${item.month}月</span>
              <strong>${item.count}项活动</strong>
              <em>${h(moneyText(item.amount))}</em>
            </button>
          `).join("")}
        </div>
        <div class="profile-calendar-layout">
          <div class="profile-calendar-summary">
            <div><span>本月活动数量</span><strong>${selectedSummary.count}项</strong></div>
            <div><span>本月活动专项成本</span><strong>${h(moneyText(selectedSummary.amount))}</strong></div>
            <div><span>直接NC明细</span><strong>${Number(selectedSummary.ncCount || 0).toLocaleString("zh-CN")}笔</strong></div>
            <div><span>日期字段</span><strong>待接入起止日期</strong></div>
          </div>
          <div class="profile-calendar-list" aria-label="${h(selectedSummary.month)}月活动列表">
            <div class="profile-calendar-list-head">
              <span>活动清单</span>
              <em>按活动专项成本由高到低展示</em>
            </div>
            ${selectedRows.length ? selectedRows.slice(0, 10).map((activity) => {
              return `
                <button type="button" class="profile-calendar-activity" data-action="profile-calendar-activity-open" data-project="${h(project.id)}" data-activity="${h(activity.activity_id)}" data-month="${h(activity.cost_month)}">
                  <span>${h(shortName(activity.activity_name, 22))}</span>
                  <strong>${h(moneyText(activity.total_activity_cost))}</strong>
                  <em>${h(activityTypeLabel(activity.activity_type))} · 直接NC ${activityDirectNcCount(project.id, activity.activity_id)}笔</em>
                </button>
              `;
            }).join("") : renderEmpty("当前月份暂无专项活动")}
          </div>
        </div>
      </section>
    `;
  }

  function renderActivityAxis(project, summary) {
    const rows = activityRows(project.id);
    const axisSummary = activitySummary(project.id);
    const activityState = ensureActivityState(project.id);
    const focus = subjectFocusContext(project.id);
    if (focus && !activityState.selectedSubjectId) activityState.selectedSubjectId = focus.subjectId;
    if (focus && activityState.subjectFocusOnly && !activityHasSubject(project.id, activityState.selectedActivityId, focus.subjectId)) {
      const topFocus = topActivityForSubject(project.id, focus.subjectId, activityState.monthFilter);
      if (topFocus) activityState.selectedActivityId = topFocus.activity_id;
    }
    const baseFilteredRows = rows.filter((row) => {
      if (activityState.monthFilter && Number(row.cost_month) !== Number(activityState.monthFilter)) return false;
      if (focus && activityState.subjectFocusOnly && !activityHasSubject(project.id, row.activity_id, focus.subjectId)) return false;
      return true;
    });
    const active = selectedActivity(project.id);
    if (!rows.length) {
      return `
        <section class="section profile-activity-section" id="profileActivityAxis">
          <div class="section-header">
            <div>
              <h2 class="section-title">项目活动轴</h2>
              <span class="section-note">项目活动轴用于解释项目成本波动背后的重点活动、活动成本科目和NC明细来源。</span>
            </div>
          </div>
          ${renderEmpty("当前项目暂无已归集专项活动")}
        </section>
      `;
    }
    const topRows = baseFilteredRows.slice().sort((a, b) => Number(b.total_activity_cost || 0) - Number(a.total_activity_cost || 0)).slice(0, 10);
    if (active && !topRows.some((row) => row.activity_id === active.activity_id)) topRows.push(active);
    const maxAmount = Math.max(1, ...topRows.map((row) => Number(row.total_activity_cost || 0)));
    const months = activityMonthlySummary(project.id);
    const filterText = activityState.monthFilter
      ? `当前筛选：2026年${activityState.monthFilter}月活动，共${baseFilteredRows.length}项`
      : focus && activityState.subjectFocusOnly
        ? `当前筛选：${focus.subjectName || "当前科目"}相关活动，共${baseFilteredRows.length}项`
        : `当前筛选：全部月份活动，共${baseFilteredRows.length}项`;
    return `
      <section class="section profile-activity-section" id="profileActivityAxis">
        <div class="section-header">
          <div>
            <h2 class="section-title">项目活动轴</h2>
            <span class="section-note">项目活动轴用于解释项目成本波动背后的重点活动、活动成本科目和NC明细来源。</span>
          </div>
          <button class="btn primary" type="button" data-action="profile-activity-detail" data-project="${h(project.id)}" data-activity="${h(activityState.selectedActivityId)}">查看活动详情</button>
        </div>

        ${focus ? `
          <div class="profile-activity-source">
            <strong>来自科目横向对比：${h(focus.subjectName || "当前科目")}</strong>
            <span>以下活动为该科目在本项目中的主要贡献活动。</span>
            <button class="btn" type="button" data-action="profile-activity-subject-toggle">${activityState.subjectFocusOnly ? "显示全部活动" : "仅看该科目相关活动"}</button>
          </div>
        ` : ""}

        <div class="profile-activity-metrics">
          ${renderMetric("专项活动数量", `${axisSummary.activityCount}个`, "不含基础运营活动")}
          ${renderMetric("专项活动成本", moneyText(axisSummary.specialCost), "按既有活动视图读取")}
          ${renderMetric("直接 / 分摊", `${moneyText(axisSummary.directCost)} / ${moneyText(axisSummary.allocatedCost)}`, "不重算项目总成本")}
          ${renderMetric("直接NC明细", `${axisSummary.ncCount.toLocaleString("zh-CN")}笔`, `基础运营活动${axisSummary.baseCount}类`)}
        </div>

        ${renderBaseVsSpecial(project, summary, axisSummary)}

        <div class="profile-activity-months" aria-label="活动月份分布">
          <button type="button" class="${!activityState.monthFilter ? "is-selected" : ""}" data-action="profile-activity-month-clear" title="恢复全部月份活动">
            <span>全部月份</span>
            <strong>${rows.length}个</strong>
            <em>恢复全部</em>
          </button>
          ${months.map((item) => `
            <button type="button" class="${String(activityState.monthFilter) === String(item.month) ? "is-selected" : ""}" data-action="profile-activity-month" data-month="${item.month}" title="${h(`${item.month}月：${item.count}个活动，${moneyText(item.amount)}，直接NC ${item.ncCount}笔`)}">
              <span>${item.month}月</span>
              <strong>${item.count}个</strong>
              <em>${h(moneyText(item.amount))}</em>
            </button>
          `).join("")}
        </div>
        <div class="profile-activity-filter-note">${h(filterText)}</div>

        <div class="profile-activity-layout">
          <div class="profile-activity-bars" aria-label="活动成本条形图">
            ${topRows.length ? topRows.map((row) => {
              const width = Math.max(4, Number(row.total_activity_cost || 0) / maxAmount * 100);
              const selected = row.activity_id === activityState.selectedActivityId;
              const focusSubject = focus ? activitySubjectRows(project.id, row.activity_id).find((item) => item.subjectId === focus.subjectId) : null;
              return `
                <button class="profile-activity-bar ${selected ? "is-selected" : ""} ${focusSubject ? "is-subject-focus" : ""}" type="button" data-action="profile-activity-select" data-project="${h(project.id)}" data-activity="${h(row.activity_id)}" title="${h(`${row.activity_name}｜${moneyText(row.total_activity_cost)}｜直接NC ${activityDirectNcCount(project.id, row.activity_id)}笔`)}">
                  <span class="profile-activity-bar-name">${h(shortName(row.activity_name, 18))}</span>
                  <span class="profile-activity-bar-track"><i style="width:${width.toFixed(1)}%"></i></span>
                  <span class="profile-activity-bar-meta">${row.cost_month}月 · ${h(activityTypeLabel(row.activity_type))}</span>
                  <strong>${focusSubject ? h(`${moneyText(focusSubject.amount)} / ${focus.subjectName}`) : h(moneyText(row.total_activity_cost))}</strong>
                </button>
              `;
            }).join("") : renderEmpty("当前筛选下暂无活动样本")}
          </div>
          ${renderActivitySelectedCard(project, active, focus)}
        </div>

        ${renderActivityMatrix(project, baseFilteredRows, activityState, focus)}
        <p class="profile-activity-note">当前展示基于已归集活动样本，正式结论以NC原始数据、合同和结算单为准。</p>
      </section>
    `;
  }

  function renderActivitySelectedCard(project, activity, focus = null) {
    if (!activity) return `<aside class="profile-activity-card">${renderEmpty("请选择活动")}</aside>`;
    const subjectRowsForActivity = activitySubjectRows(project.id, activity.activity_id);
    const focusedSubject = focus ? subjectRowsForActivity.find((item) => item.subjectId === focus.subjectId) : null;
    const total = Math.max(1, sum(subjectRowsForActivity, "amount"));
    const directNcCount = activityDirectNcCount(project.id, activity.activity_id);
    return `
      <aside class="profile-activity-card" id="profileActivityCard">
        <div class="profile-activity-card-head">
          <span>${activity.cost_month}月 · ${h(activityTypeLabel(activity.activity_type))}</span>
          <h3>${h(activity.activity_name)}</h3>
          <em>${h(activityStatusLabel(activity.status))}</em>
        </div>
        ${focusedSubject ? `<div class="profile-activity-focus-pill">当前科目：${h(focus.subjectName)} · ${h(moneyText(focusedSubject.amount))} · 直接NC ${focusedSubject.directNcCount}笔</div>` : ""}
        <dl class="profile-activity-card-grid">
          <div><dt>活动成本</dt><dd>${h(moneyText(activity.total_activity_cost))}</dd></div>
          <div><dt>直接成本</dt><dd>${h(moneyText(activity.direct_cost_amount))}</dd></div>
          <div><dt>分摊成本</dt><dd>${h(moneyText(activity.allocated_cost_amount))}</dd></div>
          <div><dt>直接NC明细</dt><dd>${directNcCount.toLocaleString("zh-CN")}笔</dd></div>
        </dl>
        <div class="profile-activity-subjects" id="profileActivitySubjects">
          <div class="profile-activity-subhead">
            <strong>活动科目分布</strong>
            <span>${subjectRowsForActivity.length}个科目</span>
          </div>
          ${subjectRowsForActivity.slice(0, 6).map((item) => {
            const width = Math.max(4, item.amount / total * 100);
            return `
              <button type="button" class="profile-activity-subject-row ${focus && focus.subjectId === item.subjectId ? "is-focus" : ""}" data-action="profile-activity-subject" data-project="${h(project.id)}" data-activity="${h(activity.activity_id)}" data-subject="${h(item.subjectId)}" title="${h(`${item.subjectName}｜${moneyText(item.amount)}｜直接NC ${item.directNcCount}笔`)}">
                <span>${h(item.subjectName)}</span>
                <i><b style="width:${width.toFixed(1)}%"></b></i>
                <strong>${h(moneyText(item.amount))} · <span class="${Number(item.directNcCount || 0) === 0 ? "is-allocated-only" : ""}">${h(activityDirectNcLabel(item))}</span></strong>
              </button>
            `;
          }).join("")}
        </div>
        <div class="profile-activity-actions">
          <button class="btn primary" type="button" data-action="profile-activity-nc" data-project="${h(project.id)}" data-activity="${h(activity.activity_id)}" data-month="${h(activity.cost_month)}">查看NC明细</button>
          <button class="btn" type="button" data-action="profile-activity-detail" data-project="${h(project.id)}" data-activity="${h(activity.activity_id)}">查看活动详情</button>
        </div>
      </aside>
    `;
  }

  function renderActivityMatrix(project, rows, activityState, focus = null) {
    const activities = rows.slice().sort((a, b) => Number(b.total_activity_cost || 0) - Number(a.total_activity_cost || 0)).slice(0, 6);
    let subjects = activitySubjectRows(project.id, "").slice(0, 5);
    if (focus && focus.subjectId && !subjects.some((subject) => subject.subjectId === focus.subjectId)) {
      const focused = activitySubjectRows(project.id, "").find((subject) => subject.subjectId === focus.subjectId);
      if (focused) subjects = [focused].concat(subjects.slice(0, 4));
    }
    if (!activities.length || !subjects.length) return "";
    const subjectFor = (activityId, subjectId) => activitySubjectRows(project.id, activityId).find((row) => row.subjectId === subjectId) || null;
    const amountFor = (activityId, subjectId) => subjectFor(activityId, subjectId)?.amount || 0;
    const max = Math.max(1, ...activities.flatMap((activity) => subjects.map((subject) => amountFor(activity.activity_id, subject.subjectId))));
    return `
      <div class="profile-activity-matrix" id="profileActivityMatrix">
        <div class="profile-activity-matrix-head">
          <strong>活动—科目矩阵</strong>
          <span>点击单元格可选中活动与科目</span>
        </div>
        <div class="profile-activity-matrix-grid" style="--subject-count:${subjects.length}">
          <div class="matrix-corner">活动</div>
          ${subjects.map((subject) => `<div class="matrix-subject ${focus && focus.subjectId === subject.subjectId ? "is-focus" : ""}">${h(shortName(subject.subjectName, 8))}</div>`).join("")}
          ${activities.map((activity) => `
            <button type="button" class="matrix-activity ${activity.activity_id === activityState.selectedActivityId ? "is-selected" : ""}" data-action="profile-activity-select" data-project="${h(project.id)}" data-activity="${h(activity.activity_id)}">${h(activity.activity_name)}</button>
            ${subjects.map((subject) => {
              const row = subjectFor(activity.activity_id, subject.subjectId);
              const value = row?.amount || 0;
              const level = Math.max(0.08, value / max);
              const active = activity.activity_id === activityState.selectedActivityId && subject.subjectId === activityState.selectedSubjectId;
              const focused = focus && focus.subjectId === subject.subjectId;
              const allocatedOnly = row && Number(row.directNcCount || 0) === 0;
              return `<button type="button" class="matrix-cell ${active ? "is-selected" : ""} ${focused ? "is-focus" : ""}" data-action="profile-activity-subject" data-project="${h(project.id)}" data-activity="${h(activity.activity_id)}" data-subject="${h(subject.subjectId)}" style="--heat:${level.toFixed(3)}" title="${h(`${activity.activity_name} / ${subject.subjectName} / ${moneyText(value)} / ${allocatedOnly ? "按规则分摊 0笔" : `直接归集 ${row ? row.directNcCount : 0}笔`}`)}">${value ? h(moneyNumber(value)) : "-"}${allocatedOnly ? '<span class="is-allocated-only">按规则分摊 0笔</span>' : ""}</button>`;
            }).join("")}
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderActivityDetailDrawer() {
    if (state.view !== PROFILE_VIEW || !state.profileActivity || !state.profileActivity.drawerOpen) return "";
    const project = projectById(state.profileProjectId || state.projectId);
    const activity = selectedActivity(project.id);
    if (!activity) return "";
    const subjects = activitySubjectRows(project.id, activity.activity_id);
    const directNcCount = activityDirectNcCount(project.id, activity.activity_id);
    return `
      <div class="profile-activity-drawer-backdrop" data-action="profile-activity-drawer-close" aria-hidden="true"></div>
      <aside class="profile-activity-drawer" role="dialog" aria-label="活动详情">
        <div class="profile-activity-drawer-head">
          <div>
            <span>活动详情</span>
            <h2>${h(activity.activity_name)}</h2>
          </div>
          <button class="drawer-close" type="button" data-action="profile-activity-drawer-close" aria-label="关闭活动详情">×</button>
        </div>
        <div class="profile-activity-drawer-summary">
          <div><span>活动成本</span><strong>${h(moneyText(activity.total_activity_cost))}</strong></div>
          <div><span>活动月份</span><strong>${activity.cost_month}月</strong></div>
          <div><span>活动类型</span><strong>${h(activityTypeLabel(activity.activity_type))}</strong></div>
          <div><span>直接NC明细</span><strong>${directNcCount.toLocaleString("zh-CN")}笔</strong></div>
        </div>
        <div class="profile-activity-drawer-subjects">
          <h3>活动科目分布</h3>
          ${subjects.slice(0, 8).map((item) => `
            <button type="button" data-action="profile-activity-nc" data-project="${h(project.id)}" data-activity="${h(activity.activity_id)}" data-subject="${h(item.subjectId)}" data-month="${h(activity.cost_month)}">
              <span>${h(item.subjectName)}</span>
              <em>${h(item.costNatureLabel)}</em>
              <strong>${h(moneyText(item.amount))}<small class="${Number(item.directNcCount || 0) === 0 ? "is-allocated-only" : ""}">${h(activityDirectNcLabel(item))}</small></strong>
            </button>
          `).join("")}
        </div>
        <p class="profile-activity-note">活动详情只用于解释项目成本来源，不改变项目画像原有金额口径；活动NC入口仅列示直接归集明细，分摊成本按规则计入活动总成本。</p>
        <div class="profile-activity-actions">
          <button class="btn primary" type="button" data-action="profile-activity-nc" data-project="${h(project.id)}" data-activity="${h(activity.activity_id)}" data-month="${h(activity.cost_month)}">查看活动NC明细</button>
          <button class="btn" type="button" data-action="profile-activity-drawer-close">返回活动轴</button>
        </div>
      </aside>
    `;
  }

  function renderSubjectTable(project, summary) {
    const filter = activeSubjectFilter(project.id);
    const rows = filteredSubjectRows(project.id);
    const totalRows = subjectRows(project.id).length;
    const filterNote = filter ? `当前筛选：${filter}，已筛选${rows.length}个科目，可清除筛选` : `当前筛选：全部科目，共${rows.length}个科目`;
    return `
      <section class="section profile-subject-section">
        <div class="section-header">
          <div>
            <h2 class="section-title">全科目明细表</h2>
            <span class="section-note">金额右对齐；环比为5月对4月；NC入口按当前项目和当前科目过滤。</span>
          </div>
        </div>
        <div class="profile-subject-filter-state">
          <span>${h(filterNote)}</span>
          ${filter ? `<button class="btn" type="button" data-action="profile-structure-clear" data-project="${h(project.id)}">清除筛选</button>` : `<span>点击上方成本结构图可筛选固定成本、变动成本或管理费用。</span>`}
          <em>全项目科目数：${totalRows}个</em>
        </div>
        <div class="table-wrap profile-table-wrap">
          <table class="data-table profile-subject-table">
            <thead>
              <tr>
                <th>科目层级</th>
                <th>成本性质</th>
                <th class="num">5月金额</th>
                <th class="num">4月金额</th>
                <th class="num">环比</th>
                <th class="num">环比增减额</th>
                <th class="num">累计金额</th>
                <th class="num">占项目成本</th>
                <th class="num">NC笔数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((item) => `
                <tr>
                  <td><strong>${h(item.subjectName)}</strong><small>${h([item.level1, item.level2, item.level3].filter(Boolean).join(" / "))}</small></td>
                  <td>${h(item.costNatureLabel)}</td>
                  <td class="num">${h(moneyText(item.currentMonthAmount))}</td>
                  <td class="num">${h(moneyText(item.previousMonthAmount))}</td>
                  <td class="num">${h(signedPercent(item.currentMonthAmount, item.previousMonthAmount))}</td>
                  <td class="num">${h(signedMoneyText(getMoMDelta(item)))}</td>
                  <td class="num">${h(moneyText(item.cumulativeAmount))}</td>
                  <td class="num">${h(percentText(item.cumulativeAmount / Math.max(1, summary.totalCost)))}</td>
                  <td class="num">${item.ncCount}</td>
                  <td>
                    <button class="plain-link detail-link" data-action="profile-open-nc" data-project="${h(project.id)}" data-subject="${h(item.subjectId)}" data-subject-key="${h(item.subjectKey)}" data-month="all">查看NC明细</button>
                    <button class="plain-link detail-link" data-action="subject-compare-open" data-subject-id="${h(item.subjectId)}" data-month="all">横向对比</button>
                  </td>
                </tr>
              `).join("") || `<tr><td colspan="10">${renderEmpty("当前筛选下暂无科目")}</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderNcSummary(project, role) {
    const rows = rawDetailRows(project.id);
    const workflowRows = workflowTraceRows(project.id);
    const contracts = new Set(rows.map((row) => row.contract_id).filter(Boolean));
    const settlements = new Set(rows.map((row) => row.settlement_id || row.settlement_doc_no).filter(Boolean));
    const payments = new Set(rows.map((row) => row.payment_id || row.payment_doc_no).filter(Boolean));
    const coverage = workflowViews().VIEW_NC_FIELD_COVERAGE_MIN || [];
    const preview = rows.slice().sort((a, b) => Number(b.cost_amount || 0) - Number(a.cost_amount || 0)).slice(0, 5);
    return `
      <section class="section profile-nc-section">
        <div class="section-header">
          <div>
            <h2 class="section-title">NC追溯概况</h2>
            <span class="section-note">仅作链路完整性说明，不重算项目总成本。</span>
          </div>
          <button class="btn primary" data-action="profile-open-nc" data-project="${h(project.id)}" data-month="all">查看NC明细</button>
        </div>
        <div class="profile-nc-grid">
          ${renderMetric("NC明细", `${rows.length.toLocaleString("zh-CN")}笔`, "直接归集明细")}
          ${renderMetric("合同记录", `${contracts.size.toLocaleString("zh-CN")}个`, "按合同号去重")}
          ${renderMetric("结算记录", `${settlements.size.toLocaleString("zh-CN")}个`, "按结算单去重")}
          ${renderMetric("付款记录", `${payments.size.toLocaleString("zh-CN")}个`, "按付款单去重")}
        </div>
        <div class="profile-coverage-list">
          ${coverage.slice(0, 6).map((item) => `<span>${h(coverageLabel(item))} ${h(Number(item.coverage_rate || 0).toFixed(1))}%</span>`).join("")}
        </div>
        <p class="profile-nc-note">当前项目已关联NC明细，可继续追溯供应商、合同、结算和付款信息。字段覆盖情况用于数据完善参考，不作为经营判断。</p>
        <div class="table-wrap profile-nc-preview">
          <table class="data-table">
            <thead><tr><th>月份</th><th>科目</th><th class="num">金额</th><th>供应商</th><th>合同</th></tr></thead>
            <tbody>
              ${preview.map((row) => `
                <tr>
                  <td>${h(row.cost_month)}月</td>
                  <td>${h(row.subject_name || row.level3_name || "-")}</td>
                  <td class="num">${h(moneyText(row.cost_amount))}</td>
                  <td>${h(mask(row.supplier_name, role, "supplier"))}</td>
                  <td>${h(mask(row.contract_name || row.contract_code, role, "contract"))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="profile-nc-source">流程链路记录 ${workflowRows.length.toLocaleString("zh-CN")} 条，仅用于字段覆盖和链路解释。</div>
      </section>
    `;
  }

  function mask(value, role, type) {
    if (role && role.maskSensitive) {
      if (!value) return "";
      if (type === "supplier") return "脱敏供应商A";
      if (type === "contract") return "合同-****";
      if (type === "settlement") return "结算单-****";
      if (type === "payment") return "付款单-****";
      return "已脱敏";
    }
    return value || "-";
  }

  function coverageLabel(item = {}) {
    const labels = {
      contract: "合同信息覆盖率",
      supplier: "供应商信息覆盖率",
      activity: "活动信息覆盖率",
      subject: "科目信息覆盖率",
      contract_item: "合同清单覆盖率",
      settlement: "结算信息覆盖率",
      payment: "付款信息覆盖率",
      final_settlement: "完工结算信息覆盖率"
    };
    return labels[item.field] || item.field_label || item.label || item.coverage_name || "字段覆盖率";
  }

  function renderEmpty(text) {
    return `<div class="empty-state v12-empty-state"><span>${h(text)}</span><small>可切换项目或稍后查看。</small></div>`;
  }

  function renderNotice() {
    if (!state.profileNotice) return "";
    return `<div class="profile-notice">${h(state.profileNotice)}</div>`;
  }

  function renderProjectProfilePage() {
    const project = ensureProfileState();
    const role = currentRole();
    const summary = homeSummary(project.id);
    const title = project.shortName || project.fullName || "项目";
    return `
      <div class="profile-page">
        <div class="page-title-row profile-title-row">
          <div>
            ${typeof renderBreadcrumb === "function" ? renderBreadcrumb([
              { label: "首页总览", action: "nav", data: { view: "home" } },
              { label: "项目画像", action: "profile-open", data: { project: project.id } },
              { label: title, current: true },
            ]) : ""}
            <h1 class="page-title">${h(title)}项目画像</h1>
            <p class="page-subtitle">锁定单个项目做深度诊断，金额沿用统一成本口径，NC明细用于追溯和复核。</p>
          </div>
          <div class="page-actions">
            <button class="btn ghost" data-action="nav" data-view="home">返回首页</button>
            <button class="btn primary" data-action="profile-ai">生成本页解读</button>
          </div>
        </div>

        <div class="profile-toolbar">
          <div class="field">
            <label for="profileProjectSelect">项目选择</label>
            <select id="profileProjectSelect" data-action="profile-project">
              ${projectOptions(project.id)}
            </select>
          </div>
          ${renderTabs(project)}
        </div>
        ${renderNotice()}

        ${renderIdentity(project, summary, role)}
        ${renderMetrics(project, summary)}
        ${renderCostSummary(project, summary)}
        ${renderCharts(project, summary)}
        ${renderTopSubjects(project)}
        ${renderActivityCalendar(project)}
        ${renderActivityAxis(project, summary)}
        ${renderSubjectTable(project, summary)}
        ${renderNcSummary(project, role)}
      </div>
    `;
  }

  function renderProfileShell() {
    updateNav();
    const actionType = V116_RENDER_ACTION_TYPE || "navigation";
    const pageClass = actionType === "navigation" ? "page-transition page-transition-soft" : "page-transition is-stable";
    const template = document.createElement("template");
    template.innerHTML = `
      ${renderV116InteractionBar()}
      <div class="${pageClass}" data-render-action="${h(actionType)}">${renderProjectProfilePage()}</div>
      ${renderActivityDetailDrawer()}
      ${renderV116DetailDrawer()}
      ${renderSingleRecordDetailDrawer()}
      <button class="back-to-top-fab" type="button" data-action="back-to-top" aria-label="返回顶部" title="返回顶部">
        <span class="back-to-top-icon" aria-hidden="true"></span>
      </button>
    `.trim();
    app.replaceChildren(template.content);
    V116_RENDER_ACTION_TYPE = "navigation";
  }

  function patchRender() {
    if (renderPatched || typeof render !== "function") return;
    const originalRender = render;
    render = function () {
      if (state.view === LEGACY_PROJECT_HASH) {
        const route = parseProfileHash();
        routeToProfile((route && route.projectId) || state.profileProjectId || state.projectId || "sjz", { replaceHash: true });
        renderProfileShell();
        return;
      }
      if (state.view === PROFILE_VIEW) {
        renderProfileShell();
        return;
      }
      originalRender();
    };
    renderPatched = true;
  }

  function openProfile(projectId, options = {}) {
    state.view = PROFILE_VIEW;
    const requestedProjectId = projectId || state.profileProjectId || state.projectId || "sjz";
    state.profileProjectId = clampProjectId(requestedProjectId);
    state.projectId = state.profileProjectId;
    state.profileFromSubjectCompare = options.fromSubjectCompare
      ? {
        projectId: state.profileProjectId,
        subjectId: options.subjectId || "",
        subjectName: options.subjectName || "",
        month: options.month || "",
        source: "subjectCompare"
      }
      : null;
    if (options.fromSubjectCompare && options.subjectId) {
      const activityState = ensureActivityState(state.profileProjectId);
      activityState.selectedSubjectId = options.subjectId;
      activityState.subjectFocusOnly = Boolean(options.scrollToActivityAxis);
      activityState.monthFilter = options.month && options.month !== "all" ? String(options.month) : "";
      const topFocus = topActivityForSubject(state.profileProjectId, options.subjectId, activityState.monthFilter);
      if (topFocus) activityState.selectedActivityId = topFocus.activity_id;
    }
    state.profileNotice = requestedProjectId !== state.profileProjectId
      ? "当前账号仅可查看石家庄项目，已自动回到当前可查看项目。"
      : options.fromSubjectCompare
      ? `来自科目横向对比：当前科目${options.subjectName || "成本科目"}。${options.scrollToActivityAxis ? "已进入对应项目，可在下方查看项目活动轴。" : "可继续查看项目画像、活动轴和NC明细。"}`
      : "";
    if (typeof v116SetSelectedProject === "function") v116SetSelectedProject(state.profileProjectId);
    if (options.hash !== false) replaceProfileHash(state.profileProjectId, { replace: options.replaceHash === true });
    if (typeof v116SetRenderActionType === "function") v116SetRenderActionType("navigation");
    render();
    if (options.scrollToActivityAxis) {
      scrollProfileActivityAxis();
    } else if (typeof resetPageScrollToTop === "function") {
      resetPageScrollToTop();
    }
  }

  function scrollProfileActivityAxis() {
    if (typeof document === "undefined") return;
    global.setTimeout(() => {
      const target = document.getElementById("profileActivityAxis");
      if (target && typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }, 60);
  }

  function scrollProfileSubjectTable() {
    if (typeof document === "undefined") return;
    global.setTimeout(() => {
      const target = document.querySelector(".profile-subject-section");
      if (target && typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }, 60);
  }

  function scrollProfileActivityCalendar() {
    if (typeof document === "undefined") return;
    global.setTimeout(() => {
      const target = document.getElementById("profileActivityCalendar");
      if (target && typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }, 60);
  }

  function detailIdsFor(projectId, subjectId, month) {
    return rawDetailRows(projectId, { subjectId, month: month === "all" ? "" : month }).map((row) => row.cost_detail_id);
  }

  function openProfileNc(target) {
    const projectId = clampProjectId(target.dataset.project || state.profileProjectId || state.projectId);
    const subjectId = target.dataset.subject || "";
    const subjectKey = target.dataset.subjectKey || "";
    const month = target.dataset.month || "all";
    state.detail.projectId = projectId;
    state.detail.month = month;
    state.detail.subjectKey = subjectKey;
    state.detail.benchmarkItem = "";
    state.detail.activityId = "";
    state.detail.activityCostItem = "";
    state.detail.directActivityOnly = false;
    state.detail.query = "";
    state.detail.sort = "desc";
    state.detail.page = 1;
    state.detail.selectedId = "";
    state.detail.unitBenchmarkName = "";
    state.detail.unitBenchmarkUnit = "";
    state.detail.ncRecordIds = detailIdsFor(projectId, subjectId, month);
    state.detail.returnView = PROFILE_VIEW;
    state.profileProjectId = projectId;
    state.view = "details";
    if (typeof v116SetSelectedProject === "function") v116SetSelectedProject(projectId);
    render();
    if (typeof resetPageScrollToTop === "function") resetPageScrollToTop();
  }

  function openActivityNc(target) {
    const projectId = clampProjectId(target.dataset.project || state.profileProjectId || state.projectId);
    const activityId = target.dataset.activity || "";
    const requestedSubjectId = target.dataset.subject || "";
    const activity = activityRows(projectId).find((row) => row.activity_id === activityId) || selectedActivity(projectId);
    if (!activity || typeof v116OpenDetailDrawer !== "function") return;
    const activitySubjects = requestedSubjectId ? activitySubjectRows(projectId, activity.activity_id) : [];
    const requestedSubject = requestedSubjectId ? activitySubjects.find((row) => row.subjectId === requestedSubjectId) : null;
    const fallbackFromSubject = Boolean(requestedSubject && Number(requestedSubject.directNcCount || 0) === 0);
    const fallbackSubjectName = fallbackFromSubject ? requestedSubject.subjectName || "" : "";
    const subjectId = fallbackFromSubject ? "" : requestedSubjectId;
    const subjectKey = subjectId
      ? activityLedgerSubjectKey(projectId, activity.activity_id, requestedSubject ? requestedSubject.subjectName : "") || subjectKeyForSubjectId(projectId, subjectId)
      : "";
    const subjects = subjectId ? activitySubjects.filter((row) => row.subjectId === subjectId) : [];
    const amount = subjects.length ? sum(subjects, "amount") : Number(activity.total_activity_cost || 0);
    const directAmount = subjects.length ? sum(subjects, "directAmount") : Number(activity.direct_cost_amount || 0);
    const allocatedAmount = subjects.length ? sum(subjects, "allocatedAmount") : Number(activity.allocated_cost_amount || 0);
    if (state.profileActivity) state.profileActivity.drawerOpen = false;
    v116OpenDetailDrawer({
      title: `${activity.activity_name} · NC明细`,
      amount,
      projectId,
      month: target.dataset.month || activity.cost_month || "all",
      subjectKey,
      activityId: activity.activity_id,
      activityName: activity.activity_name,
      activityTotalCost: amount,
      activityDirectCost: directAmount,
      activityAllocatedCost: allocatedAmount,
      directActivityOnly: true,
      fallbackFromSubject,
      fallbackSubjectName,
      returnView: PROFILE_VIEW
    });
  }

  function bindEvents() {
    if (eventsBound || typeof document === "undefined") return;
    document.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      if (action === "profile-open") {
        event.preventDefault();
        openProfile(target.dataset.project);
      }
      if (action === "profile-tab-disabled" || action === "profile-planned") {
        event.preventDefault();
        state.profileNotice = target.dataset.message || "该能力已预留，将在后续版本开放。";
        if (state.view === PROFILE_VIEW) render();
      }
      if (action === "profile-open-nc") {
        event.preventDefault();
        openProfileNc(target);
      }
      if (action === "profile-structure-filter") {
        event.preventDefault();
        const projectId = clampProjectId(target.dataset.project || state.profileProjectId || state.projectId);
        const filterState = ensureSubjectFilterState(projectId);
        const next = target.dataset.main || "";
        filterState.main = filterState.main === next ? "" : next;
        render();
        scrollProfileSubjectTable();
      }
      if (action === "profile-structure-clear") {
        event.preventDefault();
        const projectId = clampProjectId(target.dataset.project || state.profileProjectId || state.projectId);
        ensureSubjectFilterState(projectId).main = "";
        render();
        scrollProfileSubjectTable();
      }
      if (action === "profile-calendar-month") {
        event.preventDefault();
        const projectId = clampProjectId(target.dataset.project || state.profileProjectId || state.projectId);
        ensureActivityCalendarState(projectId).month = String(target.dataset.month || "5");
        render();
        scrollProfileActivityCalendar();
      }
      if (action === "profile-calendar-activity-open") {
        event.preventDefault();
        const projectId = clampProjectId(target.dataset.project || state.profileProjectId || state.projectId);
        const activityState = ensureActivityState(projectId);
        activityState.selectedActivityId = target.dataset.activity || activityState.selectedActivityId;
        activityState.selectedSubjectId = "";
        activityState.monthFilter = target.dataset.month || "";
        activityState.drawerOpen = true;
        render();
      }
      if (action === "profile-activity-select") {
        event.preventDefault();
        const projectId = clampProjectId(target.dataset.project || state.profileProjectId || state.projectId);
        ensureActivityState(projectId);
        state.profileActivity.selectedActivityId = target.dataset.activity || "";
        state.profileActivity.selectedSubjectId = "";
        state.profileActivity.drawerOpen = false;
        render();
        scrollProfileActivityAxis();
      }
      if (action === "profile-activity-month") {
        event.preventDefault();
        const projectId = state.profileProjectId || state.projectId;
        const month = Number(target.dataset.month || 0);
        ensureActivityState(projectId);
        state.profileActivity.monthFilter = String(state.profileActivity.monthFilter) === String(month) ? "" : String(month);
        const focus = subjectFocusContext(projectId);
        const row = activityRows(projectId)
          .filter((item) => !state.profileActivity.monthFilter || Number(item.cost_month || 0) === Number(state.profileActivity.monthFilter))
          .filter((item) => !focus || !state.profileActivity.subjectFocusOnly || activityHasSubject(projectId, item.activity_id, focus.subjectId))
          .sort((a, b) => Number(b.total_activity_cost || 0) - Number(a.total_activity_cost || 0))[0];
        if (row) {
          state.profileActivity.selectedActivityId = row.activity_id;
          state.profileActivity.selectedSubjectId = "";
        }
        state.profileActivity.drawerOpen = false;
        render();
        scrollProfileActivityAxis();
      }
      if (action === "profile-activity-month-clear") {
        event.preventDefault();
        const projectId = state.profileProjectId || state.projectId;
        ensureActivityState(projectId);
        state.profileActivity.monthFilter = "";
        state.profileActivity.drawerOpen = false;
        render();
        scrollProfileActivityAxis();
      }
      if (action === "profile-activity-subject-toggle") {
        event.preventDefault();
        const projectId = state.profileProjectId || state.projectId;
        const activityState = ensureActivityState(projectId);
        activityState.subjectFocusOnly = !activityState.subjectFocusOnly;
        const focus = subjectFocusContext(projectId);
        const row = focus && activityState.subjectFocusOnly ? topActivityForSubject(projectId, focus.subjectId, activityState.monthFilter) : selectedActivity(projectId);
        if (row) activityState.selectedActivityId = row.activity_id;
        activityState.drawerOpen = false;
        render();
        scrollProfileActivityAxis();
      }
      if (action === "profile-activity-subject") {
        event.preventDefault();
        const projectId = clampProjectId(target.dataset.project || state.profileProjectId || state.projectId);
        ensureActivityState(projectId);
        state.profileActivity.selectedActivityId = target.dataset.activity || state.profileActivity.selectedActivityId;
        state.profileActivity.selectedSubjectId = target.dataset.subject || "";
        state.profileActivity.drawerOpen = false;
        render();
        scrollProfileActivityAxis();
      }
      if (action === "profile-activity-detail") {
        event.preventDefault();
        const projectId = clampProjectId(target.dataset.project || state.profileProjectId || state.projectId);
        ensureActivityState(projectId);
        if (target.dataset.activity) state.profileActivity.selectedActivityId = target.dataset.activity;
        state.profileActivity.drawerOpen = true;
        render();
      }
      if (action === "profile-activity-drawer-close") {
        event.preventDefault();
        if (state.profileActivity) state.profileActivity.drawerOpen = false;
        render();
        scrollProfileActivityAxis();
      }
      if (action === "profile-activity-nc") {
        event.preventDefault();
        openActivityNc(target);
      }
      if (action === "profile-ai") {
        event.preventDefault();
        if (global.V13Bridge && typeof global.V13Bridge.openAi === "function") {
          global.V13Bridge.openAi("overview");
        }
      }
    });

    document.addEventListener("change", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      if (target.dataset.action === "profile-project") {
        openProfile(target.value);
      }
    });

    global.addEventListener("hashchange", () => {
      const route = parseProfileHash();
      if (!route) return;
      routeToProfile(route.projectId || state.profileProjectId || state.projectId || "sjz", { replaceHash: route.legacy });
      render();
    });
    eventsBound = true;
  }

  function applyInitialHash() {
    const route = parseProfileHash();
    if (!route || typeof state === "undefined") return;
    routeToProfile(route.projectId || state.profileProjectId || state.projectId || "sjz", { replaceHash: route.legacy });
  }

  function waterfallSummary(projectId) {
    const steps = waterfallSteps(projectId);
    if (steps.length < 3) return "";
    const diffs = steps.slice(1, -1).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 2);
    return diffs.map((item) => `${item.label}${item.value >= 0 ? "增加" : "减少"}${moneyText(Math.abs(item.value))}`).join("，");
  }

  function extendAiContext(context) {
    if (typeof state === "undefined" || state.view !== PROFILE_VIEW) return context;
    const project = ensureProfileState();
    const summary = homeSummary(project.id);
    const top = topSubjects(project.id);
    const axis = activitySummary(project.id);
    const topActivity = axis.topActivity;
    const activitySubjects = topActivity ? activitySubjectRows(project.id, topActivity.activity_id).slice(0, 3) : [];
    return {
      ...context,
      pageName: "项目画像",
      visibleProjectNames: [project.shortName || project.fullName || project.id],
      metrics: {
        totalCostWan: moneyNumber(summary.totalCost),
        mayCostWan: moneyNumber(summary.mayCost),
        annualBudgetWan: moneyNumber((PROJECT_BUDGETS[project.id] || {}).annualBudgetWan * 10000 || 0),
        ncCount: summary.ncCount,
      },
      projectProfile: {
        projectId: project.id,
        projectName: project.fullName || project.shortName,
        permissionScope: permissionScope(context.role, project),
        totalCostWan: moneyNumber(summary.totalCost),
        mayCostWan: moneyNumber(summary.mayCost),
        budgetRate: percentText(summary.budgetRate),
        ncCount: summary.ncCount,
        waterfallSummary: waterfallSummary(project.id),
        topSubjects: top.map((item) => ({
          name: item.subjectName,
          currentMonthCostWan: moneyNumber(item.currentMonthAmount),
          currentMonthRatio: percentText(item.currentMonthAmount / Math.max(1, summary.mayCost)),
        })),
        activityAxis: {
          activityCount: axis.activityCount,
          specialCostWan: moneyNumber(axis.specialCost),
          baseCostWan: moneyNumber(axis.baseCost),
          ncCount: axis.ncCount,
          topActivityName: topActivity ? topActivity.activity_name : "",
          topActivityCostWan: topActivity ? moneyNumber(topActivity.total_activity_cost) : "0.0",
          topActivityMonth: topActivity ? `${topActivity.cost_month}月` : "",
          topActivitySubjects: activitySubjects.map((item) => ({
            name: item.subjectName,
            amountWan: moneyNumber(item.amount)
          }))
        },
      },
    };
  }

  applyInitialHash();
  patchRender();
  bindEvents();

  global.V132ProjectProfile = {
    openProfile,
    extendAiContext,
    getCurrentProjectId: () => state.profileProjectId || state.projectId,
    getSubjectRows: () => subjectRows(state.profileProjectId || state.projectId),
  };
})(typeof window !== "undefined" ? window : globalThis);
