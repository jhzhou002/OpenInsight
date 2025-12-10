# 数据库迁移指南

## 迁移记录

### 2025-12-10: 添加 task_config 字段

**目的**: 为 `etl_schedules` 表添加 `task_config` 字段，支持定时任务配置参数（time_start, time_end等）

**状态**: ✓ 已完成

**执行方式**:

#### 方式1: 使用 Node.js 迁移脚本（推荐）
```bash
cd backend
node database/migrate_add_task_config.js
```

#### 方式2: 手动执行 SQL
```bash
mysql -h 49.235.74.98 -u remote -p opendigger < backend/database/add_task_config_field.sql
```

或者在数据库客户端中直接执行：
```sql
USE opendigger;

ALTER TABLE etl_schedules
ADD COLUMN task_config JSON COMMENT '任务配置(time_start, time_end等)'
AFTER cron_expression;

UPDATE etl_schedules
SET task_config = JSON_OBJECT('time_start', '2021-01', 'time_end', '2025-10')
WHERE task_config IS NULL;
```

**变更说明**:
- 添加了 `task_config` 字段（JSON类型）到 `etl_schedules` 表
- 为所有现有记录设置了默认值：`{"time_start": "2021-01", "time_end": "2025-10"}`
- 更新了后端 API (`createSchedule` 和 `updateSchedule`) 以支持该字段

**影响范围**:
- 数据库表: `etl_schedules`
- 后端文件: `backend/router_handler/etl_admin.js`
- 前端文件: `fronted/src/pages/admin/components/ScheduleManager.vue`

**回滚方式**:
如果需要回滚此迁移：
```sql
USE opendigger;
ALTER TABLE etl_schedules DROP COLUMN task_config;
```

---

## 迁移前检查清单

在执行任何数据库迁移之前，请确认：

- [ ] 已备份数据库
- [ ] 已在测试环境验证迁移脚本
- [ ] 已停止依赖该表的服务（如果需要）
- [ ] 已通知相关开发人员

## 迁移后验证

执行以下查询验证迁移结果：

```sql
-- 查看表结构
DESCRIBE etl_schedules;

-- 查看所有定时任务及其配置
SELECT id, schedule_name, cron_expression, task_config, is_enabled
FROM etl_schedules;

-- 验证 task_config 字段格式
SELECT id, schedule_name,
       JSON_EXTRACT(task_config, '$.time_start') as time_start,
       JSON_EXTRACT(task_config, '$.time_end') as time_end
FROM etl_schedules;
```

## 常见问题

### Q1: 迁移脚本报错 "ER_DUP_FIELDNAME"
**A**: 该字段已经存在，可以忽略此错误。迁移脚本会自动检测并跳过。

### Q2: task_config 字段显示为 NULL
**A**: 执行以下 SQL 更新默认值：
```sql
UPDATE etl_schedules
SET task_config = JSON_OBJECT('time_start', '2021-01', 'time_end', '2025-10')
WHERE task_config IS NULL;
```

### Q3: 前端显示 "Cannot read properties of undefined"
**A**: 确保已重启后端服务，并清除浏览器缓存后刷新前端页面。

### Q4: 定时任务手动触发失败
**A**: 确保 task_config 字段包含有效的 JSON 对象，格式如下：
```json
{
  "time_start": "2021-01",
  "time_end": "2025-10"
}
```

## 联系方式

如果在迁移过程中遇到问题，请联系开发团队。
