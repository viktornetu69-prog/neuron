const SUGGESTIONS = [
  { text: 'Загрузить teacher модель', icon: '🧠' },
  { text: 'Создать student модель', icon: '📦' },
  { text: 'Проверить статус сервера', icon: '⚡' },
  { text: 'Запустить Stage 6 цикл', icon: '🔄' },
];

export function HeroDock() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: 40,
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: 40,
      }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#e8e8e8',
          marginBottom: 12,
        }}>
          🧠 NeuroConstructor
        </h1>
        <p style={{
          fontSize: 16,
          color: '#8888aa',
          maxWidth: 400,
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          Создавайте локальные нейронные сети, переиспользуя существующие знания
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        maxWidth: 400,
        width: '100%',
      }}>
        {SUGGESTIONS.map((suggestion, index) => (
          <button
            key={index}
            style={{
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
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#7c6ff7';
              (e.currentTarget as HTMLButtonElement).style.background = '#1a1a2e';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e1e30';
              (e.currentTarget as HTMLButtonElement).style.background = '#121220';
            }}
          >
            <span style={{ fontSize: 20 }}>{suggestion.icon}</span>
            <span>{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
