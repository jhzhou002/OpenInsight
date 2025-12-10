# ETL管理系统前端

## 功能说明

这是 OpenDigger Top300 项目的 ETL 管理系统前端界面，提供完整的任务管理、配置管理、定时任务和日志查看功能。

## 页面结构

```
/admin                    - 管理员登录页面
/admin/dashboard          - ETL管理主页（需要登录）
  ├─ 任务管理            - 创建、查看、管理ETL任务
  ├─ 配置管理            - ETL配置参数设置
  ├─ 定时任务            - Cron定时任务配置
  └─ 日志查看            - 任务执行日志查询
```

## 登录信息

- **用户名**: admin
- **密码**: admin123

## 组件说明

### 1. Login.vue
- 管理员登录界面
- 简单的本地认证（可后续接入真实API）
- 登录成功后跳转到管理面板

### 2. Dashboard.vue
- 主管理界面，包含侧边栏导航
- 集成四个子组件模块
- 支持折叠侧边栏
- 顶部显示用户名和登出按钮

### 3. ConfigManager.vue
- ETL配置管理
- 配置项：
  - 时间范围（开始/结束时间）
  - 最大并发数（1-16）
  - 超时时间（60-3600秒）
  - Python路径
  - 脚本路径
- 支持批量保存配置

### 4. TaskManager.vue
- 任务列表展示（分页）
- 任务状态筛选（全部/等待中/运行中/成功/失败/已取消）
- 创建新任务（全量ETL/增量ETL）
- 查看任务详情
- 取消运行中任务
- 自动刷新运行中任务（每5秒）

### 5. TaskDetail.vue
- 任务详细信息展示
- **实时进度监控**（使用SSE）
  - 实时进度条
  - 当前执行步骤
  - 处理进度（已处理/总数）
- 执行日志查看
  - 日志级别筛选（全部/Info/Warning/Error）
  - 自动滚动到最新日志
  - JSON数据格式化显示
  - 支持复制日志数据

### 6. LogViewer.vue
- 独立日志查看界面
- 按任务ID筛选日志
- 按日志级别筛选
- 关键词搜索
- 导出日志到CSV文件

### 7. ScheduleManager.vue
- 定时任务管理
- 创建/编辑/删除定时任务
- Cron表达式配置
  - 提供快捷选择（每月1号/每天/每周）
  - Cron表达式验证
- 启用/禁用定时任务
- 显示下次执行时间
- 手动触发任务执行

## API接口

所有API接口统一使用 `/api/etl` 前缀：

### 配置管理
- `GET /api/etl/config` - 获取所有配置
- `POST /api/etl/config/batch` - 批量保存配置

### 任务管理
- `GET /api/etl/tasks` - 获取任务列表（支持分页和状态筛选）
- `GET /api/etl/tasks/:id` - 获取任务详情
- `POST /api/etl/tasks` - 创建新任务
- `DELETE /api/etl/tasks/:id` - 取消任务
- `GET /api/etl/tasks/:id/logs` - 获取任务日志
- `GET /api/etl/tasks/:id/progress` - SSE实时进度（EventSource）

### 定时任务
- `GET /api/etl/schedules` - 获取所有定时任务
- `POST /api/etl/schedules` - 创建定时任务
- `PUT /api/etl/schedules/:id` - 更新定时任务
- `DELETE /api/etl/schedules/:id` - 删除定时任务

## 实时进度监控（SSE）

TaskDetail 组件使用 Server-Sent Events (SSE) 实现实时进度监控：

```typescript
eventSource = new EventSource(`/api/etl/tasks/${taskId}/progress`);

eventSource.onmessage = event => {
  const data = JSON.parse(event.data);

  if (data.type === 'progress') {
    // 更新进度条和步骤信息
    progressPercent.value = data.percentage;
    currentStep.value = data.step;
    progressMessage.value = data.message;
  } else if (data.type === 'complete') {
    // 任务完成，关闭连接
    eventSource.close();
  }
};
```

## 样式特点

- 使用 Ant Design Vue 组件库
- 响应式设计，支持移动端（断点 768px）
- SCSS 模块化样式
- 暗色侧边栏 + 亮色内容区
- 日志列表使用不同颜色区分级别：
  - Info: 蓝色
  - Warning: 橙色
  - Error: 红色

## 开发说明

### 启动前端开发服务器
```bash
cd fronted
npm run dev
```

### 访问管理页面
1. 启动开发服务器后访问：`http://localhost:5173/#/admin`
2. 使用用户名 `admin` 和密码 `admin123` 登录
3. 登录成功后自动跳转到管理面板

### 注意事项
1. 确保后端服务已启动（端口 8081）
2. 前端代理配置将 `/api/*` 请求转发到后端
3. 管理员认证信息存储在 localStorage 中
4. SSE连接在组件卸载时会自动关闭

## 已知问题和修复

### 2025-12-10 修复: task_config 字段缺失问题

**问题**: 定时任务手动触发时报错 "Cannot read properties of undefined (reading 'time_start')"

**原因**: 数据库表 `etl_schedules` 缺少 `task_config` 字段

**修复方案**:
1. 执行数据库迁移脚本添加字段：
   ```bash
   cd backend
   node database/migrate_add_task_config.js
   ```

2. 更新了以下文件：
   - `backend/database/etl_management.sql` - 添加字段定义
   - `backend/router_handler/etl_admin.js` - API 支持 task_config
   - `fronted/src/pages/admin/components/ScheduleManager.vue` - 前端容错处理

**状态**: ✓ 已修复

---

## 待扩展功能

1. **认证增强**
   - 接入真实的JWT认证API
   - 支持多管理员账户
   - 密码加密存储

2. **任务管理增强**
   - 批量操作（批量取消/删除）
   - 任务克隆功能
   - 任务模板

3. **日志增强**
   - 日志实时流（WebSocket）
   - 更多导出格式（JSON/TXT）
   - 日志分析和统计

4. **定时任务增强**
   - 可视化Cron编辑器
   - 任务执行历史
   - 失败重试配置

5. **监控告警**
   - 任务失败邮件/钉钉通知
   - 性能监控仪表板
   - 错误率统计
