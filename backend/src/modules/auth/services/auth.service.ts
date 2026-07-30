import bcrypt from "bcrypt";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { env } from "../../../config/env.js";
import { AuthenticationError, ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/index.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../../shared/security/jwt.js";
import { userRoles, type UserDocument, type UserRole } from "../../users/user.model.js";
import type { LoginRequest, LoginResponse } from "../dtos/login.dto.js";
import type { MeResponse } from "../dtos/me.dto.js";
import type { LogoutRequest, LogoutResponse, RefreshTokenRequest, RefreshTokenResponse } from "../dtos/refresh-token.dto.js";
import type { RegisterRequest, RegisterResponse } from "../dtos/register.dto.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
import { userRepository } from "../repositories/user.repository.js";

export class AuthService {
  constructor(
    private readonly users = userRepository,
    private readonly refreshTokens = refreshTokenRepository
  ) {}

  async register(input: RegisterRequest): Promise<RegisterResponse> {
    const normalizedInput = this.validateRegisterInput(input);
    const emailAlreadyExists = await this.users.existsByEmail(normalizedInput.email);

    if (emailAlreadyExists) {
      throw new ConflictError("A user with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(normalizedInput.password, env.BCRYPT_SALT_ROUNDS);
    const user = await this.createUser({
      name: normalizedInput.name,
      email: normalizedInput.email,
      passwordHash,
      role: normalizedInput.role
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }
    };
  }

  async login(input: LoginRequest): Promise<LoginResponse> {
    const normalizedInput = this.validateLoginInput(input);
    const user = await this.users.findByEmail(normalizedInput.email);

    if (!user) {
      throw new AuthenticationError("Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(normalizedInput.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AuthenticationError("Invalid email or password.");
    }

    const accessTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };
    const refreshTokenId = randomUUID();
    const accessToken = signAccessToken(accessTokenPayload);
    const refreshToken = signRefreshToken({
      ...accessTokenPayload,
      tokenId: refreshTokenId
    });

    await this.refreshTokens.create({
      userId: user._id,
      tokenId: refreshTokenId,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: this.getTokenExpiresAt(refreshToken)
    });

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      accessTokenExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshTokenExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    };
  }

  async logout(input: LogoutRequest): Promise<LogoutResponse> {
    const refreshToken = this.validateRefreshTokenInput(input);
    const payload = this.verifyRefreshTokenOrThrow(refreshToken);

    await this.refreshTokens.revokeByTokenId(payload.tokenId);

    return {
      message: "Logout successful."
    };
  }

  async getCurrentUser(userId?: string): Promise<MeResponse> {
    if (!userId) {
      throw new AuthenticationError("Authentication is required.");
    }

    const user = await this.users.findById(userId);

    if (!user) {
      throw new NotFoundError("Authenticated user was not found.");
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }
    };
  }

  async refresh(input: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const refreshToken = this.validateRefreshTokenInput(input);
    const payload = this.verifyRefreshTokenOrThrow(refreshToken);
    const storedToken = await this.refreshTokens.findActiveByTokenId(payload.tokenId);

    if (
      !storedToken ||
      !this.tokenHashesMatch(storedToken.tokenHash, this.hashToken(refreshToken)) ||
      storedToken.userId.toString() !== payload.userId
    ) {
      throw new AuthenticationError("Invalid or expired refresh token.");
    }

    const user = await this.users.findById(payload.userId);

    if (!user) {
      throw new AuthenticationError("Invalid or expired refresh token.");
    }

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: env.JWT_ACCESS_EXPIRES_IN
    };
  }

  private validateRegisterInput(input: RegisterRequest): Required<RegisterRequest> {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const password = input.password;
    const role = input.role ?? "student";

    if (!name || !email || !password) {
      throw new ValidationError("Name, email, and password are required.");
    }

    if (!this.isValidEmail(email)) {
      throw new ValidationError("Email must be a valid email address.");
    }

    if (password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters long.");
    }

    if (!this.isValidRole(role)) {
      throw new ValidationError("Role must be student, teacher, or admin.");
    }

    return {
      name,
      email,
      password,
      role
    };
  }

  private validateLoginInput(input: LoginRequest): LoginRequest {
    const email = input.email?.trim().toLowerCase();
    const password = input.password;

    if (!email || !password) {
      throw new ValidationError("Email and password are required.");
    }

    if (!this.isValidEmail(email)) {
      throw new ValidationError("Email must be a valid email address.");
    }

    return {
      email,
      password
    };
  }

  private validateRefreshTokenInput(input: RefreshTokenRequest | LogoutRequest): string {
    const refreshToken = input.refreshToken?.trim();

    if (!refreshToken) {
      throw new ValidationError("Refresh token is required.");
    }

    return refreshToken;
  }

  private verifyRefreshTokenOrThrow(refreshToken: string) {
    try {
      return verifyRefreshToken(refreshToken);
    } catch {
      throw new AuthenticationError("Invalid or expired refresh token.");
    }
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private tokenHashesMatch(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");

    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }

  private getTokenExpiresAt(refreshToken: string): Date {
    const payload = this.verifyRefreshTokenOrThrow(refreshToken);

    if (!payload.exp) {
      throw new AuthenticationError("Invalid or expired refresh token.");
    }

    return new Date(payload.exp * 1000);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidRole(role: string): role is UserRole {
    return userRoles.includes(role as UserRole);
  }

  private async createUser(user: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
  }): Promise<UserDocument> {
    try {
      return await this.users.create(user);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictError("A user with this email already exists.");
      }

      throw error;
    }
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
  }
}

export const authService = new AuthService();
