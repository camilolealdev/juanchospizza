
import React, { useState, useEffect, useRef } from 'react';
import { getChatbotResponse } from '../services/geminiService';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '¡Bienvenido a Guido Pizza! Soy tu Concierge Personal. ¿Qué delicia artesanal te gustaría pedir hoy para disfrutar en Bogotá?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));
    history.push({ role: 'user', parts: [{ text: userMessage }] });

    const aiResponse = await getChatbotResponse(history);
    setMessages(prev => [...prev, { role: 'model', text: aiResponse }]);
    setIsLoading(false);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 md:left-auto md:right-8 z-[200] w-14 h-14 md:w-16 md:h-16 rounded-full bg-orange-600 text-white shadow-[0_20px_50px_rgba(234,88,12,0.5)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-comment-dots'} text-xl md:text-2xl`}></i>
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-stone-950 animate-pulse"></span>
        )}
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-24 left-4 right-4 md:left-auto md:bottom-28 md:right-8 z-[200] md:w-[400px] h-[500px] md:h-[550px] bg-stone-950/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden transition-all duration-500 transform ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-orange-600 to-orange-800 flex items-center gap-4">
           <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/20">
             <i className="fas fa-robot text-white text-sm"></i>
           </div>
           <div>
             <h4 className="text-sm font-black text-white uppercase tracking-widest">AI Concierge</h4>
             <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-[8px] font-black text-white/70 uppercase">Online Now</span>
             </div>
           </div>
        </div>

        {/* Messages Container */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-stone-900/20">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[80%] p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-stone-800 text-white rounded-br-none border border-white/5 shadow-lg' 
                  : 'bg-orange-600/10 text-stone-200 border border-orange-600/20 rounded-bl-none shadow-xl'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-stone-800/50 p-4 rounded-2xl flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce"></span>
               </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-stone-900/50 border-t border-white/5">
          <div className="flex bg-stone-950 rounded-2xl border border-white/5 p-1.5 group focus-within:border-orange-500 transition-all">
             <input 
               type="text" 
               placeholder="Escribe tu pedido..."
               className="flex-1 bg-transparent border-none focus:ring-0 text-xs text-white px-4"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             />
             <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center hover:bg-orange-500 transition-all disabled:opacity-50"
             >
               <i className="fas fa-paper-plane text-xs"></i>
             </button>
          </div>
          <p className="text-[7px] text-stone-700 font-black uppercase tracking-widest text-center mt-3">Powered by Gemini AI - Mastery in Service</p>
        </div>
      </div>
    </>
  );
};

export default AIChatWidget;
