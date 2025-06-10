import { Track, Playlist, SpotifyUser } from '../types/spotify.types';
import { encode as btoa } from 'base-64';
import * as SecureStore from 'expo-secure-store';

interface SpotifyError {
  error: {
    status: number;
    message: string;
  };
}

interface SpotifyTrackSearchResponse {
  tracks: {
    items: SpotifyTrackObject[];
  };
}

interface SpotifyRecommendationsResponse {
  tracks: SpotifyTrackObject[];
}

interface SpotifyTrackObject {
  id: string;
  name: string;
  artists: SpotifyArtistObject[];
  album: SpotifyAlbumObject;
  duration_ms: number;
  preview_url: string | null;
}

interface SpotifyArtistObject {
  id: string;
  name: string;
}

interface SpotifyAlbumObject {
  id: string;
  name: string;
  images: Array<{ url: string; height: number; width: number; }>;
  release_date: string;
}

interface SpotifyDevice {
  id: string;
  is_active: boolean;
  name: string;
  type: string;
}

interface SpotifyPlaybackState {
  is_playing: boolean;
  device: SpotifyDevice;
  item: SpotifyTrackObject;
}

/**
 * SpotifyAPI service for handling authentication and Spotify Web API requests.
 * All methods return Promises and use strict typing.
 */
export class SpotifyAPI {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private user: SpotifyUser | null = null;

  constructor() {
    // Load tokens from SecureStore if available
    this.loadTokens();
  }

  public async loadTokens() {
    try {
      const accessToken = await SecureStore.getItemAsync('spotify_access_token');
      const refreshToken = await SecureStore.getItemAsync('spotify_refresh_token');
      this.accessToken = accessToken || null;
      this.refreshToken = refreshToken || null;
    } catch (e) {
      console.error('[SpotifyAPI] Failed to load tokens from SecureStore:', e);
      throw new Error('Failed to load authentication tokens');
    }
  }

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
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });
      if (res.status === 204) return null; // No content, nothing is playing
      if (res.status === 401) {
        // Token expired, try to refresh
        await this.refreshAccessToken();
        return this.getCurrentlyPlaying(); // Retry once
      }
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Failed to fetch currently playing track');
      }
      const data = await res.json();
      if (!data.item) return null;
      const item = data.item;
      // Map Spotify API track object to our Track interface
      const track: Track = {
        id: item.id,
        name: item.name,
        artists: (item.artists || []).map((artist: any) => ({
          id: artist.id,
          name: artist.name,
        })),
        album: {
          id: item.album.id,
          name: item.album.name,
          images: item.album.images,
          release_date: item.album.release_date,
        },
        duration_ms: item.duration_ms,
        preview_url: item.preview_url,
      };
      return track;
    } catch (error: any) {
      console.error('[SpotifyAPI] getCurrentlyPlaying failed:', error);
      throw error;
    }
  }

  /**
   * Get the user's playlists
   */
  async getUserPlaylists(): Promise<Playlist[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      let playlists: Playlist[] = [];
      let url = 'https://api.spotify.com/v1/me/playlists?limit=50';

      while (url) {
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        });

        if (res.status === 401) {
          // Token expired, try to refresh
          await this.refreshAccessToken();
          return this.getUserPlaylists(); // Retry once
        }

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error?.message || 'Failed to fetch playlists');
        }

        const data = await res.json();
        const items = data.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          images: item.images,
          tracks: {
            total: item.tracks.total,
            href: item.tracks.href,
          },
          owner: {
            id: item.owner.id,
            display_name: item.owner.display_name,
          },
        }));

        playlists = [...playlists, ...items];
        url = data.next; // Get the next page URL if it exists
      }

      return playlists;
    } catch (error: any) {
      console.error('[SpotifyAPI] getUserPlaylists failed:', error);
      throw error;
    }
  }

  /**
   * Make an authenticated request to the Spotify API
   * Handles token refresh and error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`https://api.spotify.com/v1${endpoint}`, requestOptions);

      if (response.status === 401) {
        await this.refreshAccessToken();
        // Retry once with new token
        return this.makeRequest(endpoint, options);
      }

      if (!response.ok) {
        const errorData = await response.json() as SpotifyError;
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }

      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return {} as T;
      }

      // Check if response has content before trying to parse JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      // For non-JSON responses, return empty object
      return {} as T;
    } catch (error) {
      console.error(`[SpotifyAPI] Request failed - ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Search for tracks
   * @param query Search query string
   * @returns Promise<Track[]> Array of matching tracks
   */
  async searchTracks(query: string): Promise<Track[]> {
    if (!query.trim()) {
      throw new Error('Search query cannot be empty');
    }

    try {
      const encodedQuery = encodeURIComponent(query);
      const data = await this.makeRequest<SpotifyTrackSearchResponse>(
        `/search?q=${encodedQuery}&type=track&limit=20`
      );

      return data.tracks.items.map(this.mapSpotifyTrackToTrack);
    } catch (error) {
      console.error('[SpotifyAPI] searchTracks failed:', error);
      throw error;
    }
  }

  /**
   * Get track recommendations based on seed tracks
   * @param seedTracks Array of track IDs to base recommendations on
   * @returns Promise<Track[]> Array of recommended tracks
   */
  async getRecommendations(seedTracks: string[]): Promise<Track[]> {
    if (!seedTracks.length || seedTracks.length > 5) {
      throw new Error('Must provide between 1 and 5 seed tracks');
    }

    try {
      const data = await this.makeRequest<SpotifyRecommendationsResponse>(
        `/recommendations?seed_tracks=${seedTracks.join(',')}&limit=20`
      );

      return data.tracks.map(this.mapSpotifyTrackToTrack);
    } catch (error) {
      console.error('[SpotifyAPI] getRecommendations failed:', error);
      throw error;
    }
  }

  /**
   * Maps a Spotify track object to our Track type
   */
  private mapSpotifyTrackToTrack(item: SpotifyTrackObject): Track {
    return {
      id: item.id,
      name: item.name,
      artists: item.artists.map(artist => ({
        id: artist.id,
        name: artist.name,
      })),
      album: {
        id: item.album.id,
        name: item.album.name,
        images: item.album.images,
        release_date: item.album.release_date,
      },
      duration_ms: item.duration_ms,
      preview_url: item.preview_url,
    };
  }

  /**
   * Get available devices and their states
   */
  async getDevices(): Promise<SpotifyDevice[]> {
    try {
      const response = await this.makeRequest<{ devices: SpotifyDevice[] }>('/me/player/devices');
      return response.devices;
    } catch (error) {
      console.error('[SpotifyAPI] getDevices failed:', error);
      throw error;
    }
  }

  /**
   * Get the current playback state
   */
  async getPlaybackState(): Promise<SpotifyPlaybackState | null> {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (response.status === 204) return null;
      if (response.status === 401) {
        await this.refreshAccessToken();
        return this.getPlaybackState();
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[SpotifyAPI] getPlaybackState failed:', error);
      throw error;
    }
  }

  /**
   * Start playback of a track
   * @param trackId The Spotify track ID to play
   */
  async playTrack(trackId: string): Promise<void> {
    if (!trackId) {
      throw new Error('Track ID is required');
    }

    try {
      // First check if we have an active device
      const devices = await this.getDevices();
      const activeDevice = devices.find(d => d.is_active);
      
      if (!activeDevice) {
        throw new Error('No active Spotify device found. Please open Spotify on your device first.');
      }

      await this.makeRequest('/me/player/play', {
        method: 'PUT',
        body: JSON.stringify({
          uris: [`spotify:track:${trackId}`],
        }),
      });
    } catch (error) {
      console.error('[SpotifyAPI] playTrack failed:', error);
      throw error;
    }
  }

  /**
   * Pause playback
   */
  async pauseTrack(): Promise<void> {
    try {
      const state = await this.getPlaybackState();
      if (!state || !state.is_playing) {
        return; // Already paused or no active playback
      }

      await this.makeRequest('/me/player/pause', {
        method: 'PUT',
      });
    } catch (error) {
      console.error('[SpotifyAPI] pauseTrack failed:', error);
      throw error;
    }
  }

  /**
   * Toggle playback - pause if playing, resume if paused
   */
  async togglePlayback(): Promise<void> {
    try {
      const state = await this.getPlaybackState();
      
      if (!state) {
        throw new Error('No active playback session found');
      }

      if (state.is_playing) {
        // Currently playing, so pause
        await this.makeRequest('/me/player/pause', {
          method: 'PUT',
        });
      } else {
        // Currently paused, so resume
        await this.makeRequest('/me/player/play', {
          method: 'PUT',
        });
      }
    } catch (error) {
      console.error('[SpotifyAPI] togglePlayback failed:', error);
      throw error;
    }
  }

  /**
   * Skip to the next track
   */
  async skipToNext(): Promise<void> {
    await this.makeRequest('/me/player/next', {
      method: 'POST',
    });
  }

  /**
   * Skip to the previous track
   */
  async skipToPrevious(): Promise<void> {
    await this.makeRequest('/me/player/previous', {
      method: 'POST',
    });
  }

  /**
   * Seek to a position in the current track
   * @param positionMs Position in milliseconds
   */
  async seek(positionMs: number): Promise<void> {
    if (positionMs < 0) {
      throw new Error('Position must be a positive number');
    }

    await this.makeRequest(`/me/player/seek?position_ms=${positionMs}`, {
      method: 'PUT',
    });
  }
} 