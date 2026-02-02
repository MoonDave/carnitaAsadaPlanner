import { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Users, Plus, Trash2, ShoppingCart, Check, 
  Utensils, CalendarDays, ChevronDown, 
  ChevronUp, Headphones, Send, Loader2, Sparkles, X, 
  Search, MessageSquare, Gamepad2
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, onSnapshot 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAwS-0RlGe0N3lAueYxXp7QA9PaDOiE0z8",
  authDomain: "carnitaasadasuperbowl.firebaseapp.com",
  projectId: "carnitaasadasuperbowl",
  storageBucket: "carnitaasadasuperbowl.firebasestorage.app",
  messagingSenderId: "563557637348",
  appId: "1:563557637348:web:c2ee3ad9cd0dcd2f8c20f1",
  measurementId: "G-PLE7ED0RKF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const App = () => {
  // --- ESTADOS ---
  const [people, setPeople] = useState(10);
  const [activeTab, setActiveTab] = useState('calculator');
  const [newItem, setNewItem] = useState({ name: '', amount: '', unit: 'kg' });
  const [inviteCopied, setInviteCopied] = useState(false);
  
  const [user, setUser] = useState<any>(null);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const isRemoteUpdate = useRef(false);

  const [fans, setFans] = useState<{ id: number, name: string, team: string }[]>([]);
  const [showFanModal, setShowFanModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [fanName, setFanName] = useState('');

  const [showCoach, setShowCoach] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'model', text: '¡Hola! Soy tu Coach de Parrilla con IA. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [schedule, setSchedule] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- MINI JUEGO ---
  const [gamePhase, setGamePhase] = useState<'start' | 'power' | 'accuracy' | 'running' | 'kicking' | 'result'>('start');
  const [power, setPower] = useState(0);
  const [accuracy, setAccuracy] = useState(50);
  const [gameScore, setGameScore] = useState({ made: 0, attempts: 0 });
  const gameLoopRef = useRef<number | null>(null);
  const directionRef = useRef(1);

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

  const startGame = () => {
    setGamePhase('power');
    setPower(0);
    setAccuracy(50);
    directionRef.current = 1;
  };

  const stopPower = () => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    setGamePhase('accuracy');
    directionRef.current = 1;
  };

  const startKickSequence = () => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    setGamePhase('running');
    setTimeout(() => {
        setGamePhase('kicking');
        const scored = power > 60 && (accuracy > 40 && accuracy < 60);
        setTimeout(() => {
          setGamePhase('result');
          setGameScore(prev => ({
            made: prev.made + (scored ? 1 : 0),
            attempts: prev.attempts + 1
          }));
        }, 800);
    }, 600);
  };

  useEffect(() => {
    if (gamePhase === 'power' || gamePhase === 'accuracy') {
      const loop = () => {
        const speed = gamePhase === 'power' ? 2 : 3;
        const setFn = gamePhase === 'power' ? setPower : setAccuracy;
        
        setFn(prev => {
          let next = prev + (speed * directionRef.current);
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

  useEffect(() => {
    const targetDate = new Date('2026-02-08T17:30:00');
    const interval = setInterval(() => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const params = new URLSearchParams(window.location.search);
    let currentPartyId = params.get('party') || localStorage.getItem('last_party_id');

    if (!currentPartyId) {
      currentPartyId = Math.random().toString(36).substring(2, 7).toUpperCase();
      setDoc(doc(db, 'parties', currentPartyId), {
        people,
        ingredients: initialIngredients,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    }
    
    setPartyId(currentPartyId);
    localStorage.setItem('last_party_id', currentPartyId);
    window.history.replaceState({}, '', `${window.location.pathname}?party=${currentPartyId}`);

    const partyRef = doc(db, 'parties', currentPartyId);
    const unsubscribeSnapshot = onSnapshot(partyRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        isRemoteUpdate.current = true;
        setPeople(data.people);
        setIngredients(data.ingredients);
        if (data.schedule) setSchedule(data.schedule);
        if (data.fans) setFans(data.fans); 
        setTimeout(() => { isRemoteUpdate.current = false; }, 100);
      }
    });

    return () => unsubscribeSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const saveToDb = async (id: string, p: number, ing: any[], sch: string | null = null, fn: any[] = []) => {
    if (!user || !id) return;
    try {
      await setDoc(doc(db, 'parties', id), {
        people: p,
        ingredients: ing,
        schedule: sch,
        fans: fn,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) { console.error(err); }
  };

  const updatePeople = (newVal: number) => {
    const val = Math.max(1, newVal);
    setPeople(val);
    if (!isRemoteUpdate.current && partyId) saveToDb(partyId, val, ingredients, schedule, fans);
  };

  const updateIngredients = (newIngredients: any[]) => {
    setIngredients(newIngredients);
    if (!isRemoteUpdate.current && partyId) saveToDb(partyId, people, newIngredients, schedule, fans);
  };

  const copyInvite = () => {
    const msg = `🏈 *SUPER ASADA* 🏈\nCódigo: ${partyId}\nLink: ${window.location.href}`;
    navigator.clipboard.writeText(msg);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatMessage('');
    setTimeout(() => {
        setChatHistory(prev => [...prev, { role: 'model', text: "¡Oído cocina! El Coach está procesando tu jugada." }]);
    }, 1000);
  };

  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [chatHistory, showCoach]);

  return (
    <div className="min-h-screen w-full bg-slate-900 text-white font-sans pb-20 overflow-x-hidden">
      
      {/* GAME CLOCK */}
      <div className="bg-black border-b border-slate-800 py-2 flex justify-center items-center gap-4 sticky top-0 z-30 shadow-lg">
          <div className="text-red-600 font-mono font-bold text-xs tracking-widest animate-pulse">GAME CLOCK</div>
          <div className="flex gap-2 font-mono font-bold text-xl text-red-500 tabular-nums">
              <span>{String(timeLeft.days).padStart(2, '0')}d</span>
              <span>:</span>
              <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
              <span>:</span>
              <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
          </div>
          <div className="text-red-600 font-mono font-bold text-xs tracking-widest">TO KICKOFF</div>
      </div>

      <header className="bg-gradient-to-b from-slate-800 to-slate-900 border-b-4 border-yellow-500 shadow-xl relative z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <Trophy size={24} className="text-yellow-400" />
                <h1 className="text-xl font-black italic uppercase">Super Asada</h1>
            </div>
            
            <div className="flex gap-2">
                <button onClick={() => setActiveTab('game')} className="px-3 py-2 rounded bg-orange-600 text-xs font-bold uppercase"><Gamepad2 size={14} className="inline mr-1"/> Jugar</button>
                <button onClick={copyInvite} className="px-3 py-2 rounded bg-green-600 text-xs font-bold uppercase"><MessageSquare size={14} className="inline mr-1"/> {inviteCopied ? 'Copiado' : 'Invitar'}</button>
                <button onClick={() => setShowJoinModal(true)} className="px-3 py-2 rounded bg-slate-800 text-xs font-bold uppercase"><Search size={14} className="inline mr-1"/> Unirse</button>
                <button onClick={() => setActiveTab(activeTab === 'calculator' ? 'list' : 'calculator')} className="px-3 py-2 rounded bg-yellow-500 text-slate-900 text-xs font-bold uppercase">{activeTab === 'calculator' ? 'Ver Lista' : 'Calculadora'}</button>
            </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {activeTab === 'game' && (
          <div className="flex flex-col items-center">
             <div className="bg-slate-800 rounded-2xl border-2 border-yellow-500 p-6 w-full max-w-md h-[500px] relative overflow-hidden flex flex-col justify-between">
                <div className="text-center z-10">
                    <h2 className="text-xl font-black uppercase italic">Kicker Challenge</h2>
                    <div className="text-xs font-mono text-yellow-500">SCORE: {gameScore.made} / {gameScore.attempts}</div>
                </div>

                <div className="flex-1 relative flex justify-center items-end">
                    <div className="absolute top-10 w-40 h-24 border-x-4 border-yellow-400"></div>
                    <div 
                        className="text-4xl absolute transition-all duration-700"
                        style={{
                            bottom: gamePhase === 'result' ? '80%' : '10%',
                            left: gamePhase === 'result' ? `${accuracy}%` : '50%',
                            transform: 'translateX(-50%)'
                        }}
                    >🏈</div>
                </div>

                <div className="bg-black/40 p-4 rounded-xl space-y-4">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 transition-all duration-75" style={{width: `${power}%`}}></div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full relative">
                        <div className="absolute top-0 bottom-0 w-2 bg-white" style={{left: `${accuracy}%`}}></div>
                    </div>
                    {gamePhase === 'start' && <button onClick={startGame} className="w-full py-2 bg-green-600 font-bold uppercase">Iniciar</button>}
                    {gamePhase === 'power' && <button onClick={stopPower} className="w-full py-2 bg-red-600 font-bold uppercase">Potencia</button>}
                    {gamePhase === 'accuracy' && <button onClick={startKickSequence} className="w-full py-2 bg-blue-600 font-bold uppercase">Patear</button>}
                    {gamePhase === 'result' && <button onClick={startGame} className="w-full py-2 bg-slate-600 font-bold uppercase">Reiniciar</button>}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'calculator' && (
            <div className="space-y-6">
                <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center">
                    <p className="text-blue-400 text-xs font-black uppercase tracking-widest mb-4">Invitados</p>
                    <div className="flex justify-center items-center gap-6">
                        <button onClick={() => updatePeople(people - 1)} className="p-4 bg-slate-700 rounded">-</button>
                        <span className="text-6xl font-black text-yellow-500 font-mono">{people}</span>
                        <button onClick={() => updatePeople(people + 1)} className="p-4 bg-slate-700 rounded">+</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ingredients.map(item => (
                        <div key={item.id} className="bg-slate-800 p-4 rounded-lg flex justify-between items-center border border-slate-700">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">{item.category}</p>
                                <h3 className="font-bold">{item.name}</h3>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black">{(item.baseAmount * people).toFixed(1)}</span>
                                <span className="text-xs ml-1 text-slate-500 uppercase">{item.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'list' && (
            <div className="bg-white text-black p-6 rounded shadow-lg font-mono">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">LISTA DE COMPRAS</h2>
                {ingredients.map(i => (
                    <div key={i.id} className="flex justify-between py-1 border-b border-slate-100 italic">
                        <span>{i.name}</span>
                        <span className="font-bold">{(i.baseAmount * people).toFixed(1)} {i.unit}</span>
                    </div>
                ))}
                {schedule && (
                    <div className="mt-6 p-4 bg-slate-100 rounded">
                        <h4 className="font-bold mb-2">CRONOGRAMA IA:</h4>
                        <p className="text-xs">{schedule}</p>
                    </div>
                )}
            </div>
        )}
      </main>

      {/* Coach Chat */}
      {showCoach && (
        <div className="fixed bottom-24 right-6 w-80 h-96 bg-slate-800 border border-slate-600 rounded-2xl flex flex-col shadow-2xl z-50">
            <div className="p-3 bg-slate-900 rounded-t-2xl font-bold text-sm border-b border-slate-700">Coach Gemini</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
                {chatHistory.map((m, i) => (
                    <div key={i} className={`${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <span className={`inline-block p-2 rounded-lg ${m.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>{m.text}</span>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-2 bg-slate-900 flex gap-2">
                <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} className="flex-1 bg-slate-800 rounded-full px-3 text-xs outline-none" placeholder="Pregunta al coach..."/>
                <button type="submit" className="p-2 bg-blue-600 rounded-full"><Send size={14}/></button>
            </form>
        </div>
      )}

      <button onClick={() => setShowCoach(!showCoach)} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center z-50">
        {showCoach ? <X /> : <Headphones />}
      </button>

      {/* Modal Join */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
           <div className="bg-slate-800 p-6 rounded-xl w-full max-w-sm border border-slate-600">
              <h3 className="text-xl font-bold uppercase italic mb-4">Unirse a Juego</h3>
              <input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} className="w-full p-4 bg-black border-2 border-slate-600 rounded-lg text-center text-2xl font-mono mb-4" placeholder="CÓDIGO"/>
              <button onClick={() => window.location.search = `?party=${manualCode}`} className="w-full bg-blue-600 py-3 rounded font-bold uppercase">Entrar</button>
              <button onClick={() => setShowJoinModal(false)} className="w-full py-2 text-slate-500 text-xs mt-2 text-center">Cerrar</button>
           </div>
        </div>
      )}

      {/* Modal Fans */}
      {showFanModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
           <div className="bg-slate-800 p-6 rounded-xl w-full max-w-sm border border-slate-600">
              <h3 className="text-xl font-bold uppercase mb-4">Apoyar a {selectedTeam}</h3>
              <div className="space-y-4">
                <input type="text" value={fanName} onChange={(e) => setFanName(e.target.value)} className="w-full p-3 bg-black border border-slate-600 rounded" placeholder="Tu Nombre" autoFocus/>
                <button 
                    onClick={() => {
                        const newFans = [...fans, { id: Date.now(), name: fanName, team: selectedTeam }];
                        setFans(newFans);
                        if(partyId) saveToDb(partyId, people, ingredients, schedule, newFans);
                        setFanName('');
                        setShowFanModal(false);
                    }} 
                    className="w-full bg-blue-600 py-3 rounded font-bold uppercase"
                >Confirmar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;