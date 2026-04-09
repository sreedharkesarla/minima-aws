import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Cloud,
  Storage,
  Memory,
  Psychology,
  Refresh,
  CheckCircle,
  Settings as SettingsIcon,
  Lock,
  Info,
} from '@mui/icons-material';
import { getSystemSettings } from '../services/adminApi';

interface SystemSettings {
  aws: {
    region: string;
    s3_bucket: string;
    sqs_queue: string;
    credentials_configured: boolean;
  };
  qdrant: {
    url: string;
    collection_name: string;
    vector_size: number;
  };
  models: {
    embedding_model: string;
    chat_model: string;
    embedding_dimensions: number;
  };
  services: {
    upload_api_port: number;
    index_api_port: number;
    chat_service_internal: boolean;
    admin_ui_port: number;
  };
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
  };
}

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getSystemSettings();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError('Failed to load system settings');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !settings) {
    return (
      <Box>
        <Alert severity="error">{error || 'No settings available'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom display="flex" alignItems="center" gap={1}>
            <SettingsIcon /> System Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View system configuration and model settings (read-only for security)
          </Typography>
        </Box>
        <Tooltip title="Refresh settings">
          <IconButton onClick={loadSettings} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* AWS Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<Cloud color="primary" />}
              title="AWS Configuration"
              subheader="Amazon Web Services settings"
            />
            <Divider />
            <CardContent>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Region"
                    secondary={settings.aws.region}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="S3 Bucket"
                    secondary={settings.aws.s3_bucket}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="SQS Queue"
                    secondary={settings.aws.sqs_queue}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Credentials Status"
                    secondary={
                      <Chip
                        icon={settings.aws.credentials_configured ? <CheckCircle /> : <Lock />}
                        label={settings.aws.credentials_configured ? 'Configured' : 'Not Configured'}
                        color={settings.aws.credentials_configured ? 'success' : 'warning'}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Qdrant Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<Memory color="secondary" />}
              title="Qdrant Vector Database"
              subheader="Vector storage configuration"
            />
            <Divider />
            <CardContent>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="URL"
                    secondary={settings.qdrant.url}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Collection Name"
                    secondary={settings.qdrant.collection_name}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Vector Dimensions"
                    secondary={`${settings.qdrant.vector_size} dimensions`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* AI Models */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<Psychology color="info" />}
              title="AI Models"
              subheader="AWS Bedrock model configuration"
            />
            <Divider />
            <CardContent>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Embedding Model"
                    secondary={
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {settings.models.embedding_model}
                        </Typography>
                        <Chip
                          label={`${settings.models.embedding_dimensions}D vectors`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Stack>
                    }
                  />
                </ListItem>
                <Divider sx={{ my: 1 }} />
                <ListItem>
                  <ListItemText
                    primary="Chat Model"
                    secondary={
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {settings.models.chat_model}
                        </Typography>
                        <Chip
                          label="Claude 3 Haiku"
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      </Stack>
                    }
                  />
                </ListItem>
              </List>
              <Alert severity="info" icon={<Info />} sx={{ mt: 2 }}>
                Model parameters (temperature, max tokens) are configured in the backend services.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Database Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<Storage color="success" />}
              title="MySQL Database"
              subheader="Relational database configuration"
            />
            <Divider />
            <CardContent>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Host"
                    secondary={settings.database.host}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Port"
                    secondary={settings.database.port}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Database Name"
                    secondary={settings.database.database}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="User"
                    secondary={settings.database.user}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Services Configuration */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              avatar={<Storage color="warning" />}
              title="Microservices"
              subheader="Service ports and configuration"
            />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}>
                    <Typography variant="h3" color="primary.main">
                      {settings.services.upload_api_port}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Upload API
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.50' }}>
                    <Typography variant="h3" color="secondary.main">
                      {settings.services.index_api_port}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Index API
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50' }}>
                    <Typography variant="h3" color="info.main">
                      WS
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Chat Service
                    </Typography>
                    <Chip label="Internal" size="small" sx={{ mt: 0.5 }} />
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
                    <Typography variant="h3" color="success.main">
                      {settings.services.admin_ui_port}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Admin UI
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Notice */}
        <Grid item xs={12}>
          <Alert severity="warning" icon={<Lock />}>
            <strong>Security Notice:</strong> Settings are displayed in read-only mode. 
            To modify system configuration, edit the respective config.yml files or environment variables in the backend services and restart the containers.
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};
