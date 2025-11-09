import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mot de passe admin (même que dans la page)
const ADMIN_PASSWORD = "S@ez2021@dmin";

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

    // 1. Récupérer tous les customers avec remboursement_demande = true
    const { data: allCustomers, error: allError } = await supabase
      .from("customers")
      .select("melancolie, symphonie, remboursement_demande, montant_remboursement, remboursement_date")
      .eq("remboursement_demande", true);

    console.log("Customers avec demande trouvés:", allCustomers?.length);

    if (allError) {
      console.error("Erreur récupération customers:", allError);
      return NextResponse.json(
        { error: "Erreur base de données" },
        { status: 500 }
      );
    }

    // 2. Calculer les statistiques
    let montantTraite = 0;
    let demandesRecues = allCustomers?.length || 0;
    
    let melancolieAvecDemande = 0;
    let symphonieAvecDemande = 0;

    const dernieresDemandes = [];

    allCustomers?.forEach((customer) => {
      const mel = customer.melancolie || 0;
      const symp = customer.symphonie || 0;
      
      // Utiliser montant_remboursement si disponible, sinon calculer
      const montant = parseFloat(customer.montant_remboursement) || ((mel * 15) + (symp * 15));

      montantTraite += montant;
      melancolieAvecDemande += mel;
      symphonieAvecDemande += symp;

      // Ajouter aux dernières demandes
      if (customer.remboursement_date) {
        dernieresDemandes.push({
          date: customer.remboursement_date,
          montant: montant,
          melancolie: mel,
          symphonie: symp,
        });
      }
    });

    // Trier les dernières demandes par date décroissante
    dernieresDemandes.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 3. Calculer le montant moyen
    const montantMoyen = demandesRecues > 0 ? Math.round(montantTraite / demandesRecues) : 0;

    console.log("Stats calculées:", { montantTraite, demandesRecues, montantMoyen });

    // 4. Retourner les stats
    return NextResponse.json({
      montantTraite: Math.round(montantTraite),
      demandesRecues,
      montantMoyen,
      packsDetails: {
        melancolie: {
          avecDemande: melancolieAvecDemande,
        },
        symphonie: {
          avecDemande: symphonieAvecDemande,
        },
      },
      dernieresDemandes: dernieresDemandes.slice(0, 10),
    });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
