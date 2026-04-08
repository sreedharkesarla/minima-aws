import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Lock, Person } from '@mui/icons-material';
import { useAppContext } from '../contexts/AppContext';
import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { dispatch } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call login API
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password,
      });

      const { user } = response.data;

      // Store user in context and localStorage
      dispatch({ type: 'SET_USER', payload: user });

      // Show success notification
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          message: `Welcome back, ${user.username}!`,
          severity: 'success',
        },
      });

      // Redirect to main page
      navigate('/intake');
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(
        err.response?.data?.detail || 
        err.response?.data?.message || 
        'Invalid username or password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #111827 0%, #4f46e5 100%)',
        padding: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <CardContent sx={{ padding: 4 }}>
          {/* Logo/Header */}
          <Box sx={{ textAlign: 'center', marginBottom: 3 }}>
            <Lock
              sx={{
                fontSize: 48,
                color: 'primary.main',
                marginBottom: 1,
              }}
            />
            <Typography variant="h4" component="h1" fontWeight="bold">
              Minima Admin
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ marginTop: 1 }}>
              Sign in to access the admin console
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ marginBottom: 2 }}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              disabled={loading}
              sx={{ marginBottom: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              sx={{ marginBottom: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !username || !password}
              sx={{
                paddingY: 1.5,
                fontSize: '1rem',
                fontWeight: 'bold',
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </form>

          {/* Footer */}
          <Box sx={{ marginTop: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Minima RAG Admin Console v1.0
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
