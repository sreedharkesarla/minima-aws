import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Schedule,
  Storage,
  AttachMoney,
  Token,
  TrendingUp,
  Description,
  Folder,
  DataUsage,
  Speed,
} from '@mui/icons-material';
import { useAppContext } from '../contexts/AppContext';
import { getFiles } from '../services/adminApi';
import { FileMetadata } from '../types';

interface UsageData {
  total_tokens: number;
  total_cost_usd: number;
  breakdown: {
    [key: string]: {
      tokens: number;
      cost: number;
      operations: number;
    };
  };
}

interface FileStats {
  total: number;
  indexed: number;
  processing: number;
  failed: number;
  totalSize: number;
  byStatus: {
    [key: string]: number;
  };
}

export const DashboardPage: React.FC = () => {
  const { state } = useAppContext();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!state.user) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch files
      const filesData = await getFiles(state.user.userId);
      setFiles(filesData);

      // Fetch usage data
      const usageResponse = await fetch(`/api/upload/usage/${state.user.userId}?days=30`);
      if (usageResponse.ok) {
        const usage = await usageResponse.json();
        setUsageData(usage);
      }
    } catch (error) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [state.user]);

  const calculateFileStats = (): FileStats => {
    const stats: FileStats = {
      total: files.length,
      indexed: 0,
      processing: 0,
      failed: 0,
      totalSize: 0,
      byStatus: {},
    };

    files.forEach((file) => {
      // Count by status
      if (file.status === 'indexed') stats.indexed++;
      else if (file.status === 'processing' || file.status === 'queued') stats.processing++;
      else if (file.status === 'failed') stats.failed++;

      // Track status distribution
      stats.byStatus[file.status] = (stats.byStatus[file.status] || 0) + 1;

      // Calculate total size
      if (file.fileSize) stats.totalSize += file.fileSize;
    });

    return stats;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const fileStats = calculateFileStats();
  const successRate = fileStats.total > 0 ? ((fileStats.indexed / fileStats.total) * 100).toFixed(1) : '0';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1a237e' }}>
          Dashboard Overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Real-time insights into your document processing and AI usage
        </Typography>
      </Box>

      {/* Top Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Files */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Total Files
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {fileStats.total}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <Folder sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                <Storage sx={{ fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption">
                  {formatBytes(fileStats.totalSize)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Indexed Files */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Indexed
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {fileStats.indexed}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <CheckCircle sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption">
                  {successRate}% Success Rate
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Cost */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Total Cost
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {usageData ? formatCurrency(usageData.total_cost_usd) : '$0.00'}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <AttachMoney sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                <Speed sx={{ fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption">
                  Last 30 Days
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Tokens */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Total Tokens
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {usageData ? formatNumber(usageData.total_tokens) : '0'}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                  <Token sx={{ fontSize: 32 }} />
                </Avatar>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                <DataUsage sx={{ fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption">
                  AI Operations
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* File Status Distribution */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: '#1a237e' }}>
              <Description sx={{ mr: 1 }} />
              File Status Distribution
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            {Object.entries(fileStats.byStatus).map(([status, count]) => {
              const percentage = (count / fileStats.total) * 100;
              const getStatusColor = (s: string) => {
                switch (s) {
                  case 'indexed': return '#4caf50';
                  case 'processing': case 'queued': return '#ff9800';
                  case 'failed': return '#f44336';
                  default: return '#2196f3';
                }
              };

              return (
                <Box key={status} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
                      {status}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {count} ({percentage.toFixed(0)}%)
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={percentage} 
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(0,0,0,0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getStatusColor(status),
                        borderRadius: 4,
                      }
                    }}
                  />
                </Box>
              );
            })}
          </Paper>
        </Grid>

        {/* Usage Breakdown */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: '#1a237e' }}>
              <TrendingUp sx={{ mr: 1 }} />
              Usage & Cost Breakdown
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            {usageData && Object.keys(usageData.breakdown).length > 0 ? (
              <List>
                {Object.entries(usageData.breakdown).map(([type, data]) => {
                  const getTypeColor = (t: string) => {
                    switch (t) {
                      case 'chat': return '#667eea';
                      case 'embedding': return '#f093fb';
                      case 'indexing': return '#4facfe';
                      default: return '#fa709a';
                    }
                  };

                  return (
                    <ListItem 
                      key={type}
                      sx={{ 
                        bgcolor: 'rgba(0,0,0,0.02)', 
                        borderRadius: 2, 
                        mb: 1.5,
                        border: `2px solid ${getTypeColor(type)}20`,
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: getTypeColor(type) }}>
                          {type === 'chat' ? '💬' : type === 'embedding' ? '📄' : '🔄'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {type}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Chip 
                              label={`${formatNumber(data.tokens)} tokens`} 
                              size="small" 
                              sx={{ mr: 1, fontSize: '0.7rem' }}
                            />
                            <Chip 
                              label={`${data.operations} ops`} 
                              size="small" 
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </Box>
                        }
                      />
                      <Typography variant="h6" sx={{ color: getTypeColor(type), fontWeight: 700 }}>
                        {formatCurrency(data.cost)}
                      </Typography>
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                No usage data available yet
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Processing Status Widget */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
              border: '2px solid #667eea40',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#1a237e' }}>
              ⚡ Processing Status
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress 
                  variant="determinate" 
                  value={parseFloat(successRate)} 
                  size={120}
                  thickness={5}
                  sx={{ color: '#667eea' }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#667eea' }}>
                    {successRate}%
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Success Rate
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3,
              background: 'linear-gradient(135deg, #f093fb20 0%, #f5576c20 100%)',
              border: '2px solid #f093fb40',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#1a237e' }}>
              📊 Quick Stats
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Processing
                </Typography>
                <Chip 
                  icon={<Schedule />}
                  label={fileStats.processing}
                  color="warning"
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Failed
                </Typography>
                <Chip 
                  icon={<Error />}
                  label={fileStats.failed}
                  color="error"
                  size="small"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Avg File Size
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {fileStats.total > 0 ? formatBytes(fileStats.totalSize / fileStats.total) : '0 Bytes'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3,
              background: 'linear-gradient(135deg, #4facfe20 0%, #00f2fe20 100%)',
              border: '2px solid #4facfe40',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#1a237e' }}>
              🕐 Recent Activity
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Last Upload
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {files.length > 0 
                    ? new Date(files[0].createdAt).toLocaleDateString() 
                    : 'No uploads yet'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Storage
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatBytes(fileStats.totalSize)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Active Operations
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {usageData ? Object.values(usageData.breakdown).reduce((sum, b) => sum + b.operations, 0) : 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
