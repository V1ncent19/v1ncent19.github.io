"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface GoatCounterVariables {
  path?: string;
  title?: string;
  referrer?: string;
  no_session?: boolean;
}

interface GoatCounterClient {
  count?: (variables?: GoatCounterVariables) => void;
}

declare global {
  interface Window {
    goatcounter?: GoatCounterClient;
  }
}

const PRODUCTION_HOSTS = new Set(["tuoruipeng.com", "www.tuoruipeng.com"]);

/**
 * Site-wide GoatCounter integration.
 *
 * GoatCounter's stock script sends one page view when the document loads. This
 * site uses Next.js client navigation, so the root layout instead disables the
 * stock onload request and explicitly sends a view whenever `usePathname()`
 * changes. Keeping the component in the root layout means it survives route
 * transitions and can provide the previous page as an SPA referrer.
 *
 * `no_session` is intentional: the public home statistic is labelled "Page
 * views", not unique visits, so reloads and repeat visits should increment it.
 */
export function GoatCounter({ code }: { code: string }) {
  const pathname = usePathname();
  const [scriptReady, setScriptReady] = useState(false);
  const lastPath = useRef<string | null>(null);
  const referrer = useRef<string | null>(null);

  useEffect(() => {
    if (!scriptReady || !PRODUCTION_HOSTS.has(window.location.hostname)) return;
    if (lastPath.current === pathname) return;

    const timer = window.setTimeout(() => {
      const client = window.goatcounter;
      if (!client?.count) return;

      const trackedPath = window.location.pathname;
      const currentUrl = `${window.location.origin}${trackedPath}`;
      client.count({
        path: trackedPath,
        title: document.title,
        referrer: referrer.current ?? document.referrer,
        no_session: true,
      });

      lastPath.current = pathname;
      referrer.current = currentUrl;
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname, scriptReady]);

  if (!code) return null;

  return (
    <Script
      id="goatcounter"
      src="https://gc.zgo.at/count.v5.js"
      strategy="afterInteractive"
      data-goatcounter={`https://${code}.goatcounter.com/count`}
      data-goatcounter-settings='{"no_onload":true}'
      crossOrigin="anonymous"
      integrity="sha384-atnOLvQb9t+jTSipvd75X2yginT4PjVbqDdlJAmxMm+wYElFmeR6EmLP5bYeoRVQ"
      onLoad={() => setScriptReady(true)}
    />
  );
}
