(function (global) {
  "use strict";

  var MASK_TEXT = "已脱敏";
  var ROLE_LABELS = {
    leader: "总经理 / 分管领导",
    cost: "商法部 / 成本中心",
    project_sjz: "石家庄项目视角",
    project_lzhz: "柳州会展项目视角",
    demo: "脱敏演示视角"
  };
  var PROJECT_SCOPE_LABELS = {
    leader: "全部项目",
    cost: "全部项目",
    project_sjz: "仅石家庄项目",
    project_lzhz: "仅柳州会展项目",
    demo: "样例项目，敏感字段脱敏"
  };
  var sensitiveFields = [
    "supplier",
    "supplier_id",
    "supplier_name",
    "contractName",
    "contract_name",
    "contractNo",
    "contract_no",
    "contract_code",
    "contract_item_id",
    "contract_item_code",
    "contract_item_name",
    "settlement_id",
    "settlementNo",
    "settlement_no",
    "settlement_doc_no",
    "payment_id",
    "paymentNo",
    "payment_no",
    "payment_doc_no",
    "source_document_no",
    "source_doc_no",
    "voucher_no",
    "voucherNo",
    "nc_voucher_no",
    "operator",
    "handler",
    "handled_by"
  ];

  function maskedFieldValue(field) {
    var name = String(field || "").toLowerCase();
    if (name.indexOf("supplier") >= 0) return "脱敏供应商A";
    if (name.indexOf("contract") >= 0) return "合同-****";
    if (name.indexOf("settlement") >= 0) return "结算单-****";
    if (name.indexOf("payment") >= 0) return "付款单-****";
    if (name.indexOf("voucher") >= 0 || name.indexOf("source") >= 0) return "凭证-****";
    return MASK_TEXT;
  }

  var bridgeState = {
    baseline: null,
    appliedRoleKey: "",
    renderPatched: false,
    rendering: false,
    styleReady: false,
    loginAnimating: false,
    loginRenderReady: false,
    loginTransitionCoverMs: 180,
    loginCoverPrepaintFrames: 2,
    loginCoverPostRenderHoldMs: 32,
    aiOpen: false,
    aiType: "overview",
    aiText: "",
    aiOutput: null,
    plannedToastTimer: 0
  };

  function resetLoginTimingProbe(username) {
    global.__V1313_LOGIN_TIMING = {
      username: username || "",
      loginClickAt: performance.now(),
      particleFinishedAt: 0,
      renderStartedAt: 0,
      renderFinishedAt: 0,
      coverPreparedAt: 0,
      renderPrepaintAt: 0,
      coverHoldStartedAt: 0,
      coverFadeStartedAt: 0,
      coverRemovedAt: 0,
      renderStartedWhileParticleRafActive: false,
      coverFadeMs: bridgeState.loginTransitionCoverMs
    };
  }

  function loginTimingProbe() {
    if (!global.__V1313_LOGIN_TIMING) resetLoginTimingProbe("");
    return global.__V1313_LOGIN_TIMING;
  }

  function h(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function role() {
    return global.V13Auth && typeof global.V13Auth.getCurrentRole === "function"
      ? global.V13Auth.getCurrentRole()
      : null;
  }

  function isAllScope(currentRole) {
    return currentRole && currentRole.visibleProjectIds === "all";
  }

  function allowedProjectIds(currentRole) {
    if (!currentRole) return [];
    if (isAllScope(currentRole)) {
      return typeof PROJECTS !== "undefined" ? PROJECTS.map(function (project) { return project.id; }) : [];
    }
    return (currentRole.visibleProjectIds || []).slice();
  }

  function cloneItem(item) {
    if (!item || typeof item !== "object") return item;
    var copy = Object.assign({}, item);
    if (Array.isArray(copy.projectIds)) copy.projectIds = copy.projectIds.slice();
    if (Array.isArray(copy.ncRecordIds)) copy.ncRecordIds = copy.ncRecordIds.slice();
    if (Array.isArray(copy.supplierIds)) copy.supplierIds = copy.supplierIds.slice();
    if (Array.isArray(copy.pathKeys)) copy.pathKeys = copy.pathKeys.slice();
    return copy;
  }

  function cloneArray(list) {
    return Array.isArray(list) ? list.map(cloneItem) : [];
  }

  function replaceArrayContents(target, rows) {
    if (!Array.isArray(target)) return;
    target.splice.apply(target, [0, target.length].concat(cloneArray(rows)));
  }

  function canUseV12Globals() {
    return typeof PROJECTS !== "undefined"
      && typeof RECORDS !== "undefined"
      && typeof DETAIL_RECORDS !== "undefined"
      && typeof ACTIVITIES !== "undefined"
      && typeof ACTIVITY_RECORDS !== "undefined"
      && typeof state !== "undefined";
  }

  function captureBaseline() {
    if (bridgeState.baseline || !canUseV12Globals()) return;
    bridgeState.baseline = {
      projects: cloneArray(PROJECTS),
      mapPoints: typeof MAP_POINTS !== "undefined" ? cloneArray(MAP_POINTS) : [],
      records: cloneArray(RECORDS),
      detailRecords: cloneArray(DETAIL_RECORDS),
      activities: cloneArray(ACTIVITIES),
      activityRecords: cloneArray(ACTIVITY_RECORDS),
      activityCostSubjects: typeof ACTIVITY_COST_SUBJECTS !== "undefined" ? cloneArray(ACTIVITY_COST_SUBJECTS) : [],
      unitCostItems: typeof UNIT_COST_ITEMS !== "undefined" ? cloneArray(UNIT_COST_ITEMS) : []
    };
  }

  function isAllowedProject(projectId, currentRole) {
    if (!currentRole) return true;
    if (isAllScope(currentRole)) return true;
    return (currentRole.visibleProjectIds || []).indexOf(projectId) >= 0;
  }

  function filterByAllowedProject(rows, currentRole) {
    if (!Array.isArray(rows)) return [];
    if (!currentRole || isAllScope(currentRole)) return rows;
    return rows.filter(function (row) { return isAllowedProject(row.projectId || row.project_id || row.id, currentRole); });
  }

  function filterMapPoints(rows, currentRole) {
    if (!Array.isArray(rows)) return [];
    if (!currentRole || isAllScope(currentRole)) return rows;
    return rows.map(function (point) {
      var copy = cloneItem(point);
      if (copy.projectId) return isAllowedProject(copy.projectId, currentRole) ? copy : null;
      if (Array.isArray(copy.projectIds)) {
        copy.projectIds = copy.projectIds.filter(function (projectId) { return isAllowedProject(projectId, currentRole); });
        return copy.projectIds.length ? copy : null;
      }
      return copy;
    }).filter(Boolean);
  }

  function maskRecord(row, currentRole) {
    var copy = cloneItem(row);
    if (!currentRole || !currentRole.maskSensitive) return copy;
    sensitiveFields.forEach(function (field) {
      if (field in copy && copy[field]) copy[field] = maskedFieldValue(field);
    });
    if (copy.summary) copy.summary = "敏感单据信息已脱敏，仅保留成本口径说明。";
    return copy;
  }

  function prepareRows(rows, currentRole) {
    return filterByAllowedProject(rows, currentRole).map(function (row) { return maskRecord(row, currentRole); });
  }

  function clampStateToRole(currentRole) {
    if (!currentRole || isAllScope(currentRole) || typeof state === "undefined") return;
    var allowed = allowedProjectIds(currentRole);
    var fallback = allowed[0] || "";
    if (!fallback) return;
    if (!isAllowedProject(state.projectId, currentRole)) state.projectId = fallback;
    if (!isAllowedProject(state.detail.projectId, currentRole)) state.detail.projectId = fallback;
    if (state.detail.projectId === "all") state.detail.projectId = fallback;
    if (!isAllowedProject(state.benchmark.selectedProjectId, currentRole)) state.benchmark.selectedProjectId = fallback;
    if (!isAllowedProject(state.activity.projectId, currentRole)) state.activity.projectId = fallback;
    if (state.activity.projectId === "all") state.activity.projectId = fallback;
    if (state.monthProjectFilter && !isAllowedProject(state.monthProjectFilter, currentRole)) state.monthProjectFilter = "";
    if (typeof V116_INTERACTION_STATE !== "undefined") V116_INTERACTION_STATE.selectedProjectId = fallback;
  }

  function applyRoleMutation() {
    if (!canUseV12Globals()) return;
    var currentRole = role();
    var nextRoleKey = currentRole ? currentRole.roleKey : "";
    var needsRestrictedMutation = Boolean(currentRole && !isAllScope(currentRole));
    var needsFullRestore = !needsRestrictedMutation && bridgeState.appliedRoleKey && bridgeState.appliedRoleKey !== "all";
    if (!needsRestrictedMutation && !needsFullRestore) {
      if (currentRole) clampStateToRole(currentRole);
      bridgeState.appliedRoleKey = currentRole ? "all" : "";
      return;
    }
    captureBaseline();
    if (!bridgeState.baseline) return;
    replaceArrayContents(PROJECTS, needsRestrictedMutation ? filterByAllowedProject(bridgeState.baseline.projects, currentRole) : bridgeState.baseline.projects);
    if (typeof MAP_POINTS !== "undefined") replaceArrayContents(MAP_POINTS, needsRestrictedMutation ? filterMapPoints(bridgeState.baseline.mapPoints, currentRole) : bridgeState.baseline.mapPoints);
    replaceArrayContents(RECORDS, needsRestrictedMutation ? prepareRows(bridgeState.baseline.records, currentRole) : bridgeState.baseline.records);
    replaceArrayContents(DETAIL_RECORDS, needsRestrictedMutation ? prepareRows(bridgeState.baseline.detailRecords, currentRole) : bridgeState.baseline.detailRecords);
    replaceArrayContents(ACTIVITIES, needsRestrictedMutation ? prepareRows(bridgeState.baseline.activities, currentRole) : bridgeState.baseline.activities);
    replaceArrayContents(ACTIVITY_RECORDS, needsRestrictedMutation ? prepareRows(bridgeState.baseline.activityRecords, currentRole) : bridgeState.baseline.activityRecords);
    if (typeof ACTIVITY_COST_SUBJECTS !== "undefined") replaceArrayContents(ACTIVITY_COST_SUBJECTS, needsRestrictedMutation ? prepareRows(bridgeState.baseline.activityCostSubjects, currentRole) : bridgeState.baseline.activityCostSubjects);
    if (typeof UNIT_COST_ITEMS !== "undefined") replaceArrayContents(UNIT_COST_ITEMS, needsRestrictedMutation ? prepareRows(bridgeState.baseline.unitCostItems, currentRole) : bridgeState.baseline.unitCostItems);
    clampStateToRole(currentRole);
    bridgeState.appliedRoleKey = needsRestrictedMutation ? nextRoleKey : (currentRole ? "all" : "");
  }

  function injectStyle() {
    if (bridgeState.styleReady || !document.head) return;
    var style = document.createElement("style");
    style.id = "v13-bridge-style";
    style.textContent = [
      ".v13-auth-screen{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:linear-gradient(135deg,rgba(8,35,68,.96),rgba(16,58,102,.94));padding:32px;color:#102033}",
      ".v13-login-card{width:min(520px,92vw);background:#fff;border:1px solid rgba(18,59,109,.14);border-radius:8px;box-shadow:0 24px 70px rgba(0,0,0,.24);padding:28px}",
      ".v13-login-card h1{margin:0 0 8px;font-size:24px;color:#123b6d;letter-spacing:0}",
      ".v13-login-card p{margin:0 0 18px;color:#5d6b7a;line-height:1.7}",
      ".v13-login-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:16px}",
      ".v13-account-option{border:1px solid #d7e0ea;background:#f7f9fc;border-radius:6px;padding:9px 6px;color:#123b6d;font-weight:700;cursor:pointer}",
      ".v13-account-option.is-active{background:#123b6d;color:#fff;border-color:#123b6d}",
      ".v13-login-form{display:grid;gap:12px}",
      ".v13-login-form label{display:grid;gap:6px;font-size:13px;color:#516070}",
      ".v13-login-form input{border:1px solid #ccd7e3;border-radius:6px;padding:10px 12px;font:inherit}",
      ".v13-login-error{min-height:20px;color:#b42318;font-size:13px}",
      ".v13-role-panel{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;margin-left:auto}",
      ".v13-role-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid #dbe6f2;border-radius:6px;background:#fff;color:#5b6878;font-size:12px;font-weight:700}",
      ".v13-ai-drawer{position:fixed;right:0;top:0;bottom:0;width:min(560px,94vw);z-index:9000;background:#fff;border-left:1px solid #d9e2ec;box-shadow:-18px 0 48px rgba(16,42,67,.18);padding:24px;display:flex;flex-direction:column;gap:16px}",
      ".v13-ai-backdrop{position:fixed;inset:0;z-index:8999;background:rgba(4,21,40,.34)}",
      ".v13-ai-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:1px solid #e6edf5;padding-bottom:12px}",
      ".v13-ai-head h2{margin:0;color:#123b6d;font-size:22px;letter-spacing:0}",
      ".v1395-ai-scope{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:12px;border:1px solid #dbe6f2;border-radius:8px;background:#f8fbff;color:#526173;font-size:13px;line-height:1.55}",
      ".v1395-ai-scope span{display:block;min-width:0}.v1395-ai-scope strong{color:#123b6d;font-weight:850}",
      ".v13-ai-tabs{display:flex;gap:10px;flex-wrap:wrap}",
      ".v13-ai-tabs .btn{min-height:44px;padding:0 16px;font-size:13px}",
      ".v13-ai-output{display:grid;gap:12px;overflow:auto;min-height:330px;padding-right:4px;color:#263747;font-size:14px}",
      ".v13-ai-card{border:1px solid #d7e2ed;border-radius:8px;background:#f8fbff;padding:14px 15px;line-height:1.7}",
      ".v13-ai-card h3{margin:0 0 8px;color:#123b6d;font-size:15px;letter-spacing:0}",
      ".v13-ai-card ul{margin:0;padding-left:19px;display:grid;gap:6px}",
      ".v13-ai-card li{margin:0;color:#2f4053}",
      ".v13-ai-card.is-scope{background:#ffffff}.v13-ai-card.is-boundary{background:#fffaf2;border-color:#ead7b8}",
      ".v13-ai-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.v13-ai-card-grid span{display:block;color:#526173}.v13-ai-card-grid strong{display:block;color:#123b6d;font-weight:850}",
      ".v13-nc-section{margin:16px 0 20px;padding:18px;border:1px solid #dbe6f2;border-radius:8px;background:#f8fbff}",
      ".v13-nc-section h2{margin:0 0 8px;color:#123b6d;font-size:18px}",
      ".v13-nc-note{color:#5b6878;font-size:13px;line-height:1.7;margin:0 0 12px}",
      ".v13-nc-flow{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}",
      ".v13-nc-flow span,.v13-coverage span{display:inline-flex;align-items:center;padding:5px 8px;border-radius:6px;border:1px solid #d6e2f0;background:#fff;color:#123b6d;font-size:12px}",
      ".v13-coverage{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px}",
      ".v13-nc-table{width:100%;border-collapse:collapse;font-size:12px;background:#fff;border:1px solid #e0e8f0}",
      ".v13-nc-table th,.v13-nc-table td{padding:8px 9px;border-bottom:1px solid #e7eef6;text-align:left;vertical-align:top}",
      ".v13-nc-table th{background:#eef4fb;color:#123b6d;font-weight:700}",
      ".v13-sensitive{display:inline-flex;padding:2px 6px;border-radius:5px;background:#eef2f7;color:#435469;font-weight:700}",
      ".v13-scope-note{margin:0 0 12px;padding:10px 12px;border:1px solid #dbe6f2;background:#f8fbff;border-radius:8px;color:#435469;font-size:13px}",
      ".v1322-planned-toast{position:fixed;left:50%;top:88px;z-index:10020;transform:translateX(-50%);max-width:min(640px,calc(100vw - 32px));padding:12px 16px;border:1px solid #d8e4ef;border-radius:8px;background:#fff;color:#123b6d;box-shadow:0 18px 42px rgba(16,42,67,.18);font-size:13px;line-height:1.6}",
      ".v13-project-focus-item{grid-template-columns:40px minmax(178px,1fr) minmax(168px,.64fr) minmax(142px,.52fr) minmax(104px,.38fr)!important}",
      ".v13-focus-actions{grid-column:5;display:grid;gap:6px;justify-items:end;align-self:center}",
      ".v13-focus-actions .detail-link{grid-column:auto!important;justify-self:end!important;white-space:nowrap}",
      "body.v13-demo .doc-text{filter:none}"
    ].join("\n");
    document.head.appendChild(style);
    bridgeState.styleReady = true;
  }

  function accountButtons(active) {
    var labels = {
      leader: "公司视角",
      cost: "成本中心",
      project_sjz: "石家庄",
      project_lzhz: "柳州会展",
      demo: "演示"
    };
    return ["leader", "cost", "project_sjz", "project_lzhz", "demo"].map(function (key) {
      return "<button type=\"button\" class=\"v13-account-option" + (key === active ? " is-active" : "") + "\" data-v13-account=\"" + key + "\">" + h(labels[key] || key) + "</button>";
    }).join("");
  }

  function rememberedLoginName() {
    return global.V1313LoginParticle && typeof global.V1313LoginParticle.rememberedAccount === "function"
      ? global.V1313LoginParticle.rememberedAccount()
      : "";
  }

  function scheduleBaselineWarmup() {
    if (bridgeState.baseline || !canUseV12Globals()) return;
    var run = function () {
      if (!bridgeState.baseline && !role()) captureBaseline();
    };
    if (global.requestIdleCallback) {
      global.requestIdleCallback(run, { timeout: 900 });
    } else {
      global.setTimeout(run, 300);
    }
  }

  function renderAuthLayer() {
    injectStyle();
    var layer = document.getElementById("v13-auth-layer");
    if (!layer) return;
    var currentRole = role();
    document.body.classList.toggle("v13-demo", Boolean(currentRole && currentRole.maskSensitive));
    if (currentRole) {
      if (bridgeState.loginAnimating && layer.querySelector(".v13-auth-screen")) {
        return;
      }
      document.body.classList.remove("v1313-login-active", "v1313-login-exiting");
      layer.innerHTML = "";
      return;
    }
    var remembered = rememberedLoginName();
    var username = remembered || "leader";
    document.body.classList.add("v1313-login-active");
    layer.innerHTML = [
      "<div class=\"v13-auth-screen v1313-auth-screen\" role=\"dialog\" aria-label=\"V13.2.2登录\">",
      "  <div class=\"v1313-login-gridline\" aria-hidden=\"true\"></div>",
      "  <div class=\"v1313-login-scanline\" aria-hidden=\"true\"></div>",
      "  <section class=\"v13-login-card v1313-login-card\">",
      "    <h1>智慧运营成本管理看板</h1>",
      "    <form class=\"v13-login-form v1313-login-form\" data-v13-login-form>",
      "      <label>账号<input name=\"username\" type=\"text\" autocomplete=\"username\" value=\"" + h(username) + "\" /></label>",
      "      <label>密码<input name=\"password\" type=\"password\" autocomplete=\"current-password\" value=\"123456\" /></label>",
      "      <div class=\"v1313-login-options\">",
      "        <label class=\"v1313-remember\"><input name=\"rememberAccount\" type=\"checkbox\"" + (remembered ? " checked" : "") + " />记住账号</label>",
      "        <span class=\"v1313-static-link\">忘记密码请联系管理员</span>",
      "      </div>",
      "      <button class=\"btn primary\" type=\"submit\">登录</button>",
      "      <div class=\"v13-login-error\" data-v13-login-error></div>",
      "    </form>",
      "    <div class=\"v1313-account-row\" aria-label=\"演示账号\">" + accountButtons(username) + "</div>",
      "    <p class=\"v1313-confidential\">内部资料 / 注意保密</p>",
      "  </section>",
      "</div>"
    ].join("");
    if (global.V1313LoginParticle && typeof global.V1313LoginParticle.mount === "function") {
      global.V1313LoginParticle.mount(layer);
    }
    scheduleBaselineWarmup();
  }

  function renderRolePanel() {
    var header = document.querySelector(".app-header");
    if (!header) return;
    var panel = header.querySelector(".v13-role-panel");
    var currentRole = role();
    if (panel) panel.remove();
    document.querySelectorAll("[data-v13-logout]").forEach(function (button) {
      button.hidden = !currentRole;
    });
    if (!currentRole) return;
    panel = document.createElement("div");
    panel.className = "v13-role-panel";
    panel.innerHTML = [
      "<span class=\"v13-role-pill\">角色：" + h(ROLE_LABELS[currentRole.roleKey] || currentRole.shortRoleName || "当前角色") + "</span>",
      "<span class=\"v13-role-pill\">可查看范围：" + h(PROJECT_SCOPE_LABELS[currentRole.roleKey] || currentRole.dataScopeLabel || "当前可查看项目") + "</span>"
    ].join("");
    header.appendChild(panel);
  }

  function showPlannedToast(message) {
    var text = message || "该入口为后续版本规划能力，当前版本请先使用项目画像和NC明细追溯。";
    var node = document.querySelector(".v1322-planned-toast");
    if (!node) {
      node = document.createElement("div");
      node.className = "v1322-planned-toast";
      document.body.appendChild(node);
    }
    node.textContent = text;
    global.clearTimeout(bridgeState.plannedToastTimer);
    bridgeState.plannedToastTimer = global.setTimeout(function () {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }, 3200);
  }

  function visibleProjectNames() {
    if (typeof PROJECTS === "undefined") return [];
    return PROJECTS.map(function (project) { return project.shortName || project.fullName || project.id; });
  }

  function visibleNcRows() {
    var currentRole = role();
    var layer = global.OPERATION_COST_NC_WORKFLOW;
    var rows = layer && layer.views && Array.isArray(layer.views.VIEW_NC_WORKFLOW_TRACE_MIN)
      ? layer.views.VIEW_NC_WORKFLOW_TRACE_MIN
      : [];
    return rows.filter(function (row) { return isAllowedProject(row.project_id, currentRole); }).map(function (row) {
      return maskRecord(row, currentRole);
    });
  }

  function moneyWanFromYuan(value) {
    return (Number(value || 0) / 10000).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatMoney(value) {
    return typeof moneyWan === "function" ? moneyWan(value || 0) : moneyWanFromYuan(value || 0) + "万元";
  }

  function formatPercent(value) {
    return typeof percent === "function" ? percent(value) : (value == null ? "-" : (Number(value) * 100).toFixed(1) + "%");
  }

  function scopeSubject(currentRole) {
    if (!currentRole || isAllScope(currentRole)) return "当前公司";
    return currentRole.roleKey === "demo" ? "当前可查看项目" : "当前项目";
  }

  function focusTitle(currentRole) {
    if (!currentRole || isAllScope(currentRole)) return "领导关注清单 TOP5";
    return currentRole.roleKey === "demo" ? "样例项目关注事项" : "当前项目关注事项";
  }

  function visibleProjectForRole(currentRole) {
    if (!currentRole || isAllScope(currentRole)) return null;
    var ids = allowedProjectIds(currentRole);
    var rows = typeof PROJECTS !== "undefined" ? PROJECTS : [];
    return rows.find(function (project) { return ids.indexOf(project.id) >= 0; }) || rows[0] || null;
  }

  function scopeSummary() {
    if (typeof getOverallSummary === "function") return getOverallSummary();
    var rows = typeof RECORDS !== "undefined" ? RECORDS : [];
    return rows.reduce(function (summary, row) {
      var amount = Number(row.amount || 0);
      summary.total += amount;
      if (Number(row.month) === 5) summary.may += amount;
      summary.count += 1;
      summary.byMain[row.main] = (summary.byMain[row.main] || 0) + amount;
      return summary;
    }, { total: 0, may: 0, count: 0, byMain: { "固定成本": 0, "变动成本": 0, "管理费用": 0 } });
  }

  function projectBudgetInfo(currentRole) {
    var project = visibleProjectForRole(currentRole);
    if (!project || typeof getProjectBudgetExecution !== "function") {
      return { project: project, stable: false, execution: null };
    }
    var execution = getProjectBudgetExecution(project.id, 5);
    return {
      project: project,
      execution: execution,
      stable: Boolean(execution && Number(execution.annualBudget || 0) > 0 && Number(execution.sequenceBudget || 0) > 0)
    };
  }

  function projectBudgetName(project) {
    if (!project) return "项目预算口径";
    if (typeof PROJECT_BUDGETS !== "undefined" && PROJECT_BUDGETS[project.id] && PROJECT_BUDGETS[project.id].budgetName) {
      return PROJECT_BUDGETS[project.id].budgetName;
    }
    return "项目预算口径";
  }

  function patchKpiCard(card, label, value, foot, title) {
    if (!card) return;
    var labelNode = card.querySelector(".kpi-label");
    var valueNode = card.querySelector(".kpi-value");
    var footNode = card.querySelector(".kpi-foot");
    if (labelNode) labelNode.textContent = label;
    if (valueNode) valueNode.textContent = value;
    if (footNode) footNode.textContent = foot;
    card.setAttribute("title", title || foot || label);
    card.setAttribute("data-title", title || label);
  }

  function patchProjectHomeLead(currentRole, summary, budgetInfo) {
    var lead = document.querySelector("#app .home-executive-lead");
    if (!lead) return;
    var subject = scopeSubject(currentRole);
    if (budgetInfo.stable) {
      lead.textContent = subject + "1-5月累计成本 " + formatMoney(summary.total) + "，5月成本 " + formatMoney(summary.may)
        + "；项目预算完成率 " + formatPercent(budgetInfo.execution.annualBudgetRatio)
        + "，项目序时执行率 " + formatPercent(budgetInfo.execution.sequenceBudgetRatio) + "。";
    } else {
      lead.textContent = subject + "1-5月累计成本 " + formatMoney(summary.total) + "，5月成本 " + formatMoney(summary.may)
        + "；预算信息按项目预算口径展示，不显示全公司预算。";
    }
  }

  function projectBudgetStatusText(ratio) {
    if (typeof budgetStatusText === "function") return budgetStatusText(ratio);
    if (!(ratio >= 0)) return "项目预算口径";
    if (ratio > 1.05) return "偏高";
    if (ratio < 0.85) return "偏低";
    return "正常";
  }

  function patchProjectHomeNotes(currentRole, budgetInfo) {
    var subject = scopeSubject(currentRole);
    var notes = document.querySelectorAll("#app .home-executive-note-list span");
    if (notes[0]) {
      notes[0].textContent = budgetInfo.stable
        ? "截至2026年5月，" + subject + "累计成本完成项目年度预算" + formatPercent(budgetInfo.execution.annualBudgetRatio)
          + "，项目序时执行率" + formatPercent(budgetInfo.execution.sequenceBudgetRatio)
          + "，整体处于" + projectBudgetStatusText(budgetInfo.execution.sequenceBudgetRatio) + "区间。"
        : "截至2026年5月，" + subject + "预算字段待确认，首页不显示全公司预算，按项目预算口径保留说明。";
    }
    Array.prototype.slice.call(notes, 1).forEach(function (node) {
      node.textContent = node.textContent
        .replace(/当前公司/g, subject)
        .replace(/公司累计成本/g, subject + "累计成本")
        .replace(/公司/g, subject);
    });
  }

  function patchProjectHomeBrief(currentRole, summary, budgetInfo) {
    var rows = document.querySelectorAll("#app .home-executive-brief .home-brief-row");
    var project = budgetInfo.project;
    var projectName = project ? (project.shortName || project.fullName || project.id) : (PROJECT_SCOPE_LABELS[currentRole.roleKey] || "授权项目");
    if (rows[0]) {
      rows[0].querySelector("span").textContent = focusTitle(currentRole);
      rows[0].querySelector("strong").textContent = projectName + " · 项目主卡";
    }
    if (rows[1]) {
      rows[1].querySelector("span").textContent = scopeSubject(currentRole);
      rows[1].querySelector("strong").textContent = projectName + " " + formatMoney(summary.total);
    }
    if (rows[2]) {
      rows[2].querySelector("span").textContent = "授权范围";
      rows[2].querySelector("strong").textContent = PROJECT_SCOPE_LABELS[currentRole.roleKey] || projectName;
    }
  }

  function patchProjectBudgetKpi(summary, budgetInfo) {
    var cards = document.querySelectorAll("#app .home-executive-kpis .kpi-card");
    var card = Array.prototype.find.call(cards, function (item) {
      var label = item.querySelector(".kpi-label");
      return label && label.textContent.indexOf("预算") >= 0;
    }) || cards[cards.length - 1];
    if (!card) return;
    if (budgetInfo.stable) {
      patchKpiCard(
        card,
        "项目序时执行率",
        formatPercent(budgetInfo.execution.sequenceBudgetRatio),
        "项目年度预算" + formatMoney(budgetInfo.execution.annualBudget) + " · 完成率" + formatPercent(budgetInfo.execution.annualBudgetRatio),
        "项目预算口径，不使用全公司预算"
      );
    } else {
      patchKpiCard(card, "项目预算口径", "项目口径", "项目预算字段待确认，不显示全公司预算", "项目预算字段待确认");
    }
    card.setAttribute("data-amount", String(summary.total || 0));
  }

  function patchProjectFocusPanel(currentRole, summary, budgetInfo) {
    var panel = document.querySelector("#app .home-leader-focus-panel");
    if (!panel) return;
    var title = panel.querySelector(".section-title");
    if (title) title.textContent = focusTitle(currentRole);
    var pill = panel.querySelector(".budget-status-pill");
    if (pill) {
      pill.textContent = budgetInfo.stable ? "项目预算口径" : "预算口径待确认";
      pill.className = "budget-status-pill is-normal";
    }
    var list = panel.querySelector(".home-focus-list");
    if (!list) return;
    var project = budgetInfo.project;
    var projectId = project ? project.id : "";
    var projectName = project ? (project.shortName || project.fullName || project.id) : (PROJECT_SCOPE_LABELS[currentRole.roleKey] || "授权项目");
    var budgetValue = budgetInfo.stable ? formatPercent(budgetInfo.execution.sequenceBudgetRatio) : "项目预算口径";
    var budgetFoot = budgetInfo.stable
      ? "年度预算 " + formatMoney(budgetInfo.execution.annualBudget)
      : "项目预算字段待确认";
    var budgetClass = budgetInfo.stable && Number(budgetInfo.execution.sequenceBudgetRatio || 0) > 1 ? "is-positive" : "is-negative";
    list.innerHTML = [
      "<article class=\"home-focus-item v13-project-focus-item\">",
      "  <div class=\"home-focus-rank\">01</div>",
      "  <div class=\"home-focus-main\">",
      "    <div class=\"home-focus-title\"><strong>" + h(projectName) + "</strong><span>" + h(projectBudgetName(project)) + "</span></div>",
      "    <div class=\"home-focus-tags\"><span>" + h(scopeSubject(currentRole)) + "口径</span></div>",
      "  </div>",
      "  <div class=\"home-focus-cost\"><em>累计成本</em><strong>" + h(formatMoney(summary.total)) + "</strong><div class=\"home-focus-structure\"><small>5月成本 " + h(formatMoney(summary.may)) + "</small></div></div>",
      "  <div class=\"home-focus-budget " + budgetClass + "\"><em>项目预算</em><strong>" + h(budgetValue) + "</strong><small>" + h(budgetFoot) + "</small></div>",
      "  <div class=\"v13-focus-actions\">",
      "    <button class=\"plain-link detail-link\" data-action=\"profile-open\" data-project=\"" + h(projectId) + "\">查看项目画像 ›</button>",
      "    <button class=\"plain-link detail-link\" data-action=\"nav\" data-view=\"details\">NC明细 ›</button>",
      "  </div>",
      "</article>"
    ].join("");
  }

  function patchProjectSupportSections(currentRole) {
    var regionTitle = document.querySelector("#app .home-region-support .home-region-stat span");
    if (regionTitle && regionTitle.textContent.indexOf("TOP5") >= 0) regionTitle.textContent = "当前项目占比";
    var signalSection = document.querySelector("#app .home-signal-strip-section");
    if (!signalSection) return;
    var title = signalSection.querySelector(".section-title");
    var note = signalSection.querySelector(".section-note");
    if (title) title.textContent = currentRole.roleKey === "demo" ? "样例项目经营信号" : "当前项目经营信号";
    if (note) note.textContent = "单项目角色不生成跨项目TOP排序，避免同一项目在关注项中重复出现。";
    signalSection.querySelectorAll(".home-signal-card").forEach(function (card) {
      var count = card.querySelector("strong");
      var summary = card.querySelector("em");
      if (count && count.textContent !== "0项") count.textContent = "1项";
      if (summary && summary.textContent.indexOf("本期平稳") < 0) summary.textContent = "按当前可查看项目保留复核提示，不展开跨项目TOP记录。";
    });
  }

  function patchProjectScopeHome() {
    var currentRole = role();
    if (!currentRole || isAllScope(currentRole) || typeof state === "undefined" || state.view !== "home") return;
    var summary = scopeSummary();
    var budgetInfo = projectBudgetInfo(currentRole);
    patchProjectHomeLead(currentRole, summary, budgetInfo);
    patchProjectHomeNotes(currentRole, budgetInfo);
    patchProjectHomeBrief(currentRole, summary, budgetInfo);
    patchProjectBudgetKpi(summary, budgetInfo);
    patchProjectFocusPanel(currentRole, summary, budgetInfo);
    patchProjectSupportSections(currentRole);
  }

  function currentMetrics() {
    var mayCost = 0;
    var totalCost = 0;
    var budget = 0;
    if (typeof RECORDS !== "undefined") {
      totalCost = RECORDS.reduce(function (sum, row) { return sum + Number(row.amount || 0); }, 0);
      mayCost = RECORDS.filter(function (row) { return Number(row.month) === 5; }).reduce(function (sum, row) { return sum + Number(row.amount || 0); }, 0);
    }
    var currentRole = role();
    if (currentRole && isAllScope(currentRole) && typeof COMPANY_BUDGET !== "undefined") {
      budget = Number(COMPANY_BUDGET.annualBudgetWan || 0);
    } else if (typeof PROJECTS !== "undefined" && typeof PROJECT_BUDGETS !== "undefined") {
      budget = PROJECTS.reduce(function (sum, project) {
        var item = PROJECT_BUDGETS[project.id] || {};
        return sum + Number(item.annualBudgetWan || 0);
      }, 0);
    }
    return {
      totalCostWan: moneyWanFromYuan(totalCost),
      mayCostWan: moneyWanFromYuan(mayCost),
      annualBudgetWan: budget.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ncCount: visibleNcRows().length
    };
  }

  function allProjectNames() {
    var source = bridgeState.baseline && Array.isArray(bridgeState.baseline.projects) && bridgeState.baseline.projects.length
      ? bridgeState.baseline.projects
      : (typeof PROJECTS !== "undefined" ? PROJECTS : []);
    return source.map(function (project) { return project.shortName || project.fullName || project.id; }).filter(Boolean);
  }

  function wanNumber(value) {
    if (typeof moneyWan === "function") return String(moneyWan(Number(value || 0))).replace(/万元$/, "");
    return moneyWanFromYuan(Number(value || 0));
  }

  function monthAiContext() {
    if (typeof state === "undefined" || state.view !== "monthAnalysis") return null;
    if (typeof normalizeMonthValue !== "function" || typeof getMonthSummary !== "function") return null;
    var month = normalizeMonthValue(state.month);
    var projectFilter = state.monthProjectFilter || "";
    var selectedProject = projectFilter && typeof getProject === "function" ? getProject(projectFilter) : null;
    var scopeLabel = selectedProject ? selectedProject.shortName : "全项目";
    var summary = getMonthSummary(month, projectFilter ? { projectId: projectFilter } : {});
    var previousSummary = month > 1 ? getMonthSummary(month - 1, projectFilter ? { projectId: projectFilter } : {}) : null;
    var projectRows = typeof getMonthProjectRanking === "function" ? getMonthProjectRanking(month, projectFilter ? { projectId: projectFilter } : {}) : [];
    var subjectRows = typeof getMonthSubjectRanking === "function" ? getMonthSubjectRanking(month, {
      main: state.monthCategoryFilter === "all" ? "" : state.monthCategoryFilter,
      subjectKey: state.monthSubjectKey,
      projectId: projectFilter
    }) : [];
    var activities = typeof getMonthActivities === "function" ? getMonthActivities(month, {
      main: state.monthCategoryFilter === "all" ? "" : state.monthCategoryFilter,
      subjectKey: state.monthSubjectKey,
      projectId: projectFilter
    }) : [];
    var details = typeof getMonthDetailRows === "function" ? getMonthDetailRows(month, {
      main: state.monthCategoryFilter === "all" ? "" : state.monthCategoryFilter,
      subjectKey: state.monthSubjectKey,
      projectId: projectFilter
    }) : [];
    var execution = projectFilter && typeof getProjectBudgetExecution === "function"
      ? getProjectBudgetExecution(projectFilter, month)
      : (typeof getCompanyBudgetExecution === "function" ? getCompanyBudgetExecution(month) : null);
    return {
      month: month,
      monthLabel: typeof monthLabel === "function" ? monthLabel(month) : month + "月",
      scopeLabel: scopeLabel,
      totalWan: wanNumber(summary && summary.total),
      deltaWan: previousSummary ? wanNumber((summary && summary.total || 0) - (previousSummary.total || 0)) : "基准月",
      budgetRate: execution && typeof percent === "function" ? percent(execution.monthBudgetRatio) : "本页未提供该项数字",
      topProjectName: projectRows[0] && projectRows[0].project ? projectRows[0].project.shortName : "",
      topSubjectName: subjectRows[0] ? (subjectRows[0].name || subjectRows[0].subjectName || "") : ((summary && summary.subjectRanking && summary.subjectRanking[0] && summary.subjectRanking[0].name) || ""),
      detailCount: details.length,
      activityCount: activities.length
    };
  }

  function detailAiContext() {
    if (typeof state === "undefined" || state.view !== "details" || typeof filterLedgerRecords !== "function") return null;
    var detail = state.detail || {};
    var project = detail.projectId === "all"
      ? { shortName: "全部项目", fullName: "全部项目" }
      : (typeof getProject === "function" ? getProject(detail.projectId) : null);
    var subject = detail.subjectKey && typeof subjectIndex !== "undefined" ? subjectIndex[detail.subjectKey] : null;
    var activity = detail.activityId && typeof getActivityById === "function" ? getActivityById(detail.activityId) : null;
    var rows = filterLedgerRecords({
      projectId: detail.projectId,
      month: detail.month,
      subjectKey: detail.subjectKey,
      benchmarkItem: detail.benchmarkItem,
      activityId: detail.activityId,
      activityCostItem: detail.activityCostItem,
      directActivityOnly: detail.directActivityOnly,
      ncRecordIds: detail.ncRecordIds,
      query: detail.query
    });
    var subjectLabel = detail.unitBenchmarkName || detail.activityCostItem || detail.benchmarkItem || (subject ? subject.pathText : "全部科目");
    return {
      projectName: project ? (project.shortName || project.fullName) : "当前项目",
      monthLabel: typeof monthLabel === "function" ? monthLabel(detail.month) : String(detail.month || "累计"),
      subjectLabel: subjectLabel,
      activityName: activity ? activity.name : "",
      recordCount: rows.length,
      totalWan: wanNumber(typeof sumRecords === "function" ? sumRecords(rows) : rows.reduce(function (sum, row) { return sum + Number(row.amount || 0); }, 0)),
      scopeText: [(project && (project.shortName || project.fullName)) || "当前项目", typeof monthLabel === "function" ? monthLabel(detail.month) : detail.month, subjectLabel].filter(Boolean).join(" / ")
    };
  }

  function aiContext() {
    var currentRole = role();
    var context = {
      role: currentRole,
      pageName: typeof state !== "undefined" ? state.view : "home",
      visibleProjectNames: visibleProjectNames(),
      allProjectNames: allProjectNames(),
      metrics: currentMetrics()
    };
    if (global.V132ProjectProfile && typeof global.V132ProjectProfile.extendAiContext === "function") {
      context = global.V132ProjectProfile.extendAiContext(context) || context;
    }
    if (global.V133OrgPenetration && typeof global.V133OrgPenetration.extendAiContext === "function") {
      context = global.V133OrgPenetration.extendAiContext(context) || context;
    }
    if (global.V134SubjectCompare && typeof global.V134SubjectCompare.extendAiContext === "function") {
      context = global.V134SubjectCompare.extendAiContext(context) || context;
    }
    var monthContext = monthAiContext();
    if (monthContext) {
      context.pageName = "monthAnalysis";
      context.monthAnalysis = monthContext;
    }
    var detailContext = detailAiContext();
    if (detailContext) {
      context.pageName = "details";
      context.detailAnalysis = detailContext;
    }
    return context;
  }

  function generateAiText(type) {
    var generator = global.V13AI && typeof global.V13AI.generate === "function" ? global.V13AI.generate : null;
    bridgeState.aiType = type || bridgeState.aiType || "overview";
    bridgeState.aiOutput = generator
      ? generator(bridgeState.aiType, aiContext())
      : {
        scope: ["页面：当前页面", "角色：当前账号授权范围", "生成类型：本页解读"],
        focus: ["当前页面可作为管理复核线索。"],
        basis: ["数据依据来自当前页面已展示指标，未生成新的金额或比例。"],
        actions: ["建议结合项目画像、组织穿透、科目横向对比和NC明细继续复核。"],
        boundary: [
          "以下内容基于当前页面已计算数据自动生成，仅供经营复核参考，正式结论以人工复核和NC原始数据为准。",
          "当前版本为规则化演示输出，正式版可结合公司合规模型和真实NC接口进一步增强。"
        ]
      };
    bridgeState.aiText = "";
  }

  function aiDisplayContext(context) {
    context = context || {};
    var role = context.role || {};
    var roleMap = {
      leader: "总经理 / 分管领导视角",
      cost: "成本管理视角",
      project_sjz: "石家庄项目视角"
    };
    var roleText = roleMap[role.roleKey] || role.dataScopeLabel || role.shortRoleName || "当前账号";
    var pageMap = {
      home: "首页总览",
      monthAnalysis: "月度报告",
      compare: "科目横向",
      org: "组织穿透",
      source: "口径说明",
      details: "NC明细追溯",
      profile: "项目画像",
      activityDetail: "活动详情"
    };
    var pageText = context.projectProfile ? "项目画像" : context.subjectCompare ? "科目横向" : context.orgPenetration ? "组织穿透" : context.monthAnalysis ? "月度报告" : context.detailAnalysis ? "NC明细追溯" : (pageMap[context.pageName] || "首页总览");
    var visibleNames = context.visibleProjectNames || [];
    var projectText = visibleNames.length > 3
      ? visibleNames.slice(0, 3).join("、") + "等" + visibleNames.length + "个项目"
      : (visibleNames.join("、") || "当前授权范围");
    var focusText = context.monthAnalysis
      ? context.monthAnalysis.monthLabel + " / " + context.monthAnalysis.scopeLabel
      : context.projectProfile
        ? context.projectProfile.projectName
        : context.subjectCompare
          ? context.subjectCompare.subjectName
          : context.detailAnalysis
            ? context.detailAnalysis.scopeText
            : "当前页面";
    return {
      roleText: roleText,
      pageText: pageText,
      projectText: projectText,
      focusText: focusText
    };
  }

  function aiScopeHtml(context) {
    var meta = aiDisplayContext(context);
    return [
      "<div class=\"v1395-ai-scope\">",
      "  <span>当前页面：<strong>" + h(meta.pageText) + "</strong></span>",
      "  <span>当前角色：<strong>" + h(meta.roleText) + "</strong></span>",
      "  <span>分析范围：<strong>" + h(meta.focusText) + "</strong></span>",
      "  <span>可见项目：<strong>" + h(meta.projectText) + "</strong></span>",
      "</div>"
    ].join("");
  }

  function aiListHtml(items, fallback) {
    var list = (items || []).filter(Boolean);
    if (!list.length) list = [fallback];
    return "<ul>" + list.map(function (item) { return "<li>" + h(item) + "</li>"; }).join("") + "</ul>";
  }

  function aiCardHtml(title, items, fallback, className) {
    return [
      "<section class=\"v13-ai-card " + (className || "") + "\">",
      "  <h3>" + h(title) + "</h3>",
      "  " + aiListHtml(items, fallback),
      "</section>"
    ].join("");
  }

  function normalizeAiOutput(output) {
    var value = output && typeof output === "object" ? output : {};
    return {
      scope: Array.isArray(value.scope) ? value.scope.filter(Boolean) : [],
      focus: Array.isArray(value.focus) ? value.focus.filter(Boolean) : [],
      basis: Array.isArray(value.basis) ? value.basis.filter(Boolean) : [],
      actions: Array.isArray(value.actions) ? value.actions.filter(Boolean) : [],
      boundary: Array.isArray(value.boundary) ? value.boundary.filter(Boolean) : []
    };
  }

  function renderAiOutputHtml(output, context) {
    var meta = aiDisplayContext(context);
    var sections = normalizeAiOutput(output);
    var fallbackScopeItems = [
      "页面：" + meta.pageText,
      "角色：" + meta.roleText,
      "范围：" + meta.focusText,
      "可见项目：" + meta.projectText
    ];
    var scopeItems = sections.scope.length
      ? sections.scope.concat(["范围：" + meta.focusText, "可见项目：" + meta.projectText])
      : fallbackScopeItems;
    var boundaryItems = sections.boundary.length ? sections.boundary : [
      "以下内容基于当前页面已计算数据自动生成，仅供经营复核参考，正式结论以人工复核和NC原始数据为准。",
      "当前版本为前端规则化演示输出，不接真实外部模型，不生成页面以外的新数字。"
    ];
    return [
      "<div class=\"v13-ai-output\">",
      aiCardHtml("当前分析范围", scopeItems, "当前页面授权范围", "is-scope"),
      aiCardHtml("关注点", sections.focus, "请先确认当前页面数据已加载。"),
      aiCardHtml("数据依据", sections.basis, "依据当前页面已展示指标和授权范围内数据。"),
      aiCardHtml("建议核查方向", sections.actions, "建议结合项目画像、组织穿透、科目横向对比和NC明细继续复核。"),
      aiCardHtml("边界说明", boundaryItems, "仅供经营复核参考，正式结论以人工复核和NC原始数据为准。", "is-boundary"),
      "</div>"
    ].join("");
  }

  function renderAiDrawer() {
    document.querySelectorAll(".v13-ai-backdrop,.v13-ai-drawer").forEach(function (node) { node.remove(); });
    if (!bridgeState.aiOpen) return;
    if (!bridgeState.aiOutput) generateAiText(bridgeState.aiType);
    var context = aiContext();
    var backdrop = document.createElement("div");
    backdrop.className = "v13-ai-backdrop";
    backdrop.dataset.v13AiClose = "true";
    var drawer = document.createElement("aside");
    drawer.className = "v13-ai-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-label", "运营成本分析助手");
    drawer.innerHTML = [
      "<div class=\"v13-ai-head\">",
      "  <div><h2>运营成本分析助手</h2><p class=\"v13-nc-note\">基于当前页面已计算数据生成经营复核参考，不接外部模型。</p></div>",
      "  <button class=\"drawer-close\" type=\"button\" data-v13-ai-close aria-label=\"关闭\">×</button>",
      "</div>",
      aiScopeHtml(context),
      "<div class=\"v13-ai-tabs\">",
      "  <button class=\"btn" + (bridgeState.aiType === "overview" ? " primary" : " ghost") + "\" type=\"button\" data-v13-ai-type=\"overview\">生成本页解读</button>",
      "  <button class=\"btn" + (bridgeState.aiType === "checklist" ? " primary" : " ghost") + "\" type=\"button\" data-v13-ai-type=\"checklist\">生成复核建议</button>",
      "  <button class=\"btn" + (bridgeState.aiType === "source" ? " primary" : " ghost") + "\" type=\"button\" data-v13-ai-type=\"source\">生成汇报口径</button>",
      "</div>",
      renderAiOutputHtml(bridgeState.aiOutput, context)
    ].join("");
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
  }

  function coverageBadges() {
    var layer = global.OPERATION_COST_NC_WORKFLOW;
    var coverage = layer && layer.views && Array.isArray(layer.views.VIEW_NC_FIELD_COVERAGE_MIN)
      ? layer.views.VIEW_NC_FIELD_COVERAGE_MIN
      : [];
    return coverage.slice(0, 8).map(function (item) {
      var label = coverageLabel(item);
      var rate = item.coverage_rate == null ? "" : " " + item.coverage_rate + "%";
      return "<span>" + h(label) + h(rate) + "</span>";
    }).join("");
  }

  function coverageLabel(item) {
    var map = {
      contract: "合同信息覆盖率",
      supplier: "供应商信息覆盖率",
      activity: "活动信息覆盖率",
      subject: "科目信息覆盖率",
      contract_item: "合同清单覆盖率",
      settlement: "结算信息覆盖率",
      payment: "付款信息覆盖率",
      final_settlement: "完工结算信息覆盖率"
    };
    return map[item && item.field] || item.field_label || item.label || item.coverage_name || "字段覆盖率";
  }

  function workflowSteps() {
    var layer = global.OPERATION_COST_NC_WORKFLOW;
    var steps = layer && Array.isArray(layer.workflowSteps) ? layer.workflowSteps : [];
    return steps.slice(0, 6).map(function (step) {
      return "<span>" + h(step.step_name || step.step_code || "") + "</span>";
    }).join("");
  }

  function traceRowsHtml() {
    return visibleNcRows().slice(0, 8).map(function (row) {
      return [
        "<tr>",
        "<td>" + h(row.project_name || row.project_id || "") + "</td>",
        "<td>" + h(row.month || row.cost_month || "") + "</td>",
        "<td>" + h(row.activity_name || "-") + "</td>",
        "<td>" + h(row.cost_subject_name || "-") + "</td>",
        "<td>" + h(row.supplier_name || row.supplier || "-") + "</td>",
        "<td>" + h(row.contract_no || "-") + "<br>" + h(row.contract_name || "-") + "</td>",
        "<td>" + h(row.settlement_no || "-") + "<br>" + h(row.payment_no || "-") + "</td>",
        "<td>" + h((row.data_quality_flags || []).join(", ") || "无") + "</td>",
        "</tr>"
      ].join("");
    }).join("");
  }

  function injectNcPanel() {
    if (typeof state === "undefined" || state.view !== "details") return;
    var anchor = document.querySelector("#app .page-title-row");
    if (document.querySelector(".v1394-trace-chain")) return;
    if (!anchor || document.querySelector(".v13-nc-section")) return;
    var section = document.createElement("section");
    section.className = "v13-nc-section";
    section.innerHTML = [
      "<h2>NC明细追溯说明</h2>",
      "<p class=\"v13-nc-note\">本区域用于说明NC明细从项目、活动、供应商、合同、结算到付款的追溯关系；项目总成本仍沿用统一成本口径。</p>",
      "<div class=\"v13-nc-flow\">" + workflowSteps() + "</div>",
      "<div class=\"v13-coverage\">" + coverageBadges() + "</div>",
      "<table class=\"v13-nc-table\"><thead><tr><th>项目</th><th>月份</th><th>活动</th><th>科目</th><th>供应商</th><th>合同</th><th>结算/付款</th><th>数据质量提示</th></tr></thead><tbody>" + traceRowsHtml() + "</tbody></table>"
    ].join("");
    anchor.after(section);
  }

  function injectSourcePanel() {
    return;
  }

  function injectScopeNote() {
    var currentRole = role();
    if (!currentRole || isAllScope(currentRole) || typeof state === "undefined" || state.view !== "home") return;
    var content = document.querySelector("#app .page-transition");
    if (!content || content.querySelector(".v13-scope-note")) return;
    var note = document.createElement("div");
    note.className = "v13-scope-note";
    note.textContent = "当前可查看项目范围：" + (PROJECT_SCOPE_LABELS[currentRole.roleKey] || currentRole.dataScopeLabel || "当前可查看项目") + "；首页项目卡片、项目表格、NC明细和运营成本分析助手均按可查看项目展示。";
    content.prepend(note);
  }

  function postRender() {
    renderAuthLayer();
    renderRolePanel();
    injectScopeNote();
    patchProjectScopeHome();
    injectNcPanel();
    injectSourcePanel();
    renderAiDrawer();
  }

  function patchRender() {
    if (bridgeState.renderPatched || typeof render !== "function") return;
    var originalRender = render;
    render = function () {
      if (bridgeState.rendering) return originalRender();
      bridgeState.rendering = true;
      try {
        applyRoleMutation();
        originalRender();
        postRender();
      } finally {
        bridgeState.rendering = false;
      }
    };
    bridgeState.renderPatched = true;
  }

  function clearLoginLayer() {
    var layer = document.getElementById("v13-auth-layer");
    document.body.classList.remove("v1313-login-active", "v1313-login-exiting");
    if (layer) layer.innerHTML = "";
  }

  function prepareDashboardRenderCover() {
    var layer = document.getElementById("v13-auth-layer");
    if (!layer) return null;
    document.body.classList.remove("v1313-login-active", "v1313-login-exiting");
    layer.innerHTML = "<div class=\"v13-auth-screen v1313-render-cover\" aria-hidden=\"true\"></div>";
    return layer.querySelector(".v1313-render-cover");
  }

  function afterAnimationFrames(frameCount, callback) {
    var remaining = Math.max(1, Number(frameCount) || 1);
    var next = function () {
      remaining -= 1;
      if (remaining <= 0) {
        callback();
        return;
      }
      global.requestAnimationFrame(next);
    };
    global.requestAnimationFrame(next);
  }

  function fadeOutDashboardRenderCover(cover) {
    var done = function () {
      clearLoginLayer();
      bridgeState.loginAnimating = false;
      bridgeState.loginRenderReady = false;
      loginTimingProbe().coverRemovedAt = performance.now();
    };
    if (!cover) {
      done();
      return;
    }
    global.requestAnimationFrame(function () {
      global.requestAnimationFrame(function () {
        loginTimingProbe().coverFadeStartedAt = performance.now();
        cover.classList.add("is-fading");
        global.setTimeout(done, bridgeState.loginTransitionCoverMs);
      });
    });
  }

  function renderLoginDashboard() {
    if (bridgeState.loginRenderReady) return;
    var timing = loginTimingProbe();
    timing.renderStartedAt = performance.now();
    timing.renderStartedWhileParticleRafActive = Boolean(global.__V1313_PARTICLE_METRICS && global.__V1313_PARTICLE_METRICS.rafActive);
    var currentRole = role();
    applyRoleMutation();
    if (currentRole && isAllScope(currentRole)) {
      postRender();
    } else if (typeof render === "function") {
      render();
    }
    if (typeof resetPageScrollToTop === "function") resetPageScrollToTop();
    bridgeState.loginRenderReady = true;
    timing.renderFinishedAt = performance.now();
  }

  function finishLoginRender() {
    var timing = loginTimingProbe();
    timing.particleFinishedAt = performance.now();
    var cover = prepareDashboardRenderCover();
    timing.coverPreparedAt = performance.now();
    if (!cover) {
      if (!bridgeState.loginRenderReady) renderLoginDashboard();
      fadeOutDashboardRenderCover(cover);
      return;
    }
    afterAnimationFrames(bridgeState.loginCoverPrepaintFrames, function () {
      loginTimingProbe().renderPrepaintAt = performance.now();
      if (!bridgeState.loginRenderReady) renderLoginDashboard();
      loginTimingProbe().coverHoldStartedAt = performance.now();
      global.setTimeout(function () {
        fadeOutDashboardRenderCover(cover);
      }, bridgeState.loginCoverPostRenderHoldMs);
    });
  }

  function completeLogin(username, password, errorNode, rememberAccount) {
    if (bridgeState.loginAnimating) return;
    var result = global.V13Auth && global.V13Auth.login(username, password);
    if (!result || !result.ok) {
      if (errorNode) errorNode.textContent = result && result.message ? result.message : "登录失败";
      return;
    }
    resetLoginTimingProbe(username);
    if (errorNode) errorNode.textContent = "";
    if (global.V1313LoginParticle && typeof global.V1313LoginParticle.rememberAccount === "function") {
      global.V1313LoginParticle.rememberAccount(username, rememberAccount);
    }
    if (typeof state !== "undefined") {
      state.view = "home";
      state.projectId = "sjz";
      state.detail.projectId = "sjz";
      state.detail.page = 1;
      state.detail.selectedId = "";
    }
    bridgeState.loginAnimating = true;
    bridgeState.loginRenderReady = false;
    if (global.V1313LoginParticle && typeof global.V1313LoginParticle.playSuccess === "function") {
      global.V1313LoginParticle.playSuccess(finishLoginRender);
    } else {
      finishLoginRender();
    }
  }

  function bindBridgeEvents() {
    document.addEventListener("click", function (event) {
      var accountButton = event.target.closest("[data-v13-account]");
      if (accountButton) {
        var card = accountButton.closest(".v13-login-card");
        if (!card) return;
        card.querySelectorAll(".v13-account-option").forEach(function (button) { button.classList.remove("is-active"); });
        accountButton.classList.add("is-active");
        var input = card.querySelector("input[name='username']");
        if (input) input.value = accountButton.dataset.v13Account;
        return;
      }

      if (event.target.closest("[data-v13-logout]")) {
        if (global.V13Auth) global.V13Auth.logout();
        document.location.reload();
        return;
      }

      var plannedButton = event.target.closest("[data-v1322-planned-message]");
      if (plannedButton) {
        event.preventDefault();
        showPlannedToast(plannedButton.dataset.v1322PlannedMessage || "");
        return;
      }

      if (event.target.closest("[data-v13-ai-open]")) {
        bridgeState.aiOpen = true;
        generateAiText(bridgeState.aiType || "overview");
        renderAiDrawer();
        return;
      }

      if (event.target.closest("[data-v13-ai-close]") || event.target.closest(".v13-ai-backdrop")) {
        bridgeState.aiOpen = false;
        renderAiDrawer();
        return;
      }

      var typeButton = event.target.closest("[data-v13-ai-type]");
      if (typeButton) {
        generateAiText(typeButton.dataset.v13AiType || "overview");
        renderAiDrawer();
      }
    });

    document.addEventListener("submit", function (event) {
      var form = event.target.closest("[data-v13-login-form]");
      if (!form) return;
      event.preventDefault();
      completeLogin(
        form.username.value,
        form.password.value,
        form.querySelector("[data-v13-login-error]"),
        Boolean(form.rememberAccount && form.rememberAccount.checked)
      );
    });
  }

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  patchRender();
  bindBridgeEvents();
  ready(function () {
    patchRender();
    applyRoleMutation();
    postRender();
    if (role() && typeof render === "function") render();
  });

  global.V13Bridge = {
    applyRoleMutation: applyRoleMutation,
    visibleNcRows: visibleNcRows,
    currentMetrics: currentMetrics,
    openAi: function (type) {
      bridgeState.aiOpen = true;
      generateAiText(type || "overview");
      renderAiDrawer();
    },
    closeAi: function () {
      bridgeState.aiOpen = false;
      renderAiDrawer();
    },
    getRole: role,
    getVisibleProjectNames: visibleProjectNames
  };
})(typeof window !== "undefined" ? window : globalThis);
