import React, { useEffect, useState } from "react";
import "./AppToastHost.css";

export default function AppToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const item = e?.detail;
      if (!item?.message && !item?.title) return;
      setItems((prev) => [...prev, item].slice(-4));
      const id = item.id;
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, 3200);
    };
    window.addEventListener("app:toast", onToast);
    return () => window.removeEventListener("app:toast", onToast);
  }, []);

  return (
    <div className="app-toast-host" aria-live="polite" aria-atomic="true">
      {items.map((item) => (
        <div key={item.id} className={`app-toast ${item.type || "info"}`}>
          {item.title ? <div className="app-toast-title">{item.title}</div> : null}
          <div className="app-toast-message">{item.message}</div>
        </div>
      ))}
    </div>
  );
}
