-- ============================================================
-- 为 etl_schedules 表添加 task_config 字段
-- ============================================================
-- 执行日期: 2025-12-10
-- 用途: 支持定时任务配置参数（time_start, time_end等）
--
-- 执行方式:
-- mysql -h 49.235.74.98 -u remote -p opendigger < add_task_config_field.sql
-- 或者直接在数据库客户端中执行以下SQL语句
-- ============================================================

USE opendigger;

-- 检查字段是否已存在，如果不存在则添加
-- 注意: MySQL 5.7 不支持 IF NOT EXISTS 语法，如果字段已存在会报错但不影响
ALTER TABLE etl_schedules
ADD COLUMN task_config JSON COMMENT '任务配置(time_start, time_end等)'
AFTER cron_expression;

-- 为现有记录设置默认值
UPDATE etl_schedules
SET task_config = JSON_OBJECT('time_start', '2021-01', 'time_end', '2025-10')
WHERE task_config IS NULL;

-- 验证更新
SELECT id, schedule_name, cron_expression, task_config, is_enabled FROM etl_schedules;
