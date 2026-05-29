import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
          <div className="text-destructive text-lg font-semibold">应用出现错误</div>
          <pre className="text-xs text-muted-foreground max-w-lg text-center whitespace-pre-wrap bg-muted p-4 rounded-lg">
            {this.state.error.message}
          </pre>
          <Button
            onClick={() => {
              this.setState({ error: null })
              window.location.reload()
            }}
          >
            重新加载
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
