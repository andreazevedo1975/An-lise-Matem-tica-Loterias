import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
// Corrected: Import GoogleGenAI according to guidelines
import { GoogleGenAI } from '@google/genai';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { LotteryConfig, AnalysisResult, SuggestionType, GameSuggestions, Frequency } from '../types';
import { analyzeLotteryData, regenerateSuggestions } from '../services/analysisService';
import NumberBall from './NumberBall';

const FileUploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const ClearIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const LoadingSpinner = () => (
    <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-500"></div>
    </div>
);

const Card: React.FC<{ title: string, children: React.ReactNode, actions?: React.ReactNode, className?: string }> = ({ title, children, actions, className = '' }) => (
    <div className={`bg-slate-50 dark:bg-slate-800/50 rounded-lg shadow-md p-4 sm:p-6 ${className}`}>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200" style={{ color: 'inherit' }}>{title}</h3>
            {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
        <div>{children}</div>
    </div>
);

interface LotteryAnalysisProps {
  config: LotteryConfig;
  isDarkMode: boolean;
}

const LotteryAnalysis: React.FC<LotteryAnalysisProps> = ({ config, isDarkMode }) => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<GameSuggestions | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number[] | null>(null);
  const [selectedSuggestionType, setSelectedSuggestionType] = useState<SuggestionType | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [selectedNumberDetails, setSelectedNumberDetails] = useState<number | null>(null);
  const [selectedHotForCustom, setSelectedHotForCustom] = useState<number[]>([]);
  const [selectedColdForCustom, setSelectedColdForCustom] = useState<number[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
    setSuggestions(null);
    setSelectedSuggestion(null);
    setSelectedSuggestionType(null);
    setAiInsight(null);
    setIsAiLoading(false);
    setSelectedNumberDetails(null);
    setSelectedHotForCustom([]);
    setSelectedColdForCustom([]);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }, [config.key]);
  
  const pickRandomNumbers = (numbers: number[], count: number): number[] => {
      const shuffled = [...numbers].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count).sort((a, b) => a - b);
  }

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setSelectedSuggestion(null);
    setSelectedSuggestionType(null);
    setAiInsight(null);
    setSelectedNumberDetails(null);
    setSelectedHotForCustom([]);
    setSelectedColdForCustom([]);

    try {
      const result = await analyzeLotteryData(file, config);
      setAnalysisResult(result);
      setSuggestions(result.suggestions);
    } catch (e: any) {
      setError(e.message || 'Ocorreu um erro desconhecido durante a análise.');
    } finally {
      setIsLoading(false);
    }
  }, [config]);
  
  const handleRegenerateSuggestions = useCallback(() => {
    if (!analysisResult) return;
    const newSuggestions = regenerateSuggestions(analysisResult.frequencies, config);
    setSuggestions(newSuggestions);
    setSelectedSuggestion(null);
    setSelectedSuggestionType(null);
  }, [analysisResult, config]);

  const handleSelectSuggestion = (numbers: number[], type: SuggestionType) => {
    setSelectedSuggestion(numbers);
    setSelectedSuggestionType(type);
  };
  
  const handleNumberClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const number = data.activePayload[0].payload.number;
      setSelectedNumberDetails(number);
    }
  };

  const handleClearSelection = () => {
    setSelectedSuggestion(null);
    setSelectedSuggestionType(null);
  };

  const handleCopyToClipboard = () => {
    if (!selectedSuggestion) return;
    navigator.clipboard.writeText(selectedSuggestion.join(' - ')).then(() => {
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  const getAiInsight = useCallback(async () => {
    if (!analysisResult) return;

    setIsAiLoading(true);
    setAiInsight(null);
    setError(null);

    try {
      const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});

      const hotNumbers = analysisResult.frequencies.slice(0, 10).map(f => f.number);
      const coldNumbers = analysisResult.frequencies.slice(-10).map(f => f.number);

      const prompt = `Você é um especialista em análise de loterias. Com base nos seguintes dados da ${config.name}, forneça uma breve análise em português.
- Total de Sorteios Analisados: ${analysisResult.totalDraws}
- Números Mais Frequentes (Quentes): ${hotNumbers.join(', ')}
- Números Menos Frequentes (Frios): ${coldNumbers.join(', ')}
- Último Sorteio (o mais recente): ${analysisResult.lastDraws[0]?.draw.join(', ')}

Explique os conceitos de números quentes e frios, mas ALERTE o usuário sobre a "Falácia do Jogador", afirmando que resultados passados não influenciam resultados futuros em um jogo de puro acaso. Mantenha a análise concisa, informativa e neutra. Termine reforçando que a análise é puramente estatística e para fins de estudo, não uma previsão.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setAiInsight(response.text);

    } catch (e: any) {
      setError('Falha ao obter insight da IA. Verifique sua conexão ou chave de API.');
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  }, [analysisResult, config.name]);
  
  const handleToggleHotSelection = (number: number) => {
      setSelectedHotForCustom(prev => {
        const isSelected = prev.includes(number);
        if (isSelected) {
          return prev.filter(n => n !== number);
        } else if (prev.length < 2) {
          return [...prev, number];
        }
        return prev;
      });
  };
  
  const handleToggleColdSelection = (number: number) => {
      setSelectedColdForCustom(prev => {
        const isSelected = prev.includes(number);
        if (isSelected) {
          return prev.filter(n => n !== number);
        } else if (prev.length < 2) {
          return [...prev, number];
        }
        return prev;
      });
  };
  
  const handleGenerateCustomGame = () => {
    if (selectedHotForCustom.length !== 2 || selectedColdForCustom.length !== 2) return;
    
    const baseNumbers = [...selectedHotForCustom, ...selectedColdForCustom];
    const remainingCount = config.betSize - baseNumbers.length;

    if (remainingCount < 0) {
        handleSelectSuggestion(pickRandomNumbers(baseNumbers, config.betSize), 'custom');
        return;
    }

    const numberPool = Array.from({ length: config.totalNumbers }, (_, i) => i + 1)
        .filter(n => !baseNumbers.includes(n));
    
    const randomFill = pickRandomNumbers(numberPool, remainingCount);
    const finalGame = [...baseNumbers, ...randomFill].sort((a, b) => a - b);
    
    handleSelectSuggestion(finalGame, 'custom');
  };

  const chartData = useMemo(() => {
    if (!analysisResult?.frequencies) return [];
    // Create a copy before sorting to avoid state mutation
    return [...analysisResult.frequencies].sort((a, b) => a.number - b.number);
  }, [analysisResult?.frequencies]);

  const renderNumberDetailsModal = () => {
    if (selectedNumberDetails === null || !analysisResult) return null;

    const contests = analysisResult.drawsByNumber.get(selectedNumberDetails) || [];
    const frequency = analysisResult.frequencies.find(f => f.number === selectedNumberDetails);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 transition-opacity duration-300" 
            onClick={() => setSelectedNumberDetails(null)}
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'fade-in-scale 0.3s forwards' }}
            >
                <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Detalhes do Número</h3>
                    <button onClick={() => setSelectedNumberDetails(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex items-center gap-4 mb-4">
                    <NumberBall number={selectedNumberDetails} color={config.color} size="medium" />
                    <div>
                         <p className="text-slate-600 dark:text-slate-400">Sorteado</p>
                         <p className="text-2xl font-bold text-slate-900 dark:text-white">{frequency?.count || 0} vezes</p>
                    </div>
                </div>
                <div className="max-h-60 overflow-y-auto pr-2">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Sorteado nos concursos:</h4>
                    {contests.length > 0 ? (
                        <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1">
                           {contests.map((c, i) => <li key={`${c}-${i}`}>{c}</li>)}
                        </ul>
                    ) : (
                         <p className="text-slate-500 dark:text-slate-400 italic">Este número nunca foi sorteado.</p>
                    )}
                </div>
            </div>
        </div>
    );
  };
  
  return (
    <div className="p-4" style={{ color: config.color }}>
       <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">{config.name}</h2>
            <p className="text-slate-600 dark:text-slate-400">Faça o upload de um arquivo .csv ou .xlsx com os resultados para análise.</p>
            <div className="mt-4 flex justify-center">
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    className="hidden"
                    id={`file-upload-${config.key}`}
                />
                 <label 
                    htmlFor={`file-upload-${config.key}`}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: config.color }}
                 >
                    <FileUploadIcon />
                    Selecionar Arquivo
                </label>
            </div>
       </div>

      {isLoading && <LoadingSpinner />}
      {error && <div className="text-center p-4 text-red-500 bg-red-100 dark:bg-red-900/50 rounded-lg">{error}</div>}

      {analysisResult && (
        <div className="animate-fade-in">
             <div className="text-center mb-8 p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                <p className="text-lg">Análise do arquivo <span className="font-bold">{analysisResult.fileName}</span> com <span className="font-bold">{analysisResult.totalDraws}</span> sorteios válidos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* --- Suggestions & Selected Game --- */}
                <div className="lg:col-span-2">
                    {suggestions && (
                       <Card title="Sugestões de Jogos" actions={
                           <button onClick={handleRegenerateSuggestions} className="text-sm font-semibold p-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                            Gerar Novas
                           </button>
                       }>
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                                {(Object.keys(suggestions) as (keyof GameSuggestions)[]).map(key => {
                                    const suggestionNumbers = suggestions[key];
                                    if (!suggestionNumbers) return null;
                                    const typeName = key === 'hot' ? 'Quente' : key === 'cold' ? 'Frio' : 'Misto';
                                    const isSelected = selectedSuggestionType === key;
                                    const type = key as SuggestionType;
                                    return (
                                        <div key={key} onClick={() => handleSelectSuggestion(suggestionNumbers, type)} className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${isSelected ? 'shadow-lg' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/50'}`} style={{ borderColor: isSelected ? config.color : 'transparent' }}>
                                            <p className="font-bold mb-2">{typeName}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {suggestionNumbers.map(n => <NumberBall key={n} number={n} color={config.color} size="small" />)}
                                            </div>
                                        </div>
                                    )
                                })}
                           </div>
                       </Card>
                    )}
                    
                    {selectedSuggestion && (
                        <div className="mt-4 p-4 rounded-lg bg-slate-100 dark:bg-slate-900/50 animate-fade-in">
                            <h4 className="font-bold mb-3 text-lg">Seu Jogo Selecionado: <span className="capitalize">{selectedSuggestionType === 'custom' ? 'Misto Personalizado' : selectedSuggestionType}</span></h4>
                             <div className="flex flex-wrap gap-2 mb-4">
                                {selectedSuggestion.map(n => <NumberBall key={n} number={n} color={config.color} />)}
                            </div>
                            <div className="flex gap-2">
                                 <button onClick={handleCopyToClipboard} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2" style={{ backgroundColor: config.color }}>
                                    <CopyIcon /> {copyStatus === 'copied' ? 'Copiado!' : 'Copiar'}
                                </button>
                                <button onClick={handleClearSelection} className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2">
                                    <ClearIcon /> Limpar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                 {/* --- Rules & Probabilities --- */}
                <Card title="Regras e Probabilidades">
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li><strong>Universo:</strong> {config.totalNumbers} números</li>
                        <li><strong>Dezenas Sorteadas:</strong> {config.drawSize}</li>
                        <li><strong>Aposta Padrão:</strong> {config.betSize} números</li>
                        <li className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                            <strong>Probabilidades (Aposta Simples):</strong>
                            <ul className="list-disc list-inside pl-2 mt-1 space-y-1">
                                {config.probabilities.map(p => <li key={p.name}><strong>{p.name}:</strong> {p.chance}</li>)}
                            </ul>
                        </li>
                    </ul>
                </Card>

                {/* --- AI Insight --- */}
                <Card title="Análise com IA" actions={
                     <button onClick={getAiInsight} disabled={isAiLoading} className="text-sm font-semibold p-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">
                        {isAiLoading ? 'Analisando...' : 'Obter Insight'}
                    </button>
                }>
                    {isAiLoading && <LoadingSpinner />}
                    {aiInsight ? (
                         <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{aiInsight}</p>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Clique no botão para obter uma análise gerada por IA sobre os dados carregados.</p>
                    )}
                </Card>

                 {/* --- Frequency Chart --- */}
                <Card title="Frequência Geral" className="lg:col-span-2">
                     <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData} onClick={handleNumberClick}>
                                <XAxis dataKey="number" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip cursor={{ fill: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }} contentStyle={{ backgroundColor: isDarkMode ? '#334155' : '#fff' }} />
                                <Bar dataKey="count" name="Frequência" fill={config.color}>
                                    {analysisResult.frequencies.map((entry, index) => (
                                        <Cell key={`cell-${index}`} cursor="pointer"/>
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                 {/* --- Hot & Cold Numbers --- */}
                <Card title="Números Quentes e Frios">
                    <div>
                        <h4 className="font-semibold mb-2">Top {config.hotCount} Quentes (selecione 2)</h4>
                         <div className="flex flex-wrap gap-2 mb-4">
                            {analysisResult.frequencies.slice(0, config.hotCount).map(f => (
                                <div key={f.number} className={`cursor-pointer rounded-full transition-all ${selectedHotForCustom.includes(f.number) ? `ring-2 ring-offset-2 dark:ring-offset-slate-800` : ''}`} style={{ '--tw-ring-color': selectedHotForCustom.includes(f.number) ? config.color : 'transparent' } as React.CSSProperties} onClick={() => handleToggleHotSelection(f.number)}>
                                     <NumberBall number={f.number} color={config.color} size="small" />
                                </div>
                            ))}
                        </div>
                         <h4 className="font-semibold mb-2">Top {config.coldCount} Frios (selecione 2)</h4>
                        <div className="flex flex-wrap gap-2">
                             {analysisResult.frequencies.slice(-config.coldCount).map(f => (
                                <div key={f.number} className={`cursor-pointer rounded-full transition-all ${selectedColdForCustom.includes(f.number) ? `ring-2 ring-offset-2 dark:ring-offset-slate-800` : ''}`} style={{ '--tw-ring-color': selectedColdForCustom.includes(f.number) ? config.color : 'transparent' } as React.CSSProperties} onClick={() => handleToggleColdSelection(f.number)}>
                                    <NumberBall number={f.number} color="bg-slate-500 text-white" size="small" />
                                 </div>
                            ))}
                        </div>
                    </div>
                </Card>
                
                 {/* --- Custom Mix Generator --- */}
                <Card title="Gerador Misto Personalizado" className="lg:col-span-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Selecione 2 números quentes e 2 frios na lista acima para gerar um jogo personalizado.
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <p className="font-semibold text-sm">Quentes selecionados:</p>
                            <div className="flex flex-wrap gap-2 mt-1 h-10">
                                {selectedHotForCustom.length > 0 ? selectedHotForCustom.map(n => <NumberBall key={n} number={n} color={config.color} size="small"/>) : <span className="text-sm text-slate-400 italic">Nenhum</span>}
                            </div>
                        </div>
                         <div className="flex-1">
                            <p className="font-semibold text-sm">Frios selecionados:</p>
                            <div className="flex flex-wrap gap-2 mt-1 h-10">
                                {selectedColdForCustom.length > 0 ? selectedColdForCustom.map(n => <NumberBall key={n} number={n} color="bg-slate-500 text-white" size="small"/>) : <span className="text-sm text-slate-400 italic">Nenhum</span>}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <button
                          onClick={handleGenerateCustomGame}
                          disabled={selectedHotForCustom.length !== 2 || selectedColdForCustom.length !== 2}
                          className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: config.color }}
                        >
                            Gerar Jogo
                        </button>
                    </div>
                </Card>

                {/* --- Top Pairs --- */}
                <Card title="Pares Mais Frequentes">
                     <ul className="space-y-3">
                         {analysisResult.topPairs.map(({pair, count}) => (
                            <li key={pair.join('-')} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <NumberBall number={pair[0]} color={config.color} size="small"/>
                                    <NumberBall number={pair[1]} color={config.color} size="small"/>
                                </div>
                                <span className="font-semibold text-slate-500 dark:text-slate-400">{count} vezes</span>
                            </li>
                        ))}
                    </ul>
                </Card>

                {/* --- Even/Odd --- */}
                <Card title="Distribuição Pares/Ímpares (Top 5)">
                     <ul className="space-y-3">
                        {analysisResult.evenOddDistribution.slice(0, 5).map(({distribution, count}) => {
                            const percentage = (count / analysisResult.totalDraws) * 100;
                            return (
                                <li key={distribution}>
                                    <div className="flex justify-between items-center mb-1 text-sm font-semibold">
                                        <span>{distribution}</span>
                                        <span className="text-slate-500 dark:text-slate-400">{count} vezes</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                        <div className="h-2.5 rounded-full" style={{ width: `${percentage}%`, backgroundColor: config.color }}></div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </Card>

                 {/* --- Last 10 Draws --- */}
                <Card title="Últimos 10 Sorteios">
                    <div className="space-y-3">
                        {analysisResult.lastDraws.map(({contest, draw}) => (
                             <div key={contest} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                 <p className="font-bold text-sm mb-2 sm:mb-0">Concurso: {contest}</p>
                                <div className="flex flex-wrap gap-1">
                                    {draw.map(n => <NumberBall key={n} number={n} color={config.color} size="small" />)}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

            </div>
        </div>
      )}
      
      {renderNumberDetailsModal()}
    </div>
  );
};

export default LotteryAnalysis;