import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './styles';

const initialData = [
  {
    id: '1',
    name: 'Ahmed Khan',
    package: 'Gym Package',
    expiry: '15 Jan 2026',
    lastVisit: '2 days ago',
    status: 'Active',
    branch: 'DHA Phase 6',
  },
  {
    id: '2',
    name: 'Sarah Khan',
    package: 'PT Package',
    expiry: '15 Jan 2026',
    lastVisit: '2 days ago',
    status: 'Active',
    branch: 'Gulberg',
  },
  {
    id: '3',
    name: 'Mark Wilson',
    package: 'Guest Pass',
    expiry: '15 Mar 2026',
    lastVisit: '2 days ago',
    status: 'Expired',
    branch: 'DHA Phase 6',
  },
  {
    id: '4',
    name: 'Ali Hassan',
    package: 'Gym Package',
    expiry: '10 Apr 2026',
    lastVisit: 'Today',
    status: 'Active',
    branch: 'Bahria Town',
  },
];

const MembersScreen = () => {
  const [search, setSearch] = useState('');
  const [members] = useState(initialData);

  // Filter States
  const [status, setStatus] = useState('All');
  const [membership, setMembership] = useState('All');
  const [dateRange, setDateRange] = useState('From - To');
  const [branch, setBranch] = useState('All');

  const navigation = useNavigation();

  // Bottom Sheet Refs
  const statusRef = useRef(null);
  const membershipRef = useRef(null);
  const dateRef = useRef(null);
  const branchRef = useRef(null);

  const snapPoints = useMemo(() => ['42%'], []);

  // Helper to close all sheets and open only the desired one
  const openBottomSheet = useCallback((targetRef) => {
    // Close all other sheets first
    [statusRef, membershipRef, dateRef, branchRef].forEach((ref) => {
      if (ref.current && ref !== targetRef) {
        ref.current.close();
      }
    });

    // Open the target sheet after a tiny delay (ensures smooth close → open)
    setTimeout(() => {
      targetRef.current?.expand();
    }, 50);
  }, []);

  // ==================== MAIN FILTERING LOGIC ====================
  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase());

    const matchesMembership =
      membership === 'All' ||
      m.package.toLowerCase().includes(membership.toLowerCase());

    const matchesStatus =
      status === 'All' || m.status === status;

    const matchesBranch =
      branch === 'All' || m.branch === branch;

    // Date filter is placeholder for now (you can enhance later)
    const matchesDate = true;

    return matchesSearch && matchesMembership && matchesStatus && matchesBranch && matchesDate;
  });

  const handleLoadMore = () => {
    console.log('Load more clicked');
  };

  const resetFilters = () => {
    setStatus('All');
    setMembership('All');
    setDateRange('From - To');
    setBranch('All');
    setSearch('');
  };

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

  const FilterChip = ({ label, value, onPress }) => (
    <TouchableOpacity style={styles.filterChip} onPress={onPress}>
      <Text style={styles.filterChipText}>
        {label}: {value}
      </Text>
      <Icon name="chevron-down" size={14} color="#666" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Members</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Icon name="bell-outline" size={24} color="#333" />
          <Icon name="dots-vertical" size={24} color="#333" />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Icon name="magnify" size={20} color="#999" />
        <TextInput
          placeholder="Search members by name or ID"
          value={search}
          onChangeText={setSearch}
          style={styles.input}
        />
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        <FilterChip
          label="Status"
          value={status}
          onPress={() => openBottomSheet(statusRef)}
        />
        <FilterChip
          label="Membership"
          value={membership}
          onPress={() => openBottomSheet(membershipRef)}
        />
        <FilterChip
          label="Date"
          value={dateRange}
          onPress={() => openBottomSheet(dateRef)}
        />
        <FilterChip
          label="Branch"
          value={branch}
          onPress={() => openBottomSheet(branchRef)}
        />
      </ScrollView>

      <TouchableOpacity onPress={resetFilters}>
        <Text style={styles.reset}>Reset Filters</Text>
      </TouchableOpacity>

      {/* Members List */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListFooterComponent={
          <TouchableOpacity style={styles.loadMore} onPress={handleLoadMore}>
            <Text style={styles.loadMoreText}>Load more</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#999', fontSize: 16 }}>No members found</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewMemberRegistration')}>
        <Icon name="plus" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* ====================== BOTTOM SHEETS ====================== */}

      {/* Status Bottom Sheet */}
      <BottomSheet ref={statusRef} index={-1} snapPoints={snapPoints} enablePanDownToClose>
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Status</Text>
          {['All', 'Active', 'Expired'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.optionItem, status === option && styles.optionSelected]}
              onPress={() => {
                setStatus(option);
                statusRef.current?.close();
              }}
            >
              <Text style={status === option ? styles.optionTextSelected : styles.optionText}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </BottomSheetView>
      </BottomSheet>

      {/* Membership Bottom Sheet */}
      <BottomSheet ref={membershipRef} index={-1} snapPoints={snapPoints} enablePanDownToClose>
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Membership</Text>
          {['All', 'Gym', 'PT', 'Guest Pass'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.optionItem, membership === option && styles.optionSelected]}
              onPress={() => {
                setMembership(option);
                membershipRef.current?.close();
              }}
            >
              <Text style={membership === option ? styles.optionTextSelected : styles.optionText}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </BottomSheetView>
      </BottomSheet>

      {/* Date & Branch Bottom Sheets (same as before) */}
      <BottomSheet ref={dateRef} index={-1} snapPoints={snapPoints} enablePanDownToClose>
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Date Range</Text>
          {['From - To', 'Last 7 Days', 'Last 30 Days', 'This Month'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.optionItem, dateRange === option && styles.optionSelected]}
              onPress={() => {
                setDateRange(option);
                dateRef.current?.close();
              }}
            >
              <Text style={dateRange === option ? styles.optionTextSelected : styles.optionText}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet ref={branchRef} index={-1} snapPoints={snapPoints} enablePanDownToClose>
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Branch</Text>
          {['All', 'DHA Phase 6', 'Gulberg', 'Bahria Town', 'Model Town'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.optionItem, branch === option && styles.optionSelected]}
              onPress={() => {
                setBranch(option);
                branchRef.current?.close();
              }}
            >
              <Text style={branch === option ? styles.optionTextSelected : styles.optionText}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
};

export default MembersScreen;