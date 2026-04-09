import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  Avatar,
  Chip,
  Alert,
  Button,
  Menu,
  MenuItem,
  Autocomplete,
  Drawer,
  ListItemButton,
  ListItemText,
  Divider,
  Badge,
  Tooltip,
} from '@mui/material';
import { 
  Send, 
  Person, 
  SmartToy, 
  AttachFile, 
  Search as SearchIcon,
  History,
  Delete,
  Settings,
  Clear,
  MoreVert,
} from '@mui/icons-material';
import { useAppContext } from '../contexts/AppContext';
import { getFiles } from '../services/adminApi';
import { FileMetadata } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: Date;
  fileReferences?: string[]; // File IDs referenced in this message
}

interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  lastUpdated: Date;
  fileReferences: string[];
}

export const ChatPage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableFiles, setAvailableFiles] = useState<FileMetadata[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileMetadata[]>([]);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesListRef = useRef<HTMLDivElement>(null); // For ARIA live region

  const STORAGE_KEY = 'chat-conversations';

  // Load conversation history from localStorage
  useEffect(() => {
    const loadConversations = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const conversations = parsed.map((conv: any) => ({
            ...conv,
            lastUpdated: new Date(conv.lastUpdated),
            messages: conv.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          }));
          setConversations(conversations);
          
          // Resume last conversation
          if (conversations.length > 0) {
            const lastConv = conversations[0];
            setCurrentConversationId(lastConv.id);
            setMessages(lastConv.messages);
            setSelectedFiles(lastConv.fileReferences.map((id: string) => 
              availableFiles.find(f => f.fileId === id)).filter(Boolean) as FileMetadata[]);
          } else {
            // Create first conversation
            createNewConversation();
          }
        } else {
          createNewConversation();
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
        createNewConversation();
      }
    };
    
    if (state.user && availableFiles.length > 0) {
      loadConversations();
    }
  }, [state.user, availableFiles]);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
      } catch (error) {
        console.error('Failed to save chat history:', error);
      }
    }
  }, [conversations]);

  // Load available files
  useEffect(() => {
    const loadFiles = async () => {
      if (!state.user) return;
      try {
        const files = await getFiles(state.user.userId);
        setAvailableFiles(files.filter(f => f.status === 'indexed'));
      } catch (error) {
        console.error('Failed to load files:', error);
      }
    };
    loadFiles();
  }, [state.user]);

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      name: `Chat ${new Date().toLocaleDateString()}`,
      messages: [{
        id: '1',
        sender: 'bot',
        text: 'Hello! I can help you search through your indexed documents. What would you like to know?',
        timestamp: new Date(),
      }],
      lastUpdated: new Date(),
      fileReferences: [],
    };
    setConversations([newConv, ...conversations]);
    setCurrentConversationId(newConv.id);
    setMessages(newConv.messages);
  };

  const updateCurrentConversation = (newMessages: Message[]) => {
    setMessages(newMessages);
    setConversations(prevConvs =>
      prevConvs.map(conv =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: newMessages,
              lastUpdated: new Date(),
              fileReferences: selectedFiles.map((f: FileMetadata) => f.fileId),
            }
          : conv
      )
    );
  };

  const deleteConversation = (convId: string) => {
    setConversations((prevConvs: Conversation[]) => prevConvs.filter((c: Conversation) => c.id !== convId));
    if (convId === currentConversationId) {
      createNewConversation();
    }
  };

  const clearCurrentConversation = () => {
    const initialMessage: Message = {
      id: Date.now().toString(),
      sender: 'bot',
      text: 'Conversation cleared. How can I help you?',
      timestamp: new Date(),
    };
    updateCurrentConversation([initialMessage]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    if (!state.user || !currentConversationId) return;

    // Connect to WebSocket
    const fileIds = selectedFiles.map((f: FileMetadata) => f.fileId).join(',') || 'all';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/chat/chat/TM/${state.user.username}-${currentConversationId}/${fileIds}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { message: 'Chat connected', severity: 'success' },
      });
    };

    ws.onmessage = (event) => {
      console.log('Received WebSocket message:', event.data);
      
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'answer' && data.message) {
          setIsTyping(false);
          const botMessage: Message = {
            id: Date.now().toString(),
            sender: 'bot',
            text: data.message,
            timestamp: new Date(),
            fileReferences: selectedFiles.map(f => f.fileId),
          };
          updateCurrentConversation([...messages, botMessage]);
        } else if (data.type === 'start_message' || data.type === 'disconnect_message') {
          setIsTyping(false);
          console.log('System message:', data.type);
        }
      } catch (error) {
        setIsTyping(false);
        const botMessage: Message = {
          id: Date.now().toString(),
          sender: 'bot',
          text: event.data,
          timestamp: new Date(),
        };
        updateCurrentConversation([...messages, botMessage]);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { message: 'Chat connection error', severity: 'error' },
      });
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [state.user, currentConversationId, selectedFiles]);

  const handleSend = async () => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date(),
      fileReferences: selectedFiles.map(f => f.fileId),
    };

    updateCurrentConversation([...messages, userMessage]);
    setIsTyping(true);

    // Send message via WebSocket
    wsRef.current.send(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Filter messages based on search query
  const filteredMessages = searchQuery
    ? messages.filter((msg: Message) =>
        msg.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Ask Chat
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Search messages">
            <IconButton size="small" onClick={() => setSearchQuery(searchQuery ? '' : ' ')}>
              <SearchIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Conversation history">
            <IconButton size="small" onClick={() => setHistoryDrawerOpen(true)}>
              <Badge badgeContent={conversations.length} color="primary">
                <History />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Options">
            <IconButton size="small" onClick={(e) => setMenuAnchorEl(e.currentTarget)}>
              <MoreVert />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Options Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
      >
        <MenuItem onClick={() => { createNewConversation(); setMenuAnchorEl(null); }}>
          New Conversation
        </MenuItem>
        <MenuItem onClick={() => { clearCurrentConversation(); setMenuAnchorEl(null); }}>
          <Clear fontSize="small" sx={{ mr: 1 }} />
          Clear Current Chat
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { 
          localStorage.removeItem(STORAGE_KEY); 
          setConversations([]); 
          createNewConversation(); 
          setMenuAnchorEl(null);
        }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete All History
        </MenuItem>
      </Menu>

      {/* Search Bar */}
      {searchQuery !== '' && (
        <TextField
          fullWidth
          size="small"
          placeholder="Search in conversation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      )}

      {/* File Selector - Hidden for now */}
      {false && (
        <Autocomplete
          multiple
          options={availableFiles}
          getOptionLabel={(option: FileMetadata) => option.filename}
          value={selectedFiles}
          onChange={(_, newValue: FileMetadata[]) => setSelectedFiles(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Attach documents to conversation"
              placeholder="Select files..."
              helperText="Select specific documents to chat about, or leave empty for all indexed files"
            />
          )}
          renderTags={(value: FileMetadata[], getTagProps: any) =>
            value.map((option: FileMetadata, index: number) => (
              <Chip
                label={option.filename}
                {...getTagProps({ index })}
                size="small"
                icon={<AttachFile fontSize="small" />}
              />
            ))
          }
          sx={{ mb: 2 }}
        />
      )}

      {/* Connection Status */}
      <Alert severity={isConnected ? "success" : "warning"} sx={{ mb: 3 }}>
        {isConnected ? (
          <>
            <strong>Connected:</strong> Chat is ready. Ask questions about your indexed documents.
          </>
        ) : (
          <>
            <strong>Connecting:</strong> Establishing connection to chat service...
          </>
        )}
      </Alert>

      {/* Chat Messages Area with ARIA Log Pattern */}
      <Paper elevation={3} sx={{ height: 'calc(100vh - 450px)', display: 'flex', flexDirection: 'column' }}>
        <Box
          ref={messagesListRef}
          role="log"
          aria-live="polite"
          aria-atomic="false"
          aria-label="Chat messages"
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            bgcolor: '#fafafa',
          }}
        >
          <List>
            {filteredMessages.map((message: Message) => (
              <ListItem
                key={message.id}
                role="article"
                aria-label={`Message from ${message.sender} at ${message.timestamp.toLocaleTimeString()}`}
                sx={{
                  flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                  gap: 1,
                  alignItems: 'flex-start',
                  mb: 2,
                }}
              >
                <Avatar
                  aria-hidden="true"
                  sx={{
                    bgcolor: message.sender === 'user' ? 'primary.main' : 
                            message.sender === 'bot' ? 'secondary.main' : 'grey.500',
                    width: 36,
                    height: 36,
                  }}
                >
                  {message.sender === 'user' ? (
                    <Person fontSize="small" />
                  ) : message.sender === 'bot' ? (
                    <SmartToy fontSize="small" />
                  ) : (
                    <Settings fontSize="small" />
                  )}
                </Avatar>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    bgcolor: message.sender === 'user' ? 'primary.light' : 
                            message.sender === 'system' ? 'grey.100' : 'white',
                    color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.text}
                  </Typography>
                  {message.fileReferences && message.fileReferences.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {message.fileReferences.map((fileId: string) => {
                        const file = availableFiles.find((f: FileMetadata) => f.fileId === fileId);
                        return file ? (
                          <Chip
                            key={fileId}
                            label={file.filename}
                            size="small"
                            icon={<AttachFile fontSize="small" />}
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ) : null;
                      })}
                    </Box>
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      opacity: 0.7,
                    }}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Paper>
              </ListItem>
            ))}
            {isTyping && (
              <ListItem 
                role="status"
                aria-live="polite"
                aria-label="AI is typing"
                sx={{ gap: 1 }}
              >
                <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
                  <SmartToy fontSize="small" />
                </Avatar>
                <Paper elevation={1} sx={{ p: 2, bgcolor: 'white' }}>
                  <Typography variant="body2" color="text.secondary">
                    Typing...
                  </Typography>
                </Paper>
              </ListItem>
            )}
            <div ref={messagesEndRef} aria-hidden="true" />
          </List>
        </Box>

        {/* Input Area */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'white',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Ask a question about your documents..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!state.user || !isConnected}
              variant="outlined"
              size="small"
              aria-label="Message input"
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={!input.trim() || !state.user || !isConnected}
              aria-label="Send message"
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' },
                '&:disabled': { bgcolor: 'action.disabledBackground' },
              }}
            >
              <Send />
            </IconButton>
          </Box>
          {!state.user && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Please log in to use the chat feature
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Conversation History Drawer */}
      <Drawer
        anchor="right"
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Conversation History
          </Typography>
          <Button
            fullWidth
            variant="contained"
            startIcon={<History />}
            onClick={() => {
              createNewConversation();
              setHistoryDrawerOpen(false);
            }}
            sx={{ mb: 2 }}
          >
            New Conversation
          </Button>
          <Divider sx={{ mb: 2 }} />
          <List>
            {conversations.map((conv: Conversation) => (
              <ListItemButton
                key={conv.id}
                selected={conv.id === currentConversationId}
                onClick={() => {
                  setCurrentConversationId(conv.id);
                  setMessages(conv.messages);
                  setSelectedFiles(conv.fileReferences.map((id: string) =>
                    availableFiles.find((f: FileMetadata) => f.fileId === id)).filter(Boolean) as FileMetadata[]);
                  setHistoryDrawerOpen(false);
                }}
              >
                <ListItemText
                  primary={conv.name}
                  secondary={`${conv.messages.length} messages • ${new Date(conv.lastUpdated).toLocaleDateString()}`}
                />
                <IconButton
                  edge="end"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this conversation?')) {
                      deleteConversation(conv.id);
                    }
                  }}
                  size="small"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};
