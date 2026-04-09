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
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Grid,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Tab,
  Tabs,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Add,
  Edit,
  Delete,
  VpnKey,
  PersonAdd,
  Shield,
  Refresh,
} from '@mui/icons-material';
import {
  getUsers,
  getRoles,
  getPermissions,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  createRole,
  updateRole,
  deleteRole,
} from '../services/adminApi';
import { useAppContext } from '../contexts/AppContext';

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
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const UsersRolesPage: React.FC = () => {
  const { dispatch } = useAppContext();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // User Dialog State
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    is_active: true,
    is_superuser: false,
    role_ids: [] as number[],
  });

  // Role Dialog State
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState({
    role_name: '',
    description: '',
    is_active: true,
  });

  // Password Reset Dialog State
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');

  // Delete Confirmation Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'user' | 'role'; id: string | number; name: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData, permsData] = await Promise.all([
        getUsers(),
        getRoles(),
        getPermissions(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setPermissions(permsData);
      setError(null);
    } catch (err) {
      setError('Failed to load users and roles data');
      console.error('Error fetching users/roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // ==================== USER OPERATIONS ====================

  const handleOpenUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        username: user.username,
        password: '',
        email: user.email || '',
        full_name: user.full_name || '',
        is_active: user.is_active,
        is_superuser: user.is_superuser,
        role_ids: user.roles.map(roleName => {
          const role = roles.find(r => r.role_name === roleName);
          return role ? role.role_id : 0;
        }).filter(id => id > 0),
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        username: '',
        password: '',
        email: '',
        full_name: '',
        is_active: true,
        is_superuser: false,
        role_ids: [],
      });
    }
    setUserDialogOpen(true);
  };

  const handleCloseUserDialog = () => {
    setUserDialogOpen(false);
    setEditingUser(null);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        // Update existing user
        await updateUser(editingUser.user_id, {
          email: userFormData.email,
          full_name: userFormData.full_name,
          is_active: userFormData.is_active,
          is_superuser: userFormData.is_superuser,
          role_ids: userFormData.role_ids,
        });
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: { message: 'User updated successfully', severity: 'success' },
        });
      } else {
        // Create new user
        if (!userFormData.password) {
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: { message: 'Password is required for new users', severity: 'error' },
          });
          return;
        }
        await createUser(userFormData);
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: { message: 'User created successfully', severity: 'success' },
        });
      }
      handleCloseUserDialog();
      fetchData();
    } catch (error: any) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { 
          message: error.response?.data?.detail || 'Failed to save user', 
          severity: 'error' 
        },
      });
    }
  };

  const handleOpenPasswordDialog = (userId: string) => {
    setResetUserId(userId);
    setNewPassword('');
    setPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    try {
      await resetPassword(resetUserId, newPassword);
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { message: 'Password reset successfully', severity: 'success' },
      });
      setPasswordDialogOpen(false);
      setNewPassword('');
    } catch (error) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { message: 'Failed to reset password', severity: 'error' },
      });
    }
  };

  // ==================== ROLE OPERATIONS ====================

  const handleOpenRoleDialog = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setRoleFormData({
        role_name: role.role_name,
        description: role.description,
        is_active: role.is_active,
      });
    } else {
      setEditingRole(null);
      setRoleFormData({
        role_name: '',
        description: '',
        is_active: true,
      });
    }
    setRoleDialogOpen(true);
  };

  const handleCloseRoleDialog = () => {
    setRoleDialogOpen(false);
    setEditingRole(null);
  };

  const handleSaveRole = async () => {
    try {
      if (editingRole) {
        // Update existing role
        await updateRole(editingRole.role_id, roleFormData);
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: { message: 'Role updated successfully', severity: 'success' },
        });
      } else {
        // Create new role
        await createRole(roleFormData);
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: { message: 'Role created successfully', severity: 'success' },
        });
      }
      handleCloseRoleDialog();
      fetchData();
    } catch (error: any) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { 
          message: error.response?.data?.detail || 'Failed to save role', 
          severity: 'error' 
        },
      });
    }
  };

  // ==================== DELETE OPERATIONS ====================

  const handleOpenDeleteDialog = (type: 'user' | 'role', id: string | number, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'user') {
        await deleteUser(deleteTarget.id as string, false);
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: { message: 'User deactivated successfully', severity: 'success' },
        });
      } else {
        await deleteRole(deleteTarget.id as number, false);
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: { message: 'Role deactivated successfully', severity: 'success' },
        });
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (error: any) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { 
          message: error.response?.data?.detail || 'Failed to delete', 
          severity: 'error' 
        },
      });
    }
  };

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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Users & Roles Management
        </Typography>
        <IconButton onClick={fetchData} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`Users (${users.length})`} icon={<PersonAdd />} iconPosition="start" />
          <Tab label={`Roles (${roles.length})`} icon={<Shield />} iconPosition="start" />
          <Tab label="Permissions" icon={<VpnKey />} iconPosition="start" />
        </Tabs>

        {/* USERS TAB */}
        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenUserDialog()}
            >
              Create User
            </Button>
          </Box>

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
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell><strong>{user.username}</strong></TableCell>
                    <TableCell>{user.full_name || 'N/A'}</TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell>
                      {user.roles.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {user.roles.map((role) => (
                            <Chip
                              key={role}
                              label={role}
                              size="small"
                              color={
                                role === 'superadmin' ? 'error' :
                                role === 'admin' ? 'primary' :
                                role === 'operator' ? 'secondary' : 'default'
                              }
                            />
                          ))}
                        </Stack>
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
                        <Chip label="Yes" color="error" size="small" />
                      ) : (
                        <Chip label="No" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit User">
                        <IconButton size="small" onClick={() => handleOpenUserDialog(user)} color="primary">
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <IconButton size="small" onClick={() => handleOpenPasswordDialog(user.user_id)} color="warning">
                          <VpnKey />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Deactivate User">
                        <IconButton 
                          size="small" 
                          onClick={() => handleOpenDeleteDialog('user', user.user_id, user.username)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* ROLES TAB */}
        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenRoleDialog()}
            >
              Create Role
            </Button>
          </Box>

          <Grid container spacing={2}>
            {roles.map((role) => (
              <Grid item xs={12} md={6} lg={4} key={role.role_id}>
                <Card>
                  <CardHeader
                    avatar={<Shield color="primary" />}
                    title={role.role_name}
                    action={
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Edit Role">
                          <IconButton size="small" onClick={() => handleOpenRoleDialog(role)}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate Role">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleOpenDeleteDialog('role', role.role_id, role.role_name)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    }
                    subheader={
                      role.is_active ? (
                        <Chip label="Active" color="success" size="small" />
                      ) : (
                        <Chip label="Inactive" color="error" size="small" />
                      )
                    }
                  />
                  <Divider />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      {role.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Created: {new Date(role.created_at).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* PERMISSIONS TAB */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            System Permissions Matrix
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Available permissions in the system organized by category.
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {Object.entries(permissions).map(([category, perms]: [string, any]) => (
              <Grid item xs={12} md={6} key={category}>
                <Card>
                  <CardHeader 
                    title={category.charAt(0).toUpperCase() + category.slice(1)}
                    avatar={<VpnKey color="secondary" />}
                  />
                  <Divider />
                  <CardContent>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Permission</strong></TableCell>
                          <TableCell><strong>Description</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Array.isArray(perms) && perms.map((perm: any) => (
                          <TableRow key={perm.name}>
                            <TableCell>
                              <Chip label={perm.label} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">{perm.description}</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Paper>

      {/* USER CREATE/EDIT DIALOG */}
      <Dialog open={userDialogOpen} onClose={handleCloseUserDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  disabled={!!editingUser}
                  required
                />
              </Grid>
              {!editingUser && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    required
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Roles</InputLabel>
                  <Select
                    multiple
                    value={userFormData.role_ids}
                    onChange={(e) => setUserFormData({ ...userFormData, role_ids: e.target.value as number[] })}
                    label="Roles"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((id) => {
                          const role = roles.find(r => r.role_id === id);
                          return role ? <Chip key={id} label={role.role_name} size="small" /> : null;
                        })}
                      </Box>
                    )}
                  >
                    {roles.filter(r => r.is_active).map((role) => (
                      <MenuItem key={role.role_id} value={role.role_id}>
                        {role.role_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={userFormData.is_active}
                      onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={userFormData.is_superuser}
                      onChange={(e) => setUserFormData({ ...userFormData, is_superuser: e.target.checked })}
                    />
                  }
                  label="Superuser"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUserDialog}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained" color="primary">
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ROLE CREATE/EDIT DIALOG */}
      <Dialog open={roleDialogOpen} onClose={handleCloseRoleDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRole ? 'Edit Role' : 'Create New Role'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Role Name"
                  value={roleFormData.role_name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, role_name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={roleFormData.is_active}
                      onChange={(e) => setRoleFormData({ ...roleFormData, is_active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRoleDialog}>Cancel</Button>
          <Button onClick={handleSaveRole} variant="contained" color="primary">
            {editingRole ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PASSWORD RESET DIALOG */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleResetPassword} variant="contained" color="primary">
            Reset Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Deactivation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate {deleteTarget?.type === 'user' ? 'user' : 'role'} <strong>{deleteTarget?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This will deactivate the {deleteTarget?.type} but not permanently delete it. You can reactivate it later by editing.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
