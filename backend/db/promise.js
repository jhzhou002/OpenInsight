const mysql = require('mysql2/promise')

// ETL 服务专用的 Promise-based 连接池
const db = mysql.createPool({
    host: localhost,
    user: usernamee,
    password: pwd,
    database: db,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

module.exports = db
