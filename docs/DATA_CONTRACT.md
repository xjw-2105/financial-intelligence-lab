# 数据合同（原型版 v0.1）

## 1. 根本原则

Web 端**不重训模型**。它只按冻结 MATLAB 输出，应用新的分类阈值并计算混淆矩阵及其派生公平性指标。正式版的计算结果必须与 MATLAB 逐配置对账。

## 2. 本交付 JSON 结构

```ts
type GroupStats = {
  n: number;
  positive: number;
  negative: number;
  TP: number[];
  FP: number[];
};

type FrozenRun = {
  model: 'Logistic' | 'KNN' | 'RandomForest';
  featureSet: 'Basic' | 'Enhanced' | 'Full';
  sourceFile: string; // 来源说明，不代表网页中可读取此文件
  nCases: number;
  positives: number;
  negativeCases: number;
  thresholds: number[]; // 有序，索引对齐所有 TP、FP 数组
  frozenThresholds: { FPR10: number; F1: number };
  frozenMetrics: { rocAuc: number; averagePrecision: number; recall: number; fpr: number };
  groups: Record<string, GroupStats>;
};

type Dataset = {
  schemaVersion: string;
  dataType: string;
  source: string;
  provenance: string;
  scoreRule: string;
  dimensions: { sex: string[]; operationalAge: string[] };
  runs: Record<string, FrozenRun>;
};
```

`runs` 九个键：`Basic_Logistic`、`Basic_KNN`、`Basic_RandomForest`、`Enhanced_*`、`Full_*`。`groups` 使用 `All`、`sex:F`、`sex:M`、`age:18-29`、`age:30-44`、`age:45-59`、`age:60-100`。

## 3. 严格计算规则

采用 `score >= threshold`，正类表示 **target=1：后续违约标签**。

```ts
const TP = group.TP[index];
const FP = group.FP[index];
const FN = group.positive - TP;
const TN = group.negative - FP;
const fpr = group.negative ? FP / group.negative : null;
const fnr = group.positive ? FN / group.positive : null;
const tpr = group.positive ? TP / group.positive : null;
const precision = TP + FP ? TP / (TP + FP) : null;
const balanceAccuracy = (tpr !== null && fpr !== null) ? (tpr + 1 - fpr) / 2 : null;
```

- 若分母为 0，显示“不可计算”，禁止输出 0%。
- FPR/FNR 群体差异用**百分点**：`100 * (M - F)`，并显示符号；另外可显示绝对值。不要将百分比误写成百分点。
- 累计计数在阈值升高时只能保持不变或下降。不能用连续动画插值得到并不存在的整数案例数。
- 阈值可用按钮/键盘精确选择。输入任意非网格数值时，显示最近的**可计算阈值**以及四舍五入提示；**不得**声称插值统计值精确。
- 切换模型或特征组必须恢复该配置自己的冻结 FPR10 阈值，不允许跨算法共享一个绝对数值阈值或统一说它是“违约概率”。
- ROC-AUC 和 AP 属于模型排序指标，**不随阈值移动**；不能让它们跟着滑块变化。
- 特征组与模型间的比较均是 V3 同一 50,000 条留出测试数据；性别与操作性年龄属于**两个独立分组视角**，不能把二者当作互斥群体合计。

## 4. 成本情景（不是银行真实金额）

`Cost = FP * Cost_FP + FN * Cost_FN`

- 输入成本默认使用**假设成本单位/次**，例如 1 单位、3 单位；除非用户决定具体币种和经证据支持的来源，不显示“万元真实损失”。
- 可显示“本 50,000 条测试案例的假设成本”及“每 1,000 案例成本”，但应标注只是一组离线回放样本的模拟结果。
- 成本滑块只改变成本结果，不改变 ROC-AUC/AP、模型分数或分类预测。
- 可选择不同模型及阈值对比成本，但**不能**将其表述成已估计真实金融机构的利润或拒贷率。

## 5. QA 与 MATLAB 同一阈值结果

`v3_aggregate_qa.csv` 比对九组冻结 FPR10 阈值下的 TP/FP/TN/FN，所有 9 组均通过。特别是 `Full_RandomForest`：

- 冻结阈值：0.065698354074301（**不是**统一的 6.57% 违约概率）
- 总数 50,000，正类 1,054。
- TP = 333，FP = 4,188，TN = 44,758，FN = 721。
- ROC-AUC ≈ 0.737593，AP ≈ 0.070478。

正式版本：Codex 应在 MATLAB 中直接生成新聚合 JSON，核对全部9组阈值结果、若干离散阈值端点和随机挑选的格点；再使用 TypeScript 独立复算对照。保留导出 MATLAB `.m` 代码、日志、数据哈希和 TS 单测。

## 6. 研究资料边界

- `sex:F/M` 是匿名化数据字段标签，不能推断为法律身份。
- `age:*` 是按提供日期计算的**操作性年龄层级**；不能声称已经验证人口学真实年龄。
- 年龄和性别之外的收入类别当前**未纳入交互数据**；不要虚构分类或显示模拟分组。
- 只凭本数据不可能证明“模型歧视的因果原因”，也不能把预测高风险直接等同真实拒贷。
- V3.1 仅是开发验证集的训练充分性与特征增量对照，不能无标注地混入 V3 测试集指标。
- 本数据不含实时更新的 Bootstrap 区间；若展示，必须给出其固定阈值和实验设置，不能伪装为随阈值变化的统计推断。
