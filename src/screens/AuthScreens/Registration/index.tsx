import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

import { ProgressBar } from '../../../components/ProgressBar';
import { TextInputWithLabel } from '../../../components/TextInputWithLabel';
import { Selector } from '../../../components/Selector';
import { Email, Gender, PhoneNo, User } from '../../../assets/icons';
import { OrganizationBranchSelector } from '../../../components/OrganizationBranchSelector';
import { DatePickerInput } from '../../../components/DatePickerInput';
import { SelectionField } from '../../../components/SelectionField';
import { SelectionModal } from '../../../components/SelectionModal';
import { Step3Credentials } from './Step3Credentials';
import EmailVerification from './EmailVerification';
import AccountConfirmation from './AccountConfirmation';
import { useNavigation } from '@react-navigation/native';
import { updateRegistrationData } from '../../../redux/slices/userSlice';
import { useDispatch } from 'react-redux';



const TOTAL_STEPS = 5;

export const RegistrationScreen = () => {
    const navigation = useNavigation();
    const [step, setStep] = useState(1);

    //step 1
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [branch, setBranch] = useState('');
    const [dob, setDob] = useState<Date | undefined>(undefined);
    const options = ['Male', 'Female', 'Other', 'Prefer not to say'];

    //step 2
    const [role, setRole] = useState('');
    const [dept, setDept] = useState('');
    const [desg, setDesg] = useState('');
    const [mngr, setMngr] = useState('');
    const [exp, setExp] = useState('1 Year');
    const [employment, setEmployment] = useState('Full-time');
    const [joiningDate, setJoiningDate] = useState<Date | undefined>(undefined);
    const [lang, setLang] = useState('English');
    const [modalConfig, setModalConfig] = useState({ visible: false, type: '', title: '', options: [] });

    // Step 3 - Credentials
    const [password, setPassword] = useState('');

    // 2. Data Options
    const ROLE_OPTIONS = [
        { id: '1', label: 'Super Admin', subLabel: 'Full system access' },
        { id: '2', label: 'Branch Admin', subLabel: 'Manage and single gym branch' },
        { id: '3', label: 'Sales Manager', subLabel: 'Leads, memberships & sales' },
        { id: '4', label: 'Accountant', subLabel: 'Finance & billing' },
        { id: '5', label: 'Cafe Manager', subLabel: 'Cafe inventory & sales' },
        { id: '6', label: 'Fitness Manager', subLabel: 'Trainers and Fitness plans' },
        { id: '7', label: 'Trainer', subLabel: 'Manage assigned members' },
        { id: '8', label: 'Nutrition Specialist', subLabel: 'Diet & Nutrition plans' },
    ];

    const DEPT_OPTIONS = [
        { id: '1', label: 'Management' },
        { id: '2', label: 'Sales' },
        { id: '3', label: 'Finance' },
        { id: '4', label: 'Fitness' },
        { id: '5', label: 'HR' },
        { id: '6', label: 'Cafe' },
        { id: '7', label: 'Support' },
        { id: '8', label: 'Dependent on Selected Role' },
    ];

    const EXP_OPTIONS = [
        { id: '1', label: '0-1 years' },
        { id: '2', label: '2-3 years' },
        { id: '3', label: '4-6 years' },
        { id: '4', label: '7-10 years' },
        { id: '5', label: '10+ years' },
    ];

    const DESG_OPTIONS = [
        { id: '1', label: 'Gym Manager' },
        { id: '2', label: 'Head Trainer' },
        { id: '3', label: 'Senior Trainer' },
        { id: '4', label: 'Junior Trainer' },
        { id: '5', label: 'Sales Executive' },
        { id: '6', label: 'Account Officer' },
    ];
    const MNGR_OPTIONS = [
        { id: '1', label: 'John Smith' },
        { id: '2', label: 'Sarah Khan' },
        { id: '3', label: 'Ali Raza' },
        { id: '4', label: 'Fatima Noor' },
    ];

      const dispatch = useDispatch();


  const handleNext = () => {
    if (step === 1) {
      dispatch(updateRegistrationData({
        firstName, lastName, email, phone, gender, branch,
        dob: dob ? dob.toISOString() : null,  // serialize Date for Redux
      }));
    }

    if (step === 2) {
      dispatch(updateRegistrationData({
        role, dept, desg, mngr, exp, employment, lang,
        joiningDate: joiningDate ? joiningDate.toISOString() : null,
      }));
    }

    if (step === 3) {
      dispatch(updateRegistrationData({
        password,
      }));
    }

    if (step < TOTAL_STEPS) setStep(step + 1);
    else navigation.navigate('Drawer' as never);
  };

    const handlePrevious = () => {
        if (step > 1) setStep(step - 1);
    };


    const handleCancel = () => {
        console.log('Cancel registration');
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.stepText}>Step {step}/{TOTAL_STEPS}</Text>
            <ProgressBar step={step} totalSteps={TOTAL_STEPS} />


            {/* Step 1 */}
            {step === 1 && (
                <>
                    <Text style={styles.title}>Create Your Account</Text>
                    <Text style={styles.subtitle}>Tell us about yourself</Text>
                    <TextInputWithLabel
                        label="First Name *"
                        icon={User}
                        placeholder="First name"
                        value={firstName}
                        onChangeText={setFirstName}
                        error={!firstName ? 'Please enter your first name' : ''}
                    />
                    <TextInputWithLabel
                        label="Last Name *"
                        icon={User}
                        placeholder="Last name"
                        value={lastName}
                        onChangeText={setLastName}
                        error={!lastName ? 'Please enter your last name' : ''}
                    />
                    <TextInputWithLabel
                        label="Email *"
                        icon={Email}
                        placeholder="your.email@example.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        error={!email ? 'Please enter a valid email address' : ''}
                    />
                    <TextInputWithLabel
                        label="Phone Number *"
                        icon={PhoneNo}
                        placeholder="+92 300-0000000"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        error={!phone ? 'Please enter a valid phone number' : ''}
                    />
                    <Selector label='Gender *' selected={gender} onSelect={setGender} options={options} icon={Gender} />
                    {/* <TextInputWithLabel
            label="Organization/Branch Name *"
            placeholder="Select your gym branch"
            value={branch}
            onChangeText={setBranch}
            error={!branch ? 'Please select or add branch' : ''}
          />
          <TextInputWithLabel
            label="Date of Birth *"
            placeholder="You must be at least 18 years old"
            value={dob}
            onChangeText={setDob}
            error={!dob ? 'Please enter valid date of birth' : ''}
          /> */}
                    <OrganizationBranchSelector
                        value={branch}
                        onSelect={setBranch}
                        error={!branch ? 'Please select or add branch' : ''}
                        onAddNew={() => console.log('Add new branch')}
                    />

                    <DatePickerInput
                        label="Date of Birth *"
                        placeholder='You must be atleast 18 years old'
                        value={dob}
                        onChange={setDob}
                        maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))} // 18+ only
                        error={!dob ? 'Please enter valid date of birth' : ''}
                    />
                </>
            )}

            {/* Add more steps as needed */}
            // 3. Render Logic for Step 2
            {step === 2 && (
                <View>
                    <Text style={styles.title}>Work Information</Text>
                    <Text style={styles.subtitle}>Help us understand your role</Text>
                    <SelectionField
                        label="Role / Position"
                        value={role}
                        placeholder="Select your role"
                        onPress={() => setModalConfig({ visible: true, title: 'Select Role/ Position', options: ROLE_OPTIONS, type: 'role' })}
                        error={!role}
                    />

                    <SelectionField
                        label="Department"
                        value={dept}
                        placeholder="Select Department"
                        onPress={() => setModalConfig({ visible: true, title: 'Select Department', options: DEPT_OPTIONS, type: 'dept' })}
                    />

                    <SelectionField
                        label="Designation/Job Title"
                        value={desg}
                        placeholder="e.g., Gym Manager, Head Trainer"
                        onPress={() => setModalConfig({ visible: true, title: 'Select Designation/Job Title', options: DESG_OPTIONS, type: 'desg' })}
                    />

                    <SelectionField
                        label="Years of Experience"
                        value={exp}
                        onPress={() => setModalConfig({ visible: true, title: 'Years of Experience', options: EXP_OPTIONS, type: 'exp' })}
                    />

                    <SelectionField
                        label="Reporting Manager"
                        value={mngr}
                        placeholder="Search manager by name"
                        onPress={() => setModalConfig({ visible: true, title: 'Select Reporting Manager', options: MNGR_OPTIONS, type: 'mngr' })}
                    />

                    {/* Employment Status Radios */}
                    <Selector label='Employment Status' selected={employment} onSelect={setEmployment} options={['Full-time', 'Part-time', 'Freelance/Contract']} />

                    <DatePickerInput
                        label="Joining Date"
                        placeholder='Select Joining Date'
                        value={joiningDate}
                        onChange={setJoiningDate}
                        minimumDate={new Date('2020-01-01')} // earliest allowed joining date
                        maximumDate={new Date()} // cannot select future dates
                        error={!joiningDate ? 'Select joining date' : ''}
                    />

                    <SelectionField
                        label="Preferred Language"
                        value={lang}
                        onPress={() => setModalConfig({ visible: true, title: 'Select Language', options: [{ id: '1', label: 'English' }, { id: '2', label: 'Urdu' }, { id: '3', label: 'Other' }], type: 'lang' })}
                    />

                    <SelectionModal
                        visible={modalConfig.visible}
                        title={modalConfig.title}
                        options={modalConfig.options}
                        selectedValue={
                            modalConfig.type === 'role'
                                ? role
                                : modalConfig.type === 'dept'
                                    ? dept
                                    : modalConfig.type === 'exp'
                                        ? exp
                                        : modalConfig.type === 'desg'
                                            ? desg
                                            : modalConfig.type === 'mngr'
                                                ? mngr
                                                : lang
                        }
                        onSelect={(val: string) => {
                            if (modalConfig.type === 'role') setRole(val);
                            if (modalConfig.type === 'dept') setDept(val);
                            if (modalConfig.type === 'exp') setExp(val);
                            if (modalConfig.type === 'desg') setDesg(val);
                            if (modalConfig.type === 'mngr') setMngr(val);
                            if (modalConfig.type === 'lang') setLang(val);

                            setModalConfig({ ...modalConfig, visible: false });
                        }}
                        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
                    />
                </View>
            )}

            {step === 3 && <Step3Credentials password={password} onPasswordChange={setPassword} />}

            {step === 4 && <EmailVerification email={email} />}

            {step === 5 && <AccountConfirmation firstName={firstName} lastName={lastName} email={email} phone={phone} role={role} branch={branch} />}


            <View style={styles.buttonContainer}>
                {step === 1 ? (
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.cancelButton} onPress={handlePrevious}>
                        <Text style={styles.cancelText}>Previous</Text>
                    </TouchableOpacity>
                )}

                {step === 4 ? (
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                        <Text style={styles.nextText}>Verify & Continue</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                        <Text style={styles.nextText}>{step === TOTAL_STEPS ? 'Complete Registration' : 'Next'}</Text>
                    </TouchableOpacity>
                )}


            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16, backgroundColor: '#F5F5F5', flexGrow: 1 },
    stepText: { fontSize: 12, marginBottom: 8 },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
    subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16, textAlign: 'center' },
    buttonContainer: { flexDirection: 'row', marginTop: 24 },
    cancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        marginRight: 2,
    },
    cancelText: { color: '#969696', fontWeight: '600' },
    nextButton: {
        flex: 1,
        backgroundColor: '#FF0000',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        marginLeft: 2,
    },
    nextText: { color: '#FFF', fontWeight: '600' },
    fieldContainer: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151' },
    radioRow: { flexDirection: 'row', alignItems: 'center' },
    radioCircle: { width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#E5E7EB', marginRight: 6 },
    radioActive: { backgroundColor: '#D1D5DB' },
    radioText: { fontSize: 12, color: '#374151' }
});
