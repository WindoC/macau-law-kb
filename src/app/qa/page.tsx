'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';

/**
 * 法律問答頁面組件
 * 允許用戶提出法律問題並獲得AI驅動的答案
 */
export default function QAPage() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setAnswer('');
    setSources([]);

    try {
      // TODO: 實現問答API調用
      console.log('提出問題:', question);
      // AI回應的佔位符
      setAnswer('');
      setSources([]);
    } catch (error) {
      console.error('問答錯誤:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    const content = `**問題:** ${question}\n\n**答案:** ${answer}\n\n**來源:** ${sources.map(s => s.title).join(', ')}`;
    navigator.clipboard.writeText(content);
    alert('已複製到剪貼板');
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
                <p className="text-muted mb-0">基於澳門法律文件獲得AI驅動的專業答案</p>
              </div>
            </div>

            <div className="card mb-4">
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="question" className="form-label">您的法律問題</label>
                    <textarea
                      id="question"
                      className="form-control"
                      rows={4}
                      placeholder="在此提出您的法律問題（例如：「在澳門開設企業需要什麼條件？」）"
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
                        獲得答案
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
                  AI正在分析您的問題並搜索相關法律文件...
                </div>
              </div>
            )}

            {answer && (
              <div className="mt-4">
                <div className="card border-success">
                  <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="fas fa-robot me-2"></i>
                      AI 答案
                    </h5>
                    <button 
                      className="btn btn-light btn-sm"
                      onClick={copyToClipboard}
                      title="複製問題和答案到剪貼板"
                    >
                      <i className="fas fa-copy me-1"></i>
                      複製
                    </button>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <strong className="text-success">
                        <i className="fas fa-question me-1"></i>
                        問題:
                      </strong>
                      <div className="mt-2 p-3 bg-light rounded">
                        {question}
                      </div>
                    </div>
                    <div className="mb-3">
                      <strong className="text-success">
                        <i className="fas fa-lightbulb me-1"></i>
                        答案:
                      </strong>
                      <div className="mt-2 p-3 border rounded" style={{ whiteSpace: 'pre-wrap' }}>
                        {answer}
                      </div>
                    </div>
                    
                    {sources.length > 0 && (
                      <div>
                        <strong className="text-success">
                          <i className="fas fa-book me-1"></i>
                          參考來源:
                        </strong>
                        <div className="mt-2">
                          {sources.map((source, index) => (
                            <div key={index} className="border rounded p-3 mb-2 bg-light">
                              <h6 className="mb-1 text-primary">{source.title}</h6>
                              <p className="mb-1 text-muted small">{source.content}</p>
                              <small className="text-muted">
                                <i className="fas fa-chart-bar me-1"></i>
                                相關度: {Math.round(source.similarity * 100)}%
                              </small>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!loading && !answer && question && (
              <div className="alert alert-warning">
                <i className="fas fa-exclamation-triangle me-2"></i>
                未能生成答案。請嘗試重新表述您的問題或檢查網絡連接。
              </div>
            )}

            {!question && (
              <div className="card bg-light">
                <div className="card-body text-center">
                  <i className="fas fa-comments fa-2x text-success mb-3"></i>
                  <h5>問答提示</h5>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <div className="border rounded p-3 bg-white">
                        <h6 className="text-success">範例問題</h6>
                        <ul className="list-unstyled text-start small text-muted">
                          <li>• "在澳門註冊公司的步驟是什麼？"</li>
                          <li>• "作為租客在澳門有什麼權利？"</li>
                          <li>• "澳門的勞動法如何運作？"</li>
                          <li>• "澳門的稅務制度是怎樣的？"</li>
                        </ul>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="border rounded p-3 bg-white">
                        <h6 className="text-primary">提問技巧</h6>
                        <ul className="list-unstyled text-start small text-muted">
                          <li>• 提供具體的法律情況</li>
                          <li>• 使用清晰明確的語言</li>
                          <li>• 包含相關的背景信息</li>
                          <li>• 指明特定的法律領域</li>
                        </ul>
                      </div>
                    </div>
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
