import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

export const JobDetailPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Job Details
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">Job ID: {jobId}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Detailed view with timeline, artifacts, and retry options will be implemented here.
        </Typography>
      </Paper>
    </Box>
  );
};
