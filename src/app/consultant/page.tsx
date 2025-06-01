'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * 法律諮詢頁面組件
 * 提供基於聊天的AI法律諮詢服務
 */
export default function ConsultantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // TODO: 實現諮詢API調用
      console.log('發送訊息:', userMessage.content);
      
      // AI回應的佔位符
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '這是一個佔位符回應。AI法律顧問將基於澳門法律提供法律指導。',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('諮詢錯誤:', error);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  const copyConversation = () => {
    const content = messages.map(msg => 
      `**${msg.role === 'user' ? '您' : 'AI法律顧問'}:** ${msg.content}`
    ).join('\n\n');
    navigator.clipboard.writeText(content);
    alert('已複製對話到剪貼板');
  };

  return (
    <>
      <Navigation />
      <div className="container mt-4">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center">
                <div className="bg-warning text-white rounded-circle d-inline-flex align-items-center justify-content-center me-3" style={{width: '50px', height: '50px'}}>
                  <i className="fas fa-comments fa-lg"></i>
                </div>
                <div>
                  <h1 className="mb-1">法律諮詢</h1>
                  <p className="text-muted mb-0">與AI法律顧問對話，獲得澳門法律的全面指導</p>
                </div>
              </div>
              <div>
                <button 
                  className="btn btn-outline-secondary me-2"
                  onClick={copyConversation}
                  disabled={messages.length === 0}
                >
                  <i className="fas fa-copy me-1"></i>
                  複製對話
                </button>
                <button 
                  className="btn btn-outline-warning"
                  onClick={startNewConversation}
                  disabled={messages.length === 0}
                >
                  <i className="fas fa-plus me-1"></i>
                  新對話
                </button>
              </div>
            </div>

            <div className="card border-warning" style={{ height: '600px' }}>
              <div className="card-body d-flex flex-column">
                {/* 聊天訊息 */}
                <div className="flex-grow-1 overflow-auto mb-3" style={{ maxHeight: '500px' }}>
                  {messages.length === 0 ? (
                    <div className="text-center text-muted mt-5">
                      <i className="fas fa-gavel fa-3x text-warning mb-3"></i>
                      <h5>歡迎使用法律諮詢</h5>
                      <p>開始對話，詢問任何關於澳門法律的問題。</p>
                      <div className="mt-4">
                        <h6>範例問題:</h6>
                        <div className="row">
                          <div className="col-md-6">
                            <ul className="list-unstyled text-start">
                              <li className="mb-2">
                                <i className="fas fa-building text-primary me-2"></i>
                                "在澳門註冊公司的步驟是什麼？"
                              </li>
                              <li className="mb-2">
                                <i className="fas fa-home text-success me-2"></i>
                                "作為租客在澳門有什麼權利？"
                              </li>
                            </ul>
                          </div>
                          <div className="col-md-6">
                            <ul className="list-unstyled text-start">
                              <li className="mb-2">
                                <i className="fas fa-briefcase text-warning me-2"></i>
                                "澳門的勞動法如何運作？"
                              </li>
                              <li className="mb-2">
                                <i className="fas fa-calculator text-info me-2"></i>
                                "澳門的稅務制度是怎樣的？"
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`mb-3 d-flex ${message.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
                        >
                          <div
                            className={`p-3 rounded ${
                              message.role === 'user'
                                ? 'bg-warning text-dark'
                                : 'bg-light border'
                            }`}
                            style={{ maxWidth: '70%' }}
                          >
                            <div className="d-flex align-items-start mb-2">
                              <i className={`fas ${message.role === 'user' ? 'fa-user' : 'fa-robot'} me-2 mt-1`}></i>
                              <strong className="small">
                                {message.role === 'user' ? '您' : 'AI法律顧問'}
                              </strong>
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                              {message.content}
                            </div>
                            <small className={`d-block mt-2 ${message.role === 'user' ? 'text-dark' : 'text-muted'}`}>
                              {message.timestamp.toLocaleTimeString('zh-TW')}
                            </small>
                          </div>
                        </div>
                      ))}
                      
                      {loading && (
                        <div className="mb-3 d-flex justify-content-start">
                          <div className="bg-light border p-3 rounded" style={{ maxWidth: '70%' }}>
                            <div className="d-flex align-items-center">
                              <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                              <i className="fas fa-robot me-2"></i>
                              AI法律顧問正在思考...
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 輸入表單 */}
                <form onSubmit={handleSubmit}>
                  <div className="input-group">
                    <textarea
                      className="form-control"
                      placeholder="詢問您的法律問題或繼續對話..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={loading}
                      rows={2}
                      style={{ resize: 'none' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e);
                        }
                      }}
                    />
                    <button 
                      className="btn btn-warning" 
                      type="submit"
                      disabled={loading || !input.trim()}
                    >
                      {loading ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane me-1"></i>
                          發送
                        </>
                      )}
                    </button>
                  </div>
                  <small className="text-muted">
                    <i className="fas fa-keyboard me-1"></i>
                    按 Enter 發送，Shift+Enter 換行
                  </small>
                </form>
              </div>
            </div>

            <div className="mt-3">
              <div className="alert alert-info border-info">
                <h6 className="alert-heading">
                  <i className="fas fa-lightbulb me-2"></i>
                  使用提示
                </h6>
                <div className="row">
                  <div className="col-md-6">
                    <ul className="mb-0">
                      <li>針對您的法律情況提供具體描述以獲得更好的指導</li>
                      <li>AI會記住對話內容，您可以提出後續問題</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <ul className="mb-0">
                      <li>您可以要求澄清或更詳細的解釋</li>
                      <li>所有對話都會保存到您的歷史記錄中</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
