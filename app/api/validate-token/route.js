import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "TOKEN_REQUIRED" },
        { status: 400 }
      );
    }

    // 1. Vérifier que le token existe et n'est pas expiré
    const { data: magicLink, error: linkError } = await supabase
      .from("magic_links")
      .select("*, customer_id")
      .eq("token", token)
      .single();

    if (linkError || !magicLink) {
      return NextResponse.json(
        { error: "TOKEN_INVALID" },
        { status: 404 }
      );
    }

    // Vérifier si expiré
    if (new Date(magicLink.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "TOKEN_EXPIRED" },
        { status: 410 }
      );
    }

    // Vérifier si déjà utilisé (on autorise quand même l'accès pour modification)
    // Mais on peut informer l'utilisateur
    const alreadyUsed = magicLink.used;

    // 2. Récupérer les infos du customer
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, prenomenvoi, nomenvoi, email, melancolie, symphonie, format_choice_completed, adresse1, adresse2, codepostal, ville, pays")
      .eq("id", magicLink.customer_id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: "CUSTOMER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 3. Récupérer les choix existants s'il y en a
    const { data: existingChoices } = await supabase
      .from("format_choices")
      .select("*")
      .eq("customer_id", customer.id);

    return NextResponse.json({
      customer: {
        id: customer.id,
        prenomenvoi: customer.prenomenvoi,
        nomenvoi: customer.nomenvoi,
        email: customer.email,
        melancolie: customer.melancolie || 0,
        symphonie: customer.symphonie || 0,
        format_choice_completed: customer.format_choice_completed,
        adresse1: customer.adresse1 || "",
        adresse2: customer.adresse2 || "",
        codepostal: customer.codepostal || "",
        ville: customer.ville || "",
        pays: customer.pays || "",
      },
      existingChoices: existingChoices || [],
      alreadyUsed,
    });
  } catch (error) {
    console.error("Erreur validation token:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
