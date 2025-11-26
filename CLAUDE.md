# CLAUDE.md
总是使用中文回复
每次提的需求或者修改等，在开发之前务必与我对齐一下，避免开发效果与我的预期不一致。
本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

这是一个开源项目趋势分析仪表盘，用于可视化 GitHub 开源项目指标，包括 OpenRank、GitHub 指数、项目活跃度、开发者活跃度和关注度指标。项目由 Vue3 前端仪表盘和提供数据可视化 API 的 Node.js 后端组成。

## 架构设计

### 前端 (`fronted/`)
- **技术栈**: Vue 3 + TypeScript + ECharts + Pinia + Ant Design Vue
- **构建工具**: Vite 配合 TypeScript 支持
- **样式**: SCSS 配合响应式设计（移动端断点 576px）
- **状态管理**: Pinia store 管理选项数据和初始数据
- **代码质量**: ESLint、Prettier、Husky 预提交钩子、commitizen 规范提交

### 后端 (`backend/`)
- **技术栈**: Node.js + Express + MySQL + JWT 认证
- **数据库**: MySQL 数据持久化
- **API**: 基于 JWT 的 RESTful 接口

## 常用开发命令

### 前端开发
```bash
cd fronted
npm run dev                 # 启动开发服务器
npm run build              # 生产构建（运行 vue-tsc 然后 vite build）
npm run preview            # 预览生产构建
npm run lint:eslint        # 运行 ESLint 自动修复
npm run lint:prettier      # 使用 Prettier 格式化代码
npm run commit             # 使用 commitizen 交互式提交
```

### 后端开发
```bash
cd backend
npm install                # 安装依赖
npm start                  # 启动服务器（如果存在 start 脚本）
npm test                   # 运行测试
```

## 核心组件和功能

### 仪表盘结构
- **首页** (`src/pages/home/index.vue`): 主仪表盘，响应式网格布局
- **登录页** (`src/pages/login/index.vue`): 认证界面
- **图表组件**: 基于 ECharts 的多个可视化图表，包括：
  - PR处理效率
  - OpenRank 趋势
  - GitHub 指数（带虚拟列表）
  - 关注度指标
  - 开发者活跃度
  - 项目活跃度

### 交互功能
- **图表弹窗**: 可交互的详情视图，支持项目选择/删除
- **虚拟列表**: GitHub 指数数据的无限滚动
- **雷达图**: 点击列表项进行动态项目对比
- **响应式设计**: 桌面端（>576px）和移动端不同布局

### 状态管理
- **选项 Store** (`src/store/option.ts`): 管理项目选项数据
- **初始数据 Store** (`src/store/initData.ts`): 处理仪表盘初始化数据
- **GitHub Store** (`src/store/github.ts`): 管理 GitHub 指数数据及分页

### 性能优化
- **懒加载**: 图片预加载和加载状态
- **图表调整**: ECharts 防抖调整大小处理器
- **虚拟滚动**: 大数据列表优化
- **代码分割**: Vite 手动分块第三方库

## 开发流程

1. **分支策略**: 从 `dev` 创建功能分支，通过 pull request 合并到 `master`
2. **代码标准**: 通过预提交钩子强制执行 ESLint + Prettier 格式化
3. **提交规范**: 使用 commitizen 和 cz-git 进行约定式提交
4. **类型安全**: 前端全面 TypeScript 实现

## API 结构

### 前端 API 配置
- **代理设置**: Vite 代理将 `/api/*` 重定向到 `http://127.0.0.1:8081`（开发环境）
- **基础 API**: 在 `src/service/service.ts` 中集中配置 axios

### 主要 API 接口
- 认证接口（登录/登出）
- 仪表盘数据初始化
- 项目选项/数据
- GitHub 指数分页

## 部署说明

- **前端**: 使用 Vite 构建，包含分块大小警告（1500KB 限制）
- **后端**: 生产环境使用 PM2 进程管理
- **数据库**: MySQL，README 中提到使用 ClickHouse 进行数据处理

## 文件组织

```
fronted/src/
├── components/           # 可复用 UI 组件
├── pages/               # 路由组件（首页、登录页）
├── router/              # Vue Router 配置
├── store/               # Pinia 状态管理
├── service/             # API 服务层
├── utils/               # 工具函数
├── assets/              # 静态资源（图片、字体）
└── types/               # TypeScript 类型定义
```