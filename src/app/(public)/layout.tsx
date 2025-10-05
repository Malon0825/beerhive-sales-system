/**
 * Public Layout
 * 
 * Layout for public-facing pages (no authentication required)
 * Used for customer-facing features like order monitoring via QR codes
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
