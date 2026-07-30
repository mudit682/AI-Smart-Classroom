import type { Types } from "mongoose";
import { RefreshTokenModel, type RefreshTokenDocument } from "../models/refresh-token.model.js";

export interface CreateRefreshTokenRecord {
  userId: Types.ObjectId;
  tokenId: string;
  tokenHash: string;
  expiresAt: Date;
}

export class RefreshTokenRepository {
  async create(record: CreateRefreshTokenRecord): Promise<RefreshTokenDocument> {
    return RefreshTokenModel.create(record);
  }

  async findActiveByTokenId(tokenId: string): Promise<RefreshTokenDocument | null> {
    return RefreshTokenModel.findOne({
      tokenId,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() }
    })
      .select("+tokenHash")
      .exec();
  }

  async revokeByTokenId(tokenId: string): Promise<void> {
    await RefreshTokenModel.updateOne(
      {
        tokenId,
        revokedAt: { $exists: false }
      },
      {
        $set: {
          revokedAt: new Date()
        }
      }
    ).exec();
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();

