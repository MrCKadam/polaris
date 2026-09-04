import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Antarctic Navigator crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="crash-screen">
          <div className="crash-box">
            <h2>Something went wrong</h2>
            <p>The app hit an unexpected error. This usually clears up with a refresh.</p>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
