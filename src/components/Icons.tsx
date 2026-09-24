import type { ReactNode } from "react";

export type IconName =
  | "grid" | "sales" | "users" | "box" | "settings" | "sun" | "moon" | "upload" | "download" | "search" | "bell"
  | "chevron" | "arrow" | "expand" | "edit" | "pin" | "close" | "zap" | "check" | "trend" | "shield" | "database"
  | "globe" | "refresh" | "filter" | "menu" | "plus" | "file" | "palette" | "save" | "external"
  | "mail" | "truck" | "alert" | "cart" | "bank" | "ops";

const paths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  sales: <><path d="M4 19V5" /><path d="M4 19h17" /><path d="m7 15 3-4 3 2 5-7" /><path d="M18 6h2v2" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  box: <><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /><path d="m7.5 5.5 9 5" /></>,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.41 1.41-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.41-1.41.06-.06A1.7 1.7 0 0 0 9.4 15a1.7 1.7 0 0 0-1.56-1.03H7v-2h.84A1.7 1.7 0 0 0 9.4 11a1.7 1.7 0 0 0-.34-1.88L9 9.06l1.41-1.41.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 13.38 6.5V6h2v.5a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.41 1.41-.06.06A1.7 1.7 0 0 0 19.4 11c.17.58.7.97 1.3.97H21v2h-.3c-.6 0-1.13.4-1.3 1.03Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></>,
  moon: <path d="M20.6 15.3A8.5 8.5 0 0 1 8.7 3.4 8.5 8.5 0 1 0 20.6 15.3Z" />,
  upload: <><path d="M12 16V3" /><path d="m7 8 5-5 5 5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>,
  download: <><path d="M12 3v13" /><path d="m7 11 5 5 5-5" /><path d="M4 21h16" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  arrow: <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
  expand: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" /><path d="m3 8 6-6M21 8l-6-6M3 16l6 6M21 16l-6 6" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
  pin: <><path d="m15 4 5 5" /><path d="M9 20 4 15" /><path d="m14 5-8 8 5 5 8-8" /><path d="M12 12 3 21" /></>,
  close: <><path d="M6 6l12 12M18 6 6 18" /></>,
  zap: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  trend: <><path d="M3 17 9 11l4 4 8-9" /><path d="M16 6h5v5" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  refresh: <><path d="M20 11a8.1 8.1 0 0 0-14.7-4L3 10" /><path d="M3 4v6h6" /><path d="M4 13a8.1 8.1 0 0 0 14.7 4L21 14" /><path d="M21 20v-6h-6" /></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
  menu: <><path d="M5 7h14M5 12h14M5 17h14" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>,
  palette: <><path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4h-.5a2 2 0 0 1 0-4h3.5a4.5 4.5 0 0 0 0-9Z" /><circle cx="7.5" cy="10" r=".7" fill="currentColor" /><circle cx="10" cy="6.8" r=".7" fill="currentColor" /><circle cx="15" cy="7" r=".7" fill="currentColor" /></>,
  save: <><path d="M5 3h12l2 2v16H5Z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>,
  external: <><path d="M14 3h7v7M21 3l-9 9" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
  truck: <><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></>,
  alert: <><path d="M10.3 3.66 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.66a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  cart: <><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57L23 6H6" /></>,
  bank: <><path d="m12 2 9 5H3l9-5Z" /><path d="M5 7v10M10 7v10M14 7v10M19 7v10" /><path d="M3 21h18" /></>,
  ops: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="6" /><path d="M12 10v2l1.5 1.5" /></>,
};

export function Icon({ name, size = 18, className = "", style }: { name: IconName; size?: number; className?: string; style?: import("react").CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
      {paths[name]}
    </svg>
  );
}
