// src/utils/openPdf.ts
//
// Hand a PDF this app just generated to the user.
//
// iOS: the in-app PdfViewer (preview + Share / Save to Files). The share
// sheet's own preview launches Apple's Preview app, which the iOS Simulator
// kills at launch ("Code Signature Invalid") — the user was bounced back to
// the app with nothing shown, which read as a crash.
// Android: straight to the share sheet — Android's WebView can't render PDFs.
// Cancelling the sheet is not an error.

import { Platform } from 'react-native';
import Share from 'react-native-share';

export const openPdf = async (
  filePath: string,
  fileName: string,
  title: string,
  navigation: any,
) => {
  const url = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
  if (Platform.OS === 'ios') {
    navigation.navigate('PdfViewer', { filePath: url, fileName, title });
    return;
  }
  await Share.open({ url, type: 'application/pdf', filename: fileName, failOnCancel: false });
};
