import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  Stack,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { CloudUpload } from '@mui/icons-material';
import { useAppContext } from '../contexts/AppContext';
import { uploadFile } from '../services/adminApi';

interface UploadMetadata {
  documentType: string;
  sensitivity: 'public' | 'internal' | 'confidential';
  tags: string[];
}

export const FileIntakePage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [metadata, setMetadata] = useState<UploadMetadata>({
    documentType: '',
    sensitivity: 'internal',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const handleUpload = async () => {
    if (!state.user) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { message: 'Please login first', severity: 'error' },
      });
      return;
    }

    if (selectedFiles.length === 0) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { message: 'Please select at least one file', severity: 'warning' },
      });
      return;
    }

    if (!metadata.documentType) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { message: 'Document type is required', severity: 'warning' },
      });
      return;
    }

    setUploading(true);

    try {
      for (const file of selectedFiles) {
        await uploadFile(state.user.userId, file, metadata);
      }

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          message: `Successfully uploaded ${selectedFiles.length} file(s)`,
          severity: 'success',
        },
      });

      setSelectedFiles([]);
      setMetadata({ documentType: '', sensitivity: 'internal', tags: [] });
    } catch (error) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
        },
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !metadata.tags.includes(tagInput.trim())) {
      setMetadata((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleDeleteTag = (tag: string) => {
    setMetadata((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        File Intake & Processing
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Upload Files
        </Typography>

        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.400',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            bgcolor: isDragActive ? 'action.hover' : 'background.default',
            cursor: 'pointer',
            mb: 3,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
          role="region"
          aria-label="File upload area"
        >
          <input {...getInputProps()} aria-label="File input" />
          <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" gutterBottom>
            {isDragActive ? 'Drop files here...' : 'Drag & drop files here or click to browse'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Supported formats: PDF, TXT, DOCX • Server-side validation enforced
          </Typography>
        </Box>

        {selectedFiles.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected Files ({selectedFiles.length})
            </Typography>
            <Stack spacing={1}>
              {selectedFiles.map((file, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </Typography>
                  <Button
                    size="small"
                    onClick={() =>
                      setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    Remove
                  </Button>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          Required Metadata
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          <FormControl fullWidth required>
            <InputLabel>Document Type</InputLabel>
            <Select
              value={metadata.documentType}
              onChange={(e) =>
                setMetadata((prev) => ({ ...prev, documentType: e.target.value }))
              }
              label="Document Type"
            >
              <MenuItem value="invoice">Invoice</MenuItem>
              <MenuItem value="contract">Contract</MenuItem>
              <MenuItem value="dataset">Dataset</MenuItem>
              <MenuItem value="report">Report</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth required>
            <InputLabel>Sensitivity</InputLabel>
            <Select
              value={metadata.sensitivity}
              onChange={(e) =>
                setMetadata((prev) => ({
                  ...prev,
                  sensitivity: e.target.value as UploadMetadata['sensitivity'],
                }))
              }
              label="Sensitivity"
            >
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="internal">Internal</MenuItem>
              <MenuItem value="confidential">Confidential</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Tags (optional)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="Type a tag and press Enter"
            helperText="e.g., Q2, finance, vendor-x"
          />
          {metadata.tags.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {metadata.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                  size="small"
                />
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            startIcon={<CloudUpload />}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setSelectedFiles([]);
              setMetadata({ documentType: '', sensitivity: 'internal', tags: [] });
            }}
            disabled={uploading}
          >
            Clear
          </Button>
        </Box>

        <Box
          sx={{ mt: 2 }}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {uploading && `Uploading ${selectedFiles.length} files...`}
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Uploads
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Files will appear here after upload. Check the Processing Queue for status updates.
        </Typography>
      </Paper>
    </Box>
  );
};
