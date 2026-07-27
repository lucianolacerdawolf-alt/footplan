import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('FootPlan crash:', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="app-screen" style={{ textAlign: 'center', paddingTop: '40vh' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            Algo deu errado
          </div>
          <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 24, fontFamily: 'var(--mono)', maxWidth: 420, margin: '0 auto 24px' }}>
            Tente voltar ao menu principal. Se o erro persistir, recarregue a página.
          </div>
          <button
            className="back-btn-secondary"
            onClick={() => window.location.reload()}
          >
            Recarregar página
          </button>
          <details style={{ marginTop: 16, fontSize: 11, opacity: 0.4, fontFamily: 'var(--mono)', maxWidth: 480, textAlign: 'left', margin: '16px auto 0' }}>
            <summary style={{ cursor: 'pointer' }}>Detalhes técnicos</summary>
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{this.state.error?.message}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
