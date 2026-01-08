/**
 * ETL定时任务调度器
 * 使用node-cron实现定时自动执行ETL任务
 */
const cron = require('node-cron');
const db = require('../db/promise');
const { executeETLTask } = require('./etlTaskService');

// 存储所有活跃的定时任务
const activeCronJobs = new Map(); // scheduleId -> cronJob

/**
 * 初始化调度器 - 加载所有启用的定时任务
 */
async function initScheduler() {
  try {
    console.log('========================================');
    console.log('ETL定时任务调度器初始化');
    console.log('========================================');

    const [schedules] = await db.query(
      'SELECT * FROM etl_schedules WHERE is_enabled = 1'
    );

    console.log(`找到 ${schedules.length} 个启用的定时任务`);

    for (const schedule of schedules) {
      await registerSchedule(schedule);
    }

    console.log('定时任务调度器初始化完成');
    console.log('========================================');
  } catch (error) {
    console.error('定时任务调度器初始化失败:', error);
  }
}

/**
 * 注册定时任务
 */
async function registerSchedule(schedule) {
  try {
    const { id, schedule_name, task_type, cron_expression } = schedule;

    // 如果该任务已经注册，先停止
    if (activeCronJobs.has(id)) {
      const existingJob = activeCronJobs.get(id);
      existingJob.stop();
      activeCronJobs.delete(id);
    }

    // 验证cron表达式
    if (!cron.validate(cron_expression)) {
      console.error(`[Schedule ${id}] 无效的cron表达式: ${cron_expression}`);
      return false;
    }

    // 创建定时任务
    const cronJob = cron.schedule(cron_expression, async () => {
      console.log(`[Schedule ${id}] 定时任务触发: ${schedule_name}`);
      await executeScheduledTask(schedule);
    }, {
      scheduled: true,
      timezone: 'Asia/Shanghai' // 使用中国时区
    });

    activeCronJobs.set(id, cronJob);

    // 计算下次运行时间（近似值）
    const nextRun = calculateNextRun(cron_expression);
    await db.query(
      'UPDATE etl_schedules SET next_run_at = ? WHERE id = ?',
      [nextRun, id]
    );

    console.log(`[Schedule ${id}] 定时任务已注册: ${schedule_name} (${cron_expression})`);
    console.log(`[Schedule ${id}] 下次运行时间: ${nextRun}`);

    return true;
  } catch (error) {
    console.error(`注册定时任务失败 (ID: ${schedule.id}):`, error);
    return false;
  }
}

/**
 * 注销定时任务
 */
function unregisterSchedule(scheduleId) {
  if (activeCronJobs.has(scheduleId)) {
    const cronJob = activeCronJobs.get(scheduleId);
    cronJob.stop();
    activeCronJobs.delete(scheduleId);
    console.log(`[Schedule ${scheduleId}] 定时任务已停止`);
    return true;
  }
  return false;
}

/**
 * 重新加载定时任务（用于配置更新后）
 */
async function reloadSchedule(scheduleId) {
  try {
    const [schedules] = await db.query(
      'SELECT * FROM etl_schedules WHERE id = ?',
      [scheduleId]
    );

    if (schedules.length === 0) {
      console.warn(`[Schedule ${scheduleId}] 定时任务不存在`);
      return false;
    }

    const schedule = schedules[0];

    // 停止旧任务
    unregisterSchedule(scheduleId);

    // 如果启用，重新注册
    if (schedule.is_enabled) {
      return await registerSchedule(schedule);
    }

    return true;
  } catch (error) {
    console.error(`重新加载定时任务失败 (ID: ${scheduleId}):`, error);
    return false;
  }
}

/**
 * 执行定时触发的任务
 */
async function executeScheduledTask(schedule) {
  try {
    const { id, schedule_name, task_type } = schedule;

    console.log(`[Schedule ${id}] 开始执行定时任务: ${schedule_name}`);

    // 更新上次运行时间
    await db.query(
      'UPDATE etl_schedules SET last_run_at = NOW() WHERE id = ?',
      [id]
    );

    // 检查是否有正在运行的任务
    const [runningTasks] = await db.query(
      "SELECT COUNT(*) as count FROM etl_tasks WHERE status IN ('pending', 'running')"
    );

    if (runningTasks[0].count > 0) {
      console.warn(`[Schedule ${id}] 已有任务正在运行，跳过本次执行`);
      return;
    }

    // 获取时间范围配置
    const [configRows] = await db.query(
      "SELECT config_value FROM etl_config WHERE config_key = 'time_range'"
    );

    if (configRows.length === 0) {
      console.error(`[Schedule ${id}] 未找到time_range配置`);
      return;
    }

    const timeRange = JSON.parse(configRows[0].config_value);
    const { start: timeStart, end: timeEnd } = timeRange;

    // 创建任务记录
    const taskName = `${schedule_name} (自动)`;
    const [result] = await db.query(
      `INSERT INTO etl_tasks (task_name, task_type, status, time_start, time_end, created_by)
       VALUES (?, ?, 'pending', ?, ?, 'scheduler')`,
      [taskName, task_type, timeStart, timeEnd]
    );

    const taskId = result.insertId;

    console.log(`[Schedule ${id}] 创建任务成功，任务ID: ${taskId}`);

    // 异步执行ETL任务
    setImmediate(() => {
      executeETLTask(taskId, timeStart, timeEnd);
    });

    // 计算并更新下次运行时间
    const nextRun = calculateNextRun(schedule.cron_expression);
    await db.query(
      'UPDATE etl_schedules SET next_run_at = ? WHERE id = ?',
      [nextRun, id]
    );

  } catch (error) {
    console.error(`[Schedule ${schedule.id}] 执行定时任务失败:`, error);
  }
}

/**
 * 计算cron表达式的下次运行时间（简化版）
 * 注意：这是一个简化实现，实际应该使用cron-parser库
 */
function calculateNextRun(cronExpression) {
  // 这里返回一个近似值
  // 实际应该使用库如 cron-parser 来精确计算
  const now = new Date();

  // 简单处理：如果是每月1号，就返回下个月1号
  if (cronExpression.includes('1 * *')) {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(2, 0, 0, 0); // 凌晨2点
    return nextMonth;
  }

  // 默认返回明天同一时间
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * 停止所有定时任务
 */
function stopAll() {
  console.log('停止所有定时任务...');
  activeCronJobs.forEach((job, id) => {
    job.stop();
    console.log(`[Schedule ${id}] 已停止`);
  });
  activeCronJobs.clear();
}

/**
 * 获取活跃任务数量
 */
function getActiveJobCount() {
  return activeCronJobs.size;
}

module.exports = {
  initScheduler,
  registerSchedule,
  unregisterSchedule,
  reloadSchedule,
  executeScheduledTask,
  stopAll,
  getActiveJobCount
};
