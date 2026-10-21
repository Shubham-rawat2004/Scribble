import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env or local
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbConfig: mysql.PoolOptions = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'skribbl_user',
  password: process.env.DB_PASSWORD || 'skribbl_password',
  database: process.env.DB_NAME || 'skribbl_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true,
};

export const pool = process.env.DATABASE_URL
  ? mysql.createPool({ uri: process.env.DATABASE_URL, multipleStatements: true, waitForConnections: true, connectionLimit: 10 })
  : mysql.createPool(dbConfig);

/**
 * Tests database connectivity by pinging the connection pool.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log(`[Database] Successfully connected to MySQL at ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    return true;
  } catch (error) {
    console.error('[Database] Failed to connect to MySQL:', (error as Error).message);
    return false;
  }
}
