export type IconName =
  | "edit"
  | "send"
  | "unlock"
  | "eye-off"
  | "loader"
  | "chevron-down"
  | "logout"
  | "camera"
  | "maximize"
  | "minimize"
  | "close"
  | "trash"
  | "bell"
  | "briefcase"
  | "users"
  | "calendar"
  | "pin"
  | "search"
  | "check"
  | "spark"
  | "profile"
  | "mail"
  | "grid"
  | "eye"
  | "lock";
const paths: Record<IconName, string> = {
  edit: "m16 3 5 5M14 5l5 5-11 11H3v-5L14 5Z",
  send: "m22 2-7 20-4-9-9-4L22 2ZM11 13 22 2",
  unlock: "M8 10V7a4 4 0 0 1 7-3M6 10h12a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2ZM12 14v3",
  "eye-off": "m3 3 18 18M10 5a12 12 0 0 1 2 0c7 0 10 7 10 7a18 18 0 0 1-4 5M6 6a19 19 0 0 0-4 6s3 7 10 7a13 13 0 0 0 5-1M10 10a3 3 0 0 0 4 4",
  loader: "M21 12a9 9 0 1 1-9-9",
  "chevron-down": "m6 9 6 6 6-6",
  logout: "M9 3H4v18h5M10 12h11m-4-4 4 4-4 4",
  camera: "M9 4h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l2-3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  close: "m6 6 12 12M6 18 18 6",
  maximize: "M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5",
  minimize: "M3 8h5V3M21 8h-5V3M16 21v-5h5M8 21v-5H3",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4",
  eye: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M6 10h12a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2ZM12 14v3",
  briefcase:
    "M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 11l9 5 9-5M5 7h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  calendar:
    "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8 14h2M14 14h2M8 18h2",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  check: "m5 12 4 4L19 6",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  profile: "M20 21a8 8 0 0 0-16 0M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  mail: "m3 6 9 7 9-7M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  grid: "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z",
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
