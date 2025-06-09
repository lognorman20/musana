import React, { useState, useEffect, useCallback } from 'react';
import { Button, View, ActivityIndicator, StyleSheet, StatusBar, Text, Image, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { SpotifyAPI } from './src/services/SpotifyAPI';

interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}

const spotifyApi = new SpotifyAPI();

export default function App() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<SpotifyUser | null>(null);

  // Listen for OAuth redirect
  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      const url = event.url;
      const code = Linking.parse(url).queryParams?.code as string | undefined;
      if (code) {
        setLoading(true);
        try {
          const userData = await spotifyApi.handleAuthCallback(code);
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
  }, []);

  const handleSpotifyAuth = useCallback(async () => {
    setLoading(true);
    try {
      const url = await spotifyApi.authenticate();
      Linking.openURL(url);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    spotifyApi.logout();
    setUser(null);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {loading ? (
        <ActivityIndicator size="large" color="#1DB954" />
      ) : user ? (
        <View style={styles.userContainer}>
          {user.images && user.images[0] && (
            <Image source={{ uri: user.images[0].url }} style={styles.avatar} />
          )}
          <Text style={styles.success}>Authenticated!</Text>
          <Text style={styles.userName}>{user.display_name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Button title="Logout" onPress={handleLogout} color="#d32f2f" />
        </View>
      ) : (
        <Button title="Authenticate with Spotify" onPress={handleSpotifyAuth} />
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
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  success: {
    color: '#1DB954',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
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
});
