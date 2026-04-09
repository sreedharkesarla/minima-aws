import React, { useEffect, useState } from 'react';
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
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Button,
} from '@mui/material';
import {
  Refresh,
  Download,
  FilterList,
  Error as ErrorIcon,
  CheckCircle,
  Warning,
  Info as InfoIcon,
} from '@mui/icons-material';
import { getApiRequestLogs, getApplicationLogs, getAuditLogs } from '../services/adminApi';

interface ApiRequestLog {
  log_id: number;
  request_id: string;
  service: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  user_id: string | null;
  ip_address: string | null;
  error_message: string | null;
  created_at: string;
}

interface ApplicationLog {
  log_id: number;
  log_level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  service: string;
  module: string | null;
  function_name: string | null;
  stack_trace: string | null;
  created_at: string;
}

interface AuditLog {
  log_id: number;
  user_id: string | null;
  event_type: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  status: 'success' | 'failure';
  ip_address: string | null;
  created_at: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`logs-tabpanel-${index}`}
      aria-labelledby={`logs-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const LogsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [apiLogs, setApiLogs] = useState<ApiRequestLog[]>([]);
  const [appLogs, setAppLogs] = useState<ApplicationLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [apiData, appData, auditData] = await Promise.all([
        getApiRequestLogs(limit, serviceFilter !== 'all' ? serviceFilter : undefined),
        getApplicationLogs(limit, serviceFilter !== 'all' ? serviceFilter : undefined),
        getAuditLogs(limit),
      ]);
      
      setApiLogs(apiData);
      setAppLogs(appData);
      setAuditLogs(auditData);
    } catch (err) {
      setError('Failed to load logs data');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [limit, serviceFilter]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'info';
    if (status >= 400 && status < 500) return 'warning';
    if (status >= 500) return 'error';
    return 'default';
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'CRITICAL':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'WARNING':
        return <Warning fontSize="small" color="warning" />;
      case 'INFO':
        return <InfoIcon fontSize="small" color="info" />;
      default:
        return <CheckCircle fontSize="small" color="success" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'error';
      case 'ERROR':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'INFO':
        return 'info';
      case 'DEBUG':
        return 'default';
      default:
        return 'default';
    }
  };

  const exportToCsv = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  if (loading && apiLogs.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const filteredApiLogs = statusFilter === 'all' 
    ? apiLogs 
    : apiLogs.filter(log => {
        if (statusFilter === 'success') return log.status_code >= 200 && log.status_code < 300;
        if (statusFilter === 'error') return log.status_code >= 400;
        return true;
      });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          System Logs
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Limit</InputLabel>
            <Select
              value={limit}
              label="Limit"
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
              <MenuItem value={500}>500</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Service</InputLabel>
            <Select
              value={serviceFilter}
              label="Service"
              onChange={(e) => setServiceFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="upload">Upload</MenuItem>
              <MenuItem value="index">Index</MenuItem>
              <MenuItem value="chat">Chat</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh logs">
            <IconButton onClick={fetchLogs} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab 
            label={`API Requests (${apiLogs.length})`} 
            icon={<FilterList />} 
            iconPosition="start"
          />
          <Tab 
            label={`Application Logs (${appLogs.length})`} 
            icon={<InfoIcon />} 
            iconPosition="start"
          />
          <Tab 
            label={`Audit Logs (${auditLogs.length})`} 
            icon={<CheckCircle />} 
            iconPosition="start"
          />
        </Tabs>

        {/* API Request Logs Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} px={2}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                label="Status Filter"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="success">Success (2xx)</MenuItem>
                <MenuItem value="error">Errors (4xx, 5xx)</MenuItem>
              </Select>
            </FormControl>

            <Button
              startIcon={<Download />}
              onClick={() => exportToCsv(filteredApiLogs, 'api-request-logs.csv')}
              size="small"
            >
              Export CSV
            </Button>
          </Box>

          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Request ID</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Path</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredApiLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography color="text.secondary">No logs found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApiLogs.map((log) => (
                    <TableRow key={log.log_id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                          {log.request_id ? log.request_id.substring(0, 8) + '...' : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.service || 'unknown'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.method || 'N/A'} 
                          size="small"
                          color={
                            log.method === 'GET' ? 'info' :
                            log.method === 'POST' ? 'success' :
                            log.method === 'DELETE' ? 'error' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.path || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.status_code || 'N/A'} 
                          size="small"
                          color={log.status_code ? getStatusColor(log.status_code) as any : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={log.duration_ms && log.duration_ms > 1000 ? 'error' : 'text.primary'}>
                          {log.duration_ms !== null && log.duration_ms !== undefined ? `${log.duration_ms}ms` : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {log.user_id || 'anonymous'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {log.ip_address || 'N/A'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Application Logs Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="flex-end" mb={2} px={2}>
            <Button
              startIcon={<Download />}
              onClick={() => exportToCsv(appLogs, 'application-logs.csv')}
              size="small"
            >
              Export CSV
            </Button>
          </Box>

          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Module</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Stack Trace</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">No application logs found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  appLogs.map((log) => (
                    <TableRow key={log.log_id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          icon={log.log_level ? getLogLevelIcon(log.log_level) : undefined}
                          label={log.log_level || 'INFO'} 
                          size="small"
                          color={log.log_level ? getLogLevelColor(log.log_level) as any : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={log.service || 'unknown'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {log.module || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', maxWidth: 400 }}>
                          {log.message || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {log.stack_trace ? (
                          <Tooltip title={log.stack_trace}>
                            <Chip label="View" size="small" color="error" />
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Audit Logs Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box display="flex" justifyContent="flex-end" mb={2} px={2}>
            <Button
              startIcon={<Download />}
              onClick={() => exportToCsv(auditLogs, 'audit-logs.csv')}
              size="small"
            >
              Export CSV
            </Button>
          </Box>

          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Event Type</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">No audit logs found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.log_id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {log.user_id || 'System'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={log.event_type || 'N/A'} size="small" color="primary" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {log.action || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {log.resource_type ? `${log.resource_type}/${log.resource_id || 'N/A'}` : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.status || 'unknown'} 
                          size="small"
                          color={log.status === 'success' ? 'success' : log.status === 'failure' ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {log.ip_address || 'N/A'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>API Requests</Typography>
            <Typography variant="h4" color="primary">{apiLogs.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Avg: {apiLogs.length > 0 ? (apiLogs.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / apiLogs.length).toFixed(0) : 0}ms
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Application Logs</Typography>
            <Typography variant="h4" color="primary">{appLogs.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Errors: {appLogs.filter(log => log.log_level && (log.log_level === 'ERROR' || log.log_level === 'CRITICAL')).length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Audit Events</Typography>
            <Typography variant="h4" color="primary">{auditLogs.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Failed: {auditLogs.filter(log => log.status && log.status === 'failure').length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
