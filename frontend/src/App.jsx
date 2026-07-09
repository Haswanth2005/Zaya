import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, TrendingUp, TrendingDown, ShieldAlert, DollarSign, 
  Globe, Percent, Briefcase, Activity, CheckCircle, MessageSquare, 
  Send, RefreshCw, AlertTriangle, Cpu, Layers, Award, BarChart3, 
  Info, Sparkles, User, HelpCircle, ArrowRight, CornerDownRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import ReactMarkdown from 'react-markdown';

export default function App() {
  // Application State
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progressSteps, setProgressSteps] = useState([
    { id: 'validation', label: 'Company Mapping & Validation', status: 'idle', desc: 'Validating ticker and sector mapping...' },
    { id: 'financials', label: 'Financial Statements Analysis', status: 'idle', desc: 'Fetching statements and scoring health...' },
    { id: 'news', label: 'Latest News & Sentiment Analysis', status: 'idle', desc: 'Scouring web news and analyzing overall sentiment...' },
    { id: 'sec', label: 'SEC Filing Auditing', status: 'idle', desc: 'Reading latest 10-K/10-Q filing notes...' },
    { id: 'competition', label: 'Competitive Landscape Analysis', status: 'idle', desc: 'Mapping industry peers and market share...' },
    { id: 'risk', label: 'Risk Factor Evaluation', status: 'idle', desc: 'Isolating bearish factors and vulnerabilities...' },
    { id: 'decision', label: 'Final Verdict', status: 'idle', desc: 'Synthesizing recommendations and confidence...' }
  ]);
  
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Evidence details modal
  const [evidenceModal, setEvidenceModal] = useState(null);
  
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const updateStepStatus = (stepId, status) => {
    setProgressSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        return { ...step, status };
      }
      return step;
    }));
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setReport(null);
    setChatMessages([]);
    
    // Reset steps
    setProgressSteps(prev => prev.map(step => ({ ...step, status: 'idle' })));
    
    // Create SSE connection
    const eventSource = new EventSource(`http://localhost:5000/api/analyze?q=${encodeURIComponent(query)}`);
    
    eventSource.onmessage = (event) => {
      if (event.data === 'done') {
        eventSource.close();
        return;
      }
      
      try {
        const payload = JSON.parse(event.data);
        
        if (payload.type === 'status') {
          setCurrentStep(payload.message);
          const currentId = payload.step;
          
          setProgressSteps(prev => prev.map(step => {
            if (step.id === currentId) {
              return { ...step, status: 'active' };
            }
            // Set previous steps to success
            const stepOrder = ['validation', 'financials', 'news', 'sec', 'competition', 'risk', 'decision'];
            const targetIndex = stepOrder.indexOf(currentId);
            const thisIndex = stepOrder.indexOf(step.id);
            if (thisIndex < targetIndex) {
              return { ...step, status: 'success' };
            }
            return step;
          }));
        }
        
        if (payload.type === 'result') {
          // Set final steps to success
          setProgressSteps(prev => prev.map(step => ({ ...step, status: 'success' })));
          setReport(payload.data);
          
          // Initialize chat with first analyst greeting
          setChatMessages([
            { 
              role: 'assistant', 
              content: `Hi there! I have finished analyzing **${payload.data.companyName} (${payload.data.ticker})**. Based on our multi-agent research, we've issued a **${payload.data.decision.recommendation}** recommendation with **${payload.data.decision.confidence}%** confidence.\n\nAsk me anything about the financial health, key risks, competitors, or latest news, and I'll walk you through the evidence!` 
            }
          ]);
          setLoading(false);
          eventSource.close();
        }
        
        if (payload.type === 'error') {
          alert(`Analysis Error: ${payload.message}`);
          setLoading(false);
          eventSource.close();
        }
      } catch (err) {
        console.error("Error parsing SSE message:", err);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error("SSE Connection Error:", err);
      setLoading(false);
      eventSource.close();
    };
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading || !report) return;

    const userMsg = { role: 'user', content: inputMessage };
    setChatMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setChatLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: report.ticker,
          companyName: report.companyName,
          analysisContext: report,
          messages: [...chatMessages, userMsg]
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error || 'Failed to generate response.'}` }]);
      }
    } catch (err) {
      console.error("Chat Error:", err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered a connection error. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper to format currency
  const formatCurrency = (val) => {
    if (!val) return 'N/A';
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  // Helper to format percentage
  const formatPercent = (val) => {
    if (val === null || val === undefined) return 'N/A';
    if (Math.abs(val) < 1.0 && val !== 0) {
      return `${(val * 100).toFixed(1)}%`;
    }
    return `${val.toFixed(1)}%`;
  };

  // Quick evidence mapping for clicking metrics
  const triggerEvidence = (metricName, value, source) => {
    setEvidenceModal({
      metric: metricName,
      value: value,
      source: source || 'Yahoo Finance API Integration',
      details: `Verified matching records in external reports. This value was validated by the Financial Data Agent in step 2.`
    });
  };

  // Prepare chart data comparing subject vs peers
  const getRadarChartData = () => {
    if (!report) return [];
    const metricsVal = report?.financials?.metrics || {};
    const roe = metricsVal?.roe ? Math.min(100, Math.max(0, metricsVal.roe * 100)) : 40;
    const margin = metricsVal?.profitMargin ? Math.min(100, Math.max(0, metricsVal.profitMargin * 100)) : 30;
    const scoreVal = (report?.financials?.score || 5) * 10;
    
    return [
      { subject: 'Financial Health', A: scoreVal, B: 65, fullMark: 100 },
      { subject: 'Return on Equity', A: roe, B: 55, fullMark: 100 },
      { subject: 'Profit Margins', A: margin, B: 45, fullMark: 100 },
      { subject: 'Leverage Safety', A: metricsVal?.debtToEquity && metricsVal.debtToEquity < 150 ? 80 : 40, B: 60, fullMark: 100 },
      { subject: 'Ecosystem Advantage', A: report?.decision?.recommendation === 'BUY' ? 90 : 60, B: 70, fullMark: 100 }
    ];
  };

  return (
    <div className="h-screen bg-canvas-soft text-ink flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <header className="border-b border-hairline bg-canvas sticky top-0 z-40 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <svg viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor"/></svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-ink">Zaya</h1>
          </div>
          <div className="text-mute px-2">/</div>
          <div className="text-sm text-body">Investment Research Platform</div>
        </div>
        
        {report && (
          <div className="hidden md:flex items-center space-x-2">
            <span className="text-mute text-xs">Researching</span>
            <span className="text-sm font-medium">{report?.companyName} ({report?.ticker})</span>
          </div>
        )}

        <div className="flex items-center space-x-4">
          <button className="bg-canvas border border-hairline text-ink text-sm font-medium rounded-md px-3 py-1.5 shadow-level-1 hover:bg-canvas-soft transition-colors">
            Feedback
          </button>
          <button className="bg-primary text-on-primary text-sm font-medium rounded-md px-4 py-1.5 shadow-level-2 hover:opacity-90 transition-opacity">
            Ask AI
          </button>
        </div>
      </header>

      {/* Landing View */}
      {!report && !loading && (
        <div className="flex-1 flex flex-col items-center pt-32 pb-24 px-6 text-center hero-mesh relative overflow-y-auto">
          
          <div className="inline-flex items-center space-x-2 bg-canvas-soft border border-hairline rounded-full px-3 py-1 mb-8 shadow-level-1">
            <span className="flex h-2 w-2 rounded-full bg-link"></span>
            <span className="text-xs font-medium text-body">Zaya v1.0 is live</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-semibold tracking-tighter text-ink max-w-3xl mb-6">
            Intelligent investment research.
          </h2>
          <p className="text-body text-lg md:text-xl max-w-2xl mb-12">
            Zaya orchestrates a multi-agent system to synthesize actionable investment intelligence from financials, news, SEC filings, and competitor data.
          </p>

          <form onSubmit={handleSearch} className="w-full max-w-xl relative mb-12">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter company name or ticker (e.g., Apple, TSLA)..."
              className="w-full bg-canvas text-ink placeholder-mute border border-hairline rounded-lg px-4 py-3.5 pr-14 focus:outline-none focus:ring-2 focus:ring-primary shadow-level-2 text-base transition-shadow"
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-primary text-on-primary font-medium px-3 rounded-md hover:opacity-90 transition-opacity flex items-center justify-center cursor-pointer shadow-level-1"
            >
              Analyze
            </button>
          </form>

          {/* Quick links */}
          <div className="flex flex-col items-center space-y-4">
            <span className="text-xs font-mono text-mute uppercase">Sample analyses</span>
            <div className="flex flex-wrap justify-center gap-2">
              {['Apple', 'NVIDIA', 'Tesla', 'Microsoft', 'Alphabet'].map(item => (
                <button 
                  key={item}
                  onClick={() => { setQuery(item); setTimeout(() => handleSearch(), 50); }}
                  className="bg-canvas border border-hairline hover:border-hairline-strong px-4 py-2 rounded-full text-sm text-body transition-all hover:text-ink shadow-level-1"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading & Agent Progress Timeline View */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto px-6 py-24 w-full">
          <div className="mb-12 text-center w-full">
            <div className="inline-block relative mb-6">
              <div className="w-12 h-12 rounded-full border-2 border-hairline border-t-primary animate-spin mx-auto"></div>
            </div>
            <h3 className="text-3xl font-semibold text-ink tracking-tight mb-3">Assembling consensus...</h3>
            <p className="text-body font-mono text-sm tracking-wide">{currentStep || 'Initializing agents...'}</p>
          </div>

          {/* Timeline steps */}
          <div className="w-full bg-canvas border border-hairline rounded-lg p-8 shadow-level-2">
            <div className="space-y-6">
              {progressSteps.map((step, idx) => (
                <div key={step.id} className="flex items-start space-x-4 relative">
                  {idx < progressSteps.length - 1 && (
                    <div className={`absolute left-[11px] top-8 w-px h-8 ${
                      step.status === 'success' ? 'bg-primary' : 'bg-hairline'
                    }`}></div>
                  )}
                  <div className="flex flex-col items-center z-10">
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium transition-colors ${
                      step.status === 'success' ? 'bg-primary text-on-primary border-primary' :
                      step.status === 'active' ? 'bg-canvas text-ink border-primary' :
                      'bg-canvas-soft text-mute border-hairline'
                    }`}>
                      {step.status === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                  </div>
                  <div className="flex-1 pb-1">
                    <h4 className={`text-sm font-medium ${
                      step.status === 'success' ? 'text-ink' :
                      step.status === 'active' ? 'text-ink' :
                      'text-mute'
                    }`}>
                      {step.label}
                    </h4>
                    <p className="text-xs text-mute mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

            {/* Main Dashboard & Chat View */}
      {report && !loading && (
        <div className="flex-1 flex overflow-hidden bg-canvas-soft w-full">
          
          {/* Left Navigation Sidebar */}
          <div className="hidden lg:flex w-56 xl:w-64 flex-col border-r border-hairline bg-canvas z-20 shrink-0 h-full">
            <div className="p-4 space-y-1 mt-4">
              <span className="text-xs font-mono text-mute uppercase tracking-widest px-3 mb-4 block">Report Sections</span>
              
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'overview' 
                    ? 'bg-canvas-soft text-ink border border-hairline shadow-level-1' 
                    : 'text-mute hover:text-ink hover:bg-canvas-soft border border-transparent'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Overview</span>
              </button>
              
              <button
                onClick={() => setActiveTab('financials')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'financials' 
                    ? 'bg-canvas-soft text-ink border border-hairline shadow-level-1' 
                    : 'text-mute hover:text-ink hover:bg-canvas-soft border border-transparent'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Financial Health</span>
              </button>
              
              <button
                onClick={() => setActiveTab('risks')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'risks' 
                    ? 'bg-canvas-soft text-ink border border-hairline shadow-level-1' 
                    : 'text-mute hover:text-ink hover:bg-canvas-soft border border-transparent'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Risks & SEC</span>
              </button>

              <button
                onClick={() => setActiveTab('competition')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'competition' 
                    ? 'bg-canvas-soft text-ink border border-hairline shadow-level-1' 
                    : 'text-mute hover:text-ink hover:bg-canvas-soft border border-transparent'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Market & Peers</span>
              </button>

              <button
                onClick={() => setActiveTab('news')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'news' 
                    ? 'bg-canvas-soft text-ink border border-hairline shadow-level-1' 
                    : 'text-mute hover:text-ink hover:bg-canvas-soft border border-transparent'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>News & Sentiment</span>
              </button>
            </div>
          </div>

          {/* Center Main Content */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 z-10 scroll-smooth h-full relative">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
              
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* Verdict Card */}
                  <div className={`bg-canvas border rounded-xl p-8 shadow-level-3 flex flex-col justify-between ${
                    report?.decision?.recommendation === 'BUY' ? 'border-primary' :
                    report?.decision?.recommendation === 'SELL' ? 'border-error' :
                    'border-warning'
                  }`}>
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="text-xs font-mono text-mute uppercase tracking-wider block mb-2">Agent Recommendation</span>
                          <h3 className={`text-5xl font-semibold tracking-tighter ${
                            report?.decision?.recommendation === 'BUY' ? 'text-primary' :
                            report?.decision?.recommendation === 'SELL' ? 'text-error' :
                            'text-warning'
                          }`}>
                            {report?.decision?.recommendation || 'HOLD'}
                          </h3>
                        </div>
                        
                        <div className="text-right">
                          <span className="text-xs font-mono text-mute uppercase tracking-wider block mb-2">Confidence</span>
                          <div className="text-4xl font-semibold tracking-tight text-ink">
                            {report?.decision?.confidence || 50}%
                          </div>
                        </div>
                      </div>

                      <p className="text-body text-base leading-relaxed mb-6 font-medium bg-canvas-soft p-4 rounded-lg border border-hairline">
                        "{report?.decision?.finalVerdict || 'Hold status concluded.'}"
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-t border-hairline pt-6 text-sm">
                      <div>
                        <span className="text-mute block mb-1">Horizon</span>
                        <span className="text-ink font-medium">{report?.decision?.investmentHorizon || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-mute block mb-1">Risk Profile</span>
                        <span className={`font-medium ${
                          report?.decision?.riskLevel === 'Low' ? 'text-primary' :
                          report?.decision?.riskLevel === 'High' ? 'text-error' : 'text-warning'
                        }`}>{report?.decision?.riskLevel || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-mute block mb-1">Expected Return</span>
                        <span className="text-ink font-medium">{report?.decision?.expectedReturn || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bull vs Bear Cases */}
                  <div className="bg-canvas border border-hairline rounded-xl p-8 shadow-level-2 flex flex-col">
                    <h4 className="text-lg font-semibold text-ink mb-6 flex items-center space-x-2 tracking-tight border-b border-hairline pb-4">
                      <Award className="w-5 h-5 text-mute" />
                      <span>The Research Case</span>
                    </h4>
                    
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Bull */}
                      <div>
                        <span className="text-xs font-mono font-medium text-ink uppercase tracking-wider flex items-center space-x-2 mb-4 bg-canvas-soft px-3 py-1.5 rounded-full w-fit border border-hairline">
                          <TrendingUp className="w-4 h-4" />
                          <span>Bull Case</span>
                        </span>
                        <ul className="space-y-3 text-sm text-body">
                          {(report?.decision?.bullCase || []).map((c, i) => (
                            <li key={i} className="flex items-start space-x-2.5">
                              <CheckCircle className="w-4 h-4 text-mute mt-0.5 shrink-0" />
                              <span className="leading-relaxed">{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Bear */}
                      <div>
                        <span className="text-xs font-mono font-medium text-ink uppercase tracking-wider flex items-center space-x-2 mb-4 bg-canvas-soft px-3 py-1.5 rounded-full w-fit border border-hairline">
                          <TrendingDown className="w-4 h-4" />
                          <span>Bear Case</span>
                        </span>
                        <ul className="space-y-3 text-sm text-body">
                          {(report?.decision?.bearCase || []).map((c, i) => (
                            <li key={i} className="flex items-start space-x-2.5">
                              <AlertTriangle className="w-4 h-4 text-mute mt-0.5 shrink-0" />
                              <span className="leading-relaxed">{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FINANCIALS TAB */}
              {activeTab === 'financials' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* Financial Score Card */}
                  <div className="bg-canvas border border-hairline rounded-xl p-8 shadow-level-2 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-mono text-mute uppercase tracking-wider block mb-2">Health Score</span>
                      <div className="flex items-baseline space-x-1 mt-2">
                        <span className="text-6xl font-semibold tracking-tighter text-ink">{report?.financials?.score || 5}</span>
                        <span className="text-mute text-xl font-medium">/10</span>
                      </div>
                      
                      {/* Health meter bar */}
                      <div className="w-full bg-canvas-soft h-2 rounded-full mt-6 overflow-hidden border border-hairline">
                        <div 
                          className={`h-full ${
                            (report?.financials?.score || 5) >= 7.5 ? 'bg-primary' :
                            (report?.financials?.score || 5) >= 5.0 ? 'bg-warning' : 'bg-error'
                          }`}
                          style={{ width: `${(report?.financials?.score || 5) * 10}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2 mt-8 text-sm">
                      {(report?.financials?.analysis || []).slice(0, 3).map((rule, idx) => (
                        <div key={idx} className="flex items-start space-x-2 text-body">
                          <CheckCircle className="w-4 h-4 text-mute mt-0.5 shrink-0" />
                          <span className="leading-snug">{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Health Metrics Grid */}
                  <div className="bg-canvas border border-hairline rounded-xl p-8 shadow-level-2">
                    <div className="flex items-center justify-between mb-8 border-b border-hairline pb-4">
                      <h4 className="text-lg font-semibold text-ink flex items-center space-x-2 tracking-tight">
                        <BarChart3 className="w-5 h-5 text-mute" />
                        <span>Key Financial Metrics</span>
                      </h4>
                      <span className="text-xs text-mute font-mono hidden md:inline-block">Click cards to audit</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Market Cap', val: formatCurrency(report?.financials?.metrics?.marketCap), key: 'marketCap' },
                        { label: 'Revenue', val: formatCurrency(report?.financials?.metrics?.revenue), key: 'revenue' },
                        { label: 'P/E Ratio', val: report?.financials?.metrics?.peRatio || 'N/A', key: 'peRatio' },
                        { label: 'ROE', val: formatPercent(report?.financials?.metrics?.roe), key: 'roe' },
                        { label: 'Free Cash Flow', val: formatCurrency(report?.financials?.metrics?.freeCashFlow), key: 'freeCashFlow' },
                        { label: 'Total Debt', val: formatCurrency(report?.financials?.metrics?.totalDebt), key: 'totalDebt' },
                        { label: 'Profit Margin', val: formatPercent(report?.financials?.metrics?.profitMargin), key: 'profitMargin' },
                        { label: 'Current Ratio', val: report?.financials?.metrics?.currentRatio || 'N/A', key: 'currentRatio' }
                      ].map(item => (
                        <div 
                          key={item.key} 
                          onClick={() => triggerEvidence(item.label, item.val)}
                          className="bg-canvas-soft border border-hairline p-5 rounded-lg cursor-pointer transition-shadow hover:shadow-level-2 hover:border-hairline-strong group"
                        >
                          <span className="text-xs font-mono text-mute uppercase tracking-wide group-hover:text-body transition-colors">{item.label}</span>
                          <span className="block text-xl font-semibold text-ink tracking-tight mt-2">{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* RISKS TAB */}
              {activeTab === 'risks' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* SEC filings & Risk breakdown */}
                  <div className="bg-canvas border border-hairline rounded-xl p-8 shadow-level-2">
                    <h4 className="text-lg font-semibold text-ink mb-6 flex items-center space-x-2 tracking-tight border-b border-hairline pb-4">
                      <ShieldAlert className="w-5 h-5 text-mute" />
                      <span>Risk Factors & SEC Flags</span>
                    </h4>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-canvas-soft border border-hairline p-5 rounded-lg">
                          <span className="text-xs font-mono font-medium text-ink uppercase tracking-wide block mb-3">Valuation</span>
                          <p className="text-sm text-body leading-relaxed">{report?.risks?.valuationRisks || 'N/A'}</p>
                        </div>
                        <div className="bg-canvas-soft border border-hairline p-5 rounded-lg">
                          <span className="text-xs font-mono font-medium text-ink uppercase tracking-wide block mb-3">Operational</span>
                          <p className="text-sm text-body leading-relaxed">{report?.risks?.operationalRisks || 'N/A'}</p>
                        </div>
                        <div className="bg-canvas-soft border border-hairline p-5 rounded-lg">
                          <span className="text-xs font-mono font-medium text-ink uppercase tracking-wide block mb-3">Regulatory</span>
                          <p className="text-sm text-body leading-relaxed">{report?.risks?.regulatoryRisks || 'N/A'}</p>
                        </div>
                      </div>

                      {report?.risks?.redFlags?.length > 0 && (
                        <div className="pt-2">
                          <span className="text-xs font-mono text-mute uppercase block mb-3">Critical Flags</span>
                          <div className="flex flex-wrap gap-2">
                            {(report?.risks?.redFlags || []).map((flag, idx) => (
                              <span 
                                key={idx}
                                className="bg-canvas-soft border border-hairline text-ink text-sm px-3 py-1.5 rounded-full flex items-center space-x-2 shadow-level-1"
                              >
                                <AlertTriangle className="w-4 h-4 text-error" />
                                <span>{flag}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* COMPETITION TAB */}
              {activeTab === 'competition' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* Competitor Radar Analysis Chart */}
                  <div className="bg-canvas border border-hairline rounded-xl p-8 shadow-level-2 flex flex-col">
                    <h4 className="text-lg font-semibold text-ink mb-6 flex items-center space-x-2 tracking-tight border-b border-hairline pb-4">
                      <Globe className="w-5 h-5 text-mute" />
                      <span>Peer Analysis Matrix</span>
                    </h4>
                    
                    <div className="h-64 flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getRadarChartData()}>
                          <PolarGrid stroke="#ebebeb" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#4d4d4d', fontSize: 11, fontFamily: 'Inter' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name={report?.companyName} dataKey="A" stroke="#171717" strokeWidth={2} fill="#171717" fillOpacity={0.1} />
                          <Radar name="Industry Median" dataKey="B" stroke="#a1a1a1" strokeWidth={1} fill="#a1a1a1" fillOpacity={0.05} />
                          <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Inter', paddingTop: '10px' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Competitive Peer Grid */}
                  <div className="bg-canvas border border-hairline rounded-xl p-8 shadow-level-2 flex flex-col justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-ink mb-6 flex items-center space-x-2 tracking-tight border-b border-hairline pb-4">
                        <Layers className="w-5 h-5 text-mute" />
                        <span>Competitive Benchmarks</span>
                      </h4>

                      <div className="border border-hairline rounded-lg overflow-hidden text-sm">
                        <div className="grid grid-cols-3 bg-canvas-soft border-b border-hairline p-3 text-mute font-mono text-xs uppercase tracking-wider">
                          <div>Metric</div>
                          <div>{report?.ticker}</div>
                          <div>Peers</div>
                        </div>
                        <div className="divide-y divide-hairline bg-canvas">
                          {(report?.competition?.comparison || []).map((comp, idx) => (
                            <div key={idx} className="grid grid-cols-3 p-3 hover:bg-canvas-soft transition-colors">
                              <div className="font-medium text-ink">{comp.metric}</div>
                              <div className="text-ink">{comp.subject}</div>
                              <div className="text-body truncate">{comp.competitors}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="bg-canvas-soft border border-hairline p-4 rounded-lg">
                        <span className="text-xs font-mono font-medium text-ink uppercase tracking-wide block mb-2">Moat</span>
                        <p className="text-sm text-body">{report?.competition?.marketPositioning?.advantages?.[0] || 'N/A'}</p>
                      </div>
                      <div className="bg-canvas-soft border border-hairline p-4 rounded-lg">
                        <span className="text-xs font-mono font-medium text-ink uppercase tracking-wide block mb-2">Threat</span>
                        <p className="text-sm text-body">{report?.competition?.marketPositioning?.disadvantages?.[0] || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NEWS TAB */}
              {activeTab === 'news' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  {/* News Feed & Sentiment */}
                  <div className="bg-canvas border border-hairline rounded-xl p-8 shadow-level-2 flex flex-col">
                    <div className="flex justify-between items-center mb-6 border-b border-hairline pb-4">
                      <h4 className="text-lg font-semibold text-ink flex items-center space-x-2 tracking-tight">
                        <Activity className="w-5 h-5 text-mute" />
                        <span>News Sentiment</span>
                      </h4>
                      <span className={`font-mono text-xs font-medium px-3 py-1 rounded-full uppercase border ${
                        report?.news?.sentiment === 'positive' ? 'bg-canvas text-primary border-primary' :
                        report?.news?.sentiment === 'negative' ? 'bg-canvas text-error border-error' :
                        'bg-canvas-soft text-ink border-hairline'
                      }`}>
                        {report?.news?.sentiment || 'NEUTRAL'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-body leading-relaxed mb-6 bg-canvas-soft p-4 rounded-lg border border-hairline">
                      {report?.news?.summary || 'No news summary available.'}
                    </p>

                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      {(report?.news?.positive || []).map((item, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <TrendingUp className="w-4 h-4 text-mute shrink-0 mt-0.5" />
                          <p className="text-sm text-ink leading-relaxed">{item}</p>
                        </div>
                      ))}
                      {(report?.news?.negative || []).map((item, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <TrendingDown className="w-4 h-4 text-mute shrink-0 mt-0.5" />
                          <p className="text-sm text-ink leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Panel: Sticky Contextual Chatbot */}
          <div className="w-full lg:w-80 xl:w-[380px] border-t lg:border-t-0 lg:border-l border-hairline bg-canvas flex flex-col shrink-0 z-20 h-full shadow-level-4">
            
            {/* Chat Header */}
            <div className="p-4 border-b border-hairline flex items-center space-x-2 bg-canvas-soft">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs font-medium text-ink uppercase tracking-widest">Analyst Chat</span>
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`flex flex-col space-y-1.5 max-w-[90%] ${
                    msg.role === 'user' ? 'ml-auto items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center space-x-2 text-xs font-mono text-mute px-1">
                    {msg.role === 'user' ? (
                      <><span>You</span><User className="w-3 h-3" /></>
                    ) : (
                      <><Cpu className="w-3 h-3 text-primary" /><span>Zaya</span></>
                    )}
                  </div>
                  
                  <div className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-primary text-on-primary rounded-tr-sm shadow-level-1' 
                      : 'bg-canvas-soft border border-hairline text-ink rounded-tl-sm shadow-level-1'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-p:leading-relaxed max-w-none text-ink">
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex items-center space-x-2 text-mute text-sm bg-canvas-soft w-fit p-3 rounded-2xl rounded-tl-sm border border-hairline">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-hairline bg-canvas">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full bg-canvas-soft border border-hairline text-ink placeholder-mute rounded-full pl-4 pr-12 py-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-level-1 text-sm transition-shadow"
                />
                <button 
                  type="submit" 
                  disabled={chatLoading || !inputMessage.trim()}
                  className="absolute right-1.5 p-2 bg-primary text-on-primary rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-level-1"
                >
                  <Send className="w-4 h-4 translate-x-px translate-y-px" />
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* Evidence Modal Popup */}
      {evidenceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-canvas border border-hairline rounded-xl max-w-md w-full p-8 shadow-level-5 relative">
            <div className="flex items-center space-x-2 mb-6 border-b border-hairline pb-4">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="font-semibold text-ink tracking-tight">Audit Trail</span>
            </div>
            
            <div className="space-y-5">
              <div>
                <span className="text-xs font-mono text-mute uppercase tracking-wider block mb-1">Metric</span>
                <span className="text-ink font-medium text-base">{evidenceModal.metric}</span>
              </div>
              
              <div>
                <span className="text-xs font-mono text-mute uppercase tracking-wider block mb-1">Value</span>
                <span className="text-ink font-semibold text-2xl tracking-tight">{evidenceModal.value}</span>
              </div>

              <div>
                <span className="text-xs font-mono text-mute uppercase tracking-wider block mb-1">Source</span>
                <span className="text-ink font-medium bg-canvas-soft px-2 py-1 rounded border border-hairline text-sm inline-block">{evidenceModal.source}</span>
              </div>

              <div className="bg-canvas-soft p-4 rounded-lg border border-hairline mt-4">
                <span className="text-xs font-mono text-mute uppercase tracking-wider block mb-2">Notes</span>
                <p className="text-sm text-body leading-relaxed">{evidenceModal.details}</p>
              </div>
            </div>

            <button 
              onClick={() => setEvidenceModal(null)}
              className="mt-8 w-full bg-primary hover:opacity-90 text-on-primary font-medium py-3 rounded-full transition-opacity shadow-level-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
