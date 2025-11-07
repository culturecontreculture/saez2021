import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = "support@culturecontreculture.fr";
const SENDER_NAME = "Saez 2021";

// Validation IBAN basique (format général)
function validateIBAN(iban) {
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
  return ibanRegex.test(iban.replace(/\s/g, ''));
}

// Validation BIC basique
function validateBIC(bic) {
  const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  return bicRegex.test(bic.replace(/\s/g, ''));
}

export async function POST(request) {
  try {
    const { token, address, bankDetails } = await request.json();

    if (!token || !address || !bankDetails) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    // 1. Valider le token
    const { data: magicLink, error: linkError } = await supabase
      .from("magic_links")
      .select("customer_id, expires_at")
      .eq("token", token)
      .single();

    if (linkError || !magicLink) {
      return NextResponse.json(
        { error: "Token invalide" },
        { status: 404 }
      );
    }

    if (new Date(magicLink.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Token expiré" },
        { status: 410 }
      );
    }

    // 2. Récupérer le customer
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, prenomenvoi, nomenvoi, email, melancolie, symphonie")
      .eq("id", magicLink.customer_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Client non trouvé" },
        { status: 404 }
      );
    }

    // 3. Valider IBAN et BIC
    const ibanClean = bankDetails.iban.replace(/\s/g, '').toUpperCase();
    const bicClean = bankDetails.bic.replace(/\s/g, '').toUpperCase();

    if (!validateIBAN(ibanClean)) {
      return NextResponse.json(
        { error: "Format IBAN invalide" },
        { status: 400 }
      );
    }

    if (!validateBIC(bicClean)) {
      return NextResponse.json(
        { error: "Format BIC invalide" },
        { status: 400 }
      );
    }

    // 4. Calculer le montant du remboursement
    const montantRemboursement = (customer.melancolie || 0) * 15 + (customer.symphonie || 0) * 15;

    // 5. Mettre à jour le customer avec toutes les infos
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        adresse1: address.adresse1,
        adresse2: address.adresse2 || null,
        codepostal: address.codepostal,
        ville: address.ville,
        pays: address.pays,
        iban: ibanClean,
        bic: bicClean,
        remboursement_demande: true,
        remboursement_date: new Date().toISOString(),
        montant_remboursement: montantRemboursement,
        date_update: new Date().toISOString(),
      })
      .eq("id", customer.id);

    if (updateError) {
      console.error("Erreur mise à jour customer:", updateError);
      return NextResponse.json(
        { error: "Erreur lors de la sauvegarde" },
        { status: 500 }
      );
    }

    // 6. Marquer le token comme utilisé
    await supabase
      .from("magic_links")
      .update({ used: true })
      .eq("token", token);

    // 7. Préparer l'adresse pour l'email
    const recapAdresse = `
      <p style='margin: 10px 0; text-align: left;'>
        ${address.adresse1}<br/>
        ${address.adresse2 ? address.adresse2 + '<br/>' : ''}
        ${address.codepostal} ${address.ville}<br/>
        ${address.pays}
      </p>
    `;

    // 8. Envoyer l'email de confirmation
    const prenom = customer.prenomenvoi || "";
    const emailBody = `
      <div style="font-family: monospace; color: #e5e7eb; background-color: #000000; padding: 40px; text-align: center;">
        <h1 style="color: #d1d5db; font-size: 12px; letter-spacing: 3px; margin-bottom: 30px;">SAEZ 2021 - CONFIRMATION</h1>
        
        ${prenom ? `<p style="font-size: 11px; margin-bottom: 20px;">Bonjour ${prenom},</p>` : ""}
        
        <p style="font-size: 11px; line-height: 1.6; margin-bottom: 20px;">
          Votre demande de remboursement a bien été enregistrée.
        </p>
        
        <div style="background-color: #1f2937; border: 1px solid #374151; padding: 20px; margin: 30px auto; max-width: 400px; text-align: left;">
          <p style="font-size: 14px; color: #10b981; font-weight: bold; margin-bottom: 15px; text-align: center;">
            Montant : ${montantRemboursement}€
          </p>
          
          <p style="font-size: 10px; color: #9ca3af; text-transform: uppercase; margin-bottom: 10px;">Adresse postale</p>
          ${recapAdresse}
          
          <p style="font-size: 10px; color: #9ca3af; text-transform: uppercase; margin: 20px 0 10px 0;">Coordonnées bancaires</p>
          <p style='margin: 10px 0; text-align: left; font-size: 11px;'>
            IBAN : ${ibanClean.replace(/(.{4})/g, '$1 ').trim()}<br/>
            BIC : ${bicClean}
          </p>
        </div>
        
        <p style="font-size: 10px; line-height: 1.6; margin-top: 25px; color: #fbbf24; background-color: #78350f; padding: 15px; border-radius: 5px; max-width: 400px; margin-left: auto; margin-right: auto;">
          ⏰ Vous pouvez encore modifier vos informations jusqu'au <strong>25 novembre</strong>.<br/>
          Après cette date, il ne sera plus possible de demander un remboursement.<br/>
          Le remboursement sera effectué le <strong>5 décembre</strong>.
        </p>
        
        <p style="font-size: 9px; color: #9ca3af; margin-top: 40px;">
          Pour toute question, contactez support@culturecontreculture.fr
        </p>
      </div>
    `;

    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: SENDER_NAME,
          email: SENDER_EMAIL,
        },
        to: [
          {
            email: customer.email,
            name: prenom ? `${prenom} ${customer.nomenvoi || ""}`.trim() : undefined,
          },
        ],
        subject: "Saez 2021 - Confirmation de votre demande de remboursement",
        htmlContent: emailBody,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur sauvegarde remboursement:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
