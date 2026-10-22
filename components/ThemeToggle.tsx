"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  // The theme is set on <html> by a tiny script in layout.tsx before first paint; read it here.
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("mycron-theme", next);
    } catch {
      // storage can be blocked; the choice just won't be remembered
    }
    setTheme(next);
  }

  return (
    <button className="icon-btn" onClick={toggle} aria-label="Switch between light and dark theme" title="Switch theme">
      <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
    </button>
  );
}
