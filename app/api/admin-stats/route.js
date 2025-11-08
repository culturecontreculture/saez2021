import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mot de passe admin (même que dans la page)
const ADMIN_PASSWORD = "Saez2021Admin";

export async function GET(request) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    // 1. Récupérer tous les customers avec des packs
    const { data: allCustomers, error: allError } = await supabase
      .from("customers")
      .select("melancolie, symphonie, remboursement_demande, montant_remboursement, remboursement_date")
      .or("melancolie.gt.0,symphonie.gt.0");

    if (allError) {
      console.error("Erreur récupération customers:", allError);
      return NextResponse.json(
        { error: "Erreur base de données" },
        { status: 500 }
      );
    }

    // 2. Calculer les statistiques
    let totalMontant = 0;
    let montantTraite = 0;
    let montantEnAttente = 0;
    let demandesRecues = 0;
    let enAttente = 0;
    
    let totalMelancolie = 0;
    let totalSymphonie = 0;
    let melancolieAvecDemande = 0;
    let symphonieAvecDemande = 0;

    const dernieresDemandes = [];

    allCustomers.forEach((customer) => {
      const mel = customer.melancolie || 0;
      const symp = customer.symphonie || 0;
      const montant = (mel * 15) + (symp * 15);

      totalMontant += montant;
      totalMelancolie += mel;
      totalSymphonie += symp;

      if (customer.remboursement_demande) {
        demandesRecues++;
        montantTraite += customer.montant_remboursement || montant;
        melancolieAvecDemande += mel;
        symphonieAvecDemande += symp;

        // Ajouter aux dernières demandes
        if (customer.remboursement_date) {
          dernieresDemandes.push({
            date: customer.remboursement_date,
            montant: customer.montant_remboursement || montant,
            melancolie: mel,
            symphonie: symp,
          });
        }
      } else {
        enAttente++;
        montantEnAttente += montant;
      }
    });

    // Trier les dernières demandes par date décroissante
    dernieresDemandes.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 3. Calculer le taux de réponse
    const totalClients = allCustomers.length;
    const tauxReponse = totalClients > 0 ? Math.round((demandesRecues / totalClients) * 100) : 0;

    // 4. Retourner les stats
    return NextResponse.json({
      totalMontant,
      montantTraite,
      montantEnAttente,
      demandesRecues,
      enAttente,
      tauxReponse,
      packsDetails: {
        melancolie: {
          total: totalMelancolie,
          avecDemande: melancolieAvecDemande,
        },
        symphonie: {
          total: totalSymphonie,
          avecDemande: symphonieAvecDemande,
        },
      },
      dernieresDemandes: dernieresDemandes.slice(0, 10), // 10 dernières
    });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
