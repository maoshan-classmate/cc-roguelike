import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export class Database {
  private pool: mysql.Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cc-roguelike',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    this.init();
  }

  private async init() {
    await this.createTables();
  }

  private async createTables() {
    const createAccountsTable = `
      CREATE TABLE IF NOT EXISTS accounts (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL
      )
    `;

    const createCharactersTable = `
      CREATE TABLE IF NOT EXISTS characters (
        id VARCHAR(36) PRIMARY KEY,
        account_id VARCHAR(36) NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        level INT DEFAULT 1,
        exp INT DEFAULT 0,
        gold INT DEFAULT 0,
        hp INT DEFAULT 100,
        hp_max INT DEFAULT 100,
        energy INT DEFAULT 50,
        energy_max INT DEFAULT 50,
        attack INT DEFAULT 10,
        defense INT DEFAULT 5,
        speed FLOAT DEFAULT 5.0,
        x FLOAT DEFAULT 0,
        y FLOAT DEFAULT 0,
        weapon VARCHAR(255) DEFAULT 'pistol',
        character_type VARCHAR(20) DEFAULT 'warrior',
        skills VARCHAR(1000) DEFAULT '["dash","shield"]',
        inventory VARCHAR(2000) DEFAULT '[]',
        highest_floor INT DEFAULT 0,
        total_kills INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      )
    `;

    const createFriendsTable = `
      CREATE TABLE IF NOT EXISTS friends (
        id VARCHAR(36) PRIMARY KEY,
        account_id VARCHAR(36) NOT NULL,
        friend_id VARCHAR(36) NOT NULL,
        status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (friend_id) REFERENCES accounts(id) ON DELETE CASCADE,
        UNIQUE KEY unique_friend (account_id, friend_id)
      )
    `;

    try {
      await this.pool.execute(createAccountsTable);
      await this.pool.execute(createCharactersTable);
      await this.pool.execute(createFriendsTable);
      console.log('📦 Database tables initialized');
    } catch (error) {
      console.error('Failed to initialize database tables:', error);
    }

    // 兼容已有数据库：添加 character_type 列
    try {
      await this.pool.execute('ALTER TABLE characters ADD COLUMN character_type VARCHAR(20) DEFAULT \'warrior\' AFTER weapon');
    } catch (e: any) {
      if (!e.message.includes('Duplicate column')) throw e;
    }
  }

  async query<T>(sql: string, params?: any[]): Promise<T> {
    const [rows] = await this.pool.execute(sql, params);
    return rows as T;
  }

  async execute(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    const [result] = await this.pool.execute(sql, params);
    return result as mysql.ResultSetHeader;
  }

  getPool() {
    return this.pool;
  }
}
