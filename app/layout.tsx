import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Syne } from "next/font/google";

import { ThemeProvider } from "@/components/layout/theme-provider";
import "./globals.css";

/**
 * Três famílias, cada uma com um papel (identidade v2):
 *   Syne          — títulos e números de métrica, com letter-spacing negativo
 *   DM Sans       — corpo e UI
 *   IBM Plex Mono — valores, labels e metadata, em uppercase com tracking
 */
const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const description =
  "CRM simples para pequenas empresas: leads, pipeline de vendas e métricas em um só lugar.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PipeFlow CRM — seu funil de vendas em uma tela",
    template: "%s · PipeFlow CRM",
  },
  description,
  keywords: [
    "CRM",
    "pipeline de vendas",
    "gestão de leads",
    "funil de vendas",
    "CRM para pequenas empresas",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "PipeFlow CRM",
    title: "PipeFlow CRM — seu funil de vendas em uma tela",
    description,
  },
  // Sem imagem de compartilhamento por enquanto: o gerador dinâmico do
  // next/og não roda no Windows (bug de path no @vercel/og empacotado no
  // Next 14). Quando existir um PNG estático, ele entra em `openGraph.images`
  // e o card volta a ser `summary_large_image`.
  twitter: {
    card: "summary",
    title: "PipeFlow CRM — seu funil de vendas em uma tela",
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${dmSans.variable} ${plexMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
