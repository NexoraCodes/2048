import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Alert, Platform, Modal, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useAudio } from '../contexts/AudioContext';
import MusicToggleButton from '../components/MusicToggleButton';

const Game2048 = () => {
  const [grid, setGrid] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [won, setWon] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const navigation = useNavigation();
  // Floating +score popups
  const [mergePopups, setMergePopups] = useState([]);
  // Track new tiles for animation
  const [newTiles, setNewTiles] = useState(new Set());
  const [tileAnimations, setTileAnimations] = useState({});
  const [menuVisible, setMenuVisible] = useState(false);
  const { isMusicOn, toggleMusic, playBackgroundMusic, stopMusic } = useAudio();

  // Update screen dimensions on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => {
      subscription?.remove();
      stopMusic(); // Stop music when component unmounts
    };
  }, [stopMusic]);
  
  // Play background music when game starts
  useEffect(() => {
    playBackgroundMusic();
    
    return () => {
      stopMusic(); // Cleanup on unmount
    };
  }, [playBackgroundMusic, stopMusic]);

  // Load high score on mount
  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const savedHighScore = await AsyncStorage.getItem('@2048_high_score');
        if (savedHighScore !== null) {
          setHighScore(parseInt(savedHighScore));
        }
      } catch (e) {
        console.error('Failed to load high score', e);
      }
    };
    loadHighScore();
  }, []);

  // Update high score when score changes
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      AsyncStorage.setItem('@2048_high_score', score.toString());
    }
  }, [score]);

  // Calculate responsive dimensions with improved centering
  const getResponsiveDimensions = () => {
    const { width, height } = screenData;
    const isLandscape = width > height;
    const isTablet = Math.min(width, height) > 600;
    const isSmallScreen = Math.min(width, height) < 576;
    const isTinyScreen = Math.min(width, height) < 250;
    
    // Reduced spacing for small screens
    // Tighten top sections and reclaim space (we removed instructions/buttons)
    const headerHeight = isLandscape ? 50 : (isTinyScreen ? 56 : (isSmallScreen ? 64 : 72));
    const scoreHeight = isLandscape ? 40 : (isTinyScreen ? 42 : (isSmallScreen ? 48 : 56));
    const instructionsHeight = 0; // no instructions panel anymore
    const buttonHeight = 0; // no extra button row below grid
    const padding = isTablet ? 30 : (isTinyScreen ? 8 : (isSmallScreen ? 12 : 16));
    
    const availableWidth = width - (padding * 2);
    const availableHeight = height - headerHeight - scoreHeight - instructionsHeight - buttonHeight - (padding * 2);
    
    // More aggressive grid sizing for small screens
    const maxGridSize = Math.min(availableWidth, availableHeight);
    let gridSize;
    
    if (isTablet) {
      gridSize = Math.min(maxGridSize * 0.9, 480);
    } else if (isTinyScreen) {
      gridSize = Math.min(maxGridSize * 0.99, 320);
    } else if (isSmallScreen) {
      gridSize = Math.min(maxGridSize * 0.98, 340);
    } else {
      gridSize = Math.min(maxGridSize * 0.95, 380);
    }
    
    // Use 8px gap units. Leave a bit of extra right padding by budgeting 48px instead of 40px.
    // This yields a slightly wider right gutter for visual breathing room.
    const cellSize = (gridSize - 48) / 4;
    
    return {
      gridSize,
      cellSize,
      isLandscape,
      isTablet,
      isSmallScreen,
      isTinyScreen,
      containerPadding: padding,
      fontSize: {
        title: isTablet ? 48 : (isTinyScreen ? 28 : (isSmallScreen ? 30 : (isLandscape ? 32 : 38))),
        subtitle: isTablet ? 16 : (isTinyScreen ? 11 : (isSmallScreen ? 12 : (isLandscape ? 12 : 14))),
        score: isTablet ? 22 : (isTinyScreen ? 14 : (isSmallScreen ? 15 : (isLandscape ? 16 : 18))),
        tile: Math.max(cellSize / (isTablet ? 2.0 : (isTinyScreen ? 2.8 : (isSmallScreen ? 2.6 : 2.4))), 8),
        instructions: isTablet ? 13 : (isTinyScreen ? 10 : (isSmallScreen ? 10 : (isLandscape ? 10 : 12))),
        button: isTablet ? 14 : (isTinyScreen ? 11 : (isSmallScreen ? 11 : (isLandscape ? 12 : 13))),
      }
    };
  };

  const dimensions = getResponsiveDimensions();

  // Helper: trigger floating +score popups
  const triggerMergePopups = (events) => {
    if (!events || events.length === 0) return;
    const created = events.map((evt, idx) => {
      const id = `${Date.now()}-${idx}-${evt.value}`;
      const animOpacity = new Animated.Value(1);
      const animTranslateY = new Animated.Value(0);
      return { id, ...evt, animOpacity, animTranslateY };
    });
    setMergePopups((prev) => [...prev, ...created]);
    created.forEach((item) => {
      Animated.parallel([
        Animated.timing(item.animTranslateY, {
          toValue: -20,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(item.animOpacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMergePopups((prev) => prev.filter((p) => p.id !== item.id));
      });
    });
  };

  // Initialize empty grid
  const initializeGrid = () => {
    return Array(4).fill().map(() => Array(4).fill(0));
  };

  // Add random tile (2 or 4)
  const addRandomTile = (currentGrid) => {
    const emptyCells = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (currentGrid[i][j] === 0) {
          emptyCells.push([i, j]);
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const [x, y] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const newGrid = currentGrid.map(row => [...row]);
      newGrid[x][y] = Math.random() < 0.9 ? 2 : 4;
      
      // Create scale animation for new tile
      const tileKey = `${x}-${y}`;
      const scaleAnim = new Animated.Value(0);
      
      setTileAnimations(prev => ({
        ...prev,
        [tileKey]: scaleAnim
      }));
      
      // Start scale-in animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }).start(() => {
        // Clean up animation after completion
        setTimeout(() => {
          setTileAnimations(prev => {
            const updated = { ...prev };
            delete updated[tileKey];
            return updated;
          });
        }, 100);
      });
      
      return newGrid;
    }
    return currentGrid;
  };

  // Initialize game
  const initGame = () => {
    let newGrid = initializeGrid();
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  // Check if game is over
  const isGameOver = (currentGrid) => {
    // Check for empty cells
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (currentGrid[i][j] === 0) return false;
        if (j < 3 && currentGrid[i][j] === currentGrid[i][j + 1]) return false;
        if (i < 3 && currentGrid[i][j] === currentGrid[i + 1][j]) return false;
      }
    }
    return true;
  };

  // Move tiles in a direction
  const move = (direction) => {
    if (gameOver || won) return;

    let newGrid = grid.map(row => [...row]);
    let moved = false;
    let newScore = score;
    // collect merge events for +score popups
    const mergeEvents = [];

    const moveLeft = () => {
      for (let i = 0; i < 4; i++) {
        const row = newGrid[i].filter(cell => cell !== 0);
        const merged = [];
        
        for (let j = 0; j < row.length - 1; j++) {
          if (row[j] === row[j + 1] && !merged[j] && !merged[j + 1]) {
            row[j] *= 2;
            newScore += row[j];
            row.splice(j + 1, 1);
            merged[j] = true;
            // popup at (i, j) for value row[j]
            mergeEvents.push({ row: i, col: j, value: row[j] });
            if (row[j] === 2048 && !won) {
              setWon(true);
              Alert.alert('🎉 You Win!', 'Congratulations! You reached 2048!', [
                { text: 'Play Again', onPress: initGame },
                { text: 'Continue', style: 'cancel' },
              ]);
            }
          }
        }
        
        while (row.length < 4) row.push(0);
        
        if (JSON.stringify(newGrid[i]) !== JSON.stringify(row)) {
          moved = true;
        }
        newGrid[i] = row;
      }
    };

    const moveRight = () => {
      for (let i = 0; i < 4; i++) {
        const row = newGrid[i].filter(cell => cell !== 0);
        const merged = [];
        // temp store of merge indices before unshifting zeros
        const rightMerges = [];
        
        for (let j = row.length - 1; j > 0; j--) {
          if (row[j] === row[j - 1] && !merged[j] && !merged[j - 1]) {
            row[j] *= 2;
            newScore += row[j];
            const mergedValue = row[j]; // Store value before modifying array
            row.splice(j - 1, 1);
            merged[j] = true;
            j++;
            rightMerges.push({ rowIndex: i, tempIndex: j, value: mergedValue });
            if (mergedValue === 2048 && !won) {
              setWon(true);
              Alert.alert('🎉 You Win!', 'Congratulations! You reached 2048!', [
                { text: 'Play Again', onPress: initGame },
                { text: 'Continue', style: 'cancel' },
              ]);
            }
          }
        }
        
        // Fill with zeros
        while (row.length < 4) row.unshift(0);
        // convert temp indices to final col indices
        rightMerges.forEach((m) => {
          mergeEvents.push({ row: m.rowIndex, col: 4 - m.tempIndex, value: m.value });
        });
        
        if (JSON.stringify(newGrid[i]) !== JSON.stringify(row)) {
          moved = true;
        }
        newGrid[i] = row;
      }
    };

    const moveUp = () => {
      let movedThisTurn = false;
      for (let j = 0; j < 4; j++) {
        const column = [];
        for (let i = 0; i < 4; i++) {
          if (newGrid[i][j] !== 0) column.push(newGrid[i][j]);
        }
        
        // Merge similar numbers
        for (let i = 0; i < column.length - 1; i++) {
          if (column[i] === column[i + 1]) {
            column[i] *= 2;
            newScore += column[i];
            column.splice(i + 1, 1);
            mergeEvents.push({ row: i, col: j, value: column[i] });
            if (column[i] === 2048 && !won) {
              setWon(true);
              Alert.alert('🎉 You Win!', 'Congratulations! You reached 2048!', [
                { text: 'Play Again', onPress: initGame },
                { text: 'Continue', style: 'cancel' },
              ]);
            }
          }
        }
        
        // Fill with zeros
        while (column.length < 4) column.push(0);
        
        // Update the grid
        for (let i = 0; i < 4; i++) {
          if (newGrid[i][j] !== column[i]) {
            movedThisTurn = true;
            newGrid[i][j] = column[i];
          }
        }
      }
      moved = movedThisTurn;
    };

    const moveDown = () => {
      let movedThisTurn = false;
      for (let j = 0; j < 4; j++) {
        const column = [];
        for (let i = 3; i >= 0; i--) {
          if (newGrid[i][j] !== 0) column.push(newGrid[i][j]);
        }
        
        // Merge similar numbers
        for (let i = 0; i < column.length - 1; i++) {
          if (column[i] === column[i + 1]) {
            column[i] *= 2;
            newScore += column[i];
            column.splice(i + 1, 1);
            mergeEvents.push({ row: 3 - i, col: j, value: column[i] });
            if (column[i] === 2048 && !won) {
              setWon(true);
              Alert.alert('🎉 You Win!', 'Congratulations! You reached 2048!', [
                { text: 'Play Again', onPress: initGame },
                { text: 'Continue', style: 'cancel' },
              ]);
            }
          }
        }
        
        // Fill with zeros
        while (column.length < 4) column.push(0);
        
        // Update the grid
        for (let i = 0; i < 4; i++) {
          if (newGrid[3 - i][j] !== column[i]) {
            movedThisTurn = true;
            newGrid[3 - i][j] = column[i];
          }
        }
      }
      moved = movedThisTurn;
    };

    switch (direction) {
      case 'left': 
        moveLeft(); 
        break;
      case 'right': 
        moveRight(); 
        break;
      case 'up': 
        moveUp(); 
        break;
      case 'down': 
        moveDown(); 
        break;
    }

    if (moved) {
      newGrid = addRandomTile(newGrid);
      setGrid(newGrid);
      setScore(newScore);
      // trigger popups at merged positions
      if (mergeEvents.length > 0) {
        const eventsWithPixels = mergeEvents.map((evt) => {
          const left = evt.col * (dimensions.cellSize + 8) + 4 + dimensions.cellSize / 2 - 10;
          const top = evt.row * (dimensions.cellSize + 8) + 4 + dimensions.cellSize / 2 - 10;
          return { left, top, value: evt.value };
        });
        triggerMergePopups(eventsWithPixels);
      }
      
      if (isGameOver(newGrid)) {
        setGameOver(true);
        setShowGameOverModal(true);
      }
    }
  };

  // Handle swipe gestures
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });

  const minSwipeDistance = Math.max(25, dimensions.cellSize / 4);

  const onTouchStart = (e) => {
    setTouchEnd({ x: 0, y: 0 });
    setTouchStart({
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY
    });
  };

  const onTouchEnd = (e) => {
    setTouchEnd({
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY
    });
    
    const distanceX = touchStart.x - e.nativeEvent.pageX;
    const distanceY = touchStart.y - e.nativeEvent.pageY;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe) move('left');
      if (isRightSwipe) move('right');
    } else {
      if (isUpSwipe) move('up');
      if (isDownSwipe) move('down');
    }
  };

  // 3D tile colors with vibrant new color scheme
  const getTileStyle = (value) => {
    const colors = {
      2: { 
        bg: '#ff6b6b', 
        topColor: '#ff8e8e', 
        sideColor: '#e74c3c', 
        text: '#ffffff', 
        shadow: '#ff6b6b' 
      },
      4: { 
        bg: '#4ecdc4', 
        topColor: '#7dd3d8', 
        sideColor: '#26a69a', 
        text: '#ffffff', 
        shadow: '#4ecdc4' 
      },
      8: { 
        bg: '#45b7d1', 
        topColor: '#74c7e3', 
        sideColor: '#2980b9', 
        text: '#ffffff', 
        shadow: '#45b7d1' 
      },
      16: { 
        bg: '#f9ca24', 
        topColor: '#fdd835', 
        sideColor: '#f39c12', 
        text: '#ffffff', 
        shadow: '#f9ca24' 
      },
      32: { 
        bg: '#f0932b', 
        topColor: '#ffb74d', 
        sideColor: '#e67e22', 
        text: '#ffffff', 
        shadow: '#f0932b' 
      },
      64: { 
        bg: '#eb4d4b', 
        topColor: '#ff7675', 
        sideColor: '#c0392b', 
        text: '#ffffff', 
        shadow: '#eb4d4b' 
      },
      128: { 
        bg: '#6c5ce7', 
        topColor: '#a29bfe', 
        sideColor: '#5b4cdb', 
        text: '#ffffff', 
        shadow: '#6c5ce7' 
      },
      256: { 
        bg: '#a55eea', 
        topColor: '#d1a3ff', 
        sideColor: '#8e44ad', 
        text: '#ffffff', 
        shadow: '#a55eea' 
      },
      512: { 
        bg: '#26de81', 
        topColor: '#55efc4', 
        sideColor: '#00b894', 
        text: '#2c3e50', 
        shadow: '#26de81' 
      },
      1024: { 
        bg: '#fd79a8', 
        topColor: '#fdcb6e', 
        sideColor: '#e84393', 
        text: '#ffffff', 
        shadow: '#fd79a8' 
      },
      2048: { 
        bg: '#fdcb6e', 
        topColor: '#fff7d6', 
        sideColor: '#f39c12', 
        text: '#2c3e50', 
        shadow: '#fdcb6e' 
      },
      4096: { 
        bg: '#00b894', 
        topColor: '#55efc4', 
        sideColor: '#00a085', 
        text: '#ffffff', 
        shadow: '#00b894' 
      },
      8192: { 
        bg: '#e17055', 
        topColor: '#fab1a0', 
        sideColor: '#d63031', 
        text: '#ffffff', 
        shadow: '#e17055' 
      },
    };
    
    return colors[value] || { 
      bg: '#2d3436', 
      topColor: '#636e72', 
      sideColor: '#1e272e', 
      text: '#ffffff', 
      shadow: '#2d3436' 
    };
  };

  // Improved responsive font sizing
  const getTileFontSize = (value) => {
    const baseSize = dimensions.fontSize.tile;
    const length = value.toString().length;
    
    if (length >= 5) return baseSize * 0.55; // 4096+
    if (length === 4) return baseSize * 0.65; // 1024, 2048
    if (length === 3) return baseSize * 0.75; // 128, 256, 512
    if (length === 2) return baseSize * 0.85; // 16, 32, 64
    return baseSize; // 2, 4, 8
  };

  // Initialize game on mount
  useEffect(() => {
    initGame();
  }, []);

  // Add keyboard event listeners (for web/desktop)
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'ArrowLeft': 
        case 'a':
        case 'A':
          move('left'); 
          break;
        case 'ArrowRight': 
        case 'd':
        case 'D':
          move('right'); 
          break;
        case 'ArrowUp': 
        case 'w':
        case 'W':
          move('up'); 
          break;
        case 'ArrowDown': 
        case 's':
        case 'S':
          move('down'); 
          break;
        case ' ':
        case 'r':
        case 'R':
          initGame();
          break;
      }
    };

    // For web
    if (Platform.OS === 'web' && window) {
      window.addEventListener('keydown', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [grid, gameOver, won]);

  // Game Over Modal Component
  const GameOverModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showGameOverModal}
      onRequestClose={() => setShowGameOverModal(false)}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalText}>Game Over!</Text>
          <Text style={styles.scoreText}>Your Score: {score}</Text>
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.buttonRestart]}
              onPress={() => {
                initGame();
                setShowGameOverModal(false);
              }}
            >
              <Text style={styles.textStyle}>Play Again</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.buttonHome]}
              onPress={() => {
                setShowGameOverModal(false);
                navigation.navigate('Home');
              }}
            >
              <Text style={styles.textStyle}>Home</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Game Over Styles
  const styles = StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalView: {
      margin: 20,
      backgroundColor: '#2c2c2e',
      borderRadius: 20,
      padding: 25,
      alignItems: 'center',
      maxWidth: 270,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      width: '80%',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 15,
    },
    button: {
      borderRadius: 10,
      padding: 12,
      elevation: 2,
      minWidth: 100,
      alignItems: 'center',
    },
    buttonRestart: {
      backgroundColor: '#f39c12',
      marginRight: 10,
    },
    buttonHome: {
      backgroundColor: '#7f8c8d',
    },
    textStyle: {
      color: 'white',
      fontWeight: 'bold',
      textAlign: 'center',
    },
    modalText: {
      marginBottom: 15,
      textAlign: 'center',
      fontSize: 28,
      fontWeight: 'bold',
      color: '#fff',
    },
    scoreText: {
      fontSize: 20,
      marginBottom: 20,
      color: '#f39c12',
      fontWeight: 'bold',
    },
  });

  // Jet black shiny theme UI styles
  const responsiveStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000000', // Pure jet black background
      paddingHorizontal: dimensions.containerPadding,
      paddingTop: dimensions.isLandscape ? 15 : 25,
      paddingBottom: dimensions.isLandscape ? 10 : 20,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: dimensions.isLandscape ? 'flex-start' : 'center',
      alignItems: 'center',
    },
    gameContent: {
      width: '100%',
      maxWidth: dimensions.isTablet ? 600 : 400,
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingHorizontal: 10,
      width: '100%',
      maxWidth: 500,
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    musicButton: {
      marginRight: 10,
    },
    title: {
      fontSize: dimensions.fontSize.title,
      fontWeight: '900',
      color: '#ffffff',
      textShadowColor: 'rgba(255, 255, 255, 0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 10,
      letterSpacing: 3,
    },
    subtitle: {
      fontSize: dimensions.fontSize.subtitle,
      color: '#c0c0c0',
      marginTop: 4,
      textAlign: 'center',
      fontWeight: '500',
    },
    scoreContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: dimensions.gridSize,
      alignSelf: 'center',
      marginBottom: dimensions.isLandscape ? 10 : 18,
      gap: 12,
    },
    scoreBox: {
      backgroundColor: '#1a1a1a',
      borderWidth: 1,
      borderColor: '#2e2e2e',
      paddingVertical: dimensions.isTablet ? 12 : 10,
      paddingHorizontal: dimensions.isTablet ? 16 : 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 6,
      flex: 1,
      flexBasis: '48%',
      alignSelf: 'stretch',
    },
    scoreLabel: {
      color: '#b0b0b0',
      fontSize: dimensions.isTablet ? 14 : 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    scoreValue: {
      color: '#ffb020',
      fontSize: Math.max(dimensions.fontSize.score, 20),
      fontWeight: '900',
      marginTop: 2,
      // Use tabular numerals for steadier visual alignment where supported
      // iOS only; ignored on Android without custom font
      fontVariant: ['tabular-nums'],
    },
    highScoreValue: {
      color: '#ffd166',
      fontSize: Math.max(dimensions.fontSize.score, 20),
      fontWeight: '900',
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    newGameButton: {
      backgroundColor: '#007aff',
      paddingVertical: dimensions.isTablet ? 12 : 8,
      paddingHorizontal: dimensions.isTablet ? 16 : 12,
      borderRadius: 12,
      flex: 1,
      alignItems: 'center',
      shadowColor: '#007aff',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 6,
      borderWidth: 1,
      borderColor: '#0056cc',
    },
    newGameText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: dimensions.fontSize.button,
    },
    gridContainer: {
      width: dimensions.gridSize,
      height: dimensions.gridSize,
      backgroundColor: '#1a1a1a',
      borderRadius: 18,
      padding: 0,
      alignSelf: 'center',
      marginVertical: dimensions.isLandscape ? 6 : 12,
      shadowColor: '#ffffff',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 10,
      borderWidth: 2,
      borderColor: '#2e2e2e',
    },
    gridBackground: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      position: 'absolute',
      top: 8,
      left: 8,
      zIndex: 1,
    },
    cell: {
      width: dimensions.cellSize,
      height: dimensions.cellSize,
      margin: 4,
      backgroundColor: '#0a0a0a',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#2a2a2a',
    },
    tilesContainer: {
      position: 'absolute',
      top: 8,
      left: 8,
      zIndex: 2,
    },
    tile: {
      position: 'absolute',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tileText: {
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    // Hamburger and Menu styles
    hamburger: {
      position: 'absolute',
      top: 35,
      left: 35,
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(28,28,30,0.9)',
      borderWidth: 1,
      borderColor: '#2e2e2e',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    },
    hamburgerText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '700',
      marginTop: -2,
    },
    menuBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    menuCard: {
      width: '85%',
      maxWidth: 360,
      backgroundColor: '#1a1a1a',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#2e2e2e',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 12,
    },
    menuTitle: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 12,
    },
    menuBtn: {
      backgroundColor: '#2c2c2e',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#48484a',
      marginTop: 10,
    },
    menuBtnDisabled: {
      opacity: 0.6,
    },
    menuBtnText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 14,
      letterSpacing: 0.5,
    },
    instructions: {
      marginTop: dimensions.isLandscape ? 5 : 15,
      paddingVertical: dimensions.isTablet ? 16 : 12,
      paddingHorizontal: dimensions.isTablet ? 20 : 16,
      backgroundColor: '#1a1a1a',
      borderRadius: 16,
      width: dimensions.gridSize,
      borderWidth: 2,
      borderColor: '#333333',
    },
    instructionsText: {
      color: '#c0c0c0',
      textAlign: 'center',
      marginBottom: 3,
      fontSize: dimensions.fontSize.instructions,
      lineHeight: dimensions.fontSize.instructions * 1.4,
      fontWeight: '500',
    },
    backButton: {
      marginTop: dimensions.isLandscape ? 8 : 15,
      paddingVertical: dimensions.isTablet ? 14 : 10,
      paddingHorizontal: dimensions.isTablet ? 24 : 18,
      backgroundColor: '#2c2c2e',
      borderRadius: 12,
      width: dimensions.gridSize,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#48484a',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    backButtonText: {
      color: '#ffffff',
      fontWeight: '600',
      fontSize: dimensions.fontSize.button,
    },
    // Landscape specific styles
    landscapeContainer: {
      flexDirection: 'row',
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
    },
    landscapeLeftPanel: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      // Give more room so two score boxes can sit on one row in landscape
      width: dimensions.isTablet ? 420 : Math.min(dimensions.gridSize, 360),
    },
    landscapeRightPanel: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    landscapeScoreContainer: {
      flexDirection: 'row',
      width: '100%',
      gap: 12,
      justifyContent: 'space-between',
    },
    landscapeInstructions: {
      marginTop: 15,
      padding: 12,
      backgroundColor: '#1c1c1e',
      borderRadius: 12,
      width: '100%',
      borderWidth: 1,
      borderColor: '#2c2c2e',
    },
    landscapeButton: {
      marginTop: 15,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: '#2c2c2e',
      borderRadius: 12,
      width: '100%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#48484a',
    },
  });

  return (
    <View style={responsiveStyles.container}>
      {/* Hamburger Button */}
      <TouchableOpacity
        style={responsiveStyles.hamburger}
        onPress={() => setMenuVisible(true)}
        accessibilityLabel="Open menu"
        hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
      >
        <Text style={responsiveStyles.hamburgerText}>≡</Text>
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={responsiveStyles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={responsiveStyles.menuCard}>
            <Text style={responsiveStyles.menuTitle}>Menu</Text>
            <TouchableOpacity
              style={[responsiveStyles.menuBtn, !isMusicOn && responsiveStyles.menuBtnDisabled]}
              onPress={async () => {
                if (isMusicOn) {
                  await toggleMusic();
                  
                } else {
                  await toggleMusic();
                }
                setMenuVisible(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={responsiveStyles.menuBtnText}>{isMusicOn ? 'Stop Music' : 'Music Off'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={responsiveStyles.menuBtn}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Home');
              }}
              activeOpacity={0.8}
            >
              <Text style={responsiveStyles.menuBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      <GameOverModal />
       
      {dimensions.isLandscape ? (
        // Landscape Layout
        <View style={responsiveStyles.landscapeContainer}>
          <View style={responsiveStyles.landscapeLeftPanel}>
            <View style={responsiveStyles.header}>
              <Text style={responsiveStyles.title}>Merge 2468</Text>
            </View>
            <View style={responsiveStyles.landscapeScoreContainer}>
              <View style={responsiveStyles.scoreBox}>
                <Text style={responsiveStyles.scoreLabel}>SCORE</Text>
                <Text style={responsiveStyles.scoreValue}>{score.toLocaleString()}</Text>
              </View>
              <View style={responsiveStyles.scoreBox}>
                <Text style={responsiveStyles.scoreLabel}>HIGH SCORE</Text>
                <Text style={responsiveStyles.highScoreValue}>{highScore.toLocaleString()}</Text>
              </View>
            </View>
          </View>
          <View style={responsiveStyles.landscapeRightPanel}>
            <View 
              style={responsiveStyles.gridContainer}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={onTouchStart}
              onResponderRelease={onTouchEnd}
            >
              <View style={responsiveStyles.gridBackground}>
                {Array(16).fill(0).map((_, index) => (
                  <View key={`cell-${index}`} style={responsiveStyles.cell} />
                ))}
              </View>
              <View style={responsiveStyles.tilesContainer}>
                {grid.map((row, i) =>
                  row.map((cell, j) =>
                    cell !== 0 ? (
                      <Animated.View
                        key={`tile-${i}-${j}-${cell}`}
                        style={[
                          responsiveStyles.tile,
                          {
                            left: j * (dimensions.cellSize + 8) + 4,
                            top: i * (dimensions.cellSize + 8) + 4,
                            width: dimensions.cellSize,
                            height: dimensions.cellSize,
                            zIndex: cell,
                            transform: [{ 
                              scale: tileAnimations[`${i}-${j}`] || 1 
                            }],
                          },
                        ]}
                      >
                        {/* 3D Shadow Base */}
                        <View style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          backgroundColor: getTileStyle(cell).sideColor,
                          borderRadius: 12,
                          top: 6,
                          left: 6,
                        }} />
                        
                        {/* 3D Side Panel */}
                        <View style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          backgroundColor: getTileStyle(cell).sideColor,
                          borderRadius: 12,
                          top: 3,
                          left: 3,
                        }} />
                        
                        {/* 3D Top Surface */}
                        <View style={[
                          {
                            width: '100%',
                            height: '100%',
                            backgroundColor: getTileStyle(cell).bg,
                            borderRadius: 12,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 2,
                            borderColor: getTileStyle(cell).topColor,
                            shadowColor: getTileStyle(cell).shadow,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 8,
                          }
                        ]}>
                          {/* Inner highlight for 3D effect */}
                          <View style={{
                            position: 'absolute',
                            top: 2,
                            left: 2,
                            right: 2,
                            height: '30%',
                            backgroundColor: getTileStyle(cell).topColor,
                            borderRadius: 8,
                            opacity: 0.4,
                          }} />
                          
                          <Text 
                            style={[
                              responsiveStyles.tileText,
                              { 
                                color: getTileStyle(cell).text,
                                fontSize: getTileFontSize(cell),
                                textShadowColor: 'rgba(0,0,0,0.3)',
                                textShadowOffset: { width: 1, height: 1 },
                                textShadowRadius: 2,
                                zIndex: 10,
                              }
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.4}
                          >
                            {cell}
                          </Text>
                        </View>
                      </Animated.View>
                    ) : null
                  )
                )}
                {mergePopups.map((p) => (
                  <Animated.Text
                    key={p.id}
                    style={{
                      position: 'absolute',
                      left: p.left,
                      top: p.top,
                      color: '#ff9f0a',
                      fontWeight: '900',
                      textShadowColor: 'rgba(0,0,0,0.6)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                      transform: [{ translateY: p.animTranslateY }],
                      opacity: p.animOpacity,
                      zIndex: 9999,
                    }}
                  >
                    {`+${p.value}`}
                  </Animated.Text>
                ))}
              </View>
            </View>
          </View>
        </View>
      ) : (
        // Portrait Layout
        <View style={responsiveStyles.scrollContainer}>
          <View style={responsiveStyles.gameContent}>
            <View style={responsiveStyles.header}>
              <Text style={responsiveStyles.title}>Merge 2468</Text>
            </View>

            <View style={responsiveStyles.scoreContainer}>
              <View style={responsiveStyles.scoreBox}>
                <Text style={responsiveStyles.scoreLabel}>SCORE</Text>
                <Text style={responsiveStyles.scoreValue}>{score.toLocaleString()}</Text>
              </View>
              <View style={responsiveStyles.scoreBox}>
                <Text style={responsiveStyles.scoreLabel}>HIGH SCORE</Text>
                <Text style={responsiveStyles.highScoreValue}>{highScore.toLocaleString()}</Text>
              </View>
             
            </View>
  
            <View 
              style={responsiveStyles.gridContainer}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={onTouchStart}
              onResponderRelease={onTouchEnd}
            >
              <View style={responsiveStyles.gridBackground}>
                {Array(16).fill(0).map((_, index) => (
                  <View key={`cell-${index}`} style={responsiveStyles.cell} />
                ))}
              </View>
              <View style={responsiveStyles.tilesContainer}>
                {grid.map((row, i) =>
                  row.map((cell, j) =>
                    cell !== 0 ? (
                      <Animated.View
                        key={`tile-${i}-${j}-${cell}`}
                        style={[
                          responsiveStyles.tile,
                          {
                            left: j * (dimensions.cellSize + 6) + 3,
                            top: i * (dimensions.cellSize + 6) + 3,
                            width: dimensions.cellSize,
                            height: dimensions.cellSize,
                            zIndex: cell,
                            transform: [{ 
                              scale: tileAnimations[`${i}-${j}`] || 1 
                            }],
                          },
                        ]}
                      >
                        {/* 3D Shadow Base */}
                        <View style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          backgroundColor: getTileStyle(cell).sideColor,
                          borderRadius: 12,
                          top: 6,
                          left: 6,
                        }} />
                        
                        {/* 3D Side Panel */}
                        <View style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          backgroundColor: getTileStyle(cell).sideColor,
                          borderRadius: 12,
                          top: 3,
                          left: 3,
                        }} />
                        
                        {/* 3D Top Surface */}
                        <View style={[
                          {
                            width: '100%',
                            height: '100%',
                            backgroundColor: getTileStyle(cell).bg,
                            borderRadius: 12,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 2,
                            borderColor: getTileStyle(cell).topColor,
                            shadowColor: getTileStyle(cell).shadow,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 8,
                          }
                        ]}>
                          {/* Inner highlight for 3D effect */}
                          <View style={{
                            position: 'absolute',
                            top: 2,
                            left: 2,
                            right: 2,
                            height: '30%',
                            backgroundColor: getTileStyle(cell).topColor,
                            borderRadius: 8,
                            opacity: 0.4,
                          }} />
                          
                          <Text 
                            style={[
                              responsiveStyles.tileText,
                              { 
                                color: getTileStyle(cell).text,
                                fontSize: getTileFontSize(cell),
                                textShadowColor: 'rgba(0,0,0,0.3)',
                                textShadowOffset: { width: 1, height: 1 },
                                textShadowRadius: 2,
                                zIndex: 10,
                              }
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.4}
                          >
                            {cell}
                          </Text>
                        </View>
                      </Animated.View>
                    ) : null
                  )
                )}
                {mergePopups.map((p) => (
                  <Animated.Text
                    key={p.id}
                    style={{
                      position: 'absolute',
                      left: p.left,
                      top: p.top,
                      color: '#ffffff',
                      fontWeight: '900',
                      textShadowColor: 'rgba(0,0,0,0.6)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                      transform: [{ translateY: p.animTranslateY }],
                      opacity: p.animOpacity,
                      zIndex: 9999,
                    }}
                  >
                    {`+${p.value}`}
                  </Animated.Text>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default Game2048;