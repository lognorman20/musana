import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpotifyAPI } from '../services/SpotifyAPI';
import { Track } from '../types/spotify.types';

interface PlaybackControlsProps {
  spotifyApi: SpotifyAPI;
  currentTrack: Track | null;
  isPlaying?: boolean;
  onPlaybackStateChange?: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  spotifyApi,
  currentTrack,
  isPlaying = false,
  onPlaybackStateChange,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlayPause = async () => {
    if (isLoading) return; // Prevent multiple rapid clicks
    
    try {
      setIsLoading(true);
      setError(null);

      await spotifyApi.togglePlayback();
      onPlaybackStateChange?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Playback control failed';
      setError(message);
      console.error('[PlaybackControls] Play/Pause error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);
      await spotifyApi.skipToPrevious();
      onPlaybackStateChange?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to skip to previous track';
      setError(message);
      console.error('[PlaybackControls] Previous track error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);
      await spotifyApi.skipToNext();
      onPlaybackStateChange?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to skip to next track';
      setError(message);
      console.error('[PlaybackControls] Next track error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentTrack) return null;

  return (
    <View style={styles.container}>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isLoading && styles.disabledButton]}
          onPress={handlePrevious}
          disabled={isLoading}
        >
          <Ionicons name="play-skip-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            styles.playPauseButton,
            isLoading && styles.disabledButton
          ]}
          onPress={handlePlayPause}
          disabled={isLoading}
        >
          {isLoading ? (
            <Ionicons name="sync" size={32} color="#FFF" />
          ) : (
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={32}
              color="#FFF"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isLoading && styles.disabledButton]}
          onPress={handleNext}
          disabled={isLoading}
        >
          <Ionicons name="play-skip-forward" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  playPauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1DB954',
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
}); 