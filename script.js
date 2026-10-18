let allBankQuestions = [];
let remainingQuestions = [];
let currentSubSet = [];
let correctScore = 0;
let answeredScore = 0;
let currentMode = "30"; // "30" hoặc "all"

// Các phần tử DOM
const homeScreen = document.getElementById("home-screen");
const quizScreen = document.getElementById("quiz-screen");
const topicSelect = document.getElementById("topic-select");
const btnStart30 = document.getElementById("btn-start-30");
const btnStartAll = document.getElementById("btn-start-all");
const topicInfo = document.getElementById("topic-info");
const currentTopicName = document.getElementById("current-topic-name");
const questionsContainer = document.getElementById("questions-container");
const correctCountEl = document.getElementById("correct-count");
const answeredCountEl = document.getElementById("answered-count");
const percentEl = document.getElementById("percent");
const btnNextSet = document.getElementById("btn-next-set");
const btnBackHome = document.getElementById("btn-back-home");

// Tự nạp danh sách chủ đề từ topics.json
window.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch("topics.json");
        const topics = await res.json();
        
        topicSelect.innerHTML = '<option value="">-- Chọn chủ đề để ôn luyện --</option>';
        topics.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.file;

            const totalQuestions = t.count ?? t.total ?? (Array.isArray(t.questions) ? t.questions.length : 0);
            opt.textContent = `${t.title} (${totalQuestions} câu)`;
            opt.dataset.title = t.title;
            opt.dataset.total = totalQuestions;
            topicSelect.appendChild(opt);
        });

        topicSelect.addEventListener("change", () => {
            const selected = topicSelect.selectedOptions[0];
            const hasValue = Boolean(topicSelect.value);
            btnStart30.disabled = !hasValue;
            btnStartAll.disabled = !hasValue;

            if (hasValue) {
                topicInfo.textContent = `Tổng ngân hàng: ${selected.dataset.total} câu hỏi trắc nghiệm.`;
            } else {
                topicInfo.textContent = "";
            }
        });
    } catch (err) {
        topicSelect.innerHTML = '<option value="">Lỗi nạp topics.json! Hãy chạy ConvertEXE.bat trước.</option>';
        console.error(err);
    }
});

// Gán sự kiện cho 2 nút Bắt đầu
btnStart30.addEventListener("click", () => startQuiz("30"));
btnStartAll.addEventListener("click", () => startQuiz("all"));

// Hàm khởi động làm bài theo chế độ đã chọn
async function startQuiz(mode) {
    const file = topicSelect.value;
    const selectedOption = topicSelect.selectedOptions[0];
    if (!file) return;

    currentMode = mode;
    btnStart30.disabled = true;
    btnStartAll.disabled = true;

    try {
        const res = await fetch(file);
        allBankQuestions = await res.json();

        // Tạo bản sao ngân hàng câu hỏi và xáo trộn ngẫu nhiên
        remainingQuestions = shuffleArray(allBankQuestions);

        const modeLabel = mode === "all" ? "Toàn bộ đề" : "30 câu";
        currentTopicName.textContent = `${selectedOption.dataset.title} [${modeLabel}]`;
        homeScreen.classList.add("hidden");
        quizScreen.classList.remove("hidden");

        loadQuizSet();
    } catch (err) {
        alert("Không thể đọc file chủ đề: " + file);
        console.error(err);
    } finally {
        btnStart30.disabled = false;
        btnStartAll.disabled = false;
    }
}

// Thuật toán xáo trộn Fisher-Yates
function shuffleArray(arr) {
    const res = [...arr];
    for (let i = res.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [res[i], res[j]] = [res[j], res[i]];
    }
    return res;
}

// Kiểm tra đáp án chuẩn
function checkOptionCorrect(optText, optIndex, q) {
    if (typeof q.correct === "number" && q.correct === optIndex) {
        return true;
    }

    const targetAns = q.answer || q.correctAnswer || (typeof q.correct === "string" ? q.correct : "");
    if (!targetAns) return false;

    const optTrimmed = String(optText).trim();
    const targetTrimmed = String(targetAns).trim();

    if (optTrimmed === targetTrimmed) return true;

    if (/^[A-Da-d][\.\:\)]?$/.test(targetTrimmed)) {
        const targetLetter = targetTrimmed[0].toUpperCase();
        if (String.fromCharCode(65 + optIndex) === targetLetter) return true;
        if (optTrimmed.toUpperCase().startsWith(targetLetter)) return true;
    }

    const clean = (s) => (s || "").replace(/^[A-Da-d][\.\:\s\)\-]+/, "").replace(/\s+/g, " ").trim().toLowerCase();
    return clean(optTrimmed) === clean(targetTrimmed);
}

// Nạp bộ câu hỏi hiển thị
function loadQuizSet() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    questionsContainer.innerHTML = "";
    correctScore = 0;
    answeredScore = 0;
    updateScoreUI();

    let selectedBatch = [];

    if (currentMode === "all") {
        // CHẾ ĐỘ 1: LÀM TOÀN BỘ (xáo trộn thứ tự toàn bộ câu hỏi)
        selectedBatch = shuffleArray(allBankQuestions);
        btnNextSet.textContent = "Làm lại toàn bộ (Xáo trộn) ↻";
    } else {
        // CHẾ ĐỘ 2: LÀM 30 CÂU (bốc 30 câu tiếp theo không trùng lặp)
        btnNextSet.textContent = "30 câu tiếp theo ↻";
        if (remainingQuestions.length === 0) {
            alert("Đã hoàn thành toàn bộ câu hỏi trong chủ đề! Hệ thống sẽ xáo trộn lại từ đầu.");
            remainingQuestions = shuffleArray(allBankQuestions);
        }
        selectedBatch = remainingQuestions.splice(0, 30);
    }

    // Xáo trộn thứ tự các đáp án A, B, C, D của từng câu
    currentSubSet = selectedBatch.map((q, idx) => {
        const mappedOptions = q.options.map((optText, i) => ({
            rawText: optText,
            isCorrect: checkOptionCorrect(optText, i, q)
        }));

        const shuffledOpts = shuffleArray(mappedOptions);

        return {
            qIndex: idx + 1,
            questionText: q.question,
            options: shuffledOpts
        };
    });

    renderQuestions();
}

// Hiển thị câu hỏi ra giao diện
function renderQuestions() {
    currentSubSet.forEach((qData, qIdx) => {
        const qBox = document.createElement("div");
        qBox.className = "question-box";

        const title = document.createElement("div");
        title.className = "question-title";
        const cleanQText = qData.questionText.replace(/^Câu\s*\d+[\:\.\s]*/i, "").trim();
        title.textContent = `Câu ${qIdx + 1}: ${cleanQText}`;
        qBox.appendChild(title);

        const optsDiv = document.createElement("div");
        optsDiv.className = "options-list";

        qData.options.forEach((opt, optIdx) => {
            const btn = document.createElement("button");
            btn.className = "option-btn";
            
            const letter = String.fromCharCode(65 + optIdx);
            const cleanOptText = opt.rawText.replace(/^[A-Da-d][\.\:\s\)\-]+/, "").trim();
            btn.textContent = `${letter}. ${cleanOptText}`;

            btn.addEventListener("click", () => {
                handleAnswer(qBox, optsDiv, opt, qData.options);
            });

            optsDiv.appendChild(btn);
        });

        qBox.appendChild(optsDiv);
        questionsContainer.appendChild(qBox);
    });
}

// Chấm điểm tức thì: chọn sai báo đỏ, đồng thời báo luôn đáp án đúng màu xanh
function handleAnswer(qBox, optsDiv, chosenOpt, allOptions) {
    answeredScore++;
    if (chosenOpt.isCorrect) {
        correctScore++;
    }

    const allButtons = optsDiv.querySelectorAll(".option-btn");
    
    allButtons.forEach((btn, idx) => {
        btn.disabled = true; // Khóa câu này lại

        const optData = allOptions[idx];

        // Luôn tô xanh đáp án đúng chuẩn
        if (optData.isCorrect) {
            btn.classList.add("correct");
        }

        // Nếu bấm sai thì ô vừa bấm chuyển sang đỏ
        if (optData === chosenOpt && !chosenOpt.isCorrect) {
            btn.classList.add("wrong");
        }
    });

    updateScoreUI();
}

function updateScoreUI() {
    correctCountEl.textContent = correctScore;
    answeredCountEl.textContent = answeredScore;
    const pct = answeredScore === 0 ? 0 : Math.round((correctScore / answeredScore) * 100);
    percentEl.textContent = `${pct}%`;
}

// Nút tiếp theo / làm lại ở chân trang
btnNextSet.addEventListener("click", () => {
    loadQuizSet();
});

// Nút quay về trang chủ
btnBackHome.addEventListener("click", () => {
    quizScreen.classList.add("hidden");
    homeScreen.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
});