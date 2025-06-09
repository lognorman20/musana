import { Track, Playlist, SpotifyUser } from '../types/spotify.types';
import { encode as btoa } from 'base-64';
import * as SecureStore from 'expo-secure-store';

/**
 * SpotifyAPI service for handling authentication and Spotify Web API requests.
 * All methods return Promises and use strict typing.
 */
export class SpotifyAPI {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: SpotifyUser | null = null;

  /**
   * Authenticate with Spotify (OAuth flow)
   * Returns the authorization URL to open in a browser or WebView
   */
  async authenticate(): Promise<string> {
    const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI!);
    const scope = encodeURIComponent('user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private user-read-email user-read-private');
    const state = Math.random().toString(36).substring(2, 15); // random string for CSRF protection
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;
    return authUrl;
  }

  /**
   * Exchange authorization code for access and refresh tokens, then fetch user profile
   */
  async handleAuthCallback(code: string): Promise<SpotifyUser> {
    const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI;
    const creds = `${clientId}:${clientSecret}`;
    const basic = btoa(creds);

    // Exchange code for tokens
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basic}`,
      },
      body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectUri!)}`,
    });
    const tokenData = await tokenRes.json();
    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token;

    // Fetch user profile
    const userRes = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
    const user = await userRes.json();
    this.user = user;
    return user;
  }

  /**
   * Get the current user profile (if authenticated)
   */
  getCurrentUser(): SpotifyUser | null {
    return this.user;
  }

  /**
   * Logout: clear tokens and user info
   */
  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(): Promise<void> {
    const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET;
    const creds = `${clientId}:${clientSecret}`;
    const basic = btoa(creds);

    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basic}`,
        },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(this.refreshToken)}`,
      });
      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new Error(`Failed to refresh token: ${errorData.error_description || tokenRes.status}`);
      }
      const tokenData = await tokenRes.json();
      this.accessToken = tokenData.access_token;
      if (tokenData.refresh_token) {
        this.refreshToken = tokenData.refresh_token;
      }
      // Store tokens securely
      if (this.accessToken) {
        await SecureStore.setItemAsync('spotify_access_token', this.accessToken);
      }
      if (this.refreshToken) {
        await SecureStore.setItemAsync('spotify_refresh_token', this.refreshToken);
      }
    } catch (error: unknown) {
      console.error('[SpotifyAPI] refreshAccessToken failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Could not refresh Spotify access token');
    }
  }

  /**
   * Get the currently playing track
   */
  async getCurrentlyPlaying(): Promise<Track | null> {
    // TODO: Implement API call
    return null;
  }

  /**
   * Get the user's playlists
   */
  async getUserPlaylists(): Promise<Playlist[]> {
    // TODO: Implement API call
    return [];
  }

  /**
   * Search for tracks
   */
  async searchTracks(query: string): Promise<Track[]> {
    // TODO: Implement API call
    return [];
  }

  /**
   * Get track recommendations
   */
  async getRecommendations(seedTracks: string[]): Promise<Track[]> {
    // TODO: Implement API call
    return [];
  }

  /**
   * Start playback of a track
   */
  async playTrack(trackId: string): Promise<void> {
    // TODO: Implement API call
  }

  /**
   * Pause playback
   */
  async pauseTrack(): Promise<void> {
    // TODO: Implement API call
  }

  /**
   * Skip to the next track
   */
  async skipToNext(): Promise<void> {
    // TODO: Implement API call
  }

  /**
   * Skip to the previous track
   */
  async skipToPrevious(): Promise<void> {
    // TODO: Implement API call
  }

  /**
   * Seek to a position in the current track
   */
  async seek(positionMs: number): Promise<void> {
    // TODO: Implement API call
  }
} 