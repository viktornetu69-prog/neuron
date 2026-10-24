"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatArea = ChatArea;
const jsx_runtime_1 = require("react/jsx-runtime");
function ChatArea({ messages, inputText, onInputTextChange, onSendMessage, onClearChat, isLoading, isServerAvailable, }) {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage(inputText);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#0a0a0f',
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    padding: '16px 24px',
                    borderBottom: '1px solid #1e1e30',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { style: { fontSize: 16, fontWeight: 600, margin: 0, color: '#e8e8e8' }, children: "\uD83D\uDCAC \u0427\u0430\u0442" }), (0, jsx_runtime_1.jsxs)("p", { style: { fontSize: 12, color: '#8888aa', margin: '2px 0 0 0' }, children: [messages.length, " \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439"] })] }), (0, jsx_runtime_1.jsx)("button", { onClick: onClearChat, style: {
                            padding: '6px 12px',
                            background: 'transparent',
                            border: '1px solid #1e1e30',
                            borderRadius: 6,
                            color: '#8888aa',
                            cursor: 'pointer',
                            fontSize: 12,
                        }, children: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C" })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                    flex: 1,
                    overflowY: 'auto',
                    padding: 24,
                }, children: messages.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { style: {
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#8888aa',
                    }, children: [(0, jsx_runtime_1.jsx)("p", { style: { fontSize: 14, marginBottom: 16 }, children: "\u041E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0447\u0442\u043E\u0431\u044B \u043D\u0430\u0447\u0430\u0442\u044C..." }), !isServerAvailable && ((0, jsx_runtime_1.jsx)("p", { style: { fontSize: 12, color: '#f44336' }, children: "\u26A0\uFE0F \u0421\u0435\u0440\u0432\u0435\u0440 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D" }))] })) : ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [messages.map((msg, index) => ((0, jsx_runtime_1.jsx)(MessageBubble, { message: msg }, index))), isLoading && ((0, jsx_runtime_1.jsxs)("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '12px 16px',
                                background: '#121220',
                                borderRadius: 12,
                                maxWidth: '70%',
                            }, children: [(0, jsx_runtime_1.jsx)("div", { style: {
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: '#7c6ff7',
                                        animation: 'pulse 1.5s infinite',
                                    } }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 13, color: '#8888aa' }, children: "\u0414\u0443\u043C\u0430\u044E..." })] }))] })) }), (0, jsx_runtime_1.jsx)("div", { style: {
                    padding: '16px 24px',
                    borderTop: '1px solid #1e1e30',
                    background: '#121220',
                }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                    }, children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: inputText, onChange: e => onInputTextChange(e.target.value), onKeyDown: handleKeyDown, placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435...", disabled: isLoading, style: {
                                flex: 1,
                                padding: '12px 16px',
                                background: '#1a1a2e',
                                border: '1px solid #1e1e30',
                                borderRadius: 10,
                                color: '#e8e8e8',
                                fontSize: 14,
                                outline: 'none',
                            } }), (0, jsx_runtime_1.jsx)("button", { onClick: () => onSendMessage(inputText), disabled: isLoading || !inputText.trim(), style: {
                                padding: '12px 20px',
                                background: inputText.trim() ? '#7c6ff7' : '#1e1e30',
                                border: 'none',
                                borderRadius: 10,
                                color: 'white',
                                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                                fontSize: 14,
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                            }, children: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C" })] }) }), (0, jsx_runtime_1.jsx)("style", { children: `
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      ` })] }));
}
function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    return ((0, jsx_runtime_1.jsx)("div", { style: {
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
        }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                maxWidth: '75%',
                padding: '12px 16px',
                background: isUser ? '#7c6ff7' : '#121220',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                color: isUser ? 'white' : '#e8e8e8',
            }, children: [(0, jsx_runtime_1.jsx)("p", { style: {
                        fontSize: 14,
                        lineHeight: 1.5,
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }, children: message.content }), (0, jsx_runtime_1.jsx)("p", { style: {
                        fontSize: 11,
                        color: isUser ? 'rgba(255,255,255,0.6)' : '#8888aa',
                        margin: '6px 0 0 0',
                    }, children: message.timestamp })] }) }));
}
