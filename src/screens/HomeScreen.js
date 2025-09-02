import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [highScore, setHighScore] = useState(0);

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
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const startGame = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      navigation.navigate('Game2048');
    });
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
        ]}
      >
        <Text style={styles.title}>2048</Text>
        <Text style={styles.subtitle}>Join the numbers and get to the 2048 tile!</Text>
        
        <TouchableOpacity 
          style={styles.playButton}
          onPress={startGame}
          activeOpacity={0.8}
        >
          <Text style={styles.playButtonText}>PLAY NOW</Text>
        </TouchableOpacity>
        
        <View style={styles.highScoreContainer}>
          <Text style={styles.highScoreLabel}>BEST SCORE</Text>
          <Text style={styles.highScoreValue}>{highScore.toLocaleString()}</Text>
        </View>
        
        <Text style={styles.instructions}>
          Use arrow keys or swipe to move the tiles. When two tiles with the same number touch, they merge into one!
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#f8f8f8',
    marginBottom: 10,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#e6e6e6',
    textAlign: 'center',
    marginBottom: 40,
    fontStyle: 'italic',
  },
  playButton: {
    backgroundColor: '#8f7a66',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 50,
    marginBottom: 40,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  playButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  highScoreContainer: {
    backgroundColor: '#bbada0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
    minWidth: 150,
  },
  highScoreLabel: {
    color: '#eee4da',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  highScoreValue: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  instructions: {
    color: '#b8b8b8',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 20,
  },
});
