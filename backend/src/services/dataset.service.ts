import { Types } from "mongoose";
import { Dataset, IDataset } from "../models/Dataset";

export async function listDatasets(query: any = {}) {
  const filter: any = {};
  if (query.owner) filter.owner = query.owner;
  if (query.status) filter.status = query.status;

  const datasets = await Dataset.find(filter).sort({ createdAt: -1 });
  return { data: datasets, total: datasets.length };
}

export async function getDatasetById(id: string) {
  return Dataset.findById(id);
}

export async function getDatasetByHash(hash: string) {
  return Dataset.findOne({ hash });
}

export async function createDataset(dto: Partial<IDataset>) {
  const dataset = new Dataset({
    ...dto,
    status: "pending",
    riskLevel: "medium",
    riskScore: 0,
    anchored: false,
  });
  return dataset.save();
}

export async function updateDatasetRisk(
  id: string,
  riskLevel: string,
  riskScore: number,
  riskFlags: string[],
  aiAnalysis: string,
  license?: string
) {
  return Dataset.findByIdAndUpdate(
    id,
    { riskLevel, riskScore, riskFlags, aiAnalysis, license },
    { new: true }
  );
}

export async function markDatasetAnchored(
  id: string,
  txHash: string,
  blockNumber: number,
  chainId: number
) {
  return Dataset.findByIdAndUpdate(
    id,
    {
      status: "anchored",
      anchored: true,
      anchoredAt: new Date(),
      txHash,
      blockNumber,
      chainId,
    },
    { new: true }
  );
}