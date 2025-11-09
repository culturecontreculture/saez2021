/* eslint-disable react/no-unescaped-entities */
"use client";
import { useState } from "react";

export default function RefundLoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageType, setMessageType] = useState(""); // "success" ou "error"

  const handleSendMagicLink = async () => {
    if (!email) return;
    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const response = await fetch("/api/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessageType("error");
        if (data.error === "EMAIL_NOT_FOUND") {
          setMessage(
            "Cette adresse email n'est pas reconnue.\nSi vous avez changé d'adresse ou en cas d'erreur,\ncontactez support@culturecontreculture.fr"
          );
        } else if (data.error === "NO_PACKS") {
          setMessage(
            "Vous n'avez pas d'offre Mélancolie ou Symphonie des Siècles à rembourser.\nPour toute question, contactez support@culturecontreculture.fr"
          );
        } else {
          setMessage("Une erreur s'est produite. Veuillez réessayer.");
        }
      } else {
        setMessageType("success");
        setMessage(
          "EMAIL ENVOYÉ.\nVÉRIFIEZ VOTRE BOÎTE DE RÉCEPTION\n(ET VOS SPAMS)."
        );
      }
    } catch (error) {
      console.error("Erreur:", error);
      setMessageType("error");
      setMessage("Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleSendMagicLink();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white text-xs uppercase">
      <div className="text-center max-w-md px-4">
        <h1 className="mb-6 text-sm tracking-widest text-gray-400">
          SAEZ 2021<br>DEMANDE DE REMBOURSEMENT DES DISQUES
        </h1>
        <p className="mb-6 normal-case text-gray-300 text-xs">
          Entrez votre adresse email pour recevoir un lien de connexion et renseigner vos coordonnées bancaires pour le remboursement.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setMessage("");
            setMessageType("");
          }}
          onKeyPress={handleKeyPress}
          className="bg-black border border-gray-700 text-white p-2 mb-4 w-full text-center focus:border-gray-500 outline-none"
          placeholder="VOTRE EMAIL"
          disabled={loading}
        />
        <button
          onClick={handleSendMagicLink}
          className="border border-gray-700 px-4 py-2 w-full hover:bg-gray-900 transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "ENVOI EN COURS..." : "ENVOYER LE LIEN"}
        </button>
        {message && (
          <p
            className={`mt-6 text-xs ${
              messageType === "success" ? "text-green-400" : "text-red-400"
            }`}
            style={{ whiteSpace: "pre-wrap" }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
