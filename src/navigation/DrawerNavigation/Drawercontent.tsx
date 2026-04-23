import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Edit_fill, User } from '../../assets/icons';
import ProfileHeader from '../../components/ProfileHeader';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { logoutUser } from '../../redux/slices/userSlice';

const DrawerContent = (props: any) => {
  const { navigation } = props;
  const dispatch = useDispatch();
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [active, setActive] = React.useState('Dashboard');
  const appImage = useSelector((state: RootState) => state.user.appImage);

  // Use app image if available, otherwise use default avatar
  const avatarSource = appImage
    ? { uri: appImage }
    : require('../../assets/img/userIcon.png');

  const { firstName, lastName, role, branch } = useSelector(
    (state: RootState) => state.user.registrationData
  );

  const profileName = `${firstName} ${lastName}`.trim() || 'Ahmed';

  const handleLogout = () => {
    dispatch(logoutUser());
    navigation.replace('WelcomeAdmin');
  };

  const toggleExpand = (title: string) => {
    setExpanded(prev => (prev === title ? null : title));
  };
  const MENU = [
    {
      title: 'Dashboard',
      icon: 'view-dashboard',
      screen: 'Dashboard',
    },
    {
      title: 'Members',
      icon: 'account-group',
      children: [
        { title: 'All Members', screen: 'AllMembers' },
        { title: 'New Registration', screen: 'NewRegistration' },
        { title: 'Member Search', screen: 'MemberSearch' },
        { title: 'Member Balance', screen: 'MemberBalance' },
      ],
    },
    {
      title: 'Packages',
      icon: 'package-variant',
      children: [
        { title: 'Manage Packages', screen: 'ManagePackages' },
        { title: 'Pricing', screen: 'Pricing' },
      ],
    },
    {
      title: 'Staff Management',
      icon: 'account-tie',
      children: [
        { title: 'Users / Staff', screen: 'UsersStaff' },
        { title: 'Roles and Permissions', screen: 'RolesPermissions' },
        { title: 'Departments', screen: 'Departments' },
        { title: 'Schedule / Timing', screen: 'StaffTiming' },
      ],
    },
    {
      title: 'Fitness',
      icon: 'dumbbell',
      children: [
        { title: 'Fitness Plans', screen: 'FitnessPlans' },
        { title: 'Classes/Sessions', screen: 'Classes' },
        { title: 'Trainer Management', screen: 'TrainerManagement' },
        { title: 'Progress Tracking', screen: 'ProgressTracking' },
      ],
    },
    {
      title: 'Finance',
      icon: 'finance',
      children: [
        { title: 'Transactions', screen: 'Transactions' },
        { title: 'Reports', screen: 'Reports' },
        { title: 'Expenses', screen: 'Expenses' },
        { title: 'Approvals', screen: 'Approvals' },
        { title: 'Bank Accounts', screen: 'BankAccounts' },
      ],
    },
    {
      title: 'HR Management',
      icon: 'briefcase-account',
      children: [
        { title: 'Leave Applications', screen: 'LeaveApplications' },
        { title: 'Loan Management', screen: 'LoanManagement' },
        { title: 'Salary Management', screen: 'SalaryManagement' },
        { title: 'Promotions', screen: 'Promotions' },
      ],
    },
    {
      title: 'Cafe Operations',
      icon: 'coffee',
      children: [
        { title: 'Orders', screen: 'Orders' },
        { title: 'Inventory', screen: 'Inventory' },
        { title: 'Cafe Accounts', screen: 'CafeAccounts' },
        { title: 'Cafe Reports', screen: 'DailyReports' },
      ],
    },
    {
      title: 'Settings',
      icon: 'cog',
      children: [
        { title: 'Branches', screen: 'Branches' },
        { title: 'App Settings', screen: 'AppSettings' },
        { title: 'User Management', screen: 'UserManagement' },
        { title: 'Roles', screen: 'Roles' },
        { title: 'Notifications', screen: 'Notifications' },
      ],
    },
  ];






  const renderChild = (child: any) => {
    const isActive = active === child.title;

    return (
      <TouchableOpacity
        key={child.title}
        style={[
          styles.subMenuItem,
          isActive && styles.activeSubItem
        ]}
        onPress={() => {
          setActive(child.title);

          // Navigate to appropriate bottom tab screens or specific screens
          if (child.screen === 'AllMembers' || child.screen === 'NewRegistration' ||
            child.screen === 'MemberSearch' || child.screen === 'MemberBalance') {
            navigation.navigate('Main', { screen: 'Members' });
          } else if (child.screen === 'ManagePackages' || child.screen === 'Pricing') {
            navigation.navigate('Main', { screen: 'Package' });
          } else if (child.screen === 'LeaveApplications') {
            navigation.navigate('LeaveApplications');
          } else {
            navigation.navigate(child.screen);
          }

          // Close drawer after navigation
          if (navigation.closeDrawer) {
            setTimeout(() => navigation.closeDrawer(), 100);
          }
        }}
      >
        <Text
          style={[
            styles.subMenuText,
            isActive && styles.activeSubText
          ]}
        >
          {child.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderParent = (item: any) => {
    const isOpen = expanded === item.title;
    const isActive = active === item.title;

    return (
      <View key={item.title}>
        <TouchableOpacity
          style={[
            styles.menuItem,
            isActive && styles.activeItem,
            isOpen && styles.openItem, // 👈 NEW
          ]}
          onPress={() => {
            if (item.children) {
              toggleExpand(item.title);
            } else {
              setActive(item.title);

              // Navigate to appropriate bottom tab screens
              if (item.screen === 'Dashboard') {
                navigation.navigate('Main', { screen: 'Home' });
              } else if (item.screen === 'Members') {
                navigation.navigate('Main', { screen: 'Members' });
              } else if (item.screen === 'Package') {
                navigation.navigate('Main', { screen: 'Package' });
              } else if (item.screen === 'Reports') {
                navigation.navigate('Main', { screen: 'Reports' });
              } else if (item.screen === 'Account') {
                navigation.navigate('Main', { screen: 'Account' });
              } else {
                navigation.navigate(item.screen);
              }

              // Close drawer after navigation
              if (navigation.closeDrawer) {
                setTimeout(() => navigation.closeDrawer(), 100);
              }
            }
          }}
        >
          <View style={styles.menuItemLeft}>
            <Icon
              name={item.icon}
              size={20}
              color={isActive ? '#FFF' : '#666'}
            />

            <Text
              style={[
                styles.menuText,
                isActive && styles.activeText,
                isOpen && styles.openText, // 👈 NEW
              ]}
            >
              {item.title}
            </Text>
          </View>

          {item.children && (
            <Icon
              name={isOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={isActive ? '#FFF' : '#999'}
            />
          )}
        </TouchableOpacity>

        {/* CHILDREN */}
        {isOpen && (
          <View style={styles.subContainer}>
            {item.children.map((child: any) => {
              const isActive = active === child.title;

              return (
                <TouchableOpacity
                  key={child.title}
                  style={[
                    styles.subMenuItem,
                    isActive && styles.activeSubItem
                  ]}
                  onPress={() => {
                    setActive(child.title);

                    // Navigate to appropriate bottom tab screens or specific screens
                    if (child.screen === 'AllMembers' || child.screen === 'NewRegistration' ||
                      child.screen === 'MemberSearch' || child.screen === 'MemberBalance') {
                      navigation.navigate('Main', { screen: 'Members' });
                    } else if (child.screen === 'ManagePackages' || child.screen === 'Pricing') {
                      navigation.navigate('Main', { screen: 'Package' });
                    } else if (child.screen === 'LeaveApplications') {
                      navigation.navigate('LeaveApplications');
                    } else {
                      navigation.navigate(child.screen);
                    }

                    // Close drawer after navigation
                    if (navigation.closeDrawer) {
                      setTimeout(() => navigation.closeDrawer(), 100);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.subMenuText,
                      isActive && styles.activeSubText
                    ]}
                  >
                    {child.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <DrawerContentScrollView {...props} style={styles.container}>
      {/* User Profile Header */}

      <ProfileHeader
        name={profileName}
        role={role || 'Staff'}
        branch={branch || 'Main Branch'}
        avatar={avatarSource}
        editIcon={Edit_fill}
        onEditPress={() => navigation.navigate('Account')}
      />

      {/* Main Menu Items */}
      <View style={styles.menuSection}>
        {/* {menuItems.map((item) => renderMenuItem(item))} */}
        {MENU.map(renderParent)}

      </View>



      {/* Logout */}
      <TouchableOpacity
        style={[styles.menuItem, styles.logoutItem]}
        onPress={handleLogout}
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
  activeItem: {
    backgroundColor: '#E63946',
    borderRadius: 8,
    marginHorizontal: 10,
  },

  activeText: {
    color: '#FFF',
    fontWeight: '600',
  },

  // subMenuIm
  // subContainer: {
  //   marginLeft: 20,
  //   borderLeftWidth: 1,
  //   borderLeftColor: '#EEE',
  //   paddingLeft: 10,
  // },
  openItem: {
    backgroundColor: '#FFF5F5', // light red like screenshot
    borderRadius: 8,
    marginHorizontal: 10,
  },

  openText: {
    color: '#E63946',
    fontWeight: '600',
  },

  subContainer: {
    marginLeft: 25,
    borderLeftWidth: 1,
    borderLeftColor: '#F0F0F0',
    paddingLeft: 10,
  },

  subMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },

  activeSubItem: {
    backgroundColor: '#FFF5F5',
    borderRadius: 6,
  },

  subMenuText: {
    fontSize: 14,
    color: '#666',
  },

  activeSubText: {
    color: '#E63946',
    fontWeight: '600',
  },
});

export default DrawerContent;


