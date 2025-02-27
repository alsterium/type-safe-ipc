import { useState } from "react";
import ReactDOM from "react-dom/client";
import { ApiReturnTypes } from "./api-types.d";

function App() {
  type LicenseInfo = ApiReturnTypes["licenseApi"]["getLicenseInfo"];
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [greeting, setGreeting] = useState("");

  const fetchLicenseInfo = async () => {
    const result = await window.api.licenseApi.getLicenseInfo();
    setLicenseInfo(result);
  };

  const fetchGreeting = async () => {
    const result = await window.api.greetingsApi.greetings();
    setGreeting(result);
  };

  return (
    <div>
      <h1>Hello, Type-Safe IPC!!</h1>

      {/* ライセンス情報取得 */}
      <button onClick={fetchLicenseInfo}>Get License Info</button>
      {licenseInfo && (
        <p>
          License: {licenseInfo.license} <br />
          Version: {licenseInfo.version}
        </p>
      )}

      {/* 挨拶メッセージ取得 */}
      <button onClick={fetchGreeting}>Get Greeting</button>
      <p>{greeting && `Greeting: ${greeting}`}</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
