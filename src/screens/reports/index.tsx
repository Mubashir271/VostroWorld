// src/screens/reports/index.js

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Ionicons from 'react-native-vector-icons/Ionicons';
import AppHeader from '../../components/AppHeader';
import BurgerSVG from '../../assets/svg/BurgerSVG';
import NotificationSVG from '../../assets/svg/NotificationSVG';

const REPORTS = [
  {
    id: '1',
    title: 'Transaction Report',
    subtitle: 'View all sales transactions',
    icon: 'receipt-outline',
    screen: 'TransactionReportScreen',
    color: '#2563EB',
  },
  {
    id: '2',
    title: 'Cafe Report',
    subtitle: 'Cafe transactions & deposits',
    icon: 'cafe-outline',
    screen: 'CafeReportScreen',
    color: '#EA580C',
  },
  {
    id: '3',
    title: 'Transaction Summary',
    subtitle: 'Daily summary analytics',
    icon: 'stats-chart-outline',
    screen: 'TransactionSummaryScreen',
    color: '#16A34A',
  },
  {
    id: '4',
    title: 'Sales Report',
    subtitle: 'Package wise sales report',
    icon: 'bar-chart-outline',
    screen: 'SalesReportScreen',
    color: '#7C3AED',
  },
  {
    id: '5',
    title: 'Transaction Slip',
    subtitle: 'Invoice & payment details',
    icon: 'document-text-outline',
    screen: 'TransactionSlipScreen',
    color: '#DC2626',
  },
];

const ReportCard = ({ item, navigation }: { item: any; navigation: any }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.card}
      onPress={() => navigation.navigate(item.screen)}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${item.color}15` },
        ]}
      >
        <Ionicons name={item.icon} size={28} color={item.color} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={22}
        color="#9CA3AF"
      />
    </TouchableOpacity>
  );
};

const ReportsScreen = ({ navigation }: { navigation: any }) => {
  return (
    <>
          <AppHeader
        title="Reports"
        leftIcon={<BurgerSVG width={24} height={24} />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.openDrawer()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Reports</Text>
        <Text style={styles.description}>
          Access transaction reports, analytics, summaries and invoices.
        </Text>
      </View>

      {/* Report List */}
      <FlatList
        data={REPORTS}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ReportCard
            item={item}
            navigation={navigation}
          />
        )}
      />
    </View>
    </>
  );
};

export default ReportsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },

  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },

  description: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  listContent: {
    padding: 20,
    paddingTop: 10,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textContainer: {
    flex: 1,
    marginLeft: 14,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
});