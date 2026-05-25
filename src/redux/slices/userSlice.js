import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Full user profile matching the API response
interface UserProfile {
    id: number;
    oldId: number;
    branchId: number;
    departmentId: number;
    designationId: number;
    packagesTypeId: number | null;
    uid: string;
    zkid: number;
    firstName: string;
    lastName: string;
    username: string;
    image: string;
    email: string;
    phone: string;
    emergencyContactNo: string;
    bloodGroup: string;
    cnic: string;
    gender: string;
    address: string;
    city: string;
    country: string;
    management: string;
    role: string;
    roleStatus: string;
    salary: number;
    monthlyMedical: number;
    commission: number;
    joining: string;
    type: string;
    isGxTrainer: number;
    accessLevel: string;
    resignDate: string | null;
    fatherName: string;
    dob: string;
    appointmentDate: string;
    probationDuration: number;
    confirmationDate: string | null;
    employmentStatus: string;
    employmentEndDate: string;
    startTime: string;
    endTime: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    branchName: string | null;
}

interface UserState {
    token: string | null;
    appImage: string | null;
    autoBackup: boolean;
    biometricEnabled: boolean;
    profile: UserProfile | null;
    registrationData: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        gender: string;
        branch: string;
        dob: string | null;
        role: string;
        dept: string;
        desg: string;
        mngr: string;
        exp: string;
        employment: string;
        joiningDate: string | null;
        lang: string;
        password: string;
    };
}

const initialState: UserState = {
    token: null,
    appImage: null,
    autoBackup: true,
    biometricEnabled: false,
    profile: null,
    registrationData: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: '',
        branch: '',
        dob: null,
        role: '',
        dept: '',
        desg: '',
        mngr: '',
        exp: '1 Year',
        employment: 'Full-time',
        joiningDate: null,
        lang: 'English',
        password: '',
    },
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        // Stores the full API response (token + complete user object)
        setUser: (state, action: PayloadAction<{
            token: string;
            user: any; // raw user object from API
        }>) => {
            const u = action.payload.user;
            state.token = action.payload.token;
            state.profile = {
                id: u.id,
                oldId: u.old_id,
                branchId: Number(u.branch_id),
                departmentId: u.department_id,
                designationId: u.designation_id,
                packagesTypeId: u.packages_type_id,
                uid: u.uid,
                zkid: u.zkid,
                firstName: u.first_name,
                lastName: u.last_name,
                username: u.username,
                image: u.image,
                email: u.email,
                phone: u.phone,
                emergencyContactNo: u.emergency_contact_no,
                bloodGroup: u.blood_group,
                cnic: u.cnic,
                gender: u.gender,
                address: u.address,
                city: u.city,
                country: u.country,
                management: u.management,
                role: u.role,
                roleStatus: u.role_status,
                salary: u.salary,
                monthlyMedical: u.monthly_medical,
                commission: u.commission,
                joining: u.joining,
                type: u.type,
                isGxTrainer: u.is_gx_trainer,
                accessLevel: u.access_level,
                resignDate: u.resign_date,
                fatherName: u.father_name,
                dob: u.dob,
                appointmentDate: u.appointment_date,
                probationDuration: u.probation_duration,
                confirmationDate: u.confirmation_date,
                employmentStatus: u.employment_status,
                employmentEndDate: u.employment_end_date,
                startTime: u.start_time,
                endTime: u.end_time,
                status: u.status,
                createdAt: u.created_at,
                updatedAt: u.updated_at,
                branchName: u.branch_name ?? null,
            };
        },
        logoutUser: (state) => {
            state.token = null;
            state.profile = null;
            state.biometricEnabled = false;
        },
        setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
            state.biometricEnabled = action.payload;
        },
        updateRegistrationData: (state, action) => {
            state.registrationData = {
                ...state.registrationData,
                ...action.payload,
            };
        },
        clearRegistrationData: (state) => {
            state.registrationData = initialState.registrationData;
        },
        updateAppImage: (state, action: PayloadAction<string | null>) => {  // ← fix: was `string`
            state.appImage = action.payload;
        },
        clearAppImage: (state) => {
            state.appImage = null;
        },
        setAutoBackup: (state, action: PayloadAction<boolean>) => {         // ← added
            state.autoBackup = action.payload;
        },
        persistUser: (state, action) => {
            state.token = action.payload.token;
            state.profile = action.payload.profile || null;
        },
    },
});

export const {
    setUser,
    logoutUser,
    setBiometricEnabled,
    updateRegistrationData,
    clearRegistrationData,
    updateAppImage,
    clearAppImage,
    persistUser,
} = userSlice.actions;

export default userSlice.reducer;