/**
 * ETL Task Service
 * Handles execution of ETL tasks
 */
const db = require('../db/promise');
const { spawn } = require('child_process');
const path = require('path');
const sseService = require('./sseService');

/**
 * Execute ETL Task
 * @param {number} taskId 
 * @param {string} timeStart 
 * @param {string} timeEnd 
 */
async function executeETLTask(taskId, timeStart, timeEnd) {
    try {
        console.log(`[Task ${taskId}] Starting ETL Task`);

        // Update status to running
        await db.query(
            "UPDATE etl_tasks SET status = 'running', started_at = NOW(), current_step = 'Initializing' WHERE id = ?",
            [taskId]
        );

        // Initial log
        await insertLog(taskId, 'info', 'START', `ETL Task Started (${timeStart} ~ ${timeEnd})`);

        // Get configuration
        const [configRows] = await db.query("SELECT * FROM etl_config WHERE config_key = 'python_path'");
        const pythonPath = configRows.length > 0
            ? JSON.parse(configRows[0].config_value).value
            : 'python';

        // Python script path
        const scriptPath = path.join(__dirname, '../etl_scripts/main.py');

        // Spawn Python process
        const pythonProcess = spawn(pythonPath, [scriptPath, timeStart, timeEnd, String(taskId)], {
            cwd: path.join(__dirname, '../etl_scripts')
        });

        // Handle stdout
        pythonProcess.stdout.on('data', async (data) => {
            const lines = data.toString().split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);

                    if (parsed.type === 'LOG') {
                        // Log entry
                        await insertLog(taskId, parsed.level, parsed.step, parsed.message, parsed.data);

                        // Update current step
                        await db.query(
                            "UPDATE etl_tasks SET current_step = ? WHERE id = ?",
                            [parsed.step, taskId]
                        );
                    } else if (parsed.type === 'PROGRESS') {
                        // Update progress
                        await db.query(
                            "UPDATE etl_tasks SET total_projects = ?, processed_projects = ? WHERE id = ?",
                            [parsed.total, parsed.current, taskId]
                        );

                        // Push progress via SSE
                        sseService.broadcastProgress(taskId, {
                            type: 'progress',
                            ...parsed
                        });
                    } else if (parsed.type === 'RESULT') {
                        // Final result
                        if (parsed.success) {
                            await db.query(
                                `UPDATE etl_tasks SET
                  status = 'success',
                  finished_at = NOW(),
                  total_projects = ?,
                  processed_projects = ?,
                  total_records = ?
                 WHERE id = ?`,
                                [parsed.data.projects_count, parsed.data.projects_count, parsed.data.records_count, taskId]
                            );

                            await insertLog(taskId, 'info', 'SUCCESS', parsed.message, parsed.data);
                        } else {
                            await db.query(
                                "UPDATE etl_tasks SET status = 'failed', finished_at = NOW(), error_message = ? WHERE id = ?",
                                [parsed.error, taskId]
                            );

                            await insertLog(taskId, 'error', 'FAILED', parsed.message, { error: parsed.error });
                        }

                        // Push final status
                        sseService.broadcastProgress(taskId, {
                            type: 'complete',
                            success: parsed.success,
                            message: parsed.message
                        });
                    }
                } catch (error) {
                    // Non-JSON output, log directly
                    console.log(`[Task ${taskId}] Output:`, line);
                }
            }
        });

        // Handle stderr
        pythonProcess.stderr.on('data', async (data) => {
            const error = data.toString();

            // Filter out tqdm progress bars (they write to stderr but aren't errors)
            // Progress bars typically contain patterns like: "Downloading:", "Processing:", percentages, or progress indicators
            const isProgressBar = error.includes('Downloading:') ||
                error.includes('Processing:') ||
                error.includes('%|') ||
                error.match(/\d+\/\d+\s+\[/);

            if (!isProgressBar) {
                console.error(`[Task ${taskId}] Error:`, error);
                await insertLog(taskId, 'error', 'STDERR', error);
            }
        });

        // Handle process exit
        pythonProcess.on('close', async (code) => {
            console.log(`[Task ${taskId}] Python process exited with code: ${code}`);

            if (code !== 0) {
                // Abnormal exit
                await db.query(
                    "UPDATE etl_tasks SET status = 'failed', finished_at = NOW(), error_message = ? WHERE id = ?",
                    [`Process exited abnormally, code: ${code}`, taskId]
                );

                await insertLog(taskId, 'error', 'FAILED', `Process exited abnormally, code: ${code}`);

                sseService.broadcastProgress(taskId, {
                    type: 'error',
                    message: `Process exited abnormally, code: ${code}`
                });
            }
        });

    } catch (error) {
        console.error(`[Task ${taskId}] Execution failed:`, error);

        await db.query(
            "UPDATE etl_tasks SET status = 'failed', finished_at = NOW(), error_message = ? WHERE id = ?",
            [error.message, taskId]
        );

        await insertLog(taskId, 'error', 'FAILED', `Task execution failed: ${error.message}`);

        sseService.broadcastProgress(taskId, {
            type: 'error',
            message: error.message
        });
    }
}

/**
 * Insert log entry
 */
async function insertLog(taskId, level, step, message, data = null) {
    try {
        await db.query(
            'INSERT INTO etl_logs (task_id, log_level, log_step, log_message, log_data) VALUES (?, ?, ?, ?, ?)',
            [taskId, level, step, message, data ? JSON.stringify(data) : null]
        );
    } catch (error) {
        console.error('Failed to insert log:', error);
    }
}

module.exports = {
    executeETLTask
};
