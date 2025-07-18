import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  ActivityIndicator, 
  StyleSheet, 
  StatusBar, 
  Text, 
  Image, 
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Linking from 'expo-linking';
import { SpotifyAPI } from './src/services/SpotifyAPI';
import { SpotifyUser, Track, Playlist } from './src/types/spotify.types';
import { PlaylistList } from './src/components/PlaylistList';
import { SearchSection } from './src/components/Sections/SearchSection';
import { PlaybackControls } from './src/components/PlaybackControls';
import { Ionicons } from '@expo/vector-icons';
import { ColorExtractor, ColorPalette, defaultColors } from './src/services/ColorExtractor';

interface AppState {
  loading: boolean;
  user: SpotifyUser | null;
  track: Track | null;
  error: string | null;
  tokensLoaded: boolean;
  playlists: Playlist[];
  playlistsError: string | null;
  loadingPlaylists: boolean;
  isPlaying: boolean;
  colorPalette: ColorPalette;
}

const initialState: AppState = {
  loading: true,
  user: null,
  track: null,
  error: null,
  tokensLoaded: false,
  playlists: [],
  playlistsError: null,
  loadingPlaylists: false,
  isPlaying: false,
  colorPalette: defaultColors,
};

/**
 * Main App Entry Point
 * Handles authentication flow and main app layout
 */
export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const spotifyApiRef = useRef<SpotifyAPI | null>(null);

  // Load tokens on mount
  useEffect(() => {
    const load = async () => {
      try {
        const api = new SpotifyAPI();
        await api.loadTokens();
        spotifyApiRef.current = api;
        setState(prev => ({ ...prev, tokensLoaded: true, loading: false }));
      } catch (error) {
        console.error('[App] Failed to load tokens:', error);
        Alert.alert('Error', 'Failed to initialize app. Please try again.');
      }
    };
    load();
  }, []);

  // Listen for OAuth redirect
  useEffect(() => {
    if (!state.tokensLoaded) return;

    const handleUrl = async (event: { url: string }) => {
      const url = event.url;
      const code = Linking.parse(url).queryParams?.code as string | undefined;
      
      if (code && spotifyApiRef.current) {
        setState(prev => ({ ...prev, loading: true }));
        try {
          const userData = await spotifyApiRef.current.handleAuthCallback(code);
          setState(prev => ({ ...prev, user: userData }));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to authenticate';
          Alert.alert('Authentication Error', message);
        } finally {
          setState(prev => ({ ...prev, loading: false }));
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
  }, [state.tokensLoaded]);

  const updateColors = useCallback(async (track: Track | null) => {
    if (!track?.album.images[0]?.url) {
      setState(prev => ({ ...prev, colorPalette: defaultColors }));
      return;
    }
    const colors = await ColorExtractor.extractColors(track.album.images[0].url);
    setState(prev => ({ ...prev, colorPalette: colors }));
  }, []);

  const handleSpotifyAuth = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const url = await spotifyApiRef.current?.authenticate();
      if (url) Linking.openURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start authentication';
      Alert.alert('Error', message);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const handleLogout = useCallback(() => {
    spotifyApiRef.current?.logout();
    setState(prev => ({
      ...prev,
      user: null,
      track: null,
      error: null,
      playlists: [],
      colorPalette: defaultColors,
    }));
  }, []);

  const handleShowCurrentlyPlaying = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      if (!state.user) {
        const url = await spotifyApiRef.current?.authenticate();
        if (url) Linking.openURL(url);
        return;
      }

      // Get both current track and playback state
      const [currentTrack, playbackState] = await Promise.all([
        spotifyApiRef.current?.getCurrentlyPlaying(),
        spotifyApiRef.current?.getPlaybackState()
      ]);

      setState(prev => ({
        ...prev,
        track: currentTrack || null,
        isPlaying: playbackState?.is_playing || false,
        error: !currentTrack ? 'Nothing is currently playing.' : null,
      }));

      if (currentTrack) {
        await updateColors(currentTrack);
      } else {
        setState(prev => ({...prev, colorPalette: defaultColors}));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch currently playing track';
      setState(prev => ({ ...prev, error: message }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.user, updateColors]);

  const handleTrackSelect = useCallback(async (track: Track) => {
    setState(prev => ({ ...prev, track, isPlaying: true }));
    await updateColors(track);
  }, [updateColors]);

  const handlePlaybackStateChange = useCallback(async () => {
    await handleShowCurrentlyPlaying();
  }, [handleShowCurrentlyPlaying]);

  const handleLoadPlaylists = useCallback(async () => {
    setState(prev => ({ ...prev, loadingPlaylists: true, playlistsError: null }));
    
    try {
      if (!state.user) {
        const url = await spotifyApiRef.current?.authenticate();
        if (url) Linking.openURL(url);
        return;
      }

      const userPlaylists = await spotifyApiRef.current?.getUserPlaylists();
      if (userPlaylists) {
        setState(prev => ({ ...prev, playlists: userPlaylists }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch playlists';
      setState(prev => ({ ...prev, playlistsError: message }));
    } finally {
      setState(prev => ({ ...prev, loadingPlaylists: false }));
    }
  }, [state.user]);

  if (state.loading || !state.tokensLoaded) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: state.colorPalette.darkMuted }]}>
      <StatusBar barStyle="light-content" backgroundColor={state.colorPalette.darkMuted} />
      {!state.user ? (
        <View style={styles.authContainer}>
          <Ionicons name="musical-notes" size={64} color="#1DB954" />
          <Text style={styles.appTitle}>Minimal Spotify</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleSpotifyAuth}
          >
            <Ionicons name="musical-notes" size={24} color="#FFF" />
            <Text style={styles.loginButtonText}>Login with Spotify</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome, {state.user.display_name}</Text>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out" size={24} color="#ff0033" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.nowPlayingButton}
            onPress={handleShowCurrentlyPlaying}
          >
            <Ionicons name="musical-note" size={24} color="#FFF" />
            <Text style={styles.nowPlayingText}>Show Currently Playing</Text>
          </TouchableOpacity>

          {state.error && (
            <Text style={styles.error}>{state.error}</Text>
          )}

          {state.track && (
            <View style={[styles.trackContainer, { backgroundColor: state.colorPalette.dominant }]}>
              <Image
                source={{ uri: state.track.album.images[0]?.url }}
                style={styles.albumArt}
              />
              <Text style={[styles.trackName, { color: state.colorPalette.textPrimary }]}>{state.track.name}</Text>
              <Text style={[styles.artistName, { color: state.colorPalette.textSecondary }]}>
                {state.track.artists.map(a => a.name).join(', ')}
              </Text>
              <PlaybackControls
                spotifyApi={spotifyApiRef.current!}
                currentTrack={state.track}
                isPlaying={state.isPlaying}
                onPlaybackStateChange={handlePlaybackStateChange}
              />
              <ColorPaletteDisplay palette={state.colorPalette} />
            </View>
          )}

          <View style={styles.searchContainer}>
            <SearchSection 
              spotifyApi={spotifyApiRef.current!}
              onTrackSelect={handleTrackSelect}
            />
          </View>

          <PlaylistList
            onLoadPlaylists={handleLoadPlaylists}
            playlists={state.playlists}
            loading={state.loadingPlaylists}
            error={state.playlistsError}
          />
        </ScrollView>
      )}
    </View>
  );
}

const ColorPaletteDisplay = ({ palette }: { palette: ColorPalette }) => {
  const colors = Object.entries(palette);
  return (
    <View style={styles.paletteContainer}>
      {colors.map(([name, color]) => (
        <View key={name} style={styles.paletteItem}>
          <View style={[styles.colorSwatch, { backgroundColor: color }]} />
          <Text style={styles.colorName}>{name}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  authContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  appTitle: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '700',
    marginVertical: 20,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DB954',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
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
  logoutButton: {
    padding: 8,
  },
  nowPlayingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  nowPlayingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  error: {
    color: '#ff0033',
    marginVertical: 20,
    textAlign: 'center',
  },
  trackContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
  },
  albumArt: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  trackName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  artistName: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
  searchContainer: {
    width: '100%',
    height: 400,
    marginVertical: 20,
  },
  paletteContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
  },
  paletteItem: {
    alignItems: 'center',
    margin: 5,
  },
  colorSwatch: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  colorName: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 4,
  }
});
