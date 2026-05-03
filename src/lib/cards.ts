import type { Card, Rank, Suit } from '../types';

const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const ranks: Array<{ rank: Rank; value: number }> = [
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 11 },
  { rank: 'Q', value: 12 },
  { rank: 'K', value: 13 },
  { rank: 'A', value: 14 }
];

export function createDeck(): Card[] {
  return suits.flatMap((suit) =>
    ranks.map(({ rank, value }) => ({
      rank,
      suit,
      value,
      label: `${rank}${suitSymbol(suit)}`
    }))
  );
}

export function shuffleDeck(deck: Card[]) {
  const copy = [...deck];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

export function dealCards(playerIds: string[]) {
  const deck = shuffleDeck(createDeck());
  return playerIds.reduce<Record<string, Card>>((cardsByPlayer, playerId, index) => {
    cardsByPlayer[playerId] = deck[index];
    return cardsByPlayer;
  }, {});
}

export function suitSymbol(suit: Suit) {
  switch (suit) {
    case 'spades':
      return '♠';
    case 'hearts':
      return '♥';
    case 'diamonds':
      return '♦';
    case 'clubs':
      return '♣';
  }
}

export function isRedSuit(suit: Suit) {
  return suit === 'hearts' || suit === 'diamonds';
}
