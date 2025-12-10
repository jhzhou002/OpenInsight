/**
 * 数据库迁移脚本 - 添加 task_config 字段到 etl_schedules 表
 * 执行方式: node backend/database/migrate_add_task_config.js
 */

const db = require('../db/index');
const util = require('util');

// 将回调函数转换为 Promise
const query = util.promisify(db.query).bind(db);

async function migrate() {
  console.log('开始数据库迁移...');
  console.log('添加 task_config 字段到 etl_schedules 表\n');

  try {
    // 1. 检查字段是否已存在
    console.log('1. 检查字段是否存在...');
    const columns = await query("SHOW COLUMNS FROM etl_schedules WHERE Field = 'task_config'");

    if (columns.length > 0) {
      console.log('   ✓ task_config 字段已存在，跳过添加\n');
    } else {
      // 2. 添加字段
      console.log('   → task_config 字段不存在');
      console.log('2. 正在添加 task_config 字段...');
      await query(
        "ALTER TABLE etl_schedules ADD COLUMN task_config JSON COMMENT '任务配置(time_start, time_end等)' AFTER cron_expression"
      );
      console.log('   ✓ task_config 字段添加成功\n');
    }

    // 3. 为现有记录设置默认值
    console.log('3. 正在更新现有记录的默认值...');
    const result = await query(
      "UPDATE etl_schedules SET task_config = JSON_OBJECT('time_start', '2021-01', 'time_end', '2025-10') WHERE task_config IS NULL"
    );
    console.log(`   ✓ 已更新 ${result.affectedRows} 条记录\n`);

    // 4. 验证结果
    console.log('4. 验证更新结果:');
    const schedules = await query('SELECT * FROM etl_schedules');

    if (schedules.length === 0) {
      console.log('   → 当前没有定时任务记录\n');
    } else {
      console.table(
        schedules.map(s => ({
          ID: s.id,
          名称: s.schedule_name,
          Cron: s.cron_expression,
          配置: s.task_config ? JSON.stringify(s.task_config) : 'NULL',
          状态: s.is_enabled === 1 ? '启用' : '禁用'
        }))
      );
    }

    console.log('\n✓ 数据库迁移完成！');

    // 关闭数据库连接
    db.end(err => {
      if (err) {
        console.error('关闭数据库连接失败:', err);
      }
      process.exit(0);
    });
  } catch (error) {
    console.error('\n✗ 数据库迁移失败:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('提示: task_config 字段可能已经存在');
    }
    console.error('\n错误详情:', error);

    db.end(() => {
      process.exit(1);
    });
  }
}

// 执行迁移
migrate();
