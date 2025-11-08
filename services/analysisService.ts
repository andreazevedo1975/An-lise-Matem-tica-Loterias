import * as XLSX from 'xlsx';
import type { LotteryConfig, AnalysisResult, Frequency, GameSuggestions, DrawData, RepeatedDraw, PairFrequency, EvenOddDistribution, NumberIntervalStats } from '../types';

/**
 * Parses a date string (e.g., dd/mm/yyyy) into a Date object.
 * @param dateStr The date string to parse.
 * @returns A Date object or null if parsing fails.
 */
const parseDate = (dateStr: string | number): Date | null => {
    if (!dateStr) return null;
    const str = String(dateStr);
    const parts = str.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
    if (!parts) return null;
    
    // parts[1] = day, parts[2] = month, parts[3] = year
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // Month is 0-indexed in JS Date
    let year = parseInt(parts[3], 10);

    if (year < 100) {
        year += (year > 50 ? 1900 : 2000); // Simple heuristic for 2-digit years
    }

    const date = new Date(year, month, day);
    // Basic validation to catch invalid dates like 31/02/2023
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date;
    }
    return null;
};


/**
 * Parses raw file data (from CSV or XLSX) into a common format (array of arrays).
 * @param file The file to be parsed.
 * @returns A promise resolving to an array of arrays representing rows and cells.
 */
const readFileData = async (file: File): Promise<(string | number)[][]> => {
    if (file.type.includes('spreadsheetml') || file.name.endsWith('.xlsx')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // header: 1 ensures we get an array of arrays
        return XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    } else { // Assume CSV
        const csvText = await file.text();
        const rows = csvText.trim().replace(/\r/g, '').split('\n');
        return rows.map(row => {
            return row.split(',').map(cell => {
                const trimmedCell = cell.trim().replace(/"/g, '');
                const num = Number(trimmedCell);
                // Keep date-like strings as strings for now
                if (trimmedCell.includes('/') || trimmedCell.includes('-')) {
                    return trimmedCell;
                }
                return isNaN(num) || trimmedCell === '' ? trimmedCell : num;
            });
        });
    }
};

/**
 * Picks a specified number of unique random numbers from an array.
 * @param numbers The array of numbers to pick from.
 * @param count The number of random numbers to pick.
 * @returns An array of sorted, unique random numbers.
 */
const pickRandomNumbers = (numbers: number[], count: number): number[] => {
    const shuffled = [...numbers].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).sort((a, b) => a - b);
}

/**
 * Generates new game suggestions based on number frequencies.
 * @param frequencies Array of number frequencies.
 * @param config The configuration for the current lottery.
 * @returns An object containing hot, cold, and mixed game suggestions.
 */
export const regenerateSuggestions = (frequencies: Frequency[], config: LotteryConfig): GameSuggestions => {
    const sortedByFreq = [...frequencies].sort((a,b) => b.count - a.count);
    
    const hotNumbers = sortedByFreq.slice(0, config.hotCount).map(f => f.number);
    const coldNumbers = sortedByFreq.slice(-config.coldCount).map(f => f.number);

    const hotSuggestion = pickRandomNumbers(hotNumbers, config.betSize);
    const coldSuggestion = pickRandomNumbers(coldNumbers, config.betSize);
    
    const hotHalf = Math.ceil(config.betSize / 2);
    const coldHalf = config.betSize - hotHalf;
    
    const mixedHot = pickRandomNumbers(hotNumbers, hotHalf);
    const mixedCold = pickRandomNumbers(coldNumbers, coldHalf);

    let mixedSuggestion = [...mixedHot, ...mixedCold];
    
    const uniqueMixed = Array.from(new Set(mixedSuggestion));
    
    if (uniqueMixed.length < config.betSize) {
        const allAvailableNumbers = frequencies.map(f => f.number).filter(n => !uniqueMixed.includes(n));
        const needed = config.betSize - uniqueMixed.length;
        const filler = pickRandomNumbers(allAvailableNumbers, needed);
        mixedSuggestion = [...uniqueMixed, ...filler];
    } else if (uniqueMixed.length > config.betSize) {
        mixedSuggestion = pickRandomNumbers(uniqueMixed, config.betSize);
    } else {
        mixedSuggestion = uniqueMixed;
    }
    
    return {
        hot: hotSuggestion,
        cold: coldSuggestion,
        mixed: mixedSuggestion.sort((a, b) => a - b),
    };
}

/**
 * Processes a given array of draws to calculate all statistical metrics.
 * @param allDraws Array of DrawData objects to be processed.
 * @param config The configuration for the current lottery.
 * @returns An object containing all calculated analysis data.
 */
export const processDraws = (allDraws: DrawData[], config: LotteryConfig): Omit<AnalysisResult, 'fileNames' | 'allDraws'> => {
    const frequencyMap = new Map<number, number>();
    const drawsByNumber = new Map<number, (string | number)[]>();
    const drawStrings = new Map<string, (string | number)[]>();
    const pairFrequencyMap = new Map<string, number>();
    const evenOddDistributionMap = new Map<string, number>();
    const lastSeen = new Map<number, number>(); // contest index
    const intervals = new Map<number, number[]>();

    allDraws.forEach(({ contest, draw }, index) => {
        const drawKey = draw.join(',');
        if (!drawStrings.has(drawKey)) {
            drawStrings.set(drawKey, []);
        }
        drawStrings.get(drawKey)!.push(contest);

        draw.forEach(num => {
            frequencyMap.set(num, (frequencyMap.get(num) || 0) + 1);
            if (!drawsByNumber.has(num)) {
                drawsByNumber.set(num, []);
            }
            drawsByNumber.get(num)!.push(contest);

            if (lastSeen.has(num)) {
                const interval = index - lastSeen.get(num)!;
                if (!intervals.has(num)) {
                    intervals.set(num, []);
                }
                intervals.get(num)!.push(interval);
            }
            lastSeen.set(num, index);

        });

        // Pair analysis
        for (let i = 0; i < draw.length; i++) {
            for (let j = i + 1; j < draw.length; j++) {
                const pair = [draw[i], draw[j]].sort((a,b)=>a-b);
                const key = pair.join('-');
                pairFrequencyMap.set(key, (pairFrequencyMap.get(key) || 0) + 1);
            }
        }

        // Even/Odd analysis
        const evens = draw.filter(n => n % 2 === 0).length;
        const odds = draw.length - evens;
        const evenOddKey = `${evens} Pares / ${odds} Ímpares`;
        evenOddDistributionMap.set(evenOddKey, (evenOddDistributionMap.get(evenOddKey) || 0) + 1);
    });

    const intervalStats: NumberIntervalStats[] = [];
    for (let i = 1; i <= config.totalNumbers; i++) {
        const numIntervals = intervals.get(i) || [];
        const avgInterval = numIntervals.length > 0 ? numIntervals.reduce((a,b) => a+b, 0) / numIntervals.length : 0;
        const maxInterval = numIntervals.length > 0 ? Math.max(...numIntervals) : 0;
        const lastSeenIndex = lastSeen.get(i);
        const delay = lastSeenIndex !== undefined ? allDraws.length - 1 - lastSeenIndex : allDraws.length;
        
        intervalStats.push({
            number: i,
            avgInterval: parseFloat(avgInterval.toFixed(2)),
            maxDelay: maxInterval,
            currentDelay: delay,
        });
    }

    for (let i = 1; i <= config.totalNumbers; i++) {
        if (!frequencyMap.has(i)) frequencyMap.set(i, 0);
        if(!drawsByNumber.has(i)) drawsByNumber.set(i, []);
    }
    
    const frequencies: Frequency[] = Array.from(frequencyMap.entries())
        .map(([number, count]) => ({ number, count }))
        .sort((a, b) => b.count - a.count || a.number - b.number);

    const repeatedDraws: RepeatedDraw[] = [];
    drawStrings.forEach((contests, drawKey) => {
        if (contests.length > 1) {
            repeatedDraws.push({
                draw: drawKey.split(',').map(Number),
                contests: contests,
            });
        }
    });

    const topPairs: PairFrequency[] = Array.from(pairFrequencyMap.entries())
        .map(([key, count]) => ({ pair: key.split('-').map(Number), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const evenOddDistribution: EvenOddDistribution[] = Array.from(evenOddDistributionMap.entries())
        .map(([distribution, count]) => ({ distribution, count }))
        .sort((a, b) => b.count - a.count);

    const suggestions = regenerateSuggestions(frequencies, config);
    
    const lastDraws = allDraws.slice(0, 10);

     return {
        totalDraws: allDraws.length,
        frequencies,
        repeatedDraws,
        suggestions,
        lastDraws,
        drawsByNumber,
        topPairs,
        evenOddDistribution,
        intervalStats,
    };
}


/**
 * Parses raw row-based data from a file into structured DrawData objects.
 * @param rawData Array of arrays representing rows and cells from a file.
 * @param config The configuration for the specific lottery.
 * @returns An array of DrawData objects.
 */
const parseRawDataToDraws = (rawData: (string | number)[][], config: LotteryConfig): DrawData[] => {
    if (rawData.length === 0) {
        return [];
    }

    // --- ROBUST HEADER/DATA DETECTION ---
    let headerRowIndex = -1;
    let contestIndex = -1;
    let dateIndex = -1;
    let drawIndices: number[] | null = null;

    const drawColumnRegex = /(bola|dezena|d)\s*_?\d+/i;
    const contestColumnRegex = /concurso/i;
    const dateColumnRegex = /data/i;

    // Strategy 1: Find a perfect header with "Concurso", "Data" and "Bola/Dezena" columns.
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        const row = rawData[i].map(cell => String(cell).toLowerCase());
        const potentialContestIndex = row.findIndex(h => contestColumnRegex.test(h));
        const potentialDateIndex = row.findIndex(h => dateColumnRegex.test(h));
        const potentialDrawIndices = row
            .map((h, idx) => drawColumnRegex.test(h) ? idx : -1)
            .filter(idx => idx !== -1);
        
        if (potentialContestIndex !== -1 && potentialDateIndex !==-1 && potentialDrawIndices.length >= config.drawSize) {
            headerRowIndex = i;
            contestIndex = potentialContestIndex;
            dateIndex = potentialDateIndex;
            drawIndices = potentialDrawIndices.slice(0, config.drawSize);
            break;
        }
    }

    // Strategy 2: If perfect header fails, find just "Concurso" and "Data" columns and scan rows for numbers.
    if (headerRowIndex === -1) {
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
            const row = rawData[i].map(cell => String(cell).toLowerCase());
            const potentialContestIndex = row.findIndex(h => contestColumnRegex.test(h));
            const potentialDateIndex = row.findIndex(h => dateColumnRegex.test(h));

            if (potentialContestIndex !== -1 && potentialDateIndex !== -1) {
                const nextRow = rawData[i + 1];
                if (nextRow) {
                     const numbersInNextRow = nextRow
                        .map(cell => Number(cell))
                        .filter(n => !isNaN(n) && n >= 1 && n <= config.totalNumbers);
                    
                    if (numbersInNextRow.length >= config.drawSize) {
                        headerRowIndex = i;
                        contestIndex = potentialContestIndex;
                        dateIndex = potentialDateIndex;
                        drawIndices = null;
                        break;
                    }
                }
            }
        }
    }
    
    if (headerRowIndex === -1 || dateIndex === -1) {
        throw new Error('Não foi possível encontrar o cabeçalho. Verifique se o arquivo contém as colunas "Concurso", "Data" e os números dos sorteios.');
    }

    const dataRows = rawData.slice(headerRowIndex + 1);

    const allDraws: DrawData[] = dataRows
        .map(row => {
            const contest = row[contestIndex];
            const date = parseDate(row[dateIndex]);
            let draw: number[];

            if (drawIndices) {
                draw = Array.from(new Set(
                    drawIndices
                        .map(index => Number(row[index]))
                        .filter(n => !isNaN(n) && n >= 1 && n <= config.totalNumbers)
                )).sort((a, b) => a - b);
            } else {
                draw = Array.from(new Set(
                    row
                        .map(cell => Number(cell))
                        .filter(n => !isNaN(n) && n >= 1 && n <= config.totalNumbers)
                )).sort((a, b) => a - b);
            }

            return { contest, draw, date };
        })
        .filter((d): d is DrawData => 
            d.draw.length === config.drawSize && 
            d.contest !== '' && d.contest !== undefined &&
            d.date instanceof Date
        );

    return allDraws;
};


/**
 * Analyzes lottery data from one or more user-provided files, consolidating the results.
 * @param files An array of CSV or XLSX files containing lottery results.
 * @param config The configuration for the specific lottery being analyzed.
 * @returns A promise that resolves to a consolidated AnalysisResult object.
 */
export const analyzeLotteryData = async (files: File[], config: LotteryConfig): Promise<AnalysisResult> => {
    
    const allDrawsMap = new Map<string | number, DrawData>();
    const fileNames: string[] = [];

    for (const file of files) {
        try {
            fileNames.push(file.name);
            const rawData = await readFileData(file);
            const drawsFromFile = parseRawDataToDraws(rawData, config);
            
            for (const draw of drawsFromFile) {
                allDrawsMap.set(draw.contest, draw); // Deduplicates based on contest number
            }
        } catch (e: any) {
             throw new Error(`Erro ao processar o arquivo "${file.name}": ${e.message}`);
        }
    }

    if (allDrawsMap.size === 0) {
        throw new Error(`Nenhum sorteio válido encontrado nos arquivos fornecidos. Verifique se os arquivos contêm linhas com data válida e ${config.drawSize} números válidos entre 1 e ${config.totalNumbers}.`);
    }

    const consolidatedDraws = Array.from(allDrawsMap.values());

    // Ensure draws are sorted newest to oldest for consistent interval analysis
    consolidatedDraws.sort((a, b) => b.date.getTime() - a.date.getTime());

    const processedData = processDraws(consolidatedDraws, config);
    
    return {
        fileNames,
        allDraws: consolidatedDraws,
        ...processedData,
    };
};
