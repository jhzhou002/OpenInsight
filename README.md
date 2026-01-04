# OpenInsight - 开源项目趋势分析平台

<div align="center">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.x-green.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-18.x-green.svg)](https://nodejs.org/)

一个基于 X-lab OpenDigger 数据的开源项目可视化分析平台

[在线演示](https://openinsight.aihubzone.cn) | [指标说明](https://openinsight.aihubzone.cn/#/metrics-guide) | [GitHub仓库](https://github.com/jhzhou002/OpenInsight)

</div>

---

## 📖 项目简介

OpenInsight 是一个专注于开源项目数据分析与可视化的平台,通过整合 [X-lab OpenDigger](https://github.com/X-lab2017/open-digger) 提供的开源项目元数据,为开发者、项目维护者和投资者提供全方位的项目洞察。

### ✨ 核心特性

- 🎯 **多维度指标分析** - GitHub 指数、PREI 指数、OpenRank 等综合评估体系
- 📊 **可视化大屏** - 基于 ECharts 的交互式数据可视化
- 🔍 **项目搜索与导入** - 快速检索和导入 GitHub 开源项目
- 📈 **项目对比分析** - 支持多项目横向对比和趋势分析
- 🤖 **AI 智能分析** - 集成阿里通义千问,提供项目智能洞察
- 📱 **响应式设计** - 完美适配桌面端和移动端(576px 断点)
- ⚡ **高性能优化** - 虚拟列表、懒加载、代码分割等优化策略

---

## 🏗️ 技术架构

### 前端技术栈

- **框架**: Vue 3 + TypeScript + Vite
- **状态管理**: Pinia
- **UI 组件**: Ant Design Vue
- **数据可视化**: Apache ECharts
- **样式**: SCSS + PostCSS
- **代码规范**: ESLint + Prettier + Husky + Commitizen

### 后端技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **数据库**: MySQL 8.0+
- **数据源**: X-lab OpenDigger (ClickHouse)
- **AI 集成**: 阿里通义千问 API

---

## 📊 核心指标说明

### 1. GitHub 指数 (60-100分)

综合评估开源项目质量的复合指标,包含四个维度:

- **影响力 (Influence)**: `0.25×stars + 0.25×forks + 0.3×issues + 0.2×PRs`
- **反应力 (Reaction)**: `0.5×issues_closed + 0.2×prs_accepted + 0.2×(1-issue_res_time) + 0.1×(1-pr_res_time)`
- **开发者活跃度 (Developer)**: `0.4×issues + 0.3×PRs + 0.3×new_contributors`
- **趋势 (Trend)**: `0.4×issue_growth + 0.4×pr_growth + 0.2×contributor_growth` (月度环比增长率)

### 2. PREI 指数 (60-100分)

评估项目处理 PR 和 Issue 效率的指标:

- **响应速度 (Response)**: Issue/PR 首次响应时间
- **解决速度 (Resolution)**: Issue/PR 平均解决时长
- **审查效率 (Review)**: 平均每个 PR 的 Review 数量
- **接受率 (Accept)**: PR 合并成功率

### 3. OpenRank

基于协作网络的影响力评估算法,类似 Google PageRank,反映项目在开源生态中的全域影响力。

> 详细指标说明请访问: [指标说明手册](https://openinsight.aihubzone.cn/#/metrics-guide)

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- MySQL >= 8.0
- npm >= 9.0.0 或 pnpm >= 8.0.0

### 后端部署

```bash
# 1. 进入后端目录
cd backend

# 2. 安装依赖
npm install

# 3. 配置数据库连接
# 编辑 db/index.js,修改数据库连接信息
# host: '你的数据库地址'
# user: '数据库用户名'
# password: '数据库密码'
# database: 'opendigger'

# 4. 导入数据库表结构
# 使用 MySQL 客户端导入 backend/sql/*.sql 文件

# 5. 启动服务
npm start
# 或使用 PM2
pm2 start app.js --name openinsight-api
```

### 前端部署

```bash
# 1. 进入前端目录
cd fronted

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 开发环境: .env.development
VITE_API_BASE_URL=/api

# 生产环境: .env.production
VITE_API_BASE_URL=https://your-api-domain.com/api

# 4. 开发模式
npm run dev

# 5. 生产构建
npm run build

# 6. 预览构建结果
npm run preview
```

### Docker 部署 (推荐)

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

---

## 📁 项目结构

```
opendigger/
├── backend/                 # 后端服务
│   ├── db/                 # 数据库连接配置
│   ├── router/             # 路由定义
│   ├── router_handler/     # 路由处理器
│   ├── middleware/         # 中间件
│   ├── services/           # 业务逻辑层
│   │   └── etl/           # ETL 数据处理
│   ├── sql/               # 数据库表结构
│   └── app.js             # 应用入口
│
├── fronted/                # 前端应用
│   ├── src/
│   │   ├── assets/        # 静态资源
│   │   ├── components/    # 公共组件
│   │   ├── layouts/       # 布局组件
│   │   ├── pages/         # 页面组件
│   │   │   ├── dashboard/ # 可视化大屏
│   │   │   ├── search/    # 项目搜索
│   │   │   ├── analysis/  # 项目分析
│   │   │   └── metrics-guide/ # 指标说明
│   │   ├── router/        # 路由配置
│   │   ├── service/       # API 服务
│   │   ├── store/         # Pinia 状态管理
│   │   ├── utils/         # 工具函数
│   │   └── types/         # TypeScript 类型定义
│   ├── .env.development   # 开发环境配置
│   ├── .env.production    # 生产环境配置
│   └── vite.config.ts     # Vite 配置
│
├── CLAUDE.md              # Claude Code 项目指南
└── README.md              # 项目文档
```

---

## 🎯 核心功能

### 1. 可视化大屏

- **OpenRank 趋势图**: 展示项目全域影响力变化
- **GitHub 指数排行**: Top300 项目综合评分
- **项目活跃度分析**: Issues、PRs、Contributors 趋势
- **开发者活跃度**: 响应时间、解决效率分析
- **关注度指标**: Stars、Forks 增长趋势
- **雷达图对比**: 多维度项目对比分析

**交互特性**:
- 柱状图/折线图切换
- 图表详情弹窗
- 项目添加/删除
- 虚拟列表无限滚动
- 图表左右滑动

### 2. 项目搜索与导入

- 输入 GitHub 仓库信息 (owner/repo)
- 检查 OpenDigger 数据可用性
- 一键导入项目到数据库
- ETL 数据处理与指标计算

### 3. 项目分析

- 选择多个项目进行对比
- 自定义指标和时间范围
- AI 智能分析报告生成
- 导出 PDF 分析报告

### 4. 响应式设计

- **桌面端** (>576px): 网格布局,多列展示
- **移动端** (≤576px): 单列布局,垂直滚动
- 图表自适应缩放
- 触摸友好的交互

---

## 🔧 开发指南

### 代码规范

项目使用严格的代码规范工具链:

```bash
# ESLint 检查
npm run lint:eslint

# Prettier 格式化
npm run lint:prettier

# 使用 Commitizen 提交
npm run commit
```

### Git 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范:

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具链更新
```

### 分支策略

- `main`: 主分支,用于生产环境
- `dev`: 开发分支,日常开发
- `feature/*`: 功能分支
- `fix/*`: 修复分支

---

## 📈 性能优化

### 前端优化

- **代码分割**: Vite 手动分块,按需加载第三方库
- **虚拟列表**: 大数据列表性能优化
- **图片懒加载**: 预加载关键图片
- **防抖节流**: ECharts resize 防抖处理
- **Tree Shaking**: 移除未使用代码
- **Gzip 压缩**: 资源文件压缩

### 后端优化

- **连接池**: MySQL 连接池管理
- **查询优化**: 索引优化,减少关联查询
- **缓存策略**: 热点数据缓存
- **错误处理**: 统一错误处理中间件

---

## 🌐 在线访问

- **前端地址**: https://openinsight.aihubzone.cn
- **后端 API**: https://openinsightapi.aihubzone.cn/api
- **指标手册**: https://openinsight.aihubzone.cn/#/metrics-guide

---

## 🤝 参与贡献

我们欢迎所有形式的贡献!

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 贡献指南

- 遵循项目代码规范
- 添加必要的测试
- 更新相关文档
- 确保 CI/CD 通过

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 🙏 致谢

- [X-lab OpenDigger](https://github.com/X-lab2017/open-digger) - 提供开源项目元数据
- [Apache ECharts](https://echarts.apache.org/) - 强大的数据可视化库
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Ant Design Vue](https://antdv.com/) - 企业级 UI 组件库

---

## 📮 联系方式

- **Issues**: [GitHub Issues](https://github.com/jhzhou002/OpenInsight/issues)
- **讨论**: [GitHub Discussions](https://github.com/jhzhou002/OpenInsight/discussions)

---

<div align="center">

**⭐ 如果这个项目对你有帮助,请给我们一个 Star! ⭐**

Made with ❤️ by OpenInsight Team

</div>
