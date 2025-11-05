
import React, { useState, useEffect } from 'react';
import { LOTTERY_CONFIGS } from './constants';
import type { LotteryConfig, LotteryKey } from './types';
import LotteryAnalysis from './components/LotteryAnalysis';
import DarkModeToggle from './components/DarkModeToggle';

const App: React.FC = () => {
  const [activeLottery, setActiveLottery] = useState<LotteryKey>('megaSena');
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const renderTabs = () => {
    return (Object.keys(LOTTERY_CONFIGS) as LotteryKey[]).map((key) => {
      const config = LOTTERY_CONFIGS[key];
      const isActive = activeLottery === key;
      return (
        <button
          key={key}
          onClick={() => setActiveLottery(key)}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-slate-900 ${
            isActive
              ? 'text-white shadow-lg'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
          }`}
          style={{ backgroundColor: isActive ? config.color : '' }}
        >
          {config.name}
        </button>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="relative text-center mb-8">
          <div className="absolute top-0 right-0 z-10">
             <DarkModeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Análise Matemática de Loterias
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-3xl mx-auto">
            Faça o upload dos arquivos CSV com os resultados históricos para obter uma análise estatística detalhada, ver números mais e menos frequentes e receber sugestões de jogos.
          </p>
        </header>

        <main>
          <div className="mb-6">
            <div className="flex justify-center flex-wrap gap-2">
              {renderTabs()}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 transition-colors duration-300">
             {Object.keys(LOTTERY_CONFIGS).map((key) => (
              <div key={key} style={{ display: activeLottery === key ? 'block' : 'none' }}>
                <LotteryAnalysis config={LOTTERY_CONFIGS[key as LotteryKey]} isDarkMode={isDarkMode} />
              </div>
            ))}
          </div>

           <footer className="text-center mt-12 text-slate-600 dark:text-slate-500 text-sm">
            <p className="font-bold mb-2">Advertência Final do Especialista:</p>
            <p className="max-w-4xl mx-auto">
              Esta análise é um retrato do passado. A teoria das probabilidades sustenta que eventos futuros não são influenciados por resultados passados (a "Falácia do Jogador"). Use esta análise como uma ferramenta de estudo para entender o comportamento histórico dos sorteios, não como um método de previsão. A sorte é, por definição, imprevisível.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default App;