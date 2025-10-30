import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = "support@culturecontreculture.fr";
const SENDER_NAME = "Saez 2021";

export async function POST(request) {
  try {
    const { token, choices, address } = await request.json();

    if (!token || !choices || !address) {
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

    // 3. Mettre à jour l'adresse du customer
    const { error: updateAddressError } = await supabase
      .from("customers")
      .update({
        adresse1: address.adresse1,
        adresse2: address.adresse2 || null,
        codepostal: address.codepostal,
        ville: address.ville,
        pays: address.pays,
        date_update: new Date().toISOString(),
      })
      .eq("id", customer.id);

    if (updateAddressError) {
      console.error("Erreur mise à jour adresse:", updateAddressError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour de l'adresse" },
        { status: 500 }
      );
    }

    // 4. Supprimer les anciens choix du client
    await supabase
      .from("format_choices")
      .delete()
      .eq("customer_id", customer.id);

    // 5. Insérer les nouveaux choix
    const formatChoices = [];

    if (choices.melancolie.cd > 0) {
      formatChoices.push({
        customer_id: customer.id,
        pack_type: "melancolie",
        format: "cd",
        quantite: choices.melancolie.cd,
      });
    }

    if (choices.melancolie.vinyle > 0) {
      formatChoices.push({
        customer_id: customer.id,
        pack_type: "melancolie",
        format: "vinyle",
        quantite: choices.melancolie.vinyle,
      });
    }

    if (choices.symphonie.cd > 0) {
      formatChoices.push({
        customer_id: customer.id,
        pack_type: "symphonie",
        format: "cd",
        quantite: choices.symphonie.cd,
      });
    }

    if (choices.symphonie.vinyle > 0) {
      formatChoices.push({
        customer_id: customer.id,
        pack_type: "symphonie",
        format: "vinyle",
        quantite: choices.symphonie.vinyle,
      });
    }

    if (formatChoices.length > 0) {
      const { error: insertError } = await supabase
        .from("format_choices")
        .insert(formatChoices);

      if (insertError) {
        console.error("Erreur insertion format_choices:", insertError);
        return NextResponse.json(
          { error: "Erreur lors de la sauvegarde" },
          { status: 500 }
        );
      }
    }

    // 6. Marquer le token comme utilisé et mettre à jour le customer
    await supabase
      .from("magic_links")
      .update({ used: true })
      .eq("token", token);

    await supabase
      .from("customers")
      .update({
        format_choice_completed: true,
        format_choice_date: new Date().toISOString(),
      })
      .eq("id", customer.id);

    // 7. Préparer le récap pour l'email
    let recapFormat = "";
    
    if (choices.melancolie.cd > 0 || choices.melancolie.vinyle > 0) {
      recapFormat += "<p style='margin: 10px 0;'><strong>MÉLANCOLIE</strong><br/>";
      if (choices.melancolie.cd > 0) {
        recapFormat += `${choices.melancolie.cd} en CD<br/>`;
      }
      if (choices.melancolie.vinyle > 0) {
        recapFormat += `${choices.melancolie.vinyle} en Vinyle<br/>`;
      }
      recapFormat += "</p>";
    }

    if (choices.symphonie.cd > 0 || choices.symphonie.vinyle > 0) {
      recapFormat += "<p style='margin: 10px 0;'><strong>SYMPHONIE DES SIÈCLES</strong><br/>";
      if (choices.symphonie.cd > 0) {
        recapFormat += `${choices.symphonie.cd} en CD<br/>`;
      }
      if (choices.symphonie.vinyle > 0) {
        recapFormat += `${choices.symphonie.vinyle} en Vinyle<br/>`;
      }
      recapFormat += "</p>";
    }

    // Préparer l'adresse pour l'email
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
          Votre choix a bien été enregistré.
        </p>
        
        <div style="background-color: #1f2937; border: 1px solid #374151; padding: 20px; margin: 30px auto; max-width: 400px; text-align: left;">
          <p style="font-size: 10px; color: #9ca3af; text-transform: uppercase; margin-bottom: 10px;">Adresse de livraison</p>
          ${recapAdresse}
          
          <p style="font-size: 10px; color: #9ca3af; text-transform: uppercase; margin: 20px 0 10px 0;">Support audio choisi</p>
          ${recapFormat}
        </div>
        
        <p style="font-size: 11px; line-height: 1.6; margin-top: 30px;">
          Vos packs seront expédiés dans les supports choisis<br/>
          à l'adresse indiquée ci-dessus.
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
        subject: "Saez 2021 - Confirmation de votre choix",
        htmlContent: emailBody,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur sauvegarde:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
