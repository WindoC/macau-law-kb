import { Container, Row, Col, Accordion } from 'react-bootstrap';

export default function LegalInformationSection() {
  return (
    <section className="py-5 bg-light">
      <Container>
        <Row className="text-center mb-5">
          <Col>
            <h2 className="fw-bold">條款與聲明</h2>
            <p className="text-muted">請詳閱以下重要條款與聲明文件</p>
          </Col>
        </Row>
        <Row>
          <Col lg={10} className="mx-auto">
            <Accordion defaultActiveKey={null} flush>
              <Accordion.Item eventKey="0">
                <Accordion.Header>
                  <div className="d-flex align-items-center">
                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', fontSize: '14px' }}>
                      <i className="fas fa-file-contract"></i>
                    </div>
                    <div>
                      <h5 className="mb-1">服務條款 (Terms of Use)</h5>
                      <small className="text-muted">最後更新：2025年6月7日</small>
                    </div>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <div className="legal-content">
                    <p className="lead">歡迎使用「澳門法律知識庫」（以下簡稱「本平台」）！</p>
                    <p>在使用本服務前，請您詳閱以下使用條款。當您註冊、登入或以任何方式使用本平台時，即表示您已閱讀、理解並同意接受以下所有條款。</p>

                    <h4>1. 服務說明</h4>
                    <p>本平台為一個結合人工智慧（AI）技術的法律資訊服務系統，提供如下功能：</p>
                    <ul>
                      <li><strong>「法律檢索」</strong>：利用 AI 技術協助用戶搜尋與其查詢相關的法律條文或資料；</li>
                      <li><strong>「法律問答」</strong>：根據用戶輸入進行內容分析，回應以人性化方式呈現；</li>
                      <li><strong>「法律顧問」</strong>：可持續對話的法律模擬諮詢功能。</li>
                    </ul>
                    <p>所有內容皆由 Google Gemini 模型生成，僅供參考，不構成法律建議。</p>

                    <h4>2. 用戶帳戶</h4>
                    <ul>
                      <li>本平台僅接受 Google 或 GitHub OIDC 登入註冊，用戶帳號以電子郵件為識別。</li>
                      <li>您須妥善保管帳戶登入資訊，並為您帳戶下所發生的所有行為負責。</li>
                    </ul>

                    <h4>3. 用戶行為準則</h4>
                    <p>使用本平台時，您不得：</p>
                    <ul>
                      <li>違反任何適用法律或法規；</li>
                      <li>傳送、發布、儲存或分享任何非法、有害、誹謗、侵權或猥褻之內容；</li>
                      <li>利用機器人、自動化腳本、大量請求等方式干擾服務正常運作；</li>
                      <li>嘗試破解、本平台系統、API 或資料安全防線。</li>
                    </ul>

                    <h4>4. 服務等級與費用</h4>
                    <p>本平台提供「免費」及「付費」兩種用戶層級，每一層級具不同功能限制與 Token 使用配額：</p>
                    <ul>
                      <li>免費用戶每月可獲得基本 Token 額度；</li>
                      <li>付費用戶可根據金額購買額外 Token 並解鎖顧問功能。</li>
                    </ul>
                    <p>Token 計價與配額使用政策將於網站上另行公告，並可由平台隨時修改。</p>

                    <h4>5. 服務暫停與終止</h4>
                    <p>若您違反使用條款，我們有權隨時暫停或終止您對本平台之訪問與帳戶，無需事前通知。</p>
                  </div>
                </Accordion.Body>
              </Accordion.Item>

              <Accordion.Item eventKey="1">
                <Accordion.Header>
                  <div className="d-flex align-items-center">
                    <div className="bg-warning text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', fontSize: '14px' }}>
                      <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div>
                      <h5 className="mb-1">免責聲明 (Disclaimer)</h5>
                      <small className="text-muted">重要法律聲明</small>
                    </div>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <div className="legal-content">
                    <h4>1. 非法律建議</h4>
                    <p>本平台所有輸出內容，包括但不限於 AI 回應、文件摘要、法條比對與建議，<strong>僅供資訊參考之用</strong>，<strong>不構成正式法律建議或專業意見</strong>。請務必諮詢執業律師以獲取法律協助。</p>

                    <h4>2. 無律師-客戶關係</h4>
                    <p>使用本平台並不會建立您與本平台、開發團隊或任何服務供應者之間的律師-客戶關係。</p>

                    <h4>3. AI 輸出內容限制</h4>
                    <ul>
                      <li>AI 模型回應之準確性、時效性與完整性皆有限制；</li>
                      <li>所產生內容可能與實際法律條文不符或過時；</li>
                      <li>用戶應自行判斷資訊可信度並承擔使用風險；</li>
                      <li>本平台對任何因依賴 AI 回應內容導致之損害不承擔任何責任。</li>
                    </ul>

                    <h4>4. 第三方服務依賴</h4>
                    <p>本平台仰賴第三方技術服務如：</p>
                    <ul>
                      <li><strong>Google Gemini AI</strong>（AI 回應生成）</li>
                      <li><strong>Supabase</strong>（雲端資料儲存服務）</li>
                      <li><strong>OAuth 認證服務</strong>（身分驗證）等</li>
                    </ul>
                    <p>我們對上述第三方服務之可用性、安全性與正確性不提供保證。</p>
                  </div>
                </Accordion.Body>
              </Accordion.Item>

              <Accordion.Item eventKey="2">
                <Accordion.Header>
                  <div className="d-flex align-items-center">
                    <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px', fontSize: '14px' }}>
                      <i className="fas fa-shield-alt"></i>
                    </div>
                    <div>
                      <h5 className="mb-1">數據收集聲明 (Privacy Policy)</h5>
                      <small className="text-muted">隱私保護政策</small>
                    </div>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <div className="legal-content">
                    <h4>1. 我們收集的資訊</h4>
                    <p>為提供與優化本平台功能，我們會收集以下類型資料：</p>

                    <h5>帳戶資訊：</h5>
                    <ul>
                      <li>Google / GitHub OIDC 認證後的姓名與電子郵件地址；</li>
                    </ul>

                    <h5>使用記錄：</h5>
                    <ul>
                      <li>查詢輸入（法律檢索、問答、顧問）；</li>
                      <li>AI 生成的回答（法律問答、顧問）；</li>
                      <li>法律顧問模組下的對話歷史；</li>
                    </ul>

                    <h5>技術資料：</h5>
                    <ul>
                      <li>使用者 IP 位址、請求時間與來源裝置識別碼；</li>
                      <li>系統使用行為指標與存取記錄。</li>
                    </ul>

                    <h4>2. 資料使用目的</h4>
                    <ul>
                      <li>驗證用戶身分並提供登入保護；</li>
                      <li>執行 AI 模型處理、查詢向量比對與回應生成；</li>
                      <li>優化 AI 溝通表現與內容準確性；</li>
                      <li>管理用戶分級、Token 配額與使用統計；</li>
                      <li>防止濫用、監控不正常行為並維護系統安全。</li>
                    </ul>

                    <h4>3. 數據儲存與安全</h4>
                    <ul>
                      <li>所有資料儲存於 Supabase 雲端服務，透過 PostgreSQL 進行資料管理；</li>
                      <li>僅授權的管理人員可檢視使用記錄；</li>
                      <li>使用 JWT 驗證與安全標頭提供 API 安全防護。</li>
                    </ul>

                    <h4>4. 第三方資料處理</h4>
                    <ul>
                      <li>使用者查詢資料與上下文會傳送至 <strong>Google Gemini API</strong> 以生成 AI 回應；</li>
                      <li>除非法律強制要求，或經您明確授權，我們不會向其他第三方分享您的個人可識別資訊。</li>
                    </ul>

                    <div className="alert alert-info mt-4">
                      <i className="fas fa-info-circle me-2"></i>
                      如需更多資料或提出隱私查詢，請聯絡開發團隊。本條款若有修訂，將於平台上公告並即時生效。
                    </div>
                  </div>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Col>
        </Row>
      </Container>
    </section>
  );
}
