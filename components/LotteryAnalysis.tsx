import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { analyzeLotteryData, regenerateSuggestions, processDraws } from '../services/analysisService';
import type { LotteryConfig, AnalysisResult, GameSuggestions, SuggestionType, Frequency, NumberIntervalStats } from '../types';
import NumberBall from './NumberBall';

interface LotteryAnalysisProps {
  config: LotteryConfig;
  isDarkMode: boolean;
}

type SortKey = keyof NumberIntervalStats;

// --- Helper Icons ---
const HotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.934l.643-.643a1 1 0 00-1.414-1.414l-.644.643c-.276-.208-.59-.385-.934-.553a1 1 0 00-1.21.385l-.643.643a1 1 0 00-1.414 1.414l.643.643c-.168.344-.325.688-.478 1.043a1 1 0 00.385 1.21l.643.643a1 1 0 001.414-1.414l-.643-.643c.208-.276.425-.53.688-.748l-.643.643a1 1 0 001.414 1.414l.643-.643c.345.168.688.325 1.043.478a1 1 0 001.21-.385l.643-.643a1 1 0 00-1.414-1.414l-.643.643c.276-.208.53-.425.748-.688l.643.643a1 1 0 001.414-1.414l-.643-.643c.224-.345.45-.69.658-1.043a1 1 0 00-.385-1.21z" clipRule="evenodd" /></svg>;
const ColdIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" transform="rotate(45 10 10)" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H6zM8 7a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.293a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;


const LotteryAnalysis: React.FC<LotteryAnalysisProps> = ({ config, isDarkMode }) => {
  const [originalResult, setOriginalResult] = useState<AnalysisResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GameSuggestions | null>(null);
  
  const [selectedSuggestion, setSelectedSuggestion] = useState<number[] | null>(null);
  const [selectedSuggestionType, setSelectedSuggestionType] = useState<SuggestionType | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const [selectedNumber, setSelectedNumber] = useState<{ number: number; contests: (string | number)[] } | null>(null);
  
  const [isLastDrawsVisible, setIsLastDrawsVisible] = useState(false);
  const [isRepeatedDrawsVisible, setIsRepeatedDrawsVisible] = useState(false);
  const [lastDrawsSearchTerm, setLastDrawsSearchTerm] = useState('');

  const [selectedHot, setSelectedHot] = useState<number[]>([]);
  const [selectedCold, setSelectedCold] = useState<number[]>([]);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'number', direction: 'asc' });

  const [geminiAnalysis, setGeminiAnalysis] = useState<string | null>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset state when config changes
    setOriginalResult(null);
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
    setSuggestions(null);
    setSelectedSuggestion(null);
    setSelectedSuggestionType(null);
    setSelectedNumber(null);
    setIsLastDrawsVisible(false);
    setIsRepeatedDrawsVisible(false);
    setLastDrawsSearchTerm('');
    setSelectedHot([]);
    setSelectedCold([]);
    setSortConfig({ key: 'number', direction: 'asc' });
    setGeminiAnalysis(null);
    setIsGeminiLoading(false);
    setStartDate('');
    setEndDate('');
  }, [config]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    
    try {
      const result = await analyzeLotteryData(Array.from(files), config);
      setOriginalResult(result);
      setAnalysisResult(result);
      setSuggestions(result.suggestions);

      if (result.allDraws.length > 0) {
        // Since data is sorted newest to oldest
        const lastDate = result.allDraws[0].date;
        const firstDate = result.allDraws[result.allDraws.length - 1].date;
        setStartDate(firstDate.toISOString().split('T')[0]);
        setEndDate(lastDate.toISOString().split('T')[0]);
      }

    } catch (e: any) {
      setError(e.message || 'Ocorreu um erro ao analisar os arquivos.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [config]);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilterApply = () => {
      if (!originalResult || !startDate || !endDate) return;

      // This correctly interprets the date string in the user's local timezone
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');

      const filteredDraws = originalResult.allDraws.filter(draw => {
          return draw.date >= start && draw.date <= end;
      });

      if (filteredDraws.length === 0) {
          setError("Nenhum sorteio encontrado no período selecionado.");
          setAnalysisResult({ ...originalResult, totalDraws: 0, frequencies: [], lastDraws: [] }); // Clear view but keep context
          return;
      }

      setError(null);
      const newProcessedData = processDraws(filteredDraws, config);
      const newResultState: AnalysisResult = {
          fileNames: originalResult.fileNames,
          allDraws: originalResult.allDraws, // Keep the full list for re-filtering
          ...newProcessedData,
      };
      setAnalysisResult(newResultState);
      setSuggestions(newResultState.suggestions);
  };

  const handleFilterClear = () => {
      if (!originalResult) return;
      setAnalysisResult(originalResult);
      setSuggestions(originalResult.suggestions);
      setError(null);

      // Reset date inputs to original full range
      if (originalResult.allDraws.length > 0) {
        const lastDate = originalResult.allDraws[0].date;
        const firstDate = originalResult.allDraws[originalResult.allDraws.length - 1].date;
        setStartDate(firstDate.toISOString().split('T')[0]);
        setEndDate(lastDate.toISOString().split('T')[0]);
      }
  };

  const handleRegenerateSuggestions = () => {
    if (!analysisResult) return;
    const newSuggestions = regenerateSuggestions(analysisResult.frequencies, config);
    setSuggestions(newSuggestions);
    setSelectedSuggestion(null);
    setSelectedSuggestionType(null);
  };

  const handleSelectSuggestion = (type: SuggestionType) => {
    if (!suggestions) return;
    if (type === 'hot' || type === 'cold' || type === 'mixed') {
      setSelectedSuggestion(suggestions[type]);
    }
    setSelectedSuggestionType(type);
    setIsCopied(false);
  };

  const handleCopy = () => {
    if (!selectedSuggestion) return;
    navigator.clipboard.writeText(selectedSuggestion.join(', '));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0] && analysisResult) {
      const number = data.activePayload[0].payload.number;
      const contests = analysisResult.drawsByNumber.get(number) || [];
      setSelectedNumber({ number, contests });
    }
  };

  const handleNumberClick = (number: number) => {
     if (analysisResult) {
      const contests = analysisResult.drawsByNumber.get(number) || [];
      setSelectedNumber({ number, contests });
    }
  }

  const handleCustomNumberSelect = (number: number, type: 'hot' | 'cold') => {
    const setter = type === 'hot' ? setSelectedHot : setSelectedCold;
    
    setter(prev => {
      if (prev.includes(number)) {
        return prev.filter(n => n !== number);
      }
      
      const newSelection = [...prev, number];
      if (newSelection.length > 2) {
        newSelection.shift();
      }
      return newSelection;
    });
  }

  const pickRandomNumbers = (numbers: number[], count: number): number[] => {
      const shuffled = [...numbers].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count).sort((a, b) => a - b);
  }

  const handleGenerateCustomGame = () => {
    if (!analysisResult || selectedHot.length !== 2 || selectedCold.length !== 2) return;

    const baseNumbers = [...selectedHot, ...selectedCold];
    const remainingNumbers = config.betSize - baseNumbers.length;
    
    const hotNumbers = analysisResult.frequencies.slice(0, config.hotCount).map(f => f.number);
    const coldNumbers = analysisResult.frequencies.slice(-config.coldCount).map(f => f.number);
    const extremeNumbers = new Set([...hotNumbers, ...coldNumbers]);

    const neutralPool = Array.from({ length: config.totalNumbers }, (_, i) => i + 1)
        .filter(n => !extremeNumbers.has(n) && !baseNumbers.includes(n));
    
    const fillerNumbers = pickRandomNumbers(neutralPool, remainingNumbers);
    
    const customGame = [...baseNumbers, ...fillerNumbers].sort((a,b) => a-b);
    
    setSelectedSuggestion(customGame);
    setSelectedSuggestionType('custom');
  };

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedIntervalStats = useMemo(() => {
    if (!analysisResult) return [];
    const sortableItems = [...analysisResult.intervalStats];
    sortableItems.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortableItems;
  }, [analysisResult, sortConfig]);

  const chartData = useMemo(() => {
    if (!analysisResult) return [];
    // Create a copy to sort for the chart, preserving the original order
    return [...analysisResult.frequencies].sort((a, b) => a.number - b.number);
  }, [analysisResult]);

  const formatGeminiResponse = (text: string) => {
    if (!text) return '';
    const lines = text.split('\n');
    let html = '';
    let inList = false;

    const processLine = (line: string) => {
      return line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    };

    for (const line of lines) {
        if (line.startsWith('* ')) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            html += `<li>${processLine(line.substring(2))}</li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            if (line.trim()) {
               html += `<p>${processLine(line)}</p>`;
            }
        }
    }
    if (inList) {
        html += '</ul>';
    }
    return html;
  };

  const handleGeminiAnalysis = async () => {
    if (!analysisResult || !suggestions) return;
    
    setIsGeminiLoading(true);
    setGeminiAnalysis(null);
    setError(null);

    try {
      const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

      const prompt = `
        Você é um especialista em análise estatística de dados de loteria. Sua análise deve ser estritamente baseada nos dados históricos fornecidos, mantendo uma postura neutra e informativa.

        **Regra Fundamental:** Enfatize repetidamente que a loteria é um jogo de puro azar. Resultados passados não influenciam resultados futuros. A probabilidade de qualquer combinação de números ser sorteada é sempre a mesma em cada concurso. Use esta análise apenas como um estudo de curiosidades históricas.

        **Dados para Análise da ${config.name}:**
        - **Período Analisado:** ${analysisResult.totalDraws} sorteios.
        - **Números Mais Frequentes (Top 5):** ${analysisResult.frequencies.slice(0, 5).map(f => `${String(f.number).padStart(2, '0')} (${f.count}x)`).join(', ')}.
        - **Números Menos Frequentes (Top 5):** ${analysisResult.frequencies.slice(-5).reverse().map(f => `${String(f.number).padStart(2, '0')} (${f.count}x)`).join(', ')}.
        - **Pares Mais Comuns (Top 3):** ${analysisResult.topPairs.slice(0, 3).map(p => `[${p.pair.join(', ')}] (${p.count}x)`).join('; ')}.
        - **Distribuição Par/Ímpar Mais Comum:** ${analysisResult.evenOddDistribution[0]?.distribution} (ocorreu ${analysisResult.evenOddDistribution[0]?.count} vezes).

        **Sugestões de Jogos Geradas (Baseadas em Frequência Histórica):**
        - **Jogo Quente:** ${suggestions.hot.join(', ')}
        - **Jogo Frio:** ${suggestions.cold.join(', ')}
        - **Jogo Misto:** ${suggestions.mixed.join(', ')}

        **Sua Tarefa (use markdown para formatação):**
        1.  **Resumo dos Dados:** Apresente os dados acima de forma clara e resumida. Destaque os números que mais e menos apareceram historicamente.
        2.  **Análise das Sugestões Geradas:**
            *   Explique a lógica por trás de cada sugestão (Jogo Quente = baseado nos mais frequentes, etc.).
            *   **Importante:** Imediatamente após explicar as sugestões, reforce a regra fundamental. Afirme que a probabilidade de CADA UMA dessas sugestões ser sorteada é exatamente ${config.probabilities[0].chance}, a mesma de qualquer outra combinação possível.
        3.  **Conclusão e Advertência:** Termine com uma advertência clara, reiterando que a análise é uma ferramenta de estudo sobre o comportamento passado dos números e não deve ser usada como um método de previsão. A sorte é o único fator determinante.
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setGeminiAnalysis(response.text);

    } catch(e: any) {
        console.error("Gemini API error:", e);
        setError("Erro ao se comunicar com a IA. A análise do especialista não pôde ser gerada. Por favor, tente novamente mais tarde.");
    } finally {
        setIsGeminiLoading(false);
    }
  };
  
  const exportDataToCSV = () => {
    if (!analysisResult) return;

    const { frequencies, intervalStats } = analysisResult;

    // Combine frequency and interval data
    const combinedData = Array.from({ length: config.totalNumbers }, (_, i) => {
        const number = i + 1;
        const freqData = frequencies.find(f => f.number === number);
        const intervalData = intervalStats.find(is => is.number === number);
        return {
            numero: number,
            frequencia: freqData?.count || 0,
            atraso_atual: intervalData?.currentDelay ?? 'N/A',
            intervalo_medio: intervalData?.avgInterval ?? 'N/A',
            maior_atraso: intervalData?.maxDelay ?? 'N/A',
        };
    });

    // Create CSV content
    const header = "Numero,Frequencia,Atraso_Atual,Intervalo_Medio,Maior_Atraso\n";
    const rows = combinedData.map(d =>
        `${d.numero},${d.frequencia},${d.atraso_atual},${d.intervalo_medio},${d.maior_atraso}`
    ).join('\n');

    const csvContent = header + rows;

    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `analise_${config.key}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && analysisResult) {
      const numberData = payload[0].payload;
      const contests = analysisResult.drawsByNumber.get(numberData.number) || [];
      const contestPreview = contests.slice(0, 5).join(', ');
      const hasMoreContests = contests.length > 5;

      return (
        <div className="p-3 rounded-lg shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200" >
          <p className="font-bold text-lg" style={{ color: config.color }}>Número {label}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Frequência: {numberData.count} vezes</p>
          {contests.length > 0 && (
            <>
              <hr className="my-2 border-slate-200 dark:border-slate-700" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Sorteado em: {contestPreview}{hasMoreContests ? '...' : ''}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">Clique na barra para ver todos os concursos.</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };


  const renderAnalysis = () => {
      if (!analysisResult) return null;
      
      const { fileNames, totalDraws, frequencies, repeatedDraws, lastDraws, topPairs, evenOddDistribution } = analysisResult;
      const hotNumbers = frequencies.slice(0, config.hotCount);
      const coldNumbers = frequencies.slice(-config.coldCount).reverse();

      const filteredLastDraws = lastDraws.filter(draw => {
        if (!lastDrawsSearchTerm) return true; // Show all if search is empty
        const searchTerm = lastDrawsSearchTerm.toLowerCase();
        
        const contestMatch = String(draw.contest).toLowerCase().includes(searchTerm);
        
        // Format date as dd/mm/yyyy for searching
        const formattedDate = draw.date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const dateMatch = formattedDate.includes(searchTerm);
        
        return contestMatch || dateMatch;
      });

      return (
        <div className="animate-fade-in-scale">
          {/* --- MODAL --- */}
          {selectedNumber && (
            <div 
              className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
              onClick={() => setSelectedNumber(null)}
            >
              <div 
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md animate-fade-in-scale"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <NumberBall number={selectedNumber.number} color={config.color} />
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Número {String(selectedNumber.number).padStart(2, '0')}</h3>
                      <p className="text-slate-500 dark:text-slate-400">Sorteado {selectedNumber.contests.length} vezes</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Sorteado nos concursos:</p>
                  <div className="max-h-60 overflow-y-auto bg-slate-100 dark:bg-slate-900/50 p-3 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-mono tracking-wider leading-relaxed">
                      {selectedNumber.contests.length > 0 ? selectedNumber.contests.join(', ') : 'Nenhum sorteio registrado.'}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 text-right rounded-b-xl">
                    <button 
                        onClick={() => setSelectedNumber(null)}
                        className="px-4 py-2 text-sm font-semibold rounded-md text-white"
                        style={{backgroundColor: config.color}}
                    >
                        Fechar
                    </button>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6 p-4 border-l-4 rounded-r-lg bg-slate-100 dark:bg-slate-700/50" style={{ borderColor: config.color }}>
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Análise de <span style={{ color: config.color }}>{config.name}</span></h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Arquivos: {fileNames.join(', ')} | Sorteios no período: {totalDraws}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-sm">
                   <label htmlFor="start-date" className="text-slate-600 dark:text-slate-400">De:</label>
                   <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1 border rounded bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"/>
                   <label htmlFor="end-date" className="text-slate-600 dark:text-slate-400">Até:</label>
                   <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1 border rounded bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"/>
                   <button onClick={handleFilterApply} className="px-3 py-1 font-semibold rounded-md text-white" style={{ backgroundColor: config.color }}>Aplicar</button>
                   <button onClick={handleFilterClear} className="px-3 py-1 font-semibold rounded-md bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-200">Limpar</button>
                </div>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Coluna da Esquerda (Sugestões e Seleção) */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Regras e Probabilidades */}
              <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl">
                <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-200">Regras e Probabilidades</h3>
                <div className="text-sm space-y-2 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between"><span>Universo de Números:</span><span className="font-semibold">{config.totalNumbers}</span></div>
                  <div className="flex justify-between"><span>Dezenas Sorteadas:</span><span className="font-semibold">{config.drawSize}</span></div>
                  <div className="flex justify-between"><span>Aposta Padrão:</span><span className="font-semibold">{config.betSize}</span></div>
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    {config.probabilities.map(p => (
                       <div key={p.name} className="flex justify-between"><span>{p.name}:</span><span className="font-semibold">{p.chance}</span></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sugestões */}
              {suggestions && (
                <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl">
                   <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Sugestões de Jogos</h3>
                     <button
                        onClick={handleRegenerateSuggestions}
                        className="px-3 py-1 text-xs font-semibold rounded-full text-white transition-colors duration-200 shadow-sm"
                        style={{ backgroundColor: config.color }}
                      >
                        Gerar Novas
                      </button>
                   </div>
                  
                  { (['hot', 'cold', 'mixed'] as (keyof GameSuggestions)[]).map(type => (
                      <div 
                        key={type}
                        onClick={() => handleSelectSuggestion(type)}
                        className={`p-3 rounded-lg mb-2 cursor-pointer transition-all duration-200 border-2 ${selectedSuggestionType === type ? 'border-opacity-100 shadow-lg' : 'border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        style={{ borderColor: selectedSuggestionType === type ? config.color : 'transparent' }}
                      >
                         <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 capitalize">{type === 'hot' ? 'Quente' : type === 'cold' ? 'Frio' : 'Misto'}</h4>
                         <div className="flex flex-wrap gap-1">
                            {suggestions[type].map(num => <NumberBall key={num} number={num} color={config.color} size="small"/>)}
                         </div>
                      </div>
                  )) }
                </div>
              )}

              {/* Jogo Selecionado */}
              {selectedSuggestion && (
                  <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl animate-fade-in-scale">
                      <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-200">Seu Jogo Selecionado</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedSuggestion.map(num => <NumberBall key={num} number={num} color={config.color}/>)}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCopy}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md text-white transition-colors duration-200 shadow-md"
                          style={{ backgroundColor: isCopied ? '#10B981' : config.color }}
                        >
                          {isCopied ? <CheckIcon /> : <CopyIcon />}
                          {isCopied ? 'Copiado!' : 'Copiar'}
                        </button>
                        <button
                            onClick={() => { setSelectedSuggestion(null); setSelectedSuggestionType(null); }}
                            className="w-full px-4 py-2 text-sm font-semibold rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                        >
                            Limpar
                        </button>
                      </div>
                  </div>
              )}
            </div>

            {/* Coluna da Direita (Análises) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Gemini Analysis Section */}
              <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl">
                  <h3 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-200">Análise do Especialista (IA)</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Clique para obter um resumo dos dados gerado por inteligência artificial, utilizando a API do Google Gemini.</p>
                  <button
                    onClick={handleGeminiAnalysis}
                    disabled={isGeminiLoading}
                    className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md text-white transition-colors duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: config.color }}
                   >
                       {isGeminiLoading ? 'Analisando...' : 'Obter Análise da IA'}
                   </button>
                   {isGeminiLoading && <div className="mt-4 text-sm text-slate-500 animate-pulse">Aguarde, a IA está processando os dados...</div>}
                   {error && !geminiAnalysis && (
                     <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
                   )}
                   {geminiAnalysis && (
                       <div 
                         className="prose prose-sm dark:prose-invert max-w-none mt-4 p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg"
                         dangerouslySetInnerHTML={{ __html: formatGeminiResponse(geminiAnalysis) }}
                        />
                   )}
              </div>
              
              {/* Frequência Geral */}
              <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl">
                 <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-200">Frequência Geral dos Números</h3>
                 <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e2e8f0"} />
                      <XAxis dataKey="number" tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                      <YAxis tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                      <Tooltip
                        cursor={{ fill: `${config.color}20` }}
                        content={<CustomTooltip />}
                      />
                      <Bar dataKey="count" name="Frequência">
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={config.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                 </div>
              </div>
              
              {/* Gerador Misto Personalizado */}
              <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl">
                <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-200">Gerador Misto Personalizado</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Selecione 2 números quentes e 2 frios abaixo para criar um jogo misto com base na sua escolha. O restante será preenchido com números "neutros".
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-semibold text-center mb-2 text-slate-800 dark:text-slate-300">Quentes (Selecione 2)</h4>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {hotNumbers.map(({number}) => (
                            <button key={number} onClick={() => handleCustomNumberSelect(number, 'hot')} className={`w-10 h-10 rounded-full font-bold transition-all text-sm ${selectedHot.includes(number) ? 'ring-2 ring-offset-2 dark:ring-offset-slate-900' : ''}`} style={{ backgroundColor: config.color, color: 'white', '--tw-ring-color': config.color } as React.CSSProperties}>
                                {String(number).padStart(2,'0')}
                            </button>
                        ))}
                    </div>
                  </div>
                   <div>
                    <h4 className="font-semibold text-center mb-2 text-slate-800 dark:text-slate-300">Frios (Selecione 2)</h4>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {coldNumbers.map(({number}) => (
                           <button key={number} onClick={() => handleCustomNumberSelect(number, 'cold')} className={`w-10 h-10 rounded-full font-bold transition-all text-sm bg-slate-400 dark:bg-slate-600 text-white ${selectedCold.includes(number) ? 'ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-slate-500' : ''}`}>
                               {String(number).padStart(2,'0')}
                           </button>
                        ))}
                    </div>
                  </div>
                </div>
                <button
                    onClick={handleGenerateCustomGame}
                    disabled={selectedHot.length !== 2 || selectedCold.length !== 2}
                    className="w-full px-4 py-2 font-semibold rounded-md text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ backgroundColor: config.color }}
                >
                    Gerar Jogo
                </button>
              </div>

              {/* Números Quentes e Frios */}
              <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold mb-3 text-slate-800 dark:text-slate-200 flex items-center gap-2"><HotIcon/> Números Quentes <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(Top {config.hotCount})</span></h4>
                      <div className="flex flex-wrap gap-2">
                          {hotNumbers.map(({number, count}) => (
                              <div key={number} onClick={() => handleNumberClick(number)} className="cursor-pointer">
                                  <NumberBall number={number} color={`${config.color}`}/>
                              </div>
                          ))}
                      </div>
                    </div>
                     <div>
                      <h4 className="font-bold mb-3 text-slate-800 dark:text-slate-200 flex items-center gap-2"><ColdIcon/> Números Frios <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(Top {config.coldCount})</span></h4>
                      <div className="flex flex-wrap gap-2">
                          {coldNumbers.map(({number, count}) => (
                             <div key={number} onClick={() => handleNumberClick(number)} className="cursor-pointer">
                                  <NumberBall number={number} color={`bg-slate-400 dark:bg-slate-600`}/>
                              </div>
                          ))}
                      </div>
                    </div>
                 </div>
              </div>
              
               {/* Advanced Stats */}
               <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl">
                 <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Estatísticas Avançadas</h3>
                    <button
                        onClick={exportDataToCSV}
                        className="flex items-center px-3 py-1 text-xs font-semibold rounded-full text-white transition-colors duration-200 shadow-sm"
                        style={{ backgroundColor: config.color }}
                    >
                       <DownloadIcon />
                       Exportar Dados (CSV)
                    </button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Top Pairs */}
                     <div>
                         <h4 className="font-bold mb-2 text-slate-800 dark:text-slate-300">Pares Mais Frequentes (Top 10)</h4>
                         <div className="space-y-2 text-sm">
                             {topPairs.map(({pair, count}) => (
                                 <div key={pair.join('-')} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                      <div className="flex items-center gap-1">
                                         <NumberBall number={pair[0]} color={config.color} size="small" />
                                         <NumberBall number={pair[1]} color={config.color} size="small" />
                                      </div>
                                     <span className="font-semibold text-slate-500 dark:text-slate-300">{count} vezes</span>
                                 </div>
                             ))}
                         </div>
                     </div>
                     
                     {/* Even/Odd */}
                      <div>
                         <h4 className="font-bold mb-2 text-slate-800 dark:text-slate-300">Distribuição Pares/Ímpares (Top 5)</h4>
                         <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                             {evenOddDistribution.slice(0, 5).map(({distribution, count}) => (
                                 <div key={distribution}>
                                     <div className="flex justify-between mb-1">
                                         <span>{distribution}</span>
                                         <span className="font-semibold text-slate-500 dark:text-slate-300">{count}x</span>
                                     </div>
                                     <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                         <div className="h-2 rounded-full" style={{ width: `${(count / totalDraws) * 100}%`, backgroundColor: config.color }}></div>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
               </div>
               
                {/* Repeated Draws */}
                {repeatedDraws.length > 0 && (
                    <div className="bg-slate-100 dark:bg-slate-900/50 rounded-xl">
                        <button
                          onClick={() => setIsRepeatedDrawsVisible(!isRepeatedDrawsVisible)}
                          className="w-full p-4 text-left font-bold text-lg text-slate-800 dark:text-slate-200 flex justify-between items-center"
                        >
                          <span>Sorteios Repetidos ({repeatedDraws.length})</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isRepeatedDrawsVisible ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                        {isRepeatedDrawsVisible && (
                            <div className="p-4 pt-0 space-y-4 animate-fade-in-scale">
                                {repeatedDraws.map(({draw, contests}) => (
                                    <div key={draw.join('-')} className="p-3 rounded-lg bg-slate-200/50 dark:bg-slate-800/50">
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {draw.map(num => <NumberBall key={num} number={num} color={config.color} size="small"/>)}
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            <span className="font-semibold">Concursos:</span>
                                            <span className="font-mono ml-2">{contests.join(', ')}</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}


                {/* Interval Analysis */}
                <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl">
                    <h3 className="font-bold text-lg mb-3 text-slate-800 dark:text-slate-200">Análise de Intervalos e Atrasos</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-200/50 dark:bg-slate-700/50 dark:text-slate-300">
                                <tr>
                                    {([
                                        {key: 'number', label: 'Número'},
                                        {key: 'currentDelay', label: 'Atraso Atual'},
                                        {key: 'avgInterval', label: 'Intervalo Médio'},
                                        {key: 'maxDelay', label: 'Maior Atraso'}
                                    ] as {key: SortKey, label: string}[])
                                    .map(({key: columnKey, label}) => (
                                        <th key={columnKey} scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort(columnKey)}>
                                            {label} {sortConfig.key === columnKey ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedIntervalStats.map(stat => (
                                    <tr key={stat.number} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/50">
                                        <th scope="row" className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap dark:text-white">{String(stat.number).padStart(2, '0')}</th>
                                        <td className={`px-4 py-3 font-semibold ${stat.currentDelay > stat.avgInterval && stat.avgInterval > 0 ? 'text-red-500' : ''}`}>{stat.currentDelay}</td>
                                        <td className="px-4 py-3">{stat.avgInterval}</td>
                                        <td className="px-4 py-3">{stat.maxDelay}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

              {/* Last Draws */}
              <div className="bg-slate-100 dark:bg-slate-900/50 rounded-xl">
                <button
                  onClick={() => setIsLastDrawsVisible(!isLastDrawsVisible)}
                  className="w-full p-4 text-left font-bold text-lg text-slate-800 dark:text-slate-200 flex justify-between items-center"
                >
                  <span>Últimos 10 Sorteios do Período</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isLastDrawsVisible ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
                {isLastDrawsVisible && (
                    <div className="p-4 pt-0 animate-fade-in-scale">
                        <input
                            type="text"
                            placeholder="Buscar por concurso ou data (dd/mm/aaaa)..."
                            value={lastDrawsSearchTerm}
                            onChange={(e) => setLastDrawsSearchTerm(e.target.value)}
                            className="w-full p-2 mb-3 bg-slate-200 dark:bg-slate-700 rounded-md border border-slate-300 dark:border-slate-600 focus:ring-2 focus:outline-none text-slate-700 dark:text-slate-300"
                            style={{ '--tw-ring-color': config.color } as React.CSSProperties}
                        />
                        <div className="space-y-3">
                            {filteredLastDraws.length > 0 ? (
                                filteredLastDraws.map(({ contest, draw, date }) => (
                                <div key={String(contest)} className="p-2 rounded-lg bg-slate-200/50 dark:bg-slate-800/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-sm text-slate-500 dark:text-slate-400">Concurso {contest}</span>
                                        <span className="font-sans text-xs text-slate-500 dark:text-slate-400">{date.toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {draw.map(num => <NumberBall key={num} number={num} color={config.color} size="small"/>)}
                                    </div>
                                </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 dark:text-slate-400 py-4">Nenhum sorteio encontrado para a busca.</p>
                            )}
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
        multiple
      />

      {isLoading && (
        <div className="text-center p-10">
          <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin mx-auto dark:border-slate-600" style={{ borderTopColor: config.color }}></div>
          <p className="mt-4 font-semibold">Analisando dados...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center p-10 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          <h3 className="font-bold">Ocorreu um Erro na Análise</h3>
          <p className="text-sm mt-2 max-w-md mx-auto">{error}</p>
           <button
              onClick={handleFileUploadClick}
              className="mt-4 px-4 py-2 text-sm font-semibold rounded-md text-white bg-red-600 hover:bg-red-700"
            >
             Selecionar Outros Arquivos
            </button>
        </div>
      )}
      
      {!isLoading && !analysisResult && !error && (
        <div className="text-center py-12 px-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl transition-all hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <div 
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 transition-colors"
              style={{ backgroundColor: `${config.color}20` }}
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 transition-colors" style={{ color: config.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Comece sua Análise da {config.name}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6 max-w-lg mx-auto">
            Faça o upload de um ou mais arquivos de resultados (.csv ou .xlsx) para consolidar os dados, gerar estatísticas e visualizar as informações.
          </p>
          <button
            onClick={handleFileUploadClick}
            className="px-6 py-3 font-semibold rounded-lg text-white shadow-lg transition-transform transform hover:scale-105"
            style={{ backgroundColor: config.color }}
          >
            Selecionar Arquivos
          </button>
        </div>
      )}

      {!isLoading && analysisResult && renderAnalysis()}

    </div>
  );
};

export default LotteryAnalysis;