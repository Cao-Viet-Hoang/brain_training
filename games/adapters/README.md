# Game Adapters

This directory contains multiplayer adapters for individual games.

## What is a Game Adapter?

A game adapter connects your single-player game to the multiplayer system. It handles:

- Room creation and joining
- Question/data synchronization
- Score syncing
- Player state management
- Game lifecycle events

## File Structure

```
games/adapters/
├── base-adapter.js          # Interface definition and documentation
├── math-game-adapter.js     # Example: Math Game adapter
├── memory-matrix-adapter.js # Example: Memory Matrix adapter
└── README.md               # This file
```

## Creating a New Adapter

### 1. Create Your Adapter File

```javascript
// games/adapters/my-game-adapter.js

class MyGameAdapter extends MultiplayerGameAdapter {
  constructor(gameInstance) {
    super(gameInstance, "my-game"); // gameType identifier
  }

  // Required: Return game configuration
  getGameConfig() {
    return {
      difficulty: this.game.difficulty,
      level: this.game.level,
    };
  }

  // Required: Generate shared game data (HOST ONLY)
  async prepareMultiplayerGame() {
    const questions = await this.game.generateQuestions();
    return {
      questions: questions,
      totalQuestions: questions.length,
      timeLimit: this.game.timeLimit,
    };
  }

  // Required: Start game with shared data
  startMultiplayerGame(gameData) {
    this.game.loadQuestions(gameData.questions);
    this.game.startGame();
  }

  // Required: Return current score
  getCurrentScore() {
    return this.game.score;
  }

  // Optional: Handle room cleanup
  onRoomLeft() {
    this.game.stopTimer();
    this.game.reset();
  }
}
```

### 2. Integrate into Your Game HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Your game styles -->
    <link rel="stylesheet" href="../css/multiplayer.css" />

    <!-- Firebase SDK -->
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
  </head>
  <body>
    <!-- Your game content -->

    <!-- Multiplayer UI Container -->
    <div id="multiplayerContainer"></div>

    <!-- Multiplayer Scripts (IN ORDER) -->
    <script src="../shared/firebase-config.js"></script>
    <script src="../shared/constants.js"></script>
    <script src="../shared/room-validator.js"></script>
    <script src="../shared/room-cleanup.js"></script>
    <script src="../shared/multiplayer-core.js"></script>
    <script src="../shared/multiplayer-ui.js"></script>
    <script src="../shared/multiplayer-adapter.js"></script>

    <!-- Your Game Adapter -->
    <script src="adapters/my-game-adapter.js"></script>

    <!-- Your Game Script -->
    <script src="my-game.js"></script>
  </body>
</html>
```

### 3. Initialize in Your Game JS

```javascript
// At the end of your game JS file

// Make game instance accessible
const game = new MyGame();
game.init();

// Initialize multiplayer adapter
let multiplayerAdapter = null;

if (typeof MyGameAdapter !== "undefined") {
  multiplayerAdapter = new MyGameAdapter(game);
  multiplayerAdapter.init("multiplayerContainer").catch((err) => {
    console.error("Failed to initialize multiplayer:", err);
  });

  // Connect game events to adapter
  game.onScoreChange = (score) => {
    if (multiplayerAdapter.isInMultiplayerMode()) {
      multiplayerAdapter.syncScore(score);
    }
  };

  game.onGameEnd = (results) => {
    if (multiplayerAdapter.isInMultiplayerMode()) {
      multiplayerAdapter.endMultiplayerGame(results);
    }
  };
}

// Make adapter accessible globally for debugging
window.multiplayerAdapter = multiplayerAdapter;
```

## Adapter Methods Reference

### Required Methods

| Method                       | Description          | Called By   |
| ---------------------------- | -------------------- | ----------- |
| `getGameConfig()`            | Return game settings | System      |
| `prepareMultiplayerGame()`   | Generate shared data | Host only   |
| `startMultiplayerGame(data)` | Start game with data | All players |
| `getCurrentScore()`          | Return current score | System      |

### Optional Callbacks

| Method                       | Description     | When Called            |
| ---------------------------- | --------------- | ---------------------- |
| `onPlayersUpdate(players)`   | Players changed | Player joins/leaves    |
| `onGameDataReceived(data)`   | Data from host  | Non-host receives data |
| `onGameStateSync(state)`     | State update    | Host syncs state       |
| `onOpponentUpdate(id, data)` | Opponent update | Player score changes   |
| `onRoomLeft()`               | Room closed     | Leave/kicked/closed    |

### Utility Methods

```javascript
// Check if in multiplayer mode
if (adapter.isInMultiplayerMode()) {
}

// Check if current player is host
if (adapter.isHost()) {
}

// Get room code
const roomCode = adapter.getRoomCode();

// Get player info
const playerId = adapter.getPlayerId();
const playerName = adapter.getPlayerName();
```

## Game Lifecycle Flow

### Host Flow

```
1. Click "Multiplayer" → Create Room
2. Enter name → Waiting in lobby
3. Other players join
4. Click "Start Game"
5. prepareMultiplayerGame() called
6. Data published to Firebase
7. startMultiplayerGame() called
8. Game runs, scores sync
9. Game ends, results displayed
```

### Player Flow

```
1. Click "Multiplayer" → Join Room
2. Enter code and name
3. Waiting in lobby (ready up)
4. Host starts game
5. onGameDataReceived() called
6. startMultiplayerGame() called with host's data
7. Game runs, scores sync
8. Game ends, results displayed
```

## Testing Your Adapter

1. **Single Browser Test**

   - Create room
   - Check lobby UI
   - Start game as host

2. **Multi Browser Test**

   - Browser 1: Create room
   - Browser 2: Join with code
   - Both ready up
   - Host starts game
   - Both play simultaneously
   - Check score syncing

3. **Edge Cases**
   - Host leaves during game
   - Player disconnects
   - Network issues
   - Invalid room codes

## Common Issues

### Adapter not initialized

```javascript
// Make sure scripts are in correct order
// firebase-config.js must come before multiplayer-core.js
```

### Questions not syncing

```javascript
// Ensure prepareMultiplayerGame() returns data
async prepareMultiplayerGame() {
    const questions = this.game.generateQuestions();
    return { questions }; // Must return object
}
```

### Scores not updating

```javascript
// Make sure to call syncScore() when score changes
game.onScoreChange = (score) => {
  adapter.syncScore(score);
};
```

## Need Help?

Check the implementation plan document:
`docs/multiplayer-implementation-plan.md`

See example implementations:

- `adapters/math-game-adapter.js` (if available)
