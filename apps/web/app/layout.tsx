import "./globals.css";
export const metadata = { title: "Mise", description: "The food business operating system" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
