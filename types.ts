export type LotteryKey = 'megaSena' | 'quina' | 'lotofacil' | 'lotomania';

export type SuggestionType = 'hot' | 'cold' | 'mixed' | 'custom';

export interface Probability {
  name: string;
  chance: string;
}

export interface LotteryConfig {
  key: LotteryKey;
  name: string;
  color: string;
  totalNumbers: number;
  drawSize: number;
  betSize: number;
  hotCount: number;
  coldCount: number;
  probabilities: Probability[];
}

export interface Frequency {
  number: number;
  count: number;
}

export interface RepeatedDraw {
  draw: number[];
  contests: (string | number)[];
}

export interface GameSuggestions {
  hot: number[];
  cold: number[];
  mixed: number[];
}

export interface DrawData {
    contest: string | number;
    draw: number[];
    date: Date;
}

export interface PairFrequency {
  pair: number[];
  count: number;
}

export interface EvenOddDistribution {
  distribution: string;
  count: number;
}

export interface NumberIntervalStats {
    number: number;
    currentDelay: number;
    avgInterval: number;
    maxDelay: number;
}

export interface AnalysisResult {
  fileName: string;
  totalDraws: number;
  allDraws: DrawData[];
  frequencies: Frequency[];
  repeatedDraws: RepeatedDraw[];
  suggestions: GameSuggestions;
  lastDraws: DrawData[];
  drawsByNumber: Map<number, (string | number)[]>;
  topPairs: PairFrequency[];
  evenOddDistribution: EvenOddDistribution[];
  intervalStats: NumberIntervalStats[];
}