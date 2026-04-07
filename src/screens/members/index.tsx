import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheet from '@gorhom/bottom-sheet';
import { styles } from './styles';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const initialData = [
  {
    id: '1',
    name: 'Ahmed Khan',
    package: 'Gym Package',
    expiry: '15 Mar 2026',
    lastVisit: '2 days ago',
  },
  {
    id: '2',
    name: 'Sarah Khan',
    package: 'PT Package',
    expiry: '15 Mar 2026',
    lastVisit: '2 days ago',
  },
  {
    id: '3',
    name: 'Mark Wilson',
    package: 'Guest Pass',
    expiry: '15 Mar 2026',
    lastVisit: '2 days ago',
  },
];

const MembersScreen = () => {
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState(initialData);
  const [page, setPage] = useState(1);
  const navigation = useNavigation();

  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['40%'], []);

  // 🔍 Filtered Data
  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  // 📄 Pagination (Load More)
  const handleLoadMore = () => {
    const newData = Array.from({ length: 10 }).map((_, i) => ({
      id: `${members.length + i}`,
      name: `Member ${members.length + i + 1}`,
      package: 'Gym Package',
      expiry: '15 Mar 2026',
      lastVisit: '1 day ago',
    }));

    setMembers([...members, ...newData]);
    setPage(page + 1);
  };

  // 🎯 Card UI
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.name}>{item.name}</Text>

          <View style={styles.packageBadge}>
            <Text style={styles.packageText}>{item.package}</Text>
          </View>
        </View>

        <Text style={styles.info}>• Expires: {item.expiry}</Text>
        <Text style={styles.info}>• Last visit: {item.lastVisit}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.iconBtn}>
          <Icon name="phone" size={16} color="#E63946" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <Icon name="whatsapp" size={16} color="#E63946" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <Icon name="eye" size={16} color="#E63946" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={24} color="#333" />
        </TouchableOpacity>

        <Text style={styles.topTitle}>Members</Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Icon name="bell-outline" size={22} color="#333" />
          <Icon name="dots-vertical" size={22} color="#333" />
        </View>
      </View>

      {/* SEARCH */}
      <View style={styles.searchBox}>
        <Icon name="magnify" size={18} color="#999" />
        <TextInput
          placeholder="Search members by name or ID"
          value={search}
          onChangeText={setSearch}
          style={styles.input}
        />
      </View>

      {/* FILTER BAR */}
      <View style={styles.filterRow}>
        {[
          'Status: All',
          'Membership: All',
          'Date: From - To',
          'Branch: All',
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.filterChip}
            onPress={() => bottomSheetRef.current?.expand()}
          >
            <Text style={styles.filterChipText}>{item}</Text>
            <Icon name="chevron-down" size={14} color="#666" />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.reset}>Reset Filters</Text>

      {/* LIST */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <TouchableOpacity style={styles.loadMore} onPress={handleLoadMore}>
            <Text style={styles.loadMoreText}>Load more</Text>
          </TouchableOpacity>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab}>
        <Icon name="plus" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* 🔥 FILTER BOTTOM SHEET */}
      <BottomSheet ref={bottomSheetRef} index={-1} snapPoints={snapPoints}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Filters</Text>

          <Text style={styles.sheetLabel}>Status</Text>
          <View style={styles.row}>
            {['All', 'Active', 'Expired'].map((s) => (
              <TouchableOpacity key={s} style={styles.chip}>
                <Text>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sheetLabel}>Membership</Text>
          <View style={styles.row}>
            {['All', 'Gym', 'PT'].map((s) => (
              <TouchableOpacity key={s} style={styles.chip}>
                <Text>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.applyBtn}>
            <Text style={{ color: '#FFF' }}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

export default MembersScreen;