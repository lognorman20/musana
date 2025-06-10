import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ListRenderItem,
} from 'react-native';
import { Playlist } from '../types/spotify.types';
import { PlaylistItemProps, PlaylistSectionProps } from '../types/playlist.types';

/**
 * Displays a list of Spotify playlists with loading and error states
 * @param props - Component props including playlists data and loading state
 * @returns JSX element
 * 
 * Debug Context: PlaylistList
 * Related Files: SpotifyAPI.ts, spotify.types.ts, playlist.types.ts
 */
export const PlaylistList: React.FC<PlaylistSectionProps> = ({ 
  onLoadPlaylists,
  playlists,
  loading,
  error,
}) => {
  // Memoized playlist item component for performance
  const PlaylistItem = React.memo<PlaylistItemProps>(({ item }) => (
    <TouchableOpacity style={styles.playlistItem}>
      {item.images && item.images.length > 0 && item.images[0]?.url ? (
        <Image
          source={{ uri: item.images[0].url }}
          style={styles.playlistImage}
        />
      ) : (
        <View style={[styles.playlistImage, styles.defaultImageContainer]} />
      )}
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.playlistDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={styles.trackCount}>{item.tracks.total} tracks</Text>
      </View>
    </TouchableOpacity>
  ), (prevProps, nextProps) => prevProps.item.id === nextProps.item.id);

  // Memoized render function for FlatList
  const renderItem: ListRenderItem<Playlist> = useCallback(({ item }) => (
    <PlaylistItem item={item} />
  ), []);

  // Memoized key extractor for FlatList
  const keyExtractor = useCallback((item: Playlist) => item.id, []);

  if (__DEV__) {
    console.log('[PlaylistList] Rendered with playlists:', playlists.length);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.loadButton}
        onPress={onLoadPlaylists}
        disabled={loading}
      >
        <Text style={styles.loadButtonText}>Load Playlists</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && !error && playlists.length > 0 && (
        <FlatList
          data={playlists}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.list}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={10}
          showsVerticalScrollIndicator={false}
        />
      )}

      {!loading && !error && playlists.length === 0 && (
        <Text style={styles.noPlaylists}>No playlists found</Text>
      )}
    </View>
  );
};

// Add debug info for error tracking
PlaylistList.displayName = 'PlaylistList';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  loadButton: {
    backgroundColor: '#1DB954',
    padding: 12,
    borderRadius: 24,
    marginVertical: 16,
    alignItems: 'center',
  },
  loadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: '#ff0033',
    textAlign: 'center',
    marginVertical: 16,
  },
  list: {
    flex: 1,
  },
  playlistItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  playlistImage: {
    width: 64,
    height: 64,
    borderRadius: 4,
  },
  defaultImageContainer: {
    backgroundColor: '#282828',
  },
  playlistInfo: {
    marginLeft: 12,
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  trackCount: {
    fontSize: 12,
    color: '#666',
  },
  noPlaylists: {
    textAlign: 'center',
    color: '#666',
    marginTop: 24,
  },
}); 
