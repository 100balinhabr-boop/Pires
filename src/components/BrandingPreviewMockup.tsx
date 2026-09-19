import React, { useState } from 'react';
import { ClientBranding, BackgroundStyle } from '../types';
import { hexWithAlpha, getBackgroundClassesAndStyles } from '../utils/dynamicBranding';
import {
  Tv, BadgeCheck, ShieldCheck, Lock, User, Film, PlaySquare,
  Settings as SettingsIcon, Search, Play, Star, ChevronRight, Smartphone, Monitor,
  Sparkles
} from 'lucide-react';

interface ClientTabConfig {
  id: 'movies' | 'series' | 'live' | 'settings';
  label: string;
  visible: boolean;
}

interface BrandingPreviewMockupProps {
  branding: ClientBranding;
  clientTabs: ClientTabConfig[];
}

export const BrandingPreviewMockup: React.FC<BrandingPreviewMockupProps> = ({
  branding,
  clientTabs,
}) => {
  const [viewMode, setViewMode] = useState<'login' | 'portal'>('portal');
  const [deviceMode, setDeviceMode] = useState<'phone' | 'tv'>('phone');
  const [activeTab, setActiveTab] = useState<'movies' | 'series' | 'live' | 'settings'>('live');

  const accent = branding.accentColor || '#dc2626';
  const bgStyle = branding.backgroundStyle || 'default';
  const visibleTabs = clientTabs.filter(t => t.visible);

  const bgConfig = getBackgroundClassesAndStyles(bgStyle, accent);

  return (
    <div className="bg-[#0f0f17] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top Header do Simulador */}
      <div className="px-4 py-3 bg-[#151522] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="absolute w-4 h-4 rounded-full bg-emerald-500/30 animate-ping" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Prévia em Tempo Real
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {bgStyle.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternador de Tela */}
          <div className="flex items-center bg-[#0d0d14] p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('portal')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                viewMode === 'portal'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Portal
            </button>
            <button
              type="button"
              onClick={() => setViewMode('login')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                viewMode === 'login'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Login
            </button>
          </div>

          {/* Alternador de Formato (Phone vs TV/Tablet) */}
          <div className="flex items-center bg-[#0d0d14] p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setDeviceMode('phone')}
              className={`p-1 rounded-lg transition ${
                deviceMode === 'phone' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Visualização Celular"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('tv')}
              className={`p-1 rounded-lg transition ${
                deviceMode === 'tv' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Visualização Smart TV / Tablet"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Frame do Dispositivo */}
      <div className="p-4 sm:p-6 bg-[#09090e] flex items-center justify-center min-h-[460px] overflow-hidden">
        <div
          className={`transition-all duration-300 border-4 border-slate-800 rounded-[28px] overflow-hidden shadow-2xl relative select-none flex flex-col ${
            deviceMode === 'phone'
              ? 'w-full max-w-[320px] h-[520px]'
              : 'w-full max-w-[500px] h-[340px]'
          } ${bgConfig.className}`}
          style={{
            ...bgConfig.style,
            boxShadow: `0 20px 50px -15px ${hexWithAlpha(accent, 0.25)}`,
          }}
        >
          {/* Efeito de Mesh/Gradient interno */}
          {bgStyle === 'mesh' && (
            <div
              className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-[60px] pointer-events-none"
              style={{ background: hexWithAlpha(accent, 0.35) }}
            />
          )}

          {/* SIMULAÇÃO: TELA DE LOGIN */}
          {viewMode === 'login' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-5 relative z-10 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg relative overflow-hidden shrink-0 border"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${hexWithAlpha(accent, 0.7)})`,
                  borderColor: hexWithAlpha(accent, 0.5),
                  boxShadow: `0 8px 25px -4px ${hexWithAlpha(accent, 0.6)}`,
                }}
              >
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
                ) : (
                  <Tv className="w-7 h-7 text-white" />
                )}
              </div>

              <div className="flex items-center justify-center gap-1 mb-1">
                <h4 className="text-base font-black text-white truncate max-w-[190px]">
                  {branding.appName || 'RPR TV'}
                </h4>
                <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: accent }} />
              </div>

              {branding.footerText && (
                <p className="text-[10px] text-slate-400 mb-4 flex items-center justify-center gap-1 truncate max-w-[240px]">
                  <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: accent }} />
                  <span className="truncate">{branding.footerText}</span>
                </p>
              )}

              {/* Caixa simulada de formulário */}
              <div className="w-full max-w-[240px] space-y-2 text-left mt-1">
                <div className="bg-[#12121c]/90 border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center gap-2">
                  <User className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] text-slate-500">usuario@exemplo</span>
                </div>
                <div className="bg-[#12121c]/90 border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center gap-2">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] text-slate-500">••••••••</span>
                </div>
                <button
                  type="button"
                  className="w-full py-2 rounded-xl text-white font-bold text-xs uppercase tracking-wide shadow-md transition"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${hexWithAlpha(accent, 0.85)})`,
                    boxShadow: `0 4px 15px -2px ${hexWithAlpha(accent, 0.5)}`,
                  }}
                >
                  Entrar
                </button>
              </div>

              <div className="mt-4 text-[9px] text-slate-500 font-mono">
                {branding.appName || 'RPR TV'} • v2.5 VIP
              </div>
            </div>
          ) : (
            /* SIMULAÇÃO: PORTAL DO CLIENTE */
            <div className="flex-1 flex flex-col justify-between relative z-10 overflow-hidden">
              {/* Top Bar */}
              <div className="px-3 py-2 bg-[#0d0f17]/90 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt="Logo" className="w-4 h-4 object-contain shrink-0" />
                  ) : (
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                      style={{ background: accent }}
                    >
                      <Tv className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-white truncate max-w-[120px]">
                    {branding.appName || 'RPR TV'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <div
                    className="w-5 h-5 rounded-lg flex items-center justify-center text-white text-[9px]"
                    style={{ background: hexWithAlpha(accent, 0.25), color: accent }}
                  >
                    <Search className="w-2.5 h-2.5" />
                  </div>
                </div>
              </div>

              {/* Conteúdo Central Simulador */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
                {/* Banner Hero */}
                <div
                  className="p-3 rounded-2xl relative overflow-hidden border"
                  style={{
                    background: `linear-gradient(135deg, ${hexWithAlpha(accent, 0.25)} 0%, rgba(15,23,42,0.8) 100%)`,
                    borderColor: hexWithAlpha(accent, 0.3),
                  }}
                >
                  <div className="relative z-10">
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider mb-1"
                      style={{ background: accent }}
                    >
                      Ao Vivo • VIP
                    </span>
                    <h5 className="text-xs font-bold text-white leading-tight">
                      Canais em Alta Resolução
                    </h5>
                    <p className="text-[9px] text-slate-300 mt-0.5 line-clamp-1">
                      {branding.footerText || 'Transmissão ultrarrápida sem travamentos'}
                    </p>
                  </div>
                </div>

                {/* Grade Miniatura */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                    <span className="font-semibold text-slate-200">Em Destaque</span>
                    <span className="text-[9px] flex items-center gap-0.5" style={{ color: accent }}>
                      Ver todos <ChevronRight className="w-2.5 h-2.5" />
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map((num) => (
                      <div
                        key={num}
                        className="bg-[#121420]/80 border border-slate-800/80 rounded-xl p-1.5 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-slate-600 transition"
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center mb-1 transition group-hover:scale-105"
                          style={{ background: `${accent}20` }}
                        >
                          <Play className="w-3.5 h-3.5" style={{ color: accent }} />
                        </div>
                        <span className="text-[9px] font-bold text-white truncate max-w-full">
                          Canal {num}
                        </span>
                        <span className="text-[7px] text-slate-400 font-mono">4K • 60FPS</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Tabs do Simulador */}
              <div className="px-2 py-1.5 bg-[#0b0d14]/95 border-t border-slate-800/80 flex items-center justify-around shrink-0">
                {visibleTabs.map((tab) => {
                  const isSelected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col items-center justify-center py-0.5 px-1.5 rounded-lg transition min-w-[44px] ${
                        isSelected ? 'scale-105' : 'opacity-60 hover:opacity-90'
                      }`}
                      style={{ color: isSelected ? accent : '#94a3b8' }}
                    >
                      {tab.id === 'movies' && <Film className="w-3.5 h-3.5" />}
                      {tab.id === 'series' && <PlaySquare className="w-3.5 h-3.5" />}
                      {tab.id === 'live' && <Tv className="w-3.5 h-3.5" />}
                      {tab.id === 'settings' && <SettingsIcon className="w-3.5 h-3.5" />}
                      <span
                        className="text-[8px] font-bold tracking-tight mt-0.5 truncate max-w-[50px]"
                        style={{ color: isSelected ? accent : '#94a3b8' }}
                      >
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rodapé explicativo do simulador */}
      <div className="p-3 bg-[#11111b] border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[11px]">
          Clique em <strong>Salvar Alterações</strong> abaixo para aplicar para seus clientes.
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
          Cor: {accent}
        </span>
      </div>
    </div>
  );
};
