import './globals.css'

export const metadata = {
  title: 'Saez 2021 - Demande de remboursement des disques',
  description: 'Demande de remboursement pour les offres Mélancolie et Symphonie des Siècles',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
