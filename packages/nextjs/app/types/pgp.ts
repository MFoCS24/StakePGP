export interface PGPIdentity {
  keyId: string;
  name: string;
  email: string;
  publicKey: string;
  privateKey?: string;
}

export interface StakeContract {
  amount: string;
  startDate: Date;
  isBeingChallenged: boolean;
  lastChallengeDate?: Date;
} 