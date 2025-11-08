/* eslint-disable react/no-unescaped-entities */
"use client";
import { useState, useEffect } from "react";

export default function AdminRefundsPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mot de passe (à changer dans le code ou mettre en variable d'environnement)
  const ADMIN_PASSWORD = "Saez2021Admin";

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError("");
      loadStats();
    } else {
      setError("Mot de passe incorrect");
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin-stats", {
        headers: {
          "Authorization": `Bearer ${password}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        setError("Erreur lors du chargement des statistiques");
      }
    } catch (err) {
      console.error("Erreur:", err);
      setError("Erreur lors du chargement des statistiques");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white text-xs">
        <div className="text-center max-w-md px-4">
          <h1 className="mb-6 text-sm tracking-widest text-gray-400 uppercase">
            ADMIN - STATISTIQUES REMBOURSEMENTS
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            onKeyPress={handleKeyPress}
            className="bg-black border border-gray-700 text-white p-2 mb-4 w-full text-center focus:border-gray-500 outline-none"
            placeholder="MOT DE PASSE"
          />
          <button
            onClick={handleLogin}
            className="border border-gray-700 px-4 py-2 w-full hover:bg-gray-900 transition"
          >
            SE CONNECTER
          </button>
          {error && (
            <p className="mt-4 text-red-400 text-xs">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white text-xs p-4">
      <div className="max-w-6xl mx-auto pt-8 pb-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-sm tracking-widest text-gray-400 uppercase">
            ADMIN - STATISTIQUES REMBOURSEMENTS
          </h1>
          <button
            onClick={() => loadStats()}
            className="border border-gray-700 px-4 py-2 hover:bg-gray-900 transition text-xs"
          >
            🔄 ACTUALISER
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-300"></div>
          </div>
        ) : stats ? (
          <>
            {/* STATISTIQUES GLOBALES */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-900 border border-gray-800 p-6 rounded text-center">
                <p className="text-gray-500 mb-2 uppercase text-xs">Total à rembourser</p>
                <p className="text-3xl font-bold text-green-400">{stats.totalMontant.toLocaleString('fr-FR')}€</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-6 rounded text-center">
                <p className="text-gray-500 mb-2 uppercase text-xs">Demandes reçues</p>
                <p className="text-3xl font-bold text-blue-400">{stats.demandesRecues}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-6 rounded text-center">
                <p className="text-gray-500 mb-2 uppercase text-xs">En attente</p>
                <p className="text-3xl font-bold text-amber-400">{stats.enAttente}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-6 rounded text-center">
                <p className="text-gray-500 mb-2 uppercase text-xs">Taux de réponse</p>
                <p className="text-3xl font-bold text-purple-400">{stats.tauxReponse}%</p>
              </div>
            </div>

            {/* MONTANTS DÉTAILLÉS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-900 border border-gray-800 p-6 rounded">
                <h2 className="text-gray-300 mb-4 uppercase text-xs border-b border-gray-700 pb-2">
                  Remboursements traités
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Montant traité :</span>
                    <span className="text-green-400 font-bold">{stats.montantTraite.toLocaleString('fr-FR')}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nombre de demandes :</span>
                    <span className="text-gray-300">{stats.demandesRecues}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 p-6 rounded">
                <h2 className="text-gray-300 mb-4 uppercase text-xs border-b border-gray-700 pb-2">
                  En attente de demande
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Montant restant :</span>
                    <span className="text-amber-400 font-bold">{stats.montantEnAttente.toLocaleString('fr-FR')}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Clients n'ayant pas répondu :</span>
                    <span className="text-gray-300">{stats.enAttente}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RÉPARTITION PAR PACK */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded mb-8">
              <h2 className="text-gray-300 mb-4 uppercase text-xs border-b border-gray-700 pb-2">
                Répartition par pack
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-gray-400 mb-3 text-xs">MÉLANCOLIE</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total packs :</span>
                      <span className="text-gray-300">{stats.packsDetails.melancolie.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Avec demande :</span>
                      <span className="text-blue-400">{stats.packsDetails.melancolie.avecDemande}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Montant total :</span>
                      <span className="text-green-400">{(stats.packsDetails.melancolie.total * 15).toLocaleString('fr-FR')}€</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-gray-400 mb-3 text-xs">SYMPHONIE DES SIÈCLES</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total packs :</span>
                      <span className="text-gray-300">{stats.packsDetails.symphonie.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Avec demande :</span>
                      <span className="text-blue-400">{stats.packsDetails.symphonie.avecDemande}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Montant total :</span>
                      <span className="text-green-400">{(stats.packsDetails.symphonie.total * 15).toLocaleString('fr-FR')}€</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DERNIÈRES DEMANDES */}
            {stats.dernieresDemandes && stats.dernieresDemandes.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 p-6 rounded">
                <h2 className="text-gray-300 mb-4 uppercase text-xs border-b border-gray-700 pb-2">
                  Dernières demandes (10 plus récentes)
                </h2>
                <div className="space-y-2">
                  {stats.dernieresDemandes.map((demande, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-800">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-500 text-xs">{new Date(demande.date).toLocaleDateString('fr-FR')}</span>
                        <span className="text-gray-500 text-xs">{new Date(demande.date).toLocaleTimeString('fr-FR')}</span>
                        <span className="text-gray-400">{demande.melancolie > 0 ? `${demande.melancolie} Mél.` : ''} {demande.symphonie > 0 ? `${demande.symphonie} Symp.` : ''}</span>
                      </div>
                      <span className="text-green-400 font-bold">{demande.montant}€</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-gray-500">
            Aucune donnée disponible
          </div>
        )}
      </div>
    </div>
  );
}
