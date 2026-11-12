import React from "react";

const Loader = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#fffaf0] text-[#172033]">
      <div className="relative">
        <div className="w-24 h-24 rounded-full border-t-2 border-b-2 border-[#D99A32] animate-spin"></div>
        <div className="absolute top-0 left-0 w-24 h-24 rounded-full border-l-2 border-r-2 border-[#A85B20] animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#D99A32] to-[#A85B20] rounded-xl rotate-45 animate-bounce shadow-xl shadow-[#A85B20]/20"></div>
        </div>
      </div>

      <div className="mt-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <h1 className="text-4xl font-black tracking-[0.3em] bg-clip-text text-transparent bg-gradient-to-r from-[#A85B20] via-[#D99A32] to-[#A85B20] animate-gradient-x">
          Q FURNITURES
        </h1>
        <p className="text-[10px] text-[#A85B20] font-bold uppercase tracking-[0.4em] mt-3 opacity-70">
          Furniture & Home Essentials
        </p>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-1.5 h-1.5 bg-[#D99A32]/50 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
        ))}
      </div>
    </div>
  );
};

export default Loader;