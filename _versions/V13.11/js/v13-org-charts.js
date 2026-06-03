(function (global) {
  "use strict";

  const COLORS = ["#123B6D", "#2F6F9F", "#E87722", "#6BA292", "#A66F45", "#7B6CA8", "#8B98A8", "#C6A45B"];

  function h(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function money(value) {
    const wan = Number(value || 0) / 10000;
    return wan.toLocaleString("zh-CN", { minimumFractionDigits: wan >= 100 ? 0 : 1, maximumFractionDigits: 1 }) + "万元";
  }

  function percent(value) {
    if (!Number.isFinite(Number(value))) return "-";
    return (Number(value || 0) * 100).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  }

  function barList(items = [], options = {}) {
    const rows = items.filter((item) => Number(item.value || 0) > 0).slice(0, options.limit || 8);
    if (!rows.length) return `<div class="org-chart-empty">暂无可展示数据</div>`;
    const max = Math.max(...rows.map((item) => Number(item.value || 0)), 1);
    const total = Number(options.total || rows.reduce((sum, item) => sum + Number(item.value || 0), 0)) || 1;
    return `
      <div class="org-svg-card" role="img" aria-label="${h(options.title || "横向条形图")}">
        ${rows.map((item, index) => {
          const value = Number(item.value || 0);
          const width = Math.max(3, (value / max) * 100);
          const share = value / total;
          const color = item.color || COLORS[index % COLORS.length];
          return `
            <div class="org-bar-row">
              <div class="org-bar-label" title="${h(item.label)}">${h(item.label)}</div>
              <div class="org-bar-track">
                <span class="org-bar-fill" style="width:${width.toFixed(2)}%;background:${color}"></span>
              </div>
              <div class="org-bar-value"><strong>${h(item.displayValue || money(value))}</strong><span>${h(item.displayShare || percent(share))}</span></div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function changeBars(items = [], options = {}) {
    const rows = items.filter((item) => Number(item.absValue || 0) > 0).slice(0, options.limit || 8);
    if (!rows.length) return `<div class="org-chart-empty">暂无明显变化</div>`;
    const max = Math.max(...rows.map((item) => Number(item.absValue || 0)), 1);
    return `
      <div class="org-change-chart" role="img" aria-label="${h(options.title || "环比变化条形图")}">
        ${rows.map((item, index) => {
          const width = Math.max(4, (Number(item.absValue || 0) / max) * 100);
          const positive = Number(item.value || 0) >= 0;
          return `
            <div class="org-change-row">
              <div class="org-change-label">${h(item.label)}</div>
              <div class="org-change-track">
                <span class="org-change-fill ${positive ? "is-up" : "is-down"}" style="width:${width.toFixed(2)}%"></span>
              </div>
              <div class="org-change-value">${positive ? "+" : "-"}${h(money(Math.abs(Number(item.value || 0))))}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function distribution(items = []) {
    const total = Math.max(1, items.reduce((sum, item) => sum + Number(item.count || 0), 0));
    return `
      <div class="org-distribution">
        ${items.map((item, index) => {
          const count = Number(item.count || 0);
          const width = Math.max(count ? 4 : 0, (count / total) * 100);
          return `
            <div class="org-dist-row">
              <span class="org-dist-dot" style="background:${COLORS[index % COLORS.length]}"></span>
              <span>${h(item.label)}</span>
              <strong>${count}个</strong>
              <div class="org-dist-track"><i style="width:${width.toFixed(2)}%;background:${COLORS[index % COLORS.length]}"></i></div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  global.V133OrgCharts = {
    barList,
    changeBars,
    distribution,
    money,
    percent,
  };
})(typeof window !== "undefined" ? window : globalThis);
