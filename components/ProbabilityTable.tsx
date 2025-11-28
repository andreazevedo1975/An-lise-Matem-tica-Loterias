import React from 'react';
import type { Probability } from '../types';

interface ProbabilityTableProps {
  probabilities: Probability[];
  color: string;
}

const ProbabilityTable: React.FC<ProbabilityTableProps> = ({ probabilities, color }) => {
  return (
    <div className="overflow-hidden rounded-lg shadow-md border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
        <thead 
            className="text-xs text-white uppercase"
            style={{ backgroundColor: color }}
        >
          <tr>
            <th scope="col" className="px-4 py-3">
              Faixa de Premiação
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Probabilidade (1 em)
            </th>
          </tr>
        </thead>
        <tbody>
          {probabilities.map((prob, index) => (
            <tr 
                key={prob.name} 
                className={`border-b dark:border-slate-700 ${index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/50'}`}
            >
              <th scope="row" className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                {prob.name}
              </th>
              <td className="px-4 py-3 font-mono text-right">
                {prob.chance.replace('1 em ', '')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProbabilityTable;
