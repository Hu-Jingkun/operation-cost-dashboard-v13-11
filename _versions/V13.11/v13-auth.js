(function (global) {
  "use strict";

  var STORAGE_KEY = "operation-cost-v13-role";
  var ACCOUNTS = {
    leader: {
      username: "leader",
      password: "123456",
      roleKey: "leader",
      roleName: "总经理 / 分管领导",
      shortRoleName: "总经理",
      dataScopeLabel: "全部项目",
      permissionNote: "可查看全部汇总、全部项目和全部NC明细",
      visibleProjectIds: "all",
      canViewNcDetails: true,
      maskSensitive: false
    },
    cost: {
      username: "cost",
      password: "123456",
      roleKey: "cost",
      roleName: "商法部 / 成本中心",
      shortRoleName: "商法部成本中心",
      dataScopeLabel: "全部项目",
      permissionNote: "可查看全部成本侧数据和全部NC明细",
      visibleProjectIds: "all",
      canViewNcDetails: true,
      maskSensitive: false
    },
    project_sjz: {
      username: "project_sjz",
      password: "123456",
      roleKey: "project_sjz",
      roleName: "石家庄项目视角",
      shortRoleName: "石家庄项目",
      dataScopeLabel: "石家庄",
      permissionNote: "仅查看本项目数据和本项目NC明细",
      visibleProjectIds: ["sjz"],
      canViewNcDetails: true,
      maskSensitive: false
    },
    project_lzhz: {
      username: "project_lzhz",
      password: "123456",
      roleKey: "project_lzhz",
      roleName: "柳州会展项目视角",
      shortRoleName: "柳州会展项目",
      dataScopeLabel: "柳州会展",
      permissionNote: "仅查看本项目数据和本项目NC明细",
      visibleProjectIds: ["lzhz"],
      canViewNcDetails: true,
      maskSensitive: false
    },
    demo: {
      username: "demo",
      password: "123456",
      roleKey: "demo",
      roleName: "脱敏演示视角",
      shortRoleName: "脱敏演示",
      dataScopeLabel: "样例项目",
      permissionNote: "仅查看样例项目，供应商、合同、单据字段已脱敏",
      visibleProjectIds: ["daye"],
      canViewNcDetails: true,
      maskSensitive: true
    }
  };

  function cloneAccount(account) {
    return account ? JSON.parse(JSON.stringify(account)) : null;
  }

  function getStoredRoleKey() {
    try {
      return global.localStorage && global.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function setStoredRoleKey(roleKey) {
    try {
      if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, roleKey);
    } catch (error) {
      // Storage may be unavailable in locked-down browser contexts.
    }
  }

  function clearStoredRoleKey() {
    try {
      if (global.localStorage) global.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Storage may be unavailable in locked-down browser contexts.
    }
  }

  function login(username, password) {
    var account = ACCOUNTS[String(username || "").trim()];
    if (!account || account.password !== String(password || "")) {
      return { ok: false, message: "账号或密码不正确，请选择演示账号并输入 123456。" };
    }
    setStoredRoleKey(account.roleKey);
    return { ok: true, account: cloneAccount(account) };
  }

  function logout() {
    clearStoredRoleKey();
  }

  function getCurrentRole() {
    var roleKey = getStoredRoleKey();
    return cloneAccount(ACCOUNTS[roleKey] || null);
  }

  function getVisibleProjectsByRole(role, projects) {
    if (!role) return [];
    var list = Array.isArray(projects) ? projects : [];
    if (role.visibleProjectIds === "all") return list.slice();
    var allowed = new Set(role.visibleProjectIds || []);
    return list.filter(function (project) { return allowed.has(project.project_id); });
  }

  function getVisibleProjectIds(role, projects) {
    return getVisibleProjectsByRole(role, projects).map(function (project) { return project.project_id; });
  }

  function canViewProject(role, projectId) {
    if (!role) return false;
    if (role.visibleProjectIds === "all") return true;
    return (role.visibleProjectIds || []).indexOf(projectId) >= 0;
  }

  function filterByRole(rows, role, projectField) {
    var field = projectField || "project_id";
    if (!Array.isArray(rows) || !role) return [];
    if (role.visibleProjectIds === "all") return rows.slice();
    var allowed = new Set(role.visibleProjectIds || []);
    return rows.filter(function (row) { return allowed.has(row[field]); });
  }

  function maskedFieldValue(field) {
    var name = String(field || "").toLowerCase();
    if (name.indexOf("supplier") >= 0) return "脱敏供应商A";
    if (name.indexOf("contract") >= 0) return "合同-****";
    if (name.indexOf("settlement") >= 0) return "结算单-****";
    if (name.indexOf("payment") >= 0) return "付款单-****";
    if (name.indexOf("voucher") >= 0 || name.indexOf("source") >= 0) return "凭证-****";
    return "已脱敏";
  }

  function maskSensitiveFields(record, role) {
    if (!record || !role || !role.maskSensitive) return record;
    var copy = Object.assign({}, record);
    [
      "supplier_id",
      "supplier_name",
      "contract_id",
      "contract_no",
      "contract_code",
      "contract_name",
      "contract_item_id",
      "contract_item_code",
      "contract_item_name",
      "settlement_id",
      "settlement_no",
      "settlement_doc_no",
      "payment_id",
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
    ].forEach(function (field) {
      if (field in copy) copy[field] = copy[field] ? maskedFieldValue(field) : "";
    });
    return copy;
  }

  global.V13Auth = {
    ACCOUNTS: ACCOUNTS,
    login: login,
    logout: logout,
    getCurrentRole: getCurrentRole,
    getVisibleProjectsByRole: getVisibleProjectsByRole,
    getVisibleProjectIds: getVisibleProjectIds,
    filterByRole: filterByRole,
    maskSensitiveFields: maskSensitiveFields,
    canViewProject: canViewProject
  };
})(typeof window !== "undefined" ? window : globalThis);
