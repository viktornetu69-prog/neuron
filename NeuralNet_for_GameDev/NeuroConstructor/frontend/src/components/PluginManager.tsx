import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Alert,
  MenuItem,
} from '@mui/material';
import IconButton from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { Chip } from '@mui/material';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  type: string;
  capabilities: string[];
}

export function PluginManagerPanel() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newPlugin, setNewPlugin] = useState({
    id: '',
    name: '',
    description: '',
    type: 'default',
    capabilities: '',
  });

  const loadPlugins = async () => {
    setLoading(true);
    try {
      // Placeholder: replace with API call when available
      setPlugins([]);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load plugins: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  const handleCreatePlugin = async () => {
    if (!newPlugin.id || !newPlugin.name) {
      setError('ID and Name are required');
      return;
    }

    try {
      // Placeholder: replace with API call when available
      setPlugins((prev) => [
        ...prev,
        {
          id: newPlugin.id,
          name: newPlugin.name,
          version: '0.1.0',
          description: newPlugin.description,
          type: newPlugin.type,
          capabilities: newPlugin.capabilities
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean),
        },
      ]);
      setOpenCreateDialog(false);
      setNewPlugin({
        id: '',
        name: '',
        description: '',
        type: 'default',
        capabilities: '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create plugin: ${msg}`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h2">
          Plugin Manager
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadPlugins}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
          >
            Create Plugin
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {plugins.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          No plugins installed. Click &quot;Create Plugin&quot; to add your first plugin.
        </Typography>
      ) : (
        <List>
          {plugins.map((plugin, index) => (
            <Card key={index} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6">{plugin.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {plugin.description || 'No description'}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={`v${plugin.version}`} size="small" />
                      <Chip label={plugin.type} size="small" color="primary" />
                      {plugin.capabilities.map((cap) => (
                        <Chip key={cap} label={cap} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </List>
      )}

      {/* Create Plugin Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Plugin</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Plugin ID"
              fullWidth
              value={newPlugin.id}
              onChange={(e) => setNewPlugin({ ...newPlugin, id: e.target.value })}
              helperText="Unique identifier (e.g., my_plugin)"
            />
            <TextField
              label="Plugin Name"
              fullWidth
              value={newPlugin.name}
              onChange={(e) => setNewPlugin({ ...newPlugin, name: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newPlugin.description}
              onChange={(e) => setNewPlugin({ ...newPlugin, description: e.target.value })}
            />
            <TextField
              select
              label="Type"
              fullWidth
              value={newPlugin.type}
              onChange={(e) => setNewPlugin({ ...newPlugin, type: e.target.value })}
            >
              <MenuItem value="default">Default</MenuItem>
              <MenuItem value="ui">UI Component</MenuItem>
              <MenuItem value="processor">Data Processor</MenuItem>
              <MenuItem value="generator">Code Generator</MenuItem>
            </TextField>
            <TextField
              label="Capabilities (comma-separated)"
              fullWidth
              value={newPlugin.capabilities}
              onChange={(e) => setNewPlugin({ ...newPlugin, capabilities: e.target.value })}
              helperText="e.g., generate_code, analyze_data, connect_api"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePlugin} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
