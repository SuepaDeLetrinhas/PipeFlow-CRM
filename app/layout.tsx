import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ThemeProvider } from "@/components/layout/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
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
      <body className={`${inter.variable} font-sans antialiased`}>
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
