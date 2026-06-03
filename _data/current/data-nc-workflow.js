/*
 * V13-D0 optional NC workflow mapping layer.
 * This file is intentionally not loaded by existing V12.7.1 or V20.3 pages.
 * It reads the current shared data globals and publishes only one new global.
 */
(function (global) {
  "use strict";

  var core = global.OPERATION_COST_DATA_CORE || {};
  var tables = core.tables || {};
  var factRows = Array.isArray(tables.FACT_COST_DETAIL) ? tables.FACT_COST_DETAIL : [];

  function rows(name) {
    return Array.isArray(tables[name]) ? tables[name] : [];
  }

  function indexBy(list, key) {
    return list.reduce(function (index, item) {
      if (item && item[key]) index[item[key]] = item;
      return index;
    }, {});
  }

  function firstBy(list, key) {
    return list.reduce(function (index, item) {
      if (item && item[key] && !index[item[key]]) index[item[key]] = item;
      return index;
    }, {});
  }

  function round2(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  function rate(covered, total) {
    return total ? round2((covered / total) * 100) : 0;
  }

  function hasValue(value) {
    return value !== undefined && value !== null && value !== "";
  }

  function amountBasis(row) {
    if (row.fact_type === "allocated_cost") return "allocated_cost_explanation_only";
    if (row.source_doc_type === "progress_settlement") return "progress_settlement_amount";
    if (row.source_doc_type === "finance") return "existing_finance_fact_amount";
    return "";
  }

  function sourceStep(row) {
    if (row.source_doc_type === "progress_settlement") return "progress_settlement";
    if (row.source_doc_type === "finance") return "finance_record";
    if (row.source_doc_type === "allocation") return "allocated_cost_pool";
    return "unknown";
  }

  var projectsById = indexBy(rows("PROJECTS_V10"), "project_id");
  var activitiesById = indexBy(rows("ACTIVITIES_V10"), "activity_id");
  var subjectsById = indexBy(rows("COST_SUBJECTS"), "subject_id");
  var suppliersById = indexBy(rows("SUPPLIERS"), "supplier_id");
  var contractsById = indexBy(rows("CONTRACTS"), "contract_id");
  var contractItemsById = indexBy(rows("CONTRACT_ITEMS"), "contract_item_id");
  var quantityLinesById = indexBy(rows("QUANTITY_LINES"), "quantity_line_id");
  var quantitySheetsById = indexBy(rows("QUANTITY_SHEETS"), "quantity_sheet_id");
  var settlementLinesById = indexBy(rows("PROGRESS_SETTLEMENT_LINES"), "settlement_line_id");
  var settlementsById = indexBy(rows("PROGRESS_SETTLEMENTS"), "settlement_id");
  var finalSettlementsByContractId = firstBy(rows("FINAL_SETTLEMENTS"), "contract_id");
  var paymentsById = indexBy(rows("PAYMENT_RECORDS"), "payment_id");
  var paymentsBySettlementId = firstBy(rows("PAYMENT_RECORDS"), "settlement_id");

  var NC_WORKFLOW_STEPS_MIN = [
    {
      step_code: "contract_entry",
      step_name: "支出合同录入",
      source_module: "投资公司运营 / 支出合同",
      dashboard_use: "合同、供应商、项目追溯",
      included_in_cost_amount: false
    },
    {
      step_code: "contract_item_import",
      step_name: "合同清单导入",
      source_module: "合同清单粘贴式导入",
      dashboard_use: "合同清单、单价、清单金额解释",
      included_in_cost_amount: false
    },
    {
      step_code: "variation_agreement",
      step_name: "补充协议 / 调增调减",
      source_module: "支出合同补充协议",
      dashboard_use: "调整项识别，不重算成本",
      included_in_cost_amount: false
    },
    {
      step_code: "contract_wbs_split",
      step_name: "合同WBS拆分",
      source_module: "投资公司运营 / 合同 WBS 拆分",
      dashboard_use: "合同清单与成本科目映射",
      included_in_cost_amount: false
    },
    {
      step_code: "quantity_confirmation",
      step_name: "支出合同工程量统计",
      source_module: "投资公司运营 / 支出合同工程量统计",
      dashboard_use: "活动归集、审核量解释",
      included_in_cost_amount: false
    },
    {
      step_code: "progress_settlement",
      step_name: "支出合同进度结算",
      source_module: "投资公司运营 / 支出合同进度结算",
      dashboard_use: "实际成本确认优先依据",
      included_in_cost_amount: true
    },
    {
      step_code: "final_settlement",
      step_name: "支出合同最终结算",
      source_module: "投资公司运营 / 支出合同最终结算",
      dashboard_use: "合同关闭状态追溯，不计入实际成本",
      included_in_cost_amount: false
    },
    {
      step_code: "payment_record",
      step_name: "财务付款记录",
      source_module: "财务付款记录",
      dashboard_use: "付款状态和现金流追溯，不替代成本金额",
      included_in_cost_amount: false
    }
  ];

  var NC_AMOUNT_BASIS_RULES_MIN = [
    "实际成本优先取进度结算金额。",
    "没有进度结算时，可用项目审核量乘合同单价作为过渡解释口径。",
    "合同金额和合同清单金额只作为合同依据和追溯依据，不直接作为实际成本。",
    "最终结算金额为0时只作为合同关闭状态，不计入实际成本。",
    "付款金额只用于现金流和付款追溯，不替代成本发生金额。",
    "allocated_cost 仍为固定成本分摊解释口径，不重复计入首页、月度、项目总成本。"
  ];

  var NC_MIN_FIELD_DICTIONARY = {
    trace_id: "补充层追溯行ID，优先沿用现有成本明细ID。",
    project_id: "项目ID，来自现有成本明细或合同项目。",
    project_name: "项目名称，来自现有项目表。",
    month: "成本月份，来自现有成本明细。",
    activity_id: "标准活动ID，来自现有成本明细。",
    activity_name: "标准活动名称，来自现有活动表。",
    nc_activity_name: "NC经营活动名称；现有静态数据缺失时保留为空。",
    cost_subject_id: "成本科目ID，来自现有成本明细。",
    cost_subject_name: "成本科目名称，来自现有科目表。",
    cost_nature: "成本性质，沿用现有 fixed / variable / management 等口径。",
    amount: "现有 FACT_COST_DETAIL 成本金额，不重算、不覆盖。",
    amount_basis: "金额依据说明，只解释来源，不改变金额。",
    supplier_id: "供应商ID，来自现有成本明细或合同。",
    supplier_name: "供应商名称，来自现有供应商表。",
    contract_id: "合同ID，来自现有成本明细。",
    contract_no: "合同编号，来自现有合同表 contract_code。",
    contract_name: "合同名称，来自现有合同表。",
    contract_item_id: "合同清单ID，来自现有成本明细。",
    contract_item_code: "合同清单编码；现有静态数据缺失时保留为空。",
    contract_item_name: "合同清单名称，来自现有合同清单表。",
    wbs_name: "WBS科目名称；现有静态数据缺失时保留为空。",
    approved_quantity: "工程量审核数量，优先来自结算行或工程量行。",
    settlement_no: "进度结算单号，来自现有进度结算表 nc_doc_no。",
    settlement_cutoff_date: "结算截止日期；现有静态数据缺失时保留为空。",
    final_settlement_status: "最终结算/合同关闭状态，只作状态追溯。",
    payment_no: "付款单号，来自现有付款记录。",
    payment_status: "付款状态，来自现有付款记录。",
    source_step: "追溯来源步骤。",
    source_document_no: "来源单据编号，来自现有成本明细或相关单据。",
    data_quality_flags: "最小数据质量提示，只提示缺失或来源不明。"
  };

  function buildQualityFlags(row, contract, supplier, activity, subject, settlement, payment, basis) {
    var flags = [];
    var needsContractTrace = row.fact_type === "raw_cost";
    var needsSettlementTrace = row.source_doc_type === "progress_settlement";

    if (needsContractTrace && !contract) flags.push("missing_contract");
    if (needsContractTrace && !supplier) flags.push("missing_supplier");
    if (!activity) flags.push("missing_activity");
    if (!subject) flags.push("missing_subject");
    if (needsSettlementTrace && !settlement) flags.push("missing_settlement");
    if (needsSettlementTrace && !payment) flags.push("missing_payment");
    if (!basis) flags.push("unknown_amount_basis");

    return flags;
  }

  var VIEW_NC_WORKFLOW_TRACE_MIN = factRows.map(function (row, index) {
    var project = projectsById[row.project_id] || null;
    var activity = activitiesById[row.activity_id] || null;
    var subject = subjectsById[row.subject_id] || null;
    var contract = contractsById[row.contract_id] || null;
    var supplierId = row.supplier_id || (contract && contract.supplier_id) || "";
    var supplier = suppliersById[supplierId] || null;
    var contractItem = contractItemsById[row.contract_item_id] || null;
    var settlementLine = settlementLinesById[row.settlement_line_id] || null;
    var settlement = settlementsById[row.settlement_id] || (settlementLine && settlementsById[settlementLine.settlement_id]) || null;
    var quantityLine = (settlementLine && quantityLinesById[settlementLine.quantity_line_id]) || quantityLinesById[row.quantity_line_id] || null;
    var quantitySheet = quantityLine && quantitySheetsById[quantityLine.quantity_sheet_id] || null;
    var payment = paymentsById[row.payment_id] || (settlement && paymentsBySettlementId[settlement.settlement_id]) || null;
    var finalSettlement = (contract && finalSettlementsByContractId[contract.contract_id]) || null;
    var basis = amountBasis(row);
    var flags = buildQualityFlags(row, contract, supplier, activity, subject, settlement, payment, basis);

    return {
      trace_id: row.cost_detail_id || "NC-WF-" + String(index + 1).padStart(5, "0"),
      project_id: row.project_id || "",
      project_name: project ? project.project_name : "",
      month: row.cost_month || "",
      activity_id: row.activity_id || "",
      activity_name: activity ? activity.activity_name : "",
      nc_activity_name: quantitySheet && quantitySheet.nc_activity_name || "",
      cost_subject_id: row.subject_id || "",
      cost_subject_name: subject ? subject.subject_name : "",
      cost_nature: row.cost_nature || "",
      amount: Number(row.cost_amount || 0),
      amount_basis: basis,
      supplier_id: supplierId,
      supplier_name: supplier ? supplier.supplier_name : "",
      contract_id: row.contract_id || "",
      contract_no: contract ? contract.contract_code : "",
      contract_name: contract ? contract.contract_name : "",
      contract_item_id: row.contract_item_id || "",
      contract_item_code: contractItem && contractItem.contract_item_code || "",
      contract_item_name: contractItem ? contractItem.item_name : "",
      wbs_name: "",
      approved_quantity: Number((settlementLine && settlementLine.quantity) || (quantityLine && quantityLine.quantity) || row.quantity || 0),
      settlement_no: settlement ? settlement.nc_doc_no : "",
      settlement_cutoff_date: "",
      final_settlement_status: finalSettlement ? (finalSettlement.close_contract ? "closed" : "open") : "",
      payment_no: payment ? payment.payment_doc_no : "",
      payment_status: payment ? payment.payment_status : "",
      source_step: sourceStep(row),
      source_document_no: row.source_doc_no || (settlement && settlement.nc_doc_no) || (payment && payment.payment_doc_no) || "",
      data_quality_flags: flags
    };
  });

  function coverageItem(field, label, scope, list, predicate) {
    var total = list.length;
    var covered = list.filter(predicate).length;
    return {
      field: field,
      label: label,
      scope: scope,
      total_count: total,
      covered_count: covered,
      coverage_rate: rate(covered, total)
    };
  }

  var rawTraceRows = VIEW_NC_WORKFLOW_TRACE_MIN.filter(function (row) {
    return row.amount_basis !== "allocated_cost_explanation_only";
  });
  var settlementTraceRows = VIEW_NC_WORKFLOW_TRACE_MIN.filter(function (row) {
    return row.source_step === "progress_settlement";
  });

  var VIEW_NC_FIELD_COVERAGE_MIN = [
    coverageItem("contract", "合同覆盖率", "raw_cost", rawTraceRows, function (row) { return hasValue(row.contract_id); }),
    coverageItem("supplier", "供应商覆盖率", "raw_cost", rawTraceRows, function (row) { return hasValue(row.supplier_id); }),
    coverageItem("activity", "活动覆盖率", "all_fact_rows", VIEW_NC_WORKFLOW_TRACE_MIN, function (row) { return hasValue(row.activity_id); }),
    coverageItem("subject", "科目覆盖率", "all_fact_rows", VIEW_NC_WORKFLOW_TRACE_MIN, function (row) { return hasValue(row.cost_subject_id); }),
    coverageItem("contract_item", "合同清单覆盖率", "raw_cost", rawTraceRows, function (row) { return hasValue(row.contract_item_id); }),
    coverageItem("settlement", "结算单覆盖率", "progress_settlement", settlementTraceRows, function (row) { return hasValue(row.settlement_no); }),
    coverageItem("payment", "付款单覆盖率", "progress_settlement", settlementTraceRows, function (row) { return hasValue(row.payment_no); }),
    coverageItem("final_settlement", "最终结算状态覆盖率", "raw_cost", rawTraceRows, function (row) { return hasValue(row.final_settlement_status); })
  ];

  var VIEW_NC_DATA_QUALITY_FLAGS_MIN = VIEW_NC_WORKFLOW_TRACE_MIN
    .filter(function (row) { return row.data_quality_flags.length > 0; })
    .map(function (row) {
      return {
        trace_id: row.trace_id,
        project_id: row.project_id,
        month: row.month,
        source_step: row.source_step,
        data_quality_flags: row.data_quality_flags
      };
    });

  var traceRowsByContractId = VIEW_NC_WORKFLOW_TRACE_MIN.reduce(function (index, row) {
    if (!row.contract_id) return index;
    if (!index[row.contract_id]) index[row.contract_id] = [];
    index[row.contract_id].push(row);
    return index;
  }, {});

  var settlementsByContractId = rows("PROGRESS_SETTLEMENTS").reduce(function (index, item) {
    if (!item.contract_id) return index;
    if (!index[item.contract_id]) index[item.contract_id] = [];
    index[item.contract_id].push(item);
    return index;
  }, {});

  var paymentsByContractId = rows("PAYMENT_RECORDS").reduce(function (index, payment) {
    var settlement = payment && settlementsById[payment.settlement_id];
    if (!settlement || !settlement.contract_id) return index;
    if (!index[settlement.contract_id]) index[settlement.contract_id] = [];
    index[settlement.contract_id].push(payment);
    return index;
  }, {});

  var VIEW_CONTRACT_CHAIN_MIN = rows("CONTRACTS").map(function (contract) {
    var traceRows = traceRowsByContractId[contract.contract_id] || [];
    var settlementRows = settlementsByContractId[contract.contract_id] || [];
    var paymentRows = paymentsByContractId[contract.contract_id] || [];
    var supplier = suppliersById[contract.supplier_id] || null;
    var project = projectsById[contract.project_id] || null;
    var finalSettlement = finalSettlementsByContractId[contract.contract_id] || null;
    var flags = [];
    if (!supplier) flags.push("missing_supplier");

    return {
      contract_id: contract.contract_id || "",
      contract_no: contract.contract_code || "",
      contract_name: contract.contract_name || "",
      supplier_name: supplier ? supplier.supplier_name : "",
      project_name: project ? project.project_name : "",
      contract_amount: Number(contract.contract_amount || 0),
      related_fact_count: traceRows.length,
      related_amount: round2(traceRows.reduce(function (sum, row) { return sum + Number(row.amount || 0); }, 0)),
      settlement_count: settlementRows.length,
      settlement_amount: round2(settlementRows.reduce(function (sum, row) { return sum + Number(row.settlement_amount || 0); }, 0)),
      payment_count: paymentRows.length,
      payment_amount: round2(paymentRows.reduce(function (sum, row) { return sum + Number(row.payment_amount || 0); }, 0)),
      final_settlement_status: finalSettlement ? (finalSettlement.close_contract ? "closed" : "open") : "",
      data_quality_flags: flags
    };
  });

  global.OPERATION_COST_NC_WORKFLOW = {
    version: "V13-D0",
    generatedAt: "2026-05-29 16:45:00",
    source: "derived_from_existing_static_shared_data_layer",
    workflowSteps: NC_WORKFLOW_STEPS_MIN,
    dictionaries: {
      NC_WORKFLOW_STEPS_MIN: NC_WORKFLOW_STEPS_MIN,
      NC_AMOUNT_BASIS_RULES_MIN: NC_AMOUNT_BASIS_RULES_MIN,
      NC_MIN_FIELD_DICTIONARY: NC_MIN_FIELD_DICTIONARY
    },
    views: {
      VIEW_NC_WORKFLOW_TRACE_MIN: VIEW_NC_WORKFLOW_TRACE_MIN,
      VIEW_NC_FIELD_COVERAGE_MIN: VIEW_NC_FIELD_COVERAGE_MIN,
      VIEW_NC_DATA_QUALITY_FLAGS_MIN: VIEW_NC_DATA_QUALITY_FLAGS_MIN,
      VIEW_CONTRACT_CHAIN_MIN: VIEW_CONTRACT_CHAIN_MIN
    },
    audit: {
      sourceFactRows: factRows.length,
      traceRows: VIEW_NC_WORKFLOW_TRACE_MIN.length,
      traceAlignedWithFactCostDetail: VIEW_NC_WORKFLOW_TRACE_MIN.length === factRows.length,
      finalSettlementAmountIncludedInCost: false,
      existingCostAmountRecalculated: false,
      loadedFromExistingDataGlobals: Boolean(core && tables)
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
