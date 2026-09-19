import React, { useState, useEffect, useMemo } from 'react';
import { UserAccount, ClientBranding } from '../types';
import {
  Users, UserCheck, Clock, TrendingUp, AlertTriangle, UserX,
  DollarSign, MessageSquare, Zap, Copy, Check, ExternalLink,
  RefreshCw, ArrowUpRight, Shield, Crown, Briefcase, ChevronRight,
  Sliders, Calendar, Send, CheckCircle, Info, Sparkles, X,
  FileText, Activity, AlertCircle, Phone, Lock, Eye, EyeOff
} from 'lucide-react';
import { hexWithAlpha } from '../utils/dynamicBranding';
import { normalizeUserRole, formatDateDisplay, getExpirationInfo } from './AdminPanel';

export type Section = 'dashboard' | 'clients' | 'revendas' | 'admins' | 'create' | 'settings' | 'appearance' | 'logs';

export interface AuditEntry {
  ts: string;
  actor: string;
  action: string;
  target: string | null;
  details: any;
}

interface AdminDashboardProps {
  users: UserAccount[];
  currentAdmin: UserAccount;
  isMaster: boolean;
  isRevenda: boolean;
  branding: ClientBranding;
  auditEntries: AuditEntry[];
  loadingAudit: boolean;
  actionLoadingId: string | null;
  onNavigate: (section: Section) => void;
  onQuickRenew: (user: UserAccount, days: number) => Promise<void>;
  onRefreshUsers: () => void;
  onUserCreated: (newUsers: UserAccount[]) => void;
  setFeedbackMsg: (msg: { type: 'success' | 'error'; text: string } | null) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  currentAdmin,
  isMaster,
  isRevenda,
  branding,
  auditEntries,
  loadingAudit,
  actionLoadingId,
  onNavigate,
  onQuickRenew,
  onRefreshUsers,
  onUserCreated,
  setFeedbackMsg,
}) => {
  // Configurações financeiras e PIX persistidas localmente
  const [ticketPrice, setTicketPrice] = useState<number>(() => {
    const saved = localStorage.getItem('rpr_admin_ticket_price');
    return saved ? Number(saved) : 35;
  });

  const [pixKey, setPixKey] = useState<string>(() => {
    return localStorage.getItem('rpr_admin_pix_key') || '';
  });

  const [pixBeneficiary, setPixBeneficiary] = useState<string>(() => {
    return localStorage.getItem('rpr_admin_pix_beneficiary') || '';
  });

  // Filtro de cobrança na dashboard
  const [chargeFilter, setChargeFilter] = useState<'critical' | '7days' | 'expired' | 'all'>('critical');

  // Modais da Dashboard
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [chargeModalUser, setChargeModalUser] = useState<UserAccount | null>(null);
  const [chargePhone, setChargePhone] = useState('');
  const [chargeMessageCopied, setChargeMessageCopied] = useState(false);

  // Modal de Teste Rápido
  const [quickTrialOpen, setQuickTrialOpen] = useState(false);
  const [trialName, setTrialName] = useState('');
  const [trialDurationHours, setTrialDurationHours] = useState<number>(4);
  const [trialUsername, setTrialUsername] = useState('');
  const [trialPassword, setTrialPassword] = useState('');
  const [trialPlaylistUrl, setTrialPlaylistUrl] = useState('');
  const [creatingTrial, setCreatingTrial] = useState(false);
  const [trialSuccess, setTrialSuccess] = useState<{
    user: UserAccount;
    pass: string;
    durationLabel: string;
  } | null>(null);
  const [trialCopied, setTrialCopied] = useState(false);

  // Inicializa gerador de teste rápido
  const initQuickTrialData = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const pass = Math.floor(1000 + Math.random() * 9000).toString();
    setTrialName('Cliente Teste');
    setTrialUsername(`teste_${randomSuffix}`);
    setTrialPassword(pass);
    setTrialDurationHours(4);
    setTrialPlaylistUrl('');
    setTrialSuccess(null);
    setTrialCopied(false);
  };

  const handleOpenQuickTrial = () => {
    initQuickTrialData();
    setQuickTrialOpen(true);
  };

  // Salvar configurações de cobrança
  const handleSaveBillingConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('rpr_admin_ticket_price', ticketPrice.toString());
    localStorage.setItem('rpr_admin_pix_key', pixKey.trim());
    localStorage.setItem('rpr_admin_pix_beneficiary', pixBeneficiary.trim());
    setConfigModalOpen(false);
    setFeedbackMsg({ type: 'success', text: 'Configurações de cobrança salvas com sucesso!' });
  };

  // Métricas calculadas
  const clientUsers = useMemo(() => {
    return users.filter(u => normalizeUserRole(u.role) === 'UsuarioComum');
  }, [users]);

  const activeClients = useMemo(() => {
    return clientUsers.filter(u => !u.isBlocked && !getExpirationInfo(u.expirationDate).isExpired);
  }, [clientUsers]);

  const totalClients = clientUsers.length;
  const retentionRate = totalClients > 0 ? Math.round((activeClients.length / totalClients) * 100) : 100;
  const mrrValue = activeClients.length * ticketPrice;
  const annualProjected = mrrValue * 12;

  // Clientes com status de vencimento detalhado
  const detailedClients = useMemo(() => {
    return clientUsers.map(user => {
      const expInfo = getExpirationInfo(user.expirationDate);
      let daysLeft = 9999;
      if (user.expirationDate && user.expirationDate !== 'vitalicio') {
        const exp = new Date(`${user.expirationDate.slice(0, 10)}T23:59:59`);
        const diff = exp.getTime() - Date.now();
        daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }

      return {
        ...user,
        expInfo,
        daysLeft,
        isCritical: !user.isBlocked && !expInfo.isExpired && daysLeft <= 1,
        isWithin7: !user.isBlocked && !expInfo.isExpired && daysLeft <= 7,
        isExpired: expInfo.isExpired,
      };
    });
  }, [clientUsers]);

  const expiringCritical = useMemo(() => {
    return detailedClients.filter(c => c.isCritical);
  }, [detailedClients]);

  const expiring7Days = useMemo(() => {
    return detailedClients.filter(c => c.isWithin7);
  }, [detailedClients]);

  const expiredList = useMemo(() => {
    return detailedClients.filter(c => c.isExpired);
  }, [detailedClients]);

  const lostRevenue = expiredList.length * ticketPrice;
  const revendaUsers = users.filter(u => normalizeUserRole(u.role) === 'AdminRevenda').length;
  const masterUsers = users.filter(u => normalizeUserRole(u.role) === 'AdminMaster').length;

  // Lista de cobrança filtrada
  const filteredChargeList = useMemo(() => {
    let list = [...detailedClients];
    if (chargeFilter === 'critical') {
      list = list.filter(c => c.isCritical);
    } else if (chargeFilter === '7days') {
      list = list.filter(c => c.isWithin7);
    } else if (chargeFilter === 'expired') {
      list = list.filter(c => c.isExpired);
    }

    // Ordenar pelo menor daysLeft primeiro (urgentes primeiro)
    return list.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [detailedClients, chargeFilter]);

  // Gerar mensagem de WhatsApp para cobrança
  const getWhatsAppMessage = (user: UserAccount) => {
    const appName = branding.appName || 'RPR TV';
    const clientName = user.name || user.username;
    const expInfo = getExpirationInfo(user.expirationDate);
    const expDate = formatDateDisplay(user.expirationDate);

    let statusPhrase = `sua assinatura vence em *${expDate}*`;
    if (expInfo.isExpired) {
      statusPhrase = `seu acesso venceu em *${expDate}*`;
    }

    let msg = `Olá, *${clientName}*! Tudo bem? Aqui é da equipe de suporte do *${appName}*.\n\n`;
    msg += `Passando para lembrar que ${statusPhrase}.\n\n`;
    msg += `Para renovar seu acesso e continuar assistindo aos seus canais ao vivo, filmes e séries em alta definição:\n\n`;
    msg += `💰 *Valor do Plano:* R$ ${ticketPrice.toFixed(2).replace('.', ',')}/mês\n`;

    if (pixKey) {
      msg += `🔑 *Chave PIX:* ${pixKey}\n`;
      if (pixBeneficiary) {
        msg += `👤 *Titular:* ${pixBeneficiary}\n`;
      }
    } else {
      msg += `🔑 *Chave PIX:* Solicite nossa chave PIX respondendo esta mensagem\n`;
    }

    msg += `\nAssim que fizer o pagamento, basta enviar o comprovante aqui para liberarmos imediatamente! Obrigado pela confiança. 📺✨`;
    return msg;
  };

  const handleOpenChargeModal = (user: UserAccount) => {
    setChargeModalUser(user);
    setChargePhone('');
    setChargeMessageCopied(false);
  };

  const handleSendWhatsApp = () => {
    if (!chargeModalUser) return;
    const msg = getWhatsAppMessage(chargeModalUser);
    const cleanPhone = chargePhone.replace(/\D/g, '');
    let url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    if (cleanPhone) {
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyChargeMessage = () => {
    if (!chargeModalUser) return;
    const msg = getWhatsAppMessage(chargeModalUser);
    navigator.clipboard.writeText(msg);
    setChargeMessageCopied(true);
    setTimeout(() => setChargeMessageCopied(false), 2500);
  };

  // Criar Teste Rápido via API
  const handleCreateQuickTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trialUsername.trim().length < 3) {
      setFeedbackMsg({ type: 'error', text: 'Usuário do teste deve ter pelo menos 3 caracteres.' });
      return;
    }
    if (trialPassword.trim().length < 4) {
      setFeedbackMsg({ type: 'error', text: 'Senha deve ter pelo menos 4 caracteres.' });
      return;
    }

    setCreatingTrial(true);
    try {
      const token = localStorage.getItem('iptv_auth_token') || sessionStorage.getItem('iptv_auth_token') || '';
      
      // Calcular data de expiração em milissegundos
      const expDateMs = Date.now() + trialDurationHours * 60 * 60 * 1000;
      const expDateIso = new Date(expDateMs).toISOString();

      const durationLabel = trialDurationHours >= 24
        ? `${trialDurationHours / 24} dia${trialDurationHours > 24 ? 's' : ''}`
        : `${trialDurationHours} horas`;

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: trialName.trim() || `Teste (${trialUsername})`,
          username: trialUsername.trim().toLowerCase(),
          password: trialPassword.trim(),
          role: 'UsuarioComum',
          expirationDate: expDateIso,
          playlistUrl: trialPlaylistUrl.trim() || undefined,
          notes: `Teste rápido de ${durationLabel} criado via Dashboard`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.users) {
        onUserCreated(data.users);
        const createdUser = data.users.find((u: UserAccount) => u.username.toLowerCase() === trialUsername.trim().toLowerCase());
        setTrialSuccess({
          user: createdUser || {
            id: 'temp',
            username: trialUsername.trim().toLowerCase(),
            name: trialName.trim(),
            role: 'UsuarioComum',
            createdAt: new Date().toISOString(),
            expirationDate: expDateIso,
          },
          pass: trialPassword.trim(),
          durationLabel,
        });
        setFeedbackMsg({ type: 'success', text: `Teste de ${durationLabel} para @${trialUsername} criado com sucesso!` });
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Erro ao gerar teste.' });
      }
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Erro de comunicação ao criar teste.' });
    } finally {
      setCreatingTrial(false);
    }
  };

  // Copiar dados do teste
  const getTrialShareMessage = () => {
    if (!trialSuccess) return '';
    const appName = branding.appName || 'RPR TV';
    const appUrl = window.location.origin;

    return `*Seu Teste Grátis no ${appName} está pronto!* 📺🍿\n\n` +
      `👤 *Usuário:* ${trialSuccess.user.username}\n` +
      `🔑 *Senha:* ${trialSuccess.pass}\n` +
      `⏱️ *Validade:* ${trialSuccess.durationLabel}\n` +
      `🌐 *Acesse pelo navegador ou aplicativo:*\n${appUrl}\n\n` +
      `Aproveite para testar todos os canais ao vivo, filmes e séries em alta definição!`;
  };

  const handleCopyTrialData = () => {
    const text = getTrialShareMessage();
    navigator.clipboard.writeText(text);
    setTrialCopied(true);
    setTimeout(() => setTrialCopied(false), 2500);
  };

  const handleSendTrialWhatsApp = () => {
    const text = getTrialShareMessage();
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header de Boas-Vindas & Status Operacional */}
      <div
        className="p-5 sm:p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${hexWithAlpha(branding.accentColor, 0.12)}, #0e0e17)`,
          borderColor: hexWithAlpha(branding.accentColor, 0.35),
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shrink-0 border"
            style={{
              background: `linear-gradient(135deg, ${branding.accentColor}, ${branding.accentColor}bb)`,
              borderColor: `${branding.accentColor}80`,
              color: '#ffffff',
            }}
          >
            {currentAdmin.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-white">
                Olá, {currentAdmin.name || currentAdmin.username}!
              </h2>
              <span
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border"
                style={{
                  background: hexWithAlpha(branding.accentColor, 0.2),
                  borderColor: hexWithAlpha(branding.accentColor, 0.4),
                  color: branding.accentColor,
                }}
              >
                {isMaster ? 'Admin Master' : 'Revenda Autorizada'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>{branding.appName}</span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Painel e Proxy 100% Operacionais
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Configurar Chave PIX e Preço do Plano"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Configurar PIX</span>
          </button>
          <button
            type="button"
            onClick={onRefreshUsers}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Ações Rápidas (Quick Actions) */}
      <div className="bg-[#0f0f17] border border-slate-800/80 rounded-2xl p-3.5 sm:p-4 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Ações Rápidas
          </span>
          <span className="text-[10px] text-slate-500 font-mono">1-clique para agilizar seu dia</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Ação 1: Novo Cliente */}
          <button
            type="button"
            onClick={() => onNavigate('create')}
            className="p-3 rounded-xl bg-[#141420] hover:bg-[#191a2a] border border-slate-800 hover:border-slate-700 text-left transition group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-110 transition">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition">Novo Cliente</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Criar assinatura mensal</p>
          </button>

          {/* Ação 2: Gerar Teste Rápido */}
          <button
            type="button"
            onClick={handleOpenQuickTrial}
            className="p-3 rounded-xl bg-gradient-to-br from-amber-950/30 to-[#141420] border border-amber-800/40 hover:border-amber-700 text-left transition group cursor-pointer shadow-sm"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2 group-hover:scale-110 transition">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <p className="text-xs font-bold text-amber-300 group-hover:text-amber-200 transition">⚡ Teste Rápido</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Gerar 2h, 4h ou 24h</p>
          </button>

          {/* Ação 3: Cobrar Vencendo 48h */}
          <button
            type="button"
            onClick={() => {
              setChargeFilter('critical');
              const el = document.getElementById('cobranca-central');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-3 rounded-xl bg-[#141420] hover:bg-[#191a2a] border border-slate-800 hover:border-slate-700 text-left transition group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2 group-hover:scale-110 transition">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-white group-hover:text-rose-300 transition">Cobrança 48h</p>
              {expiringCritical.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-500 text-white rounded-full">
                  {expiringCritical.length}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">WhatsApp em 1 clique</p>
          </button>

          {/* Ação 4: Aparência da Marca */}
          <button
            type="button"
            onClick={() => onNavigate('appearance')}
            className="p-3 rounded-xl bg-[#141420] hover:bg-[#191a2a] border border-slate-800 hover:border-slate-700 text-left transition group cursor-pointer"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition border"
              style={{
                background: hexWithAlpha(branding.accentColor, 0.2),
                borderColor: hexWithAlpha(branding.accentColor, 0.4),
                color: branding.accentColor,
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-white transition">Visual & Marca</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Logo, cores e temas</p>
          </button>
        </div>
      </div>

      {/* 3. Cards de Métricas Principais & Financeiras (Bento Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Clientes Ativos */}
        <div
          onClick={() => onNavigate('clients')}
          className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-[#10131e] to-[#0b0b12] border border-emerald-800/40 hover:border-emerald-700/60 transition cursor-pointer group shadow-lg"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {retentionRate}% da Base
            </span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isRevenda ? 'Meus Clientes Ativos' : 'Clientes Ativos'}
          </p>
          <p className="text-3xl font-black text-white mt-1">{activeClients.length}</p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-800/60">
            <span>Total na carteira: <strong>{totalClients}</strong></span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* Card 2: Faturamento Estimado (MRR) */}
        <div
          onClick={() => setConfigModalOpen(true)}
          className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/30 via-[#10131e] to-[#0b0b12] border border-blue-800/40 hover:border-blue-700/60 transition cursor-pointer group shadow-lg"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              R$ {ticketPrice}/mês
            </span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Faturamento Mensal (MRR)
          </p>
          <p className="text-3xl font-black text-white mt-1">
            R$ {mrrValue.toLocaleString('pt-BR')}
            <span className="text-xs font-normal text-slate-400">/mês</span>
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-800/60">
            <span>Projeção Anual: <strong>R$ {annualProjected.toLocaleString('pt-BR')}</strong></span>
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>

        {/* Card 3: Vencendo em 48h (Crítico) */}
        <div
          onClick={() => {
            setChargeFilter('critical');
            const el = document.getElementById('cobranca-central');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`p-5 rounded-2xl bg-gradient-to-br ${
            expiringCritical.length > 0
              ? 'from-rose-950/40 border-rose-800/60 hover:border-rose-700'
              : 'from-amber-950/25 border-amber-800/40 hover:border-amber-700/60'
          } via-[#10131e] to-[#0b0b12] border transition cursor-pointer group shadow-lg`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`w-11 h-11 rounded-xl ${
              expiringCritical.length > 0
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
            } border flex items-center justify-center group-hover:scale-105 transition`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            {expiringCritical.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse">
                Urgente
              </span>
            )}
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Vencendo Hoje / 48h
          </p>
          <p className="text-3xl font-black text-white mt-1">
            {expiringCritical.length}
            <span className="text-xs font-normal text-slate-400 ml-1">
              ({expiring7Days.length} em 7 dias)
            </span>
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-800/60">
            <span>Cobrança imediata</span>
            <span className="text-rose-400 font-bold group-hover:underline">Cobrar agora →</span>
          </div>
        </div>

        {/* Card 4: Vencidos / Recuperáveis */}
        <div
          onClick={() => {
            setChargeFilter('expired');
            const el = document.getElementById('cobranca-central');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/50 via-[#10131e] to-[#0b0b12] border border-slate-800/80 hover:border-slate-700 transition cursor-pointer group shadow-lg"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:scale-105 transition">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Recuperação
            </span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Clientes Vencidos
          </p>
          <p className="text-3xl font-black text-white mt-1">{expiredList.length}</p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-800/60">
            <span>R$ {lostRevenue.toLocaleString('pt-BR')} a recuperar</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition" />
          </div>
        </div>
      </div>

      {/* 4. Barra de Saúde e Retenção da Base (Health Bar) */}
      <div className="bg-[#0f0f17] border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Saúde e Retenção da Base de Clientes
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Proporção de assinantes ativos, vencendo e inadimplentes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Retenção:</span>
            <span className="text-sm font-black text-emerald-400">{retentionRate}%</span>
          </div>
        </div>

        {/* Barra de Progresso Visual Segmentada */}
        <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
          {totalClients > 0 ? (
            <>
              <div
                style={{ width: `${(activeClients.length / totalClients) * 100}%` }}
                className="bg-emerald-500 transition-all"
                title={`Ativos: ${activeClients.length}`}
              />
              <div
                style={{ width: `${(expiring7Days.length / totalClients) * 100}%` }}
                className="bg-amber-500 transition-all"
                title={`Vencendo 7d: ${expiring7Days.length}`}
              />
              <div
                style={{ width: `${(expiredList.length / totalClients) * 100}%` }}
                className="bg-rose-500 transition-all"
                title={`Vencidos: ${expiredList.length}`}
              />
            </>
          ) : (
            <div className="w-full bg-slate-800" />
          )}
        </div>

        {/* Legenda Informativa */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-1 text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Ativos: <strong className="text-white">{activeClients.length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Vencendo (7d): <strong className="text-white">{expiring7Days.length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Vencidos: <strong className="text-white">{expiredList.length}</strong></span>
          </div>
          {isMaster && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Revendas ativas: <strong className="text-white">{revendaUsers}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Central de Cobrança Rápida via WhatsApp (1-Clique) */}
      <div id="cobranca-central" className="bg-[#0f0f17] border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Central de Cobrança e Renovações WhatsApp
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Envie mensagem de cobrança pronta no WhatsApp e renove clientes com 1 clique
            </p>
          </div>

          {/* Filtros de Vencimento */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#141420] p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setChargeFilter('critical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chargeFilter === 'critical'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vencendo 48h ({expiringCritical.length})
            </button>
            <button
              type="button"
              onClick={() => setChargeFilter('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chargeFilter === '7days'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Próximos 7d ({expiring7Days.length})
            </button>
            <button
              type="button"
              onClick={() => setChargeFilter('expired')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chargeFilter === 'expired'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vencidos ({expiredList.length})
            </button>
            <button
              type="button"
              onClick={() => setChargeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chargeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({totalClients})
            </button>
          </div>
        </div>

        {/* Lista de Clientes para Cobrança */}
        {filteredChargeList.length === 0 ? (
          <div className="py-14 px-4 text-center text-slate-400 space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-500/60 mx-auto" />
            <p className="text-sm font-bold text-slate-300">Nenhum cliente neste filtro no momento!</p>
            <p className="text-xs text-slate-500">
              {chargeFilter === 'critical'
                ? 'Nenhum cliente vencendo hoje ou amanhã. Todos em dia!'
                : 'Nenhum registro encontrado para a categoria selecionada.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredChargeList.map((client) => {
              const isRenewing = actionLoadingId === client.id;

              return (
                <div
                  key={client.id}
                  className="p-4 sm:px-5 hover:bg-[#12131e] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm truncate">{client.name}</span>
                      <span className="text-xs text-slate-400 font-mono">@{client.username}</span>

                      {/* Badge de Vencimento Dinâmica */}
                      {client.isCritical && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                          {client.daysLeft === 0 ? 'VENCE HOJE!' : 'VENCE AMANHÃ!'}
                        </span>
                      )}
                      {!client.isCritical && client.isWithin7 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Vence em {client.daysLeft} dias
                        </span>
                      )}
                      {client.isExpired && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/40 text-rose-400 border border-rose-800/40">
                          Vencido há {Math.abs(client.daysLeft)} dias
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                      <span>Vencimento: <strong className="text-slate-300">{formatDateDisplay(client.expirationDate)}</strong></span>
                      {client.createdBy && isMaster && (
                        <span>• Revenda: <strong className="text-blue-300">@{client.createdBy}</strong></span>
                      )}
                      {client.notes && (
                        <span className="text-[11px] text-slate-500 italic max-w-xs truncate">
                          "{client.notes}"
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações de Cobrança e Renovação Direta */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleOpenChargeModal(client)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow-md active:scale-95"
                      title="Abrir cobrança personalizada no WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onQuickRenew(client, 30)}
                      disabled={isRenewing}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50"
                      title="Renovar +30 dias sem abrir formulários"
                    >
                      {isRenewing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5 text-blue-400" />}
                      <span>+30 Dias</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Mini-Feed de Atividades Recentes do Sistema */}
      {auditEntries.length > 0 && (
        <div className="bg-[#0f0f17] border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Últimas Atividades no Sistema
            </h4>
            {isMaster && (
              <button
                type="button"
                onClick={() => onNavigate('logs')}
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>Ver todos os logs</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {auditEntries.slice(0, 5).map((entry, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-[#12131e] border border-slate-800/70 flex items-center justify-between text-xs gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="font-semibold text-white truncate">@{entry.actor}</span>
                  <span className="text-slate-400 truncate">{entry.action.replace('_', ' ')}</span>
                  {entry.target && (
                    <span className="text-slate-500 font-mono text-[11px] truncate">({entry.target})</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(entry.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: Configurações de Cobrança e PIX */}
      {configModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f17] border border-slate-700/80 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Configurar Cobrança e PIX</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBillingConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor Padrão da Mensalidade (R$)
                </label>
                <input
                  type="number"
                  step="1"
                  min="5"
                  value={ticketPrice}
                  onChange={e => setTicketPrice(Number(e.target.value))}
                  required
                  className="w-full bg-[#15151f] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Usado para calcular o MRR mensal e inserido na mensagem do WhatsApp.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Chave PIX
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  placeholder="Ex: 11999999999, email@exemplo.com ou chave aleatória"
                  className="w-full bg-[#15151f] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Titular do PIX (Opcional)
                </label>
                <input
                  type="text"
                  value={pixBeneficiary}
                  onChange={e => setPixBeneficiary(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full bg-[#15151f] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer"
                >
                  Salvar Configurações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Cobrança Rápida WhatsApp */}
      {chargeModalUser && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f17] border border-slate-700/80 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Cobrança no WhatsApp</h3>
                  <p className="text-xs text-slate-400">Cliente: {chargeModalUser.name} (@{chargeModalUser.username})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChargeModalUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                Telefone / WhatsApp do Cliente (Opcional)
              </label>
              <input
                type="text"
                value={chargePhone}
                onChange={e => setChargePhone(e.target.value)}
                placeholder="Ex: 11987654321 (ou deixe em branco para escolher no WhatsApp)"
                className="w-full bg-[#15151f] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Se preenchido, o chat abrirá diretamente com este número.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Mensagem Personalizada</span>
                <button
                  type="button"
                  onClick={handleCopyChargeMessage}
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  {chargeMessageCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{chargeMessageCopied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
              </label>
              <textarea
                readOnly
                rows={7}
                value={getWhatsAppMessage(chargeModalUser)}
                className="w-full bg-[#15151f] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 leading-relaxed font-sans focus:outline-none resize-none"
              />
            </div>

            {!pixKey && (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Dica:</strong> Você ainda não cadastrou sua chave PIX. Clique em <strong>Configurar PIX</strong> para inseri-la automaticamente em todas as mensagens!
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setChargeModalUser(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleCopyChargeMessage}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                {chargeMessageCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{chargeMessageCopied ? 'Copiado!' : 'Copiar'}</span>
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Gerador de Teste Rápido */}
      {quickTrialOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f17] border border-slate-700/80 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h3 className="text-base font-bold text-white">Gerador de Teste Rápido</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickTrialOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {trialSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/50 text-center space-y-1">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Teste Criado com Sucesso!</h4>
                  <p className="text-xs text-emerald-300">Válido por {trialSuccess.durationLabel}</p>
                </div>

                <div className="bg-[#141420] p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Usuário:</span>
                    <strong className="text-white font-mono">{trialSuccess.user.username}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Senha:</span>
                    <strong className="text-amber-400 font-mono">{trialSuccess.pass}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Expira em:</span>
                    <strong className="text-slate-300 font-mono">
                      {new Date(trialSuccess.user.expirationDate || '').toLocaleString('pt-BR')}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSendTrialWhatsApp}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Enviar Dados no WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyTrialData}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {trialCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{trialCopied ? 'Dados Copiados!' : 'Copiar Dados de Acesso'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={initQuickTrialData}
                    className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Criar Outro Teste
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateQuickTrial} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Duração do Teste
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { hours: 2, label: '2 Horas' },
                      { hours: 4, label: '4 Horas' },
                      { hours: 24, label: '24 Horas' },
                      { hours: 48, label: '48 Horas' },
                    ].map(d => (
                      <button
                        key={d.hours}
                        type="button"
                        onClick={() => setTrialDurationHours(d.hours)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition border cursor-pointer ${
                          trialDurationHours === d.hours
                            ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                            : 'bg-[#141420] text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Usuário
                    </label>
                    <input
                      type="text"
                      value={trialUsername}
                      onChange={e => setTrialUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      required
                      className="w-full bg-[#15151f] border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Senha
                    </label>
                    <input
                      type="text"
                      value={trialPassword}
                      onChange={e => setTrialPassword(e.target.value)}
                      required
                      className="w-full bg-[#15151f] border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome / Contato do Lead (Opcional)
                  </label>
                  <input
                    type="text"
                    value={trialName}
                    onChange={e => setTrialName(e.target.value)}
                    placeholder="Ex: Carlos WhatsApp"
                    className="w-full bg-[#15151f] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    URL de Lista M3U (Opcional)
                  </label>
                  <input
                    type="text"
                    value={trialPlaylistUrl}
                    onChange={e => setTrialPlaylistUrl(e.target.value)}
                    placeholder="Deixe em branco para lista padrão ou insira a URL"
                    className="w-full bg-[#15151f] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setQuickTrialOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTrial}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {creatingTrial ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-white" />}
                    <span>{creatingTrial ? 'Criando...' : 'Criar Teste Agora'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
