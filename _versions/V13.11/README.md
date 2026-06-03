# V13.10 最终收尾版

本版本从 V13.9.9 复制生成，用于 V13 Final Candidate 前的最后收尾审核。

## 本轮收口

- 精确删除 5 处旧 `state.view === "project"` 死分支。
- 修正 project 残留扫描报告和 P0-B 调用图报告中的控制字符、转义显示和错误结论。
- 重新生成 V13.10 最终审计、截图、打印态、权限、AI 和 zip-validation。

## 版本边界

- 不修改 `_data/current` 五个主数据 JS 文件。
- 不修改 `00-core.js`、`v13-ai.js`、`v13-bridge.js`。
- 不修改 AI 助手结构化输出、安全边界、脱敏逻辑和越权过滤逻辑。
- 不修改页面配色、布局、导航、动效。
- 不新增页面、入口、按钮或第三方库。
- 保留 `LEGACY_PROJECT_HASH = "project"` 旧 hash 兼容逻辑。

## 本地运行

在本版本目录启动静态服务后访问：

`http://127.0.0.1:{port}/`

当前 V13.10 验证服务使用：

`http://127.0.0.1:43133/`

## 审核材料

V13.10 审核材料位于：

- `_output/V13.10/reports/`
- `_output/V13.10/screenshots/final/`
- `_output/V13.10/print/`

最终审核包为项目根目录下的 `V13.10_REVIEW_PACKAGE.zip`。
