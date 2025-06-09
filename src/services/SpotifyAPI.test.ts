import { SpotifyAPI } from './SpotifyAPI';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');

global.fetch = jest.fn();

describe('SpotifyAPI.refreshAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refreshes the access token and stores it', async () => {
    const api = new SpotifyAPI();
    // Set a fake refresh token
    (api as any).refreshToken = 'valid_refresh_token';

    // Mock fetch response for token refresh
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
      }),
    });

    await api.refreshAccessToken();

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('spotify_access_token', 'new_access_token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('spotify_refresh_token', 'new_refresh_token');
    expect((api as any).accessToken).toBe('new_access_token');
    expect((api as any).refreshToken).toBe('new_refresh_token');
  });

  it('throws if no refresh token is present', async () => {
    const api = new SpotifyAPI();
    (api as any).refreshToken = null;
    await expect(api.refreshAccessToken()).rejects.toThrow('No refresh token available');
  });

  it('throws if fetch fails', async () => {
    const api = new SpotifyAPI();
    (api as any).refreshToken = 'valid_refresh_token';
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error_description: 'invalid_grant' }),
      status: 400,
    });
    await expect(api.refreshAccessToken()).rejects.toThrow('Failed to refresh token: invalid_grant');
  });
}); 