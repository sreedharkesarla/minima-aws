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
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { getUsers, getRoles } from '../services/adminApi';

interface User {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  last_login: string | null;
  created_at: string;
  roles: string[];
}

interface Role {
  role_id: number;
  role_name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export const UsersRolesPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersData, rolesData] = await Promise.all([
          getUsers(),
          getRoles(),
        ]);
        setUsers(usersData);
        setRoles(rolesData);
        setError(null);
      } catch (err) {
        setError('Failed to load users and roles data');
        console.error('Error fetching users/roles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Users & Roles
      </Typography>

      {/* Users Table */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Users ({users.length})
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Superuser</TableCell>
                <TableCell>Last Login</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.full_name || 'N/A'}</TableCell>
                  <TableCell>{user.email || 'N/A'}</TableCell>
                  <TableCell>
                    {user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <Chip
                          key={role}
                          label={role}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                          color={
                            role === 'superadmin' ? 'error' :
                            role === 'admin' ? 'primary' :
                            role === 'operator' ? 'secondary' : 'default'
                          }
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No roles
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <Chip
                        icon={<CheckCircle />}
                        label="Active"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<Cancel />}
                        label="Inactive"
                        color="error"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {user.is_superuser ? (
                      <CheckCircle color="error" />
                    ) : (
                      <Cancel color="disabled" />
                    )}
                  </TableCell>
                  <TableCell>
                    {user.last_login
                      ? new Date(user.last_login).toLocaleString()
                      : 'Never'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Roles Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Available Roles ({roles.length})
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Role Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.role_id}>
                  <TableCell>
                    <Chip
                      label={role.role_name}
                      color={
                        role.role_name === 'superadmin' ? 'error' :
                        role.role_name === 'admin' ? 'primary' :
                        role.role_name === 'operator' ? 'secondary' : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell>
                    {role.is_active ? (
                      <Chip
                        icon={<CheckCircle />}
                        label="Active"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<Cancel />}
                        label="Inactive"
                        color="error"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {role.created_at
                      ? new Date(role.created_at).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
