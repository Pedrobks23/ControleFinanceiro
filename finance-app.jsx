import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, Plus, TrendingUp, TrendingDown, Calendar, PiggyBank, Users, ChevronLeft, ChevronRight, Download, Upload, Trash2, Edit3, Check, X, AlertCircle, Target, CreditCard, DollarSign, BarChart3, Settings, Home, CalendarDays, Sparkles } from 'lucide-react';

// Utility functions
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const getMonthYear = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthYear = (monthYear) => {
  const [year, month] = monthYear.split('-');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[parseInt(month) - 1]} ${year}`;
};

const addMonths = (monthYear, amount) => {
  const [year, month] = monthYear.split('-').map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return getMonthYear(date);
};

const monthDiff = (a, b) => {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (ay - by) * 12 + (am - bm);
};

// Initial data structure
const getInitialData = () => ({
  salary: 0,
  emergencyFund: { target: 0, current: 0 },
  expenses: [],
  incomes: [],
  investments: [],
  accounts: [],
  cards: [],
  financings: [],
  loans: [],
  cardPayments: [],
  categories: ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Moradia', 'Outros']
});

// Storage hook
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      const parsed = JSON.parse(item);
      const base = typeof initialValue === 'function' ? initialValue() : initialValue;
      return { ...base, ...parsed };
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

// Components
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div 
        className="relative w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-900/90 backdrop-blur px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sublabel, color = 'emerald', trend }) => {
  const colors = {
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    rose: 'from-rose-500/20 to-rose-600/10 border-rose-500/30 text-rose-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-400',
    sky: 'from-sky-500/20 to-sky-600/10 border-sky-500/30 text-sky-400',
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors[color]} border p-5 transition-all hover:scale-[1.02] hover:shadow-lg`}>
      <div className="absolute -right-4 -top-4 opacity-10">
        <Icon className="w-24 h-24" />
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-5 h-5" />
          <span className="text-sm font-medium text-slate-300">{label}</span>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(trend)}% vs mês anterior</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ExpenseForm = ({ onSubmit, onClose, initialData, categories, cards }) => {
  const [form, setForm] = useState(initialData || {
    description: '',
    amount: '',
    category: categories[0],
    type: 'single', // single, installment, fixed
    installmentValueMode: 'per', // per, total
    installments: 1,
    currentInstallment: 1,
    startMonth: getMonthYear(),
    paidByParents: false,
    paymentMethod: 'pix', // pix, card
    cardId: '',
    purchaseDay: new Date().getDate(),
    paid: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const installments = parseInt(form.installments) || 1;
    const rawAmount = parseFloat(form.amount) || 0;
    const amount = form.type === 'installment' && form.installmentValueMode === 'total'
      ? (installments > 0 ? rawAmount / installments : 0)
      : rawAmount;
    onSubmit({
      ...form,
      id: form.id || generateId(),
      amount,
      installments,
      currentInstallment: parseInt(form.currentInstallment) || 1,
      purchaseDay: parseInt(form.purchaseDay) || 1
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
        <input
          type="text"
          value={form.description}
          onChange={e => setForm({...form, description: e.target.value})}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="Ex: Netflix, Aluguel..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          {form.type === 'installment' && form.installmentValueMode === 'total' ? 'Valor total' : 'Valor'}
        </label>
        <input
          type="number"
          step="0.01"
          value={form.amount}
          onChange={e => setForm({...form, amount: e.target.value})}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="0,00"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Categoria</label>
        <select
          value={form.category}
          onChange={e => setForm({...form, category: e.target.value})}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Pagamento</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'pix', label: 'Pix', icon: DollarSign },
            { value: 'card', label: 'Cartão', icon: CreditCard }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({ ...form, paymentMethod: value, cardId: value === 'card' ? form.cardId : '' })}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                form.paymentMethod === value
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-800/30 border-white/10 text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {form.paymentMethod === 'card' && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Cartão</label>
          <select
            value={form.cardId}
            onChange={e => setForm({ ...form, cardId: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            required
          >
            <option value="" disabled>Selecione um cartão</option>
            {(cards || []).map(card => (
              <option key={card.id} value={card.id}>{card.name}</option>
            ))}
          </select>
          {(cards || []).length === 0 && (
            <p className="text-xs text-amber-400 mt-2">Cadastre um cartão em Configurações.</p>
          )}
        </div>
      )}

      {form.paymentMethod === 'card' && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Dia da compra</label>
          <input
            type="number"
            min="1"
            max="31"
            value={form.purchaseDay}
            onChange={e => setForm({ ...form, purchaseDay: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Despesa</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'single', label: 'Única', icon: DollarSign },
            { value: 'installment', label: 'Parcelada', icon: CreditCard },
            { value: 'fixed', label: 'Fixa', icon: Calendar }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({...form, type: value})}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                form.type === value 
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                  : 'bg-slate-800/30 border-white/10 text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {form.type === 'installment' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de valor</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'per', label: 'Valor da parcela' },
                { value: 'total', label: 'Valor total' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm({ ...form, installmentValueMode: option.value })}
                  className={`flex items-center justify-center gap-1 p-3 rounded-xl border transition-all ${
                    form.installmentValueMode === option.value
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-slate-800/30 border-white/10 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Parcela Atual</label>
            <input
              type="number"
              min="1"
              value={form.currentInstallment}
              onChange={e => setForm({...form, currentInstallment: e.target.value})}
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Total Parcelas</label>
            <input
              type="number"
              min="1"
              value={form.installments}
              onChange={e => setForm({...form, installments: e.target.value})}
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Mês de Início</label>
        <input
          type="month"
          value={form.startMonth}
          onChange={e => setForm({...form, startMonth: e.target.value})}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      <div className="flex items-center gap-4 py-2">
        <label
          className="flex items-center gap-3 cursor-pointer group"
          role="button"
          tabIndex={0}
          onClick={() => setForm({ ...form, paidByParents: !form.paidByParents })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setForm({ ...form, paidByParents: !form.paidByParents });
            }
          }}
        >
          <div className={`relative w-12 h-6 rounded-full transition-colors ${form.paidByParents ? 'bg-violet-500' : 'bg-slate-700'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.paidByParents ? 'translate-x-7' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm text-slate-300 group-hover:text-white transition-colors flex items-center gap-2">
            <Users className="w-4 h-4" /> Pais vão pagar
          </span>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};

const IncomeForm = ({ onSubmit, onClose, initialData }) => {
  const [form, setForm] = useState(initialData || {
    description: '',
    amount: '',
    type: 'salary', // salary, variable, other
    month: getMonthYear(),
    recurring: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      id: form.id || generateId(),
      amount: parseFloat(form.amount) || 0
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
        <input
          type="text"
          value={form.description}
          onChange={e => setForm({...form, description: e.target.value})}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="Ex: Salário, Freelance..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Valor</label>
        <input
          type="number"
          step="0.01"
          value={form.amount}
          onChange={e => setForm({...form, amount: e.target.value})}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="0,00"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Tipo</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'salary', label: 'Salário', icon: Wallet },
            { value: 'variable', label: 'Variável', icon: TrendingUp },
            { value: 'other', label: 'Outro', icon: Sparkles }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({...form, type: value})}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                form.type === value 
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                  : 'bg-slate-800/30 border-white/10 text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Mês</label>
        <input
          type="month"
          value={form.month}
          onChange={e => setForm({...form, month: e.target.value})}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      <label
        className="flex items-center gap-3 cursor-pointer group py-2"
        role="button"
        tabIndex={0}
        onClick={() => setForm({ ...form, recurring: !form.recurring })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setForm({ ...form, recurring: !form.recurring });
          }
        }}
      >
        <div className={`relative w-12 h-6 rounded-full transition-colors ${form.recurring ? 'bg-emerald-500' : 'bg-slate-700'}`}>
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.recurring ? 'translate-x-7' : 'translate-x-1'}`} />
        </div>
        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
          Renda recorrente (todo mês)
        </span>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};

const AccountForm = ({ onSubmit, onClose, initialData }) => {
  const [form, setForm] = useState(initialData || {
    name: '',
    bank: '',
    balance: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      id: form.id || generateId(),
      balance: parseFloat(form.balance) || 0
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Nome</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="Ex: Conta principal"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Banco</label>
        <input
          type="text"
          value={form.bank}
          onChange={e => setForm({ ...form, bank: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="Ex: Mercado Pago"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Saldo</label>
        <input
          type="number"
          step="0.01"
          value={form.balance}
          onChange={e => setForm({ ...form, balance: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="0,00"
          required
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};

const CardForm = ({ onSubmit, onClose, initialData }) => {
  const [form, setForm] = useState(initialData || {
    name: '',
    limit: '',
    closingDay: 1,
    dueDay: 10
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      id: form.id || generateId(),
      limit: parseFloat(form.limit) || 0,
      closingDay: parseInt(form.closingDay) || 1,
      dueDay: parseInt(form.dueDay) || 1
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Cartão</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="Ex: Nubank, Inter..."
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Limite</label>
          <input
            type="number"
            step="0.01"
            value={form.limit}
            onChange={e => setForm({ ...form, limit: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Fechamento</label>
          <input
            type="number"
            min="1"
            max="31"
            value={form.closingDay}
            onChange={e => setForm({ ...form, closingDay: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Vencimento</label>
          <input
            type="number"
            min="1"
            max="31"
            value={form.dueDay}
            onChange={e => setForm({ ...form, dueDay: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};

const CardPaymentForm = ({ onSubmit, onClose, card, initialMonth, initialAmount }) => {
  const [form, setForm] = useState({
    amount: initialAmount ? String(initialAmount) : '',
    month: initialMonth || getMonthYear()
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      id: generateId(),
      cardId: card.id,
      amount: parseFloat(form.amount) || 0,
      month: form.month
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
        <p className="text-sm text-slate-400">Cartão</p>
        <p className="text-lg font-semibold text-white">{card.name}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Valor do pagamento</label>
        <input
          type="number"
          step="0.01"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="0,00"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Mês do pagamento</label>
        <input
          type="month"
          value={form.month}
          onChange={e => setForm({ ...form, month: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all"
        >
          Registrar pagamento
        </button>
      </div>
    </form>
  );
};

const FinancingForm = ({ onSubmit, onClose, initialData }) => {
  const [form, setForm] = useState(initialData || {
    description: '',
    amount: '',
    startMonth: getMonthYear(),
    installments: 1,
    currentInstallment: 1,
    paidByParents: false,
    paid: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      id: form.id || generateId(),
      amount: parseFloat(form.amount) || 0,
      installments: parseInt(form.installments) || 1,
      currentInstallment: parseInt(form.currentInstallment) || 1
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
        <input
          type="text"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="Ex: Carro, Imóvel..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Parcela (valor mensal)</label>
        <input
          type="number"
          step="0.01"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="0,00"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Parcela Atual</label>
          <input
            type="number"
            min="1"
            value={form.currentInstallment}
            onChange={e => setForm({ ...form, currentInstallment: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Total Parcelas</label>
          <input
            type="number"
            min="1"
            value={form.installments}
            onChange={e => setForm({ ...form, installments: e.target.value })}
            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Mês de Início</label>
        <input
          type="month"
          value={form.startMonth}
          onChange={e => setForm({ ...form, startMonth: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      <div className="flex items-center gap-4 py-2">
        <label
          className="flex items-center gap-3 cursor-pointer group"
          role="button"
          tabIndex={0}
          onClick={() => setForm({ ...form, paidByParents: !form.paidByParents })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setForm({ ...form, paidByParents: !form.paidByParents });
            }
          }}
        >
          <div className={`relative w-12 h-6 rounded-full transition-colors ${form.paidByParents ? 'bg-violet-500' : 'bg-slate-700'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.paidByParents ? 'translate-x-7' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
            Pais vão pagar
          </span>
        </label>
      </div>

      <div className="flex items-center gap-4 py-2">
        <label
          className="flex items-center gap-3 cursor-pointer group"
          role="button"
          tabIndex={0}
          onClick={() => setForm({ ...form, paid: !form.paid })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setForm({ ...form, paid: !form.paid });
            }
          }}
        >
          <div className={`relative w-12 h-6 rounded-full transition-colors ${form.paid ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.paid ? 'translate-x-7' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
            Parcela paga
          </span>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};

const LoanForm = ({ onSubmit, onClose, initialData }) => {
  const [form, setForm] = useState(initialData || {
    description: '',
    amount: '',
    type: 'single', // single, installment
    installments: 1,
    currentInstallment: 1,
    startMonth: getMonthYear(),
    paidByParents: false,
    paid: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      id: form.id || generateId(),
      amount: parseFloat(form.amount) || 0,
      installments: parseInt(form.installments) || 1,
      currentInstallment: parseInt(form.currentInstallment) || 1
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
        <input
          type="text"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="Ex: Empréstimo pessoal..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Valor</label>
        <input
          type="number"
          step="0.01"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="0,00"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'single', label: 'À vista', icon: DollarSign },
            { value: 'installment', label: 'Parcelado', icon: CreditCard }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({ ...form, type: value })}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                form.type === value
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-800/30 border-white/10 text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {form.type === 'installment' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Parcela Atual</label>
            <input
              type="number"
              min="1"
              value={form.currentInstallment}
              onChange={e => setForm({ ...form, currentInstallment: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Total Parcelas</label>
            <input
              type="number"
              min="1"
              value={form.installments}
              onChange={e => setForm({ ...form, installments: e.target.value })}
              className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Mês de Início</label>
        <input
          type="month"
          value={form.startMonth}
          onChange={e => setForm({ ...form, startMonth: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      <div className="flex items-center gap-4 py-2">
        <label
          className="flex items-center gap-3 cursor-pointer group"
          role="button"
          tabIndex={0}
          onClick={() => setForm({ ...form, paidByParents: !form.paidByParents })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setForm({ ...form, paidByParents: !form.paidByParents });
            }
          }}
        >
          <div className={`relative w-12 h-6 rounded-full transition-colors ${form.paidByParents ? 'bg-violet-500' : 'bg-slate-700'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.paidByParents ? 'translate-x-7' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
            Pais vão pagar
          </span>
        </label>
      </div>

      <div className="flex items-center gap-4 py-2">
        <label
          className="flex items-center gap-3 cursor-pointer group"
          role="button"
          tabIndex={0}
          onClick={() => setForm({ ...form, paid: !form.paid })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setForm({ ...form, paid: !form.paid });
            }
          }}
        >
          <div className={`relative w-12 h-6 rounded-full transition-colors ${form.paid ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.paid ? 'translate-x-7' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
            Parcela paga
          </span>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};

const InvestmentForm = ({ onSubmit, onClose, initialData }) => {
  const [form, setForm] = useState(initialData || {
    description: '',
    amount: '',
    type: 'deposit', // deposit, withdrawal, yield
    month: getMonthYear()
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      id: form.id || generateId(),
      amount: parseFloat(form.amount) || 0
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
        <input
          type="text"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="Ex: Tesouro Selic, Ações..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Valor</label>
        <input
          type="number"
          step="0.01"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="0,00"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Tipo</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'deposit', label: 'Aporte', icon: TrendingUp },
            { value: 'withdrawal', label: 'Resgate', icon: TrendingDown },
            { value: 'yield', label: 'Rendimento', icon: Sparkles }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({ ...form, type: value })}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                form.type === value
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-800/30 border-white/10 text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Mês</label>
        <input
          type="month"
          value={form.month}
          onChange={e => setForm({ ...form, month: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};

const EmergencyFundForm = ({ onSubmit, onClose }) => {
  const [form, setForm] = useState({
    amount: '',
    type: 'deposit' // deposit, withdrawal
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      amount: parseFloat(form.amount) || 0,
      type: form.type
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Valor</label>
        <input
          type="number"
          step="0.01"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          placeholder="0,00"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'deposit', label: 'Aporte', icon: TrendingUp },
            { value: 'withdrawal', label: 'Retirada', icon: TrendingDown }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({ ...form, type: value })}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                form.type === value
                  ? 'bg-violet-500/20 border-violet-500/50 text-violet-400'
                  : 'bg-slate-800/30 border-white/10 text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-500 to-violet-600 rounded-xl text-white font-medium hover:from-violet-600 hover:to-violet-700 transition-all"
        >
          Salvar
        </button>
      </div>
    </form>
  );
};

const MonthCloseForm = ({ balance, month, onSubmit, onClose }) => {
  const [destination, setDestination] = useState('keep'); // keep, investment, emergency
  const available = Math.max(0, balance);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ destination, amount: available, month });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl bg-slate-800/50 border border-white/10 p-4">
        <p className="text-sm text-slate-400">Saldo do mês</p>
        <p className={`text-2xl font-semibold ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatCurrency(balance)}
        </p>
        {balance < 0 && (
          <p className="text-xs text-slate-500 mt-2">
            Saldo negativo: só é possível manter em conta.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Destino</label>
        <div className="space-y-2">
          {[
            { value: 'keep', label: 'Manter em conta' },
            { value: 'investment', label: 'Adicionar a investimentos' },
            { value: 'emergency', label: 'Adicionar à reserva de emergência' }
          ].map(option => (
            <button
              key={option.value}
              type="button"
              disabled={balance < 0 && option.value !== 'keep'}
              onClick={() => setDestination(option.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                destination === option.value
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-800/30 border-white/10 text-slate-400 hover:bg-slate-800/50'
              } ${balance < 0 && option.value !== 'keep' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all"
        >
          Aplicar
        </button>
      </div>
    </form>
  );
};

const ExpenseCard = ({ expense, onEdit, onDelete, onTogglePaid, currentMonth, cards }) => {
  const cardName = expense.paymentMethod === 'card'
    ? (cards || []).find(card => card.id === expense.cardId)?.name
    : null;
  const installmentInfo = expense.type === 'installment' 
    ? (() => {
        const monthsDiff = (parseInt(currentMonth.split('-')[0]) - parseInt(expense.startMonth.split('-')[0])) * 12 
          + (parseInt(currentMonth.split('-')[1]) - parseInt(expense.startMonth.split('-')[1]));
        const currentInst = expense.currentInstallment + monthsDiff;
        return currentInst <= expense.installments ? `${currentInst}/${expense.installments}` : null;
      })()
    : null;

  return (
    <div className={`group relative overflow-hidden rounded-xl border transition-all hover:scale-[1.01] ${
      expense.paid 
        ? 'bg-slate-800/30 border-slate-700/50' 
        : expense.paidByParents 
          ? 'bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30'
          : 'bg-slate-800/50 border-white/10'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-medium ${expense.paid ? 'text-slate-500 line-through' : 'text-white'}`}>
                {expense.description}
              </h4>
              {expense.paidByParents && (
                <span className="px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-300 rounded-full flex items-center gap-1">
                  <Users className="w-3 h-3" /> Pais
                </span>
              )}
              {expense.type === 'fixed' && (
                <span className="px-2 py-0.5 text-xs font-medium bg-sky-500/20 text-sky-300 rounded-full">
                  Fixa
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span>{expense.category}</span>
              {expense.paymentMethod === 'pix' && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <DollarSign className="w-3 h-3" />
                  Pix
                </span>
              )}
              {expense.paymentMethod === 'card' && (
                <span className="flex items-center gap-1 text-amber-400">
                  <CreditCard className="w-3 h-3" />
                  {cardName || 'Cartão'}
                </span>
              )}
              {installmentInfo && (
                <span className="flex items-center gap-1 text-amber-400">
                  <CreditCard className="w-3 h-3" />
                  {installmentInfo}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-semibold ${expense.paid ? 'text-slate-500' : 'text-rose-400'}`}>
              {formatCurrency(expense.amount)}
            </p>
          </div>
        </div>
      </div>
      
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onTogglePaid(expense.id)}
          className={`p-2 rounded-lg transition-colors ${expense.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={() => onEdit(expense)}
          className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(expense.id)}
          className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Main App
export default function FinanceApp() {
  const [data, setData] = useLocalStorage('finance-app-data', getInitialData());
  const [currentMonth, setCurrentMonth] = useState(getMonthYear());
  const [view, setView] = useState('dashboard'); // dashboard, monthly, annual, cards, settings
  const [modal, setModal] = useState({ type: null, data: null });
  
  // Calculate expenses for a specific month
  const expenseAppliesToMonth = (exp, month) => {
    if (exp.type === 'single') {
      return exp.startMonth === month;
    }
    if (exp.type === 'fixed') {
      return exp.startMonth <= month;
    }
    if (exp.type === 'installment') {
      const startDate = new Date(exp.startMonth + '-01');
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + exp.installments - 1);
      const checkDate = new Date(month + '-01');
      return checkDate >= startDate && checkDate <= endDate;
    }
    return false;
  };

  const getExpensesForMonth = (month) => {
    return data.expenses.filter(exp => {
      return expenseAppliesToMonth(exp, month);
    });
  };

  // Calculate incomes for a specific month
  const getIncomesForMonth = (month) => {
    return data.incomes.filter(inc => {
      if (inc.recurring) return inc.month <= month;
      return inc.month === month;
    });
  };

  const getInvestmentsForMonth = (month) => {
    return data.investments.filter(inv => inv.month === month);
  };

  const getFinancingsForMonth = (month) => {
    return data.financings.filter(fin => {
      const startDate = new Date(fin.startMonth + '-01');
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + fin.installments - 1);
      const checkDate = new Date(month + '-01');
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const getLoansForMonth = (month) => {
    return data.loans.filter(loan => {
      if (loan.type === 'single') {
        return loan.startMonth === month;
      }
      const startDate = new Date(loan.startMonth + '-01');
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + loan.installments - 1);
      const checkDate = new Date(month + '-01');
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const getCardStatementsForMonth = (month) => {
    return data.cards.map(card => {
      const cardExpenses = data.expenses
        .filter(exp => exp.paymentMethod === 'card' && exp.cardId === card.id)
        .filter(exp => {
          const purchaseDay = exp.purchaseDay || 1;
          const shift = purchaseDay > card.closingDay ? 1 : 0;
          const effectiveMonth = addMonths(month, -shift);
          return expenseAppliesToMonth(exp, effectiveMonth);
        });
      const total = cardExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const parentsTotal = cardExpenses
        .filter(exp => exp.paidByParents)
        .reduce((sum, exp) => sum + exp.amount, 0);
      const payments = data.cardPayments
        .filter(payment => payment.cardId === card.id && payment.month === month)
        .reduce((sum, payment) => sum + payment.amount, 0);
      const due = Math.max(0, total - payments);
      return { card, total, parentsTotal, payments, due };
    });
  };

  const getCardOutstanding = (cardId, month) => {
    const card = data.cards.find(c => c.id === cardId);
    if (!card) return 0;
    const cardExpenses = data.expenses
      .filter(exp => exp.paymentMethod === 'card' && exp.cardId === cardId);
    const totalCharges = cardExpenses.reduce((sum, exp) => {
      const purchaseDay = exp.purchaseDay || 1;
      const shift = purchaseDay > card.closingDay ? 1 : 0;
      const statementStart = addMonths(exp.startMonth, shift);
      const monthsDiff = monthDiff(month, statementStart);
      let remainingCount = 0;
      if (exp.type === 'installment') {
        const totalRemaining = Math.max(0, exp.installments - (exp.currentInstallment - 1));
        const monthsPassed = Math.max(0, monthsDiff);
        remainingCount = Math.max(0, totalRemaining - monthsPassed);
      } else {
        remainingCount = monthsDiff <= 0 ? 1 : 0;
      }
      return sum + (remainingCount * exp.amount);
    }, 0);
    const totalPayments = data.cardPayments
      .filter(payment => payment.cardId === cardId && payment.month >= month)
      .reduce((sum, payment) => sum + payment.amount, 0);
    return Math.max(0, totalCharges - totalPayments);
  };

  // Monthly calculations
  const monthlyData = useMemo(() => {
    const expenses = getExpensesForMonth(currentMonth);
    const incomes = getIncomesForMonth(currentMonth);
    const investments = getInvestmentsForMonth(currentMonth);
    const financings = getFinancingsForMonth(currentMonth);
    const loans = getLoansForMonth(currentMonth);
    const cardStatements = getCardStatementsForMonth(currentMonth);
    
    const financingTotal = financings.reduce((sum, fin) => sum + (fin.paid ? 0 : fin.amount), 0);
    const nonCardExpenses = expenses.filter(exp => exp.paymentMethod !== 'card');
    const cardStatementsTotal = cardStatements.reduce((sum, s) => sum + s.due, 0);
    const loanTotal = loans.reduce((sum, loan) => sum + (loan.paid ? 0 : loan.amount), 0);
    const totalExpenses = nonCardExpenses.reduce((sum, exp) => sum + (exp.paid ? 0 : exp.amount), 0)
      + financingTotal
      + loanTotal
      + cardStatementsTotal;
    const paidByParents = nonCardExpenses.filter(e => e.paidByParents).reduce((sum, e) => sum + (e.paid ? 0 : e.amount), 0)
      + financings.filter(f => f.paidByParents).reduce((sum, f) => sum + (f.paid ? 0 : f.amount), 0)
      + loans.filter(l => l.paidByParents).reduce((sum, l) => sum + (l.paid ? 0 : l.amount), 0)
      + cardStatements.reduce((sum, s) => sum + s.parentsTotal, 0);
    const myExpenses = totalExpenses - paidByParents;
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const investmentDeposits = investments
      .filter(inv => inv.type === 'deposit')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const investmentWithdrawals = investments
      .filter(inv => inv.type === 'withdrawal')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const investmentYield = investments
      .filter(inv => inv.type === 'yield')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const investmentNet = investmentWithdrawals + investmentYield - investmentDeposits;
    const balance = totalIncome - myExpenses + investmentNet;
    const invested = investmentDeposits;
    const withdrawn = investmentWithdrawals;
    const yieldTotal = investmentYield;
    
    const pendingInstallments = data.expenses
      .filter(e => e.type === 'installment')
      .reduce((sum, e) => {
        const remaining = e.installments - e.currentInstallment + 1;
        return sum + (remaining * e.amount);
      }, 0);

    return {
      expenses,
      incomes,
      investments,
      financings,
      loans,
      cardStatements,
      totalExpenses,
      paidByParents,
      myExpenses,
      totalIncome,
      balance,
      invested,
      withdrawn,
      yieldTotal,
      investmentNet,
      financingTotal,
      loanTotal,
      pendingInstallments
    };
  }, [data, currentMonth]);

  const accountTotal = useMemo(() => {
    return data.accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [data.accounts]);

  const cardUsedTotal = useMemo(() => {
    return data.cards.reduce((sum, card) => sum + getCardOutstanding(card.id, currentMonth), 0);
  }, [data.cards, currentMonth, data.expenses, data.cardPayments]);

  const cardLimitTotal = useMemo(() => {
    return data.cards.reduce((sum, card) => sum + (card.limit || 0), 0);
  }, [data.cards]);

  // Annual data
  const annualData = useMemo(() => {
    const year = currentMonth.split('-')[0];
    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    
    return months.map(month => {
      const expenses = getExpensesForMonth(month);
      const incomes = getIncomesForMonth(month);
      return {
        month,
        expenses: expenses.reduce((s, e) => s + e.amount, 0),
        income: incomes.reduce((s, i) => s + i.amount, 0)
      };
    });
  }, [data, currentMonth]);

  // Handlers
  const handleSaveExpense = (expense) => {
    setData(prev => ({
      ...prev,
      expenses: expense.id && prev.expenses.find(e => e.id === expense.id)
        ? prev.expenses.map(e => e.id === expense.id ? expense : e)
        : [...prev.expenses, expense]
    }));
  };

  const handleDeleteExpense = (id) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.filter(e => e.id !== id)
    }));
  };

  const handleTogglePaid = (id) => {
    setData(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === id ? { ...e, paid: !e.paid } : e)
    }));
  };

  const handleSaveIncome = (income) => {
    setData(prev => ({
      ...prev,
      incomes: income.id && prev.incomes.find(i => i.id === income.id)
        ? prev.incomes.map(i => i.id === income.id ? income : i)
        : [...prev.incomes, income]
    }));
  };

  const handleDeleteIncome = (id) => {
    setData(prev => ({
      ...prev,
      incomes: prev.incomes.filter(i => i.id !== id)
    }));
  };

  const handleSaveAccount = (account) => {
    setData(prev => ({
      ...prev,
      accounts: account.id && prev.accounts.find(a => a.id === account.id)
        ? prev.accounts.map(a => a.id === account.id ? account : a)
        : [...prev.accounts, account]
    }));
  };

  const handleDeleteAccount = (id) => {
    setData(prev => ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== id)
    }));
  };

  const handleSaveCard = (card) => {
    setData(prev => ({
      ...prev,
      cards: card.id && prev.cards.find(c => c.id === card.id)
        ? prev.cards.map(c => c.id === card.id ? card : c)
        : [...prev.cards, card]
    }));
  };

  const handleDeleteCard = (id) => {
    setData(prev => ({
      ...prev,
      cards: prev.cards.filter(c => c.id !== id)
    }));
  };

  const handleSaveCardPayment = (payment) => {
    if (!payment.amount) return;
    setData(prev => ({
      ...prev,
      cardPayments: [...prev.cardPayments, payment]
    }));
  };

  const handleSaveFinancing = (financing) => {
    setData(prev => ({
      ...prev,
      financings: financing.id && prev.financings.find(f => f.id === financing.id)
        ? prev.financings.map(f => f.id === financing.id ? financing : f)
        : [...prev.financings, financing]
    }));
  };

  const handleDeleteFinancing = (id) => {
    setData(prev => ({
      ...prev,
      financings: prev.financings.filter(f => f.id !== id)
    }));
  };

  const handleToggleFinancingPaid = (id) => {
    setData(prev => ({
      ...prev,
      financings: prev.financings.map(f => f.id === id ? { ...f, paid: !f.paid } : f)
    }));
  };

  const handleSaveLoan = (loan) => {
    setData(prev => ({
      ...prev,
      loans: loan.id && prev.loans.find(l => l.id === loan.id)
        ? prev.loans.map(l => l.id === loan.id ? loan : l)
        : [...prev.loans, loan]
    }));
  };

  const handleDeleteLoan = (id) => {
    setData(prev => ({
      ...prev,
      loans: prev.loans.filter(l => l.id !== id)
    }));
  };

  const handleToggleLoanPaid = (id) => {
    setData(prev => ({
      ...prev,
      loans: prev.loans.map(l => l.id === id ? { ...l, paid: !l.paid } : l)
    }));
  };

  const handlePayCardStatement = (card, month, amount) => {
    if (!amount) return;
    handleSaveCardPayment({
      id: generateId(),
      cardId: card.id,
      amount,
      month
    });
  };

  const handleSaveInvestment = (investment) => {
    setData(prev => ({
      ...prev,
      investments: investment.id && prev.investments.find(i => i.id === investment.id)
        ? prev.investments.map(i => i.id === investment.id ? investment : i)
        : [...prev.investments, investment]
    }));
  };

  const handleDeleteInvestment = (id) => {
    setData(prev => ({
      ...prev,
      investments: prev.investments.filter(i => i.id !== id)
    }));
  };

  const handleUpdateEmergencyFund = ({ amount, type }) => {
    if (!amount) return;
    const delta = type === 'withdrawal' ? -amount : amount;
    setData(prev => ({
      ...prev,
      emergencyFund: {
        ...prev.emergencyFund,
        current: Math.max(0, prev.emergencyFund.current + delta)
      }
    }));
  };

  const handleCloseMonth = ({ destination, amount, month }) => {
    if (amount <= 0) return;
    if (destination === 'investment') {
      handleSaveInvestment({
        id: generateId(),
        description: `Saldo de ${formatMonthYear(month)}`,
        amount,
        type: 'deposit',
        month
      });
    }
    if (destination === 'emergency') {
      handleUpdateEmergencyFund({ amount, type: 'deposit' });
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financas-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          setData(imported);
        } catch (err) {
          alert('Erro ao importar arquivo');
        }
      };
      reader.readAsText(file);
    }
  };

  const emergencyProgress = data.emergencyFund.target > 0 
    ? (data.emergencyFund.current / data.emergencyFund.target) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-violet-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative sticky top-0 z-40 backdrop-blur-xl bg-slate-900/70 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Minhas Finanças
                </h1>
                <p className="text-xs text-slate-500">Controle total do seu dinheiro</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                title="Exportar dados"
              >
                <Download className="w-5 h-5" />
              </button>
              <label className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white cursor-pointer" title="Importar dados">
                <Upload className="w-5 h-5" />
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="relative sticky top-[73px] z-30 backdrop-blur-xl bg-slate-900/50 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {[
              { id: 'dashboard', label: 'Início', icon: Home },
              { id: 'monthly', label: 'Mensal', icon: Calendar },
              { id: 'annual', label: 'Anual', icon: BarChart3 },
              { id: 'cards', label: 'Cartões', icon: CreditCard },
              { id: 'settings', label: 'Config', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  view === id 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-6xl mx-auto px-4 py-6 pb-24">
        {/* Month Navigation */}
        {(view === 'dashboard' || view === 'monthly') && (
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold min-w-[200px] text-center">
              {formatMonthYear(currentMonth)}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={TrendingUp}
                label="Receitas"
                value={formatCurrency(monthlyData.totalIncome)}
                color="emerald"
              />
              <StatCard
                icon={TrendingDown}
                label="Despesas"
                value={formatCurrency(monthlyData.myExpenses)}
                sublabel={monthlyData.paidByParents > 0 ? `+ ${formatCurrency(monthlyData.paidByParents)} (pais)` : null}
                color="rose"
              />
              <StatCard
                icon={Wallet}
                label="Saldo"
                value={formatCurrency(monthlyData.balance)}
                color={monthlyData.balance >= 0 ? 'emerald' : 'rose'}
              />
              <StatCard
                icon={CreditCard}
                label="Parcelamentos"
                value={formatCurrency(monthlyData.pendingInstallments)}
                sublabel="Total a pagar"
                color="amber"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={Wallet}
                label="Saldo em Contas"
                value={formatCurrency(accountTotal)}
                color="sky"
              />
              <StatCard
                icon={CreditCard}
                label="Cartões (usado/limite)"
                value={`${formatCurrency(cardUsedTotal)} / ${formatCurrency(cardLimitTotal)}`}
                color="amber"
              />
            </div>

            {/* Emergency Fund */}
            <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-violet-400" />
                  <span className="font-medium">Reserva de Emergência</span>
                </div>
                <span className="text-sm text-slate-400">
                  {formatCurrency(data.emergencyFund.current)} / {formatCurrency(data.emergencyFund.target)}
                </span>
              </div>
              <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(emergencyProgress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">{emergencyProgress.toFixed(1)}% completo</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => setModal({ type: 'expense', data: null })}
                className="flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-rose-500/20 to-rose-600/10 border border-rose-500/30 text-rose-400 hover:from-rose-500/30 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Nova Despesa</span>
              </button>
              <button
                onClick={() => setModal({ type: 'income', data: null })}
                className="flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 text-emerald-400 hover:from-emerald-500/30 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Nova Receita</span>
              </button>
              <button
                onClick={() => setModal({ type: 'investment', data: null })}
                className="flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-sky-500/20 to-sky-600/10 border border-sky-500/30 text-sky-400 hover:from-sky-500/30 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Novo Investimento</span>
              </button>
              <button
                onClick={() => setModal({ type: 'emergency', data: null })}
                className="flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-violet-500/20 to-violet-600/10 border border-violet-500/30 text-violet-400 hover:from-violet-500/30 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Reserva de Emergência</span>
              </button>
            </div>

            {/* Recent Expenses */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-slate-400" />
                Despesas do Mês
              </h3>
              <div className="space-y-2">
                {monthlyData.expenses.filter(e => e.paymentMethod !== 'card').length === 0
                  && monthlyData.financings.length === 0
                  && monthlyData.loans.length === 0
                  && monthlyData.cardStatements.filter(s => s.due > 0).length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma despesa este mês</p>
                  </div>
                ) : (
                  <>
                    {monthlyData.expenses
                      .filter(expense => expense.paymentMethod !== 'card')
                      .map(expense => (
                        <ExpenseCard
                          key={expense.id}
                          expense={expense}
                          currentMonth={currentMonth}
                          cards={data.cards}
                          onEdit={(exp) => setModal({ type: 'expense', data: exp })}
                          onDelete={handleDeleteExpense}
                          onTogglePaid={handleTogglePaid}
                        />
                      ))}
                    {monthlyData.financings.map(financing => {
                      const monthsDiff = (parseInt(currentMonth.split('-')[0]) - parseInt(financing.startMonth.split('-')[0])) * 12
                        + (parseInt(currentMonth.split('-')[1]) - parseInt(financing.startMonth.split('-')[1]));
                      const currentInst = financing.currentInstallment + monthsDiff;
                      return (
                        <div
                          key={financing.id}
                          className={`group relative rounded-xl border p-4 transition-all ${
                            financing.paid ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-800/50 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-medium ${financing.paid ? 'text-slate-500 line-through' : 'text-white'}`}>
                                  {financing.description}
                                </h4>
                                {financing.paidByParents && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-300 rounded-full flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Pais
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-slate-400">
                                Financiamento · Parcela {Math.min(currentInst, financing.installments)}/{financing.installments}
                              </span>
                            </div>
                            <span className={`text-lg font-semibold ${financing.paid ? 'text-slate-500' : 'text-amber-400'}`}>
                              {formatCurrency(financing.amount)}
                            </span>
                          </div>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleToggleFinancingPaid(financing.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                financing.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setModal({ type: 'financing', data: financing })}
                              className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteFinancing(financing.id)}
                              className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {monthlyData.loans.map(loan => {
                      const monthsDiff = (parseInt(currentMonth.split('-')[0]) - parseInt(loan.startMonth.split('-')[0])) * 12
                        + (parseInt(currentMonth.split('-')[1]) - parseInt(loan.startMonth.split('-')[1]));
                      const currentInst = loan.type === 'installment'
                        ? loan.currentInstallment + monthsDiff
                        : null;
                      return (
                        <div
                          key={loan.id}
                          className={`group relative rounded-xl border p-4 transition-all ${
                            loan.paid ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-800/50 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`font-medium ${loan.paid ? 'text-slate-500 line-through' : 'text-white'}`}>
                                  {loan.description}
                                </h4>
                                {loan.paidByParents && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-300 rounded-full flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Pais
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-slate-400">
                                Empréstimo{currentInst ? ` · Parcela ${Math.min(currentInst, loan.installments)}/${loan.installments}` : ' · À vista'}
                              </span>
                            </div>
                            <span className={`text-lg font-semibold ${loan.paid ? 'text-slate-500' : 'text-amber-400'}`}>
                              {formatCurrency(loan.amount)}
                            </span>
                          </div>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleToggleLoanPaid(loan.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                loan.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setModal({ type: 'loan', data: loan })}
                              className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLoan(loan.id)}
                              className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {monthlyData.cardStatements
                      .filter(statement => statement.due > 0)
                      .map(statement => (
                        <div
                          key={statement.card.id}
                          className="group relative rounded-xl bg-slate-800/50 border border-white/10 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-white">{statement.card.name}</h4>
                              <span className="text-sm text-slate-400">
                                Fatura do mês · Fecha dia {statement.card.closingDay} · Vence dia {statement.card.dueDay}
                              </span>
                            </div>
                            <span className="text-lg font-semibold text-amber-400">
                              {formatCurrency(statement.due)}
                            </span>
                          </div>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handlePayCardStatement(statement.card, currentMonth, statement.due)}
                              className="p-2 bg-emerald-500/20 text-emerald-400 hover:text-white rounded-lg transition-colors"
                              title="Pagar fatura"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setModal({ type: 'card-payment', data: { card: statement.card, amount: statement.due } })}
                              className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                              title="Pagar parte"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Monthly View */}
        {view === 'monthly' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setModal({ type: 'close-month', data: null })}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
              >
                <Check className="w-4 h-4" />
                Fechar mês
              </button>
            </div>
            {/* Category breakdown */}
            <div className="rounded-2xl bg-slate-800/30 border border-white/10 p-5">
              <h3 className="font-semibold mb-4">Despesas por Categoria</h3>
              <div className="space-y-3">
                {data.categories.map(category => {
                  const categoryTotal = monthlyData.expenses
                    .filter(e => e.category === category)
                    .reduce((s, e) => s + e.amount, 0);
                  const percentage = monthlyData.totalExpenses > 0 
                    ? (categoryTotal / monthlyData.totalExpenses) * 100 
                    : 0;
                  
                  if (categoryTotal === 0) return null;
                  
                  return (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">{category}</span>
                        <span className="text-slate-400">{formatCurrency(categoryTotal)}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* All Expenses */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Todas as Despesas</h3>
                <button
                  onClick={() => setModal({ type: 'expense', data: null })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {monthlyData.expenses
                  .filter(expense => expense.paymentMethod !== 'card')
                  .map(expense => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      currentMonth={currentMonth}
                      cards={data.cards}
                      onEdit={(exp) => setModal({ type: 'expense', data: exp })}
                      onDelete={handleDeleteExpense}
                      onTogglePaid={handleTogglePaid}
                    />
                  ))}
                {monthlyData.financings.map(financing => {
                  const monthsDiff = (parseInt(currentMonth.split('-')[0]) - parseInt(financing.startMonth.split('-')[0])) * 12
                    + (parseInt(currentMonth.split('-')[1]) - parseInt(financing.startMonth.split('-')[1]));
                  const currentInst = financing.currentInstallment + monthsDiff;
                  return (
                    <div
                      key={financing.id}
                      className={`group relative rounded-xl border p-4 transition-all ${
                        financing.paid ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-800/50 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium ${financing.paid ? 'text-slate-500 line-through' : 'text-white'}`}>
                              {financing.description}
                            </h4>
                            {financing.paidByParents && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-300 rounded-full flex items-center gap-1">
                                <Users className="w-3 h-3" /> Pais
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-slate-400">
                            Financiamento · Parcela {Math.min(currentInst, financing.installments)}/{financing.installments}
                          </span>
                        </div>
                        <span className={`text-lg font-semibold ${financing.paid ? 'text-slate-500' : 'text-amber-400'}`}>
                          {formatCurrency(financing.amount)}
                        </span>
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleToggleFinancingPaid(financing.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            financing.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setModal({ type: 'financing', data: financing })}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFinancing(financing.id)}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {monthlyData.loans.map(loan => {
                  const monthsDiff = (parseInt(currentMonth.split('-')[0]) - parseInt(loan.startMonth.split('-')[0])) * 12
                    + (parseInt(currentMonth.split('-')[1]) - parseInt(loan.startMonth.split('-')[1]));
                  const currentInst = loan.type === 'installment'
                    ? loan.currentInstallment + monthsDiff
                    : null;
                  return (
                    <div
                      key={loan.id}
                      className={`group relative rounded-xl border p-4 transition-all ${
                        loan.paid ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-800/50 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium ${loan.paid ? 'text-slate-500 line-through' : 'text-white'}`}>
                              {loan.description}
                            </h4>
                            {loan.paidByParents && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-300 rounded-full flex items-center gap-1">
                                <Users className="w-3 h-3" /> Pais
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-slate-400">
                            Empréstimo{currentInst ? ` · Parcela ${Math.min(currentInst, loan.installments)}/${loan.installments}` : ' · À vista'}
                          </span>
                        </div>
                        <span className={`text-lg font-semibold ${loan.paid ? 'text-slate-500' : 'text-amber-400'}`}>
                          {formatCurrency(loan.amount)}
                        </span>
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleToggleLoanPaid(loan.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            loan.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setModal({ type: 'loan', data: loan })}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLoan(loan.id)}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {monthlyData.cardStatements
                  .filter(statement => statement.due > 0)
                  .map(statement => (
                    <div
                      key={statement.card.id}
                      className="group relative rounded-xl bg-slate-800/50 border border-white/10 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-white">{statement.card.name}</h4>
                          <span className="text-sm text-slate-400">
                            Fatura do mês · Fecha dia {statement.card.closingDay} · Vence dia {statement.card.dueDay}
                          </span>
                        </div>
                        <span className="text-lg font-semibold text-amber-400">
                          {formatCurrency(statement.due)}
                        </span>
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePayCardStatement(statement.card, currentMonth, statement.due)}
                          className="p-2 bg-emerald-500/20 text-emerald-400 hover:text-white rounded-lg transition-colors"
                          title="Pagar fatura"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setModal({ type: 'card-payment', data: { card: statement.card, amount: statement.due } })}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                          title="Pagar parte"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Incomes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Receitas</h3>
                <button
                  onClick={() => setModal({ type: 'income', data: null })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {monthlyData.incomes.map(income => (
                  <div
                    key={income.id}
                    className="group relative rounded-xl bg-slate-800/50 border border-white/10 p-4 hover:scale-[1.01] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">{income.description}</h4>
                        <span className="text-sm text-slate-400">
                          {income.type === 'salary' ? 'Salário' : income.type === 'variable' ? 'Variável' : 'Outro'}
                          {income.recurring && ' • Recorrente'}
                        </span>
                      </div>
                      <span className="text-lg font-semibold text-emerald-400">
                        {formatCurrency(income.amount)}
                      </span>
                    </div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setModal({ type: 'income', data: income })}
                        className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteIncome(income.id)}
                        className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Investments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Investimentos</h3>
                <button
                  onClick={() => setModal({ type: 'investment', data: null })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 text-sm hover:bg-sky-500/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {monthlyData.investments.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum investimento neste mês</p>
                  </div>
                ) : (
                  monthlyData.investments.map(investment => (
                    <div
                      key={investment.id}
                      className="group relative rounded-xl bg-slate-800/50 border border-white/10 p-4 hover:scale-[1.01] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-white">{investment.description}</h4>
                          <span className="text-sm text-slate-400">
                            {investment.type === 'deposit'
                              ? 'Aporte'
                              : investment.type === 'withdrawal'
                                ? 'Resgate'
                                : 'Rendimento'}
                          </span>
                        </div>
                        <span className={`text-lg font-semibold ${
                          investment.type === 'withdrawal' ? 'text-emerald-400' : 'text-sky-400'
                        }`}>
                          {formatCurrency(investment.amount)}
                        </span>
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModal({ type: 'investment', data: investment })}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvestment(investment.id)}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Financings */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Financiamentos</h3>
                <button
                  onClick={() => setModal({ type: 'financing', data: null })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {monthlyData.financings.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum financiamento neste mês</p>
                  </div>
                ) : (
                  monthlyData.financings.map(financing => {
                    const monthsDiff = (parseInt(currentMonth.split('-')[0]) - parseInt(financing.startMonth.split('-')[0])) * 12
                      + (parseInt(currentMonth.split('-')[1]) - parseInt(financing.startMonth.split('-')[1]));
                    const currentInst = financing.currentInstallment + monthsDiff;
                    return (
                      <div
                        key={financing.id}
                        className={`group relative rounded-xl border p-4 transition-all ${
                          financing.paid ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-800/50 border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className={`font-medium ${financing.paid ? 'text-slate-500 line-through' : 'text-white'}`}>
                              {financing.description}
                            </h4>
                            <span className="text-sm text-slate-400">
                              Parcela {Math.min(currentInst, financing.installments)}/{financing.installments}
                            </span>
                          </div>
                          <span className={`text-lg font-semibold ${financing.paid ? 'text-slate-500' : 'text-amber-400'}`}>
                            {formatCurrency(financing.amount)}
                          </span>
                        </div>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleToggleFinancingPaid(financing.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              financing.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setModal({ type: 'financing', data: financing })}
                            className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFinancing(financing.id)}
                            className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Annual View */}
        {view === 'annual' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-center">
              Visão Anual - {currentMonth.split('-')[0]}
            </h2>
            
            {/* Year summary */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={TrendingUp}
                label="Total Receitas"
                value={formatCurrency(annualData.reduce((s, m) => s + m.income, 0))}
                color="emerald"
              />
              <StatCard
                icon={TrendingDown}
                label="Total Despesas"
                value={formatCurrency(annualData.reduce((s, m) => s + m.expenses, 0))}
                color="rose"
              />
            </div>

            {/* Monthly breakdown chart */}
            <div className="rounded-2xl bg-slate-800/30 border border-white/10 p-5">
              <h3 className="font-semibold mb-4">Evolução Mensal</h3>
              <div className="space-y-3">
                {annualData.map(({ month, income, expenses }) => {
                  const maxValue = Math.max(...annualData.map(m => Math.max(m.income, m.expenses)));
                  const incomeWidth = maxValue > 0 ? (income / maxValue) * 100 : 0;
                  const expenseWidth = maxValue > 0 ? (expenses / maxValue) * 100 : 0;
                  const [, m] = month.split('-');
                  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  
                  return (
                    <div key={month} className="group">
                      <div className="flex items-center gap-3">
                        <span className="w-8 text-xs text-slate-500">{monthNames[parseInt(m) - 1]}</span>
                        <div className="flex-1 space-y-1">
                          <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all group-hover:from-emerald-400"
                              style={{ width: `${incomeWidth}%` }}
                            />
                          </div>
                          <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all group-hover:from-rose-400"
                              style={{ width: `${expenseWidth}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right text-xs w-24">
                          <div className="text-emerald-400">{formatCurrency(income)}</div>
                          <div className="text-rose-400">{formatCurrency(expenses)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Future months preview */}
            <div className="rounded-2xl bg-slate-800/30 border border-white/10 p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                Próximos Meses (Despesas Previstas)
              </h3>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map(i => {
                  const futureMonth = addMonths(getMonthYear(), i);
                  const futureExpenses = getExpensesForMonth(futureMonth);
                  const total = futureExpenses.reduce((s, e) => s + e.amount, 0);
                  
                  return (
                    <div key={futureMonth} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-slate-300">{formatMonthYear(futureMonth)}</span>
                      <div className="text-right">
                        <span className="text-rose-400 font-medium">{formatCurrency(total)}</span>
                        <span className="text-xs text-slate-500 ml-2">({futureExpenses.length} itens)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Cards View */}
        {view === 'cards' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Cartões de Crédito</h2>
              <button
                onClick={() => setModal({ type: 'card', data: null })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar cartão
              </button>
            </div>

            {data.cards.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum cartão cadastrado</p>
              </div>
            ) : (
              data.cards.map(card => {
                const statement = monthlyData.cardStatements.find(s => s.card.id === card.id);
                const outstanding = getCardOutstanding(card.id, currentMonth);
                const available = Math.max(0, card.limit - outstanding);
                const cardExpenses = data.expenses.filter(exp => exp.paymentMethod === 'card' && exp.cardId === card.id);
                return (
                  <div key={card.id} className="rounded-2xl bg-slate-800/30 border border-white/10 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{card.name}</h3>
                        <p className="text-sm text-slate-400">
                          Fecha dia {card.closingDay} · Vence dia {card.dueDay}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setModal({ type: 'card-payment', data: { card, amount: statement?.due || 0 } })}
                          className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
                        >
                          Pagar parte
                        </button>
                        <button
                          onClick={() => setModal({ type: 'card', data: card })}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-xl bg-slate-800/50 border border-white/10 p-3">
                        <p className="text-xs text-slate-500">Limite</p>
                        <p className="text-lg font-semibold text-white">{formatCurrency(card.limit)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-800/50 border border-white/10 p-3">
                        <p className="text-xs text-slate-500">Usado</p>
                        <p className="text-lg font-semibold text-amber-400">{formatCurrency(outstanding)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-800/50 border border-white/10 p-3">
                        <p className="text-xs text-slate-500">Disponível</p>
                        <p className="text-lg font-semibold text-emerald-400">{formatCurrency(available)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-800/50 border border-white/10 p-3">
                        <p className="text-xs text-slate-500">Fatura do mês</p>
                        <p className="text-lg font-semibold text-amber-400">
                          {formatCurrency(statement?.due || 0)}
                        </p>
                        {statement?.payments > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            Pagos no mês: {formatCurrency(statement.payments)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-slate-300">Compras no cartão</h4>
                      {cardExpenses.length === 0 ? (
                        <div className="text-sm text-slate-500">Nenhuma compra cadastrada</div>
                      ) : (
                        cardExpenses.map(expense => {
                          const monthsDiff = (parseInt(currentMonth.split('-')[0]) - parseInt(expense.startMonth.split('-')[0])) * 12
                            + (parseInt(currentMonth.split('-')[1]) - parseInt(expense.startMonth.split('-')[1]));
                          const currentInst = expense.type === 'installment'
                            ? expense.currentInstallment + monthsDiff
                            : null;
                          return (
                            <div
                              key={expense.id}
                              className="group relative rounded-xl bg-slate-800/50 border border-white/10 p-4"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-white">{expense.description}</h4>
                                    {expense.paidByParents && (
                                      <span className="px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-300 rounded-full flex items-center gap-1">
                                        <Users className="w-3 h-3" /> Pais
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-sm text-slate-400">
                                    {expense.category} · Compra dia {expense.purchaseDay || 1}
                                  </span>
                                  {currentInst && (
                                    <span className="text-sm text-amber-400 ml-2">
                                      Parcela {Math.min(currentInst, expense.installments)}/{expense.installments}
                                    </span>
                                  )}
                                </div>
                                <span className="text-lg font-semibold text-amber-400">
                                  {formatCurrency(expense.amount)}
                                </span>
                              </div>
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setModal({ type: 'expense', data: expense })}
                                  className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Settings View */}
        {view === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Configurações</h2>
            
            {/* Emergency Fund Settings */}
            <div className="rounded-2xl bg-slate-800/30 border border-white/10 p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-violet-400" />
                Reserva de Emergência
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Meta</label>
                  <input
                    type="number"
                    value={data.emergencyFund.target}
                    onChange={e => setData(prev => ({
                      ...prev,
                      emergencyFund: { ...prev.emergencyFund, target: parseFloat(e.target.value) || 0 }
                    }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Atual</label>
                  <input
                    type="number"
                    value={data.emergencyFund.current}
                    onChange={e => setData(prev => ({
                      ...prev,
                      emergencyFund: { ...prev.emergencyFund, current: parseFloat(e.target.value) || 0 }
                    }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="rounded-2xl bg-slate-800/30 border border-white/10 p-5">
              <h3 className="font-semibold mb-4">Categorias</h3>
              <div className="flex flex-wrap gap-2">
                {data.categories.map(cat => (
                  <span key={cat} className="px-3 py-1.5 bg-slate-700/50 rounded-full text-sm text-slate-300">
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Bank Accounts */}
            <div className="rounded-2xl bg-slate-800/30 border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Contas Bancárias</h3>
                <button
                  onClick={() => setModal({ type: 'account', data: null })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {data.accounts.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma conta cadastrada</p>
                  </div>
                ) : (
                  data.accounts.map(account => (
                    <div
                      key={account.id}
                      className="group relative rounded-xl bg-slate-800/50 border border-white/10 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-white">{account.name}</h4>
                          <span className="text-sm text-slate-400">{account.bank || 'Banco'}</span>
                        </div>
                        <span className="text-lg font-semibold text-emerald-400">
                          {formatCurrency(account.balance)}
                        </span>
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModal({ type: 'account', data: account })}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Credit Cards */}
            <div className="rounded-2xl bg-slate-800/30 border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Cartões de Crédito</h3>
                <button
                  onClick={() => setModal({ type: 'card', data: null })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {data.cards.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum cartão cadastrado</p>
                  </div>
                ) : (
                  data.cards.map(card => {
                    const used = getCardOutstanding(card.id, currentMonth);
                    const usage = card.limit > 0 ? (used / card.limit) * 100 : 0;
                    return (
                      <div
                        key={card.id}
                        className="group relative rounded-xl bg-slate-800/50 border border-white/10 p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-white">{card.name}</h4>
                            <span className="text-sm text-slate-400">
                              Fecha dia {card.closingDay} · Vence dia {card.dueDay}
                            </span>
                          </div>
                          <span className="text-lg font-semibold text-amber-400">
                            {formatCurrency(used)} / {formatCurrency(card.limit)}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                            style={{ width: `${Math.min(usage, 100)}%` }}
                          />
                        </div>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setModal({ type: 'card', data: card })}
                            className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Financings */}
            <div className="rounded-2xl bg-slate-800/30 border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Financiamentos</h3>
                <button
                  onClick={() => setModal({ type: 'financing', data: null })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {data.financings.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum financiamento cadastrado</p>
                  </div>
                ) : (
                  data.financings.map(financing => (
                    <div
                      key={financing.id}
                      className="group relative rounded-xl bg-slate-800/50 border border-white/10 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-white">{financing.description}</h4>
                          <span className="text-sm text-slate-400">
                            Início {formatMonthYear(financing.startMonth)}
                          </span>
                        </div>
                        <span className="text-lg font-semibold text-amber-400">
                          {formatCurrency(financing.amount)}
                        </span>
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModal({ type: 'financing', data: financing })}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFinancing(financing.id)}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Loans */}
            <div className="rounded-2xl bg-slate-800/30 border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Empréstimos</h3>
                <button
                  onClick={() => setModal({ type: 'loan', data: null })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {data.loans.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum empréstimo cadastrado</p>
                  </div>
                ) : (
                  data.loans.map(loan => (
                    <div
                      key={loan.id}
                      className="group relative rounded-xl bg-slate-800/50 border border-white/10 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-white">{loan.description}</h4>
                          <span className="text-sm text-slate-400">
                            Início {formatMonthYear(loan.startMonth)}
                          </span>
                        </div>
                        <span className="text-lg font-semibold text-amber-400">
                          {formatCurrency(loan.amount)}
                        </span>
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModal({ type: 'loan', data: loan })}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLoan(loan.id)}
                          className="p-2 bg-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Data Management */}
            <div className="rounded-2xl bg-slate-800/30 border border-white/10 p-5">
              <h3 className="font-semibold mb-4">Gerenciar Dados</h3>
              <div className="space-y-3">
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Exportar Dados (JSON)
                </button>
                <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-500/20 border border-sky-500/30 rounded-xl text-sky-400 hover:bg-sky-500/30 transition-colors cursor-pointer">
                  <Upload className="w-5 h-5" />
                  Importar Dados (JSON)
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja apagar todos os dados?')) {
                      setData(getInitialData());
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400 hover:bg-rose-500/30 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Limpar Todos os Dados
                </button>
              </div>
            </div>

            {/* App Info */}
            <div className="text-center text-slate-500 text-sm py-4">
              <p>Minhas Finanças v1.0</p>
              <p className="text-xs mt-1">Dados salvos localmente no seu navegador</p>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <Modal
        isOpen={modal.type === 'expense'}
        onClose={() => setModal({ type: null, data: null })}
        title={modal.data ? 'Editar Despesa' : 'Nova Despesa'}
      >
        <ExpenseForm
          initialData={modal.data}
          categories={data.categories}
          cards={data.cards}
          onSubmit={handleSaveExpense}
          onClose={() => setModal({ type: null, data: null })}
        />
      </Modal>

      <Modal
        isOpen={modal.type === 'income'}
        onClose={() => setModal({ type: null, data: null })}
        title={modal.data ? 'Editar Receita' : 'Nova Receita'}
      >
        <IncomeForm
          initialData={modal.data}
          onSubmit={handleSaveIncome}
          onClose={() => setModal({ type: null, data: null })}
        />
      </Modal>

      <Modal
        isOpen={modal.type === 'account'}
        onClose={() => setModal({ type: null, data: null })}
        title={modal.data ? 'Editar Conta' : 'Nova Conta'}
      >
        <AccountForm
          initialData={modal.data}
          onSubmit={handleSaveAccount}
          onClose={() => setModal({ type: null, data: null })}
        />
      </Modal>

      <Modal
        isOpen={modal.type === 'card'}
        onClose={() => setModal({ type: null, data: null })}
        title={modal.data ? 'Editar Cartão' : 'Novo Cartão'}
      >
        <CardForm
          initialData={modal.data}
          onSubmit={handleSaveCard}
          onClose={() => setModal({ type: null, data: null })}
        />
      </Modal>

      <Modal
        isOpen={modal.type === 'card-payment'}
        onClose={() => setModal({ type: null, data: null })}
        title="Pagamento do Cartão"
      >
        {modal.data?.card && (
          <CardPaymentForm
            card={modal.data.card}
            initialMonth={currentMonth}
            initialAmount={modal.data.amount}
            onSubmit={handleSaveCardPayment}
            onClose={() => setModal({ type: null, data: null })}
          />
        )}
      </Modal>

      <Modal
        isOpen={modal.type === 'financing'}
        onClose={() => setModal({ type: null, data: null })}
        title={modal.data ? 'Editar Financiamento' : 'Novo Financiamento'}
      >
        <FinancingForm
          initialData={modal.data}
          onSubmit={handleSaveFinancing}
          onClose={() => setModal({ type: null, data: null })}
        />
      </Modal>

      <Modal
        isOpen={modal.type === 'loan'}
        onClose={() => setModal({ type: null, data: null })}
        title={modal.data ? 'Editar Empréstimo' : 'Novo Empréstimo'}
      >
        <LoanForm
          initialData={modal.data}
          onSubmit={handleSaveLoan}
          onClose={() => setModal({ type: null, data: null })}
        />
      </Modal>

      <Modal
        isOpen={modal.type === 'investment'}
        onClose={() => setModal({ type: null, data: null })}
        title={modal.data ? 'Editar Investimento' : 'Novo Investimento'}
      >
        <InvestmentForm
          initialData={modal.data}
          onSubmit={handleSaveInvestment}
          onClose={() => setModal({ type: null, data: null })}
        />
      </Modal>

      <Modal
        isOpen={modal.type === 'emergency'}
        onClose={() => setModal({ type: null, data: null })}
        title="Reserva de Emergência"
      >
        <EmergencyFundForm
          onSubmit={handleUpdateEmergencyFund}
          onClose={() => setModal({ type: null, data: null })}
        />
      </Modal>

      <Modal
        isOpen={modal.type === 'close-month'}
        onClose={() => setModal({ type: null, data: null })}
        title="Fechar mês"
      >
        <MonthCloseForm
          balance={monthlyData.balance}
          month={currentMonth}
          onSubmit={handleCloseMonth}
          onClose={() => setModal({ type: null, data: null })}
        />
      </Modal>
    </div>
  );
}
