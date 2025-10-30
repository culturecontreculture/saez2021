import './globals.css'

export const metadata = {
  title: 'Apocalypse - Choix du format',
  description: 'Choisissez le format de vos packs Mélancolie et Symphonie',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
