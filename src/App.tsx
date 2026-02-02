import { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Users, Plus, Trash2, ShoppingCart, Copy, Check, 
  ChefHat, Utensils, Edit2, CalendarDays, Medal, ChevronDown, 
  ChevronUp, Headphones, Send, Loader2, Sparkles, X, Link as LinkIcon, 
  Share2, Ticket, Search, MessageSquare, AlertCircle, DollarSign, Clock, Play, Shield, UserPlus, Gamepad2
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, onSnapshot 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';

// --- TUS LLAVES DE FIREBASE REALES ---
const firebaseConfig = {
  apiKey: "AIzaSyAwS-0RlGe0N3lAueYxXp7QA9PaDOiE0z8",
  authDomain: "carnitaasadasuperbowl.firebaseapp.com",
  projectId: "carnitaasadasuperbowl",
  storageBucket: "carnitaasadasuperbowl.firebasestorage.app",
  messagingSenderId: "563557637348",
  appId: "1:563557637348:web:c2ee3ad9cd0dcd2f8c20f1",
  measurementId: "G-PLE7ED0RKF"
};

// Inicialización directa
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const GEMINI_API_KEY = ""; 

const App = () => {
  // --- ESTADOS ---
  const [people, setPeople] = useState(10);
  const [activeTab, setActiveTab] = useState('calculator');
  const [newItem, setNewItem] = useState({ name: '', amount: '', unit: 'kg' });
  const [isAdding, setIsAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  
  // Estados de Sync
  const [user, setUser] = useState(null);
  const [partyId, setPartyId] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const isRemoteUpdate = useRef(false);

  // Estados de Fans
  const [fans, setFans] = useState<{ id: number, name: string, team: string }[]>([]);
  const [showFanModal, setShowFanModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [fanName, setFanName] = useState('');

  // Estados IA
  const [showCoach, setShowCoach] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'model', text: '¡Hola! Soy tu Coach de Parrilla con IA. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const chatEndRef = useRef(null);

  // --- ESTADOS DEL MINI JUEGO ---
  const [gamePhase, setGamePhase] = useState<'start' | 'power' | 'accuracy' | 'running' | 'kicking' | 'result'>('start');
  const [power, setPower] = useState(0);
  const [accuracy, setAccuracy] = useState(50);
  const [kickResult, setKickResult] = useState<'miss' | 'score' | null>(null);
  const [gameScore, setGameScore] = useState({ made: 0, attempts: 0 });
  const gameLoopRef = useRef<number | null>(null);
  const directionRef = useRef(1);

  // --- ESTADO DEL CONTADOR (GAME CLOCK) ---
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const initialIngredients = [
    { id: 1, name: 'Arrachera / Ribeye', baseAmount: 0.400, unit: 'kg', category: 'Offense' },
    { id: 2, name: 'Chorizo / Chistorra', baseAmount: 0.100, unit: 'kg', category: 'Offense' },
    { id: 3, name: 'Tortillas de Maíz', baseAmount: 0.250, unit: 'kg', category: 'Defense' },
    { id: 4, name: 'Queso Fundido', baseAmount: 0.150, unit: 'kg', category: 'Defense' },
    { id: 5, name: 'Aguacate (Guacamole)', baseAmount: 0.150, unit: 'kg', category: 'Special Teams' },
    { id: 6, name: 'Cebollitas Cambray', baseAmount: 0.2, unit: 'manojos', category: 'Special Teams' },
    { id: 7, name: 'Salsas', baseAmount: 0.100, unit: 'lt', category: 'Special Teams' },
    { id: 8, name: 'Limones', baseAmount: 0.100, unit: 'kg', category: 'Special Teams' },
    { id: 9, name: 'Carbón', baseAmount: 0.300, unit: 'bolsa(s)', category: 'Equipment' },
    { id: 10, name: 'Cervezas / Bebidas', baseAmount: 4, unit: 'pzas', category: 'Hydration' },
  ];

  const [ingredients, setIngredients] = useState(initialIngredients);

  // --- LÓGICA DEL JUEGO ---
  const startGame = () => {
    setGamePhase('power');
    setPower(0);
    setAccuracy(50);
    setKickResult(null);
    directionRef.current = 1;
  };

  const stopPower = () => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    setGamePhase('accuracy');
    directionRef.current = 1;
  };

  const startKickSequence = () => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    setGamePhase('running'); // El jugador corre hacia el balón
    
    setTimeout(() => {
        setGamePhase('kicking'); // El jugador patea
        calculateResult();
    }, 600); // Tiempo de carrera
  };

  const calculateResult = () => {
    // Calcular resultado
    const isPowerGood = power > 60;
    const isAccuracyGood = accuracy > 40 && accuracy < 60;
    const scored = isPowerGood && isAccuracyGood;

    setTimeout(() => {
      setKickResult(scored ? 'score' : 'miss');
      setGamePhase('result');
      setGameScore(prev => ({
        made: prev.made + (scored ? 1 : 0),
        attempts: prev.attempts + 1
      }));
    }, 800); // Tiempo de vuelo del balón
  };

  // Game Loop
  useEffect(() => {
    if (gamePhase === 'power') {
      const loop = () => {
        setPower(prev => {
          let next = prev + (2 * directionRef.current);
          if (next >= 100) { next = 100; directionRef.current = -1; }
          if (next <= 0) { next = 0; directionRef.current = 1; }
          return next;
        });
        gameLoopRef.current = requestAnimationFrame(loop);
      };
      gameLoopRef.current = requestAnimationFrame(loop);
    } 
    else if (gamePhase === 'accuracy') {
      const loop = () => {
        setAccuracy(prev => {
          let next = prev + (3 * directionRef.current); // Más rápido = más difícil
          if (next >= 100) { next = 100; directionRef.current = -1; }
          if (next <= 0) { next = 0; directionRef.current = 1; }
          return next;
        });
        gameLoopRef.current = requestAnimationFrame(loop);
      };
      gameLoopRef.current = requestAnimationFrame(loop);
    }
    return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [gamePhase]);

  // --- EFECTO DEL CONTADOR ---
  useEffect(() => {
    const targetDate = new Date('2026-02-08T17:30:00');
    const interval = setInterval(() => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- AUTH ---
  useEffect(() => {
    if(!auth) return;
    const initAuth = async () => {
        try { await signInAnonymously(auth); } catch(e) { console.error(e); }
    };
    initAuth();
    // @ts-ignore
    const unsubscribe = onAuthStateChanged(auth, (u: any) => setUser(u));
    return () => unsubscribe();
  }, []);

  // --- SYNC LOGIC ---
  useEffect(() => {
    if (!user || !db) return;
    const params = new URLSearchParams(window.location.search);
    let currentPartyId = params.get('party') || localStorage.getItem('last_party_id');

    if (!currentPartyId) {
      currentPartyId = generateGameCode();
      saveToDb(currentPartyId, people, initialIngredients, null, []);
    }
    
    setPartyId(currentPartyId);
    localStorage.setItem('last_party_id', currentPartyId!);

    try {
        const newUrl = `${window.location.pathname}?party=${currentPartyId}`;
        window.history.replaceState({}, '', newUrl);
    } catch(e) {}

    const partyRef = doc(db, 'parties', currentPartyId!);
    
    const unsubscribeSnapshot = onSnapshot(partyRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        isRemoteUpdate.current = true;
        if(data.people) setPeople(data.people);
        if(data.ingredients) setIngredients(data.ingredients);
        if (data.schedule) setSchedule(data.schedule);
        if (data.fans) setFans(data.fans); 
        
        setTimeout(() => { isRemoteUpdate.current = false; }, 100);
      } else {
        saveToDb(currentPartyId, people, initialIngredients, null, []);
      }
    }, (error) => {
        console.error("Error de conexión (offline mode):", error);
    });

    return () => unsubscribeSnapshot();
  }, [user]);

  const generateGameCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const saveToDb = async (id: any, currentPeople: any, currentIngredients: any, currentSchedule: any = null, currentFans: any = null) => {
    if (!user || !id) return;
    setIsSyncing(true);
    try {
      const partyRef = doc(db, 'parties', id);
      const dataToSave: any = {
        people: currentPeople,
        ingredients: currentIngredients,
        lastUpdated: new Date().toISOString()
      };
      if (currentSchedule) dataToSave.schedule = currentSchedule;
      if (currentFans) dataToSave.fans = currentFans; 
      else if (fans.length > 0) dataToSave.fans = fans; 

      await setDoc(partyRef, dataToSave, { merge: true });
    } catch (err) { console.error(err); }
    finally { setIsSyncing(false); }
  };

  // --- HANDLERS ---
  const updatePeople = (newVal: any) => {
    const val = Math.max(1, newVal);
    setPeople(val);
    if (!isRemoteUpdate.current && partyId) saveToDb(partyId, val, ingredients, schedule, fans);
  };

  const updateIngredients = (newIngredients: any) => {
    setIngredients(newIngredients);
    if (!isRemoteUpdate.current && partyId) saveToDb(partyId, people, newIngredients, schedule, fans);
  };

  const handleAddItem = (e: any) => {
    e.preventDefault();
    if (!newItem.name || !newItem.amount) return;
    const item = { id: Date.now(), name: newItem.name, baseAmount: parseFloat(newItem.amount), unit: newItem.unit, category: 'Rookie' };
    updateIngredients([...ingredients, item]);
    setNewItem({ name: '', amount: '', unit: 'kg' });
    setIsAdding(false);
  };

  const handleUpdateAmount = (id: any, newAmount: any) => {
    updateIngredients(ingredients.map(item => item.id === id ? { ...item, baseAmount: newAmount } : item));
  };

  const handleDeleteItem = (id: any) => {
    updateIngredients(ingredients.filter(item => item.id !== id));
  };

  // --- MANEJO DE FANS ---
  const openFanModal = (team: string) => {
    setSelectedTeam(team);
    setShowFanModal(true);
  };

  const handleAddFan = (e: any) => {
    e.preventDefault();
    if (!fanName.trim()) return;
    const newFan = { id: Date.now(), name: fanName.trim(), team: selectedTeam };
    const newFansList = [...fans, newFan];
    setFans(newFansList);
    if (!isRemoteUpdate.current && partyId) saveToDb(partyId, people, ingredients, schedule, newFansList);
    setFanName('');
    setShowFanModal(false);
  };

  const removeFan = (fanId: number) => {
    const newFansList = fans.filter(f => f.id !== fanId);
    setFans(newFansList);
    if (!isRemoteUpdate.current && partyId) saveToDb(partyId, people, ingredients, schedule, newFansList);
  }

  // --- COMPARTIR WHATSAPP ---
  const copyInvite = () => {
    const baseUrl = window.location.href.split('?')[0]; 
    let message = `🏈 *SUPER ASADA LIX* 🏈\n\nFaltan ${timeLeft.days} días.\nLista para: ${people} personas\n🔑 CÓDIGO: ${partyId}\n\n`;
    ingredients.forEach(item => {
      const amount = parseFloat(item.baseAmount as any) || 0;
      const total = (amount * people).toFixed(2);
      message += `• ${item.name}: ${parseFloat(total)} ${item.unit}\n`;
    });
    message += `\nEntra aquí: ${baseUrl}`;
    const textArea = document.createElement("textarea");
    textArea.value = message;
    document.body.appendChild(textArea);
    textArea.select();
    try { document.execCommand('copy'); } catch (err) { console.error('Error', err); }
    document.body.removeChild(textArea);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const copyTextList = () => {
    const baseUrl = window.location.href.split('?')[0];
    const link = `${baseUrl}?party=${partyId}`;
    let textList = `🏈 GAME DAY PLAN\nLINK: ${link}\nCODE: ${partyId}\n\n`;
    ingredients.forEach(item => {
      const amount = parseFloat(item.baseAmount as any) || 0;
      const total = (amount * people).toFixed(2);
      textList += `• ${item.name}: ${parseFloat(total)} ${item.unit}\n`;
    });
    const textArea = document.createElement("textarea");
    textArea.value = textList;
    document.body.appendChild(textArea);
    textArea.select();
    try { document.execCommand('copy'); } catch (err) { console.error('Error', err); }
    document.body.removeChild(textArea);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- GEMINI ---
  const callGemini = async (prompt: string) => {
    if (!GEMINI_API_KEY) return "Configura tu API Key de Gemini.";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error.";
    } catch (error) { return "Error."; }
  };

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatMessage('');
    setIsAiLoading(true);
    const context = `Coach parrilla. ${people} personas. Ingredientes: ${ingredients.map(i => i.name).join(', ')}.`;
    const response = await callGemini(`${context}\n\nUsuario: ${userMsg}`);
    setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    setIsAiLoading(false);
  };

  const generateGameDaySchedule = async () => {
    setIsGeneratingSchedule(true);
    const response = await callGemini(`Itinerario carne asada. ${people} personas. 3:00 PM. Ingredientes: ${ingredients.map(i => i.name).join(', ')}.`);
    setSchedule(response);
    if (partyId) saveToDb(partyId, people, ingredients, response, fans);
    setIsGeneratingSchedule(false);
  };

  const joinParty = async (e: any) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setPartyId(manualCode.toUpperCase());
    localStorage.setItem('last_party_id', manualCode.toUpperCase());
    setManualCode('');
    setShowJoinModal(false);
    window.location.reload(); 
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, showCoach]);

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white font-sans selection:bg-blue-600 selection:text-white pb-20 overflow-x-hidden">
      
      {/* GAME CLOCK */}
      <div className="bg-black border-b border-slate-800 py-2 flex justify-center items-center gap-4 sticky top-0 z-30 shadow-lg">
          <div className="text-red-600 font-mono font-bold text-xs tracking-widest animate-pulse">GAME CLOCK</div>
          <div className="flex gap-2 font-mono font-bold text-xl text-red-500 tabular-nums items-baseline">
              <div className="flex flex-col items-center leading-none">
                  <span>{timeLeft.days < 10 ? `0${timeLeft.days}` : timeLeft.days}</span>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wide">Days</span>
              </div>
              <span className="text-slate-600 -translate-y-2">:</span>
              <div className="flex flex-col items-center leading-none">
                  <span>{timeLeft.hours < 10 ? `0${timeLeft.hours}` : timeLeft.hours}</span>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wide">Hrs</span>
              </div>
              <span className="text-slate-600 -translate-y-2">:</span>
              <div className="flex flex-col items-center leading-none">
                  <span>{timeLeft.minutes < 10 ? `0${timeLeft.minutes}` : timeLeft.minutes}</span>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wide">Min</span>
              </div>
          </div>
          <div className="text-red-600 font-mono font-bold text-xs tracking-widest">TO KICKOFF</div>
      </div>

      {/* Header */}
      <header className="bg-gradient-to-b from-slate-800 to-slate-900 border-b-4 border-yellow-500 shadow-xl relative z-20">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-center justify-between w-full md:w-auto">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-700 p-2 rounded-lg border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                        <Trophy size={24} className="text-yellow-400" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase leading-none">
                        Super Asada
                        </h1>
                        <div className="flex items-center gap-2">
                           <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Manager Mode</p>
                           {isSyncing && <Loader2 size={10} className="animate-spin text-yellow-500"/>}
                        </div>
                    </div>
                </div>
                <button onClick={() => setShowCoach(true)} className="md:hidden bg-blue-600 p-2 rounded text-white border border-blue-400">
                    <Headphones size={20} />
                </button>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <button onClick={() => setActiveTab('game')} className={`flex items-center gap-2 px-3 py-2 rounded font-bold uppercase tracking-wider text-xs transition-all border whitespace-nowrap shadow-lg ${activeTab === 'game' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300'}`}>
                  <Gamepad2 size={14} /> Jugar
                </button>
                <button onClick={copyInvite} className={`flex items-center gap-2 px-3 py-2 rounded font-bold uppercase tracking-wider text-xs transition-all border whitespace-nowrap shadow-lg ${inviteCopied ? 'bg-green-600 border-green-500 text-white' : 'bg-green-600 border-green-500 text-white hover:bg-green-500'}`}>
                  {inviteCopied ? <Check size={14} /> : <MessageSquare size={14} />}
                  {inviteCopied ? '¡Listo!' : 'Invitar'}
                </button>
                <button onClick={() => setShowJoinModal(true)} className="flex items-center gap-2 px-3 py-2 rounded font-bold uppercase tracking-wider text-xs transition-all border bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 whitespace-nowrap">
                  <Search size={14} /> Join
                </button>
                <button onClick={() => setActiveTab(activeTab === 'calculator' ? 'list' : 'calculator')} className={`px-4 py-2 rounded font-bold uppercase tracking-wider text-xs transition-all border-2 flex items-center gap-2 whitespace-nowrap ml-auto md:ml-0 ${activeTab === 'calculator' ? 'bg-transparent border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-slate-900' : 'bg-yellow-500 border-yellow-500 text-slate-900 hover:bg-yellow-400'}`}>
                {activeTab === 'calculator' ? <ShoppingCart size={14} /> : <Utensils size={14} />}
                <span>{activeTab === 'calculator' ? 'Lista' : 'Calc'}</span>
                </button>
            </div>
          </div>
        </div>
      </header>

      {/* Matchup Display & Fans */}
      {activeTab !== 'game' && (
      <div className="w-full bg-slate-900 border-b border-slate-800 py-6">
         <div className="max-w-2xl mx-auto px-4">
             {/* Equipos */}
             <div className="flex items-center justify-between gap-4 md:gap-12 relative mb-6">
                {/* Team 1: Patriots */}
                <div className="flex flex-col items-center gap-3 flex-1">
                    <div className="w-24 h-24 rounded-full bg-[#002244] border-4 border-[#C60C30] shadow-[0_0_20px_rgba(198,12,48,0.6)] flex items-center justify-center relative overflow-hidden transform hover:scale-110 transition-transform">
                        <img src="https://placehold.co/80x80/002244/FFFFFF?text=NE" alt="Patriots" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm font-black text-[#C60C30] uppercase tracking-widest text-center">Patriots</span>
                    <button onClick={() => openFanModal('Patriots')} className="bg-[#C60C30] hover:bg-red-700 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full flex items-center gap-1 transition-colors"><UserPlus size={12} /> Unirme</button>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-4xl font-black text-white italic tracking-tighter">VS</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Super Bowl</span>
                </div>

                {/* Team 2: Seahawks */}
                <div className="flex flex-col items-center gap-3 flex-1">
                    <div className="w-24 h-24 rounded-full bg-[#002244] border-4 border-[#69BE28] shadow-[0_0_20px_rgba(105,190,40,0.6)] flex items-center justify-center relative overflow-hidden transform hover:scale-110 transition-transform">
                        <img src="https://placehold.co/80x80/002244/69BE28?text=SEA" alt="Seahawks" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm font-black text-[#69BE28] uppercase tracking-widest text-center">Seahawks</span>
                    <button onClick={() => openFanModal('Seahawks')} className="bg-[#69BE28] hover:bg-green-600 text-[#002244] text-[10px] font-bold uppercase px-3 py-1 rounded-full flex items-center gap-1 transition-colors"><UserPlus size={12} /> Unirme</button>
                </div>
             </div>

             {/* Listas de Fans */}
             <div className="flex justify-between gap-4 text-sm">
                 <div className="flex-1 bg-[#002244]/50 rounded-lg p-3 border border-[#C60C30]/30 min-h-[80px]">
                     <h4 className="text-[#C60C30] font-bold text-xs uppercase mb-2 flex justify-between">Patriots Army <span>{fans.filter(f => f.team === 'Patriots').length}</span></h4>
                     <ul className="space-y-1">
                         {fans.filter(f => f.team === 'Patriots').map(fan => (
                             <li key={fan.id} className="text-white text-xs flex justify-between group">{fan.name}<button onClick={() => removeFan(fan.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400"><X size={10}/></button></li>
                         ))}
                         {fans.filter(f => f.team === 'Patriots').length === 0 && <li className="text-slate-500 text-[10px] italic">Sin fans aún...</li>}
                     </ul>
                 </div>
                 <div className="flex-1 bg-[#002244]/50 rounded-lg p-3 border border-[#69BE28]/30 min-h-[80px]">
                     <h4 className="text-[#69BE28] font-bold text-xs uppercase mb-2 flex justify-between">Seahawks Legion <span>{fans.filter(f => f.team === 'Seahawks').length}</span></h4>
                     <ul className="space-y-1">
                         {fans.filter(f => f.team === 'Seahawks').map(fan => (
                             <li key={fan.id} className="text-white text-xs flex justify-between group">{fan.name}<button onClick={() => removeFan(fan.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400"><X size={10}/></button></li>
                         ))}
                         {fans.filter(f => f.team === 'Seahawks').length === 0 && <li className="text-slate-500 text-[10px] italic">Sin fans aún...</li>}
                     </ul>
                 </div>
             </div>
         </div>
      </div>
      )}

      <main className="max-w-5xl mx-auto p-4 md:p-6 relative">
        
        {/* GAME TAB */}
        {activeTab === 'game' && (
          <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center">
             <div className="bg-slate-800 rounded-2xl shadow-2xl border border-yellow-500 p-6 w-full max-w-md text-center relative overflow-hidden h-[500px]">
                {/* Background Field */}
                <div className="absolute inset-0 bg-green-900" style={{backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 49px, #ffffff20 50px)'}}>
                    <div className="absolute inset-x-0 top-10 h-1 bg-white/20"></div> {/* Goal Line */}
                </div>
                
                {kickResult === 'score' && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 animate-in zoom-in">
                     <div className="text-center">
                        <div className="text-6xl mb-2 animate-bounce">🏈🙌</div>
                        <h2 className="text-4xl font-black text-yellow-400 italic uppercase">TOUCHDOWN!</h2>
                        <p className="text-white font-bold mt-2">¡3 PUNTOS!</p>
                        <button onClick={startGame} className="mt-6 bg-blue-600 px-6 py-2 rounded-full font-bold uppercase hover:bg-blue-500 transition-colors">Patear de nuevo</button>
                     </div>
                  </div>
                )}

                {kickResult === 'miss' && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 animate-in zoom-in">
                     <div className="text-center">
                        <div className="text-6xl mb-2">❌</div>
                        <h2 className="text-4xl font-black text-red-500 italic uppercase">FALLASTE</h2>
                        <p className="text-slate-300 mt-2">Practica más, novato.</p>
                        <button onClick={startGame} className="mt-6 bg-slate-700 px-6 py-2 rounded-full font-bold uppercase hover:bg-slate-600 transition-colors">Intentar de nuevo</button>
                     </div>
                  </div>
                )}

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase mb-1 drop-shadow-md">Kicker Challenge</h2>
                    <div className="text-xs text-yellow-500 font-bold tracking-widest bg-black/50 inline-block px-3 py-1 rounded">SCORE: {gameScore.made} / {gameScore.attempts}</div>
                  </div>

                  {/* Goal Posts & Game Area */}
                  <div className="flex-1 w-full flex justify-center items-end relative overflow-hidden">
                      
                      {/* Goal Posts */}
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-32 border-x-4 border-b-0 border-yellow-400 z-0">
                          <div className="absolute bottom-0 w-4 h-32 bg-yellow-400 left-1/2 -translate-x-1/2 translate-y-1/2"></div>
                      </div>

                      {/* Ball */}
                      <div 
                        className="absolute text-3xl z-20 transition-all duration-[800ms] ease-out"
                        style={{
                          bottom: (gamePhase === 'kicking' || gamePhase === 'result') ? '80%' : '15%',
                          left: (gamePhase === 'kicking' || gamePhase === 'result') 
                                ? `${50 + (accuracy - 50) * 1.5}%`  // Dirección final
                                : '50%', // Posición inicial
                          transform: `translate(-50%, 0) scale(${(gamePhase === 'kicking' || gamePhase === 'result') ? 0.5 : 1}) rotate(${(gamePhase === 'kicking' || gamePhase === 'result') ? 720 : 0}deg)`
                        }}
                      >
                        🏈
                      </div>

                      {/* Player (Monito Animado) */}
                      <div 
                        className={`absolute z-30 transition-all duration-[600ms] ease-in-out`}
                        style={{
                            bottom: '10%',
                            left: '50%',
                            transform: `translateX(-150%) ${gamePhase === 'running' || gamePhase === 'kicking' ? 'translateX(70px)' : ''}`
                        }}
                      >
                          <div className={`relative ${gamePhase === 'running' ? 'animate-bounce' : ''}`}>
                              {/* Cabeza */}
                              <div className="w-5 h-5 bg-yellow-200 rounded-full border-2 border-black relative z-10">
                                  <div className="w-4 h-2 bg-blue-800 rounded-t-full absolute -top-1 left-0.5"></div> {/* Casco */}
                              </div>
                              {/* Cuerpo */}
                              <div className="w-6 h-7 bg-blue-700 rounded-sm border-2 border-black -mt-1 relative z-0 flex justify-center">
                                  <span className="text-[8px] text-white font-bold mt-1">10</span>
                              </div>
                              {/* Piernas */}
                              <div className="flex gap-1 justify-center -mt-1">
                                  <div className={`w-2 h-4 bg-white border border-black ${gamePhase === 'kicking' ? '-rotate-45 -translate-y-2' : ''} transition-transform`}></div>
                                  <div className="w-2 h-4 bg-white border border-black"></div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* UI Controls */}
                  <div className="bg-black/60 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                      {/* Power Bar */}
                      <div className="mb-2">
                          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-300 mb-1">
                              <span>Fuerza</span>
                              <span>{Math.round(power)}%</span>
                          </div>
                          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                              <div className={`h-full transition-all duration-75 ${power > 80 ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${power}%`}}></div>
                          </div>
                      </div>

                      {/* Accuracy Bar */}
                      <div className="mb-4">
                          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-300 mb-1">
                              <span>Puntería</span>
                              <span>{gamePhase === 'accuracy' ? '...' : (Math.abs(accuracy - 50) < 10 ? 'Bien' : 'Mal')}</span>
                          </div>
                          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-600 relative">
                              <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-yellow-400 -translate-x-1/2 z-10"></div>
                              {/* Indicador Móvil */}
                              <div className="absolute top-0 bottom-0 w-2 bg-white rounded-full transition-all duration-75 shadow-[0_0_10px_white]" style={{left: `${accuracy}%`, transform: 'translateX(-50%)'}}></div>
                          </div>
                      </div>

                      {/* Buttons */}
                      {gamePhase === 'start' && <button onClick={startGame} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-black uppercase rounded shadow-lg text-sm animate-pulse">INICIAR JUEGO</button>}
                      {gamePhase === 'power' && <button onClick={stopPower} className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase rounded shadow-lg text-sm">FIJAR POTENCIA</button>}
                      {gamePhase === 'accuracy' && <button onClick={startKickSequence} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase rounded shadow-lg text-sm">¡PATEAR!</button>}
                      {(gamePhase === 'running' || gamePhase === 'kicking' || gamePhase === 'result') && <button disabled className="w-full py-3 bg-slate-700 text-slate-400 font-bold uppercase rounded text-sm cursor-not-allowed">...</button>}
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* Scoreboard Counter */}
        {activeTab === 'calculator' && (
        <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden mb-8 border border-slate-700 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600"></div>
          <div className="p-6 md:p-8 flex flex-col items-center">
            <label className="text-blue-400 text-xs font-black tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
              <Users size={14} /> Team Size / Fans
            </label>
            
            <div className="flex items-center gap-6 md:gap-10">
              <button onClick={() => updatePeople(people - 1)} className="w-14 h-14 md:w-16 md:h-16 rounded bg-slate-700 hover:bg-red-600 border-b-4 border-slate-900 hover:border-red-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center group">
                <ChevronDown size={32} className="text-slate-400 group-hover:text-white" />
              </button>
              
              <div className="relative">
                <div className="bg-black px-4 py-4 rounded border-2 border-slate-700 shadow-inner min-w-[120px] max-w-[200px] flex justify-center">
                    <input 
                      type="number" 
                      min="1"
                      value={people}
                      onChange={(e) => updatePeople(parseInt(e.target.value) || 0)}
                      className="w-full text-center text-6xl md:text-7xl font-black text-yellow-500 outline-none bg-transparent font-mono tracking-tighter"
                    />
                </div>
                <div className="text-center mt-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
                    CODE: <span className="text-yellow-500 font-mono">{partyId}</span>
                </div>
              </div>

              <button onClick={() => updatePeople(people + 1)} className="w-14 h-14 md:w-16 md:h-16 rounded bg-slate-700 hover:bg-green-600 border-b-4 border-slate-900 hover:border-green-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center group">
                <ChevronUp size={32} className="text-slate-400 group-hover:text-white" />
              </button>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'calculator' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {ingredients.map((item) => (
                  <div key={item.id} className="bg-slate-800 rounded-lg p-0 flex shadow-lg hover:shadow-blue-900/20 transition-all border border-slate-700 overflow-hidden group">
                    <div className={`w-2 ${item.category === 'Offense' ? 'bg-red-500' : item.category === 'Defense' ? 'bg-blue-500' : item.category === 'Hydration' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                    <div className="flex-1 p-4 flex justify-between items-center relative overflow-hidden">
                      <div className="z-10 flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-700 text-slate-300">
                            {item.category}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg md:text-xl text-white leading-tight mb-2">{item.name}</h3>
                        <div className="flex items-center gap-2 bg-slate-900/50 w-fit px-2 py-1 rounded border border-slate-700">
                          <span className="text-xs text-slate-400 font-semibold uppercase">Avg:</span>
                          <input type="number" step="0.05" min="0" value={item.baseAmount} onChange={(e) => handleUpdateAmount(item.id, e.target.value)} className="w-16 bg-transparent text-center text-sm font-mono text-yellow-500 outline-none border-b border-slate-600 focus:border-yellow-500"/>
                          <span className="text-xs text-slate-500 uppercase">{item.unit}</span>
                        </div>
                      </div>
                      <div className="z-10 flex flex-col items-end gap-3">
                        <div className="text-right">
                          <span className="block text-3xl font-black text-white tracking-tighter">{(parseFloat(item.baseAmount as any) * people).toFixed(2)}</span>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.unit}</span>
                        </div>
                        <button onClick={() => handleDeleteItem(item.id)} className="text-slate-600 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
              ))}
            </div>

            <div className="mt-8 border-t border-slate-800 pt-8">
              {!isAdding ? (
                <button onClick={() => setIsAdding(true)} className="w-full py-5 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 font-bold uppercase tracking-widest hover:border-blue-500 hover:text-blue-400 hover:bg-slate-800/50 transition-all flex items-center justify-center gap-3 group">
                  <div className="bg-slate-800 p-1 rounded group-hover:bg-blue-500/20 transition-colors"><Plus size={24} /></div> Recruit New Player
                </button>
              ) : (
                <form onSubmit={handleAddItem} className="bg-slate-800 p-6 rounded-xl border border-blue-500/30 shadow-2xl animate-in fade-in zoom-in-95">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div><label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Name</label><input type="text" placeholder="Ej. Alitas" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 rounded text-white focus:border-blue-500 outline-none"/></div>
                    <div><label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Avg</label><input type="number" step="0.01" value={newItem.amount} onChange={(e) => setNewItem({...newItem, amount: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 rounded text-white focus:border-blue-500 outline-none"/></div>
                    <div><label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Unit</label><select value={newItem.unit} onChange={(e) => setNewItem({...newItem, unit: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-700 rounded text-white focus:border-blue-500 outline-none"><option value="kg">kg</option><option value="pzas">pzas</option><option value="lt">lt</option></select></div>
                  </div>
                  <div className="flex justify-end gap-3"><button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 text-slate-400">Cancel</button><button type="submit" disabled={!newItem.name || !newItem.amount} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold uppercase text-sm tracking-wider disabled:opacity-50">Sign Player</button></div>
                </form>
              )}
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          /* Vista de Resumen */
          <div className="bg-white text-slate-900 rounded-sm shadow-2xl overflow-hidden relative animate-in fade-in slide-in-from-right-8">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-slate-800 rounded-b-lg shadow-lg z-10 flex justify-center items-center"><div className="w-24 h-2 bg-slate-600 rounded-full"></div></div>
            <div className="p-8 pt-12 bg-slate-100 border-b border-slate-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div><h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Official Game Plan</h2><div className="flex items-center gap-2 text-slate-600 font-bold mt-1"><CalendarDays size={18} /><span>{people} Fans Attending</span></div></div>
              <button onClick={copyTextList} className="flex items-center gap-2 px-6 py-3 rounded font-black uppercase tracking-wider bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg">{copied ? <Check size={20} /> : <Copy size={20} />} {copied ? 'COPIED!' : 'COPY ROSTER'}</button>
            </div>
            <div className="bg-white p-2">
                <div className="w-full" style={{backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '100% 2rem'}}>
                    {ingredients.map((item, index) => (
                        <div key={index} className="flex justify-between items-center px-6 h-8 hover:bg-yellow-50">
                        <div className="flex items-center gap-4"><span className="font-mono text-slate-400 w-6 text-right font-bold">{index + 1}.</span><span className="font-bold text-slate-800 uppercase tracking-tight">{item.name}</span></div>
                        <div className="font-mono font-bold text-blue-700">{parseFloat(((parseFloat(item.baseAmount as any) || 0) * people).toFixed(2))} {item.unit}</div>
                        </div>
                    ))}
                </div>
            </div>
            {/* AI Section */}
            <div className="bg-slate-50 p-6 border-t border-slate-200">
               <h3 className="font-black text-slate-800 uppercase italic mb-4 flex items-center gap-2"><Sparkles className="text-yellow-500" /> AI Strategy (Gemini)</h3>
               {!schedule && !isGeneratingSchedule && (<button onClick={generateGameDaySchedule} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded shadow hover:shadow-lg transition-all flex justify-center items-center gap-2 uppercase tracking-wide"><Sparkles size={18} /> Generar Cronograma</button>)}
               {isGeneratingSchedule && (<div className="flex justify-center items-center p-4 gap-2 text-slate-500 font-bold animate-pulse"><Loader2 className="animate-spin" /> Analizando...</div>)}
               {schedule && (<div className="bg-white border-2 border-dashed border-blue-200 p-4 rounded mt-2 font-mono text-sm whitespace-pre-wrap text-slate-700">{typeof schedule === 'string' ? schedule : JSON.stringify(schedule)}</div>)}
            </div>
          </div>
        )}
      </main>

      <button onClick={() => setShowCoach(!showCoach)} className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-[0_4px_20px_rgba(37,99,235,0.6)] flex items-center justify-center border-4 border-slate-900 z-50 transition-all hover:scale-110 active:scale-95 group">
        {showCoach ? <X size={32} /> : <Headphones size={32} className="group-hover:animate-bounce" />}
      </button>

      {/* Modal Join */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
           <div className="bg-slate-800 border border-slate-600 p-6 rounded-xl w-full max-w-sm shadow-2xl relative">
              <button onClick={() => setShowJoinModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
              <div className="flex items-center gap-2 text-yellow-500 mb-4"><Ticket size={24} /><h3 className="text-xl font-bold uppercase italic">Unirse a Juego</h3></div>
              <p className="text-slate-300 text-sm mb-4">Ingresa el <strong>Game Code</strong>:</p>
              <form onSubmit={joinParty}>
                <input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} placeholder="Ej. A7X2B" className="w-full p-4 bg-black border-2 border-slate-600 rounded-lg text-center text-2xl font-mono text-white tracking-[0.5em] uppercase focus:border-blue-500 outline-none mb-4" maxLength={10}/>
                <button type="submit" disabled={!manualCode.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg uppercase tracking-wider disabled:opacity-50">Buscar Partido</button>
              </form>
           </div>
        </div>
      )}

      {/* Modal Add Fan */}
      {showFanModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
           <div className="bg-slate-800 border border-slate-600 p-6 rounded-xl w-full max-w-sm shadow-2xl relative">
              <button onClick={() => setShowFanModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
              <div className="flex flex-col items-center gap-2 mb-4">
                 <h3 className="text-xl font-bold uppercase italic text-white">Unirse al Equipo</h3>
                 <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${selectedTeam === 'Patriots' ? 'bg-[#C60C30] text-white' : 'bg-[#69BE28] text-[#002244]'}`}>{selectedTeam}</span>
              </div>
              <p className="text-slate-300 text-sm mb-4 text-center">¿Cuál es tu nombre, recluta?</p>
              <form onSubmit={handleAddFan}>
                <input type="text" value={fanName} onChange={(e) => setFanName(e.target.value)} placeholder="Ej. Tom Brady" className="w-full p-4 bg-black border-2 border-slate-600 rounded-lg text-center text-xl text-white focus:border-blue-500 outline-none mb-4" autoFocus/>
                <button type="submit" disabled={!fanName.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg uppercase tracking-wider disabled:opacity-50">Confirmar</button>
              </form>
           </div>
        </div>
      )}

      {/* Coach Modal */}
      {showCoach && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-slate-800 rounded-2xl shadow-2xl border border-slate-600 flex flex-col overflow-hidden z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
           <div className="bg-slate-900 p-4 border-b border-slate-700 flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-full"><Headphones size={20} /></div>
             <div><h3 className="font-bold text-white leading-none">Coach Gemini</h3><span className="text-xs text-green-400 font-mono flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>ONLINE</span></div>
           </div>
           <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-800/50">
             {chatHistory.map((msg, idx) => (
               <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>{msg.text}</div>
               </div>
             ))}
             {isAiLoading && <div className="text-slate-400 text-xs italic ml-4">El coach está pensando...</div>}
             <div ref={chatEndRef}></div>
           </div>
           <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2">
             <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Pregunta..." className="flex-1 bg-slate-800 border border-slate-600 text-white text-sm rounded-full px-4 focus:outline-none focus:border-blue-500 transition-colors"/>
             <button type="submit" disabled={!chatMessage.trim() || isAiLoading} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full disabled:opacity-50"><Send size={18} /></button>
           </form>
        </div>
      )}
    </div>
  );
};

export default App;