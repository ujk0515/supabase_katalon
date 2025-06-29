/**
 * 테스트케이스 매퍼 수파베이스 연동 버전
 * libs/testcase_mapping/testcase_mapper_supabase.js
 * 
 * 역할: 수파베이스에서 매핑 검색 및 카탈론 스크립트 생성
 * 파싱은 기존 testcase_parser.js 사용
 */

// ================================
// 전역 변수 관리
// ================================
window.parsedTestcaseData = null;
window.generatedScript = null;

// ================================
// 안전한 함수 호출을 위한 유틸리티
// ================================

/**
 * 안전한 기존 파싱 함수 호출
 */
function safeParseTestcase(input) {
  // 1. window.TestcaseParser.parseTestcase 시도
  if (window.TestcaseParser && typeof window.TestcaseParser.parseTestcase === 'function') {
    console.log('✅ TestcaseParser.parseTestcase 사용');
    return window.TestcaseParser.parseTestcase(input);
  }
  
  // 2. 전역 parseTestcase 함수 시도
  if (typeof window.parseTestcase === 'function') {
    console.log('✅ 전역 parseTestcase 사용');
    return window.parseTestcase(input);
  }
  
  console.warn('⚠️ 파싱 함수를 찾을 수 없습니다');
  return { summary: '', precondition: [], steps: [], expectedResult: '' };
}

/**
 * 안전한 기존 표시 함수 호출
 */
function safeDisplayParsedData(data) {
  // 1. window.TestcaseParser.displayParsedData 시도
  if (window.TestcaseParser && typeof window.TestcaseParser.displayParsedData === 'function') {
    console.log('✅ TestcaseParser.displayParsedData 사용');
    return window.TestcaseParser.displayParsedData(data);
  }
  
  // 2. 전역 displayParsedData 함수 시도
  if (typeof window.displayParsedData === 'function') {
    console.log('✅ 전역 displayParsedData 사용');
    return window.displayParsedData(data);
  }
  
  console.warn('⚠️ 표시 함수를 찾을 수 없습니다');
}

/**
 * 안전한 키워드 추출 함수 호출
 */
function safeExtractKeywords(text) {
  // 1. window.TestcaseParser.extractKeywords 시도
  if (window.TestcaseParser && typeof window.TestcaseParser.extractKeywords === 'function') {
    return window.TestcaseParser.extractKeywords(text);
  }
  
  // 2. 전역 extractKeywords 함수 시도
  if (typeof window.extractKeywords === 'function') {
    return window.extractKeywords(text);
  }
  
  // 3. 기본 키워드 추출 로직
  console.warn('⚠️ 키워드 추출 함수 없음 - 기본 로직 사용');
  if (!text || typeof text !== 'string') return [];
  
  const words = text
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1)
    .map(word => word.toLowerCase().trim())
    .filter(word => word.length > 0);
  
  return [...new Set(words)];
}

/**
 * 안전한 Supabase 함수 호출
 */
function safeSupabaseCall(functionName, defaultValue = null) {
  if (typeof window[functionName] === 'function') {
    return window[functionName];
  }
  console.warn(`⚠️ ${functionName} 함수가 없습니다 - 기본값 반환`);
  return () => defaultValue;
}

// ================================
// 기존 UI 제어 함수들 (파싱 관련은 기존 함수 사용)
// ================================

/**
 * 테스트케이스 데이터 추출 (기존 함수 호출)
 */
async function extractTestcaseData() {
  const input = document.getElementById('testcaseInput').value.trim();
  console.log('📝 입력된 텍스트:', input);
  
  if (!input) {
    alert('테스트케이스 내용을 입력해주세요.');
    return;
  }
  
  // 로딩 상태 표시
  const extractBtn = document.querySelector('.extract-btn');
  const originalText = extractBtn ? extractBtn.textContent : '📊 데이터 추출';
  if (extractBtn) {
    extractBtn.textContent = '🔄 파싱 중...';
    extractBtn.disabled = true;
  }
  
  try {
    // 기존 파싱 함수 호출
    const parsedData = safeParseTestcase(input);
    console.log('✅ 파싱된 데이터:', parsedData);
    
    // 기존 표시 함수 호출
    safeDisplayParsedData(parsedData);
    window.parsedTestcaseData = parsedData;
    
    // 스크립트 전환 버튼 활성화
    const convertBtn = document.getElementById('convertBtn');
    if (convertBtn) {
      convertBtn.disabled = false;
    }
    
    console.log('🎉 파싱 완료');
    
  } catch (error) {
    console.error('❌ 파싱 오류:', error);
    alert('파싱 중 오류가 발생했습니다: ' + error.message);
  } finally {
    // 로딩 상태 해제
    if (extractBtn) {
      extractBtn.textContent = originalText;
      extractBtn.disabled = false;
    }
  }
}

// ================================
// 수파베이스 매핑 전용 함수들
// ================================

/**
 * 매핑 스크립트 생성 메인 함수 (수파베이스 버전)
 */
async function generateMappingScript() {
  console.log('🚀 수파베이스 매핑 스크립트 생성 시작...');
  
  if (!window.parsedTestcaseData) {
    alert('먼저 테스트케이스 데이터를 추출해주세요.');
    return;
  }

  // 수파베이스 연결 상태 확인
  const isConnectedFunc = safeSupabaseCall('isSupabaseConnected', () => false);
  const initializeFunc = safeSupabaseCall('initializeSupabase', async () => false);
  
  if (!isConnectedFunc()) {
    console.log('🔗 수파베이스 연결 시도 중...');
    const connected = await initializeFunc();
    if (!connected) {
      alert('❌ 수파베이스 연결에 실패했습니다!\n\n확인사항:\n1. 인터넷 연결 상태\n2. 수파베이스 URL과 Key\n3. 수파베이스 프로젝트 상태\n\n콘솔을 확인해주세요.');
      return;
    }
  }

  // 로딩 상태 표시
  const convertBtn = document.getElementById('convertBtn');
  const originalText = convertBtn ? convertBtn.textContent : '⚡ 스크립트 전환';
  if (convertBtn) {
    convertBtn.textContent = '🔄 수파베이스에서 매핑 중...';
    convertBtn.disabled = true;
  }

  try {
    const data = window.parsedTestcaseData;
    
    console.log('📋 처리할 데이터:', {
      summary: data.summary ? '✅' : '❌',
      precondition: data.precondition?.length || 0,
      steps: data.steps?.length || 0,
      expectedResult: data.expectedResult ? '✅' : '❌'
    });
    
    // 각 섹션별로 비동기 스크립트 생성
    console.log('🔄 Precondition 처리 중...');
    const preconditionScript = await generateSectionScriptAsync('Precondition', data.precondition);
    
    console.log('🔄 Summary 처리 중...');
    const summaryScript = await generateSectionScriptAsync('Summary', [data.summary]);
    
    console.log('🔄 Steps 처리 중...');
    const stepsScript = await generateSectionScriptAsync('Steps', data.steps);
    
    console.log('🔄 Expected Result 처리 중...');
    const expectedResultScript = await generateSectionScriptAsync('Expected Result', [data.expectedResult]);
    
    // 통합 스크립트 생성
    const fullScript = createIntegratedScriptWithSupabase(preconditionScript, summaryScript, stepsScript, expectedResultScript);
    
    // UI에 스크립트 표시
    displayMappingScript(fullScript);
    updateMappingStatus(true);
    
    console.log('🎉 수파베이스 매핑 스크립트 생성 완료');
    showSuccess('✅ 수파베이스 매핑 완료!');
    
  } catch (error) {
    console.error('❌ 매핑 스크립트 생성 오류:', error);
    alert('매핑 스크립트 생성 중 오류가 발생했습니다:\n\n' + error.message);
    showError('❌ 매핑 실패: ' + error.message);
  } finally {
    // 로딩 상태 해제
    if (convertBtn) {
      convertBtn.textContent = originalText;
      convertBtn.disabled = false;
    }
  }
}

/**
 * 섹션별 스크립트 생성 (수파베이스 비동기 버전)
 */
async function generateSectionScriptAsync(sectionName, textArray) {
  if (!textArray || textArray.length === 0) {
    return `// === ${sectionName} Scripts ===\n// No content found for ${sectionName}\n\n`;
  }
  
  let script = `// === ${sectionName} Scripts (Supabase) ===\n`;
  script += `// Generated at: ${new Date().toLocaleString()}\n\n`;
  
  for (let index = 0; index < textArray.length; index++) {
    const text = textArray[index];
    if (!text || text.trim() === '') continue;
    
    console.log(`🔍 처리 중: "${text.substring(0, 50)}..."`);
    
    // 텍스트를 주석으로 처리
    const commentedText = text.split('\n').map(line => `// ${sectionName} ${index + 1}: ${line.trim()}`).join('\n');
    script += `${commentedText}\n`;
    
    // 키워드 추출
    const keywords = safeExtractKeywords(text);
    console.log(`🔤 키워드 추출: [${keywords.join(', ')}]`);
    
    // 수파베이스에서 매핑 검색 (비동기)
    const mappings = await findMappingsForKeywordsSupabase(keywords);
    
    if (mappings.length > 0) {
      console.log(`✅ ${mappings.length}개 매핑 발견`);
      mappings.forEach(mappingResult => {
        script += generateKatalonScript(mappingResult.mapping, text);
        script += `// 🎯 Source: ${mappingResult.source} (Supabase)\n`;
      });
    } else {
      console.log(`❌ 매핑 없음`);
      script += `// TODO: No mapping found for: "${text.replace(/\n/g, ' ')}"\n`;
      script += `// Keywords extracted: ${keywords.join(', ')}\n`;
      script += `// 💡 Supabase에서 매핑을 찾을 수 없습니다\n`;
    }
    
    script += '\n';
  }
  
  return script;
}

/**
 * 여러 키워드에 대한 수파베이스 매핑 검색
 */
async function findMappingsForKeywordsSupabase(keywords) {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return [];
  }

  console.log(`🔍 수파베이스에서 ${keywords.length}개 키워드 검색 시작`);

  const foundMappings = [];
  const usedActions = new Set();

  try {
    // findMappingInSupabase 함수 안전하게 호출
    const findMappingFunc = safeSupabaseCall('findMappingInSupabase', async () => ({ found: false }));
    
    // 각 키워드별로 순차 검색
    for (const keyword of keywords) {
      const result = await findMappingFunc(keyword);
      
      if (result.found && !usedActions.has(result.action)) {
        foundMappings.push(result);
        usedActions.add(result.action);
        console.log(`✅ 매핑 성공: "${keyword}" → ${result.action} (${result.source})`);
      }
    }

    console.log(`📊 최종 결과: ${foundMappings.length}/${keywords.length} 매핑 성공`);
    return foundMappings;

  } catch (error) {
    console.error('❌ 수파베이스 검색 중 오류:', error);
    return [];
  }
}

/**
 * 카탈론 스크립트 생성
 */
function generateKatalonScript(mapping, originalText) {
  if (!mapping || !mapping.action) {
    return `// TODO: No action found for: "${originalText}"\n`;
  }
  
  let script = '';
  
  switch (mapping.type || 'unknown') {
    case 'click':
      script = `WebUI.click(findTestObject('Object Repository/Page/btn_click'))\n`;
      break;
    case 'input':
      script = `WebUI.setText(findTestObject('Object Repository/Page_/input_text'), 'testvalue')\n`;
      break;
    case 'navigation':
      script = `WebUI.openBrowser('')\nWebUI.navigateToUrl('${mapping.url || 'about:blank'}')\n`;
      break;
    case 'verification':
      script = `WebUI.verifyElementPresent(findTestObject('Object Repository/Page/element'), 10)\n`;
      break;
    default:
      script = `WebUI.comment('${mapping.action}')\n`;
  }
  
  return script;
}

/**
 * 통합 스크립트 생성 (수파베이스 버전)
 */
function createIntegratedScriptWithSupabase(preconditionScript, summaryScript, stepsScript, expectedResultScript) {
  const header = `// ========================================
// Katalon Mapping Script (Supabase Powered)
// Generated at: ${new Date().toLocaleString()}
// Data Source: Supabase Database
// Mapping Tables: katalon_mapping_complete, katalon_mapping_observer
// ========================================

def testCase() {
    try {
        // Supabase-powered test case execution
        WebUI.comment("🚀 Starting Supabase-mapped test case")
        
`;

  const footer = `
        WebUI.comment("✅ Supabase test case completed successfully")
        
    } catch (Exception e) {
        WebUI.comment("❌ Test failed: " + e.getMessage())
        throw e
    } finally {
        WebUI.closeBrowser()
    }
}`;

  // 스크립트들을 적절히 들여쓰기
  const indentedPrecondition = indentScript(preconditionScript);
  const indentedSummary = indentScript(summaryScript);
  const indentedSteps = indentScript(stepsScript);
  const indentedExpectedResult = indentScript(expectedResultScript);

  return header + indentedPrecondition + indentedSummary + indentedSteps + indentedExpectedResult + footer;
}

/**
 * 스크립트 들여쓰기
 */
function indentScript(script) {
  return script.split('\n').map(line => {
    if (line.trim() === '') return line;
    return '        ' + line;
  }).join('\n');
}

// ================================
// UI 제어 함수들
// ================================

/**
 * 스크립트 복사 기능
 */
function copyScript() {
  if (!window.generatedScript) {
    alert('복사할 스크립트가 없습니다.');
    return;
  }
  
  navigator.clipboard.writeText(window.generatedScript).then(() => {
    const copyBtn = document.querySelector('.copy-btn');
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✅ 복사됨';
      copyBtn.style.background = '#10b981';
      
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = '#6366f1';
      }, 2000);
    }
    showSuccess('✅ 스크립트가 클립보드에 복사되었습니다');
  }).catch(err => {
    console.error('복사 실패:', err);
    alert('복사에 실패했습니다. 수동으로 복사해주세요.');
  });
}

/**
 * 입력 영역 초기화
 */
function resetInput() {
  if (confirm('입력된 테스트케이스를 초기화하시겠습니까?')) {
    const inputElement = document.getElementById('testcaseInput');
    if (inputElement) {
      inputElement.value = '';
    }
    console.log('✅ 입력 영역 초기화 완료');
  }
}

/**
 * 파싱 결과 초기화
 */
function resetParsing() {
  if (confirm('파싱 결과를 초기화하시겠습니까?')) {
    const summaryElement = document.getElementById('summaryResult');
    const preconditionElement = document.getElementById('preconditionResult');
    const stepsElement = document.getElementById('stepsResult');
    const expectedElement = document.getElementById('expectedResult');
    
    if (summaryElement) {
      summaryElement.innerHTML = '<span class="placeholder-text">추출된 Summary가 여기에 표시됩니다</span>';
    }
    if (preconditionElement) {
      preconditionElement.innerHTML = '<span class="placeholder-text">추출된 Precondition이 여기에 표시됩니다</span>';
    }
    if (stepsElement) {
      stepsElement.innerHTML = '<span class="placeholder-text">추출된 Steps가 여기에 표시됩니다</span>';
    }
    if (expectedElement) {
      expectedElement.innerHTML = '<span class="placeholder-text">추출된 Expected Result가 여기에 표시됩니다</span>';
    }
    
    // 스크립트 전환 버튼 비활성화
    const convertBtn = document.getElementById('convertBtn');
    if (convertBtn) {
      convertBtn.disabled = true;
    }
    
    // 전역 변수 초기화
    window.parsedTestcaseData = null;
    
    console.log('✅ 파싱 결과 초기화 완료');
  }
}

/**
 * 생성된 스크립트 초기화
 */
function resetScript() {
  if (confirm('생성된 매핑 스크립트를 초기화하시겠습니까?')) {
    const scriptElement = document.getElementById('scriptResult');
    if (scriptElement) {
      scriptElement.innerHTML = '<span class="placeholder-text">// 수파베이스 연동 카탈론 매핑 스크립트가 여기에 생성됩니다</span>';
    }
    
    // 매핑 상태 초기화
    updateMappingStatus(false);
    
    // 전역 변수 초기화
    window.generatedScript = null;
    
    console.log('✅ 매핑 스크립트 초기화 완료');
  }
}

/**
 * 매핑 스크립트를 화면에 표시
 */
function displayMappingScript(script) {
  const scriptElement = document.getElementById('scriptResult');
  if (!scriptElement) return;
  
  // 스크립트를 HTML로 변환하여 표시
  const lines = script.split('\n');
  let styledHTML = '';
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    const escapedLine = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // 수파베이스 관련 스타일링
    if (trimmedLine.includes('Supabase') || trimmedLine.includes('🎯 Source:')) {
      styledHTML += `<span style="color: #10b981; font-weight: bold;">${escapedLine}</span>\n`;
    } else if (trimmedLine.includes('TODO: No mapping found')) {
      styledHTML += `<span style="color: #ef4444; background: #fef2f2; padding: 2px 4px;">${escapedLine}</span>\n`;
    } else if (trimmedLine.startsWith('WebUI.')) {
      styledHTML += `<span style="color: #3b82f6; font-weight: bold;">${escapedLine}</span>\n`;
    } else if (trimmedLine.startsWith('//')) {
      styledHTML += `<span style="color: #6b7280;">${escapedLine}</span>\n`;
    } else {
      styledHTML += `${escapedLine}\n`;
    }
  });
  
  scriptElement.innerHTML = `<pre style="margin: 0; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4;">${styledHTML}</pre>`;
  window.generatedScript = script;
  
  console.log('✅ 수파베이스 스크립트 표시 완료');
}

/**
 * 매핑 상태 업데이트
 */
function updateMappingStatus(hasMappings) {
  const indicator = document.getElementById('mappingIndicator');
  if (indicator) {
    if (hasMappings) {
      indicator.classList.remove('no-mapping');
      indicator.classList.add('supabase-mapping');
      indicator.title = '수파베이스 매핑 활성화';
    } else {
      indicator.classList.add('no-mapping');
      indicator.classList.remove('supabase-mapping');
    }
  }
}

/**
 * 성공 메시지 표시
 */
function showSuccess(message) {
  console.log('✅', message);
  if (typeof window.showSuccess === 'function') {
    window.showSuccess(message);
  }
}

/**
 * 에러 메시지 표시  
 */
function showError(message) {
  console.error('❌', message);
  if (typeof window.showError === 'function') {
    window.showError(message);
  }
}

// ================================
// 전역 함수 등록 (HTML에서 호출용)
// ================================

// 기존 파싱 함수는 testcase_parser.js에서 처리
window.extractTestcaseData = extractTestcaseData;

// 수파베이스 매핑 전용 함수
window.generateMappingScript = generateMappingScript;

// UI 제어 함수들
window.copyScript = copyScript;
window.resetInput = resetInput;
window.resetParsing = resetParsing;
window.resetScript = resetScript;

console.log('✅ testcase_mapper_supabase.js 로드 완료 (파싱은 기존 함수 사용)');
