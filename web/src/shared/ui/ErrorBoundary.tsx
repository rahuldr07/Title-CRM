import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Btn } from './Button'
import { Card } from './Card'
import { Empty } from './Banner'

export function LoadFailed({
  what,
  error,
  onRetry,
}: {
  what: string
  error?: unknown
  onRetry?: (() => void) | undefined
}) {
  const detail = import.meta.env.DEV && error instanceof Error ? error.message : null
  return (
    <Card>
      <Empty
        icon="⚠"
        action={
          onRetry ? (
            <Btn small onClick={onRetry}>
              Try again
            </Btn>
          ) : undefined
        }
      >
        {what} could not be loaded{detail ? ` — ${detail}` : '.'}
      </Empty>
    </Card>
  )
}

interface BoundaryProps {
  children: ReactNode
  what?: string
}

interface BoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <LoadFailed
          what={this.props.what ?? 'This screen'}
          error={this.state.error}
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}
