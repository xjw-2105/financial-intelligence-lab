# Financial Intelligence Lab V3.1

面向《科学计算与 MATLAB 应用》课程的本地交互网站。实验室入口、群体公平性审计、假设成本与委员会审议共享同一套 MATLAB V3 冻结测试结果和阈值状态。

## 在线观看

[Financial Intelligence Lab 公开入口](https://xjw-2105.github.io/financial-intelligence-lab/) · 本包代码版号 3.1.0，实验数据版号 MATLAB V3。线上发布状态见 `evidence/pages-deployment.log`。

入口“调整阈值”打开冻结点附近的局部细调，当前阈值保持不动，选“查看全域”即可恢复完整范围。顶部“演示模式”将 TP、FP、召回率和两项错误方向同时展示，成本页首屏可直接查看固定委员会建议。展开四格矩阵可查看完整总体指标，展开九组对照可切换排序指标和性别差距。

## 离线观看

解压后在 Mac 终端进入项目根目录。预构建产物已包含在 `dist/`，使用 Python 3 启动回环 HTTP 服务。

```sh
./start-local.command
```

浏览器打开 [本地入口](http://127.0.0.1:4280/)。另用端口时执行 `./start-local.command 4281` 并打开脚本显示的地址。按 Ctrl+C 停止。

## 编辑和验证

本次使用 Node 22.16.0、npm 10.9.2、macOS arm64 和 Chrome 157.0.8103.79。首次安装构建依赖通常需要联网。

```sh
npm ci --registry=https://registry.npmjs.org
npm test
npm run dev
npm run build
```

启动生产静态服务后，在另一终端运行 `npm run test:browser`。它使用本机 Chrome，阻断页面外部请求，重现浏览器验证与截图。如需覆盖 Chrome 路径或端口，使用 `CHROME_PATH`、`FIL_TEST_URL`。浏览器测试覆盖 1440×900、1366×768 和 390px 手机布局，默认在 `evidence/screenshots/` 写入实际截图。`FIL_TEST_URL` 可使用带尾斜杠的子路径网址，用于复验 Pages 产物。

## 数据和方法

- MATLAB R2025b 原生读取九份 V3 冻结 `*_test.csv` 和同批次 `performance.csv`。每组选用相同的 50,000 条留出案例（时间周 83–91、正类 1,054），浏览器仅回放聚合计数。正类表示后续违约，判类规则为分数 ≥ 阈值。网页不会训练模型或访问单笔预测。
- 本机原生导出的 9,026 个配置与阈值组合，覆盖整体、F/M 和四个操作性年龄组，共 126,364 项 TP/FP 整数比对全部一致。冻结 FPR10 的四格计数也独立与 `performance.csv` 及随附对账表核对。FPR10 是在验证集按 FPR ≤ 10% 的目标确定的冻结点。网页显示当前阈值在测试集的实际 FPR。
- Full 随机森林的冻结阈值为 0.065698354074301，TP 333、FP 4,188、TN 44,758、FN 721。ROC-AUC 约 0.737593，AP 约 0.070478，二者由原实验提供并独立于当前阈值。
- Sex F/M 是匿名字段。年龄切换保留原操作性年龄档，年龄差距按 60–100 减 18–29 展示。性别差距为 M 减 F。差距单位为百分点。
- Full 随机森林 FPR10 性别 M − F 的普通 95% 周块 Bootstrap 区间中，FPR 为 [−2.56, −1.56]，FNR 为 [5.29, 13.75]，单位为百分点。共九个测试周块、5,000 次有效重抽。界面在该冻结点展示区间，交互阈值显示描述性差距。
- 两套单价为假设单位/次。Full 随机森林冻结点的 FP 1、FN 3 情景为 6,351 对 3,162，差额 +3,189，FP 1、FN 15 情景为 15,003 对 15,810，差额 −807。委员会固定课程建议为“暂缓独立上岗，继续监督测试”。

## MATLAB 原生再导出

使用原 V3 `results` 目录，里面应有九份 `{Basic,Enhanced,Full}_{Logistic,KNN,RandomForest}_test.csv` 和 `performance.csv`。源 CSV 不随包分发。原文件哈希见 `evidence/matlab-source-sha256.txt`。

```matlab
addpath('matlab')
export_threshold_aggregates('/your/V3/results', 'native-check.json')
```

```sh
python3 scripts/compare_exports.py evidence/reference/v3_prototype_aggregates.json native-check.json
shasum -a 256 native-check.json
```

`public/data/export_manifest.json` 记录原生哈希、字节数和对账规模。`dist/data/` 与 `public/data/` 字节一致。若同时有原研究 `src`（含 `v3_bootstrap.m` 与 `hc_metrics.m`）和 `results/bootstrap_sex_gaps.csv`，可用 `check_v3_display(resultsDir, researchSrc, fullfile(pwd, "src", "domain", "bootstrap.json"))` 再现两项区间、情景成本与真实 KNN 同分边界检查。这些步骤读取冻结分数。

## 项目结构

| 路径 | 作用 |
| --- | --- |
| `src/domain/` | 阈值索引、共享状态、指标与假设成本公式 |
| `src/views/` | 三场景、输入控件、权衡图与延迟加载 WebGL |
| `src/ui/` | 基础控件、辅助说明弹层和格式化 |
| `public/data/` | MATLAB 原生聚合、冻结对账与导出清单 |
| `public/art/` | 原创石雕图片 |
| `matlab/`、`scripts/` | 原生导出、数据比较与许可证清单生成 |
| `tests/` | 数据单测与本机 Chrome 自动化 |
| `docs/` | 启动包数据合同、产品规范及美术来源 |
| `evidence/` | 日志、启动包聚合参照、源文件哈希和浏览器截图 |
| `dist/` | 可直接本地提供的静态生产产物 |

## GitHub Pages 部署

仓库 `main` 根目录已有石雕、聚合与许可证。运行 `npm ci` 后执行 `npm run build:pages`，得到兼容该目录结构的 `dist-pages/`。Pages 构建的 `BASE_URL` 仍为 `./`，入口和新文件的哈希见 `evidence/pages-build-sha256.txt`。构建使用与本地版相同的业务源码。

V3.0 线上基线是 [Git 提交 `6ee61ce`](https://github.com/xjw-2105/financial-intelligence-lab/commit/6ee61ce571812f4dbb582e425a82bc3a11e21839)。本地 `v3-source-baseline` 指向 V3 源码，V3.1 在 `v3.1-development` 上开发。`v3.1.0` 标签固定源码、锁文件和 Pages 构建。已在仓库子路径重跑完整浏览器测试。推送与线上核验状态见 `evidence/pages-deployment.log`。

## 边界与下一轮

浏览器截图验证了目标视口的排版，实际投影设备的色彩和网络取决于现场环境。统计边界、兼容性与剩余技术限制见 `V3_to_V3_1_changes.md`，验收索引见 `evidence/README.md`。
