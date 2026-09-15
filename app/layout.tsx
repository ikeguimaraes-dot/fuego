import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Fuego — Comida de verdade. Rotina com sabor.",
  description:
    "Marmitas com personalidade para uma rotina mais gostosa. Conheça a Fuego e ajude a escolher o cardápio da semana.",
  metadataBase: new URL("https://fuego-omega.vercel.app"),
  openGraph: {
    title: "Fuego — Sua semana pede mais sabor.",
    description:
      "Comida de verdade, feita para a sua rotina. Vote no próximo cardápio.",
    locale: "pt_BR",
    type: "website",
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
