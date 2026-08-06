import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { RootState } from '../../../redux/store';
import {
  getNutritionGallery,
  uploadNutritionGalleryImage,
  deleteNutritionGalleryImage,
} from '../../../api/nutrition';
import AppHeader from '../../../components/AppHeader';
import NotificationSVG from '../../../assets/svg/NotificationSVG';

type GalleryImage = {
  id: number;
  image_url: string;
  title: string;
};

const stripExtension = (name: string) => name.replace(/\.[^./]+$/, '');

const NutritionImageGallery = () => {
  const navigation = useNavigation<any>();
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId || '';

  const [search, setSearch] = useState('');
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getNutritionGallery({
        branch_id: branchId,
        search: search.trim() || undefined,
        limit: 200,
      });
      const data = res.data?.data ?? [];
      setImages(Array.isArray(data) ? data : []);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleUpload = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 0 });
      if (result.didCancel || !result.assets?.length) return;

      setUploading(true);
      for (const asset of result.assets) {
        if (!asset.uri) continue;
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;
        await uploadNutritionGalleryImage({
          branch_id: branchId,
          title: stripExtension(fileName),
          image: { uri: asset.uri, name: fileName, type: asset.type || 'image/jpeg' },
        });
      }
      load();
    } catch {
      Alert.alert('Error', 'Failed to upload one or more images.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (item: GalleryImage) => {
    Alert.alert('Delete Image', `Remove "${item.title}" from the gallery?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNutritionGalleryImage(item.id);
            setImages(prev => prev.filter(i => i.id !== item.id));
          } catch {
            Alert.alert('Error', 'Failed to delete image.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: GalleryImage }) => (
    <View style={styles.card}>
      <FastImage source={{ uri: item.image_url }} style={styles.thumb} />
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
        <Icon name="trash-can" size={14} color="#FFF" />
      </TouchableOpacity>
      <Text style={styles.caption} numberOfLines={1}>{item.title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Image Gallery"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />

      <View style={styles.body}>
        <View style={styles.filterRow}>
          <View style={styles.searchBox}>
            <Icon name="magnify" size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Icon name="tray-arrow-up" size={16} color="#FFF" />
                <Text style={styles.uploadBtnText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#E63946" style={{ marginTop: 30 }} />
        ) : images.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="image-off-outline" size={48} color="#ddd" />
            <Text style={styles.emptyTitle}>No Images Found</Text>
            <Text style={styles.emptyText}>Upload images once and reuse them when building meal plans.</Text>
          </View>
        ) : (
          <FlatList
            data={images}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            numColumns={3}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.row}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#E63946']} />}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F7F8FA' },
  body:         { flex: 1, padding: 14 },

  filterRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  searchBox:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FAFAFA' },
  searchInput:  { flex: 1, fontSize: 13, color: '#1A1A1A' },
  uploadBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  uploadBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  row:          { justifyContent: 'flex-start', gap: 8 },
  card:         { width: '31%', marginBottom: 12, position: 'relative' },
  thumb:        { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#EEE' },
  deleteBtn:    { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#E63946', alignItems: 'center', justifyContent: 'center' },
  caption:      { fontSize: 11, color: '#555', marginTop: 4 },

  empty:        { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 8 },
  emptyText:    { fontSize: 13, color: '#999', textAlign: 'center', paddingHorizontal: 20 },
});

export default NutritionImageGallery;
