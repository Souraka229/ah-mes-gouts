"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  sectionName: string;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
  message?: string;
};

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.sectionName}]`, error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="mx-auto max-w-lg rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center"
        >
          <AlertTriangle
            className="mx-auto size-8 text-destructive"
            aria-hidden
          />
          <h2 className="mt-3 font-display text-lg font-semibold text-primary">
            Un problème est survenu
          </h2>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            La section « {this.props.sectionName} » n&apos;a pas pu s&apos;afficher.
            Vos données ne sont pas perdues — réessayez ou revenez à l&apos;accueil.
          </p>
          {process.env.NODE_ENV === "development" && this.state.message && (
            <p className="mt-2 font-mono text-xs text-destructive">
              {this.state.message}
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer gap-2"
              onClick={this.handleReset}
            >
              <RefreshCw className="size-4" aria-hidden />
              Réessayer
            </Button>
            <Button
              type="button"
              className="cursor-pointer bg-primary text-white"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Accueil
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
