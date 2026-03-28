import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../data/Database';

interface Account {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date;
  last_login: Date | null;
}

interface Character {
  id: string;
  account_id: string;
  name: string;
  level: number;
  exp: number;
  gold: number;
  hp: number;
  hp_max: number;
  energy: number;
  energy_max: number;
  attack: number;
  defense: number;
  speed: number;
  x: number;
  y: number;
  weapon: string;
  character_type: string;
  skills: string;
  inventory: string;
  highest_floor: number;
  total_kills: number;
}

interface AuthResult {
  success: boolean;
  error?: string;
  token?: string;
  user?: {
    id: string;
    username: string;
    character?: Character;
  };
}

export class AuthManager {
  private db: Database;
  private jwtSecret: string;

  constructor(db: Database) {
    this.db = db;
    this.jwtSecret = process.env.JWT_SECRET || 'default_secret_change_me';
  }

  async register(username: string, password: string): Promise<AuthResult> {
    try {
      // Check if username exists
      const existing = await this.db.query<Account[]>(
        'SELECT id FROM accounts WHERE username = ?',
        [username]
      );

      if (existing.length > 0) {
        return { success: false, error: 'USERNAME_EXISTS' };
      }

      // Create account
      const accountId = uuidv4();
      const passwordHash = await bcrypt.hash(password, 10);

      await this.db.execute(
        'INSERT INTO accounts (id, username, password_hash) VALUES (?, ?, ?)',
        [accountId, username, passwordHash]
      );

      // Create default character
      const characterId = uuidv4();
      const defaultSkills = JSON.stringify(['dash', 'shield']);

      await this.db.execute(
        `INSERT INTO characters (id, account_id, name, weapon, character_type, skills)
         VALUES (?, ?, ?, 'pistol', 'warrior', ?)`,
        [characterId, accountId, username, defaultSkills]
      );

      // Generate token
      const token = this.generateToken(accountId, username);

      return {
        success: true,
        token,
        user: {
          id: accountId,
          username,
          character: {
            id: characterId,
            account_id: accountId,
            name: username,
            level: 1,
            exp: 0,
            gold: 0,
            hp: 100,
            hp_max: 100,
            energy: 50,
            energy_max: 50,
            attack: 10,
            defense: 5,
            speed: 5.0,
            x: 0,
            y: 0,
            weapon: 'pistol',
            character_type: 'warrior',
            skills: defaultSkills,
            inventory: '[]',
            highest_floor: 0,
            total_kills: 0
          }
        }
      };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Server error' };
    }
  }

  async login(username: string, password: string): Promise<AuthResult> {
    try {
      const accounts = await this.db.query<Account[]>(
        'SELECT * FROM accounts WHERE username = ?',
        [username]
      );

      if (accounts.length === 0) {
        return { success: false, error: 'AUTH_FAILED' };
      }

      const account = accounts[0];
      const validPassword = await bcrypt.compare(password, account.password_hash);

      if (!validPassword) {
        return { success: false, error: 'AUTH_FAILED' };
      }

      // Update last login
      await this.db.execute(
        'UPDATE accounts SET last_login = NOW() WHERE id = ?',
        [account.id]
      );

      // Get character
      const characters = await this.db.query<Character[]>(
        'SELECT * FROM characters WHERE account_id = ?',
        [account.id]
      );

      const token = this.generateToken(account.id, account.username);

      return {
        success: true,
        token,
        user: {
          id: account.id,
          username: account.username,
          character: characters[0] || undefined
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Server error' };
    }
  }

  verifyToken(token: string): { accountId: string; username: string } | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      return { accountId: decoded.id, username: decoded.username };
    } catch {
      return null;
    }
  }

  private generateToken(accountId: string, username: string): string {
    return jwt.sign(
      { id: accountId, username },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  async getCharacter(accountId: string): Promise<Character | null> {
    const characters = await this.db.query<Character[]>(
      'SELECT * FROM characters WHERE account_id = ?',
      [accountId]
    );
    return characters[0] || null;
  }

  async saveCharacter(character: Partial<Character> & { id: string }): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(character)) {
      if (key !== 'id' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length > 0) {
      values.push(character.id);
      await this.db.execute(
        `UPDATE characters SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  async updateCharacterType(accountId: string, characterType: string): Promise<void> {
    const characters = await this.db.query<Character[]>(
      'SELECT id FROM characters WHERE account_id = ?',
      [accountId]
    );
    if (characters.length > 0) {
      await this.db.execute(
        'UPDATE characters SET character_type = ? WHERE account_id = ?',
        [characterType, accountId]
      );
    }
  }
}
