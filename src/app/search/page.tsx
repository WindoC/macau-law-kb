'use client';

import { useState, useEffect } from 'react';
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';
import Navigation from '@/components/Navigation';

/**
 * 法律搜索頁面組件
 * 允許用戶使用AI驅動的搜索功能搜索法律文件
 */
export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [fragmentIdentifiers, setFragmentIdentifiers] = useState<{[key: string]: string}>({});
  const [expandedResults, setExpandedResults] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    const extractFragmentIdentifiers = () => {
      const newFragmentIdentifiers: { [key: string]: string } = {};
      results.forEach((result) => {
        const regex = /<a name="([^"]*)">/i;
        const match = result.content.match(regex);
        if (match && match[1]) {
          newFragmentIdentifiers[result.id] = match[1];
        } else {
          newFragmentIdentifiers[result.id] = '';
        }
      });
      setFragmentIdentifiers(newFragmentIdentifiers);
    };

    extractFragmentIdentifiers();
  }, [results]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setWarning(null);
    
    try {
      // Check if user is authenticated
      const { isAuthenticated } = await import('@/lib/auth-client');
      const authenticated = await isAuthenticated();
      
      if (!authenticated) {
        setError('請先登入');
        return;
      }

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || '搜索失敗');
        return;
      }

      const data = await response.json();
      const searchResults = data.results || [];
      setResults(searchResults);
      
      if (searchResults.length === 0) {
        setWarning('未找到與您查詢相關的結果。請嘗試重新表述您的搜索或使用不同的關鍵詞。');
      }
    } catch (error) {
      console.error('搜索錯誤:', error);
      setError(error instanceof Error ? error.message : '搜索失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const copyResult = (result: any) => {
    const content = `**搜索結果**\n\n**標題:** ${result.metadata.law_id} - ${result.metadata.title}\n\n**段落位置:** 第 ${result.metadata.loc.lines.from} 至 ${result.metadata.loc.lines.to} 行\n\n**連結:** ${result.metadata.link}${fragmentIdentifiers[result.id] ? `#${fragmentIdentifiers[result.id]}` : ''}\n\n**相關度:** ${Math.round(result.similarity * 100)}%\n\n**內容:**\n${result.content}`;
    navigator.clipboard.writeText(content);
    setWarning('已複製到剪貼板');
    setTimeout(() => setWarning(null), 3000);
  };

  const toggleResult = (id: string) => {
    setExpandedResults(prevState => ({
      ...prevState,
      [id]: !prevState[id]
    }));
  };

  return (
    <>
      <Navigation />
      <div className="container mt-4">
        <div className="row">
          <div className="col-12">
            <div className="d-flex align-items-center mb-4">
              <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center me-3" style={{width: '50px', height: '50px'}}>
                <i className="fas fa-search fa-lg"></i>
              </div>
              <div>
                <h1 className="mb-1">法律搜索</h1>
                <p className="text-muted mb-0">使用AI驅動的搜索功能快速找到相關法律文件</p>
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
                <form onSubmit={handleSearch}>
                  <div className="mb-3">
                    <label htmlFor="searchQuery" className="form-label">搜索查詢</label>
                    <div className="input-group">
                      <input
                        id="searchQuery"
                        type="text"
                        className="form-control"
                        placeholder="輸入您的法律搜索查詢（例如：「謀殺罪的最高刑罰」）"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={loading}
                      />
                      <button 
                        className="btn btn-primary" 
                        type="submit"
                        disabled={loading || !query.trim()}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            搜索中...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-search me-1"></i>
                            搜索
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {loading && (
              <div className="alert alert-info">
                <div className="d-flex align-items-center">
                  <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                  正在分析您的查詢並搜索法律文件...
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-3">
                  <i className="fas fa-list-ul me-2"></i>
                  搜索結果
                </h3>
                <div className="row">
                  {results.map((result, index) => (
                    <div key={index} className="col-12 mb-3">
                      <div className="card border-start border-primary border-3">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <span className="bg-success text-white" style={{ padding: '0rem 0.75rem', borderRadius: '0.25rem' }}>
                              文件 {index + 1}
                            </span>
                            <span className="badge bg-info text-black">
                              第 {result.metadata.loc.lines.from} 至 {result.metadata.loc.lines.to} 行
                            </span>
                            <span className="badge bg-warning text-white">
                              <a 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                href={`${result.metadata.link}${fragmentIdentifiers[result.id] ? `#${fragmentIdentifiers[result.id]}` : ''}`}
                              >
                                印務局文件
                              </a>
                            </span>
                            <span className="badge bg-primary">
                              相關度: {Math.round(result.similarity * 100)}%
                            </span>
                          </div>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h5 className="card-title text-primary">{result.metadata.law_id} - {result.metadata.title}</h5>
                          </div>
                          <div className="card-text">
                            <div 
                              style={{ 
                                maxHeight: expandedResults[result.id] ? 'none' : '150px', // Adjust max height as needed
                                overflow: 'hidden',
                                transition: 'max-height 0.3s ease'
                              }}
                              dangerouslySetInnerHTML={{ __html: result.content }}
                            />
                            <button
                              className="btn btn-link p-0"
                              onClick={() => toggleResult(result.id)}
                            >
                              {expandedResults[result.id] ? '- 摺疊內容' : '+ 展開內容'}
                            </button>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                              <i className="fas fa-file-alt me-1"></i>
                              #{result.id}
                            </small>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => copyResult(result)}
                            >
                              <i className="fas fa-copy me-1"></i>
                              複製結果
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!query && (
              <div className="card bg-light">
                <div className="card-body text-center">
                  <i className="fas fa-lightbulb fa-2x text-warning mb-3"></i>
                  <h5>搜索提示</h5>
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <div className="border rounded p-3 bg-white">
                        <h6 className="text-primary">具體查詢</h6>
                        <p className="small text-muted mb-0">
                          使用具體的法律術語或情況描述
                        </p>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <div className="border rounded p-3 bg-white">
                        <h6 className="text-success">關鍵詞組合</h6>
                        <p className="small text-muted mb-0">
                          結合多個相關關鍵詞以獲得更好的結果
                        </p>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <div className="border rounded p-3 bg-white">
                        <h6 className="text-warning">法律領域</h6>
                        <p className="small text-muted mb-0">
                          指定特定的法律領域或法規類型
                        </p>
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
