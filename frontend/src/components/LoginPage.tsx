import React, { useState } from 'react';
import axios from 'axios';
import { Stethoscope, Eye, EyeOff, BrainCircuit, ShieldCheck, Zap, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface LoginPageProps {
  onSuccess: () => void;
  onBack?: () => void;
}

export default function LoginPage({ onSuccess, onBack }: LoginPageProps) {
  const auth = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      auth.login(response.data.access_token);
      onSuccess();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        setError(
          typeof detail === 'string'
            ? detail
            : 'Tên đăng nhập hoặc mật khẩu không đúng.'
        );
      } else {
        setError('Đã xảy ra lỗi kết nối. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden bg-white border-r border-gray-100">
        {/* Decorative cyan gradient — subtle, top-left corner */}
        <div
          aria-hidden="true"
          className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(8,145,178,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-0 w-72 h-72 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="p-2 bg-primary rounded-lg text-white shadow-sm shadow-primary/20">
            <Stethoscope className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold font-heading text-primary tracking-tight">Drug-Pred AI</span>
        </div>

        {/* Main brand content */}
        <div className="relative z-10 flex flex-col gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-primary text-xs font-semibold mb-6 border border-blue-100/60">
              <Zap className="w-3.5 h-3.5" />
              Clinical Decision Support System
            </div>
            <h2 className="text-3xl font-extrabold font-heading text-text leading-tight mb-4">
              Hỗ trợ quyết định<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                lâm sàng thông minh
              </span>
            </h2>
            <p className="text-text/65 text-sm leading-relaxed">
              Hệ thống phân loại nhóm thuốc ứng dụng XLM-RoBERTa đa ngữ với Dynamic LoRA Switching, dành cho bác sĩ và nhân viên y tế.
            </p>
          </div>

          {/* Feature list */}
          <div className="flex flex-col gap-3">
            {[
              { icon: BrainCircuit, label: 'XLM-RoBERTa + Multi-LoRA Inference' },
              { icon: Zap, label: 'Giải thích kết quả XAI (LIME/SHAP)' },
              { icon: ShieldCheck, label: 'Phân quyền bác sĩ / y tá / admin' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-text/70">
                <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                {label}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-text/35">© 2026 Drug-Pred AI — Dành cho nghiên cứu và hỗ trợ y tế.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        {/* Back button — only if onBack is provided */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-6 left-6 flex items-center gap-1.5 text-xs font-medium text-text/50 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Trang chủ
          </button>
        )}

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="p-2 bg-primary rounded-lg text-white">
            <Stethoscope className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold font-heading text-primary">Drug-Pred AI</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold font-heading text-text tracking-tight">Đăng nhập</h1>
            <p className="text-sm text-text/55 mt-1.5">Nhập thông tin tài khoản được cấp bởi quản trị viên.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-sm font-semibold text-text">
                Tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition text-sm"
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-text">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition text-sm"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text/40 hover:text-text/70 transition"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-1"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-text/35 mt-8">
            Chưa có tài khoản? Liên hệ quản trị viên để được cấp quyền truy cập.
          </p>
        </div>
      </div>
    </div>
  );
}
