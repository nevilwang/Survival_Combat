import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Player, Position, GameState, Keys, Weapon, ExperienceOrb } from './types';
import { Play, Pause, RotateCcw } from 'lucide-react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const WORLD_WIDTH = 2500; // 50 * 50 grid
const WORLD_HEIGHT = 2500;
const PLAYER_RADIUS = 20;
const WEAPON_DISTANCE = 35;
const WEAPON_RADIUS = 8;
const INITIAL_HEALTH = 100;
const DAMAGE_AMOUNT = 25;
const DAMAGE_COOLDOWN = 1000;
const EXP_ORB_RADIUS = 6;
const EXP_ORB_VALUE = 1;
const EXP_TO_LEVEL_UP = 10;
const MAX_EXP_ORBS = 100;
const EXP_ORB_RESPAWN_TIME = 3000;
const MAX_HEALTH_ITEMS = 3;
const HEALTH_ITEM_RADIUS = 8;
const HEALTH_ITEM_HEAL_AMOUNT = 30;

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>({
    players: [],
    weapons: [],
    experienceOrbs: [],
    healthItems: [],
    healthItems: [],
    gameStatus: 'playing',
    score: 0,
    isPaused: false
  });
  const keysRef = useRef<Keys>({ w: false, a: false, s: false, d: false });
  const animationIdRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);
  const cameraRef = useRef<Position>({ x: 0, y: 0 });

  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost' | 'paused'>('playing');
  const [score, setScore] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(INITIAL_HEALTH);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerExp, setPlayerExp] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Initialize game
  const initializeGame = useCallback(() => {
    const players: Player[] = [];
    
    // Create player
    const player: Player = {
      id: 'player',
      position: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
      health: INITIAL_HEALTH,
      maxHealth: INITIAL_HEALTH,
      radius: PLAYER_RADIUS,
      color: '#3B82F6',
      weaponAngle: 0,
      isPlayer: true,
      speed: 3,
      lastDamageTime: 0,
      level: 1,
      experience: 0,
      experienceToNext: EXP_TO_LEVEL_UP,
      weaponCount: 1,
      weaponRange: WEAPON_DISTANCE
    };
    players.push(player);

    // Create 10 AI enemies
    for (let i = 0; i < 10; i++) {
      let position: Position;
      let attempts = 0;
      do {
        position = {
          x: Math.random() * (CANVAS_WIDTH - 100) + 50,
          y: Math.random() * (CANVAS_HEIGHT - 100) + 50
        };
        attempts++;
      } while (attempts < 50 && getDistance(position, player.position) < 100);

      const enemy: Player = {
        id: `enemy-${i}`,
        position,
        health: INITIAL_HEALTH,
        maxHealth: INITIAL_HEALTH,
        radius: PLAYER_RADIUS,
        color: '#EF4444',
        weaponAngle: Math.random() * Math.PI * 2,
        isPlayer: false,
        speed: 1.5 + Math.random() * 1,
        lastDamageTime: 0,
        level: 1,
        experience: 0,
        experienceToNext: EXP_TO_LEVEL_UP,
        weaponCount: 1,
        weaponRange: WEAPON_DISTANCE,
        aiDirection: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
        aiDirectionChangeTime: Date.now() + Math.random() * 3000 + 2000
      };
      players.push(enemy);
    }

    // Create initial experience orbs
    const experienceOrbs: ExperienceOrb[] = [];
    for (let i = 0; i < 80; i++) {
      experienceOrbs.push(createExperienceOrb());
    }

    // Create initial health items
    const healthItems: HealthItem[] = [];
    for (let i = 0; i < MAX_HEALTH_ITEMS; i++) {
      healthItems.push(createHealthItem());
    }

    gameStateRef.current = {
      players,
      weapons: [],
      experienceOrbs,
      healthItems,
      gameStatus: 'playing',
      score: 0,
      isPaused: false
    };
    setGameStatus('playing');
    setScore(0);
    setPlayerHealth(INITIAL_HEALTH);
    setPlayerLevel(1);
    setPlayerExp(0);
    setIsPaused(false);
  }, []);

  // Create experience orb
  const createExperienceOrb = (): ExperienceOrb => {
    return {
      id: `orb-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: Math.random() * (WORLD_WIDTH - 40) + 20,
        y: Math.random() * (WORLD_HEIGHT - 40) + 20
      },
      radius: EXP_ORB_RADIUS,
      value: EXP_ORB_VALUE,
      spawnTime: Date.now()
    };
  };

  // Create health item
  const createHealthItem = () => {
    return {
      id: `health-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: Math.random() * (WORLD_WIDTH - 40) + 20,
        y: Math.random() * (WORLD_HEIGHT - 40) + 20
      },
      radius: HEALTH_ITEM_RADIUS,
      healAmount: HEALTH_ITEM_HEAL_AMOUNT,
      spawnTime: Date.now()
    };
  };

  // Level up player
  const levelUpPlayer = (player: Player) => {
    player.level++;
    player.experience = 0;
    player.experienceToNext = EXP_TO_LEVEL_UP;
    
    // Upgrade strategy: alternating between weapon count and range
    if (player.level % 2 === 0) {
      // Even levels: increase weapon count
      player.weaponCount = Math.min(6, player.weaponCount + 1);
    } else {
      // Odd levels: increase weapon range
      player.weaponRange = Math.min(60, player.weaponRange + 8);
    }
    
    // Every 3 levels: increase health
    if (player.level % 3 === 0) {
      player.maxHealth += 25;
      player.health = player.maxHealth;
    }
  };

  // Utility functions
  const getDistance = (pos1: Position, pos2: Position): number => {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
  };

  const getWeaponPositions = (player: Player): Position[] => {
    const positions: Position[] = [];
    const angleStep = (Math.PI * 2) / player.weaponCount;
    
    for (let i = 0; i < player.weaponCount; i++) {
      const angle = player.weaponAngle + (angleStep * i);
      positions.push({
        x: player.position.x + Math.cos(angle) * player.weaponRange,
        y: player.position.y + Math.sin(angle) * player.weaponRange
      });
    }
    
    return positions;
  };

  const checkCollision = (pos1: Position, radius1: number, pos2: Position, radius2: number): boolean => {
    return getDistance(pos1, pos2) < radius1 + radius2;
  };

  const normalizeVector = (vector: Position): Position => {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    if (length === 0) return { x: 0, y: 0 };
    return { x: vector.x / length, y: vector.y / length };
  };

  // Toggle pause
  const togglePause = useCallback(() => {
    const newPausedState = !gameStateRef.current.isPaused;
    gameStateRef.current.isPaused = newPausedState;
    gameStateRef.current.gameStatus = newPausedState ? 'paused' : 'playing';
    setIsPaused(newPausedState);
    setGameStatus(newPausedState ? 'paused' : 'playing');
  }, []);

  // Game update logic
  const updateGame = useCallback(() => {
    const gameState = gameStateRef.current;
    if (gameState.gameStatus !== 'playing' || gameState.isPaused) return;

    const currentTime = Date.now();
    const player = gameState.players.find(p => p.isPlayer);
    if (!player) return;

    // Update player position based on keys
    const keys = keysRef.current;
    if (keys.w) player.position.y = Math.max(player.radius, player.position.y - player.speed);
    if (keys.s) player.position.y = Math.min(WORLD_HEIGHT - player.radius, player.position.y + player.speed);
    if (keys.a) player.position.x = Math.max(player.radius, player.position.x - player.speed);
    if (keys.d) player.position.x = Math.min(WORLD_WIDTH - player.radius, player.position.x + player.speed);

    // Update camera to follow player
    const targetCameraX = player.position.x - CANVAS_WIDTH / 2;
    const targetCameraY = player.position.y - CANVAS_HEIGHT / 2;
    
    // Clamp camera to world bounds
    cameraRef.current.x = Math.max(0, Math.min(WORLD_WIDTH - CANVAS_WIDTH, targetCameraX));
    cameraRef.current.y = Math.max(0, Math.min(WORLD_HEIGHT - CANVAS_HEIGHT, targetCameraY));

    // Update weapon rotation for all players
    gameState.players.forEach(p => {
      p.weaponAngle += 0.05;
    });

    // Update AI enemies with random movement
    gameState.players.forEach(enemy => {
      if (enemy.isPlayer) return;

      // Change direction randomly
      if (currentTime > (enemy.aiDirectionChangeTime || 0)) {
        enemy.aiDirection = normalizeVector({
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2
        });
        enemy.aiDirectionChangeTime = currentTime + Math.random() * 4000 + 1000;
      }

      // Move in current direction
      if (enemy.aiDirection) {
        enemy.position.x += enemy.aiDirection.x * enemy.speed;
        enemy.position.y += enemy.aiDirection.y * enemy.speed;
      }

      // Bounce off walls
      if (enemy.position.x <= enemy.radius || enemy.position.x >= WORLD_WIDTH - enemy.radius) {
        if (enemy.aiDirection) enemy.aiDirection.x *= -1;
      }
      if (enemy.position.y <= enemy.radius || enemy.position.y >= WORLD_HEIGHT - enemy.radius) {
        if (enemy.aiDirection) enemy.aiDirection.y *= -1;
      }

      // Keep enemies within bounds
      enemy.position.x = Math.max(enemy.radius, Math.min(WORLD_WIDTH - enemy.radius, enemy.position.x));
      enemy.position.y = Math.max(enemy.radius, Math.min(WORLD_HEIGHT - enemy.radius, enemy.position.y));
    });

    // Update weapons positions
    gameState.weapons = [];
    gameState.players.forEach(player => {
      const weaponPositions = getWeaponPositions(player);
      weaponPositions.forEach((pos, index) => {
        gameState.weapons.push({
          playerId: player.id,
          position: pos,
          radius: WEAPON_RADIUS,
          angle: player.weaponAngle + (Math.PI * 2 * index / player.weaponCount)
        });
      });
    });

    // Check experience orb collection
    gameState.players.forEach(player => {
      gameState.experienceOrbs = gameState.experienceOrbs.filter(orb => {
        if (checkCollision(player.position, player.radius, orb.position, orb.radius)) {
          player.experience += orb.value;
          
          // Check for level up
          if (player.experience >= player.experienceToNext) {
            levelUpPlayer(player);
            
            if (player.isPlayer) {
              setPlayerLevel(player.level);
              setPlayerExp(player.experience);
            }
          }
          
          if (player.isPlayer) {
            setPlayerExp(player.experience);
          }
          
          return false; // Remove orb
        }
        return true; // Keep orb
      });
    });

    // Check health item collection
    gameState.players.forEach(player => {
      gameState.healthItems = gameState.healthItems.filter(item => {
        if (checkCollision(player.position, player.radius, item.position, item.radius)) {
          // Heal player but don't exceed max health
          player.health = Math.min(player.maxHealth, player.health + item.healAmount);
          
          if (player.isPlayer) {
            setPlayerHealth(player.health);
          }
          
          return false; // Remove health item
        }
        return true; // Keep health item
      });
    });

    // Respawn experience orbs
    if (gameState.experienceOrbs.length < MAX_EXP_ORBS) {
      const orbsToSpawn = Math.min(5, MAX_EXP_ORBS - gameState.experienceOrbs.length);
      for (let i = 0; i < orbsToSpawn; i++) {
        if (Math.random() < 0.05) { // 5% chance per frame
          gameState.experienceOrbs.push(createExperienceOrb());
        }
      }
    }

    // Respawn health items (much slower respawn rate)
    if (gameState.healthItems.length < MAX_HEALTH_ITEMS) {
      const itemsToSpawn = MAX_HEALTH_ITEMS - gameState.healthItems.length;
      for (let i = 0; i < itemsToSpawn; i++) {
        if (Math.random() < 0.001) { // 0.1% chance per frame (about 30 seconds at 60fps)
          gameState.healthItems.push(createHealthItem());
        }
      }
    }

    // Check weapon collisions
    gameState.players.forEach(attacker => {
      const attackerWeapons = gameState.weapons.filter(w => w.playerId === attacker.id);

      gameState.players.forEach(target => {
        if (attacker.id === target.id) return;
        if (currentTime - target.lastDamageTime < DAMAGE_COOLDOWN) return;

        attackerWeapons.forEach(weapon => {
          if (checkCollision(weapon.position, weapon.radius, target.position, target.radius)) {
            target.health = Math.max(0, target.health - DAMAGE_AMOUNT);
            target.lastDamageTime = currentTime;

            if (target.health <= 0) {
              if (target.isPlayer) {
                gameState.gameStatus = 'lost';
                setGameStatus('lost');
              } else {
                gameState.score += 100 * attacker.level;
                setScore(gameState.score);
                // Remove dead enemy
                gameState.players = gameState.players.filter(p => p.id !== target.id);
              }
            }
          }
        });
      });
    });

    // Update player health display
    if (player) {
      setPlayerHealth(player.health);
    }

    // Check win condition
    const aliveEnemies = gameState.players.filter(p => !p.isPlayer);
    if (aliveEnemies.length === 0) {
      gameState.gameStatus = 'won';
      setGameStatus('won');
    }
  }, []);

  // Render game
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameState = gameStateRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

    // Draw background
    ctx.fillStyle = '#111827';
    ctx.fillRect(cameraRef.current.x, cameraRef.current.y, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid pattern
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    
    // Calculate visible grid range
    const startX = Math.floor(cameraRef.current.x / 50) * 50;
    const endX = startX + CANVAS_WIDTH + 50;
    const startY = Math.floor(cameraRef.current.y / 50) * 50;
    const endY = startY + CANVAS_HEIGHT + 50;
    
    // Draw vertical grid lines
    for (let x = startX; x <= endX; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, cameraRef.current.y);
      ctx.lineTo(x, cameraRef.current.y + CANVAS_HEIGHT);
      ctx.stroke();
    }
    
    // Draw horizontal grid lines
    for (let y = startY; y <= endY; y += 50) {
      ctx.beginPath();
      ctx.moveTo(cameraRef.current.x, y);
      ctx.lineTo(cameraRef.current.x + CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw experience orbs
    gameState.experienceOrbs.forEach(orb => {
      ctx.beginPath();
      ctx.arc(orb.position.x, orb.position.y, orb.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#10B981';
      ctx.fill();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Add glow effect
      const gradient = ctx.createRadialGradient(
        orb.position.x, orb.position.y, 0,
        orb.position.x, orb.position.y, orb.radius * 2
      );
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();
    });

    // Draw health items
    gameState.healthItems.forEach(item => {
      // Draw main circle
      ctx.beginPath();
      ctx.arc(item.position.x, item.position.y, item.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#EF4444';
      ctx.fill();
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw white cross
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(item.position.x - 4, item.position.y);
      ctx.lineTo(item.position.x + 4, item.position.y);
      ctx.stroke();
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(item.position.x, item.position.y - 4);
      ctx.lineTo(item.position.x, item.position.y + 4);
      ctx.stroke();
      
      // Add glow effect
      const gradient = ctx.createRadialGradient(
        item.position.x, item.position.y, 0,
        item.position.x, item.position.y, item.radius * 2
      );
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();
    });

    // Draw players
    gameState.players.forEach(player => {
      // Draw player body
      ctx.beginPath();
      ctx.arc(player.position.x, player.position.y, player.radius, 0, Math.PI * 2);
      ctx.fillStyle = player.color;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw level indicator
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(player.level.toString(), player.position.x, player.position.y + 4);

      // Draw health bar
      const barWidth = 40;
      const barHeight = 6;
      const barX = player.position.x - barWidth / 2;
      const barY = player.position.y - player.radius - 15;
      
      // Background
      ctx.fillStyle = '#4B5563';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Health
      const healthPercent = player.health / player.maxHealth;
      ctx.fillStyle = healthPercent > 0.5 ? '#10B981' : healthPercent > 0.25 ? '#F59E0B' : '#EF4444';
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

      // Draw experience bar for player
      if (player.isPlayer) {
        const expBarY = barY - 10;
        ctx.fillStyle = '#4B5563';
        ctx.fillRect(barX, expBarY, barWidth, 4);
        
        const expPercent = player.experience / player.experienceToNext;
        ctx.fillStyle = '#8B5CF6';
        ctx.fillRect(barX, expBarY, barWidth * expPercent, 4);
      }

      // Draw player label
      if (player.isPlayer) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', player.position.x, player.position.y + player.radius + 20);
      }
    });

    // Draw weapons
    gameState.weapons.forEach(weapon => {
      ctx.beginPath();
      ctx.arc(weapon.position.x, weapon.position.y, weapon.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#F59E0B';
      ctx.fill();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Restore context
    ctx.restore();

    // Draw pause overlay
    if (gameState.isPaused) {
      // Restore context before drawing UI
      ctx.restore();
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('暂停', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    } else {
      // Restore context at the end if not paused
      ctx.restore();
    }
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    updateGame();
    render();
    animationIdRef.current = requestAnimationFrame(gameLoop);
  }, [updateGame, render]);

  // Keyboard event handlers
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        keysRef.current.w = true;
        break;
      case 'a':
      case 'arrowleft':
        keysRef.current.a = true;
        break;
      case 's':
      case 'arrowdown':
        keysRef.current.s = true;
        break;
      case 'd':
      case 'arrowright':
        keysRef.current.d = true;
        break;
      case 'r':
        if (gameStateRef.current.gameStatus !== 'playing') {
          initializeGame();
        }
        break;
      case ' ':
        event.preventDefault();
        togglePause();
        break;
    }
  }, [initializeGame, togglePause]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        keysRef.current.w = false;
        break;
      case 'a':
      case 'arrowleft':
        keysRef.current.a = false;
        break;
      case 's':
      case 'arrowdown':
        keysRef.current.s = false;
        break;
      case 'd':
      case 'arrowright':
        keysRef.current.d = false;
        break;
    }
  }, []);

  // Initialize game and set up event listeners
  useEffect(() => {
    initializeGame();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Start game loop
    animationIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [initializeGame, handleKeyDown, handleKeyUp, gameLoop]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-white">武器生存战</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePause}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
              <span>{isPaused ? '继续' : '暂停'}</span>
            </button>
            <button
              onClick={initializeGame}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              <span>重新开始</span>
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-4 text-white">
          <div className="space-x-4">
            <span>分数: {score}</span>
            <span>等级: {playerLevel}</span>
            <span>经验: {playerExp}/{playerLevel * EXP_TO_LEVEL_UP}</span>
          </div>
          <div>
            <span>生命值: {playerHealth}/100</span>
          </div>
        </div>
        
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className={`border-2 border-gray-600 rounded ${isMobile ? 'max-w-full h-auto' : ''}`}
            style={isMobile ? { 
              width: '100%', 
              height: 'auto',
              maxWidth: '100vw',
              maxHeight: '60vh'
            } : {}}
          />
          
          {(gameStatus === 'won' || gameStatus === 'lost') && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded">
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-4">
                  {gameStatus === 'won' ? '胜利!' : '游戏结束!'}
                </h2>
                <p className="text-xl text-gray-300 mb-4">
                  最终分数: {score}
                </p>
                <p className="text-lg text-gray-300 mb-4">
                  达到等级: {playerLevel}
                </p>
                <p className="text-gray-400 mb-6">
                  按 R 键重新开始
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-sm text-gray-400 text-center space-y-1">
          <p>使用 WASD 或方向键移动 • 收集绿色经验点升级</p>
          <p>红色十字回血道具 • 每10经验升级 • 武器进化: 水果刀→匕首→剑→红缨枪→斧头→大刀→激光剑</p>
          <p>空格键暂停/继续 • 击败所有20个敌人获胜！</p>
        </div>
      </div>
    </div>
  );
};

export default Game;