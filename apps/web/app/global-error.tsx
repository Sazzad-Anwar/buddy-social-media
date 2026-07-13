'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "'Poppins', sans-serif",
          background: 'var(--bg1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '100px 0px',
          }}
        >
          <div
            style={{
              background: 'var(--bg2)',
              padding: '48px',
              borderRadius: '6px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <h2
              style={{
                fontSize: '28px',
                textAlign: 'center',
                marginBottom: '12px',
              }}
            >
              Application Error
            </h2>
            <p
              style={{
                fontWeight: 'normal',
                lineHeight: 1.4,
                color: 'var(--color)',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              A critical error occurred. Please refresh the page.
            </p>
            <button
              onClick={() => reset()}
              style={{
                border: '1px solid var(--bcolor1)',
                background: 'var(--bg2)',
                borderRadius: '6px',
                padding: '12px 60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontWeight: 500,
                  fontSize: '16px',
                  lineHeight: 1.4,
                  color: 'var(--color2)',
                }}
              >
                Refresh page
              </span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
