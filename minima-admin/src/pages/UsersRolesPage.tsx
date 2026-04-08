import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

export const UsersRolesPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Users & Roles
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          RBAC management with user/role assignment and permissions matrix will be implemented
          here.
        </Typography>
      </Paper>
    </Box>
  );
};
