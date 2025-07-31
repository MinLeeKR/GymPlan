const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// YouTube 링크 추출 정규식
const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;

async function extractLinksFromHTML(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const links = [];
    let match;
    
    while ((match = YOUTUBE_REGEX.exec(content)) !== null) {
      const fullMatch = match[0];
      const videoId = match[1];
      
      // 링크가 포함된 전체 줄을 찾기
      const lines = content.split('\n');
      const lineIndex = lines.findIndex(line => line.includes(fullMatch));
      
      links.push({
        url: fullMatch,
        videoId: videoId,
        filePath: filePath,
        lineNumber: lineIndex + 1,
        fullLine: lines[lineIndex]?.trim() || ''
      });
    }
    
    return links;
  } catch (error) {
    console.error(`파일 읽기 오류 ${filePath}:`, error.message);
    return [];
  }
}

function checkHttpStatus(url) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const requestModule = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'HEAD',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      };
      
      const req = requestModule.request(options, (res) => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage || '',
          headers: res.headers
        });
      });
      
      req.on('error', (error) => {
        resolve({
          status: 0,
          statusText: error.message,
          error: true
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: 0,
          statusText: 'Request timeout',
          error: true
        });
      });
      
      req.end();
    } catch (error) {
      resolve({
        status: 0,
        statusText: error.message,
        error: true
      });
    }
  });
}

async function main() {
  console.log('🚀 YouTube 링크 상태 검사를 시작합니다...\n');
  
  // HTML 파일 목록
  const htmlFiles = [
    '월요일.html',
    '화요일.html', 
    '수요일.html',
    '목요일.html',
    '금요일.html'
  ];
  
  let allLinks = [];
  
  // 모든 HTML 파일에서 링크 추출
  for (const file of htmlFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      console.log(`📄 ${file}에서 링크 추출 중...`);
      const links = await extractLinksFromHTML(filePath);
      allLinks = allLinks.concat(links);
      console.log(`   ${links.length}개의 YouTube 링크 발견`);
    }
  }
  
  console.log(`\n📊 총 ${allLinks.length}개의 YouTube 링크를 발견했습니다.\n`);
  
  if (allLinks.length === 0) {
    console.log('❌ 검사할 링크가 없습니다.');
    return;
  }
  
  // 각 링크 검사
  const results = [];
  for (let i = 0; i < allLinks.length; i++) {
    const link = allLinks[i];
    console.log(`🔍 [${i + 1}/${allLinks.length}] 검사 중: ${link.url}`);
    
    const httpResult = await checkHttpStatus(link.url);
    
    let status = 'unknown';
    let error = null;
    
    if (httpResult.error) {
      status = 'error';
      error = httpResult.statusText;
    } else if (httpResult.status === 200) {
      status = 'valid';
    } else if (httpResult.status === 404) {
      status = 'not_found';
      error = 'Video not found (404)';
    } else if (httpResult.status === 403) {
      status = 'forbidden';
      error = 'Access forbidden (403) - possibly private or age-restricted';
    } else if (httpResult.status >= 400) {
      status = 'invalid';
      error = `HTTP ${httpResult.status}: ${httpResult.statusText}`;
    } else {
      status = 'redirect';
      error = `HTTP ${httpResult.status}: ${httpResult.statusText}`;
    }
    
    const result = {
      ...link,
      status: status,
      httpStatus: httpResult.status,
      error: error
    };
    
    results.push(result);
    
    // 상태에 따른 콘솔 출력
    switch (status) {
      case 'valid':
        console.log(`   ✅ 정상 (HTTP ${httpResult.status})`);
        break;
      case 'not_found':
      case 'forbidden':
      case 'invalid':
        console.log(`   ❌ ${status.toUpperCase()}: ${error}`);
        break;
      case 'error':
        console.log(`   ⚠️  오류: ${error}`);
        break;
      case 'redirect':
        console.log(`   🔄 리다이렉트 (HTTP ${httpResult.status})`);
        break;
      default:
        console.log(`   ❓ 알 수 없음 (HTTP ${httpResult.status})`);
    }
    
    // 요청 간격
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 결과 요약
  console.log('\n📋 검사 결과 요약:');
  const summary = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(summary).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}개`);
  });
  
  // 문제가 있는 링크들 상세 출력
  const problematicLinks = results.filter(r => r.status !== 'valid');
  if (problematicLinks.length > 0) {
    console.log('\n🚨 확인이 필요한 링크들:');
    problematicLinks.forEach((link, index) => {
      console.log(`\n${index + 1}. ${path.basename(link.filePath)}:${link.lineNumber}`);
      console.log(`   URL: ${link.url}`);
      console.log(`   상태: ${link.status} (HTTP ${link.httpStatus})`);
      if (link.error) console.log(`   오류: ${link.error}`);
    });
  }
  
  // 결과를 JSON 파일로 저장
  const reportPath = path.join(__dirname, 'youtube-link-simple-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n💾 상세 결과가 ${reportPath}에 저장되었습니다.`);
  
  console.log('\n✅ 검사 완료!');
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}