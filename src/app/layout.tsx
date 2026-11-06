import type { Metadata, Viewport } from "next";
import { Backdrop } from "@/components/Backdrop";
import "./globals.css";

export const metadata: Metadata = {
  title: "THE LAST HUMAN",
  description: "Un incremental game narratif : de l'ordinateur de 1990 jusqu'à la fin de l'humanité, telle qu'on la connaît.",
};

export const viewport: Viewport = {
  themeColor: "#0c0a06",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // safe-area insets for the bottom tab bar
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Backdrop />
        {children}
      </body>
    </html>
  );
}
