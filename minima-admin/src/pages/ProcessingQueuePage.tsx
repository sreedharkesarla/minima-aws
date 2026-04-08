import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
} from '@mui/material';
import { Visibility, Refresh } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { getProcessingQueue } from '../services/adminApi';
import { ProcessingJob } from '../types';
import { formatDistanceToNow } from 'date-fns';

export const ProcessingQueuePage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    status: 'all',
    search: '',
  });

  const loadJobs = async () => {
    if (!state.user) return;

    setLoading(true);
    try {
      const data = await getProcessingQueue(state.user.userId, filter);
      setJobs(data);
    } catch (error) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          message: `Failed to load queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadJobs, 30000);
    return () => clearInterval(interval);
  }, [state.user, filter]);

  const getStatusColor = (status: ProcessingJob['status']) => {
    switch (status) {
      case 'queued':
        return 'default';
      case 'running':
        return 'info';
      case 'succeeded':
        return 'success';
      case 'failed':
        return 'error';
      case 'retry':
        return 'warning';
      default:
        return 'default';
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (filter.status !== 'all' && job.status !== filter.status) return false;
    if (filter.search && !job.filename.toLowerCase().includes(filter.search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Processing Queue</Typography>
        <IconButton onClick={loadJobs} disabled={loading} aria-label="Refresh queue">
          <Refresh />
        </IconButton>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            label="Search files"
            value={filter.search}
            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filter.status}
              onChange={(e) => setFilter((prev) => ({ ...prev, status: e.target.value }))}
              label="Status"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="queued">Queued</MenuItem>
              <MenuItem value="running">Running</MenuItem>
              <MenuItem value="succeeded">Succeeded</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="retry">Retry</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {loading && <LinearProgress />}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>File</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    No jobs found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => (
                <TableRow key={job.jobId} hover>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                      {job.filename}
                    </Typography>
                  </TableCell>
                  <TableCell>{job.owner}</TableCell>
                  <TableCell>
                    <Chip
                      label={job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      color={getStatusColor(job.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={job.progress}
                        sx={{ flex: 1, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption">{job.progress}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {job.startedAt
                        ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })
                        : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/jobs/${job.jobId}`)}
                      aria-label={`View details for ${job.filename}`}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Showing {filteredJobs.length} of {jobs.length} jobs • Auto-refreshes every 30 seconds
        </Typography>
      </Box>
    </Box>
  );
};
