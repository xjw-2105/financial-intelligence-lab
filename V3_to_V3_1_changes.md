# Financial Intelligence Lab V3.1 收尾记录

V3.1.0 聚焦课堂演示。原 V3 源码提交保存在 `v3-source-baseline`，原 V3 可运行 ZIP 完整保留，并另建 `v3.1-development` 分支。[V3 Pages 发布提交 `6ee61ce`](https://github.com/xjw-2105/financial-intelligence-lab/commit/6ee61ce571812f4dbb582e425a82bc3a11e21839)

| 变化 | 原因和验收 | 前后截图 |
| --- | --- | --- |
| 首屏群体错误方向 | 总体卡展示 FPR −2.02 个百分点与 F 组实际未违约者较高的误报率，FNR +9.57 个百分点与 M 组实际违约者较高的漏判率。左右使用同一差距计算，支持阈值联动、年龄切换和零分母提示。 | [V3](evidence/baseline/screenshots/12-1366-demo-audit.png) · [V3.1](evidence/screenshots/12-1366-demo-audit.png) · [年龄](evidence/screenshots/19-1366-demo-age.png) |
| 委员会结论速览 | 投影首屏同见固定课程建议、当前成本、全低风险基线和差额。按钮展开依据并将键盘焦点移到该处。两个成本预设仍给出 +3,189 与 −807 假设单位。 | [V3](evidence/baseline/screenshots/13-1366-demo-cost.png) · [V3.1](evidence/screenshots/13-1366-demo-cost.png) |
| 演示路径局部细调 | 从首页第二步进入即显示冻结点周围的离散阈值。已有游标超出区间时将其纳入视域。一键恢复全域，输入框的四位显示和精确数值都可复核。 | [V3](evidence/baseline/screenshots/02-full-randomforest-audit.png) · [V3.1](evidence/screenshots/24-guided-local-threshold.png) |
| 权衡图与投影字号 | 移除重叠的短划，只画一条阈值顺序路径。零差距、当前/冻结点和非帕累托说明保留。当前点以四位显示，长精度可展开。 | [V3](evidence/baseline/screenshots/13-1440-demo-cost.png) · [V3.1](evidence/screenshots/13-1440-demo-cost.png) |
| 手机首页 | 淡出雕像底部、上移辅助标签，给标题保留独立的阅读背景。 | [V3](evidence/baseline/screenshots/16-390-entrance.png) · [V3.1](evidence/screenshots/16-390-entrance.png) |
| 版本追溯 | `v3.1.0` 固定完整源码、锁文件、Pages 构建与哈希。ZIP 提供 Git bundle 可导入标签。Pages 发布包含一份版本 JSON，记录远端提交和域名核验情况的日志见 `evidence/pages-deployment.log`。 | [本地运行截图](evidence/screenshots/) · [Pages 子路径截图](evidence/pages-screenshots/) |

## 数据和边界

- 用 R2025b 从冻结分数重导出，九组与 9,026 个阈值共 126,364 项 TP/FP 和 V3 原数据完全匹配，确认 Full KNN 在阈值上相等的 50 条正例与 1,375 条负例均按高风险统计。原模型和原生聚合维持 V3 版本。
- Full 随机森林 FPR10 的 95% 周块 Bootstrap 区间只在核验过的 F/M 冻结点显示。阈值移动后的读数是样本描述，不能据此识别实际审批歧视，金额均为假设单位。
- Chrome 完成 1366×768、1440×900、390px、键盘、减少动效和无 WebGL 回归。Safari 的远程自动化尚未启用，因此未完成 Safari 实测。实际教室设备与网络未经现场检验。普通桌面入口仍有 R3F 内部的 `THREE.Clock` 弃用警告。
