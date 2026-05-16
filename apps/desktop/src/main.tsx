import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@repo/ui/providers/query-provider";

import App from "./App";
import { queryClient } from "./lib/api";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
