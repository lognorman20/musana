import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, View, ActivityIndicator, StyleSheet, StatusBar, Text, Image, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { SpotifyAPI } from './src/services/SpotifyAPI';
import { SpotifyUser, Track } from './src/types/spotify.types';

// Main App Entry
export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokensLoaded, setTokensLoaded] = useState(false);
  const spotifyApiRef = useRef<SpotifyAPI | null>(null);

  // Load tokens on mount
  useEffect(() => {
    const load = async () => {
      const api = new SpotifyAPI();
      // Wait for tokens to load
      if (typeof (api as any).loadTokens === 'function') {
        await (api as any).loadTokens();
      }
      spotifyApiRef.current = api;
      setTokensLoaded(true);
      setLoading(false);
    };
    load();
  }, []);

  // Listen for OAuth redirect
  useEffect(() => {
    if (!tokensLoaded) return;
    const handleUrl = async (event: { url: string }) => {
      const url = event.url;
      const code = Linking.parse(url).queryParams?.code as string | undefined;
      if (code && spotifyApiRef.current) {
        setLoading(true);
        try {
          const userData = await spotifyApiRef.current.handleAuthCallback(code);
          setUser(userData);
        } catch (e: any) {
          Alert.alert('Authentication Error', e?.message || 'Failed to authenticate');
        } finally {
          setLoading(false);
        }
      }
    };
    const sub = Linking.addEventListener('url', handleUrl);
    // Check if app was opened with a code already
    (async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleUrl({ url: initialUrl });
      }
    })();
    return () => sub.remove();
  }, [tokensLoaded]);

  const handleSpotifyAuth = useCallback(async () => {
    setLoading(true);
    try {
      const url = await spotifyApiRef.current?.authenticate();
      if (url) Linking.openURL(url);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    spotifyApiRef.current?.logout();
    setUser(null);
    setTrack(null);
    setError(null);
  }, []);

  const handleShowCurrentlyPlaying = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTrack(null);
    try {
      // Authenticate if not already
      if (!user) {
        const url = await spotifyApiRef.current?.authenticate();
        if (url) Linking.openURL(url);
        setLoading(false);
        return;
      }
      const currentTrack = await spotifyApiRef.current?.getCurrentlyPlaying();
      if (!currentTrack) {
        setError('Nothing is currently playing.');
        setTrack(null);
      } else {
        setTrack(currentTrack);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch currently playing track');
    } finally {
      setLoading(false);
    }
  }, [user]);

  if (loading || !tokensLoaded) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Button title="Show Currently Playing" onPress={handleShowCurrentlyPlaying} color="#1DB954" />
      {error && <Text style={styles.error}>{error}</Text>}
      {track && (
        <View style={styles.trackContainer}>
          {track.album.images && track.album.images[0] && (
            <Image source={{ uri: track.album.images[0].url }} style={styles.albumArt} />
          )}
          <Text style={styles.trackTitle}>{track.name}</Text>
          <Text style={styles.trackArtist}>{track.artists.map(a => a.name).join(', ')}</Text>
        </View>
      )}
      {user && (
        <View style={styles.userContainer}>
          {user.images && user.images[0] && (
            <Image source={{ uri: user.images[0].url }} style={styles.avatar} />
          )}
          <Text style={styles.userName}>{user.display_name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Button title="Logout" onPress={handleLogout} color="#d32f2f" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  userContainer: {
    alignItems: 'center',
    gap: 12,
    marginTop: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 4,
  },
  userEmail: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 16,
  },
  trackContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  albumArt: {
    width: 180,
    height: 180,
    borderRadius: 8,
    marginBottom: 16,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  trackArtist: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  error: {
    color: '#d32f2f',
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});
