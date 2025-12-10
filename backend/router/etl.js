const express = require('express');
const router = express.Router();

const etl_handler = require('../router_handler/etl');
const etl_admin_handler = require('../router_handler/etl_admin');

// ========== 单个项目ETL（原有功能） ==========
// 检查项目是否存在
router.get('/check/:owner/:repo', etl_handler.checkProject);

// 执行ETL处理
router.post('/process', etl_handler.processETL);

// ========== ETL管理系统（新功能） ==========

// 配置管理
router.get('/config', etl_admin_handler.getConfig);                    // 获取所有配置
router.put('/config/:key', etl_admin_handler.updateConfig);           // 更新单个配置
router.post('/config/batch', etl_admin_handler.updateConfigBatch);    // 批量更新配置

// 任务管理
router.get('/tasks', etl_admin_handler.getTasks);                     // 获取任务列表
router.get('/tasks/:id', etl_admin_handler.getTaskDetail);            // 获取任务详情
router.post('/tasks', etl_admin_handler.createTask);                  // 创建新任务（触发ETL）
router.delete('/tasks/:id', etl_admin_handler.cancelTask);            // 取消任务

// 日志查询
router.get('/tasks/:id/logs', etl_admin_handler.getTaskLogs);         // 获取任务日志

// 实时进度监控（SSE）
router.get('/tasks/:id/progress', etl_admin_handler.getTaskProgress); // SSE进度推送

// 定时任务管理
router.get('/schedules', etl_admin_handler.getSchedules);             // 获取定时任务列表
router.post('/schedules', etl_admin_handler.createSchedule);          // 创建定时任务
router.put('/schedules/:id', etl_admin_handler.updateSchedule);       // 更新定时任务
router.delete('/schedules/:id', etl_admin_handler.deleteSchedule);    // 删除定时任务

module.exports = router;
