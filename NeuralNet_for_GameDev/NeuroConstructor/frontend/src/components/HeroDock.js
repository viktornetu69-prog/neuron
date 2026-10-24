"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeroDock = HeroDock;
const jsx_runtime_1 = require("react/jsx-runtime");
const SUGGESTIONS = [
    { text: 'Загрузить teacher модель', icon: '🧠' },
    { text: 'Создать student модель', icon: '📦' },
    { text: 'Проверить статус сервера', icon: '⚡' },
    { text: 'Запустить Stage 6 цикл', icon: '🔄' },
];
function HeroDock() {
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 40,
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    textAlign: 'center',
                    marginBottom: 40,
                }, children: [(0, jsx_runtime_1.jsx)("h1", { style: {
                            fontSize: 32,
                            fontWeight: 700,
                            color: '#e8e8e8',
                            marginBottom: 12,
                        }, children: "\uD83E\uDDE0 NeuroConstructor" }), (0, jsx_runtime_1.jsx)("p", { style: {
                            fontSize: 16,
                            color: '#8888aa',
                            maxWidth: 400,
                            margin: '0 auto',
                            lineHeight: 1.6,
                        }, children: "\u0421\u043E\u0437\u0434\u0430\u0432\u0430\u0439\u0442\u0435 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u043D\u0435\u0439\u0440\u043E\u043D\u043D\u044B\u0435 \u0441\u0435\u0442\u0438, \u043F\u0435\u0440\u0435\u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044F \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 \u0437\u043D\u0430\u043D\u0438\u044F" })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    maxWidth: 400,
                    width: '100%',
                }, children: SUGGESTIONS.map((suggestion, index) => ((0, jsx_runtime_1.jsxs)("button", { style: {
                        padding: '16px 20px',
                        background: '#121220',
                        border: '1px solid #1e1e30',
                        borderRadius: 12,
                        color: '#e8e8e8',
                        cursor: 'pointer',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        transition: 'all 0.2s ease',
                    }, onMouseEnter: e => {
                        e.currentTarget.style.borderColor = '#7c6ff7';
                        e.currentTarget.style.background = '#1a1a2e';
                    }, onMouseLeave: e => {
                        e.currentTarget.style.borderColor = '#1e1e30';
                        e.currentTarget.style.background = '#121220';
                    }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 20 }, children: suggestion.icon }), (0, jsx_runtime_1.jsx)("span", { children: suggestion.text })] }, index))) })] }));
}
