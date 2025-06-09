import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, View, ActivityIndicator, StyleSheet, StatusBar, Text, Image, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { SpotifyAPI } from './src/services/SpotifyAPI';
import { SpotifyUser, Track, Playlist } from './src/types/spotify.types';
import { PlaylistList } from './src/components/PlaylistList';

// Main App Entry
export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokensLoaded, setTokensLoaded] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
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

  const handleLoadPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    setPlaylistsError(null);
    try {
      // Authenticate if not already
      if (!user) {
        const url = await spotifyApiRef.current?.authenticate();
        if (url) Linking.openURL(url);
        setLoadingPlaylists(false);
        return;
      }
      const userPlaylists = await spotifyApiRef.current?.getUserPlaylists();
      if (userPlaylists) {
        setPlaylists(userPlaylists);
      }
    } catch (e: any) {
      setPlaylistsError(e?.message || 'Failed to fetch playlists');
    } finally {
      setLoadingPlaylists(false);
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
      {!user ? (
        <Button title="Login with Spotify" onPress={handleSpotifyAuth} color="#1DB954" />
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome, {user.display_name}</Text>
            <Button title="Logout" onPress={handleLogout} color="#ff0033" />
          </View>
          <Button title="Show Currently Playing" onPress={handleShowCurrentlyPlaying} color="#1DB954" />
          {error && <Text style={styles.error}>{error}</Text>}
          {track && (
            <View style={styles.trackContainer}>
              <Image
                source={{ uri: track.album.images[0]?.url }}
                style={styles.albumArt}
              />
              <Text style={styles.trackName}>{track.name}</Text>
              <Text style={styles.artistName}>
                {track.artists.map(a => a.name).join(', ')}
              </Text>
            </View>
          )}
          <PlaylistList
            onLoadPlaylists={handleLoadPlaylists}
            playlists={playlists}
            loading={loadingPlaylists}
            error={playlistsError}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  welcomeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  error: {
    color: '#ff0033',
    marginVertical: 20,
  },
  trackContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  albumArt: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
  trackName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  artistName: {
    color: '#999',
    fontSize: 16,
  },
});
