# 患者端 ACL 术后康复中心 - Figma 设计规范

## 1) 设计目标

- 风格关键词：专业、温暖、现代、易读
- 行业语义：医疗健康 B 端，可信赖、清晰、降低认知负担
- 改造范围：仅视觉与交互表达优化，不改变核心功能和信息结构

## 2) 设计令牌（Design Tokens）

### 色彩（方案 A：专业医疗风 / 当前已落地）

- `Primary / 500`: `#165DFF`
- `Primary / 50`: `#EAF1FF`
- `Surface / 0`: `#FFFFFF`
- `Page / BG`: `#F4F8FF`
- `Text / Primary`: `#1D2939`
- `Text / Secondary`: `#667085`
- `Success / 500`: `#12B76A`
- `Warning / 500`: `#F79009`
- `Border / Default`: `#DCE6F5`

### 字体

- Font Family: `Inter, Source Han Sans SC`
- Title / H1: `24px / 700`
- Section Title / H2: `18-20px / 700`
- KPI Number: `24-28px / 700`
- Body: `14-16px / 400`
- Assistive Text: `12-14px / 400`

### 圆角、阴影、间距

- Radius: `8 / 10 / 12`
- Shadow (Card): `0 4 16 rgba(13,63,173,0.07)`
- Shadow (Hover): `0 10 28 rgba(13,63,173,0.13)`
- 8pt spacing system: `4, 8, 12, 16, 20, 24, 32`

## 3) 页面组件规范（Figma 组件建议）

### 3.1 顶部 Banner

- 背景：蓝色渐变 + 毛玻璃
- 左侧：标题、副标题、标签组
- 右侧：账户信息卡（简洁、低干扰）
- 标签：圆角胶囊 + 半透明白边

### 3.2 核心数据卡（3 列）

- 卡片最小高：`168px`
- 结构：图标 + 标签 + 大数字 + 趋势行
- 趋势：上升绿色 `↑`，提醒橙色提示
- 动效：Hover 上浮 2px + 阴影增强

### 3.3 任务进度模块

- 任务卡：状态图标 + 标题 + 描述 + 进度条 + CTA
- 进度条：未完成灰底，完成态绿色
- CTA：最小点击高 `48px`
- 状态区分：完成/未完成图标明显区分

### 3.4 恢复里程碑模块

- 指标卡：标题 + 当前值 + 进度可视化 + 环比趋势
- 趋势强化：绿色高亮 `+4% / +6° / +1级`

### 3.5 风险提醒 / 康复建议

- 风险卡：橙色边框 + 加粗关键提醒
- 建议卡：浅绿色柔和背景 + 友好语气

### 3.6 快速入口

- 主按钮：Primary 高亮（3D 肢体视图）
- 次按钮：浅灰底 + 深色字

## 4) 交互动效规范

- Card Hover: `translateY(-2px)` + shadow deepen
- KPI Number: `600-900ms` 缓动滚动
- Progress Bar: 初次渲染 `~850ms` grow 动画
- Button Active: `scale(0.99)` + `translateY(1px)`

## 5) 响应式（Desktop + Mobile）

### Desktop (>= 900px)

- KPI 三列
- 任务卡横向信息布局
- 操作按钮同行展示

### Mobile (< 900px)

- 全卡片单列堆叠
- 任务卡纵向布局
- 进度条 100% 宽
- 操作按钮纵向全宽，最小 `48px`

## 6) 高保真原型说明（已落地代码）

- 页面：`src/pages/PatientPortalPage.tsx`
- 样式：`src/styles/legacy.css`（patient portal upgrade 段落）
- 动画：数字滚动（`AnimatedNumber`）、进度条加载、hover/active 反馈
- 桌面与移动端均已适配

## 7) 备选风格方案（3 套）

### 方案 A - 专业医疗风（默认推荐，已实现）

- 主色：蓝色体系，强调可信与专业
- 适合：医院合作、临床服务场景

### 方案 B - 简约清新风

- 主色：柔和蓝绿（如 `#2F8CFF` + `#36B37E`）
- 卡片留白更大，边框更轻，弱化渐变
- 适合：家庭康复、患者教育场景

### 方案 C - 科技感智能康复风

- 主色：深蓝 + 高亮电蓝（如 `#0B1F4A` + `#2F7BFF`）
- 增加轻量网格背景、数据感图标风格
- 适合：强调 AI 与智能评估能力的展示场景

## 8) Figma 建议分层

- `Foundations / Color`
- `Foundations / Type`
- `Foundations / Effects`
- `Components / Banner`
- `Components / KPI Card`
- `Components / Task Row`
- `Components / Milestone Card`
- `Components / Alert Card`
- `Templates / Patient Portal Desktop`
- `Templates / Patient Portal Mobile`
