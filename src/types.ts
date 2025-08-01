export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  position: Position;
  health: number;
  maxHealth: number;
  radius: number;
  color: string;
  weaponAngle: number;
  isPlayer: boolean;
  speed: number;
  lastDamageTime: number;
  level: number;
  experience: number;
  experienceToNext: number;
  weaponCount: number;
  weaponRange: number;
  aiDirection?: Position;
  aiDirectionChangeTime?: number;
}

export interface Weapon {
  playerId: string;
  position: Position;
  radius: number;
  angle: number;
}

export interface ExperienceOrb {
  id: string;
  position: Position;
  radius: number;
  value: number;
  spawnTime: number;
}

export interface HealthItem {
  id: string;
  position: Position;
  radius: number;
  healAmount: number;
  spawnTime: number;
}

export interface GameState {
  players: Player[];
  weapons: Weapon[];
  experienceOrbs: ExperienceOrb[];
  healthItems: HealthItem[];
  gameStatus: 'playing' | 'won' | 'lost' | 'paused';
  score: number;
  isPaused: boolean;
}

export interface Keys {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}