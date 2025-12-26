# 🧠 Brain Training App

An interactive brain training application featuring multiple games designed to improve cognitive skills, memory, spatial thinking, and mathematical abilities. Features both single-player and multiplayer modes with real-time synchronization.

## 🎮 Games

### ✅ Available Now

#### 🔢 Quick Math
- **Description**: Practice calculation skills with basic arithmetic operations
- **Features**:
  - Customize number range (min/max)
  - Select operations: +, -, ×, ÷, or mixed
  - Adjust number of operands (2-5)
  - Set question count and time limits
  - Track score and accuracy
  - Multiplayer support

#### 🎮 Pixel Number
- **Description**: Stack pixel cards to create target digits
- **Features**:
  - Single-player or multi-player buzzer mode
  - Customize number of cards and targets
  - Round time limits
  - Detailed scoring system
  - Results display and statistics
  - Multiplayer support

#### 🧮 Expression Puzzle
- **Description**: Fill in numbers to make equations equal target values
- **Features**:
  - 3 difficulty levels: Easy, Medium, Hard
  - Customizable puzzle count
  - Hint system when needed
  - Difficulty rating and solve time tracking
  - Multiplayer support

#### 🔄 Dual N-Back
- **Description**: Train working memory by tracking positions and letters simultaneously
- **Features**:
  - Adjustable N-back level (1-5)
  - Position and audio/visual stimuli
  - Progress tracking
  - Multiplayer support

#### 🔲 Memory Matrix
- **Description**: Remember and recall highlighted cells in a grid
- **Features**:
  - Multiple difficulty levels
  - Customizable grid size
  - Progressive difficulty
  - Score and accuracy tracking
  - Multiplayer support

#### 💭 Word Recall
- **Description**: Train verbal memory by memorizing and recalling English words
- **Features**:
  - Customizable word count
  - Time-limited recall phase
  - Score based on correct recalls
  - Extensive word bank
  - Multiplayer support

#### 🗺️ Maze Runner
- **Description**: Navigate through mazes to train spatial thinking and problem-solving
- **Features**:
  - Multiple difficulty levels
  - Auto-generated mazes
  - Time and move tracking
  - Keyboard navigation
  - Multiplayer support

## 🚀 Installation & Setup

1. Clone the repository:
```bash
git clone https://github.com/CaoVietHoang/pratice_brain.git
cd pratice_brain
```

2. Open `index.html` in your web browser or use Live Server

## ✨ Key Features

- **🎯 7 Brain Training Games**: Math, Memory, Logic, Spatial reasoning, and more
- **👥 Multiplayer Mode**: Real-time multiplayer with Firebase Realtime Database
- **⚙️ Customizable Settings**: Persistent settings for each game using localStorage
- **📊 Progress Tracking**: Score, accuracy, and performance analytics
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🔧 Modular Architecture**: Clean separation with adapters, settings schemas, and shared utilities

## 💻 Technologies Used

- **HTML5**: Web structure and semantic markup
- **CSS3**: Styling, animations, and responsive design
- **JavaScript (Vanilla)**: Game logic and interactions
- **Firebase**: 
  - Realtime Database for multiplayer synchronization
  - Authentication for user management
- **Google Analytics**: Usage tracking and analytics
- **Google Fonts (Quicksand)**: Typography
- **localStorage**: Persistent settings storage

## 🚀 Installation & Setup

### Basic Setup (Single Player)

1. Clone the repository:
```bash
git clone https://github.com/CaoVietHoang/pratice_brain.git
cd pratice_brain
```

2. Open `index.html` in your web browser or use Live Server

### Firebase Setup (For Multiplayer)

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

2. Enable Realtime Database:
   - Go to Realtime Database section
   - Create a database
   - Start in test mode (or configure security rules)

3. Enable Authentication:
   - Go to Authentication section
   - Enable Anonymous authentication

4. Update Firebase configuration in [shared/firebase-config.js](shared/firebase-config.js):
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     databaseURL: "YOUR_DATABASE_URL",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

## 🎯 How to Play

### Single Player Mode
1. Select a game from the homepage
2. Configure game settings (difficulty, time limits, etc.)
3. Click "Start Game"
4. Complete the challenges and track your score

### Multiplayer Mode
1. Select a game and click "Multiplayer"
2. **Host**: Create a room and share the room code
3. **Guest**: Enter the room code to join
4. Wait for all players to be ready
5. Game starts automatically when all players are ready
6. Compete in real-time and see live scores

## 🏗️ Architecture

### Settings System
- Schema-based validation for each game
- Persistent storage using localStorage
- Default values with override capabilities
- Easy integration for new games

### Multiplayer System
- Adapter pattern for easy game integration
- Real-time synchronization via Firebase
- Room management with automatic cleanup
- Host-controlled game flow
- Live score updates and result modals

### Game Adapters
Each game implements a `MultiplayerGameAdapter` that handles:
- Game configuration synchronization
- Question/data generation (host only)
- Score tracking and updates
- Room lifecycle management

See [games/adapters/README.md](games/adapters/README.md) for adapter development guide.

See [games/adapters/README.md](games/adapters/README.md) for adapter development guide.

## 🎯 Project Goals

- Create an engaging and effective brain training environment
- Develop cognitive skills: memory, logic, calculation, and spatial thinking
- Provide both solo practice and competitive multiplayer modes
- Maintain a clean, modular, and extensible codebase
- Deliver a user-friendly and intuitive interface

## 🔧 Development

### Adding a New Game

1. Create game files in `games/`:
   - `game-name.html` - Game interface
   - `game-name.js` - Game logic

2. Create styles in `css/`:
   - `game-name.css` - Game-specific styles

3. Create settings schema in `settings/schemas/`:
   - `game-name.schema.js` - Define configurable options

4. (Optional) Create multiplayer adapter in `games/adapters/`:
   - `game-name-adapter.js` - Implement multiplayer support

5. Register game in `js/main.js`:
   ```javascript
   {
     id: 'game-name',
     title: 'Game Title',
     description: 'Game description',
     icon: '🎮',
     tag: 'Category',
     url: 'games/game-name.html'
   }
   ```

## 👤 Author

**Cao Viet Hoang**
- GitHub: [@CaoVietHoang](https://github.com/CaoVietHoang)

---

**Happy Brain Training! 🧠✨**