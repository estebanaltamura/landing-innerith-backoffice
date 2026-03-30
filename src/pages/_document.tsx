import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en" className='min-h-[100vh] bg-black'>
      <Head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kulim+Park:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;900&family=Saira:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className='overflow-y-auto scroll-yellow'>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
