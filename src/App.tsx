import React, { useState } from "react";
import { Opportunity, Archives, StatusOrNew } from "./lib/types";

const App: React.FC = () => {
  const [archives, setArchives] = useState<Archives>({
    sent: [],
    won: [],
    lost: [],
    deleted: []
  });

  const status: StatusOrNew = "to_do";

  return (
    <div>
      <h1>Kanban Test App</h1>
      <p>Current status: {status}</p>
    </div>
  );
};

export default App;
