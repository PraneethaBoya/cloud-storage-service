import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Validate DATABASE_URL presence and type
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl || typeof dbUrl !== 'string' || dbUrl.trim() === '') {
  console.error('❌ Missing or invalid DATABASE_URL environment variable.');
  console.error('Set DATABASE_URL to a valid Postgres connection string, e.g. postgres://user:password@localhost:5432/dbname');
  // Do not crash here in development; create a pool without connectionString will rely on other PG_* env vars.
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

export default pool;

// Helper function to run queries
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error });
    throw error;
  }
}

// Helper function to run transactions
export async function transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
