"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sidebar = Sidebar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const NAV_ITEMS = [
    { id: 'chat', label: '💬 Чат', description: 'Основной чат с AI' },
    { id: 'models', label: '🧠 Модели', description: 'Teacher/Student pipeline' },
    { id: 'datasets', label: '📊 Датасеты', description: 'Управление датасетами' },
    { id: 'stage6', label: '⚡ Stage 6', description: 'AI, Forecast, AutoFix' },
    { id: 'settings', label: '⚙️ Настройки', description: 'Конфигурация' },
];
function Sidebar({ activePanel, onPanelChange, onCheckServer, serverStatus }) {
    const [hoveredItem, setHoveredItem] = (0, react_1.useState)(null);
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            width: 240,
            background: '#121220',
            borderRight: '1px solid #1e1e30',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    padding: '20px 16px',
                    borderBottom: '1px solid #1e1e30',
                }, children: [(0, jsx_runtime_1.jsx)("h1", { style: {
                            fontSize: 18,
                            fontWeight: 700,
                            color: '#e8e8e8',
                            margin: 0,
                        }, children: "\uD83E\uDDE0 NeuroConstructor" }), (0, jsx_runtime_1.jsx)("p", { style: { fontSize: 11, color: '#8888aa', margin: '4px 0 0 0' }, children: "Build local neural models" })] }), (0, jsx_runtime_1.jsx)("nav", { style: { flex: 1, padding: '12px 8px' }, children: NAV_ITEMS.map(item => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => onPanelChange(item.id), onMouseEnter: () => setHoveredItem(item.id), onMouseLeave: () => setHoveredItem(null), style: {
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '10px 12px',
                        marginBottom: 4,
                        background: activePanel === item.id ? 'rgba(124, 111, 247, 0.15)' : 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        color: activePanel === item.id ? '#7c6ff7' : '#8888aa',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: activePanel === item.id ? 600 : 400,
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                    }, children: [(0, jsx_runtime_1.jsx)("span", { style: { marginRight: 10, fontSize: 16 }, children: item.label.split(' ')[0] }), (0, jsx_runtime_1.jsx)("span", { children: item.label.split(' ').slice(1).join(' ') })] }, item.id))) }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    padding: '12px 16px',
                    borderTop: '1px solid #1e1e30',
                    background: '#0a0a0f',
                }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 8,
                        }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 12, color: '#8888aa' }, children: "\u0421\u0435\u0440\u0432\u0435\u0440" }), (0, jsx_runtime_1.jsx)("div", { style: {
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: serverStatus === 'ready' ? '#4caf50' : '#f44336',
                                } })] }), (0, jsx_runtime_1.jsx)("p", { style: {
                            fontSize: 11,
                            color: serverStatus === 'ready' ? '#4caf50' : '#f44336',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }, children: serverStatus }), (0, jsx_runtime_1.jsx)("button", { onClick: onCheckServer, style: {
                            marginTop: 8,
                            width: '100%',
                            padding: '6px 12px',
                            background: '#1a1a2e',
                            border: '1px solid #1e1e30',
                            borderRadius: 6,
                            color: '#8888aa',
                            cursor: 'pointer',
                            fontSize: 12,
                        }, children: "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C" })] })] }));
}
