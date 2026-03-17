import { useState } from 'react';
import { useDark } from '../hooks/useDark';

interface Variable {
  name: string;
  definition: string;
}

interface FormulaEntry {
  name: string;
  formula: string;
  description: string;
  variables: Variable[];
}

interface FormulaGroup {
  title: string;
  entries: FormulaEntry[];
}

const FORMULA_GROUPS: FormulaGroup[] = [
  {
    title: 'Production',
    entries: [
      {
        name: 'Building Count',
        formula: 'buildings = rate / (outputQty / craftTime \u00d7 60 \u00d7 speedMult)',
        description: 'Number of buildings needed for a target rate',
        variables: [
          { name: 'rate', definition: 'Target output rate (items/min)' },
          { name: 'outputQty', definition: 'Items produced per craft cycle' },
          { name: 'craftTime', definition: 'Seconds per craft cycle' },
          { name: 'speedMult', definition: 'Building speed multiplier: 1, 1.5, 2, 3, 4 for Lv1\u20135' },
        ],
      },
      {
        name: 'Extractor Count',
        formula: 'extractors = rate / extractorRate[level]',
        description: 'Number of extractors needed for a raw resource rate',
        variables: [
          { name: 'rate', definition: 'Target extraction rate (items/min)' },
          { name: 'extractorRate', definition: 'Per-extractor rate: 7.5, 11.25, 15, 22.5, 30 for Lv1\u20135' },
        ],
      },
      {
        name: 'Ingredient Rate',
        formula: 'ingredientRate = parentRate \u00d7 ingredientQty / outputQty',
        description: 'Rate at which a child ingredient must be supplied',
        variables: [
          { name: 'parentRate', definition: 'Production rate of the parent item' },
          { name: 'ingredientQty', definition: 'Ingredient quantity per craft cycle' },
          { name: 'outputQty', definition: 'Output quantity per craft cycle' },
        ],
      },
      {
        name: 'Auto-Downgrade',
        formula: 'for level = configured\u22121 down to 1:\n  if count(rate, level) is integer \u2192 use level',
        description: 'Selects the lowest building level that yields an integer count',
        variables: [
          { name: 'configured', definition: 'User\u2019s selected building level' },
          { name: 'count(rate, level)', definition: 'Building count at a given rate and level' },
        ],
      },
      {
        name: 'Power Consumption',
        formula: 'totalPower = \u03a3 \u2308buildings\u2309 \u00d7 power[type][level]',
        description: 'Sum of power across all building types',
        variables: [
          { name: '\u2308buildings\u2309', definition: 'Building count rounded up (you can\u2019t build a fraction)' },
          { name: 'power[type][level]', definition: 'Power draw per building at its type and level' },
        ],
      },
    ],
  },
  {
    title: 'Belts',
    entries: [
      {
        name: 'Belts Needed',
        formula: 'beltsNeeded = \u2308throughput / beltSpeed\u2309',
        description: 'Minimum belts to carry a given throughput',
        variables: [
          { name: 'throughput', definition: 'Total items/min on this connection' },
          { name: 'beltSpeed', definition: 'Items/min capacity of one belt (165\u2013480)' },
        ],
      },
      {
        name: 'Belt Utilization',
        formula: 'utilization = throughput / (beltsNeeded \u00d7 beltSpeed)',
        description: 'How fully each belt is loaded',
        variables: [
          { name: 'throughput', definition: 'Total items/min on this connection' },
          { name: 'beltsNeeded', definition: 'Number of belts assigned' },
          { name: 'beltSpeed', definition: 'Items/min capacity of one belt' },
        ],
      },
      {
        name: 'Near Capacity',
        formula: 'nearCapacity = throughput / beltSpeed > 80%',
        description: 'Flags connections approaching belt saturation',
        variables: [
          { name: 'throughput', definition: 'Total items/min on this connection' },
          { name: 'beltSpeed', definition: 'Items/min capacity of one belt' },
        ],
      },
    ],
  },
  {
    title: 'Optimization',
    entries: [
      {
        name: 'Min Integer Scale',
        formula: 'minScale = lcm(d\u2081, d\u2082, \u2026, d\u2099)',
        description: 'Smallest multiplier that makes all building counts integers',
        variables: [
          { name: 'd\u2081\u2026d\u2099', definition: 'Denominators of each building count as a fraction' },
          { name: 'lcm', definition: 'Least common multiple' },
        ],
      },
      {
        name: 'Reverse Calc',
        formula: 'maxOutput = min(available[r] / required[r]) for all r',
        description: 'Maximum output rate given limited raw resources',
        variables: [
          { name: 'available[r]', definition: 'Extractors or items/min available for resource r' },
          { name: 'required[r]', definition: 'Units of resource r needed per unit of output' },
        ],
      },
      {
        name: 'Splitter-Friendly',
        formula: 'splitterFriendly = isPowerOf2(sum(parts))',
        description: 'A ratio is splitter-friendly when the total parts are a power of 2',
        variables: [
          { name: 'parts', definition: 'Integer parts in the building ratio (e.g. 1:2:1 \u2192 sum = 4)' },
          { name: 'isPowerOf2', definition: 'True when the value is 1, 2, 4, 8, 16, \u2026' },
        ],
      },
    ],
  },
];

function FormulaCard({ entry, isDark }: { entry: FormulaEntry; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-md px-3 py-2 text-xs cursor-pointer ${
        isDark ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          {entry.name}
        </span>
        <span className={`flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {expanded ? '\u25B4' : '\u25BE'}
        </span>
      </div>

      <div className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {entry.description}
      </div>

      <div className={`mt-1.5 rounded px-2 py-1.5 font-mono text-[11px] whitespace-pre-wrap ${
        isDark
          ? 'bg-gray-900/60 text-emerald-400'
          : 'bg-gray-100 text-emerald-700'
      }`}>
        {entry.formula}
      </div>

      {expanded && (
        <div className={`mt-1.5 pt-1.5 border-t space-y-0.5 ${
          isDark ? 'border-gray-600' : 'border-gray-200'
        }`}>
          {entry.variables.map((v) => (
            <div key={v.name} className="flex gap-2">
              <span className={`font-mono italic flex-shrink-0 ${
                isDark ? 'text-blue-400' : 'text-blue-600'
              }`}>
                {v.name}
              </span>
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                {v.definition}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FormulasSection() {
  const isDark = useDark();

  return (
    <div className="space-y-3">
      {FORMULA_GROUPS.map((group) => (
        <div key={group.title}>
          <div className={`text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {group.title}
          </div>
          <div className="space-y-1">
            {group.entries.map((entry) => (
              <FormulaCard key={entry.name} entry={entry} isDark={isDark} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
