import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAudio } from '../contexts/AudioContext';

const MusicToggleButton = ({ style }) => {
  const { isMusicOn, toggleMusic } = useAudio();

  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={toggleMusic}
      activeOpacity={0.7}
    >
      <MaterialIcons 
        name={isMusicOn ? 'music-note' : 'music-off'} 
        size={24} 
        color="#776e65" 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee4da',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default MusicToggleButton;
