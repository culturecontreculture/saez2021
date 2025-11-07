import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = "support@culturecontreculture.fr";
const SENDER_NAME = "Saez 2021";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "EMAIL_REQUIRED" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Vérifier que l'email existe dans customers
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, prenomenvoi, nomenvoi, melancolie, symphonie, email")
      .eq("email", normalizedEmail)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "EMAIL_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 2. Vérifier qu'il a au moins un pack melancolie ou symphonie
    const totalPacks = (customer.melancolie || 0) + (customer.symphonie || 0);
    if (totalPacks === 0) {
      return NextResponse.json(
        { error: "NO_PACKS" },
        { status: 400 }
      );
    }

    // 3. Calculer le montant du remboursement
    const montantRemboursement = (customer.melancolie || 0) * 15 + (customer.symphonie || 0) * 15;

    // 4. Générer un token unique
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // 5. Enregistrer le token dans magic_links
    const { error: insertError } = await supabase
      .from("magic_links")
      .insert({
        customer_id: customer.id,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (insertError) {
      console.error("Erreur insertion magic_link:", insertError);
      return NextResponse.json(
        { error: "DATABASE_ERROR" },
        { status: 500 }
      );
    }

    // 6. Construire le lien magique
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin");
    const magicLink = `${baseUrl}/refund-request?token=${token}`;

    // 7. Envoyer l'email via Brevo
    const prenom = customer.prenomenvoi || "";
    const emailBody = `
      <div style="font-family: monospace; color: #e5e7eb; background-color: #000000; padding: 40px; text-align: center;">
        <h1 style="color: #d1d5db; font-size: 12px; letter-spacing: 3px; margin-bottom: 30px;">SAEZ 2021 - DEMANDE DE REMBOURSEMENT</h1>
        
        ${prenom ? `<p style="font-size: 11px; margin-bottom: 20px;">Bonjour ${prenom},</p>` : ""}
        
        <p style="font-size: 11px; line-height: 1.6; margin-bottom: 20px;">
          Suite à un imprévu, nous devons vous rembourser une partie de votre achat<br/>
          correspondant au disque qui ne pourra pas être livré.
        </p>
        
        <div style="background-color: #1f2937; border: 1px solid #374151; padding: 20px; margin: 20px auto; max-width: 400px;">
          <p style="font-size: 14px; color: #10b981; font-weight: bold; margin: 0;">
            Montant à rembourser : ${montantRemboursement}€
          </p>
        </div>
        
        <p style="font-size: 11px; line-height: 1.6; margin-bottom: 30px;">
          Cliquez sur le bouton ci-dessous pour renseigner vos coordonnées bancaires<br/>
          et votre adresse postale afin de recevoir votre remboursement.
        </p>
        
        <p style="font-size: 10px; line-height: 1.6; margin-bottom: 20px; color: #fbbf24; background-color: #78350f; padding: 15px; border-radius: 5px;">
          ⚠️ Vous pouvez encore modifier vos informations jusqu'au <strong>22 novembre</strong>.<br/>
          Après cette date, il ne sera plus possible de modifier vos coordonnées.
        </p>
        
        <div style="margin: 40px 0;">
          <a href="${magicLink}" 
             style="display: inline-block; border: 1px solid #4b5563; color: #ffffff; 
                    padding: 12px 30px; text-decoration: none; font-size: 10px; 
                    letter-spacing: 2px; background-color: #1f2937;">
            RENSEIGNER MES COORDONNÉES
          </a>
        </div>
        
        <p style="font-size: 9px; color: #9ca3af; margin-top: 40px;">
          Ce lien est valable 24 heures.<br/>
          Si vous rencontrez un problème, contactez support@culturecontreculture.fr
        </p>
      </div>
    `;

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
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
            email: normalizedEmail,
            name: prenom ? `${prenom} ${customer.nomenvoi || ""}`.trim() : undefined,
          },
        ],
        subject: "Saez 2021 - Demande de remboursement",
        htmlContent: emailBody,
      }),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.json();
      console.error("Erreur Brevo:", errorData);
      return NextResponse.json(
        { error: "EMAIL_SEND_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
