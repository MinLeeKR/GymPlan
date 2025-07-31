const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

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

async function checkYouTubeLink(browser, link) {
  const page = await browser.newPage();
  
  try {
    // User-agent 설정으로 봇 감지 회피
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    // YouTube URL로 이동
    const response = await page.goto(link.url, { 
      waitUntil: 'networkidle', 
      timeout: 15000 
    });
    
    // 응답 상태 확인
    if (!response.ok()) {
      return {
        ...link,
        status: 'invalid',
        error: `HTTP ${response.status()}: ${response.statusText()}`
      };
    }
    
    // 페이지가 YouTube 오류 페이지인지 확인
    const title = await page.title();
    const url = page.url();
    
    // YouTube 오류 페이지 감지
    if (title.toLowerCase().includes('video unavailable') || 
        title.toLowerCase().includes('not available') ||
        url.includes('watch?v=') && await page.$('text="Video unavailable"') ||
        await page.$('[data-layer="4"] h1:has-text("This video isn\'t available anymore")')) {
      return {
        ...link,
        status: 'unavailable',
        error: 'Video is unavailable or deleted'
      };
    }
    
    // 비공개 영상 감지
    if (await page.$('text="Private video"') || 
        await page.$('text="This video is private"')) {
      return {
        ...link,
        status: 'private',
        error: 'Video is private'
      };
    }
    
    // 연령 제한 확인
    if (await page.$('text="Sign in to confirm your age"') || 
        await page.$('[data-layer="4"]:has-text("age")')) {
      return {
        ...link,
        status: 'age_restricted',
        error: 'Video is age-restricted'
      };
    }
    
    // 정상적인 경우 제목과 채널 정보 추출
    await page.waitForSelector('h1', { timeout: 5000 });
    const videoTitle = await page.$eval('h1', el => el.textContent?.trim() || '');
    
    let channelName = '';
    try {
      const channelElement = await page.$('a[href*="/channel/"], a[href*="/@"]');
      if (channelElement) {
        channelName = await channelElement.textContent();
      }
    } catch (e) {
      // 채널명 추출 실패는 무시
    }
    
    return {
      ...link,
      status: 'valid',
      videoTitle: videoTitle,
      channelName: channelName?.trim() || '',
      currentUrl: url
    };
    
  } catch (error) {
    return {
      ...link,
      status: 'error',
      error: error.message
    };
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('🚀 YouTube 링크 유효성 검사를 시작합니다...\n');
  
  // HTML 파일 목록
  const htmlFiles = [
    '월요일.html',
    '화요일.html', 
    '수요일.html',
    '목요일.html',
    '금요일.html'
  ];
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
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
      
      const result = await checkYouTubeLink(browser, link);
      results.push(result);
      
      // 상태에 따른 콘솔 출력
      switch (result.status) {
        case 'valid':
          console.log(`   ✅ 정상 - "${result.videoTitle}" (${result.channelName})`);
          break;
        case 'invalid':
        case 'unavailable':
        case 'private':
        case 'age_restricted':
          console.log(`   ❌ ${result.status.toUpperCase()}: ${result.error}`);
          break;
        case 'error':
          console.log(`   ⚠️  오류: ${result.error}`);
          break;
      }
      
      // 요청 간격 (YouTube 차단 방지)
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      console.log('\n🚨 교체가 필요한 링크들:');
      problematicLinks.forEach((link, index) => {
        console.log(`\n${index + 1}. ${path.basename(link.filePath)}:${link.lineNumber}`);
        console.log(`   URL: ${link.url}`);
        console.log(`   상태: ${link.status}`);
        console.log(`   오류: ${link.error || 'N/A'}`);
        console.log(`   원본 줄: ${link.fullLine}`);
      });
    }
    
    // 결과를 JSON 파일로 저장
    const reportPath = path.join(__dirname, 'youtube-link-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n💾 상세 결과가 ${reportPath}에 저장되었습니다.`);
    
  } catch (error) {
    console.error('❌ 스크립트 실행 중 오류 발생:', error);
  } finally {
    await browser.close();
    console.log('\n✅ 검사 완료!');
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { extractLinksFromHTML, checkYouTubeLink };