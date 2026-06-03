(function (global) {
  "use strict";

  const COLORS = {
    固定成本: "#1F3A6E",
    变动成本: "#3F789E",
    管理费用: "#E87722",
    销售费用: "#6BA292",
    税金: "#A66F45",
    财务费用: "#7B6CA8",
    其他: "#8B98A8",
  };

  function h(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmt(value) {
    const wan = Number(value || 0) / 10000;
    return wan.toLocaleString("zh-CN", { minimumFractionDigits: wan >= 100 ? 0 : 1, maximumFractionDigits: 1 }) + "万元";
  }

  function pct(value) {
    return ((Number(value || 0)) * 100).toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  }

  function polar(cx, cy, r, angle) {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(cx, cy, outer, inner, start, end) {
    const large = end - start > 180 ? 1 : 0;
    const p1 = polar(cx, cy, outer, start);
    const p2 = polar(cx, cy, outer, end);
    const p3 = polar(cx, cy, inner, end);
    const p4 = polar(cx, cy, inner, start);
    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `A ${outer} ${outer} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `A ${inner} ${inner} 0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
      "Z",
    ].join(" ");
  }

  function rows(items) {
    return items.filter((item) => Number(item.value || 0) > 0);
  }

  function donut(items, total, options = {}) {
    const data = rows(items);
    const zeroLabels = (items || [])
      .filter((item) => Number(item.value || 0) === 0)
      .map((item) => item.label)
      .filter(Boolean);
    const zeroNote = zeroLabels.length
      ? `<div class="profile-chart-note zero-cost-note">${zeroLabels.map(h).join("、")}本期为0，未在图中显示。</div>`
      : "";
    if (!data.length || !total) {
      return `<div class="profile-chart-empty">暂无可展示成本结构</div>${zeroNote}`;
    }
    let cursor = 0;
    const filterableLabels = new Set(["固定成本", "变动成本", "管理费用"]);
    const slices = data.map((item) => {
      const angle = Math.max(0.01, (Number(item.value || 0) / total) * 360);
      const start = cursor;
      const end = cursor + angle;
      cursor = end;
      return { ...item, start, end };
    });
    return `
      <div class="profile-donut-wrap">
        <svg class="profile-donut" viewBox="0 0 280 220" role="img" aria-label="${h(options.title || "成本结构环形图")}">
          <g transform="translate(0 0)">
            ${slices.map((item) => `
              <path class="profile-donut-slice ${filterableLabels.has(item.label) ? "is-filterable" : ""}" ${filterableLabels.has(item.label) ? `data-action="profile-structure-filter" data-main="${h(item.label)}" tabindex="0" role="button"` : ""} d="${arcPath(110, 110, 84, 54, item.start, item.end)}" fill="${COLORS[item.label] || COLORS.其他}">
                <title>${h(item.label)} ${fmt(item.value)} ${pct(item.value / total)}${filterableLabels.has(item.label) ? "，点击筛选下方科目明细" : ""}</title>
              </path>
            `).join("")}
            <circle cx="110" cy="110" r="51" fill="#fff"></circle>
            <text x="110" y="104" text-anchor="middle" class="donut-center-label">累计成本</text>
            <text x="110" y="126" text-anchor="middle" class="donut-center-value">${h(fmt(total))}</text>
          </g>
        </svg>
        <div class="profile-chart-legend">
          ${data.map((item) => `
            <div class="legend-row ${filterableLabels.has(item.label) ? "is-filterable" : ""}" ${filterableLabels.has(item.label) ? `data-action="profile-structure-filter" data-main="${h(item.label)}" role="button" tabindex="0"` : ""}>
              <span class="legend-dot" style="background:${COLORS[item.label] || COLORS.其他}"></span>
              <span>${h(item.label)}</span>
              <strong>${h(fmt(item.value))}</strong>
              <em>${h(pct(item.value / total))}</em>
            </div>
          `).join("")}
          ${zeroNote}
        </div>
      </div>
    `;
  }

  function stackedBars(months, segments) {
    const max = Math.max(1, ...months.map((item) => Number(item.total || 0)));
    return `
      <svg class="profile-stack-chart" viewBox="0 0 720 300" role="img" aria-label="月度成本堆叠柱状图">
        <line x1="54" y1="246" x2="690" y2="246" class="chart-axis"></line>
        <line x1="54" y1="34" x2="54" y2="246" class="chart-axis"></line>
        ${[0.25, 0.5, 0.75, 1].map((rate) => {
          const y = 246 - 196 * rate;
          return `<g><line x1="54" y1="${y}" x2="690" y2="${y}" class="chart-grid"></line><text x="48" y="${y + 4}" text-anchor="end" class="chart-tick">${h(fmt(max * rate).replace("万元", ""))}</text></g>`;
        }).join("")}
        ${months.map((month, index) => {
          const x = 92 + index * 120;
          const width = 56;
          let y = 246;
          const bars = segments.map((segment) => {
            const value = Number(month[segment.key] || 0);
            const height = Math.max(value ? 2 : 0, (value / max) * 196);
            y -= height;
            return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2" fill="${COLORS[segment.label] || COLORS.其他}"><title>${h(month.label)} ${h(segment.label)} ${fmt(value)}</title></rect>`;
          }).join("");
          return `
            <g class="profile-stack-month" data-action="profile-month-report" data-project="${h(month.projectId || "")}" data-month="${h(month.month || index + 1)}">
              <title>${h(month.label)} ${fmt(month.total)}，点击查看本月成本报告</title>
              ${bars}
              <text x="${x + width / 2}" y="270" text-anchor="middle" class="chart-label">${h(month.short)}</text>
              <text x="${x + width / 2}" y="${Math.max(22, y - 8)}" text-anchor="middle" class="chart-value">${h(fmt(month.total).replace("万元", ""))}</text>
            </g>
          `;
        }).join("")}
      </svg>
      <div class="profile-chart-legend compact">
        ${segments.map((segment) => `<span><i style="background:${COLORS[segment.label] || COLORS.其他}"></i>${h(segment.label)}</span>`).join("")}
      </div>
    `;
  }

  function waterfall(steps) {
    if (!steps || steps.length < 3) {
      return `<div class="profile-chart-empty">数据不足，暂不展示环比瀑布</div>`;
    }
    const values = steps.map((step) => Math.abs(Number(step.value || 0)));
    const max = Math.max(1, ...values, Math.abs(Number(steps[0].end || steps[0].value || 0)), Math.abs(Number(steps[steps.length - 1].end || steps[steps.length - 1].value || 0)));
    const baseY = 226;
    const scale = 174 / max;
    let running = Number(steps[0].value || 0);
    return `
      <svg class="profile-waterfall-chart" viewBox="0 0 760 280" role="img" aria-label="最近两月环比瀑布图">
        <line x1="42" y1="${baseY}" x2="724" y2="${baseY}" class="chart-axis"></line>
        ${steps.map((step, index) => {
          const x = 58 + index * 108;
          const width = 62;
          let value = Number(step.value || 0);
          let start = 0;
          let end = value;
          let cls = "waterfall-total";
          if (index > 0 && index < steps.length - 1) {
            start = running;
            end = running + value;
            running = end;
            cls = value >= 0 ? "waterfall-up" : "waterfall-down";
          }
          if (index === steps.length - 1) {
            start = 0;
            end = Number(step.value || 0);
          }
          const topValue = Math.max(start, end);
          const bottomValue = Math.min(start, end);
          const y = baseY - topValue * scale;
          const height = Math.max(3, (topValue - bottomValue) * scale);
          return `
            <g>
              <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2" class="${cls}">
                <title>${h(step.label)} ${fmt(value)}</title>
              </rect>
              <text x="${x + width / 2}" y="${Math.max(22, y - 8)}" text-anchor="middle" class="chart-value">${h((value >= 0 && index > 0 && index < steps.length - 1 ? "+" : "") + fmt(value).replace("万元", ""))}</text>
              <text x="${x + width / 2}" y="252" text-anchor="middle" class="chart-label">${h(step.label)}</text>
            </g>
          `;
        }).join("")}
      </svg>
      <div class="profile-chart-note">正向增量和负向增量仅表示两月金额增减贡献，需结合活动排期和NC明细继续核查。数值含四舍五入，首尾合计可能有±0.1万元误差。</div>
    `;
  }

  global.V132Charts = {
    COLORS,
    donut,
    stackedBars,
    waterfall,
  };
})(typeof window !== "undefined" ? window : globalThis);
