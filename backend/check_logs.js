const db = require('./db/promise');

async function checkLogs() {
    try {
        // Check recent tasks
        console.log('=== Recent ETL Tasks ===');
        const [tasks] = await db.query('SELECT id, task_name, status FROM etl_tasks ORDER BY id DESC LIMIT 5');
        console.table(tasks);

        // Check logs for the most recent task
        if (tasks.length > 0) {
            const latestTaskId = tasks[0].id;
            console.log(`\n=== Logs for Task #${latestTaskId} ===`);
            const [logs] = await db.query(
                'SELECT log_level, log_step, log_message, created_at FROM etl_logs WHERE task_id = ? ORDER BY created_at ASC LIMIT 10',
                [latestTaskId]
            );
            console.table(logs);

            console.log(`\nTotal logs for task ${latestTaskId}:`, logs.length);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkLogs();
