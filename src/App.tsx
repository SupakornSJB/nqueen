import './App.css'
import NQueensVisualizer from "./components/Nqueen.tsx";

function App() {
  return (
    <>
      <NQueensVisualizer/>
      <div style={{
        padding: "12px 0 16px",
        textAlign: "center",
        fontSize: 11,
        color: "var(--text)",
        opacity: 0.5,
      }}>
        Built with <a
          href="https://claude.ai"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}
        >Claude</a> by Anthropic
      </div>
    </>
  )
}

export default App
