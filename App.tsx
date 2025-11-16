import React from "react";
import { useTranslation } from "./hooks/useTranslation";

const App: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div style={{ padding: 32 }}>
      <h1>{t("welcome")}</h1>
      <p>{t("goodbye")}</p>
      {/* Put your main navigation and app logic here */}
    </div>
  );
};

export default App;