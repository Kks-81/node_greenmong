const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

// Stealth Plugin 적용
puppeteer.use(StealthPlugin());

// 긍정 및 부정 키워드 목록
const positiveKeywords = [
    "탄소 감축", "탄소 중립", "친환경", "재활용", "에너지 효율", "환경 보호",
    "지속 가능", "녹색 성장", "온실가스 감축", "재생 에너지", "신재생 에너지",
    "자연 복원", "탄소 저감", "녹색 기술", "순환 경제", "친환경 제품",
    "탄소 배출 제로", "그린 뉴딜", "지속 가능한 개발", "에너지 혁신",
    "전기차", "수소 에너지", "태양광 발전", "풍력 에너지", "폐기물 최소화",
    "탄소 배출권 거래", "수자원 관리", "발전"
];
const negativeKeywords = [
    "오염", "환경 파괴", "탄소 배출", "폐기물 배출", "에너지 낭비", "환경 피해",
    "환경 규제 위반", "문제 발생", "유해 물질", "환경 오염", "공해", "환경 사고",
    "미세 플라스틱", "불법 폐기물", "환경 부주의", "생태계 파괴", "산림 파괴",
    "해양 오염", "기후 변화 악화", "멸종 위기", "온실가스 증가", "수질 오염",
    "대기 오염", "석탄 사용", "폐수 배출", "플라스틱 폐기물"
];

const keywords = [
    "환경 문제", "탄소 중립", "친환경 정책", "환경 보호", "재생 에너지",
    "탄소 배출 감소", "지속 가능성", "폐기물 관리", "녹색 기술", "기후 변화",
    "순환 경제", "전기차", "수소 에너지", "풍력 발전", "태양광 패널",
    "지속 가능한 농업", "탄소 포집", "녹색 금융", "청정 기술", "대체 에너지",
    "ESG 정책", "환경 인증", "산림 관리", "물 재사용", "환경 법규"
];

// 대기 시간 구현 함수
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 검색 결과 분류 함수
async function classifyResultsWithSeverity(results) {
    const classifiedResults = { positive: [], negative: [], neutral: [] };
    for (const result of results) {
        const isPositive = positiveKeywords.some((keyword) =>
            result.title.toLowerCase().includes(keyword.toLowerCase())
        );
        const isNegative = negativeKeywords.some((keyword) =>
            result.title.toLowerCase().includes(keyword.toLowerCase())
        );
        if (isPositive && !isNegative) classifiedResults.positive.push(result);
        else if (isNegative && !isPositive) classifiedResults.negative.push(result);
        else classifiedResults.neutral.push(result);
    }
    return classifiedResults;
}

// Google 검색
async function googleSearch(companyName, keyword) {
    const query = `${companyName} ${keyword}`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(50000); // 타임아웃 설정
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });

        const results = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.tF2Cxc').forEach((element) => {
                const title = element.querySelector('.DKV0Md')?.innerText || 'No Title';
                const link = element.querySelector('.yuRUbf a')?.href || 'No Link';
                if (title && link) items.push({ title, link });
            });
            return items;
        });

        console.log(`Google 검색 완료: ${query} - ${results.length}개 결과`);
        return results;
    } catch (error) {
        console.error(`Google 검색 실패 (${query}):`, error.message);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

// Naver 검색
async function naverSearch(companyName, keyword) {
    const query = `${companyName} ${keyword}`;
    const url = `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(50000); // 타임아웃 설정
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });

        const results = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.news_tit').forEach((element) => {
                const title = element.innerText || 'No Title';
                const link = element.href || 'No Link';
                if (title && link) items.push({ title, link });
            });
            return items;
        });

        console.log(`Naver 검색 완료: ${query} - ${results.length}개 결과`);
        return results;
    } catch (error) {
        console.error(`Naver 검색 실패 (${query}):`, error.message);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

// 환경 이슈 검색
async function fetchEnvironmentIssues(companyName) {
    try {
        const allResults = [];
        for (const keyword of keywords) {
            const [googleBatch, naverBatch] = await Promise.all([
                googleSearch(companyName, keyword),
                naverSearch(companyName, keyword),
            ]);

            console.log(`[${keyword}] Google 결과: ${googleBatch.length}, Naver 결과: ${naverBatch.length}`);
            allResults.push(...googleBatch, ...naverBatch);

            // 각 요청 사이 1초 대기
            await delay(1000);
        }

        const classifiedResults = await classifyResultsWithSeverity(allResults);
        console.log(`총 Google/Naver 결과: ${allResults.length}`);
        return classifiedResults;
    } catch (error) {
        console.error('환경 이슈 검색 실패:', error.message);
        return { positive: [], negative: [], neutral: [] };
    }
}

// 모듈 내보내기
module.exports = { googleSearch, naverSearch, fetchEnvironmentIssues };





















































































