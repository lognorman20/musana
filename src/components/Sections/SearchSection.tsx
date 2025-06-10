import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { SpotifyAPI } from '../../services/SpotifyAPI';
import { Track } from '../../types/spotify.types';
import { Ionicons } from '@expo/vector-icons';

interface TrackItemProps {
  track: Track;
  onPress: (track: Track) => void;
}

const TrackItem: React.FC<TrackItemProps> = ({ track, onPress }) => (
  <TouchableOpacity 
    style={styles.trackItem} 
    onPress={() => onPress(track)}
  >
    {track.album.images[0] && (
      <View style={styles.albumArt}>
        <Image 
          source={{ uri: track.album.images[0].url }} 
          style={styles.albumImage} 
        />
      </View>
    )}
    <View style={styles.trackInfo}>
      <Text style={styles.trackName} numberOfLines={1}>
        {track.name}
      </Text>
      <Text style={styles.artistName} numberOfLines={1}>
        {track.artists.map(artist => artist.name).join(', ')}
      </Text>
    </View>
  </TouchableOpacity>
);

interface SearchSectionProps {
  spotifyApi: SpotifyAPI;
}

export const SearchSection: React.FC<SearchSectionProps> = ({ spotifyApi }) => {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await spotifyApi.searchTracks(query);
      setTracks(results);
    } catch (err) {
      setError('Failed to search tracks. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackPress = (track: Track) => {
    // TODO: Implement track selection/playback
    console.log('Selected track:', track.name);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search for tracks..."
          placeholderTextColor="#666"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Ionicons name="search" size={24} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <FlatList
        data={tracks}
        renderItem={({ item }) => (
          <TrackItem track={item} onPress={handleTrackPress} />
        )}
        keyExtractor={item => item.id}
        style={styles.trackList}
        contentContainerStyle={styles.trackListContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 400, // Fixed height for the search section
    backgroundColor: '#000',
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 16,
    color: '#FFF',
    fontSize: 16,
    marginRight: 8,
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: '#1DB954', // Spotify green
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  trackList: {
    flex: 1,
  },
  trackListContent: {
    paddingBottom: 16,
  },
  trackItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  artistName: {
    color: '#999',
    fontSize: 14,
  },
}); 