const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'mainline.proxy.rlwy.net',
    user: 'root',
    password: 'ysHjhTaXKemgPEAGGkEvXXrPeiDZyEaz',
    database: 'railway',
    port: 23066,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;