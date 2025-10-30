/* eslint-disable react/no-unescaped-entities */
"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function FormatChoiceContent() {
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
  const [pays, setPays] = useState("");

  // Choix de format
  const [melancolieCd, setMelancolieCd] = useState(0);
  const [melancolieVinyle, setMelancholieVinyle] = useState(0);
  const [symphonieCd, setSymphonieCd] = useState(0);
  const [symphonieVinyle, setSymphonieVinyle] = useState(0);

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
        } else if (data.error === "TOKEN_USED") {
          setError("Ce lien a déjà été utilisé.");
        } else if (data.error === "TOKEN_INVALID") {
          setError("Lien invalide. Veuillez demander un nouveau lien.");
        } else {
          setError("Une erreur s'est produite. Veuillez réessayer.");
        }
        setLoading(false);
        return;
      }

      setCustomer(data.customer);

      // Initialiser l'adresse
      setAdresse1(data.customer.adresse1 || "");
      setAdresse2(data.customer.adresse2 || "");
      setCodepostal(data.customer.codepostal || "");
      setVille(data.customer.ville || "");
      setPays(data.customer.pays || "France");

      // Initialiser les valeurs de format si déjà rempli
      if (data.existingChoices && data.existingChoices.length > 0) {
        data.existingChoices.forEach((choice) => {
          if (choice.pack_type === "melancolie") {
            if (choice.format === "cd") setMelancolieCd(choice.quantite);
            if (choice.format === "vinyle") setMelancholieVinyle(choice.quantite);
          }
          if (choice.pack_type === "symphonie") {
            if (choice.format === "cd") setSymphonieCd(choice.quantite);
            if (choice.format === "vinyle") setSymphonieVinyle(choice.quantite);
          }
        });
      }

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

    // Validation format
    const totalMelancolie = melancolieCd + melancolieVinyle;
    const totalSymphonie = symphonieCd + symphonieVinyle;

    if (customer.melancolie > 0 && totalMelancolie !== customer.melancolie) {
      setError(
        `Vous devez répartir exactement ${customer.melancolie} pack(s) Mélancolie.`
      );
      return;
    }

    if (customer.symphonie > 0 && totalSymphonie !== customer.symphonie) {
      setError(
        `Vous devez répartir exactement ${customer.symphonie} pack(s) Symphonie des Siècles.`
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/save-format", {
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
          choices: {
            melancolie: {
              cd: melancolieCd,
              vinyle: melancolieVinyle,
            },
            symphonie: {
              cd: symphonieCd,
              vinyle: symphonieVinyle,
            },
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
            <p className="text-green-400 mb-4">CONFIGURATION ENREGISTRÉE</p>
            <p className="text-gray-400 text-xs normal-case">
              Vous recevrez un email de confirmation.<br />
              Vos packs seront expédiés dans le format choisi<br />
              à l'adresse indiquée.
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
          SAEZ 2021 - CONFIGURATION
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
                    {customer.melancolie}
                  </p>
                )}
                {customer.symphonie > 0 && (
                  <p>
                    <span className="text-gray-500">Packs Symphonie des Siècles :</span>{" "}
                    {customer.symphonie}
                  </p>
                )}
              </div>
            </div>

            {/* ADRESSE DE LIVRAISON */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded mb-6">
              <h2 className="text-gray-300 mb-4 uppercase text-xs">
                ADRESSE DE LIVRAISON
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
                    className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none normal-case"
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
                    className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none normal-case"
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
                      className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none"
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
                      className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none normal-case"
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
                    className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none normal-case"
                  />
                </div>
              </div>
            </div>

            {/* CHOIX DU SUPPORT - MÉLANCOLIE */}
            {customer.melancolie > 0 && (
              <div className="bg-gray-900 border border-gray-800 p-6 rounded mb-6">
                <h3 className="text-gray-300 mb-4 uppercase text-xs">
                  MÉLANCOLIE ({customer.melancolie} pack{customer.melancolie > 1 ? "s" : ""})
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-500 mb-2 uppercase text-xs">
                      CD
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={customer.melancolie}
                      value={melancolieCd}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setMelancolieCd(Math.min(val, customer.melancolie));
                        setError("");
                      }}
                      className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-2 uppercase text-xs">
                      VINYLE
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={customer.melancolie}
                      value={melancolieVinyle}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setMelancholieVinyle(Math.min(val, customer.melancolie));
                        setError("");
                      }}
                      className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none"
                    />
                  </div>
                  <p className="text-gray-500 text-xs">
                    Total : {melancolieCd + melancolieVinyle} / {customer.melancolie}
                  </p>
                </div>
              </div>
            )}

            {/* CHOIX DU SUPPORT - SYMPHONIE */}
            {customer.symphonie > 0 && (
              <div className="bg-gray-900 border border-gray-800 p-6 rounded mb-6">
                <h3 className="text-gray-300 mb-4 uppercase text-xs">
                  SYMPHONIE DES SIÈCLES ({customer.symphonie} pack{customer.symphonie > 1 ? "s" : ""})
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-500 mb-2 uppercase text-xs">
                      CD
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={customer.symphonie}
                      value={symphonieCd}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setSymphonieCd(Math.min(val, customer.symphonie));
                        setError("");
                      }}
                      className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-2 uppercase text-xs">
                      VINYLE
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={customer.symphonie}
                      value={symphonieVinyle}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setSymphonieVinyle(Math.min(val, customer.symphonie));
                        setError("");
                      }}
                      className="bg-black border border-gray-700 text-white p-2 w-full focus:border-gray-500 outline-none"
                    />
                  </div>
                  <p className="text-gray-500 text-xs">
                    Total : {symphonieCd + symphonieVinyle} / {customer.symphonie}
                  </p>
                </div>
              </div>
            )}

            {/* MESSAGE D'ERREUR */}
            {error && (
              <div className="bg-red-900 border border-red-800 p-4 rounded mb-6 text-center">
                <p className="text-red-200 text-xs">{error}</p>
              </div>
            )}

            {/* BOUTON VALIDER */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="border border-gray-700 px-6 py-3 w-full hover:bg-gray-900 transition disabled:opacity-50 uppercase"
            >
              {saving ? "ENREGISTREMENT..." : "VALIDER MA CONFIGURATION"}
            </button>

            <p className="text-gray-600 text-xs text-center mt-6 normal-case">
              Vous pourrez modifier votre configuration en demandant un nouveau lien.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function FormatChoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-black">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-300"></div>
        </div>
      }
    >
      <FormatChoiceContent />
    </Suspense>
  );
}
