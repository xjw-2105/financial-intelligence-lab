import { Dialog } from 'radix-ui'
import type { ReactNode } from 'react'
import { staticAsset } from '../domain/assets'

export function Modal({ title, trigger, children }: { title: string; trigger: ReactNode; children: ReactNode }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" aria-describedby={undefined}>
          <div className="dialog-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="关闭">×</Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Method({ compact = false }: { compact?: boolean }) {
  return (
    <Modal title="方法与数据来源" trigger={<button className={compact ? 'button text-button' : 'button secondary'} type="button">{compact ? '方法与数据' : '查看研究边界'}</button>}>
      <div className="method-body">
        <section><h3>时间外留出测试</h3><p>周 83–91 的同一批 50,000 条匿名留出案例，含 1,054 条后续违约标签。网页使用 MATLAB R2025b 从主实验九组既有预测结果导出的汇总数据。9,026 个模型配置与阈值组合均已核对，九组 FPR10 基准点的四格计数均与原实验一致。</p></section>
        <section><h3>判类与可比性</h3><p>正类表示后续违约标签。分数 ≥ 当前阈值时判为预测高风险。FPR10 在验证集按 FPR ≤ 10% 的目标选点。测试集实际 FPR 由当前配置和阈值决定。分数刻度因模型而异，网页展示主实验结果。</p></section>
        <section><h3>群体与成本口径</h3><p>F/M 是匿名字段。年龄仅用于操作性分层。群体差距依赖已观察样本，无法单独说明因果。成本是用户输入的情景假设，展示范围为当前留出批次。</p></section>
        <section><h3>研究局限</h3><p>数据缺少真实审批决定、实际损失、持续客户标识及时间成熟期验证。本页面的审议结论属于课程情景。</p></section>
        <a className="data-link" href={staticAsset('data/v3_aggregate_qa.csv')} download="主实验九组结果对照.csv">下载九组主实验对照表</a>
      </div>
    </Modal>
  )
}
