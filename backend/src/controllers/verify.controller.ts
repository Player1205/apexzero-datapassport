// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { Dataset } from "../models/Dataset";
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

/**
 * GitHub Gist raw URLs include a commit hash that pins them to a specific version:
 *   https://gist.githubusercontent.com/USER/GIST_ID/raw/COMMIT_SHA/file.json
 * 
 * To detect tampering we must fetch the LATEST version, so we strip the commit hash:
 *   https://gist.githubusercontent.com/USER/GIST_ID/raw/file.json
 */
function getLatestUrl(url: string): string {
  // Match: .../raw/40-char-hex-commit-hash/filename
  const gistCommitPattern = /^(https?:\/\/gist\.githubusercontent\.com\/[^\/]+\/[^\/]+\/raw)\/[a-f0-9]{40,}\/(.+)$/i;
  const match = url.match(gistCommitPattern);
  if (match) {
    const stripped = `${match[1]}/${match[2]}`;
    console.log(`[Verify] Stripped Gist commit hash: ${url} → ${stripped}`);
    return stripped;
  }
  return url;
}

export const verifyDatasetHash = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hash = (req.params.hash || req.body.hash || "").trim();
    console.log(`[Verify] Searching for hash: ${hash}`);

    const dataset = await Dataset.findOne({ hash });
    if (!dataset) {
      // Return 200 with verified:false so the frontend can display it properly
      // (returning 404 causes Axios to throw, and the result is never set)
      return res.status(200).json({
        success: true,
        verified: false,
        message: "No dataset found for this hash in the registry.",
        dataset: null
      });
    }

    // Use the latest URL (strip Gist commit pins) so we always fetch current content
    const latestUrl = getLatestUrl(dataset.url);
    const liveUrl = `${latestUrl}${latestUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    
    console.log(`[Verify] Re-fetching dataset from: ${liveUrl}`);
    const response = await axios.get(liveUrl, { transformResponse: [(d) => d] });
    
    const liveHash = normalizeAndHash(response.data);
    const isVerified = (liveHash === dataset.hash);

    console.log(`[Verify] Stored hash : ${dataset.hash}`);
    console.log(`[Verify] Live hash   : ${liveHash}`);
    console.log(`[Verify] Match       : ${isVerified}`);

    res.status(200).json({
      success: true,
      verified: isVerified,
      authentic: isVerified,  // keep for backward compat
      message: isVerified ? "Authenticity Confirmed" : "INTEGRITY BREACH: Dataset content has been modified since registration!",
      dataset
    });
  } catch (err) { next(err); }
};