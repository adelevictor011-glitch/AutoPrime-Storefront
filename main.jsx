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
  Calendar, 
  Timer, 
  AlertCircle, 
  RefreshCw, 
  Truck, 
  Info, 
  Send,
  CreditCard,
  Globe
} from 'lucide-react';

/**
 * AUTOPRIME ELITE STOREFRONT v4.6.6
 * Features: Live DMS Sync, Currency Switcher, Google Drive Image Fix, 
 * Range Tag Extraction, Nationwide Delivery Logic.
 * Optimized for platform compatibility.
 */

// --- CONFIGURATION ---
const WHATSAPP_NUMBER = "2349122503132"; 
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT0qeDSTiJkeT9UkU0XvKaoSRpjT6wxCDNeRaiXonPBvpUUo176DlEIxk_qYBDF_2v5Qu4XLim5w3ia/pub?gid=0&single=true&output=csv"; 

// --- SUB-COMPONENT: VEHICLE CARD ---
const Card = ({ car, formatDisplayPrice, whatsappNumber }) => {
  const [currentImg, setCurrentImg] = useState(0);

  const generateWhatsAppLink = () => {
    const message = `Hi AutoPrime! I'm interested in the ${car.name}. Price: ${formatDisplayPrice(car.basePrice)}. Status: ${car.status}. Is it available for delivery?`;
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  const handleCarFinanceRequest = (e) => {
    e.stopPropagation();
    const message = `Hi AutoPrime, I'm interested in car financing for the ${car.name}`;
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
      <div className="relative h-80 overflow-hidden bg-[#fcfcfc] flex items-center justify-center p-2">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        <div className="absolute inset-0 flex transition-transform duration-500" style={{ transform: `translateX(-${currentImg * 100}%)` }}>
          {car.images && car.images.length > 0 ? (
            car.images.map((img, i) => (
              <div key={i} className="w-full h-full flex-shrink-0 flex items-center justify-center p-4">
                 <img 
                  src={img} 
                  alt={`${car.name} view ${i}`} 
                  className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-105" 
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800'; }}
                />
              </div>
            ))
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Car className="text-slate-200 w-16 h-16" />
            </div>
          )}
        </div>

        {car.images && car.images.length > 1 && (
          <>
            <button onClick={prevImg} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 border border-slate-100 rounded-full text-slate-900 shadow-lg z-10 hover:bg-white active:scale-90 transition opacity-0 group-hover:opacity-100">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextImg} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 border border-slate-100 rounded-full text-slate-900 shadow-lg z-10 hover:bg-white active:scale-90 transition opacity-0 group-hover:opacity-100">
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {car.images.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentImg ? 'w-6 bg-blue-600' : 'w-2 bg-slate-300'}`}></div>
              ))}
            </div>
          </>
        )}
        
        <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
          <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase shadow-sm bg-white border border-slate-100 text-slate-900 tracking-widest">{car.category}</span>
          <span className="bg-slate-900/90 text-white px-4 py-1.5 rounded-full text-[9px] font-black shadow-sm flex items-center gap-1 uppercase">
            {car.power.toLowerCase().includes('electric') && <Zap size={10} className="text-blue-400" />} {car.power}
          </span>
          {car.rangeTag && (
            <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black shadow-sm uppercase flex items-center gap-1.5">
              <TrendingUp size={10}/> {car.rangeTag} Range
            </span>
          )}
        </div>

        {car.status === 'Arriving' && (
          <div className="absolute top-6 right-6 bg-blue-600 text-white px-4 py-1.5 rounded-2xl text-[9px] font-black shadow-lg animate-pulse z-10 uppercase">Arriving</div>
        )}
        {car.status === 'Pre Order Only' && (
          <div className="absolute top-6 right-6 bg-indigo-600 text-white px-4 py-1.5 rounded-2xl text-[9px] font-black shadow-lg z-10 uppercase">Pre-Order</div>
        )}
        
        {car.status === 'Sold' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-20 select-none">
            <div className="bg-red-600 text-white px-10 py-5 font-black text-3xl border-8 border-white shadow-2xl uppercase -rotate-12 transform scale-110 tracking-tighter">
              JUST SOLD
            </div>
          </div>
        )}
      </div>

      <div className="p-10 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-8 min-h-[5rem]">
          <div>
            <h3 className="text-3xl font-black leading-none mb-3 tracking-tighter uppercase italic line-clamp-2">{car.name}</h3>
            <div className="flex flex-col gap-1">
               <span className="text-slate-400 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em]"><Truck size={14} className="text-blue-600"/> Nationwide Delivery</span>
               <span className="text-slate-300 text-[7px] font-bold uppercase tracking-widest ml-5 tracking-tighter"><Info size={10}/> Delivery Charges Apply</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-6 border-y border-slate-50 mb-10">
            <div className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">Value From</div>
            <div className="text-blue-600 font-black text-3xl tracking-tighter">{formatDisplayPrice(car.basePrice)}</div>
        </div>

        <div className="mt-auto space-y-4">
          <a href={car.status === 'Sold' ? '#' : generateWhatsAppLink()} className={`w-full py-7 rounded-[2.5rem] font-black text-xs uppercase tracking-widest text-center transition-all flex items-center justify-center gap-3 ${car.status === 'Sold' ? 'bg-slate-100 text-slate-300 pointer-events-none grayscale' : 'bg-slate-900 text-white hover:bg-blue-600 hover:scale-105 shadow-2xl active:scale-95'}`}>
            <MessageSquare size={20}/> {car.status === 'Sold' ? 'Sold Out' : 'Enquire Now'}
          </a>
          {car.status !== 'Sold' && (
            <button onClick={handleCarFinanceRequest} className="w-full text-blue-600 font-black text-[10px] uppercase tracking-widest py-2 hover:underline transition">
              Interested in financing?
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION ---
const App = () => {
  const [rates, setRates] = useState({ USD: 1, NGN: 1550 }); 
  const [currency, setCurrency] = useState('USD');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestData, setRequestData] = useState({ make: '', model: '', budget: '' });

  const cleanImageUrl = (url) => {
    if (!url || typeof url !== 'string') return 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800';
    try {
      let trimmed = url.trim().replace(/^"|"$/g, '');
      if (trimmed.includes('drive.google.com')) {
        let fileId = '';
        if (trimmed.includes('/file/d/')) {
          fileId = trimmed.split('/file/d/')[1]?.split('/')[0]?.split('?')[0];
        } else if (trimmed.includes('id=')) {
          fileId = trimmed.split('id=')[1]?.split('&')[0];
        }
        if (fileId) return `https://lh3.googleusercontent.com/u/0/d/${fileId}`;
      }
      return trimmed.startsWith('http') ? trimmed : 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800';
    } catch (e) {
      return url;
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const cacheBuster = `&t=${Date.now()}`;
      const response = await fetch(GOOGLE_SHEET_CSV_URL + cacheBuster);
      if (!response.ok) throw new Error(`Network Error: ${response.status}`);
      const text = await response.text();
      const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
      if (rows.length < 2) throw new Error("Spreadsheet empty or not published.");

      const allData = rows.slice(1).map((row, index) => {
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        const rawPrice = cols[2] || "0";
        const numericPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 0;
        const rawImages = cols[6] || '';
        const images = rawImages.split(',').map(img => img.trim()).filter(img => img !== '').map(img => cleanImageUrl(img));
        const rangeMatch = cols[1]?.match(/\d+\s?km/i) || cols[4]?.match(/\d+\s?km/i);

        return {
          id: cols[0] || `idx-${index}`,
          name: cols[1] || 'Premium Vehicle',
          basePrice: numericPrice,
          category: cols[3] || 'Used',
          power: cols[4] || 'Fuel',
          status: cols[5] || 'Available',
          rangeTag: rangeMatch ? rangeMatch[0].toUpperCase() : null,
          images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800']
        };
      });

      const rateRow = allData.find(item => item.id.toUpperCase() === 'RATE');
      if (rateRow && rateRow.basePrice > 0) setRates(prev => ({ ...prev, NGN: rateRow.basePrice }));

      const inventory = allData.filter(item => item.id.toUpperCase() !== 'RATE' && item.name.length > 1);
      setCars(inventory);
      setError(null);
    } catch (err) {
      setError(`DMS Sync Error`);
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
    const symbols = { USD: '$', NGN: '₦' };
    const rate = rates[currency] || 1;
    const converted = Math.round(price * rate);
    return `${symbols[currency]}${converted.toLocaleString()}`;
  };

  const handleGlobalFinanceRequest = () => {
    const message = "Hi AutoPrime, I'm interested in exploring car financing options.";
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredCars = useMemo(() => {
    if (selectedFilter === 'All') return cars;
    return cars.filter(car => car.category === selectedFilter || car.power === selectedFilter || car.status === selectedFilter);
  }, [selectedFilter, cars]);

  if (loading && cars.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-black uppercase tracking-[0.4em]">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
      Syncing Showroom
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-sans text-slate-900 pb-20">
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-3xl border-b border-slate-200/50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <div className="bg-slate-950 p-2 rounded-2xl"><Car className="text-white w-5 h-5" /></div>
          <h1 className="text-xl font-black tracking-tighter">AUTO<span className="text-blue-600">PRIME</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <select className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2 text-[10px] font-black" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="USD">USD $</option>
            <option value="NGN">NGN ₦</option>
          </select>
          <button onClick={() => setIsMenuOpen(true)} className="p-3 bg-slate-950 text-white rounded-2xl"><Menu size={20} /></button>
        </div>
      </nav>

      <header className="bg-slate-950 text-white px-6 py-32 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-5xl mx-auto">
          <h2 className="text-6xl md:text-8xl font-black mb-10 leading-[0.85] tracking-tighter italic uppercase underline decoration-blue-600 decoration-8 underline-offset-8">THE <br/>PLATINUM <br/>STANDARD.</h2>
          <div className="flex flex-wrap justify-center gap-2 mt-16 max-w-4xl mx-auto">
            {['All', 'New', 'Used', 'Foreign used', 'Pre Owned Low Milage', 'Electric', 'CNG', 'Hybrid'].map(cat => (
              <button key={cat} onClick={() => setSelectedFilter(cat)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedFilter === cat ? 'bg-blue-600 border-blue-600 text-white scale-110' : 'bg-transparent border-slate-800 text-slate-500'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {filteredCars.map(car => (
            <Card key={car.id} car={car} formatDisplayPrice={formatDisplayPrice} whatsappNumber={WHATSAPP_NUMBER} />
          ))}
        </div>
      </main>

      {/* Strategic Credit Section */}
      <section id="financing" className="max-w-6xl mx-auto px-6 mb-32">
        <div className="bg-slate-950 rounded-[4rem] p-16 md:p-24 text-white text-center relative overflow-hidden">
          <span className="bg-blue-600/30 text-blue-400 border border-blue-600/30 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-10 inline-block">Strategic Acquisitions</span>
          <h3 className="text-5xl md:text-7xl font-black mb-8 leading-tight tracking-tighter uppercase italic">Tailored <br/>Credit Solutions</h3>
          <p className="text-slate-400 max-w-xl mx-auto mb-10 text-lg italic leading-relaxed">Speak with our private acquisition desk to discuss bespoke structured payment plans for elite inventory.</p>
          <button onClick={handleGlobalFinanceRequest} className="bg-white text-slate-950 px-20 py-8 rounded-[3rem] font-black text-xl hover:scale-105 active:scale-95 transition-transform shadow-xl uppercase tracking-tighter">Initiate Consultation</button>
        </div>
      </section>

      {/* Footer Content */}
      <footer className="text-center py-20 border-t border-slate-200">
         <div className="flex justify-center gap-8 mb-6 text-slate-300"><Truck size={24} /><ShieldCheck size={24} /><TrendingUp size={24} /><Globe size={24} /><CreditCard size={24} /></div>
         <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] mb-2 px-6 text-center italic">AUTOPRIME NATIONWIDE DELIVERY • DMS V4.6.6</p>
      </footer>

      {/* Sidebar Menu */}
      <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setIsMenuOpen(false)}></div>
        <div className={`absolute right-0 top-0 h-full w-80 bg-white p-12 transition-transform duration-500 transform ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center mb-16">
            <span className="font-black text-2xl tracking-tighter italic text-blue-600 uppercase">AutoPrime</span>
            <button onClick={() => setIsMenuOpen(false)} className="p-3 bg-slate-100 rounded-2xl"><X /></button>
          </div>
          <nav className="space-y-10">
            <button onClick={() => {setIsMenuOpen(false); window.scrollTo({top:0})}} className="block text-3xl font-black hover:text-blue-600 uppercase tracking-tighter">Showroom</button>
            <div className="pt-10 border-t border-slate-100">
               <a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="text-xl font-black text-green-600 uppercase">WhatsApp Admin</a>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default App;
