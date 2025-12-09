/**
 * 测试修复后的ETL处理逻辑
 */

const ETLProcessor = require('./backend/services/etlProcessor');

async function testETL() {
  // 使用一个测试项目
  const owner = 'facebook';
  const repo = 'react';

  console.log('🧪 测试ETL处理器');
  console.log(`项目: ${owner}/${repo}\n`);

  const processor = new ETLProcessor(owner, repo);

  try {
    // 执行ETL
    const result = await processor.process();

    if (result.success) {
      console.log('\n✅ ETL处理成功!');
    } else {
      console.log('\n❌ ETL处理失败:', result.message);
    }

  } catch (error) {
    console.error('\n❌ ETL测试失败:', error.message);
    console.error(error.stack);
  }
}

testETL();
