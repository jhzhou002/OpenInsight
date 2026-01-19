const mysql = require('mysql2/promise')

// ETL 服务专用的 Promise-based 连接池
const db = mysql.createPool({
    host: '49.235.74.98',
    user: 'remote',
    password: 'Zhjh0704.',
    database: 'opendigger',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

module.exports = db
