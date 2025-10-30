import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = "support@culturecontreculture.fr";
const SENDER_NAME = "Apocalypse";

export async function POST(request) {
  try {
    const { token, choices } = await request.json();

    if (!token || !choices) {
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
      .select("id, prenom, nom, email, melancolie, symphonie")
      .eq("id", magicLink.customer_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "Client non trouvé" },
        { status: 404 }
      );
    }

    // 3. Supprimer les anciens choix du client
    await supabase
      .from("format_choices")
      .delete()
      .eq("customer_id", customer.id);

    // 4. Insérer les nouveaux choix
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

    // 5. Marquer le token comme utilisé et mettre à jour le customer
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

    // 6. Préparer le récap pour l'email
    let recapText = "";
    
    if (choices.melancolie.cd > 0 || choices.melancolie.vinyle > 0) {
      recapText += "<p style='margin: 10px 0;'><strong>MÉLANCOLIE</strong><br/>";
      if (choices.melancolie.cd > 0) {
        recapText += `${choices.melancolie.cd} en CD<br/>`;
      }
      if (choices.melancolie.vinyle > 0) {
        recapText += `${choices.melancolie.vinyle} en Vinyle<br/>`;
      }
      recapText += "</p>";
    }

    if (choices.symphonie.cd > 0 || choices.symphonie.vinyle > 0) {
      recapText += "<p style='margin: 10px 0;'><strong>SYMPHONIE</strong><br/>";
      if (choices.symphonie.cd > 0) {
        recapText += `${choices.symphonie.cd} en CD<br/>`;
      }
      if (choices.symphonie.vinyle > 0) {
        recapText += `${choices.symphonie.vinyle} en Vinyle<br/>`;
      }
      recapText += "</p>";
    }

    // 7. Envoyer l'email de confirmation
    const prenom = customer.prenom || "";
    const emailBody = `
      <div style="font-family: monospace; color: #e5e7eb; background-color: #000000; padding: 40px; text-align: center;">
        <h1 style="color: #d1d5db; font-size: 12px; letter-spacing: 3px; margin-bottom: 30px;">APOCALYPSE - CONFIRMATION</h1>
        
        ${prenom ? `<p style="font-size: 11px; margin-bottom: 20px;">Bonjour ${prenom},</p>` : ""}
        
        <p style="font-size: 11px; line-height: 1.6; margin-bottom: 20px;">
          Votre choix de format a bien été enregistré.
        </p>
        
        <div style="background-color: #1f2937; border: 1px solid #374151; padding: 20px; margin: 30px auto; max-width: 400px; text-align: left;">
          ${recapText}
        </div>
        
        <p style="font-size: 11px; line-height: 1.6; margin-top: 30px;">
          Vos packs seront expédiés dans les formats choisis.
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
            name: prenom ? `${prenom} ${customer.nom || ""}`.trim() : undefined,
          },
        ],
        subject: "Apocalypse - Confirmation de votre choix de format",
        htmlContent: emailBody,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur sauvegarde format:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
