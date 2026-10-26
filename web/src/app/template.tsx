/** Re-mounts on every page change, so each page fades/rises in. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="anim-page">{children}</div>;
}
