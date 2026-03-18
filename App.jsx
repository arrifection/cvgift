import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User, X, Menu, Briefcase, Mail,
  MapPin, Loader2, ChevronRight, ExternalLink, ArrowUp
} from 'lucide-react';
import axios from 'axios';

/* ─── API URL ─────────────────────────────────────────────────────── */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ─── Markdown-style message renderer ──────────────────────────────── */
function FormattedMessage({ content }) {
  const renderBold = (text) =>
    text.split(/\*\*(.*?)\*\*/g).map((p, i) =>
      i % 2 === 1 ? <strong key={i} className="font-semibold">{p}</strong> : p
    );

  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {content.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (line.startsWith('• ') || line.startsWith('- '))
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              <span>{renderBold(line.replace(/^[•\-] /, ''))}</span>
            </div>
          );
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^(\d+)\./)[1];
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] flex items-center justify-center font-bold mt-0.5">{num}</span>
              <span>{renderBold(line.replace(/^\d+\.\s/, ''))}</span>
            </div>
          );
        }
        return <p key={i}>{renderBold(line)}</p>;
      })}
    </div>
  );
}

/* ─── Static data ─────────────────────────────────────────────────── */
const SUGGESTED = [
  'Tell me about Waqqas',
  'What are his skills?',
  'What projects has he built?',
  'Why should I hire him?',
  'What makes him different?',
];

const SKILLS = [
  { label: 'Supply Chain', icon: '📦' }, { label: 'E-Commerce', icon: '🛒' },
  { label: 'Project Management', icon: '📋' }, { label: 'Procurement', icon: '🔗' },
  { label: 'Logistics', icon: '🚚' }, { label: 'Shopify', icon: '🛍️' },
  { label: 'Strategic Planning', icon: '🎯' }, { label: 'Negotiation', icon: '🤝' },
  { label: 'Team Leadership', icon: '👥' },
];

const LANGUAGES = [
  { lang: 'English', level: 'Fluent', flag: '🇬🇧', pct: 95 },
  { lang: 'Arabic', level: 'Fluent', flag: '🇸🇦', pct: 90 },
  { lang: 'Urdu', level: 'Native', flag: '🇵🇰', pct: 100 },
];

const EXPERIENCE = [
  { role: 'Ecommerce Project Manager', company: 'IMDADAT', desc: 'Leading digital strategy & sourcing, managing full e-commerce operations.', badge: 'Current' },
  { role: 'Supply Chain & E-Com Manager', company: 'Independent', desc: 'End-to-end supply chain: order processing, sourcing, logistics.' },
  { role: 'Supply Chain Manager', company: 'ESCCO', desc: 'Managed company-wide supply chain, logistics & operations leadership.' },
  { role: 'Manager Sourcing & Imports', company: 'National Scientific', desc: 'Supplier relations (local + international), industrial/lab procurement.' },
  { role: 'Self-Employed', company: 'FC Chemicals', desc: 'Independently managed supply chain and vendor networks.' },
];

const PROJECTS = [
  { title: 'Boutique De Royal Online Store', tech: 'Shopify · SEO · Payments', desc: 'Built and managed a full Shopify e-commerce store with ~3,600 products, payment integration, and ongoing SEO optimization.', color: 'from-emerald-400 to-teal-400' },
  { title: 'Boutique De Royal Website', tech: 'UI/UX · Web Dev', desc: 'Complete website overhaul focused on improved UI/UX, performance, and brand stability.', color: 'from-blue-400 to-indigo-400' },
  { title: 'Star Corporation Software', tech: 'Business Tools · Branding', desc: 'Custom costing and proposal tracking system, internal business tools, and branding assets.', color: 'from-purple-400 to-pink-400' },
];

const STATS = [
  { num: '13+', label: 'Years Experience' }, { num: '3,600+', label: 'Products Managed' },
  { num: '5+', label: 'Organizations Led' }, { num: '3', label: 'Major Projects' },
];

/* ─── Section heading ──────────────────────────────────────────────── */
function SectionHeading({ label }) {
  return (
    <div className="flex items-center gap-4">
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight whitespace-nowrap">{label}</h2>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [answerType, setAnswerType] = useState('short');
  const [showSuggested, setShowSuggested] = useState(false); // mobile sidebar toggle
  const [messages, setMessages] = useState([
    { role: 'ai', content: `Hello! 👋 I'm the AI assistant for **Waqqas Qasmi**.\n\nI can answer questions about his 13+ years of experience in supply chain, e-commerce, and project management.\n\n**Try a suggested question below, or type your own!**` },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const chatEndRef = useRef(null);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    // Scroll only within the chat container — NOT the whole page
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // sendMessage accepts an explicit string — avoids any default-param/closure bugs
  const sendMessage = async (textArg) => {
    const trimmed = String(textArg ?? chatInput).trim();
    if (!trimmed || isTyping) return;
    const updated = [...messages, { role: 'user', content: trimmed }];
    setMessages(updated);
    setChatInput('');
    setShowSuggested(false);
    setIsTyping(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      const { data } = await axios.post(`${API_URL}/chat`, { message: trimmed, type: answerType });
      setMessages([...updated, { role: 'ai', content: data.response }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages([...updated, { role: 'ai', content: 'Sorry, I had trouble connecting to the server. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  /* Close menu on nav click */
  const navClick = (id) => {
    setMenuOpen(false);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">

      {/* ── NAVBAR ────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <a href="#top" className="text-lg sm:text-xl font-black tracking-tight">
            Waqqas<span className="text-accent">.ai</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
            {['about','skills','experience','projects','chat'].map((s) => (
              <button key={s} onClick={() => navClick(s)} className="capitalize hover:text-accent transition-colors">
                {s === 'chat' ? '🤖 AI Chat' : s}
              </button>
            ))}
            <button onClick={() => setShowResume(true)} className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-full hover:bg-accent transition-colors">
              View Profile
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-gray-100 px-4 overflow-hidden"
            >
              <div className="py-3 flex flex-col gap-1">
                {['about','skills','experience','projects','chat'].map((s) => (
                  <button key={s} onClick={() => navClick(s)} className="capitalize text-left py-2.5 px-2 text-sm font-medium text-gray-700 hover:text-accent hover:bg-gray-50 rounded-lg transition-colors">
                    {s === 'chat' ? '🤖 AI Chat' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
                <button onClick={() => { setShowResume(true); setMenuOpen(false); }} className="mt-1 py-2.5 px-2 text-sm font-bold text-accent text-left">
                  📄 View Full Profile
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── SCROLL-TO-TOP ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-5 right-5 z-40 w-10 h-10 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Scroll to top"
          >
            <ArrowUp size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      <main id="top" className="pt-14 sm:pt-16">

        {/* ── HERO ──────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-20 sm:py-28 flex flex-col items-center text-center px-4 sm:px-6">
          <div className="absolute -top-20 -left-20 w-72 h-72 sm:w-96 sm:h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 sm:w-80 sm:h-80 bg-blue-300/10 rounded-full blur-3xl pointer-events-none" />

          <motion.span
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-full mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Open to new opportunities — 2026
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-tight mb-4 sm:mb-6"
          >
            Waqqas Qasmi
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-base sm:text-lg font-semibold text-accent mb-3 px-2 text-center"
          >
            E-Commerce · Supply Chain · IT Project Manager
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="max-w-xl text-gray-500 text-sm sm:text-base mb-8 sm:mb-10 px-2"
          >
            13+ years building and scaling online stores, streamlining global supply chains, and leading cross-functional teams from Jeddah to the world.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto px-4 sm:px-0"
          >
            <button onClick={() => navClick('chat')} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gray-900 text-white rounded-full font-semibold text-sm hover:bg-accent transition-colors shadow-lg">
              <Bot size={16} /> Chat with My AI
            </button>
            <button onClick={() => setShowResume(true)} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-full font-semibold text-sm hover:bg-gray-50 transition shadow">
              <Briefcase size={16} /> View Full Profile
            </button>
          </motion.div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-gray-400 text-sm">
            <span className="flex items-center gap-1.5"><MapPin size={13} /> Jeddah, Makkah, Saudi Arabia</span>
            <span className="hidden sm:inline text-gray-300">·</span>
            <a href="tel:+966570679669" className="hover:text-accent transition-colors">📞 +966 570 679 669</a>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-20 sm:space-y-28 pb-20 sm:pb-28">

          {/* ── ABOUT ─────────────────────────────────────────────── */}
          <section id="about" className="scroll-mt-20">
            <SectionHeading label="About" />
            <div className="grid md:grid-cols-2 gap-8 sm:gap-10 items-start mt-8 sm:mt-10">
              <div className="space-y-4 text-gray-600 leading-relaxed text-sm sm:text-base">
                <p>
                  I'm a results-driven professional with a rare ability to bridge <strong className="text-gray-900">traditional supply chain operations</strong> with <strong className="text-gray-900">modern e-commerce strategies</strong>. Over 13+ years, I've worked across industries in Jeddah and Pakistan, managing everything from international procurement to fully optimized Shopify stores.
                </p>
                <p>
                  I thrive in environments that require both analytical thinking and fast execution — turning complex challenges into measurable, profitable outcomes.
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <MapPin size={13} className="shrink-0" /> Jeddah, Makkah, Saudi Arabia
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <a href="mailto:qasmiwaqqas@gmail.com" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-accent hover:text-white transition-colors">
                    <Mail size={14} /> qasmiwaqqas@gmail.com
                  </a>
                  <a href="https://linkedin.com/in/waqqasqasmi" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-blue-600 hover:text-white transition-colors">
                    <ExternalLink size={14} /> LinkedIn
                  </a>
                  <a href="tel:+966570679669" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-green-600 hover:text-white transition-colors">
                    📞 +966 570 679 669
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {STATS.map((s) => (
                  <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm text-center hover:shadow-md transition-shadow">
                    <div className="text-2xl sm:text-3xl font-black text-accent">{s.num}</div>
                    <div className="text-[11px] sm:text-xs text-gray-500 font-medium mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── SKILLS ────────────────────────────────────────────── */}
          <section id="skills" className="scroll-mt-20">
            <SectionHeading label="Skills" />
            <div className="mt-6 sm:mt-10 flex flex-wrap gap-2 sm:gap-3">
              {SKILLS.map((s) => (
                <div key={s.label} className="inline-flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-white border border-gray-100 rounded-full shadow-sm text-xs sm:text-sm font-medium text-gray-700 hover:border-accent hover:text-accent transition-all cursor-default">
                  <span>{s.icon}</span> {s.label}
                </div>
              ))}
            </div>
          </section>

          {/* ── LANGUAGES ─────────────────────────────────────────── */}
          <section id="languages" className="scroll-mt-20">
            <SectionHeading label="Languages" />
            <div className="mt-6 sm:mt-8 grid sm:grid-cols-3 gap-4">
              {LANGUAGES.map((l) => (
                <div key={l.lang} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{l.flag}</span>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{l.lang}</p>
                        <p className="text-xs text-gray-400 font-medium">{l.level}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-accent">{l.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-accent h-1.5 rounded-full" style={{ width: `${l.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── EXPERIENCE ────────────────────────────────────────── */}

          <section id="experience" className="scroll-mt-20">
            <SectionHeading label="Experience" />
            <div className="mt-6 sm:mt-10 relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 hidden sm:block" />
              <div className="space-y-4 sm:space-y-6">
                {EXPERIENCE.map((e, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                    className="sm:pl-14 relative"
                  >
                    <div className="absolute left-2.5 top-5 w-3 h-3 rounded-full bg-accent border-2 border-white shadow hidden sm:block" />
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base">{e.role}</h3>
                        {e.badge && <span className="px-2.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full">{e.badge}</span>}
                      </div>
                      <p className="text-accent text-xs sm:text-sm font-semibold mb-1">{e.company}</p>
                      <p className="text-gray-500 text-xs sm:text-sm">{e.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── PROJECTS ──────────────────────────────────────────── */}
          <section id="projects" className="scroll-mt-20">
            <SectionHeading label="Projects" />
            <div className="mt-6 sm:mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {PROJECTS.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow group"
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${p.color}`} />
                  <div className="p-4 sm:p-6">
                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-accent transition-colors text-sm sm:text-base">{p.title}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-medium mb-2 sm:mb-3">{p.tech}</p>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{p.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── AI CHAT ───────────────────────────────────────────── */}
          <section id="chat" className="scroll-mt-20">
            <SectionHeading label="AI Assistant" />
            <p className="text-gray-500 mt-2 mb-6 text-sm">Ask anything about Waqqas — smart rule-based responses with optional OpenAI fallback.</p>

            <div className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col">

              {/* ── Mobile: suggested questions toggle ── */}
              <div className="lg:hidden p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-gray-900 flex items-center justify-center">
                    <Bot size={14} className="text-accent" />
                  </div>
                  <div>
                    <p className="font-bold text-xs">Waqqas.ai</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-green-600 uppercase tracking-wide">Online</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Answer type toggle mobile */}
                  <div className="flex bg-gray-200/60 p-0.5 rounded-lg text-[10px] font-bold">
                    <button onClick={() => setAnswerType('short')} className={`px-2 py-1 rounded-md transition-all ${answerType === 'short' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>⚡</button>
                    <button onClick={() => setAnswerType('long')} className={`px-2 py-1 rounded-md transition-all ${answerType === 'long' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>📖</button>
                  </div>
                  <button
                    onClick={() => setShowSuggested(!showSuggested)}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-semibold rounded-lg hover:border-accent hover:text-accent transition-colors shadow-sm"
                  >
                    {showSuggested ? 'Hide' : 'Suggestions'}
                  </button>
                </div>
              </div>

              {/* ── Mobile suggestions dropdown ── */}
              <AnimatePresence>
                {showSuggested && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="lg:hidden border-b border-gray-100 overflow-hidden bg-gray-50"
                  >
                    <div className="p-3 flex flex-col gap-2">
                      {SUGGESTED.map((q) => (
                        <button key={q} onClick={() => sendMessage(q)}
                          className="text-left text-xs text-gray-600 bg-white border border-gray-100 hover:border-accent hover:text-accent px-3 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-between">
                          <span>"{q}"</span>
                          <ChevronRight size={12} className="text-gray-300 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Desktop layout: sidebar + chat ── */}
              <div className="flex flex-col lg:flex-row" style={{ minHeight: 500 }}>

                {/* Desktop Sidebar */}
                <div className="hidden lg:flex w-72 bg-gray-50 border-r border-gray-100 p-6 flex-col gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gray-900 flex items-center justify-center shadow-lg">
                      <Bot size={22} className="text-accent" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Waqqas.ai</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Online</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Response Type</p>
                    <div className="flex bg-gray-200/60 p-0.5 rounded-xl">
                      {['short','long'].map((t) => (
                        <button key={t} onClick={() => setAnswerType(t)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-[10px] transition-all ${answerType === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                          {t === 'short' ? '⚡ Quick' : '📖 Detailed'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Suggested Questions</p>
                    <div className="space-y-2">
                      {SUGGESTED.map((q) => (
                        <button key={q} onClick={() => sendMessage(q)}
                          className="w-full text-left text-xs text-gray-600 bg-white border border-gray-100 hover:border-accent hover:text-accent px-3.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-between group">
                          <span>"{q}"</span>
                          <ChevronRight size={12} className="text-gray-300 group-hover:text-accent shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Chat messages + input */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Messages */}
                  <div ref={chatScrollRef} className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4" style={{ maxHeight: 380 }}>
                    <AnimatePresence initial={false}>
                      {messages.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 shadow ${msg.role === 'ai' ? 'bg-gray-900' : 'bg-accent'}`}>
                            {msg.role === 'ai' ? <Bot size={13} className="text-white" /> : <User size={13} className="text-white" />}
                          </div>
                          <div className={`max-w-[80%] sm:max-w-[78%] px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-accent text-white rounded-tr-none' : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-none'}`}>
                            {msg.role === 'ai' ? <FormattedMessage content={msg.content} /> : <p>{msg.content}</p>}
                          </div>
                        </motion.div>
                      ))}

                      {isTyping && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 sm:gap-3">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-900 flex items-center justify-center shadow shrink-0">
                            <Bot size={13} className="text-white" />
                          </div>
                          <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-gray-50 border border-gray-100 shadow-sm flex items-center gap-1.5">
                            {[0,1,2].map((d) => (
                              <span key={d} className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input — explicitly passes chatInput value on submit/click */}
                  <div className="p-3 sm:p-4 border-t border-gray-100 bg-white">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage(chatInput); // pass value explicitly
                      }}
                      className="flex gap-2 sm:gap-3"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage(chatInput);
                          }
                        }}
                        placeholder="Ask me anything, e.g. 'tell me about Waqqas'…"
                        className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition placeholder:text-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => sendMessage(chatInput)}
                        disabled={!chatInput.trim() || isTyping}
                        className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gray-900 text-white rounded-xl sm:rounded-2xl hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow shrink-0"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                    <p className="text-center mt-2 text-[10px] text-gray-400">AI assistant powered by portfolio logic layer</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── CONTACT ───────────────────────────────────────────── */}
          <section className="bg-gray-900 text-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 text-center">
            <h2 className="text-2xl sm:text-3xl font-black mb-3">Let's Work Together</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto text-sm sm:text-base">
              Open to exciting roles in e-commerce, supply chain, and digital project management. Based in Jeddah — available globally.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center">
              <a href="mailto:qasmiwaqqas@gmail.com" className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 bg-accent text-white rounded-full font-semibold text-sm hover:opacity-90 transition shadow-lg">
                <Mail size={16} /> qasmiwaqqas@gmail.com
              </a>
              <a href="https://linkedin.com/in/waqqasqasmi" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 bg-white/10 border border-white/20 text-white rounded-full font-semibold text-sm hover:bg-white/20 transition">
                <ExternalLink size={16} /> linkedin.com/in/waqqasqasmi
              </a>
              <a href="tel:+966570679669" className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 bg-white/10 border border-white/20 text-white rounded-full font-semibold text-sm hover:bg-white/20 transition">
                📞 +966 570 679 669
              </a>
            </div>
          </section>
        </div>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400 px-4 space-y-1">
        <p>© {new Date().getFullYear()} Waqqas Qasmi · E-Commerce & Supply Chain Manager · Jeddah, Saudi Arabia</p>
        <p>
          <a href="mailto:qasmiwaqqas@gmail.com" className="hover:text-accent transition-colors">qasmiwaqqas@gmail.com</a>
          {' · '}
          <a href="https://linkedin.com/in/waqqasqasmi" target="_blank" rel="noreferrer" className="hover:text-accent transition-colors">linkedin.com/in/waqqasqasmi</a>
          {' · '}
          <a href="tel:+966570679669" className="hover:text-accent transition-colors">+966 570 679 669</a>
        </p>
      </footer>

      {/* ── RESUME MODAL ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showResume && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowResume(false)} />

            <motion.div
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              className="relative w-full sm:max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: '92vh' }}
            >
              {/* Handle bar (mobile) */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
                  <Briefcase size={16} className="text-accent" /> Full Profile — Waqqas Qasmi
                </h2>
                <button onClick={() => setShowResume(false)} className="p-2 rounded-full hover:bg-gray-200 transition">
                  <X size={16} />
                </button>
              </div>

              <div className="overflow-y-auto p-4 sm:p-8 md:p-10 space-y-8 sm:space-y-10">
                <div className="text-center pb-6 border-b">
                  <h1 className="text-2xl sm:text-3xl font-black mb-1">Waqqas Qasmi</h1>
                  <p className="text-accent font-semibold mb-2 text-sm sm:text-base">E-Commerce · Supply Chain · IT Project Manager</p>
                  <p className="text-gray-500 text-xs sm:text-sm flex items-center justify-center gap-2 mb-2">
                    <MapPin size={12} /> Jeddah, Makkah, Saudi Arabia · 13+ Years Experience
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 text-xs">
                    <a href="mailto:qasmiwaqqas@gmail.com" className="flex items-center gap-1 text-gray-500 hover:text-accent transition-colors">
                      <Mail size={11}/> qasmiwaqqas@gmail.com
                    </a>
                    <a href="https://linkedin.com/in/waqqasqasmi" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-gray-500 hover:text-accent transition-colors">
                      <ExternalLink size={11}/> linkedin.com/in/waqqasqasmi
                    </a>
                    <a href="tel:+966570679669" className="text-gray-500 hover:text-accent transition-colors">
                      📞 +966 570 679 669
                    </a>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-accent rounded-full inline-block" /> Experience
                  </h3>
                  <div className="space-y-4 sm:space-y-5">
                    {EXPERIENCE.map((e, i) => (
                      <div key={i} className="border-l-2 border-gray-100 pl-4 sm:pl-5">
                        <div className="flex flex-wrap justify-between gap-1">
                          <h4 className="font-bold text-sm sm:text-base">{e.role}</h4>
                          {e.badge && <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full">{e.badge}</span>}
                        </div>
                        <p className="text-accent text-xs sm:text-sm font-semibold">{e.company}</p>
                        <p className="text-gray-500 text-xs sm:text-sm mt-1">{e.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-accent rounded-full inline-block" /> Projects
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {PROJECTS.map((p, i) => (
                      <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                        <div className={`h-1.5 bg-gradient-to-r ${p.color}`} />
                        <div className="p-3 sm:p-4">
                          <h4 className="font-bold text-xs sm:text-sm mb-1">{p.title}</h4>
                          <p className="text-[10px] text-gray-400 font-medium mb-2">{p.tech}</p>
                          <p className="text-gray-600 text-xs leading-relaxed">{p.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-base sm:text-lg mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-accent rounded-full inline-block" /> Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS.map((s) => (
                      <span key={s.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-medium text-gray-700">
                        {s.icon} {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
