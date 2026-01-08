/**
 * SSE Service
 * Manages Server-Sent Events connections for real-time updates
 */

// Store active SSE connections: taskId -> Set of response objects
const sseConnections = new Map();

/**
 * Register a new SSE connection
 * @param {string|number} taskId - The task ID
 * @param {object} res - The response object
 * @param {object} req - The request object (to handle close event)
 */
function addConnection(taskId, res, req) {
    const id = String(taskId);

    if (!sseConnections.has(id)) {
        sseConnections.set(id, new Set());
    }

    sseConnections.get(id).add(res);

    // Clean up on client disconnect
    req.on('close', () => {
        const connections = sseConnections.get(id);
        if (connections) {
            connections.delete(res);
            if (connections.size === 0) {
                sseConnections.delete(id);
            }
        }
    });
}

/**
 * Broadcast progress update to all subscribers of a task
 * @param {string|number} taskId - The task ID
 * @param {object} data - The data to send
 */
function broadcastProgress(taskId, data) {
    const connections = sseConnections.get(String(taskId));
    if (connections) {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        connections.forEach(res => {
            try {
                res.write(message);
            } catch (error) {
                console.error('Failed to push progress:', error);
            }
        });
    }
}

module.exports = {
    addConnection,
    broadcastProgress
};
