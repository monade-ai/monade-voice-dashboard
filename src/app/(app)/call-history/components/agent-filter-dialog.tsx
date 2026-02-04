/**
 * AgentFilterDialog
 * Popup dialog for selecting agent(s) to filter call history.
 */

import React, { useState } from 'react';
import { Check, Search, User } from 'lucide-react';

import { useAssistants } from '@/app/hooks/use-assistants-context';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useTranslations } from '@/i18n/translations-context';

type AgentFilterDialogProps = {
  open: boolean;
  onClose: () => void;
  agentNames: string[];
  selectedAgents: string[];
  onSelect: (agents: string[]) => void;
};

const AgentFilterDialog: React.FC<AgentFilterDialogProps> = ({
  open,
  onClose,
  agentNames: _agentNames,
  selectedAgents,
  onSelect,
}) => {
  const { t } = useTranslations();
  const [search, setSearch] = useState('');
  const { assistants } = useAssistants();

  // Use assistant names from global context
  const assistantNames = assistants.map(a => a.name);

  // Filter assistant names by search
  const filteredAgents = assistantNames.filter((name) =>
    name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  // Toggle agent selection
  const toggleAgent = (name: string) => {
    if (selectedAgents.includes(name)) {
      onSelect(selectedAgents.filter((a) => a !== name));
    } else {
      onSelect([...selectedAgents, name]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-full rounded-xl p-0 overflow-hidden animate-in fade-in-0 zoom-in-95">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold text-lg">{t('callHistory.agentFilter.title')}</div>
          <button
            className="text-muted-foreground hover:text-foreground transition"
            onClick={onClose}
            aria-label={t('callHistory.agentFilter.close')}
          >
            &times;
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-center mb-3">
            <Search size={16} className="mr-2 text-muted-foreground" />
            <input
              type="text"
              className="flex-1 px-2 py-1 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
              placeholder={t('callHistory.agentFilter.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1">
            {filteredAgents.length === 0 ? (
              <div className="text-muted-foreground text-sm py-6 text-center">
                {t('callHistory.agentFilter.noAgents')}
              </div>
            ) : (
              filteredAgents.map((name) => (
                <button
                  key={name}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition group ${
                    selectedAgents.includes(name)
                      ? 'bg-amber-100 text-amber-900'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleAgent(name)}
                  tabIndex={0}
                  aria-pressed={selectedAgents.includes(name)}
                >
                  <User size={18} className="text-amber-500" />
                  <span className="flex-1 text-left">{name}</span>
                  <span
                    className={`transition-opacity duration-200 ${
                      selectedAgents.includes(name)
                        ? 'opacity-100 scale-110'
                        : 'opacity-0 scale-90'
                    }`}
                  >
                    <Check size={18} className="text-amber-600" />
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-muted text-foreground hover:bg-amber-50 transition"
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
          <button
            className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 transition"
            onClick={onClose}
          >
            {t('common.save')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentFilterDialog;
