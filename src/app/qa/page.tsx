'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from '@/components/Navigation';

/**
 * 法律問答頁面組件
 * 允許用戶提問並獲得AI生成的法律建議
 */
export default function QAPage() {
  const [question, setQuestion] = useState(''); // This is the input field's question
  const [submittedQuestion, setSubmittedQuestion] = useState(''); // This will store the submitted question
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState('');
  const [fragmentIdentifiers, setFragmentIdentifiers] = useState<{[key: string]: string}>({});
  const [expandedSources, setExpandedSources] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    const extractFragmentIdentifiers = () => {
      const newFragmentIdentifiers: { [key: string]: string } = {};
      sources.forEach((source) => {
        const regex = /<a name="([^"]*)">/i;
        const match = source.content.match(regex);
        if (match && match[1]) {
          newFragmentIdentifiers[source.id] = match[1];
        } else {
          newFragmentIdentifiers[source.id] = '';
        }
      });
      setFragmentIdentifiers(newFragmentIdentifiers);
    };

    extractFragmentIdentifiers();
  }, [sources]);

  // useEffect(() => {
  //   if (loading) {
  //     window.scrollTo(0, document.body.scrollHeight);
  //   }
  // }, [answer, currentStep, loading]);

  const toggleSource = (id: string) => {
    setExpandedSources(prevState => ({
      ...prevState,
      [id]: !prevState[id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setSubmittedQuestion(question); // Store the question before clearing the input field
    setLoading(true);
    setAnswer('');
    setSources([]);
    setError(null);
    setWarning(null);
    setCurrentStep('');

    try {
      const { getSessionToken } = await import('@/lib/auth');
      const token = await getSessionToken();
      
      if (!token) {
        setError('請先登入');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '處理問題失敗');
        setLoading(false);
        return;
      }

      if (!response.body) {
        setError('無效的串流回應');
        setLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (dataStr.trim()) {
              try {
                const data = JSON.parse(dataStr);
                if (data.type === 'step') {
                  setCurrentStep(data.content);
                } else if (data.type === 'answer_chunk') {
                  setAnswer(prev => prev + data.content);
                } else if (data.type === 'sources') {
                  setSources(data.content);
                } else if (data.type === 'error') {
                  setError(data.content);
                }
              } catch (e) {
                console.error('Error parsing stream data:', e, 'Data string:', dataStr);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('問答錯誤:', error);
      setError(error instanceof Error ? error.message : '處理問題失敗，請稍後再試');
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const copyQA = () => {
    const content = `**問題:** ${submittedQuestion}\n\n**回答:** ${answer}\n\n**參考來源:**\n${sources.map((source, index) => `${index + 1}. ${source.metadata.law_id} - ${source.metadata.title} (第 ${source.metadata.loc.lines.from} 至 ${source.metadata.loc.lines.to} 行) (相關度: ${Math.round(source.similarity * 100)}%)`).join('\n')}`;
    navigator.clipboard.writeText(content);
    setWarning('已複製到剪貼板');
    setTimeout(() => setWarning(null), 3000);
  };

  return (
    <>
      <Navigation />
      <div className="container mt-4">
        <div className="row">
          <div className="col-12">
            <div className="d-flex align-items-center mb-4">
              <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center me-3" style={{width: '50px', height: '50px'}}>
                <i className="fas fa-question-circle fa-lg"></i>
              </div>
              <div>
                <h1 className="mb-1">法律問答</h1>
                <p className="text-muted mb-0">提出您的法律問題，獲得AI驅動的專業建議</p>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="alert alert-danger">
                <i className="fas fa-exclamation-circle me-2"></i>
                {error}
              </div>
            )}

            {/* Warning Alert */}
            {warning && (
              <div className="alert alert-warning">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {warning}
              </div>
            )}

            <div className="card mb-4">
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="questionInput" className="form-label">您的法律問題</label>
                    <textarea
                      id="questionInput"
                      className="form-control"
                      rows={4}
                      placeholder="請詳細描述您的法律問題（例如：「如果我在澳門犯了盜竊罪，可能面臨什麼刑罰？」）"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <button 
                    className="btn btn-success" 
                    type="submit"
                    disabled={loading || !question.trim()}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        分析中...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-1"></i>
                        提交問題
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {loading && (
              <div className="alert alert-info">
                <div className="d-flex align-items-center">
                  <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                  <div>
                    {currentStep ? (
                      <div className="mt-1 small">{currentStep}</div>
                    ) : (
                      <div>正在分析您的問題並生成專業回答...</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {answer && (
              <div className="mt-4">
                <div className="card border-success">
                  <div className="card-header bg-success text-white">
                    <h5 className="mb-0">
                      <i className="fas fa-lightbulb me-2"></i>
                      AI 法律問答
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <h6 className="text-primary">您的問題:</h6>
                      <div className="text-muted">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {submittedQuestion}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <div className="mb-3">
                      <h6 className="text-success">AI 的回答:</h6>
                      <div className="border-start border-success border-3 ps-3">
                        <div className="mb-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {answer}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        <i className="fas fa-info-circle me-1"></i>
                        此建議僅供參考，具體情況請諮詢專業律師
                      </small>
                      <button 
                        className="btn btn-sm btn-outline-success"
                        onClick={copyQA}
                      >
                        <i className="fas fa-copy me-1"></i>
                        複製問答
                      </button>
                    </div>
                  </div>
                </div>

                {sources.length > 0 && (
                  <div className="mt-4">
                    <h5 className="mb-3">
                      <i className="fas fa-book me-2"></i>
                      參考來源
                    </h5>
                    <div className="row">
                      {sources.map((source, index) => (
                        <div key={index} className="col-12 mb-3">
                          <div className="card border-start border-success border-2">
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <span className="bg-success text-white" style={{ padding: '0rem 0.75rem', borderRadius: '0.25rem' }}>
                                  文件 {index + 1}
                                </span>
                                <span className="badge bg-info text-black">
                                  第 {source.metadata.loc.lines.from} 至 {source.metadata.loc.lines.to} 行
                                </span>
                                <span className="badge bg-warning text-white">
                                  <a target="_blank" rel="noopener noreferrer"  href={`${source.metadata.link}${fragmentIdentifiers[source.id] ? `#${fragmentIdentifiers[source.id]}` : ''}`}>印務局文件</a>
                                </span>
                                <span className="badge bg-primary">
                                  相關度: {Math.round(source.similarity * 100)}%
                                </span>
                              </div>
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="card-title text-success">{source.metadata.law_id} - {source.metadata.title}</h6>
                              </div>
                              <div className="card-text">
                                <div 
                                  style={{ 
                                    maxHeight: expandedSources[source.id] ? 'none' : '150px', // Adjust max height as needed
                                    overflow: 'hidden',
                                    transition: 'max-height 0.3s ease'
                                  }}
                                  dangerouslySetInnerHTML={{ __html: source.content }}
                                />
                                <button
                                  className="btn btn-link p-0"
                                  onClick={() => toggleSource(source.id)}
                                >
                                  {expandedSources[source.id] ? '- 摺疊內容' : '+ 展開內容'}
                                </button>
                              </div>
                              <small className="text-muted">
                                <i className="fas fa-file-alt me-1"></i>
                                #{source.id}
                              </small>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!submittedQuestion && (
              <div className="card bg-light">
                <div className="card-body text-center">
                  <i className="fas fa-question-circle fa-2x text-success mb-3"></i>
                  <h5>如何提出好的法律問題</h5>
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <div className="border rounded p-3 bg-white">
                        <h6 className="text-primary">具體情況</h6>
                        <p className="small text-muted mb-0">
                          描述具體的事實和情況，避免過於籠統
                        </p>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <div className="border rounded p-3 bg-white">
                        <h6 className="text-success">相關法律</h6>
                        <p className="small text-muted mb-0">
                          如果知道相關法律條文，可以一併提及
                        </p>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <div className="border rounded p-3 bg-white">
                        <h6 className="text-warning">背景資訊</h6>
                        <p className="small text-muted mb-0">
                          提供足夠的背景資訊以獲得準確建議
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="alert alert-warning mt-3">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <strong>免責聲明:</strong> 此AI系統提供的建議僅供參考，不構成正式法律意見。如需專業法律服務，請諮詢合格律師。
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
