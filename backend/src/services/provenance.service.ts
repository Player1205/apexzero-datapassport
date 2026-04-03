// @ts-nocheck
import { ProvenanceCard } from "../models/ProvenanceCard";

/**
 * Creates or updates the Provenance Card for a dataset.
 * This acts as the immutable audit trail for all data modifications.
 */
export const createProvenanceStep = async (
  datasetId: string | any, 
  stepData: { action: string; actor: string; details: string; currentHash: string }
) => {
  try {
    // 1. Look for an existing Provenance Card for this dataset
    let card = await ProvenanceCard.findOne({ dataset: datasetId });

    // 2. If it doesn't exist, create the genesis card
    if (!card) {
      card = new ProvenanceCard({
        dataset: datasetId,
        currentHash: stepData.currentHash,
        steps: []
      });
    }

    // 3. Push the new action into the history ledger
    card.steps.push({
      action: stepData.action,
      actor: stepData.actor,
      details: stepData.details,
      timestamp: new Date()
    });

    // 4. Update the master hash to the latest state
    card.currentHash = stepData.currentHash;

    await card.save();
    return card;
  } catch (error: any) {
    console.error("[Provenance Service] Failed to log step:", error.message);
    throw error;
  }
};

/**
 * Retrieves the full audit trail for verification.
 */
export const getProvenanceCard = async (datasetId: string | any) => {
  try {
    const card = await ProvenanceCard.findOne({ dataset: datasetId });
    return card;
  } catch (error: any) {
    console.error("[Provenance Service] Failed to retrieve card:", error.message);
    return null;
  }
};