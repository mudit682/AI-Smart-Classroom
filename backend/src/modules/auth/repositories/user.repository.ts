import { UserModel, type User, type UserDocument } from "../../users/user.model.js";

export class UserRepository {
  async create(user: Pick<User, "name" | "email" | "passwordHash" | "role">): Promise<UserDocument> {
    return UserModel.create(user);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const existingUser = await UserModel.exists({ email }).exec();

    return existingUser !== null;
  }

  async findByEmail(_email: string): Promise<UserDocument | null> {
    return UserModel.findOne({ email: _email }).select("+passwordHash").exec();
  }

  async findById(_id: string): Promise<UserDocument | null> {
    return UserModel.findById(_id).exec();
  }
}

export const userRepository = new UserRepository();
