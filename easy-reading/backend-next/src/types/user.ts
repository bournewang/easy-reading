export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string | null;
  createdAt: Date;
  updatedAt: Date;
  subscriptionExpires: Date | null;
  subscriptionTier: string | null;
} 