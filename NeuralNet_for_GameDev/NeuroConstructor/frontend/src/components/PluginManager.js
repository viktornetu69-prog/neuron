"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManagerPanel = PluginManagerPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const material_1 = require("@mui/material");
const Refresh_1 = require("@mui/icons-material/Refresh");
const Add_1 = require("@mui/icons-material/Add");
const material_2 = require("@mui/material");
function PluginManagerPanel() {
    const [plugins, setPlugins] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [openCreateDialog, setOpenCreateDialog] = (0, react_1.useState)(false);
    const [newPlugin, setNewPlugin] = (0, react_1.useState)({
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
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setError(`Failed to load plugins: ${msg}`);
        }
        finally {
            setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
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
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setError(`Failed to create plugin: ${msg}`);
        }
    };
    return ((0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { p: 3 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h5", component: "h2", children: "Plugin Manager" }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', gap: 1 }, children: [(0, jsx_runtime_1.jsx)(material_1.Button, { variant: "outlined", startIcon: (0, jsx_runtime_1.jsx)(Refresh_1.default, {}), onClick: loadPlugins, disabled: loading, children: "Refresh" }), (0, jsx_runtime_1.jsx)(material_1.Button, { variant: "contained", startIcon: (0, jsx_runtime_1.jsx)(Add_1.default, {}), onClick: () => setOpenCreateDialog(true), children: "Create Plugin" })] })] }), error && ((0, jsx_runtime_1.jsx)(material_1.Alert, { severity: "error", sx: { mb: 2 }, onClose: () => setError(null), children: error })), plugins.length === 0 ? ((0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body1", color: "text.secondary", sx: { mt: 4, textAlign: 'center' }, children: "No plugins installed. Click \"Create Plugin\" to add your first plugin." })) : ((0, jsx_runtime_1.jsx)(material_1.List, { children: plugins.map((plugin, index) => ((0, jsx_runtime_1.jsx)(material_1.Card, { sx: { mb: 2 }, children: (0, jsx_runtime_1.jsx)(material_1.CardContent, { children: (0, jsx_runtime_1.jsx)(material_1.Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, children: (0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", children: plugin.name }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "text.secondary", children: plugin.description || 'No description' }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }, children: [(0, jsx_runtime_1.jsx)(material_2.Chip, { label: `v${plugin.version}`, size: "small" }), (0, jsx_runtime_1.jsx)(material_2.Chip, { label: plugin.type, size: "small", color: "primary" }), plugin.capabilities.map((cap) => ((0, jsx_runtime_1.jsx)(material_2.Chip, { label: cap, size: "small", variant: "outlined" }, cap)))] })] }) }) }) }, index))) })), (0, jsx_runtime_1.jsxs)(material_1.Dialog, { open: openCreateDialog, onClose: () => setOpenCreateDialog(false), maxWidth: "sm", fullWidth: true, children: [(0, jsx_runtime_1.jsx)(material_1.DialogTitle, { children: "Create New Plugin" }), (0, jsx_runtime_1.jsx)(material_1.DialogContent, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }, children: [(0, jsx_runtime_1.jsx)(material_1.TextField, { label: "Plugin ID", fullWidth: true, value: newPlugin.id, onChange: (e) => setNewPlugin({ ...newPlugin, id: e.target.value }), helperText: "Unique identifier (e.g., my_plugin)" }), (0, jsx_runtime_1.jsx)(material_1.TextField, { label: "Plugin Name", fullWidth: true, value: newPlugin.name, onChange: (e) => setNewPlugin({ ...newPlugin, name: e.target.value }) }), (0, jsx_runtime_1.jsx)(material_1.TextField, { label: "Description", fullWidth: true, multiline: true, rows: 3, value: newPlugin.description, onChange: (e) => setNewPlugin({ ...newPlugin, description: e.target.value }) }), (0, jsx_runtime_1.jsxs)(material_1.TextField, { select: true, label: "Type", fullWidth: true, value: newPlugin.type, onChange: (e) => setNewPlugin({ ...newPlugin, type: e.target.value }), children: [(0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "default", children: "Default" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "ui", children: "UI Component" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "processor", children: "Data Processor" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "generator", children: "Code Generator" })] }), (0, jsx_runtime_1.jsx)(material_1.TextField, { label: "Capabilities (comma-separated)", fullWidth: true, value: newPlugin.capabilities, onChange: (e) => setNewPlugin({ ...newPlugin, capabilities: e.target.value }), helperText: "e.g., generate_code, analyze_data, connect_api" })] }) }), (0, jsx_runtime_1.jsxs)(material_1.DialogActions, { children: [(0, jsx_runtime_1.jsx)(material_1.Button, { onClick: () => setOpenCreateDialog(false), children: "Cancel" }), (0, jsx_runtime_1.jsx)(material_1.Button, { onClick: handleCreatePlugin, variant: "contained", children: "Create" })] })] })] }));
}
