import React, { useState, useCallback, useEffect } from 'react';
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
  Card,
  CardContent,
  CardActions,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { 
  CloudUpload, 
  Folder, 
  Description, 
  Delete, 
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  Storage,
} from '@mui/icons-material';
import { useAppContext } from '../contexts/AppContext';
import { uploadFile, getFiles, deleteFile, getQdrantCollections, getDocumentTypes } from '../services/adminApi';
import { FileMetadata } from '../types';

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
  const [documents, setDocuments] = useState<FileMetadata[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [qdrantCollections, setQdrantCollections] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);

  const loadDocuments = async () => {
    if (!state.user) return;
    
    setLoadingDocuments(true);
    try {
      const files = await getFiles(state.user.userId);
      setDocuments(files);
      
      const collections = await getQdrantCollections();
      setQdrantCollections(collections);
    } catch (error) {
      console.error('Failed to load documents:', error);
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          message: 'Failed to load documents',
          severity: 'error',
        },
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  const loadDocumentTypes = async () => {
    try {
      const types = await getDocumentTypes();
      setDocumentTypes(types);
    } catch (error) {
      console.error('Failed to load document types:', error);
    }
  };

  useEffect(() => {
    loadDocuments();
    loadDocumentTypes();
  }, [state.user]);

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
      
      // Reload documents after upload
      await loadDocuments();
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
              {documentTypes.length > 0 ? (
                documentTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="" disabled>Loading...</MenuItem>
              )}
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Uploaded Documents
          </Typography>
          <Tooltip title="Refresh documents">
            <IconButton onClick={loadDocuments} disabled={loadingDocuments}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {loadingDocuments ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : documents.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              No documents uploaded yet. Upload files above to get started.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {documents.map((doc) => (
              <Grid item xs={12} sm={6} md={4} key={doc.fileId}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Description sx={{ fontSize: 40, color: 'primary.main', mr: 1 }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600, 
                            wordBreak: 'break-word',
                            mb: 0.5,
                          }}
                        >
                          {doc.filename}
                        </Typography>
                        <Chip
                          size="small"
                          icon={
                            doc.status === 'indexed' ? <CheckCircle /> : 
                            doc.status === 'failed' ? <ErrorIcon /> : 
                            undefined
                          }
                          label={doc.status}
                          color={
                            doc.status === 'indexed' ? 'success' :
                            doc.status === 'failed' ? 'error' :
                            doc.status === 'processing' ? 'warning' :
                            'default'
                          }
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </Box>
                    </Box>

                    {/* S3 Path / Folder */}
                    {doc.s3Path && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Folder sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                          {doc.s3Path.split('/').slice(0, -1).join('/') || 'root'}
                        </Typography>
                      </Box>
                    )}

                    {/* Qdrant Collection */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Storage sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        Collection: {state.user?.userId || 'test'}
                      </Typography>
                    </Box>

                    {/* Document Type */}
                    {doc.documentType && (
                      <Chip
                        size="small"
                        label={doc.documentType}
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    )}

                    {/* Sensitivity */}
                    {doc.sensitivity && (
                      <Chip
                        size="small"
                        label={doc.sensitivity}
                        variant="outlined"
                        color={
                          doc.sensitivity === 'confidential' ? 'error' :
                          doc.sensitivity === 'internal' ? 'warning' :
                          'default'
                        }
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    )}

                    {/* Tags */}
                    {doc.tags && doc.tags.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {doc.tags.slice(0, 2).map((tag) => (
                          <Chip
                            key={tag}
                            size="small"
                            label={tag}
                            sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                          />
                        ))}
                        {doc.tags.length > 2 && (
                          <Chip
                            size="small"
                            label={`+${doc.tags.length - 2}`}
                            sx={{ mb: 0.5, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    )}

                    {/* File Size */}
                    {doc.fileSize && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Size: {(doc.fileSize / 1024).toFixed(1)} KB
                      </Typography>
                    )}

                    {/* Upload Date */}
                    <Typography variant="caption" color="text.secondary" display="block">
                      Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                    <Tooltip title="Delete document">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={async () => {
                          if (window.confirm(`Delete "${doc.filename}"?`)) {
                            try {
                              await deleteFile(state.user!.userId, doc.fileId);
                              dispatch({
                                type: 'ADD_NOTIFICATION',
                                payload: {
                                  message: 'Document deleted successfully',
                                  severity: 'success',
                                },
                              });
                              await loadDocuments();
                            } catch (error) {
                              dispatch({
                                type: 'ADD_NOTIFICATION',
                                payload: {
                                  message: 'Failed to delete document',
                                  severity: 'error',
                                },
                              });
                            }
                          }
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Qdrant Collections Summary */}
        {qdrantCollections.length > 0 && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Qdrant Collections ({qdrantCollections.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {qdrantCollections.map((collection: any) => (
                <Chip
                  key={collection.name}
                  icon={<Storage />}
                  label={`${collection.name} (${collection.points_count || 0} docs)`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
