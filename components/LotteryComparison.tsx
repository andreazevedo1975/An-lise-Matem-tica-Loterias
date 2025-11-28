
import React, { useState } from 'react';
import { LOTTERY_CONFIGS } from '../constants';
import type { LotteryKey } from '../types';
import { MegaSenaIcon, QuinaIcon, LotofacilIcon, LotomaniaIcon, TimemaniaIcon, DuplaSenaIcon, DiaDeSorteIcon } from './LotteryIcons';

const iconMap: Record<LotteryKey, React.FC<{ className?: string }>> = {
  megaSena: MegaSenaIcon,
  quina: QuinaIcon,
  lotofacil: LotofacilIcon,
  lotomania: LotomaniaIcon,
  timemania: TimemaniaIcon,
  duplaSena: DuplaSenaIcon,
  diaDeSorte: DiaDeSorteIcon,
};

const LotteryComparison: React.FC = () => {
  const [lotteryA, setLotteryA] = useState<LotteryKey>('megaSena');
  const [lotteryB, setLotteryB] = useState<LotteryKey>('lotofacil');

  const configA = LOTTERY_CONFIGS[lotteryA];
  const configB = LOTTERY_CONFIGS[lotteryB];

  const IconA = iconMap[lotteryA];
  const IconB = iconMap[lotteryB];

  // Helper to parse probability string to number for visual comparison (rough estimate)
  const getProbNumber = (probStr: string) => {
    const clean = probStr.replace(/\./g, '').replace('1 em ', '');
    return parseInt(clean, 10);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-100 dark:bg-slate-900/50 p-6 rounded-lg text-center">
        <h2 className="text-2xl font-bold mb-2">Comparação de Loterias</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          Compare as regras, custos e probabilidades entre duas loterias para decidir onde apostar.
        </p>

        <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-12">
          {/* Selector A */}
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Loteria A</label>
            <div className="relative">
                <select
                    value={lotteryA}
                    onChange={(e) => setLotteryA(e.target.value as LotteryKey)}
                    className="block w-full pl-10 pr-4 py-2 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500"
                >
                    {Object.values(LOTTERY_CONFIGS).map((config) => (
                    <option key={config.key} value={config.key}>{config.name}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <IconA className="h-5 w-5 text-slate-400" />
                </div>
            </div>
          </div>

          <div className="text-slate-400 font-bold text-xl">VS</div>

          {/* Selector B */}
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Loteria B</label>
             <div className="relative">
                <select
                    value={lotteryB}
                    onChange={(e) => setLotteryB(e.target.value as LotteryKey)}
                    className="block w-full pl-10 pr-4 py-2 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500"
                >
                    {Object.values(LOTTERY_CONFIGS).map((config) => (
                    <option key={config.key} value={config.key}>{config.name}</option>
                    ))}
                </select>
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <IconB className="h-5 w-5 text-slate-400" />
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card A */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border-t-4" style={{ borderColor: configA.color }}>
            <div className="p-6 text-center border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <IconA className="w-12 h-12 mx-auto mb-2" style={{ color: configA.color }} />
                <h3 className="text-2xl font-bold">{configA.name}</h3>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Universo de Números</span>
                    <span className="font-bold">{configA.totalNumbers}</span>
                </div>
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Números Sorteados</span>
                    <span className="font-bold">{configA.drawSize}</span>
                </div>
                 <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Aposta Mínima</span>
                    <span className="font-bold">{configA.betSize} números</span>
                </div>
                <div>
                    <h4 className="font-semibold mb-2 text-sm uppercase text-slate-400">Probabilidade Principal</h4>
                    <p className="text-xl font-mono text-center py-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
                        {configA.probabilities[0].chance}
                    </p>
                </div>
            </div>
        </div>

        {/* Card B */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border-t-4" style={{ borderColor: configB.color }}>
            <div className="p-6 text-center border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <IconB className="w-12 h-12 mx-auto mb-2" style={{ color: configB.color }} />
                <h3 className="text-2xl font-bold">{configB.name}</h3>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Universo de Números</span>
                    <span className="font-bold">{configB.totalNumbers}</span>
                </div>
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Números Sorteados</span>
                    <span className="font-bold">{configB.drawSize}</span>
                </div>
                <div className="flex justify-between border-b dark:border-slate-700 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Aposta Mínima</span>
                    <span className="font-bold">{configB.betSize} números</span>
                </div>
                 <div>
                    <h4 className="font-semibold mb-2 text-sm uppercase text-slate-400">Probabilidade Principal</h4>
                    <p className="text-xl font-mono text-center py-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
                        {configB.probabilities[0].chance}
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Comparison Analysis */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4">Análise Comparativa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 text-slate-500">Dificuldade (Prêmio Principal)</h4>
                  {(() => {
                      const probA = getProbNumber(configA.probabilities[0].chance);
                      const probB = getProbNumber(configB.probabilities[0].chance);
                      const ratio = probA > probB ? (probA / probB).toFixed(1) : (probB / probA).toFixed(1);
                      const harder = probA > probB ? configA.name : configB.name;
                      const easier = probA > probB ? configB.name : configA.name;

                      return (
                          <p>
                              Ganhar na <span className="font-bold" style={{color: probA > probB ? configA.color : configB.color}}>{harder}</span> é cerca de <span className="font-bold text-lg">{ratio}x</span> mais difícil do que na {easier}.
                          </p>
                      )
                  })()}
              </div>
               <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 text-slate-500">Cobertura da Aposta</h4>
                  {(() => {
                      const covA = (configA.betSize / configA.totalNumbers * 100).toFixed(1);
                      const covB = (configB.betSize / configB.totalNumbers * 100).toFixed(1);
                      
                      return (
                          <p>
                              Uma aposta simples cobre <b>{covA}%</b> do total de números da {configA.name}, enquanto na {configB.name} cobre <b>{covB}%</b>.
                          </p>
                      )
                  })()}
              </div>
          </div>
      </div>
    </div>
  );
};

export default LotteryComparison;
