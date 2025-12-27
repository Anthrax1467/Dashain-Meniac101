
import { GameType, GameMetadata, StoreItem } from './types';

export const GAMES: GameMetadata[] = [
  {
    id: GameType.SNAKE,
    name: 'Classic Snake',
    icon: 'fa-worm',
    category: 'Classic',
    entryFee: 10,
    description: 'Relive the classic arcade experience.'
  },
  {
    id: GameType.LUDO,
    name: 'Ludo King',
    icon: 'fa-chess-board',
    category: 'Board',
    entryFee: 50,
    description: 'Classic board game for friends and family.'
  },
  {
    id: GameType.LANGUR_BURJA,
    name: 'Langur Burja',
    icon: 'fa-dice',
    category: 'Dice',
    entryFee: 100,
    description: 'Traditional Himalayan dice betting game.'
  },
  {
    id: GameType.TETRIS,
    name: 'Tetris Neo',
    icon: 'fa-shapes',
    category: 'Classic',
    entryFee: 40,
    description: 'High-speed neon block matching with ghost pieces.'
  },
  {
    id: GameType.UNO,
    name: 'UNO Cards',
    icon: 'fa-layer-group',
    category: 'Card',
    entryFee: 25,
    description: 'The world\'s most popular card game.'
  },
  {
    id: GameType.TEEN_PATTI,
    name: 'Teen Patti',
    icon: 'fa-spade',
    category: 'Card',
    entryFee: 200,
    description: 'Indian poker for the high rollers.'
  },
  {
    id: GameType.CALL_BREAK,
    name: 'Call Break',
    icon: 'fa-heart',
    category: 'Card',
    entryFee: 50,
    description: 'Strategic trick-taking card game.'
  },
  {
    id: GameType.CARROM,
    name: 'Carrom Board',
    icon: 'fa-circle-dot',
    category: 'Board',
    entryFee: 30,
    description: 'Precision physics and tactical strikes.'
  },
  {
    id: GameType.CHESS,
    name: 'Royal Chess',
    icon: 'fa-chess',
    category: 'Board',
    entryFee: 40,
    description: 'Strategic 2 or 4 player grandmaster battle.'
  }
];

export const STORE_ITEMS: StoreItem[] = [
  // Token Packs (USD)
  {
    id: 'tokens_starter',
    name: 'Starter Pack',
    description: '500 Tokens to get you started.',
    price: 4.99,
    currency: 'USD',
    type: 'TOKEN_PACK',
    icon: 'fa-coins',
    value: 500
  },
  {
    id: 'tokens_pro',
    name: 'Pro Grinder',
    description: '2500 Tokens + 50 Ad Credits.',
    price: 19.99,
    currency: 'USD',
    type: 'TOKEN_PACK',
    icon: 'fa-sack-dollar',
    value: 2500
  },
  {
    id: 'tokens_whale',
    name: 'Festival Whale',
    description: '10,000 Tokens for the elite.',
    price: 69.99,
    currency: 'USD',
    type: 'TOKEN_PACK',
    icon: 'fa-gem',
    value: 10000
  },
  // Themes (Tokens)
  {
    id: 'theme_everest',
    name: 'Everest Night',
    description: 'Chilly blue aesthetic with mountain peaks.',
    price: 500,
    currency: 'TOKEN',
    type: 'THEME',
    icon: 'fa-mountain'
  },
  {
    id: 'theme_neon',
    name: 'Kathmandu Neon',
    description: 'Cyberpunk inspired futuristic look.',
    price: 1200,
    currency: 'TOKEN',
    type: 'THEME',
    icon: 'fa-bolt'
  },
  {
    id: 'theme_gold',
    name: 'Royal Gold',
    description: 'The ultimate luxury interface.',
    price: 3000,
    currency: 'TOKEN',
    type: 'THEME',
    icon: 'fa-crown'
  },
  // Merch (Tokens)
  {
    id: 'merch_kite',
    name: 'Golden Kite Banner',
    description: 'Exclusive profile frame with kite animation.',
    price: 300,
    currency: 'TOKEN',
    type: 'MERCH',
    icon: 'fa-paper-plane'
  },
  {
    id: 'merch_shrine',
    name: 'Shrine Badge',
    description: 'Blessed badge next to your username.',
    price: 150,
    currency: 'TOKEN',
    type: 'MERCH',
    icon: 'fa-place-of-worship'
  }
];
