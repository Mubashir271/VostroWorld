// Single logout path for the logout buttons: unregisters the device's push
// token (with the still-valid session) and then clears the session. The
// unregister is fire-and-forget so logout is never slowed by the network.
import { store } from '../redux/store';
import { logoutUser } from '../redux/slices/userSlice';
import { unregisterDeviceForPush } from '../services/push';

export const performLogout = () => {
  const authToken = store.getState().user.token;
  unregisterDeviceForPush(authToken);
  store.dispatch(logoutUser());
};
