import { useState } from "react";
import Icon from "./Icon";

// Fetches a mock shareable link on demand and copies it to the clipboard —
// the clipboard write is real; only the URL it copies is a mock endpoint.
export default function ShareLinkButton({ getLink, label = "Share", className = "" }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setBusy(true);
    setError("");
    try {
      const { url } = await getLink();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't generate a link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start">
      <button
        onClick={handleClick}
        disabled={busy}
        className={`flex items-center gap-1.5 border border-[#E5E7EB] text-[#0B1F17] px-4 py-2 rounded-lg text-sm hover:bg-[#F7FAF8] transition-colors duration-200 disabled:opacity-60 ${className}`}
      >
        <Icon name="link" className="w-4 h-4" />
        {busy ? "Generating link…" : copied ? "Link copied!" : label}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
