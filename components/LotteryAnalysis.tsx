
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { analyzeLotteryData, regenerateSuggestions, processDraws } from '../services/analysisService';
import type { LotteryConfig, AnalysisResult, GameSuggestions, SuggestionType, Frequency, NumberIntervalStats, DrawData } from '../types';
import NumberBall from './NumberBall';
import ProbabilityTable from './ProbabilityTable';

interface LotteryAnalysisProps {
  config: LotteryConfig;
  isDarkMode: boolean;
}

type SortKey = keyof NumberIntervalStats;
type AIAnalysisType = 'math' | 'geo';

// --- Helper Icons ---
const HotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.934l.643-.643a1 1 0 00-1.414-1.414l-.644.643c-.276-.208-.59-.385-.934-.553a1 1 0 00-1.21.385l-.643.643a1 1 0 00-1.414 1.414l.643.643c-.168.344-.325.688-.478 1.043a1 1 0 00.385 1.21l.643.643a1 1 0 001.414-1.414l-.643-.643c.208-.276.425-.53.688-.748l-.643.643a1 1 0 001.414 1.414l.643-.643c.345.168.688.325 1.043.478a1 1 0 001.21-.385l.643.643a1 1 0 00-1.414-1.414l-.643-.643c.276-.208.53-.425.748-.688l.643.643a1 1 0 001.414-1.414l-.643-.643c.224-.345.45-.69.658-1.043a1 1 0 00-.385-1.21z" clipRule="evenodd" /></svg>;
const ColdIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" transform="rotate(45 10 10)" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H6zM8 7a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
const DownloadIcon = ({ className = "h-5 w-5 mr-2" }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.293a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v10l-5-4-5 4V4z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" /></svg>;
const ExportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" /></svg>;
const ExternalLinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>;

const pickRandomNumbers = (numbers: number[], count: number): number[] => {
    const shuffled = [...numbers].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).sort((a, b) => a - b);
}

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
  const [selectedDrawDetail, setSelectedDrawDetail] = useState<DrawData | null>(null);
  
  const [customSelection, setCustomSelection] = useState<number[]>([]);
  const [savedGames, setSavedGames] = useState<number[][]>([]);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'number', direction: 'asc' });

  const [geminiAnalysis, setGeminiAnalysis] = useState<string | null>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [aiAnalysisType, setAiAnalysisType] = useState<AIAnalysisType>('math');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isContestListExpanded, setIsContestListExpanded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const savedGamesKey = `savedGames_${config.key}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(savedGamesKey);
      if (saved) {
        setSavedGames(JSON.parse(saved));
      } else {
        setSavedGames([]);
      }
    } catch (error) {
      console.error("Failed to load saved games from localStorage", error);
      setSavedGames([]);
    }
  }, [savedGamesKey]);

  useEffect(() => {
    try {
      localStorage.setItem(savedGamesKey, JSON.stringify(savedGames));
    } catch (error) {
      console.error("Failed to save games to localStorage", error);
    }
  }, [savedGames, savedGamesKey]);


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
    setSelectedDrawDetail(null);
    setCustomSelection([]);
    setSortConfig({ key: 'number', direction: 'asc' });
    setGeminiAnalysis(null);
    setIsGeminiLoading(false);
    setStartDate('');
    setEndDate('');
    setAiAnalysisType('math');
  }, [config]);

  useEffect(() => {
    // Reset contest list expansion when the selected number changes
    if (selectedNumber) {
      setIsContestListExpanded(false);
    }
  }, [selectedNumber]);

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
      if (!originalResult || originalResult.allDraws.length === 0) return;

      const earliestAvailableDate = originalResult.allDraws[originalResult.allDraws.length - 1].date;
      const latestAvailableDate = originalResult.allDraws[0].date;

      let startFilterDateStr = startDate;
      let endFilterDateStr = endDate;

      // Auto-complete dates if only one is provided
      if (startDate && !endDate) {
        endFilterDateStr = latestAvailableDate.toISOString().split('T')[0];
        setEndDate(endFilterDateStr); // Update UI to reflect the auto-completed date
      } else if (!startDate && endDate) {
        startFilterDateStr = earliestAvailableDate.toISOString().split('T')[0];
        setStartDate(startFilterDateStr); // Update UI
      }
      
      // Exit if we still don't have a valid date range (e.g., both were initially empty)
      if (!startFilterDateStr || !endFilterDateStr) return;

      const start = new Date(startFilterDateStr + 'T00:00:00');
      const end = new Date(endFilterDateStr + 'T23:59:59');

      const filteredDraws = originalResult.allDraws.filter(draw => {
          return draw.date >= start && draw.date <= end;
      });

      if (filteredDraws.length === 0) {
          setError("Nenhum sorteio encontrado no período selecionado.");
      } else {
        setError(null);
      }

      const newProcessedData = processDraws(filteredDraws, config);
      const newResultState: AnalysisResult = {
          fileNames: originalResult.fileNames,
          allDraws: originalResult.allDraws, 
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
      if (originalResult.allDraws.length > 0) {
        const lastDate = originalResult.allDraws[0].date;
        const firstDate = originalResult.allDraws[originalResult.allDraws.length - 1].date;
        setStartDate(firstDate.toISOString().split('T')[0]);
        setEndDate(lastDate.toISOString().split('T')[0]);
      }
  };

  const handleExportCSV = () => {
    if (!analysisResult || analysisResult.allDraws.length === 0) return;

    const headers = ['Concurso', 'Data', ...Array.from({ length: config.drawSize }, (_, i) => `Bola ${i + 1}`), 'Cidade', 'Estado'];
    const csvContent = [
        headers.join(','),
        ...analysisResult.allDraws.map(draw => {
            const dateStr = draw.date instanceof Date ? draw.date.toLocaleDateString('pt-BR') : '';
            return [draw.contest, dateStr, ...draw.draw, draw.city || '', draw.state || ''].join(',');
        })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${config.name.toLowerCase().replace(/\s/g, '_')}_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRegenerateSuggestions = () => {
    if (!analysisResult) return;
    const newSuggestions = regenerateSuggestions(analysisResult.frequencies, config);
    setSuggestions(newSuggestions);
    setSelectedSuggestion(null);
    setSelectedSuggestionType(null);
  };

  const handleSelectSuggestion = (type: SuggestionType, game?: number[]) => {
    if (game) {
      setSelectedSuggestion(game);
    } else if (suggestions && (type === 'hot' || type === 'cold' || type === 'mixed')) {
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
    if (data && data.activePayload && data.activePayload[0]) {
      const number = data.activePayload[0].payload.number;
      handleNumberClick(number);
    }
  };

  const handleNumberClick = (number: number) => {
     if (selectedNumber && selectedNumber.number === number) {
      setSelectedNumber(null);
      return;
    }

    if (analysisResult) {
      const contests = analysisResult.drawsByNumber.get(number) || [];
      setSelectedNumber({ number, contests });
    }
  };

  const handleCustomNumberSelect = (number: number) => {
    setCustomSelection(prev => {
      if (prev.includes(number)) {
        return prev.filter(n => n !== number);
      }
      if (prev.length < config.betSize) {
        return [...prev, number];
      }
      return prev;
    });
  };

  const handleCompleteRandomly = () => {
    if (!analysisResult) return;
    const needed = config.betSize - customSelection.length;
    if (needed <= 0) return;

    const allNumbers = Array.from({ length: config.totalNumbers }, (_, i) => i + 1);
    const availableNumbers = allNumbers.filter(n => !customSelection.includes(n));

    const filler = pickRandomNumbers(availableNumbers, needed);
    const finalSelection = [...customSelection, ...filler].sort((a, b) => a - b);

    setCustomSelection(finalSelection);
  };

  const handleUseCustomSelection = () => {
    if (customSelection.length !== config.betSize) return;
    handleSelectSuggestion('custom', [...customSelection].sort((a,b) => a-b));
  };

  const handleClearCustomSelection = () => {
    setCustomSelection([]);
  };


  const handleRequestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSaveGame = (gameToSave: number[] | null) => {
    if (!gameToSave || gameToSave.length !== config.betSize) return;

    const sortedGame = [...gameToSave].sort((a, b) => a - b);
    const isAlreadySaved = savedGames.some(
      (savedGame) => JSON.stringify(savedGame) === JSON.stringify(sortedGame)
    );

    if (!isAlreadySaved) {
      setSavedGames((prev) => [...prev, sortedGame]);
    }
  };

  const handleDeleteGame = (indexToDelete: number) => {
    setSavedGames((prev) => prev.filter((_, index) => index !== indexToDelete));
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

  const handleGeminiAnalysis = async () => {
      if (!analysisResult) return;
      setIsGeminiLoading(true);
      setGeminiAnalysis(null);
      setError(null);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        let prompt = '';

        if (aiAnalysisType === 'geo') {
            const last10 = analysisResult.lastDraws.map(d => ({
                concurso: d.contest,
                data: d.date.toLocaleDateString(),
                cidade: d.city || 'N/D',
                estado: d.state || 'N/D',
                tipoAposta: d.betType || 'N/D'
            }));

            prompt = `
                Atue como um analista de dados especialista em loterias.
                Analise os dados dos últimos 10 sorteios da ${config.name} fornecidos abaixo em formato JSON.

                Dados:
                ${JSON.stringify(last10)}

                Tarefa:
                Gere um relatório em Markdown focado na geografia dos ganhadores e tipos de aposta. Inclua:

                1. **Tabela Detalhada dos Sorteios**:
                   - Crie uma tabela com as colunas: Concurso | Data | Local (Cidade/UF) | Tipo de Aposta.
                   - Se o dado de cidade/estado ou tipo for "N/D", exiba como "-".

                2. **Resumo da Distribuição Geográfica** (Tabela Agregada):
                   - Agrupe os ganhadores por Estado (UF).
                   - Exiba uma tabela com: Estado | Quantidade de Ganhadores.
                   - Ordene do estado com mais ganhadores para o menor.

                3. **Análise de Modalidade (Individual vs. Bolão)**:
                   - Verifique a coluna "tipoAposta".
                   - Se houver dados válidos (diferente de "N/D"), faça um breve resumo comparativo (ex: "X% das vitórias foram Bolões").
                   - Se a maioria for "N/D", informe claramente que os dados do arquivo carregado não contêm informações suficientes sobre o tipo de aposta.

                Seja objetivo, claro e use formatação profissional.
            `;
        } else {
            // Math analysis
            const top5Hot = analysisResult.frequencies.slice(0, 5).map(f => `${f.number} (${f.count} vezes)`);
            const top5Cold = analysisResult.frequencies.slice(-5).map(f => `${f.number} (${f.count} vezes)`);
            const lastDraw = analysisResult.lastDraws[0].draw.join(', ');

            prompt = `
              Você é um especialista em análise estatística de loterias, com foco em uma abordagem cética e baseada em dados, evitando a "Falácia do Jogador".
              Analise os seguintes dados da ${config.name}:
              - Total de sorteios analisados: ${analysisResult.totalDraws}
              - 5 números mais frequentes (quentes): ${top5Hot.join(', ')}
              - 5 números menos frequentes (frios): ${top5Cold.join(', ')}
              - Último sorteio: ${lastDraw}
              - Pares mais frequentes: ${analysisResult.topPairs.map(p => `[${p.pair.join('-')}] saiu ${p.count}x`).join('; ')}
              - Distribuição Pares/Ímpares mais comum: ${analysisResult.evenOddDistribution[0]?.distribution} (${analysisResult.evenOddDistribution[0]?.count} vezes)

              Com base APENAS nesses dados, forneça uma análise concisa em markdown, com no máximo 150 palavras, focada em observações históricas.
              Sua análise deve:
              1.  Começar com um título H3: "Análise Preditiva (Insights do Gemini)".
              2.  Interpretar brevemente a frequência dos números, sem fazer previsões.
              3.  Comentar sobre a predominância de certos pares ou da distribuição par/ímpar.
              4.  Finalizar com uma frase que reforce que os dados são históricos e não garantem resultados futuros, lembrando que cada sorteio é um evento independente.
            `;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        setGeminiAnalysis(response.text);

      } catch (err) {
        console.error("Gemini API error:", err);
        setError("Não foi possível obter a análise do Gemini. Verifique a chave de API e tente novamente.");
      } finally {
        setIsGeminiLoading(false);
      }
  };


  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center p-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-white mx-auto"></div><p className="mt-4">Analisando dados...</p></div>;
    }

    if (error && !analysisResult?.totalDraws) { // Only show full-screen error if there's no data to display
      return (
        <div className="text-center p-10 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg">
          <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Ocorreu um Erro</h3>
          <p className="mt-2 text-red-600 dark:text-red-400">{error}</p>
        </div>
      );
    }


    if (!analysisResult) {
      return (
        <div className="text-center p-10 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Nenhum dado carregado</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Para começar, faça o upload dos arquivos de resultados da {config.name}.
          </p>
          <button
            onClick={handleFileUploadClick}
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-slate-900"
            style={{ backgroundColor: config.color }}
          >
            <DownloadIcon />
            Carregar Arquivo(s)
          </button>
        </div>
      );
    }
    
    const hotNumbers = analysisResult.frequencies.slice(0, config.hotCount).map(f => f.number);
    const coldNumbers = analysisResult.frequencies.slice(-config.coldCount).map(f => f.number);
    const chartData = analysisResult.frequencies.map(f => ({
        ...f,
        fill: hotNumbers.includes(f.number) ? '#ef4444' : coldNumbers.includes(f.number) ? '#3b82f6' : isDarkMode ? '#64748b' : '#94a3b8'
    })).sort((a,b) => a.number - b.number);


    const SortableHeader = ({ sortKey, label }: { sortKey: SortKey, label: string }) => (
        <th scope="col" className="px-4 py-3 cursor-pointer select-none" onClick={() => handleRequestSort(sortKey)}>
            {label}
            <span className="ml-1">
                {sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? '▲' : '▼')}
            </span>
        </th>
    );

    const customSelectionCount = customSelection.length;
    const betSize = config.betSize;
    const needed = betSize - customSelectionCount;

    let primaryButtonText: string;
    let isPrimaryButtonDisabled: boolean;
    let primaryButtonAction: () => void;

    if (customSelectionCount === 0) {
        primaryButtonText = 'Selecione seus números';
        isPrimaryButtonDisabled = true;
        primaryButtonAction = () => {};
    } else if (customSelectionCount < betSize) {
        primaryButtonText = `Completar com ${needed} número${needed > 1 ? 's' : ''}`;
        isPrimaryButtonDisabled = false;
        primaryButtonAction = handleCompleteRandomly;
    } else { // customSelectionCount === betSize
        primaryButtonText = 'Confirmar Jogo Selecionado';
        isPrimaryButtonDisabled = false;
        primaryButtonAction = handleUseCustomSelection;
    }


    return (
      <div className="space-y-8">
        {/* --- Header & Filters --- */}
        <section className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-bold" style={{ color: config.color }}>{config.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total de {analysisResult.totalDraws} sorteios analisados.</p>
               <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Arquivos: {analysisResult.fileNames.join(', ')}
              </p>
            </div>
             <div className="grid grid-cols-2 gap-2 md:col-span-1 lg:col-span-2">
                <div>
                    <label htmlFor="start-date" className="block text-xs font-medium text-slate-700 dark:text-slate-300">Data Início</label>
                    <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-slate-700"/>
                </div>
                <div>
                    <label htmlFor="end-date" className="block text-xs font-medium text-slate-700 dark:text-slate-300">Data Fim</label>
                    <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-slate-700"/>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-self-start md:justify-self-end w-full">
              <button onClick={handleFilterApply} className="flex-1 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm" style={{ backgroundColor: config.color }}>Filtrar</button>
              <button onClick={handleFilterClear} className="flex-1 bg-slate-200 dark:bg-slate-600 px-4 py-2 rounded-md text-sm">Limpar</button>
              <button onClick={handleExportCSV} title="Exportar dados filtrados para CSV" className="flex-1 sm:flex-none flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm transition-colors">
                 <ExportIcon />
                 <span className="ml-2 sm:hidden xl:inline">Exportar</span>
              </button>
            </div>
          </div>
           {error && analysisResult?.totalDraws === 0 && (
              <div className="mt-4 text-center p-2 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
        </section>

        {/* --- Main Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Frequency Chart */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Frequência dos Números</h3>
              <div style={{ width: '100%', height: 300 }}>
                 <ResponsiveContainer>
                    <BarChart data={chartData} onClick={handleChartClick} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                        <XAxis dataKey="number" tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                        <YAxis tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                        <Tooltip
                            cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}
                            contentStyle={{ 
                                backgroundColor: isDarkMode ? 'rgb(30 41 59)' : '#fff',
                                border: `1px solid ${isDarkMode ? '#475569' : '#e2e8f0'}`,
                                borderRadius: '0.5rem'
                            }}
                            labelStyle={{ color: isDarkMode ? '#cbd5e1' : '#1e293b', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="count" name="Frequência" barSize={15}>
                           {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            
            {/* Game Suggestions */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Sugestões de Jogo</h3>
                <button onClick={handleRegenerateSuggestions} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                  Gerar Novas
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Hot */}
                  <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                    <div className="flex items-center mb-3">
                      <HotIcon />
                      <h4 className="font-semibold ml-2">Jogo Quente</h4>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                       {suggestions?.hot.map(n => <button key={n} onClick={() => handleNumberClick(n)} className="transform hover:scale-110 transition-transform"><NumberBall number={n} color={config.color} size="small" /></button>)}
                    </div>
                    <button onClick={() => handleSelectSuggestion('hot')} className="w-full text-sm font-semibold py-2 rounded-md bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20">Usar Jogo</button>
                  </div>
                  {/* Cold */}
                  <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                    <div className="flex items-center mb-3">
                      <ColdIcon />
                      <h4 className="font-semibold ml-2">Jogo Frio</h4>
                    </div>
                     <div className="flex flex-wrap gap-2 mb-3">
                       {suggestions?.cold.map(n => <button key={n} onClick={() => handleNumberClick(n)} className="transform hover:scale-110 transition-transform"><NumberBall number={n} color={config.color} size="small" /></button>)}
                    </div>
                    <button onClick={() => handleSelectSuggestion('cold')} className="w-full text-sm font-semibold py-2 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20">Usar Jogo</button>
                  </div>
                  {/* Mixed */}
                  <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                    <div className="flex items-center mb-3">
                       <HotIcon /><ColdIcon />
                       <h4 className="font-semibold ml-2">Jogo Misto</h4>
                    </div>
                     <div className="flex flex-wrap gap-2 mb-3">
                      {suggestions?.mixed.map(n => <button key={n} onClick={() => handleNumberClick(n)} className="transform hover:scale-110 transition-transform"><NumberBall number={n} color={config.color} size="small" /></button>)}
                    </div>
                    <button onClick={() => handleSelectSuggestion('mixed')} className="w-full text-sm font-semibold py-2 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20">Usar Jogo</button>
                  </div>
              </div>
            </section>

             {/* Custom Game Generator */}
            <section className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg">
                <h3 className="text-xl font-semibold mb-2">Gerador de Jogo Personalizado</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Clique nos números abaixo para montar seu jogo. Números quentes (vermelho) e frios (azul) são destacados.</p>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-lg flex flex-wrap gap-2 justify-center">
                    {Array.from({ length: config.totalNumbers }, (_, i) => i + 1).map(n => {
                        const isSelected = customSelection.includes(n);
                        const isHot = hotNumbers.includes(n);
                        const isCold = coldNumbers.includes(n);
                        
                        let baseClasses = 'w-9 h-9 flex items-center justify-center rounded-full font-semibold transition-all duration-200 border-2 text-sm';
                        let stateClasses = '';

                        if (isSelected) {
                            stateClasses = 'text-white border-transparent scale-110';
                        } else if (isHot) {
                            stateClasses = 'border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/10';
                        } else if (isCold) {
                            stateClasses = 'border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10';
                        } else {
                            stateClasses = 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50';
                        }

                        return (
                             <button 
                                key={n} 
                                onClick={() => handleCustomNumberSelect(n)}
                                className={`${baseClasses} ${stateClasses}`}
                                style={{ backgroundColor: isSelected ? config.color : ''}}
                                disabled={!isSelected && customSelection.length >= config.betSize}
                            >
                                {n}
                            </button>
                        );
                    })}
                </div>
                
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="font-semibold text-lg">
                        <span className="font-bold text-2xl" style={{color: config.color}}>{customSelection.length}</span> / {config.betSize} selecionados
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={primaryButtonAction}
                            disabled={isPrimaryButtonDisabled}
                            className="px-4 py-2 rounded-lg font-semibold text-white transition-opacity duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            style={{ backgroundColor: config.color }}
                        >
                            {primaryButtonText}
                        </button>
                        <button 
                          onClick={handleClearCustomSelection} 
                          className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-sm font-semibold"
                          disabled={customSelection.length === 0}
                        >
                            Limpar Seleção
                        </button>
                    </div>
                </div>
            </section>
            
            {/* Interval Stats Table */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Estatísticas de Intervalos</h3>
              <div className="overflow-x-auto bg-white dark:bg-slate-800/50 rounded-lg shadow">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-900/50">
                    <tr>
                      <SortableHeader sortKey="number" label="Número" />
                      <SortableHeader sortKey="currentDelay" label="Atraso Atual" />
                      <SortableHeader sortKey="avgInterval" label="Média Intervalo" />
                      <SortableHeader sortKey="maxDelay" label="Atraso Máx." />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedIntervalStats.map((stats, index) => (
                      <tr 
                          key={stats.number} 
                          className={`border-b dark:border-slate-700 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-700/40'} hover:bg-indigo-50 dark:hover:bg-indigo-900/30`}
                        >
                        <td className="px-4 py-2">
                          <button onClick={() => handleNumberClick(stats.number)} className="transform hover:scale-110 transition-transform">
                            <NumberBall number={stats.number} color={config.color} size="small" />
                          </button>
                        </td>
                        <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{stats.currentDelay}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{stats.avgInterval}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{stats.maxDelay}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Selected Game */}
            {selectedSuggestion && (
              <section className="p-4 rounded-lg shadow-inner bg-slate-100 dark:bg-slate-900/50" style={{ animation: 'fade-in-scale 0.5s ease-out' }}>
                <h3 className="text-lg font-semibold mb-3">Seu Jogo Selecionado</h3>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800">
                  <div className="flex flex-wrap gap-2">
                    {selectedSuggestion.map(n => <button key={n} onClick={() => handleNumberClick(n)} className="transform hover:scale-110 transition-transform"><NumberBall number={n} color={config.color} /></button>)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSaveGame(selectedSuggestion)} title="Salvar Jogo" className="flex items-center px-3 py-2 rounded-md text-sm font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">
                      <SaveIcon />
                      <span className="ml-2">Salvar</span>
                    </button>
                    <button onClick={handleCopy} className="flex items-center px-3 py-2 rounded-md text-sm font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">
                      {isCopied ? <CheckIcon /> : <CopyIcon />}
                      <span className="ml-2">{isCopied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              </section>
            )}

          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <div className="p-4 rounded-lg text-center bg-slate-100 dark:bg-slate-800/50">
                <p className="text-sm text-slate-600 dark:text-slate-400">Clique em um número no gráfico, na tabela ou em uma bola numerada para ver suas estatísticas detalhadas.</p>
            </div>
            
            {/* Saved Games */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Jogos Salvos</h3>
              <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50 max-h-96 overflow-y-auto">
                {savedGames.length > 0 ? (
                  <ul className="space-y-3">
                    {savedGames.map((game, index) => (
                      <li key={index} className="p-3 rounded-lg bg-white dark:bg-slate-800 shadow">
                        <div className="flex flex-wrap gap-1 mb-3">
                          {game.map(n => 
                            <button key={n} onClick={() => handleNumberClick(n)} className="transform hover:scale-110 transition-transform">
                              <NumberBall number={n} color={config.color} size="small" />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => handleSelectSuggestion('custom', game)} className="text-sm font-semibold py-1 px-3 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/20">Usar</button>
                          <button onClick={() => handleDeleteGame(index)} title="Excluir Jogo" className="text-sm font-semibold p-2 rounded-md bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20">
                            <TrashIcon />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
                    Nenhum jogo salvo para a {config.name}.
                  </div>
                )}
              </div>
            </section>
            
            {/* Consecutive Sequences */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Sequências Consecutivas</h3>
              <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50">
              {analysisResult.consecutiveSequences.length > 0 ? (
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {analysisResult.consecutiveSequences.slice(0, 15).map(({ sequence, count }) => (
                    <li key={sequence.join('-')} className="flex justify-between items-center text-sm p-2 rounded-lg bg-white dark:bg-slate-800">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{sequence.join(' - ')}</span>
                      <span className="text-slate-500 dark:text-slate-400">{count} vez{count > 1 ? 'es' : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 rounded-lg bg-white dark:bg-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
                  Nenhuma sequência de 2 ou mais números foi encontrada.
                </div>
              )}
              </div>
            </section>

             {/* Probabilities */}
            <section>
              <h3 className="text-xl font-semibold mb-4">Probabilidades</h3>
              <ProbabilityTable probabilities={config.probabilities} color={config.color} />
            </section>

            {/* Gemini Analysis */}
            <section>
                <h3 className="text-xl font-semibold mb-4">Análise com IA</h3>
                 <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Foco da Análise</label>
                        <select 
                            value={aiAnalysisType} 
                            onChange={(e) => setAiAnalysisType(e.target.value as AIAnalysisType)}
                            className="block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-slate-700 dark:text-white"
                        >
                            <option value="math">Padrões e Estatísticas (Matemática)</option>
                            <option value="geo">Perfil dos Ganhadores (Geográfica/Tipo)</option>
                        </select>
                    </div>

                    {isGeminiLoading && <div className="text-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white mx-auto"></div><p className="mt-2 text-sm">Gemini está pensando...</p></div>}
                    
                    {geminiAnalysis && (
                      <div className="prose prose-sm dark:prose-invert max-w-none mt-4" dangerouslySetInnerHTML={{ __html: geminiAnalysis.replace(/\n/g, '<br />') }} />
                    )}

                    {!isGeminiLoading && !geminiAnalysis && (
                        <div className="text-center">
                            <p className="text-sm mb-4 text-slate-600 dark:text-slate-400">
                                {aiAnalysisType === 'math' 
                                    ? "Obtenha insights sobre padrões frequentes, repetidos e estatísticas matemáticas."
                                    : "Analise a distribuição geográfica dos vencedores e tipos de aposta (requer arquivo com dados de cidade/estado)."
                                }
                            </p>
                            <button 
                                onClick={handleGeminiAnalysis}
                                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:opacity-90 transition-opacity w-full"
                            >
                                Gerar Análise
                            </button>
                        </div>
                    )}
                     
                     {/* Reset button if analysis is present */}
                    {geminiAnalysis && !isGeminiLoading && (
                         <button 
                            onClick={() => setGeminiAnalysis(null)}
                            className="mt-4 text-xs text-slate-500 underline w-full text-center"
                        >
                            Limpar análise
                        </button>
                    )}
                </div>
            </section>

          </div>
        </div>

        {/* Last Draws Section */}
        <section>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Últimos Sorteios</h3>
                <span className="text-xs font-semibold text-slate-500 bg-slate-200 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded-full">10 mais recentes</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {analysisResult.lastDraws.map(draw => {
                     const isHighlighted = selectedNumber && draw.draw.includes(selectedNumber.number);
                     const isDimmed = selectedNumber && !isHighlighted;

                     return (
                        <div 
                            key={draw.contest} 
                            onClick={() => setSelectedDrawDetail(draw)} 
                            className={`group relative p-4 rounded-lg bg-white dark:bg-slate-800 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 border border-slate-100 dark:border-slate-700 ${isHighlighted ? 'ring-2 ring-offset-1' : ''} ${isDimmed ? 'opacity-40 grayscale' : 'hover:-translate-y-1'}`}
                            style={{
                                borderColor: isHighlighted ? config.color : '',
                                boxShadow: isHighlighted ? `0 0 0 2px ${config.color}` : ''
                            }}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-bold text-lg">#{draw.contest}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{draw.date.toLocaleDateString()}</p>
                                </div>
                                <div className="text-slate-400 dark:text-slate-600 group-hover:text-indigo-500 transition-colors">
                                   <ExternalLinkIcon />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1 justify-center">
                                {draw.draw.map(n => {
                                    const isSelectedBall = selectedNumber?.number === n;
                                    return (
                                        <div 
                                            key={n} 
                                            className={`w-6 h-6 text-xs flex items-center justify-center rounded-full font-bold text-white transition-transform ${isSelectedBall ? 'scale-125 z-10 shadow-md' : ''}`} 
                                            style={{ backgroundColor: config.color }}
                                        >
                                            {n}
                                        </div>
                                    );
                                })}
                            </div>
                            {(draw.city || draw.state) && (
                                <div className="mt-2 text-xs text-slate-500 text-center truncate">
                                    {draw.city ? `${draw.city}` : ''} {draw.state ? `- ${draw.state}` : ''}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
      </div>
    );
  };

  const renderDrawDetailModal = () => {
    if (!selectedDrawDetail) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDrawDetail(null)}
            style={{ animation: 'fade-in-scale 0.3s ease-out forwards' }}
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">Concurso {selectedDrawDetail.contest}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{selectedDrawDetail.date.toLocaleDateString()}</p>
                    </div>
                     <button onClick={() => setSelectedDrawDetail(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full"><CloseIcon /></button>
                </div>
                
                {/* City/State/BetType Info in Modal */}
                {(selectedDrawDetail.city || selectedDrawDetail.state || selectedDrawDetail.betType) && (
                     <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-center space-y-2">
                        {(selectedDrawDetail.city || selectedDrawDetail.state) && (
                            <div>
                                <span className="text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider block mb-1">Local do Ganhador</span>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {[selectedDrawDetail.city, selectedDrawDetail.state].filter(Boolean).join(' - ') || 'Informação não disponível'}
                                </p>
                            </div>
                        )}
                        {selectedDrawDetail.betType && (
                            <div className={`pt-2 ${selectedDrawDetail.city || selectedDrawDetail.state ? 'border-t border-slate-200 dark:border-slate-600' : ''}`}>
                                <span className="text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider block mb-1">Tipo de Aposta</span>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {selectedDrawDetail.betType}
                                </p>
                            </div>
                        )}
                     </div>
                )}

                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 font-medium text-center">Números Sorteados</p>
                <div className="flex flex-wrap justify-center gap-3">
                    {selectedDrawDetail.draw.map(number => (
                        <button key={number} onClick={() => { handleNumberClick(number); setSelectedDrawDetail(null); }} className="transform hover:scale-110 transition-transform">
                             <NumberBall number={number} color={config.color} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderNumberDetailPanel = () => {
    const isPanelOpen = !!selectedNumber;

    const stats = isPanelOpen && analysisResult ? analysisResult.intervalStats.find(s => s.number === selectedNumber.number) : null;
    const frequencyPercentage = isPanelOpen && analysisResult && analysisResult.totalDraws > 0
        ? ((selectedNumber.contests.length / analysisResult.totalDraws) * 100).toFixed(2)
        : '0.00';

    // Fetch full draw details for the history list, limited to most recent 20 for performance
    const historyDraws = isPanelOpen && selectedNumber && analysisResult
        ? selectedNumber.contests
            .slice(0, 20)
            .map(contestId => analysisResult.allDraws.find(d => d.contest === contestId))
            .filter((d): d is DrawData => !!d)
        : [];

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ease-in-out ${isPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSelectedNumber(null)}
                style={{ pointerEvents: isPanelOpen ? 'auto' : 'none' }} 
            />
            <div 
                className={`fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {isPanelOpen && selectedNumber && (
                    <>
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold">Detalhes do Número</h2>
                            <button onClick={() => setSelectedNumber(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full">
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-6 space-y-6">
                            <div className="flex justify-center">
                                <NumberBall number={selectedNumber.number} color={config.color} />
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Frequência Total</div>
                                    <div className="text-2xl font-bold">{selectedNumber.contests.length}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Frequência (%)</div>
                                    <div className="text-2xl font-bold">{frequencyPercentage}%</div>
                                </div>
                            </div>

                            {stats && (
                                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    <h3 className="font-semibold mb-3 text-center">Histórico de Intervalos</h3>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Atraso Atual</div>
                                            <div className="text-lg font-bold">{stats.currentDelay}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Média</div>
                                            <div className="text-lg font-bold">{stats.avgInterval}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Atraso Máx.</div>
                                            <div className="text-lg font-bold">{stats.maxDelay}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                             {/* Enhanced History Section */}
                             <div>
                                <h3 className="font-semibold text-center mb-2">Histórico de Sorteios (Últimos {historyDraws.length})</h3>
                                <div className="space-y-2">
                                    {historyDraws.map(draw => (
                                        <div key={draw.contest} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-sm">Concurso {draw.contest}</span>
                                                <span className="text-xs text-slate-500">{draw.date.toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {draw.draw.map(n => {
                                                    const isTarget = n === selectedNumber.number;
                                                    return (
                                                        <div 
                                                            key={n} 
                                                            className={`w-6 h-6 text-xs flex items-center justify-center rounded-full font-bold text-white ${isTarget ? 'ring-2 ring-offset-1 ring-offset-slate-100 dark:ring-offset-slate-800 scale-110' : 'opacity-70'}`} 
                                                            style={{ backgroundColor: config.color }}
                                                        >
                                                            {n}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    {selectedNumber.contests.length > 20 && (
                                         <p className="text-center text-xs text-slate-500 mt-2">
                                            E mais {selectedNumber.contests.length - 20} concursos anteriores...
                                         </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
  };


  return (
    <div>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
        />
      
      {!analysisResult && !isLoading && (
          <div className="space-y-8">
            <div className="text-center p-10 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Bem-vindo(a) à Análise da {config.name}</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-4 max-w-2xl mx-auto">
                Para começar, faça o upload de um ou mais arquivos de resultados. O sistema é inteligente e irá identificar automaticamente as colunas de concurso, data e dezenas, além de remover sorteios duplicados.
              </p>
              <button
                onClick={handleFileUploadClick}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-slate-900"
                style={{ backgroundColor: config.color }}
              >
                <DownloadIcon />
                Carregar Arquivo(s)
              </button>
            </div>
             <section className="text-center">
                <h3 className="text-xl font-semibold mb-4">Probabilidades - {config.name}</h3>
                <div className="max-w-md mx-auto">
                    <ProbabilityTable probabilities={config.probabilities} color={config.color} />
                </div>
            </section>
          </div>
      )}
      
      {renderContent()}
      {renderDrawDetailModal()}
      {renderNumberDetailPanel()}
    </div>
  );
};

export default LotteryAnalysis;
