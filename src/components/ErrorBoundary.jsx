import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔴 Calculator Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-950 p-6">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-500 mb-2">Error de Carga</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              La calculadora no pudo cargar correctamente. Esto puede deberse a datos corruptos o problemas de compatibilidad.
            </p>
            <button
              onClick={() => {
                // [AUDIT FIX] Solo borrar historial de cálculo, NO las cuentas del usuario
                localStorage.removeItem('calc_history');
                window.location.reload();
              }}
              className="px-6 py-3 bg-brand text-slate-900 rounded-xl font-bold hover:brightness-110 transition-all"
            >
              Limpiar y Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
