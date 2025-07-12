import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Adapt - AI-Native Form Optimization',
  description:
    'Add one line of code, get 25% better form conversions within 30 days',
  keywords: [
    'form optimization',
    'conversion rate',
    'AI',
    'machine learning',
    'A/B testing',
    'user experience',
  ],
  authors: [{ name: 'Sparsh Jain' }],
  openGraph: {
    title: 'Adapt - AI-Native Form Optimization',
    description:
      'Add one line of code, get 25% better form conversions within 30 days',
    type: 'website',
    siteName: 'Adapt',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Adapt - AI-Native Form Optimization',
    description:
      'Add one line of code, get 25% better form conversions within 30 days',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en'>
      <head>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' href='/favicon.ico' />
      </head>
      <body className={inter.className}>
        <div id='__adapt'>{children}</div>
      </body>
    </html>
  )
}