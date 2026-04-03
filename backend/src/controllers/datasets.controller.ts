// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { Dataset } from "../models/Dataset";
import * as aiService from "../services/ai.service";
import * as blockchainService from "../services/blockchain.service";
import * as provenanceService from "../services/provenance.service";
import { AppError } from "../middleware/errorHandler";
import axios from "axios";
import crypto from "crypto";

const normalizeAndHash = (data: any) => {
  if (!data) return "";
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    const cleanString = JSON.stringify(parsed);
    return crypto.createHash("sha256").update(cleanString).digest("hex");
  } catch (e) {
    return crypto.createHash("sha256").update(String(data).trim()).digest("hex");
  }
};

export const listDatasetsCtrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const datasets = await Dataset.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, datasets });
  } catch (err) { next(err); }
};

export const getDatasetCtrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataset = await Dataset.findById(req.params.id);
    if (!dataset) throw new AppError(404, "Not found");
    res.status(200).json({ success: true, dataset });
  } catch (err) { next(err); }
};    //refine dataset controller for create and scan logic, add description field, strip commit-pinned Gist URLs for tamper detection

export const createDatasetCtrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newDataset = await Dataset.create(req.body);
    res.status(201).json({ success: true, dataset: newDataset });
  } catch (err) { next(err); }
};

/**
 * ─── FIXED SCANNER LOGIC ───
 * Now includes the required 'description' field.
 * Strips commit-pinned Gist URLs so verify can detect tampering.
 */

/**
 * Strip GitHub Gist commit hash from raw URLs so we always store
 * a URL that fetches the LATEST version (needed for tamper detection).
 */
function getLatestUrl(url: string): string {
  const gistCommitPattern = /^(https?:\/\/gist\.githubusercontent\.com\/[^\/]+\/[^\/]+\/raw)\/[a-f0-9]{40,}\/(.+)$/i;
  const match = url.match(gistCommitPattern);
  if (match) {
    console.log(`[Scan] Stripped Gist commit hash from URL`);
    return `${match[1]}/${match[2]}`;
  }
  return url;
}

export const scanUrlCtrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url, name, ownerAddress, owner, description } = req.body;

    if (!url) throw new AppError(400, "URL is required");

    // Always store the "latest" version of the URL (strip commit pins)
    const cleanUrl = getLatestUrl(url);

    const liveUrl = cleanUrl.includes('?') ? `${cleanUrl}&t=${Date.now()}` : `${cleanUrl}?t=${Date.now()}`;
    const response = await axios.get(liveUrl, { transformResponse: [(d) => d] });

    const datasetHash = normalizeAndHash(response.data);

    // ── Count records in the fetched data ──
    let recordCount = 0;
    try {
      const parsed = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      if (Array.isArray(parsed)) {
        recordCount = parsed.length;
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Single object counts as 1 record
        recordCount = 1;
      }
    } catch {
      // Not JSON — try counting non-empty lines (CSV / text)
      const lines = String(response.data).split('\n').filter((l: string) => l.trim());
      recordCount = lines.length > 1 ? lines.length - 1 : 0; // subtract header row
    }

    const dataset = await Dataset.create({
      name: name || "Demo Dataset",
      description: description || "Dataset registered via DataPassport scanner.",
      url: cleanUrl,  // Store the clean URL, not the commit-pinned one
      hash: datasetHash,
      records: recordCount,
      owner: owner || "Vansh Rana",
      ownerAddress: ownerAddress || "0x0",
      status: "pending_audit"
    });

    res.status(201).json({ success: true, dataset });
  } catch (err) {
    console.error("[Scan Error]", err.message);
    next(err);
  }
};

export const analyzeDatasetCtrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataset = await Dataset.findById(req.params.id);
    const response = await axios.get(dataset.url);
    const analysis = await aiService.analyzePII(response.data);
    dataset.riskLevel = analysis.riskLevel;
    dataset.aiSummary = analysis.summary;
    dataset.anomalies = analysis.anomalies;
    dataset.status = "audited";
    await dataset.save();
    res.status(200).json({ success: true, analysis });
  } catch (err) { next(err); }
};

export const anchorDatasetCtrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataset = await Dataset.findById(req.params.id);
    const tx = await blockchainService.anchorHash(dataset.hash);
    dataset.anchored = true;
    dataset.txHash = tx.hash;
    dataset.status = "anchored";
    await dataset.save();
    res.status(200).json({ success: true, txHash: tx.hash });
  } catch (err) { next(err); }
};

export const registerDataset = scanUrlCtrl;