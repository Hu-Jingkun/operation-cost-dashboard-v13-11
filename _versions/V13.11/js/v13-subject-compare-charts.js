(function (global) {
  "use strict";

  function h(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function moneyWanShort(value) {
    var wan = Number(value || 0) / 10000;
    if (wan >= 1000) return (wan / 1000).toLocaleString("zh-CN", { maximumFractionDigits: 1 }) + "千万";
    return wan.toLocaleString("zh-CN", { maximumFractionDigits: wan >= 100 ? 0 : 1 }) + "万";
  }

  function pct(value) {
    return (Number(value || 0) * 100).toLocaleString("zh-CN", { maximumFractionDigits: 1 }) + "%";
  }

  function signedMoney(value) {
    var num = Number(value || 0);
    if (num > 0) return "+" + moneyWanShort(num);
    if (num < 0) return "-" + moneyWanShort(Math.abs(num));
    return "持平";
  }

  function trendClass(value) {
    if (value > 0) return "is-up";
    if (value < 0) return "is-down";
    return "is-flat";
  }

  function projectName(row) {
    return (row.project && (row.project.shortName || row.project.fullName)) || row.projectName || "";
  }

  function splitLabel(text, maxFirst, maxSecond) {
    var value = String(text || "");
    if (value.length <= maxFirst) return [value];
    return [value.slice(0, maxFirst), value.slice(maxFirst, maxFirst + maxSecond)];
  }

  function wrapLabel(text, chunkSize) {
    var value = String(text || "");
    var size = Math.max(1, Number(chunkSize || 6));
    var lines = [];
    for (var index = 0; index < value.length; index += size) {
      lines.push(value.slice(index, index + size));
    }
    return lines.length ? lines : [""];
  }

  function labelTspans(lines, x, y, className, anchor) {
    return "<text class=\"" + className + "\" x=\"" + x.toFixed(1) + "\" y=\"" + y.toFixed(1) + "\" text-anchor=\"" + (anchor || "middle") + "\">"
      + lines.map(function (line, index) {
        return "<tspan x=\"" + x.toFixed(1) + "\" dy=\"" + (index === 0 ? 0 : 13) + "\">" + h(line) + "</tspan>";
      }).join("")
      + "</text>";
  }

  function pareto(rows, options) {
    var list = Array.isArray(rows) ? rows.slice(0, 14) : [];
    if (!list.length) return "<div class=\"subject-chart-empty\">当前科目暂无可展示项目金额。</div>";
    var selectedProjectId = options && options.selectedProjectId;
    var focusSet = new Set((options && options.focusProjectIds) || []);
    var width = 1240;
    var height = 392;
    var pad = { left: 74, right: 72, top: 48, bottom: 116 };
    var chartW = width - pad.left - pad.right;
    var chartH = height - pad.top - pad.bottom;
    var total = list.reduce(function (sum, row) { return sum + Number(row.currentMonthAmount || 0); }, 0);
    var max = Math.max.apply(null, list.map(function (row) { return Number(row.currentMonthAmount || 0); }).concat([1]));
    var step = chartW / Math.max(1, list.length);
    var barW = Math.max(20, Math.min(38, step * 0.5));
    var points = [];
    var pivotIndex = list.findIndex(function (row) { return Number(row.cumulativeShare || 0) >= 0.8; });
    if (pivotIndex < 0) pivotIndex = list.length - 1;
    var labelIndexes = new Set([0, pivotIndex, list.length - 1]);
    var top80Ids = list.slice(0, pivotIndex + 1).map(function (row) { return row.projectId; }).filter(Boolean);

    var bars = list.map(function (row, index) {
      var value = Number(row.currentMonthAmount || 0);
      var share = Math.max(0, Math.min(1, Number(row.cumulativeShare || 0)));
      var x = pad.left + index * step + step / 2;
      var barH = (value / max) * chartH;
      var y = pad.top + chartH - barH;
      var pointY = pad.top + chartH - Math.min(1, share) * chartH;
      var delta = Number(row.delta || 0);
      var projectId = row.projectId || "";
      var selected = projectId && projectId === selectedProjectId;
      var focused = focusSet.has(projectId) || index <= pivotIndex;
      var top80Class = index <= pivotIndex ? "is-top80" : "";
      points.push([x, pointY]);
      var amountInside = barH > 42;
      var amountY = amountInside ? y + 17 : Math.max(18, y - 7);
      var showLabel = true;
      var showAmount = true;
      var label = showLabel ? labelTspans(wrapLabel(projectName(row), 5), x, pad.top + chartH + 30, "pareto-label") : "";
      var amountLabel = showAmount
        ? "  <text class=\"pareto-value " + (amountInside ? "is-inside" : "") + "\" x=\"" + x.toFixed(1) + "\" y=\"" + amountY.toFixed(1) + "\" text-anchor=\"middle\">" + h(moneyWanShort(value)) + "</text>"
        : "";
      var hitX = Math.max(pad.left, x - Math.max(44, barW + 12) / 2);
      var hitW = Math.min(width - pad.right - hitX, Math.max(44, barW + 12));
      return [
        "<g class=\"pareto-bar-group " + (selected ? "is-selected" : "") + " " + (focused ? "is-focus" : "") + " " + top80Class + "\" data-action=\"subject-select-project\" data-project=\"" + h(projectId) + "\" tabindex=\"0\" role=\"button\" aria-label=\"" + h(projectName(row)) + "项目科目金额\">",
        "  <title>" + h(projectName(row) + "｜金额" + moneyWanShort(value) + "｜环比" + signedMoney(delta) + "｜NC " + (row.ncCount || 0) + "笔｜点击查看项目科目分析") + "</title>",
        "  <rect class=\"pareto-hit-area\" x=\"" + hitX.toFixed(1) + "\" y=\"" + (pad.top - 8).toFixed(1) + "\" width=\"" + hitW.toFixed(1) + "\" height=\"" + (chartH + pad.bottom - 8).toFixed(1) + "\" rx=\"8\" />",
        "  <rect class=\"pareto-bar " + trendClass(delta) + "\" x=\"" + (x - barW / 2).toFixed(1) + "\" y=\"" + y.toFixed(1) + "\" width=\"" + barW.toFixed(1) + "\" height=\"" + Math.max(2, barH).toFixed(1) + "\" rx=\"5\" />",
        amountLabel,
        label,
        "</g>"
      ].join("");
    }).join("");

    var line = points.map(function (point) { return point[0].toFixed(1) + "," + point[1].toFixed(1); }).join(" ");
    var refY = pad.top + chartH - chartH * 0.8;
    var markers = points.map(function (point, index) {
      if (!labelIndexes.has(index)) return "";
      var share = list[index] ? list[index].cumulativeShare : 0;
      var yOffset = index === pivotIndex ? -13 : 19;
      return [
        "<g class=\"pareto-marker\">",
        "  <circle class=\"pareto-point\" cx=\"" + point[0].toFixed(1) + "\" cy=\"" + point[1].toFixed(1) + "\" r=\"4\" />",
        "  <text class=\"pareto-share\" x=\"" + point[0].toFixed(1) + "\" y=\"" + (point[1] + yOffset).toFixed(1) + "\" text-anchor=\"middle\">" + h(pct(share)) + "</text>",
        "</g>"
      ].join("");
    }).join("");
    var pivotX = points[pivotIndex] ? points[pivotIndex][0] : width - pad.right;
    var pivotShare = list[pivotIndex] ? Number(list[pivotIndex].cumulativeShare || 0) : 0;
    var bandX = pad.left;
    var bandW = Math.max(0, Math.min(width - pad.right - bandX, pivotX - bandX + step * 0.46));
    var refCardW = 190;
    var refCardH = 42;
    var refCardX = Math.min(width - pad.right - refCardW, Math.max(pad.left + 10, pivotX - refCardW / 2));
    var refCardY = 10;

    return [
      "<div class=\"subject-chart-frame\">",
      "<svg class=\"subject-pareto-svg\" viewBox=\"0 0 " + width + " " + height + "\" role=\"img\" aria-label=\"" + h((options && options.title) || "金额集中度") + "\">",
      "  <rect class=\"pareto-top80-band\" x=\"" + bandX.toFixed(1) + "\" y=\"" + pad.top + "\" width=\"" + bandW.toFixed(1) + "\" height=\"" + chartH + "\" rx=\"14\" />",
      "  <line class=\"chart-axis\" x1=\"" + pad.left + "\" y1=\"" + (pad.top + chartH) + "\" x2=\"" + (width - pad.right) + "\" y2=\"" + (pad.top + chartH) + "\" />",
      "  <line class=\"chart-axis\" x1=\"" + pad.left + "\" y1=\"" + pad.top + "\" x2=\"" + pad.left + "\" y2=\"" + (pad.top + chartH) + "\" />",
      "  <text class=\"axis-label\" x=\"16\" y=\"" + (pad.top + 8) + "\">金额</text>",
      "  <line class=\"pareto-ref\" x1=\"" + pad.left + "\" y1=\"" + refY.toFixed(1) + "\" x2=\"" + (width - pad.right) + "\" y2=\"" + refY.toFixed(1) + "\" />",
      "  <g class=\"pareto-ref-action\" data-action=\"subject-focus-top80\" data-project-ids=\"" + h(top80Ids.join(",")) + "\" tabindex=\"0\" role=\"button\" aria-label=\"前" + (pivotIndex + 1) + "个项目覆盖80%成本\">",
      "    <rect x=\"" + refCardX.toFixed(1) + "\" y=\"" + refCardY.toFixed(1) + "\" width=\"" + refCardW + "\" height=\"" + refCardH + "\" rx=\"9\" />",
      "    <text class=\"pareto-ref-card-label\" x=\"" + (refCardX + 12).toFixed(1) + "\" y=\"" + (refCardY + 17).toFixed(1) + "\" text-anchor=\"start\"><tspan class=\"pareto-ref-title\">80%参考线</tspan><tspan class=\"pareto-ref-sub\" x=\"" + (refCardX + 12).toFixed(1) + "\" dy=\"17\">前" + (pivotIndex + 1) + "项约" + h(pct(pivotShare)) + "成本</tspan></text>",
      "    <text class=\"pareto-ref-label\" x=\"" + Math.min(width - pad.right - 82, Math.max(pad.left + 88, pivotX)).toFixed(1) + "\" y=\"" + (refY - 12).toFixed(1) + "\" text-anchor=\"middle\">80%参考线</text>",
      "  </g>",
      bars,
      "  <polyline class=\"pareto-line\" points=\"" + line + "\" />",
      markers,
      "</svg>",
      "</div>"
    ].join("");
  }

  function unitBenchmark(rows, baseline, unit, options) {
    var list = Array.isArray(rows) ? rows.filter(function (row) { return row.quantity > 0 && row.unitPrice > 0; }).slice(0, 14) : [];
    if (!list.length) return "<div class=\"subject-chart-empty\">当前科目暂无可用于单价水平对比的数量数据。</div>";
    var selectedProjectId = options && options.selectedProjectId;
    var width = 900;
    var rowH = 84;
    var height = Math.max(760, list.length * rowH + 110);
    var pad = { left: 126, right: 238, top: 58, bottom: 32 };
    var valueX = width - 214;
    var statusX = width - 18;
    var chartW = valueX - pad.left - 22;
    var max = Math.max.apply(null, list.map(function (row) { return Number(row.unitPrice || 0); }).concat([Number(baseline || 0), 1]));
    var baselineX = pad.left + (Number(baseline || 0) / max) * chartW;
    var bars = list.map(function (row, index) {
      var y = pad.top + index * rowH;
      var w = Math.max(3, (Number(row.unitPrice || 0) / max) * chartW);
      var high = Number(row.unitPrice || 0) >= Number(baseline || 0);
      var projectId = row.projectId || "";
      var selected = projectId && projectId === selectedProjectId;
      var labelLines = splitLabel(projectName(row), 6, 8);
      return [
        "<g class=\"unit-row " + (selected ? "is-selected" : "") + "\" data-action=\"subject-select-project\" data-project=\"" + h(projectId) + "\" tabindex=\"0\" role=\"button\" aria-label=\"" + h(projectName(row)) + "单价水平对比\">",
        "  <title>" + h(projectName(row) + "｜单价" + row.unitPrice.toLocaleString("zh-CN", { maximumFractionDigits: 1 }) + "元/" + (row.unit || unit || "单位") + "｜数量" + row.quantity.toLocaleString("zh-CN", { maximumFractionDigits: 1 }) + (row.unit || unit || "单位") + "｜点击查看项目科目分析") + "</title>",
        "  <rect class=\"unit-hit-area\" x=\"0\" y=\"" + (y - 5) + "\" width=\"" + width + "\" height=\"44\" rx=\"8\" />",
        labelTspans(labelLines, pad.left - 14, y + 19, "unit-project", "end"),
        "  <rect class=\"unit-bar " + (high ? "is-high" : "is-low") + "\" x=\"" + pad.left + "\" y=\"" + (y + 6) + "\" width=\"" + w.toFixed(1) + "\" height=\"24\" rx=\"5\" />",
        "  <text class=\"unit-value\" x=\"" + valueX.toFixed(1) + "\" y=\"" + (y + 23) + "\">" + h(row.unitPrice.toLocaleString("zh-CN", { maximumFractionDigits: 1 })) + "元/" + h(row.unit || unit || "单位") + "</text>",
        "  <text class=\"unit-status " + (high ? "is-high" : "is-low") + "\" x=\"" + statusX.toFixed(1) + "\" y=\"" + (y + 23) + "\" text-anchor=\"end\">" + (high ? "高于中位水平" : "低于中位水平") + "</text>",
        "</g>"
      ].join("");
    }).join("");
    var prices = list.map(function (row) { return row.unitPrice; }).sort(function (a, b) { return a - b; });
    var min = prices[0];
    var maxValue = prices[prices.length - 1];
    var spread = Number(maxValue || 0) - Number(min || 0);
    return [
      "<div class=\"subject-chart-frame\">",
      "<svg class=\"subject-unit-svg\" viewBox=\"0 0 " + width + " " + height + "\" role=\"img\" aria-label=\"单价水平对比\">",
      "  <text class=\"unit-baseline-label\" x=\"" + pad.left + "\" y=\"24\">中位水平参考线 " + h(Number(baseline || 0).toLocaleString("zh-CN", { maximumFractionDigits: 1 })) + "元/" + h(unit || "单位") + "</text>",
      "  <text class=\"unit-range-label\" x=\"" + (width - pad.right).toFixed(1) + "\" y=\"24\" text-anchor=\"end\">最低 " + h(Number(min || 0).toLocaleString("zh-CN", { maximumFractionDigits: 1 })) + " / 最高 " + h(Number(maxValue || 0).toLocaleString("zh-CN", { maximumFractionDigits: 1 })) + " / 极差 " + h(spread.toLocaleString("zh-CN", { maximumFractionDigits: 1 })) + "元/" + h(unit || "单位") + "</text>",
      "  <line class=\"chart-axis\" x1=\"" + pad.left + "\" y1=\"" + (height - pad.bottom) + "\" x2=\"" + (width - pad.right) + "\" y2=\"" + (height - pad.bottom) + "\" />",
      "  <line class=\"unit-baseline\" x1=\"" + baselineX.toFixed(1) + "\" y1=\"36\" x2=\"" + baselineX.toFixed(1) + "\" y2=\"" + (height - pad.bottom) + "\" />",
      bars,
      "</svg>",
      "</div>"
    ].join("");
  }

  global.V134SubjectCharts = {
    pareto: pareto,
    unitBenchmark: unitBenchmark
  };
})(typeof window !== "undefined" ? window : globalThis);
