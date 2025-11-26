/**
 * 更新所有项目的 openrank_avg 字段
 * 将总体平均值改为每个项目各自的平均值
 */

const mysql = require('mysql');

const db = mysql.createConnection({
    host: '49.235.74.98',
    user: 'remote',
    password: 'Zhjh0704.',
    database: 'opendigger'
});

db.connect((err) => {
    if (err) {
        console.error('数据库连接失败:', err);
        process.exit(1);
    }
    console.log('数据库连接成功');
    updateOpenRankAvg();
});

function updateOpenRankAvg() {
    // 查询所有项目
    const query = 'SELECT project_id, company_name, project_name, openrank FROM github';

    db.query(query, (err, results) => {
        if (err) {
            console.error('查询失败:', err);
            db.end();
            process.exit(1);
        }

        console.log(`共找到 ${results.length} 个项目，开始更新...`);

        let completed = 0;
        let updated = 0;
        let errors = 0;

        results.forEach((project) => {
            try {
                // 解析 openrank JSON
                const openrankData = JSON.parse(project.openrank);
                const values = Object.values(openrankData).filter(v => v !== null && v !== undefined);

                if (values.length === 0) {
                    console.log(`项目 ${project.company_name}/${project.project_name} 没有 OpenRank 数据，跳过`);
                    completed++;
                    checkComplete();
                    return;
                }

                // 计算该项目的平均值
                const sum = values.reduce((acc, val) => acc + parseFloat(val), 0);
                const avg = sum / values.length;
                const avgRounded = Math.round(avg * 100) / 100; // 保留两位小数

                // 更新数据库
                const updateQuery = 'UPDATE github SET openrank_avg = ? WHERE project_id = ?';
                db.query(updateQuery, [avgRounded, project.project_id], (updateErr) => {
                    completed++;

                    if (updateErr) {
                        console.error(`更新项目 ${project.company_name}/${project.project_name} 失败:`, updateErr);
                        errors++;
                    } else {
                        updated++;
                        console.log(`✓ 项目 ${project.company_name}/${project.project_name}: ${avgRounded}`);
                    }

                    checkComplete();
                });
            } catch (parseErr) {
                console.error(`解析项目 ${project.company_name}/${project.project_name} 的数据失败:`, parseErr);
                completed++;
                errors++;
                checkComplete();
            }
        });

        function checkComplete() {
            if (completed === results.length) {
                console.log('\n===============================');
                console.log('更新完成！');
                console.log(`总数: ${results.length}`);
                console.log(`成功: ${updated}`);
                console.log(`失败: ${errors}`);
                console.log('===============================');
                db.end();
                process.exit(0);
            }
        }
    });
}
