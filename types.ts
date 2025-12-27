
export enum GameType {
  SNAKE = 'SNAKE',
  LUDO = 'LUDO',
  LANGUR_BURJA = 'LANGUR_BURJA',
  UNO = 'UNO',
  TEEN_PATTI = 'TEEN_PATTI',
  CALL_BREAK = 'CALL_BREAK',
  CARROM = 'CARROM',
  CHESS = 'CHESS',
  TETRIS = 'TETRIS'
}

export type ThemeType = 'dashain' | 'everest' | 'kathmandu' | 'gold' | 'neon';

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'TOKEN' | 'USD';
  type: 'TOKEN_PACK' | 'MERCH' | 'THEME';
  image?: string;
  icon?: string;
  value?: number; // For token packs
}

export interface GameMetadata {
  id: GameType;
  name: string;
  icon: string;
  category: 'Classic' | 'Board' | 'Card' | 'Dice';
  entryFee: number;
  description: string;
}

export interface UserProfile {
  email: string | null;
  isVerified: boolean;
  isGuest: boolean;
  username: string;
  avatar?: string;
  unlockedThemes: ThemeType[];
  currentTheme: ThemeType;
}

export interface UserWallet {
  tokens: number;
  adCredits: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  amount: number;
  currency: 'TOKEN' | 'AD_CREDIT' | 'USD';
  type: 'DEPOSIT' | 'WITHDRAW' | 'GAME_ENTRY' | 'GAME_WIN' | 'AD_REWARD' | 'PURCHASE' | 'REDEEM';
  date: string;
}

export interface GameState {
  currentTokens: number;
  currentGame: GameType | null;
  history: Transaction[];
}
