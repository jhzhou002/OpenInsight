-- ============================================================
-- ETL管理系统数据库表结构
-- ============================================================

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS etl_logs;
DROP TABLE IF EXISTS etl_tasks;
DROP TABLE IF EXISTS etl_schedules;
DROP TABLE IF EXISTS etl_config;

-- 1. ETL配置表
CREATE TABLE etl_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
  config_value TEXT NOT NULL COMMENT '配置值（JSON格式）',
  description VARCHAR(500) COMMENT '配置说明',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(100) COMMENT '更新人',
  INDEX idx_key (config_key)
) COMMENT 'ETL配置表';

-- 2. ETL任务表
CREATE TABLE etl_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_name VARCHAR(200) NOT NULL COMMENT '任务名称',
  task_type ENUM('full', 'incremental') DEFAULT 'full' COMMENT '任务类型：full=全量，incremental=增量',
  status ENUM('pending', 'running', 'success', 'failed', 'cancelled') DEFAULT 'pending' COMMENT '任务状态',
  time_start VARCHAR(20) COMMENT '数据起始时间 YYYY-MM',
  time_end VARCHAR(20) COMMENT '数据结束时间 YYYY-MM',
  total_projects INT DEFAULT 0 COMMENT '总项目数',
  processed_projects INT DEFAULT 0 COMMENT '已处理项目数',
  total_records INT DEFAULT 0 COMMENT '总记录数',
  current_step VARCHAR(100) COMMENT '当前执行步骤',
  error_message TEXT COMMENT '错误信息',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME COMMENT '开始时间',
  finished_at DATETIME COMMENT '结束时间',
  created_by VARCHAR(100) DEFAULT 'admin' COMMENT '创建人',
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) COMMENT 'ETL任务表';

-- 3. ETL日志表
CREATE TABLE etl_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL COMMENT '任务ID',
  log_level ENUM('info', 'warning', 'error') DEFAULT 'info' COMMENT '日志级别',
  log_step VARCHAR(100) COMMENT '执行步骤',
  log_message TEXT COMMENT '日志内容',
  log_data JSON COMMENT '附加数据',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES etl_tasks(id) ON DELETE CASCADE,
  INDEX idx_task_id (task_id),
  INDEX idx_created_at (created_at),
  INDEX idx_level (log_level)
) COMMENT 'ETL日志表';

-- 4. 定时任务配置表
CREATE TABLE etl_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  schedule_name VARCHAR(200) NOT NULL COMMENT '定时任务名称',
  task_type ENUM('full', 'incremental') DEFAULT 'full' COMMENT '任务类型',
  cron_expression VARCHAR(100) NOT NULL COMMENT 'Cron表达式',
  is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  last_run_at DATETIME COMMENT '上次运行时间',
  next_run_at DATETIME COMMENT '下次运行时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enabled (is_enabled),
  INDEX idx_next_run (next_run_at)
) COMMENT 'ETL定时任务配置表';

-- ============================================================
-- 初始化配置数据
-- ============================================================

-- 插入默认ETL配置
INSERT INTO etl_config (config_key, config_value, description) VALUES
('time_range', '{"start": "2021-01", "end": "2025-10"}', 'Time range'),
('max_workers', '{"value": 20}', 'Max workers'),
('timeout', '{"value": 10}', 'Timeout sec'),
('python_path', '{"value": "python"}', 'Python path'),
('script_path', '{"value": "backend/etl_scripts/main.py"}', 'Script path')
ON DUPLICATE KEY UPDATE config_value=VALUES(config_value);

-- 插入默认定时任务（每月1号凌晨2点执行）
INSERT INTO etl_schedules (schedule_name, task_type, cron_expression, is_enabled) VALUES
('Monthly Auto Update', 'full', '0 2 1 * *', 1)
ON DUPLICATE KEY UPDATE cron_expression=VALUES(cron_expression);

-- ============================================================
-- 查询示例
-- ============================================================

-- 查看所有配置
-- SELECT * FROM etl_config;

-- 查看最近10个任务
-- SELECT * FROM etl_tasks ORDER BY created_at DESC LIMIT 10;

-- 查看某个任务的日志
-- SELECT * FROM etl_logs WHERE task_id = 1 ORDER BY created_at;

-- 查看定时任务
-- SELECT * FROM etl_schedules;
