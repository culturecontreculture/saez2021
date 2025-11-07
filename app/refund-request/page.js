/* eslint-disable react/no-unescaped-entities */
"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function RefundRequestContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Adresse
  const [adresse1, setAdresse1] = useState("");
  const [adresse2, setAdresse2] = useState("");
  const [codepostal, setCodepostal] = useState("");
  const [ville, setVille] = useState("");
  const [pays, setPays] = useState("France");

  // Coordonnées bancaires
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");

  // Date limite
  const DATE_LIMITE = new Date("2025-11-25T23:59:59");
  const isAfterDeadline = new Date() > DATE_LIMITE;

  useEffect(() => {
    if (!token) {
      setError("Lien invalide. Veuillez demander un nouveau lien.");
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch("/api/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "TOKEN_EXPIRED") {
          setError("Ce lien a expiré. Veuillez demander un nouveau lien.");
        } else if (data.error === "TOKEN_INVALID") {
          setError("Lien invalide. Veuillez demander un nouveau lien.");
        } else {
          setError("Une erreur s'est produite. Veuillez réessayer.");
        }
        setLoading(false);
        return;
      }

      setCustomer(data.customer);

      // Initialiser les champs
      setAdresse1(data.customer.adresse1 || "");
      setAdresse2(data.customer.adresse2 || "");
      setCodepostal(data.customer.codepostal || "");
      setVille(data.customer.ville || "");
      setPays(data.customer.pays || "France");
      setIban(data.customer.iban || "");
      setBic(data.customer.bic || "");

      setLoading(false);
    } catch (err) {
      console.error("Erreur validation token:", err);
      setError("Une erreur s'est produite. Veuillez réessayer.");
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation adresse
    if (!adresse1.trim() || !codepostal.trim() || !ville.trim() || !pays.trim()) {
      setError("Veuillez remplir tous les champs d'adresse obligatoires.");
      return;
    }

    // Validation coordonnées bancaires
    if (!iban.trim() || !bic.trim()) {
      setError("Veuillez renseigner votre IBAN et votre BIC.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/save-refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          address: {
            adresse1: adresse1.trim(),
            adresse2: adresse2.trim(),
            codepostal: codepostal.trim(),
            ville: ville.trim(),
            pays: pays.trim(),
          },
          bankDetails: {
            iban: iban.trim(),
            bic: bic.trim(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur s'est produite.");
        setSaving(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      setError("Une erreur s'est produite. Veuillez réessayer.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white text-xs uppercase">
        <div className="text-center max-w-md px-4">
          <h1 className="mb-6 text-sm tracking-widest text-gray-400">
            SAEZ 2021
          </h1>
          <p className="text-red-400 mb-6 normal-case">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="border border-gray-700 px-4 py-2 hover:bg-gray-900 transition"
          >
            DEMANDER UN NOUVEAU LIEN
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white text-xs uppercase">
        <div className="text-center max-w-md px-4">
          <h1 className="mb-6 text-sm tracking-widest text-gray-400">
            SAEZ 2021
          </h1>
          <div className="mb-6">
            <svg
              className="w-16 h-16 mx-auto text-green-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-green-400 mb-4">DEMANDE ENREGISTRÉE</p>
            <p className="text-gray-400 text-xs normal-case">
              Vous recevrez un email de confirmation.<br />
              Votre remboursement de {customer.montantRemboursement}€ sera effectué<br />
              dans les meilleurs délais.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white text-xs p-4">
      <div className="max-w-2xl mx-auto pt-8 pb-16">
        <h1 className="mb-8 text-sm tracking-widest text-gray-400 text-center uppercase">
          SAEZ 2021 - DEMANDE DE REMBOURSEMENT
        </h1>

        {customer && (
          <>
            {/* RÉCAPITULATIF */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded mb-6">
              <h2 className="text-gray-300 mb-4 uppercase text-xs">
                RÉCAPITULATIF DE VOTRE COMMANDE
              </h2>
              <div className="space-y-2 text-gray-400">
                {customer.prenomenvoi && (
                  <p className="normal-case">
                    <span className="text-gray-500">Nom :</span>{" "}
                    {customer.prenomenvoi} {customer.nomenvoi}
                  </p>
                )}
                {customer.melancolie > 0 && (
                  <p>
                    <span className="text-gray-500">Packs Mélancolie :</span>{" "}
                    {customer.melancolie} × 15€
                  </p>
                )}
                {customer.symphonie > 0 && (
                  <p>
                    <span className="text-gray-500">Packs Symphonie des Siècles :</span>{" "}
                    {customer.symphonie} × 15€
                  </p>
                )}
                <p className="text-green-400 font-bold text-sm pt-2 border-t border-gray-700">
                  Montant du remboursement : {customer.montantRemboursement}€
                </p>
              </div>
            </div>

            {/* AVERTISSEMENT DATE LIMITE */}
            {isAfterDeadline ? (
              <div className="bg-red-900 bg-opacity-20 border border-red-800 p-6 rounded mb-6 text-center">
                <p className="text-red-400 text-xs">
                  ⚠️ La date limite du 25 novembre est dépassée.<br/>
                  Il n'est plus possible de demander un remboursement.
                </p>
              </div>
            ) : (
              <div className="bg-amber-900 bg-opacity-20 border border-amber-800 p-6 rounded mb-6">
                <h2 className="text-amber-400 mb-3 uppercase text-xs">
                  ⚠️ IMPORTANT
                </h2>
                <p className="text-gray-300 text-xs normal-case">
                  Vous pouvez encore faire votre demande jusqu'au <strong>25 novembre</strong>.<br/>
                  Après cette date, il ne sera plus possible de demander un remboursement.<br/>
                  Le remboursement sera effectué le <strong>5 décembre</strong>.
                </p>
              </div>
            )}

            {/* ADRESSE POSTALE */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded mb-6">
              <h2 className="text-gray-300 mb-4 uppercase text-xs">
                ADRESSE POSTALE
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-500 mb-2 uppercase text-xs">
                    Adresse *
                  </label>
                  <input
                    type="text"
                    value={adresse1}
                    onChange={(e) => {
                      setAdresse1(e.target.value);
                      setError("");
                    }}
                    disabled={isAfterDeadline}
                    className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none normal-case disabled:opacity-50"
                    placeholder="Numéro et nom de rue"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 mb-2 uppercase text-xs">
                    Complément d'adresse
                  </label>
                  <input
                    type="text"
                    value={adresse2}
                    onChange={(e) => {
                      setAdresse2(e.target.value);
                      setError("");
                    }}
                    disabled={isAfterDeadline}
                    className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none normal-case disabled:opacity-50"
                    placeholder="Appartement, bâtiment, etc."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-500 mb-2 uppercase text-xs">
                      Code postal *
                    </label>
                    <input
                      type="text"
                      value={codepostal}
                      onChange={(e) => {
                        setCodepostal(e.target.value);
                        setError("");
                      }}
                      disabled={isAfterDeadline}
                      className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-2 uppercase text-xs">
                      Ville *
                    </label>
                    <input
                      type="text"
                      value={ville}
                      onChange={(e) => {
                        setVille(e.target.value);
                        setError("");
                      }}
                      disabled={isAfterDeadline}
                      className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none normal-case disabled:opacity-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-500 mb-2 uppercase text-xs">
                    Pays *
                  </label>
                  <input
                    type="text"
                    value={pays}
                    onChange={(e) => {
                      setPays(e.target.value);
                      setError("");
                    }}
                    disabled={isAfterDeadline}
                    className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none normal-case disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* COORDONNÉES BANCAIRES */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded mb-6">
              <h2 className="text-gray-300 mb-4 uppercase text-xs">
                COORDONNÉES BANCAIRES
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-500 mb-2 uppercase text-xs">
                    IBAN *
                  </label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => {
                      setIban(e.target.value.toUpperCase());
                      setError("");
                    }}
                    disabled={isAfterDeadline}
                    className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none font-mono disabled:opacity-50"
                    placeholder="FR76 1234 5678 9012 3456 7890 123"
                  />
                  <p className="text-gray-600 text-xs mt-1 normal-case">
                    Format : 2 lettres pays + 2 chiffres clé + code bancaire
                  </p>
                </div>
                <div>
                  <label className="block text-gray-500 mb-2 uppercase text-xs">
                    BIC / SWIFT *
                  </label>
                  <input
                    type="text"
                    value={bic}
                    onChange={(e) => {
                      setBic(e.target.value.toUpperCase());
                      setError("");
                    }}
                    disabled={isAfterDeadline}
                    className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none font-mono disabled:opacity-50"
                    placeholder="BNPAFRPP"
                  />
                  <p className="text-gray-600 text-xs mt-1 normal-case">
                    8 ou 11 caractères (code bancaire international)
                  </p>
                </div>
              </div>
            </div>

            {/* MESSAGE D'ERREUR */}
            {error && (
              <div className="bg-red-900 border border-red-800 p-4 rounded mb-6 text-center">
                <p className="text-red-200 text-xs">{error}</p>
              </div>
            )}

            {/* BOUTON VALIDER */}
            {!isAfterDeadline && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="border border-gray-700 px-6 py-3 w-full hover:bg-gray-900 transition disabled:opacity-50 uppercase"
                >
                  {saving ? "ENREGISTREMENT..." : "VALIDER MA DEMANDE"}
                </button>

                <p className="text-gray-600 text-xs text-center mt-6 normal-case">
                  Vous pourrez modifier vos informations en demandant un nouveau lien jusqu'au 25 novembre.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function RefundRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-black">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-300"></div>
        </div>
      }
    >
      <RefundRequestContent />
    </Suspense>
  );
}
