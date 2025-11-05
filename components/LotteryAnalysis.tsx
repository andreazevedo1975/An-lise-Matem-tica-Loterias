// Fix: Recreated the content for the LotteryAnalysis component.
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { analyzeLotteryData, regenerateSuggestions } from '../services/analysisService';
import type { LotteryConfig, AnalysisResult, GameSuggestions, SuggestionType, Frequency } from '../types';
import NumberBall from './NumberBall';

// A placeholder for a bar chart
const FrequencyChart = ({ data, color, totalDraws }: { data: Frequency[], color: string, totalDraws: number }) => {
  const maxCount = Math.max(...data.map(d => d.count), 0);

  return (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
      {data.sort((a, b) => a.number - b.number).map(({ number, count }) => (
        <div key={number} className="group relative flex flex-col items-center">
          <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 rounded-md flex flex-col-reverse">
            <div
              className="w-full rounded-md"
              style={{
                height: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`,
                backgroundColor: color,
              }}
            ></div>
          </div>
          <span className="text-xs font-semibold mt-1">{String(number).padStart(2, '0')}</span>
           <div className="absolute bottom-full mb-2 w-max p-2 text-xs text-white bg-slate-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            Sorteado {count} vezes ({totalDraws > 0 ? ((count/totalDraws)*100).toFixed(2) : 0}%)
          </div>
        </div>
      ))}
    </div>
  );
};

interface LotteryAnalysisProps {
  config: LotteryConfig;
  isDarkMode: boolean;
}

const LotteryAnalysis: React.FC<LotteryAnalysisProps> = ({ config }) => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiAnalysis, setGeminiAnalysis] = useState<string | null>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

  const [activeSuggestionTab, setActiveSuggestionTab] = useState<SuggestionType>('hot');
  const [suggestions, setSuggestions] = useState<GameSuggestions | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset state when config changes
    setAnalysisResult(null);
    setError(null);
    setGeminiAnalysis(null);
    setIsLoading(false);
    setIsGeminiLoading(false);
    setSuggestions(null);
  }, [config]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setGeminiAnalysis(null);
    
    try {
      const result = await analyzeLotteryData(file, config);
      setAnalysisResult(result);
      setSuggestions(result.suggestions);
    } catch (e: any) {
      setError(e.message || 'Ocorreu um erro ao analisar o arquivo.');
    } finally {
      setIsLoading(false);
      // Reset file input value to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [config]);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRegenerateSuggestions = () => {
    if (!analysisResult) return;
    const newSuggestions = regenerateSuggestions(analysisResult.frequencies, config);
    setSuggestions(newSuggestions);
  };
  
  const handleGeminiAnalysis = async () => {
    if (!analysisResult) return;
    
    setIsGeminiLoading(true);
    setGeminiAnalysis(null);
    setError(null);

    try {
      const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});

      const prompt = `
        Você é um especialista em análise de dados de loteria. Analise os seguintes dados para a ${config.name} e forneça um resumo perspicaz e fácil de entender para um leigo. 
        **NUNCA** sugira que resultados passados podem prever o futuro. Enfatize que isso é uma análise histórica e que a loteria é um jogo de azar.
        Seja breve e direto. Use markdown para formatação.

        Dados da Análise:
        - Total de Sorteios Analisados: ${analysisResult.totalDraws}
        - Números Mais Frequentes (Top 5): ${analysisResult.frequencies.slice(0, 5).map(f => `${f.number} (${f.count} vezes)`).join(', ')}
        - Números Menos Frequentes (Top 5): ${analysisResult.frequencies.slice(-5).map(f => `${f.number} (${f.count} vezes)`).join(', ')}
        - Pares de números que mais saíram juntos (Top 3): ${analysisResult.topPairs.slice(0, 3).map(p => `[${p.pair.join(', ')}] (${p.count} vezes)`).join('; ')}
        - Distribuição de Pares/Ímpares mais comum: ${analysisResult.evenOddDistribution[0]?.distribution} (${analysisResult.evenOddDistribution[0]?.count} vezes)
        - Sorteios Repetidos: ${analysisResult.repeatedDraws.length} sorteios se repetiram.

        Seu Resumo:
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setGeminiAnalysis(response.text);

    } catch(e: any) {
        console.error("Gemini API error:", e);
        setError("Não foi possível obter a análise do especialista. Verifique sua chave de API e a conexão.");
    } finally {
        setIsGeminiLoading(false);
    }
  };

  const renderSuggestions = () => {
    if (!suggestions) return null;

    const tabs: { key: SuggestionType, label: string }[] = [
      { key: 'hot', label: 'Quentes' },
      { key: 'cold', label: 'Frios' },
      { key: 'mixed', label: 'Mistos' },
    ];
    
    const currentSuggestion = suggestions[activeSuggestionTab] || [];

    return (
        <div className="mt-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Sugestões de Jogo</h3>
             <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700 mb-4">
                 {tabs.map(tab => (
                     <button key={tab.key} onClick={() => setActiveSuggestionTab(tab.key)} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeSuggestionTab === tab.key ? `border-blue-500 text-blue-600 dark:text-blue-400` : `border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300`}`}>
                         {tab.label}
                     </button>
                 ))}
             </div>
             <div className="flex flex-wrap gap-2 mb-4">
                 {currentSuggestion.map(num => <NumberBall key={num} number={num} color={config.color} />)}
             </div>
             <button
                onClick={handleRegenerateSuggestions}
                className="px-4 py-2 text-sm font-semibold rounded-md text-white transition-colors duration-200 shadow-md"
                style={{ backgroundColor: config.color }}
            >
                Gerar Nova Sugestão
            </button>
        </div>
    );
  };
  
  const renderAnalysis = () => {
      if (!analysisResult) return null;
      
      const { fileName, totalDraws, frequencies, repeatedDraws, lastDraws, topPairs, evenOddDistribution } = analysisResult;

      return (
          <div>
              <div className="mb-6 p-4 border-l-4 rounded-r-lg bg-slate-100 dark:bg-slate-700" style={{ borderColor: config.color }}>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Análise de <span style={{ color: config.color }}>{config.name}</span></h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Arquivo: {fileName} | Total de Sorteios: {totalDraws}</p>
              </div>

              {/* Gemini Analysis Section */}
              <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Análise do Especialista (IA)</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Clique no botão para obter um resumo dos dados gerado por inteligência artificial.</p>
                  <button
                    onClick={handleGeminiAnalysis}
                    disabled={isGeminiLoading}
                    className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md text-white transition-colors duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: config.color }}
                   >
                       {isGeminiLoading ? 'Analisando...' : 'Obter Análise da IA'}
                   </button>
                   {isGeminiLoading && <div className="mt-4 text-sm text-slate-500">Aguarde, a IA está processando os dados...</div>}
                   {geminiAnalysis && (
                       <div className="text-sm font-sans whitespace-pre-wrap mt-4 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg">{geminiAnalysis}</div>
                   )}
              </div>

              <div className="space-y-8">
                  {/* Frequency Analysis */}
                  <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Frequência dos Números</h3>
                      <FrequencyChart data={frequencies} color={config.color} totalDraws={totalDraws} />
                  </div>
                  
                  {/* Suggestions */}
                  {renderSuggestions()}
                  
                  {/* Last Draws */}
                   <div className="mt-6">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Últimos {lastDraws.length} Sorteios</h3>
                      <div className="space-y-3">
                          {lastDraws.map(({contest, draw}) => (
                              <div key={String(contest)} className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                                  <span className="font-mono text-sm text-slate-500 dark:text-slate-400">Concurso {contest}</span>
                                  <div className="flex flex-wrap gap-1">
                                      {draw.map(num => <NumberBall key={num} number={num} color={config.color} size="small"/>)}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                  
                  {/* Advanced Stats */}
                   <div className="mt-6">
                       <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Estatísticas Avançadas</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {/* Top Pairs */}
                           <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                               <h4 className="font-bold mb-2">Pares Mais Frequentes</h4>
                               <ul className="space-y-2 text-sm">
                                   {topPairs.map(({pair, count}) => (
                                       <li key={pair.join('-')} className="flex justify-between">
                                           <span>{pair.join(' & ')}</span>
                                           <span className="font-semibold text-slate-600 dark:text-slate-300">{count} vezes</span>
                                       </li>
                                   ))}
                               </ul>
                           </div>
                           
                           {/* Even/Odd */}
                            <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                               <h4 className="font-bold mb-2">Distribuição Pares/Ímpares</h4>
                               <ul className="space-y-2 text-sm">
                                   {evenOddDistribution.map(({distribution, count}) => (
                                       <li key={distribution} className="flex justify-between">
                                           <span>{distribution}</span>
                                           <span className="font-semibold text-slate-600 dark:text-slate-300">{count} vezes</span>
                                       </li>
                                   ))}
                               </ul>
                           </div>
                           
                           {/* Repeated Draws */}
                           {repeatedDraws.length > 0 && (
                                <div className="md:col-span-2 p-4 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                                   <h4 className="font-bold mb-2">Sorteios Repetidos ({repeatedDraws.length})</h4>
                                   <div className="text-sm max-h-40 overflow-y-auto">
                                       {repeatedDraws.map(({draw, contests}) => (
                                           <p key={draw.join('-')} className="mb-1">
                                               <strong>{draw.join(', ')}</strong> - Concursos: {contests.join(', ')}
                                           </p>
                                       ))}
                                   </div>
                               </div>
                           )}

                       </div>
                   </div>
              </div>
          </div>
      );
  };


  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
      />

      {isLoading && (
        <div className="text-center p-10">
          <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin mx-auto" style={{ borderColor: `${config.color} transparent` }}></div>
          <p className="mt-4 font-semibold">Analisando dados...</p>
        </div>
      )}

      {error && (
        <div className="text-center p-10 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          <h3 className="font-bold">Ocorreu um Erro</h3>
          <p className="text-sm mt-2">{error}</p>
           <button
              onClick={handleFileUploadClick}
              className="mt-4 px-4 py-2 text-sm font-semibold rounded-md text-white bg-red-600 hover:bg-red-700"
            >
             Tentar Novamente
            </button>
        </div>
      )}
      
      {!isLoading && !analysisResult && !error && (
        <div className="text-center py-12 px-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl">
            <div 
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: `${config.color}20` /* 20% opacity */ }}
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" style={{ color: config.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Comece sua Análise da {config.name}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6 max-w-lg mx-auto">
            Faça o upload do seu arquivo de resultados (.csv ou .xlsx) para gerar estatísticas, visualizar dados e obter sugestões.
          </p>
          <button
            onClick={handleFileUploadClick}
            className="px-6 py-3 font-semibold rounded-lg text-white shadow-lg transition-transform transform hover:scale-105"
            style={{ backgroundColor: config.color }}
          >
            Selecionar Arquivo
          </button>
        </div>
      )}

      {!isLoading && analysisResult && renderAnalysis()}

    </div>
  );
};

export default LotteryAnalysis;
