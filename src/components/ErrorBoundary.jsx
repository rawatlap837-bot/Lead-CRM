import { Component } from "react";
import { AlertCircle } from "lucide-react";
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("CRM rendering error", error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main
        role="alert"
        className="flex min-h-dvh items-center justify-center bg-slate-50 p-5"
      >
        <section className="card w-full max-w-md p-6 text-center">
          <AlertCircle className="mx-auto mb-4 text-rose-500" size={32} />
          <h1 className="text-xl font-bold">Let’s reconnect your workspace</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            The page couldn’t finish loading. Reload to reconnect to your Supabase
            workspace. Your saved records are safe.
          </p>
          <button
            className="btn-primary mt-6 w-full"
            onClick={() => window.location.reload()}
          >
            Reload workspace
          </button>
        </section>
      </main>
    );
  }
}
