import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing, ScrollView, BackHandler, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [titleAnim] = useState(new Animated.Value(0));
  const [buttonAnim] = useState(new Animated.Value(0));
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
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(titleAnim, {
          toValue: 1,
          duration: 600,
          delay: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(buttonAnim, {
          toValue: 1,
          duration: 500,
          delay: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        })
      ])
    ]).start();
  }, []);

  // Handle Android hardware back button to confirm exit
  useEffect(() => {
    const backAction = () => {
      if (Platform.OS === 'android') {
        confirmExit();
        return true; // prevent default behavior
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => subscription.remove();
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

  const confirmExit = () => {
    Alert.alert(
      'Exit App',
      'Are you sure you want to exit?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      {/* Exit icon top-left */}
      <TouchableOpacity
        style={styles.exitButton}
        onPress={() => {
          if (Platform.OS === 'android') {
            confirmExit();
          } else {
            // iOS / web don't allow programmatic exit; show an informational alert instead
            Alert.alert('Not supported', 'Closing the app is only supported on Android.');
          }
        }}
        accessibilityLabel="Exit app"
        hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
      >
        <Text style={styles.exitText}>✕</Text>
      </TouchableOpacity>
      <View style={styles.backgroundPattern} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Animated.View 
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <Animated.View style={[
            styles.titleContainer,
            { 
              opacity: titleAnim,
              transform: [{ 
                translateY: titleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0]
                })
              }]
            }
          ]}>
            <Text style={styles.title}>Merge 2468</Text>
            <View style={styles.titleUnderline} />
          </Animated.View>
          
          <Text style={styles.subtitle}>Merge the numbers and get to the 2048 tile!</Text>
          
          <Animated.View style={[
            styles.buttonContainer,
            { 
              opacity: buttonAnim,
              transform: [{ scale: buttonAnim }]
            }
          ]}>
            <TouchableOpacity 
              style={styles.playButton}
              onPress={startGame}
              activeOpacity={0.7}
            >
              <View style={styles.buttonGlow} />
              <Text style={styles.playButtonText}>PLAY NOW</Text>
            </TouchableOpacity>
          </Animated.View>
          
          <View style={styles.statsContainer}>
            <View style={styles.highScoreContainer}>
              <Text style={styles.highScoreLabel}>BEST SCORE</Text>
              <Text style={styles.highScoreValue}>{highScore.toLocaleString()}</Text>
            </View>
          </View>
          
          
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  exitButton: {
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
  exitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    minHeight: height,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
    backgroundColor: 'transparent',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    zIndex: 1,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 84,
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 15,
    letterSpacing: 6,
    textAlign: 'center',
  },
  titleUnderline: {
    width: 120,
    height: 4,
    backgroundColor: '#ffffff',
    marginTop: 8,
    borderRadius: 2,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  subtitle: {
    fontSize: 20,
    color: '#c0c0c0',
    textAlign: 'center',
    marginBottom: 50,
    fontWeight: '300',
    lineHeight: 28,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    marginBottom: 50,
  },
  playButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 30,
    elevation: 12,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: '#333333',
    position: 'relative',
    overflow: 'hidden',
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    zIndex: 1,
  },
  statsContainer: {
    marginBottom: 40,
  },
  highScoreContainer: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 20,
    paddingHorizontal: 25,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 180,
    borderWidth: 2,
    borderColor: '#333333',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  highScoreLabel: {
    color: '#c0c0c0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 1,
  },
  highScoreValue: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  instructionsContainer: {
    paddingHorizontal: 30,
    paddingVertical: 20,
    backgroundColor: 'rgba(26, 26, 26, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  instructions: {
    color: '#c0c0c0',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
});
