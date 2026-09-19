import React, { useState, useRef } from 'react';
import { Channel, UserAccount } from '../types';
import {
  downloadFavoritesJson,
  parseFavoritesJson,
  ParsedFavoritesBackup,
  ExportedFavoriteChannel,
} from '../utils/favoritesBackup';
import {
  Download,
  Upload,
  Star,
  FileJson,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  FolderDown,
  Info,
} from 'lucide-react';

interface FavoritesBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  currentUser?: UserAccount | null;
  onImportSuccess: (
    favoriteIds: string[],
    importedChannels: ExportedFavoriteChannel[],
    mode: 'merge' | 'replace'
  ) => { count: number; matched: number };
  accentColor?: string;
}

export const FavoritesBackupModal: React.FC<FavoritesBackupModalProps> = ({
  isOpen,
  onClose,
  channels,
  currentUser,
  onImportSuccess,
  accentColor = '#2563eb',
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<ParsedFavoritesBackup | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const favoriteChannels = channels.filter((c) => c.isFavorite);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      setNotification({
        type: 'error',
        message: 'Por favor, selecione um arquivo no formato .json.',
      });
      return;
    }

    setSelectedFileName(file.name);
    setNotification(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = parseFavoritesJson(text);
      if (result.success) {
        setParsedData(result);
        setNotification({
          type: 'info',
          message: `Arquivo analisado: ${result.totalFound} favorito(s) identificado(s). Escolha a opção de importação abaixo.`,
        });
      } else {
        setParsedData(null);
        setNotification({
          type: 'error',
          message: result.error || 'Não foi possível ler os favoritos deste arquivo.',
        });
      }
    };
    reader.onerror = () => {
      setNotification({
        type: 'error',
        message: 'Erro ao abrir o arquivo local.',
      });
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleExecuteExport = () => {
    const result = downloadFavoritesJson(channels, currentUser);
    if (result.success) {
      setNotification({
        type: 'success',
        message: `Arquivo "${result.filename}" baixado com sucesso contendo ${result.count} favorito(s)!`,
      });
    } else {
      setNotification({
        type: 'error',
        message: result.error || 'Erro ao exportar favoritos.',
      });
    }
  };

  const handleConfirmImport = () => {
    if (!parsedData || parsedData.totalFound === 0) return;

    try {
      const res = onImportSuccess(
        parsedData.favoriteIds,
        parsedData.channels,
        importMode
      );

      setNotification({
        type: 'success',
        message: `Importação concluída! ${res.matched} canal(is) ativo(s) na playlist foram marcados como favoritos (total salvo: ${res.count}).`,
      });

      setParsedData(null);
      setSelectedFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Falha ao aplicar os favoritos importados.',
      });
    }
  };

  return (
    <div
      id="favorites-backup-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="favorites-backup-modal-content"
        className="bg-[#0e121e] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/90 bg-[#121727]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: `${accentColor}25`, border: `1px solid ${accentColor}50` }}
            >
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Backup de Favoritos (JSON)</h3>
              <p className="text-xs text-slate-400">Exporte ou importe sua lista personalizada</p>
            </div>
          </div>

          <button
            id="close-favorites-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1.5 bg-[#090d17] border-b border-slate-800 text-xs font-semibold">
          <button
            id="tab-export-favorites-btn"
            onClick={() => {
              setActiveTab('export');
              setNotification(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'export'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Exportar JSON</span>
          </button>

          <button
            id="tab-import-favorites-btn"
            onClick={() => {
              setActiveTab('import');
              setNotification(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'import'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Importar JSON</span>
          </button>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`px-4 py-2.5 text-xs font-medium flex items-center gap-2 border-b ${
              notification.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : notification.type === 'error'
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Info className="w-4 h-4 shrink-0" />
            )}
            <span className="flex-1">{notification.message}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-[#121829] rounded-xl p-4 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Favoritos no momento</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {favoriteChannels.length} canal(is)
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Baixe um arquivo <strong>.JSON</strong> seguro com todos os canais que você
                  marcou com estrela. Você pode guardar esse arquivo no seu computador, celular
                  ou pendrive e utilizá-lo para restaurar seus favoritos em qualquer outro navegador.
                </p>

                {favoriteChannels.length > 0 && (
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-[11px] text-slate-400 mb-1.5 font-medium">
                      Exemplos de canais que serão exportados:
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {favoriteChannels.slice(0, 10).map((ch) => (
                        <span
                          key={ch.id}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 truncate max-w-[140px]"
                        >
                          {ch.name}
                        </span>
                      ))}
                      {favoriteChannels.length > 10 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-400">
                          +{favoriteChannels.length - 10} outros
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                id="btn-download-favorites-json"
                onClick={handleExecuteExport}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition cursor-pointer"
              >
                <FolderDown className="w-4 h-4 text-slate-950" />
                <span>Baixar Arquivo JSON de Favoritos</span>
              </button>

              <div className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
                <FileJson className="w-3.5 h-3.5" />
                <span>Formato padrão compatível com qualquer navegador e dispositivo</span>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* File Dropzone */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700/80 hover:border-slate-500 bg-[#121727]'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {selectedFileName || 'Clique ou arraste seu arquivo .JSON aqui'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Arquivo de backup de favoritos gerado anteriormente
                  </p>
                </div>
              </div>

              {/* Parsed Data Preview */}
              {parsedData && (
                <div className="bg-[#121829] rounded-xl p-4 border border-slate-800 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-400">Favoritos encontrados</span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {parsedData.totalFound} canais
                    </span>
                  </div>

                  {parsedData.exportedAt && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Data do Backup</span>
                      <span className="text-slate-200">
                        {new Date(parsedData.exportedAt).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(parsedData.exportedAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {parsedData.channels && parsedData.channels.length > 0 && (
                    <div>
                      <p className="text-[11px] text-slate-400 mb-1.5">
                        Prévia dos canais no arquivo:
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {parsedData.channels.slice(0, 8).map((c, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-[130px]"
                          >
                            {c.name}
                          </span>
                        ))}
                        {parsedData.channels.length > 8 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/60 text-slate-400">
                            +{parsedData.channels.length - 8} outros
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mode Selection */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Como aplicar os favoritos?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                          importMode === 'merge'
                            ? 'bg-blue-600/20 border-blue-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          <span>Mesclar</span>
                          <span className="text-[9px] px-1 py-0.2 bg-blue-500/30 text-blue-300 rounded">
                            Recomendado
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Mantém os favoritos atuais e adiciona os novos
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                          importMode === 'replace'
                            ? 'bg-amber-600/20 border-amber-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-bold">Substituir</div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Substitui todos os favoritos atuais por estes
                        </p>
                      </button>
                    </div>
                  </div>

                  <button
                    id="btn-confirm-import-favorites"
                    onClick={handleConfirmImport}
                    className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition cursor-pointer"
                    style={{ background: accentColor }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Aplicar {parsedData.totalFound} Favoritos</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
