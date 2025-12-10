/**
 * 初始化ETL管理系统数据库表
 */
const fs = require('fs');
const path = require('path');
const db = require('../db/promise');

async function initETLTables() {
  console.log('======================================');
  console.log('开始初始化ETL管理系统数据库表');
  console.log('======================================');

  try {
    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'etl_management.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');

    // 分割SQL语句（按分号分割，但排除注释和空行）
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt =>
        stmt.length > 0 &&
        !stmt.startsWith('--') &&
        !stmt.startsWith('/*')
      );

    console.log(`\n共 ${statements.length} 条SQL语句待执行\n`);

    // 逐条执行SQL
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // 提取表名或操作类型
      let operation = 'SQL';
      if (stmt.includes('CREATE TABLE')) {
        const match = stmt.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?/i);
        operation = match ? `创建表: ${match[1]}` : '创建表';
      } else if (stmt.includes('INSERT INTO')) {
        const match = stmt.match(/INSERT INTO\s+`?(\w+)`?/i);
        operation = match ? `插入数据: ${match[1]}` : '插入数据';
      }

      try {
        await db.query(stmt);
        console.log(`✓ [${i + 1}/${statements.length}] ${operation}`);
      } catch (err) {
        // 如果是重复键错误（ON DUPLICATE KEY UPDATE），忽略
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`- [${i + 1}/${statements.length}] ${operation} (已存在，跳过)`);
        } else {
          console.error(`✗ [${i + 1}/${statements.length}] ${operation}`);
          console.error(`  错误: ${err.message}`);
        }
      }
    }

    // 验证表是否创建成功
    console.log('\n======================================');
    console.log('验证表结构');
    console.log('======================================\n');

    const tables = ['etl_config', 'etl_tasks', 'etl_logs', 'etl_schedules'];
    for (const table of tables) {
      const [rows] = await db.query(
        `SELECT COUNT(*) as count FROM information_schema.tables
         WHERE table_schema = 'opendigger' AND table_name = ?`,
        [table]
      );

      if (rows[0].count > 0) {
        // 查询记录数
        const [countRows] = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✓ ${table} (${countRows[0].count} 条记录)`);
      } else {
        console.log(`✗ ${table} (不存在)`);
      }
    }

    console.log('\n======================================');
    console.log('✓ 数据库表初始化完成！');
    console.log('======================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n======================================');
    console.error('✗ 初始化失败:');
    console.error(error);
    console.error('======================================\n');
    process.exit(1);
  }
}

// 执行初始化
initETLTables();
