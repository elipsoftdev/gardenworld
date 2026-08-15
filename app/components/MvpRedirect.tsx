"use client";

import { useEffect } from "react";

export default function MvpRedirect() {
  useEffect(() => {
    window.location.replace("/");
  }, []);

  return <main aria-busy="true" aria-label="Redirigiendo a Garden World" />;
}
