"use client";

import Script from "next/script";

export function WhelpWidget() {
  return (
    <Script
      src="https://widget.whelp.co/app.js"
      strategy="lazyOnload"
      onLoad={() => {
        if (typeof window !== "undefined" && window.Whelp) {
          window.Whelp("init", {
            app_id: "9712969e2ba645e98bc56be8f2c93d99",
          });
        }
      }}
    />
  );
}
