interface StatusBarProps {
  status: string;
  isServerAvailable: boolean;
}

export function StatusBar({ status, isServerAvailable }: StatusBarProps) {
  return (
    <div style={{
      padding: '8px 16px',
      background: '#0a0a0f',
      borderTop: '1px solid #1e1e30',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: isServerAvailable ? '#4caf50' : '#f44336',
        }} />
        <span style={{ fontSize: 11, color: '#8888aa' }}>{status}</span>
      </div>
      <div style={{ fontSize: 11, color: '#555577' }}>
        NeuroConstructor v1.0.0
      </div>
    </div>
  );
}
