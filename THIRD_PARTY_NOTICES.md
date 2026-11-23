# 第三方来源与许可

- Slider、Tabs 是 shadcn/ui new-york-v4 注册表源码，按 MIT 许可纳入。Slider 增加了滑块的无障碍标签和精确值，两个文件改用本地 `cn` 导入。原许可随 `public/licenses/` 与 `dist/licenses/` 分发。 [Slider](https://ui.shadcn.com/r/styles/new-york-v4/slider.json) · [Tabs](https://ui.shadcn.com/r/styles/new-york-v4/tabs.json) · [MIT 许可](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md)
- React、Radix UI、visx、Motion、Three.js、React Three Fiber 及构建依赖为锁定版本。运行依赖许可清单及包内许可文本位于 `public/licenses/`，随静态产物提供。开发依赖在 `package-lock.json` 中可查。界面使用系统字体。
- `public/art/judgment.webp` 是使用内置 ImageGen 生成的原创展览视觉。网站的 WebGL 部分为自建程序几何。没有引入第三方雕像模型、贴图或外部字体。生成提示见 `docs/ASSET_PROVENANCE.md`。
- 研究数据为用户课程项目的 V3 聚合。原始逐笔 CSV 仅在本机用于 MATLAB 批处理，交付包与静态站保留公开展示所需的聚合值及核验信息。线上传播前需由项目方确认数据与衍生结果的分发权限。
