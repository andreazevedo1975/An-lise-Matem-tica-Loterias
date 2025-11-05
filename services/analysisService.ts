import * as XLSX from 'xlsx';
import type { LotteryConfig, AnalysisResult, Frequency, GameSuggestions, DrawData, RepeatedDraw, PairFrequency, EvenOddDistribution } from '../types';

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
 * Analyzes lottery data from a user-provided file.
 * @param file The CSV or XLSX file containing lottery results.
 * @param config The configuration for the specific lottery being analyzed.
 * @returns A promise that resolves to an AnalysisResult object.
 */
export const analyzeLotteryData = async (file: File, config: LotteryConfig): Promise<AnalysisResult> => {
    
    const rawData = await readFileData(file);

    if (rawData.length === 0) {
        throw new Error('Arquivo vazio ou com formato inválido.');
    }

    // --- NEW ROBUST HEADER/DATA DETECTION ---
    let headerRowIndex = -1;
    let contestIndex = -1;
    let drawIndices: number[] | null = null; // Use null to indicate "scan the whole row" mode

    const drawColumnRegex = /(bola|dezena|d)\s*_?\d+/i;

    // Strategy 1: Find a perfect header with "Concurso" and "Bola/Dezena" columns.
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        const row = rawData[i].map(cell => String(cell).toLowerCase());
        const potentialContestIndex = row.findIndex(h => h.includes('concurso'));
        const potentialDrawIndices = row
            .map((h, idx) => drawColumnRegex.test(h) ? idx : -1)
            .filter(idx => idx !== -1);
        
        if (potentialContestIndex !== -1 && potentialDrawIndices.length >= config.drawSize) {
            headerRowIndex = i;
            contestIndex = potentialContestIndex;
            drawIndices = potentialDrawIndices.slice(0, config.drawSize); // Use specific columns
            break;
        }
    }

    // Strategy 2: If perfect header fails, find just the "Concurso" column and scan rows for numbers.
    if (headerRowIndex === -1) {
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
            const row = rawData[i].map(cell => String(cell).toLowerCase());
            const potentialContestIndex = row.findIndex(h => h.includes('concurso'));
            if (potentialContestIndex !== -1) {
                // Check if the rows *below* this potential header contain valid-looking data
                const nextRow = rawData[i + 1];
                if (nextRow) {
                     const numbersInNextRow = nextRow
                        .map(cell => Number(cell))
                        .filter(n => !isNaN(n) && n >= 1 && n <= config.totalNumbers);
                    
                    // If the next row looks like a lottery draw, we'll assume this is our header row
                    if (numbersInNextRow.length >= config.drawSize) {
                        headerRowIndex = i;
                        contestIndex = potentialContestIndex;
                        drawIndices = null; // Set to null to signal "scan the whole row"
                        break;
                    }
                }
            }
        }
    }
    
    if (headerRowIndex === -1) {
        throw new Error('Não foi possível encontrar o cabeçalho. Verifique se o arquivo contém uma coluna "Concurso" e os números dos sorteios.');
    }

    const dataRows = rawData.slice(headerRowIndex + 1);

    const allDraws: DrawData[] = dataRows
        .map(row => {
            const contest = row[contestIndex];
            let draw: number[];

            if (drawIndices) {
                // --- Strategy 1 was successful: Use specific columns ---
                draw = Array.from(new Set(
                    drawIndices
                        .map(index => Number(row[index]))
                        .filter(n => !isNaN(n) && n >= 1 && n <= config.totalNumbers)
                )).sort((a, b) => a - b);
            } else {
                // --- Strategy 2 was successful: Scan the whole row for numbers ---
                draw = Array.from(new Set(
                    row
                        .map(cell => Number(cell))
                        .filter(n => !isNaN(n) && n >= 1 && n <= config.totalNumbers)
                )).sort((a, b) => a - b);
            }

            return { contest, draw };
        })
        .filter((d): d is DrawData => 
            // This validation is key: only keep rows that, after all cleaning, match the lottery rules.
            d.draw.length === config.drawSize && d.contest !== '' && d.contest !== undefined
        );


    if (allDraws.length === 0) {
        throw new Error(`Nenhum sorteio válido encontrado. Verifique se o arquivo contém linhas com exatamente ${config.drawSize} números válidos entre 1 e ${config.totalNumbers}.`);
    }

    const frequencyMap = new Map<number, number>();
    const drawsByNumber = new Map<number, (string | number)[]>();
    const drawStrings = new Map<string, (string | number)[]>();
    const pairFrequencyMap = new Map<string, number>();
    const evenOddDistributionMap = new Map<string, number>();

    allDraws.forEach(({ contest, draw }) => {
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
    
    const lastDraws = allDraws.slice(-10).reverse();

    return {
        fileName: file.name,
        totalDraws: allDraws.length,
        frequencies,
        repeatedDraws,
        suggestions,
        lastDraws,
        drawsByNumber,
        topPairs,
        evenOddDistribution,
    };
};