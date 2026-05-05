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
  '5-4-1': [1, 5, 4, 1],
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
    const horizontalShift = -5; // Move left to achieve perfect visual center
    if (count === 1) return [50 + horizontalShift];
    // For pairs (usually strikers or DMs), keep them more central
    if (count === 2) return [42 + horizontalShift, 58 + horizontalShift];
    const min = 15; 
    const max = 85;
    return Array.from({ length: count }, (_, i) => (min + ((max - min) * i) / (count - 1)) + horizontalShift);
  };

  const getTeamRows = (team: 'home' | 'away', rowCount: number) => {
    if (team === 'home') {
      // Home team (Red) at Bottom - High Y values (Attacking Up)
      if (rowCount === 1) return [91];
      if (rowCount === 5) return [91, 82, 65, 45, 25]; // GK, Def, DM, AM, Fwd
      const positions = [91, 82, 60, 30]; // GK at 91, Def at 82, Mid at 60, Fwd at 30
      return positions.slice(0, rowCount);
    } else {
      // Away team (Blue) at Top - Low Y values (Attacking Down)
      if (rowCount === 1) return [3]; 
      if (rowCount === 5) return [3, 18, 35, 55, 75];
      const positions = [3, 18, 40, 70]; // GK at 3, Def at 18, Mid at 40, Fwd at 70
      return positions.slice(0, rowCount);
    }
  };

const generateTeamPositions = (team: 'home' | 'away', count: number, sport: Sport = 'football', customRowShape?: number[]) => {
  if (sport === 'volleyball') {
    const ids = Array.from({ length: 6 }, (_, i) => `${team === 'home' ? 'H' : 'A'}${i + 1}`);
    const positions: Positions = {};
    
    // Standard Volleyball Rotation:
    // Front Row (Near Net): 4 (Left), 3 (Middle), 2 (Right)
    // Back Row: 5 (Left), 6 (Middle), 1 (Right)
    
    // Coordinates mapping for Home (Bottom)
    const homeCoords = [
      { x: 80, y: 85 }, // H1: Right Back
      { x: 80, y: 65 }, // H2: Right Front
      { x: 50, y: 65 }, // H3: Middle Front
      { x: 20, y: 65 }, // H4: Left Front
      { x: 20, y: 85 }, // H5: Left Back
      { x: 50, y: 85 }, // H6: Middle Back
    ];

    // Coordinates mapping for Away (Top) - Mirrored
    const awayCoords = [
      { x: 20, y: 15 }, // A1: Right Back (from mirror view)
      { x: 20, y: 35 }, // A2: Right Front
      { x: 50, y: 35 }, // A3: Middle Front
      { x: 80, y: 35 }, // A4: Left Front
      { x: 80, y: 15 }, // A5: Left Back
      { x: 50, y: 15 }, // A6: Middle Back
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
    const xPositions = [50, 25, 75, 20, 80];
    const yHome = [88, 75, 75, 62, 62];
    const yAway = [12, 25, 25, 38, 38];

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
    return Object.fromEntries(Object.entries(pos).map(([id, p]) => [id, { x: 100 - p.y, y: p.x }]));
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(false);
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
              ? { x: pt.y, y: 100 - pt.x } 
              : { x: 100 - pt.y, y: pt.x }
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
      ? Object.fromEntries(Object.entries(teamPos).map(([id, p]) => [id, { x: p.y, y: p.x }]))
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
    setTimeout(() => setSaveStatus('idle'), 2000);
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

  const deleteSet = (id: string) => {
    if (!id) {
      console.warn("Delete set called without ID");
      return;
    }
    
    if (!window.confirm("Bu taktik setini silmek istediğinize emin misiniz?")) return;
    
    setSavedSets(prev => {
      const updated = prev.filter(s => s.id !== id);
      // Explicitly update localStorage just in case useEffect is delayed or missed
      localStorage.setItem('tactical-board-sets', JSON.stringify(updated));
      return updated;
    });
    
    if (selectedSetId === id) {
      setSelectedSetId("");
      setSetName("");
    }
    alert("Taktik seti başarıyla silindi.");
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
      <header className="h-14 lg:h-16 bg-panel border-b border-line px-4 lg:px-6 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-2 lg:gap-4 overflow-hidden">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-black/5 rounded-lg transition-colors text-muted"
            title={sidebarOpen ? "Paneli Kapat" : "Paneli Aç"}
          >
            <Settings2 size={18} />
          </button>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
              <svg viewBox="0 0 24 24" className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="6" cy="6" r="1" />
                <circle cx="18" cy="18" r="1" />
                <circle cx="18" cy="6" r="1" />
                <circle cx="6" cy="18" r="1" />
                <path d="M6 12h12M12 6v12" className="opacity-40" />
              </svg>
            </div>
            <div className="overflow-hidden">
              <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-accent-2 mb-[-2px]">
                Tactical Intelligence
              </p>
              <h1 className="text-lg lg:text-2xl font-black tracking-tighter truncate uppercase italic leading-none">
                Set Pieces
              </h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <button 
            onClick={handleReset}
            className="h-8 w-8 lg:w-auto lg:px-3 bg-panel-strong dark:bg-panel-strong text-ink border border-line rounded flex items-center justify-center lg:gap-2 text-xs font-black uppercase hover:bg-red-500 hover:text-white dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-all shadow-sm"
            title="Tahtayı Sıfırla"
          >
            <RotateCcw size={14} /> <span className="hidden lg:inline">Sıfırla</span>
          </button>
          
          <button 
            onClick={playSequence}
            className={`h-8 px-3 lg:px-6 rounded font-bold text-xs flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
              isPlaying ? 'bg-orange-600 text-white' : 'bg-accent text-white'
            }`}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
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
          
          <div className="p-4 border-b border-line">
            <h3 className="font-black text-[11px] uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
              <Trophy size={12} /> Spor Branşı
            </h3>
            <div className="flex gap-2 p-1 bg-panel-strong dark:bg-panel-strong rounded-lg border border-line">
              <button 
                onClick={() => changeSport('football')}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded transition-all ${
                  sport === 'football' ? 'bg-accent text-white shadow-md' : 'text-ink/60 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="text-sm">⚽</div>
                <span className="text-[9px] font-black uppercase">Futbol</span>
              </button>
              <button 
                onClick={() => changeSport('basketball')}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded transition-all ${
                  sport === 'basketball' ? 'bg-accent text-white shadow-md' : 'text-ink/60 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="text-sm">🏀</div>
                <span className="text-[9px] font-black uppercase">Basketbol</span>
              </button>
              <button 
                onClick={() => changeSport('volleyball')}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded transition-all ${
                  sport === 'volleyball' ? 'bg-accent text-white shadow-md' : 'text-ink/60 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="text-sm">🏐</div>
                <span className="text-[9px] font-black uppercase">Voleybol</span>
              </button>
            </div>
          </div>

          {/* Section: View Settings */}
          <div className="p-4 border-b border-line">
            <h3 className="font-black text-[11px] uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
              <Layout size={12} /> Görünüm
            </h3>
            
            <div className="grid grid-cols-2 gap-2 p-1 bg-panel-strong dark:bg-panel-strong rounded-lg border border-line">
              {['vertical', 'horizontal'].map(o => (
                <button
                  key={o}
                  onClick={() => orientation !== o && toggleOrientation()}
                  className={`px-2 py-1.5 rounded text-[10px] font-black uppercase transition-all ${
                    orientation === o ? 'bg-accent text-white shadow-md' : 'text-ink/60 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {o === 'vertical' ? 'DİKEY' : 'YATAY'}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setIsDark(!isDark)}
              className="w-full mt-3 h-8 bg-panel-strong dark:bg-panel-strong text-ink border border-line rounded text-[11px] font-black uppercase flex items-center justify-center gap-2 hover:bg-accent hover:text-white transition-all"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
              {isDark ? 'Aydınlık Mod' : 'Karanlık Mod'}
            </button>
          </div>

          {/* Section: Set Management */}
          <div className="p-4 border-b border-line">
            <h3 className="font-black text-[11px] uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
              <Save size={12} /> TAKTİK KAYITLARI
            </h3>
            
            {savedSets.length > 0 && (
              <div className="mb-3">
                <select 
                  value={selectedSetId}
                  onChange={e => e.target.value && loadSet(e.target.value)}
                  className="w-full bg-panel-strong dark:bg-panel-strong text-ink border border-line rounded h-9 px-2 text-xs font-bold outline-none transition-colors mb-2"
                >
                  <option value="" disabled className="dark:bg-panel-strong">-- Kayıtlı Taktikler ({savedSets.length}) --</option>
                  {savedSets.map(set => (
                    <option key={set.id} value={set.id} className="dark:bg-panel-strong">{set.name}</option>
                  ))}
                </select>
                <button 
                  onClick={() => deleteSet(selectedSetId)}
                  disabled={!selectedSetId}
                  className={`w-full h-8 text-[10px] uppercase font-black rounded transition-colors border ${
                    selectedSetId 
                      ? 'bg-red-500 text-white hover:bg-red-600 border-red-500 shadow-sm shadow-red-500/20' 
                      : 'text-muted bg-panel-strong dark:bg-panel-strong border-line opacity-50 cursor-not-allowed'
                  }`}
                >
                  Seçili Seti Sil
                </button>
              </div>
            )}

            <div className="space-y-2">
              <input 
                type="text"
                placeholder="Set Adı..."
                value={setName}
                onChange={e => setSetName(e.target.value)}
                className={`w-full h-9 bg-panel-strong/40 dark:bg-panel-strong border rounded px-3 text-xs font-bold text-ink outline-none transition-colors ${
                  saveStatus === 'success' ? 'border-green-500' : 'border-line focus:border-accent'
                }`}
              />
              <button 
                onClick={saveSet}
                className={`w-full h-9 rounded text-[11px] font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg ${
                   saveStatus === 'success' 
                    ? 'bg-green-500 text-white shadow-green-500/20' 
                    : 'bg-accent text-white shadow-accent/20 hover:opacity-90'
                }`}
              >
                {saveStatus === 'success' ? <Check size={14} /> : <Save size={14} />}
                {saveStatus === 'success' ? 'KAYDEDİLDİ' : 'Yeni Kayıt Oluştur'}
              </button>
            </div>
          </div>

          {/* Section: Players */}
          <div className="p-4 border-b border-line">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-[11px] uppercase tracking-widest text-muted flex items-center gap-2">
                <Users size={12} /> Takım Yapısı
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase">Ev Sahibi</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min={0} max={sport === 'basketball' ? 5 : sport === 'volleyball' ? 6 : 11} 
                    value={playerCounts.home} 
                    onChange={e => handlePlayerCountChange('home', parseInt(e.target.value))}
                    className="w-full h-9 bg-panel-strong/40 dark:bg-panel-strong border border-line rounded px-2 text-xs font-bold text-center outline-none transition-colors text-ink focus:border-accent"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase">Rakip</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min={0} max={sport === 'basketball' ? 5 : sport === 'volleyball' ? 6 : 11} 
                    value={playerCounts.away} 
                    onChange={e => handlePlayerCountChange('away', parseInt(e.target.value))}
                    className="w-full h-9 bg-panel-strong/40 dark:bg-panel-strong border border-line rounded px-2 text-xs font-bold text-center outline-none transition-colors text-ink focus:border-accent"
                  />
                </div>
              </div>

              {sport === 'volleyball' && (
                <div className="col-span-2 mt-2 space-y-2">
                  <div className="p-2 bg-accent/5 rounded border border-accent/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-400 border border-black/10 flex items-center justify-center text-[8px] font-black">L</div>
                      <span className="text-[10px] font-bold text-ink/70">Ev Sahibi Libero</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        disabled={playerCounts.home === 0}
                        checked={scenes[activeSceneIndex].specialPlayers?.includes(`H${playerCounts.home}`) || false}
                        onChange={() => toggleSpecialPlayer(`H${playerCounts.home}`)}
                      />
                      <div className="w-7 h-4 bg-panel-strong rounded-full peer peer-focus:ring-2 peer-focus:ring-accent/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-accent ring-1 ring-inset ring-black/5"></div>
                    </label>
                  </div>
                  <div className="p-2 bg-accent/5 rounded border border-accent/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-400 border border-black/10 flex items-center justify-center text-[8px] font-black">L</div>
                      <span className="text-[10px] font-bold text-ink/70">Deplasman Libero</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        disabled={playerCounts.away === 0}
                        checked={scenes[activeSceneIndex].specialPlayers?.includes(`A${playerCounts.away}`) || false}
                        onChange={() => toggleSpecialPlayer(`A${playerCounts.away}`)}
                      />
                      <div className="w-7 h-4 bg-panel-strong rounded-full peer peer-focus:ring-2 peer-focus:ring-accent/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-accent ring-1 ring-inset ring-black/5"></div>
                    </label>
                  </div>
                </div>
              )}

              {sport === 'football' && (
                <div className="col-span-2 mt-2 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted uppercase tracking-wider">Ev Sahibi Formasyon</label>
                    <div className="grid grid-cols-4 gap-1">
                      {Object.keys(FOOTBALL_FORMATIONS).map(f => (
                        <button 
                          key={f}
                          onClick={() => applyFormation('home', f)}
                          className="py-1 px-1.5 bg-panel-strong dark:bg-panel-strong border border-line rounded text-[9px] font-bold hover:bg-accent hover:text-white hover:border-accent transition-all text-ink/70"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted uppercase tracking-wider">Rakip Formasyon</label>
                    <div className="grid grid-cols-4 gap-1">
                      {Object.keys(FOOTBALL_FORMATIONS).map(f => (
                        <button 
                          key={f}
                          onClick={() => applyFormation('away', f)}
                          className="py-1 px-1.5 bg-panel-strong dark:bg-panel-strong border border-line rounded text-[9px] font-bold hover:bg-accent hover:text-white hover:border-accent transition-all text-ink/70"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase">Ev Renk</label>
                <input 
                  type="color" 
                  value={colors.homePrimary} 
                  onChange={e => setColors(prev => ({ ...prev, homePrimary: e.target.value }))}
                  className="w-full h-9 rounded border border-line cursor-pointer bg-panel-strong/40 dark:bg-panel-strong p-1 text-ink"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase">Rakip Renk</label>
                <input 
                  type="color" 
                  value={colors.awayPrimary} 
                  onChange={e => setColors(prev => ({ ...prev, awayPrimary: e.target.value }))}
                  className="w-full h-9 rounded border border-line cursor-pointer bg-panel-strong/40 dark:bg-panel-strong p-1 text-ink"
                />
              </div>
            </div>
          </div>

          {/* Section: Scenes */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-[11px] uppercase tracking-widest text-muted flex items-center gap-2">
                <Layers size={12} /> Sahneler
              </h3>
              <button 
                onClick={() => addScene()}
                className="h-5 px-2 bg-panel-strong dark:bg-panel-strong text-ink border border-line rounded text-[9px] font-black uppercase flex items-center gap-1 hover:bg-accent hover:text-white transition-all shadow-sm"
              >
                <Plus size={10} /> Yeni
              </button>
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

        </aside>

        {/* Board Area */}
        <main className="flex-1 p-2 sm:p-4 lg:px-8 lg:py-6 flex flex-col gap-3 lg:gap-4 items-center justify-center relative select-none overflow-hidden transition-all duration-500 ease-in-out min-w-0 z-0 text-ink">
          
          <div className="w-full max-w-[1400px] flex items-center justify-between transition-all duration-500 gap-3 shrink-0">
            <div className="h-10 lg:h-11 bg-white dark:bg-panel px-3 lg:px-4 rounded border border-line shadow-sm flex items-center gap-3">
                <div className="flex flex-col justify-center">
                  <p className="text-[8px] lg:text-[9px] font-black text-accent uppercase tracking-[0.15em] leading-none mb-0.5">SEÇİLİ SAHNE</p>
                  <div className="flex items-center gap-1.5 lg:gap-2">
                    <strong className="text-[10px] lg:text-[11px] font-black tracking-tight truncate text-ink">{activeSceneIndex + 1}. {scenes[activeSceneIndex].name}</strong>
                  </div>
                </div>
                
                <div className="h-5 w-px bg-line/60"></div>
                
                <div className="flex items-center gap-4 lg:gap-6">
                  <label className="text-[9px] lg:text-[10px] font-black uppercase text-muted cursor-pointer flex items-center gap-2 hover:text-accent transition-colors">
                    <input 
                      type="checkbox" 
                      checked={showPaths}
                      onChange={e => setShowPaths(e.target.checked)}
                      className="w-3.5 h-3.5 accent-accent rounded"
                    />
                    Top Rotası
                  </label>
                  
                  <div className="flex items-center gap-2 lg:gap-3 bg-panel-strong/10 dark:bg-panel-strong/30 px-2 lg:px-3 py-0.5 rounded-full border border-line">
                    <Activity size={10} className="text-accent" />
                    <input 
                      type="range" 
                      min={0.25} max={2.0} step={0.25}
                      value={tempo}
                      onChange={e => setTempo(parseFloat(e.target.value))}
                      className="w-16 lg:w-24 accent-accent h-1 bg-line rounded-full appearance-none cursor-pointer"
                    />
                    <span className="text-[9px] lg:text-[10px] font-black text-ink w-5 text-right">{tempo}x</span>
                  </div>
                </div>
             </div>

             {/* Mode Selection Tools Banner */}
             <div className="h-10 lg:h-11 bg-white dark:bg-panel p-1 rounded border border-line shadow-sm flex items-center gap-0.5 lg:gap-1">
                <button 
                  onClick={() => { setActiveTool('move'); setLinkingPlayerId(null); }}
                  className={`h-full px-3 lg:px-5 rounded-sm flex items-center gap-2 font-black uppercase text-[9px] lg:text-[10px] transition-all ${
                    activeTool === 'move' ? 'bg-accent text-white shadow-sm' : 'text-ink/60 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <MousePointer2 size={13} /> Seç / Sürükle
                </button>
                <div className="w-px h-4 bg-line/60 mx-1" />
                <button 
                  onClick={() => setActiveTool('link')}
                  className={`h-full px-3 lg:px-5 rounded-sm flex items-center gap-2 font-black uppercase text-[9px] lg:text-[10px] transition-all ${
                    activeTool === 'link' ? 'bg-accent text-white shadow-sm' : 'text-ink/60 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Link2 size={13} /> Bağla
                </button>
             </div>
          </div>

          <div 
            id="pitch-wrapper"
            className="flex-1 w-full relative flex flex-col items-center justify-center lg:px-6 p-2 lg:p-4 min-h-0 min-w-0 mb-2 sm:mb-0"
          >
            {/* The Pitch Rendering */}
            <div 
              ref={pitchRef}
              style={{ 
                aspectRatio: orientation === 'horizontal' ? '1.7/1' : '2/3',
                backgroundColor: sport === 'basketball' ? '#d0885c' : sport === 'volleyball' ? '#4a90e2' : undefined
              }}
              className={`relative shadow-[0_30px_90px_rgba(0,0,0,0.4)] overflow-hidden border-[4px] border-white/95 rounded transition-all duration-500 ease-in-out max-w-full max-h-full ${
                sport === 'football' ? 'bg-pitch' : ''
              } ${
                orientation === 'horizontal' ? 'w-full max-w-[1400px] h-auto' : 'h-full w-auto flex-shrink-0'
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
          <div className="flex items-center gap-2">
            <Layout size={14} className="text-accent" />
            <span className="text-[10px] font-black uppercase tracking-widest text-ink">SAHNELER</span>
          </div>
          <div className="flex items-center gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); addScene(); }}
                className="h-6 px-3 bg-accent text-white rounded text-[9px] font-black uppercase flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-sm"
              >
                <Plus size={12} /> YENİ SAHNE
              </button>
              <ChevronDown size={14} className={`text-muted transition-transform duration-300 ${isFilmStripOpen ? '' : 'rotate-180'}`} />
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
    </div>
  );
}
