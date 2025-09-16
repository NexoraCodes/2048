import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

const AudioContext = createContext();

export const AudioProvider = ({ children }) => {
  const [sound, setSound] = useState(null);
  const [isMusicOn, setIsMusicOn] = useState(true);

  // Load the sound file
  const loadSound = useCallback(async () => {
    try {
      const soundObject = new Audio.Sound();
      
      try {
        // First, load the asset
        const asset = Asset.fromModule(require('../../assets/bg.wav'));
        await asset.downloadAsync();
        
        // Then load the sound
        await soundObject.loadAsync(
          { uri: asset.localUri || asset.uri },
          { shouldPlay: false, isLooping: true }
        );
        
        // Set the volume (0.0 to 1.0)
        await soundObject.setVolumeAsync(0.5);
        
        setSound(soundObject);
        return soundObject;
      } catch (error) {
        console.error('Error loading sound:', error);
        return null;
      }
    } catch (error) {
      console.error('Error in loadSound:', error);
      return null;
    }
  }, []);

  // Load sound on mount
  useEffect(() => {
    loadSound();
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [loadSound]);

  // Play background music
  const playBackgroundMusic = useCallback(async () => {
    try {
      let soundToPlay = sound;
      
      // If sound isn't loaded yet, load it first
      if (!soundToPlay) {
        soundToPlay = await loadSound();
        if (!soundToPlay) return;
      }
      
      await soundToPlay.setIsLoopingAsync(true);
      await soundToPlay.setVolumeAsync(0.5);
      await soundToPlay.playAsync();
      setIsMusicOn(true);
    } catch (error) {
      console.error('Error playing background music:', error);
    }
  }, [sound, loadSound]);

  // Stop music completely
  const stopMusic = useCallback(async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.setPositionAsync(0); // Reset to start
        setIsMusicOn(false);
      }
    } catch (error) {
      console.error('Error stopping music:', error);
    }
  }, [sound]);

  // Toggle music on/off
  const toggleMusic = useCallback(async () => {
    try {
      if (isMusicOn) {
        await stopMusic();
        setIsMusicOn(false);
      } else {
        await playBackgroundMusic();
        setIsMusicOn(true);
      }
    } catch (error) {
      console.error('Error toggling music:', error);
    }
  }, [isMusicOn, playBackgroundMusic, stopMusic]);

  // Clean up the sound when the component unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <AudioContext.Provider value={{ isMusicOn, toggleMusic, playBackgroundMusic, stopMusic }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
