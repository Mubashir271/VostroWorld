// src/screens/EmployeeDashboard/AttendanceScreen.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { getAttendanceList, getAttendanceSummary } from '../../api/employeeDashboard';
import AppHeader from '../../components/AppHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { useNavigation } from '@react-navigation/native';
import { showSnackbar } from '../../redux/slices/snackbarSlice';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceSummary {
    on_time: number;
    late: number;
    absent: number;
    leave: number;
}

interface AttendanceRecord {
    id: number;
    date: string;
    attendance_status: string;
    check_in?: string;
    check_out?: string;
    working_hours?: string;
    duty_hours?: string;
    remarks?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const displayDate = (iso: string): string => {
    const [y, m, d] = iso.split('-');
    return `${parseInt(m)}/${parseInt(d)}/${y}`;
};

const getDefaultStartDate = (): string => {
    const d = new Date();
    d.setDate(d.getDate() - 21);
    return formatDate(d);
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    Present: { bg: '#E6F4EA', text: '#2E7D32' },
    PRESENT: { bg: '#E6F4EA', text: '#2E7D32' },
    Late:    { bg: '#FFF3E0', text: '#E65100' },
    LATE:    { bg: '#FFF3E0', text: '#E65100' },
    Absent:  { bg: '#FFEBEE', text: '#C62828' },
    ABSENT:  { bg: '#FFEBEE', text: '#C62828' },
    Leave:   { bg: '#E3F2FD', text: '#1565C0' },
    LEAVE:   { bg: '#E3F2FD', text: '#1565C0' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SummaryCard = ({
    label,
    value,
    sub,
    highlight,
}: {
    label: string;
    value: string | number;
    sub?: string;
    highlight?: boolean;
}) => (
    <View style={[styles.summaryCard, highlight && styles.summaryCardHighlight]}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}>
            {value}
        </Text>
        {sub ? <Text style={styles.summarySub}>{sub}</Text> : null}
    </View>
);

const StatusBadge = ({ status }: { status: string }) => {
    const colors = STATUS_COLORS[status] ?? { bg: '#F5F5F5', text: '#666' };
    return (
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>
                {status.toUpperCase()}
            </Text>
        </View>
    );
};

const DateButton = ({
    label,
    value,
    onPress,
}: {
    label: string;
    value: string;
    onPress: () => void;
}) => (
    <TouchableOpacity style={styles.dateButton} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.dateButtonText}>{value || label}</Text>
    </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const AttendanceScreen = () => {
    const { profile } = useSelector((state: RootState) => state.user);
    const dispatch = useDispatch();

    const branchId = profile?.branchId || '';
    const userId   = profile?.id ?? 0;
    const navigation = useNavigation<any>();

    const [summary, setSummary]             = useState<AttendanceSummary | null>(null);
    const [records, setRecords]             = useState<AttendanceRecord[]>([]);
    const [startDate, setStartDate]         = useState(getDefaultStartDate());
    const [endDate, setEndDate]             = useState(formatDate(new Date()));
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [totalRecords, setTotalRecords]   = useState(0);
    const [pickerFor, setPickerFor]         = useState<'start' | 'end' | null>(null);

    const todayRecord = records.find(r => r.date === formatDate(new Date()));

    const handleDateConfirm = (date: Date) => {
        const iso = formatDate(date);
        if (pickerFor === 'start') setStartDate(iso);
        else if (pickerFor === 'end') setEndDate(iso);
        setPickerFor(null);
    };

    // ── Fetch summary ──────────────────────────────────────────────────────────
    const fetchSummary = useCallback(async () => {
        try {
            setLoadingSummary(true);
            const data = await getAttendanceSummary(branchId);
            setSummary(data);
        } catch (e: any) {
            console.warn('Attendance summary error:', e);
            dispatch(showSnackbar({
                message: e?.response?.data?.message ?? 'Could not load attendance summary.',
                type: 'error',
            }));
        } finally {
            setLoadingSummary(false);
        }
    }, [branchId, dispatch]);

    // ── Fetch records ──────────────────────────────────────────────────────────
    const fetchRecords = useCallback(async () => {
        if (!userId) return;
        try {
            setLoadingRecords(true);
            const data = await getAttendanceList({
                branch_id: branchId,
                member_id: userId,
                category: 2,
                start_date: startDate,
                end_date: endDate,
                limit: 50,
            });

            const rows: AttendanceRecord[] =
                data?.data?.data ?? data?.data ?? [];

            setRecords(rows);
            setTotalRecords(data?.total ?? data?.totalRecord ?? rows.length);

            if (rows.length === 0) {
                dispatch(showSnackbar({
                    message: 'No attendance records found for the selected range.',
                    type: 'error',
                }));
            } else {
                dispatch(showSnackbar({
                    message: `${rows.length} record${rows.length === 1 ? '' : 's'} loaded.`,
                    type: 'success',
                }));
            }
        } catch (e: any) {
            console.warn('Attendance list error:', e);
            dispatch(showSnackbar({
                message: e?.response?.data?.message ?? 'Could not load attendance.',
                type: 'error',
            }));
        } finally {
            setLoadingRecords(false);
        }
    }, [branchId, userId, startDate, endDate, dispatch]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    // ── Render record row ──────────────────────────────────────────────────────
    const renderRow = ({ item, index }: { item: AttendanceRecord; index: number }) => (
        <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowAlt]}>
            <Text style={[styles.cell, styles.cellDate]}>{displayDate(item.date)}</Text>
            <View style={styles.cellStatus}>
                <StatusBadge status={item.attendance_status} />
            </View>
            <Text style={[styles.cell, styles.cellDuty]} numberOfLines={1}>
                {item.duty_hours ?? 'N/A'}
            </Text>
            <Text style={[styles.cell, styles.cellTime]}>
                {item.check_in ?? 'N/A'}
            </Text>
            <Text style={[styles.cell, styles.cellTime]}>
                {item.check_out ?? 'N/A'}
            </Text>
            <Text style={[styles.cell, styles.cellTime]}>
                {item.working_hours ?? 'N/A'}
            </Text>
            <Text style={[styles.cell, styles.cellRemarks]} numberOfLines={1}>
                {item.remarks ?? 'N/A'}
            </Text>
        </View>
    );

    // ─── UI ───────────────────────────────────────────────────────────────────
    return (
        <>
            <AppHeader
                title="Attendance"
                leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
                rightIcon={<NotificationSVG width={24} height={24} />}
                onLeftPress={() => navigation.goBack()}
                onRightPress={() => navigation.navigate('Notifications')}
                backgroundColor="#FFE5E5"
            />
            <View style={styles.screen}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Page Title ── */}
                    <View style={styles.pageHeader}>
                        <Text style={styles.pageTitle}>Attendance</Text>
                        <Text style={styles.pageSubtitle}>Track your attendance records</Text>
                    </View>

                    {/* ── Summary Cards ── */}
                    {loadingSummary ? (
                        <ActivityIndicator style={{ marginVertical: 16 }} color="#E63946" />
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.summaryRow}
                        >
                            <SummaryCard
                                label="Attendance Records"
                                value={totalRecords}
                                sub="Within selected date range"
                            />
                            <SummaryCard
                                label="Present"
                                value={summary?.on_time ?? 0}
                                sub="Marked present"
                            />
                            <SummaryCard
                                label="Late"
                                value={summary?.late ?? 0}
                                sub="Late arrivals"
                            />
                            <SummaryCard
                                label="Absent"
                                value={summary?.absent ?? 0}
                                sub="Marked absent"
                            />
                            <SummaryCard
                                label="Today Status"
                                value={todayRecord ? todayRecord.attendance_status : 'N/A'}
                                sub={
                                    todayRecord?.check_in
                                        ? `Check in ${todayRecord.check_in}`
                                        : undefined
                                }
                                highlight
                            />
                        </ScrollView>
                    )}

                    {/* ── Filter Section ── */}
                    <View style={styles.filterSection}>
                        <View style={styles.filterChip}>
                            <Text style={styles.filterChipText}>ATTENDANCE</Text>
                        </View>
                        <Text style={styles.filterTitle}>Attendance History</Text>
                        <Text style={styles.filterSubtitle}>
                            Filter by start and end date to review your detailed attendance history.
                        </Text>

                        <View style={styles.dateRow}>
                            <DateButton
                                label="Start Date"
                                value={displayDate(startDate)}
                                onPress={() => setPickerFor('start')}
                            />
                            <DateButton
                                label="End Date"
                                value={displayDate(endDate)}
                                onPress={() => setPickerFor('end')}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.loadButton}
                            onPress={fetchRecords}
                            activeOpacity={0.85}
                        >
                            {loadingRecords ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={styles.loadButtonText}>Load Attendance</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* ── Table ── */}
                    {records.length > 0 ? (
                        <View style={styles.tableWrapper}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View>
                                    <View style={styles.tableHeader}>
                                        {['Date', 'Status', 'Duty Hours', 'Check In', 'Check Out', 'Working Hours', 'Remarks'].map(h => (
                                            <Text key={h} style={[styles.headerCell, getHeaderStyle(h)]}>
                                                {h}
                                            </Text>
                                        ))}
                                    </View>
                                    <FlatList
                                        data={records}
                                        renderItem={renderRow}
                                        keyExtractor={item => String(item.id ?? item.date)}
                                        scrollEnabled={false}
                                    />
                                </View>
                            </ScrollView>
                        </View>
                    ) : (
                        !loadingRecords && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>📋</Text>
                                <Text style={styles.emptyText}>
                                    No attendance records found.{'\n'}Select a date range and tap Load Attendance.
                                </Text>
                            </View>
                        )
                    )}

                    {loadingRecords && (
                        <ActivityIndicator style={{ marginTop: 24 }} color="#E63946" size="large" />
                    )}
                </ScrollView>
            </View>

            <DateTimePickerModal
                isVisible={pickerFor !== null}
                mode="date"
                date={new Date(pickerFor === 'start' ? startDate : endDate)}
                maximumDate={pickerFor === 'start' ? new Date(endDate) : new Date()}
                minimumDate={pickerFor === 'end' ? new Date(startDate) : undefined}
                onConfirm={handleDateConfirm}
                onCancel={() => setPickerFor(null)}
            />
        </>
    );
};

// ─── Column width helper ──────────────────────────────────────────────────────

const getHeaderStyle = (col: string) => {
    switch (col) {
        case 'Date':          return styles.cellDate;
        case 'Status':        return styles.cellStatus;
        case 'Duty Hours':    return styles.cellDuty;
        case 'Check In':
        case 'Check Out':
        case 'Working Hours': return styles.cellTime;
        case 'Remarks':       return styles.cellRemarks;
        default:              return {};
    }
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const PRIMARY   = '#E63946';
const BG        = '#F9F9FB';
const CARD_BG   = '#FFFFFF';
const BORDER    = '#EFEFEF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID  = '#555';
const TEXT_LITE = '#999';

const styles = StyleSheet.create({
    screen:        { flex: 1, backgroundColor: BG },
    scroll:        { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    pageHeader:   { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
    pageTitle:    { fontSize: 22, fontWeight: '700', color: TEXT_DARK },
    pageSubtitle: { fontSize: 13, color: TEXT_LITE, marginTop: 2 },

    summaryRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    summaryCard: {
        backgroundColor: CARD_BG,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 18,
        minWidth: 140,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    summaryCardHighlight: {
        backgroundColor: '#FFF5F5',
        borderWidth: 1,
        borderColor: '#FFCDD2',
    },
    summaryLabel:           { fontSize: 12, color: TEXT_LITE, marginBottom: 6, fontWeight: '500' },
    summaryValue:           { fontSize: 28, fontWeight: '700', color: TEXT_DARK },
    summaryValueHighlight:  { fontSize: 22, color: PRIMARY },
    summarySub:             { fontSize: 11, color: TEXT_LITE, marginTop: 4 },

    filterSection: {
        backgroundColor: CARD_BG,
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 14,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    filterChip:     { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10 },
    filterChipText: { fontSize: 11, fontWeight: '700', color: '#2E7D32', letterSpacing: 0.5 },
    filterTitle:    { fontSize: 17, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
    filterSubtitle: { fontSize: 13, color: TEXT_MID, marginBottom: 16, lineHeight: 18 },
    dateRow:        { flexDirection: 'row', gap: 12, marginBottom: 14 },
    dateButton:     { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 12, backgroundColor: '#FAFAFA' },
    dateButtonText: { fontSize: 14, color: TEXT_DARK },
    loadButton:     { backgroundColor: TEXT_DARK, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
    loadButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

    tableWrapper: {
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: CARD_BG,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    tableHeader:  { flexDirection: 'row', backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 12, paddingHorizontal: 8 },
    headerCell:   { fontSize: 12, fontWeight: '700', color: TEXT_MID, textTransform: 'uppercase', letterSpacing: 0.3 },
    tableRow:     { flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems: 'center' },
    tableRowAlt:  { backgroundColor: '#FAFAFA' },
    cell:         { fontSize: 13, color: TEXT_DARK },

    cellDate:    { width: 90 },
    cellStatus:  { width: 90 },
    cellDuty:    { width: 150 },
    cellTime:    { width: 100 },
    cellRemarks: { width: 80 },

    badge:     { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
    badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

    emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
    emptyIcon:  { fontSize: 40, marginBottom: 12 },
    emptyText:  { fontSize: 14, color: TEXT_MID, textAlign: 'center', lineHeight: 22 },
});

export default AttendanceScreen;