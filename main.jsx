import './index.css';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Car, 
  MessageSquare, 
  ShieldCheck, 
  TrendingUp, 
  ChevronRight, 
  ChevronLeft, 
  Zap, 
  Menu, 
  X, 
  Search, 
  Loader2, 
  Truck, 
  Info, 
  Send,
  CreditCard,
  Globe,
  AlertCircle
} from 'lucide-react';

/**
 * AUTOPRIME ELITE STOREFRONT v4.6.4
 * Production entry point for the AutoPrime Digital Showroom.
 * Features: Live DMS Sync (Google Sheets), Anti-Crop Showroom, 
 * Range Tag Extraction, and WhatsApp Lead Generation.
 */

// --- CONFIGURATION ---
const WHATSAPP_NUMBER = "2349122503132"; 
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT0qeDSTiJkeT9UkU0XvKaoSRpjT6wxCDNeRaiXonPBvpUUo176DlEIxk_qYBDF_2v5Qu4XLim5w3ia/pub?gid=0&single=true&output=csv"; 

// --- SUB-COMPONENT: VEHICLE CARD ---
const Card = ({ car, formatDisplayPrice, whatsappNumber }) => {
  const [currentImg, setCurrentImg] = useState(0);

  const generateWhatsAppLink = () => {
    const message = `Hi AutoPrime! I'm interested in the ${car.name}. Investment Value: ${formatDisplayPrice(car.basePrice)}. Please confirm availability and nationwide delivery logistics.`;
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  const handleCarFinanceRequest = (e) => {
    e.stopPropagation();
    const message = `Hi AutoPrime, I would like to discuss bespoke financing and structured payment plans for the ${car.name}.`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const nextImg = (e) => {
    e.stopPropagation();
    if (car.images && car.images.length > 0) {
      setCurrentImg((prev) => (prev + 1) % car.images.length);
    }
  };

  const prevImg = (e) => {
    e.stopPropagation();
    if (car.images && car.images.length > 0) {
      setCurrentImg((prev) => (prev - 1 + car.images.length) % car.images.length);
    }
  };

  return (
    <div className="bg-white rounded-[4rem] overflow-hidden shadow-2xl shadow-slate-200/40 flex flex-col group border border-white transition-all hover:shadow-blue-100/30">
      {/* Studio Showroom View (Anti-Crop) */}
      <div className="relative h-80 overflow-hidden bg-[#fcfcfc] flex items-center justify-center p-2">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        <div className="absolute inset-0 flex transition-transform duration-500" style={{ transform: `translateX(-${currentImg * 100}%)` }}>
          {car.images && car.images.length > 0 ? (
            car.images.map((img, i) => (
              <div key={i} className="w-full h-full flex-shrink-0 flex items-center justify-center p-4">
                 <img 
                  src={img} 
                  alt={`${car.name} viewing ${i + 1}`} 
                  className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-105" 
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800'; }}
                />
              </div>
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Car className="opacity-10 w-20 h-20 text-slate-400" />
            </div>
          )}
        </div>

        {/* Gallery Controls */}
        {car.images && car.images.length > 1 && (
          <>
            <button onClick={prevImg} className="absolute left-6 top-1/2 -translate-y-1/2 p-2.5 bg-white/80 border border-slate-100 rounded-full text-slate-900 shadow-xl z-10 hover:bg-white active:scale-90 transition opacity-0 group-hover:opacity-100">
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextImg} className="absolute right-6 top-1/2 -translate-y-1/2 p-2.5 bg-white/80 border border-slate-100 rounded-full text-slate-900 shadow-xl z-10 hover:bg-white active:scale-90 transition opacity-0 group-hover:opacity-100">
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {car.images.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentImg ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200'}`}></div>
              ))}
            </div>
          </>
        )}
        
        {/* Elite Badges */}
        <div className="absolute top-8 left-8 flex flex-col gap-2 z-10">
          <span className="px-5 py-2 rounded-full text-[10px] font-black uppercase shadow-sm bg-white border border-slate-100 text-slate-900 tracking-widest">{car.category}</span>
          <span className="bg-slate-900/95 text-white px-5 py-2 rounded-full text-[10px] font-black shadow-sm flex items-center gap-1.5 uppercase tracking-widest">
            {car.power.toLowerCase().includes('electric') && <Zap size={10} className="text-blue-400" />} {car.power}
          </span>
          {car.rangeTag && (
            <span className="bg-blue-600 text-white px-5 py-2 rounded-full text-[10px] font-black shadow-sm uppercase flex items-center gap-2 tracking-widest">
              <TrendingUp size={10}/> {car.rangeTag} Range
            </span>
          )}
        </div>

        {/* JUST ACQUIRED / SOLD Logic */}
        {car.status === 'Sold' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-20 select-none">
            <div className="bg-red-600 text-white px-12 py-6 font-black text-4xl border-[10px] border-white shadow-2xl uppercase -rotate-12 transform scale-110 tracking-tighter ring-4 ring-red-600/50">
              JUST ACQUIRED
            </div>
          </div>
        )}
      </div>

      <div className="p-10 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-8 min-h-[5rem]">
          <div>
            <h3 className="text-3xl font-black leading-[0.9] mb-4 tracking-tighter uppercase italic line-clamp-2">{car.name}</h3>
            <div className="flex flex-col gap-1.5">
               <span className="text-slate-400 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em]"><Truck size={14} className="text-blue-600"/> Nationwide Delivery</span>
               <div className="flex items-center gap-1.5 text-slate-300 text-[8px] font-bold uppercase tracking-widest ml-5">
                 <Info size={10} className="text-slate-400"/> Logistics Surcharge Applies
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-6 border-y border-slate-50 mb-10">
            <div className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">Investment Value</div>
            <div className="text-blue-600 font-black text-4xl tracking-tighter italic">{formatDisplayPrice(car.basePrice)}</div>
        </div>

        <div className="mt-auto space-y-5">
          <a 
            href={car.status === 'Sold' ? '#' : generateWhatsAppLink()} 
            className={`w-full py-8 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] text-center flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 ${
              car.status === 'Sold' 
                ? 'bg-slate-100 text-slate-300 pointer-events-none grayscale' 
                : 'bg-slate-950 text-white hover:bg-blue-600 hover:-translate-y-1'
            }`}
          >
            <MessageSquare size={20}/> {car.status === 'Sold' ? 'Sold Out' : 'Initiate Acquisition'}
          </a>
          
          {car.status !== 'Sold' && (
            <button 
              onClick={handleCarFinanceRequest} 
              className="w-full text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] py-2 hover:underline decoration-blue-200 transition active:scale-90 flex items-center justify-center gap-2"
            >
              <CreditCard size={14}/> Bespoke Credit Desk
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const [rates, setRates] = useState({ USD: 1, NGN: 1550 }); 
  const [currency, setCurrency] = useState('USD');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestData, setRequestData] = useState({ make: '', model: '', budget: '' });

  // --- GOOGLE DRIVE IMAGE FIX ---
  const cleanImageUrl = (url) => {
    if (!url || typeof url !== 'string') return 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800';
    try {
      let trimmed = url.trim().replace(/^"|"$/g, '');
      
      if (trimmed.includes('drive.google.com')) {
        let fileId = '';
        if (trimmed.includes('/file/d/')) fileId = trimmed.split('/file/d/')[1]?.split('/')[0]?.split('?')[0];
        else if (trimmed.includes('id=')) fileId = trimmed.split('id=')[1]?.split('&')[0];
        if (fileId) return `https://lh3.googleusercontent.com/u/0/d/${fileId}`;
      }

      if (trimmed.includes('google.com/search?q=')) {
        const urlParams = new URLSearchParams(trimmed.split('?')[1]);
        const actualUrl = urlParams.get('q') || urlParams.get('imgurl');
        trimmed = actualUrl ? decodeURIComponent(actualUrl) : trimmed;
      }
      
      return trimmed.startsWith('http') ? trimmed : 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800';
    } catch (e) { return url; }
  };

  // --- LIVE DMS FETCHING ---
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${GOOGLE_SHEET_CSV_URL}&t=${Date.now()}`);
      if (!response.ok) throw new Error(`DMS Offline`);
      const text = await response.text();
      const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
      if (rows.length < 2) throw new Error("Inventory Empty");

      const allData = rows.slice(1).map((row, index) => {
        // Handle quoted values with commas
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        const rangeMatch = cols[1]?.match(/\d+\s?km/i) || cols[5]?.match(/\d+\s?km/i);

        return {
          id: cols[0] || `idx-${index}`,
          name: cols[1] || 'Premium Unit',
          basePrice: parseFloat((cols[2] || "0").replace(/[^0-9.]/g, '')) || 0,
          category: cols[3] || 'Used',
          type: cols[4] || 'Foreign Used',
          power: cols[5] || 'Fuel',
          status: cols[6] || 'Available',
          rangeTag: rangeMatch ? rangeMatch[0].toUpperCase() : null,
          images: (cols[7] || '').split(',').map(img => cleanImageUrl(img.trim())).filter(img => img !== '')
        };
      });

      // Live Rate Sync
      const rateRow = allData.find(item => item.id.toUpperCase() === 'RATE');
      if (rateRow && rateRow.basePrice > 0) setRates(prev => ({ ...prev, NGN: rateRow.basePrice }));

      setCars(allData.filter(item => item.id.toUpperCase() !== 'RATE' && item.name.length > 2));
      setError(null);
    } catch (err) {
      setError(`DMS Sync Failed: Ensure Sheet is Published to Web as CSV.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 120000); 
    return () => clearInterval(interval); 
  }, [fetchData]);

  const formatDisplayPrice = (price) => {
    const rate = rates[currency] || 1;
    const converted = Math.round(price * rate);
    return `${currency === 'USD' ? '$' : '₦'}${converted.toLocaleString()}`;
  };

  const filteredCars = useMemo(() => 
    selectedFilter === 'All' ? cars : cars.filter(car => 
      car.category === selectedFilter || car.power === selectedFilter || car.status === selectedFilter || car.type === selectedFilter
    ), 
  [selectedFilter, cars]);

  if (loading && cars.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <Loader2 className="animate-spin mb-4 text-blue-500 w-12 h-12" />
      <p className="text-[10px] uppercase tracking-[0.5em] opacity-40 font-black">Syncing Premium Fleet</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-sans text-slate-900 pb-20 selection:bg-blue-100">
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-3xl border-b border-slate-200/50 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <div className="bg-slate-950 p-2 rounded-2xl shadow-xl shadow-slate-200"><Car className="text-white w-5 h-5" /></div>
          <h1 className="text-xl font-black tracking-tighter italic hidden sm:block uppercase">Auto<span className="text-blue-600">Prime</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2 text-[10px] font-black outline-none focus:border-blue-600 cursor-pointer appearance-none shadow-sm" 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="USD">USD $</option>
            <option value="NGN">NGN ₦</option>
          </select>
          <button onClick={() => setIsMenuOpen(true)} className="p-3 bg-slate-950 text-white rounded-2xl hover:bg-blue-600 transition active:scale-90 shadow-lg"><Menu size={20} /></button>
        </div>
      </nav>

      {/* Hero Presentation */}
      <header className="bg-slate-950 text-white px-6 py-32 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-5xl mx-auto">
          <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.5em] mb-6">Experience the Extraordinary</p>
          <h2 className="text-6xl md:text-8xl font-black mb-10 leading-[0.85] tracking-tighter italic uppercase underline decoration-blue-600 decoration-8 underline-offset-8">THE <br/>PLATINUM <br/>STANDARD.</h2>
          
          <div className="flex flex-wrap justify-center gap-2 mt-16 max-w-4xl mx-auto">
            {['All', 'New', 'Foreign Used', 'Local Used', 'Pre Owned Low Milage', 'Electric', 'Hybrid'].map(cat => (
              <button 
                key={cat} 
                onClick={() => setSelectedFilter(cat)} 
                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  selectedFilter === cat ? 'bg-blue-600 border-blue-600 text-white shadow-2xl scale-110' : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Stock Grid */}
      <main className="max-w-7xl mx-auto p-6 md:p-12">
        {error && (
          <div className="mb-12 bg-red-50 border border-red-100 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">{error}</p>
            </div>
            <button onClick={fetchData} className="bg-red-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase shadow-lg">Retry Sync</button>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {filteredCars.map(car => (
            <Card key={car.id} car={car} formatDisplayPrice={formatDisplayPrice} whatsappNumber={WHATSAPP_NUMBER} />
          ))}
        </div>
      </main>

      {/* Procurement Section */}
      <section id="request" className="max-w-6xl mx-auto px-6 my-24">
        <div className="bg-white rounded-[4rem] p-12 md:p-20 border border-slate-100 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6"><Search size={14} /> Global Concierge</div>
              <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tighter italic uppercase leading-none">Bespoke <br/><span className="text-blue-600 underline decoration-blue-100 underline-offset-8">Sourcing</span></h2>
              <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-md">Can't find your exact spec? Our global network identifies, inspects, and delivers dream builds to your doorstep nationwide.</p>
            </div>
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              const msg = `Hi AutoPrime! I would like to initiate a Bespoke Sourcing request:\n\nBrand/Make: ${requestData.make}\nModel Year: ${requestData.model}\nTarget Budget: ${requestData.budget}`;
              window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank'); 
            }} className="flex-1 w-full space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" placeholder="Brand / Make" required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-[2rem] px-8 py-5 text-lg font-bold outline-none transition-all shadow-sm" value={requestData.make} onChange={e => setRequestData({...requestData, make: e.target.value})} />
                <input type="text" placeholder="Model Year" required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-[2rem] px-8 py-5 text-lg font-bold outline-none transition-all shadow-sm" value={requestData.model} onChange={e => setRequestData({...requestData, model: e.target.value})} />
              </div>
              <input type="text" placeholder="Target Investment Budget" required className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-[2rem] px-8 py-5 text-lg font-bold outline-none transition-all shadow-sm" value={requestData.budget} onChange={e => setRequestData({...requestData, budget: e.target.value})} />
              <button type="submit" className="w-full bg-gradient-to-r from-slate-900 to-blue-900 text-white font-black py-8 rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-4 text-xl hover:scale-[1.02] active:scale-95 transition-all group overflow-hidden">
                <span className="uppercase tracking-tighter">Submit Procurement Request</span>
                <Send size={24} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </form>
        </div>
      </section>

      {/* Credit Section */}
      <section id="financing" className="max-w-6xl mx-auto px-6 mb-32">
        <div className="bg-slate-950 rounded-[4rem] p-16 md:p-24 text-white text-center relative overflow-hidden">
          <span className="bg-blue-600/30 text-blue-400 border border-blue-600/30 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-10 inline-block">Strategic Acquisitions</span>
          <h3 className="text-5xl md:text-7xl font-black mb-8 leading-tight tracking-tighter uppercase italic">Tailored <br/>Credit Solutions</h3>
          <p className="text-slate-400 max-w-xl mx-auto mb-10 text-lg italic leading-relaxed">Speak with our private acquisition desk to discuss bespoke structured payment plans for elite inventory.</p>
          <button onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi AutoPrime, I'm interested in exploring bespoke car financing and acquisition credit options.")}`, '_blank')} className="bg-white text-slate-950 px-20 py-8 rounded-[3rem] font-black text-xl hover:scale-105 active:scale-95 transition-transform shadow-xl uppercase tracking-tighter">Initiate Consultation</button>
        </div>
      </section>

      {/* Prestige Footer */}
      <footer className="text-center py-20 border-t border-slate-200">
        <div className="flex justify-center gap-8 mb-8 text-slate-300">
          <Truck size={24} className="hover:text-blue-600 transition cursor-help" />
          <ShieldCheck size={24} className="hover:text-blue-600 transition cursor-help" />
          <TrendingUp size={24} className="hover:text-blue-600 transition cursor-help" />
          <Globe size={24} className="hover:text-blue-600 transition cursor-help" />
        </div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] mb-2 leading-loose px-6 text-center italic">AutoPrime Nationwide Logistics (Surcharge Applies) • DMS v4.6.4</p>
        <p className="text-slate-300 text-[8px] font-bold uppercase tracking-widest mt-4">Verified Inventory System • Global Procurement Desk Active</p>
      </footer>

      {/* Sidebar Overlay */}
      <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl" onClick={() => setIsMenuOpen(false)}></div>
        <div className={`absolute right-0 top-0 h-full w-full max-w-xs bg-white p-12 transition-transform duration-500 transform ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} shadow-2xl`}>
          <div className="flex justify-between items-center mb-16">
            <span className="font-black text-2xl tracking-tighter italic text-blue-600 underline underline-offset-8 uppercase">AutoPrime</span>
            <button onClick={() => setIsMenuOpen(false)} className="p-3 bg-slate-100 rounded-2xl active:scale-90 transition"><X /></button>
          </div>
          <nav className="space-y-12">
            <button onClick={() => {setIsMenuOpen(false); window.scrollTo({top:0, behavior:'smooth'})}} className="block text-4xl font-black hover:text-blue-600 uppercase tracking-tighter text-left">Showroom</button>
            <a href="#request" onClick={() => setIsMenuOpen(false)} className="block text-4xl font-black hover:text-blue-600 uppercase tracking-tighter">Procurement</a>
            <a href="#financing" onClick={() => setIsMenuOpen(false)} className="block text-4xl font-black hover:text-blue-600 uppercase tracking-tighter">Consulting</a>
            <div className="pt-12 border-t border-slate-100">
               <a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="text-green-600 text-2xl font-black uppercase tracking-tight hover:underline transition">Direct Desk</a>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
