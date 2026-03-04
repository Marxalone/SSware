import { Space_Grotesk, JetBrains_Mono, Rajdhani } from 'next/font/google'
import './globals.css'

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata = {
  title: 'KnightBot Panel',
  description: 'WhatsApp Bot Hosting Dashboard',
  icons: { icon: '/favicon.ico' }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${rajdhani.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-knight-bg text-knight-text font-body antialiased">
        {children}
      </body>
    </html>
  )
}
