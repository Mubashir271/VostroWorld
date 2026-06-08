import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import AppHeader from '../../components/AppHeader';
import NotificationSVG from '../../assets/svg/NotificationSVG';
import { RootState } from '../../redux/store';
import api from '../../api/service';

const DOC_CATEGORIES = ['CNIC', 'CV', 'Experience Letter', 'Certificate', 'Degree', 'Other'];

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Approved: { bg: '#dcfce7', text: '#16a34a' },
  Pending:  { bg: '#fef9c3', text: '#a16207' },
  Rejected: { bg: '#fee2e2', text: '#dc2626' },
};

interface Doc {
  id: number;
  subject: string;
  document_category: string;
  document_type: string;
  issue_date: string;
  original_file_name?: string;
  approval_status: string;
}

export default function TrainerDocumentsScreen() {
  const navigation = useNavigation() as any;
  const { profile } = useSelector((state: RootState) => state.user);
  const branchId = profile?.branchId;
  const userId   = profile?.id;

  const [docs, setDocs]         = useState<Doc[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [catOpen, setCatOpen]   = useState(false);
  const [file, setFile]         = useState<any>(null);

  const [form, setForm] = useState({
    document_category: 'CNIC',
    subject: '', document_code: '',
    issue_date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/v1/hr/staff-documents/index', {
        params: { branch_id: branchId, user_id: userId, status: 1, limit: 100 },
      });
      setDocs(res?.data?.data ?? []);
    } catch (e) {
      console.log('Documents error:', e);
    } finally {
      setLoading(false);
    }
  }, [branchId, userId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const pickFile = () => {
    launchImageLibrary({ mediaType: 'mixed', quality: 0.8 }, response => {
      if (response.assets?.[0]) setFile(response.assets[0]);
    });
  };

  const handleUpload = async () => {
    if (!form.subject.trim()) { Alert.alert('Required', 'Document title is required'); return; }
    if (!file) { Alert.alert('Required', 'Please select a file'); return; }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('branch_id', String(branchId));
      formData.append('user_id', String(userId));
      formData.append('document_type', 'Document');
      formData.append('document_category', form.document_category);
      formData.append('issue_date', form.issue_date);
      formData.append('subject', form.subject);
      if (form.description) formData.append('description', form.description);
      if (form.document_code) formData.append('document_code', form.document_code);
      formData.append('document_file', { uri: file.uri, name: file.fileName || 'document.jpg', type: file.type || 'image/jpeg' } as any);
      await api.post('/v1/hr/staff-documents/store', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Uploaded', 'Document uploaded successfully. Pending HR approval.');
      setFile(null);
      setForm({ document_category: 'CNIC', subject: '', document_code: '', issue_date: new Date().toISOString().split('T')[0], description: '' });
      fetchDocs();
    } catch {
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <AppHeader
        title="Documents"
        leftIcon={<Icon name="arrow-left" size={24} color="#333" />}
        rightIcon={<NotificationSVG width={24} height={24} />}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        backgroundColor="#FFE5E5"
      />
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#E63946" /></View>
      ) : (
        <ScrollView style={s.container} showsVerticalScrollIndicator={false}>

          {/* Upload Form */}
          <View style={s.section}>
            <Text style={s.sectionBadge}>VERIFICATION</Text>
            <Text style={s.sectionTitle}>Upload Document</Text>
            <Text style={s.sectionSub}>Upload CNIC, CV, experience letters, or any other supporting document for HR review.</Text>

            <Text style={s.fieldLabel}>Category</Text>
            <TouchableOpacity style={s.dropdown} onPress={() => setCatOpen(!catOpen)}>
              <Text style={s.dropdownText}>{form.document_category}</Text>
              <Icon name={catOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#64748b" />
            </TouchableOpacity>
            {catOpen && (
              <View style={s.dropdownList}>
                {DOC_CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={s.dropdownItem} onPress={() => { setForm(f => ({ ...f, document_category: c })); setCatOpen(false); }}>
                    <Text style={s.dropdownItemText}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.fieldLabel}>Document Title *</Text>
            <TextInput style={s.input} placeholder="Document Title" value={form.subject} onChangeText={v => setForm(f => ({ ...f, subject: v }))} />

            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.fieldLabel}>Document Code (Optional)</Text>
                <TextInput style={s.input} placeholder="Code" value={form.document_code} onChangeText={v => setForm(f => ({ ...f, document_code: v }))} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Issue Date</Text>
                <TextInput style={s.input} placeholder="YYYY-MM-DD" value={form.issue_date} onChangeText={v => setForm(f => ({ ...f, issue_date: v }))} />
              </View>
            </View>

            <Text style={s.fieldLabel}>Description (Optional)</Text>
            <TextInput style={[s.input, s.textarea]} placeholder="Description (Optional)" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline numberOfLines={3} />

            <TouchableOpacity style={s.filePicker} onPress={pickFile}>
              <Icon name="paperclip" size={18} color="#64748b" />
              <Text style={s.filePickerText}>{file ? file.fileName || 'File selected' : 'Choose File'}</Text>
            </TouchableOpacity>
            <Text style={s.fileNote}>Uploaded documents stay pending until HR approves them. Allowed file types: JPG, JPEG, PNG. Max size: 5 MB.</Text>

            <TouchableOpacity style={s.uploadBtn} onPress={handleUpload} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={s.uploadBtnText}>Upload Document</Text>}
            </TouchableOpacity>
          </View>

          {/* Document Library */}
          <View style={s.section}>
            <Text style={s.sectionBadge}>DOCUMENT LIBRARY</Text>
            <Text style={s.sectionTitle}>Uploaded and Verified Documents</Text>
            <Text style={s.sectionSub}>View status, review notes, and replace documents while they are still pending or rejected.</Text>

            {docs.length === 0
              ? <Text style={s.empty}>No documents uploaded yet</Text>
              : docs.map(doc => {
                  const status = doc.approval_status || 'Pending';
                  const st = STATUS_STYLE[status] || STATUS_STYLE.Pending;
                  return (
                    <View key={doc.id} style={s.docCard}>
                      <View style={s.docCardHeader}>
                        <Text style={s.docTitle}>{doc.subject}</Text>
                        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                          <Text style={[s.statusText, { color: st.text }]}>{status.toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={s.docMeta}>{doc.document_category} | {doc.issue_date}</Text>
                      {doc.original_file_name ? <Text style={s.docMeta}>File: {doc.original_file_name}</Text> : null}
                      {status === 'Approved' && (
                        <Text style={s.lockedText}>Locked after approval</Text>
                      )}
                    </View>
                  );
                })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section:         { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  sectionBadge:    { fontSize: 11, fontWeight: '700', color: '#0ea5e9', letterSpacing: 1, marginBottom: 6 },
  sectionTitle:    { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  sectionSub:      { fontSize: 13, color: '#64748b', marginBottom: 16 },
  empty:           { color: '#94a3b8', textAlign: 'center', paddingVertical: 12 },
  row:             { flexDirection: 'row' },
  fieldLabel:      { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  dropdown:        { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb' },
  dropdownText:    { fontSize: 14, color: '#1e293b' },
  dropdownList:    { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, marginTop: 4, backgroundColor: '#fff', zIndex: 10 },
  dropdownItem:    { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownItemText:{ fontSize: 14, color: '#1e293b' },
  input:           { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14, color: '#1e293b', backgroundColor: '#f9fafb' },
  textarea:        { height: 80, textAlignVertical: 'top' },
  filePicker:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginTop: 12, backgroundColor: '#f9fafb' },
  filePickerText:  { fontSize: 14, color: '#64748b' },
  fileNote:        { fontSize: 11, color: '#94a3b8', marginTop: 8, lineHeight: 16 },
  uploadBtn:       { backgroundColor: '#1e293b', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 16 },
  uploadBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  docCard:         { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, marginBottom: 12 },
  docCardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  docTitle:        { fontSize: 15, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 8 },
  statusBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText:      { fontSize: 10, fontWeight: '700' },
  docMeta:         { fontSize: 12, color: '#64748b', marginBottom: 2 },
  lockedText:      { fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' },
});
