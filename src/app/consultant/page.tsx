'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Navigation from '@/components/Navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * 法律顧問頁面組件
 * 提供與AI法律顧問的對話功能
 */
export default function ConsultantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState('');
  const [streamingResponse, setStreamingResponse] = useState('');
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, loading, streamingResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setLoading(true);
    setError(null);
    setWarning(null);
    setCurrentStep('');
    setStreamingResponse('');

    try {
      // Get session token for authentication
      const { getSessionToken } = await import('@/lib/auth');
      const token = await getSessionToken();
      
      if (!token) {
        setError('請先登入');
        setLoading(false);
        return;
      }

      const requestBody = {
        message: currentInput,
        conversationId: conversationId,
        conversationHistory: messages, // Send full conversation history
        useProModel: false // Can be made configurable
      };

      const response = await fetch('/api/consultant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '處理訊息失敗');
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
      let finalResponse = '';

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
                switch (data.type) {
                  case 'step':
                    setCurrentStep(data.content);
                    break;
                  case 'response_chunk':
                    finalResponse += data.content;
                    setStreamingResponse(finalResponse);
                    break;
                  case 'completion':
                    if (data.content.conversationId && !conversationId) {
                      setConversationId(data.content.conversationId);
                    }
                    break;
                  case 'error':
                    setError(data.content);
                    break;
                }
              } catch (e) {
                console.error('Error parsing stream data:', e);
              }
            }
          }
        }
      }

      // Add final assistant message
      if (finalResponse) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: finalResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

    } catch (error) {
      console.error('顧問錯誤:', error);
      setError(error instanceof Error ? error.message : '處理訊息失敗，請稍後再試');
    } finally {
      setLoading(false);
      setCurrentStep('');
      setStreamingResponse('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setInput('');
    setError(null);
    setWarning(null);
    setCurrentStep('');
    setStreamingResponse('');
  };

  const copyConversation = () => {
    const content = messages.map(msg => 
      `**${msg.role === 'user' ? '用戶' : 'AI顧問'}:** ${msg.content}`
    ).join('\n\n');
    navigator.clipboard.writeText(content);
    setWarning('對話已複製到剪貼板');
    setTimeout(() => setWarning(null), 3000);
  };

  return (
    <>
      <Navigation />
      <div className="container mt-4">
        <div className="row">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div className="d-flex align-items-center">
                <div className="bg-warning text-white rounded-circle d-inline-flex align-items-center justify-content-center me-3" style={{width: '50px', height: '50px'}}>
                  <i className="fas fa-user-tie fa-lg"></i>
                </div>
                <div>
                  <h1 className="mb-1">法律顧問</h1>
                  <p className="text-muted mb-0">與AI法律顧問進行深入對話，獲得專業建議</p>
                </div>
              </div>
              <div>
                <button 
                  className="btn btn-outline-warning me-2"
                  onClick={copyConversation}
                  disabled={messages.length === 0}
                >
                  <i className="fas fa-copy me-1"></i>
                  複製對話
                </button>
                <button 
                  className="btn btn-warning"
                  onClick={startNewConversation}
                  disabled={loading}
                >
                  <i className="fas fa-plus me-1"></i>
                  新對話
                </button>
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

            <div className="card" style={{height: '600px'}}>
              <div className="card-body d-flex flex-column">
                {/* 對話區域 */}
                <div className="flex-grow-1 overflow-auto mb-3" style={{maxHeight: '450px'}} ref={chatMessagesRef}>
                  {messages.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      <i className="fas fa-comments fa-3x mb-3"></i>
                      <h5>開始與AI法律顧問對話</h5>
                      <p>您可以詢問任何法律相關問題，AI顧問會根據澳門法律為您提供專業建議。</p>
                      <div className="row mt-4">
                        <div className="col-md-4">
                          <div className="border rounded p-3">
                            <h6 className="text-primary">案例分析</h6>
                            <p className="small text-muted mb-0">描述具體案例，獲得詳細分析</p>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="border rounded p-3">
                            <h6 className="text-success">法律程序</h6>
                            <p className="small text-muted mb-0">了解各種法律程序和要求</p>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="border rounded p-3">
                            <h6 className="text-warning">權利義務</h6>
                            <p className="small text-muted mb-0">明確您的權利和義務</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="chat-messages">
                      {messages.map((message) => (
                        <div key={message.id} className={`mb-3 d-flex ${message.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                          <div className={`card ${message.role === 'user' ? 'bg-primary text-white' : 'bg-light'}`} style={{maxWidth: '80%'}}>
                            <div className="card-body py-2 px-3">
                              <div className="d-flex align-items-start">
                                <div className={`rounded-circle d-inline-flex align-items-center justify-content-center me-2 ${message.role === 'user' ? 'bg-white text-primary' : 'bg-warning text-white'}`} style={{width: '30px', height: '30px', fontSize: '12px'}}>
                                  <i className={`fas ${message.role === 'user' ? 'fa-user' : 'fa-robot'}`}></i>
                                </div>
                                <div className="flex-grow-1">
                                  <div className="small mb-1">
                                    <strong>{message.role === 'user' ? '您' : 'AI顧問'}</strong>
                                    <span className="ms-2 opacity-75">
                                      {message.timestamp.toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <div style={{whiteSpace: 'pre-wrap'}}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {message.content}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Streaming response */}
                      {loading && streamingResponse && (
                        <div className="mb-3 d-flex justify-content-start">
                          <div className="card bg-light" style={{maxWidth: '80%'}}>
                            <div className="card-body py-2 px-3">
                              <div className="d-flex align-items-start">
                                <div className="bg-warning text-white rounded-circle d-inline-flex align-items-center justify-content-center me-2" style={{width: '30px', height: '30px', fontSize: '12px'}}>
                                  <i className="fas fa-robot"></i>
                                </div>
                                <div className="flex-grow-1">
                                  <div className="small mb-1">
                                    <strong>AI顧問</strong>
                                    <span className="ms-2 opacity-75">正在回應...</span>
                                  </div>
                                  <div style={{whiteSpace: 'pre-wrap'}}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {streamingResponse}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Loading indicator */}
                      {loading && (
                        <div className="mb-3 d-flex justify-content-start">
                          <div className="card bg-light" style={{maxWidth: '80%'}}>
                            <div className="card-body py-2 px-3">
                              <div className="d-flex align-items-center">
                                <div className="bg-warning text-white rounded-circle d-inline-flex align-items-center justify-content-center me-2" style={{width: '30px', height: '30px', fontSize: '12px'}}>
                                  <i className="fas fa-robot"></i>
                                </div>
                                <div>
                                  <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                                  {currentStep || 'AI顧問正在思考...'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 輸入區域 */}
                <form onSubmit={handleSubmit}>
                  <div className="input-group">
                    <textarea
                      className="form-control"
                      placeholder="輸入您的法律問題... (按Enter發送，Shift+Enter換行)"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={loading}
                      rows={2}
                      style={{resize: 'none'}}
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
                </form>
              </div>
            </div>

            <div className="alert alert-warning mt-3">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <strong>重要提醒:</strong> AI顧問提供的建議僅供參考，不構成正式法律意見。如需專業法律服務，請諮詢合格律師。對話內容可能會被記錄用於改善服務品質。
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
