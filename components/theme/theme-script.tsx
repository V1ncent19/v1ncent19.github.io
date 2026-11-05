import Script from "next/script";

/**
 * Inline theme initializer that runs before hydration so the page never
 * flashes light when the user prefers (or stored) dark mode.
 *
 * The stored mode is one of "light" | "dark" | "system" (default "system").
 * The `<html>` element carries both the resolved `.dark` class and a
 * `data-theme` attribute equal to the *chosen* mode, so CSS can show the
 * right toggle icon and the runtime can react to OS theme changes while the
 * user is in "system" mode.
 */
const INIT = `(function(){try{var r=document.documentElement;var k='theme';var mq=window.matchMedia('(prefers-color-scheme: dark)');function mode(){var m;try{m=localStorage.getItem(k)||'system';}catch(e){m='system';}return m;}function apply(){var m=mode();var dark=m==='dark'||(m==='system'&&mq.matches);r.classList.toggle('dark',dark);r.setAttribute('data-theme',m);}apply();function onOsChange(){if((r.getAttribute('data-theme')||'system')==='system')apply();}if(mq.addEventListener){mq.addEventListener('change',onOsChange);}else if(mq.addListener){mq.addListener(onOsChange);}}catch(e){}})();`;

export function ThemeScript() {
  return (
    <Script
      id="theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: INIT }}
    />
  );
}
