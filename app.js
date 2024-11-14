const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 설정 (public 폴더 내의 파일 접근 가능)
app.use(express.static(path.join(__dirname, 'public')));

// EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 데이터베이스 연결 함수
function getDbConnection() {
    const dbPath = path.join(__dirname, 'esg_survey.db');
    const db = new sqlite3.Database(dbPath);
    return db;
}

// 데이터베이스 초기화 함수 (처음에만 수동으로 실행)
function initDb() {
    const db = getDbConnection();
    db.serialize(() => {
        db.run('DROP TABLE IF EXISTS esg_survey');
        db.run(`
            CREATE TABLE esg_survey (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                industry TEXT,
                question1_yes INTEGER,
                question1_no INTEGER,
                question2_yes INTEGER,
                question2_no INTEGER,
                question3_yes INTEGER,
                question3_no INTEGER,
                question4_yes INTEGER,
                question4_no INTEGER,
                question5_yes INTEGER,
                question5_no INTEGER
            )
        `);
    });
    db.close();
}

// 초기 데이터베이스 설정 (처음에만 실행)
// initDb();  // 데이터베이스 초기화가 필요할 때만 주석 해제

// 시작 페이지 라우트
app.get('/', (req, res) => {
    res.render('index');  // 시작 페이지 렌더링
});

// 산업군 선택 페이지
app.get('/industry_selection', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'industry_selection.html'));
});

// 산업군 선택 후 해당 설문조사 페이지로 이동
app.post('/select_industry', (req, res) => {
    const industry = req.body.industry;
    switch (industry) {
        case 'manufacturing':
            res.redirect('/survey/manufacturing');
            break;
        case 'construction':
            res.redirect('/survey/construction');
            break;
        case 'service':
            res.redirect('/survey/service');
            break;
        case 'agriculture':
            res.redirect('/survey/agriculture');
            break;
        case 'transport':
            res.redirect('/survey/transport');
            break;
        case 'energy':
            res.redirect('/survey/energy');
            break;
        default:
            res.redirect('/');
    }
});

// 각 산업군 설문조사 페이지 라우팅
app.get('/survey/:industry', (req, res) => {
    const industry = req.params.industry;
    res.sendFile(path.join(__dirname, 'views', `${industry}_survey.html`));
});

// 설문조사 제출 처리
app.post('/submit', (req, res) => {
    const industry = req.body.industry;

    // 각 질문에 대한 Yes/No 응답 수
    const question1_yes = req.body.question1 === 'yes' ? 1 : 0;
    const question1_no = req.body.question1 === 'no' ? 1 : 0;
    const question2_yes = req.body.question2 === 'yes' ? 1 : 0;
    const question2_no = req.body.question2 === 'no' ? 1 : 0;
    const question3_yes = req.body.question3 === 'yes' ? 1 : 0;
    const question3_no = req.body.question3 === 'no' ? 1 : 0;
    const question4_yes = req.body.question4 === 'yes' ? 1 : 0;
    const question4_no = req.body.question4 === 'no' ? 1 : 0;
    const question5_yes = req.body.question5 === 'yes' ? 1 : 0;
    const question5_no = req.body.question5 === 'no' ? 1 : 0;

    // 데이터베이스에 응답 저장
    const db = getDbConnection();
    db.run(`
        INSERT INTO esg_survey (industry, question1_yes, question1_no, question2_yes, question2_no, question3_yes, question3_no, question4_yes, question4_no, question5_yes, question5_no)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [industry, question1_yes, question1_no, question2_yes, question2_no, question3_yes, question3_no, question4_yes, question4_no, question5_yes, question5_no], (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("Database error.");
        } else {
            res.redirect(`/results?industry=${industry}`);
        }
    });
    db.close();
});

// 결과 페이지
app.get('/results', (req, res) => {
    const industry = req.query.industry;
    const db = getDbConnection();
    
    db.get("SELECT * FROM esg_survey ORDER BY id DESC LIMIT 1", (err, latestResult) => {
        if (err) {
            console.error(err.message);
            res.status(500).send("Database error.");
        } else if (!latestResult) {
            res.send("No results found. Please complete the survey first.");
        } else {
            // 결과 템플릿을 렌더링하면서 데이터 전달
            res.render('results', { result: latestResult, industry });
        }
    });
    db.close();
});

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


