import { useDispatch } from 'react-redux';
import { showSnackbar as showSnackbarAction, hideSnackbar as hideSnackbarAction } from '../slices/snackbarSlice';

export const useSnackbarStore = () => {
  const dispatch = useDispatch();

  const showSnackbar = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    dispatch(showSnackbarAction({ message, type }));
  };

  const hideSnackbar = () => {
    dispatch(hideSnackbarAction());
  };

  return { showSnackbar, hideSnackbar };
};
