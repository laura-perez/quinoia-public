import { Html, Head, Main, NextScript } from 'next/document'
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
          strategy="afterInteractive"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
        <Analytics />
      </body>
    </Html>
  )
}