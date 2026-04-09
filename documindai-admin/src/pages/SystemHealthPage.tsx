import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Refresh,
  HealthAndSafety,
  Speed,
  Memory,
  Cloud,
  Chat,
  CloudUpload,
  Search,
} from '@mui/icons-material';
import { getSystemHealth } from '../services/adminApi';

interface ServiceHealth {
  status: string;
  message: string;
  response_time_ms: number;
  [key: string]: any;
}

interface SystemHealthData {
  timestamp: number;
  overall_status: string;
  services: {
    database?: ServiceHealth;
    qdrant?: ServiceHealth;
    s3?: ServiceHealth;
    index_service?: ServiceHealth;
    chat_service?: ServiceHealth;
  };
}

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const config = {
    healthy: { color: 'success' as const, icon: <CheckCircle />, label: 'Healthy' },
    unhealthy: { color: 'error' as const, icon: <ErrorIcon />, label: 'Unhealthy' },
    degraded: { color: 'warning' as const, icon: <Warning />, label: 'Degraded' },
  };

  const { color, icon, label } = config[status as keyof typeof config] || config.degraded;

  return <Chip icon={icon} label={label} color={color} size="small" />;
};

const ResponseTimeIndicator: React.FC<{ time: number }> = ({ time }) => {
  let color: 'success' | 'warning' | 'error' = 'success';
  if (time > 1000) color = 'error';
  else if (time > 500) color = 'warning';

  return (
    <Chip
      icon={<Speed />}
      label={`${time.toFixed(0)}ms`}
      color={color}
      size="small"
      variant="outlined"
    />
  );
};

export const SystemHealthPage: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadHealth = async () => {
    try {
      setLoading(true);
      const data = await getSystemHealth();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError('Failed to load system health');
      console.error('Error fetching health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadHealth, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading && !health) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !health) {
    return (
      <Box>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!health) return null;

  const lastUpdate = new Date(health.timestamp * 1000).toLocaleString();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom display="flex" alignItems="center" gap={1}>
            <HealthAndSafety /> System Health Monitor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time health status of all system components • Last updated: {lastUpdate}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title={autoRefresh ? 'Auto-refresh enabled (30s)' : 'Auto-refresh disabled'}>
            <Chip
              label={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              color={autoRefresh ? 'success' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Refresh now">
            <IconButton onClick={loadHealth} color="primary" disabled={loading}>
              <Refresh className={loading ? 'rotate' : ''} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Overall Status */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: health.overall_status === 'healthy' ? 'success.50' : 'warning.50' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          {health.overall_status === 'healthy' ? (
            <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />
          ) : (
            <Warning sx={{ fontSize: 48, color: 'warning.main' }} />
          )}
          <Box>
            <Typography variant="h5">
              System Status: <StatusChip status={health.overall_status} />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {health.overall_status === 'healthy'
                ? 'All systems operational'
                : 'Some services experiencing issues'}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Database Health */}
        {health.services.database && (
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardHeader
                avatar={<Memory color={health.services.database.status === 'healthy' ? 'success' : 'error'} />}
                title="MySQL Database"
                action={<StatusChip status={health.services.database.status} />}
              />
              <Divider />
              <CardContent>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Status"
                      secondary={health.services.database.message}
                    />
                  </ListItem>
                  {health.services.database.response_time_ms > 0 && (
                    <ListItem>
                      <ListItemText
                        primary="Response Time"
                        secondary={<ResponseTimeIndicator time={health.services.database.response_time_ms} />}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Qdrant Health */}
        {health.services.qdrant && (
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardHeader
                avatar={<Memory color={health.services.qdrant.status === 'healthy' ? 'success' : 'error'} />}
                title="Qdrant Vector DB"
                action={<StatusChip status={health.services.qdrant.status} />}
              />
              <Divider />
              <CardContent>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Status"
                      secondary={health.services.qdrant.message}
                    />
                  </ListItem>
                  {health.services.qdrant.response_time_ms > 0 && (
                    <ListItem>
                      <ListItemText
                        primary="Response Time"
                        secondary={<ResponseTimeIndicator time={health.services.qdrant.response_time_ms} />}
                      />
                    </ListItem>
                  )}
                  {health.services.qdrant.collections_count !== undefined && (
                    <ListItem>
                      <ListItemText
                        primary="Collections"
                        secondary={
                          <Chip
                            label={`${health.services.qdrant.collections_count} collections`}
                            size="small"
                            color="primary"
                          />
                        }
                      />
                    </ListItem>
                  )}
                  {health.services.qdrant.total_vectors !== undefined && (
                    <ListItem>
                      <ListItemText
                        primary="Total Vectors"
                        secondary={
                          <Chip
                            label={`${health.services.qdrant.total_vectors.toLocaleString()} vectors`}
                            size="small"
                            color="secondary"
                          />
                        }
                      />
                    </ListItem>
                  )}
                </List>
                
                {/* Collection Details */}
                {health.services.qdrant.collections && health.services.qdrant.collections.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      COLLECTIONS
                    </Typography>
                    {health.services.qdrant.collections.map((coll: any) => (
                      <Box key={coll.name} sx={{ mt: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">{coll.name}</Typography>
                          <Chip
                            label={`${coll.vectors_count.toLocaleString()} vectors`}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                      </Box>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* S3 Health */}
        {health.services.s3 && (
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardHeader
                avatar={<Cloud color={health.services.s3.status === 'healthy' ? 'success' : 'error'} />}
                title="AWS S3 Storage"
                action={<StatusChip status={health.services.s3.status} />}
              />
              <Divider />
              <CardContent>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Status"
                      secondary={health.services.s3.message}
                    />
                  </ListItem>
                  {health.services.s3.response_time_ms > 0 && (
                    <ListItem>
                      <ListItemText
                        primary="Response Time"
                        secondary={<ResponseTimeIndicator time={health.services.s3.response_time_ms} />}
                      />
                    </ListItem>
                  )}
                  {health.services.s3.bucket_name && (
                    <ListItem>
                      <ListItemText
                        primary="Bucket"
                        secondary={health.services.s3.bucket_name}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Upload Service Health */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardHeader
              avatar={<CloudUpload color="primary" />}
              title="Upload API"
              action={<StatusChip status="healthy" />}
            />
            <Divider />
            <CardContent>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Status"
                    secondary="Operational (you're viewing this page)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Port"
                    secondary="8001"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Index Service Health */}
        {health.services.index_service && (
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardHeader
                avatar={<Search color={health.services.index_service.status === 'healthy' ? 'success' : 'error'} />}
                title="Index Service"
                action={<StatusChip status={health.services.index_service.status} />}
              />
              <Divider />
              <CardContent>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Status"
                      secondary={health.services.index_service.message}
                    />
                  </ListItem>
                  {health.services.index_service.response_time_ms > 0 && (
                    <ListItem>
                      <ListItemText
                        primary="Response Time"
                        secondary={<ResponseTimeIndicator time={health.services.index_service.response_time_ms} />}
                      />
                    </ListItem>
                  )}
                  <ListItem>
                    <ListItemText
                      primary="Port"
                      secondary="8002"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Chat Service Health */}
        {health.services.chat_service && (
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardHeader
                avatar={<Chat color={health.services.chat_service.status === 'healthy' ? 'success' : 'warning'} />}
                title="Chat Service"
                action={<StatusChip status={health.services.chat_service.status} />}
              />
              <Divider />
              <CardContent>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Status"
                      secondary={health.services.chat_service.message}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Protocol"
                      secondary="WebSocket (Internal)"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Performance Summary */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Performance Summary
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(health.services).map(([name, service]) => {
            if (!service || service.response_time_ms === 0) return null;
            return (
              <Grid item xs={12} sm={6} md={4} key={name}>
                <Box>
                  <Typography variant="caption" color="text.secondary" textTransform="uppercase">
                    {name.replace(/_/g, ' ')}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (service.response_time_ms / 1000) * 100)}
                    color={
                      service.response_time_ms > 1000 ? 'error' :
                      service.response_time_ms > 500 ? 'warning' : 'success'
                    }
                    sx={{ mt: 1, mb: 0.5 }}
                  />
                  <Typography variant="caption">
                    {service.response_time_ms.toFixed(0)}ms
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
};
