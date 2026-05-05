/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  RotateCcw, 
  Check, 
  Play, 
  Pause, 
  Plus, 
  Copy, 
  Trash2, 
  Save, 
  Layout, 
  Move,
  Settings2,
  Trophy,
  Users,
  Palette,
  Layers,
  Activity,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  Link2,
  MousePointer2,
  ChevronDown,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types & Constants ---

type Sport = 'football' | 'basketball' | 'volleyball';

type Point = { x: number; y: number };
type Positions = { [id: string]: Point };

interface LinkStyle {
  color: string;
  thickness: number;
  dashed: boolean;
  type: 'classic' | 'fluid';
}

interface TacticalLink {
  players: [string, string];
  style: LinkStyle;
}

interface Scene {
  name: string;
  positions: Positions;
  links?: TacticalLink[];
  specialPlayers?: string[]; // IDs of players with special roles (e.g. Libero)
}

interface SavedSet {
  id: string;
  name: string;
  playerCounts: { home: number; away: number };
  colors: Colors;
  orientation: 'vertical' | 'horizontal';
  scenes: Scene[];
  sport: Sport;
}

interface Colors {
  homePrimary: string;
  homeSecondary: string;
  awayPrimary: string;
  awaySecondary: string;
}

const ROW_SHAPES: { [key: number]: number[] } = {
  0: [],
  1: [1],
  2: [1, 1],
  3: [1, 2],
  4: [1, 2, 1],
  5: [1, 2, 2],
  6: [1, 2, 2, 1],
  7: [1, 3, 2, 1],
  8: [1, 3, 3, 1],
  9: [1, 3, 3, 2],
  10: [1, 4, 3, 2],
  11: [1, 4, 3, 3],
};

const FOOTBALL_FORMATIONS: { [key: string]: number[] } = {
  '4-4-2': [1, 4, 4, 2],
  '4-3-3': [1, 4, 3, 3],
  '3-5-2': [1, 3, 5, 2],
  '4-2-3-1': [1, 4, 2, 3, 1],
  '4-1-4-1': [1, 4, 1, 4, 1],
  '5-3-2': [1, 5, 3, 2],
  '3-4-3': [1, 3, 4, 3],
  '4-5-1': [1, 4, 5, 1],
};

const DEFAULT_COLORS: Colors = {
  homePrimary: "#e63946",
  homeSecondary: "#ffffff",
  awayPrimary: "#1d4ed8",
  awaySecondary: "#f8fafc",
};

// --- Utilities ---

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const getRowXs = (count: number) => {
    const horizontalShift = -3.5; 
    if (count === 1) return [50 + horizontalShift]; 
    // For pairs, ensure perfect balance around center
    if (count === 2) return [38 + horizontalShift, 62 + horizontalShift];
    const min = 15; 
    const max = 85;
    return Array.from({ length: count }, (_, i) => (min + ((max - min) * i) / (count - 1)) + horizontalShift);
  };

  const getTeamRows = (team: 'home' | 'away', rowCount: number) => {
    if (team === 'home') {
      // Home team (Red) at Bottom - High Y values (Attacking Up)
      // Moving total 3.5% Up (subtracting 3.5 from Y)
      if (rowCount === 1) return [91.5];
      if (rowCount === 5) return [91.5, 80.5, 61.5, 41.5, 21.5]; // GK, Def, DM, AM, Fwd
      const positions = [91.5, 78.5, 56.5, 26.5]; // GK at 91.5, Def at 78.5, Mid at 56.5, Fwd at 26.5
      return positions.slice(0, rowCount);
    } else {
      // Away team (Blue) at Top - Low Y values (Attacking Down)
      // Moving total 3.5% Up (subtracting 3.5 from Y)
      if (rowCount === 1) return [1.5]; 
      if (rowCount === 5) return [1.5, 12.5, 32.5, 52.5, 72.5];
      const positions = [1.5, 14.5, 37.5, 67.5]; // GK at 1.5, Def at 14.5, Mid at 37.5, Fwd at 67.5
      return positions.slice(0, rowCount);
    }
  };

const generateTeamPositions = (team: 'home' | 'away', count: number, sport: Sport = 'football', customRowShape?: number[]) => {
  if (sport === 'volleyball') {
    const ids = Array.from({ length: 6 }, (_, i) => `${team === 'home' ? 'H' : 'A'}${i + 1}`);
    const positions: Positions = {};
    const hShift = -3.5;
    
    // Standard Volleyball Rotation:
    // Front Row (Near Net): 4 (Left), 3 (Middle), 2 (Right)
    // Back Row: 5 (Left), 6 (Middle), 1 (Right)
    
    // Coordinates mapping for Home (Bottom)
    const homeCoords = [
      { x: 80 + hShift, y: 81.5 }, // H1: Right Back
      { x: 80 + hShift, y: 61.5 }, // H2: Right Front
      { x: 50 + hShift, y: 61.5 }, // H3: Middle Front
      { x: 20 + hShift, y: 61.5 }, // H4: Left Front
      { x: 20 + hShift, y: 81.5 }, // H5: Left Back
      { x: 50 + hShift, y: 81.5 }, // H6: Middle Back
    ];

    // Coordinates mapping for Away (Top) - Mirrored
    const awayCoords = [
      { x: 20 + hShift, y: 11.5 }, // A1: Right Back (from mirror view)
      { x: 20 + hShift, y: 31.5 }, // A2: Right Front
      { x: 50 + hShift, y: 31.5 }, // A3: Middle Front
      { x: 80 + hShift, y: 31.5 }, // A4: Left Front
      { x: 80 + hShift, y: 11.5 }, // A5: Left Back
      { x: 50 + hShift, y: 11.5 }, // A6: Middle Back
    ];

    const coords = team === 'home' ? homeCoords : awayCoords;

    ids.forEach((id, i) => {
      if (i < count) {
        positions[id] = coords[i];
      }
    });
    return positions;
  }

  if (sport === 'basketball') {
    const ids = Array.from({ length: 5 }, (_, i) => `${team === 'home' ? 'H' : 'A'}${i + 1}`);
    const positions: Positions = {};
    const hShift = -3.5;
    const xPositions = [50 + hShift, 25 + hShift, 75 + hShift, 20 + hShift, 80 + hShift];
    const yHome = [84.5, 71.5, 71.5, 58.5, 58.5];
    const yAway = [8.5, 21.5, 21.5, 34.5, 34.5];

    ids.forEach((id, i) => {
      if (i < count) {
        positions[id] = { 
          x: xPositions[i], 
          y: team === 'home' ? yHome[i] : yAway[i] 
        };
      }
    });
    return positions;
  }

  const ids = Array.from({ length: 11 }, (_, i) => `${team === 'home' ? 'H' : 'A'}${i + 1}`);
  const rows = customRowShape || ROW_SHAPES[clamp(Math.round(count) || 11, 1, 11)];
  const yRows = getTeamRows(team, rows.length);
  const positions: Positions = {};
  let pi = 0;
  rows.forEach((xsCount, ri) => {
    getRowXs(xsCount).forEach((x) => {
      if (ids[pi]) positions[ids[pi]] = { x, y: yRows[ri] };
      pi++;
    });
  });
  return positions;
};

const getInitialPositions = (homeCount: number, awayCount: number, orientation: 'vertical' | 'horizontal', sport: Sport = 'football'): Positions => {
  const pos = {
    ...generateTeamPositions('home', homeCount, sport),
    ...generateTeamPositions('away', awayCount, sport),
    ball: { x: 50, y: 50 },
  };
  if (orientation === 'horizontal') {
    return Object.fromEntries(Object.entries(pos).map(([id, p]) => [id, { x: (100 - p.y) - 3, y: p.x }]));
  }
  return pos;
};

const getDefaultSceneName = () => {
  return "Pozisyon";
};

const FootballMarkings = ({ orientation }: { orientation: 'vertical' | 'horizontal' }) => (
  <div className="absolute inset-0 pointer-events-none">
    {/* Grass stripes */}
    <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,_rgba(255,255,255,0.03)_0_10%,_transparent_10%_20%)]" />
    
    <div className="pitch-lines absolute inset-0 opacity-80">
      {orientation === 'vertical' ? (
        <>
          <div className="absolute inset-0 border-2 border-white/40" />
          <div className="box-top absolute left-[15%] right-[15%] top-0 h-[16%] border-b-2 border-x-2 border-white/80" />
          <div className="goal-box-top absolute left-[35%] right-[35%] top-0 h-[5%] border-b-2 border-x-2 border-white/80" />
          <div className="box-bottom absolute left-[15%] right-[15%] bottom-0 h-[16%] border-t-2 border-x-2 border-white/80" />
          <div className="goal-box-bottom absolute left-[35%] right-[35%] bottom-0 h-[5%] border-t-2 border-x-2 border-white/80" />
          <div className="half-line absolute left-1/2 top-1/2 w-full h-[2px] bg-white/80 -translate-x-1/2 -translate-y-1/2" />
          <div className="center-circle absolute left-1/2 top-1/2 w-[25%] aspect-square border-2 border-white/80 rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
          <div className="absolute left-1/2 top-[12%] w-1.5 h-1.5 bg-white/80 rounded-full -translate-x-1/2" />
          <div className="absolute left-1/2 bottom-[12%] w-1.5 h-1.5 bg-white/80 rounded-full -translate-x-1/2" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 border-2 border-white/40" />
          <div className="box-left absolute top-[15%] bottom-[15%] left-0 w-[16%] border-r-2 border-y-2 border-white/80" />
          <div className="goal-box-left absolute top-[35%] bottom-[35%] left-0 w-[5%] border-r-2 border-y-2 border-white/80" />
          <div className="box-right absolute top-[15%] bottom-[15%] right-0 w-[16%] border-l-2 border-y-2 border-white/80" />
          <div className="goal-box-right absolute top-[35%] bottom-[35%] right-0 w-[5%] border-l-2 border-y-2 border-white/80" />
          <div className="half-line absolute left-1/2 top-1/2 w-[2px] h-full bg-white/80 -translate-x-1/2 -translate-y-1/2" />
          <div className="center-circle absolute left-1/2 top-1/2 w-[25%] aspect-square border-2 border-white/80 rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
          <div className="absolute top-1/2 left-[12%] w-1.5 h-1.5 bg-white/80 rounded-full -translate-y-1/2" />
          <div className="absolute top-1/2 right-[12%] w-1.5 h-1.5 bg-white/80 rounded-full -translate-y-1/2" />
        </>
      )}
    </div>
  </div>
);

const BasketballMarkings = ({ orientation }: { orientation: 'vertical' | 'horizontal' }) => (
  <div className="absolute inset-0 pointer-events-none bg-[#d0885c]">
     {/* Floor texture */}
     <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,_rgba(0,0,0,0.1)_0_2px,_transparent_2px_40px)]" />

     <div className="pitch-lines absolute inset-0 opacity-80">
        <div className="absolute inset-0 border-2 border-white/60" />
        {orientation === 'vertical' ? (
          <>
            <div className="half-line absolute left-1/2 top-1/2 w-full h-[2px] bg-white/60 -translate-x-1/2 -translate-y-1/2" />
            <div className="center-circle absolute left-1/2 top-1/2 w-[20%] aspect-square border-2 border-white/60 rounded-full -translate-x-1/2 -translate-y-1/2" />
            
            {/* Three Point Lines */}
            <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] border-b-2 border-x-2 border-white/60 rounded-b-[100%]" />
            <div className="absolute bottom-[-5%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] border-t-2 border-x-2 border-white/60 rounded-t-[100%]" />
            
            {/* Keys (Paint) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22%] h-[19%] border-b-2 border-x-2 border-white/80 bg-white/10" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[22%] h-[19%] border-t-2 border-x-2 border-white/80 bg-white/10" />
            
            {/* Free Throw Circles */}
            <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[22%] aspect-square border-2 border-white/60 rounded-full" />
            <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-[22%] aspect-square border-2 border-white/60 rounded-full" />
            
            {/* Hoops */}
            <div className="absolute top-[4%] left-1/2 -translate-x-1/2 w-4 h-4 border-2 border-orange-500 rounded-full z-10" />
            <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 w-4 h-4 border-2 border-orange-500 rounded-full z-10" />
            {/* Backboards */}
            <div className="absolute top-[2%] left-1/2 -translate-x-1/2 w-10 h-0.5 bg-white/90" />
            <div className="absolute bottom-[2%] left-1/2 -translate-x-1/2 w-10 h-0.5 bg-white/90" />
          </>
        ) : (
          <>
            <div className="half-line absolute left-1/2 top-1/2 w-[2px] h-full bg-white/60 -translate-x-1/2 -translate-y-1/2" />
            <div className="center-circle absolute left-1/2 top-1/2 h-[20%] aspect-square border-2 border-white/60 rounded-full -translate-x-1/2 -translate-y-1/2" />
            
            {/* Three Point Lines */}
            <div className="absolute left-[-5%] top-1/2 -translate-y-1/2 h-[80%] w-[40%] border-r-2 border-y-2 border-white/60 rounded-r-[100%]" />
            <div className="absolute right-[-5%] top-1/2 -translate-y-1/2 h-[80%] w-[40%] border-l-2 border-y-2 border-white/60 rounded-l-[100%]" />

            {/* Keys (Paint) */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[22%] w-[19%] border-r-2 border-y-2 border-white/80 bg-white/10" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[22%] w-[19%] border-l-2 border-y-2 border-white/80 bg-white/10" />
            
            {/* Free Throw Circles */}
            <div className="absolute left-[12%] top-1/2 -translate-y-1/2 h-[22%] aspect-square border-2 border-white/60 rounded-full" />
            <div className="absolute right-[12%] top-1/2 -translate-y-1/2 h-[22%] aspect-square border-2 border-white/60 rounded-full" />
            
            {/* Hoops */}
            <div className="absolute left-[4%] top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-orange-500 rounded-full z-10" />
            <div className="absolute right-[4%] top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-orange-500 rounded-full z-10" />
            {/* Backboards */}
            <div className="absolute left-[2%] top-1/2 -translate-y-1/2 h-10 w-0.5 bg-white/90" />
            <div className="absolute right-[2%] top-1/2 -translate-y-1/2 h-10 w-0.5 bg-white/90" />
          </>
        )}
     </div>
  </div>
);

const VolleyballMarkings = ({ orientation }: { orientation: 'vertical' | 'horizontal' }) => (
  <div className="absolute inset-0 pointer-events-none bg-[#4a90e2]">
     {/* Floor texture */}
     <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(90deg,_rgba(255,255,255,0.1)_0_2px,_transparent_2px_40px)]" />

     <div className="pitch-lines absolute inset-0 opacity-80">
        <div className="absolute inset-0 border-2 border-white/60" />
        {orientation === 'vertical' ? (
          <>
            {/* Attack Line (3m line) */}
            <div className="absolute top-[33.3%] left-0 right-0 h-0.5 bg-white/40" />
            <div className="absolute bottom-[33.3%] left-0 right-0 h-0.5 bg-white/40" />
            {/* Net */}
            <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-yellow-400/90 shadow-[0_0_15px_rgba(250,204,21,0.4)] z-10" />
            {/* Side Antennas */}
            <div className="absolute top-1/2 left-0 w-1 h-12 bg-red-500/80 -translate-y-1/2 z-20" />
            <div className="absolute top-1/2 right-0 w-1 h-12 bg-red-500/80 -translate-y-1/2 z-20" />
          </>
        ) : (
          <>
            {/* Attack Line (3m line) */}
            <div className="absolute left-[33.3%] top-0 bottom-0 w-0.5 bg-white/40" />
            <div className="absolute right-[33.3%] top-0 bottom-0 w-0.5 bg-white/40" />
            {/* Net */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1.5 bg-yellow-400/90 shadow-[0_0_15px_rgba(250,204,21,0.4)] z-10" />
            {/* Side Antennas */}
            <div className="absolute left-1/2 top-0 h-1 w-12 bg-red-500/80 -translate-x-1/2 z-20" />
            <div className="absolute left-1/2 bottom-0 h-1 w-12 bg-red-500/80 -translate-x-1/2 z-20" />
          </>
        )}
     </div>
  </div>
);

// --- Main Component ---

export default function App() {
  const [setName, setSetName] = useState("");
  const [sport, setSport] = useState<Sport>('football');
  const [playerCounts, setPlayerCounts] = useState({ home: 11, away: 11 });
  const [colors, setColors] = useState<Colors>(DEFAULT_COLORS);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [scenes, setScenes] = useState<Scene[]>([
    { name: getDefaultSceneName(), positions: getInitialPositions(11, 11, 'vertical', 'football') }
  ]);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showPaths, setShowPaths] = useState(true);
  const [tempo, setTempo] = useState(1);
  const [savedSets, setSavedSets] = useState<SavedSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [draggedToken, setDraggedToken] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<'move' | 'link'>('move');
  const [linkingPlayerId, setLinkingPlayerId] = useState<string | null>(null);
  const [currentLinkStyle, setCurrentLinkStyle] = useState<LinkStyle>({
    color: '#ffffff',
    thickness: 0.4,
    dashed: true,
    type: 'classic'
  });

  const clearLinks = () => {
    setScenes(prev => {
      const newScenes = [...prev];
      newScenes[activeSceneIndex] = {
        ...newScenes[activeSceneIndex],
        links: []
      };
      return newScenes;
    });
  };

  const toggleSpecialPlayer = (id: string | null) => {
    if (!id) return;
    setScenes(prev => {
      const newScenes = [...prev];
      const scene = { ...newScenes[activeSceneIndex] };
      let specials = Array.isArray(scene.specialPlayers) ? [...scene.specialPlayers] : [];
      
      const isHome = id.startsWith('H');
      const idx = specials.indexOf(id);

      if (idx > -1) {
        // If already selected, remove it
        specials.splice(idx, 1);
      } else {
        // If not selected, handle volleyball single-specialist logic then add it
        if (sport === 'volleyball') {
          specials = specials.filter(sid => 
            (isHome && !sid.startsWith('H')) || (!isHome && !sid.startsWith('A'))
          );
        }
        specials.push(id);
      }
      
      newScenes[activeSceneIndex] = { ...scene, specialPlayers: specials };
      return newScenes;
    });
  };

  const applyFormation = (team: 'home' | 'away', formationKey: string) => {
    if (sport !== 'football') return;
    const shape = FOOTBALL_FORMATIONS[formationKey];
    if (!shape) return;
    
    const count = shape.reduce((a, b) => a + b, 0);
    setPlayerCounts(prev => ({ ...prev, [team]: count }));
    
    const teamPos = generateTeamPositions(team, count, 'football', shape);
    const orientedPos = orientation === 'horizontal' 
      ? Object.fromEntries(Object.entries(teamPos).map(([id, p]) => [id, { x: p.y, y: p.x }]))
      : teamPos;

    setScenes(prev => prev.map(s => ({
      ...s,
      positions: { ...s.positions, ...orientedPos }
    })));
  };

  const [isFilmStripOpen, setIsFilmStripOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const pitchRef = useRef<HTMLDivElement>(null);
  const playbackRef = useRef<NodeJS.Timeout|null>(null);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const didMount = useRef(false);

  // Load saved sets on mount
  useEffect(() => {
    const stored = localStorage.getItem('tactical-board-sets');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedSets(parsed);
        }
      } catch (e) {
        console.error("Failed to load sets", e);
      }
    }
    didMount.current = true;
  }, []);

  // Sync savedSets to localStorage
  useEffect(() => {
    localStorage.setItem('tactical-board-sets', JSON.stringify(savedSets));
  }, [savedSets]);

  // Sync colors to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--home-primary', colors.homePrimary);
    root.style.setProperty('--home-secondary', colors.homeSecondary);
    root.style.setProperty('--away-primary', colors.awayPrimary);
    root.style.setProperty('--away-secondary', colors.awaySecondary);
  }, [colors]);

  // Sync dark mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // --- Actions ---

  const handleReset = () => {
    const initialPos = getInitialPositions(playerCounts.home, playerCounts.away, orientation, sport);
    setScenes([{ name: getDefaultSceneName(), positions: initialPos }]);
    setActiveSceneIndex(0);
    setIsPlaying(false);
  };

  const changeSport = (newSport: Sport) => {
    if (newSport === sport) return;
    let defaultCount = 11;
    if (newSport === 'basketball') defaultCount = 5;
    if (newSport === 'volleyball') defaultCount = 6;

    setSport(newSport);
    setPlayerCounts({ home: defaultCount, away: defaultCount });
    const initialPos = getInitialPositions(defaultCount, defaultCount, orientation, newSport);
    setScenes([{ name: getDefaultSceneName(), positions: initialPos }]);
    setActiveSceneIndex(0);
    setIsPlaying(false);
  };

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    if (!pitchRef.current) return;

    if (activeTool === 'link') {
      if (!linkingPlayerId) {
        setLinkingPlayerId(id);
      } else if (linkingPlayerId === id) {
        setLinkingPlayerId(null);
      } else {
        // Create or remove link
        setScenes(prev => {
          const newScenes = [...prev];
          const currentScene = { ...newScenes[activeSceneIndex] };
          const links = [...(currentScene.links || [])];
          
          const existingIndex = links.findIndex(l => 
            (l.players[0] === linkingPlayerId && l.players[1] === id) || 
            (l.players[1] === linkingPlayerId && l.players[0] === id)
          );

          if (existingIndex > -1) {
            links.splice(existingIndex, 1);
          } else {
            links.push({
              players: [linkingPlayerId, id],
              style: { ...currentLinkStyle }
            });
          }

          newScenes[activeSceneIndex] = { ...currentScene, links };
          return newScenes;
        });
        setLinkingPlayerId(null);
      }
      return;
    }

    setDraggedToken(id);
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const rect = pitchRef.current.getBoundingClientRect();
    const currentPos = scenes[activeSceneIndex].positions[id];
    
    // Calculate initial offset in % to prevent snapping center to cursor
    const cursorStartX = ((e.clientX - rect.left) / rect.width) * 100;
    const cursorStartY = ((e.clientY - rect.top) / rect.height) * 100;
    const offsetX = cursorStartX - currentPos.x;
    const offsetY = cursorStartY - currentPos.y;
    
    // Add global move/up listeners to ensure smooth tracking
    const onMove = (moveEvent: PointerEvent) => {
      if (!pitchRef.current) return;
      const moveRect = pitchRef.current.getBoundingClientRect();
      const x = clamp(((moveEvent.clientX - moveRect.left) / moveRect.width) * 100 - offsetX, 1, 99);
      const y = clamp(((moveEvent.clientY - moveRect.top) / moveRect.height) * 100 - offsetY, 1, 99);

      setScenes(prev => {
        const newScenes = [...prev];
        const currentScene = newScenes[activeSceneIndex];
        newScenes[activeSceneIndex] = {
          ...currentScene,
          positions: {
            ...currentScene.positions,
            [id]: { x, y }
          }
        };
        return newScenes;
      });
    };

    const onUp = () => {
      setDraggedToken(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (target && target.releasePointerCapture) {
        target.releasePointerCapture(e.pointerId);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const addScene = () => {
    const currentScene = scenes[activeSceneIndex];
    const newName = getDefaultSceneName();
    
    const newScene: Scene = {
      name: newName,
      positions: JSON.parse(JSON.stringify(currentScene.positions)),
      links: currentScene.links ? JSON.parse(JSON.stringify(currentScene.links)) : []
    };
    const newScenes = [...scenes];
    newScenes.splice(activeSceneIndex + 1, 0, newScene);
    setScenes(newScenes);
    setActiveSceneIndex(activeSceneIndex + 1);
    setIsFilmStripOpen(true);
  };

  const deleteScene = (index: number) => {
    if (scenes.length <= 1) return;
    const newScenes = scenes.filter((_, i) => i !== index);
    setScenes(newScenes);
    setActiveSceneIndex(Math.max(0, index - 1));
  };

  const toggleOrientation = () => {
    const newOrient = orientation === 'vertical' ? 'horizontal' : 'vertical';
    setOrientation(newOrient);
    
    setScenes(prev => prev.map(s => ({
      ...s,
      positions: Object.fromEntries(
        Object.entries(s.positions).map(([id, p]) => {
          const pt = p as Point;
          return [
            id, 
            orientation === 'vertical' 
              ? { x: (100 - pt.y) - 3, y: pt.x } 
              : { x: pt.y, y: 100 - (pt.x + 3) }
          ];
        })
      )
    })));
  };

  const handlePlayerCountChange = (team: 'home' | 'away', count: number) => {
    const maxCount = sport === 'basketball' ? 5 : sport === 'volleyball' ? 6 : 11;
    const val = clamp(count, 0, maxCount);
    setPlayerCounts(prev => ({ ...prev, [team]: val }));
    
    // In volleyball, if count changes, we should clear specialists for that team 
    // to avoid "ghost" Liberos if the ID of the last player changes
    if (sport === 'volleyball') {
      setScenes(prev => prev.map(scene => ({
        ...scene,
        specialPlayers: (scene.specialPlayers || []).filter(id => 
          (team === 'home' ? !id.startsWith('H') : !id.startsWith('A'))
        )
      })));
    }

    const teamPos = generateTeamPositions(team, val, sport);
    const orientedPos = orientation === 'horizontal' 
      ? Object.fromEntries(Object.entries(teamPos).map(([id, p]) => [id, { x: (100 - p.y) - 3, y: p.x }]))
      : teamPos;

    setScenes(prev => prev.map(s => ({
      ...s,
      positions: { ...s.positions, ...orientedPos }
    })));
  };

  const saveSet = () => {
    if (!setName.trim()) return;
    
    const newId = Date.now().toString();
    const set: SavedSet = {
      id: newId,
      name: setName,
      playerCounts: { ...playerCounts },
      colors: { ...colors },
      orientation,
      scenes: JSON.parse(JSON.stringify(scenes)),
      sport
    };
    
    setSavedSets(prev => [...prev, set]);
    setSelectedSetId(newId);
    setSaveStatus('success');
    setTimeout(() => {
      setSaveStatus('idle');
      setIsSaveModalOpen(false);
    }, 1000);
  };

  const loadSet = (id: string) => {
    const set = savedSets.find(s => s.id === id);
    if (!set) return;
    setSelectedSetId(id);
    setSetName(set.name);
    setPlayerCounts({ ...set.playerCounts });
    setColors({ ...set.colors });
    setOrientation(set.orientation);
    setSport(set.sport || 'football');
    setScenes(JSON.parse(JSON.stringify(set.scenes))); 
    setActiveSceneIndex(0);
    setIsPlaying(false);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteSet = (id: string) => {
    if (!id) return;
    
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    
    setSavedSets(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem('tactical-board-sets', JSON.stringify(updated));
      return updated;
    });
    
    if (selectedSetId === id) {
      setSelectedSetId("");
      setSetName("");
    }
    setConfirmDeleteId(null);
  };

  const playSequence = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (activeSceneIndex >= scenes.length - 1) {
      setActiveSceneIndex(0);
    }
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying) {
      const interval = (1500 / tempo);
      playbackRef.current = setInterval(() => {
        setActiveSceneIndex(prev => {
          if (prev >= scenes.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    } else {
      if (playbackRef.current) clearInterval(playbackRef.current);
    }
    return () => { if (playbackRef.current) clearInterval(playbackRef.current); };
  }, [isPlaying, scenes.length, tempo]);

  const renderTokens = () => {
    const pos = scenes[activeSceneIndex].positions;
    const tokens = [];
    const scale = orientation === 'horizontal' ? 1 : 0.95; 

    // Dynamic transition based on tempo
    const getTransition = (id: string | null) => {
      if (draggedToken === id) return { type: "tween", duration: 0 };
      
      return {
        type: "spring",
        stiffness: 70 * (tempo * 2.5), // Lower baseline stiffness for "sliding" feel, scaled by tempo
        damping: 20 + (tempo * 2), // Balanced damping
        mass: 1.2 / tempo, // Lighten at high speed
        restDelta: 0.1
      };
    };

    // Player sizing based on screen/container might be complex, 
    // so we'll use a slightly responsive approach with CSS classes.
    const tokenClasses = orientation === 'horizontal' ? 'w-7 h-7 xs:w-8 xs:h-8 lg:w-10 lg:h-10' : 'w-7 h-7 xs:w-7.5 xs:h-7.5 lg:w-9 lg:h-9';
    const ballClasses = orientation === 'horizontal' ? 'w-4 h-4 xs:w-4.5 xs:h-4.5 lg:w-5.5 lg:h-5.5' : 'w-4 h-4 xs:w-4 lg:w-5 lg:h-5';
    
    // Ball
    tokens.push(
      <motion.div
        key="ball"
        initial={false}
        animate={{
          left: `${pos.ball.x}%`,
          top: `${pos.ball.y}%`,
          scale: scale * (draggedToken === 'ball' ? 1.2 : 1)
        }}
        transition={getTransition('ball')}
        onPointerDown={(e) => handlePointerDown('ball', e)}
        className="absolute z-50 cursor-move pointer-events-auto touch-none"
        style={{
          transform: 'translate(-50%, -50%)',
          willChange: 'left, top'
        }}
      >
        <div className={`${ballClasses} rounded-full ${sport === 'basketball' ? 'bg-[#ff8c42]' : sport === 'volleyball' ? 'bg-white shadow-[inset_0_0_10px_rgba(30,58,138,0.3)] border-blue-900/20' : 'bg-white'} border-2 border-black/80 shadow-lg flex items-center justify-center overflow-hidden`}>
          {sport === 'volleyball' && (
            <div className="absolute inset-0 opacity-20 bg-[conic-gradient(from_0deg,_transparent_0_120deg,_#fbce07_120deg_240deg,_#1e3a8a_240deg_360deg)]" />
          )}
        </div>
      </motion.div>
    );

    // Players
    const homeIds = Array.from({ length: playerCounts.home }, (_, i) => `H${i + 1}`);
    const awayIds = Array.from({ length: playerCounts.away }, (_, i) => `A${i + 1}`);

    [...homeIds, ...awayIds].forEach(id => {
      const isHome = id.startsWith('H');
      const p = pos[id] || { x: 50, y: 50 };
      const isDragged = draggedToken === id;
      const lastHomeId = `H${playerCounts.home}`;
      const lastAwayId = `A${playerCounts.away}`;
      const isSpecial = scenes[activeSceneIndex].specialPlayers?.includes(id);
      const isLibero = sport === 'volleyball' && (id === lastHomeId || id === lastAwayId) && isSpecial;
      
      tokens.push(
        <motion.div
          key={id}
          initial={false}
          animate={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            scale: scale * (isDragged || isSpecial ? 1.15 : 1)
          }}
          transition={getTransition(id)}
          onPointerDown={(e) => {
            handlePointerDown(id, e);
            setSelectedPlayerId(id);
          }}
          className={`absolute z-40 cursor-grab active:cursor-grabbing select-none pointer-events-auto touch-none`}
          style={{
            transform: 'translate(-50%, -50%)',
            willChange: 'left, top'
          }}
        >
          <div 
            className={`${tokenClasses} rounded-full flex items-center justify-center font-black text-[10px] xs:text-xs lg:text-sm shadow-xl border-2 select-none transition-colors ${isDragged ? 'ring-2 ring-white ring-offset-2 scale-110' : ''} ${linkingPlayerId === id ? 'ring-4 ring-accent bg-accent' : ''} ${isSpecial && sport === 'volleyball' ? 'border-yellow-400 ring-4 ring-yellow-400/30' : 'border-white/90'}`}
            style={{ 
              backgroundColor: linkingPlayerId === id ? undefined : (isSpecial && sport === 'volleyball' ? '#FFD700' : (isHome ? colors.homePrimary : colors.awayPrimary)),
              color: isSpecial && sport === 'volleyball' ? '#000' : (isHome ? colors.homeSecondary : colors.awaySecondary)
            }}
          >
            {isSpecial && sport === 'volleyball' && (
              <div className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-black text-[7px] px-1 rounded-sm border border-black/20 z-10 font-black">{isLibero ? 'L' : 'S'}</div>
            )}
            {id.slice(1)}
          </div>
        </motion.div>
      );
    });

    return tokens;
  };

  const renderTacticalLinks = () => {
    const currentScene = scenes[activeSceneIndex];
    if (!currentScene.links || currentScene.links.length === 0) return null;

    return (
      <svg 
        viewBox="0 0 100 100" 
        className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
        preserveAspectRatio="none"
      >
        {currentScene.links.map((link, idx) => {
          const p1 = currentScene.positions[link.players[0]];
          const p2 = currentScene.positions[link.players[1]];
          if (!p1 || !p2) return null;

          const { color, thickness, dashed, type } = link.style;
          
          if (type === 'fluid') {
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy) || 1;
            const offsetX = (-dy / dist) * 4; 
            const offsetY = (dx / dist) * 4;
            
            const cpX = midX + offsetX;
            const cpY = midY + offsetY;

            return (
              <motion.path
                key={`link-${link.players[0]}-${link.players[1]}-${idx}`}
                initial={false}
                animate={{
                  d: `M ${p1.x} ${p1.y} Q ${cpX} ${cpY} ${p2.x} ${p2.y}`
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                stroke={color}
                strokeWidth={thickness}
                strokeDasharray={dashed ? "2 2" : "0"}
                strokeOpacity="0.7"
                fill="none"
              />
            );
          }

          return (
            <motion.line
              key={`link-${link.players[0]}-${link.players[1]}-${idx}`}
              initial={false}
              animate={{
                x1: p1.x,
                y1: p1.y,
                x2: p2.x,
                y2: p2.y
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              stroke={color}
              strokeWidth={thickness}
              strokeDasharray={dashed ? "2 2" : "0"}
              strokeOpacity="0.7"
            />
          );
        })}
      </svg>
    );
  };

  const renderMotionPaths = () => {
    if (!showPaths || scenes.length < 2 || activeSceneIndex >= scenes.length - 1) return null;
    const from = scenes[activeSceneIndex].positions;
    const to = scenes[activeSceneIndex + 1].positions;

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.4)" />
          </marker>
        </defs>
        {Object.keys(from).map(id => {
          // Only show path for ball or selected players in free mode, or all if preferred
          // Let's show for ball always and players if they move significantly
          const f = from[id];
          const t = to[id];
          if (!f || !t) return null;
          const dist = Math.hypot(f.x - t.x, f.y - t.y);
          if (dist < 2) return null;

          const isBall = id === 'ball';
          return (
            <line
              key={`path-${id}`}
              x1={`${f.x}%`} y1={`${f.y}%`}
              x2={`${t.x}%`} y2={`${t.y}%`}
              stroke={isBall ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)"}
              strokeWidth={isBall ? 2 : 1}
              strokeDasharray={isBall ? "4 4" : "0"}
              markerEnd="url(#arrowhead)"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="h-screen bg-bg text-ink selection:bg-teal-100 flex flex-col overflow-hidden">
      {/* Topbar */}
      <header className="h-14 lg:h-16 bg-panel border-b border-line px-3 lg:px-6 flex items-center justify-between z-50 shrink-0 gap-2 lg:gap-4">
        <div className="flex items-center gap-2 lg:gap-6 min-w-0">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 lg:p-2 hover:bg-black/5 rounded-lg transition-colors text-muted shrink-0"
            title={sidebarOpen ? "Paneli Kapat" : "Paneli Aç"}
          >
            <PanelLeft size={18} />
          </button>
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-1.5 lg:gap-3 overflow-hidden shrink-0">
            <div className="flex-shrink-0 w-7 h-7 lg:w-9 lg:h-9 bg-accent rounded flex items-center justify-center shadow-lg shadow-accent/20">
              <svg viewBox="0 0 24 24" className="w-4 h-4 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="6" cy="6" r="1" />
                <circle cx="18" cy="18" r="1" />
                <circle cx="18" cy="6" r="1" />
                <circle cx="6" cy="18" r="1" />
                <path d="M6 12h12M12 6v12" className="opacity-40" />
              </svg>
            </div>
            <h1 className="text-[10px] lg:text-base font-black tracking-tighter truncate uppercase italic leading-none">Set Pieces</h1>
          </div>

          <div className="h-6 w-px bg-line hidden md:block" />

          {/* Interaction Mode Tools */}
          <div className="flex items-center bg-panel-strong/30 rounded-lg p-0.5 lg:p-1 border border-line shrink-0">
            <button 
              onClick={() => { setActiveTool('move'); setLinkingPlayerId(null); }}
              className={`h-7 lg:h-8 px-2 lg:px-4 rounded flex items-center gap-1 lg:gap-2 font-black uppercase text-[9px] lg:text-[11px] transition-all ${
                activeTool === 'move' ? 'bg-accent text-white shadow-sm' : 'text-ink/60 hover:text-accent'
              }`}
            >
              <MousePointer2 size={13} className="lg:w-3.5 lg:h-3.5" /> <span className="hidden sm:inline">Seç</span>
            </button>
            <button 
              onClick={() => setActiveTool('link')}
              className={`h-7 lg:h-8 px-2 lg:px-4 rounded flex items-center gap-1 lg:gap-2 font-black uppercase text-[9px] lg:text-[11px] transition-all ${
                activeTool === 'link' ? 'bg-accent text-white shadow-sm' : 'text-ink/60 hover:text-accent'
              }`}
            >
              <Link2 size={13} className="lg:w-3.5 lg:h-3.5" /> <span className="hidden sm:inline">Bağla</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 lg:gap-3 shrink-0">
          <button 
            onClick={handleReset}
            className="h-8 lg:h-9 px-2 lg:px-4 bg-panel-strong dark:bg-panel-strong text-ink border border-line rounded-lg flex items-center justify-center gap-1.5 text-[9px] lg:text-xs font-black uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95"
            title="Tahtayı Sıfırla"
          >
            <RotateCcw size={13} className="lg:w-3.5 lg:h-3.5" /> <span className="hidden lg:inline">Sıfırla</span>
          </button>
          
          <button 
            onClick={playSequence}
            className={`h-8 lg:h-9 px-3 lg:px-6 rounded-lg font-black text-[9px] lg:text-xs flex items-center gap-1.5 transition-all active:scale-95 uppercase tracking-wider ${
              isPlaying ? 'bg-ink text-paper' : 'bg-accent text-white hover:brightness-110'
            }`}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" className="lg:w-4 lg:h-4" /> : <Play size={14} fill="currentColor" className="lg:w-4 lg:h-4" />}
            <span className="hidden xs:inline">{isPlaying ? 'Durdur' : 'Oynat'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside 
          className={`bg-panel border-r border-line overflow-y-auto custom-scrollbar flex flex-col gap-3 transition-all duration-500 ease-in-out fixed lg:relative inset-y-0 left-0 z-50 ${
            sidebarOpen 
              ? 'w-[280px] sm:w-[300px] translate-x-0 shadow-2xl lg:shadow-none' 
              : 'w-0 -translate-x-full lg:w-0 lg:translate-x-0 lg:opacity-0'
          } overflow-x-hidden shrink-0`}
        >
          {/* Mobile Close Button */}
          <div className="lg:hidden p-4 flex justify-end border-b border-line">
            <button onClick={() => setSidebarOpen(false)} className="p-2 text-muted"> <PanelLeftClose size={20} /> </button>
          </div>
          
          {/* Section 1: SPOR BRANŞI */}
          <div className="p-4 border-b border-line">
            <h3 className="font-black text-[11px] uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
              <Trophy size={12} /> SPOR BRANŞI
            </h3>
            <div className="flex gap-2 p-1 bg-panel-strong dark:bg-panel-strong rounded-lg border border-line">
              <button 
                onClick={() => changeSport('football')}
                className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded transition-all ${
                  sport === 'football' ? 'bg-accent text-white shadow-md' : 'text-ink/60 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="text-sm">⚽</div>
                <span className="text-[8px] font-black uppercase">Futbol</span>
              </button>
              <button 
                onClick={() => changeSport('basketball')}
                className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded transition-all ${
                  sport === 'basketball' ? 'bg-accent text-white shadow-md' : 'text-ink/60 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="text-sm">🏀</div>
                <span className="text-[8px] font-black uppercase">Basketbol</span>
              </button>
              <button 
                onClick={() => changeSport('volleyball')}
                className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded transition-all ${
                  sport === 'volleyball' ? 'bg-accent text-white shadow-md' : 'text-ink/60 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="text-sm">🏐</div>
                <span className="text-[8px] font-black uppercase">Voleybol</span>
              </button>
            </div>
          </div>

          {/* Section 2: GÖRÜNÜM */}
          <div className="p-4 border-b border-line">
            <h3 className="font-black text-[11px] uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
              <Layout size={12} /> GÖRÜNÜM
            </h3>
            
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2 p-1 bg-panel-strong dark:bg-panel-strong rounded-lg border border-line">
                {['vertical', 'horizontal'].map(o => (
                  <button
                    key={o}
                    onClick={() => orientation !== o && toggleOrientation()}
                    className={`px-2 py-1.5 rounded text-[9px] font-black uppercase transition-all ${
                      orientation === o ? 'bg-accent text-white shadow-md' : 'text-ink/60 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {o === 'vertical' ? 'DİKEY' : 'YATAY'}
                  </button>
                ))}
              </div>

              <div className="p-2.5 bg-panel-strong/30 rounded-lg border border-line space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-ink/60">Hız (Tempo)</span>
                  <span className="text-[9px] font-black text-accent bg-accent/10 px-1 rounded">{tempo}x</span>
                </div>
                <input 
                  type="range" min={0} max={100} 
                  value={tempo <= 1 ? ((tempo - 0.25) / 0.75) * 50 : 50 + ((tempo - 1) / 1.0) * 50}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    if (val <= 50) {
                      const t = 0.25 + (Math.round((val / 50) * 3) / 3) * 0.75;
                      setTempo(Math.max(0.25, Math.min(1.0, Math.round(t * 100) / 100)));
                    } else {
                      const t = 1.0 + (Math.round(((val - 50) / 50) * 4) / 4) * 1.0;
                      setTempo(Math.max(1.0, Math.min(2.0, Math.round(t * 100) / 100)));
                    }
                  }}
                  className="w-full accent-accent h-1.5 bg-line rounded-full appearance-none cursor-pointer"
                />
              </div>

              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-between p-2 bg-panel-strong/30 rounded-lg border border-line cursor-pointer hover:bg-panel-strong/50 transition-all">
                  <div className="flex items-center gap-2">
                    <Move size={12} className="text-accent" />
                    <span className="text-[9px] font-black uppercase text-ink/60">Rota</span>
                  </div>
                  <input type="checkbox" checked={showPaths} onChange={e => setShowPaths(e.target.checked)} className="w-3.5 h-3.5 accent-accent cursor-pointer" />
                </label>

                <button 
                  onClick={() => setIsDark(!isDark)}
                  className="flex-1 h-9 flex items-center justify-center gap-2 rounded-lg border border-line bg-panel-strong/50 hover:bg-panel-strong text-[9px] font-black uppercase transition-all"
                >
                  {isDark ? <Sun size={12} /> : <Moon size={12} />}
                  MOD
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: TAKTİK KAYITLARI */}
          <div className="p-4 border-b border-line">
            <h3 className="font-black text-[11px] uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
              <Save size={12} /> TAKTİK KAYITLARI
            </h3>
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <select 
                  value={selectedSetId} 
                  onChange={(e) => loadSet(e.target.value)}
                  className="w-full h-8 bg-panel-strong dark:bg-panel-strong border border-line rounded px-2 text-[10px] font-bold text-ink outline-none focus:border-accent"
                >
                  <option value="">Seçiniz...</option>
                  {savedSets.map(set => (
                    <option key={set.id} value={set.id}>{set.name}</option>
                  ))}
                </select>
                
                {selectedSetId && (
                  <button 
                    onClick={() => deleteSet(selectedSetId)}
                    className={`w-full h-8 text-[9px] uppercase font-black rounded transition-all border flex items-center justify-center gap-2 ${
                      confirmDeleteId === selectedSetId
                        ? 'bg-red-600 text-white border-red-600'
                        : 'border-red-500/30 text-red-500 hover:bg-red-500'
                    }`}
                  >
                    <Trash2 size={11} />
                    {confirmDeleteId === selectedSetId ? 'TEKRAR BASIN' : 'SİL'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: TAKIM YAPISI */}
          <div className="p-4 border-b border-line">
            <h3 className="font-black text-[11px] uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
              <Users size={12} /> TAKIM YAPISI
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-home uppercase tracking-wider">EV SAHİBİ</label>
                  <input 
                    type="number" min={0} max={sport === 'basketball' ? 5 : sport === 'volleyball' ? 6 : 11} 
                    value={playerCounts.home} onChange={e => handlePlayerCountChange('home', parseInt(e.target.value))}
                    className="w-full h-8 bg-panel-strong/40 border border-line rounded px-2 text-[11px] font-black text-center text-ink outline-none focus:border-accent"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-away uppercase tracking-wider">DEPLASMAN</label>
                  <input 
                    type="number" min={0} max={sport === 'basketball' ? 5 : sport === 'volleyball' ? 6 : 11} 
                    value={playerCounts.away} onChange={e => handlePlayerCountChange('away', parseInt(e.target.value))}
                    className="w-full h-8 bg-panel-strong/40 border border-line rounded px-2 text-[11px] font-black text-center text-ink outline-none focus:border-accent"
                  />
                </div>
              </div>

              {sport === 'football' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-home uppercase tracking-wider flex items-center gap-1.5">
                       EV SAHİBİ FORMASYON
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {Object.keys(FOOTBALL_FORMATIONS).map(f => (
                        <button 
                          key={f} onClick={() => applyFormation('home', f)}
                          className="py-1 px-1 bg-panel-strong border border-line rounded text-[8px] font-bold hover:bg-accent hover:text-white transition-all text-ink/70"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-away uppercase tracking-wider flex items-center gap-1.5">
                       DEPLASMAN FORMASYON
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {Object.keys(FOOTBALL_FORMATIONS).map(f => (
                        <button 
                          key={f} onClick={() => applyFormation('away', f)}
                          className="py-1 px-1 bg-panel-strong border border-line rounded text-[8px] font-bold hover:bg-accent hover:text-white transition-all text-ink/70"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-home/80">EV SAHİBİ RENK</label>
                  <input type="color" value={colors.homePrimary} onChange={e => setColors(prev => ({ ...prev, homePrimary: e.target.value }))} className="w-full h-8 rounded border border-line cursor-pointer bg-panel-strong/40 p-0.5" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-away/80">DEPLASMAN RENK</label>
                  <input type="color" value={colors.awayPrimary} onChange={e => setColors(prev => ({ ...prev, awayPrimary: e.target.value }))} className="w-full h-8 rounded border border-line cursor-pointer bg-panel-strong/40 p-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Scenes */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-[11px] uppercase tracking-widest text-muted flex items-center gap-2">
                <Layers size={12} /> SAHNELER
              </h3>
            </div>
            
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {scenes.map((scene, i) => (
                  <motion.div 
                    key={`${i}-${scene.name}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className={`group relative px-3 py-2 rounded border text-xs transition-all cursor-pointer flex items-center justify-between ${
                      activeSceneIndex === i 
                        ? 'bg-accent/10 dark:bg-accent/20 border-accent font-bold' 
                        : 'bg-white dark:bg-panel-strong border-line hover:border-accent/40'
                    }`}
                    onClick={() => setActiveSceneIndex(i)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[10px] text-muted dark:text-muted shrink-0">{i + 1}.</span>
                      <input 
                        type="text"
                        value={scene.name}
                        onChange={e => {
                          const newScenes = [...scenes];
                          newScenes[i].name = e.target.value;
                          setScenes(newScenes);
                        }}
                        className="bg-transparent border-none p-0 focus:ring-0 w-full truncate outline-none select-text text-ink"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {scenes.length > 1 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteScene(i); }}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Global settings section removed from bottom (it was moved up) */}

        </aside>

        {/* Board Area */}
        <main className="flex-1 p-2 sm:p-4 lg:px-8 lg:py-6 flex flex-col items-center justify-center relative select-none overflow-hidden transition-all duration-500 ease-in-out min-w-0 z-0 text-ink">
          
          <div 
            id="pitch-wrapper"
            className="flex-1 w-full relative flex flex-col items-center justify-center lg:px-6 p-2 lg:p-4 min-h-0 min-w-0 mb-2 sm:mb-0"
          >
            {/* The Pitch Rendering */}
            <div 
              ref={pitchRef}
              style={{ 
                aspectRatio: orientation === 'horizontal' ? '1.54' : '0.65',
                backgroundColor: sport === 'basketball' ? '#d0885c' : sport === 'volleyball' ? '#4a90e2' : undefined
              }}
              className={`relative shadow-[0_30px_90px_-20px_rgba(0,0,0,0.5)] overflow-hidden border-[4px] border-white/95 rounded-sm transition-all duration-500 ease-in-out max-w-full max-h-full ${
                sport === 'football' ? 'bg-pitch' : ''
              } ${
                orientation === 'horizontal' ? 'w-full max-w-[1300px]' : 'h-full max-h-[850px] aspect-[68/105]'
              } ${
                activeTool === 'link' ? 'ring-8 ring-accent/30 ring-inset cursor-crosshair' : ''
              }`}
            >
              {/* Pitch Markings */}
              {sport === 'football' ? (
                <FootballMarkings orientation={orientation} />
              ) : sport === 'basketball' ? (
                <BasketballMarkings orientation={orientation} />
              ) : (
                <VolleyballMarkings orientation={orientation} />
              )}

              {/* Interaction Layers */}
              {renderMotionPaths()}
              {renderTacticalLinks()}
              {renderTokens()}
            </div>
          </div>
        </main>
      </div>

      {/* Film Strip - Relocated to Footer position */}
      <div className={`w-full bg-white dark:bg-panel border-t border-line shadow-[0_-4px_12px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-300 shrink-0 z-50 ${isFilmStripOpen ? 'h-32 lg:h-36' : 'h-10'}`}>
        <div 
          className="h-10 px-4 flex items-center justify-between border-b border-line cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          onClick={() => setIsFilmStripOpen(!isFilmStripOpen)}
        >
          <div className="flex items-center gap-2 lg:gap-4 truncate">
            <div className="flex items-center gap-2 shrink-0">
              <Layout size={14} className="text-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest text-ink">SAHNELER</span>
            </div>
            
            <div key="active-scene-badge" className="flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-lg border border-accent/20 shadow-sm max-w-[200px] lg:max-w-[400px] group transition-all hover:bg-accent/15">
              <div className="relative flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-accent animate-ping absolute opacity-40" />
                <div className="w-2 h-2 rounded-full bg-accent relative" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[7px] font-black text-accent uppercase tracking-widest leading-none mb-0.5">AKTİF</span>
                <span className="text-[10px] font-black text-ink truncate italic opacity-90 leading-none">{activeSceneIndex + 1}. {scenes[activeSceneIndex].name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsSaveModalOpen(true); }}
                className="h-6.5 px-2.5 bg-emerald-500 text-white rounded-md text-[8.5px] font-black uppercase flex items-center gap-1 hover:bg-emerald-600 transition-all active:scale-95 shadow-sm border border-emerald-600/20"
              >
                <Save size={11} />
                <span>KAYDET</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); addScene(); }}
                className="h-6.5 px-2.5 bg-accent text-white rounded-md text-[8.5px] font-black uppercase flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-sm border border-accent/20 group"
              >
                <Plus size={11} className="group-hover:rotate-90 transition-transform duration-300" />
                <span>YENİ SAHNE</span>
              </button>
              <div className="h-4 w-px bg-line" />
              <ChevronDown size={14} className={`text-muted transition-transform duration-300 cursor-pointer hover:text-ink ${isFilmStripOpen ? '' : 'rotate-180'}`} />
          </div>
        </div>
        
        {isFilmStripOpen && (
          <div className="p-2 lg:p-3 overflow-x-auto flex gap-3 custom-scrollbar h-[calc(100%-40px)] items-start bg-black/5 dark:bg-black/20">
            {scenes.map((scene, i) => (
              <div 
                key={`filmstrip-${i}`}
                onClick={() => setActiveSceneIndex(i)}
                className={`flex-shrink-0 w-28 lg:w-32 h-full rounded border transition-all cursor-pointer flex flex-col relative overflow-hidden group shadow-sm ${
                  activeSceneIndex === i 
                    ? 'border-accent ring-1 ring-accent bg-accent/5' 
                    : 'border-line hover:border-accent/50 bg-white dark:bg-panel'
                }`}
              >
                {scenes.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteScene(i); }}
                    className="absolute top-1.5 right-1.5 z-10 w-6 h-6 bg-red-500/80 hover:bg-red-600 backdrop-blur-md text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg border border-white/20 active:scale-90"
                    title="Sahneyi Sil"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                )}
                <div className={`flex-1 relative overflow-hidden bg-gradient-to-br from-emerald-800 to-emerald-950 ${sport === 'basketball' ? 'from-[#c0784c] to-[#a0582c]' : sport === 'volleyball' ? 'from-[#3a80d2] to-[#1a60b2]' : ''} rounded-sm shadow-inner`}>
                    {/* Pitch Markings for Mini-Map */}
                    <div className="absolute inset-x-0.5 inset-y-0.5 border-[0.5px] border-white/20" />
                    <div className="absolute top-1/2 left-0.5 right-0.5 h-[0.5px] bg-white/20" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-[0.5px] border-white/20" />
                    
                    {/* Goal areas for football mini-map */}
                    {sport === 'football' && (
                      <>
                        <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-8 h-2.5 border-x border-b border-white/20" />
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-2.5 border-x border-t border-white/20" />
                      </>
                    )}

                    {(Object.entries(scene.positions) as [string, Point][]).map(([id, pos]) => (
                      <div 
                        key={`mini-${id}`}
                        className={`absolute w-1.5 h-1.5 rounded-full ring-[0.5px] ring-white/40 transition-all duration-300 ${
                          id.startsWith('H') 
                            ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]' 
                            : id === 'ball' 
                              ? 'bg-yellow-300 scale-125 z-10 shadow-[0_0_4px_rgba(253,224,71,0.8)]' 
                              : 'bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.6)]'
                        }`}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                      />
                    ))}
                </div>
                <div className="bg-panel-strong border-t border-line px-2 py-1 text-center truncate">
                  <span className="text-[8px] lg:text-[9px] font-bold text-ink uppercase tracking-tight">{i + 1}. {scene.name}</span>
                </div>
              </div>
            ))}
            <button 
              onClick={addScene}
              className="flex-shrink-0 w-12 h-full rounded border border-dashed border-line hover:border-accent hover:bg-accent/5 transition-all flex items-center justify-center text-muted hover:text-accent bg-white dark:bg-panel"
              title="Yeni Sahne Ekle"
            >
              <Plus size={20} />
            </button>
          </div>
        )}
      </div>




      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      `}</style>

      {/* Save Tactic Modal */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSaveModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white dark:bg-panel rounded-xl shadow-2xl border border-line p-6 space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black italic tracking-tighter text-ink uppercase">TAKTİĞİ KAYDET</h2>
                <button 
                  onClick={() => setIsSaveModalOpen(false)}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-muted transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted">Taktik Adı</label>
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Örn: 4-3-3 Ofansif Köşe"
                    value={setName}
                    onChange={e => setSetName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveSet()}
                    className={`w-full h-12 bg-panel-strong/20 dark:bg-panel-strong border rounded-lg px-4 text-sm font-bold text-ink outline-none transition-all ${
                      saveStatus === 'success' ? 'border-green-500 ring-2 ring-green-500/20' : 'border-line focus:border-accent focus:ring-2 focus:ring-accent/20'
                    }`}
                  />
                </div>

                <div className="p-4 bg-accent/5 rounded-lg border border-accent/10 space-y-2">
                  <div className="flex items-center gap-2 text-accent">
                    <Save size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Ön İzleme</span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed font-medium">
                    Bu işlem mevcut sahnelerin tamamını ({scenes.length} sahne), takımların renklerini ve seçili branşı ({sport === 'football' ? 'Futbol' : sport === 'basketball' ? 'Basketbol' : 'Voleybol'}) kaydedecektir.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsSaveModalOpen(false)}
                  className="flex-1 h-11 rounded-lg border border-line text-[11px] font-black uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-all text-ink"
                >
                  Vazgeç
                </button>
                <button 
                  onClick={saveSet}
                  disabled={!setName.trim() || saveStatus === 'success'}
                  className={`flex-[2] h-11 rounded-lg text-[11px] font-black uppercase flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
                     saveStatus === 'success' 
                      ? 'bg-green-500 text-white shadow-green-500/20' 
                      : 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600'
                  }`}
                >
                  {saveStatus === 'success' ? <Check size={16} /> : <Save size={16} />}
                  {saveStatus === 'success' ? 'KAYDEDİLDİ' : 'ŞİMDİ KAYDET'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
