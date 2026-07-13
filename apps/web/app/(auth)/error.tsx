'use client';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 20,
        textAlign: 'center',
      }}
    >
      <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
        Authentication Error
      </h2>
      <p style={{ color: '#666', marginBottom: 20, maxWidth: 400 }}>
        {error.message || 'An error occurred during authentication.'}
      </p>
      <button
        onClick={() => reset()}
        style={{
          padding: '10px 24px',
          backgroundColor: '#1890ff',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Try again
      </button>
    </div>
  );
}
