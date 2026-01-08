/**
 * Get task logs function - to be inserted into etl_admin.js
 */

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
