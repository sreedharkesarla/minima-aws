import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  LightMode,
  DarkMode,
  Circle,
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeMode } from '../theme/themes';

interface ThemeOption {
  mode: ThemeMode;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const themeOptions: ThemeOption[] = [
  {
    mode: 'light',
    label: 'Light',
    icon: <LightMode />,
    color: '#1976d2',
  },
  {
    mode: 'dark',
    label: 'Dark',
    icon: <DarkMode />,
    color: '#90caf9',
  },
  {
    mode: 'blue',
    label: 'Ocean Blue',
    icon: <Circle />,
    color: '#2563eb',
  },
  {
    mode: 'purple',
    label: 'Purple Haze',
    icon: <Circle />,
    color: '#7c3aed',
  },
  {
    mode: 'green',
    label: 'Nature Green',
    icon: <Circle />,
    color: '#059669',
  },
];

export const ThemeSwitcher: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    handleClose();
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="large"
        aria-label="change theme"
        aria-controls={open ? 'theme-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        sx={{
          color: 'inherit',
        }}
      >
        <PaletteIcon />
      </IconButton>
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'theme-button',
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 3,
          sx: {
            minWidth: 200,
            mt: 1.5,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            SELECT THEME
          </Typography>
        </Box>
        <Divider />
        {themeOptions.map((option) => (
          <MenuItem
            key={option.mode}
            onClick={() => handleThemeChange(option.mode)}
            selected={themeMode === option.mode}
            sx={{
              py: 1.5,
              px: 2,
            }}
          >
            <ListItemIcon sx={{ color: option.color }}>
              {option.icon}
            </ListItemIcon>
            <ListItemText
              primary={option.label}
              primaryTypographyProps={{
                fontWeight: themeMode === option.mode ? 600 : 400,
              }}
            />
            {themeMode === option.mode && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: option.color,
                  ml: 1,
                }}
              />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
