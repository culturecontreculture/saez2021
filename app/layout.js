import './globals.css'

export const metadata = {
  title: 'Saez 2021 - Choix du support audio',
  description: 'Choisissez le support audio de vos packs Mélancolie et Symphonie des Siècles',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
