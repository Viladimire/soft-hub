import { useEffect } from "react";

export default function Monitoring() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      const script = document.createElement("script");
      script.defer = true;
      script.src = "https://plausible.io/js/script.js";
      script.dataset.domain = "soft-hub";
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }

    return undefined;
  }, []);

  return null;
}
