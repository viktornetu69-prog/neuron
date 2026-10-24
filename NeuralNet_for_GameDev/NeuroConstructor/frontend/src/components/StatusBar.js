"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBar = StatusBar;
const jsx_runtime_1 = require("react/jsx-runtime");
function StatusBar({ status, isServerAvailable }) {
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            padding: '8px 16px',
            background: '#0a0a0f',
            borderTop: '1px solid #1e1e30',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: isServerAvailable ? '#4caf50' : '#f44336',
                        } }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 11, color: '#8888aa' }, children: status })] }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 11, color: '#555577' }, children: "NeuroConstructor v1.0.0" })] }));
}
