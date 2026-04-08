import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useAppContext } from '../contexts/AppContext';

export const NotificationSnackbar: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const notification = state.notifications[0];

  const handleClose = () => {
    if (notification) {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id });
    }
  };

  return (
    <Snackbar
      open={!!notification}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      {notification ? (
        <Alert onClose={handleClose} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
};
