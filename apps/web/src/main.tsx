import { StrictMode, Component, type ReactNode, type ErrorInfo } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Pracownia:", error, info);
  }
  render() {
    return this.state.error ? (
      <main style={{ padding: 40, fontFamily: "system-ui" }}>
        <h1>Nie udało się otworzyć pracowni</h1>
        <p>{this.state.error}</p>
        <p>Zapis w IndexedDB pozostał zachowany.</p>
        <button onClick={() => location.reload()}>Spróbuj ponownie</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
