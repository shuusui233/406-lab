import mysql from 'mysql2/promise';

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'lab406',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(config);

export async function query(sql, params = []) {
  const [rows, fields] = await pool.execute(sql, params);
  return rows;
}

export async function getConnection() {
  return await pool.getConnection();
}

export { pool };

export default { query, getConnection, pool };
