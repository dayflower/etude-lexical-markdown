import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <section>
      <div>
        <h1>Get started</h1>
        <p>
          Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
        </p>
      </div>
      <button type="button" onClick={() => setCount((count) => count + 1)}>
        Count is {count}
      </button>
    </section>
  );
}

export default App;
