const mysql = require('mysql')

const db = mysql.createPool({
    host: '49.235.74.98',
    user: 'tongyong',
    password: 'zhjh0704',
    database: 'openrank'
})

module.exports = db