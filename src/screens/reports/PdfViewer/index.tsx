// In-app PDF viewer (iOS).
//
// The share sheet's own preview hands the file to Apple's Preview app, which
// the iOS Simulator kills at launch ("Code Signature Invalid") — so tapping
// it bounced the user back to the app with nothing shown. Rendering the PDF
// in a WebView keeps the preview inside the app, with Share and Save to Files
// underneath. Android's WebView can't render PDFs, so Android keeps going
// straight to the share sheet (see utils/misReportPdf.ts).
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import Share from 'react-native-share';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AppHeader from '../../../components/AppHeader';

type Params = { filePath: string; fileName: string; title?: string };

const PdfViewerScreen = () => {
  const navigation = useNavigation();
  const { filePath, fileName, title } = (useRoute().params ?? {}) as Params;
  const uri = filePath?.startsWith('file://') ? filePath : `file://${filePath}`;
  const dir = uri.slice(0, uri.lastIndexOf('/') + 1);
  const [loading, setLoading] = useState(true);

  const share = async (saveToFiles: boolean) => {
    try {
      await Share.open({
        url: uri,
        type: 'application/pdf',
        filename: fileName,
        saveToFiles,
        failOnCancel: false,
      });
    } catch (e: any) {
      Alert.alert(saveToFiles ? 'Save failed' : 'Share failed', e?.message || 'Please try again.');
    }
  };

  return (
    <View style={s.screen}>
      <AppHeader
        title={title || 'PDF'}
        leftIcon={<Icon name="arrow-left" size={24} color="#1A1A1A" />}
        onLeftPress={() => navigation.goBack()}
        backgroundColor="#FFE5E5"
      />

      <View style={s.viewer}>
        <WebView
          source={{ uri }}
          originWhitelist={['*']}
          allowFileAccess
          allowingReadAccessToURL={dir}
          onLoadEnd={() => setLoading(false)}
          style={s.web}
        />
        {loading && (
          <View style={s.loader}>
            <ActivityIndicator size="large" color="#E63946" />
          </View>
        )}
      </View>

      <View style={s.bar}>
        <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={() => share(false)} activeOpacity={0.8}>
          <Icon name="share-variant" size={18} color="#E63946" />
          <Text style={[s.btnText, s.btnOutlineText]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btn} onPress={() => share(true)} activeOpacity={0.8}>
          <Icon name="content-save" size={18} color="#FFF" />
          <Text style={s.btnText}>Save to Files</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: '#F5F7FA' },
  viewer:         { flex: 1 },
  web:            { flex: 1, backgroundColor: '#F5F7FA' },
  loader:         { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  bar:            { flexDirection: 'row', gap: 10, padding: 12, paddingBottom: 28, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  btn:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#E63946', borderRadius: 8, paddingVertical: 12 },
  btnText:        { color: '#FFF', fontWeight: '700', fontSize: 15 },
  btnOutline:     { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E63946' },
  btnOutlineText: { color: '#E63946' },
});

export default PdfViewerScreen;
