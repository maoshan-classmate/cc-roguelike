/**
 * Roguelike Pixel Retro UI Components Reference
 * Based on Pencil Design System
 *
 * Page: D:\cc-roguelike\docs\superpowers\design\ui-design-kit.css
 *
 * Usage:
 * import './ui-design-kit.css';
 * <button className="btn-pixel-primary">[ START GAME ]</button>
 */

// ============================================
// Color Variables Reference
// ============================================
// CSS variables are defined in ui-design-kit.css
// Use: background: var(--pixel-gold); color: var(--pixel-bg);

// ============================================
// Button Components
// ============================================

/**
 * Primary Button - Gold background
 * Usage: <button className="btn-pixel-primary">[ START GAME ]</button>
 */
.btn-pixel-primary {
  background: var(--pixel-gold);
  color: var(--pixel-bg);
  border: var(--pixel-border) solid var(--pixel-brown);
  padding: 12px 24px;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: var(--pixel-shadow);
}

/**
 * Secondary Button - Brown background
 * Usage: <button className="btn-pixel-secondary">[ JOIN ROOM ]</button>
 */
.btn-pixel-secondary {
  background: var(--pixel-brown);
  color: var(--pixel-white);
  border: var(--pixel-border) solid var(--pixel-bg-dark);
  padding: 12px 24px;
  font-size: 14px;
  cursor: pointer;
  box-shadow: var(--pixel-shadow);
}

/**
 * Small Button - Green
 * Usage: <button className="btn-pixel-small">[ READY ]</button>
 */
.btn-pixel-small {
  background: var(--pixel-green);
  color: var(--pixel-bg);
  border: 2px solid var(--pixel-brown);
  padding: 8px 16px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
}

/**
 * Disabled Button
 * Usage: <button className="btn-pixel-disabled" disabled>[ WAITING... ]</button>
 */
.btn-pixel-disabled {
  background: var(--pixel-dark);
  color: var(--pixel-gray);
  border: var(--pixel-border) solid #555555;
  padding: 12px 24px;
  font-size: 14px;
  cursor: not-allowed;
  opacity: 0.7;
}

// ============================================
// Card Components
// ============================================

/**
 * Standard Card - Dark background with brown border
 * Usage: <div className="card-pixel">Content</div>
 */
.card-pixel {
  background: var(--pixel-bg);
  border: var(--pixel-border) solid var(--pixel-brown);
  padding: 16px;
  box-shadow: var(--pixel-shadow);
}

/**
 * Dark Card - Darker background
 * Usage: <div className="card-pixel-dark">Content</div>
 */
.card-pixel-dark {
  background: var(--pixel-bg-dark);
  border: var(--pixel-border) solid var(--pixel-brown);
  padding: 16px;
}

// ============================================
// Input Components
// ============================================

/**
 * Text Input - Brown border
 * Usage: <input className="input-pixel" placeholder="Enter username..." />
 */
.input-pixel {
  background: var(--pixel-bg);
  border: 3px solid var(--pixel-brown);
  color: var(--pixel-white);
  padding: 12px 16px;
  font-size: 14px;
  outline: none;
}

.input-pixel:focus {
  border-color: var(--pixel-gold);
  box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.3);
}

/**
 * Number Input - Gold border (for room codes)
 * Usage: <input className="input-pixel-number" type="text" maxLength={4} />
 */
.input-pixel-number {
  background: var(--pixel-bg);
  border: 3px solid var(--pixel-gold);
  color: var(--pixel-gold);
  padding: 10px 14px;
  font-size: 18px;
  text-align: center;
  letter-spacing: 4px;
}

// ============================================
// Status Badges
// ============================================

/**
 * Status Badge - Waiting (Brown)
 * Usage: <span className="badge-pixel badge-waiting">[ 等待中 ]</span>
 */
.badge-pixel {
  display: inline-block;
  padding: 4px 12px;
  border: 2px solid var(--pixel-brown);
  font-size: 12px;
}

.badge-waiting {
  background: var(--pixel-bg);
  color: var(--pixel-brown);
  border-color: var(--pixel-brown);
}

/**
 * Status Badge - Ready (Green)
 * Usage: <span className="badge-pixel badge-ready">[ 准备就绪 ]</span>
 */
.badge-ready {
  background: var(--pixel-bg);
  color: var(--pixel-green);
  border-color: var(--pixel-green);
}

/**
 * Status Badge - In Game (Red)
 * Usage: <span className="badge-pixel badge-in-game">[ 游戏中 ]</span>
 */
.badge-in-game {
  background: var(--pixel-bg);
  color: var(--pixel-red);
  border-color: var(--pixel-red);
}

// ============================================
// Progress Bars
// ============================================

/**
 * HP Bar - Green fill
 * Usage: <div className="progress-bar-pixel"><div className="progress-bar-pixel-fill progress-hp" style={{width: '60%'}} /></div>
 */
.progress-bar-pixel {
  background: var(--pixel-bg-dark);
  border: 2px solid var(--pixel-brown);
  height: 25px;
  position: relative;
}

.progress-bar-pixel-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-hp { background: var(--pixel-green); }
.progress-mp { background: var(--player-1); }
.progress-exp { background: var(--pixel-gold); }

// ============================================
// Typography Classes
// ============================================

/* Title: text-pixel-title - Gold, 24px, uppercase */
/* Subtitle: text-pixel-subtitle - White, 16px */
/* Body: text-pixel-body - Light gray, 14px */
/* Small: text-pixel-small - Gray, 12px */
/* Status: text-pixel-status - Bold, 14px */

/* Player colors: text-player-1 through text-player-4 */
/* Accent colors: text-gold, text-red, text-green */

// ============================================
// Room Card Component
// ============================================

/**
 * Room Card - Full component
 * Usage:
 * <div className="room-card">
 *   <div>
 *     <div className="room-card-title">Room #1234</div>
 *     <div className="room-card-info">[ 等待中 ] - 2/4 players</div>
 *   </div>
 *   <button className="btn-pixel-small">加入</button>
 * </div>
 */
.room-card {
  background: var(--pixel-bg);
  border: 3px solid var(--pixel-brown);
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--pixel-shadow);
  transition: transform 0.1s;
}

.room-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.5);
  border-color: var(--pixel-gold);
}

// ============================================
// Player Slots
// ============================================

/**
 * Player Slot - Circular indicator
 * Usage:
 * <div className={`player-slot player-slot-1 ${isEmpty ? 'player-slot-empty' : ''}`}>
 *   {!isEmpty && <PlayerIcon />}
 * </div>
 */
.player-slot {
  width: 60px;
  height: 60px;
  border: 3px solid var(--pixel-brown);
  background: var(--pixel-bg-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%; /* Makes it circular */
}

.player-slot-1 { border-color: var(--player-1); }
.player-slot-2 { border-color: var(--player-2); }
.player-slot-3 { border-color: var(--player-3); }
.player-slot-4 { border-color: var(--player-4); }

// ============================================
// Skill Icons
// ============================================

/**
 * Skill Icon - Square with border
 * Usage: <div className="skill-icon skill-icon-sword">⚔️</div>
 */
.skill-icon {
  width: 50px;
  height: 50px;
  border: 2px solid var(--pixel-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.skill-icon-sword { background: #C0C0C0; }
.skill-icon-shield { background: var(--player-1); }
.skill-icon-arrow { background: var(--pixel-brown); }
.skill-icon-potion { background: var(--pixel-red); }

// ============================================
// Utility Classes
// ============================================

.pixel-border { border: var(--pixel-border) solid var(--pixel-brown); }
.pixel-bg { background: var(--pixel-bg); }
.pixel-shadow { box-shadow: var(--pixel-shadow); }
