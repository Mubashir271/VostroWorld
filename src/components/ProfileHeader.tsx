// components/ProfileHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ImageSourcePropType } from 'react-native';

interface ProfileHeaderProps {
  name: string;
  role: string;
  branch: string;
  avatar?: string | ImageSourcePropType; // support URI string OR local image
  editIcon: ImageSourcePropType;
  onEditPress?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  name,
  role,
  branch,
  avatar,
  editIcon,
  onEditPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Avatar */}
<View style={styles.avatarContainer}>
  {avatar ? (
    typeof avatar === 'string' ? (
      <Image source={{ uri: avatar }} style={styles.avatar} />
    ) : (
      <Image source={avatar} style={styles.avatar} />
    )
  ) : (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.avatarText}>{name.charAt(0)}</Text>
    </View>
  )}
</View>


      {/* Texts */}
      <View style={styles.textContainer}>
        <View style={styles.roleContainer}>
          <Text style={styles.roleText}>{role}</Text>
          <Text style={styles.branchText}>{branch}</Text>
        </View>
      </View>

      {/* Edit Button */}
      <TouchableOpacity onPress={onEditPress} style={styles.editContainer}>
        <Image source={editIcon} style={styles.editIcon} />
      </TouchableOpacity>
    </View>
  );
};

export default ProfileHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18

  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0284c7',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  roleContainer: {
    // flexDirection: 'row',
    // alignItems: 'center',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  branchText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 2,
  },
  editContainer: {
    marginLeft: 12,
  },
  editIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});
