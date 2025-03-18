import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/lib/providers'
import { Navbar } from '@/components/navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'oarthur.dev - Desenvolvimento de Software Personalizado',
  description: 'Soluções personalizadas em desenvolvimento de software: Sites, Apps, Bots, APIs e mais.',
  metadataBase: new URL('https://oarthur.dev'),
  openGraph: {
    title: 'oarthur.dev',
    description: 'Desenvolvimento de Software Personalizado',
    url: 'https://oarthur.dev',
    siteName: 'oarthur.dev',
    locale: 'pt_BR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  )
}