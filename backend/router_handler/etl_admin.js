/**
 * ETL管理系统 - 路由处理器
 * 负责配置管理、任务管理、日志查询、进度监控、定时任务等
 */
const db = require('../db/promise');
const { spawn } = require('child_process');
const path = require('path');
const sseService = require('../services/sseService');
const etlTaskService = require('../services/etlTaskService');
const etlScheduler = require('../services/etlScheduler');

// ==================== 配置管理 ====================

/**
 * 获取所有ETL配置
 * GET /api/etl/config
 */
exports.getConfig = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM etl_config ORDER BY id');

    // 解析JSON配置值
    const configs = rows.map(row => ({
      ...row,
      config_value: JSON.parse(row.config_value)
    }));

    res.json({
      code: 200,
      msg: '获取配置成功',
      data: configs
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({
      code: 500,
      msg: '获取配置失败',
      error: error.message
    });
  }
};

/**
 * 更新单个配置
 * PUT /api/etl/config/:key
 */
exports.updateConfig = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!value) {
      return res.status(400).json({
        code: 400,
        msg: '配置值不能为空'
      });
    }

    // 更新配置
    const [result] = await db.query(
      'UPDATE etl_config SET config_value = ?, updated_at = NOW(), updated_by = ? WHERE config_key = ?',
      [JSON.stringify(value), 'admin', key]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        msg: '配置项不存在'
      });
    }

    res.json({
      code: 200,
      msg: '配置更新成功'
    });
  } catch (error) {
    console.error('更新配置失败:', error);
    res.status(500).json({
      code: 500,
      msg: '更新配置失败',
      error: error.message
    });
  }
};

/**
 * 批量更新配置
 * POST /api/etl/config/batch
 */
exports.updateConfigBatch = async (req, res) => {
  try {
    const { configs } = req.body; // { key1: value1, key2: value2, ... }

    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({
        code: 400,
        msg: '配置格式错误'
      });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      for (const [key, value] of Object.entries(configs)) {
        await connection.query(
          'UPDATE etl_config SET config_value = ?, updated_at = NOW(), updated_by = ? WHERE config_key = ?',
          [JSON.stringify(value), 'admin', key]
        );
      }

      await connection.commit();
      connection.release();

      res.json({
        code: 200,
        msg: '批量更新成功'
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('批量更新配置失败:', error);
    res.status(500).json({
      code: 500,
      msg: '批量更新配置失败',
      error: error.message
    });
  }
};

// ==================== 任务管理 ====================

/**
 * 获取任务列表（分页、筛选）
 * GET /api/etl/tasks?page=1&limit=10&status=running
 */
exports.getTasks = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereClause = '';
    const params = [];

    if (status) {
      whereClause = 'WHERE status = ?';
      params.push(status);
    }

    // 查询总数
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM etl_tasks ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 查询任务列表
    const [tasks] = await db.query(
      `SELECT * FROM etl_tasks ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({
      code: 200,
      msg: '获取任务列表成功',
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({
      code: 500,
      msg: '获取任务列表失败',
      error: error.message
    });
  }
};

/**
 * 获取任务详情
 * GET /api/etl/tasks/:id
 */
exports.getTaskDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const [tasks] = await db.query('SELECT * FROM etl_tasks WHERE id = ?', [id]);

    if (tasks.length === 0) {
      return res.status(404).json({
        code: 404,
        msg: '任务不存在'
      });
    }

    res.json({
      code: 200,
      msg: '获取任务详情成功',
      data: tasks[0]
    });
  } catch (error) {
    console.error('获取任务详情失败:', error);
    res.status(500).json({
      code: 500,
      msg: '获取任务详情失败',
      error: error.message
    });
  }
};

/**
 * 创建新任务（触发ETL）
 * POST /api/etl/tasks
 * Body: { task_name, task_type, time_start, time_end }
 */
exports.createTask = async (req, res) => {
  try {
    const { task_name, task_type = 'full', time_start, time_end } = req.body;

    // 验证参数
    if (!task_name || !time_start || !time_end) {
      return res.status(400).json({
        code: 400,
        msg: '缺少必需参数：task_name, time_start, time_end'
      });
    }

    // 检查是否有正在运行的任务
    const [runningTasks] = await db.query(
      "SELECT COUNT(*) as count FROM etl_tasks WHERE status IN ('pending', 'running')"
    );

    if (runningTasks[0].count > 0) {
      return res.status(409).json({
        code: 409,
        msg: '已有任务正在运行，请等待完成后再创建新任务'
      });
    }

    // 创建任务记录
    const [result] = await db.query(
      `INSERT INTO etl_tasks (task_name, task_type, status, time_start, time_end, created_by)
       VALUES (?, ?, 'pending', ?, ?, 'admin')`,
      [task_name, task_type, time_start, time_end]
    );

    const taskId = result.insertId;

    // 异步执行ETL任务
    setImmediate(() => {
      etlTaskService.executeETLTask(taskId, time_start, time_end);
    });

    res.json({
      code: 200,
      msg: '任务创建成功，开始执行',
      data: {
        task_id: taskId
      }
    });
  } catch (error) {
    console.error('创建任务失败:', error);
    res.status(500).json({
      code: 500,
      msg: '创建任务失败',
      error: error.message
    });
  }
};

/**
 * 取消任务
 * DELETE /api/etl/tasks/:id
 */
exports.cancelTask = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查任务状态
    const [tasks] = await db.query('SELECT * FROM etl_tasks WHERE id = ?', [id]);

    if (tasks.length === 0) {
      return res.status(404).json({
        code: 404,
        msg: '任务不存在'
      });
    }

    const task = tasks[0];

    if (!['pending', 'running'].includes(task.status)) {
      return res.status(400).json({
        code: 400,
        msg: '只能取消pending或running状态的任务'
      });
    }

    // TODO: 如果任务正在运行，需要杀掉进程
    // 这里暂时只更新状态
    await db.query(
      "UPDATE etl_tasks SET status = 'cancelled', finished_at = NOW() WHERE id = ?",
      [id]
    );

    res.json({
      code: 200,
      msg: '任务已取消'
    });
  } catch (error) {
    console.error('取消任务失败:', error);
    res.status(500).json({
      code: 500,
      msg: '取消任务失败',
      error: error.message
    });
  }
};

// ==================== 日志查询 ====================

/**
 * 获取任务日志
 * GET /api/etl/tasks/:id/logs?limit=100
 */
exports.getTaskLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;

    const [logs] = await db.query(
      'SELECT * FROM etl_logs WHERE task_id = ? ORDER BY created_at DESC LIMIT ?',
      [id, parseInt(limit)]
    );

    res.json({
      code: 200,
      msg: '获取日志成功',
      data: logs.reverse() // 反转为时间正序
    });
  } catch (error) {
    console.error('获取日志失败:', error);
    res.status(500).json({
      code: 500,
      msg: '获取日志失败',
      error: error.message
    });
  }
};

// ==================== 实时进度监控（SSE） ====================

// 存储活跃的SSE连接
// const sseConnections = new Map(); // 改用 sseService

/**
 * 实时获取任务进度（SSE）
 * GET /api/etl/tasks/:id/progress
 */
exports.getTaskProgress = async (req, res) => {
  try {
    const { id } = req.params;

    // 检查任务是否存在
    const [tasks] = await db.query('SELECT * FROM etl_tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      return res.status(404).json({
        code: 404,
        msg: '任务不存在'
      });
    }

    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // 注册连接
    sseService.addConnection(id, res, req);

    // 发送初始状态
    const task = tasks[0];
    res.write(`data: ${JSON.stringify({
      type: 'status',
      status: task.status,
      progress: {
        total: task.total_projects || 0,
        processed: task.processed_projects || 0,
        percentage: task.total_projects > 0
          ? Math.round((task.processed_projects / task.total_projects) * 100)
          : 0
      }
    })}\n\n`);

  } catch (error) {
    console.error('获取任务进度失败:', error);
    res.status(500).json({
      code: 500,
      msg: '获取任务进度失败',
      error: error.message
    });
  }
};

/**
 * 获取任务日志
 * GET /api/etl/tasks/:id/logs
 */
exports.getTaskLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 500 } = req.query;

    // Check if task exists
    const [tasks] = await db.query('SELECT * FROM etl_tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      return res.status(404).json({
        code: 404,
        msg: 'Task not found'
      });
    }

    // Get logs
    const [logs] = await db.query(
      'SELECT * FROM etl_logs WHERE task_id = ? ORDER BY created_at ASC LIMIT ?',
      [id, parseInt(limit)]
    );

    res.json({
      code: 200,
      msg: 'Get logs success',
      data: logs
    });

  } catch (error) {
    console.error('Failed to get task logs:', error);
    res.status(500).json({
      code: 500,
      msg: 'Failed to get task logs',
      error: error.message
    });
  }
};


// ==================== 定时任务管理 ====================

/**
 * 获取定时任务列表
 * GET /api/etl/schedules
 */
exports.getSchedules = async (req, res) => {
  try {
    const [schedules] = await db.query('SELECT * FROM etl_schedules ORDER BY id');

    res.json({
      code: 200,
      msg: '获取定时任务列表成功',
      data: schedules
    });
  } catch (error) {
    console.error('获取定时任务列表失败:', error);
    res.status(500).json({
      code: 500,
      msg: '获取定时任务列表失败',
      error: error.message
    });
  }
};

/**
 * 创建定时任务
 * POST /api/etl/schedules
 */
exports.createSchedule = async (req, res) => {
  try {
    const { schedule_name, task_type = 'full', cron_expression, task_config, is_enabled = 1 } = req.body;

    if (!schedule_name || !cron_expression) {
      return res.status(400).json({
        code: 400,
        msg: '缺少必需参数'
      });
    }

    // 处理 task_config，确保是 JSON 字符串
    const configJson = task_config ? JSON.stringify(task_config) : JSON.stringify({ time_start: '2021-01', time_end: '2025-10' });

    const [result] = await db.query(
      `INSERT INTO etl_schedules (schedule_name, task_type, cron_expression, task_config, is_enabled)
       VALUES (?, ?, ?, ?, ?)`,
      [schedule_name, task_type, cron_expression, configJson, is_enabled]
    );

    // 重新加载调度器
    try {
      if (etlScheduler) {
        await etlScheduler.reloadSchedule(result.insertId);
      }
    } catch (schedError) {
      console.warn('定时任务注册可能失败:', schedError);
    }

    res.json({
      code: 200,
      msg: '创建定时任务成功',
      data: {
        id: result.insertId
      }
    });
  } catch (error) {
    console.error('创建定时任务失败:', error);
    res.status(500).json({
      code: 500,
      msg: '创建定时任务失败',
      error: error.message
    });
  }
};

/**
 * 更新定时任务
 * PUT /api/etl/schedules/:id
 */
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { schedule_name, task_type, cron_expression, task_config, is_enabled } = req.body;

    const updates = [];
    const params = [];

    if (schedule_name !== undefined) {
      updates.push('schedule_name = ?');
      params.push(schedule_name);
    }
    if (task_type !== undefined) {
      updates.push('task_type = ?');
      params.push(task_type);
    }
    if (cron_expression !== undefined) {
      updates.push('cron_expression = ?');
      params.push(cron_expression);
    }
    if (task_config !== undefined) {
      updates.push('task_config = ?');
      params.push(JSON.stringify(task_config));
    }
    if (is_enabled !== undefined) {
      updates.push('is_enabled = ?');
      params.push(is_enabled);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        code: 400,
        msg: '没有可更新的字段'
      });
    }

    params.push(id);

    const [result] = await db.query(
      `UPDATE etl_schedules SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        msg: '定时任务不存在'
      });
    }

    // 更新调度器
    try {
      if (etlScheduler) {
        await etlScheduler.reloadSchedule(id);
      }
    } catch (schedError) {
      console.warn('定时任务更新可能失败:', schedError);
    }

    res.json({
      code: 200,
      msg: '更新定时任务成功'
    });
  } catch (error) {
    console.error('更新定时任务失败:', error);
    res.status(500).json({
      code: 500,
      msg: '更新定时任务失败',
      error: error.message
    });
  }
};

/**
 * 删除定时任务
 * DELETE /api/etl/schedules/:id
 */
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM etl_schedules WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        msg: '定时任务不存在'
      });
    }

    // 从调度器移除
    try {
      if (etlScheduler) {
        etlScheduler.unregisterSchedule(id);
      }
    } catch (schedError) {
      console.warn('定时任务移除可能失败:', schedError);
    }

    res.json({
      code: 200,
      msg: '删除定时任务成功'
    });
  } catch (error) {
    console.error('删除定时任务失败:', error);
    res.status(500).json({
      code: 500,
      msg: '删除定时任务失败',
      error: error.message
    });
  }

};

// ==================== ETL任务执行器 ====================

// 导出工具函数供外部使用
// 注意：实际执行逻辑已移动到 etlTaskService.js
// exports.executeETLTask = executeETLTask; // 已移除
// exports.broadcastProgress = broadcastProgress; // 已移除
