import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./primitives";

interface ErrorBoundaryState {
  failed: boolean;
}

export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "Error inesperado al renderizar AgroSense:",
      error,
      info.componentStack,
    );
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main
        className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center"
        role="alert"
      >
        <h1 className="font-display text-2xl font-semibold text-text-primary">
          No se pudo mostrar esta pantalla
        </h1>
        <p className="text-sm text-text-secondary">
          Ocurrió un error inesperado. Recarga la aplicación para volver a intentarlo.
        </p>
        <Button onClick={() => window.location.reload()}>Recargar aplicación</Button>
      </main>
    );
  }
}
