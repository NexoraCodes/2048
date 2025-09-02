import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Alert, Platform, Modal, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Game2048 = () => {
  const [grid, setGrid] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [won, setWon] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const navigation = useNavigation();

  // Update screen dimensions on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

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
    const headerHeight = isLandscape ? 70 : (isTinyScreen ? 70 : (isSmallScreen ? 80 : 100));
    const scoreHeight = isLandscape ? 50 : (isTinyScreen ? 50 : (isSmallScreen ? 60 : 70));
    const instructionsHeight = isLandscape ? 50 : (isTinyScreen ? 60 : (isSmallScreen ? 70 : 90));
    const buttonHeight = isLandscape ? 40 : (isTinyScreen ? 40 : (isSmallScreen ? 45 : 50));
    const padding = isTablet ? 30 : (isTinyScreen ? 8 : (isSmallScreen ? 12 : 16));
    
    const availableWidth = width - (padding * 2);
    const availableHeight = height - headerHeight - scoreHeight - instructionsHeight - buttonHeight - (padding * 2);
    
    // More aggressive grid sizing for small screens
    const maxGridSize = Math.min(availableWidth, availableHeight);
    let gridSize;
    
    if (isTablet) {
      gridSize = Math.min(maxGridSize * 0.85, 450);
    } else if (isTinyScreen) {
      gridSize = Math.min(maxGridSize * 0.98, 300);
    } else if (isSmallScreen) {
      gridSize = Math.min(maxGridSize * 0.96, 320);
    } else {
      gridSize = Math.min(maxGridSize * 0.9, 360);
    }
    
    // Adjusted cell size calculation
    const cellSize = (gridSize - (isTinyScreen ? 40 : 50)) / 4;
    
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
        
        for (let j = row.length - 1; j > 0; j--) {
          if (row[j] === row[j - 1] && !merged[j] && !merged[j - 1]) {
            row[j] *= 2;
            newScore += row[j];
            row.splice(j - 1, 1);
            merged[j] = true;
            j++;
            if (row[j] === 2048 && !won) {
              setWon(true);
              Alert.alert('🎉 You Win!', 'Congratulations! You reached 2048!', [
                { text: 'Play Again', onPress: initGame },
                { text: 'Continue', style: 'cancel' },
              ]);
            }
          }
        }
        
        while (row.length < 4) row.unshift(0);
        
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

  // Enhanced tile colors with gradient-like progression
  const getTileStyle = (value) => {
    const colors = {
      2: { bg: '#1e1e20', text: '#e5e5e7', border: '#333336' },
      4: { bg: '#2a2a2d', text: '#e5e5e7', border: '#404043' },
      8: { bg: '#ff9f0a', text: '#1c1c1e', border: '#ffb340' },
      16: { bg: '#ff7b3d', text: '#ffffff', border: '#ff9466' },
      32: { bg: '#ff5733', text: '#ffffff', border: '#ff7a5c' },
      64: { bg: '#e91e63', text: '#ffffff', border: '#f06292' },
      128: { bg: '#9c27b0', text: '#ffffff', border: '#ba68c8' },
      256: { bg: '#673ab7', text: '#ffffff', border: '#9575cd' },
      512: { bg: '#3f51b5', text: '#ffffff', border: '#7986cb' },
      1024: { bg: '#2196f3', text: '#ffffff', border: '#64b5f6' },
      2048: { bg: '#00bcd4', text: '#1c1c1e', border: '#4dd0e1' },
      4096: { bg: '#009688', text: '#ffffff', border: '#4db6ac' },
      8192: { bg: '#4caf50', text: '#ffffff', border: '#81c784' },
    };
    
    return colors[value] || { bg: '#ff6b6b', text: '#ffffff', border: '#ff8a8a' };
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

  // Enhanced responsive styles with modern dark theme
  const responsiveStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0d0d0f', // Deep dark background
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
      alignItems: 'center',
      marginBottom: dimensions.isLandscape ? 8 : 15,
    },
    title: {
      fontSize: dimensions.fontSize.title,
      fontWeight: '900',
      color: '#ffffff',
      textShadowColor: 'rgba(0, 122, 255, 0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
      letterSpacing: 2,
    },
    subtitle: {
      fontSize: dimensions.fontSize.subtitle,
      color: '#8e8e93',
      marginTop: 4,
      textAlign: 'center',
      fontWeight: '500',
    },
    scoreContainer: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: dimensions.gridSize,
      marginBottom: dimensions.isLandscape ? 8 : 15,
      gap: 12,
    },
    scoreBox: {
      backgroundColor: '#1c1c1e',
      borderWidth: 2,
      borderColor: '#2c2c2e',
      padding: dimensions.isTablet ? 12 : 8,
      borderRadius: 12,
      flex: 1,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
      width:'100%'
    },
    scoreLabel: {
      color: '#8e8e93',
      fontSize: dimensions.fontSize.subtitle * 0.85,
      fontWeight: '600',
      letterSpacing: 1,
    },
    scoreValue: {
      color: '#007aff',
      fontSize: dimensions.fontSize.score,
      fontWeight: '800',
      marginTop: 2,
    },
    highScoreValue: {
      color: '#ff9f0a',
      fontSize: dimensions.fontSize.score,
      fontWeight: '800',
      marginTop: 2,
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
      backgroundColor: '#1c1c1e',
      borderRadius: 16,
      padding: 15,
      alignSelf: 'center',
      marginVertical: dimensions.isLandscape ? 5 : 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 2,
      borderColor: '#2c2c2e',
    },
    gridBackground: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      position: 'absolute',
      top: 15,
      left: 15,
      zIndex: 1,
    },
    cell: {
      width: dimensions.cellSize,
      height: dimensions.cellSize,
      margin: 3,
      backgroundColor: '#0d0d0f',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#2c2c2e',
    },
    tilesContainer: {
      position: 'absolute',
      top: 15,
      left: 15,
      zIndex: 2,
    },
    tile: {
      position: 'absolute',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 4,
      elevation: 5,
      borderWidth: 1,
    },
    tileText: {
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    instructions: {
      marginTop: dimensions.isLandscape ? 5 : 15,
      paddingVertical: dimensions.isTablet ? 16 : 12,
      paddingHorizontal: dimensions.isTablet ? 20 : 16,
      backgroundColor: '#1c1c1e',
      borderRadius: 12,
      width: dimensions.gridSize,
      borderWidth: 1,
      borderColor: '#2c2c2e',
    },
    instructionsText: {
      color: '#8e8e93',
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
      maxWidth: 300,
    },
    landscapeRightPanel: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    landscapeScoreContainer: {
      flexDirection: 'column',
      width: '100%',
      gap: 8,
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
      <GameOverModal />
        <TouchableOpacity 
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={responsiveStyles.backButtonText}>← Back to Home</Text>
            </TouchableOpacity>
      {dimensions.isLandscape ? (
        // Landscape Layout
        <View style={responsiveStyles.landscapeContainer}>
          <View style={responsiveStyles.landscapeLeftPanel}>
            <View style={responsiveStyles.header}>
              <Text style={responsiveStyles.title}>2048</Text>
              <Text style={responsiveStyles.subtitle}>Join the tiles, get to 2048!</Text>
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
            <View style={responsiveStyles.landscapeInstructions}>
              <Text style={responsiveStyles.instructionsText}>
                Swipe or use arrow keys to move tiles
              </Text>
              <Text style={responsiveStyles.instructionsText}>
                When two tiles with the same number touch, they merge!
              </Text>
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
                            backgroundColor: getTileStyle(cell).bg,
                            borderColor: getTileStyle(cell).border,
                            left: j * (dimensions.cellSize + 6) + 3,
                            top: i * (dimensions.cellSize + 6) + 3,
                            width: dimensions.cellSize,
                            height: dimensions.cellSize,
                            zIndex: cell,
                          },
                        ]}
                      >
                        <Text 
                          style={[
                            responsiveStyles.tileText,
                            { 
                              color: getTileStyle(cell).text,
                              fontSize: getTileFontSize(cell),
                            }
                          ]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.4}
                        >
                          {cell}
                        </Text>
                      </Animated.View>
                    ) : null
                  )
                )}
              </View>
            </View>
            <TouchableOpacity 
              style={responsiveStyles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={responsiveStyles.backButtonText}>← Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Portrait Layout
        <View style={responsiveStyles.scrollContainer}>
          <View style={responsiveStyles.gameContent}>
            <View style={responsiveStyles.header}>
              <Text style={responsiveStyles.title}>2048</Text>
              <Text style={responsiveStyles.subtitle}>Join the tiles, get to 2048!</Text>
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
                            backgroundColor: getTileStyle(cell).bg,
                            borderColor: getTileStyle(cell).border,
                            left: j * (dimensions.cellSize + 6) + 3,
                            top: i * (dimensions.cellSize + 6) + 3,
                            width: dimensions.cellSize,
                            height: dimensions.cellSize,
                            zIndex: cell,
                          },
                        ]}
                      >
                        <Text 
                          style={[
                            responsiveStyles.tileText,
                            { 
                              color: getTileStyle(cell).text,
                              fontSize: getTileFontSize(cell),
                            }
                          ]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.4}
                        >
                          {cell}
                        </Text>
                      </Animated.View>
                    ) : null
                  )
                )}
              </View>
            </View>
  
            <View style={responsiveStyles.instructions}>
              <Text style={responsiveStyles.instructionsText}>
                Swipe or use arrow keys to move tiles
              </Text>
              <Text style={responsiveStyles.instructionsText}>
                When two tiles with the same number touch, they merge!
              </Text>
            </View>
  
            
          </View>
        </View>
      )}
    </View>
  );
};

export default Game2048;