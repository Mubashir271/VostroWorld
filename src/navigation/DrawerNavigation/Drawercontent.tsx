import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Edit_fill, User } from '../../assets/icons';
import ProfileHeader from '../../components/ProfileHeader';
import CloseEyeIconSvg from '../../assets/svg/close-eye-svg';
import CrossSVG from '../../assets/svg/CrossSVG';

const DrawerContent = (props) => {
  const { navigation } = props;

  const menuItems = [
    { id: '1', title: 'Dashboard', icon: 'view-dashboard', screen: 'Dashboard', badge: null },
    { id: '2', title: 'Members', icon: 'account-group', screen: 'Members', badge: '101 Members' },
    { id: '3', title: 'Attendance', icon: 'calendar-check', screen: 'Attendance', badge: null },
    { id: '4', title: 'Fees Registration', icon: 'cash-register', screen: 'FeesRegistration', badge: null },
    { id: '5', title: 'Enquiry', icon: 'help-circle', screen: 'Enquiry', badge: null },
    { id: '6', title: 'Member Balance', icon: 'wallet', screen: 'MemberBalance', badge: null },
    { id: '7', title: 'Plans', icon: 'clipboard-list', screen: 'Plans', badge: null },
    { id: '8', title: 'Manage Packages', icon: 'package-variant', screen: 'ManagePackages', badge: null },
    { id: '9', title: 'SMS', icon: 'message-text', screen: 'SMS', badge: null },
    { id: '10', title: 'Staff Management', icon: 'account-tie', screen: 'StaffManagement', badge: null },
  ];

  const hrSection = [
    { id: '11', title: 'Users / Staff', icon: 'account-multiple', screen: 'UsersStaff' },
    { id: '12', title: 'Work Schedule', icon: 'calendar-clock', screen: 'WorkSchedule' },
    { id: '13', title: 'Departments', icon: 'office-building', screen: 'Departments' },
    { id: '14', title: 'Staff Timing', icon: 'clock-outline', screen: 'StaffTiming' },
  ];

  const fitnessSection = [
    { id: '15', title: 'Fitness', icon: 'dumbbell', screen: 'Fitness' },
    { id: '16', title: 'Fitness Plans', icon: 'clipboard-text', screen: 'FitnessPlans' },
    { id: '17', title: 'Classes/Batches', icon: 'google-classroom', screen: 'Classes' },
    { id: '18', title: 'Trainer Management', icon: 'account-star', screen: 'TrainerManagement' },
    { id: '19', title: 'Progress Tracking', icon: 'chart-line', screen: 'ProgressTracking' },
  ];

  const financeSection = [
    { id: '20', title: 'Finance', icon: 'finance', screen: 'Finance' },
    { id: '21', title: 'Transactions', icon: 'swap-horizontal', screen: 'Transactions' },
    { id: '22', title: 'Expenses', icon: 'cash-minus', screen: 'Expenses' },
    { id: '23', title: 'Approvals', icon: 'check-circle', screen: 'Approvals' },
    { id: '24', title: 'Bank Accounts', icon: 'bank', screen: 'BankAccounts' },
  ];

  const hrManagementSection = [
    { id: '25', title: 'HR Management', icon: 'briefcase-account', screen: 'HRManagement' },
    { id: '26', title: 'Leave Applications', icon: 'calendar-remove', screen: 'LeaveApplications' },
    { id: '27', title: 'Loan Management', icon: 'cash-refund', screen: 'LoanManagement' },
    { id: '28', title: 'Salary Management', icon: 'cash-multiple', screen: 'SalaryManagement' },
    { id: '29', title: 'Promotions', icon: 'trending-up', screen: 'Promotions' },
  ];

  const cafeSection = [
    { id: '30', title: 'Cafe Operations', icon: 'coffee', screen: 'CafeOperations' },
    { id: '31', title: 'Orders', icon: 'food', screen: 'Orders' },
    { id: '32', title: 'Inventory', icon: 'archive', screen: 'Inventory' },
    { id: '33', title: 'Cafe Accounts', icon: 'calculator', screen: 'CafeAccounts' },
    { id: '34', title: 'Daily Reports', icon: 'file-document', screen: 'DailyReports' },
  ];

  const settingsSection = [
    { id: '35', title: 'Settings', icon: 'cog', screen: 'Settings' },
    { id: '36', title: 'Branches', icon: 'source-branch', screen: 'Branches' },
    { id: '37', title: 'App Settings', icon: 'application-cog', screen: 'AppSettings' },
    { id: '38', title: 'User Management', icon: 'account-cog', screen: 'UserManagement' },
    { id: '39', title: 'Roles', icon: 'shield-account', screen: 'Roles' },
    { id: '40', title: 'Notifications', icon: 'bell', screen: 'Notifications' },
  ];

  const renderMenuItem = (item, isDanger = false) => (
    <TouchableOpacity
      key={item.id}
      style={styles.menuItem}
      onPress={() => navigation.navigate(item.screen)}
    >
      <View style={styles.menuItemLeft}>
        <Icon
          name={item.icon}
          size={20}
          color={isDanger ? '#E63946' : '#666'}
          style={styles.menuIcon}
        />
        <Text style={[styles.menuText, isDanger && styles.menuTextDanger]}>
          {item.title}
        </Text>
      </View>
      {item.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSection = (title, items, icon = null) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon && <Icon name={icon} size={18} color="#E63946" style={styles.sectionIcon} />}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {items.map((item) => renderMenuItem(item))}
    </View>
  );

  return (
    <DrawerContentScrollView {...props} style={styles.container}>
      {/* User Profile Header */}
      
      <ProfileHeader
        name="Ahmed"
        role="Super Admin"
        branch="Dha Phase 6 Branch"
        avatar={require('../../assets/img/userIcon.png')}
        editIcon={Edit_fill}
        onEditPress={() => console.log('Edit Pressed')}
      />

      {/* Main Menu Items */}
      <View style={styles.menuSection}>
        {menuItems.map((item) => renderMenuItem(item))}
      </View>

      {/* HR Section */}
      {renderSection('HR', hrSection, 'briefcase')}

      {/* Fitness Section */}
      {renderSection('Fitness', fitnessSection, 'dumbbell')}

      {/* Finance Section */}
      {renderSection('Finance', financeSection, 'finance')}

      {/* HR Management Section */}
      {renderSection('HR Management', hrManagementSection, 'briefcase-account')}

      {/* Cafe Section */}
      {renderSection('Cafe Operations', cafeSection, 'coffee')}

      {/* Settings Section */}
      {renderSection('Settings', settingsSection, 'cog')}

      {/* Logout */}
      <TouchableOpacity
        style={[styles.menuItem, styles.logoutItem]}
        onPress={() => {
          // Handle logout
          console.log('Logout pressed');
        }}
      >
        <View style={styles.menuItemLeft}>
          <Icon name="logout" size={20} color="#E63946" style={styles.menuIcon} />
          <Text style={styles.menuTextDanger}>Logout</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
 container: {
  flex: 1,
  backgroundColor: '#FFFFFF',
  position: 'relative',
},

  header: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 20,
  },
closeButton: {
  position: 'absolute',
  top: 10,
  right: 10,
  zIndex: 999,
},
  profileSection: {
    alignItems: 'center',
    paddingTop: 10,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
  },
  menuSection: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  menuTextDanger: {
    color: '#E63946',
  },
  badge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  section: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFF5F5',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E63946',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoutItem: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  bottomPadding: {
    height: 20,
  },
});

export default DrawerContent;


