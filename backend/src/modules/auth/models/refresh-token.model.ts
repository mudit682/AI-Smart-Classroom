import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface RefreshToken {
  userId: Types.ObjectId;
  tokenId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

const refreshTokenSchema = new Schema<RefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      select: false
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    revokedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const RefreshTokenModel: Model<RefreshToken> = model<RefreshToken>("RefreshToken", refreshTokenSchema);

