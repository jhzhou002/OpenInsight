/**
 * 更新baseline配置,添加缺失的字段
 * 根据PDF文档标准
 */

const db = require('./backend/db/promise');

async function updateBaseline() {
  try {
    // 1. 查询当前baseline
    const [rows] = await db.query('SELECT baseline FROM baseline_config LIMIT 1');

    if (rows.length === 0) {
      console.error('❌ baseline_config表中没有数据');
      process.exit(1);
    }

    const baseline = rows[0].baseline;
    console.log('📥 当前baseline配置:');
    console.log(JSON.stringify(baseline, null, 2));

    // 2. 修正PREI baseline结构
    // 应该是整体PREI_raw的min/max,而不是四个维度
    baseline.prei_raw_baseline = {
      prei_raw: {
        min: 0,
        max: 1
      }
    };

    // 3. 添加GitHub指数社区反应维度缺失的时间指标baseline
    // 这些值需要从Top300数据中统计,这里先用估计值
    baseline.github_raw_baseline.issue_resolution_duration_sum = {
      min: 0,
      max: 100000  // 需要从实际数据计算
    };

    baseline.github_raw_baseline.change_request_resolution_duration_sum = {
      min: 0,
      max: 100000  // 需要从实际数据计算
    };

    console.log('\n📤 更新后的baseline配置:');
    console.log(JSON.stringify(baseline, null, 2));

    // 4. 更新数据库
    await db.query(
      'UPDATE baseline_config SET baseline = ? WHERE id = 1',
      [JSON.stringify(baseline)]
    );

    console.log('\n✅ Baseline配置已更新!');
    console.log('\n⚠️  注意: issue_resolution_duration_sum 和 change_request_resolution_duration_sum 的 min/max 值需要从实际Top300数据中计算');
    console.log('建议在整体ETL运行后,根据实际数据更新这些值');

  } catch (error) {
    console.error('❌ 更新失败:', error);
  } finally {
    await db.end();
  }
}

updateBaseline();
