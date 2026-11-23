# Financial Intelligence Lab V2

面向《科学计算与 MATLAB 应用》课程的本地交互网站。实验室入口、群体公平性审计、假设成本与委员会审议共享同一套 MATLAB V3 冻结测试结果和阈值状态。

## 在线观看

[Financial Intelligence Lab 公开入口](https://xjw-2105.github.io/financial-intelligence-lab/) · 本包代码版号 2.0.0，实验数据版号 MATLAB V3。线上发布状态见 `evidence/pages-deployment.log`。

入口的三步实验可直接跳到公平性审计与成本审议。顶部“演示模式”放大主要数值和中文说明。展开“九组模型与特征对照”比较各配置自己的 FPR10 冻结点。

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

启动生产静态服务后，在另一终端运行 `npm run test:browser`。它使用本机 Chrome，阻断页面外部请求，重现浏览器验证与截图。如需覆盖 Chrome 路径或端口，使用 `CHROME_PATH`、`FIL_TEST_URL`。浏览器测试覆盖 1440×900、1366×768 和 390px 手机布局，默认在 `evidence/screenshots/` 写入实际截图。

## 数据和方法

- MATLAB R2025b 原生读取九份 V3 冻结 `*_test.csv` 和同批次 `performance.csv`。每组选用相同的 50,000 条留出案例（时间周 83–91、正类 1,054），浏览器仅回放聚合计数。正类表示后续违约，判类规则为分数 ≥ 阈值。网页不会训练模型或访问单笔预测。
- 本机原生导出的 9,026 个配置与阈值组合，覆盖整体、F/M 和四个操作性年龄组，共 126,364 项 TP/FP 整数比对全部一致。冻结 FPR10 的四格计数也独立与 `performance.csv` 及随附对账表核对。FPR10 是在验证集按 FPR ≤ 10% 的目标确定的冻结点。网页显示当前阈值在测试集的实际 FPR。
- Full 随机森林的冻结阈值为 0.065698354074301，TP 333、FP 4,188、TN 44,758、FN 721。ROC-AUC 约 0.737593，AP 约 0.070478，二者由原实验提供并独立于当前阈值。
- Sex F/M 是匿名字段。年龄切换保留原操作性年龄档，年龄差距按 60–100 减 18–29 展示。性别差距为 M 减 F。差距单位为百分点。
- 默认 FP 为 1、FN 为 3 个假设单位/次。Full 随机森林当前模拟成本 6,351，全低风险基线 3,162，差额 +3,189。单价改变时重新计算情景，课程委员会结论保持“暂缓独立上岗，继续监督测试”。

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

`public/data/export_manifest.json` 记录上线产物的原生哈希、字节数及核验规模。发布同一批数据时，预构建 `dist/data/` 与 `public/data/` 保持一致。

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

运行 `npm ci` 和 `npm run build` 后，用 GitHub Pages 工作流将 `dist/` 作为静态部署产物。使用分支发布时也可将 `dist/` 的内容放在发布分支根目录，加入空的 `.nojekyll`，在 Settings → Pages 选择该分支及根目录。Vite 使用相对资源路径，可部署在 GitHub Pages 的仓库子路径。在线仓库当前从 `main` 根目录提供静态产物。

部署后以新浏览器会话访问入口、`#audit` 和 `#committee`，核对默认矩阵和成本基线。静态产物包含已获准公开的聚合数据，逐笔 CSV 保留在本机。

## 边界与下一轮

建议在教室设备上复核实际投影的字号、色彩对比和网络。学术上优先补齐时间成熟期、客户级隔离与真实成本口径，当前展示的假设成本和群体差距都属于既有留出测试的复核。详细验收范围见 `evidence/README.md`。
