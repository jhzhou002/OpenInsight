const mysql = require('mysql')

const db = mysql.createPool({
    host: '49.235.74.98',
    user: 'remote',
    password: 'Zhjh0704.',
    database: 'opendigger'
})

module.exports = db