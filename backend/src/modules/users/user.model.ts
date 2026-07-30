import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export const userRoles = ["student", "teacher", "admin"] as const;

export type UserRole = (typeof userRoles)[number];

export interface User {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User> & { _id: Types.ObjectId };

const userSchema = new Schema<User>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: userRoles,
      default: "student",
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.index({ email: 1 }, { unique: true });

export const UserModel: Model<User> = model<User>("User", userSchema);
