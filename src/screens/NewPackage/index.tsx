import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Slider from '@react-native-community/slider';
import AppHeader from '../../components/AppHeader';

const NewPackage = () => {
  const navigation = useNavigation();

  const formatPrice = (price: string) => {
    return price.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const [form, setForm] = useState({
    packageName: '3 - Month Gym Gold',
    category: 'Gym',
    description: 'Access to gym facilities, group classes and saunas, with locker room access and private...',
    originalPrice: '15000',
    discount: '10',
    discountedPrice: '13500',
    tax: '0',
    durationValue: '3',
    durationUnit: 'Months',
    startDate: 'Apr 2025',
    maxMembers: '0',
    features: {
      gymAccess: true,
      personalTraining: true,
      nutritionProgram: true,
      groupClasses: true,
      poolAccess: true,
      sauna: true,
      lockerFacility: false,
      guestPrivileges: false,
    },
    availability: {
      active: true,
      branch1: true,
      branch2: true,
      allBranches: true,
    },
    allowFreezing: true,
    renewalReminder: true,
    renewalAmount: '18000',
  });

  const updateForm = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleFeature = (feature: string) => {
    setForm(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature as keyof typeof prev.features],
      },
    }));
  };

  const toggleAvailability = (branch: string) => {
    setForm(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [branch]: !prev.availability[branch as keyof typeof prev.availability],
      },
    }));
  };

  return (
    <>
      <AppHeader
        title="New Package"
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        rightText="Save"
        onLeftPress={() => navigation.goBack()}
        onRightTextPress={() => console.log('Save Package')}
        backgroundColor="#FFE5E5"
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Text style={styles.label}>Package Name *</Text>
            <TextInput
              style={styles.input}
              value={form.packageName}
              onChangeText={(v) => updateForm('packageName', v)}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Category Selection *</Text>
            <View style={styles.categoryRow}>
              {['Gym', 'PT', 'Nutrition', 'Boot Camp', 'Other'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryBtn,
                    form.category === cat && styles.categoryBtnActive
                  ]}
                  onPress={() => updateForm('category', cat)}
                >
                  <Text style={form.category === cat ? styles.categoryTextActive : styles.categoryText}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={3}
              value={form.description}
              onChangeText={(v) => updateForm('description', v)}
              placeholderTextColor="#999"
            />
            <Text style={styles.charCount}>{form.description.length}/200</Text>
          </View>

          {/* Package Image */}
          <View style={styles.section}>
            <Text style={styles.label}>Package Image</Text>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: 'https://via.placeholder.com/400x180?text=Gym+Equipment' }}
                style={styles.packageImage}
              />
              <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>

            <View style={styles.priceRow}>
              <View style={styles.priceCol}>
                <Text style={styles.label}>Original Price</Text>
                <TextInput 
                  style={styles.input} 
                  value={`PKR ${formatPrice(form.originalPrice)}`}
                  editable={false}
                />
              </View>
              <View style={styles.priceCol}>
                <Text style={styles.label}>Discount Percentage</Text>
                <View style={{flexDirection:'row'}}>
                  <Slider
                    style={styles.sliderCompact}
                    minimumValue={0}
                    maximumValue={100}
                    value={parseInt(form.discount)}
                    onValueChange={(v) => updateForm('discount', Math.round(v).toString())}
                    minimumTrackTintColor="#E10600"
                    maximumTrackTintColor="#D9D9D9"
                    thumbTintColor="#E10600"
                    step={1}
                  />
                <View style={styles.discountSliderBox}>
                  <Text style={styles.discountPercentBadge}>{form.discount}%</Text>
                </View>
                </View>
              </View>
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceCol}>
                <Text style={styles.label}>Discounted Price</Text>
                <TextInput 
                  style={styles.input} 
                  value={`PKR ${formatPrice(form.discountedPrice)}`}
                  editable={false}
                />
              </View>
              <View style={styles.priceCol}>
                <Text style={styles.label}>Tax Amount</Text>
                <TextInput 
                  style={styles.input} 
                  value={`PKR ${formatPrice(form.tax)}`}
                  editable={false}
                />
              </View>
            </View>

            <Text style={styles.finalPrice}>
              Final Price: PKR {formatPrice(form.discountedPrice)}
            </Text>
          </View>

          {/* Duration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Duration</Text>
            <View style={styles.durationRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Duration Value</Text>
                <TextInput 
                  style={styles.input} 
                  value={form.durationValue}
                  onChangeText={(v) => updateForm('durationValue', v)}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Duration Unit</Text>
                <View style={styles.durationUnitRow}>
                  {['Days', 'Weeks', 'Months', 'Years'].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[styles.unitBtn, form.durationUnit === unit && styles.unitBtnActive]}
                      onPress={() => updateForm('durationUnit', unit)}
                    >
                      <Text style={form.durationUnit === unit ? styles.unitTextActive : styles.unitText}>
                        {unit.substring(0, 1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.label}>Start Date</Text>
            <TextInput 
              style={styles.input} 
              value={form.startDate}
              onChangeText={(v) => updateForm('startDate', v)}
            />

            <Text style={styles.label}>Specific Duration Display:</Text>
            <Text style={styles.durationDisplay}>{form.durationValue} {form.durationUnit}</Text>
          </View>

          {/* Features & Inclusions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features & Inclusions:</Text>
            {Object.entries(form.features).map(([key, value]) => (
              <TouchableOpacity 
                key={key}
                style={styles.featureRow}
                onPress={() => toggleFeature(key)}
              >
                <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                  {value && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.featureLabel}>
                  {key.replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase())
                    .trim()}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addFeatureBtn}>
              <Text style={styles.addFeatureText}>+ Add Custom Feature</Text>
            </TouchableOpacity>
          </View>

          {/* Availability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability:</Text>
            
            <View style={styles.availabilityRow}>
              <TouchableOpacity 
                style={styles.featureRow}
                onPress={() => toggleAvailability('active')}
              >
                <View style={[styles.checkbox, form.availability.active && styles.checkboxChecked]}>
                  {form.availability.active && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.featureLabel}>Active</Text>
              </TouchableOpacity>
              <Switch
                value={form.availability.active}
                onValueChange={() => toggleAvailability('active')}
                trackColor={{ false: '#ccc', true: '#E10600' }}
                thumbColor={form.availability.active ? '#E10600' : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity 
              style={styles.featureRow}
              onPress={() => toggleAvailability('branch1')}
            >
              <View style={[styles.checkbox, form.availability.branch1 && styles.checkboxChecked]}>
                {form.availability.branch1 && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.featureLabel}>Branch 1</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureRow}
              onPress={() => toggleAvailability('branch2')}
            >
              <View style={[styles.checkbox, form.availability.branch2 && styles.checkboxChecked]}>
                {form.availability.branch2 && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.featureLabel}>Branch 2</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureRow}
              onPress={() => toggleAvailability('allBranches')}
            >
              <View style={[styles.checkbox, form.availability.allBranches && styles.checkboxChecked]}>
                {form.availability.allBranches && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.featureLabel}>All Branches</Text>
            </TouchableOpacity>

            <Text style={styles.maxMembersLabel}>Max members limit: 0</Text>
          </View>

          {/* Additional Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Settings:</Text>

            <View style={styles.availabilityRow}>
              <View>
                <TouchableOpacity 
                  style={styles.featureRow}
                  onPress={() => setForm(prev => ({ ...prev, allowFreezing: !prev.allowFreezing }))}
                >
                  <View style={[styles.checkbox, form.allowFreezing && styles.checkboxChecked]}>
                    {form.allowFreezing && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.featureLabel}>Allow Freezing</Text>
                </TouchableOpacity>
                <Text style={styles.settingNote}>Freeze your membership once per year</Text>
              </View>
              <Switch
                value={form.allowFreezing}
                onValueChange={() => setForm(prev => ({ ...prev, allowFreezing: !prev.allowFreezing }))}
                trackColor={{ false: '#ccc', true: '#E10600' }}
                thumbColor={form.allowFreezing ? '#E10600' : '#f4f3f4'}
              />
            </View>

            <View style={styles.availabilityRow}>
              <View>
                <TouchableOpacity 
                  style={styles.featureRow}
                  onPress={() => setForm(prev => ({ ...prev, renewalReminder: !prev.renewalReminder }))}
                >
                  <View style={[styles.checkbox, form.renewalReminder && styles.checkboxChecked]}>
                    {form.renewalReminder && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.featureLabel}>Renewal Reminder</Text>
                </TouchableOpacity>
                <Text style={styles.settingNote}>7 days before expiry to notify</Text>
              </View>
              <Text style={styles.renewalAmount}>PKR {form.renewalAmount}</Text>
            </View>
          </View>

          {/* Bottom Buttons */}
          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.savePackageBtn}>
              <Text style={styles.savePackageText}>Save Package</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </>
  );
};

export default NewPackage;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100, paddingTop: 0 },

  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    backgroundColor: '#FFE5E5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#D9D9D9',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#999', marginBottom: 12, textAlign: 'right', marginTop: -8 },

  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  categoryBtnActive: {
    backgroundColor: '#E10600',
  },
  categoryText: { color: '#666', fontSize: 13 },
  categoryTextActive: { color: '#fff', fontWeight: '600', fontSize: 13 },

  imageContainer: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 8,
  },
  packageImage: {
    width: '100%',
    height: '100%',
  },
  editButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#E10600',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  priceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  priceCol: { flex: 1 },

  sliderContainer: {
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 8,
  },
  discountSliderBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderCompact: {
    flex: 1,
    height: 50,
  },
  discountPercentBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
  discountDisplayRow: {
    alignItems: 'flex-end',
  },
  discountPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountInput: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  percentSymbol: { marginLeft: 8, fontSize: 16, color: '#666' },
  percent: { marginLeft: 8, fontSize: 16, color: '#666' },

  finalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E10600',
    marginTop: 8,
  },

  durationRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  durationDisplay: { fontSize: 14, color: '#333', marginTop: 4, marginBottom: 12 },

  durationUnitRow: {
    flexDirection: 'row',
    gap: 6,
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    flex: 1,
    alignItems: 'center',
  },
  unitBtnActive: {
    backgroundColor: '#E10600',
  },
  unitText: { color: '#666', fontSize: 12 },
  unitTextActive: { color: '#fff', fontWeight: '600', fontSize: 12 },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#E10600',
    borderColor: '#E10600',
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  featureLabel: { fontSize: 14, color: '#333', fontWeight: '500' },

  addFeatureBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  addFeatureText: { color: '#666', fontSize: 13, fontWeight: '600' },

  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  maxMembersLabel: { fontSize: 12, color: '#999', marginTop: 8 },

  settingNote: { fontSize: 12, color: '#999', marginLeft: 32, marginTop: 2 },
  renewalAmount: { fontSize: 14, color: '#E10600', fontWeight: '600' },

  bottomButtons: {
    padding: 16,
    paddingBottom: 30,
  },
  savePackageBtn: {
    backgroundColor: '#E10600',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  savePackageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E10600',
    borderRadius: 12,
  },
  cancelText: {
    color: '#E10600',
    fontSize: 16,
    fontWeight: '600',
  },
});