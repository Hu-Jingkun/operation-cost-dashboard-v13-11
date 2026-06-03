(function (global) {
  "use strict";

  var DISCLAIMER = "以下内容基于当前页面已计算数据自动生成，仅供经营复核参考，正式结论以人工复核和NC原始数据为准。";
  var FOOTER = "当前版本为规则化演示输出，正式版可结合公司合规模型和真实NC接口进一步增强。";
  var EMPTY = "本页未提供该项数字";
  var FORBIDDEN_REPLACEMENTS = [
    [/异常/g, "需关注"],
    [/违规/g, "需复核"],
    [/失控/g, "变化较大"],
    [/问责/g, "复核"],
    [/舞弊/g, "单据核查"],
    [/raw_cost/g, ""],
    [/allocated_cost/g, ""],
    [/subjectKey/g, ""],
    [/DOM/g, "页面"],
    [/hash/g, ""],
    [/token/g, ""],
    [/undefined/g, EMPTY],
    [/NaN/g, EMPTY]
  ];

  function text(value, fallback) {
    if (value == null || value === "") return fallback || EMPTY;
    return String(value);
  }

  function listText(list, fallback) {
    var rows = Array.isArray(list) ? list.filter(Boolean) : [];
    if (!rows.length) return fallback || "当前授权范围";
    if (rows.length <= 3) return rows.join("、");
    return rows.slice(0, 3).join("、") + "等" + rows.length + "个项目";
  }

  function roleLabel(context) {
    var role = context && context.role;
    return text(role && (role.dataScopeLabel || role.shortRoleName || role.roleName), "当前账号授权范围");
  }

  function modeLabel(type) {
    if (type === "checklist") return "复核建议";
    if (type === "source") return "汇报口径";
    return "本页解读";
  }

  function pageLabel(context) {
    if (context && context.projectProfile) return "项目画像";
    if (context && context.subjectCompare) return "科目横向";
    if (context && context.orgPenetration) return "组织穿透";
    if (context && context.monthAnalysis) return "月度报告";
    if (context && context.detailAnalysis) return "NC明细追溯";
    if (context && context.pageName === "source") return "口径说明";
    if (context && context.pageName === "activityDetail") return "活动详情";
    return "首页总览";
  }

  function metrics(context) {
    var data = (context && context.metrics) || {};
    return {
      total: text(data.totalCostWan, "0.00"),
      may: text(data.mayCostWan, "0.00"),
      budget: text(data.annualBudgetWan, "0.00"),
      nc: Number(data.ncCount || 0)
    };
  }

  function allowedProjectNames(context) {
    return Array.isArray(context && context.visibleProjectNames) ? context.visibleProjectNames.filter(Boolean) : [];
  }

  function removeUnauthorizedProjects(value, context) {
    var output = String(value || "");
    var role = context && context.role;
    if (!role || role.visibleProjectIds === "all") return output;
    var allowedNames = allowedProjectNames(context);
    var allNames = Array.isArray(context.allProjectNames) ? context.allProjectNames.filter(Boolean) : [];
    allNames.forEach(function (name) {
      if (allowedNames.indexOf(name) < 0 && name) {
        output = output.split(name).join("授权范围外项目");
      }
    });
    return output;
  }

  function sanitize(value, context) {
    var output = removeUnauthorizedProjects(String(value || ""), context);
    FORBIDDEN_REPLACEMENTS.forEach(function (pair) {
      output = output.replace(pair[0], pair[1]);
    });
    return output.replace(/[ \t]{2,}/g, " ").trim();
  }

  function ensureRows(rows, fallback) {
    var list = Array.isArray(rows) ? rows.filter(Boolean) : [];
    while (list.length < 1) list.push(fallback || "当前页面数据不足，建议先确认筛选范围。");
    return list.slice(0, 3);
  }

  function output(focus, basis, actions, context) {
    return {
      scope: [
        "页面：" + pageLabel(context),
        "角色：" + roleLabel(context),
        "生成类型：" + modeLabel(context && context.type)
      ].map(function (item) { return sanitize(item, context); }),
      focus: ensureRows(focus, "当前页面已按账号授权范围展示成本信息，建议结合业务排期继续核查。")
        .map(function (item) { return sanitize(item, context); }),
      basis: ensureRows(basis, "数据依据来自当前页面已展示指标，未生成新的金额或比例。")
        .map(function (item) { return sanitize(item, context); }),
      actions: ensureRows(actions, "建议沿项目画像、组织穿透、科目横向对比和NC明细继续复核。")
        .map(function (item) { return sanitize(item, context); }),
      boundary: [
        DISCLAIMER,
        FOOTER
      ].map(function (item) { return sanitize(item, context); })
    };
  }

  function homeOutput(type, context) {
    var m = metrics(context);
    var projects = listText(allowedProjectNames(context), "当前授权项目");
    return output(
      [
        "首页适合先看公司成本全景，再进入项目画像或科目横向继续穿透。",
        "5月成本与1-5月累计成本已同步展示，建议结合预算执行节奏复核。",
        "NC明细笔数可作为单据支撑入口，建议从金额靠前项目继续下钻。"
      ],
      [
        "当前授权范围为" + projects + "。",
        "1-5月累计成本为" + m.total + "万元，5月成本为" + m.may + "万元，年度预算为" + m.budget + "万元。",
        "当前可追溯NC明细为" + m.nc + "笔。"
      ],
      [
        type === "source" ? "可按首页总览、项目画像、组织穿透、科目横向对比的顺序组织汇报。" : "建议先查看成本贡献较高项目，再打开NC明细核对合同、结算和付款链路。",
        "如需解释月度变化，建议进入月度报告并结合活动月度概览复核。",
        "如需说明科目差异，建议从科目横向对比进入对应项目画像。"
      ],
      context
    );
  }

  function projectOutput(type, context) {
    var profile = context.projectProfile || {};
    var activity = profile.activityAxis || {};
    var topSubjects = Array.isArray(profile.topSubjects) ? profile.topSubjects.slice(0, 3) : [];
    var subjectBasis = topSubjects.length
      ? topSubjects.map(function (item) {
          return text(item.name, "重点科目") + "5月成本" + text(item.currentMonthCostWan, EMPTY) + "万元";
        }).join("；")
      : "本页未提供Top科目数字";
    return output(
      [
        text(profile.projectName, "当前项目") + "已形成项目画像，可从预算执行、科目结构和活动解释三个方向复核。",
        topSubjects.length ? "Top科目适合作为项目汇报中的重点说明线索。" : "当前项目Top科目信息不足，建议先确认筛选范围。",
        activity.activityCount ? "活动月度概览可解释部分成本变化，建议与NC直接归集明细一起查看。" : "活动解释数据较少，建议以科目和NC明细为主。"
      ],
      [
        "累计成本为" + text(profile.totalCostWan, EMPTY) + "万元，5月成本为" + text(profile.mayCostWan, EMPTY) + "万元，预算执行率为" + text(profile.budgetRate, EMPTY) + "。",
        "重点科目依据：" + subjectBasis + "。",
        activity.activityCount ? "本页展示专项活动" + activity.activityCount + "个，成本较高活动为" + text(activity.topActivityName, "当前活动") + "。" : "本页未提供专项活动数量。"
      ],
      [
        type === "checklist" ? "建议按预算执行、Top科目、活动解释、NC明细四项形成复核清单。" : "建议先打开Top科目的NC明细，再结合活动详情核对供应商、合同、结算和付款。",
        "如需横向比较，可跳转科目横向对比并锁定当前科目。",
        "汇报时建议使用“变化较大、建议核查、执行偏低”等管理化表达。"
      ],
      context
    );
  }

  function subjectOutput(type, context) {
    var subject = context.subjectCompare || {};
    return output(
      [
        text(subject.subjectName, "当前科目") + "适合用于横向比较不同项目的金额分布和单价水平。",
        "金额集中度和项目差异建议结合项目规模、活动排期和服务标准解释。",
        text(subject.selectedProjectName, "当前选中项目") + "可继续进入项目画像或NC明细复核。"
      ],
      [
        "本期合计为" + text(subject.currentTotalWan, EMPTY) + "万元，累计合计为" + text(subject.cumulativeTotalWan, EMPTY) + "万元。",
        "金额靠前项目为" + text(subject.topAmountProject, EMPTY) + "，最近两月变化靠前项目为" + text(subject.topDeltaProject, EMPTY) + "。",
        subject.relatedActivityCount ? "关联活动" + subject.relatedActivityCount + "个，成本较高活动为" + text(subject.relatedTopActivityName, EMPTY) + "。" : "本页未提供关联活动数量。"
      ],
      [
        type === "source" ? "建议将该页作为“指标穿透”汇报入口，先说明科目口径，再说明项目差异。" : "建议点击金额靠前项目，查看项目画像和对应NC明细。",
        "如单价水平差异较大，建议结合服务量、合同清单和结算范围复核。",
        "如需要解释活动影响，建议进入活动详情抽屉查看活动NC明细。"
      ],
      context
    );
  }

  function orgOutput(type, context) {
    var org = context.orgPenetration || {};
    var m = metrics(context);
    var focusNodes = Array.isArray(org.focusNodes) ? org.focusNodes.slice(0, 3) : [];
    return output(
      [
        "组织穿透适合从公司、项目、成本性质、科目逐级定位成本集中位置。",
        "当前节点为" + text(org.selectedProjectName, "公司全景") + "，建议沿高金额节点继续下钻。",
        focusNodes.length ? "需关注节点已按页面排序展示，可作为复核入口。" : "当前范围未提供重点节点清单。"
      ],
      [
        "累计成本为" + m.total + "万元，5月成本为" + m.may + "万元。",
        "当前可追溯NC明细为" + m.nc + "笔。",
        focusNodes.length ? "节点依据：" + focusNodes.map(function (node) { return text(node.title, "节点") + "：" + text(node.detail, "本页已展示说明"); }).join("；") + "。" : "本页未提供节点明细。"
      ],
      [
        type === "checklist" ? "建议按公司、项目、成本性质、科目、NC明细的顺序复核链路。" : "建议先点击成本集中节点，再进入项目画像或NC明细核对单据。",
        "如节点来自活动专项成本，建议回到项目画像查看活动月度概览。",
        "如节点来自日常基础成本，建议结合科目横向查看同类项目差异。"
      ],
      context
    );
  }

  function monthOutput(type, context) {
    var month = context.monthAnalysis || {};
    return output(
      [
        text(month.monthLabel, "当前月份") + "月度报告适合用于说明本月成本、预算执行和项目贡献。",
        text(month.topProjectName, "重点项目") + "是本页项目贡献复核的优先入口。",
        text(month.topSubjectName, "重点科目") + "适合结合活动解释和NC明细继续核查。"
      ],
      [
        "报告范围为" + text(month.scopeLabel, "当前授权范围") + "，本月总成本为" + text(month.totalWan, EMPTY) + "万元。",
        "较上月变化为" + text(month.deltaWan, EMPTY) + "万元，预算执行率为" + text(month.budgetRate, EMPTY) + "。",
        "本页明细摘要为" + text(month.detailCount, 0) + "笔，活动解释数量为" + text(month.activityCount, 0) + "个。"
      ],
      [
        type === "source" ? "建议按报告八段结构说明成本结论、预算执行、项目贡献和建议核查事项。" : "建议先查看项目贡献和科目结构，再进入NC明细摘要核对单据。",
        "打印前建议确认当前报告范围、月份和页眉页脚口径。",
        "若月度变化较大，建议结合活动排期、合同清单和入账节奏复核。"
      ],
      context
    );
  }

  function detailOutput(type, context) {
    var detail = context.detailAnalysis || {};
    return output(
      [
        "NC明细追溯页用于核对当前筛选范围内的项目、活动、科目和单据链路。",
        "七级穿透链已区分直接归集与分摊参考，建议优先查看可逐笔追溯明细。",
        "当前筛选为" + text(detail.scopeText, "当前明细范围") + "。"
      ],
      [
        "当前筛选匹配" + text(detail.recordCount, 0) + "笔NC明细，金额合计为" + text(detail.totalWan, EMPTY) + "万元。",
        "项目为" + text(detail.projectName, EMPTY) + "，月份为" + text(detail.monthLabel, EMPTY) + "，科目为" + text(detail.subjectLabel, EMPTY) + "。",
        detail.activityName ? "当前活动为" + detail.activityName + "，活动明细仅看直接归集NC。" : "当前未锁定单个活动。"
      ],
      [
        type === "checklist" ? "建议逐项核对供应商、合同、结算、付款和入账日期。" : "建议先点击七级链路节点，再打开单笔详情查看单据摘要。",
        "如存在分摊参考，建议回到活动详情查看分摊说明，不与直接归集明细混合判断。",
        "如需汇报，建议只引用本页已展示的金额和笔数。"
      ],
      context
    );
  }

  function sourceOutput(type, context) {
    var m = metrics(context);
    return output(
      [
        "口径说明页适合用于统一展示本版已实现、边界、数据口径和后续路线。",
        "AI助手仅提供经营复核参考，不替代人工判断。",
        "数据穿透仍以页面已展示口径和NC原始数据为准。"
      ],
      [
        "当前授权范围为" + listText(allowedProjectNames(context), "当前项目") + "。",
        "当前可追溯NC明细为" + m.nc + "笔。",
        "累计成本为" + m.total + "万元，5月成本为" + m.may + "万元。"
      ],
      [
        "建议将口径说明作为答辩时的边界页，避免把演示助手表述为正式系统结论。",
        "如需复核金额，建议回到首页、月报或NC明细追溯页。",
        "如需说明后续路线，可强调真实NC接口和公司合规模型属于后续建设。"
      ],
      context
    );
  }

  function generate(type, context) {
    context = context || {};
    context.type = type || "overview";
    if (context.projectProfile) return projectOutput(type, context);
    if (context.subjectCompare) return subjectOutput(type, context);
    if (context.orgPenetration) return orgOutput(type, context);
    if (context.monthAnalysis) return monthOutput(type, context);
    if (context.detailAnalysis) return detailOutput(type, context);
    if (context.pageName === "source") return sourceOutput(type, context);
    return homeOutput(type, context);
  }

  global.V13AI = {
    generate: generate
  };
})(typeof window !== "undefined" ? window : globalThis);
