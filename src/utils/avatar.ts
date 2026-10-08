// src/utils/avatar.ts
//
// One place that decides the logged-in user's avatar, so the drawer, home
// header, Account screen and Employee Dashboard always show the same picture.
//
// `appImage` (picked in Settings, kept on the device) wins, then the staff
// photo from the API, then the bundled placeholder. The API photo carries
// `?v=<avatarVersion>` once it has been replaced in the app: FastImage caches
// by URL, so without it a re-used file name would keep showing the old photo.

import FastImage, { Source } from '@d11/react-native-fast-image';

const PLACEHOLDER = require('../assets/img/userIcon.png');

/** A usable photo URL — the API sends a bare folder ("…/Staff/") when there is none. */
export const hasPhoto = (url?: string | null) =>
  !!url && !String(url).trim().endsWith('/');

export const withVersion = (url: string, version?: number) =>
  version ? `${url}${url.includes('?') ? '&' : '?'}v=${version}` : url;

export const avatarSource = (
  profileImage?: string | null,
  appImage?: string | null,
  version?: number,
): Source | number => {
  if (appImage) return { uri: appImage };
  if (hasPhoto(profileImage)) {
    return { uri: withVersion(String(profileImage), version), priority: FastImage.priority.high };
  }
  return PLACEHOLDER;
};
